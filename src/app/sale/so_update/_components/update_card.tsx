"use client"

import * as React from "react"
import {
  ArrowRight,
  BadgeDollarSign,
  CircleAlert,
  CircleCheck,
  Download,
  FileSpreadsheet,
  FileUp,
  LoaderCircle,
  ListChecks,
  PackageSearch,
  RotateCcw,
  TriangleAlert,
} from "lucide-react"
import { useTranslations } from "next-intl"

import {
  applySoUpdate,
  downloadSoUpdateTemplate,
  previewSoUpdate,
  SO_UPDATE_EXTENSIONS,
  SO_UPDATE_MAX_BYTES,
} from "@/app/sale/so_update/_components/api"
import { FilterChip } from "@/app/sale/so_update/_components/filter_chip"
import {
  PROBLEM_RESULTS,
  UPDATE_RESULTS,
  type SoUpdateApplied,
  type SoUpdateField,
  type SoUpdatePreview,
  type UpdateResult,
} from "@/app/sale/so_update/_components/model"
import {
  Alert,
  AlertContent,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

/**
 * update_card.tsx — card อัปเดตข้อมูลใบสั่งขายจาก Excel หนึ่งคอลัมน์ (06/10/2026)
 *
 * ใช้: <UpdateCard field="status" /> · <UpdateCard field="is_payment" /> (ดู upload.tsx)
 * 1) เลือกไฟล์ → /so-update-preview ตรวจ (ยังไม่เขียน) → card ตัวอย่าง: ทุกแถวในไฟล์ + ผลที่จะเกิด
 * 2) กดยืนยัน → /so-update-apply อัปเดตคอลัมน์ของ card นี้ เฉพาะแถวที่ผลเป็น "update" (API ตรวจซ้ำก่อนเขียน)
 * จับคู่ด้วย so_code — อัปเดตทุกบรรทัดสินค้าของใบนั้น · ไม่เก็บประวัติ (ผู้ใช้เลือก)
 *
 * คืน 2 ชิ้นเป็น fragment: card อัปโหลด (md:order-1) + card ตัวอย่าง/ผล (md:order-2 col-span-full)
 * จึงต้องวางในกริดของ upload.tsx — card อัปโหลดเรียงกันแถวบน ตัวอย่างเต็มแถวอยู่ล่าง
 * แต่ละ card ถือ state ของตัวเอง — ตัวอย่างและปุ่มยืนยันอยู่ใต้หัวเรื่องของคอลัมน์นั้นเสมอ ไม่ปนกัน
 */
const ACCEPT = [
  ...SO_UPDATE_EXTENSIONS.map((ext) => `.${ext}`),
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel.sheet.macroEnabled.12",
].join(",")

/** แถวในตารางตัวอย่างที่ render ทีละชุด — ไฟล์ใหญ่ (สูงสุด 5,000 แถว) จะได้ไม่หน่วงหน้า */
const ROWS_STEP = 200

/** สีป้ายผล — update สีหลัก · same จาง · ปัญหาเหลือง/แดง (สีไม่ได้สื่อความหมายลำพัง มีข้อความกำกับเสมอ) */
const RESULT_STYLE: Record<UpdateResult, string> = {
  update: "bg-info/12 text-info-ink",
  same: "bg-muted text-muted-foreground",
  not_found: "bg-danger/12 text-danger-ink",
  unknown_value: "bg-warning/18 text-warning-ink",
  empty_value: "bg-warning/18 text-warning-ink",
  duplicate: "bg-warning/18 text-warning-ink",
}

/** ตัวกรองตาราง — ทั้งหมด / ผลใดผลหนึ่ง */
type Filter = "all" | UpdateResult

/** ไอคอน + สีประจำของแต่ละ card (สีเดียวกันที่หัว card และหัวของตัวอย่าง จะได้รู้ว่าตัวอย่างเป็นของ card ไหน) */
const FIELD_ICON: Record<SoUpdateField, React.ComponentType<{ className?: string }>> = {
  status: ListChecks,
  is_payment: BadgeDollarSign,
  shipping_code: PackageSearch,
}
const FIELD_ACCENT: Record<SoUpdateField, { header: string; icon: string }> = {
  status: { header: "from-chart-1/15", icon: "bg-chart-1/15 text-chart-1" },
  is_payment: { header: "from-chart-2/15", icon: "bg-chart-2/15 text-chart-2" },
  shipping_code: { header: "from-chart-3/15", icon: "bg-chart-3/15 text-chart-3" },
}

export function UpdateCard({ field }: { field: SoUpdateField }) {
  const t = useTranslations("so_update")
  const tcommon = useTranslations("common.table")
  /** ชื่อเฉพาะของ card นี้ — ชื่อคอลัมน์ในไฟล์ / ชื่อทะเบียน / หัวตาราง */
  /** source = ค่ามาจากไหน (ทะเบียน… / ข้อความอิสระ) · rule = กติกาของค่าในกล่องรูปแบบไฟล์ */
  const tf = (key: "tab" | "column" | "source" | "rule" | "current" | "next") =>
    t(`fields.${field}.${key}`)

  const inputRef = React.useRef<HTMLInputElement>(null)
  const [preview, setPreview] = React.useState<SoUpdatePreview | null>(null)
  const [filter, setFilter] = React.useState<Filter>("all")
  const [shown, setShown] = React.useState(ROWS_STEP)
  /** กำลังตรวจไฟล์ / กำลังอัปเดต — ปิดปุ่มทั้งหมดระหว่างนั้น */
  const [busy, setBusy] = React.useState<"preview" | "apply" | "template" | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [applied, setApplied] = React.useState<SoUpdateApplied | null>(null)

  const pick = () => inputRef.current?.click()

  const onFile = async (file: File | undefined) => {
    // ล้างค่าใน input ทิ้ง — เลือกไฟล์เดิมซ้ำ (หลังแก้ไฟล์) onChange จะได้ทำงานอีกครั้ง
    if (inputRef.current) inputRef.current.value = ""
    if (!file) return
    setError(null)
    setApplied(null)
    const ext = file.name.split(".").pop()?.toLowerCase() ?? ""
    if (!SO_UPDATE_EXTENSIONS.includes(ext)) {
      setError(t("errors.extension"))
      return
    }
    if (file.size > SO_UPDATE_MAX_BYTES) {
      setError(t("errors.size"))
      return
    }
    setBusy("preview")
    try {
      const next = await previewSoUpdate(field, file)
      setPreview(next)
      setFilter("all")
      setShown(ROWS_STEP)
    } catch (cause) {
      // ห้าม console.error — ใน dev overlay จะขึ้นเต็มจอเหมือนหน้าพัง · ข้อความจาก API โชว์ตรง ๆ
      setPreview(null)
      setError(cause instanceof Error ? cause.message : t("errors.preview"))
    } finally {
      setBusy(null)
    }
  }

  /** แถวที่จะส่งไปอัปเดต — เฉพาะผล update (API ตรวจซ้ำอีกรอบก่อนเขียน) */
  const toUpdate = preview?.rows.filter((row) => row.result === "update") ?? []

  const apply = async () => {
    if (!toUpdate.length || busy) return
    setBusy("apply")
    setError(null)
    try {
      const result = await applySoUpdate(
        field,
        toUpdate.map((row) => ({ so_code: row.so_code, value: row.value }))
      )
      setApplied(result)
      setPreview(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("errors.apply"))
    } finally {
      setBusy(null)
    }
  }

  /** ดาวน์โหลดไฟล์ตัวอย่าง — API สร้างใหม่ทุกครั้ง dropdown สถานะจึงตรงกับทะเบียนปัจจุบัน */
  const downloadTemplate = async () => {
    if (busy) return
    setBusy("template")
    setError(null)
    try {
      const { blob, fileName } = await downloadSoUpdateTemplate(field)
      const href = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = href
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      link.remove()
      // เลื่อนการคืนหน่วยความจำออกไปนิด — บางเบราว์เซอร์ยังอ่าน URL อยู่ตอน click() คืนค่า
      setTimeout(() => URL.revokeObjectURL(href), 1000)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("errors.template"))
    } finally {
      setBusy(null)
    }
  }

  const reset = () => {
    setPreview(null)
    setApplied(null)
    setError(null)
  }

  const rows =
    preview?.rows.filter((row) => filter === "all" || row.result === filter) ?? []
  const problems = PROBLEM_RESULTS.reduce(
    (sum, result) => sum + (preview?.summary[result] ?? 0),
    0
  )

  const Icon = FIELD_ICON[field]
  const accent = FIELD_ACCENT[field]
  const header = (
    <CardHeader className={cn("border-border/60 border-b bg-gradient-to-r via-transparent to-transparent py-4", accent.header)}>
      <div className="flex items-start gap-3">
        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", accent.icon)}>
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 space-y-0.5">
          <CardTitle>{tf("tab")}</CardTitle>
          <CardDescription>{tf("source")}</CardDescription>
        </div>
        {/* รูปแบบไฟล์ — ปุ่ม "!" มุมขวาบนของหัว card กดดู (ผู้ใช้ขอแทนกรอบที่โชว์ตลอด) · ตัวปุ่มคือ PopoverTrigger เอง
            แต่งด้วย buttonVariants ไม่ซ้อน <Button> ข้างใน (ปุ่มซ้อนปุ่มเป็น HTML ผิด) */}
        <Popover>
          <PopoverTrigger
            aria-label={t("format.title")}
            title={t("format.title")}
            className={cn(buttonVariants({ variant: "outline", size: "icon" }), "text-info-ink ml-auto shrink-0")}
          >
            <CircleAlert />
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[22rem] max-w-[calc(100vw-2rem)] p-4">
            <PopoverHeader>
              <PopoverTitle className="flex items-center gap-1.5">
                <CircleAlert className="text-info-ink size-4" />
                {t("format.title")} — {tf("tab")}
              </PopoverTitle>
            </PopoverHeader>
            <ul className="text-muted-foreground list-disc space-y-1 pl-5 text-sm">
              <li>{t("format.template")}</li>
              <li>{t("format.columns", { column: tf("column") })}</li>
              <li>{t("format.match")}</li>
              <li>{tf("rule")}</li>
              <li>{t("format.limit")}</li>
            </ul>
          </PopoverContent>
        </Popover>
      </div>
    </CardHeader>
  )

  return (
    <>
      {/* ① card อัปโหลด — อยู่แถวบนเรียงกับ card อื่น (md:order-1) */}
      <Card className="border-primary/10 gap-0 overflow-hidden p-0 md:order-1">
        {header}
        <CardContent className="space-y-4 py-4">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={(event) => onFile(event.target.files?.[0])}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={pick}
              disabled={busy !== null}
              className="from-chart-1 to-chart-5 bg-gradient-to-r text-white transition-transform hover:-translate-y-0.5 hover:opacity-95"
            >
              {busy === "preview" ? <LoaderCircle className="animate-spin" /> : <FileUp />}
              {busy === "preview" ? t("checking") : t("pickFile")}
            </Button>
            <Button variant="outline" onClick={downloadTemplate} disabled={busy !== null}>
              {busy === "template" ? <LoaderCircle className="animate-spin" /> : <Download />}
              {t("downloadTemplate")}
            </Button>
          </div>

          {preview ? (
            <p className="text-foreground flex min-w-0 items-center gap-1.5 text-sm font-medium">
              <FileSpreadsheet className="text-primary size-4 shrink-0" />
              <span className="truncate">{preview.file_name}</span>
              <span className="text-muted-foreground shrink-0 font-normal">
                · {t("headerRow", { row: preview.header_row })}
              </span>
            </p>
          ) : (
            // ยังไม่ได้เลือกไฟล์ — บอกสั้น ๆ ว่าต้องมีคอลัมน์อะไร (รายละเอียดเต็มอยู่ในปุ่ม "!")
            <p className="text-muted-foreground text-sm">{t("fileHint", { column: tf("column") })}</p>
          )}

          {error ? (
            <Alert variant="destructive">
              <TriangleAlert />
              <AlertContent>
                <AlertTitle>{t("errors.title")}</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </AlertContent>
            </Alert>
          ) : null}

          {/* ผลหลังยืนยัน */}
          {applied ? (
            <Alert variant="success">
              <CircleCheck />
              <AlertContent>
                <AlertTitle>
                  {t("applied", { so: applied.updated_so, lines: applied.updated_lines, what: tf("tab") })}
                </AlertTitle>
                {applied.skipped.length ? (
                  <AlertDescription>
                    {t("appliedSkipped", { count: applied.skipped.length })}
                  </AlertDescription>
                ) : null}
              </AlertContent>
            </Alert>
          ) : null}
        </CardContent>
      </Card>

      {/* ② card ตัวอย่าง — เต็มความกว้าง ใต้ card ทั้งหมด (md:order-2) · มีเฉพาะตอนเลือกไฟล์แล้ว */}
      {preview ? (
        <Card className="border-primary/10 gap-0 overflow-hidden p-0 md:order-2 col-span-full">
          <CardHeader className={cn("border-border/60 border-b bg-gradient-to-r via-transparent to-transparent py-3", accent.header)}>
            <CardTitle className="flex items-center gap-2 text-base">
              <Icon className="size-4" />
              {t("previewTitle", { what: tf("tab") })}
            </CardTitle>
            <CardDescription className="truncate">{preview.file_name}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 py-4">
              {/* สรุปผล — กดเพื่อกรองตาราง */}
              <div className="flex flex-wrap items-center gap-2">
                <FilterChip
                  active={filter === "all"}
                  onClick={() => {
                    setFilter("all")
                    setShown(ROWS_STEP)
                  }}
                  label={t("filterAll")}
                  count={preview.rows.length}
                />
                {UPDATE_RESULTS.filter((result) => preview.summary[result]).map((result) => (
                  <FilterChip
                    key={result}
                    active={filter === result}
                    onClick={() => {
                      setFilter(result)
                      setShown(ROWS_STEP)
                    }}
                    label={t(`result.${result}`)}
                    count={preview.summary[result] ?? 0}
                    className={RESULT_STYLE[result]}
                  />
                ))}
              </div>

              <div className="border-border/60 w-0 min-w-full overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader className="bg-muted/60">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-muted-foreground w-20 pl-4 text-xs font-semibold tracking-wide uppercase">{t("columns.row")}</TableHead>
                      <TableHead className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{t("columns.so_code")}</TableHead>
                      <TableHead className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{tf("current")}</TableHead>
                      <TableHead className="w-8" />
                      <TableHead className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{tf("next")}</TableHead>
                      <TableHead className="text-muted-foreground w-20 text-right text-xs font-semibold tracking-wide uppercase">{t("columns.lines")}</TableHead>
                      <TableHead className="text-muted-foreground pr-4 text-xs font-semibold tracking-wide uppercase">{t("columns.result")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.slice(0, shown).map((row) => (
                      <TableRow key={row.row} className="border-border/50">
                        <TableCell className="text-muted-foreground py-1.5 pl-4 font-mono text-xs">{row.row}</TableCell>
                        <TableCell className="py-1.5 font-mono text-xs font-semibold">{row.so_code || "—"}</TableCell>
                        <TableCell className="text-muted-foreground py-1.5">{row.current.join(", ") || "—"}</TableCell>
                        <TableCell className="text-muted-foreground py-1.5">
                          <ArrowRight className="size-3.5" />
                        </TableCell>
                        <TableCell className={cn("py-1.5", row.result === "update" && "font-medium")}>{row.value || "—"}</TableCell>
                        <TableCell className="text-muted-foreground py-1.5 text-right tabular-nums">{row.lines || ""}</TableCell>
                        <TableCell className="py-1.5 pr-4">
                          <Badge variant="secondary" className={cn("border-transparent font-medium", RESULT_STYLE[row.result])}>
                            {t(`result.${row.result}`)}
                          </Badge>
                          {row.duplicate_of ? (
                            <span className="text-muted-foreground ml-2 text-xs">
                              {t("duplicateOf", { row: row.duplicate_of })}
                            </span>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))}
                    {rows.length === 0 ? (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={7} className="text-muted-foreground py-10 text-center">
                          {tcommon("empty")}
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </div>

              {rows.length > shown ? (
                <div className="flex items-center justify-center gap-3 text-sm">
                  <span className="text-muted-foreground">
                    {t("shownOf", { shown, total: rows.length })}
                  </span>
                  <Button variant="outline" size="sm" onClick={() => setShown((n) => n + ROWS_STEP)}>
                    {t("showMore")}
                  </Button>
                </div>
              ) : null}

              {/* ยืนยัน — อัปเดตเฉพาะแถว update · แถวที่มีปัญหาข้ามไป */}
              <div className="border-border/60 flex flex-wrap items-center justify-end gap-3 border-t pt-4">
                {problems ? (
                  <span className="text-warning-ink mr-auto inline-flex items-center gap-1.5 text-sm">
                    <TriangleAlert className="size-4" />
                    {t("problemsSkipped", { count: problems })}
                  </span>
                ) : null}
                <Button variant="outline" onClick={reset} disabled={busy !== null}>
                  <RotateCcw /> {t("cancel")}
                </Button>
                <Button
                  onClick={apply}
                  disabled={busy !== null || toUpdate.length === 0}
                  className="from-chart-1 to-chart-5 bg-gradient-to-r text-white transition-transform hover:-translate-y-0.5 hover:opacity-95"
                >
                  {busy === "apply" ? <LoaderCircle className="animate-spin" /> : <CircleCheck />}
                  {toUpdate.length
                    ? t("confirm", { count: toUpdate.length })
                    : t("nothingToUpdate")}
                </Button>
              </div>
          </CardContent>
        </Card>
      ) : null}
    </>
  )
}
