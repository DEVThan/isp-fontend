"use client"

import * as React from "react"
import { Tv, TriangleAlert } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"

import { BroadcastLogo } from "@/app/broadcast/_components/logo"
import { getTopChannelsStats, type TopChannelsStats } from "@/app/dashboard/_components/api"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatTHB } from "@/lib/mock-data"

/**
 * top_channels_card.tsx — card "ช่องทางขายดี" ของหน้า dashboard (08/10/2026 แทน "ใบแจ้งหนี้ล่าสุด" ที่เป็นข้อมูลตัวอย่าง)
 *
 * 5 อันดับของวันที่เลือก (ค่าเริ่มต้นวันนี้) จัดกลุ่มตาม so.channel เรียงตามจำนวนใบ ไม่นับใบยกเลิก — /dashboard-top-channels
 * โลโก้มาจาก broadcast ที่ชื่อตรงกับ so.channel (ไม่มี FK) — ไม่เจอ/เปิดไม่ขึ้น โชว์ไอคอน tv แทน แถวจะได้ตรงกัน
 * แถบสัดส่วน = ใบของช่องทางนั้นเทียบใบทั้งวัน ไล่สีเหลือง→ส้ม→แดงตาม % (ผู้ใช้เลือก 08/10/2026) ตัวเลข % กำกับอยู่ข้างแถบเสมอ · ตัวเลือกวันโชว์หลังโหลดรอบแรก เหตุผลเดียวกับ so_today_chart.tsx
 */
export function TopChannelsCard() {
  const t = useTranslations("dashboard.topChannels")
  const tm = useTranslations("dashboard.month")
  const locale = useLocale()
  const nf = new Intl.NumberFormat(intlLocale(locale))

  /** วันที่เลือก "YYYY-MM-DD" · ว่าง = วันนี้ */
  const [date, setDate] = React.useState("")
  const [stats, setStats] = React.useState<TopChannelsStats | null>(null)
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
    getTopChannelsStats(date || undefined)
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

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{date ? t("titleDay") : t("title")}</CardTitle>
        <CardDescription>
          {stats ? (
            stats.channels.length ? (
              t("description", {
                orders: nf.format(stats.total_orders),
                channels: nf.format(stats.channel_count),
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
            <Skeleton className="h-4 w-48" />
          )}
        </CardDescription>
        <CardAction>
          {shown ? (
            <DayPicker value={shown} onChange={changeDate} />
          ) : failed ? null : (
            <Skeleton className="h-8 w-44" />
          )}
        </CardAction>
      </CardHeader>
      <CardContent>
        {stats ? (
          stats.channels.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14 text-center">{t("columns.rank")}</TableHead>
                  <TableHead>{t("columns.channel")}</TableHead>
                  <TableHead className="text-right">{t("columns.orders")}</TableHead>
                  <TableHead className="text-right">{t("columns.qty")}</TableHead>
                  <TableHead className="text-right">{t("columns.amount")}</TableHead>
                  <TableHead className="w-64">{t("columns.share")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.channels.map((row, index) => {
                  const share = stats.total_orders > 0 ? (row.orders / stats.total_orders) * 100 : 0
                  // ไล่สีตาม %: เหลือง → ส้ม → แดง (ผู้ใช้เลือก 08/10/2026) วัดเฉดยาวเท่าแถบอันดับ 1 — แถบยิ่งยาว ปลายยิ่งไปทางแดง
                  // อันดับ 1 ปลายเป็นแดงเต็ม · backgroundSize ยืดเฉดให้ยาวเท่าแถบอันดับ 1 แล้วแต่ละแถบโชว์แค่ส่วนของตัวเอง
                  const topShare = (stats.channels[0].orders / Math.max(stats.total_orders, 1)) * 100
                  const span = share > 0 ? (topShare / share) * 100 : 100
                  return (
                    <TableRow key={row.channel}>
                      <TableCell className="text-center">
                        <span className="bg-muted text-muted-foreground inline-flex size-6 items-center justify-center rounded-md text-xs font-semibold tabular-nums">
                          {index + 1}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <ChannelLogo src={row.logo} alt={row.channel} />
                          <span className="font-medium">{row.channel}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {nf.format(row.orders)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{nf.format(row.qty)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatTHB(row.amount, locale)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${share}%`,
                                // token ของธีม (chart-4 เหลือง / chart-2 ส้ม / danger แดง) — สว่าง/มืดเปลี่ยนค่าเอง
                                backgroundImage:
                                  "linear-gradient(to right, var(--chart-4), var(--chart-2), var(--danger))",
                                backgroundSize: `${span}% 100%`,
                                backgroundRepeat: "no-repeat",
                              }}
                            />
                          </div>
                          <span className="text-muted-foreground w-12 text-right text-xs tabular-nums">
                            {share.toFixed(1)}%
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
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

/** โลโก้ช่องทาง — ไม่มี path ใช้ไอคอน tv ในกรอบขนาดเดียวกัน (BroadcastLogo ซ่อนตัวเองเมื่อ path เปิดไม่ขึ้น จึงซ้อนไว้บนไอคอน) */
function ChannelLogo({ src, alt }: { src: string; alt: string }) {
  return (
    <span className="bg-muted text-muted-foreground relative flex size-8 shrink-0 items-center justify-center rounded-md">
      <Tv className="size-4" />
      <BroadcastLogo src={src} alt={alt} className="absolute inset-0 size-8" />
    </span>
  )
}
