"use client"

import * as React from "react"
import { TriangleAlert } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"

import { getTopItemsMonthStats, type TopItemsMonthStats } from "@/app/dashboard/_components/api"
import { DonutBreakdown, OTHER_COLOR, type Slice } from "@/app/dashboard/_components/donut"
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

/**
 * สีของอันดับ 1–5 = chart-1..5 ตามลำดับคงที่ของชุดสีกราฟ (ผู้ใช้ขอ "แยกสีหน่อย" 08/10/2026 แทนฟ้าไล่เฉด)
 * ห้ามสลับลำดับ: ตรวจด้วย validate_palette.js แล้ว — ทั้ง 5 สีไม่ผ่านแบบ "ทุกคู่" (ชมพู↔เขียวน้ำทะเลในโหมดมืด, ชมพู↔ส้ม)
 * แต่ในวงโดนัทชิ้นที่ติดกันมีแค่ 1-2, 2-3, 3-4, 4-5 (+ 5-อื่น ๆ, อื่น ๆ-1) ซึ่งผ่านทั้งสว่างและมืด (CVD ΔE ≥ 8.4, ปกติ ≥ 19)
 * คู่ที่แยกยากจึงไม่เคยอยู่ติดกัน · อันดับบอกด้วยเลขบนป้ายใน legend อีกทาง สีไม่ใช่ช่องทางเดียว
 */
const RANK_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"]

/**
 * top_items_month_card.tsx — card "สินค้าขายดีเดือนนี้" ใน section รายเดือนของ dashboard (08/10/2026 แทนประเภทสินค้าขายดีรายเดือน)
 *
 * 5 อันดับของเดือนที่เลือก (ค่าเริ่มต้นเดือนนี้) จัดกลุ่มตาม so.item_code เรียงตามจำนวนชิ้น ไม่นับใบยกเลิก — /dashboard-top-items-month
 * หน้าตาเดียวกับ card ประเภทสินค้าขายดี (โดนัท donut.tsx) แต่ครบ 5 อันดับ + "อื่น ๆ" (สินค้าที่เหลือทั้งเดือน)
 * ตัวเลือกเดือนโชว์หลังโหลดรอบแรกเสร็จ (ใช้ stats.month) เหตุผลเดียวกับ so_today_chart.tsx
 */
export function TopItemsMonthCard() {
  const t = useTranslations("dashboard.topItemsMonth")
  const ti = useTranslations("dashboard.topItems")
  const tm = useTranslations("dashboard.month")
  const locale = useLocale()
  const nf = new Intl.NumberFormat(intlLocale(locale))

  /** เดือนที่เลือก "YYYY-MM" · ว่าง = เดือนนี้ */
  const [month, setMonth] = React.useState("")
  const [stats, setStats] = React.useState<TopItemsMonthStats | null>(null)
  const [failed, setFailed] = React.useState(false)
  /** เดือนของตัวเลือก — จำไว้แยกจาก stats ระหว่างโหลดเดือนใหม่ปุ่มจะได้ไม่หาย */
  const [shown, setShown] = React.useState("")

  const changeMonth = (next: string) => {
    setMonth(next === toMonthKey(new Date()) ? "" : next)
    setShown(next)
    setStats(null)
    setFailed(false)
  }

  React.useEffect(() => {
    let cancelled = false
    getTopItemsMonthStats(month || undefined)
      .then((next) => {
        if (cancelled) return
        setStats(next)
        setShown(next.month)
      })
      // ห้าม console.error — ใน dev overlay จะขึ้นเต็มจอเหมือนหน้าพัง
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [month])

  const slices: Slice[] = stats
    ? (() => {
        const head = stats.items.map((row, index) => ({
          key: row.item_code,
          label: row.product_name || row.item_code,
          detail: `${row.item_code} · ${ti("orders", { value: nf.format(row.orders) })}`,
          qty: row.qty,
          color: RANK_COLORS[index],
          badge: String(index + 1),
          badgeLight: index >= 2,
        }))
        const rest = stats.total_qty - head.reduce((sum, slice) => sum + slice.qty, 0)
        const restItems = stats.item_count - head.length
        return rest > 0 && restItems > 0
          ? [...head, { key: "__other", label: t("other"), detail: t("otherDetail", { items: nf.format(restItems) }), qty: rest, color: OTHER_COLOR }]
          : head
      })()
    : []

  return (
    <Card className="h-full">
      {/* หัว card flex-wrap แบบเดียวกับ card อื่น — ที่ไม่พอ ตัวเลือกเดือนลงบรรทัดใหม่เอง */}
      <CardHeader className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <CardTitle className="min-w-40 flex-1">{month ? t("titleOther") : t("title")}</CardTitle>
        <CardDescription className="order-last basis-full">
          {stats ? (
            stats.items.length ? (
              ti("description", { qty: nf.format(stats.total_qty), items: nf.format(stats.item_count) })
            ) : (
              t("empty")
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
            <MonthPicker value={shown} onChange={changeMonth} />
          ) : failed ? null : (
            <Skeleton className="h-8 w-44" />
          )}
        </CardAction>
      </CardHeader>
      <CardContent>
        {stats ? (
          slices.length ? (
            <DonutBreakdown slices={slices} total={stats.total_qty} unit={ti("unit")} shareTitle={ti("share")} />
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
