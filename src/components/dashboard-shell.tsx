import { cookies } from "next/headers"

import { getSession } from "@/app/login/components/auth-actions"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { fetchMenus, toNavGroups } from "@/lib/menu"
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
   * เมนูของผู้ใช้มาจาก API ทางเดียว (ส่ง id ใน session.menus ไปแลกรายละเอียด)
   * ต้นเมนูที่เคยเขียนไว้ในโค้ดถูก comment ไว้ใน nav.ts แล้ว — API ล่มเมื่อไหร่
   * sidebar จะว่าง ไม่มีเมนูสำรองมาแทน
   *
   * session.menus เก็บเป็นสตริง (["7","6"]) ตามที่ /login ส่งมา แต่ id ของเมนูคือตัวเลข
   * จึงแปลงเป็น number ก่อนส่งเข้า API   ค่าที่ไม่ใช่เลขบวก (cookie ถูกแก้มา) ทิ้งไป
   */
  const session = await getSession()
  const menuIds = (session?.menus ?? []).map(Number).filter((id) => Number.isInteger(id) && id > 0)
  const apiMenus = menuIds.length > 0 ? await fetchMenus(menuIds) : null
  const groups = apiMenus ? toNavGroups(apiMenus) : []

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
