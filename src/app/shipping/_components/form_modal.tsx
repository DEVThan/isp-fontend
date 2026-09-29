"use client"

import * as React from "react"
import {
  CircleCheck,
  LoaderCircle,
  Phone,
  TriangleAlert,
  Truck,
  type LucideIcon,
} from "lucide-react"
import { useTranslations } from "next-intl"

import { saveShipping, uploadShippingLogo } from "@/app/shipping/_components/api"
import { LogoPicker } from "@/app/shipping/_components/logo_picker"
import {
  SHIPPING_ACTIVE,
  SHIPPING_INACTIVE,
  SHIPPING_MAX_LEN,
  type Shipping,
  type ShippingFormMode,
  type ShippingFormValues,
  type ShippingRequiredField,
  type ShippingTextField,
} from "@/app/shipping/_components/model"
import { SelectOption } from "@/app/shipping/_components/selectoption"
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
 * form_modal.tsx — ฟอร์มเพิ่ม/แก้ไขบริษัทขนส่งในกล่องซ้อน (หน้าตาชุดเดียวกับฟอร์ม Broadcast ที่คัดมา)
 *
 * ปุ่มที่เปิดฟอร์มเป็นคนบอกโหมดมาเอง: "add" เปิดฟอร์มเปล่า "edit" เปิดพร้อมค่าของแถวนั้น
 * กดบันทึกแล้วยิง POST /api/web/shipping-action เอง เสร็จแล้วบอกพ่อผ่าน onSaved ให้โหลดตารางใหม่
 * ส่งไปครบทุกคอลัมน์เสมอ — เส้น -action เขียนทับทั้งแถว
 * บังคับแค่ name (เหมือน API) ตรวจเองก่อนยิง ขึ้นกรอบแดงเมื่อว่าง
 * รหัสขนส่ง (code) ซ่อนไว้ก่อน (ผู้ใช้สั่ง 29/09/2026) — ค่าเดิมของแถวยังอยู่ใน values และถูกส่งไปทุกครั้ง ไม่ถูกล้าง
 * โลโก้เป็นช่องเลือกรูป (logo_picker) ไม่บังคับ — แก้ไข: อัปโหลดทันทีที่เลือก · เพิ่ม: ถือไฟล์ไว้ บันทึกแถวได้ id แล้วค่อยอัปโหลด
 * เก็บที่ /uploads/shipping/{id}/logo/{ชื่อไฟล์} (ผู้ใช้กำหนด 2026-09-29)
 */
// คลาสขอบแดง — ต้องสลับคลาสเอง ไม่ใช้ variant aria-invalid: เพราะ Tailwind v4 ห่อ variant
// ด้วย :where() ความจำเพาะจึงเท่ากับ border-input แล้วแพ้ลำดับใน stylesheet
const INVALID_FIELD =
  "border-destructive ring-3 ring-destructive/20 dark:border-destructive/50 dark:ring-destructive/40"

/**
 * สีประจำกลุ่มข้อมูล — ข้อมูลขนส่ง = blue · การติดต่อ = aqua
 * ใช้ชุด chart-1..5 แบบเดียวกับไล่เฉดของโลโก้/ปุ่มหลัก เป็นสีตกแต่งอย่างเดียว ไม่ได้สื่อความหมาย
 * ไม่ใช้ success/warning/danger/info เพราะสงวนไว้บอกสถานะ · Tailwind ต้องเห็นชื่อคลาสเต็ม ห้ามประกอบจากสตริง
 */
const ACCENTS = {
  blue: {
    bar: "bg-chart-1",
    header: "from-chart-1/14",
    chip: "bg-chart-1/15 text-chart-1",
  },
  aqua: {
    bar: "bg-chart-3",
    header: "from-chart-3/14",
    chip: "bg-chart-3/15 text-chart-3",
  },
} as const

type Accent = keyof typeof ACCENTS

/** ช่องบังคับ — ตรงกับที่ API บังคับ · เปิดช่องรหัสกลับเมื่อไหร่ ถ้าจะให้บังคับอีกต้องแก้ทั้งที่นี่และฝั่ง API */
const REQUIRED: ShippingRequiredField[] = ["name"]

const toValues = (shipping: Shipping | undefined): ShippingFormValues => ({
  code: shipping?.code ?? "",
  name: shipping?.name ?? "",
  // คอลัมน์พวกนี้ nullable ในฐานข้อมูล แต่ฟอร์มถือเป็นสตริงเสมอ
  prefix: shipping?.prefix ?? "",
  logo: shipping?.logo ?? "",
  email: shipping?.email ?? "",
  tel: shipping?.tel ?? "",
  address: shipping?.address ?? "",
  remark: shipping?.remark ?? "",
  active_status: shipping?.active_status ?? SHIPPING_ACTIVE,
})


export function FormModal({
  open,
  onOpenChange,
  mode,
  shipping,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** ปุ่มไหนเป็นคนเปิด — "add" หรือ "edit" */
  mode: ShippingFormMode
  /** แถวที่กำลังแก้ (โหมด edit เท่านั้น) */
  shipping?: Shipping
  /** บันทึกสำเร็จแล้ว — ตารางเอาไปโหลดข้อมูลใหม่ */
  onSaved?: () => void
}) {
  const t = useTranslations("common")
  const tr = useTranslations("shippings")
  const tform = useTranslations("shippings.form")
  const tcol = useTranslations("shippings.columns")

  const [values, setValues] = React.useState(() => toValues(shipping))
  const [saving, setSaving] = React.useState(false)
  /** ช่องบังคับที่ยังว่างตอนกดบันทึก — ตรวจเองแทน required ของเบราว์เซอร์ */
  const [missing, setMissing] = React.useState<ShippingRequiredField[]>([])
  /** โลโก้ที่เลือกไว้ในโหมดเพิ่ม — ยังไม่มี id จึงอัปโหลดไม่ได้ ถือไว้จนบันทึกแถวเสร็จ */
  const [pendingLogo, setPendingLogo] = React.useState<File | null>(null)
  /** กำลังอัปโหลดโลโก้ (โหมดแก้ไข) — ปิดปุ่มบันทึกไว้ ไม่งั้นบันทึกไปก่อนได้ path รูปใหม่ */
  const [uploadingLogo, setUploadingLogo] = React.useState(false)
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
  const formKey = `${mode}-${shipping?.id ?? "new"}-${String(open)}`
  const [lastKey, setLastKey] = React.useState(formKey)
  if (formKey !== lastKey) {
    setLastKey(formKey)
    setValues(toValues(shipping))
    setResult(null)
    setSaving(false)
    setMissing([])
    setPendingLogo(null)
    setUploadingLogo(false)
  }

  const set = <K extends keyof ShippingFormValues>(
    key: K,
    value: ShippingFormValues[K]
  ) => setValues((current) => ({ ...current, [key]: value }))

  const statusOptions = [
    { value: SHIPPING_ACTIVE, label: tr("active") },
    { value: SHIPPING_INACTIVE, label: tr("inactive") },
  ]

  /** ช่องข้อความหนึ่งช่อง — ความยาวสูงสุดตามคอลัมน์ · ช่องบังคับมีดอกจัน และกรอบแดงเมื่อว่างตอนกดบันทึก (พิมพ์แล้วหายเอง) */
  const text = (
    key: ShippingTextField,
    extra?: React.ComponentProps<typeof Input>
  ) => {
    const isRequired = (REQUIRED as string[]).includes(key)
    const invalid = isRequired && missing.includes(key as ShippingRequiredField)
    return (
      <Field
        id={`shipping-${key}`}
        label={tcol(key)}
        required={isRequired}
        error={invalid ? t("required") : undefined}
      >
        <Input
          id={`shipping-${key}`}
          value={values[key]}
          maxLength={SHIPPING_MAX_LEN[key]}
          placeholder="..."
          onChange={(event) => {
            set(key, event.target.value)
            if (event.target.value.trim()) {
              setMissing((current) => current.filter((field) => field !== key))
            }
          }}
          aria-required={isRequired || undefined}
          aria-invalid={invalid || undefined}
          className={invalid ? INVALID_FIELD : undefined}
          {...extra}
        />
      </Field>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* ฟอร์มสูงเกินจอเตี้ยได้ — ให้ทั้งกล่องเลื่อนได้แทนที่จะล้นจอ */}
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
        {/* แถบหัวไล่เฉดสีโลโก้ + แถบสีบางด้านบนสุด · ไอคอน Truck ตัวเดียวกับเมนูข้าง */}
        <DialogHeader className="from-chart-1/14 to-chart-5/10 border-border/60 relative -mx-4 -mt-4 overflow-hidden rounded-t-xl border-b bg-gradient-to-r via-transparent p-4 pt-5">
          <span
            aria-hidden
            className="from-chart-1 via-chart-5 to-chart-2 absolute inset-x-0 top-0 h-1 bg-gradient-to-r"
          />
          <div className="flex items-center gap-3">
            <span className="from-chart-1 to-chart-5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm">
              <Truck className="size-5" />
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
            // เช็คช่องบังคับทั้งสองพร้อมกัน ให้ขึ้นกรอบแดงครบในทีเดียว ไม่ใช่ทีละช่อง
            const empty = REQUIRED.filter((field) => !values[field].trim())
            setMissing(empty)
            if (empty.length || uploadingLogo) return
            setSaving(true)
            setResult(null)
            try {
              // โหมดของฟอร์มคือ action ที่ API ใช้ตัดสินใจ ("add" / "edit")
              // add ส่ง logo ว่างไปก่อน (API รับได้) — ยังไม่มี id ให้ตั้งโฟลเดอร์รูป
              const saved = await saveShipping(mode, values, shipping?.id)
              // add: เลือกโลโก้ไว้ก็อัปโหลดตอนนี้ที่ได้ id แล้ว — API เขียน path ลงคอลัมน์ logo ให้เอง ไม่ต้องยิง edit ซ้ำ
              if (mode === "add" && pendingLogo) {
                try {
                  await uploadShippingLogo(pendingLogo, saved.id)
                } catch (logoError) {
                  // แถวบันทึกไปแล้ว — กดบันทึกซ้ำจะโดน 400 รหัสซ้ำ จึงปิดกล่องแล้วบอกให้ไปใส่รูปในโหมดแก้ไข
                  const detail =
                    logoError instanceof Error && logoError.message
                      ? ` (${logoError.message})`
                      : ""
                  setResult({
                    ok: false,
                    message: `${tform("logoSaveFailed")}${detail}`,
                  })
                  onSaved?.()
                  setTimeout(() => onOpenChange(false), 3500)
                  return
                }
              }
              setResult({ ok: true })
              onSaved?.()
              // ให้เห็นข้อความว่าสำเร็จสักครู่ก่อนปิด ไม่งั้นกล่องหายไปเลยเหมือนไม่มีอะไรเกิดขึ้น
              setTimeout(() => onOpenChange(false), 1400)
            } catch (error) {
              // ข้อความจาก API บอกสาเหตุตรง ๆ (เช่น "code already exists") เอามาแสดงต่อ
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
          <Section icon={Truck} label={tform("sectionInfo")} accent="blue">
            {/* โลโก้อยู่บนสุด เหนือรหัส/ชื่อ (แบบเดียวกับฟอร์ม Broadcast) — เก็บที่ /uploads/shipping/{id}/logo/{ชื่อไฟล์} */}
            <LogoPicker
              id="shipping-logo"
              label={tcol("logo")}
              value={values.logo}
              shippingId={mode === "edit" ? shipping?.id : undefined}
              pendingFile={pendingLogo}
              onChange={(logo) => set("logo", logo)}
              onPendingFileChange={setPendingLogo}
              onUploadingChange={setUploadingLogo}
            />

            <div className="grid gap-4 sm:grid-cols-3">
              {/* รหัสขนส่ง — ซ่อนไว้ก่อน (ผู้ใช้สั่ง 29/09/2026 · เปิดกลับ: เอา comment ออก แล้วย้าย Prefix ลงแถวล่างเหมือนเดิม) */}
              {/* {text("code")} */}
              {/* ชื่อขนส่งยาว กินสองช่อง · Prefix ขึ้นมาแทนที่ช่องรหัส */}
              <div className="sm:col-span-2">{text("name")}</div>
              {text("prefix")}
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {/* สถานะกินช่องเดียว ไม่งั้นกล่องเลือกยืดเต็มความกว้าง */}
              <Field id="shipping-status" label={tcol("status")} select>
                <SelectOption
                  id="shipping-status"
                  options={statusOptions}
                  value={values.active_status}
                  onValueChange={(next) =>
                    set("active_status", next ?? SHIPPING_ACTIVE)
                  }
                  placeholder={tr("active")}
                  label={tcol("status")}
                />
              </Field>
            </div>

            <Field id="shipping-remark" label={tcol("remark")}>
              <Textarea
                id="shipping-remark"
                rows={2}
                value={values.remark}
                placeholder="..."
                onChange={(event) => set("remark", event.target.value)}
              />
            </Field>
          </Section>

          <Section icon={Phone} label={tform("sectionContact")} accent="aqua">
            <div className="grid gap-4 sm:grid-cols-2">
              {text("tel", { inputMode: "tel" })}
              {/* ไม่ใช้ type="email" — API ไม่ได้ตรวจรูปแบบ ปล่อยให้เบราว์เซอร์ block จะกลายเป็นกฎที่หลังบ้านไม่มี */}
              {text("email", { inputMode: "email" })}
            </div>
            <Field id="shipping-address" label={tcol("address")}>
              <Textarea
                id="shipping-address"
                rows={2}
                value={values.address}
                placeholder="..."
                onChange={(event) => set("address", event.target.value)}
              />
            </Field>
          </Section>

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
              disabled={saving || uploadingLogo}
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

/** การ์ดหนึ่งกลุ่มข้อมูล — แถบสีบนสุด หัวไล่เฉดพร้อมไอคอนในชิปสี แล้วตามด้วยช่องกรอก */
function Section({
  icon: Icon,
  label,
  accent,
  children,
}: {
  icon: LucideIcon
  label: string
  accent: Accent
  children: React.ReactNode
}) {
  const colors = ACCENTS[accent]
  return (
    <section className="border-border/60 bg-card relative overflow-hidden rounded-lg border shadow-xs">
      <span aria-hidden className={cn("absolute inset-x-0 top-0 h-1", colors.bar)} />
      <div className={cn("border-border/50 flex items-center gap-2 border-b bg-gradient-to-r to-transparent px-3 pt-3 pb-2", colors.header)}>
        <span className={cn("flex size-6 items-center justify-center rounded-md", colors.chip)}>
          <Icon className="size-3.5" />
        </span>
        <h3 className="text-xs font-semibold tracking-wide uppercase">{label}</h3>
      </div>
      <div className="grid gap-4 p-3">{children}</div>
    </section>
  )
}

/** ป้ายกำกับ + ช่องกรอก วางแบบเดียวกันทุกช่อง */
function Field({
  id,
  label,
  required,
  error,
  select,
  children,
}: {
  id: string
  label: string
  /** ใส่ดอกจันให้รู้ตั้งแต่ก่อนกดบันทึกว่าช่องนี้ต้องกรอก */
  required?: boolean
  /** ข้อความผิดพลาดใต้ช่อง — ขึ้นตอนกดบันทึกแล้วยังไม่ได้กรอก */
  error?: string
  /** ช่องเป็น SelectOption — ตัวเปิดเป็น <button> ถ้าผูก htmlFor ไว้ คลิกที่ว่างข้างป้ายจะเปิดกล่องเลือกเอง
   *  จึงไม่ผูก (ชื่อช่องมาจาก aria-label ของตัวเปิดแทน) */
  select?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={select ? undefined : id} className="text-muted-foreground w-fit text-xs">
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
