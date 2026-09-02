/**
 * model.ts — รูปร่างข้อมูลของหน้าจัดการผู้ใช้งาน
 *
 * ชื่อฟิลด์ยึดตามคอลัมน์ในตาราง user_authen ที่ API ส่งมาตรง ๆ (snake_case)
 * จะได้ไม่ต้องแปลงชื่อไปกลับสองทาง — สังเกตว่าตารางนี้ใช้คอลัมน์ชื่อ status
 * (ไม่ใช่ active_status เหมือนตาราง menus / user_role)
 */

/** ค่า status ที่ถือว่าบัญชีเปิดใช้งาน — auth.login ฝั่ง API เช็คค่านี้เหมือนกัน */
export const USER_ACTIVE = "active"

/** ค่าที่ใช้แทน "ไม่เปิดใช้งาน" ในตัวกรอง — ในฐานข้อมูลอาจเป็นค่าอื่นก็ได้ จึงเทียบด้วย isUserActive() */
export const USER_INACTIVE = "inactive"

/**
 * หนึ่งแถวในตาราง user_authen ตามที่ POST /api/web/userauthen-get-all คืนมา
 *
 * API ไม่เคยส่ง password ออกมา · rolename ได้จากการ join user_role มาให้แล้ว
 * จะได้ไม่ต้องยิงถามทีละแถว (เป็น null เมื่อบัญชีนั้นยังไม่ได้กำหนดสิทธิ์)
 */
export type UserAuthen = {
  id: number
  username: string
  fullname: string | null
  /** id ของ user_role เช่น "UR202606-001" — ว่างได้ */
  role: string | null
  rolename: string | null
  email: string | null
  telephone: string | null
  status: string
}

/** บัญชีนี้เปิดใช้งานอยู่ไหม */
export function isUserActive(user: UserAuthen) {
  return user.status === USER_ACTIVE
}

/**
 * ผลลัพธ์ของ POST /api/web/userauthen-get-all — API ค้นหา/แบ่งหน้าให้ตั้งแต่ฝั่งเซิร์ฟเวอร์
 * total คือจำนวนหลังกรองแล้ว ไม่ใช่จำนวนทั้งตาราง
 */
export type UserAuthenList = {
  userauthens: UserAuthen[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

/** ตัวเลือกสิทธิ์จาก POST /api/web/userrole-get-option — เฉพาะสิทธิ์ที่ active */
export type RoleOption = {
  id: string
  rolename: string
}

/** ปุ่มไหนเป็นคนเปิดฟอร์ม — ค่าเดียวกับ action ที่ POST /api/web/userauthen-action รับ */
export type UserFormMode = "add" | "edit"

/** ค่าที่ฟอร์มถืออยู่และส่งไปบันทึก — ชื่อฟิลด์ตามคอลัมน์ในตาราง user_authen */
export type UserFormValues = {
  username: string
  /** เพิ่มใหม่ = บังคับ · แก้ไข = เว้นว่างไว้แปลว่าใช้รหัสเดิม (API ไม่ล้างทิ้ง) */
  password: string
  fullname: string
  /** id ของสิทธิ์ — ว่าง = ยังไม่กำหนดสิทธิ์ */
  role: string
  email: string
  telephone: string
  status: string
}

/** ผลของ POST /api/web/userauthen-delete — แถวที่หายไป */
export type UserAuthenDeleted = {
  id: number
  username: string
}
