"use client"

import * as React from "react"
import { CircleCheck, FileSpreadsheet, LoaderCircle, TriangleAlert } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"

import {
  applySoSheet,
  previewSoSheet,
  type SoSheetApplyResult,
  type SoSheetPreview,
} from "@/app/sale/so/_components/api"
import {
  Alert,
  AlertContent,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
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

/**
 * sheet_button.tsx — ปุ่ม "อัปเดตจาก Google Sheet" ที่หัวตาราง so (12/10/2026) + กล่องยืนยัน
 *
 * /so-sheet-apply **ล้างตาราง so ทั้งหมดแล้วลงใหม่จาก sheet** จึงไม่ยิงทันทีที่กดปุ่ม:
 *   1. กดปุ่ม -> เปิดกล่อง + ยิง /so-sheet-preview (อ่านอย่างเดียว) ให้เห็นว่าจะลงกี่แถวและอะไรจะหาย
 *   2. ผู้ใช้กดยืนยัน -> /so-sheet-apply · ระหว่างนั้นปิดกล่องไม่ได้
 *   3. สำเร็จ -> onApplied ให้ตารางโหลดใหม่ · API สั่ง sync ต้นทางต่อเอง (รันเบื้องหลัง ไม่รอ)
 * preview ไม่ผ่าน = กดยืนยันไม่ได้ (ไม่รู้ว่าจะเสียอะไร ก็ไม่ควรล้าง)
 * ทุกขั้นเริ่มจากการกดของผู้ใช้ ไม่มี effect — เปิดกล่องใหม่ทุกครั้ง state ถูกตั้งใหม่ใน openDialog
 */

type Phase =
  | { step: "checking" }
  | { step: "previewError"; message?: string }
  | { step: "ready"; preview: SoSheetPreview }
  | { step: "applying"; preview: SoSheetPreview }
  | { step: "applyError"; preview: SoSheetPreview; message?: string }
  | { step: "done"; result: SoSheetApplyResult }

export function SheetButton({ onApplied }: { onApplied: () => void }) {
  const t = useTranslations("common")
  const tsheet = useTranslations("so.sheet")
  const locale = useLocale()
  const nf = new Intl.NumberFormat(locale)

  const [open, setOpen] = React.useState(false)
  const [phase, setPhase] = React.useState<Phase>({ step: "checking" })
  /** กล่องรอบไหนเป็นเจ้าของคำตอบ — ปิดแล้วเปิดใหม่ระหว่างที่ preview รอบเก่ายังไม่กลับ คำตอบเก่าต้องถูกทิ้ง */
  const round = React.useRef(0)

  const check = async () => {
    const mine = ++round.current
    setPhase({ step: "checking" })
    try {
      const preview = await previewSoSheet()
      if (mine !== round.current) return
      setPhase(
        preview ? { step: "ready", preview } : { step: "previewError" }
      )
    } catch (error) {
      // ห้าม console.error — ใน dev overlay จะขึ้นเต็มจอเหมือนหน้าพัง · ข้อความจาก API โชว์ตรง ๆ
      if (mine !== round.current) return
      setPhase({
        step: "previewError",
        message: error instanceof Error ? error.message : undefined,
      })
    }
  }

  const openDialog = () => {
    setOpen(true)
    void check()
  }

  const apply = async (preview: SoSheetPreview) => {
    setPhase({ step: "applying", preview })
    try {
      const result = await applySoSheet()
      if (!result) throw new Error()
      setPhase({ step: "done", result })
      onApplied()
    } catch (error) {
      setPhase({
        step: "applyError",
        preview,
        message: error instanceof Error && error.message ? error.message : undefined,
      })
    }
  }

  const applying = phase.step === "applying"
  const preview = "preview" in phase ? phase.preview : null
  const losses = preview
    ? [
        { key: "lossEdited" as const, count: preview.current.edited_rows },
        { key: "lossExportGroup" as const, count: preview.current.export_group_rows },
        { key: "lossNotInSheet" as const, count: preview.current.so_codes_not_in_sheet },
      ].filter((loss) => loss.count > 0)
    : []

  return (
    <>
      <Button
        variant="outline"
        onClick={openDialog}
        className="border-success bg-success hover:bg-success/90 dark:border-success dark:bg-success dark:hover:bg-success/90 cursor-pointer gap-1.5 text-white hover:text-white disabled:cursor-not-allowed"
      >
        <FileSpreadsheet />
        {tsheet("button")}
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          // กำลังล้าง/ลงข้อมูลอยู่ ห้ามปิด — ปิดแล้วจะไม่เห็นผล ทั้งที่งานฝั่ง API ยังเดินต่อ
          if (applying) return
          if (!next) round.current++
          setOpen(next)
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader className="from-primary/12 border-border/60 -mx-4 -mt-4 rounded-t-xl border-b bg-gradient-to-r via-transparent to-transparent p-4">
            <DialogTitle>{tsheet("title")}</DialogTitle>
          </DialogHeader>

          <DialogDescription>{tsheet("description")}</DialogDescription>

          {phase.step === "checking" ? (
            <Alert variant="info" aria-live="polite">
              <LoaderCircle className="animate-spin" />
              <AlertContent>
                <AlertTitle>{tsheet("checking")}</AlertTitle>
                <AlertDescription>{tsheet("checkingHint")}</AlertDescription>
              </AlertContent>
            </Alert>
          ) : null}

          {phase.step === "previewError" ? (
            <Alert variant="destructive">
              <TriangleAlert />
              <AlertContent>
                <AlertTitle>{tsheet("previewError")}</AlertTitle>
                {phase.message ? <AlertDescription>{phase.message}</AlertDescription> : null}
              </AlertContent>
            </Alert>
          ) : null}

          {preview ? (
            <>
              <dl className="border-border/60 divide-border/60 divide-y rounded-lg border text-sm">
                {[
                  { label: tsheet("sheetRows"), value: preview.sheet_rows },
                  { label: tsheet("willInsert"), value: preview.will_insert },
                  { label: tsheet("skipped"), value: preview.skipped_count },
                  { label: tsheet("currentRows"), value: preview.current.so_rows },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-4 px-3 py-2">
                    <dt className="text-muted-foreground">{item.label}</dt>
                    <dd className="font-medium tabular-nums">{nf.format(item.value)}</dd>
                  </div>
                ))}
              </dl>

              {/* สิ่งที่มีแค่ในตาราง so — ล้างแล้วไม่กลับมาจาก sheet */}
              <Alert variant={losses.length > 0 ? "destructive" : "info"}>
                <TriangleAlert />
                <AlertContent>
                  <AlertTitle>{tsheet("lossTitle")}</AlertTitle>
                  <AlertDescription>
                    {losses.length > 0 ? (
                      <ul className="list-disc pl-4">
                        {losses.map((loss) => (
                          <li key={loss.key}>{tsheet(loss.key, { count: nf.format(loss.count) })}</li>
                        ))}
                      </ul>
                    ) : (
                      tsheet("lossNone")
                    )}
                  </AlertDescription>
                </AlertContent>
              </Alert>

              <p className="text-muted-foreground text-xs">{tsheet("backupHint")}</p>
            </>
          ) : null}

          {applying ? (
            <Alert variant="info" aria-live="polite">
              <LoaderCircle className="animate-spin" />
              <AlertContent>
                <AlertTitle>{tsheet("applying")}</AlertTitle>
                <AlertDescription>{tsheet("applyingHint")}</AlertDescription>
              </AlertContent>
            </Alert>
          ) : null}

          {phase.step === "applyError" ? (
            <Alert variant="destructive" aria-live="polite">
              <TriangleAlert />
              <AlertContent>
                <AlertTitle>{tsheet("applyError")}</AlertTitle>
                <AlertDescription>
                  {phase.message ? <p>{phase.message}</p> : null}
                  <p>{tsheet("applyErrorHint")}</p>
                </AlertDescription>
              </AlertContent>
            </Alert>
          ) : null}

          {phase.step === "done" ? (
            <Alert variant="success" aria-live="polite">
              <CircleCheck />
              <AlertContent>
                <AlertTitle>{tsheet("success")}</AlertTitle>
                <AlertDescription>
                  <p>
                    {tsheet("successDetail", {
                      deleted: nf.format(phase.result.deleted),
                      inserted: nf.format(phase.result.inserted),
                    })}
                  </p>
                  <p>
                    {phase.result.protocall_sync?.started
                      ? tsheet("protocallStarted")
                      : tsheet("protocallNotStarted", {
                          message: phase.result.protocall_sync?.message ?? "-",
                        })}
                  </p>
                </AlertDescription>
              </AlertContent>
            </Alert>
          ) : null}

          <DialogFooter className="from-primary/12 border-border/60 bg-transparent bg-gradient-to-r via-transparent to-transparent">
            <DialogClose render={<Button type="button" variant="outline" disabled={applying} />}>
              {phase.step === "done" ? t("close") : t("cancel")}
            </DialogClose>
            {phase.step === "previewError" ? (
              <Button variant="outline" onClick={() => void check()}>
                {tsheet("retry")}
              </Button>
            ) : null}
            {phase.step !== "done" && phase.step !== "previewError" ? (
              <Button
                variant="destructive"
                disabled={phase.step !== "ready" && phase.step !== "applyError"}
                onClick={() => {
                  if (preview && !applying) void apply(preview)
                }}
              >
                {applying ? <LoaderCircle className="animate-spin" /> : null}
                {tsheet("confirm")}
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
