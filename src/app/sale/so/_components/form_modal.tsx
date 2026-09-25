"use client"

import * as React from "react"
import {
  CircleCheck,
  LoaderCircle,
  Package,
  ReceiptText,
  TriangleAlert,
  Truck,
  UserRound,
  Wallet,
} from "lucide-react"
import { useTranslations } from "next-intl"

// type Accent ใช้แค่ใน SyncInfo ที่ซ่อนอยู่ — เปิด SyncInfo กลับให้ใส่ ", type Accent" คืนด้วย
import { ACCENTS } from "@/app/sale/so/_components/accents"
import { getSoOptions, saveSo } from "@/app/sale/so/_components/api"
import { CustomerSelect } from "@/app/sale/so/_components/customerselect"
import { BroadcastLogo } from "@/app/sale/so/_components/logo"
import {
  NO_SO_OPTIONS,
  SO_FIELDS,
  SO_IS_PAYMENTS,
  SO_PAY_BYS,
  type CustomerOption,
  type NamedOption,
  type So,
  type SoFormMode,
  type SoFormValues,
} from "@/app/sale/so/_components/model"
import {
  SelectOption,
  type SelectOptionItem,
} from "@/app/sale/so/_components/selectoption"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

/**
 * form_modal.tsx — ฟอร์มเพิ่ม/แก้ไขรายการในใบสั่งขาย
 *
 * ปุ่มที่เปิดฟอร์มเป็นคนบอกโหมดมาเอง: "add" เปิดฟอร์มเปล่า "edit" เปิดพร้อมค่าของแถวนั้น
 * กดบันทึกแล้วยิง POST /api/web/so-action เอง เสร็จแล้วบอกพ่อผ่าน onSaved ให้โหลดตารางใหม่
 *
 * **ฟอร์มนี้ถือค่าครบทุกคอลัมน์ที่เขียนได้เสมอ** (SO_FIELDS) เพราะเส้น -action เขียนทับทั้งแถว
 * ไม่ได้แก้เฉพาะที่ส่งไป — ตกไปตัวเดียวของเดิมกลายเป็น NULL ทันที
 * source_file / synced_at / updated_at อ่านอย่างเดียว (งาน sync เป็นคนเขียน) ไม่ได้อยู่ในฟอร์ม
 *
 * **บังคับแค่ so_code** เหมือนฝั่ง API · ซ้ำทั้ง (so_code, product_name, product_group) API ตอบ 400
 * ใบเดิมเพิ่มสินค้าตัวใหม่ได้ จึงตรึงสองช่องนี้ไว้เหนือแท็บ ให้เห็นว่ากำลังแก้บรรทัดไหนอยู่ตลอด
 * **โหมดแก้ไข: so_code กับ product_name เป็นช่องอ่านอย่างเดียว** (สองในสามของ unique key ของแถว
 * และเป็นเลข/ชื่อที่ออกไปกับใบแล้ว) · โหมดเพิ่มยังพิมพ์ได้ทั้งคู่ — so_code ถูก API บังคับ
 * ถ้าล็อกไว้ด้วยจะบันทึกไม่ผ่านเลย ส่วนชื่อสินค้าต้องกรอกตอนสร้างรายการใหม่อยู่ดี
 *
 * **โหมดแก้ไข: sell_by กับ did อ่านอย่างเดียวด้วย** (งาน sync เป็นเจ้าของค่า ดู readonlyText)
 *
 * **โหมดแก้ไข: channel เป็นกล่องอ่านอย่างเดียวด้วย** (งาน sync เป็นเจ้าของค่า) — เป็น div หน้าตา
 * เหมือนช่องกรอกที่มีโลโก้ + ชื่อ ไม่ใช่ <Input readOnly> เพราะช่องนี้เป็น select ที่มีรูปในตัวเลือก
 * ค่ายังอยู่ใน values ทั้ง channel และ channel_name จึงถูกส่งไปกับ -action เหมือนเดิม
 *
 * **create_date กับ po_date ถูกซ่อนไว้** (comment ไว้ในแท็บใบสั่งขาย) — ค่ายังอยู่ใน values
 * และถูกส่งไปกับ -action ทุกครั้ง ไม่ได้กลายเป็น NULL
 * ระวัง: แถวที่เพิ่มจากหน้านี้จะไม่มีวันที่ทั้งสองตัว และเส้น -get-list เรียง create_date desc
 * nulls last แถวใหม่จึงไปโผล่หน้าสุดท้าย ไม่ใช่หน้าแรก
 *
 * **ช่อง select** ไม่มีเส้น so-get-option (ดูหัว api.ts) ตัวเลือกจึงมาจากทะเบียนที่คอลัมน์นั้นอ้างถึง
 * ดึงใหม่ทุกครั้งที่เปิดฟอร์ม · ทุกช่องเก็บ "ชื่อ" ลงคอลัมน์ข้อความ ยกเว้นประเภทการจัดส่งที่เก็บ
 * shipment_type_id ให้ด้วย (คอลัมน์นั้นเป็น foreign key ตัวจริง) และช่องทางที่เขียนลงสองคอลัมน์พร้อมกัน
 * ค่าเดิมของแถวที่ไม่มีในตัวเลือกถูกเติมเข้าไปให้เห็น (withCurrent) ไม่งั้นช่องจะดูว่างทั้งที่มีค่า
 * และกดเลือกอย่างอื่นแล้วค่าเก่าหายโดยไม่รู้ตัว — ทะเบียนเก็บค่าอังกฤษ แต่ของจริงในตารางเป็นไทย
 * (ดูหมายเหตุใน model.ts) ตัวเลือกจึงมีทั้งจากทะเบียนและค่าที่งาน sync เขียนจริง
 *
 * **การจัดหน้า** 40 ช่องเรียงเป็นแถวยาวไม่ได้ จึงแบ่งเป็น 5 แท็บ แล้วตรึงแถบ so_code + ชื่อสินค้า
 * ไว้ด้านบนและปุ่มไว้ด้านล่าง (เลื่อนเฉพาะเนื้อใน) — ช่องบังคับกรอกจะได้เห็นกรอบแดงจากทุกแท็บ
 */
// คลาสขอบแดง — ต้องสลับคลาสเอง ไม่ใช้ variant aria-invalid: เพราะ Tailwind v4 ห่อ variant
// ด้วย :where() ความจำเพาะจึงเท่ากับ border-input แล้วแพ้ลำดับใน stylesheet
const INVALID_FIELD =
  "border-destructive ring-3 ring-destructive/20 dark:border-destructive/50 dark:ring-destructive/40"

/**
 * พื้นของช่องที่กรอกได้ — ขาวปกติ (--card) ไม่โปร่งใส ไม่งั้นพื้นไล่สีของแท็บทะลุขึ้นมาในช่อง
 * ช่องอ่านอย่างเดียวยังเป็นเทา (bg-muted/60) จึงแยกออกได้ด้วยตาว่าช่องไหนแก้ได้ · ธีมมืดคงพื้นเดิม
 */
const EDITABLE = "bg-card dark:bg-input/30"

/** หน้าตาช่องตัวเลข — ชิดขวา เลขกว้างเท่ากัน (ทั้งช่องกรอกและช่องอ่านอย่างเดียว) */
const NUMERIC = "text-right font-mono tabular-nums"

/** พื้นของช่องอ่านอย่างเดียว — เทา ตัวหนังสือจาง ไม่มีวงโฟกัส (ใช้ทั้ง Input และ Textarea) */
const READONLY =
  "bg-muted/60 text-muted-foreground cursor-default focus-visible:ring-0"

/** ปุ่มแท็บ — ไอคอนสีประจำกลุ่มอยู่หน้าชื่อ แท็บที่เลือกอยู่ได้พื้นจาง + ขอบ + เส้นใต้สีเดียวกัน */
const TAB_TRIGGER = "shrink-0 gap-1.5 data-active:font-semibold data-active:shadow-sm"

/** เนื้อในแท็บ — กรอบต่อจากแถบแท็บ (ไม่มีขอบบนซ้ำ) สูงขั้นต่ำเท่ากันทุกแท็บ กล่องจะได้ไม่กระตุกตอนสลับ */
const TAB_PANEL =
  "border-border grid min-h-[300px] content-start gap-4 rounded-b-lg border border-t-0 p-4"

/** ทุกคอลัมน์ที่ขึ้นหน้าจอ — ต้องมีคำแปลใน so.columns ทุกตัว (TS เช็คให้ตอน compile) */
type SoField = keyof SoFormValues

/** รูปแบบวันที่ที่งาน sync เขียนมา — คอลัมน์วันที่ทุกตัวเป็น text จึงส่งกลับตามรูปนี้เสมอ */
const DATE_PLACEHOLDER = "2026-09-24 09:01:48"

/** วันที่ทุกตัวเป็นข้อความ ไม่ใช้ <input type="date"> เพราะรูปแบบมีเวลาต่อท้ายและต้องส่งกลับเหมือนเดิม */
const DATE_FIELDS = new Set<SoField>([
  "create_date",
  "po_date",
  "payment_date",
  "shipping_date",
  "receive_date",
  "appointment_date",
])

/**
 * ช่องบังคับกรอก → แท็บที่ช่องนั้นอยู่ (null = อยู่นอกแท็บ เห็นได้ตลอด)
 * ตรวจเองตอนกดบันทึก ไม่ใช้ required ของเบราว์เซอร์ (ช่องในแท็บที่ปิดอยู่ไม่ได้อยู่ใน DOM ด้วยซ้ำ)
 * ฝั่ง API บังคับแค่ so_code ตัวเดียวเหมือนกัน
 */
const REQUIRED_FIELDS = { so_code: null } as const satisfies Partial<
  Record<SoField, string | null>
>

type RequiredField = keyof typeof REQUIRED_FIELDS

const isRequired = (field: string): field is RequiredField =>
  field in REQUIRED_FIELDS

/** ลำดับแท็บ — ใช้ตอนต้องพาไปแท็บแรกสุดที่มีช่องบังคับยังว่าง */
const TAB_ORDER = ["order", "customer", "product", "payment", "shipping"]

/**
 * กรองให้เหลือแค่ตัวเลข — ใช้กับทุกช่องตัวเลข ทั้งตอนพิมพ์และตอนวาง
 * decimal: ยอมจุดทศนิยมตัวแรกตัวเดียว ทศนิยมไม่เกิน 2 หลัก
 * ไม่ decimal (customer_id / shipment_type_id): ตัวเลขล้วน — API ต้องการจำนวนเต็ม
 * ไม่ยอมเครื่องหมายลบและจุลภาค (ค่าเดิมที่มีอยู่แล้วยังโชว์ครบ ถูกกรองก็ต่อเมื่อพิมพ์แก้ช่องนั้น)
 */
const onlyNumber = (raw: string, decimal: boolean) => {
  if (!decimal) return raw.replace(/\D/g, "")
  const cleaned = raw.replace(/[^\d.]/g, "")
  const dot = cleaned.indexOf(".")
  if (dot === -1) return cleaned
  return (
    cleaned.slice(0, dot + 1) + cleaned.slice(dot + 1).replace(/\./g, "").slice(0, 2)
  )
}

/**
 * synced_at / updated_at เป็น timestamp จริง (ไม่ใช่ text เหมือนวันที่ตัวอื่นในตารางนี้)
 * Flask ส่งมาเป็น HTTP date ตาม UTC เช่น "Mon, 21 Sep 2026 09:02:59 GMT" — แปลงเป็นเวลาเครื่อง
 * ให้อ่านเทียบกับ create_date ได้ (sync เขียน create_date เป็นเวลาไทยอยู่แล้ว)
 * อ่านไม่ออกก็โชว์ค่าดิบ ไม่เดาแทน
 */
// ซ่อนไว้คู่กับ SyncInfo (ไฟล์ต้นทาง / ซิงก์เมื่อ / แก้ไขล่าสุด) — เปิดกลับพร้อมกันทั้งสองตัว
// const formatStamp = (value: string | null) => {
//   if (!value) return null
//   const time = Date.parse(value)
//   if (Number.isNaN(time)) return value
//   const at = new Date(time)
//   const pad = (n: number) => String(n).padStart(2, "0")
//   return `${pad(at.getDate())}/${pad(at.getMonth() + 1)}/${at.getFullYear()} ${pad(at.getHours())}:${pad(at.getMinutes())}`
// }

/** ค่าว่างของทุกคอลัมน์ — สร้างจาก SO_FIELDS จะได้ไม่มีทางตกหล่น */
const emptyValues: SoFormValues = Object.fromEntries(
  SO_FIELDS.map((field) => [field, ""])
) as SoFormValues

/** ทะเบียนที่ผูกกันด้วยชื่อ — value คือชื่อที่จะเขียนลงคอลัมน์ข้อความ */
const byName = (list: NamedOption[]): SelectOptionItem[] =>
  list.map((option) => ({ value: option.name, label: option.name }))

/** ค่าที่งาน sync เขียนจริง (ไม่ได้มาจากทะเบียน) — ดู SO_PAY_BYS / SO_IS_PAYMENTS ใน model.ts */
const fromValues = (values: readonly string[]): SelectOptionItem[] =>
  values.map((value) => ({ value, label: value }))

/** ต่อสองรายการแล้วตัดตัวซ้ำ — ทะเบียนกับค่าที่ใช้จริงอาจมีชื่อเดียวกัน */
const merge = (...lists: SelectOptionItem[][]): SelectOptionItem[] => {
  const seen = new Set<string>()
  return lists.flat().filter((option) => {
    if (seen.has(option.value)) return false
    seen.add(option.value)
    return true
  })
}

/** เติมค่าที่แถวถืออยู่แต่ไม่มีในตัวเลือก ต่อท้ายรายการ — ป้ายเป็นค่าดิบตามที่เก็บ */
const withCurrent = (
  options: SelectOptionItem[],
  current: string
): SelectOptionItem[] =>
  !current || options.some((option) => option.value === current)
    ? options
    : [...options, { value: current, label: current }]

const toValues = (so: So | undefined): SoFormValues => {
  if (!so) return { ...emptyValues }
  // ทุกคอลัมน์กลายเป็นสตริงเพื่อผูกกับช่องกรอก — null/undefined เป็นค่าว่าง
  // (numeric ส่งมาเป็นสตริงอยู่แล้ว ส่วน foreign key เป็นตัวเลข ต้อง String() ให้)
  return Object.fromEntries(
    SO_FIELDS.map((field) => {
      const raw = so[field as keyof So]
      return [field, raw === null || raw === undefined ? "" : String(raw)]
    })
  ) as SoFormValues
}

export function FormModal({
  open,
  onOpenChange,
  mode,
  so,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** ปุ่มไหนเป็นคนเปิด — "add" หรือ "edit" */
  mode: SoFormMode
  /** แถวที่กำลังแก้ (โหมด edit เท่านั้น) */
  so?: So
  /** บันทึกสำเร็จแล้ว — ตารางเอาไปโหลดข้อมูลใหม่ */
  onSaved?: () => void
}) {
  const t = useTranslations("common")
  const tform = useTranslations("so.form")
  const tcol = useTranslations("so.columns")

  const [values, setValues] = React.useState(() => toValues(so))
  const [saving, setSaving] = React.useState(false)
  /** ช่องบังคับที่ยังว่างตอนกดบันทึกครั้งล่าสุด — กรอกแล้วหลุดออกทันที (ดู set) */
  const [missing, setMissing] = React.useState<RequiredField[]>([])
  /** แท็บที่เปิดอยู่ — คุมเองแทน defaultValue เพื่อพาไปแท็บที่มีช่องบังคับยังว่างได้ */
  const [tab, setTab] = React.useState("order")
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
  const formKey = `${mode}-${so?.id ?? "new"}-${String(open)}`
  const [lastKey, setLastKey] = React.useState(formKey)
  if (formKey !== lastKey) {
    setLastKey(formKey)
    setValues(toValues(so))
    setResult(null)
    setSaving(false)
    setMissing([])
    setTab("order")
  }

  /** ตัวเลือกของช่อง select ทั้งหมด — ดึงใหม่ทุกครั้งที่เปิด ทะเบียนอาจเพิ่ง/ปิดตัวเลือกไป */
  const [options, setOptions] = React.useState(NO_SO_OPTIONS)
  React.useEffect(() => {
    if (!open) return
    let cancelled = false
    // getSoOptions ไม่มีทาง throw — เส้นไหนล้ม ช่องนั้นได้ [] ไป
    getSoOptions().then((next) => {
      if (!cancelled) setOptions(next)
    })
    return () => {
      cancelled = true
    }
  }, [open])

  const set = (key: SoField, value: string) => {
    setValues((current) => ({ ...current, [key]: value }))
    // ช่องบังคับที่ขึ้นแดงอยู่ พอมีค่าแล้วเอากรอบแดงออกเลย ไม่ต้องรอกดบันทึกใหม่
    if (value.trim() && isRequired(key)) {
      setMissing((current) =>
        current.includes(key) ? current.filter((field) => field !== key) : current
      )
    }
  }

  /** ข้อความผิดพลาดของช่อง — มีเฉพาะช่องบังคับที่ยังว่างตอนกดบันทึก */
  const errorOf = (field: string) =>
    isRequired(field) && missing.includes(field) ? t("required") : undefined

  /**
   * ประเภทการจัดส่ง — เขียนทั้งชื่อ (shipment_type) และ id (shipment_type_id) พร้อมกัน
   * เลือกจากทะเบียนได้ id ตรง ๆ · เลือกค่าเดิมของแถวที่ไม่อยู่ในทะเบียนแล้ว (เช่น "Own Fleet W"
   * ที่ถูกปิดไป) ให้คง id เดิมของแถวไว้ ไม่งั้นความเชื่อมโยงหลุดโดยไม่มีใครสั่ง
   */
  const pickShipmentType = (next: string | null) => {
    const name = next ?? ""
    const fromRegistry = options.shipmentTypes.find(
      (option) => option.name === name
    )?.id
    const keepOwn = name && name === (so?.shipment_type ?? "") ? so?.shipment_type_id : null
    setValues((current) => ({
      ...current,
      shipment_type: name,
      shipment_type_id: String(fromRegistry ?? keepOwn ?? ""),
    }))
  }

  /**
   * ผู้สั่งซื้อ — เลือกจากทะเบียนลูกค้า (/customer-get-option) แล้วเขียนสามคอลัมน์พร้อมกัน:
   * name, tel และ customer_id (foreign key ไป customer) ให้ชื่อ เบอร์ และรหัสเป็นคนเดียวกันเสมอ
   * ชื่อว่างในทะเบียนไม่ทับชื่อเดิมของแถวทิ้ง
   */
  const pickCustomer = (customer: CustomerOption) => {
    setValues((current) => ({
      ...current,
      name: customer.name ?? current.name,
      tel: customer.tel,
      customer_id: String(customer.id),
    }))
  }

  /**
   * พิมพ์ชื่อผู้สั่งเอง — ชื่อที่พิมพ์ไม่ใช่คนในทะเบียนที่เคยเลือกไว้แล้ว จึงตัด customer_id ทิ้ง
   * (ไม่งั้นชื่อบอกคนหนึ่ง แต่ foreign key ชี้อีกคน) · เบอร์โทรไม่แตะ แก้เองได้ที่ช่องข้าง ๆ
   */
  const typeCustomer = (name: string) => {
    setValues((current) => ({ ...current, name, customer_id: "" }))
  }

  /** ช่องทาง — สองคอลัมน์เก็บค่าเดียวกันทั้ง 43,000 แถว (ตรวจแล้วไม่มีแถวไหนต่างกัน) เขียนพร้อมกัน */
  const pickChannel = (next: string | null) => {
    const name = next ?? ""
    setValues((current) => ({ ...current, channel: name, channel_name: name }))
  }

  /** ช่องข้อความธรรมดา — ไม่บังคับทุกช่อง (so_code แยกเขียนเองเพราะบังคับและตรึงไว้เหนือแท็บ) */
  const text = (field: SoField) => (
    <Field id={`so-${field}`} label={tcol(field)}>
      <Input
        id={`so-${field}`}
        value={values[field]}
        placeholder={DATE_FIELDS.has(field) ? DATE_PLACEHOLDER : "..."}
        onChange={(event) => set(field, event.target.value)}
        className={cn(EDITABLE, DATE_FIELDS.has(field) && "font-mono")}
      />
    </Field>
  )

  /**
   * ช่องข้อความอ่านอย่างเดียว — ใช้กับค่าที่งาน sync เป็นเจ้าของ ไม่ให้แก้จากหน้านี้
   * ค่ายังอยู่ใน values และถูกส่งไปกับ -action ทุกครั้งเหมือนช่องปกติ (ไม่ได้หายไปเพราะอ่านอย่างเดียว)
   * ไม่มีคำอธิบายใต้ช่อง (hint ถูกสั่งให้ซ่อน — คำแปลยังอยู่ที่ so.form.syncReadonlyHint)
   * ใช้กับ: พนักงานขาย (sell_by), เบอร์รับสาย (did), รหัสสินค้า (item_code) · เดิมใช้กับวันที่สั่งซื้อที่ซ่อนไปแล้ว
   */
  const readonlyText = (field: SoField, className?: string, display?: string) => (
    <Field id={`so-${field}`} label={tcol(field)}>
      <Input
        id={`so-${field}`}
        value={display ?? values[field]}
        readOnly
        aria-readonly
        className={cn(READONLY, DATE_FIELDS.has(field) && "font-mono", className)}
      />
    </Field>
  )

  /** แท็บลูกค้าอ่านอย่างเดียวในโหมดแก้ไข (ขอไว้ก่อน) — เปลี่ยนเป็น false เพื่อให้แก้ได้อีก */
  const customerLocked = mode === "edit"

  /** ช่องข้อความของแท็บลูกค้า — ล็อกอยู่เป็นช่องอ่านอย่างเดียว ไม่ล็อกเป็นช่องกรอกปกติ */
  const customerText = (field: SoField) =>
    customerLocked ? readonlyText(field) : text(field)

  /** แท็บสินค้าอ่านอย่างเดียวในโหมดแก้ไข (ขอไว้ก่อน) — เปลี่ยนเป็น false เพื่อให้แก้ได้อีก */
  const productLocked = mode === "edit"

  /** ช่องข้อความของแท็บสินค้า — ล็อกอยู่เป็นช่องอ่านอย่างเดียว ไม่ล็อกเป็นช่องกรอกปกติ */
  const productText = (field: SoField) =>
    productLocked ? readonlyText(field) : text(field)

  /** แท็บการชำระเงินอ่านอย่างเดียวในโหมดแก้ไข (ขอไว้ก่อน) — เปลี่ยนเป็น false เพื่อให้แก้ได้อีก */
  const paymentLocked = mode === "edit"

  /** ช่องตัวเลขของแท็บการชำระเงิน — ล็อกอยู่ยังชิดขวา/เลขกว้างเท่ากันเหมือนช่องตัวเลขปกติ */
  const paymentNum = (field: SoField) =>
    paymentLocked
      ? readonlyText(field, NUMERIC)
      : num(field)

  /** แท็บการจัดส่งอ่านอย่างเดียวในโหมดแก้ไข (ขอไว้ก่อน) ยกเว้นเลขพัสดุ — เปลี่ยนเป็น false เพื่อให้แก้ได้อีก */
  const shippingLocked = mode === "edit"

  /**
   * ช่องตัวเลข — พิมพ์ได้แค่ตัวเลข (ดู onlyNumber) ชิดขวาและเลขความกว้างเท่ากัน
   * integer: คอลัมน์จำนวนเต็ม (foreign key) · hint: คำอธิบายสีจางใต้ช่อง
   */
  const num = (
    field: SoField,
    { integer = false, hint }: { integer?: boolean; hint?: string } = {}
  ) => (
    <Field id={`so-${field}`} label={tcol(field)} hint={hint}>
      <Input
        id={`so-${field}`}
        value={values[field]}
        inputMode={integer ? "numeric" : "decimal"}
        placeholder={integer ? "" : "0.00"}
        onChange={(event) => set(field, onlyNumber(event.target.value, !integer))}
        className={cn(EDITABLE, NUMERIC)}
      />
    </Field>
  )

  /** ช่อง select เลือกตัวเดียว — ล้างค่า (×) แล้วเขียนสตริงว่างกลับ API เก็บเป็น NULL */
  const select = (
    field: SoField,
    items: SelectOptionItem[],
    onPick?: (next: string | null) => void
  ) => (
    <Field id={`so-${field}`} label={tcol(field)} select>
      <SelectOption
        id={`so-${field}`}
        options={withCurrent(items, values[field])}
        value={values[field] || null}
        onValueChange={onPick ?? ((next) => set(field, next ?? ""))}
        placeholder="..."
        label={tcol(field)}
      />
    </Field>
  )

  /**
   * ช่องทางออกอากาศ — ตัวเลือกมาจาก /broadcast-get-option (ทะเบียนหน้า /broadcast) ซึ่งส่ง logo มาด้วย
   * เส้นเดียวกับที่คอลัมน์ในตารางใช้ · เก็บลงคอลัมน์เป็น "ชื่อ" (so ไม่มี channel_id) โลโก้เป็นแค่รูปประกอบ
   */
  const channelOptions: SelectOptionItem[] = options.broadcasts.map((option) => ({
    value: option.name,
    label: option.name,
    icon: <BroadcastLogo src={option.logo} alt={option.name} className="size-5" />,
  }))

  /** โลโก้ของช่องทางที่แถวนี้ถืออยู่ — ใช้ตอนโหมดแก้ไข ที่ช่องเป็นแบบอ่านอย่างเดียว
   *  ชื่อที่ไม่มีในทะเบียน (outbound call, Retail, …) ไม่มีโลโก้ BroadcastLogo คืน null เอง */
  const channelLogo = options.broadcasts.find(
    (option) => option.name === values.channel
  )?.logo

  /**
   * ผู้ขายของแถวนี้แบบมีรหัส ("code — name") — ใช้ตอนช่องผู้ขายอ่านอย่างเดียว ให้ตรงกับป้ายใน dropdown
   * ตาราง so เก็บแค่ vendor_name (ไม่มีรหัส) จึงหารหัสจากทะเบียนด้วยชื่อ · ชื่อผู้ขายซ้ำกันได้
   * เจอชื่อนี้คนเดียวถึงใส่รหัส — ไม่เจอหรือเจอหลายคน (เดาไม่ได้ว่าคนไหน) โชว์ชื่อเปล่าตามที่เก็บ
   * ค่าที่ส่งไปกับ -action ยังเป็น vendor_name เดิม ป้ายนี้แค่แสดงผล
   */
  const vendorMatches = options.vendors.filter(
    (vendor) => vendor.name === values.vendor_name
  )
  const vendorLabel =
    vendorMatches.length === 1
      ? `${vendorMatches[0].code} — ${vendorMatches[0].name}`
      : values.vendor_name

  /** ผู้ขาย: ป้ายมี code นำหน้า เพราะชื่อผู้ขายซ้ำกันได้ และค้นด้วย code ก็ได้ */
  const vendorOptions: SelectOptionItem[] = options.vendors.map((vendor) => ({
    value: vendor.name,
    label: `${vendor.code} — ${vendor.name}`,
  }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* p-0 + flex เพื่อให้หัวกับปุ่มอยู่กับที่ เลื่อนเฉพาะเนื้อในแท็บ */}
      <DialogContent className="flex max-h-[88vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        {/* แถบหัวไล่เฉดชุดเดียวกับแถบตัวกรองในตาราง */}
        <DialogHeader className="from-primary/12 border-border/60 border-b bg-gradient-to-r via-transparent to-transparent p-4">
          <DialogTitle>
            {mode === "add" ? tform("addTitle") : tform("editTitle")}
          </DialogTitle>
          <DialogDescription>
            {mode === "add" ? tform("addDescription") : tform("editDescription")}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={async (event) => {
            event.preventDefault()
            if (saving) return
            // ตรวจทุกช่องบังคับพร้อมกัน ให้ขึ้นกรอบแดงครบในทีเดียว ไม่ใช่ทีละช่อง
            const nextMissing = (
              Object.keys(REQUIRED_FIELDS) as RequiredField[]
            ).filter((field) => !values[field].trim())
            setMissing(nextMissing)
            if (nextMissing.length) {
              // ช่องที่ว่างอยู่ในแท็บ → พาไปแท็บแรกสุดที่มีช่องว่าง ไม่งั้นกดแล้วเงียบเหมือนปุ่มเสีย
              // (ตอนนี้ช่องบังคับอยู่นอกแท็บทั้งหมด เห็นได้ตลอด — เผื่อย้ายเข้าแท็บในอนาคต)
              const tabs: string[] = nextMissing.flatMap(
                (field) => REQUIRED_FIELDS[field] ?? []
              )
              const first = TAB_ORDER.find((name) => tabs.includes(name))
              if (first && !tabs.includes(tab)) setTab(first)
              return
            }
            setSaving(true)
            setResult(null)
            try {
              // โหมดของฟอร์มคือ action ที่ API ใช้ตัดสินใจ ("add" / "edit")
              // ส่งไปครบทุกคอลัมน์ ไม่งั้นของเดิมโดนเขียนทับเป็นค่าว่าง
              await saveSo(mode, values, so?.id)
              setResult({ ok: true })
              onSaved?.()
              // ให้เห็นข้อความว่าสำเร็จสักครู่ก่อนปิด ไม่งั้นกล่องหายไปเลยเหมือนไม่มีอะไรเกิดขึ้น
              setTimeout(() => onOpenChange(false), 1400)
            } catch (error) {
              // ข้อความจาก API บอกสาเหตุตรง ๆ เอามาแสดงต่อ
              setResult({
                ok: false,
                message: error instanceof Error ? error.message : undefined,
              })
            } finally {
              setSaving(false)
            }
          }}
          className="flex min-h-0 flex-1 flex-col"
        >
          {/* auto-rows-max: กล่องนี้สูงจำกัดแล้วเลื่อนเอง แถวที่ถือกล่อง overflow-hidden (กรอบ so_code)
              จะหดได้ถึง 0 แล้วโดนแถวถัดไปวาดทับ — ให้ทุกแถวสูงเท่าเนื้อในเสมอ
              grid-cols-[minmax(0,1fr)]: คอลัมน์เดียวของ grid ห้ามกว้างเกินกล่อง — แถบแท็บ 5 อัน
              กว้างขั้นต่ำเกินจอมือถือ ให้แถบแท็บเลื่อนแนวนอนเองแทนที่จะดันทั้งฟอร์มล้นขอบ */}
          <div className="grid min-h-0 flex-1 auto-rows-max grid-cols-[minmax(0,1fr)] gap-4 overflow-y-auto p-4">
            {/* so_code + ชื่อสินค้า อยู่นอกแท็บเสมอ — คู่นี้ (กับ product_group) คือ unique key ของแถว
                ข้อความ 400 "so_code with this product already exists" ชี้มาที่สองช่องนี้
                รหัสสินค้า (item_code) ย้ายออกมาจากแท็บสินค้า · จัดเป็นสองแถวบนตาราง 3 ช่อง:
                แถวบน เลขที่ใบ (ช่องเดียว) · แถวล่าง รหัสสินค้า + ชื่อสินค้ากินสองช่อง */}
            <div className="border-border/60 bg-card from-chart-1/6 to-chart-5/6 relative grid gap-4 overflow-hidden rounded-lg border bg-gradient-to-br via-transparent p-3 pt-4 sm:grid-cols-3">
              <span
                aria-hidden
                className="from-chart-1 via-chart-5 to-chart-2 absolute inset-x-0 top-0 h-1 bg-gradient-to-r"
              />
              {mode === "add" ? (
                <Field
                  id="so-so_code"
                  label={tcol("so_code")}
                  required
                  error={errorOf("so_code")}
                  hint={tform("soCodeHint")}
                >
                  <Input
                    id="so-so_code"
                    value={values.so_code}
                    onChange={(event) => set("so_code", event.target.value)}
                    placeholder="SO.202609-06713"
                    aria-required
                    aria-invalid={errorOf("so_code") ? true : undefined}
                    className={cn(
                      EDITABLE,
                      "font-mono",
                      errorOf("so_code") ? INVALID_FIELD : undefined
                    )}
                  />
                </Field>
              ) : (
                // edit: แสดงอย่างเดียว แก้ไม่ได้ — เลขที่ใบผูกกับใบที่ออกไปแล้วและเป็นส่วนหนึ่งของ
                // unique key ของแถว (so_code, product_name, product_group) · ค่ายังถูกส่งไปกับ
                // -action ทุกครั้งเหมือนเดิม (อยู่ใน values) ไม่ได้หายไปเพราะช่องอ่านอย่างเดียว
                // คำอธิบายใต้ช่อง ("เลขที่ใบออกไปแล้ว…") ซ่อนไว้ — เปิดกลับ: ใส่ hint={tform("soCodeReadonlyHint")}
                <Field id="so-so_code" label={tcol("so_code")}>
                  <Input
                    id="so-so_code"
                    value={values.so_code}
                    readOnly
                    aria-readonly
                    className="bg-muted/60 text-muted-foreground cursor-default font-mono focus-visible:ring-0"
                  />
                </Field>
              )}
              {/* รหัสสินค้า — ขึ้นแถวใหม่เสมอ (col-start-1) ช่องที่เหลือของแถวบนปล่อยว่างไว้
                  โหมดแก้ไขอ่านอย่างเดียว (ค่ายังถูกส่งไปกับ -action ตามเดิม) · โหมดเพิ่มยังพิมพ์ได้ */}
              <div className="sm:col-start-1">
                {mode === "add" ? text("item_code") : readonlyText("item_code")}
              </div>
              {/* ชื่อสินค้ายาวมาก กินสองช่องที่เหลือของแถว
                  โหมดแก้ไข: อ่านอย่างเดียวเหมือน so_code — เป็นอีกส่วนของ unique key
                  (so_code, product_name, product_group) ของแถว · ค่ายังถูกส่งไปกับ -action ตามเดิม */}
              <div className="sm:col-span-2">
                {mode === "add" ? (
                  text("product_name")
                ) : (
                  <Field
                    id="so-product_name"
                    label={tcol("product_name")}
                    // คำอธิบายใต้ช่อง ("ชื่อสินค้าผูกกับรายการ…") ซ่อนไว้ — เปิดกลับด้วยการเอา comment ออก
                    // hint={tform("productNameReadonlyHint")}
                  >
                    <Input
                      id="so-product_name"
                      value={values.product_name}
                      readOnly
                      aria-readonly
                      className="bg-muted/60 text-muted-foreground cursor-default focus-visible:ring-0"
                    />
                  </Field>
                )}
              </div>
            </div>

            {/* แท็บกับเนื้อในต่อกันเป็นกรอบเดียว — แถบแท็บเป็นหัวกรอบ เนื้อในเป็นตัวกรอบ */}
            <Tabs
              value={tab}
              onValueChange={(next) => setTab(String(next))}
              className="gap-0"
            >
              <TabsList className="border-border bg-muted/70 w-full justify-start overflow-x-auto rounded-b-none border p-1 group-data-horizontal/tabs:h-10">
                <TabsTrigger value="order" className={cn(TAB_TRIGGER, ACCENTS.blue.tab)}>
                  <ReceiptText className={ACCENTS.blue.icon} />
                  {tform("sectionOrder")}
                </TabsTrigger>
                <TabsTrigger value="customer" className={cn(TAB_TRIGGER, ACCENTS.aqua.tab)}>
                  <UserRound className={ACCENTS.aqua.icon} />
                  {tform("sectionCustomer")}
                </TabsTrigger>
                <TabsTrigger value="product" className={cn(TAB_TRIGGER, ACCENTS.yellow.tab)}>
                  <Package className={ACCENTS.yellow.icon} />
                  {tform("sectionProduct")}
                </TabsTrigger>
                <TabsTrigger value="payment" className={cn(TAB_TRIGGER, ACCENTS.orange.tab)}>
                  <Wallet className={ACCENTS.orange.icon} />
                  {tform("sectionPayment")}
                </TabsTrigger>
                <TabsTrigger value="shipping" className={cn(TAB_TRIGGER, ACCENTS.magenta.tab)}>
                  <Truck className={ACCENTS.magenta.icon} />
                  {tform("sectionShipping")}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="order" className={cn(TAB_PANEL, ACCENTS.blue.panel)}>
                <div className="grid gap-4 sm:grid-cols-3">
                  {/* สถานะออเดอร์: ทะเบียน status_po อย่างเดียว — ตั้งแต่ 24/09/2026 ทะเบียนเก็บค่าไทย
                      ชุดเดียวกับที่ sync เขียน ไม่ต้องต่อ constant แล้ว (ดูหมายเหตุใน model.ts) */}
                  {select("status", byName(options.statuses))}
                  {/* วันที่สร้าง / วันที่สั่งซื้อ — ซ่อนไว้ทั้งคู่ (ค่ายังอยู่ใน values และถูกส่งไปกับ
                      -action เหมือนเดิม ไม่ได้หายไป) · เปิดกลับได้ด้วยการเอา comment ออก
                      ตอนเปิด po_date กลับ ให้เอา comment ของ readonlyText ข้างบนออกด้วย
                      (โหมดแก้ไขเคยล็อกไว้อ่านอย่างเดียว เพราะงาน sync เป็นเจ้าของค่า) */}
                  {/* {text("create_date")} */}
                  {/* {mode === "add" ? text("po_date") : readonlyText("po_date")} */}
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  {/* พนักงานขาย / เบอร์รับสาย — โหมดแก้ไขอ่านอย่างเดียว (งาน sync เป็นเจ้าของค่า)
                      โหมดเพิ่มยังพิมพ์ได้ ไม่งั้นเป็นช่องเทาว่างที่ไม่มีทางกรอกได้เลย */}
                  {mode === "add" ? text("sell_by") : readonlyText("sell_by")}
                  {mode === "add" ? text("did") : readonlyText("did")}
                  {/* ช่องทางออกอากาศ — โหมดแก้ไขอ่านอย่างเดียว (งาน sync เป็นเจ้าของค่า)
                      โชว์เป็นกล่องหน้าตาเหมือนช่องกรอกแต่เป็น div: มีทั้งโลโก้และชื่อ
                      (ช่องนี้เป็น select ใช้ <Input readOnly> แทนไม่ได้ จะไม่มีที่วางโลโก้)
                      โหมดเพิ่มยังเลือกได้จาก /broadcast-get-option และเขียนทั้ง channel + channel_name */}
                  {mode === "add" ? (
                    select("channel", channelOptions, pickChannel)
                  ) : (
                    <Field
                      id="so-channel"
                      label={tcol("channel")}
                      // คำอธิบายใต้ช่อง ("ค่านี้มาจากงาน sync รายวัน…") ปิดไว้ก่อน
                      // เปิดกลับได้ด้วยการเอา comment ออก — คำแปลยังอยู่ที่ so.form.syncReadonlyHint
                      // hint={tform("syncReadonlyHint")}
                      // กล่องนี้เป็น div ไม่ใช่ input — ป้ายจึงไม่ผูก htmlFor (ผูกแล้วคลิกป้ายไม่ได้อะไร)
                      select
                    >
                      <div
                        id="so-channel"
                        className="border-input bg-muted/60 text-muted-foreground flex h-8 w-full items-center gap-1.5 rounded-lg border px-2.5 text-sm dark:bg-input/30"
                      >
                        <BroadcastLogo
                          src={channelLogo}
                          alt={values.channel}
                          className="size-5"
                        />
                        <span className="truncate">{values.channel}</span>
                      </div>
                    </Field>
                  )}
                </div>
                <Field id="so-remark" label={tcol("remark")}>
                  <Textarea
                    id="so-remark"
                    rows={3}
                    value={values.remark}
                    placeholder="..."
                    onChange={(event) => set("remark", event.target.value)}
                    className={EDITABLE}
                  />
                </Field>
              </TabsContent>

              {/* แท็บลูกค้า — โหมดแก้ไขอ่านอย่างเดียวทั้งแท็บไว้ก่อน (customerLocked) · โหมดเพิ่มยังกรอกได้
                  ค่าทุกช่องยังอยู่ใน values และถูกส่งไปกับ -action เหมือนเดิม · ปลดล็อก: ให้ customerLocked เป็น false */}
              <TabsContent value="customer" className={cn(TAB_PANEL, ACCENTS.aqua.panel)}>
                <div className="grid gap-4 sm:grid-cols-3">
                  {/* ชื่อผู้สั่งยาวกว่าเบอร์ กินสองช่องของแถว
                      พิมพ์เองได้ หรือเลือกจากทะเบียนลูกค้าที่ค้นขึ้นมาระหว่างพิมพ์ — เลือกแล้วเบอร์โทร
                      (และรหัสลูกค้าที่ซ่อนอยู่) เปลี่ยนตาม · ช่องนี้เป็น input จริง ป้ายจึงผูก htmlFor ได้ */}
                  <div className="sm:col-span-2">
                    {customerLocked ? (
                      readonlyText("name")
                    ) : (
                      <Field id="so-name" label={tcol("name")}>
                        <CustomerSelect
                          id="so-name"
                          placeholder={tform("customerSearch")}
                          value={values.name}
                          onType={typeCustomer}
                          onPick={pickCustomer}
                        />
                      </Field>
                    )}
                  </div>
                  {customerText("tel")}
                </div>
                {/* ซ่อนรหัสลูกค้า — ค่ายังอยู่ใน values และยังส่งไปกับ -action ตามเดิม (ไม่งั้นคอลัมน์จะถูกล้างเป็น NULL) */}
                {/* <div className="grid gap-4 sm:grid-cols-3">
                  {/* ลูกค้าในทะเบียนมี ~99,000 ราย ไม่มีเส้น -get-option ให้ทำ dropdown จึงกรอกเลขเอง
                      (ว่างหรือ 0 = ไม่เชื่อมโยง · เลขที่ไม่มีจริง API ตอบ 400 "customer_id not found") *\/}
                  {num("customer_id", { integer: true, hint: tform("customerIdHint") })}
                </div> */}
                <Field id="so-address" label={tcol("address")}>
                  <Textarea
                    id="so-address"
                    rows={2}
                    value={values.address}
                    placeholder={customerLocked ? undefined : "..."}
                    readOnly={customerLocked}
                    aria-readonly={customerLocked || undefined}
                    // ล็อกแล้วไม่ผูก onChange เลย — readOnly กันแค่การพิมพ์ ไม่ได้กันโค้ดที่ยิง input event
                    onChange={
                      customerLocked
                        ? undefined
                        : (event) => set("address", event.target.value)
                    }
                    className={customerLocked ? READONLY : EDITABLE}
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  {customerText("subdistrict")}
                  {customerText("district")}
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="sm:col-span-2">{customerText("province")}</div>
                  {customerText("zipcode")}
                </div>
              </TabsContent>

              {/* แท็บสินค้า — โหมดแก้ไขอ่านอย่างเดียวทั้งแท็บไว้ก่อน (productLocked) · โหมดเพิ่มยังกรอกได้
                  ค่าทุกช่องยังอยู่ใน values และถูกส่งไปกับ -action เหมือนเดิม · ปลดล็อก: ให้ productLocked เป็น false */}
              <TabsContent value="product" className={cn(TAB_PANEL, ACCENTS.yellow.panel)}>
                {/* ผู้ขาย — แถวบนสุด เต็มความกว้างแถวเดียว (ชื่อบริษัทยาว) */}
                {productLocked
                  ? readonlyText("vendor_name", undefined, vendorLabel)
                  : select("vendor_name", vendorOptions)}
                <div className="grid gap-4 sm:grid-cols-3">
                  {/* รหัสสินค้าย้ายไปอยู่แถวบนสุดคู่กับชื่อสินค้าแล้ว (นอกแท็บ) */}
                  {productText("product_group")}
                  {productText("barcode")}
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  {productLocked
                    ? readonlyText("product_type_name")
                    : select("product_type_name", byName(options.productTypes))}
                  {productText("supplier_name")}
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  {productLocked ? readonlyText("qty", NUMERIC) : num("qty")}
                  {productLocked
                    ? readonlyText("price_per_unit", NUMERIC)
                    : num("price_per_unit")}
                </div>
              </TabsContent>

              {/* แท็บการชำระเงิน — โหมดแก้ไขอ่านอย่างเดียวทั้งแท็บไว้ก่อน (paymentLocked) · โหมดเพิ่มยังกรอกได้
                  select สองตัวกลายเป็นกล่องข้อความอ่านอย่างเดียว (ไม่มีรูปในตัวเลือก ใช้ <Input readOnly> ได้)
                  ค่าทุกช่องยังอยู่ใน values และถูกส่งไปกับ -action เหมือนเดิม · ปลดล็อก: ให้ paymentLocked เป็น false */}
              <TabsContent value="payment" className={cn(TAB_PANEL, ACCENTS.orange.panel)}>
                <div className="grid gap-4 sm:grid-cols-3">
                  {/* วิธีชำระ: ทะเบียน payment_type + ค่าที่งาน sync เขียนจริง */}
                  {paymentLocked
                    ? readonlyText("pay_by")
                    : select(
                        "pay_by",
                        merge(fromValues(SO_PAY_BYS), byName(options.payTypes))
                      )}
                  {/* สถานะชำระ: ทะเบียน status_payment + ค่าที่งาน sync เขียนจริง */}
                  {paymentLocked
                    ? readonlyText("is_payment")
                    : select(
                        "is_payment",
                        merge(fromValues(SO_IS_PAYMENTS), byName(options.paymentStatuses))
                      )}
                  {/* วันที่ชำระเงิน — ซ่อนไว้ (ค่ายังอยู่ใน values และถูกส่งไปกับ -action เหมือนเดิม
                      ไม่ได้กลายเป็น NULL) · เปิดกลับได้ด้วยการเอา comment ออก */}
                  {/* {text("payment_date")} */}
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  {paymentNum("amount")}
                  {paymentNum("pay_amount")}
                  {paymentNum("discount")}
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  {paymentNum("shipping")}
                  {paymentLocked ? readonlyText("cash_in") : text("cash_in")}
                </div>
              </TabsContent>

              {/* แท็บการจัดส่ง — โหมดแก้ไขอ่านอย่างเดียวไว้ก่อน (shippingLocked) ยกเว้นเลขพัสดุที่ยังกรอกได้
                  โหมดเพิ่มยังกรอกได้ทุกช่อง · ค่าทุกช่องยังถูกส่งไปกับ -action เหมือนเดิม (รวม shipment_type_id)
                  ปลดล็อก: ให้ shippingLocked เป็น false */}
              <TabsContent value="shipping" className={cn(TAB_PANEL, ACCENTS.magenta.panel)}>
                <div className="grid gap-4 sm:grid-cols-3">
                  {/* ประเภทการจัดส่ง: เลือกแล้วเขียน shipment_type_id ให้ด้วย (ดู pickShipmentType) */}
                  {shippingLocked
                    ? readonlyText("shipment_type")
                    : select(
                        "shipment_type",
                        byName(options.shipmentTypes),
                        pickShipmentType
                      )}
                  {shippingLocked ? readonlyText("shipping_by") : text("shipping_by")}
                  {/* เลขพัสดุ — ช่องเดียวในแท็บที่แก้ได้เสมอ */}
                  {text("shipping_code")}
                </div>
                {/* วันที่จัดส่ง / วันที่รับสินค้า / วันที่นัดหมาย — ซ่อนไว้ทั้งแถว (ค่ายังอยู่ใน values
                    และถูกส่งไปกับ -action เหมือนเดิม ไม่ได้กลายเป็น NULL) · เปิดกลับได้ด้วยการเอา comment ออก */}
                {/* <div className="grid gap-4 sm:grid-cols-3">
                  {text("shipping_date")}
                  {text("receive_date")}
                  {text("appointment_date")}
                </div> */}
              </TabsContent>
            </Tabs>

            {/* คอลัมน์ของงาน sync — อ่านอย่างเดียว มีแต่ตอนแก้ไข วางใต้แท็บ เห็นได้ตลอด */}
            {/* ไฟล์ต้นทาง / ซิงก์เมื่อ / แก้ไขล่าสุด — ซ่อนไว้ก่อน (แค่แสดงผล ไม่ได้อยู่ใน values ไม่มีผลกับการบันทึก)
                เปิดกลับ: เอา comment ออก (และเอา comment ของ SyncInfo / formatStamp ท้ายไฟล์ออกด้วยถ้า eslint บ่น) */}
            {/* {mode === "edit" && so ? <SyncInfo so={so} /> : null} */}
          </div>

          {/* ผลการบันทึก — อยู่นอกกล่องเลื่อน ติดเหนือปุ่มเสมอ (ในกล่องเลื่อนแล้วมักอยู่ใต้ขอบล่าง
              ที่มองเห็น แล้วกล่องปิดเองใน 1.4 วินาที ผู้ใช้จึงไม่เคยเห็น) */}
          {result ? (
            <div className="border-border/60 border-t px-4 pt-3">
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
            </div>
          ) : null}

          {/* แถบท้ายไล่เฉดชุดเดียวกับแถบแบ่งหน้าในตาราง — อยู่นอกกรอบที่เลื่อน ปุ่มจึงติดอยู่เสมอ
              mx-0 mb-0: DialogFooter ติด -mx-4 -mb-4 มาเพื่อชดเชย p-4 ของ DialogContent
              แต่กล่องนี้ใช้ p-0 แถบท้ายจึงล้นออกข้างละ 16px และปุ่มขวาสุดโดนตัดชิดขอบ */}
          <DialogFooter className="from-primary/12 border-border/60 mx-0 mb-0 border-t bg-transparent bg-gradient-to-r via-transparent to-transparent p-4">
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

/** คอลัมน์ที่งาน sync เป็นคนเขียน — อ่านอย่างเดียว ช่องเรียงกันเฉย ๆ มีแถบสีซ้ายของตัวเอง
 *  แถวที่เพิ่มจากหน้านี้ไม่มี source_file (โชว์ขีดจาง ๆ ให้รู้ว่าไม่ได้มาจากไฟล์) */
// ซ่อนไว้ก่อน (ตามที่สั่ง) — เปิดกลับ: เอา comment ของฟังก์ชันนี้ + formatStamp + จุดที่เรียกในฟอร์มออก
// function SyncInfo({ so }: { so: So }) {
//   const tcol = useTranslations("so.columns")
//
//   const info: {
//     key: "source_file" | "synced_at" | "updated_at"
//     value: string | null
//     accent: Accent
//   }[] = [
//     // ชื่อไฟล์โชว์ตามที่เก็บ ส่วนสองตัวที่เป็นเวลาแปลงรูปให้อ่านง่าย (ดู formatStamp)
//     { key: "source_file", value: so.source_file, accent: "blue" },
//     { key: "synced_at", value: formatStamp(so.synced_at), accent: "aqua" },
//     { key: "updated_at", value: formatStamp(so.updated_at), accent: "magenta" },
//   ]
//
//   return (
//     <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
//       {info.map((item) => (
//         <div
//           key={item.key}
//           className={cn(
//             "min-w-0 rounded-md border-l-4 px-2.5 py-1.5",
//             ACCENTS[item.accent].tile
//           )}
//         >
//           <div className="text-muted-foreground truncate text-xs">
//             {tcol(item.key)}
//           </div>
//           <div className="truncate text-sm font-medium" title={item.value ?? undefined}>
//             {item.value ?? (
//               <span className="text-muted-foreground/60 font-normal">—</span>
//             )}
//           </div>
//         </div>
//       ))}
//     </div>
//   )
// }

/** ป้ายกำกับ + ช่องกรอก วางแบบเดียวกันทุกช่อง */
function Field({
  id,
  label,
  required,
  select,
  hint,
  error,
  children,
}: {
  id: string
  label: string
  /** ใส่ดอกจันให้รู้ตั้งแต่ก่อนกดบันทึกว่าช่องนี้ต้องกรอก */
  required?: boolean
  /**
   * ช่องนี้เป็น select — ป้ายไม่ผูก htmlFor กับตัวช่อง
   * เพราะตัวช่องของ select เป็นปุ่ม คลิกป้ายเท่ากับคลิกปุ่ม รายการจะเด้งเปิดทั้งที่ไม่ได้คลิกในช่อง
   * (ชื่อช่องสำหรับ screen reader มาจาก aria-label ของปุ่มแทน)
   */
  select?: boolean
  /** คำอธิบายสีจางใต้ช่อง — ถูกแทนด้วย error เมื่อมี */
  hint?: string
  /** ข้อความผิดพลาดใต้ช่อง — ขึ้นตอนกดบันทึกแล้วยังไม่ได้กรอก */
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      {/* w-fit: Label เป็น flex กว้างเต็มคอลัมน์ — ที่ว่างข้างขวาของชื่อช่องจะกลายเป็นพื้นที่คลิกของช่องไปด้วย */}
      <Label
        htmlFor={select ? undefined : id}
        className="text-muted-foreground w-fit text-xs"
      >
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
