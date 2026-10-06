"use client"

import * as React from "react"
import { Minus, TrendingDown, TrendingUp, TriangleAlert, type LucideIcon } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"

import { intlLocale } from "@/i18n/config"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

/**
 * month_card.tsx — หน้าตากลางของ card สรุปรายเดือนใน dashboard (ใบสั่งขายเดือนนี้ / รายได้เดือนนี้)
 *
 * แสดงอย่างเดียว ไม่ดึงข้อมูลเอง — card แต่ละตัว (so_month_card / revenue_month_card) ดึงแล้วส่งตัวเลขเข้ามา
 * หน้าตาเดียวกับ StatCard (แถบสีบน + ไอคอนในกรอบสี) จะได้วางแถวเดียวกับ card ตัวอย่างที่เหลือแล้วไม่แปลกตา
 * เทียบกับเดือนก่อน "ช่วงวันเดียวกัน" — เดือนนี้ยังไม่จบ เทียบทั้งเดือนจะดูลดลงเสมอ
 */

/** สีของ card — ชุดเดียวกับ tone ของ StatCard */
const TONES = {
  info: { bar: "bg-info", chip: "bg-info/12 text-info-ink" },
  success: { bar: "bg-success", chip: "bg-success/12 text-success-ink" },
  danger: { bar: "bg-danger", chip: "bg-danger/12 text-danger-ink" },
} as const

export type MonthCardData = {
  /** เดือนนี้ "YYYY-MM" */
  month: string
  /** ตัวเลขหลักของเดือนนี้ */
  value: number
  prevMonth: string
  /** ค่าเดียวกันของเดือนก่อน ช่วงวันเดียวกัน */
  prevSamePeriod: number
  /** ค่าเดียวกันของเดือนก่อนทั้งเดือน */
  prevMonthTotal: number
}

export function MonthCard({
  label,
  icon: Icon,
  tone,
  data,
  failed,
  format,
  unit,
  detail,
  breakdown,
  goodWhen = "up",
}: {
  label: string
  icon: LucideIcon
  tone: keyof typeof TONES
  /** null = ยังโหลดอยู่ (หรือโหลดไม่สำเร็จ ดู failed) */
  data: MonthCardData | null
  failed: boolean
  /** แปลงตัวเลขเป็นข้อความ (จำนวน / เงินบาท) */
  format: (value: number) => string
  /** หน่วยตัวเล็กต่อท้ายตัวเลขหลัก เช่น "ใบ" */
  unit?: string
  /** ข้อความบรรทัดล่างสุดที่ card อยากเพิ่ม (นำหน้ายอดรวมเดือนก่อน) */
  detail?: string
  /** แถวแยกย่อยใต้ตัวเลขหลัก (เช่น รวม / ยกเลิก / สุทธิ) — โชว์เมื่อมีข้อมูลแล้วเท่านั้น */
  breakdown?: React.ReactNode
  /** ตัวเลขเพิ่มขึ้นแล้วดีไหม — "down" สำหรับของที่น้อยยิ่งดี (ยกเลิก): เพิ่ม = แดง ลด = เขียว */
  goodWhen?: "up" | "down"
}) {
  const t = useTranslations("dashboard.month")
  const locale = useLocale()
  const { bar, chip } = TONES[tone]

  /** ชื่อเดือนตามภาษาที่เลือก เช่น "ตุลาคม 2569" / "October 2026" */
  const monthLabel = (ym: string) => {
    const [y, m] = ym.split("-").map(Number)
    return new Intl.DateTimeFormat(intlLocale(locale), { month: "long", year: "numeric" }).format(
      new Date(y, m - 1, 1)
    )
  }

  // เปลี่ยนแปลงเทียบช่วงเดียวกันเดือนก่อน — เดือนก่อนเป็น 0 คิดเป็น % ไม่ได้ โชว์ส่วนต่างแทน
  const diff = data ? data.value - data.prevSamePeriod : 0
  const pct = data && data.prevSamePeriod > 0 ? (diff / data.prevSamePeriod) * 100 : null
  const TrendIcon = diff > 0 ? TrendingUp : diff < 0 ? TrendingDown : Minus
  const good = goodWhen === "up" ? diff > 0 : diff < 0
  const trendInk =
    diff === 0 ? "text-muted-foreground" : good ? "text-success-ink" : "text-danger-ink"

  return (
    <Card className="relative overflow-hidden">
      <span className={cn("absolute inset-x-0 top-0 h-1", bar)} />
      <CardContent className="space-y-3 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-muted-foreground text-sm">
              {label}
              {data ? <span className="opacity-80"> · {monthLabel(data.month)}</span> : null}
            </p>
            {data ? (
              <p className="text-2xl font-semibold tabular-nums">
                {format(data.value)}
                {unit ? (
                  <span className="text-muted-foreground ml-1.5 text-sm font-normal">{unit}</span>
                ) : null}
              </p>
            ) : failed ? (
              <p className="text-warning-ink flex items-center gap-1.5 text-sm font-medium">
                <TriangleAlert className="size-4" />
                {t("loadError")}
              </p>
            ) : (
              <Skeleton className="h-8 w-24" />
            )}
          </div>
          <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", chip)}>
            <Icon className="size-5" />
          </span>
        </div>

        {data && breakdown ? breakdown : null}

        {data ? (
          <div className="space-y-1 text-xs">
            <p className="flex flex-wrap items-center gap-1.5">
              <TrendIcon className={cn("size-3.5", trendInk)} />
              <span className={cn("font-medium tabular-nums", trendInk)}>
                {pct === null
                  ? `${diff > 0 ? "+" : ""}${format(diff)}`
                  : `${pct > 0 ? "+" : ""}${pct.toFixed(1)}%`}
              </span>
              <span className="text-muted-foreground">
                {t("vsSamePeriod", { value: format(data.prevSamePeriod) })}
              </span>
            </p>
            <p className="text-muted-foreground">
              {detail ? `${detail} · ` : null}
              {t("prevTotal", { month: monthLabel(data.prevMonth), value: format(data.prevMonthTotal) })}
            </p>
          </div>
        ) : failed ? null : (
          <Skeleton className="h-4 w-40" />
        )}
      </CardContent>
    </Card>
  )
}
