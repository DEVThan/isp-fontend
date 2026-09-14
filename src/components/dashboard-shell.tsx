import { cookies } from "next/headers"

import { getMenus } from "@/app/login/components/auth-actions"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import type { NavGroup } from "@/lib/nav"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

/**
 * เปลือกของหน้าหลังบ้าน — เมนูข้าง + แถบบน + กรอบเนื้อหา
 *
 * ทุกส่วนของระบบเป็นโฟลเดอร์แยกที่ระดับ app/ (customers, invoices, …) จึงมี layout
 * ของตัวเองคนละไฟล์ แต่ทุกไฟล์ชี้มาที่นี่ที่เดียว:  export { default } from "@/components/dashboard-shell"
 * แก้เปลือกที่ไฟล์นี้ไฟล์เดียว ทุกหน้าเปลี่ยนตาม (มีแต่ /login ที่ไม่ใช้)
 *
 * ข้ามหมวด = ข้าม layout = เปลือกนี้ถูกสร้างใหม่ ทำให้ state ใน SidebarProvider หายไปด้วย
 * จึงต้องอ่านคุกกี้ที่ SidebarProvider เขียนไว้ แล้วส่งกลับเป็นค่าตั้งต้น
 * ไม่งั้นเมนูที่ผู้ใช้ย่อไว้จะเด้งกลับมากางทุกครั้งที่เปลี่ยนหมวด
 */
const SIDEBAR_COOKIE = "sidebar_state" // ชื่อเดียวกับใน components/ui/sidebar.tsx

export default async function DashboardShell({
  children,
}: {
  children: React.ReactNode
}) {
  const collapsed = (await cookies()).get(SIDEBAR_COOKIE)?.value === "false"
  /**
   * เมนูมาพร้อม /login แล้ว — login-form สร้างต้นเมนูครั้งเดียวแล้วเก็บไว้ใน cookie isp_menus
   * ที่นี่แค่อ่านไปวาด ไม่ยิง API ทุกครั้งที่โหลดหน้าแบบเดิม (เดิมเอา id ใน session ไปแลกที่ /menu-get)
   * ต้นเมนูที่เคยเขียนไว้ในโค้ดถูก comment ไว้ใน nav.ts แล้ว — ไม่มี cookie เมนูเมื่อไหร่ sidebar ว่าง
   * (เช่นคนที่ล็อกอินค้างไว้ก่อนเปลี่ยนมาแบบนี้ ต้องล็อกอินใหม่หนึ่งครั้ง)
   */
  const items = await getMenus()
  const groups: NavGroup[] = items.length > 0 ? [{ items }] : []

  return (
    <SidebarProvider defaultOpen={!collapsed}>
      <AppSidebar groups={groups} />
      <SidebarInset>
        <SiteHeader groups={groups} />
        <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
