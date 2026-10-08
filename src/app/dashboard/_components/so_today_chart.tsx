"use client"

import * as React from "react"
import { TriangleAlert } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"

import { getSoTodayStats, type SoTodayStats } from "@/app/dashboard/_components/api"
import { CountBars } from "@/app/dashboard/_components/count_bars"
import { DayPicker, toDayKey } from "@/app/dashboard/_components/day_picker"
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
 * so_today_chart.tsx — กราฟ "ใบสั่งขายวันนี้" ของหน้า dashboard (08/10/2026 แทน "ปริมาณทราฟฟิกวันนี้" ที่เป็นข้อมูลตัวอย่าง)
 *
 * จำนวนใบ (so_code ไม่ซ้ำ) ของวันนี้แยกรายชั่วโมงตาม so.po_date (เวลาไทย) — ดึงเองฝั่ง client แบบเดียวกับ card รายเดือน
 * แท่งกราฟอยู่ที่ count_bars.tsx (ใช้ร่วมกับ so_daily_chart.tsx รายวันของเดือน)
 * มุมขวาบนเลือกวันอื่นได้ (day_picker.tsx) — date ว่าง = วันนี้ ให้ API ตัดสินวันนี้ตามเวลาไทย
 * ตัวเลือกวันโชว์หลังโหลดรอบแรกเสร็จ (ใช้ stats.today) — เรนเดอร์ฝั่ง server ไม่รู้วันของเครื่องผู้ใช้ จะ hydrate ไม่ตรง
 */

export function SoTodayChart() {
  const t = useTranslations("dashboard.soToday")
  const tm = useTranslations("dashboard.month")
  const locale = useLocale()
  const nf = new Intl.NumberFormat(intlLocale(locale))

  /** วันที่เลือก "YYYY-MM-DD" · ว่าง = วันนี้ */
  const [date, setDate] = React.useState("")
  const [stats, setStats] = React.useState<SoTodayStats | null>(null)
  const [failed, setFailed] = React.useState(false)
  /** วันที่ของตัวเลือก — จำไว้แยกจาก stats ระหว่างโหลดวันใหม่ปุ่มจะได้ไม่หาย */
  const [shown, setShown] = React.useState("")

  const changeDate = (next: string) => {
    // ล้างผลเก่าตรงนี้ (ไม่ใช่ใน effect) — กราฟกลับเป็น skeleton ระหว่างโหลดวันใหม่
    setDate(next === toDayKey(new Date()) ? "" : next)
    setShown(next)
    setStats(null)
    setFailed(false)
  }

  React.useEffect(() => {
    let cancelled = false
    getSoTodayStats(date || undefined)
      .then((next) => {
        if (cancelled) return
        setStats(next)
        setShown(next.today)
      })
      // ห้าม console.error — ใน dev overlay จะขึ้นเต็มจอเหมือนหน้าพัง
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [date])

  const hours = stats?.hours ?? []
  const peak = hours.length ? Math.max(...hours) : 0
  const peakHour = peak > 0 ? hours.indexOf(peak) : -1

  /** วันนี้ตามภาษาที่เลือก เช่น "8 ตุลาคม 2569" */
  const dayLabel = (ymd: string) => {
    const [y, m, d] = ymd.split("-").map(Number)
    return new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: "long" }).format(
      new Date(y, m - 1, d)
    )
  }

  return (
    <Card className="flex h-full flex-col">
      {/* หัว card เป็น flex-wrap (ไม่ใช่ grid ของ CardHeader): ที่ไม่พอ (มือถือ) ตัวเลือกวันลงบรรทัดใหม่เอง
          คำอธิบายเต็มความกว้างบรรทัดสุดท้ายเสมอ ไม่ถูกบีบข้างปุ่ม */}
      <CardHeader className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <CardTitle className="min-w-40 flex-1">
          {date ? t("titleDay") : t("title")}
          {stats ? (
            <span className="text-muted-foreground font-normal"> · {dayLabel(stats.today)}</span>
          ) : null}
        </CardTitle>
        <CardAction className="shrink-0">
          {shown ? (
            <DayPicker value={shown} onChange={changeDate} />
          ) : failed ? null : (
            <Skeleton className="h-8 w-44" />
          )}
        </CardAction>
        <CardDescription className="order-last basis-full">
          {stats ? (
            peakHour >= 0 ? (
              t("description", {
                total: nf.format(stats.total),
                amount: stats.total_amount == null ? "–" : formatTHB(stats.total_amount, locale),
                peak: nf.format(peak),
                hour: String(peakHour).padStart(2, "0"),
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
          key={stats?.today}
          values={stats ? hours : null}
          failed={failed}
          label={(hour) => `${String(hour).padStart(2, "0")}:00`}
          tooltip={(value) => t("tooltip", { value: nf.format(value) })}
          // API ตัวเก่า (ก่อน restart) ยังไม่ส่ง amounts — ไม่โชว์บรรทัดยอดขายแทนการโชว์ ฿0 ที่ทำให้เข้าใจผิด
          detail={
            stats?.amounts
              ? (index) => t("amount", { value: formatTHB(stats.amounts[index] ?? 0, locale) })
              : undefined
          }
          ticks={[0, 6, 12, 18, 23]}
        />
      </CardContent>
    </Card>
  )
}
