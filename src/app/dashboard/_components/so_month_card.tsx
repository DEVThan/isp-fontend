"use client"

import * as React from "react"
import { ShoppingBag } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"

import { getSoMonthStats, type SoMonthStats } from "@/app/dashboard/_components/api"
import { MonthCard } from "@/app/dashboard/_components/month_card"
import { intlLocale } from "@/i18n/config"
import { cn } from "@/lib/utils"

/**
 * so_month_card.tsx — card "ใบสั่งขายเดือนนี้" ของหน้า dashboard (06/10/2026 แทน card "ลูกค้าทั้งหมด" ที่เป็นข้อมูลตัวอย่าง)
 *
 * นับจาก so.po_date ของเดือนปัจจุบัน (เวลาไทย) — นับเป็นใบ (so_code ไม่ซ้ำ) ไม่ใช่บรรทัดสินค้า
 * ดึงข้อมูลเอง (client) — หน้า dashboard เปิดได้ทันที และเปลี่ยนภาษา (router.refresh) ไม่ยิง API ซ้ำ
 * หน้าตาอยู่ที่ month_card.tsx (ใช้ร่วมกับ card รายได้)
 */
/** ป้ายตัวเลขย่อย "ชื่อ จำนวน" ในแถวแยกย่อยของ card */
function Chip({ label, value, className }: { label: string; value: string; className: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5", className)}>
      <span className="opacity-80">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </span>
  )
}

export function SoMonthCard() {
  const t = useTranslations("dashboard.soMonth")
  const locale = useLocale()
  const nf = new Intl.NumberFormat(intlLocale(locale))

  const [stats, setStats] = React.useState<SoMonthStats | null>(null)
  const [failed, setFailed] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false
    getSoMonthStats()
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
      icon={ShoppingBag}
      tone="info"
      failed={failed}
      data={
        stats && {
          month: stats.month,
          value: stats.so_count,
          prevMonth: stats.prev_month,
          prevSamePeriod: stats.prev_same_period,
          prevMonthTotal: stats.prev_month_total,
        }
      }
      format={(value) => nf.format(value)}
      unit={t("unit")}
      detail={stats ? t("lines", { lines: nf.format(stats.lines) }) : undefined}
      breakdown={
        // typeof: API เก่าที่ยังไม่ส่ง cancelled มา -> ไม่โชว์แถวนี้ (ไม่งั้นได้ NaN)
        stats && typeof stats.cancelled === "number" ? (
          // รวม = ทุกใบของเดือน (ตัวเลขหลัก) · ยกเลิก = ใบที่สถานะยกเลิก · สุทธิ = รวม − ยกเลิก
          <div className="flex flex-wrap gap-1.5 text-xs">
            <Chip label={t("total")} value={nf.format(stats.so_count)} className="bg-muted text-foreground" />
            <Chip label={t("cancelled")} value={nf.format(stats.cancelled)} className="bg-danger/12 text-danger-ink" />
            <Chip label={t("net")} value={nf.format(stats.so_count - stats.cancelled)} className="bg-success/12 text-success-ink" />
          </div>
        ) : undefined
      }
    />
  )
}
