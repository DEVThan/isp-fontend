"use client"

import * as React from "react"
import { ChevronDown, ChevronLeft, ChevronRight, TriangleAlert } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"

import {
  getSalesmanDailyStats,
  getSalesmanMonthStats,
  type SalesmanStats,
} from "@/app/dashboard/_components/api"
import { DayPicker, toDayKey } from "@/app/dashboard/_components/day_picker"
import { MonthPicker, toMonthKey } from "@/app/dashboard/_components/month_picker"
import { intlLocale } from "@/i18n/config"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatTHB } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

/** ผลของทั้งสองเส้นในรูปเดียวกัน — at = วัน (YYYY-MM-DD) หรือเดือน (YYYY-MM) ของข้อมูล · "all" = ทุกเดือน */
type RankStats = SalesmanStats & { at: string }

/** รายวัน /dashboard-salesman-daily · รายเดือน /dashboard-salesman-month */
const loaders = {
  day: (at?: string) => getSalesmanDailyStats(at).then(({ today, ...rest }): RankStats => ({ ...rest, at: today })),
  month: (at?: string) => getSalesmanMonthStats(at).then(({ month, ...rest }): RankStats => ({ ...rest, at: month })),
}

/**
 * salesman_rank_card.tsx — card "อันดับพนักงานขาย" (16/10/2026) ใน section รายเดือน (period="month") และรายวัน (period="day")
 *
 * ทุกพนักงาน (so.sell_by) ของช่วงที่เลือก เรียงตามยอดขาย sum(pay_amount) ไม่นับยกเลิก — API เรียงและให้ rank/share มาแล้ว
 * รายชื่อไม่ตัด 5 อันดับ จึงเลื่อนขึ้นลงในตัว card (ผู้ใช้ขอ scroll bar) หัวตารางติดอยู่ด้านบน
 * ใช้ <table> เองแทน <Table>: container ของ Table เป็น overflow-x-auto — หัวตาราง sticky จะไปเกาะกล่องนั้นซึ่งไม่ได้เลื่อนแนวตั้ง
 * ตัวเลือกวัน/เดือนโชว์หลังโหลดรอบแรกเสร็จ เหตุผลเดียวกับ so_today_chart.tsx
 * 16/10/2026 (ผู้ใช้ขอ): กล่องสูงพอดี 7 อันดับ · ขอบจาง + ปุ่มลูกศรบอกว่ายังเลื่อนลง/ซ้ายขวาได้ (มือถือด้วย)
 * รายชื่อ = ทุกคนที่เคยมีใน so + แถว "ไม่ระบุพนักงาน" (API จัดให้ 16/10/2026) — ไม่มียอดในช่วงนี้ขึ้น 0 แถวจาง อันดับ "–"
 * ยอดขายอยู่ใน badge ทอง (แบบ Pay Amount หน้า so) · รายเดือนมีปุ่ม ALL = ทุกเดือน (/dashboard-salesman-month {month:"all"})
 */

/** จำนวนอันดับที่เห็นพร้อมกันก่อนต้องเลื่อน */
const VISIBLE_ROWS = 7
export function SalesmanRankCard({ period }: { period: "day" | "month" }) {
  const t = useTranslations("dashboard.salesman")
  const tm = useTranslations("dashboard.month")
  const locale = useLocale()
  const nf = new Intl.NumberFormat(intlLocale(locale))

  /** วัน/เดือนที่เลือก ("YYYY-MM-DD" / "YYYY-MM" / "all") · ว่าง = วันนี้/เดือนนี้ */
  const [date, setDate] = React.useState("")
  const [stats, setStats] = React.useState<RankStats | null>(null)
  const [failed, setFailed] = React.useState(false)
  /** วันที่ของตัวเลือก — จำไว้แยกจาก stats ระหว่างโหลดช่วงใหม่ปุ่มจะได้ไม่หาย · ตอน ALL ยังจำเดือนล่าสุดไว้ กดกลับได้ */
  const [shown, setShown] = React.useState("")
  const all = date === "all"

  const changeDate = (next: string) => {
    const current = period === "day" ? toDayKey(new Date()) : toMonthKey(new Date())
    setDate(next === current ? "" : next)
    if (next !== "all") setShown(next)
    setStats(null)
    setFailed(false)
  }

  React.useEffect(() => {
    let cancelled = false
    loaders[period](date || undefined)
      .then((next) => {
        if (cancelled) return
        setStats(next)
        if (next.at !== "all") setShown(next.at)
      })
      // ห้าม console.error — ใน dev overlay จะขึ้นเต็มจอเหมือนหน้าพัง
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [date, period])

  const scrollRef = React.useRef<HTMLDivElement>(null)
  /** ความสูงกล่อง = หัวตาราง + 7 แถวแรกพอดี — วัดจริงหลังวาด (แถวสูงต่างกันตามฟอนต์/ภาษา) ตั้ง style ตรง ๆ ไม่ผ่าน state */
  React.useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const head = el.querySelector("thead")
    const rows = [...el.querySelectorAll("tbody tr")].slice(0, VISIBLE_ROWS) as HTMLElement[]
    // +2 = เส้นขอบบน/ล่างของกล่อง ไม่งั้นแถวที่ 7 โดนตัดเส้นล่าง
    el.style.maxHeight = `${(head?.offsetHeight ?? 0) + rows.reduce((sum, row) => sum + row.offsetHeight, 0) + 2}px`
  }, [stats])

  /** ยังเลื่อนลง/ซ้าย/ขวาได้อีกไหม — โชว์ขอบจาง + ปุ่มฝั่งนั้น (แบบเดียวกับกราฟแท่ง count_bars.tsx) */
  const [more, setMore] = React.useState({ down: false, left: false, right: false })
  const checkMore = React.useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    // เผื่อ 1px — scroll บนจอ retina เป็นทศนิยม ชนขอบแล้วอาจขาดอีกเศษเสี้ยว
    const next = {
      down: el.scrollTop + el.clientHeight < el.scrollHeight - 1,
      left: el.scrollLeft > 1,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 1,
    }
    setMore((prev) =>
      prev.down === next.down && prev.left === next.left && prev.right === next.right ? prev : next
    )
  }, [])
  // ขนาดกล่องหรือข้อมูลเปลี่ยน (หมุนจอ / โหลดเสร็จ) ต้องเช็กใหม่ — onScroll อย่างเดียวไม่พอ
  React.useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const observer = new ResizeObserver(checkMore)
    observer.observe(el)
    if (el.firstElementChild) observer.observe(el.firstElementChild)
    return () => observer.disconnect()
  }, [checkMore, stats])
  const page = (dir: "down" | "left" | "right") => {
    const el = scrollRef.current
    if (!el) return
    if (dir === "down") el.scrollBy({ top: el.clientHeight * 0.6, behavior: "smooth" })
    else el.scrollBy({ left: (dir === "left" ? -1 : 1) * el.clientWidth * 0.6, behavior: "smooth" })
  }

  const title = all
    ? t("titleAll")
    : date
      ? t(period === "day" ? "titleDay" : "titleMonth")
      : t(period === "day" ? "titleToday" : "titleThisMonth")
  /** แถบสัดส่วนวัดเทียบอันดับ 1 (ไม่ใช่ 100%) — คนท้าย ๆ ยังเห็นความต่างกันชัด ตัวเลข % จริงกำกับข้างแถบ */
  const topShare = stats?.salesmen[0]?.share || 0
  /** ปุ่มกลมลอยบนขอบจาง — ขอบจางไม่รับคลิก (แตะแถวใต้มันได้) ปุ่มรับคลิกเอง */
  const hintButton = "bg-card text-muted-foreground ring-border hover:text-foreground pointer-events-auto flex cursor-pointer items-center justify-center rounded-full shadow-md ring-1"

  return (
    <Card>
      {/* หัว card flex-wrap แบบเดียวกับ card อื่น — ที่ไม่พอ ตัวเลือกลงบรรทัดใหม่เอง */}
      <CardHeader className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <CardTitle className="min-w-40 flex-1">{title}</CardTitle>
        <CardDescription className="order-last basis-full">
          {stats ? (
            stats.total_orders ? (
              t("description", {
                amount: formatTHB(stats.total_amount, locale),
                orders: nf.format(stats.total_orders),
                active: nf.format(stats.active_count ?? stats.salesman_count),
                people: nf.format(stats.salesman_count),
              })
            ) : (
              t(period === "day" ? "emptyDay" : "emptyMonth")
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
        <CardAction className="flex shrink-0 items-center gap-1.5">
          {shown ? (
            period === "day" ? (
              <DayPicker value={shown} onChange={changeDate} />
            ) : (
              <>
                {/* ALL = ทุกเดือน · กดซ้ำกลับไปเดือนที่เลือกไว้ล่าสุด · ตัวเลือกเดือนจางลงตอน ALL แต่ยังกดเลือกเดือนได้ */}
                <Button
                  type="button"
                  size="sm"
                  variant={all ? "default" : "outline"}
                  aria-pressed={all}
                  onClick={() => changeDate(all ? shown : "all")}
                >
                  {t("all")}
                </Button>
                <div className={cn(all && "opacity-50 transition-opacity hover:opacity-100")}>
                  <MonthPicker value={shown} onChange={changeDate} />
                </div>
              </>
            )
          ) : failed ? null : (
            <Skeleton className="h-8 w-44" />
          )}
        </CardAction>
      </CardHeader>
      <CardContent>
        {stats ? (
          stats.salesmen.length ? (
            <div>
              <div className="relative">
                {/* กล่องเดียวเลื่อนได้ทั้งสองแนว: สูงพอดี 7 อันดับแล้วเลื่อนลง · มือถือเลื่อนซ้ายขวา */}
                <div ref={scrollRef} onScroll={checkMore} className="overflow-auto overscroll-contain rounded-md border">
                  <table className="w-full min-w-[46rem] text-sm">
                    <TableHeader className="bg-card sticky top-0 z-10 shadow-[inset_0_-1px_0_var(--border)]">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-14 text-center">{t("columns.rank")}</TableHead>
                        <TableHead>{t("columns.name")}</TableHead>
                        <TableHead className="text-right">{t("columns.amount")}</TableHead>
                        <TableHead className="text-right">{t("columns.orders")}</TableHead>
                        <TableHead className="text-right">{t("columns.qty")}</TableHead>
                        <TableHead className="text-right">{t("columns.avg")}</TableHead>
                        <TableHead className="text-right">{t("columns.cancelled")}</TableHead>
                        <TableHead className="w-56">{t("columns.share")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.salesmen.map((row) => (
                        // แถวที่ไม่มีบรรทัดในช่วงนี้จางลง — ยังอยู่ในตารางให้เห็นครบทุกคน (ผู้ใช้ขอ 16/10/2026)
                        <TableRow
                          key={row.sell_by || "__none"}
                          className={cn(!row.orders && !row.cancelled && "opacity-55")}
                        >
                          <TableCell className="text-center">
                            {/* 3 อันดับแรกป้ายสีทอง (โทนเดียวกับ card สำเร็จ) ที่เหลือสีเทา · ไม่มีอันดับ = "–" */}
                            <span
                              className={cn(
                                "inline-flex size-6 items-center justify-center rounded-md text-xs font-semibold tabular-nums",
                                row.rank !== null && row.rank <= 3
                                  ? "bg-warning/18 text-warning-ink dark:text-warning"
                                  : "bg-muted text-muted-foreground"
                              )}
                            >
                              {row.rank ?? "–"}
                            </span>
                          </TableCell>
                          <TableCell className="font-medium">
                            {row.sell_by || <span className="text-muted-foreground italic">{t("unknown")}</span>}
                          </TableCell>
                          <TableCell className="text-right">
                            {/* badge ทองแบบ Pay Amount ของหน้า so (ผู้ใช้ขอ 16/10/2026) */}
                            <span className="bg-warning/18 text-warning-ink dark:text-warning inline-block rounded-md px-2 py-0.5 font-semibold tabular-nums">
                              {formatTHB(row.amount, locale)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{nf.format(row.orders)}</TableCell>
                          <TableCell className="text-right tabular-nums">{nf.format(row.qty)}</TableCell>
                          <TableCell className="text-muted-foreground text-right tabular-nums">
                            {formatTHB(row.avg_amount, locale)}
                          </TableCell>
                          <TableCell
                            className={cn("text-right tabular-nums", row.cancelled ? "text-danger" : "text-muted-foreground")}
                          >
                            {nf.format(row.cancelled)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
                                <div
                                  className="bg-chart-1 h-full rounded-full"
                                  style={{ width: `${topShare > 0 ? (row.share / topShare) * 100 : 0}%` }}
                                />
                              </div>
                              <span className="text-muted-foreground w-12 text-right text-xs tabular-nums">
                                {row.share.toFixed(1)}%
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </table>
                </div>

                {/* ยังมีอันดับซ่อนอยู่ข้างล่าง: ขอบล่างจางบาง ๆ (ไม่บังแถวที่ 7) — ปุ่ม "เลื่อนดูเพิ่ม" อยู่ใต้กล่อง */}
                {more.down ? (
                  <div className="from-card pointer-events-none absolute inset-x-px bottom-px h-5 rounded-b-md bg-gradient-to-t to-transparent" />
                ) : null}
                {/* ยังมีคอลัมน์ซ่อนซ้าย/ขวา (มือถือ): ขอบจาง + ปุ่มลูกศร */}
                {(["left", "right"] as const).map((side) =>
                  more[side] ? (
                    <div
                      key={side}
                      className={cn(
                        "from-card pointer-events-none absolute inset-y-px flex w-10 items-center to-transparent",
                        side === "left" ? "left-px justify-start bg-gradient-to-r" : "right-px justify-end bg-gradient-to-l"
                      )}
                    >
                      <button
                        type="button"
                        aria-label={t(side === "left" ? "scrollLeft" : "scrollRight")}
                        onClick={() => page(side)}
                        className={cn(hintButton, "size-7")}
                      >
                        {side === "left" ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
                      </button>
                    </div>
                  ) : null
                )}
              </div>
              {/* invisible แทนการถอดออก — เลื่อนถึงล่างสุดแล้ว card จะได้ไม่หดกระตุก */}
              <div className={cn("mt-2 flex justify-center", !more.down && "invisible")}>
                <button type="button" onClick={() => page("down")} className={cn(hintButton, "h-7 gap-1 px-3 text-xs")}>
                  <ChevronDown className="size-4 animate-bounce" />
                  {t("scrollMore")}
                </button>
              </div>
            </div>
          ) : null
        ) : failed ? null : (
          <div className="space-y-3">
            {[0, 1, 2, 3, 4, 5].map((row) => (
              <Skeleton key={row} className="h-9 w-full" />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
