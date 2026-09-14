import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { Suspense } from "react"

import { getVendors } from "@/app/vendor/_components/api"
import type { VendorList } from "@/app/vendor/_components/model"
import { Tables } from "@/app/vendor/_components/table"
import { AwaitValue } from "@/components/await-value"
import { PageHeader } from "@/components/page-header"
import { TableLoading } from "@/components/table-loading"
import { settleInitial } from "@/lib/initial-list"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("vendors")
  return { title: t("title") }
}

export default async function VendorPage() {
  const t = await getTranslations("vendors")
  const tc = await getTranslations("common.table")

  // ไม่ await — ส่งหัวเรื่อง + กรอบตารางไปก่อน กดเมนูแล้วหน้าเปิดทันที (API ช้า ~4 วินาที เดิมหน้าค้างรอ)
  // ข้อมูลหน้าแรกตามมาผ่าน <Suspense> ด้านล่าง จากนั้นตาราง (client) จะยิงเองทุกครั้งที่ค้นหา/เปลี่ยนหน้า
  // API ล่ม/ต่อไม่ได้ ต้องไม่ทำให้ทั้งหน้าพัง — settleInitial ให้ { list ว่าง, failed: true } แทนการ throw
  const empty: VendorList = {
    vendors: [],
    total: 0,
    page: 1,
    per_page: 0,
    total_pages: 1,
  }
  const initial = settleInitial(getVendors(), empty)

  // จำนวนรายการในหัวหน้าต้องรอข้อมูลเหมือนกัน — โชว์ "กำลังโหลด…" ไปก่อน
  const description = (
    <Suspense fallback={tc("loading")}>
      <AwaitValue promise={initial}>
        {({ list }) => t("description", { count: list.total })}
      </AwaitValue>
    </Suspense>
  )

  return (
    <div className="flex flex-col gap-0">
      <PageHeader title={t("title")} description={description} />

      <Suspense fallback={<TableLoading label={tc("loading")} />}>
        <Tables initial={initial} />
      </Suspense>
    </div>
  )
}
