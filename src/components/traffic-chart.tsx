import { getTranslations } from "next-intl/server"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

/**
 * ซีรีส์เดียว → ใช้สีไล่เฉดฮิวเดียว (น้ำเงินแบรนด์) ไม่ต้องมี legend เพราะหัวข้อบอกอยู่แล้ว
 * กราฟแท่งเขียนด้วย CSS ล้วน เปลี่ยนไปใช้ Recharts/ApexCharts ภายหลังได้
 */
export async function TrafficChart({ data }: { data: number[] }) {
  const t = await getTranslations("dashboard.traffic")
  const peak = Math.max(...data)
  const peakHour = data.indexOf(peak)

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>
          {t("description", {
            peak,
            hour: String(peakHour).padStart(2, "0"),
          })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative h-52">
          {/* เส้นกริดจาง ๆ ไว้อ่านระดับ */}
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
            {[100, 75, 50, 25, 0].map((pct) => (
              <div key={pct} className="flex items-center gap-2">
                <span className="text-muted-foreground w-8 shrink-0 text-right text-[10px] tabular-nums">
                  {Math.round((peak * pct) / 100)}
                </span>
                <span className="border-border/70 flex-1 border-t border-dashed" />
              </div>
            ))}
          </div>

          <div className="absolute inset-0 flex items-end gap-[2px] pl-10">
            {data.map((value, hour) => {
              const isPeak = hour === peakHour
              return (
                <div
                  key={hour}
                  className="group relative flex h-full flex-1 items-end"
                >
                  <div
                    className={
                      isPeak
                        ? "bg-chart-1 w-full rounded-t-[4px]"
                        : "bg-chart-1/65 group-hover:bg-chart-1 w-full rounded-t-[4px] transition-colors"
                    }
                    style={{ height: `${(value / peak) * 100}%` }}
                  />
                  {/* ป้ายกำกับค่าพีค — ไม่ต้อง hover ก็อ่านได้ */}
                  {isPeak ? (
                    <span className="text-chart-1 absolute bottom-full left-1/2 mb-1 -translate-x-1/2 text-[10px] font-semibold tabular-nums">
                      {value}
                    </span>
                  ) : null}
                  {/* tooltip ตอน hover */}
                  <div className="bg-popover text-popover-foreground ring-border pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 hidden -translate-x-1/2 rounded-md px-2 py-1 text-xs whitespace-nowrap shadow-md ring-1 group-hover:block">
                    <span className="tabular-nums">
                      {String(hour).padStart(2, "0")}:00
                    </span>
                    <span className="text-muted-foreground"> · </span>
                    <span className="font-medium tabular-nums">
                      {value} Gbps
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="text-muted-foreground mt-2 flex justify-between pl-10 text-xs tabular-nums">
          <span>00:00</span>
          <span>06:00</span>
          <span>12:00</span>
          <span>18:00</span>
          <span>23:00</span>
        </div>
      </CardContent>
    </Card>
  )
}
