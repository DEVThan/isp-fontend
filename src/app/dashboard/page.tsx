import { Download, Plus } from "lucide-react"
import { getTranslations } from "next-intl/server"

import { CancelledMonthCard } from "@/app/dashboard/_components/cancelled_month_card"
import { CompletedMonthCard } from "@/app/dashboard/_components/completed_month_card"
import { RevenueMonthCard } from "@/app/dashboard/_components/revenue_month_card"
import { SoMonthCard } from "@/app/dashboard/_components/so_month_card"
import { SoTodayChart } from "@/app/dashboard/_components/so_today_chart"
import { TopChannelsCard } from "@/app/dashboard/_components/top_channels_card"
import { TopItemsCard } from "@/app/dashboard/_components/top_items_card"
import { TopTypesCard } from "@/app/dashboard/_components/top_types_card"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"

export default async function DashboardPage() {
  const t = await getTranslations("dashboard")

  return (
    <>
      <PageHeader title={t("title")} description={t("description")}>
        {/* <Button variant="outline">
          <Download />
          {t("exportReport")}
        </Button>
        <Button>
          <Plus />
          {t("addCustomer")}
        </Button> */}
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* ข้อมูลจริง ดึงเองใน component (06/10/2026): ใบสั่งขายเดือนนี้ แทน "ลูกค้าทั้งหมด" ·
            รายได้เดือนนี้ = sum(so.pay_amount) แทนตัวอย่างเดิม — ทั้ง 4 card เป็นข้อมูลจริงแล้ว */}
        <SoMonthCard />
        <RevenueMonthCard />
        {/* สำเร็จเดือนนี้ (ลูกค้าได้รับสินค้าแล้ว) — ข้อมูลจริง (06/10/2026 แทน "ค้างชำระ" ตัวอย่างใบสุดท้าย) */}
        <CompletedMonthCard />
        {/* ยกเลิกเดือนนี้ — ข้อมูลจริง (06/10/2026 แทน "งานแจ้งซ่อมค้าง") */}
        <CancelledMonthCard />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {/* ใบสั่งขายวันนี้แยกรายชั่วโมง (po_date) — ข้อมูลจริง (08/10/2026 แทน "ปริมาณทราฟฟิกวันนี้" ตัวอย่าง) */}
          <SoTodayChart />
        </div>
        {/* สินค้าขายดี 5 อันดับ (group so.item_code) เลือกวันได้ — ข้อมูลจริง (08/10/2026 แทน "สัดส่วนลูกค้าตามแพ็กเกจ" ตัวอย่าง) */}
        <TopItemsCard />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* ช่องทาง (broadcast) ขายดี 5 อันดับ (group so.channel) เลือกวันได้ — ข้อมูลจริง (08/10/2026 แทน "ใบแจ้งหนี้ล่าสุด" ตัวอย่าง) */}
        <div className="lg:col-span-2">
          <TopChannelsCard />
        </div>

        {/* ประเภทสินค้าขายดี 5 อันดับ (group so.product_type_name) เลือกวันได้ — ข้อมูลจริง (08/10/2026 แทน "งานแจ้งปัญหาล่าสุด" ตัวอย่าง) */}
        <TopTypesCard />
      </div>
    </>
  )
}
