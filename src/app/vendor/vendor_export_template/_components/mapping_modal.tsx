"use client"

import * as React from "react"
import {
  CircleCheck,
  Columns3,
  LoaderCircle,
  Sparkles,
  TriangleAlert,
} from "lucide-react"
import { useTranslations } from "next-intl"

import {
  getTemplateMapping,
  saveTemplateMapping,
} from "@/app/vendor/vendor_export_template/_components/api"
import {
  previewExpr,
  VIRTUAL_FIELDS,
  type TemplateMapping,
} from "@/app/vendor/vendor_export_template/_components/model"
import {
  SelectOption,
  type SelectOptionItem,
} from "@/app/vendor/vendor_export_template/_components/selectoption"
import {
  Alert,
  AlertContent,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

/**
 * mapping_modal.tsx — หน้าจับคู่คอลัมน์ของไฟล์เทมเพลต กับข้อมูลใบสั่งขาย
 *
 * API อ่านแถวหัวตารางในไฟล์ แล้วเดาให้ว่าแต่ละคอลัมน์คือข้อมูลอะไร (จากคำที่เคยจับคู่ไว้ + พจนานุกรม)
 * ผู้ใช้ตรวจ/แก้แล้วบันทึก — ทุกคู่ที่บันทึกถูกจำไว้ เทมเพลตถัดไปที่หัวคอลัมน์เหมือนกันจึงจับคู่ได้เอง
 * แต่ละคอลัมน์เลือกได้สามแบบ: ช่องข้อมูลหนึ่งช่อง · "กำหนดเอง" (นิพจน์ เช่น "{pay_by} {amount}" หรือค่าคงที่)
 * · ปล่อยว่าง (ล้างตัวเลือก)
 */

/** ค่าในช่องเลือกที่หมายถึง "กำหนดเอง" — ไม่ชนกับชื่อช่องจริง (ชื่อช่องไม่มีขีดสองตัว) */
const CUSTOM = "__custom__"

/** นิพจน์ที่เป็นช่องข้อมูลช่องเดียวล้วน ๆ -> ชื่อช่อง · นอกนั้น null */
const singleField = (expr: string, fields: string[]) => {
  const match = /^\{([A-Za-z_][A-Za-z0-9_]*)\}$/.exec(expr.trim())
  return match && fields.includes(match[1]) ? match[1] : null
}

/** คอลัมน์ที่ต้องเปิดช่องพิมพ์นิพจน์ตั้งแต่แรก — มีค่าแต่ไม่ใช่ช่องเดียวล้วน ๆ */
const customColumns = (data: TemplateMapping) =>
  new Set(
    data.columns
      .filter((col) => col.expr && !singleField(col.expr, data.fields))
      .map((col) => col.column)
  )

export function MappingModal({
  open,
  onOpenChange,
  templateId,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** เทมเพลตที่จะจับคู่ — ต้องมีไฟล์แล้ว */
  templateId?: number
  /** บันทึกสำเร็จ — ตารางเอาไปโหลดใหม่ (ป้าย "จับคู่แล้ว") */
  onSaved?: () => void
}) {
  const t = useTranslations("common")
  const tmap = useTranslations("vendorexporttemplates.mapping")
  const tfield = useTranslations("vendorexporttemplates.mapping.fields")
  const tso = useTranslations("so_export.columns")

  const [data, setData] = React.useState<TemplateMapping | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [loadError, setLoadError] = React.useState<string | null>(null)
  /** นิพจน์ของแต่ละคอลัมน์ที่กำลังแก้ — ตัวอักษรคอลัมน์ -> นิพจน์ */
  const [exprs, setExprs] = React.useState<Record<string, string>>({})
  /** คอลัมน์ที่เลือก "กำหนดเอง" — เปิดช่องพิมพ์นิพจน์ */
  const [custom, setCustom] = React.useState<ReadonlySet<string>>(() => new Set())
  const [saving, setSaving] = React.useState(false)
  const [result, setResult] = React.useState<{ ok: boolean; message?: string } | null>(null)
  /** เลขคำขอล่าสุด — เปลี่ยนแถวหัวตารางรัว ๆ ผลของคำขอเก่าต้องถูกทิ้ง */
  const latest = React.useRef(0)

  // เปิดใหม่ / สลับเทมเพลต ล้างของรอบก่อนทิ้ง (ปรับ state ระหว่าง render ไม่ใช้ effect)
  const key = `${templateId ?? "none"}-${String(open)}`
  const [lastKey, setLastKey] = React.useState(key)
  if (key !== lastKey) {
    setLastKey(key)
    setData(null)
    setLoadError(null)
    setResult(null)
    setSaving(false)
  }

  /** ดึงหัวคอลัมน์ + การจับคู่ — ไม่ส่ง sheet/headerRow = ที่บันทึกไว้ หรือให้ API หาเอง */
  const load = (sheet?: string, headerRow?: number) => {
    if (!templateId) return
    const id = ++latest.current
    setLoading(true)
    setLoadError(null)
    setResult(null)
    getTemplateMapping(templateId, sheet, headerRow)
      .then((next) => {
        if (id !== latest.current) return
        setData(next)
        setExprs(Object.fromEntries(next.columns.map((col) => [col.column, col.expr])))
        setCustom(customColumns(next))
      })
      .catch((error) => {
        // ห้าม console.error — ใน dev overlay จะขึ้นเต็มจอ
        if (id !== latest.current) return
        setLoadError(error instanceof Error && error.message ? error.message : tmap("loadError"))
      })
      .finally(() => {
        if (id === latest.current) setLoading(false)
      })
  }

  // ดึงครั้งแรกตอนเปิด — ผ่าน setTimeout เพราะ set state ตรง ๆ ใน effect ผิดกฎ react-hooks/set-state-in-effect
  React.useEffect(() => {
    if (!open || !templateId) return
    const start = setTimeout(() => load())
    return () => clearTimeout(start)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ดึงใหม่เฉพาะตอนเปิด/สลับเทมเพลต ที่เหลือเรียกจากตัวเลือกชีต/แถว
  }, [open, templateId])

  /** ป้ายของช่องข้อมูล — ช่องคำนวณมีคำแปลของตัวเอง ช่องของ so ใช้ชื่อคอลัมน์ชุดเดียวกับหน้าส่งออก */
  const fieldLabel = (field: string) => {
    if ((VIRTUAL_FIELDS as readonly string[]).includes(field)) {
      return tfield(field as (typeof VIRTUAL_FIELDS)[number])
    }
    return tso.has(field as Parameters<typeof tso>[0])
      ? tso(field as Parameters<typeof tso>[0])
      : field
  }

  const fieldOptions: SelectOptionItem[] = [
    ...(data?.fields ?? []).map((field) => ({
      value: field,
      label: `${fieldLabel(field)} · ${field}`,
    })),
    { value: CUSTOM, label: tmap("custom") },
  ]

  const mappedCount = Object.values(exprs).filter((expr) => expr.trim()).length

  const setExpr = (column: string, expr: string) => {
    setExprs((current) => ({ ...current, [column]: expr }))
    setResult(null)
  }

  const toggleCustom = (column: string, on: boolean) =>
    setCustom((current) => {
      const next = new Set(current)
      if (on) next.add(column)
      else next.delete(column)
      return next
    })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader className="from-primary/12 border-border/60 -mx-4 -mt-4 rounded-t-xl border-b bg-gradient-to-r via-transparent to-transparent p-4">
          <DialogTitle className="flex items-center gap-2">
            <Columns3 className="text-primary size-5" />
            {tmap("title")}
            {data ? <span className="text-muted-foreground font-normal">— {data.name}</span> : null}
          </DialogTitle>
          <DialogDescription>{tmap("description")}</DialogDescription>
        </DialogHeader>

        {loadError ? (
          <Alert variant="destructive">
            <TriangleAlert />
            <AlertContent>
              <AlertTitle>{tmap("loadError")}</AlertTitle>
              <AlertDescription>{loadError}</AlertDescription>
            </AlertContent>
          </Alert>
        ) : null}

        {data ? (
          <div className="grid gap-4">
            {/* ชีต (โชว์เฉพาะไฟล์ที่มีหลายชีต) + แถวหัวตาราง — เปลี่ยนแล้ว API อ่านหัวใหม่และเดาใหม่ */}
            <div className="grid gap-4 sm:grid-cols-3">
              {data.sheets.length > 1 ? (
                <div className="space-y-2">
                  <Label className="text-muted-foreground w-fit text-xs">{tmap("sheet")}</Label>
                  <SelectOption
                    id="mapping-sheet"
                    options={data.sheets.map((sheet) => ({ value: sheet, label: sheet }))}
                    value={data.sheet}
                    onValueChange={(next) => {
                      if (next && next !== data.sheet) load(next)
                    }}
                    placeholder={tmap("sheet")}
                    label={tmap("sheet")}
                  />
                </div>
              ) : null}
              <div className="space-y-2 sm:col-span-2">
                <Label className="text-muted-foreground w-fit text-xs">{tmap("headerRow")}</Label>
                <SelectOption
                  id="mapping-header-row"
                  options={data.rows.map((row) => ({
                    value: String(row.row),
                    label: tmap("rowOption", { row: row.row, text: row.text }),
                  }))}
                  value={String(data.header_row)}
                  onValueChange={(next) => {
                    if (next && Number(next) !== data.header_row) load(data.sheet, Number(next))
                  }}
                  placeholder={tmap("headerRow")}
                  label={tmap("headerRow")}
                />
              </div>
            </div>

            <div className="border-border/60 relative overflow-hidden rounded-lg border">
              {loading ? (
                <div className="bg-card/70 absolute inset-0 z-10 flex items-start justify-center pt-10 backdrop-blur-[1px]">
                  <LoaderCircle className="text-primary size-6 animate-spin" />
                </div>
              ) : null}
              <Table>
                <TableHeader className="bg-muted/60">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-muted-foreground w-14 pl-4 text-xs font-semibold uppercase">{tmap("column")}</TableHead>
                    <TableHead className="text-muted-foreground w-[30%] text-xs font-semibold uppercase">{tmap("header")}</TableHead>
                    <TableHead className="text-muted-foreground w-[38%] text-xs font-semibold uppercase">{tmap("field")}</TableHead>
                    <TableHead className="text-muted-foreground pr-4 text-xs font-semibold uppercase">{tmap("preview")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.columns.map((col) => {
                    const expr = exprs[col.column] ?? ""
                    const isCustom = custom.has(col.column)
                    const selected = isCustom ? CUSTOM : singleField(expr, data.fields)
                    const preview = expr ? previewExpr(expr, data.sample) : ""
                    return (
                      <TableRow key={col.column} className="border-border/50 align-top hover:bg-transparent">
                        <TableCell className="py-2 pl-4">
                          <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 font-mono text-xs font-semibold">
                            {col.column}
                          </span>
                        </TableCell>
                        <TableCell className="py-2 whitespace-normal">
                          <div className="font-medium break-words">{col.header}</div>
                          {/* ระบบเดาให้ — ยังไม่เคยบันทึก ให้ผู้ใช้ตรวจก่อน */}
                          {col.guessed && expr === col.expr && expr ? (
                            <Badge variant="secondary" className="bg-info/12 text-info-ink mt-1 gap-1 border-transparent font-medium">
                              <Sparkles className="size-3" />
                              {tmap("guessed")}
                            </Badge>
                          ) : null}
                        </TableCell>
                        <TableCell className="space-y-2 py-2">
                          <SelectOption
                            id={`mapping-${col.column}`}
                            options={fieldOptions}
                            value={selected}
                            onValueChange={(next) => {
                              if (next === CUSTOM) {
                                toggleCustom(col.column, true)
                                return
                              }
                              toggleCustom(col.column, false)
                              setExpr(col.column, next ? `{${next}}` : "")
                            }}
                            placeholder={tmap("none")}
                            label={col.header}
                          />
                          {isCustom ? (
                            <Input
                              value={expr}
                              onChange={(event) => setExpr(col.column, event.target.value)}
                              placeholder={tmap("customPlaceholder")}
                              aria-label={`${col.header} — ${tmap("custom")}`}
                              className="font-mono text-sm"
                            />
                          ) : null}
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-[220px] py-2 pr-4 text-sm break-words whitespace-normal">
                          {preview}
                        </TableCell>
                      </TableRow>
                    )
                  })}

                  {data.columns.length === 0 ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={4} className="text-muted-foreground py-8 text-center">
                        {tmap("noHeaders")}
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
            <p className="text-muted-foreground text-xs">{tmap("hint")}</p>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-12">
            <LoaderCircle className="text-primary size-6 animate-spin" />
          </div>
        ) : null}

        {result ? (
          <Alert variant={result.ok ? "success" : "destructive"}>
            {result.ok ? <CircleCheck /> : <TriangleAlert />}
            <AlertContent>
              <AlertTitle>{result.ok ? tmap("saved") : tmap("saveError")}</AlertTitle>
              {result.message ? <AlertDescription>{result.message}</AlertDescription> : null}
            </AlertContent>
          </Alert>
        ) : null}

        <DialogFooter className="from-primary/12 border-border/60 items-center bg-transparent bg-gradient-to-r via-transparent to-transparent">
          {data ? (
            <span className="text-muted-foreground mr-auto text-sm">
              {tmap("mappedCount", { count: mappedCount, total: data.columns.length })}
            </span>
          ) : null}
          <DialogClose render={<Button type="button" variant="outline" disabled={saving} />}>
            {t("cancel")}
          </DialogClose>
          <Button
            type="button"
            disabled={!data || saving || loading || mappedCount === 0}
            onClick={async () => {
              if (!data || !templateId) return
              setSaving(true)
              setResult(null)
              try {
                await saveTemplateMapping(templateId, data.sheet, data.header_row, exprs)
                setResult({ ok: true })
                onSaved?.()
                setTimeout(() => onOpenChange(false), 1200)
              } catch (error) {
                // ข้อความจาก API บอกสาเหตุตรง ๆ (เช่นชื่อช่องใน {…} ผิด)
                setResult({
                  ok: false,
                  message: error instanceof Error ? error.message : undefined,
                })
              } finally {
                setSaving(false)
              }
            }}
            className="from-chart-1 to-chart-5 bg-gradient-to-r text-white transition-transform hover:-translate-y-0.5 hover:opacity-95"
          >
            {saving ? <LoaderCircle className="animate-spin" /> : null}
            {t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
