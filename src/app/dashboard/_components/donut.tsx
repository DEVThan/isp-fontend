"use client"

import * as React from "react"
import { useLocale } from "next-intl"

import { intlLocale } from "@/i18n/config"
import { cn } from "@/lib/utils"

/**
 * donut.tsx — กราฟโดนัท + legend ของ dashboard ใช้ร่วมกันระหว่างประเภทสินค้าขายดี (top_types_card) และสินค้าขายดีรายเดือน (top_items_month_card)
 *
 * กลางวงเป็นยอดรวม · hover/แตะชิ้นในวงหรือแถว legend → กลางวงเปลี่ยนเป็นตัวเลขของชิ้นนั้น
 * legend มีชื่อ รายละเอียด จำนวน และ % ครบ สีจึงไม่ใช่ช่องทางเดียวที่บอกว่าอันไหนคืออันไหน (ใช้แทนตารางได้)
 */

/** "อื่น ๆ" สีเทากลาง ไม่ใช่ฮิวใหม่ */
export const OTHER_COLOR = "color-mix(in oklab, var(--muted-foreground) 45%, transparent)"

export type Slice = {
  key: string
  label: string
  detail: string
  qty: number
  color: string
  /** ป้ายเล็กหน้าชื่อใน legend (เช่นอันดับ "1") — ไม่ส่ง = จุดสีอย่างเดียว */
  badge?: string
  /** พื้นป้ายสีอ่อน → ตัวเลขสีเข้ม (ตัวขาวบนฟ้าอ่อนอ่านไม่ออก) */
  badgeLight?: boolean
}

export function DonutBreakdown({
  slices,
  total,
  unit,
  shareTitle,
}: {
  slices: Slice[]
  /** ยอดรวมทั้งช่วง (ตัวหารของ %) */
  total: number
  /** หน่วยใต้ตัวเลขกลางวง/หลังตัวเลขใน legend เช่น "ชิ้น" */
  unit: string
  /** title ของตัวเลข % ใน legend */
  shareTitle: string
}) {
  const locale = useLocale()
  const nf = new Intl.NumberFormat(intlLocale(locale))
  /** ชิ้นที่ชี้อยู่ (วงหรือแถว legend) — null = โชว์ยอดรวมกลางวง */
  const [active, setActive] = React.useState<number | null>(null)
  const activeSlice = active === null ? null : slices[active]

  return (
    <div className="space-y-4">
      <Donut
        slices={slices}
        total={total}
        active={active}
        onActive={setActive}
        center={
          activeSlice
            ? { value: nf.format(activeSlice.qty), label: activeSlice.label }
            : { value: nf.format(total), label: unit }
        }
      />
      <ul className="space-y-1">
        {slices.map((slice, index) => (
          <li
            key={slice.key}
            onMouseEnter={() => setActive(index)}
            onMouseLeave={() => setActive(null)}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors",
              active === index && "bg-muted"
            )}
          >
            {slice.badge ? (
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold tabular-nums",
                  slice.badgeLight ? "text-foreground" : "text-white"
                )}
                style={{ background: slice.color }}
              >
                {slice.badge}
              </span>
            ) : (
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: slice.color }} />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium" title={slice.label}>
                {slice.label}
              </p>
              <p className="text-muted-foreground truncate text-xs">{slice.detail}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-semibold tabular-nums">
                {nf.format(slice.qty)}
                <span className="text-muted-foreground ml-1 text-xs font-normal">{unit}</span>
              </p>
              <p className="text-muted-foreground text-xs tabular-nums" title={shareTitle}>
                {total > 0 ? `${((slice.qty / total) * 100).toFixed(1)}%` : null}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** วงโดนัท SVG — แต่ละชิ้นเป็น circle ที่ใช้ stroke-dasharray (pathLength 100 = ร้อยละ) เว้นช่องระหว่างชิ้นเล็กน้อย */
function Donut({
  slices,
  total,
  active,
  onActive,
  center,
}: {
  slices: Slice[]
  total: number
  active: number | null
  onActive: (index: number | null) => void
  center: { value: string; label: string }
}) {
  // ช่องว่างระหว่างชิ้น (หน่วยร้อยละของเส้นรอบวง) — ชิ้นเดียวทั้งวงไม่ต้องเว้น
  const gap = slices.length > 1 ? 0.8 : 0
  const pcts = slices.map((slice) => (total > 0 ? (slice.qty / total) * 100 : 0))
  /** จุดเริ่มของแต่ละชิ้น = ผลรวมร้อยละของชิ้นก่อนหน้า */
  const starts = pcts.map((_, index) => pcts.slice(0, index).reduce((sum, pct) => sum + pct, 0))

  return (
    <div className="relative mx-auto size-44">
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        <circle cx="50" cy="50" r="40" fill="none" strokeWidth="14" className="stroke-muted" />
        {slices.map((slice, index) => {
          const pct = pcts[index]
          const dash = Math.max(pct - gap, 0.4)
          return (
            <circle
              key={slice.key}
              cx="50"
              cy="50"
              r="40"
              fill="none"
              pathLength={100}
              stroke={slice.color}
              strokeWidth={active === index ? 17 : 14}
              strokeDasharray={`${dash} ${100 - dash}`}
              strokeDashoffset={-starts[index]}
              className="cursor-pointer transition-[stroke-width,opacity] duration-150"
              style={{ opacity: active === null || active === index ? 1 : 0.45 }}
              onMouseEnter={() => onActive(index)}
              onMouseLeave={() => onActive(null)}
            >
              <title>{`${slice.label}: ${pct.toFixed(1)}%`}</title>
            </circle>
          )
        })}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
        <span className="text-2xl font-semibold tabular-nums">{center.value}</span>
        <span className="text-muted-foreground max-w-full truncate text-xs">{center.label}</span>
      </div>
    </div>
  )
}
