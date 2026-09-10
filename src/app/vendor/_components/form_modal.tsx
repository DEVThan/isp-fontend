"use client"

import * as React from "react"
import { CircleCheck, LoaderCircle, Plus, Trash2, TriangleAlert } from "lucide-react"
import { useTranslations } from "next-intl"

import { saveVendor } from "@/app/vendor/_components/api"
import {
  parseSenderCodes,
  serializeSenderCodes,
  VENDOR_ACTIVE,
  VENDOR_INACTIVE,
  VENDOR_MAX_LEN,
  type SenderCode,
  type Vendor,
  type VendorFormMode,
  type VendorFormValues,
} from "@/app/vendor/_components/model"
import { SelectOption } from "@/app/vendor/_components/selectoption"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"

/**
 * form_modal.tsx — ฟอร์มเพิ่ม/แก้ไขผู้ขายในกล่องซ้อน
 *
 * ปุ่มที่เปิดฟอร์มเป็นคนบอกโหมดมาเอง: "add" เปิดฟอร์มเปล่า "edit" เปิดพร้อมค่าของแถวนั้น
 * กดบันทึกแล้วยิง POST /api/web/vendor-action เอง เสร็จแล้วบอกพ่อผ่าน onSaved ให้โหลดตารางใหม่
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
  /**
   * แถวรหัสผู้ส่งที่กำลังแก้อยู่ — ถือเป็นความจริงของ UI ส่วน values.sender_code เป็นเงาไว้ส่ง API
   * แยกกันเพราะ serializeSenderCodes() ตัดแถวที่ยังว่างทิ้ง ถ้า UI อ่านจากสตริงนั้นตรง ๆ
   * แถวที่เพิ่งกดเพิ่มจะหายไปทันทีก่อนได้พิมพ์
   */
  const [senderRows, setSenderRows] = React.useState<SenderCode[]>(() =>
    parseSenderCodes(vendor?.sender_code)
  )
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
    setSenderRows(parseSenderCodes(vendor?.sender_code))
  }

  const set = <K extends keyof VendorFormValues>(
    key: K,
    value: VendorFormValues[K]
  ) => setValues((current) => ({ ...current, [key]: value }))

  /** แก้แถวรหัสผู้ส่งทีเดียวทั้งสองที่ — ตาราง (ที่ผู้ใช้เห็น) กับค่าที่จะส่งไปบันทึก */
  const setSenders = (next: SenderCode[]) => {
    setSenderRows(next)
    set("sender_code", serializeSenderCodes(next))
  }

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

          {/* รหัสผู้ส่ง — ผู้ขายหนึ่งรายมีได้หลายขนส่ง เก็บรวมเป็น JSON string ในคอลัมน์เดียว */}
          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs">
              {tcol("senderCode")}
            </Label>
            <div className="border-border/60 overflow-hidden rounded-lg border">
              <Table>
                <TableHeader className="bg-muted/60">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-muted-foreground pl-3 text-xs font-semibold tracking-wide uppercase">
                      {tcol("shipping")}
                    </TableHead>
                    <TableHead className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                      {tcol("senderCode")}
                    </TableHead>
                    <TableHead className="w-12 pr-3">
                      <span className="sr-only">{t("delete")}</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {senderRows.map((row, index) => (
                    // แถวไม่มี id ของตัวเอง คีย์จึงต้องเป็นตำแหน่ง — ลบแถวกลางแล้ว React
                    // จะ reuse ช่องกรอกของแถวถัดไป ซึ่งถูกต้องอยู่แล้วเพราะค่ามาจาก state ทั้งหมด
                    <TableRow
                      key={index}
                      className="border-border/50 hover:bg-transparent"
                    >
                      <TableCell className="py-1 pl-3">
                        <Input
                          value={row.shipping}
                          placeholder="..."
                          aria-label={`${tcol("shipping")} ${index + 1}`}
                          onChange={(event) =>
                            setSenders(
                              senderRows.map((current, i) =>
                                i === index
                                  ? { ...current, shipping: event.target.value }
                                  : current
                              )
                            )
                          }
                        />
                      </TableCell>
                      <TableCell className="py-1">
                        <Input
                          value={row.sendercode}
                          placeholder="..."
                          aria-label={`${tcol("senderCode")} ${index + 1}`}
                          onChange={(event) =>
                            setSenders(
                              senderRows.map((current, i) =>
                                i === index
                                  ? {
                                      ...current,
                                      sendercode: event.target.value,
                                    }
                                  : current
                              )
                            )
                          }
                        />
                      </TableCell>
                      <TableCell className="py-1 pr-3 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={t("delete")}
                          onClick={() =>
                            setSenders(
                              senderRows.filter((_, i) => i !== index)
                            )
                          }
                          className="bg-danger/12 text-danger-ink hover:bg-red-50 hover:text-red-300"
                        >
                          <Trash2 />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}

                  {senderRows.length === 0 ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell
                        colSpan={3}
                        className="text-muted-foreground py-4 text-center text-xs"
                      >
                        {tform("noSenderCode")}
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>

              <div className="border-border/50 border-t p-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setSenders([
                      ...senderRows,
                      { shipping: "", sendercode: "" },
                    ])
                  }
                >
                  <Plus /> {tform("addSenderCode")}
                </Button>
              </div>
            </div>
          </div>

          {/* สถานะอยู่แถวของตัวเอง — กินช่องเดียวในสามช่อง ไม่งั้นกล่องเลือกยืดเต็มความกว้าง */}
          <div className="grid gap-4 sm:grid-cols-3">
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
