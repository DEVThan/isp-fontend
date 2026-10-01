"use client"

import * as React from "react"
import {
  CircleCheck,
  LoaderCircle,
  Package,
  TriangleAlert,
} from "lucide-react"
import { useTranslations } from "next-intl"

import { saveExportGroup } from "@/app/sale/export_group/_components/api"
import { FreeSelect } from "@/app/sale/export_group/_components/freeselect"
import {
  EXPORT_GROUP_MAX_LEN,
  type ExportGroup,
  type ExportGroupFormMode,
  type ExportGroupFormValues,
  type ExportGroupRequiredField,
  type NamedOption,
} from "@/app/sale/export_group/_components/model"
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
import { cn } from "@/lib/utils"

/**
 * form_modal.tsx — ฟอร์มเพิ่ม/แก้ไขกลุ่มการส่งออกในกล่องซ้อน (หน้าตาชุดเดียวกับฟอร์มบริษัทขนส่ง)
 *
 * ปุ่มที่เปิดฟอร์มเป็นคนบอกโหมดมาเอง: "add" เปิดฟอร์มเปล่า "edit" เปิดพร้อมค่าของแถวนั้น
 * กดบันทึกแล้วยิง POST /api/web/export-group-action เอง เสร็จแล้วบอกพ่อผ่าน onSaved ให้โหลดตารางใหม่
 * ส่งไปครบทุกคอลัมน์เสมอ — เส้น -action เขียนทับทั้งแถว
 * บังคับ name กับ shiptment_type (เหมือน API) ตรวจเองก่อนยิง ขึ้นกรอบแดงเมื่อว่าง
 * ประเภทการจัดส่งเลือกจากทะเบียนหรือพิมพ์เองได้ — กลุ่มที่สร้างจากการส่งออกอาจเป็นค่าปน เช่น "Dropship, Pick Up"
 */
// คลาสขอบแดง — ต้องสลับคลาสเอง ไม่ใช้ variant aria-invalid: เพราะ Tailwind v4 ห่อ variant
// ด้วย :where() ความจำเพาะจึงเท่ากับ border-input แล้วแพ้ลำดับใน stylesheet
const INVALID_FIELD =
  "border-destructive ring-3 ring-destructive/20 dark:border-destructive/50 dark:ring-destructive/40"

/** ช่องบังคับ — ตรงกับที่ API บังคับ */
const REQUIRED: ExportGroupRequiredField[] = ["name", "shiptment_type"]

const toValues = (group: ExportGroup | undefined): ExportGroupFormValues => ({
  name: group?.name ?? "",
  // detail / total_price nullable ในฐานข้อมูล แต่ฟอร์มถือเป็นสตริงเสมอ
  detail: group?.detail ?? "",
  shiptment_type: group?.shiptment_type ?? "",
  total_price: group?.total_price != null ? String(group.total_price) : "",
})

export function FormModal({
  open,
  onOpenChange,
  mode,
  group,
  shipmentTypes,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** ปุ่มไหนเป็นคนเปิด — "add" หรือ "edit" */
  mode: ExportGroupFormMode
  /** แถวที่กำลังแก้ (โหมด edit เท่านั้น) */
  group?: ExportGroup
  /** ตัวเลือกประเภทการจัดส่ง — ตารางดึงไว้แล้ว (ใช้กับตัวกรองด้วย) ไม่ต้องดึงซ้ำทุกครั้งที่เปิดฟอร์ม */
  shipmentTypes: NamedOption[]
  /** บันทึกสำเร็จแล้ว — ตารางเอาไปโหลดข้อมูลใหม่ */
  onSaved?: () => void
}) {
  const t = useTranslations("common")
  const tform = useTranslations("export_group.form")
  const tcol = useTranslations("export_group.columns")

  const [values, setValues] = React.useState(() => toValues(group))
  const [saving, setSaving] = React.useState(false)
  /** ช่องบังคับที่ยังว่างตอนกดบันทึก — ตรวจเองแทน required ของเบราว์เซอร์ */
  const [missing, setMissing] = React.useState<ExportGroupRequiredField[]>([])
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
  const formKey = `${mode}-${group?.id ?? "new"}-${String(open)}`
  const [lastKey, setLastKey] = React.useState(formKey)
  if (formKey !== lastKey) {
    setLastKey(formKey)
    setValues(toValues(group))
    setResult(null)
    setSaving(false)
    setMissing([])
  }

  const set = <K extends keyof ExportGroupFormValues>(
    key: K,
    value: ExportGroupFormValues[K]
  ) => {
    setValues((current) => ({ ...current, [key]: value }))
    // พิมพ์แล้วกรอบแดงของช่องนั้นหายเอง
    if (value.trim()) setMissing((current) => current.filter((field) => field !== key))
  }

  const invalid = (key: ExportGroupRequiredField) => missing.includes(key)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* ฟอร์มสูงเกินจอเตี้ยได้ — ให้ทั้งกล่องเลื่อนได้แทนที่จะล้นจอ */}
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
        {/* แถบหัวไล่เฉดสีโลโก้ + แถบสีบางด้านบนสุด */}
        <DialogHeader className="from-chart-1/14 to-chart-5/10 border-border/60 relative -mx-4 -mt-4 overflow-hidden rounded-t-xl border-b bg-gradient-to-r via-transparent p-4 pt-5">
          <span
            aria-hidden
            className="from-chart-1 via-chart-5 to-chart-2 absolute inset-x-0 top-0 h-1 bg-gradient-to-r"
          />
          <div className="flex items-center gap-3">
            <span className="from-chart-1 to-chart-5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm">
              <Package className="size-5" />
            </span>
            <div className="grid gap-1">
              <DialogTitle>
                {mode === "add" ? tform("addTitle") : tform("editTitle")}
              </DialogTitle>
              <DialogDescription>
                {mode === "add"
                  ? tform("addDescription")
                  : tform("editDescription")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form
          onSubmit={async (event) => {
            event.preventDefault()
            if (saving) return
            // เช็คช่องบังคับทั้งหมดพร้อมกัน ให้ขึ้นกรอบแดงครบในทีเดียว ไม่ใช่ทีละช่อง
            const empty = REQUIRED.filter((field) => !values[field].trim())
            setMissing(empty)
            if (empty.length) return
            setSaving(true)
            setResult(null)
            try {
              // โหมดของฟอร์มคือ action ที่ API ใช้ตัดสินใจ ("add" / "edit")
              await saveExportGroup(mode, values, group?.id)
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
          <section className="border-border/60 bg-card relative overflow-hidden rounded-lg border shadow-xs">
            <span aria-hidden className="bg-chart-1 absolute inset-x-0 top-0 h-1" />
            <div className="border-border/50 from-chart-1/14 flex items-center gap-2 border-b bg-gradient-to-r to-transparent px-3 pt-3 pb-2">
              <span className="bg-chart-1/15 text-chart-1 flex size-6 items-center justify-center rounded-md">
                <Package className="size-3.5" />
              </span>
              <h3 className="text-xs font-semibold tracking-wide uppercase">{tform("sectionInfo")}</h3>
            </div>
            <div className="grid gap-4 p-3">
              <Field
                id="export-group-name"
                label={tcol("name")}
                required
                hint={tform("nameHint")}
                error={invalid("name") ? t("required") : undefined}
              >
                <Input
                  id="export-group-name"
                  value={values.name}
                  maxLength={EXPORT_GROUP_MAX_LEN.name}
                  placeholder="..."
                  onChange={(event) => set("name", event.target.value)}
                  aria-required
                  aria-invalid={invalid("name") || undefined}
                  className={cn("font-mono", invalid("name") && INVALID_FIELD)}
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* เลือกจากทะเบียนประเภทการจัดส่ง หรือพิมพ์เอง (ค่าปนจากการส่งออก) — ยาวไม่เกิน 50 ตามคอลัมน์ */}
                <Field
                  id="export-group-shiptment_type"
                  label={tcol("shiptment_type")}
                  required
                  error={invalid("shiptment_type") ? t("required") : undefined}
                >
                  <FreeSelect
                    id="export-group-shiptment_type"
                    value={values.shiptment_type}
                    items={shipmentTypes.map((option) => ({ value: option.name }))}
                    onChange={(next) => set("shiptment_type", next.slice(0, EXPORT_GROUP_MAX_LEN.shiptment_type))}
                    placeholder="..."
                    emptyText={tform("shipmentEmpty")}
                    toggleLabel={tform("shipmentToggle")}
                    className={invalid("shiptment_type") ? INVALID_FIELD : undefined}
                  />
                </Field>
                <Field id="export-group-total_price" label={tcol("total_price")} hint={tform("totalPriceHint")}>
                  <Input
                    id="export-group-total_price"
                    value={values.total_price}
                    inputMode="numeric"
                    placeholder="0"
                    onChange={(event) => set("total_price", event.target.value)}
                    className="font-mono"
                  />
                </Field>
              </div>

              <Field id="export-group-detail" label={tcol("detail")}>
                <Textarea
                  id="export-group-detail"
                  rows={3}
                  value={values.detail}
                  placeholder="..."
                  onChange={(event) => set("detail", event.target.value)}
                />
              </Field>
            </div>
          </section>

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
  hint,
  error,
  children,
}: {
  id: string
  label: string
  /** ใส่ดอกจันให้รู้ตั้งแต่ก่อนกดบันทึกว่าช่องนี้ต้องกรอก */
  required?: boolean
  /** คำอธิบายสีจางใต้ช่อง */
  hint?: string
  /** ข้อความผิดพลาดใต้ช่อง — ขึ้นตอนกดบันทึกแล้วยังไม่ได้กรอก (แทน hint) */
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-muted-foreground w-fit text-xs">
        {label}
        {required ? (
          <span aria-hidden className="text-destructive -ml-1.5">
            *
          </span>
        ) : null}
      </Label>
      {children}
      {error ? (
        <p className="text-destructive text-xs">{error}</p>
      ) : hint ? (
        <p className="text-muted-foreground text-xs">{hint}</p>
      ) : null}
    </div>
  )
}
