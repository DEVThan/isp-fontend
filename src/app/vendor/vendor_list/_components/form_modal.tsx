"use client"

import * as React from "react"
import { CircleCheck, LoaderCircle, TriangleAlert } from "lucide-react"
import { useTranslations } from "next-intl"

import { saveVendor } from "@/app/vendor/vendor_list/_components/api"
import {
  VENDOR_ACTIVE,
  VENDOR_INACTIVE,
  VENDOR_MAX_LEN,
  type Vendor,
  type VendorFormMode,
  type VendorFormValues,
} from "@/app/vendor/vendor_list/_components/model"
import { SelectOption } from "@/app/vendor/vendor_list/_components/selectoption"
// เทมเพลตส่งออก — ช่องซ่อนไว้ (ดูที่ช่องในฟอร์ม) เปิดกลับให้เอา comment สองบรรทัดนี้ออกด้วย
// import { getVendorExportTemplateOptions } from "@/app/vendor/vendor_export_template/_components/api"
// import type { VendorExportTemplateOption } from "@/app/vendor/vendor_export_template/_components/model"
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
 * form_modal.tsx — ฟอร์มเพิ่ม/แก้ไขผู้ขายในกล่องซ้อน
 *
 * ปุ่มที่เปิดฟอร์มเป็นคนบอกโหมดมาเอง: "add" เปิดฟอร์มเปล่า "edit" เปิดพร้อมค่าของแถวนั้น
 * กดบันทึกแล้วยิง POST /api/web/vendor-action เอง เสร็จแล้วบอกพ่อผ่าน onSaved ให้โหลดตารางใหม่
 *
 * รหัสผู้ส่งกับประเภทการจัดส่งย้ายไปอยู่ที่ฟอร์มสินค้าแล้ว (01/10/2026 — products.sender_code / shipment_type)
 * ช่องถูกเอาออกจากฟอร์มนี้ แต่ค่าเดิมของแถว (vendor.sender_code / shipment_type) ยังอยู่ใน values
 * และถูกส่งกลับไปกับ -action ทุกครั้ง — เส้นนั้นเขียนทับทั้งแถว ไม่ส่งไปคือล้างคอลัมน์ทิ้ง
 */
// คลาสขอบแดง — ต้องสลับคลาสเอง ไม่ใช้ variant aria-invalid: เพราะ Tailwind v4 ห่อ variant
// ด้วย :where() ความจำเพาะจึงเท่ากับ border-input แล้วแพ้ลำดับใน stylesheet
const INVALID_FIELD =
  "border-destructive ring-3 ring-destructive/20 dark:border-destructive/50 dark:ring-destructive/40"

const emptyValues: VendorFormValues = {
  code: "",
  name: "",
  email: "",
  tel: "",
  address: "",
  remark: "",
  sender_code: "",
  export_template: "",
  shipment_type: "",
  active_status: VENDOR_ACTIVE,
}

const toValues = (vendor: Vendor | undefined): VendorFormValues =>
  vendor
    ? {
        code: vendor.code,
        name: vendor.name,
        // คอลัมน์พวกนี้ nullable ในฐานข้อมูล แต่ฟอร์มถือเป็นสตริงเสมอ
        email: vendor.email ?? "",
        tel: vendor.tel ?? "",
        address: vendor.address ?? "",
        remark: vendor.remark ?? "",
        sender_code: vendor.sender_code ?? "",
        export_template: vendor.export_template ?? "",
        shipment_type: vendor.shipment_type ?? "",
        active_status: vendor.active_status,
      }
    : emptyValues

export function FormModal({
  open,
  onOpenChange,
  mode,
  vendor,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** ปุ่มไหนเป็นคนเปิด — "add" หรือ "edit" */
  mode: VendorFormMode
  /** แถวที่กำลังแก้ (โหมด edit เท่านั้น) */
  vendor?: Vendor
  /** บันทึกสำเร็จแล้ว — ตารางเอาไปโหลดข้อมูลใหม่ */
  onSaved?: () => void
}) {
  const t = useTranslations("common")
  const tr = useTranslations("vendors")
  const tform = useTranslations("vendors.form")
  const tcol = useTranslations("vendors.columns")

  const [values, setValues] = React.useState(() => toValues(vendor))
  const [saving, setSaving] = React.useState(false)
  /** รหัสผู้ขายยังว่างตอนกดบันทึก — ตรวจเองแทน required ของเบราว์เซอร์ */
  const [codeError, setCodeError] = React.useState(false)
  /** ชื่อผู้ขายยังว่างตอนกดบันทึก — ตรวจเองแทน required ของเบราว์เซอร์ */
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
  const formKey = `${mode}-${vendor?.id ?? "new"}-${String(open)}`
  const [lastKey, setLastKey] = React.useState(formKey)
  if (formKey !== lastKey) {
    setLastKey(formKey)
    setValues(toValues(vendor))
    setResult(null)
    setSaving(false)
    setCodeError(false)
    setNameError(false)
  }

  const set = <K extends keyof VendorFormValues>(
    key: K,
    value: VendorFormValues[K]
  ) => setValues((current) => ({ ...current, [key]: value }))

  // เทมเพลตส่งออก — ซ่อนไว้ (ผู้ใช้ขอ 29/09/2026 ให้ประเภทการจัดส่งมาแทนที่)
  // ค่า export_template เดิมของแถวยังอยู่ใน values และถูกส่งไปกับ -action ทุกครั้ง ไม่ถูกล้าง
  // เปิดกลับ: เอา comment ออกทั้งก้อนนี้ + import สองบรรทัดด้านบน + ช่องในฟอร์ม
  // const [templates, setTemplates] = React.useState<VendorExportTemplateOption[]>([])
  // React.useEffect(() => {
  //   if (!open) return
  //   let cancelled = false
  //   getVendorExportTemplateOptions()
  //     .then((next) => {
  //       if (!cancelled) setTemplates(next)
  //     })
  //     .catch(() => {
  //       if (!cancelled) setTemplates([])
  //     })
  //   return () => {
  //     cancelled = true
  //   }
  // }, [open])
  // const templateOptions = [
  //   ...templates.map((option) => ({ value: String(option.id), label: option.name })),
  //   ...(values.export_template &&
  //   !templates.some((option) => String(option.id) === values.export_template)
  //     ? [{ value: values.export_template, label: `#${values.export_template}` }]
  //     : []),
  // ]

  const statusOptions = [
    { value: VENDOR_ACTIVE, label: tr("active") },
    { value: VENDOR_INACTIVE, label: tr("inactive") },
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
            // เช็คทั้งสองช่องที่บังคับก่อน ให้ขึ้นกรอบแดงพร้อมกัน ไม่ใช่ทีละช่อง
            const missingCode = !values.code.trim()
            const missingName = !values.name.trim()
            setCodeError(missingCode)
            setNameError(missingName)
            if (missingCode || missingName) return
            setSaving(true)
            setResult(null)
            try {
              // โหมดของฟอร์มคือ action ที่ API ใช้ตัดสินใจ ("add" / "edit")
              await saveVendor(mode, values, vendor?.id)
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
          <div className="grid gap-4 sm:grid-cols-3">
            <Field
              id="vendor-code"
              label={tcol("code")}
              required
              error={codeError ? t("required") : undefined}
            >
              <Input
                id="vendor-code"
                value={values.code}
                maxLength={VENDOR_MAX_LEN}
                onChange={(event) => {
                  set("code", event.target.value)
                  if (event.target.value.trim()) setCodeError(false)
                }}
                placeholder="V001"
                aria-required
                aria-invalid={codeError || undefined}
                className={codeError ? INVALID_FIELD : undefined}
              />
            </Field>
            {/* ชื่อผู้ขายยาวกว่ารหัสมาก กินสองช่องที่เหลือของแถว */}
            <div className="sm:col-span-2">
              <Field
                id="vendor-name"
                label={tcol("name")}
                required
                error={nameError ? t("required") : undefined}
              >
                <Input
                  id="vendor-name"
                  value={values.name}
                  maxLength={VENDOR_MAX_LEN}
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
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field id="vendor-email" label={tcol("email")}>
              <Input
                id="vendor-email"
                // ไม่ใช้ type="email" — ช่องนี้ไม่บังคับ และ API ไม่ได้ตรวจรูปแบบ
                // ปล่อยให้เบราว์เซอร์ block การ submit จะกลายเป็นกฎที่หลังบ้านไม่มี
                value={values.email}
                maxLength={VENDOR_MAX_LEN}
                placeholder="..."
                onChange={(event) => set("email", event.target.value)}
              />
            </Field>
            <Field id="vendor-tel" label={tcol("tel")}>
              <Input
                id="vendor-tel"
                value={values.tel}
                maxLength={VENDOR_MAX_LEN}
                placeholder="..."
                onChange={(event) => set("tel", event.target.value)}
              />
            </Field>
          </div>

          <Field id="vendor-address" label={tcol("address")}>
            <Textarea
              id="vendor-address"
              rows={2}
              value={values.address}
              placeholder="..."
              onChange={(event) => set("address", event.target.value)}
            />
          </Field>

          {/* สถานะกินช่องเดียวในสามช่อง ไม่งั้นกล่องเลือกยืดเต็มความกว้าง
              (ประเภทการจัดส่งที่เคยกินสองช่องที่เหลือ ย้ายไปฟอร์มสินค้าแล้ว 01/10/2026) */}
          <div className="grid gap-4 sm:grid-cols-3">
            {/* เทมเพลตส่งออก — ซ่อนไว้ ประเภทการจัดส่งมาแทนที่ (ดูหมายเหตุที่ templateOptions ด้านบน) */}
            {/* <div className="sm:col-span-2">
              <Field id="vendor-export-template" label={tcol("exportTemplate")}>
                <SelectOption
                  id="vendor-export-template"
                  options={templateOptions}
                  value={values.export_template || null}
                  onValueChange={(next) => set("export_template", next ?? "")}
                  placeholder="..."
                  label={tcol("exportTemplate")}
                />
              </Field>
            </div> */}
            <Field id="vendor-status" label={tcol("status")}>
              <SelectOption
                id="vendor-status"
                options={statusOptions}
                value={values.active_status}
                onValueChange={(next) =>
                  set("active_status", next ?? VENDOR_ACTIVE)
                }
                placeholder={tr("active")}
                label={tcol("status")}
              />
            </Field>
          </div>

          <Field id="vendor-remark" label={tcol("remark")}>
            <Textarea
              id="vendor-remark"
              rows={2}
              value={values.remark}
              placeholder="..."
              onChange={(event) => set("remark", event.target.value)}
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
