import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import { SoUpdate } from "@/app/sale/so_update/_components/upload"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("so_update")
  return { title: t("title") }
}

export default function SoUpdatePage() {
  // อัปโหลด Excel → ตรวจ → ยืนยัน ทำใน SoUpdate (client) ทั้งหมด — หน้านี้ไม่เรียก API เอง
  return (
    <div className="flex flex-col gap-0">
      <SoUpdate />
    </div>
  )
}
