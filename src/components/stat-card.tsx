import {
  LifeBuoy,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import type { StatTone } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

/**
 * สีบนการ์ดเป็น "สีสถานะ" ไม่ใช่สีชุดกราฟ — จับคู่กับไอคอนและป้ายข้อความเสมอ
 * เพื่อไม่ให้สีเป็นตัวสื่อความหมายเพียงลำพัง
 */
const tones: Record<
  StatTone,
  { icon: LucideIcon; chip: string; ink: string; bar: string }
> = {
  info: {
    icon: Users,
    chip: "bg-info/12 text-info-ink",
    ink: "text-info-ink",
    bar: "bg-info",
  },
  success: {
    icon: Wallet,
    chip: "bg-success/12 text-success-ink",
    ink: "text-success-ink",
    bar: "bg-success",
  },
  warning: {
    icon: Wallet,
    chip: "bg-warning/18 text-warning-ink",
    ink: "text-warning-ink",
    bar: "bg-warning",
  },
  danger: {
    icon: LifeBuoy,
    chip: "bg-danger/12 text-danger-ink",
    ink: "text-danger-ink",
    bar: "bg-danger",
  },
}

export function StatCard({
  label,
  value,
  delta,
  trend,
  hint,
  tone,
}: {
  label: string
  value: string
  delta: string
  trend: "up" | "down"
  hint: string
  tone: StatTone
}) {
  const { icon: Icon, chip, ink, bar } = tones[tone]
  const TrendIcon = trend === "up" ? TrendingUp : TrendingDown

  return (
    <Card className="relative overflow-hidden">
      <span className={cn("absolute inset-x-0 top-0 h-1", bar)} />
      <CardContent className="space-y-3 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-muted-foreground text-sm">{label}</p>
            <p className="text-2xl font-semibold">{value}</p>
          </div>
          <span
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-xl",
              chip
            )}
          >
            <Icon className="size-5" />
          </span>
        </div>
        <p className="flex items-center gap-1.5 text-xs">
          <TrendIcon className={cn("size-3.5", ink)} />
          <span className={cn("font-medium", ink)}>{delta}</span>
          <span className="text-muted-foreground">{hint}</span>
        </p>
      </CardContent>
    </Card>
  )
}
