"use client"

import * as React from "react"
import { CircleCheck, LoaderCircle, TriangleAlert } from "lucide-react"
import { useTranslations } from "next-intl"

import { saveProductItem } from "@/app/product/product_item/_components/api"
import {
  ITEM_ACTIVE,
  ITEM_FIELDS,
  ITEM_INACTIVE,
  ITEM_MAX_LEN,
  type ProductItem,
  type ProductItemFormMode,
  type ProductItemFormValues,
} from "@/app/product/product_item/_components/model"
import { SelectOption } from "@/app/product/product_item/_components/selectoption"
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
 * **ฟอร์มนี้ถือค่าครบทั้ง 42 คอลัมน์เสมอ แม้จะไม่ได้เอาขึ้นหน้าจอทุกตัว**
 * เพราะเส้น -action เขียนทับทั้งแถว ไม่ได้แก้เฉพาะที่ส่งไป — ตกไปตัวเดียวของเดิมหายทันที
 * ตัวที่ไม่ได้แสดงถูกอ่านเข้ามาใน values ตาม ITEM_FIELDS แล้วส่งกลับไปเหมือนเดิม
 * (ที่ยังไม่ขึ้นหน้าจอ: cm_bath, cm_percentage, avg_box_w/h/d_mm, avg_deelivery_cost,
 *  check1, check2, dimension_cm, status_km, status_tv_program_footage, status_mou,
 *  status_km_protocall, status_deduct_stock, status_allow_oversell, channel_type,
 *  important_doc, status_line_my_shop — เพิ่มช่องได้โดยใส่คีย์ใน columns แล้วเรียก text())
 *
 * **การจัดหน้า** ช่องเยอะเกินกว่าจะไล่เป็นแถวยาว ๆ ได้ (เคยสูง 935px ต้องเลื่อนทั้งกล่อง
 * แล้วปุ่มบันทึกหลุดไปอยู่ล่างสุด) จึงแบ่งเป็นแท็บ และตรึงสองส่วนไว้เสมอ:
 * แถบรหัส+ชื่อด้านบน (สองช่องที่บังคับกรอก จะได้เห็นกรอบแดงไม่ว่าอยู่แท็บไหน) กับปุ่มด้านล่าง
 */
// คลาสขอบแดง — ต้องสลับคลาสเอง ไม่ใช้ variant aria-invalid: เพราะ Tailwind v4 ห่อ variant
// ด้วย :where() ความจำเพาะจึงเท่ากับ border-input แล้วแพ้ลำดับใน stylesheet
const INVALID_FIELD =
  "border-destructive ring-3 ring-destructive/20 dark:border-destructive/50 dark:ring-destructive/40"

/** ค่าว่างของทุกคอลัมน์ — สร้างจาก ITEM_FIELDS จะได้ไม่มีทางตกหล่น */
const emptyValues: ProductItemFormValues = Object.fromEntries(
  ITEM_FIELDS.map((field) => [field, ""])
) as ProductItemFormValues

/** คอลัมน์ที่เอาขึ้นหน้าจอเป็นช่องกรอก — ต้องมีคีย์ใน productitems.columns ทุกตัว */
type ShownField =
  | "product_group"
  | "barcode"
  | "unit"
  | "product_type_name"
  | "item_group"
  | "l_group"
  | "m_group"
  | "price"
  | "cost"
  | "gp_percentage"
  | "gp_amout"
  | "cogs"
  | "supplier_name"
  | "vendo_code"
  | "shipment_type"
  | "delivery_fee"
  | "weight_kg"
  | "md_name"
  | "image"
  | "link_web"

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
  /** ชื่อสินค้ายังว่างตอนกดบันทึก — ตรวจเองแทน required ของเบราว์เซอร์ */
  const [nameError, setNameError] = React.useState(false)
  /** รหัสสินค้ายังว่างตอนกดบันทึก */
  const [codeError, setCodeError] = React.useState(false)
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
    setNameError(false)
    setCodeError(false)
  }

  const set = (key: keyof ProductItemFormValues, value: string) =>
    setValues((current) => ({ ...current, [key]: value }))

  const statusOptions = [
    { value: ITEM_ACTIVE, label: tr("active") },
    { value: ITEM_INACTIVE, label: tr("inactive") },
  ]

  /**
   * ช่องข้อความธรรมดา — ผูกกับคอลัมน์ตรง ๆ พร้อมจำกัดความยาวตามฐานข้อมูล
   * รับได้เฉพาะคอลัมน์ที่มีคำแปลใน productitems.columns (TS เช็คให้ตอน compile)
   * คอลัมน์ที่เหลือยังอยู่ใน values และถูกส่งกลับไปเหมือนเดิม แค่ไม่ได้ขึ้นหน้าจอ
   */
  const text = (field: ShownField) => (
    <Field id={`item-${field}`} label={tcol(field)}>
      <Input
        id={`item-${field}`}
        value={values[field]}
        maxLength={ITEM_MAX_LEN[field]}
        placeholder="..."
        onChange={(event) => set(field, event.target.value)}
      />
    </Field>
  )

  /** ช่องตัวเลข — ชิดขวาและเลขความกว้างเท่ากัน อ่านง่ายกว่าตอนเทียบหลายบรรทัด */
  const num = (field: ShownField) => (
    <Field id={`item-${field}`} label={tcol(field)}>
      <Input
        id={`item-${field}`}
        value={values[field]}
        maxLength={ITEM_MAX_LEN[field]}
        inputMode="decimal"
        placeholder="0.00"
        onChange={(event) => set(field, event.target.value)}
        className="text-right font-mono tabular-nums"
      />
    </Field>
  )

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
            // เช็คทั้งสองช่องที่บังคับก่อน ให้ขึ้นกรอบแดงพร้อมกัน ไม่ใช่ทีละช่อง
            const missingCode = !values.item_code.trim()
            const missingName = !values.product_name.trim()
            setCodeError(missingCode)
            setNameError(missingName)
            if (missingCode || missingName) return
            setSaving(true)
            setResult(null)
            try {
              // โหมดของฟอร์มคือ action ที่ API ใช้ตัดสินใจ ("add" / "edit")
              // ส่งไปครบทุกคอลัมน์ รวมตัวที่ไม่ได้แสดง ไม่งั้นของเดิมโดนเขียนทับเป็นค่าว่าง
              await saveProductItem(mode, values, item?.id)
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
            {/* สองช่องที่บังคับกรอก อยู่นอกแท็บเสมอ — เป็นตัวบอกว่ากำลังแก้สินค้าตัวไหน
                และถ้ากดบันทึกทั้งที่ยังว่าง กรอบแดงต้องเห็นได้ไม่ว่าเปิดแท็บไหนอยู่ */}
            <div className="border-border/60 bg-muted/30 grid gap-4 rounded-lg border p-3 sm:grid-cols-3">
              <Field
                id="item-item_code"
                label={tcol("itemCode")}
                required
                error={codeError ? t("required") : undefined}
              >
                <Input
                  id="item-item_code"
                  value={values.item_code}
                  onChange={(event) => {
                    set("item_code", event.target.value)
                    if (event.target.value.trim()) setCodeError(false)
                  }}
                  placeholder="P00001"
                  aria-required
                  aria-invalid={codeError || undefined}
                  className={`font-mono ${codeError ? INVALID_FIELD : ""}`}
                />
              </Field>
              {/* ชื่อสินค้ายาวมาก กินสองช่องที่เหลือของแถว */}
              <div className="sm:col-span-2">
                <Field
                  id="item-product_name"
                  label={tcol("productName")}
                  required
                  error={nameError ? t("required") : undefined}
                >
                  <Input
                    id="item-product_name"
                    value={values.product_name}
                    onChange={(event) => {
                      set("product_name", event.target.value)
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

            <Tabs defaultValue="main" className="gap-4">
              <TabsList className="w-full">
                <TabsTrigger value="main">{tform("sectionMain")}</TabsTrigger>
                <TabsTrigger value="price">{tform("sectionPrice")}</TabsTrigger>
                <TabsTrigger value="supply">
                  {tform("sectionSupply")}
                </TabsTrigger>
                <TabsTrigger value="other">{tform("sectionOther")}</TabsTrigger>
              </TabsList>

              <TabsContent value="main" className="grid gap-4 min-h-[230px] content-start">
                <div className="grid gap-4 sm:grid-cols-3">
                  {text("product_group")}
                  {text("barcode")}
                  {text("unit")}
                </div>
                <Divider label={tform("sectionGroup")} />
                <div className="grid gap-4 sm:grid-cols-2">
                  {text("product_type_name")}
                  {text("item_group")}
                  {text("l_group")}
                  {text("m_group")}
                </div>
              </TabsContent>

              <TabsContent value="price" className="grid gap-4 min-h-[230px] content-start">
                <div className="grid gap-4 sm:grid-cols-3">
                  {num("price")}
                  {num("cost")}
                  {num("cogs")}
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  {num("gp_percentage")}
                  {num("gp_amout")}
                </div>
              </TabsContent>

              <TabsContent value="supply" className="grid gap-4 min-h-[230px] content-start">
                <div className="grid gap-4 sm:grid-cols-3">
                  {text("supplier_name")}
                  {text("vendo_code")}
                  {text("shipment_type")}
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  {num("delivery_fee")}
                  {num("weight_kg")}
                  {text("md_name")}
                </div>
              </TabsContent>

              <TabsContent value="other" className="grid gap-4 min-h-[230px] content-start">
                <div className="grid gap-4 sm:grid-cols-3">
                  {text("image")}
                  {text("link_web")}
                  <Field id="item-active_status" label={tcol("status")}>
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
              </TabsContent>
            </Tabs>

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

          {/* แถบท้ายไล่เฉดชุดเดียวกับแถบแบ่งหน้าในตาราง — อยู่นอกกรอบที่เลื่อน ปุ่มจึงติดอยู่เสมอ */}
          <DialogFooter className="from-primary/12 border-border/60 border-t bg-transparent bg-gradient-to-r via-transparent to-transparent p-4">
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
