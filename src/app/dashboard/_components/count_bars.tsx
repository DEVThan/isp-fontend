"use client"

import * as React from "react"
import { useLocale } from "next-intl"

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
 */
export function CountBars({
  values,
  failed,
  label,
  tooltip,
  ticks,
  tickLabel = label,
  detail,
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
}) {
  const locale = useLocale()
  const nf = new Intl.NumberFormat(intlLocale(locale))

  /** แท่งที่แตะเลือกไว้ — ป้ายตัวเลขค้างจนแตะซ้ำหรือแตะนอกกราฟ */
  const [picked, setPicked] = React.useState<number | null>(null)
  const barsRef = React.useRef<HTMLDivElement>(null)

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
  const peak = values?.length ? Math.max(...values) : 0
  const peakIndex = peak > 0 && values ? values.indexOf(peak) : -1
  // เพดานแกนให้หาร 4 ลงตัว เส้นกริดจะเป็นจำนวนเต็มเสมอ (นับเป็นใบ) — ช่วงที่ยังไม่มีใบเลยก็ไม่หารศูนย์
  const scaleMax = Math.max(4, Math.ceil(peak / 4) * 4)
  /** แท่ง 3 ตัวริมซ้าย/ขวา: ป้ายชิดขอบแทนการกึ่งกลาง ไม่งั้นล้นออกนอก card บนมือถือ */
  const edge = (index: number) =>
    index < 3 ? "left-0" : index > count - 4 ? "right-0" : "left-1/2 -translate-x-1/2"

  return (
    // ยืดเต็มความสูงที่เหลือของ card (card ข้าง ๆ ในแถวเดียวกันสูงกว่าก็ไม่เหลือที่ว่างใต้กราฟ) · ต่ำสุด 208px
    <div className="flex flex-1 flex-col">
      <div className="relative min-h-52 flex-1">
        {/* เส้นกริดจาง ๆ ไว้อ่านระดับ */}
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
          {[100, 75, 50, 25, 0].map((pct) => (
            <div key={pct} className="flex items-center gap-2">
              <span className="text-muted-foreground w-8 shrink-0 text-right text-[10px] tabular-nums">
                {values ? nf.format((scaleMax * pct) / 100) : ""}
              </span>
              <span className="border-border/70 flex-1 border-t border-dashed" />
            </div>
          ))}
        </div>

        {values ? (
          <div ref={barsRef} className="absolute inset-0 flex items-end gap-[2px] pl-10">
            {values.map((value, index) => {
              const isPeak = index === peakIndex
              const isPicked = index === picked
              const name = label(index)
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
                    style={{ height: `${(value / scaleMax) * 100}%` }}
                  />
                  {/* ป้ายกำกับค่าพีค — ไม่ต้อง hover ก็อ่านได้ */}
                  {isPeak ? (
                    <span
                      className={cn(
                        "text-chart-1 absolute bottom-full mb-1 text-[10px] font-semibold tabular-nums",
                        edge(index)
                      )}
                    >
                      {nf.format(value)}
                    </span>
                  ) : null}
                  {/* tooltip ตอน hover หรือแตะเลือก */}
                  <div
                    className={cn(
                      "bg-popover text-popover-foreground ring-border pointer-events-none absolute bottom-full z-10 mb-1.5 rounded-md px-2 py-1 text-xs whitespace-nowrap shadow-md ring-1",
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
          <Skeleton className="absolute inset-y-0 right-0 left-10" />
        )}
      </div>

      {/* ป้ายแกนนอน — วางใต้แท่งของมันจริง (ช่องเท่าแท่ง) ป้ายแรก/สุดท้ายชิดขอบ ไม่ล้นออกนอก card */}
      {count ? (
        <div className="text-muted-foreground mt-2 flex gap-[2px] pl-10 text-xs tabular-nums">
          {Array.from({ length: count }, (_, index) => (
            <div key={index} className="relative h-4 min-w-0 flex-1">
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
      ) : (
        <div className="mt-2 h-4" />
      )}
    </div>
  )
}
