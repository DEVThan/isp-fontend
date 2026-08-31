import {
  CreditCard,
  LayoutDashboard,
  LifeBuoy,
  Router,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react"
import type { Messages } from "next-intl"

/** หน้าแรกหลังล็อกอิน — ส่วนอื่น ๆ เป็นโฟลเดอร์แยกที่ระดับเดียวกัน (/customers, /invoices, …) */
export const DASHBOARD_ROOT = "/dashboard"

/** ทุก key อ้างถึง messages/<locale>.json ใต้ namespace "nav" — พิมพ์ผิดแล้วไม่ compile */
export type NavKey = keyof Messages["nav"]

export type NavChild = {
  key: NavKey
  url: string
}

export type NavItem = {
  key: NavKey
  url: string
  icon: LucideIcon
  badge?: string
  children?: NavChild[]
}

export type NavGroup = {
  key: NavKey
  items: NavItem[]
}

export const navGroups: NavGroup[] = [
  {
    key: "overview",
    items: [{ key: "dashboard", url: DASHBOARD_ROOT, icon: LayoutDashboard }],
  },
  {
    key: "management",
    items: [
      {
        key: "customers",
        url: "/customers",
        icon: Users,
        children: [
          { key: "customersList", url: "/customers" },
          { key: "packages", url: "/customers/packages" },
          { key: "areas", url: "/customers/areas" },
        ],
      },
      {
        key: "invoices",
        url: "/invoices",
        icon: CreditCard,
        badge: "8",
        children: [
          { key: "invoicesAll", url: "/invoices" },
          { key: "payments", url: "/invoices/payments" },
        ],
      },
      { key: "tickets", url: "/tickets", icon: LifeBuoy, badge: "3" },
    ],
  },
  {
    key: "system",
    items: [
      {
        key: "settings",
        url: "/settings",
        icon: Settings,
        children: [
          { key: "settingsGeneral", url: "/settings" },
          { key: "settingsUsers", url: "/settings/users" },
        ],
      },
    ],
  },
]

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
 * หา breadcrumb ของ pathname ปัจจุบัน คืนค่าเป็น key ของเมนู
 * (แปลเป็นข้อความจริงตอน render)
 */
export function breadcrumbKeys(pathname: string): NavKey[] {
  for (const group of navGroups) {
    for (const item of group.items) {
      const child = item.children?.find((c) => c.url === pathname)
      if (child) {
        // หน้าแรกของกลุ่มใช้ชื่อเมนูหลักอยู่แล้ว ไม่ต้องซ้ำ
        return child.url === item.url ? [item.key] : [item.key, child.key]
      }
      if (item.url === pathname) return [item.key]
    }
  }
  return []
}
