"use client"

import * as React from "react"
import { TriangleAlert } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"

import { getSoDailyStats, type SoDailyStats } from "@/app/dashboard/_components/api"
import { CountBars } from "@/app/dashboard/_components/count_bars"
import { MonthPicker, toMonthKey } from "@/app/dashboard/_components/month_picker"
import { intlLocale } from "@/i18n/config"
import { formatTHB } from "@/lib/mock-data"
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
 * so_daily_chart.tsx — กราฟ "ใบสั่งขายรายวัน" ของเดือน (08/10/2026) แบบเดียวกับ so_today_chart.tsx แต่แท่งละวัน 1–วันสุดท้าย
 *
 * จำนวนใบ (so_code ไม่ซ้ำ) ต่อวันตาม so.po_date (เวลาไทย) รวมใบยกเลิก — /dashboard-so-daily
 * เลือกเดือนได้ (month_picker.tsx) — month ว่าง = เดือนนี้ ให้ API ตัดสินตามเวลาไทย
 * ตัวเลือกเดือนโชว์หลังโหลดรอบแรกเสร็จ (ใช้ stats.month) เหตุผลเดียวกับ so_today_chart.tsx
 */
export function SoDailyChart() {
  const t = useTranslations("dashboard.soDaily")
  const tt = useTranslations("dashboard.soToday")
  const tm = useTranslations("dashboard.month")
  const locale = useLocale()
  const nf = new Intl.NumberFormat(intlLocale(locale))

  /** เดือนที่เลือก "YYYY-MM" · ว่าง = เดือนนี้ */
  const [month, setMonth] = React.useState("")
  const [stats, setStats] = React.useState<SoDailyStats | null>(null)
  const [failed, setFailed] = React.useState(false)
  /** เดือนของตัวเลือก — จำไว้แยกจาก stats ระหว่างโหลดเดือนใหม่ปุ่มจะได้ไม่หาย */
  const [shown, setShown] = React.useState("")

  const changeMonth = (next: string) => {
    // ล้างผลเก่าตรงนี้ (ไม่ใช่ใน effect) — กราฟกลับเป็น skeleton ระหว่างโหลดเดือนใหม่
    setMonth(next === toMonthKey(new Date()) ? "" : next)
    setShown(next)
    setStats(null)
    setFailed(false)
  }

  React.useEffect(() => {
    let cancelled = false
    getSoDailyStats(month || undefined)
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

  const days = stats?.days ?? []
  const peak = days.length ? Math.max(...days) : 0
  const peakDay = peak > 0 ? days.indexOf(peak) : -1
  const [y, m] = (stats?.month ?? "2000-01").split("-").map(Number)
  /** ชื่อวันของแท่ง เช่น "5 ต.ค." */
  const dayName = (index: number) =>
    new Intl.DateTimeFormat(intlLocale(locale), { day: "numeric", month: "short" }).format(new Date(y, m - 1, index + 1))
  const monthName = new Intl.DateTimeFormat(intlLocale(locale), { month: "long", year: "numeric" }).format(
    new Date(y, m - 1, 1)
  )
  // ป้ายแกน: วันที่ 1, 8, 15, 22 และวันสุดท้าย (เดือนสั้นสุด 28 วัน — 22 กับวันสุดท้ายห่างกันพอไม่ชน)
  const ticks = days.length ? [0, 7, 14, 21, days.length - 1] : []

  return (
    <Card className="flex h-full flex-col">
      {/* หัว card flex-wrap แบบเดียวกับ card รายวัน — ที่ไม่พอ ตัวเลือกเดือนลงบรรทัดใหม่เอง */}
      <CardHeader className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <CardTitle className="min-w-40 flex-1">
          {t("title")}
          {stats ? <span className="text-muted-foreground font-normal"> · {monthName}</span> : null}
        </CardTitle>
        <CardAction className="shrink-0">
          {shown ? (
            <MonthPicker value={shown} onChange={changeMonth} />
          ) : failed ? null : (
            <Skeleton className="h-8 w-52" />
          )}
        </CardAction>
        <CardDescription className="order-last basis-full">
          {stats ? (
            peakDay >= 0 ? (
              t("description", {
                total: nf.format(stats.total),
                amount: stats.total_amount == null ? "–" : formatTHB(stats.total_amount, locale),
                peak: nf.format(peak),
                day: dayName(peakDay),
              })
            ) : (
              t("empty")
            )
          ) : failed ? (
            <span className="text-warning-ink flex items-center gap-1.5 font-medium">
              <TriangleAlert className="size-4" />
              {tm("loadError")}
            </span>
          ) : (
            <Skeleton className="h-4 w-56" />
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        <CountBars
          key={stats?.month}
          values={stats ? days : null}
          failed={failed}
          label={dayName}
          tickLabel={(index) => String(index + 1)}
          tooltip={(value) => tt("tooltip", { value: nf.format(value) })}
          // API ตัวเก่า (ก่อน restart) ยังไม่ส่ง amounts — ไม่โชว์บรรทัดยอดขายแทนการโชว์ ฿0 ที่ทำให้เข้าใจผิด
          detail={
            stats?.amounts
              ? (index) => tt("amount", { value: formatTHB(stats.amounts[index] ?? 0, locale) })
              : undefined
          }
          ticks={ticks}
        />
      </CardContent>
    </Card>
  )
}
