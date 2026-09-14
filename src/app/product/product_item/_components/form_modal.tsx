"use client"

import * as React from "react"
import { CircleCheck, LoaderCircle, TriangleAlert } from "lucide-react"
import { useTranslations } from "next-intl"

import {
  getProductItemFormOptions,
  saveProductItem,
  uploadProductItemImage,
} from "@/app/product/product_item/_components/api"
import {
  ITEM_ACTIVE,
  ITEM_FIELDS,
  ITEM_INACTIVE,
  ITEM_MAX_LEN,
  ITEM_NO,
  ITEM_YES,
  parseNameList,
  serializeNameList,
  type NamedOption,
  type ProductItem,
  type ProductItemFormMode,
  type ProductItemFormOptions,
  type ProductItemFormValues,
} from "@/app/product/product_item/_components/model"
import { ImagePicker } from "@/app/product/product_item/_components/image_picker"
import { MultiSelectOption } from "@/app/product/product_item/_components/multiselectoption"
import {
  SelectOption,
  type SelectOptionItem,
} from "@/app/product/product_item/_components/selectoption"
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

/**
 * form_modal.tsx — ฟอร์มเพิ่ม/แก้ไขสินค้าในกล่องซ้อน
 *
 * ปุ่มที่เปิดฟอร์มเป็นคนบอกโหมดมาเอง: "add" เปิดฟอร์มเปล่า "edit" เปิดพร้อมค่าของแถวนั้น
 * กดบันทึกแล้วยิง POST /api/web/product-item-action เอง เสร็จแล้วบอกพ่อผ่าน onSaved ให้โหลดตารางใหม่
 *
 * **ฟอร์มนี้ถือค่าครบทั้ง 43 คอลัมน์เสมอ แม้จะไม่ได้เอาขึ้นหน้าจอทุกตัว**
 * เพราะเส้น -action เขียนทับทั้งแถว ไม่ได้แก้เฉพาะที่ส่งไป — ตกไปตัวเดียวของเดิมหายทันที
 * ตัวที่ไม่ได้แสดงถูกอ่านเข้ามาใน values ตาม ITEM_FIELDS แล้วส่งกลับไปเหมือนเดิม
 * (ตอนนี้ขึ้นหน้าจอครบทุกคอลัมน์แล้ว — เพิ่มช่องใหม่ได้โดยใส่คีย์ใน columns แล้วเรียก text() / num() / select())
 *
 * **ช่อง select** ตัวเลือกมาจากเส้น -get-option ของแต่ละทะเบียน ดึงใหม่ทุกครั้งที่เปิดฟอร์ม
 * เก็บลงคอลัมน์ต่างกัน: ประเภทสินค้า/การจัดส่ง/ช่องทางขาย/เอกสารสำคัญ เก็บ "ชื่อ"
 * (ช่องทางขายกับเอกสารสำคัญเลือกได้หลายตัว ชื่อต่อกันคั่นด้วย , — ดู parseNameList),
 * สถานะ KM/MOU/KM Protocall/หนังสือยินยอมฯ เก็บ "id", ผู้ขายเก็บ code ลง vendo_code + ชื่อลง supplier_name
 * ค่าเดิมของแถวที่ไม่อยู่ในตัวเลือก (ทะเบียนปิดไปแล้ว หรือข้อมูลเก่าที่พิมพ์เอง) ถูกเติมเข้าไปให้เห็น
 * ไม่งั้นช่องจะดูว่างทั้งที่มีค่า และกดเลือกอย่างอื่นแล้วค่าเก่าหายโดยไม่รู้ตัว
 *
 * **การจัดหน้า** ช่องเยอะเกินกว่าจะไล่เป็นแถวยาว ๆ ได้ (เคยสูง 935px ต้องเลื่อนทั้งกล่อง
 * แล้วปุ่มบันทึกหลุดไปอยู่ล่างสุด) จึงแบ่งเป็นแท็บ และตรึงสองส่วนไว้เสมอ:
 * แถบรหัส+ชื่อด้านบน (สองช่องที่บังคับกรอก จะได้เห็นกรอบแดงไม่ว่าอยู่แท็บไหน) กับปุ่มด้านล่าง
 * ช่องบังคับกรอกทั้งหมดอยู่ใน REQUIRED_FIELDS — ถ้าช่องที่ยังว่างอยู่ในแท็บ กดบันทึกแล้วพาไปแท็บนั้น
 *
 * **รหัสสินค้า** add: เลือก prefix จาก /product-code-get-option อย่างเดียว ตอนบันทึกส่ง item_code_prefix ไป
 * API ออกเลขจริงให้ใน transaction (กันสองคนได้เลขซ้ำ) — ฟอร์มไม่รู้รหัสจนกว่าจะบันทึกเสร็จ
 * edit: แสดงรหัสเดิมแบบอ่านอย่างเดียว — รหัสผูกกับ SO ที่ขายไปแล้ว ห้ามเปลี่ยนจากฟอร์มนี้
 * รูป/ลิงก์/สถานะ/หมายเหตุ วางไว้ใต้กรอบแท็บ นอกแท็บ เห็นได้ตลอด
 */
// คลาสขอบแดง — ต้องสลับคลาสเอง ไม่ใช้ variant aria-invalid: เพราะ Tailwind v4 ห่อ variant
// ด้วย :where() ความจำเพาะจึงเท่ากับ border-input แล้วแพ้ลำดับใน stylesheet
const INVALID_FIELD =
  "border-destructive ring-3 ring-destructive/20 dark:border-destructive/50 dark:ring-destructive/40"

/** ปุ่มแท็บที่เลือกอยู่ — มีขอบ + ตัวอักษรสีหลัก ให้แยกออกจากแท็บอื่นได้ชัด */
const TAB_TRIGGER =
  "data-active:border-border data-active:text-primary data-active:font-semibold data-active:shadow-sm"

/** เนื้อในแท็บ — กรอบต่อจากแถบแท็บ (ไม่มีขอบบนซ้ำ) สูงขั้นต่ำเท่ากันทุกแท็บ กล่องจะได้ไม่กระตุกตอนสลับ */
const TAB_PANEL =
  "border-border grid min-h-[230px] content-start gap-4 rounded-b-lg border border-t-0 p-4"

/**
 * ช่องบังคับกรอก → แท็บที่ช่องนั้นอยู่ (null = อยู่นอกแท็บ เห็นได้ตลอด)
 * ตรวจเองตอนกดบันทึก ไม่ใช้ required ของเบราว์เซอร์ (ช่องในแท็บที่ปิดอยู่ไม่ได้อยู่ใน DOM ด้วยซ้ำ)
 * ฝั่ง API บังคับจริงแค่ item_code / product_name — ที่เหลือบังคับที่ฟอร์มนี้เท่านั้น
 * ย้ายช่องไปแท็บอื่นเมื่อไหร่ ต้องแก้แท็บตรงนี้ตาม ไม่งั้นกดบันทึกแล้วพาไปผิดแท็บ
 */
const REQUIRED_FIELDS = {
  item_code: null,
  product_name: null,
  md_name: null,
  unit: "main",
  qty: "main",
  product_type_name: "main",
  price: "price",
  cogs: "price",
  avg_deelivery_cost: "supply",
} as const satisfies Partial<Record<keyof ProductItemFormValues, string | null>>

type RequiredField = keyof typeof REQUIRED_FIELDS

const isRequired = (field: string): field is RequiredField =>
  field in REQUIRED_FIELDS

/** ลำดับแท็บ — ยังว่างหลายแท็บ พาไปแท็บแรกสุดที่มีช่องว่าง */
const TAB_ORDER = ["main", "price", "supply", "status"]

/**
 * กรองให้เหลือแค่ตัวเลข — ใช้กับทุกช่องตัวเลข ทั้งตอนพิมพ์และตอนวาง
 * decimal: ยอมจุดทศนิยมตัวแรกตัวเดียว ทศนิยมไม่เกิน 2 หลัก (คอลัมน์ numeric(…,2))
 * ไม่ decimal (คอลัมน์ integer): ตัวเลขล้วน — ส่ง "1.5" ไป API ตอบ 400 "must be an integer"
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

/** ค่าว่างของทุกคอลัมน์ — สร้างจาก ITEM_FIELDS จะได้ไม่มีทางตกหล่น */
const emptyValues: ProductItemFormValues = Object.fromEntries(
  ITEM_FIELDS.map((field) => [field, ""])
) as ProductItemFormValues

/** คอลัมน์ที่เอาขึ้นหน้าจอเป็นช่องกรอก — ต้องมีคีย์ใน productitems.columns ทุกตัว */
type ShownField =
  | "product_group"
  | "barcode"
  | "unit"
  | "item_group"
  | "l_group"
  | "m_group"
  | "price"
  | "cost"
  | "gp_percentage"
  | "gp_amout"
  | "cogs"
  | "delivery_fee"
  | "weight_kg"
  | "md_name"
  | "link_web"
  | "qty"
  | "cm_percentage"
  | "cm_bath"
  | "check1"
  | "check2"
  | "dimension_cm"
  | "avg_box_w_mm"
  | "avg_box_h_mm"
  | "avg_box_d_mm"
  | "avg_deelivery_cost"

/** คอลัมน์ที่เป็น select เลือกได้ตัวเดียว — ต้องมีคีย์ใน productitems.columns ทุกตัว */
type SelectField =
  | "product_type_name"
  | "shipment_type"
  | "status_km"
  | "status_tv_program_footage"
  | "status_mou"
  | "status_km_protocall"
  | "status_line_my_shop"
  | "status_deduct_stock"
  | "status_allow_oversell"

/** ยังไม่ได้ตัวเลือกจาก API — ช่องโชว์แค่ค่าเดิมของแถวไปก่อน */
const NO_OPTIONS: ProductItemFormOptions = {
  productTypes: [],
  shipmentTypes: [],
  vendors: [],
  channelTypes: [],
  kms: [],
  importantDocs: [],
  tvProgramFootages: [],
  mous: [],
  kmProtocalls: [],
  lineMyShops: [],
  productCodes: [],
}

/** ทะเบียนที่ผูกกันด้วยชื่อ — value คือชื่อที่จะเขียนลงคอลัมน์ข้อความ */
const byName = (list: NamedOption[]): SelectOptionItem[] =>
  list.map((option) => ({ value: option.name, label: option.name }))

/** ทะเบียนที่ผูกกันด้วย id — value เป็นสตริงของเลข ให้ตรงกับที่ toValues() แปลงคอลัมน์ integer มา */
const byId = (list: NamedOption[]): SelectOptionItem[] =>
  list.map((option) => ({ value: String(option.id), label: option.name }))

/** เติมค่าที่แถวถืออยู่แต่ไม่มีในตัวเลือก ต่อท้ายรายการ — ป้ายเป็นค่าดิบ (ชื่อเดิม หรือเลข id) */
const withCurrent = (
  options: SelectOptionItem[],
  current: string[]
): SelectOptionItem[] => [
  ...options,
  ...current
    .filter((value) => value && !options.some((option) => option.value === value))
    .map((value) => ({ value, label: value })),
]

const toValues = (item: ProductItem | undefined): ProductItemFormValues => {
  if (!item) return { ...emptyValues, active_status: ITEM_ACTIVE }
  // ทุกคอลัมน์กลายเป็นสตริงเพื่อผูกกับช่องกรอก — null/undefined เป็นค่าว่าง
  // (numeric ส่งมาเป็นสตริงอยู่แล้ว ส่วน integer เป็นตัวเลข ต้อง String() ให้)
  return Object.fromEntries(
    ITEM_FIELDS.map((field) => {
      const raw = item[field as keyof ProductItem]
      return [field, raw === null || raw === undefined ? "" : String(raw)]
    })
  ) as ProductItemFormValues
}

export function FormModal({
  open,
  onOpenChange,
  mode,
  item,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** ปุ่มไหนเป็นคนเปิด — "add" หรือ "edit" */
  mode: ProductItemFormMode
  /** แถวที่กำลังแก้ (โหมด edit เท่านั้น) */
  item?: ProductItem
  /** บันทึกสำเร็จแล้ว — ตารางเอาไปโหลดข้อมูลใหม่ */
  onSaved?: () => void
}) {
  const t = useTranslations("common")
  const tr = useTranslations("productitems")
  const tform = useTranslations("productitems.form")
  const tcol = useTranslations("productitems.columns")

  const [values, setValues] = React.useState(() => toValues(item))
  const [saving, setSaving] = React.useState(false)
  /** รูปกำลังอัปโหลด — ปิดปุ่มบันทึกไว้ ไม่งั้นบันทึกไปก่อนได้ URL รูปใหม่ */
  const [uploadingImage, setUploadingImage] = React.useState(false)
  /** add: รูปที่เลือกไว้แต่ยังไม่ได้อัปโหลด — path รูปต้องมีรหัสสินค้า ซึ่งออกให้ตอนบันทึก จึงอัปโหลดหลังบันทึกแถว */
  const [pendingImage, setPendingImage] = React.useState<File | null>(null)
  /** ช่องบังคับที่ยังว่างตอนกดบันทึกครั้งล่าสุด — กรอกแล้วหลุดออกทันที (ดู set) */
  const [missing, setMissing] = React.useState<RequiredField[]>([])
  /**
   * แท็บที่เปิดอยู่ — คุมเองแทน defaultValue เพราะมีช่องบังคับกรอกอยู่ในแท็บ
   * กดบันทึกจากแท็บอื่นแล้วยังว่าง ต้องพาไปแท็บนั้นให้เห็นกรอบแดง
   */
  const [tab, setTab] = React.useState("main")
  /** add: prefix ที่เลือกจาก product_code — "" คือยังไม่ได้เลือก */
  const [codePrefix, setCodePrefix] = React.useState("")
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
  const formKey = `${mode}-${item?.id ?? "new"}-${String(open)}`
  const [lastKey, setLastKey] = React.useState(formKey)
  if (formKey !== lastKey) {
    setLastKey(formKey)
    setValues(toValues(item))
    setResult(null)
    setSaving(false)
    setMissing([])
    setTab("main")
    setCodePrefix("")
    setPendingImage(null)
  }

  /** ตัวเลือกของช่อง select ทั้งหมด — ดึงใหม่ทุกครั้งที่เปิด ทะเบียนอาจเพิ่ง/ปิดตัวเลือกไป */
  const [options, setOptions] = React.useState(NO_OPTIONS)
  React.useEffect(() => {
    if (!open) return
    let cancelled = false
    // getProductItemFormOptions ไม่มีทาง throw — เส้นไหนล้ม ช่องนั้นได้ [] ไป
    getProductItemFormOptions().then((next) => {
      if (!cancelled) setOptions(next)
    })
    return () => {
      cancelled = true
    }
  }, [open])

  const set = (key: keyof ProductItemFormValues, value: string) => {
    setValues((current) => ({ ...current, [key]: value }))
    // ช่องบังคับที่ขึ้นแดงอยู่ พอมีค่าแล้วเอากรอบแดงออกเลย ไม่ต้องรอกดบันทึกใหม่
    if (value.trim() && isRequired(key)) {
      setMissing((current) =>
        current.includes(key) ? current.filter((field) => field !== key) : current
      )
    }
  }

  /**
   * add: เลือก prefix — เก็บ prefix ไว้ส่งเป็น item_code_prefix และใส่ลง values.item_code ด้วย
   * แค่ให้ช่องบังคับ item_code ผ่าน (API เขียนทับด้วยรหัสที่ออกให้จริงตอนบันทึก)
   */
  const pickPrefix = (prefix: string | null) => {
    setCodePrefix(prefix ?? "")
    set("item_code", prefix ?? "")
  }

  /** ข้อความผิดพลาดของช่อง — มีเฉพาะช่องบังคับที่ยังว่างตอนกดบันทึก */
  const errorOf = (field: string) =>
    isRequired(field) && missing.includes(field) ? t("required") : undefined

  const statusOptions = [
    { value: ITEM_ACTIVE, label: tr("active") },
    { value: ITEM_INACTIVE, label: tr("inactive") },
  ]

  /** ใช่ / ไม่ใช่ — ของ status_deduct_stock กับ status_allow_oversell ไม่มีเส้น -get-option ให้ดึง */
  const yesNoOptions = [
    { value: ITEM_YES, label: tr("yes") },
    { value: ITEM_NO, label: tr("no") },
  ]

  /**
   * ช่องข้อความธรรมดา — ผูกกับคอลัมน์ตรง ๆ พร้อมจำกัดความยาวตามฐานข้อมูล
   * รับได้เฉพาะคอลัมน์ที่มีคำแปลใน productitems.columns (TS เช็คให้ตอน compile)
   * คอลัมน์ที่เหลือยังอยู่ใน values และถูกส่งกลับไปเหมือนเดิม แค่ไม่ได้ขึ้นหน้าจอ
   */
  const text = (field: ShownField) => {
    const error = errorOf(field)
    return (
      <Field
        id={`item-${field}`}
        label={tcol(field)}
        required={isRequired(field)}
        error={error}
      >
        <Input
          id={`item-${field}`}
          value={values[field]}
          maxLength={ITEM_MAX_LEN[field]}
          placeholder="..."
          aria-required={isRequired(field) || undefined}
          aria-invalid={error ? true : undefined}
          onChange={(event) => set(field, event.target.value)}
          className={error ? INVALID_FIELD : undefined}
        />
      </Field>
    )
  }

  /**
   * ช่องตัวเลข — พิมพ์ได้แค่ตัวเลข (ดู onlyNumber) ชิดขวาและเลขความกว้างเท่ากัน อ่านง่ายกว่าตอนเทียบหลายบรรทัด
   * integer: คอลัมน์ integer (ไม่มีทศนิยม) · บังคับกรอกหรือไม่ดูจาก REQUIRED_FIELDS เอง
   */
  const num = (
    field: ShownField,
    { integer = false }: { integer?: boolean } = {}
  ) => {
    const error = errorOf(field)
    return (
      <Field
        id={`item-${field}`}
        label={tcol(field)}
        required={isRequired(field)}
        error={error}
      >
        <Input
          id={`item-${field}`}
          value={values[field]}
          maxLength={ITEM_MAX_LEN[field]}
          inputMode={integer ? "numeric" : "decimal"}
          placeholder={integer ? "0" : "0.00"}
          aria-required={isRequired(field) || undefined}
          aria-invalid={error ? true : undefined}
          onChange={(event) =>
            set(field, onlyNumber(event.target.value, !integer))
          }
          className={`text-right font-mono tabular-nums ${error ? INVALID_FIELD : ""}`}
        />
      </Field>
    )
  }

  /** ช่อง select เลือกตัวเดียว — ล้างค่า (×) แล้วเขียนสตริงว่างกลับ API เก็บเป็น NULL */
  const select = (field: SelectField, items: SelectOptionItem[]) => {
    const error = errorOf(field)
    return (
      <Field
        id={`item-${field}`}
        label={tcol(field)}
        select
        required={isRequired(field)}
        error={error}
      >
        <SelectOption
          id={`item-${field}`}
          options={withCurrent(items, [values[field]])}
          value={values[field] || null}
          onValueChange={(next) => set(field, next ?? "")}
          placeholder="..."
          label={tcol(field)}
          invalid={Boolean(error)}
        />
      </Field>
    )
  }

  /** ผู้ขาย: ป้ายมี code นำหน้า เพราะชื่อผู้ขายซ้ำกันได้ และค้นด้วย code ก็ได้ */
  const vendorOptions: SelectOptionItem[] = options.vendors.map((vendor) => ({
    value: vendor.code,
    label: `${vendor.code} — ${vendor.name}`,
  }))
  if (
    values.vendo_code &&
    !vendorOptions.some((option) => option.value === values.vendo_code)
  ) {
    // code เดิมที่ไม่มีในทะเบียนแล้ว — โชว์คู่กับชื่อที่แถวเก็บไว้
    vendorOptions.push({
      value: values.vendo_code,
      label: values.supplier_name
        ? `${values.vendo_code} — ${values.supplier_name}`
        : values.vendo_code,
    })
  }

  /** prefix ของรหัสสินค้า — ป้ายมีชื่อต่อท้าย (P0 — Pick Up) ค้นได้ทั้ง prefix และชื่อ */
  const prefixOptions: SelectOptionItem[] = options.productCodes.map((code) => ({
    value: code.prefix,
    label: `${code.prefix} — ${code.name}`,
  }))

  /** สองช่องที่เลือกได้หลายตัว — คอลัมน์เก็บชื่อต่อกันคั่นด้วย , */
  const channelTypes = parseNameList(values.channel_type)
  const importantDocs = parseNameList(values.important_doc)

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
              // ถ้าแท็บที่เปิดอยู่มีช่องว่างอยู่แล้วก็อยู่ต่อ (ช่องนอกแท็บเห็นได้ตลอด ไม่ต้องสลับ)
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
              // ส่งไปครบทุกคอลัมน์ รวมตัวที่ไม่ได้แสดง ไม่งั้นของเดิมโดนเขียนทับเป็นค่าว่าง
              // add ส่ง prefix ไปด้วย ให้ API ออกรหัสจริงตอน insert
              const saved = await saveProductItem(
                mode,
                values,
                item?.id,
                mode === "add" ? codePrefix : undefined
              )
              // add: path รูปมีรหัสสินค้า ซึ่งเพิ่งได้จาก API — อัปโหลดตอนนี้แล้วเขียน path ลงแถวที่เพิ่งเพิ่ม
              if (mode === "add" && pendingImage) {
                try {
                  const image = await uploadProductItemImage(
                    pendingImage,
                    saved.item_code
                  )
                  // edit ด้วยค่าที่ API เพิ่งคืนมาทั้งแถว (รหัสจริง / กลุ่มสินค้า) เปลี่ยนแค่ image
                  await saveProductItem(
                    "edit",
                    { ...toValues(saved), image },
                    saved.id
                  )
                } catch (imageError) {
                  // แถวสินค้าบันทึกไปแล้ว — กดบันทึกซ้ำจะได้สินค้าซ้ำ จึงปิดกล่องแล้วบอกให้ไปใส่รูปในโหมดแก้ไข
                  const detail =
                    imageError instanceof Error && imageError.message
                      ? ` (${imageError.message})`
                      : ""
                  setResult({
                    ok: false,
                    message: `${tform("imageSaveFailed")}${detail}`,
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
          <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4">
            {/* รูปสินค้าอยู่บนสุด — เลือกไฟล์แล้วอัปโหลดทันที ฟอร์มถือแค่ URL ที่ได้กลับมา */}
            <ImagePicker
              id="item-image"
              label={tcol("image")}
              value={values.image}
              // แก้ไข: รู้รหัสแล้ว อัปโหลดทันที · เพิ่ม: ยังไม่มีรหัส ถือไฟล์ไว้อัปโหลดหลังบันทึก
              itemCode={mode === "edit" ? values.item_code : undefined}
              pendingFile={pendingImage}
              onChange={(image) => set("image", image)}
              onPendingFileChange={setPendingImage}
              onUploadingChange={setUploadingImage}
            />

            {/* สองช่องที่บังคับกรอก อยู่นอกแท็บเสมอ — เป็นตัวบอกว่ากำลังแก้สินค้าตัวไหน
                และถ้ากดบันทึกทั้งที่ยังว่าง กรอบแดงต้องเห็นได้ไม่ว่าเปิดแท็บไหนอยู่ */}
            <div className="border-border/60 bg-muted/30 grid gap-4 rounded-lg border p-3 sm:grid-cols-3">
              {mode === "add" ? (
                // add: เลือก prefix อย่างเดียว — รหัสจริงออกให้ตอนบันทึก พิมพ์รหัสเองไม่ได้
                <Field
                  id="item-item_code"
                  label={tcol("itemCode")}
                  select
                  required
                  error={errorOf("item_code")}
                  hint={tform("codeAutoHint")}
                >
                  <SelectOption
                    id="item-item_code"
                    options={prefixOptions}
                    value={codePrefix || null}
                    onValueChange={pickPrefix}
                    placeholder="..."
                    label={tcol("itemCode")}
                    invalid={Boolean(errorOf("item_code"))}
                  />
                </Field>
              ) : (
                // edit: รหัสผูกกับ SO ที่ขายไปแล้ว — แสดงอย่างเดียว แก้ไม่ได้
                <Field id="item-item_code" label={tcol("itemCode")}>
                  <Input
                    id="item-item_code"
                    value={values.item_code}
                    readOnly
                    aria-readonly
                    className="bg-muted/60 text-muted-foreground cursor-default font-mono focus-visible:ring-0"
                  />
                </Field>
              )}
              {/* ชื่อสินค้ายาวมาก กินสองช่องที่เหลือของแถว */}
              <div className="sm:col-span-2">
                <Field
                  id="item-product_name"
                  label={tcol("productName")}
                  required
                  error={errorOf("product_name")}
                >
                  <Input
                    id="item-product_name"
                    value={values.product_name}
                    onChange={(event) => set("product_name", event.target.value)}
                    placeholder="..."
                    aria-required
                    aria-invalid={errorOf("product_name") ? true : undefined}
                    className={errorOf("product_name") ? INVALID_FIELD : undefined}
                  />
                </Field>
              </div>
            </div>

            {/* แท็บกับเนื้อในต่อกันเป็นกรอบเดียว — แถบแท็บเป็นหัวกรอบ เนื้อในเป็นตัวกรอบ */}
            <Tabs
              value={tab}
              onValueChange={(next) => setTab(String(next))}
              className="gap-0"
            >
              <TabsList className="border-border bg-muted/70 w-full rounded-b-none border p-1 group-data-horizontal/tabs:h-10">
                <TabsTrigger value="main" className={TAB_TRIGGER}>
                  {tform("sectionMain")}
                </TabsTrigger>
                <TabsTrigger value="price" className={TAB_TRIGGER}>
                  {tform("sectionPrice")}
                </TabsTrigger>
                <TabsTrigger value="supply" className={TAB_TRIGGER}>
                  {tform("sectionSupply")}
                </TabsTrigger>
                <TabsTrigger value="status" className={TAB_TRIGGER}>
                  {tform("sectionStatus")}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="main" className={TAB_PANEL}>
                <div className="grid gap-4 sm:grid-cols-3">
                  {text("product_group")}
                  {text("barcode")}
                  {text("unit")}
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  {num("qty")}
                </div>
                <Divider label={tform("sectionGroup")} />
                <div className="grid gap-4 sm:grid-cols-2">
                  {select("product_type_name", byName(options.productTypes))}
                  {text("item_group")}
                  {text("l_group")}
                  {text("m_group")}
                </div>
              </TabsContent>

              <TabsContent value="price" className={TAB_PANEL}>
                <div className="grid gap-4 sm:grid-cols-3">
                  {num("price")}
                  {num("cost")}
                  {num("cogs")}
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  {num("gp_percentage")}
                  {num("gp_amout")}
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  {num("cm_percentage")}
                  {num("cm_bath")}
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  {num("check1")}
                  {num("check2")}
                </div>
              </TabsContent>

              <TabsContent value="supply" className={TAB_PANEL}>
                <div className="grid gap-4 sm:grid-cols-3">
                  {/* ป้าย "code — ชื่อ" ยาว กินสองช่อง */}
                  <div className="sm:col-span-2">
                    <Field id="item-vendor" label={tcol("supplier_name")} select>
                      <SelectOption
                        id="item-vendor"
                        options={vendorOptions}
                        value={values.vendo_code || null}
                        onValueChange={(next) => {
                          const vendor = options.vendors.find(
                            (option) => option.code === next
                          )
                          // เขียนคู่กันเสมอ: code ลง vendo_code ชื่อลง supplier_name · ล้างก็ล้างทั้งคู่
                          setValues((current) => ({
                            ...current,
                            vendo_code: next ?? "",
                            supplier_name: next
                              ? (vendor?.name ?? current.supplier_name)
                              : "",
                          }))
                        }}
                        // แถวเก่ามีแค่ชื่อผู้ขาย ไม่มี code — โชว์ชื่อนั้นจาง ๆ แทน "..."
                        placeholder={values.supplier_name || "..."}
                        label={tcol("supplier_name")}
                      />
                    </Field>
                  </div>
                  {select("shipment_type", byName(options.shipmentTypes))}
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  {num("delivery_fee", { integer: true })}
                  {num("weight_kg")}
                  {num("dimension_cm", { integer: true })}
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  {num("avg_box_w_mm")}
                  {num("avg_box_h_mm")}
                  {num("avg_box_d_mm")}
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  {num("avg_deelivery_cost")}
                </div>
              </TabsContent>

              <TabsContent value="status" className={TAB_PANEL}>
                <div className="grid gap-4 sm:grid-cols-3">
                  {select("status_km", byId(options.kms))}
                  {select("status_mou", byId(options.mous))}
                  {select("status_km_protocall", byId(options.kmProtocalls))}
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  {select("status_line_my_shop", byName(options.lineMyShops))}
                  {/* ชื่อช่องยาว กินสองช่อง */}
                  <div className="sm:col-span-2">
                    {select(
                      "status_tv_program_footage",
                      byId(options.tvProgramFootages)
                    )}
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  {select("status_deduct_stock", yesNoOptions)}
                  {select("status_allow_oversell", yesNoOptions)}
                </div>
                <Field
                  id="item-channel_type"
                  label={tcol("channel_type")}
                  select
                  hint={tform("multiSelectHint")}
                >
                  <MultiSelectOption
                    id="item-channel_type"
                    options={withCurrent(
                      byName(options.channelTypes),
                      channelTypes
                    )}
                    value={channelTypes}
                    onValueChange={(next) =>
                      set("channel_type", serializeNameList(next))
                    }
                    placeholder="..."
                    label={tcol("channel_type")}
                  />
                </Field>
                <Field
                  id="item-important_doc"
                  label={tcol("important_doc")}
                  select
                  hint={tform("multiSelectHint")}
                >
                  <MultiSelectOption
                    id="item-important_doc"
                    options={withCurrent(
                      byName(options.importantDocs),
                      importantDocs
                    )}
                    value={importantDocs}
                    onValueChange={(next) =>
                      set("important_doc", serializeNameList(next))
                    }
                    placeholder="..."
                    label={tcol("important_doc")}
                  />
                </Field>
              </TabsContent>
            </Tabs>

            {/* เดิมอยู่แท็บ "อื่น ๆ" — ย้ายออกมาไว้ใต้กรอบแท็บ เห็นได้ตลอดไม่ต้องสลับแท็บ */}
            {/* ลิงก์เว็บยาว ให้มีแถวของตัวเองเต็มความกว้าง */}
            {text("link_web")}
            {/* ชื่อ MD ย้ายออกมาจากแท็บผู้ขาย — วางคู่กับสถานะ เห็นได้ตลอดไม่ต้องสลับแท็บ */}
            <div className="grid gap-4 sm:grid-cols-3">
              {text("md_name")}
              <Field id="item-active_status" label={tcol("status")} select>
                <SelectOption
                  id="item-active_status"
                  options={statusOptions}
                  value={values.active_status || ITEM_ACTIVE}
                  onValueChange={(next) =>
                    set("active_status", next ?? ITEM_ACTIVE)
                  }
                  placeholder={tr("active")}
                  label={tcol("status")}
                />
              </Field>
            </div>
            <Field id="item-remark" label={tcol("remark")}>
              <Textarea
                id="item-remark"
                rows={3}
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
          </div>

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
              disabled={saving || uploadingImage}
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

/** เส้นคั่นพร้อมป้ายกำกับ — ใช้แบ่งกลุ่มย่อยภายในแท็บเดียวกัน */
function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
        {label}
      </span>
      <span className="bg-border/60 h-px flex-1" />
    </div>
  )
}

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
