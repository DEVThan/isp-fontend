/**
 * model.ts — รูปร่างข้อมูลของหน้าจัดการช่องทาง Broadcast
 *
 * ชื่อฟิลด์ยึดตามคอลัมน์ในตาราง broadcast (เดิมชื่อ chanels) ที่ API ส่งมาตรง ๆ (snake_case)
 * จะได้ไม่ต้องแปลงชื่อไปกลับสองทาง · คอลัมน์ที่ API คืนมาดูได้ที่ _ROW_COLS ใน controller/web/broadcast.py
 */

/** ค่า active_status ที่ถือว่าช่องทางเปิดใช้งาน — ตรงกับ _ACTIVE ฝั่ง API */
export const BROADCAST_ACTIVE = "active"

/** ค่าที่ใช้แทน "ไม่เปิดใช้งาน" ในตัวกรอง — API นับทุกค่าที่ไม่ใช่ active เป็น inactive จึงเทียบด้วย isBroadcastActive() */
export const BROADCAST_INACTIVE = "inactive"

/**
 * หนึ่งแถวในตาราง broadcast ตามที่ POST /api/web/broadcast-get-list คืนมา
 *
 * id เป็นตัวเลข (identity ฐานข้อมูลออกให้เอง) — ตอน add ส่ง 0
 * name / logo / tel / email เป็น not null ในตาราง แต่บังคับแค่ name
 * tel / email / logo ไม่บังคับ (ผู้ใช้ขอ 2026-09-16) — ว่างก็เก็บเป็น "" ไม่ใช่ null · detail ไม่บังคับ
 * logo มาจากการอัปโหลด — ตอนเพิ่มต้องบันทึกแถวให้ได้ id ก่อนแล้วค่อยอัปโหลด
 * ไม่มีตารางไหนอ้างแถวจากที่นี่ (so.channel_name เก็บชื่อเป็นข้อความของตัวเอง)
 */
export type Broadcast = {
  id: number
  /** ชื่อช่องทาง — API กันชื่อซ้ำเอง (ไม่สนตัวพิมพ์เล็ก/ใหญ่) เพราะตารางไม่มี unique index */
  name: string
  /** path โลโก้ที่อัปโหลดไว้ — /uploads/broadcast/{id}/logo/{ชื่อไฟล์} (varchar 100)
   *  แถวเก่าอาจเป็น path อื่นที่พิมพ์เอง · "" = ยังไม่มีรูป (แถวที่เพิ่มแล้วอัปโหลดไม่สำเร็จ) */
  logo: string
  detail: string | null
  tel: string
  email: string
  active_status: string
}

/** ช่องทางนี้เปิดใช้งานอยู่ไหม */
export function isBroadcastActive(broadcast: Broadcast) {
  return broadcast.active_status === BROADCAST_ACTIVE
}

/**
 * ผลลัพธ์ของ POST /api/web/broadcast-get-list — API ค้นหา/กรอง/แบ่งหน้าให้ตั้งแต่ฝั่งเซิร์ฟเวอร์
 * total คือจำนวนหลังกรองแล้ว ไม่ใช่จำนวนทั้งตาราง
 */
export type BroadcastList = {
  broadcasts: Broadcast[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

/** ตัวเลือกช่องทางจาก POST /api/web/broadcast-get-option — เฉพาะที่ active (มี logo ติดมาไว้โชว์คู่ชื่อ) */
export type BroadcastOption = {
  id: number
  name: string
  logo: string
}

/** ปุ่มไหนเป็นคนเปิดฟอร์ม — ค่าเดียวกับ action ที่ POST /api/web/broadcast-action รับ */
export type BroadcastFormMode = "add" | "edit"

/** ค่าที่ฟอร์มถืออยู่และส่งไปบันทึก — ชื่อฟิลด์ตามคอลัมน์ในตาราง broadcast
 *  ส่งไปครบทุกฟิลด์เสมอ — API เขียนทับทั้งแถวทุกครั้งที่บันทึก */
export type BroadcastFormValues = {
  name: string
  logo: string
  detail: string
  tel: string
  email: string
  active_status: string
}

/** ช่องข้อความ varchar → ความยาวสูงสุดของคอลัมน์ — ตรงกับ _REQUIRED + _OPTIONAL ฝั่ง API
 *  ใส่เป็น maxLength ให้ช่องกรอก เบราว์เซอร์จะได้กันไว้ก่อนที่ API จะตอบ 400
 *  (logo ไม่อยู่ในนี้ — เป็นช่องเลือกรูป) */
export const BROADCAST_MAX_LEN = {
  name: 100,
  tel: 50,
  email: 255,
} as const

export type BroadcastTextField = keyof typeof BROADCAST_MAX_LEN

/** ช่องบังคับที่ฟอร์มตรวจ — เหลือแค่ชื่อ (tel / email / logo ไม่บังคับแล้ว) */
export type BroadcastRequiredField = "name"

/** ผลของ POST /api/web/broadcast-delete — คืนมาแค่แถวที่หายไป (ไม่มีของค้างใช้ให้นับ) */
export type BroadcastDeleted = {
  id: number
  name: string
}
