"use client"

import * as React from "react"
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { enUS, th } from "react-day-picker/locale"

import { intlLocale } from "@/i18n/config"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

/**
 * day_picker.tsx — ตัวเลือกวันเดียวของ dashboard: กราฟใบสั่งขายรายชั่วโมง + card สินค้าขายดี (08/10/2026)
 *
 * ‹ [ปุ่มวันที่ → ปฏิทินในป๊อปอัป] › — ลูกศรเลื่อนทีละวัน · เลือกในปฏิทินแล้วใช้ทันที (วันเดียว ไม่ต้องมีปุ่มตกลงแบบ daterange ของ so)
 * ค่าเป็นสตริง YYYY-MM-DD ตามที่ /dashboard-so-today รับ · เลือกวันหลังวันนี้ไม่ได้ (ยังไม่มีใบสั่งขาย)
 */

/** Date → "YYYY-MM-DD" ตามเวลาเครื่อง (ไม่ใช้ toISOString ที่เป็น UTC วันจะเลื่อนไปหนึ่งวันช่วงเช้า) */
export const toDayKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`

/** "YYYY-MM-DD" → Date เที่ยงคืนเวลาเครื่อง */
const fromDayKey = (value: string) => {
  const [y, m, d] = value.split("-").map(Number)
  return new Date(y, m - 1, d)
}

const shiftDay = (value: string, days: number) => {
  const date = fromDayKey(value)
  return toDayKey(new Date(date.getFullYear(), date.getMonth(), date.getDate() + days))
}

export function DayPicker({
  value,
  onChange,
}: {
  /** YYYY-MM-DD */
  value: string
  onChange: (value: string) => void
}) {
  const t = useTranslations("dashboard.dayPicker")
  const locale = useLocale()
  const [open, setOpen] = React.useState(false)

  const today = toDayKey(new Date())
  const selected = fromDayKey(value)
  const label = new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: "medium" }).format(selected)

  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label={t("prevDay")}
        onClick={() => onChange(shiftDay(value, -1))}
      >
        <ChevronLeft />
      </Button>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          aria-label={t("pickDate")}
          className="border-input bg-card hover:bg-muted focus-visible:border-primary/50 focus-visible:ring-ring/50 dark:bg-input/30 flex h-8 items-center gap-2 rounded-lg border px-2.5 text-sm whitespace-nowrap tabular-nums transition-colors outline-none select-none focus-visible:ring-3"
        >
          <CalendarDays className="text-muted-foreground size-4 shrink-0" />
          {label}
        </PopoverTrigger>
        <PopoverContent align="end" className="w-auto gap-0 p-0">
          <Calendar
            mode="single"
            required
            selected={selected}
            defaultMonth={selected}
            onSelect={(date) => {
              onChange(toDayKey(date))
              setOpen(false)
            }}
            disabled={{ after: new Date() }}
            locale={locale === "th" ? th : enUS}
            className="p-3"
          />
          <div className="border-border/60 border-t p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full"
              disabled={value === today}
              onClick={() => {
                onChange(today)
                setOpen(false)
              }}
            >
              {t("today")}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label={t("nextDay")}
        disabled={value >= today}
        onClick={() => onChange(shiftDay(value, 1))}
      >
        <ChevronRight />
      </Button>
    </div>
  )
}
