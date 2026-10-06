"use client"

import * as React from "react"
import { Wallet } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"

import {
  getRevenueMonthStats,
  type RevenueMonthStats,
} from "@/app/dashboard/_components/api"
import { MonthCard } from "@/app/dashboard/_components/month_card"
import { intlLocale } from "@/i18n/config"
import { formatTHB } from "@/lib/mock-data"

/**
 * revenue_month_card.tsx — card "รายได้เดือนนี้" ของหน้า dashboard (06/10/2026 แทน card ตัวอย่างเดิม)
 *
 * ผลรวม so.pay_amount ของทุกบรรทัดสินค้าที่ po_date อยู่ในเดือนนี้ (เวลาไทย) ไม่นับใบที่สถานะ "ยกเลิก"
 * ดึงข้อมูลเอง (client) แบบเดียวกับ SoMonthCard · หน้าตาอยู่ที่ month_card.tsx
 */
export function RevenueMonthCard() {
  const t = useTranslations("dashboard.revenueMonth")
  const locale = useLocale()
  const nf = new Intl.NumberFormat(intlLocale(locale))

  const [stats, setStats] = React.useState<RevenueMonthStats | null>(null)
  const [failed, setFailed] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false
    getRevenueMonthStats()
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
      icon={Wallet}
      tone="success"
      failed={failed}
      data={
        stats && {
          month: stats.month,
          value: stats.revenue,
          prevMonth: stats.prev_month,
          prevSamePeriod: stats.prev_same_period,
          prevMonthTotal: stats.prev_month_total,
        }
      }
      format={(value) => formatTHB(value, locale)}
      detail={stats ? t("orders", { count: nf.format(stats.so_count) }) : undefined}
    />
  )
}
