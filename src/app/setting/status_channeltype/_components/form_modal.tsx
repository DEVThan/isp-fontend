"use client"

import * as React from "react"
import { CircleCheck, LoaderCircle, TriangleAlert } from "lucide-react"
import { useTranslations } from "next-intl"

import { saveChannelType } from "@/app/setting/status_channeltype/_components/api"
import {
  CHANNEL_ACTIVE,
  CHANNEL_INACTIVE,
  type ChannelType,
  type ChannelTypeFormMode,
  type ChannelTypeFormValues,
} from "@/app/setting/status_channeltype/_components/model"
import { SelectOption } from "@/app/setting/status_channeltype/_components/selectoption"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

/**
 * form_modal.tsx — ฟอร์มเพิ่ม/แก้ไขช่องทางการขายในกล่องซ้อน
 *
 * ปุ่มที่เปิดฟอร์มเป็นคนบอกโหมดมาเอง: "add" เปิดฟอร์มเปล่า "edit" เปิดพร้อมค่าของแถวนั้น
 * กดบันทึกแล้วยิง POST /api/web/status-channeltype-action เอง เสร็จแล้วบอกพ่อผ่าน onSaved ให้โหลดตารางใหม่
 */
// คลาสขอบแดง — ต้องสลับคลาสเอง ไม่ใช้ variant aria-invalid: เพราะ Tailwind v4 ห่อ variant
// ด้วย :where() ความจำเพาะจึงเท่ากับ border-input แล้วแพ้ลำดับใน stylesheet
const INVALID_FIELD =
  "border-destructive ring-3 ring-destructive/20 dark:border-destructive/50 dark:ring-destructive/40"

const emptyValues: ChannelTypeFormValues = {
  name: "",
  logo: "",
  detail: "",
  active_status: CHANNEL_ACTIVE,
}

const toValues = (channel: ChannelType | undefined): ChannelTypeFormValues =>
  channel
    ? {
        name: channel.name,
        logo: channel.logo ?? "",
        detail: channel.detail ?? "",
        active_status: channel.active_status,
      }
    : emptyValues

export function FormModal({
  open,
  onOpenChange,
  mode,
  channel,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** ปุ่มไหนเป็นคนเปิด — "add" หรือ "edit" */
  mode: ChannelTypeFormMode
  /** แถวที่กำลังแก้ (โหมด edit เท่านั้น) */
  channel?: ChannelType
  /** บันทึกสำเร็จแล้ว — ตารางเอาไปโหลดข้อมูลใหม่ */
  onSaved?: () => void
}) {
  const t = useTranslations("common")
  const tr = useTranslations("channeltypes")
  const tform = useTranslations("channeltypes.form")
  const tcol = useTranslations("channeltypes.columns")

  const [values, setValues] = React.useState(() => toValues(channel))
  const [saving, setSaving] = React.useState(false)
  /** ชื่อช่องทางยังว่างตอนกดบันทึก — ตรวจเองแทน required ของเบราว์เซอร์ */
  const [nameError, setNameError] = React.useState(false)
  /** ผลของการกดบันทึกครั้งล่าสุด — null คือยังไม่ได้กด */
  const [result, setResult] = React.useState<{
    ok: boolean
    message?: string
  } | null>(null)

  /**
   * เปิดใหม่หรือสลับแถวเมื่อไหร่ ให้ล้างค่าในฟอร์มทิ้ง
   * ปรับ state ระหว่าง render ตามแบบที่ React แนะนำ ไม่ใช้ useEffect ไป setState
   * (กฎ react-hooks/set-state-in-effect ของ eslint-config-next 16 ห้ามไว้)
   */
  const formKey = `${mode}-${channel?.id ?? "new"}-${String(open)}`
  const [lastKey, setLastKey] = React.useState(formKey)
  if (formKey !== lastKey) {
    setLastKey(formKey)
    setValues(toValues(channel))
    setResult(null)
    setSaving(false)
    setNameError(false)
  }

  const set = <K extends keyof ChannelTypeFormValues>(
    key: K,
    value: ChannelTypeFormValues[K]
  ) => setValues((current) => ({ ...current, [key]: value }))

  const statusOptions = [
    { value: CHANNEL_ACTIVE, label: tr("active") },
    { value: CHANNEL_INACTIVE, label: tr("inactive") },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        {/* แถบหัวไล่เฉดชุดเดียวกับแถบตัวกรองในตาราง */}
        <DialogHeader className="from-primary/12 border-border/60 -mx-4 -mt-4 rounded-t-xl border-b bg-gradient-to-r via-transparent to-transparent p-4">
          <DialogTitle>
            {mode === "add" ? tform("addTitle") : tform("editTitle")}
          </DialogTitle>
          <DialogDescription>
            {mode === "add"
              ? tform("addDescription")
              : tform("editDescription")}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={async (event) => {
            event.preventDefault()
            if (saving) return
            if (!values.name.trim()) {
              setNameError(true)
              return
            }
            setNameError(false)
            setSaving(true)
            setResult(null)
            try {
              // โหมดของฟอร์มคือ action ที่ API ใช้ตัดสินใจ ("add" / "edit")
              await saveChannelType(mode, values, channel?.id)
              setResult({ ok: true })
              onSaved?.()
              // ให้เห็นข้อความว่าสำเร็จสักครู่ก่อนปิด ไม่งั้นกล่องหายไปเลยเหมือนไม่มีอะไรเกิดขึ้น
              setTimeout(() => onOpenChange(false), 1400)
            } catch (error) {
              // ข้อความจาก API บอกสาเหตุตรง ๆ (เช่น "name already exists") เอามาแสดงต่อ
              setResult({
                ok: false,
                message: error instanceof Error ? error.message : undefined,
              })
            } finally {
              setSaving(false)
            }
          }}
          className="grid gap-4"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="channel-name"
              label={tcol("name")}
              required
              error={nameError ? t("required") : undefined}
            >
              <Input
                id="channel-name"
                value={values.name}
                onChange={(event) => {
                  set("name", event.target.value)
                  if (event.target.value.trim()) setNameError(false)
                }}
                placeholder="..."
                aria-required
                aria-invalid={nameError || undefined}
                className={nameError ? INVALID_FIELD : undefined}
              />
            </Field>
            <Field id="channel-status" label={tcol("status")}>
              <SelectOption
                id="channel-status"
                options={statusOptions}
                value={values.active_status}
                onValueChange={(next) =>
                  set("active_status", next ?? CHANNEL_ACTIVE)
                }
                placeholder={tr("active")}
                label={tcol("status")}
              />
            </Field>
          </div>

          {/* logo เก็บเป็นข้อความล้วน (path / URL) — API ไม่ได้ตรวจว่าเป็นรูปจริง จึงเป็นแค่ช่องพิมพ์ */}
          <Field id="channel-logo" label={tcol("logo")}>
            <Input
              id="channel-logo"
              value={values.logo}
              placeholder="/img/channel/pptv.png"
              onChange={(event) => set("logo", event.target.value)}
            />
          </Field>

          <Field id="channel-detail" label={tcol("detail")}>
            <Textarea
              id="channel-detail"
              rows={2}
              value={values.detail}
              placeholder="..."
              onChange={(event) => set("detail", event.target.value)}
            />
          </Field>

          {result ? (
            <Alert variant={result.ok ? "success" : "destructive"}>
              {result.ok ? <CircleCheck /> : <TriangleAlert />}
              <AlertContent>
                <AlertTitle>
                  {result.ok ? tform("saved") : tform("saveError")}
                </AlertTitle>
                {result.message ? (
                  <AlertDescription>{result.message}</AlertDescription>
                ) : null}
              </AlertContent>
            </Alert>
          ) : null}

          {/* แถบท้ายไล่เฉดชุดเดียวกับแถบแบ่งหน้าในตาราง */}
          <DialogFooter className="from-primary/12 border-border/60 bg-transparent bg-gradient-to-r via-transparent to-transparent">
            <DialogClose
              render={
                <Button type="button" variant="outline" disabled={saving} />
              }
            >
              {t("cancel")}
            </DialogClose>
            <Button
              type="submit"
              disabled={saving}
              className="from-chart-1 to-chart-5 bg-gradient-to-r text-white transition-transform hover:-translate-y-0.5 hover:opacity-95"
            >
              {saving ? <LoaderCircle className="animate-spin" /> : null}
              {t("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** ป้ายกำกับ + ช่องกรอก วางแบบเดียวกันทุกช่อง */
function Field({
  id,
  label,
  required,
  error,
  children,
}: {
  id: string
  label: string
  /** ใส่ดอกจันให้รู้ตั้งแต่ก่อนกดบันทึกว่าช่องนี้ต้องกรอก */
  required?: boolean
  /** ข้อความผิดพลาดใต้ช่อง — ขึ้นตอนกดบันทึกแล้วยังไม่ได้กรอก */
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-muted-foreground text-xs">
        {label}
        {required ? (
          <span aria-hidden className="text-destructive -ml-1.5">
            *
          </span>
        ) : null}
      </Label>
      {children}
      {error ? <p className="text-destructive text-xs">{error}</p> : null}
    </div>
  )
}
