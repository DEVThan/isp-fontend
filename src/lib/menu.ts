import type { NavChild, NavGroup, NavItem } from "@/lib/nav"

/**
 * menu.ts — ดึงเมนูของผู้ใช้จาก API (ฝั่งเซิร์ฟเวอร์เท่านั้น)
 *
 * รูปร่างข้อมูลตามตาราง menus ที่ระบบพี่น้อง (softtechnw-stock) ใช้อยู่:
 * id / name / path / icon / code / sort_order / parent_id / detail
 *
 * เรียกจาก server component จึงต้องใช้ URL เต็มของ API (path สัมพัทธ์ "/api/web"
 * ใช้ได้เฉพาะใน browser ที่วิ่งผ่าน proxy ของ Next)
 */
const API_BASE_URL =
  process.env.API_BASE_URL ?? "http://localhost:8081/api/web"

export type ApiMenu = {
  id: number
  name: string
  path: string
  /** ชื่อไอคอนของ lucide — ในฐานข้อมูลมีทั้งที่ว่างและที่ไม่ตรงกับไอคอนจริง */
  icon: string
  /** คีย์สำหรับแปล — ถ้ามีใน messages จะใช้แทน name */
  code: string
  sort_order: number
  /** 0 หรือ null = เมนูหลัก */
  parent_id: number | null
  detail: string | null
}

/**
 * POST /api/web/get-menu — ส่ง id เมนูที่ผู้ใช้มีสิทธิ์ (session.menus) แล้วรับรายละเอียดกลับ
 *
 * API กรอง active_status = active ให้แล้ว และตอบ 404 (status:false) เมื่อไม่เจอเมนูสักอัน
 * ทุกกรณีที่ไม่ได้ข้อมูลจะคืน null เพื่อให้ผู้เรียกถอยไปใช้เมนูในโค้ดแทน
 */
export async function fetchMenus(ids: number[]): Promise<ApiMenu[] | null> {
  if (ids.length === 0) return []

  // console.log("fetchMenus response status:", ids) // Debugging line to check the response status
  try {
    const res = await fetch(`${API_BASE_URL}/menu-get`, {
      method: "POST",
      // เมนูต้องสดทุกครั้งที่โหลดหน้า — สิทธิ์เปลี่ยนแล้วต้องเห็นทันที
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: ids }),
    })

    const envelope = await res.json().catch(() => null)
    if (!envelope?.status || !Array.isArray(envelope.result)) return null
    return envelope.result as ApiMenu[]
  } catch {
    // เมนูดึงไม่ได้ต้องไม่ทำให้ทั้งหน้าพัง — ผู้เรียกจะถอยไปใช้เมนูในโค้ดแทน
    return null
  }
}

/** เรียงตาม sort_order แล้วค่อยตาม id ให้ผลลัพธ์คงที่เสมอ */
const bySortOrder = (a: ApiMenu, b: ApiMenu) =>
  a.sort_order - b.sort_order || a.id - b.id

/**
 * แปลงแถวจาก API เป็นต้นเมนูของ sidebar
 * - เมนูลูกต่อ path กับแม่ ("/stockmaster" + "/vat") ตามแบบเดียวกับ softtechnw-stock
 * - ลูกที่แม่ไม่ได้อยู่ในสิทธิ์ด้วย จะถูกยกขึ้นเป็นเมนูหลัก ไม่งั้นผู้ใช้จะไม่เห็นเลย
 * - เมนูจาก API ไม่มีการแบ่งกลุ่ม จึงรวมเป็นกลุ่มเดียวไม่มีหัวข้อ
 */
export function toNavGroups(menus: ApiMenu[]): NavGroup[] {
  const byId = new Map(menus.map((m) => [m.id, m]))
  // parent_id = 0/null คือเมนูหลัก ส่วนลูกที่หาแม่ไม่เจอก็นับเป็นเมนูหลักด้วย
  const isParent = (m: ApiMenu) => !m.parent_id || !byId.has(m.parent_id)

  const items: NavItem[] = menus
    .filter(isParent)
    .sort(bySortOrder)
    .map((parent) => {
      const children: NavChild[] = menus
        .filter((m) => m.parent_id === parent.id)
        .sort(bySortOrder)
        .map((child) => ({
          code: child.code,
          name: child.name,
          url: `${parent.path}${child.path}`,
        }))

      return {
        code: parent.code,
        name: parent.name,
        url: parent.path,
        // ส่งไปแค่ชื่อ — sidebar (client) เป็นคนแปลงเป็นไอคอนจริง
        icon: parent.icon,
        children: children.length > 0 ? children : undefined,
      }
    })

  return items.length > 0 ? [{ items }] : []
}
