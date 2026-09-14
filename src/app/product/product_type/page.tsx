import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import { Tables } from "@/app/product/product_type/_components/table"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("producttypes")
  return { title: t("title") }
}

export default function ProductTypePage() {
  // หัวเรื่อง จำนวนรายการ และตาราง อยู่ใน Tables (client) ทั้งหมด — ตารางดึงข้อมูลหน้าแรกเองตอนเปิดหน้า
  // หน้านี้จึงไม่เรียก API: กดเมนูแล้วหน้าเปิดทันที และเปลี่ยนภาษา (router.refresh) ไม่ยิง API ซ้ำ ตัวกรองไม่รีเซ็ต
  return (
    <div className="flex flex-col gap-0">
      <Tables />
    </div>
  )
}
