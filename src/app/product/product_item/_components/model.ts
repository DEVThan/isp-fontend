/**
 * model.ts — รูปร่างข้อมูลของหน้าจัดการสินค้า
 *
 * ชื่อฟิลด์ยึดตามคอลัมน์ในตาราง products ที่ API ส่งมาตรง ๆ (snake_case)
 * จะได้ไม่ต้องแปลงชื่อไปกลับสองทาง — รวมถึงตัวที่สะกดเพี้ยนในฐานข้อมูลเอง
 * (gp_amout, avg_deelivery_cost, vendo_code) ห้ามแก้ให้ถูก ไม่งั้นไม่ตรงกับ API
 *
 * ตารางนี้ไม่ใช่ทะเบียนเปล่าเหมือน product_code / product_type — มันคือสินค้าจริงที่ SO ใช้อยู่
 * order_items.product_id เป็น foreign key ชี้มาที่นี่ และ view so_list ก็ join ด้วย product_id
 * แก้ชื่อ/รหัสที่นี่ = ทุกบรรทัด SO ที่ขายไปแล้วเปลี่ยนตามทันที
 */

/** ค่าที่ถือว่าสินค้าปิดขาย — ตรงกับ _INACTIVE ฝั่ง API */
export const ITEM_INACTIVE = "inactive"

/** ค่าที่ถือว่าสินค้าเปิดขาย — ใช้เป็นค่าตั้งต้นของฟอร์ม */
export const ITEM_ACTIVE = "active"

/**
 * ค่า "ใช่ / ไม่ใช่" ของ status_deduct_stock กับ status_allow_oversell (varchar(50) ไม่มีทะเบียนให้ดึง)
 * ตั้งเองเป็นตัวพิมพ์เล็กแบบเดียวกับ active/inactive — ตอนเพิ่มช่องยังไม่มีข้อมูลเดิมให้ยึดรูปแบบ
 * แถวที่มีค่าอื่นอยู่แล้ว ฟอร์มยังโชว์และส่งค่านั้นกลับไปเหมือนเดิม (withCurrent ใน form_modal)
 */
export const ITEM_YES = "yes"
export const ITEM_NO = "no"

/**
 * หนึ่งแถวในตาราง products ตามที่ POST /api/web/product-item-get-list คืนมา
 *
 * ชนิดค่าตามที่ได้รับจริง ไม่ใช่ตามชนิดในฐานข้อมูล:
 * - คอลัมน์ numeric ส่งมาเป็น "สตริงตัวเลข" ("0.00") ไม่ใช่ number — psycopg2 คืน Decimal มาแบบนั้น
 * - price กับ gp_percentage เป็น varchar ในฐานข้อมูลอยู่แล้ว (เก็บตัวเลขเป็นข้อความ)
 * - คอลัมน์ integer ว่างได้ จึงเป็น number | null
 */
export type ProductItem = {
  id: number

  // --- ข้อความบังคับ (not null) ---
  /** ชื่อสินค้า — ครึ่งหนึ่งของ unique key (product_name, product_group) */
  product_name: string
  /** รหัสสินค้า — ตัวที่ SO ใช้อ้าง ตัวอักษรแรกบอก shipment_type (so_crm.PREFIX_TYPE) */
  item_code: string

  // --- ข้อความไม่บังคับ ไม่จำกัดความยาว ---
  barcode: string | null
  product_type_name: string | null
  /** อีกครึ่งของ unique key — ไม่ใส่ API จะใช้ item_code แทนให้ */
  product_group: string | null
  supplier_name: string | null
  shipment_type: string | null
  link_web: string | null
  remark: string | null

  // --- varchar จำกัดความยาว (ดู ITEM_MAX_LEN) ---
  image: string | null
  unit: string | null
  l_group: string | null
  m_group: string | null
  md_name: string | null
  price: string | null
  gp_percentage: string | null
  status_deduct_stock: string | null
  status_allow_oversell: string | null
  vendo_code: string | null
  channel_type: string | null
  important_doc: string | null
  status_line_my_shop: string | null
  item_group: string | null

  // --- numeric not null default 0 — ส่งมาเป็นสตริง ("0.00") ---
  cost: string
  gp_amout: string
  cm_bath: string
  cm_percentage: string
  weight_kg: string
  avg_box_w_mm: string
  avg_box_h_mm: string
  avg_box_d_mm: string
  avg_deelivery_cost: string
  cogs: string
  check1: string
  check2: string
  /** จำนวนสินค้า — numeric(12,2) not null default 0 เพิ่มเข้าตารางทีหลัง */
  qty: string

  // --- integer ว่างได้ · สี่ตัวท้ายเก็บ id ของทะเบียน status_* (ผูกด้วยเลข ไม่มี foreign key) ---
  delivery_fee: number | null
  dimension_cm: number | null
  status_km: number | null
  status_tv_program_footage: number | null
  status_mou: number | null
  status_km_protocall: number | null

  active_status: string | null
}

/**
 * สินค้านี้ยังเปิดขายอยู่ไหม
 *
 * ต่างจากทะเบียนอื่นตรงนี้: คอลัมน์ active_status เพิ่มเข้ามาทีหลัง ทั้ง 152 แถวยังเป็น NULL
 * ฝั่ง API จึงถือว่า "ปิด" คือค่า inactive ตรง ๆ เท่านั้น NULL/ค่าว่าง = ยังเปิดขาย
 * เขียนเป็น !== inactive ไม่ใช่ === active ไม่งั้นทั้งตารางจะขึ้นว่าปิดหมด
 */
export function isProductItemActive(item: ProductItem) {
  return item.active_status !== ITEM_INACTIVE
}

/**
 * หนึ่งแถวของ -get-list — สินค้า + ข้อมูลผู้ขายที่ API join มาจาก vendor ด้วย vendo_code (อ่านอย่างเดียว)
 *
 * แยกจาก ProductItem เพราะ ProductItemFormValues สร้างจากคีย์ของ ProductItem
 * ถ้าใส่สองตัวนี้ไว้ในนั้น ฟอร์มจะถือ/ส่งฟิลด์ที่ไม่ใช่คอลัมน์ของ products ไปบันทึกด้วย
 * แถวที่ไม่มี vendo_code (ข้อมูลเก่าที่มีแต่ supplier_name) หรือหาผู้ขายไม่เจอ ได้ null ทั้งคู่
 */
export type ProductItemRow = ProductItem & {
  vendor_name: string | null
  /** vendor.sender_code ดิบ ๆ — JSON string ของ [{shipping, sendercode}] อ่านด้วย parseSenderCodes ของหน้า vendor */
  vendor_sender_code: string | null
}

/** ความยาวสูงสุดของคอลัมน์ varchar — ตรงกับ _VARCHAR ฝั่ง API เกินแล้วตอบ 400 */
export const ITEM_MAX_LEN: Record<string, number> = {
  image: 255,
  unit: 50,
  l_group: 50,
  m_group: 50,
  md_name: 255,
  price: 15,
  gp_percentage: 15,
  status_deduct_stock: 50,
  status_allow_oversell: 50,
  vendo_code: 15,
  channel_type: 255,
  important_doc: 255,
  status_line_my_shop: 255,
  item_group: 255,
}

/**
 * ผลลัพธ์ของ POST /api/web/product-item-get-list
 * คีย์รายการคือ "products" ตามชื่อตาราง ไม่ใช่ "productitems" ตามชื่อเส้น
 */
export type ProductItemList = {
  products: ProductItemRow[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

/** ตัวเลือกสินค้าจาก POST /api/web/product-item-get-option — เฉพาะที่ยังไม่ปิดขาย เรียงตามชื่อ
 *  มี item_code มาด้วยเพราะชื่อสินค้ายาวและคล้ายกันหลายตัว ต้องมีรหัสให้แยก */
export type ProductItemOption = {
  id: number
  item_code: string
  product_name: string
}

/** ตัวเลือกจากทะเบียนที่มีแค่ id/name — product_type และ status_* ทุกตัว (เส้น -get-option) */
export type NamedOption = { id: number; name: string }

/** ตัวเลือกผู้ขายจาก /vendor-get-option — มี code เพราะผู้ขายชื่อซ้ำกันได้ code ต่างหากที่ไม่ซ้ำ */
export type VendorOption = { id: number; code: string; name: string }

/**
 * ตัวเลือกรหัสสินค้าจาก /product-code-get-option — prefix คือส่วนหน้าของ item_code (P0 / D0 / F1 / F2)
 * ตอนเพิ่มสินค้าเลือก prefix แล้ว API ออกเลขวิ่งต่อท้ายให้ตอนบันทึก (P0 → P00034)
 */
export type ProductCodeOption = { id: number; prefix: string; name: string }

/** ตัวเลือกช่องทางการขายจาก /status-channeltype-get-option — มี logo ติดมาด้วย (ยังไม่ได้ใช้) */
export type ChannelTypeOption = NamedOption & { logo: string | null }

/**
 * ตัวเลือกของทุกช่อง select ในฟอร์มสินค้า — ดึงพร้อมกันตอนเปิดฟอร์ม
 *
 * แต่ละช่องเก็บลง products ไม่เหมือนกัน (ดูคอมเมนต์ _INTEGER ใน controller/web/product_item.py):
 * - product_type_name / shipment_type / channel_type / important_doc / status_line_my_shop เก็บ "ชื่อ" เป็นข้อความ
 * - status_km / status_tv_program_footage / status_mou / status_km_protocall เก็บ "id" เป็นเลข
 * - vendo_code เก็บ code ของผู้ขาย และ supplier_name เก็บชื่อคู่กัน
 */
export type ProductItemFormOptions = {
  productTypes: NamedOption[]
  shipmentTypes: NamedOption[]
  vendors: VendorOption[]
  channelTypes: ChannelTypeOption[]
  kms: NamedOption[]
  importantDocs: NamedOption[]
  tvProgramFootages: NamedOption[]
  mous: NamedOption[]
  kmProtocalls: NamedOption[]
  lineMyShops: NamedOption[]
  productCodes: ProductCodeOption[]
}

/** ตัวเลือกของตัวกรองในหน้ารายการ — ใช้แค่ 3 ทะเบียน ไม่ต้องดึงครบ 11 เส้นแบบฟอร์ม */
export type ProductItemFilterOptions = Pick<
  ProductItemFormOptions,
  "productTypes" | "shipmentTypes" | "vendors"
>

/**
 * channel_type กับ important_doc เลือกได้หลายตัว แต่คอลัมน์เป็น varchar(255) ตัวเดียว ไม่มีตารางลูก
 * จึงเก็บชื่อต่อกันคั่นด้วย "," (เช่น "TV,Line OA" / "อย.,ฆอ.2") — รวมกันเกิน 255 ตัว API ตอบ 400
 * แถวเก่าที่เก็บชื่อเดียว ("TV") อ่านได้เป็น ["TV"] ตามรูปแบบนี้อยู่แล้ว ไม่ต้องแปลงข้อมูล
 */
const NAME_LIST_SEPARATOR = ","

/** อ่านรายชื่อจากคอลัมน์ — ตัดช่องว่างรอบ ๆ และทิ้งช่องว่างเปล่า ("" ได้ []) */
export function parseNameList(raw: string): string[] {
  return raw
    .split(NAME_LIST_SEPARATOR)
    .map((name) => name.trim())
    .filter(Boolean)
}

/** เขียนกลับลงคอลัมน์ — ไม่ได้เลือกเลยได้ "" (API เก็บเป็น NULL) */
export function serializeNameList(names: string[]): string {
  return names.join(NAME_LIST_SEPARATOR)
}

/** ปุ่มไหนเป็นคนเปิดฟอร์ม — ค่าเดียวกับ action ที่ POST /api/web/product-item-action รับ */
export type ProductItemFormMode = "add" | "edit"

/**
 * ค่าที่ฟอร์มถืออยู่และส่งไปบันทึก — ทุกคอลัมน์ที่แก้ได้ เก็บเป็นสตริงหมดเพื่อผูกกับช่องกรอกตรง ๆ
 *
 * **ต้องครบทุกคอลัมน์เสมอ** เส้น -action เขียนทับทั้งแถวทุกครั้ง ไม่ได้แก้เฉพาะที่ส่งมา
 * ฟิลด์ไหนไม่ได้ส่งไปจะกลายเป็นค่าว่าง (text -> NULL, numeric -> 0) ของเดิมหายทันที
 * ฉะนั้นช่องที่ยังไม่ได้เอาขึ้นหน้าจอก็ยังต้องอยู่ในนี้ และ toValues() ต้องอ่านมันมาด้วย
 */
export type ProductItemFormValues = Omit<
  Record<keyof Omit<ProductItem, "id">, string>,
  never
>

/** ลำดับคอลัมน์ทั้งหมดที่ฟอร์มต้องถือไว้ — ใช้สร้างค่าว่างและอ่านค่าจากแถวให้ครบ ไม่ตกหล่น */
export const ITEM_FIELDS = [
  "product_name",
  "item_code",
  "barcode",
  "product_type_name",
  "product_group",
  "supplier_name",
  "shipment_type",
  "link_web",
  "remark",
  "image",
  "unit",
  "l_group",
  "m_group",
  "md_name",
  "price",
  "gp_percentage",
  "status_deduct_stock",
  "status_allow_oversell",
  "vendo_code",
  "channel_type",
  "important_doc",
  "status_line_my_shop",
  "item_group",
  "cost",
  "gp_amout",
  "cm_bath",
  "cm_percentage",
  "weight_kg",
  "avg_box_w_mm",
  "avg_box_h_mm",
  "avg_box_d_mm",
  "avg_deelivery_cost",
  "cogs",
  "check1",
  "check2",
  "qty",
  "delivery_fee",
  "dimension_cm",
  "status_km",
  "status_tv_program_footage",
  "status_mou",
  "status_km_protocall",
  "active_status",
] as const satisfies readonly (keyof ProductItemFormValues)[]

/**
 * ผลของ POST /api/web/product-item-delete — คืนแถวที่หายไป
 *
 * ต่างจากทะเบียนอื่น: order_items.product_id เป็น foreign key จริง ๆ ลบสินค้าที่มี SO ใช้อยู่ไม่ได้
 * API นับให้ก่อนแล้วตอบ 400 พร้อม result {id, order_items} — ไม่ได้ลบอะไรเลย
 */
export type ProductItemDeleted = {
  id: number
  item_code: string
  product_name: string
}
