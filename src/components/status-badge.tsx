import { CheckCircle2, CircleDot, Clock, PauseCircle, XCircle } from "lucide-react"
import type { Messages } from "next-intl"
import { getTranslations } from "next-intl/server"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

/** คีย์ใต้ namespace "status" — ต้องมีคำแปลครบทุกค่า */
export type StatusKey = keyof Messages["status"]

/** สีสถานะมาคู่กับไอคอน+ข้อความเสมอ สีจึงไม่ใช่ช่องทางสื่อความหมายเดียว
 *  Record ครบทุกคีย์ เพิ่มสถานะใหม่ใน messages แล้วลืมใส่สีที่นี่ = ไม่ compile */
const meta: Record<StatusKey, { className: string; icon: typeof CheckCircle2 }> = {
  active: { className: "bg-success/12 text-success-ink", icon: CheckCircle2 },
  paid: { className: "bg-success/12 text-success-ink", icon: CheckCircle2 },
  closed: { className: "bg-success/12 text-success-ink", icon: CheckCircle2 },

  pending: { className: "bg-warning/18 text-warning-ink", icon: Clock },
  unpaid: { className: "bg-warning/18 text-warning-ink", icon: Clock },
  in_progress: { className: "bg-warning/18 text-warning-ink", icon: Clock },
  medium: { className: "bg-warning/18 text-warning-ink", icon: CircleDot },
  planned: { className: "bg-warning/18 text-warning-ink", icon: Clock },

  suspended: { className: "bg-danger/12 text-danger-ink", icon: PauseCircle },
  overdue: { className: "bg-danger/12 text-danger-ink", icon: XCircle },
  high: { className: "bg-danger/12 text-danger-ink", icon: CircleDot },

  open: { className: "bg-info/12 text-info-ink", icon: CircleDot },
  low: { className: "bg-muted text-muted-foreground", icon: CircleDot },
}

export async function StatusBadge({ status }: { status: StatusKey }) {
  const t = await getTranslations("status")
  // กันข้อมูลจาก API ที่ยังไม่รู้จัก — ตอนนี้ type คุมไว้แล้วแต่ปล่อยไว้ให้ปลอดภัย
  const entry = meta[status]
  if (!entry) return <Badge variant="secondary">{status}</Badge>

  const Icon = entry.icon
  return (
    <Badge
      variant="secondary"
      className={cn("gap-1 border-transparent font-medium", entry.className)}
    >
      <Icon className="size-3" />
      {t(status)}
    </Badge>
  )
}
