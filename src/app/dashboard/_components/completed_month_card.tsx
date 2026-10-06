"use client"

import * as React from "react"
import { PackageCheck } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"

import {
  getCompletedMonthStats,
  type CompletedMonthStats,
} from "@/app/dashboard/_components/api"
import { MonthCard } from "@/app/dashboard/_components/month_card"
import { intlLocale } from "@/i18n/config"
import { formatTHB } from "@/lib/mock-data"

/**
 * completed_month_card.tsx — card "สำเร็จเดือนนี้" ของหน้า dashboard (06/10/2026 แทน card "ค้างชำระ" ที่เป็นข้อมูลตัวอย่าง)
 *
 * จำนวนใบสั่งขายที่สถานะ "ลูกค้าได้รับสินค้าแล้ว" (ผู้ใช้เลือกเป็นความหมายของ complete) ของเดือนปัจจุบัน
 * (ตาม so.po_date เวลาไทย) + ยอดเงิน = ผลรวม so.pay_amount ของบรรทัดสถานะนั้น
 * ดึงข้อมูลเอง (client) แบบเดียวกับ CancelledMonthCard · หน้าตาอยู่ที่ month_card.tsx
 */
export function CompletedMonthCard() {
  const t = useTranslations("dashboard.completedMonth")
  const locale = useLocale()
  const nf = new Intl.NumberFormat(intlLocale(locale))

  const [stats, setStats] = React.useState<CompletedMonthStats | null>(null)
  const [failed, setFailed] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false
    getCompletedMonthStats()
      .then((next) => {
        if (!cancelled) setStats(next)
      })
      // ห้าม console.error — ใน dev overlay จะขึ้นเต็มจอเหมือนหน้าพัง
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <MonthCard
      label={t("label")}
      icon={PackageCheck}
      tone="success"
      failed={failed}
      data={
        stats && {
          month: stats.month,
          value: stats.completed,
          prevMonth: stats.prev_month,
          prevSamePeriod: stats.prev_same_period,
          prevMonthTotal: stats.prev_month_total,
        }
      }
      format={(value) => nf.format(value)}
      unit={t("unit")}
      breakdown={
        stats ? (
          // ยอดเงินของใบที่สำเร็จ (sum pay_amount ของบรรทัดสถานะลูกค้าได้รับสินค้าแล้ว)
          <p className="text-success-ink bg-success/12 inline-flex w-fit items-center gap-1 rounded-md px-2 py-0.5 text-xs">
            <span className="opacity-80">{t("amount")}</span>
            <span className="font-semibold tabular-nums">{formatTHB(stats.amount, locale)}</span>
          </p>
        ) : undefined
      }
      detail={stats ? t("prevAmount", { value: formatTHB(stats.prev_month_amount, locale) }) : undefined}
    />
  )
}
