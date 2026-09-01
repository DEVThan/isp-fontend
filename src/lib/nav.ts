import {
  Building2,
  Circle,
  Cog,
  CreditCard,
  Import,
  Landmark,
  LayoutDashboard,
  LifeBuoy,
  ListTree,
  Package,
  PackageOpen,
  Percent,
  ReceiptText,
  RefreshCw,
  Router,
  Settings,
  ShieldCheck,
  Truck,
  Users,
  type LucideIcon,
} from "lucide-react"
import type { Messages } from "next-intl"

/** หน้าแรกหลังล็อกอิน — ส่วนอื่น ๆ เป็นโฟลเดอร์แยกที่ระดับเดียวกัน (/customers, /invoices, …) */
export const DASHBOARD_ROOT = "/dashboard"

/** ทุก key อ้างถึง messages/<locale>.json ใต้ namespace "nav" — พิมพ์ผิดแล้วไม่ compile */
export type NavKey = keyof Messages["nav"]

/**
 * menuId = เลขใน user_role.permission_menus ที่ API ส่งกลับมาตอนล็อกอิน (session.menus)
 *
 * ⚠️ เลขชุดข้างล่างยังเป็นการเดาตามลำดับเมนู — ตาราง menus จริงตอนนี้เก็บเมนูของระบบ
 *    Stock (id 1-14) ยังไม่มีแถวของ ISP ต้นเมนูในไฟล์นี้จึงใช้เฉพาะตอน API ล่ม
 *    พอมีแถวของ ISP แล้วให้แก้เลขให้ตรงที่ไฟล์นี้ที่เดียว
 */
export type MenuId = string

/**
 * ป้ายชื่อเมนูมาได้ 2 ทาง
 * - `key`  : เมนูที่ประกาศไว้ในไฟล์นี้ — มีคำแปลใน messages แน่นอน (compile ตรวจให้)
 * - `code` : เมนูที่มาจาก API — ถ้ามีคำแปลของ code นี้ก็ใช้ ไม่มีก็ใช้ `name` จากฐานข้อมูล
 */
export type NavLabel = { key: NavKey } | { code: string; name: string }

/** ใช้เป็น key ของ React และเวลา debug */
export function navId(label: NavLabel) {
  return "key" in label ? label.key : label.code
}

export type NavChild = NavLabel & {
  url: string
  menuId?: MenuId
}

/**
 * ชื่อไอคอน ไม่ใช่ตัวคอมโพเนนต์ — เมนูถูกสร้างบน server แล้วส่งเข้า sidebar ที่เป็น
 * client component ซึ่งส่งได้แต่ข้อมูลธรรมดา (ฟังก์ชันข้ามไปไม่ได้)
 * ฝั่ง sidebar ค่อยแปลงกลับเป็นไอคอนจริงด้วย resolveIcon()
 */
export type IconName = string

export type NavItem = NavLabel & {
  url: string
  icon?: IconName
  badge?: string
  menuId?: MenuId
  children?: NavChild[]
}

export type NavGroup = {
  /** หัวข้อกลุ่ม — เมนูจาก API ไม่มีการแบ่งกลุ่ม จึงไม่มีหัวข้อ */
  key?: NavKey
  items: NavItem[]
}

/* ────────────────────────────────────────────────────────────────────────────
 * เมนูทั้งหมดมาจาก API แล้ว (POST /api/web/get-menu — ดู src/lib/menu.ts)
 * ต้นเมนูที่เคยประกาศไว้ในโค้ดพร้อมตัวช่วยของมัน เก็บไว้เป็นคอมเมนต์ด้านล่าง
 * ยังไม่ลบ เผื่อต้องย้อนดูว่าเมนูของ ISP ควรมีอะไรบ้างตอน seed ตาราง menus
 * ──────────────────────────────────────────────────────────────────────────── */
// /**
//  * เมนูที่ประกาศไว้ในไฟล์นี้ — บังคับให้มี `key` เสมอ คำแปลจึงถูกตรวจตอน compile
//  * (ต่างจาก NavItem/NavGroup ข้างบนที่กว้างกว่า เพราะต้องรองรับเมนูจาก API ด้วย)
//  */
// type StaticNavChild = { key: NavKey; url: string; menuId: MenuId }
//
// type StaticNavItem = {
//   key: NavKey
//   url: string
//   icon: IconName
//   badge?: string
//   menuId: MenuId
//   children?: StaticNavChild[]
// }
//
// type StaticNavGroup = { key: NavKey; items: StaticNavItem[] }

/**
 * ชื่อไอคอนในฐานข้อมูล -> ไอคอนจริง (ชื่อไม่ตรงอันไหนใช้ตัวสำรอง)
 *
 * คอลัมน์ menus.icon เขียนได้ 2 แบบ: ชื่อไอคอนของ lucide ตรง ๆ ("Package")
 * หรือชื่อโค้ดของเมนูเอง ("vat", "company") — รองรับทั้งคู่ที่นี่
 */
export const iconByName: Record<string, LucideIcon> = {
  LayoutDashboard,
  Users,
  CreditCard,
  LifeBuoy,
  Settings,
  Router,
  Package,
  PackageOpen,
  Import,
  Truck,
  RefreshCw,
  Cog,
  ReceiptText,
  // ชื่อที่ฐานข้อมูลเขียนเป็นโค้ดเมนู ไม่ใช่ชื่อไอคอนของ lucide
  vat: Percent,
  company: Building2,
  bankaccount: Landmark,
  menu: ListTree,
  userrole: ShieldCheck,
}

/** ชื่อไอคอนที่ไม่มีในตาราง (หรือเมนูที่ไม่ได้ตั้งไอคอน) ใช้ตัวนี้แทน */
export const fallbackIcon = Circle

// export const navGroups: StaticNavGroup[] = [
//   {
//     key: "overview",
//     items: [{ key: "dashboard", url: DASHBOARD_ROOT, icon: "LayoutDashboard", menuId: "1" }],
//   },
//   {
//     key: "management",
//     items: [
//       {
//         key: "customers",
//         url: "/customers",
//         icon: "Users",
//         menuId: "2",
//         children: [
//           { key: "customersList", url: "/customers", menuId: "3" },
//           { key: "packages", url: "/customers/packages", menuId: "4" },
//           { key: "areas", url: "/customers/areas", menuId: "5" },
//         ],
//       },
//       {
//         key: "invoices",
//         url: "/invoices",
//         icon: "CreditCard",
//         badge: "8",
//         menuId: "6",
//         children: [
//           { key: "invoicesAll", url: "/invoices", menuId: "7" },
//           { key: "payments", url: "/invoices/payments", menuId: "8" },
//         ],
//       },
//       { key: "tickets", url: "/tickets", icon: "LifeBuoy", badge: "3", menuId: "9" },
//     ],
//   },
//   {
//     key: "system",
//     items: [
//       {
//         key: "settings",
//         url: "/settings",
//         icon: "Settings",
//         menuId: "10",
//         children: [
//           { key: "settingsGeneral", url: "/settings", menuId: "11" },
//           { key: "settingsUsers", url: "/settings/users", menuId: "12" },
//         ],
//       },
//     ],
//   },
// ]
//
// /**
//  * กรองเมนูตามสิทธิ์ของผู้ใช้ (session.menus)
//  *
//  * - เมนูแม่โผล่เมื่อตัวเองมีสิทธิ์ หรือมีเมนูย่อยที่มีสิทธิ์อย่างน้อยหนึ่งอัน
//  * - หัวข้อกลุ่มที่ไม่เหลือเมนูเลย จะไม่ถูกส่งกลับมา
//  * - menus เป็น undefined = ไม่รู้สิทธิ์ (cookie เก่าที่ยังไม่มีฟิลด์นี้) ให้เห็นทั้งหมด
//  *   ส่วน [] คือ role ที่ไม่ได้รับสิทธิ์เมนูใดเลย ต้องไม่เห็นอะไร
//  */
// export function visibleNavGroups(menus: MenuId[] | undefined): NavGroup[] {
//   if (!menus) return navGroups
//
//   const allowed = new Set(menus)
//
//   return navGroups
//     .map((group) => ({
//       ...group,
//       items: group.items
//         .map((item) => {
//           const children = item.children?.filter(
//             (c) => c.menuId && allowed.has(c.menuId)
//           )
//           return { ...item, children: children?.length ? children : undefined }
//         })
//         .filter((item) => (item.menuId && allowed.has(item.menuId)) || item.children),
//     }))
//     .filter((group) => group.items.length > 0)
// }

export const brand = {
  icon: Router,
}

/** เมนูหลักถือว่า active เมื่ออยู่ที่ตัวมันเองหรือหน้าลูก */
export function isItemActive(item: NavItem, pathname: string) {
  // แดชบอร์ดไม่มีหน้าลูก เทียบตรง ๆ พอ
  if (item.url === DASHBOARD_ROOT) return pathname === DASHBOARD_ROOT
  return pathname === item.url || pathname.startsWith(`${item.url}/`)
}

/**
 * หา breadcrumb ของ pathname ปัจจุบัน จากเมนูที่ API ส่งมา
 * คืนเป็นป้ายชื่อ (key หรือ code+name) แล้วค่อยแปลงเป็นข้อความตอน render
 */
export function breadcrumbTrail(groups: NavGroup[], pathname: string): NavLabel[] {
  for (const group of groups) {
    for (const item of group.items) {
      const child = item.children?.find((c) => c.url === pathname)
      if (child) {
        // หน้าแรกของกลุ่มใช้ชื่อเมนูหลักอยู่แล้ว ไม่ต้องซ้ำ
        return child.url === item.url ? [item] : [item, child]
      }
      if (item.url === pathname) return [item]
    }
  }
  return []
}
