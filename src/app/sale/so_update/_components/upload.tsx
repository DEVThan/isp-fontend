"use client"

import { useTranslations } from "next-intl"

import { UpdateCard } from "@/app/sale/so_update/_components/update_card"
import { PageHeader } from "@/components/page-header"

/**
 * upload.tsx — เนื้อหน้าอัปเดตข้อมูลใบสั่งขาย (06/10/2026): หัวหน้า + card ละคอลัมน์ (ผู้ใช้ขอแยก card แทนแท็บ)
 * แต่ละ card เป็น component ของตัวเอง (update_card.tsx) — เพิ่มคอลัมน์ใหม่ = เพิ่ม field ใน _FIELDS ฝั่ง API,
 * SO_UPDATE_FIELDS ใน model.ts, ข้อความ so_update.fields.<field> แล้ววาง <UpdateCard field="…" /> อีกใบ
 */
export function SoUpdate() {
  const t = useTranslations("so_update")

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />

      {/* xl: 3 card แถวเดียว · md: 2 + 1 · card อัปโหลดอยู่บน (order-1) ตัวอย่างของแต่ละ card เต็มแถวอยู่ล่าง (order-2)
          จอเล็ก: เรียงตาม DOM — card แล้วตามด้วยตัวอย่างของมันทันที */}
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <UpdateCard field="status" />
        <UpdateCard field="is_payment" />
        <UpdateCard field="shipping_code" />
      </div>
    </>
  )
}
