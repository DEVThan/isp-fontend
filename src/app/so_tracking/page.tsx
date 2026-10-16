import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import { Tables } from "@/app/so_tracking/_components/table"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("so_tracking")
  return { title: t("title") }
}

/**
 * /so_tracking — การติดตามข้อมูลใบสั่งขาย (16/10/2026 แปลงมาจากสำเนาของหน้าส่งออกใบสั่งขาย so_export)
 * ข้อมูลคือตาราง so ตรง ๆ: ตาราง /so-get-list · ฟอร์ม /so-action · ลบ /so-delete · ตัวเลือก /so-get-option
 */
export default function SoTrackingPage() {
  // หัวเรื่อง จำนวนรายการ และตาราง อยู่ใน Tables (client) ทั้งหมด — ตารางดึงข้อมูลหน้าแรกเองตอนเปิดหน้า
  // หน้านี้จึงไม่เรียก API: กดเมนูแล้วหน้าเปิดทันที และเปลี่ยนภาษา (router.refresh) ไม่ยิง API ซ้ำ ตัวกรองไม่รีเซ็ต
  return (
    <div className="flex flex-col gap-0">
      <Tables />
    </div>
  )
}
