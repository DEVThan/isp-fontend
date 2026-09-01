/**
 * model.ts — รูปร่างข้อมูลของหน้าจัดการเมนู
 *
 * ชื่อฟิลด์ยึดตามที่ API ส่งมาตรง ๆ (snake_case ตามคอลัมน์ในตาราง menus)
 * จะได้ไม่ต้องแปลงชื่อไปกลับสองทาง
 */

/** ค่า active_status ที่ถือว่าเมนูเปิดใช้งาน — ตรงกับ _ACTIVE ฝั่ง API */
export const MENU_ACTIVE = "active"

/** ค่าที่ใช้แทน "ไม่เปิดใช้งาน" ในตัวกรอง — ในฐานข้อมูลอาจเป็นค่าอื่นก็ได้ จึงเทียบด้วย isMenuActive() */
export const MENU_INACTIVE = "inactive"

/** หนึ่งแถวในตาราง menus ตามที่ GET /api/web/menu-get-all คืนมา */
export type Menu = {
  id: number
  name: string
  path: string
  icon: string
  code: string
  sort_order: number
  parent_id: number | null
  detail: string | null
  active_status: string
}

/** เมนูนี้เปิดใช้งานอยู่ไหม */
export function isMenuActive(menu: Menu) {
  return menu.active_status === MENU_ACTIVE
}

/**
 * ผลลัพธ์ของ POST /api/web/menu-get-all — API ค้นหา/แบ่งหน้าให้ตั้งแต่ฝั่งเซิร์ฟเวอร์
 * total คือจำนวนหลังกรอง search แล้ว ไม่ใช่จำนวนทั้งตาราง
 */
export type MenuList = {
  menus: Menu[]
  total: number
  page: number
  per_page: number
  total_pages: number
}
