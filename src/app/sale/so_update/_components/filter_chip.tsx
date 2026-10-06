"use client"

import { cn } from "@/lib/utils"

/**
 * filter_chip.tsx — ปุ่มกรองตารางตัวอย่างตามผล (ทั้งหมด / จะอัปเดต / ไม่พบ so_code …) โชว์จำนวนในวงเล็บ
 * ใช้ใน update_card.tsx · className ใส่สีของผลนั้น (RESULT_STYLE) · active = ขอบสีหลัก
 */
export function FilterChip({
  active,
  onClick,
  label,
  count,
  className,
}: {
  active: boolean
  onClick: () => void
  label: string
  count: number
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "bg-muted text-foreground rounded-full px-3 py-1 text-xs font-medium ring-1 ring-transparent transition-colors",
        className,
        active && "ring-primary ring-2"
      )}
    >
      {label} <span className="tabular-nums opacity-80">({count.toLocaleString("en-US")})</span>
    </button>
  )
}
