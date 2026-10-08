"use client"

import * as React from "react"
import { TriangleAlert } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"

import {
  getTopTypesMonthStats,
  getTopTypesStats,
  type TopTypesStats,
} from "@/app/dashboard/_components/api"
import { DayPicker, toDayKey } from "@/app/dashboard/_components/day_picker"
import { MonthPicker, toMonthKey } from "@/app/dashboard/_components/month_picker"
import { intlLocale } from "@/i18n/config"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { DonutBreakdown, OTHER_COLOR, type Slice } from "@/app/dashboard/_components/donut"

/** สีของชิ้นตามอันดับ — chart-1..3 ตามลำดับคงที่ของชุดสีกราฟ (ห้ามสลับ) */
const SLICE_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)"]

/** ผลของทั้งสองเส้นในรูปเดียวกัน — at = วัน (YYYY-MM-DD) หรือเดือน (YYYY-MM) ของข้อมูล */
type TypesStats = Omit<TopTypesStats, "today"> & { at: string }

/** รายวัน /dashboard-top-types · รายเดือน /dashboard-top-types-month (เพิ่ม 08/10/2026) */
const loaders = {
  day: (at?: string) => getTopTypesStats(at).then(({ today, ...rest }): TypesStats => ({ ...rest, at: today })),
  month: (at?: string) => getTopTypesMonthStats(at).then(({ month, ...rest }): TypesStats => ({ ...rest, at: month })),
}

/**
 * top_types_card.tsx — card "ประเภทสินค้าขายดี" ของหน้า dashboard (08/10/2026 แทน "งานแจ้งปัญหาล่าสุด" ที่เป็นข้อมูลตัวอย่าง)
 *
 * 5 อันดับของวันที่เลือก (ค่าเริ่มต้นวันนี้) จัดกลุ่มตาม so.product_type_name เรียงตามจำนวนชิ้น ไม่นับใบยกเลิก — /dashboard-top-types
 * แสดงเป็นกราฟโดนัท (ผู้ใช้เลือก 08/10/2026): 3 อันดับแรก + "อื่น ๆ" (ประเภทที่เหลือทั้งวัน) กลางวงเป็นยอดชิ้นทั้งวัน
 * hover ชิ้นในวงหรือแถว legend → กลางวงเปลี่ยนเป็นตัวเลขของชิ้นนั้น · legend มีตัวเลขครบ ใช้แทนตารางได้
 * ตัวเลือกวันโชว์หลังโหลดรอบแรกเสร็จ (ใช้ stats.today) เหตุผลเดียวกับ so_today_chart.tsx
 * period="month" (08/10/2026): ข้อมูลทั้งเดือน + ตัวเลือกเดือน (month_picker.tsx) ใน section รายเดือน — หน้าตาเดียวกัน
 */
export function TopTypesCard({ period = "day" }: { period?: "day" | "month" }) {
  const t = useTranslations("dashboard.topTypes")
  const tm = useTranslations("dashboard.month")
  const locale = useLocale()
  const nf = new Intl.NumberFormat(intlLocale(locale))

  /** วัน/เดือนที่เลือก ("YYYY-MM-DD" / "YYYY-MM") · ว่าง = วันนี้/เดือนนี้ */
  const [date, setDate] = React.useState("")
  const [stats, setStats] = React.useState<TypesStats | null>(null)
  const [failed, setFailed] = React.useState(false)
  /** วันที่ของตัวเลือก — จำไว้แยกจาก stats ระหว่างโหลดวันใหม่ปุ่มจะได้ไม่หาย */
  const [shown, setShown] = React.useState("")

  const changeDate = (next: string) => {
    const current = period === "day" ? toDayKey(new Date()) : toMonthKey(new Date())
    setDate(next === current ? "" : next)
    setShown(next)
    setStats(null)
    setFailed(false)
  }

  React.useEffect(() => {
    let cancelled = false
    loaders[period](date || undefined)
      .then((next) => {
        if (cancelled) return
        setStats(next)
        setShown(next.at)
      })
      // ห้าม console.error — ใน dev overlay จะขึ้นเต็มจอเหมือนหน้าพัง
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [date, period])

  // 3 อันดับแรกได้สีของตัวเอง ที่เหลือรวมเป็น "อื่น ๆ" สีเทา — ชุดสีกราฟผ่านการแยกสีสำหรับคนตาบอดสีแค่ 3 สีแรก
  const slices: Slice[] = stats
    ? (() => {
        const head = stats.types.slice(0, SLICE_COLORS.length).map((row, index) => ({
          key: row.product_type_name,
          label: row.product_type_name,
          detail: t("detail", { orders: nf.format(row.orders), items: nf.format(row.items) }),
          qty: row.qty,
          color: SLICE_COLORS[index],
        }))
        const rest = stats.total_qty - head.reduce((sum, slice) => sum + slice.qty, 0)
        const restTypes = stats.type_count - head.length
        return rest > 0 && restTypes > 0
          ? [...head, { key: "__other", label: t("other"), detail: t("otherDetail", { types: nf.format(restTypes) }), qty: rest, color: OTHER_COLOR }]
          : head
      })()
    : []

  return (
    <Card className="h-full">
      {/* หัว card เป็น flex-wrap (ไม่ใช่ grid ของ CardHeader): ที่ไม่พอ (มือถือ) ตัวเลือกวันลงบรรทัดใหม่เอง
          คำอธิบายเต็มความกว้างบรรทัดสุดท้ายเสมอ ไม่ถูกบีบข้างปุ่ม */}
      <CardHeader className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <CardTitle className="min-w-40 flex-1">
          {period === "day" ? (date ? t("titleDay") : t("title")) : date ? t("titleDay") : t("titleMonth")}
        </CardTitle>
        <CardDescription className="order-last basis-full">
          {stats ? (
            stats.types.length ? (
              t("description", {
                qty: nf.format(stats.total_qty),
                types: nf.format(stats.type_count),
              })
            ) : (
              t(period === "day" ? "empty" : "emptyMonth")
            )
          ) : failed ? (
            <span className="text-warning-ink flex items-center gap-1.5 font-medium">
              <TriangleAlert className="size-4" />
              {tm("loadError")}
            </span>
          ) : (
            <Skeleton className="h-4 w-40" />
          )}
        </CardDescription>
        <CardAction className="shrink-0">
          {shown ? (
            period === "day" ? (
              <DayPicker value={shown} onChange={changeDate} />
            ) : (
              <MonthPicker value={shown} onChange={changeDate} />
            )
          ) : failed ? null : (
            <Skeleton className="h-8 w-44" />
          )}
        </CardAction>
      </CardHeader>
      <CardContent>
        {stats ? (
          slices.length ? (
            <DonutBreakdown slices={slices} total={stats.total_qty} unit={t("unit")} shareTitle={t("share")} />
          ) : null
        ) : failed ? null : (
          <div className="space-y-4">
            <Skeleton className="mx-auto size-44 rounded-full" />
            {[0, 1, 2].map((row) => (
              <Skeleton key={row} className="h-9 w-full" />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
