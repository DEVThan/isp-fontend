"use client"

import * as React from "react"
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"

import { intlLocale } from "@/i18n/config"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

/**
 * month_picker.tsx — ตัวเลือกเดือนของ card รายเดือนใน dashboard (08/10/2026) หน้าตาเดียวกับ day_picker.tsx
 *
 * ‹ [ปุ่มเดือน → ป๊อปอัปตาราง 12 เดือน + เลื่อนปี] › — ลูกศรเลื่อนทีละเดือน · เลือกในตารางแล้วใช้ทันที
 * ค่าเป็นสตริง YYYY-MM ตามที่ /dashboard-so-daily, /dashboard-top-types-month รับ · เลือกเดือนหลังเดือนนี้ไม่ได้
 */

/** Date → "YYYY-MM" ตามเวลาเครื่อง */
export const toMonthKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`

const shiftMonth = (value: string, months: number) => {
  const [y, m] = value.split("-").map(Number)
  return toMonthKey(new Date(y, m - 1 + months, 1))
}

export function MonthPicker({
  value,
  onChange,
}: {
  /** YYYY-MM */
  value: string
  onChange: (value: string) => void
}) {
  const t = useTranslations("dashboard.monthPicker")
  const locale = useLocale()
  const [open, setOpen] = React.useState(false)
  /** ปีที่ป๊อปอัปโชว์อยู่ — เปิดใหม่ทุกครั้งเริ่มที่ปีของเดือนที่เลือก */
  const [year, setYear] = React.useState(() => Number(value.slice(0, 4)))

  const current = toMonthKey(new Date())
  const [y, m] = value.split("-").map(Number)
  const fmt = (options: Intl.DateTimeFormatOptions, date: Date) =>
    new Intl.DateTimeFormat(intlLocale(locale), options).format(date)
  const label = fmt({ month: "long", year: "numeric" }, new Date(y, m - 1, 1))

  const pick = (next: string) => {
    onChange(next)
    setOpen(false)
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label={t("prevMonth")}
        onClick={() => onChange(shiftMonth(value, -1))}
      >
        <ChevronLeft />
      </Button>
      <Popover
        open={open}
        onOpenChange={(next) => {
          if (next) setYear(y)
          setOpen(next)
        }}
      >
        <PopoverTrigger
          aria-label={t("pickMonth")}
          className="border-input bg-card hover:bg-muted focus-visible:border-primary/50 focus-visible:ring-ring/50 dark:bg-input/30 flex h-8 items-center gap-2 rounded-lg border px-2.5 text-sm whitespace-nowrap tabular-nums transition-colors outline-none select-none focus-visible:ring-3"
        >
          <CalendarDays className="text-muted-foreground size-4 shrink-0" />
          {label}
        </PopoverTrigger>
        <PopoverContent align="end" className="w-64 gap-0 p-0">
          <div className="flex items-center justify-between p-2">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t("prevYear")}
              onClick={() => setYear(year - 1)}
            >
              <ChevronLeft />
            </Button>
            <span className="text-sm font-medium tabular-nums">
              {fmt({ year: "numeric" }, new Date(year, 0, 1))}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t("nextYear")}
              disabled={year >= Number(current.slice(0, 4))}
              onClick={() => setYear(year + 1)}
            >
              <ChevronRight />
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-1 px-2 pb-2">
            {Array.from({ length: 12 }, (_, index) => {
              const key = toMonthKey(new Date(year, index, 1))
              return (
                <Button
                  key={key}
                  type="button"
                  size="sm"
                  variant={key === value ? "default" : "ghost"}
                  disabled={key > current}
                  onClick={() => pick(key)}
                  className={cn("tabular-nums", key === current && key !== value && "text-primary font-semibold")}
                >
                  {fmt({ month: "short" }, new Date(year, index, 1))}
                </Button>
              )
            })}
          </div>
          <div className="border-border/60 border-t p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full"
              disabled={value === current}
              onClick={() => pick(current)}
            >
              {t("thisMonth")}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label={t("nextMonth")}
        disabled={value >= current}
        onClick={() => onChange(shiftMonth(value, 1))}
      >
        <ChevronRight />
      </Button>
    </div>
  )
}
