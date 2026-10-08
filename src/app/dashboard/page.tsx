import { CalendarDays, CalendarRange, Download, Plus, type LucideIcon } from "lucide-react"
import { getTranslations } from "next-intl/server"

import { CancelledMonthCard } from "@/app/dashboard/_components/cancelled_month_card"
import { CompletedMonthCard } from "@/app/dashboard/_components/completed_month_card"
import { RevenueMonthCard } from "@/app/dashboard/_components/revenue_month_card"
import { SoMonthCard } from "@/app/dashboard/_components/so_month_card"
import { SoDailyChart } from "@/app/dashboard/_components/so_daily_chart"
import { SoTodayChart } from "@/app/dashboard/_components/so_today_chart"
import { TopChannelsCard } from "@/app/dashboard/_components/top_channels_card"
import { TopItemsCard } from "@/app/dashboard/_components/top_items_card"
import { TopItemsMonthCard } from "@/app/dashboard/_components/top_items_month_card"
import { TopTypesCard } from "@/app/dashboard/_components/top_types_card"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"

/** หัวข้อแบ่ง section ของ dashboard (รายเดือน / รายวัน) — ไอคอน + ชื่อ + เส้นยาวถึงขอบขวา */
function SectionTitle({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <h2 className="text-muted-foreground flex items-center gap-2 pt-2 text-sm font-semibold">
      <Icon className="size-4" />
      {children}
      <span className="bg-border ml-1 h-px flex-1" />
    </h2>
  )
}

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

      {/* แบ่งเป็น 2 section (ผู้ใช้ขอ 08/10/2026): รายเดือน = 4 card สรุป + แถวกราฟรายวันของเดือน/ประเภทขายดีของเดือน
          รายวัน = แถวกราฟรายชั่วโมง/สินค้าขายดี + ช่องทาง/ประเภทขายดี (แต่ละ card เลือกวันเอง) */}
      <SectionTitle icon={CalendarRange}>{t("sections.monthly")}</SectionTitle>

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

      <div className="grid gap-4 lg:grid-cols-3 [&>*]:min-w-0">
        <div className="lg:col-span-2">
          {/* ใบสั่งขายรายวัน 1–วันสุดท้ายของเดือน เลือกเดือนได้ (08/10/2026) */}
          <SoDailyChart />
        </div>
        {/* สินค้าขายดี 5 อันดับของเดือน (group so.item_code) แสดงเป็นโดนัท — 08/10/2026 แทนประเภทขายดีรายเดือนตามที่ผู้ใช้ขอ */}
        <TopItemsMonthCard />
      </div>

      <SectionTitle icon={CalendarDays}>{t("sections.daily")}</SectionTitle>

      <div className="grid gap-4 lg:grid-cols-3 [&>*]:min-w-0">
        <div className="lg:col-span-2">
          {/* ใบสั่งขายวันนี้แยกรายชั่วโมง (po_date) — ข้อมูลจริง (08/10/2026 แทน "ปริมาณทราฟฟิกวันนี้" ตัวอย่าง) */}
          <SoTodayChart />
        </div>
        {/* สินค้าขายดี 5 อันดับ (group so.item_code) เลือกวันได้ — ข้อมูลจริง (08/10/2026 แทน "สัดส่วนลูกค้าตามแพ็กเกจ" ตัวอย่าง) */}
        <TopItemsCard />
      </div>

      {/* [&>*]:min-w-0: ช่อง grid ปกติไม่ยอมแคบกว่าเนื้อหา — ตารางช่องทางบนมือถือจะดันทั้งหน้าให้กว้างเกินจอ
          ใส่แล้วตาราง (overflow-x-auto ใน Table) เลื่อนซ้ายขวาในตัว card แทน · ใส่ทั้งสองแถวกันกรณีเดียวกัน */}
      <div className="grid gap-4 lg:grid-cols-3 [&>*]:min-w-0">
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
