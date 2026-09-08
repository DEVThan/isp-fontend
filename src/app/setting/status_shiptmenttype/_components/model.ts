/**
 * model.ts — รูปร่างข้อมูลของหน้าจัดการประเภทการจัดส่ง
 *
 * ชื่อฟิลด์ยึดตามคอลัมน์ในตาราง shiptment_type ที่ API ส่งมาตรง ๆ (snake_case)
 * จะได้ไม่ต้องแปลงชื่อไปกลับสองทาง
 *
 * ชื่อตารางสะกดว่า shiptment_type (ไม่ใช่ shipment_) ตามที่มีอยู่เดิมในฐานข้อมูล — ห้ามแก้ให้ถูก
 */

/** ค่า active_status ที่ถือว่าประเภทการจัดส่งเปิดใช้งาน — ตรงกับ _ACTIVE ฝั่ง API */
export const SHIPTMENT_ACTIVE = "active"

/** ค่าที่ใช้แทน "ไม่เปิดใช้งาน" ในตัวกรอง — ในฐานข้อมูลอาจเป็นค่าอื่นก็ได้ จึงเทียบด้วย isShiptmentTypeActive() */
export const SHIPTMENT_INACTIVE = "inactive"

/**
 * หนึ่งแถวในตาราง shiptment_type ตามที่ POST /api/web/status-shiptmenttype-get-list คืนมา
 *
 * id เป็นตัวเลข (คอลัมน์ identity ฐานข้อมูลออกให้เอง) ไม่ใช่สตริงรหัสแบบหน้าสิทธิ์ผู้ใช้
 * ตอน add จึงไม่ต้องส่ง id ไป (ส่ง 0)
 */
export type ShiptmentType = {
  id: number
  name: string
  detail: string | null
  active_status: string
}

/** ประเภทการจัดส่งนี้เปิดใช้งานอยู่ไหม */
export function isShiptmentTypeActive(type: ShiptmentType) {
  return type.active_status === SHIPTMENT_ACTIVE
}

/**
 * ผลลัพธ์ของ POST /api/web/status-shiptmenttype-get-list — API ค้นหา/แบ่งหน้าให้ตั้งแต่ฝั่งเซิร์ฟเวอร์
 * total คือจำนวนหลังกรองแล้ว ไม่ใช่จำนวนทั้งตาราง
 */
export type ShiptmentTypeList = {
  shiptmenttypes: ShiptmentType[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

/** ตัวเลือกประเภทการจัดส่งจาก POST /api/web/status-shiptmenttype-get-option — เฉพาะที่ active */
export type ShiptmentTypeOption = {
  id: number
  name: string
}

/** ปุ่มไหนเป็นคนเปิดฟอร์ม — ค่าเดียวกับ action ที่ POST /api/web/status-shiptmenttype-action รับ */
export type ShiptmentTypeFormMode = "add" | "edit"

/** ค่าที่ฟอร์มถืออยู่และส่งไปบันทึก — ชื่อฟิลด์ตามคอลัมน์ในตาราง shiptment_type */
export type ShiptmentTypeFormValues = {
  name: string
  detail: string
  active_status: string
}

/**
 * ผลของ POST /api/web/status-shiptmenttype-delete — แถวที่หายไป พร้อมจำนวนสินค้าที่ยังใช้ชื่อนี้อยู่
 * (products.shipment_type เก็บเป็นข้อความชื่อ ไม่ได้ผูก id กัน ลบทะเบียนชื่อแล้วแถวใน products ไม่เปลี่ยนตาม)
 */
export type ShiptmentTypeDeleted = {
  id: number
  name: string
  products: number
}
