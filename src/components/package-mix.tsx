import { getLocale, getTranslations } from "next-intl/server"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { packageMix } from "@/lib/mock-data"

/** สีตามสล็อตคงที่ — สล็อต 0 คือ "อื่น ๆ" ใช้สีกลาง ไม่ใช่ฮิวใหม่ */
const slotColor = [
  "bg-muted-foreground/40",
  "bg-chart-1",
  "bg-chart-2",
  "bg-chart-3",
]

export async function PackageMix() {
  const t = await getTranslations("dashboard.packageMix")
  const locale = await getLocale()
  const nf = new Intl.NumberFormat(locale)
  const total = packageMix.reduce((sum, row) => sum + row.customers, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>
          {t("description", { total: nf.format(total) })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* แถบสัดส่วน — เว้นช่อง 2px ระหว่างสี ไม่ให้สองสีชนกันตรง ๆ */}
        <div className="flex h-3 gap-[2px] overflow-hidden rounded-full">
          {packageMix.map((row) => (
            <div
              key={row.name ?? row.labelKey}
              className={slotColor[row.slot]}
              style={{ width: `${(row.customers / total) * 100}%` }}
            />
          ))}
        </div>

        {/* legend + ตัวเลขกำกับตรง ๆ สีจึงไม่ใช่ช่องทางเดียวที่บอกว่าอันไหนคืออันไหน */}
        <ul className="space-y-2">
          {packageMix.map((row) => (
            <li
              key={row.name ?? row.labelKey}
              className="flex items-center gap-2 text-sm"
            >
              <span
                className={`size-2.5 shrink-0 rounded-full ${slotColor[row.slot]}`}
              />
              <span className="flex-1 truncate">
                {row.name ?? t(row.labelKey!)}
              </span>
              <span className="tabular-nums">{nf.format(row.customers)}</span>
              <span className="text-muted-foreground w-12 text-right text-xs tabular-nums">
                {((row.customers / total) * 100).toFixed(1)}%
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
