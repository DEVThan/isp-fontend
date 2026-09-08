/**
 * model.ts — รูปร่างข้อมูลของหน้าจัดการสถานะ KM Protocall
 *
 * ชื่อฟิลด์ยึดตามคอลัมน์ในตาราง status_km_protocall ที่ API ส่งมาตรง ๆ (snake_case)
 * จะได้ไม่ต้องแปลงชื่อไปกลับสองทาง
 */

/** ค่า active_status ที่ถือว่าสถานะ KM Protocall เปิดใช้งาน — ตรงกับ _ACTIVE ฝั่ง API */
export const PROTOCALL_ACTIVE = "active"

/** ค่าที่ใช้แทน "ไม่เปิดใช้งาน" ในตัวกรอง — ในฐานข้อมูลอาจเป็นค่าอื่นก็ได้ จึงเทียบด้วย isKmProtocallActive() */
export const PROTOCALL_INACTIVE = "inactive"

/**
 * หนึ่งแถวในตาราง status_km_protocall ตามที่ POST /api/web/status-kmprotocall-get-list คืนมา
 *
 * id เป็นตัวเลข (คอลัมน์ identity ฐานข้อมูลออกให้เอง) ไม่ใช่สตริงรหัสแบบหน้าสิทธิ์ผู้ใช้
 * ตอน add จึงไม่ต้องส่ง id ไป (ส่ง 0)
 */
export type KmProtocall = {
  id: number
  name: string
  detail: string | null
  active_status: string
}

/** สถานะ KM Protocall นี้เปิดใช้งานอยู่ไหม */
export function isKmProtocallActive(protocall: KmProtocall) {
  return protocall.active_status === PROTOCALL_ACTIVE
}

/**
 * ผลลัพธ์ของ POST /api/web/status-kmprotocall-get-list — API ค้นหา/แบ่งหน้าให้ตั้งแต่ฝั่งเซิร์ฟเวอร์
 * total คือจำนวนหลังกรองแล้ว ไม่ใช่จำนวนทั้งตาราง
 */
export type KmProtocallList = {
  statuskmprotocalls: KmProtocall[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

/** ตัวเลือกสถานะ KM Protocall จาก POST /api/web/status-kmprotocall-get-option — เฉพาะที่ active */
export type KmProtocallOption = {
  id: number
  name: string
}

/** ปุ่มไหนเป็นคนเปิดฟอร์ม — ค่าเดียวกับ action ที่ POST /api/web/status-kmprotocall-action รับ */
export type KmProtocallFormMode = "add" | "edit"

/** ค่าที่ฟอร์มถืออยู่และส่งไปบันทึก — ชื่อฟิลด์ตามคอลัมน์ในตาราง status_km_protocall */
export type KmProtocallFormValues = {
  name: string
  detail: string
  active_status: string
}

/**
 * ผลของ POST /api/web/status-kmprotocall-delete — คืนมาแค่แถวที่หายไป
 * (ตารางนี้เป็นทะเบียนชื่อล้วน ไม่มีตารางไหนอ้างชื่อจากมัน เส้นลบจึงไม่ต้องนับของที่ค้างใช้อยู่)
 */
export type KmProtocallDeleted = {
  id: number
  name: string
}
