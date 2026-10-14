"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"

import { intlLocale } from "@/i18n/config"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

/**
 * count_bars.tsx — กราฟแท่งนับจำนวน (ใบ) ของ dashboard ใช้ร่วมกันระหว่างรายชั่วโมง (so_today_chart) และรายวันของเดือน (so_daily_chart)
 *
 * แท่ง CSS ล้วน ซีรีส์เดียวสี chart-1 (ไม่ต้องมี legend หัว card บอกอยู่แล้ว) · แท่งสูงสุดเข้มกว่าและมีตัวเลขกำกับ
 * แต่ละคอลัมน์เป็นปุ่มสูงเต็มกราฟ: คอม hover ดู · มือถือแตะแล้วป้ายค้าง แตะซ้ำ/แตะนอกกราฟปิด
 * (hover: ของ Tailwind v4 ทำงานเฉพาะอุปกรณ์ที่ hover ได้ มือถือจึงต้องจำแท่งที่แตะไว้เอง)
 * ผู้ใช้ใส่ key ตามวัน/เดือนของข้อมูล — เปลี่ยนช่วงแล้วแท่งที่แตะค้างไว้ล้างเอง
 * ผู้ใช้ต้องให้ Card เป็น flex-col และ CardContent เป็น flex-1 flex-col กราฟถึงจะยืดเต็ม card
 *
 * ส่ง amounts มาด้วย (14/10/2026 ผู้ใช้ขอให้เห็นยอดขายบนกราฟ) = กราฟผสม: ความสูงแท่ง = ยอดขาย แกนซ้าย (ผู้ใช้ขอ
 * "ความสูงของยอดขาย" หลังเห็นแบบแท่งจำนวนใบ) + เส้นจำนวนใบสี chart-2 แกนขวา
 * สองหน่วยต่างกันจึงแยกแกน และมี legend บอกว่าแท่ง/เส้นคืออะไร (สีไม่ได้บอกความหมายตัวเดียว)
 */
export function CountBars({
  values,
  failed,
  label,
  tooltip,
  ticks,
  tickLabel = label,
  detail,
  amounts,
  legend,
}: {
  /** null = ยังโหลดอยู่ (หรือโหลดไม่สำเร็จ ดู failed) */
  values: number[] | null
  failed: boolean
  /** ชื่อของแท่งที่ index นั้น เช่น "14:00" / "5 ต.ค." */
  label: (index: number) => string
  /** ข้อความจำนวน เช่น "52 ใบ" */
  tooltip: (value: number) => string
  /** index ที่เขียนป้ายใต้แกน */
  ticks: number[]
  /** ป้ายใต้แกน ถ้าอยากสั้นกว่าชื่อแท่ง (เช่นแกนเขียน "5" แต่ป้ายแท่งเขียน "5 ต.ค.") — ไม่ส่ง = ใช้ label */
  tickLabel?: (index: number) => string
  /** บรรทัดที่สองของป้าย เช่น "ยอดขาย ฿52,139" — ไม่ส่ง = บรรทัดเดียว */
  detail?: (index: number) => string
  /** ยอดขายต่อแท่ง (บาท) — ส่งมา = แท่งสูงตามยอดขาย และจำนวนใบย้ายไปเป็นเส้นแกนขวา · ไม่ส่ง = แท่งจำนวนใบอย่างเดียวแบบเดิม */
  amounts?: number[]
  /** ชื่อใน legend ตอนเป็นกราฟผสม */
  legend?: { count: string; amount: string }
}) {
  const locale = useLocale()
  const ts = useTranslations("dashboard.chartScroll")
  const nf = new Intl.NumberFormat(intlLocale(locale))
  // แกนยอดขายใช้ตัวย่อ 12.5K / 1.3M ทุกภาษา — แบบย่อของพม่าเป็นคำยาว (သောင်း/သိန်း) ล้นช่องแกน
  const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 })
  /** ยอดขายเหนือแท่ง: 3 หลักพอ ไม่มี ฿ (legend บอกหน่วยแล้ว) — 470,700 → 471K ให้ไม่เกินความกว้างแท่ง */
  const short = new Intl.NumberFormat("en", { notation: "compact", maximumSignificantDigits: 3 })

  /** แท่งที่แตะเลือกไว้ — ป้ายตัวเลขค้างจนแตะซ้ำหรือแตะนอกกราฟ */
  const [picked, setPicked] = React.useState<number | null>(null)
  const barsRef = React.useRef<HTMLDivElement>(null)
  const scrollRef = React.useRef<HTMLDivElement>(null)

  // แตะนอกแท่งกราฟ = ปิดป้าย (ฟังเฉพาะตอนมีแท่งที่เลือกอยู่)
  React.useEffect(() => {
    if (picked === null) return
    const close = (event: PointerEvent) => {
      if (!barsRef.current?.contains(event.target as Node)) setPicked(null)
    }
    document.addEventListener("pointerdown", close)
    return () => document.removeEventListener("pointerdown", close)
  }, [picked])

  const count = values?.length ?? 0
  // เพดานแกนจำนวนใบให้หาร 4 ลงตัว เส้นกริดจะเป็นจำนวนเต็มเสมอ — ช่วงที่ยังไม่มีใบเลยก็ไม่หารศูนย์
  const countMax = Math.max(4, Math.ceil((values?.length ? Math.max(...values) : 0) / 4) * 4)
  /** ยอดขาย (มี = กราฟผสม) */
  const sales = values && amounts?.length === values.length ? amounts : null
  /** ค่าของแท่ง: ยอดขายถ้ามี ไม่งั้นจำนวนใบ · เส้น: จำนวนใบ (เฉพาะกราฟผสม) */
  const bars = sales ?? values ?? []
  const line = sales ? values : null
  const barMax = sales ? niceMax(Math.max(...sales)) : countMax
  const barPeak = bars.length ? Math.max(...bars) : 0
  const peakIndex = barPeak > 0 ? bars.indexOf(barPeak) : -1
  // แท่งสุดท้ายที่มีข้อมูล — เส้นหยุดตรงนี้ (วัน/ชั่วโมงที่ยังมาไม่ถึงไม่ควรเห็นเส้นดิ่งลง 0 เหมือนยอดตก)
  const lastIndex = values
    ? Math.max(...values.map((value, index) => (value > 0 || (sales?.[index] ?? 0) > 0 ? index : -1)))
    : -1
  /** ความสูงของแท่ง / ของจุดบนเส้น (% ของกราฟ) */
  const barPct = (index: number) => (bars[index] / barMax) * 100
  const linePct = (index: number) => (line ? (line[index] / countMax) * 100 : 0)
  /** แท่ง 3 ตัวริมซ้าย/ขวา: ป้ายชิดขอบแทนการกึ่งกลาง ไม่งั้นล้นออกนอกกราฟ */
  const edge = (index: number) =>
    index < 3 ? "left-0" : index > count - 4 ? "right-0" : "left-1/2 -translate-x-1/2"

  // จอแคบ (มือถือ) กราฟเลื่อนซ้ายขวาได้ — เปิดมาให้เห็นช่วงล่าสุดที่มีข้อมูลก่อน (วันนี้/ชั่วโมงล่าสุด) ไม่ใช่ต้นเดือน/เที่ยงคืน
  React.useEffect(() => {
    const el = scrollRef.current
    if (!el || !count || lastIndex < 0 || el.scrollWidth <= el.clientWidth) return
    const slot = el.scrollWidth / count
    el.scrollLeft = Math.max(0, (lastIndex + 1.5) * slot - el.clientWidth)
  }, [count, lastIndex])

  /** ยังเลื่อนไปทางซ้าย/ขวาได้อีกไหม — โชว์ขอบจาง + ปุ่มลูกศรฝั่งนั้น ให้รู้ว่ากราฟเลื่อนได้ (14/10/2026 ผู้ใช้ขอ) */
  const [more, setMore] = React.useState({ left: false, right: false })
  const checkMore = React.useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    // เผื่อ 1px — scrollLeft บนจอ retina เป็นทศนิยม ชนขอบแล้วอาจขาดอีกเศษเสี้ยว
    const left = el.scrollLeft > 1
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 1
    setMore((prev) => (prev.left === left && prev.right === right ? prev : { left, right }))
  }, [])
  // ขนาดกล่องหรือจำนวนแท่งเปลี่ยน (หมุนจอ / โหลดข้อมูลเสร็จ) ต้องเช็กใหม่ — onScroll อย่างเดียวไม่พอ
  React.useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const observer = new ResizeObserver(checkMore)
    observer.observe(el)
    if (el.firstElementChild) observer.observe(el.firstElementChild)
    return () => observer.disconnect()
  }, [checkMore])
  /** ปุ่มลูกศร: เลื่อนทีละ ~ 80% ของความกว้างที่เห็น (เหลือแท่งเดิมไว้นิดหน่อยให้ต่อเนื่อง) */
  const page = (dir: -1 | 1) => {
    const el = scrollRef.current
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" })
  }

  /** เส้นกริด/ป้ายแกนตั้งวางตาม % จริงของกราฟ (0% = ก้นแท่งพอดี) */
  const levels = [100, 75, 50, 25, 0]
  /** คอลัมน์แกนตั้งซ้าย/ขวา — อยู่นอกกล่องที่เลื่อน แกนจึงค้างที่เดิมขณะเลื่อนแท่ง · ช่องบน/ล่างเท่ากล่องแท่งพอดี */
  const axis = (side: "left" | "right", text: (pct: number) => string) => (
    <div className={cn("flex shrink-0 flex-col pt-5", side === "left" ? "w-10 pr-2" : "w-11 pl-2")}>
      <div className="relative min-h-52 flex-1">
        {levels.map((pct) => (
          <span
            key={pct}
            className={cn(
              "absolute -translate-y-1/2 text-[10px] tabular-nums",
              // สีป้ายแกน = สีซีรีส์ของแกนนั้น (ซ้าย = แท่งยอดขาย chart-1 · ขวา = เส้นจำนวนใบ chart-2) · แท่งจำนวนใบอย่างเดียวคงสีเทา
              side === "left" ? cn("right-0", sales ? "text-chart-1" : "text-muted-foreground") : "text-chart-2 left-0"
            )}
            style={{ top: `${100 - pct}%` }}
          >
            {text(pct)}
          </span>
        ))}
      </div>
      <div className="mt-2 h-4" />
    </div>
  )

  return (
    // ยืดเต็มความสูงที่เหลือของ card (card ข้าง ๆ ในแถวเดียวกันสูงกว่าก็ไม่เหลือที่ว่างใต้กราฟ) · ต่ำสุด 208px
    <div className="flex flex-1 flex-col">
      {line && legend ? (
        <div className="text-muted-foreground mb-1 flex flex-wrap items-center justify-end gap-x-4 gap-y-1 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="bg-chart-1 size-2.5 rounded-[2px]" />
            {legend.amount}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="bg-chart-2 relative h-0.5 w-4 rounded-full">
              <span className="bg-chart-2 ring-card absolute top-1/2 left-1/2 size-1.5 -translate-1/2 rounded-full ring-2" />
            </span>
            {legend.count}
          </span>
        </div>
      ) : null}
      <div className="flex flex-1">
        {axis("left", (pct) => (!values ? "" : sales ? compact.format((barMax * pct) / 100) : nf.format((countMax * pct) / 100)))}

        {/* กล่องที่เลื่อนซ้ายขวา: แท่งละอย่างน้อย 20px ตัวเลขยอดขายเหนือแท่งจะไม่ชนกัน (14/10/2026 ผู้ใช้ขอให้มือถือโชว์ด้วย)
            จอกว้างพอ (desktop) แท่งยืดเต็มเหมือนเดิม ไม่มีแถบเลื่อน · pt-5 = ที่ของตัวเลขเหนือแท่งที่สูงสุด */}
        <div className="relative flex min-w-0 flex-1">
          <div ref={scrollRef} onScroll={checkMore} className="flex min-w-0 flex-1 overflow-x-auto overflow-y-hidden pt-5">
            <div className="flex flex-1 flex-col" style={{ minWidth: count * 20 }}>
              <div className="relative min-h-52 flex-1">
                {/* เส้นกริดจาง ๆ ไว้อ่านระดับ */}
                {levels.map((pct) => (
                  <span
                    key={pct}
                    className="border-border/70 pointer-events-none absolute inset-x-0 border-t border-dashed"
                    style={{ top: `${100 - pct}%` }}
                  />
                ))}

                {values ? (
                  <div ref={barsRef} className="absolute inset-0 flex items-end gap-[2px]">
                    {/* เส้นจำนวนใบ: viewBox 0–100 ยืดตามกล่อง จุด x = กลางแท่ง (คลาด gap 2px ไม่ถึงพิกเซล)
                        non-scaling-stroke ให้เส้นหนาเท่าเดิมแม้ยืด · จุดกลมวาดในปุ่มแต่ละแท่งแทน (วงกลมใน SVG ที่ยืดจะเบี้ยว) */}
                    {line ? (
                      <svg
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                        className="pointer-events-none absolute inset-0 z-[1] size-full"
                        aria-hidden
                      >
                        <polyline
                          points={line
                            .slice(0, lastIndex + 1)
                            .map((_, index) => `${((index + 0.5) / line.length) * 100},${100 - linePct(index)}`)
                            .join(" ")}
                          fill="none"
                          className="stroke-chart-2"
                          strokeWidth={2}
                          strokeLinejoin="round"
                          strokeLinecap="round"
                          vectorEffect="non-scaling-stroke"
                        />
                      </svg>
                    ) : null}
                    {values.map((value, index) => {
                      const isPeak = index === peakIndex
                      const isPicked = index === picked
                      const name = label(index)
                      /** ตัวเลขเหนือแท่ง = ค่าของแท่ง: ยอดขาย (กราฟผสม) หรือจำนวนใบ (แบบเดิม) */
                      const shown = bars[index]
                      return (
                        <button
                          key={index}
                          type="button"
                          aria-label={`${name} · ${tooltip(value)}${detail ? ` · ${detail(index)}` : ""}`}
                          aria-pressed={isPicked}
                          onClick={() => setPicked(isPicked ? null : index)}
                          className="group relative flex h-full min-w-0 flex-1 cursor-pointer items-end outline-none"
                        >
                          <div
                            className={cn(
                              "w-full rounded-t-[4px] transition-colors",
                              isPeak || isPicked ? "bg-chart-1" : "bg-chart-1/65 group-hover:bg-chart-1"
                            )}
                            style={{ height: `${barPct(index)}%` }}
                          />
                          {/* จุดจำนวนใบของแท่งนี้ — ขยายตอน hover/แตะ ให้รู้ว่าเส้นตรงนี้คือแท่งไหน */}
                          {line && index <= lastIndex ? (
                            <span
                              className={cn(
                                "bg-chart-2 ring-card absolute left-1/2 z-[2] -translate-x-1/2 translate-y-1/2 rounded-full ring-2 transition-transform",
                                isPicked ? "size-2.5" : "size-1.5 group-hover:size-2.5"
                              )}
                              style={{ bottom: `${linePct(index)}%` }}
                            />
                          ) : null}
                          {/* ตัวเลขเหนือแท่ง — ไม่ต้อง hover ก็อ่านได้ · ค่า 0 ไม่เขียน · ค่าสูงสุดตัวหนาสีแท่ง
                              9px ไม่มี padding ข้าง ให้ "435K" พอดีแท่ง 20px · อยู่เหนือเส้น (z-[3] + พื้นสีการ์ด) จุดไม่บังตัวเลขแท่งเตี้ย */}
                          {shown > 0 ? (
                            <span
                              className={cn(
                                "bg-card/80 absolute z-[3] mb-0.5 rounded-sm text-[9px] leading-3 whitespace-nowrap tabular-nums",
                                // แท่งแรก/สุดท้ายชิดขอบ ไม่งั้นครึ่งตัวเลขล้นออกนอกกล่องที่เลื่อนแล้วโดนตัด
                                index === 0 ? "left-0" : index === count - 1 ? "right-0" : "left-1/2 -translate-x-1/2",
                                isPeak ? "text-chart-1 font-semibold" : "text-muted-foreground"
                              )}
                              style={{ bottom: `${barPct(index)}%` }}
                            >
                              {sales ? short.format(shown) : shown >= 1000 ? compact.format(shown) : nf.format(shown)}
                            </span>
                          ) : null}
                          {/* tooltip ตอน hover หรือแตะเลือก — วางในกราฟ (top-0) ไม่ใช่เหนือกราฟ: กล่องที่เลื่อนได้ตัดของที่ล้นออกนอกกล่อง */}
                          <div
                            className={cn(
                              "bg-popover text-popover-foreground ring-border pointer-events-none absolute top-0 z-10 rounded-md px-2 py-1 text-xs whitespace-nowrap shadow-md ring-1",
                              edge(index),
                              isPicked ? "block" : "hidden group-hover:block"
                            )}
                          >
                            <span className="tabular-nums">{name}</span>
                            <span className="text-muted-foreground"> · </span>
                            <span className="font-medium tabular-nums">{tooltip(value)}</span>
                            {detail ? (
                              <span className="text-muted-foreground block text-left tabular-nums">{detail(index)}</span>
                            ) : null}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                ) : failed ? null : (
                  <Skeleton className="absolute inset-0" />
                )}
              </div>

              {/* ป้ายแกนนอน — วางใต้แท่งของมันจริง (ช่องเท่าแท่ง) ป้ายแรก/สุดท้ายชิดขอบ ไม่ล้นออกนอกกราฟ */}
              <div className="text-muted-foreground mt-2 flex h-4 gap-[2px] text-xs tabular-nums">
                {Array.from({ length: count }, (_, index) => (
                  <div key={index} className="relative min-w-0 flex-1">
                    {ticks.includes(index) ? (
                      <span
                        className={cn(
                          "absolute top-0 whitespace-nowrap",
                          index === 0 ? "left-0" : index === count - 1 ? "right-0" : "left-1/2 -translate-x-1/2"
                        )}
                      >
                        {tickLabel(index)}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* ขอบจาง + ปุ่มลูกศร ฝั่งที่ยังมีแท่งซ่อนอยู่ — ขอบจางไม่รับคลิก (แตะแท่งใต้มันได้) ปุ่มรับคลิกเอง */}
          {(["left", "right"] as const).map((side) =>
            more[side] ? (
              <div
                key={side}
                className={cn(
                  "pointer-events-none absolute inset-y-0 flex w-10 items-center from-card to-transparent",
                  side === "left" ? "left-0 justify-start bg-gradient-to-r" : "right-0 justify-end bg-gradient-to-l"
                )}
              >
                <button
                  type="button"
                  aria-label={ts(side)}
                  onClick={() => page(side === "left" ? -1 : 1)}
                  className="bg-card text-muted-foreground ring-border hover:text-foreground pointer-events-auto flex size-7 cursor-pointer items-center justify-center rounded-full shadow-md ring-1"
                >
                  {side === "left" ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
                </button>
              </div>
            ) : null
          )}
        </div>

        {line ? axis("right", (pct) => nf.format((countMax * pct) / 100)) : null}
      </div>
    </div>
  )
}

/** เพดานแกนยอดขายให้หาร 4 ลงตัวเป็นเลขกลม ๆ (1/1.5/2/2.5/3/4/5/6/8 × 10ⁿ ต่อช่อง) — ป้ายแกนอ่านง่าย เช่น 0 / 150K / 300K / 450K / 600K
 *  ขั้นถี่กว่า 1/2/2.5/5 เพราะแท่งเป็นยอดขายแล้ว: พีค 471K เคยได้เพดาน 800K แท่งสูงแค่ 60% ของกราฟ */
function niceMax(peak: number) {
  if (peak <= 0) return 4
  const raw = peak / 4
  const pow = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].map((f) => f * pow).find((v) => v >= raw) ?? 10 * pow
  return step * 4
}
