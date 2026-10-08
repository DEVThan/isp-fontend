"use client"

import * as React from "react"
import { TriangleAlert } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"

import { getTopTypesStats, type TopTypesStats } from "@/app/dashboard/_components/api"
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
import { cn } from "@/lib/utils"

/** สีของชิ้นตามอันดับ — chart-1..3 ตามลำดับคงที่ของชุดสีกราฟ (ห้ามสลับ) */
const SLICE_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)"]
/** "อื่น ๆ" สีเทากลาง ไม่ใช่ฮิวใหม่ */
const OTHER_COLOR = "color-mix(in oklab, var(--muted-foreground) 45%, transparent)"

type Slice = { key: string; label: string; detail: string; qty: number; color: string }

/**
 * top_types_card.tsx — card "ประเภทสินค้าขายดี" ของหน้า dashboard (08/10/2026 แทน "งานแจ้งปัญหาล่าสุด" ที่เป็นข้อมูลตัวอย่าง)
 *
 * 5 อันดับของวันที่เลือก (ค่าเริ่มต้นวันนี้) จัดกลุ่มตาม so.product_type_name เรียงตามจำนวนชิ้น ไม่นับใบยกเลิก — /dashboard-top-types
 * แสดงเป็นกราฟโดนัท (ผู้ใช้เลือก 08/10/2026): 3 อันดับแรก + "อื่น ๆ" (ประเภทที่เหลือทั้งวัน) กลางวงเป็นยอดชิ้นทั้งวัน
 * hover ชิ้นในวงหรือแถว legend → กลางวงเปลี่ยนเป็นตัวเลขของชิ้นนั้น · legend มีตัวเลขครบ ใช้แทนตารางได้
 * ตัวเลือกวันโชว์หลังโหลดรอบแรกเสร็จ (ใช้ stats.today) เหตุผลเดียวกับ so_today_chart.tsx
 */
export function TopTypesCard() {
  const t = useTranslations("dashboard.topTypes")
  const tm = useTranslations("dashboard.month")
  const locale = useLocale()
  const nf = new Intl.NumberFormat(intlLocale(locale))

  /** วันที่เลือก "YYYY-MM-DD" · ว่าง = วันนี้ */
  const [date, setDate] = React.useState("")
  const [stats, setStats] = React.useState<TopTypesStats | null>(null)
  const [failed, setFailed] = React.useState(false)
  /** วันที่ของตัวเลือก — จำไว้แยกจาก stats ระหว่างโหลดวันใหม่ปุ่มจะได้ไม่หาย */
  const [shown, setShown] = React.useState("")

  const changeDate = (next: string) => {
    setDate(next === toDayKey(new Date()) ? "" : next)
    setShown(next)
    setStats(null)
    setFailed(false)
  }

  React.useEffect(() => {
    let cancelled = false
    getTopTypesStats(date || undefined)
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

  /** ชิ้นที่ชี้อยู่ (วงหรือแถว legend) — null = โชว์ยอดรวมกลางวง */
  const [active, setActive] = React.useState<number | null>(null)

  // 3 อันดับแรกได้สีของตัวเอง ที่เหลือรวมเป็น "อื่น ๆ" สีเทา — ชุดสีกราฟผ่านการแยกสีสำหรับคนตาบอดสีแค่ 3 สีแรก
  const slices: Slice[] = stats
    ? (() => {
        const head = stats.types.slice(0, SLICE_COLORS.length).map((row, index) => ({
          key: row.product_type_name,
          label: row.product_type_name,
          detail: t("detail", { orders: nf.format(row.orders), items: nf.format(row.items) }),
          qty: row.qty,
          color: SLICE_COLORS[index],
        }))
        const rest = stats.total_qty - head.reduce((sum, slice) => sum + slice.qty, 0)
        const restTypes = stats.type_count - head.length
        return rest > 0 && restTypes > 0
          ? [...head, { key: "__other", label: t("other"), detail: t("otherDetail", { types: nf.format(restTypes) }), qty: rest, color: OTHER_COLOR }]
          : head
      })()
    : []
  const activeSlice = active === null ? null : slices[active]

  return (
    <Card className="h-full">
      {/* หัว card เป็น flex-wrap (ไม่ใช่ grid ของ CardHeader): ที่ไม่พอ (มือถือ) ตัวเลือกวันลงบรรทัดใหม่เอง
          คำอธิบายเต็มความกว้างบรรทัดสุดท้ายเสมอ ไม่ถูกบีบข้างปุ่ม */}
      <CardHeader className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <CardTitle className="min-w-40 flex-1">{date ? t("titleDay") : t("title")}</CardTitle>
        <CardDescription className="order-last basis-full">
          {stats ? (
            stats.types.length ? (
              t("description", {
                qty: nf.format(stats.total_qty),
                types: nf.format(stats.type_count),
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
            <Skeleton className="h-4 w-40" />
          )}
        </CardDescription>
        <CardAction className="shrink-0">
          {shown ? (
            <DayPicker value={shown} onChange={changeDate} />
          ) : failed ? null : (
            <Skeleton className="h-8 w-44" />
          )}
        </CardAction>
      </CardHeader>
      <CardContent>
        {stats ? (
          slices.length ? (
            <div className="space-y-4">
              <Donut
                slices={slices}
                total={stats.total_qty}
                active={active}
                onActive={setActive}
                center={
                  activeSlice
                    ? { value: nf.format(activeSlice.qty), label: activeSlice.label }
                    : { value: nf.format(stats.total_qty), label: t("unit") }
                }
              />
              {/* legend = ตารางตัวเลข สีจึงไม่ใช่ช่องทางเดียวที่บอกว่าอันไหนคืออันไหน · hover แถวแล้วชิ้นในวงเด่นขึ้น */}
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
                    <span className="size-2.5 shrink-0 rounded-full" style={{ background: slice.color }} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium" title={slice.label}>
                        {slice.label}
                      </p>
                      <p className="text-muted-foreground text-xs">{slice.detail}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-semibold tabular-nums">
                        {nf.format(slice.qty)}
                        <span className="text-muted-foreground ml-1 text-xs font-normal">{t("unit")}</span>
                      </p>
                      <p className="text-muted-foreground text-xs tabular-nums" title={t("share")}>
                        {((slice.qty / stats.total_qty) * 100).toFixed(1)}%
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
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
