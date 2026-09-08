/**
 * model.ts — รูปร่างข้อมูลของหน้าจัดการสถานะ KM
 *
 * ชื่อฟิลด์ยึดตามคอลัมน์ในตาราง status_km ที่ API ส่งมาตรง ๆ (snake_case)
 * จะได้ไม่ต้องแปลงชื่อไปกลับสองทาง
 */

/** ค่า active_status ที่ถือว่าสถานะ KM เปิดใช้งาน — ตรงกับ _ACTIVE ฝั่ง API */
export const KM_ACTIVE = "active"

/** ค่าที่ใช้แทน "ไม่เปิดใช้งาน" ในตัวกรอง — ในฐานข้อมูลอาจเป็นค่าอื่นก็ได้ จึงเทียบด้วย isStatusKmActive() */
export const KM_INACTIVE = "inactive"

/**
 * หนึ่งแถวในตาราง status_km ตามที่ POST /api/web/status-km-get-list คืนมา
 *
 * id เป็นตัวเลข (คอลัมน์ identity ฐานข้อมูลออกให้เอง) ไม่ใช่สตริงรหัสแบบหน้าสิทธิ์ผู้ใช้
 * ตอน add จึงไม่ต้องส่ง id ไป (ส่ง 0)
 */
export type StatusKm = {
  id: number
  name: string
  detail: string | null
  active_status: string
}

/** สถานะ KM นี้เปิดใช้งานอยู่ไหม */
export function isStatusKmActive(km: StatusKm) {
  return km.active_status === KM_ACTIVE
}

/**
 * ผลลัพธ์ของ POST /api/web/status-km-get-list — API ค้นหา/แบ่งหน้าให้ตั้งแต่ฝั่งเซิร์ฟเวอร์
 * total คือจำนวนหลังกรองแล้ว ไม่ใช่จำนวนทั้งตาราง
 */
export type StatusKmList = {
  statuskms: StatusKm[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

/** ตัวเลือกสถานะ KM จาก POST /api/web/status-km-get-option — เฉพาะที่ active */
export type StatusKmOption = {
  id: number
  name: string
}

/** ปุ่มไหนเป็นคนเปิดฟอร์ม — ค่าเดียวกับ action ที่ POST /api/web/status-km-action รับ */
export type StatusKmFormMode = "add" | "edit"

/** ค่าที่ฟอร์มถืออยู่และส่งไปบันทึก — ชื่อฟิลด์ตามคอลัมน์ในตาราง status_km */
export type StatusKmFormValues = {
  name: string
  detail: string
  active_status: string
}

/**
 * ผลของ POST /api/web/status-km-delete — คืนมาแค่แถวที่หายไป
 * (ตารางนี้เป็นทะเบียนชื่อล้วน ไม่มีตารางไหนอ้างชื่อจากมัน เส้นลบจึงไม่ต้องนับของที่ค้างใช้อยู่)
 */
export type StatusKmDeleted = {
  id: number
  name: string
}
