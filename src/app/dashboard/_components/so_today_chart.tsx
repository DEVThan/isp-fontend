"use client"

import * as React from "react"
import { TriangleAlert } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"

import { getSoTodayStats, type SoTodayStats } from "@/app/dashboard/_components/api"
import { DayPicker, toDayKey } from "@/app/dashboard/_components/day_picker"
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
 * so_today_chart.tsx — กราฟ "ใบสั่งขายวันนี้" ของหน้า dashboard (08/10/2026 แทน "ปริมาณทราฟฟิกวันนี้" ที่เป็นข้อมูลตัวอย่าง)
 *
 * จำนวนใบ (so_code ไม่ซ้ำ) ของวันนี้แยกรายชั่วโมงตาม so.po_date (เวลาไทย) — ดึงเองฝั่ง client แบบเดียวกับ card รายเดือน
 * หน้าตายกมาจาก components/traffic-chart.tsx (แท่ง CSS ล้วน ซีรีส์เดียวสี chart-1 ไม่ต้องมี legend)
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
  // เพดานแกนให้หาร 4 ลงตัว เส้นกริดจะเป็นจำนวนเต็มเสมอ (นับเป็นใบ) — วันที่ยังไม่มีใบเลยก็ไม่หารศูนย์
  const scaleMax = Math.max(4, Math.ceil(peak / 4) * 4)

  /** วันนี้ตามภาษาที่เลือก เช่น "8 ตุลาคม 2569" */
  const dayLabel = (ymd: string) => {
    const [y, m, d] = ymd.split("-").map(Number)
    return new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: "long" }).format(
      new Date(y, m - 1, d)
    )
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>
          {date ? t("titleDay") : t("title")}
          {stats ? (
            <span className="text-muted-foreground font-normal"> · {dayLabel(stats.today)}</span>
          ) : null}
        </CardTitle>
        <CardAction>
          {shown ? (
            <DayPicker value={shown} onChange={changeDate} />
          ) : failed ? null : (
            <Skeleton className="h-8 w-44" />
          )}
        </CardAction>
        <CardDescription>
          {stats ? (
            peakHour >= 0 ? (
              t("description", {
                total: nf.format(stats.total),
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
      <CardContent>
        <div className="relative h-52">
          {/* เส้นกริดจาง ๆ ไว้อ่านระดับ */}
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
            {[100, 75, 50, 25, 0].map((pct) => (
              <div key={pct} className="flex items-center gap-2">
                <span className="text-muted-foreground w-8 shrink-0 text-right text-[10px] tabular-nums">
                  {stats ? nf.format((scaleMax * pct) / 100) : ""}
                </span>
                <span className="border-border/70 flex-1 border-t border-dashed" />
              </div>
            ))}
          </div>

          {stats ? (
            <div className="absolute inset-0 flex items-end gap-[2px] pl-10">
              {hours.map((value, hour) => {
                const isPeak = hour === peakHour
                return (
                  <div key={hour} className="group relative flex h-full flex-1 items-end">
                    <div
                      className={
                        isPeak
                          ? "bg-chart-1 w-full rounded-t-[4px]"
                          : "bg-chart-1/65 group-hover:bg-chart-1 w-full rounded-t-[4px] transition-colors"
                      }
                      style={{ height: `${(value / scaleMax) * 100}%` }}
                    />
                    {/* ป้ายกำกับค่าพีค — ไม่ต้อง hover ก็อ่านได้ */}
                    {isPeak ? (
                      <span className="text-chart-1 absolute bottom-full left-1/2 mb-1 -translate-x-1/2 text-[10px] font-semibold tabular-nums">
                        {nf.format(value)}
                      </span>
                    ) : null}
                    {/* tooltip ตอน hover */}
                    <div className="bg-popover text-popover-foreground ring-border pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 hidden -translate-x-1/2 rounded-md px-2 py-1 text-xs whitespace-nowrap shadow-md ring-1 group-hover:block">
                      <span className="tabular-nums">{String(hour).padStart(2, "0")}:00</span>
                      <span className="text-muted-foreground"> · </span>
                      <span className="font-medium tabular-nums">
                        {t("tooltip", { value: nf.format(value) })}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : failed ? null : (
            <Skeleton className="absolute inset-y-0 right-0 left-10" />
          )}
        </div>

        <div className="text-muted-foreground mt-2 flex justify-between pl-10 text-xs tabular-nums">
          <span>00:00</span>
          <span>06:00</span>
          <span>12:00</span>
          <span>18:00</span>
          <span>23:00</span>
        </div>
      </CardContent>
    </Card>
  )
}
