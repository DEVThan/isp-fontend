/**
 * model.ts — รูปร่างข้อมูลของหน้าการติดตามข้อมูลใบสั่งขาย /so_tracking (ตาราง so)
 *
 * ตรวจกับคอลัมน์จริงของตาราง so (information_schema, 16/10/2026) แล้ว: 47 คอลัมน์ = id + so_code + SO_TEXT (32)
 * + barcode + SO_NUMERIC (6) + SO_FK (2) + SO_READONLY (3) + export_group_name (varchar 50 — หน้าส่งออกเป็นคนเขียน
 * so-get-list ไม่คืนมา และ so-action ไม่รับ จึงไม่อยู่ในชุดที่ฟอร์มส่ง)
 *
 * ชื่อฟิลด์ยึดตามคอลัมน์ในตาราง so ที่ API ส่งมาตรง ๆ (snake_case) จะได้ไม่ต้องแปลงชื่อไปกลับสองทาง
 * คอลัมน์ที่ API คืนมาดูได้ที่ _ROW_COLS ใน controller/web/so.py
 *
 * **หนึ่งแถว = หนึ่งรายการสินค้าในใบสั่งขาย ไม่ใช่หนึ่งใบ** — so_code เดียวมีได้หลายแถวถ้าสั่งหลายสินค้า
 * unique index so_line_key คุม (so_code, product_name, product_group) ซ้ำทั้งสามค่าไม่ได้
 *
 * ตารางนี้ถูกเติมด้วยงาน sync รายวันจากไฟล์ Excel (source_file / synced_at) — ค่าที่แก้จากหน้านี้
 * อาจถูกรอบถัดไปเขียนทับ · วันที่ทุกตัวเก็บเป็น text ไม่ใช่ timestamp ("2026-09-24 09:01:48")
 * จึงส่งกลับไปตามรูปเดิมเสมอ ห้ามแปลงรูป ไม่งั้นงาน sync กับหน้าเว็บจะเขียนคนละแบบ
 */

/* ────────────────────────────────────────────────────────────────────────────
 * คอลัมน์ที่เขียนได้ — ชุดเดียวกับ _WRITE_COLS ฝั่ง API (เรียงลำดับเดียวกัน)
 * ────────────────────────────────────────────────────────────────────────── */

/** text ไม่บังคับ ไม่จำกัดความยาว (_TEXT ฝั่ง API) — ส่งค่าว่างไป API เก็บเป็น NULL */
export const SO_TEXT = [
  "name",
  "tel",
  "did",
  "create_date",
  "po_date",
  "pay_by",
  "is_payment",
  "payment_date",
  "sell_by",
  "address",
  "subdistrict",
  "district",
  "province",
  "zipcode",
  "status",
  "channel_name",
  "channel",
  "remark",
  "product_name",
  "product_type_name",
  "product_group",
  "supplier_name",
  "item_code",
  "shipment_type",
  "vendor_name",
  "shipping_by",
  "shipping_date",
  "shipping_code",
  "receive_date",
  "appointment_date",
  "cash_in",
  /** รหัสผู้ส่ง (varchar 10, 2026-09-30) — ฟอร์มหน้านี้ไม่มีช่อง ส่งค่าเดิมกลับไปเฉย ๆ (ฟอร์มหน้า /sale/so เป็นคนคำนวณ) */
  "sender_code",
] as const

/** ตัวเลข — numeric ในฐานข้อมูล API คืนมาเป็นข้อความ ("999.0") · ค่าว่าง = NULL */
export const SO_NUMERIC = [
  "qty",
  "price_per_unit",
  "amount",
  "pay_amount",
  "shipping",
  "discount",
] as const

/** foreign key แบบ on delete set null — ส่ง 0 หรือค่าว่าง = ตัดความเชื่อมโยง (เก็บ NULL)
 *  API ตรวจก่อนเขียนว่า id นั้นมีจริง ไม่มีตอบ 400 "<field> not found" */
export const SO_FK = ["customer_id", "shipment_type_id"] as const

/** barcode เป็น NOT NULL default '' — ค่าว่างเก็บเป็น '' ไม่ใช่ NULL จึงแยกออกจาก SO_TEXT */
export const SO_BARCODE = "barcode"

/**
 * ทุกคอลัมน์ที่ฟอร์มต้องถือและส่งกลับไป — เส้น -action เขียนทับทั้งแถว
 * ตกไปตัวเดียวของเดิมกลายเป็น NULL ทันที จึงสร้างค่าเริ่มต้นของฟอร์มจากลิสต์นี้ ไม่ไล่พิมพ์เอง
 */
export const SO_FIELDS = [
  "so_code",
  ...SO_TEXT,
  SO_BARCODE,
  ...SO_NUMERIC,
  ...SO_FK,
] as const

/** อ่านอย่างเดียว (_READONLY ฝั่ง API) — งาน sync เป็นคนเขียน ไม่รับค่าจาก body */
export const SO_READONLY = ["source_file", "synced_at", "updated_at"] as const

/* ────────────────────────────────────────────────────────────────────────────
 * ค่าที่พบจริงในตาราง (นับจากทั้งตาราง 43,500+ แถว เมื่อ 24/09/2026)
 *
 * **status ไม่ต้องมีลิสต์ที่นี่แล้ว** — 24/09/2026 ผู้ใช้แก้ทะเบียน status_po ให้เป็นค่าไทยชุดเดียวกับ
 * ที่งาน sync เขียนจริง (กำลังจัดส่ง / ลูกค้าได้รับสินค้าแล้ว / ยกเลิก / ออเดอร์ใหม่ — ที่เป็นอังกฤษ
 * ถูกปิดเป็น inactive เส้น -get-option จึงไม่คืนมา) ช่องสถานะออเดอร์เลยอ่านจากทะเบียนอย่างเดียว
 * ตรวจแล้วครอบทุกแถว: select status, count(*) from so group by 1 ได้ 4 ค่านี้พอดี ไม่มีค่าอื่น
 *
 * อีกสองทะเบียนยังไม่ตรง: payment_type เก็บ "COD (Cash on Delivery)", "Bank Transfer" …
 * และ status_payment เก็บ "Unpaid / Awaiting payment", "Paid / Success / Completed" …
 * ซึ่งไม่มีแถวไหนในตาราง so ใช้เลย · สองช่องนั้นจึงยังเอาทั้งสองแหล่งมาต่อกัน (ทะเบียน + ค่าจริงข้างล่าง)
 * ถ้าวันไหนแก้ทะเบียนให้ตรงเหมือน status_po แล้ว ลบ constant ที่เหลือทิ้งได้เลย
 * ────────────────────────────────────────────────────────────────────────── */

/** pay_by — วิธีชำระเงิน */
export const SO_PAY_BYS = ["COD", "โอนเงิน", "บัตรเครดิต"] as const

/** is_payment — ชำระแล้วหรือยัง (เก็บเป็นข้อความ ไม่ใช่ boolean) */
export const SO_IS_PAYMENTS = ["รอชำระเงิน", "ชำระเงินแล้ว"] as const

/**
 * หนึ่งแถวในตาราง so ตามที่ POST /api/web/so-get-list คืนมา
 *
 * id มาจาก sequence (so_id_seq) — ตอน add ส่ง 0 ฐานข้อมูลออกเลขให้เอง
 * so_code เป็นคอลัมน์เดียวที่บังคับ · ตัวเลขทั้งหมดมาเป็นข้อความ · วันที่ใน SO_TEXT เป็น text ล้วน
 */
export type So = {
  id: number
  so_code: string
} & {
  [K in (typeof SO_TEXT)[number]]: string | null
} & {
  /** NOT NULL default '' — ไม่เคยเป็น null */
  barcode: string
} & {
  [K in (typeof SO_NUMERIC)[number]]: string | null
} & {
  [K in (typeof SO_FK)[number]]: number | null
} & {
  /** ไฟล์ Excel ที่ sync แถวนี้มา — แถวที่เพิ่มจากหน้าเว็บเป็น null */
  source_file: string | null
  /** timestamp จริง (ไม่ใช่ text เหมือนวันที่ตัวอื่น) — Flask ส่งมาเป็น "Thu, 24 Sep 2026 04:00:43 GMT" */
  synced_at: string | null
  updated_at: string | null
  /** varchar 50 — ชื่อกลุ่มส่งออก (export-yyyymmddNNN) หน้าส่งออกเป็นคนเขียน · so-get-list ยังไม่คืนคอลัมน์นี้ (16/10/2026) */
  export_group_name?: string | null
  /** ผู้ขายจาก join so.item_code -> products.item_code -> products.vendo_code -> vendor.code (so-get-list
   *  เท่านั้น 2026-09-29) — หาไม่เจอ = null · แถวที่ได้จาก -action ไม่มีฟิลด์ join พวกนี้ */
  vendor_code?: string | null
  /** products.shipment_type ของสินค้าในแถว (join เดียวกัน) — ตารางและฟอร์มใช้เป็นประเภทการจัดส่งก่อน so.shipment_type
   *  (01/10/2026 ย้ายจาก vendor.shipment_type มาอยู่ที่สินค้า) */
  product_shipment_type?: string | null
  /** products.sender_code ของสินค้าในแถว — JSON string ของ [{shipping, sendercode}] ฟอร์มเลือกรหัสผู้ส่งตาม "ขนส่งโดย" */
  product_sender_code?: string | null
}

/**
 * ผลลัพธ์ของ POST /api/web/so-get-list — API ค้นหา/แบ่งหน้าให้ตั้งแต่ฝั่งเซิร์ฟเวอร์
 * คีย์เป็นชื่อตาราง ไม่ใช่ชื่อเส้น (API ตอบ "so") · total คือจำนวนหลังกรองแล้ว ไม่ใช่ทั้งตาราง
 */
export type SoList = {
  so: So[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

/** ปุ่มไหนเป็นคนเปิดฟอร์ม — ค่าเดียวกับ action ที่ POST /api/web/so-action รับ */
export type SoFormMode = "add" | "edit"

/**
 * ค่าที่ฟอร์มถืออยู่และส่งไปบันทึก — ทุกคอลัมน์ที่เขียนได้ เก็บเป็นสตริงทั้งหมด
 * (ช่องกรอกคืนสตริงเสมอ และ API รับตัวเลข/FK เป็นข้อความได้ "1,234.50" ก็ยังอ่านออก)
 * ฟิลด์ที่ไม่ได้กรอกส่งเป็นสตริงว่าง ไม่ใช่ undefined — เส้น -action เขียนทับทุกฟิลด์ทุกครั้ง
 */
export type SoFormValues = Record<(typeof SO_FIELDS)[number], string>

/**
 * ผลของ POST /api/web/so-delete — คืนมาแค่แถวที่หายไป
 * ไม่มีตารางไหนอ้าง so.id จึงลบได้เสมอ แต่ถ้าแถวนี้มาจากไฟล์ sync งานรอบถัดไปจะเติมกลับมาใหม่
 */
export type SoDeleted = {
  id: number
  so_code: string
  name: string | null
  product_name: string | null
}

/** รูปแบบที่ทุกเส้น -get-option คืนมา (id + ชื่อ) — ใช้เป็นตัวเลือกของช่อง select */
export type NamedOption = { id: number; name: string }

/** ลูกค้าจาก /customer-get-option — ค้นฝั่งเซิร์ฟเวอร์ ได้ไม่เกิน 20 คนต่อครั้ง (ดู getCustomerOptions) */
export type CustomerOption = { id: number; name: string | null; tel: string }

/** ผู้ขาย — ชื่อซ้ำกันได้ จึงมี code มาด้วย
 *  shipment_type / sender_code (2026-09-29) — ฟอร์มเลือกผู้ขายแล้วเติมประเภทการจัดส่ง และทำตัวเลือก "ขนส่งโดย"
 *  sender_code เป็น JSON string ของ [{shipping, sendercode}] อ่านด้วย parseSenderCodes ของหน้า vendor */
export type VendorOption = NamedOption & {
  code: string
  shipment_type?: string | null
  sender_code?: string | null
}

/** บริษัทขนส่งจาก /shipping-get-option — จับคู่กับ vendor.sender_code ด้วยชื่อ (หน้าผู้ขายเก็บชื่อ) หรือรหัส */
export type ShippingRegistryOption = NamedOption & {
  code: string | null
  /** path โลโก้ /uploads/shipping/{id}/logo/… — ""/null = ไม่มีรูป (ตัวกรองในตารางโชว์คู่ชื่อ) */
  logo?: string | null
}

/** ช่องทางการออกอากาศ — มีโลโก้มาด้วย (หน้านี้ไม่ได้ใช้) */
export type BroadcastOption = NamedOption & { logo: string }

/** ตัวเลือกของทุกช่อง select ในหน้านี้ — ยิงพร้อมกันทีเดียว (ดู getSoOptions) */
export type SoOptions = {
  /** ทะเบียน status_po */
  statuses: NamedOption[]
  /** ทะเบียน payment_type */
  payTypes: NamedOption[]
  /** ทะเบียน status_payment */
  paymentStatuses: NamedOption[]
  /** ทะเบียน shiptment_type — ผูกกับ so.shipment_type_id ด้วย id */
  shipmentTypes: NamedOption[]
  /** ทะเบียน broadcast (ช่องทางการออกอากาศ) */
  broadcasts: BroadcastOption[]
  /** ทะเบียน product_type */
  productTypes: NamedOption[]
  /** ทะเบียน shipping (บริษัทขนส่ง) — ตัวเลือก "ขนส่งโดย" กรองด้วยขนส่งใน vendor.sender_code ของผู้ขาย */
  shippings: ShippingRegistryOption[]
  vendors: VendorOption[]
}

/** ยังไม่ได้ตัวเลือกจาก API — ช่องโชว์แค่ค่าเดิมของแถวไปก่อน */
export const NO_SO_OPTIONS: SoOptions = {
  statuses: [],
  payTypes: [],
  paymentStatuses: [],
  shipmentTypes: [],
  broadcasts: [],
  productTypes: [],
  shippings: [],
  vendors: [],
}

/**
 * แถวจาก POST /api/web/so-get-option — เดาไว้ก่อน (16/10/2026 เส้นยังไม่มีใน API ตอบ 404)
 * ถ้าฝั่ง API ตอบรูปอื่น แก้ type นี้ให้ตรง
 */
export type SoTrackingOption = {
  id: number
  so_code: string
}

/**
 * ผลจาก POST /api/web/tracking-kex (16/10/2026) — สถานะพัสดุ KERRY (KEX) ดึงสดจากเว็บ KEX ทุกครั้ง ไม่ได้เก็บใน DB
 * API ตัดคำตอบดิบของ KEX เหลือแค่นี้ (controller/web/tracking.py _trim) · วันเวลาเป็น "2026-10-10T13:33:53"
 */
export type KexTracking = {
  tracking_no: string
  carrier: string
  /** ขั้นปัจจุบันใน steps (เริ่มที่ 0 — ส่งสำเร็จแล้ว = ขั้นสุดท้าย) */
  current_idx: number | null
  /** ขั้นของแถบความคืบหน้า: รับแล้ว / ระหว่างขนส่ง / กำลังส่ง / สำเร็จ */
  steps: { code: string; desc: string }[]
  last_status: string | null
  last_status_code: string | null
  last_datetime: string | null
  delivered: boolean
  shipment: {
    booking_no: string | null
    con_type: string | null
    pickup_date: string | null
    /** วันที่คาดว่าจะส่งถึง — KEX ส่งมาเป็นข้อความไทยแล้ว ("04 ก.พ. 2569") */
    edt: string | null
    org_province: string | null
    dest_province: string | null
    dest_postcode: string | null
    desc_location: string | null
    /** ชื่อผู้รับ — KEX ปิดบางตัวอักษรมาแล้ว */
    r_name: string | null
    sender: string | null
    paid_by: string | null
    cod_amount: number | null
  }
  /** รูปหลักฐานการส่ง (ePOD) — URL ภายนอกของ KEX */
  epod_photo: string[]
  /** เหตุการณ์ทั้งหมด ล่าสุดอยู่บนสุด */
  events: {
    datetime: string | null
    date: string | null
    time: string | null
    code: string | null
    group: string | null
    desc: string | null
    location: string | null
    courier_name: string | null
  }[]
}
