/**
 * model.ts — รูปร่างข้อมูลของหน้าจัดการผู้ขาย
 *
 * ชื่อฟิลด์ยึดตามคอลัมน์ในตาราง vendor ที่ API ส่งมาตรง ๆ (snake_case)
 * จะได้ไม่ต้องแปลงชื่อไปกลับสองทาง
 */

/** ค่า active_status ที่ถือว่าผู้ขายเปิดใช้งาน — ตรงกับ _ACTIVE ฝั่ง API */
export const VENDOR_ACTIVE = "active"

/** ค่าที่ใช้แทน "ไม่เปิดใช้งาน" ในตัวกรอง — ในฐานข้อมูลอาจเป็นค่าอื่นก็ได้ จึงเทียบด้วย isVendorActive() */
export const VENDOR_INACTIVE = "inactive"

/**
 * หนึ่งแถวในตาราง vendor ตามที่ POST /api/web/vendor-get-list คืนมา
 *
 * id เป็นตัวเลข (คอลัมน์ identity ฐานข้อมูลออกให้เอง) ไม่ใช่สตริงรหัสแบบหน้าสิทธิ์ผู้ใช้
 * ตอน add จึงไม่ต้องส่ง id ไป (ส่ง 0)
 *
 * ตารางนี้คอลัมน์เยอะกว่าทะเบียนอื่น: code กับ name เป็น not null (บังคับ)
 * ที่เหลือไม่บังคับ — API เก็บเป็นสตริงว่างให้เมื่อไม่ได้ส่งมา ไม่ใช่ null
 */
export type Vendor = {
  id: number
  code: string
  name: string
  email: string | null
  tel: string | null
  address: string | null
  remark: string | null
  /** รหัสผู้ส่งของฝั่งขนส่ง (คนละตัวกับ code ที่เป็นรหัสผู้ขาย)
   *  เก็บหลายขนส่งในคอลัมน์เดียวเป็น JSON string — อ่านด้วย parseSenderCodes() */
  sender_code: string | null
  active_status: string
}

/** ผู้ขายนี้เปิดใช้งานอยู่ไหม */
export function isVendorActive(vendor: Vendor) {
  return vendor.active_status === VENDOR_ACTIVE
}

/**
 * ผลลัพธ์ของ POST /api/web/vendor-get-list — API ค้นหา/แบ่งหน้าให้ตั้งแต่ฝั่งเซิร์ฟเวอร์
 * total คือจำนวนหลังกรองแล้ว ไม่ใช่จำนวนทั้งตาราง
 */
export type VendorList = {
  vendors: Vendor[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

/** ตัวเลือกผู้ขายจาก POST /api/web/vendor-get-option — เฉพาะที่ active
 *  มี code มาด้วยเพราะผู้ขายชื่อซ้ำกันได้ (API กันซ้ำแค่ code) ต้องมีรหัสไว้แยกใน dropdown */
export type VendorOption = {
  id: number
  code: string
  name: string
}

/** ปุ่มไหนเป็นคนเปิดฟอร์ม — ค่าเดียวกับ action ที่ POST /api/web/vendor-action รับ */
export type VendorFormMode = "add" | "edit"

/** ค่าที่ฟอร์มถืออยู่และส่งไปบันทึก — ชื่อฟิลด์ตามคอลัมน์ในตาราง vendor
 *  code กับ name บังคับ (คอลัมน์ not null) · code ห้ามซ้ำกับแถวอื่น API เช็คให้อีกชั้น
 *  ส่วน name ซ้ำได้ (ผู้ขายชื่อเดียวกันคนละสาขา ใช้ code แยก)
 *  ฟิลด์ที่ไม่ได้กรอกส่งเป็นสตริงว่าง ไม่ใช่ undefined — API เขียนทับทุกฟิลด์ทุกครั้งที่บันทึก */
export type VendorFormValues = {
  code: string
  name: string
  email: string
  tel: string
  address: string
  remark: string
  sender_code: string
  active_status: string
}

/** ความยาวสูงสุดของ code / name / email / tel — ตรงกับ _MAX_LEN ฝั่ง API (varchar(100))
 *  ใส่เป็น maxLength ให้ช่องกรอกด้วย เบราว์เซอร์จะได้กันไว้ก่อนที่ API จะตอบ 400 */
export const VENDOR_MAX_LEN = 100

/**
 * หนึ่งแถวของรหัสผู้ส่ง — ผู้ขายหนึ่งรายมีได้หลายขนส่ง แต่ละขนส่งมีรหัสผู้ส่งของตัวเอง
 * ทั้งหมดถูกเก็บรวมกันเป็น JSON string ในคอลัมน์เดียว (vendor.sender_code)
 * เพราะฝั่ง API ยังรับคอลัมน์นี้เป็นข้อความอิสระ ไม่มีตารางลูกให้เก็บ
 */
export type SenderCode = {
  /** ชื่อขนส่ง เช่น Kerry / Flash / ไปรษณีย์ไทย */
  shipping: string
  /** รหัสผู้ส่งที่ขนส่งรายนั้นออกให้ */
  sendercode: string
}

/**
 * อ่านค่าจากคอลัมน์ sender_code ให้เป็นรายการแถว
 *
 * ของเดิมในฐานข้อมูลเป็นข้อความเดี่ยว ๆ (เช่น "ISP") ไม่ใช่ JSON — แปลงไม่ได้ก็ต้องไม่ทิ้ง
 * ให้ถือเป็นหนึ่งแถวที่มีแต่รหัส ยังไม่รู้ว่าเป็นขนส่งเจ้าไหน ผู้ใช้ค่อยเติมเอง
 */
export function parseSenderCodes(raw: string | null | undefined): SenderCode[] {
  const text = (raw ?? "").trim()
  if (!text) return []

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    // ไม่ใช่ JSON = ข้อมูลเก่าก่อนเปลี่ยนมาเก็บเป็นตาราง
    return [{ shipping: "", sendercode: text }]
  }
  if (!Array.isArray(parsed)) {
    // JSON ที่ไม่ใช่ array (เช่นตัวเลขล้วน "123") ก็นับเป็นข้อมูลเก่าเหมือนกัน
    return [{ shipping: "", sendercode: text }]
  }

  return parsed.map((item) => {
    const row = (item ?? {}) as Partial<Record<keyof SenderCode, unknown>>
    return {
      shipping: typeof row.shipping === "string" ? row.shipping : "",
      sendercode: typeof row.sendercode === "string" ? row.sendercode : "",
    }
  })
}

/**
 * แปลงรายการแถวกลับเป็นค่าที่จะเก็บลงคอลัมน์ sender_code
 * แถวที่ว่างทั้งคู่ถูกตัดทิ้ง (ผู้ใช้กดเพิ่มแถวแล้วไม่ได้กรอก) · ไม่เหลือแถวเลย = เก็บค่าว่าง ไม่ใช่ "[]"
 */
export function serializeSenderCodes(rows: SenderCode[]): string {
  const filled = rows
    .map((row) => ({
      shipping: row.shipping.trim(),
      sendercode: row.sendercode.trim(),
    }))
    .filter((row) => row.shipping || row.sendercode)
  return filled.length ? JSON.stringify(filled) : ""
}

/**
 * ผลของ POST /api/web/vendor-delete — คืนมาแค่แถวที่หายไป
 * (ตารางนี้เป็นทะเบียนผู้ขายล้วน ไม่มีตารางไหนอ้างแถวจากมัน — item_master.vendor_name กับ
 *  products.supplier_name เก็บชื่อผู้ขายเป็นข้อความตรง ๆ เปลี่ยนชื่อที่นี่สองที่นั้นไม่เปลี่ยนตาม
 *  เส้นลบจึงไม่ต้องนับของที่ค้างใช้อยู่)
 */
export type VendorDeleted = {
  id: number
  code: string
  name: string
}
