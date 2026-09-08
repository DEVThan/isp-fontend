/**
 * model.ts — รูปร่างข้อมูลของหน้าจัดการสถานะ TV Program Footage
 *
 * ชื่อฟิลด์ยึดตามคอลัมน์ในตาราง status_tv_program_footage ที่ API ส่งมาตรง ๆ (snake_case)
 * จะได้ไม่ต้องแปลงชื่อไปกลับสองทาง
 */

/** ค่า active_status ที่ถือว่าสถานะ TV Program Footage เปิดใช้งาน — ตรงกับ _ACTIVE ฝั่ง API */
export const FOOTAGE_ACTIVE = "active"

/** ค่าที่ใช้แทน "ไม่เปิดใช้งาน" ในตัวกรอง — ในฐานข้อมูลอาจเป็นค่าอื่นก็ได้ จึงเทียบด้วย isTvFootageActive() */
export const FOOTAGE_INACTIVE = "inactive"

/**
 * หนึ่งแถวในตาราง status_tv_program_footage ตามที่ POST /api/web/status-tvprogramfootage-get-list คืนมา
 *
 * id เป็นตัวเลข (คอลัมน์ identity ฐานข้อมูลออกให้เอง) ไม่ใช่สตริงรหัสแบบหน้าสิทธิ์ผู้ใช้
 * ตอน add จึงไม่ต้องส่ง id ไป (ส่ง 0)
 */
export type TvFootage = {
  id: number
  name: string
  detail: string | null
  active_status: string
}

/** สถานะ TV Program Footage นี้เปิดใช้งานอยู่ไหม */
export function isTvFootageActive(footage: TvFootage) {
  return footage.active_status === FOOTAGE_ACTIVE
}

/**
 * ผลลัพธ์ของ POST /api/web/status-tvprogramfootage-get-list — API ค้นหา/แบ่งหน้าให้ตั้งแต่ฝั่งเซิร์ฟเวอร์
 * total คือจำนวนหลังกรองแล้ว ไม่ใช่จำนวนทั้งตาราง
 */
export type TvFootageList = {
  statustvprogramfootages: TvFootage[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

/** ตัวเลือกสถานะ TV Program Footage จาก POST /api/web/status-tvprogramfootage-get-option — เฉพาะที่ active */
export type TvFootageOption = {
  id: number
  name: string
}

/** ปุ่มไหนเป็นคนเปิดฟอร์ม — ค่าเดียวกับ action ที่ POST /api/web/status-tvprogramfootage-action รับ */
export type TvFootageFormMode = "add" | "edit"

/** ค่าที่ฟอร์มถืออยู่และส่งไปบันทึก — ชื่อฟิลด์ตามคอลัมน์ในตาราง status_tv_program_footage */
export type TvFootageFormValues = {
  name: string
  detail: string
  active_status: string
}

/**
 * ผลของ POST /api/web/status-tvprogramfootage-delete — คืนมาแค่แถวที่หายไป
 * (ตารางนี้เป็นทะเบียนชื่อล้วน ไม่มีตารางไหนอ้างชื่อจากมัน เส้นลบจึงไม่ต้องนับของที่ค้างใช้อยู่)
 */
export type TvFootageDeleted = {
  id: number
  name: string
}
