"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SO_PAGE_SIZE_ALL } from "@/app/sale/so_export/_components/api"

/** จำนวนแถวต่อหน้าที่ให้เลือก (14/10/2026 ผู้ใช้ขอ) — เกิน 1000 API ตอบ 400 (_PER_PAGE_MAX)
 *  SO_PAGE_SIZE_ALL (0) = ทั้งหมดในหน้าเดียว · ไม่กรองเลยมีหลายหมื่นแถว ช้าและหนักเบราว์เซอร์ */
const PAGE_SIZES = [50, 100, 500, 1000, SO_PAGE_SIZE_ALL]

export function TablePagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
}) {
  const t = useTranslations("common.table")

  // ทั้งหมด (pageSize 0) = หน้าเดียว แสดง 1–total
  const all = pageSize === SO_PAGE_SIZE_ALL
  const totalPages = all ? 1 : Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : all ? 1 : (page - 1) * pageSize + 1
  const to = all ? total : Math.min(page * pageSize, total)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-sm">{t("rowsPerPage")}</span>
        {/* items = ป้ายของแต่ละค่า — ไม่ส่ง ช่องจะโชว์ค่าดิบ "0" ตอนเลือกทั้งหมด */}
        <Select
          items={PAGE_SIZES.map((size) => ({ value: String(size), label: size === SO_PAGE_SIZE_ALL ? t("all") : String(size) }))}
          value={String(pageSize)}
          onValueChange={(value) => onPageSizeChange(Number(value))}
        >
          <SelectTrigger className="bg-card w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZES.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size === SO_PAGE_SIZE_ALL ? t("all") : size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <span className="bg-card text-muted-foreground border-border/60 rounded-full border px-2.5 py-1 text-sm tabular-nums">
          {t("summary", { from, to, total })}
        </span>
        <Button
          variant="outline"
          size="icon"
          aria-label={t("previous")}
          className="hover:text-primary hover:border-primary/40"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft />
        </Button>
        <Button
          variant="outline"
          size="icon"
          aria-label={t("next")}
          className="hover:text-primary hover:border-primary/40"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight />
        </Button>
      </div>
    </div>
  )
}
