"use client"

import * as React from "react"
import {
  CircleCheck,
  LoaderCircle,
  MapPin,
  TriangleAlert,
  UserRound,
  type LucideIcon,
} from "lucide-react"
import { useTranslations } from "next-intl"

import { saveCustomer } from "@/app/customer/_components/api"
import {
  CUSTOMER_FEMALE,
  CUSTOMER_MALE,
  normalizeGender,
  type Customer,
  type CustomerFormMode,
  type CustomerFormValues,
} from "@/app/customer/_components/model"
import { SelectOption } from "@/app/customer/_components/selectoption"
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
 * form_modal.tsx — ฟอร์มเพิ่ม/แก้ไขลูกค้าในกล่องซ้อน
 *
 * ปุ่มที่เปิดฟอร์มเป็นคนบอกโหมดมาเอง: "add" เปิดฟอร์มเปล่า "edit" เปิดพร้อมค่าของแถวนั้น
 * กดบันทึกแล้วยิง POST /api/web/customer-action เอง เสร็จแล้วบอกพ่อผ่าน onSaved ให้โหลดตารางใหม่
 * ส่งไปครบทุกคอลัมน์ที่แก้ได้เสมอ — เส้น -action เขียนทับทั้งแถว ตกไปตัวไหนตัวนั้นกลายเป็น NULL
 * ยอดสรุปคำสั่งซื้อ (order_count / total_amount / …) อ่านอย่างเดียว โชว์ในโหมด edit แต่ไม่ส่งไป
 */
// คลาสขอบแดง — ต้องสลับคลาสเอง ไม่ใช้ variant aria-invalid: เพราะ Tailwind v4 ห่อ variant
// ด้วย :where() ความจำเพาะจึงเท่ากับ border-input แล้วแพ้ลำดับใน stylesheet
const INVALID_FIELD =
  "border-destructive ring-3 ring-destructive/20 dark:border-destructive/50 dark:ring-destructive/40"

/**
 * สีประจำกลุ่มข้อมูล — ข้อมูลลูกค้า = blue · ที่อยู่ = aqua · ช่องยอดสั่งซื้อ = แถบซ้ายคนละสี
 * ใช้ชุด chart-1..5 แบบเดียวกับไล่เฉดของโลโก้/ปุ่มหลัก เป็นสีตกแต่งอย่างเดียว ไม่ได้สื่อความหมาย
 * ไม่ใช้ success/warning/danger/info เพราะสงวนไว้บอกสถานะ (กรอบแดงช่องบังคับ ข้อความบันทึกสำเร็จ)
 * ตัวหนังสือยังเป็นสีปกติ สีอยู่แค่ แถบ ไอคอน และพื้นจาง ๆ · Tailwind ต้องเห็นชื่อคลาสเต็ม ห้ามประกอบจากสตริง
 * (ชุดเดียวกับ product_item/_components/accents.ts — คัดมาเท่าที่ใช้ ไฟล์ของหน้าอยู่ในโฟลเดอร์ของหน้า)
 */
const ACCENTS = {
  blue: {
    bar: "bg-chart-1",
    header: "from-chart-1/14",
    chip: "bg-chart-1/15 text-chart-1",
    tile: "border-l-chart-1 bg-chart-1/6",
  },
  orange: {
    bar: "bg-chart-2",
    header: "from-chart-2/14",
    chip: "bg-chart-2/15 text-chart-2",
    tile: "border-l-chart-2 bg-chart-2/6",
  },
  aqua: {
    bar: "bg-chart-3",
    header: "from-chart-3/14",
    chip: "bg-chart-3/15 text-chart-3",
    tile: "border-l-chart-3 bg-chart-3/6",
  },
  yellow: {
    bar: "bg-chart-4",
    header: "from-chart-4/16",
    chip: "bg-chart-4/20 text-chart-4",
    tile: "border-l-chart-4 bg-chart-4/8",
  },
  magenta: {
    bar: "bg-chart-5",
    header: "from-chart-5/14",
    chip: "bg-chart-5/15 text-chart-5",
    tile: "border-l-chart-5 bg-chart-5/6",
  },
} as const

type Accent = keyof typeof ACCENTS

const toValues = (customer: Customer | undefined): CustomerFormValues => ({
  tel: customer?.tel ?? "",
  // คอลัมน์พวกนี้ nullable ในฐานข้อมูล แต่ฟอร์มถือเป็นสตริงเสมอ
  name: customer?.name ?? "",
  address: customer?.address ?? "",
  subdistrict: customer?.subdistrict ?? "",
  district: customer?.district ?? "",
  province: customer?.province ?? "",
  zipcode: customer?.zipcode ?? "",
  // แถวเก่าเป็น "ชาย" / "หญิง" — แปลงเป็นค่าอังกฤษตั้งแต่เปิดฟอร์ม บันทึกแล้วแถวนั้นจะเป็นอังกฤษ
  gender: normalizeGender(customer?.gender),
  email: customer?.email ?? "",
})

export function FormModal({
  open,
  onOpenChange,
  mode,
  customer,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** ปุ่มไหนเป็นคนเปิด — "add" หรือ "edit" */
  mode: CustomerFormMode
  /** แถวที่กำลังแก้ (โหมด edit เท่านั้น) */
  customer?: Customer
  /** บันทึกสำเร็จแล้ว — ตารางเอาไปโหลดข้อมูลใหม่ */
  onSaved?: () => void
}) {
  const t = useTranslations("common")
  const tr = useTranslations("customer")
  const tform = useTranslations("customer.form")
  const tcol = useTranslations("customer.columns")

  const [values, setValues] = React.useState(() => toValues(customer))
  const [saving, setSaving] = React.useState(false)
  /** เบอร์โทรยังว่างตอนกดบันทึก — ตรวจเองแทน required ของเบราว์เซอร์ */
  const [telError, setTelError] = React.useState(false)
  /** ชื่อลูกค้ายังว่างตอนกดบันทึก — บังคับฝั่งหน้าจอเท่านั้น (API ยังรับชื่อว่างได้ เก็บเป็น NULL) */
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
  const formKey = `${mode}-${customer?.id ?? "new"}-${String(open)}`
  const [lastKey, setLastKey] = React.useState(formKey)
  if (formKey !== lastKey) {
    setLastKey(formKey)
    setValues(toValues(customer))
    setResult(null)
    setSaving(false)
    setTelError(false)
    setNameError(false)
  }

  const set = <K extends keyof CustomerFormValues>(
    key: K,
    value: CustomerFormValues[K]
  ) => setValues((current) => ({ ...current, [key]: value }))

  /** ค่าเก็บเป็นภาษาอังกฤษตาม _GENDERS ฝั่ง API — ป้ายแปลตามภาษา */
  const genderOptions = [
    { value: CUSTOMER_MALE, label: tr("male") },
    { value: CUSTOMER_FEMALE, label: tr("female") },
  ]

  /** ช่องข้อความธรรมดา — ไม่บังคับทุกช่อง (tel / name แยกเขียนเองเพราะบังคับ) */
  const text = (
    key: Exclude<keyof CustomerFormValues, "tel" | "name" | "gender" | "address">,
    extra?: React.ComponentProps<typeof Input>
  ) => (
    <Field id={`customer-${key}`} label={tcol(key)}>
      <Input
        id={`customer-${key}`}
        value={values[key]}
        placeholder="..."
        onChange={(event) => set(key, event.target.value)}
        {...extra}
      />
    </Field>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* ฟอร์มสูงเกินจอเตี้ยได้ — ให้ทั้งกล่องเลื่อนได้แทนที่จะล้นจอ */}
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
        {/* แถบหัวไล่เฉดสีโลโก้ + แถบสีบางด้านบนสุด ชุดเดียวกับฟอร์มสินค้า */}
        <DialogHeader className="from-chart-1/14 to-chart-5/10 border-border/60 relative -mx-4 -mt-4 overflow-hidden rounded-t-xl border-b bg-gradient-to-r via-transparent p-4 pt-5">
          <span
            aria-hidden
            className="from-chart-1 via-chart-5 to-chart-2 absolute inset-x-0 top-0 h-1 bg-gradient-to-r"
          />
          <div className="flex items-center gap-3">
            <span className="from-chart-1 to-chart-5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm">
              <UserRound className="size-5" />
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
            // เช็คทั้งสองช่องที่บังคับก่อน ให้ขึ้นกรอบแดงพร้อมกัน ไม่ใช่ทีละช่อง
            const missingTel = !values.tel.trim()
            const missingName = !values.name.trim()
            setTelError(missingTel)
            setNameError(missingName)
            if (missingTel || missingName) return
            setSaving(true)
            setResult(null)
            try {
              // โหมดของฟอร์มคือ action ที่ API ใช้ตัดสินใจ ("add" / "edit")
              await saveCustomer(mode, values, customer?.id)
              setResult({ ok: true })
              onSaved?.()
              // ให้เห็นข้อความว่าสำเร็จสักครู่ก่อนปิด ไม่งั้นกล่องหายไปเลยเหมือนไม่มีอะไรเกิดขึ้น
              setTimeout(() => onOpenChange(false), 1400)
            } catch (error) {
              // ข้อความจาก API บอกสาเหตุตรง ๆ (เช่น "tel already exists") เอามาแสดงต่อ
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
          {/* ยอดสรุปจากคำสั่งซื้อ — อ่านอย่างเดียว มีแต่ตอนแก้ไข */}
          {mode === "edit" && customer ? <OrderSummary customer={customer} /> : null}

          <Section icon={UserRound} label={tform("sectionInfo")} accent="blue">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field
                id="customer-tel"
                label={tcol("tel")}
                required
                error={telError ? t("required") : undefined}
              >
                <Input
                  id="customer-tel"
                  value={values.tel}
                  inputMode="tel"
                  onChange={(event) => {
                    set("tel", event.target.value)
                    if (event.target.value.trim()) setTelError(false)
                  }}
                  placeholder="0812345678"
                  aria-required
                  aria-invalid={telError || undefined}
                  className={telError ? INVALID_FIELD : undefined}
                />
              </Field>
              {/* ชื่อยาวกว่าเบอร์มาก กินสองช่องที่เหลือของแถว */}
              <div className="sm:col-span-2">
                <Field
                  id="customer-name"
                  label={tcol("name")}
                  required
                  error={nameError ? t("required") : undefined}
                >
                  <Input
                    id="customer-name"
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

            <div className="grid gap-4 sm:grid-cols-3">
              <Field id="customer-gender" label={tcol("gender")} select>
                <SelectOption
                  id="customer-gender"
                  options={genderOptions}
                  value={values.gender || null}
                  // ล้างค่าได้ — ส่งสตริงว่างไป API เก็บเป็น NULL
                  onValueChange={(next) => set("gender", next ?? "")}
                  placeholder="..."
                  label={tcol("gender")}
                />
              </Field>
              <div className="sm:col-span-2">
                {/* ไม่ใช้ type="email" — ช่องนี้ไม่บังคับ และ API ไม่ได้ตรวจรูปแบบ
                    ปล่อยให้เบราว์เซอร์ block การ submit จะกลายเป็นกฎที่หลังบ้านไม่มี */}
                {text("email", { inputMode: "email" })}
              </div>
            </div>
          </Section>

          <Section icon={MapPin} label={tform("sectionAddress")} accent="aqua">
            <Field id="customer-address" label={tcol("address")}>
              <Textarea
                id="customer-address"
                rows={2}
                value={values.address}
                placeholder="..."
                onChange={(event) => set("address", event.target.value)}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              {text("subdistrict")}
              {text("district")}
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2">{text("province")}</div>
              {text("zipcode", { inputMode: "numeric" })}
            </div>
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

/** ยอดสรุปคำสั่งซื้อของลูกค้า (อ่านอย่างเดียว) — ช่องเรียงกันเฉย ๆ ไม่มีกรอบการ์ดครอบ
 *  แต่ละช่องมีแถบสีซ้ายของตัวเอง · ค่าว่างโชว์ขีดจาง ๆ ให้รู้ว่ายังไม่เคยสั่ง */
function OrderSummary({ customer }: { customer: Customer }) {
  const tcol = useTranslations("customer.columns")

  const amount = Number(customer.total_amount)
  const stats: {
    key: "order_count" | "line_count" | "total_amount" | "first_order_date" | "last_order_date"
    value: string | null | undefined
    accent: Accent
  }[] = [
    {
      key: "order_count",
      value: customer.order_count?.toLocaleString("en-US"),
      accent: "blue",
    },
    {
      key: "line_count",
      value: customer.line_count?.toLocaleString("en-US"),
      accent: "aqua",
    },
    {
      key: "total_amount",
      value:
        customer.total_amount && Number.isFinite(amount)
          ? amount.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
          : customer.total_amount,
      accent: "orange",
    },
    // ปิดไว้ก่อน — สั่งซื้อครั้งแรก (เปิดกลับให้แก้ sm:grid-cols-4 ด้านล่างเป็น 5 ด้วย)
    // { key: "first_order_date", value: customer.first_order_date?.slice(0, 10), accent: "yellow" },
    { key: "last_order_date", value: customer.last_order_date?.slice(0, 10), accent: "magenta" },
  ]

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.key}
          className={cn("min-w-0 rounded-md border-l-4 px-2.5 py-1.5", ACCENTS[stat.accent].tile)}
        >
          <div className="text-muted-foreground truncate text-xs">{tcol(stat.key)}</div>
          <div className="truncate font-semibold tabular-nums">
            {stat.value ?? <span className="text-muted-foreground/60 font-normal">—</span>}
          </div>
        </div>
      ))}
    </div>
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
