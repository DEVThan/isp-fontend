"use client"

import * as React from "react"
import { CircleCheck, LoaderCircle, TriangleAlert } from "lucide-react"
import { useTranslations } from "next-intl"

import { saveProductCode } from "@/app/product/product_code/_components/api"
import {
  CODE_ACTIVE,
  CODE_INACTIVE,
  type ProductCode,
  type ProductCodeFormMode,
  type ProductCodeFormValues,
} from "@/app/product/product_code/_components/model"
import { SelectOption } from "@/app/product/product_code/_components/selectoption"
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
 * form_modal.tsx — ฟอร์มเพิ่ม/แก้ไขรหัสสินค้าในกล่องซ้อน
 *
 * ปุ่มที่เปิดฟอร์มเป็นคนบอกโหมดมาเอง: "add" เปิดฟอร์มเปล่า "edit" เปิดพร้อมค่าของแถวนั้น
 * กดบันทึกแล้วยิง POST /api/web/product-code-action เอง เสร็จแล้วบอกพ่อผ่าน onSaved ให้โหลดตารางใหม่
 */
// คลาสขอบแดง — ต้องสลับคลาสเอง ไม่ใช้ variant aria-invalid: เพราะ Tailwind v4 ห่อ variant
// ด้วย :where() ความจำเพาะจึงเท่ากับ border-input แล้วแพ้ลำดับใน stylesheet
const INVALID_FIELD =
  "border-destructive ring-3 ring-destructive/20 dark:border-destructive/50 dark:ring-destructive/40"

const emptyValues: ProductCodeFormValues = {
  prefix: "",
  name: "",
  detail: "",
  active_status: CODE_ACTIVE,
}

const toValues = (code: ProductCode | undefined): ProductCodeFormValues =>
  code
    ? {
        prefix: code.prefix,
        name: code.name,
        detail: code.detail ?? "",
        active_status: code.active_status,
      }
    : emptyValues

export function FormModal({
  open,
  onOpenChange,
  mode,
  code,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** ปุ่มไหนเป็นคนเปิด — "add" หรือ "edit" */
  mode: ProductCodeFormMode
  /** แถวที่กำลังแก้ (โหมด edit เท่านั้น) */
  code?: ProductCode
  /** บันทึกสำเร็จแล้ว — ตารางเอาไปโหลดข้อมูลใหม่ */
  onSaved?: () => void
}) {
  const t = useTranslations("common")
  const tr = useTranslations("productcodes")
  const tform = useTranslations("productcodes.form")
  const tcol = useTranslations("productcodes.columns")

  const [values, setValues] = React.useState(() => toValues(code))
  const [saving, setSaving] = React.useState(false)
  /** ตัวอักษรนำหน้ายังว่างตอนกดบันทึก — ตรวจเองแทน required ของเบราว์เซอร์ */
  const [prefixError, setPrefixError] = React.useState(false)
  /** ชื่อรหัสสินค้ายังว่างตอนกดบันทึก — ตรวจเองแทน required ของเบราว์เซอร์ */
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
  const formKey = `${mode}-${code?.id ?? "new"}-${String(open)}`
  const [lastKey, setLastKey] = React.useState(formKey)
  if (formKey !== lastKey) {
    setLastKey(formKey)
    setValues(toValues(code))
    setResult(null)
    setSaving(false)
    setPrefixError(false)
    setNameError(false)
  }

  const set = <K extends keyof ProductCodeFormValues>(
    key: K,
    value: ProductCodeFormValues[K]
  ) => setValues((current) => ({ ...current, [key]: value }))

  const statusOptions = [
    { value: CODE_ACTIVE, label: tr("active") },
    { value: CODE_INACTIVE, label: tr("inactive") },
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
            // เช็คทั้งสองช่องก่อน ให้ขึ้นกรอบแดงพร้อมกัน ไม่ใช่ทีละช่อง
            const missingPrefix = !values.prefix.trim()
            const missingName = !values.name.trim()
            setPrefixError(missingPrefix)
            setNameError(missingName)
            if (missingPrefix || missingName) return
            setSaving(true)
            setResult(null)
            try {
              // โหมดของฟอร์มคือ action ที่ API ใช้ตัดสินใจ ("add" / "edit")
              // API เก็บ prefix เป็นตัวพิมพ์ใหญ่ให้อยู่แล้ว ที่นี่ส่งไปตามที่พิมพ์
              await saveProductCode(mode, values, code?.id)
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
              id="code-prefix"
              label={tcol("prefix")}
              required
              error={prefixError ? t("required") : undefined}
            >
              <Input
                id="code-prefix"
                value={values.prefix}
                onChange={(event) => {
                  // เก็บเป็นตัวพิมพ์ใหญ่ตั้งแต่ตอนพิมพ์ ให้ตรงกับที่ API บันทึกจริง
                  const prefix = event.target.value.toUpperCase()
                  set("prefix", prefix)
                  if (prefix.trim()) setPrefixError(false)
                }}
                placeholder="P"
                aria-required
                aria-invalid={prefixError || undefined}
                className={`uppercase${prefixError ? ` ${INVALID_FIELD}` : ""}`}
              />
            </Field>
            {/* ชื่อยาวกว่า prefix มาก กินสองช่องที่เหลือของแถว */}
            <div className="sm:col-span-2">
              <Field
                id="code-name"
                label={tcol("name")}
                required
                error={nameError ? t("required") : undefined}
              >
                <Input
                  id="code-name"
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
            </div>
          </div>

          {/* สถานะอยู่แถวของตัวเอง — กินช่องเดียวในสามช่อง ไม่งั้นกล่องเลือกยืดเต็มความกว้าง */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Field id="code-status" label={tcol("status")}>
              <SelectOption
                id="code-status"
                options={statusOptions}
                value={values.active_status}
                onValueChange={(next) =>
                  set("active_status", next ?? CODE_ACTIVE)
                }
                placeholder={tr("active")}
                label={tcol("status")}
              />
            </Field>
          </div>

          <Field id="code-detail" label={tcol("detail")}>
            <Textarea
              id="code-detail"
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
