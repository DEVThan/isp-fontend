"use client"

import * as React from "react"
import { CalendarDays, Check, X } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import type { DateRange } from "react-day-picker"
import { enUS, th } from "react-day-picker/locale"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"

/**
 * daterange.tsx — ตัวเลือกช่วงวันที่ (ปฏิทินในป๊อปอัป) ของตัวกรองวันที่สั่งซื้อ (po_date)
 *
 * แนวเดียวกับ DatePickerWithRange ของ softtechnw-stock (ทางลัด + ปฏิทินสองเดือน + ปุ่มตกลง)
 * แต่เขียนใหม่บน Base UI — ของเดิมเป็น Radix (asChild ฯลฯ) ใช้ตรง ๆ ไม่ได้
 *
 * รับ/คืนค่าเป็นสตริง YYYY-MM-DD ตามที่ so-get-list ต้องการ (ว่าง = ไม่กรองฝั่งนั้น)
 * เลือกในปฏิทินยังไม่กรอง — ต้องกด "ตกลง" ก่อน (เลือกวันแรกแล้วยิงทันทีจะยิง API เปล่า ๆ หนึ่งรอบ)
 * เลือกวันเดียวแล้วกดตกลง = กรองวันนั้นวันเดียว (ถึง = ตั้งแต่)
 * ปุ่ม × ข้างช่องล้างทันทีโดยไม่ต้องเปิดป๊อปอัป — วางนอกปุ่มเปิด เพราะปุ่มซ้อนในปุ่มเป็น HTML ที่ผิด
 */

/** Date → "YYYY-MM-DD" ตามเวลาเครื่อง (ไม่ใช้ toISOString ที่เป็น UTC วันจะเลื่อนไปหนึ่งวันช่วงเช้า) */
const toKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`

/** "YYYY-MM-DD" → Date เที่ยงคืนเวลาเครื่อง · รูปผิดคืน undefined */
const fromKey = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  return match ? new Date(+match[1], +match[2] - 1, +match[3]) : undefined
}

/** "YYYY-MM-DD" → "DD/MM/YYYY" รูปเดียวกับวันที่ในตาราง */
const toLabel = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value
}

const addDays = (date: Date, days: number) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)

export function DateRangeFilter({
  id,
  from,
  to,
  onChange,
  placeholder,
}: {
  id?: string
  /** YYYY-MM-DD หรือว่าง */
  from: string
  to: string
  onChange: (from: string, to: string) => void
  placeholder?: string
}) {
  const t = useTranslations("so.dateRange")
  const tall = useTranslations("common")
  const locale = useLocale()
  /** จอเล็กโชว์เดือนเดียว — สองเดือนกว้างเกินจอมือถือ */
  const isMobile = useIsMobile()

  const [open, setOpen] = React.useState(false)
  /** ค่าที่กำลังเลือกในป๊อปอัป — ยังไม่กรองจนกว่าจะกดตกลง */
  const [draft, setDraft] = React.useState<DateRange | undefined>()
  /** เดือนที่ปฏิทินโชว์ — คุมเอง เพื่อให้กดทางลัดแล้วปฏิทินเลื่อนไปเดือนของช่วงนั้น (defaultMonth มีผลแค่ตอนเปิด) */
  const [month, setMonth] = React.useState<Date>(() => new Date())

  const openWith = (next: boolean) => {
    // เปิดใหม่ทุกครั้งเริ่มจากค่าที่กรองอยู่จริง (ยกเลิกรอบก่อนแล้วของค้างไม่กลับมา)
    if (next) {
      const current = from ? { from: fromKey(from), to: fromKey(to || from) } : undefined
      setDraft(current)
      setMonth(monthFor(current))
    }
    setOpen(next)
  }

  /**
   * เดือนแรกที่ปฏิทินควรโชว์ให้เห็นช่วงที่เลือก — จอกว้าง (สองเดือน) เริ่มที่เดือนของวันแรก
   * จอเล็ก (เดือนเดียว) เอาเดือนของวันสุดท้าย · ยังไม่เลือก: จอกว้างโชว์เดือนก่อน + เดือนนี้ จอเล็กเดือนนี้
   */
  const monthFor = (range: DateRange | undefined) => {
    const today = new Date()
    const anchor = isMobile ? (range?.to ?? range?.from) : range?.from
    if (anchor) return anchor
    return isMobile ? today : new Date(today.getFullYear(), today.getMonth() - 1, 1)
  }

  const apply = () => {
    const start = draft?.from ? toKey(draft.from) : ""
    const end = draft?.to ? toKey(draft.to) : start
    onChange(start, end)
    setOpen(false)
  }

  const today = new Date()
  const presets: { label: string; range: DateRange }[] = [
    { label: t("today"), range: { from: today, to: today } },
    { label: t("last7"), range: { from: addDays(today, -6), to: today } },
    { label: t("last30"), range: { from: addDays(today, -29), to: today } },
    {
      label: t("thisMonth"),
      range: {
        from: new Date(today.getFullYear(), today.getMonth(), 1),
        to: new Date(today.getFullYear(), today.getMonth() + 1, 0),
      },
    },
  ]

  const label = from
    ? to && to !== from
      ? `${toLabel(from)} – ${toLabel(to)}`
      : toLabel(from)
    : null

  return (
    <Popover open={open} onOpenChange={openWith}>
      <div className="relative">
        <PopoverTrigger
          id={id}
          className="border-input bg-card focus-visible:border-primary/50 focus-visible:ring-ring/50 flex h-8 w-full items-center gap-2 rounded-lg border py-1 pr-8 pl-2.5 text-left text-sm transition-colors outline-none select-none focus-visible:ring-3 dark:bg-input/30"
        >
          <CalendarDays className="text-muted-foreground size-4 shrink-0" />
          {label ? (
            <span className="truncate font-mono">{label}</span>
          ) : (
            <span className="text-muted-foreground truncate">{placeholder}</span>
          )}
        </PopoverTrigger>
        {from ? (
          <button
            type="button"
            aria-label={tall("table.clear")}
            onClick={() => onChange("", "")}
            className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-1.5 my-auto flex size-6 items-center justify-center rounded-md transition-colors"
          >
            <X className="size-3.5" />
          </button>
        ) : null}
      </div>

      <PopoverContent align="start" className="w-auto max-w-[calc(100vw-2rem)] gap-0 p-0">
        <div className="flex flex-col sm:flex-row">
          {/* ทางลัด — กดแล้วแค่ใส่ในปฏิทิน ยังต้องกดตกลง */}
          <div className="border-border/60 flex flex-wrap gap-1 border-b p-2 sm:w-36 sm:flex-col sm:flex-nowrap sm:border-r sm:border-b-0">
            {presets.map((preset) => (
              <Button
                key={preset.label}
                type="button"
                variant="ghost"
                size="sm"
                className="justify-start"
                onClick={() => {
                  setDraft(preset.range)
                  setMonth(monthFor(preset.range))
                }}
              >
                {preset.label}
              </Button>
            ))}
          </div>
          <Calendar
            mode="range"
            selected={draft}
            onSelect={setDraft}
            month={month}
            onMonthChange={setMonth}
            numberOfMonths={isMobile ? 1 : 2}
            locale={locale === "th" ? th : enUS}
            className="p-3"
          />
        </div>
        <div className="border-border/60 flex items-center justify-between gap-2 border-t p-2">
          <span className="text-muted-foreground px-1 font-mono text-xs">
            {draft?.from
              ? `${toLabel(toKey(draft.from))}${draft.to && toKey(draft.to) !== toKey(draft.from) ? ` – ${toLabel(toKey(draft.to))}` : ""}`
              : t("pick")}
          </span>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setDraft(undefined)}>
              {tall("table.clear")}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={apply}
              className={cn("from-chart-1 to-chart-5 bg-gradient-to-r text-white")}
            >
              <Check /> {t("apply")}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
