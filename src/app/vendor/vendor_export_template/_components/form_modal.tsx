"use client"

import * as React from "react"
import { CircleCheck, LoaderCircle, TriangleAlert } from "lucide-react"
import { useTranslations } from "next-intl"

import {
  saveVendorExportTemplate,
  uploadVendorExportTemplateFile,
} from "@/app/vendor/vendor_export_template/_components/api"
import { FilePicker } from "@/app/vendor/vendor_export_template/_components/file_picker"
import {
  TEMPLATE_ACTIVE,
  TEMPLATE_INACTIVE,
  TEMPLATE_NAME_MAX_LEN,
  type VendorExportTemplate,
  type VendorExportTemplateFormMode,
  type VendorExportTemplateFormValues,
} from "@/app/vendor/vendor_export_template/_components/model"
import { SelectOption } from "@/app/vendor/vendor_export_template/_components/selectoption"
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
 * form_modal.tsx — ฟอร์มเพิ่ม/แก้ไขเทมเพลตส่งออกผู้ขายในกล่องซ้อน
 *
 * ปุ่มที่เปิดฟอร์มเป็นคนบอกโหมดมาเอง: "add" เปิดฟอร์มเปล่า "edit" เปิดพร้อมค่าของแถวนั้น
 * กดบันทึกแล้วยิง POST /api/web/vendor-export-template-action เอง เสร็จแล้วบอกพ่อผ่าน onSaved ให้โหลดตารางใหม่
 * ไฟล์ Excel อัปโหลดผ่าน FilePicker — โหมดเพิ่มอัปโหลดหลังบันทึกแถว (ต้องได้ id ก่อนถึงจะตั้งโฟลเดอร์ได้)
 */
// คลาสขอบแดง — ต้องสลับคลาสเอง ไม่ใช้ variant aria-invalid: เพราะ Tailwind v4 ห่อ variant
// ด้วย :where() ความจำเพาะจึงเท่ากับ border-input แล้วแพ้ลำดับใน stylesheet
const INVALID_FIELD =
  "border-destructive ring-3 ring-destructive/20 dark:border-destructive/50 dark:ring-destructive/40"

const emptyValues: VendorExportTemplateFormValues = {
  name: "",
  detail: "",
  path: "",
  active_status: TEMPLATE_ACTIVE,
}

const toValues = (
  template: VendorExportTemplate | undefined
): VendorExportTemplateFormValues =>
  template
    ? {
        name: template.name,
        // คอลัมน์พวกนี้ nullable ในฐานข้อมูล แต่ฟอร์มถือเป็นสตริงเสมอ
        detail: template.detail ?? "",
        path: template.path ?? "",
        active_status: template.active_status,
      }
    : emptyValues

export function FormModal({
  open,
  onOpenChange,
  mode,
  template,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** ปุ่มไหนเป็นคนเปิด — "add" หรือ "edit" */
  mode: VendorExportTemplateFormMode
  /** แถวที่กำลังแก้ (โหมด edit เท่านั้น) */
  template?: VendorExportTemplate
  /** บันทึกสำเร็จแล้ว — ตารางเอาไปโหลดข้อมูลใหม่
   *  saved = แถวหลังบันทึก · fileChanged = อัปโหลดไฟล์ใหม่ในรอบนี้ (การจับคู่ถูกล้าง ตารางเปิดหน้าจับคู่ต่อให้)
   *  ไม่ส่ง saved = แค่ให้โหลดใหม่ (อัปโหลดไฟล์ในโหมดแก้ไขแล้ว แต่ยังไม่ได้กดบันทึก) */
  onSaved?: (saved?: VendorExportTemplate, fileChanged?: boolean) => void
}) {
  const t = useTranslations("common")
  const tr = useTranslations("vendorexporttemplates")
  const tform = useTranslations("vendorexporttemplates.form")
  const tcol = useTranslations("vendorexporttemplates.columns")

  const [values, setValues] = React.useState(() => toValues(template))
  const [saving, setSaving] = React.useState(false)
  /** ชื่อเทมเพลตยังว่างตอนกดบันทึก — ตรวจเองแทน required ของเบราว์เซอร์ */
  const [nameError, setNameError] = React.useState(false)
  /** ยังไม่มีไฟล์เทมเพลตตอนกดบันทึก — โหมดเพิ่มดูไฟล์ที่เลือกค้างไว้ โหมดแก้ไขดู path ของแถว */
  const [fileError, setFileError] = React.useState(false)
  /** ไฟล์ที่เลือกในโหมดเพิ่ม — ยังไม่มี id ให้ตั้งโฟลเดอร์ จึงอัปโหลดหลังบันทึกแถวแล้ว */
  const [pendingFile, setPendingFile] = React.useState<File | null>(null)
  /** โหมดแก้ไขกำลังอัปโหลดไฟล์อยู่ — ปิดปุ่มบันทึกไว้ ไม่งั้นบันทึก path เก่าทับ */
  const [uploadingFile, setUploadingFile] = React.useState(false)
  /** โหมดแก้ไขอัปโหลดไฟล์ใหม่ไปแล้วในรอบนี้ — API ล้างการจับคู่ทิ้ง ต้องจับคู่ใหม่หลังบันทึก */
  const [fileUploaded, setFileUploaded] = React.useState(false)
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
  const formKey = `${mode}-${template?.id ?? "new"}-${String(open)}`
  const [lastKey, setLastKey] = React.useState(formKey)
  if (formKey !== lastKey) {
    setLastKey(formKey)
    setValues(toValues(template))
    setResult(null)
    setSaving(false)
    setNameError(false)
    setFileError(false)
    setPendingFile(null)
    setUploadingFile(false)
    setFileUploaded(false)
  }

  const set = <K extends keyof VendorExportTemplateFormValues>(
    key: K,
    value: VendorExportTemplateFormValues[K]
  ) => setValues((current) => ({ ...current, [key]: value }))

  const statusOptions = [
    { value: TEMPLATE_ACTIVE, label: tr("active") },
    { value: TEMPLATE_INACTIVE, label: tr("inactive") },
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
            // ไฟล์บังคับแค่ฝั่งหน้าเว็บ — API ต้องรับ path ว่างตอน add (ยังไม่มี id ให้ตั้งโฟลเดอร์ อัปโหลดหลังบันทึก)
            const missingName = !values.name.trim()
            const missingFile = !(pendingFile || values.path)
            setNameError(missingName)
            setFileError(missingFile)
            if (missingName || missingFile || uploadingFile) return
            setSaving(true)
            setResult(null)
            try {
              // โหมดของฟอร์มคือ action ที่ API ใช้ตัดสินใจ ("add" / "edit")
              // add ส่ง path ว่างไปก่อน (API รับได้) — ยังไม่มี id ให้ตั้งโฟลเดอร์ไฟล์
              const saved = await saveVendorExportTemplate(mode, values, template?.id)
              // add: เลือกไฟล์ไว้ก็อัปโหลดตอนนี้ที่ได้ id แล้ว — API เขียน path ลงคอลัมน์ให้เอง ไม่ต้องยิง edit ซ้ำ
              if (mode === "add" && pendingFile) {
                try {
                  await uploadVendorExportTemplateFile(pendingFile, saved.id)
                } catch (fileError) {
                  // แถวบันทึกไปแล้ว — กดบันทึกซ้ำจะโดน 400 ชื่อซ้ำ จึงปิดกล่องแล้วบอกให้ไปใส่ไฟล์ในโหมดแก้ไข
                  const detail =
                    fileError instanceof Error && fileError.message
                      ? ` (${fileError.message})`
                      : ""
                  setResult({
                    ok: false,
                    message: `${tform("fileSaveFailed")}${detail}`,
                  })
                  onSaved?.(saved, false)
                  setTimeout(() => onOpenChange(false), 3500)
                  return
                }
              }
              setResult({ ok: true })
              onSaved?.(saved, (mode === "add" && pendingFile !== null) || fileUploaded)
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
          <Field
            id="template-name"
            label={tcol("name")}
            required
            error={nameError ? t("required") : undefined}
          >
            <Input
              id="template-name"
              value={values.name}
              maxLength={TEMPLATE_NAME_MAX_LEN}
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

          <FilePicker
            id="template-path"
            label={tcol("path")}
            required
            error={fileError ? t("required") : undefined}
            value={values.path}
            templateId={mode === "edit" ? template?.id : undefined}
            pendingFile={pendingFile}
            onChange={(path) => {
              set("path", path)
              setFileError(false)
              // ไฟล์ใหม่อยู่ในแถวแล้วและการจับคู่ถูกล้าง — ให้ตารางโหลดใหม่ทันที เผื่อผู้ใช้กดยกเลิกฟอร์ม
              setFileUploaded(true)
              onSaved?.()
            }}
            onPendingFileChange={(file) => {
              setPendingFile(file)
              if (file) setFileError(false)
            }}
            onUploadingChange={setUploadingFile}
          />

          {/* สถานะอยู่แถวของตัวเอง — กินช่องเดียวในสามช่อง ไม่งั้นกล่องเลือกยืดเต็มความกว้าง */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Field id="template-status" label={tcol("status")}>
              <SelectOption
                id="template-status"
                options={statusOptions}
                value={values.active_status}
                onValueChange={(next) =>
                  set("active_status", next ?? TEMPLATE_ACTIVE)
                }
                placeholder={tr("active")}
                label={tcol("status")}
              />
            </Field>
          </div>

          <Field id="template-detail" label={tcol("detail")}>
            <Textarea
              id="template-detail"
              rows={3}
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
              disabled={saving || uploadingFile}
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
