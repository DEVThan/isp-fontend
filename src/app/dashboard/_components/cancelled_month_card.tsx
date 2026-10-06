"use client"

import * as React from "react"
import { Ban } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"

import {
  getCancelledMonthStats,
  type CancelledMonthStats,
} from "@/app/dashboard/_components/api"
import { MonthCard } from "@/app/dashboard/_components/month_card"
import { intlLocale } from "@/i18n/config"
import { formatTHB } from "@/lib/mock-data"

/**
 * cancelled_month_card.tsx — card "ยกเลิกเดือนนี้" ของหน้า dashboard (06/10/2026 แทน card "งานแจ้งซ่อมค้าง" ที่เป็นข้อมูลตัวอย่าง)
 *
 * จำนวนใบสั่งขายที่สถานะ "ยกเลิก" ของเดือนปัจจุบัน (ตาม so.po_date เวลาไทย) + ยอดเงิน = ผลรวม so.pay_amount ของบรรทัดที่ยกเลิก
 * ยกเลิกยิ่งน้อยยิ่งดี — goodWhen="down": เพิ่มจากเดือนก่อนเป็นสีแดง ลดเป็นสีเขียว
 * ดึงข้อมูลเอง (client) แบบเดียวกับ SoMonthCard · หน้าตาอยู่ที่ month_card.tsx
 */
export function CancelledMonthCard() {
  const t = useTranslations("dashboard.cancelledMonth")
  const locale = useLocale()
  const nf = new Intl.NumberFormat(intlLocale(locale))

  const [stats, setStats] = React.useState<CancelledMonthStats | null>(null)
  const [failed, setFailed] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false
    getCancelledMonthStats()
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
      icon={Ban}
      tone="danger"
      goodWhen="down"
      failed={failed}
      data={
        stats && {
          month: stats.month,
          value: stats.cancelled,
          prevMonth: stats.prev_month,
          prevSamePeriod: stats.prev_same_period,
          prevMonthTotal: stats.prev_month_total,
        }
      }
      format={(value) => nf.format(value)}
      unit={t("unit")}
      breakdown={
        stats ? (
          // ยอดเงินของใบที่ยกเลิก (sum pay_amount ของบรรทัดที่ยกเลิก)
          <p className="text-danger-ink bg-danger/12 inline-flex w-fit items-center gap-1 rounded-md px-2 py-0.5 text-xs">
            <span className="opacity-80">{t("amount")}</span>
            <span className="font-semibold tabular-nums">{formatTHB(stats.amount, locale)}</span>
          </p>
        ) : undefined
      }
      detail={stats ? t("prevAmount", { value: formatTHB(stats.prev_month_amount, locale) }) : undefined}
    />
  )
}
