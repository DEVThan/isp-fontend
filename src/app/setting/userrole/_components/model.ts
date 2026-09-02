/**
 * model.ts — รูปร่างข้อมูลของหน้าจัดการสิทธิ์ผู้ใช้
 *
 * ชื่อฟิลด์ยึดตามคอลัมน์ในตาราง user_role ที่ API ส่งมาตรง ๆ (snake_case)
 * จะได้ไม่ต้องแปลงชื่อไปกลับสองทาง
 */

/** ค่า active_status ที่ถือว่าสิทธิ์เปิดใช้งาน — ตรงกับ _ACTIVE ฝั่ง API */
export const ROLE_ACTIVE = "active"

/** ค่าที่ใช้แทน "ไม่เปิดใช้งาน" ในตัวกรอง — ในฐานข้อมูลอาจเป็นค่าอื่นก็ได้ จึงเทียบด้วย isRoleActive() */
export const ROLE_INACTIVE = "inactive"

/**
 * หนึ่งแถวในตาราง user_role ตามที่ POST /api/web/userrole-get-list คืนมา
 *
 * id เป็นสตริงรูปแบบ UR<ปีเดือน>-<ลำดับ> (เช่น "UR202606-001") ไม่ใช่ตัวเลข
 * permission_menus ในฐานข้อมูลเก็บเป็นสตริง '{"1","2"}' แต่ API แตกเป็น array ให้แล้ว
 */
export type UserRole = {
  id: string
  rolename: string
  detail: string | null
  permission_menus: string[]
  active_status: string
}

/** สิทธิ์นี้เปิดใช้งานอยู่ไหม */
export function isRoleActive(role: UserRole) {
  return role.active_status === ROLE_ACTIVE
}

/**
 * ผลลัพธ์ของ POST /api/web/userrole-get-list — API ค้นหา/แบ่งหน้าให้ตั้งแต่ฝั่งเซิร์ฟเวอร์
 * total คือจำนวนหลังกรองแล้ว ไม่ใช่จำนวนทั้งตาราง
 */
export type UserRoleList = {
  userroles: UserRole[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

/** ตัวเลือกสิทธิ์จาก POST /api/web/userrole-get-option — เฉพาะที่ active */
export type UserRoleOption = {
  id: string
  rolename: string
}

/** เมนูที่เอามาให้ติ๊กเลือกสิทธิ์ — ดึงจากเส้นของหน้าเมนู เอาเฉพาะที่ฟอร์มนี้ใช้ */
export type MenuChoice = {
  id: number
  name: string
  code: string
  /** 0 หรือ null = เมนูหลัก ใช้จัดกลุ่มเมนูลูกไว้ใต้แม่ */
  parent_id: number | null
  active_status: string
}

/** ปุ่มไหนเป็นคนเปิดฟอร์ม — ค่าเดียวกับ action ที่ POST /api/web/userrole-action รับ */
export type RoleFormMode = "add" | "edit"

/** ค่าที่ฟอร์มถืออยู่และส่งไปบันทึก — ชื่อฟิลด์ตามคอลัมน์ในตาราง user_role */
export type RoleFormValues = {
  rolename: string
  detail: string
  /** id ของเมนูที่ให้สิทธิ์ — ส่งเป็น array ของตัวเลขให้ API */
  permission_menus: number[]
  active_status: string
}

/**
 * ผลของ POST /api/web/userrole-delete — แถวที่หายไป พร้อมจำนวนผู้ใช้ที่ยังผูกกับสิทธิ์นี้อยู่
 * (API ลบเฉพาะแถวใน user_role ไม่ได้แตะ user_authen คนที่ค้างอยู่จะไม่เหลือเมนูเลย)
 */
export type UserRoleDeleted = {
  id: string
  rolename: string
  users: number
}
