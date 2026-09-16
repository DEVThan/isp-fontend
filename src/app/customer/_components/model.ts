/**
 * model.ts — รูปร่างข้อมูลของหน้าจัดการลูกค้า
 *
 * ชื่อฟิลด์ยึดตามคอลัมน์ในตาราง customer (เอกพจน์ — ไม่ใช่ customers) ที่ API ส่งมาตรง ๆ (snake_case)
 * จะได้ไม่ต้องแปลงชื่อไปกลับสองทาง · คอลัมน์ที่ API คืนมาดูได้ที่ _ROW_COLS ใน controller/web/customer.py
 */

/** ค่าที่คอลัมน์ gender รับ — ตรงกับ _GENDERS ฝั่ง API · เก็บเป็นภาษาอังกฤษ หน้าจอแปลตามภาษาเอง */
export const CUSTOMER_MALE = "male"
export const CUSTOMER_FEMALE = "female"

/**
 * ค่าไทยของแถวเก่า ("ชาย" / "หญิง") → ค่าอังกฤษที่ API รับ
 * แถวเดิมทั้งตารางเก็บเป็นไทย และงาน batch ภายนอกอาจเขียนไทยกลับมาอีก จึงต้องอ่านได้ทั้งสองแบบเสมอ
 * ค่าอื่นที่ไม่รู้จักคืนตามเดิม (ให้ API เป็นคนตอบ 400 แทนที่จะทิ้งค่าไปเงียบ ๆ)
 */
export function normalizeGender(gender: string | null | undefined): string {
  const value = (gender ?? "").trim()
  if (value === "ชาย" || value.toLowerCase() === CUSTOMER_MALE) return CUSTOMER_MALE
  if (value === "หญิง" || value.toLowerCase() === CUSTOMER_FEMALE) return CUSTOMER_FEMALE
  return value
}

/**
 * หนึ่งแถวในตาราง customer ตามที่ POST /api/web/customer-get-list คืนมา
 *
 * id เป็นตัวเลขจาก sequence (customer_id_seq) — ตอน add ส่ง 0 ฐานข้อมูลออกเลขให้เอง
 * tel เป็นคอลัมน์เดียวที่บังคับ และห้ามซ้ำ (unique index customer_tel_key)
 * ตารางนี้ไม่มี active_status — ไม่มีสถานะเปิด/ปิด และไม่มีตัวกรองสถานะ
 */
export type Customer = {
  id: number
  tel: string

  // --- text ไม่บังคับ ไม่จำกัดความยาว (_TEXT ฝั่ง API) — ส่งค่าว่างไป API เก็บเป็น NULL ---
  name: string | null
  address: string | null
  /** ตำบล/แขวง */
  subdistrict: string | null
  /** อำเภอ/เขต */
  district: string | null
  province: string | null
  zipcode: string | null
  /** CUSTOMER_MALE / CUSTOMER_FEMALE หรือ null — แถวเก่าอาจเป็น "ชาย" / "หญิง" อ่านผ่าน normalizeGender() */
  gender: string | null
  email: string | null

  // --- อ่านอย่างเดียว (_READONLY ฝั่ง API) — ยอดสรุปจากคำสั่งซื้อ API ไม่รับค่าพวกนี้จาก body ---
  /** "2026-09-16 15:01:18" */
  first_order_date: string | null
  last_order_date: string | null
  order_count: number | null
  line_count: number | null
  /** numeric มาเป็นข้อความ เช่น "999.0" */
  total_amount: string | null
  /** เลขลูกค้าจากระบบ Protocall */
  protocall_contact_id: string | number | null
}

/**
 * ผลลัพธ์ของ POST /api/web/customer-get-list — API ค้นหา/แบ่งหน้าให้ตั้งแต่ฝั่งเซิร์ฟเวอร์
 * total คือจำนวนหลังกรองแล้ว ไม่ใช่จำนวนทั้งตาราง (ทั้งตารางราว 99,000 แถว)
 */
export type CustomerList = {
  customers: Customer[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

/** ปุ่มไหนเป็นคนเปิดฟอร์ม — ค่าเดียวกับ action ที่ POST /api/web/customer-action รับ */
export type CustomerFormMode = "add" | "edit"

/** ค่าที่ฟอร์มถืออยู่และส่งไปบันทึก — ชื่อฟิลด์ตามคอลัมน์ในตาราง customer
 *  tel บังคับและห้ามซ้ำ (API เช็คให้อีกชั้น ตอบ 400 "tel already exists")
 *  ฟิลด์ที่ไม่ได้กรอกส่งเป็นสตริงว่าง ไม่ใช่ undefined — API เขียนทับทุกฟิลด์ทุกครั้งที่บันทึก
 *  ยอดสรุปคำสั่งซื้อไม่อยู่ในนี้ (อ่านอย่างเดียว) */
export type CustomerFormValues = {
  tel: string
  name: string
  address: string
  subdistrict: string
  district: string
  province: string
  zipcode: string
  gender: string
  email: string
}

/**
 * ผลของ POST /api/web/customer-delete — คืนมาแค่แถวที่หายไป
 * ลูกค้าที่มี SO อ้างถึงอยู่ API ไม่ลบให้ (ตอบ 400 "Customer is used by N sales order(s)")
 * เพราะ so.customer_id เป็น on delete set null — ลบไปแล้ว SO จะหลุดเจ้าของเงียบ ๆ
 */
export type CustomerDeleted = {
  id: number
  tel: string
  name: string | null
}
