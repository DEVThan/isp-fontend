"use client"

import * as React from "react"
import { TriangleAlert } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"

import { getTopItemsStats, type TopItemsStats } from "@/app/dashboard/_components/api"
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

/**
 * top_items_card.tsx — card "สินค้าขายดี" ของหน้า dashboard (08/10/2026 แทน "สัดส่วนลูกค้าตามแพ็กเกจ" ที่เป็นข้อมูลตัวอย่าง)
 *
 * 5 อันดับของวันที่เลือก (ค่าเริ่มต้นวันนี้) จัดกลุ่มตาม so.item_code เรียงตามจำนวนชิ้น ไม่นับใบยกเลิก — /dashboard-top-items
 * แถบเป็นสีเดียว (chart-1) ยาวตามจำนวนชิ้นเทียบอันดับ 1 — เป็นอันดับของค่าเดียว ไม่ใช่หลายซีรีส์ จึงไม่ต้องใช้หลายสี
 * ตัวเลือกวันโชว์หลังโหลดรอบแรกเสร็จ (ใช้ stats.today) เหตุผลเดียวกับ so_today_chart.tsx
 */
export function TopItemsCard() {
  const t = useTranslations("dashboard.topItems")
  const tm = useTranslations("dashboard.month")
  const locale = useLocale()
  const nf = new Intl.NumberFormat(intlLocale(locale))

  /** วันที่เลือก "YYYY-MM-DD" · ว่าง = วันนี้ */
  const [date, setDate] = React.useState("")
  const [stats, setStats] = React.useState<TopItemsStats | null>(null)
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
    getTopItemsStats(date || undefined)
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

  const top = stats?.items[0]?.qty ?? 0

  return (
    <Card className="h-full">
      <CardHeader>
        {/* card นี้แคบ (1 ใน 3 ของแถว) — ให้คำอธิบายลงไปเต็มความกว้างใต้หัว/ตัวเลือกวัน ไม่ถูกบีบข้างปุ่ม */}
        <CardTitle className="self-center">{date ? t("titleDay") : t("title")}</CardTitle>
        <CardDescription className="col-span-2">
          {stats ? (
            stats.items.length ? (
              t("description", {
                qty: nf.format(stats.total_qty),
                items: nf.format(stats.item_count),
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
        <CardAction className="row-span-1">
          {shown ? (
            <DayPicker value={shown} onChange={changeDate} />
          ) : failed ? null : (
            <Skeleton className="h-8 w-44" />
          )}
        </CardAction>
      </CardHeader>
      <CardContent>
        {stats ? (
          <ol className="space-y-3.5">
            {stats.items.map((item, index) => (
              <li key={item.item_code} className="space-y-1.5">
                <div className="flex items-start gap-2.5 text-sm">
                  <span className="bg-muted text-muted-foreground flex size-5 shrink-0 items-center justify-center rounded-md text-xs font-semibold tabular-nums">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium" title={item.product_name || item.item_code}>
                      {item.product_name || item.item_code}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      <span className="font-mono">{item.item_code}</span>
                      {" · "}
                      {t("orders", { value: nf.format(item.orders) })}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-semibold tabular-nums">
                      {nf.format(item.qty)}
                      <span className="text-muted-foreground ml-1 text-xs font-normal">{t("unit")}</span>
                    </p>
                    <p className="text-muted-foreground text-xs tabular-nums" title={t("share")}>
                      {stats.total_qty > 0 ? `${((item.qty / stats.total_qty) * 100).toFixed(1)}%` : null}
                    </p>
                  </div>
                </div>
                {/* แถบยาวตามจำนวนชิ้นเทียบอันดับ 1 */}
                <div className="bg-muted ml-7.5 h-1.5 overflow-hidden rounded-full">
                  <div
                    className={index === 0 ? "bg-chart-1 h-full rounded-full" : "bg-chart-1/65 h-full rounded-full"}
                    style={{ width: `${top > 0 ? (item.qty / top) * 100 : 0}%` }}
                  />
                </div>
              </li>
            ))}
          </ol>
        ) : failed ? null : (
          <div className="space-y-4">
            {[0, 1, 2, 3, 4].map((row) => (
              <Skeleton key={row} className="h-10 w-full" />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
