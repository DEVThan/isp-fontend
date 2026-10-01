"use client"

import * as React from "react"
import { LoaderCircle, SearchX, TriangleAlert } from "lucide-react"
import { useTranslations } from "next-intl"

import {
  EXPORT_GROUP_PAGE_SIZE,
  getExportGroupSo,
} from "@/app/sale/export_group/_components/api"
import type {
  ExportGroup,
  ExportGroupSoList,
} from "@/app/sale/export_group/_components/model"
import { TablePagination } from "@/app/sale/export_group/_components/pagination"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

/**
 * view_modal.tsx — ดูใบสั่งขายที่อยู่ในกลุ่มการส่งออก (ปุ่มรูปตาในตาราง) อ่านอย่างเดียว
 *
 * ยิง POST /api/web/export-group-get-so ด้วยชื่อกลุ่มทุกครั้งที่เปิด และทุกครั้งที่เปลี่ยนหน้า (แบ่งหน้าที่ API) — so.export_group_name เก็บชื่อกลุ่มเป็นข้อความ
 * กลุ่มที่สร้าง/เปลี่ยนชื่อเองในหน้านี้จึงอาจไม่มี so เลย (ขึ้นว่าไม่มีรายการ ไม่ใช่ error)
 * ยอดรวมท้ายตาราง = sum(so.amount) ที่ API คิดให้ — อาจต่างจาก total_price ของกลุ่มที่ปัดเป็นจำนวนเต็มไว้
 */

/** numeric มาเป็นข้อความ ("999.0") → คั่นหลักพัน ทศนิยม 2 ตำแหน่ง · ว่าง/อ่านไม่ออกโชว์ค่าดิบ */
const money = (value: string | null) => {
  if (value === null || value.trim() === "") return ""
  const parsed = Number(value.replace(/,/g, ""))
  if (!Number.isFinite(parsed)) return value
  return parsed.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/** ผลของการดึงล่าสุด ผูกกับคำขอ (ชื่อกลุ่ม + หน้า + ขนาดหน้า) — key ไม่ตรงกับที่ขออยู่ = ยังโหลดอยู่
 *  (ไม่ต้อง set loading ใน effect) */
type Loaded =
  | { key: string; name: string; list: ExportGroupSoList }
  | { key: string; name: string; error: string }

export function ViewModal({
  open,
  onOpenChange,
  group,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** กลุ่มที่กดดู */
  group?: ExportGroup
}) {
  const t = useTranslations("common")
  const tview = useTranslations("export_group.view")

  const [loaded, setLoaded] = React.useState<Loaded | null>(null)
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(EXPORT_GROUP_PAGE_SIZE)
  const name = open ? group?.name : undefined
  const key = name ? `${name}|${page}|${pageSize}` : ""

  /** กรอบที่เลื่อนได้ — เปลี่ยนหน้าแล้วเลื่อนกลับขึ้นแถวแรก */
  const scrollRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!name) return
    let cancelled = false
    const requestKey = `${name}|${page}|${pageSize}`
    getExportGroupSo(name, { page, perPage: pageSize }).then(
      (list) => {
        if (!cancelled) setLoaded({ key: requestKey, name, list })
      },
      (error: unknown) => {
        // ห้าม console.error — ใน dev overlay จะขึ้นเต็มจอเหมือนหน้าพัง
        if (!cancelled)
          setLoaded({
            key: requestKey,
            name,
            error: error instanceof Error ? error.message : "",
          })
      }
    )
    return () => {
      cancelled = true
    }
  }, [name, page, pageSize])

  // เปิดใหม่ทุกครั้งต้องดึงใหม่จากหน้า 1 (อาจเพิ่งส่งออกเพิ่ม) — ปิดกล่องแล้วล้างผลเก่าทิ้ง (ปรับ state ระหว่าง render)
  if (!open && (loaded || page !== 1)) {
    setLoaded(null)
    setPage(1)
  }

  const loading = !loaded || loaded.key !== key
  // ระหว่างเปลี่ยนหน้า โชว์หน้าเดิมไว้ใต้ตัวหมุน ไม่ให้ตารางหายวูบ — แต่ต้องเป็นกลุ่มเดียวกันเท่านั้น
  const current = loaded && loaded.name === name ? loaded : null
  const list = current && "list" in current ? current.list : null
  /** ลำดับต่อจากหน้าก่อน — ใช้ page/per_page ที่ API ตอบมา เลขจึงตรงกับแถวที่เห็นจริง */
  const rowNumber = (index: number) =>
    list ? (list.page - 1) * list.per_page + index + 1 : index + 1

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* p-0 + หัว/ท้ายตรึง เนื้อในเลื่อนเอง — กลุ่มใหญ่ยาวเกินจอ ปุ่มปิดต้องไม่หลุดลงไปล่างสุด */}
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
        <DialogHeader className="from-primary/12 border-border/60 rounded-t-xl border-b bg-gradient-to-r via-transparent to-transparent p-4">
          <DialogTitle>{tview("title")}</DialogTitle>
          <DialogDescription>
            <span className="bg-primary/10 text-primary rounded-md px-2 py-0.5 font-mono text-xs font-semibold">
              {group?.name}
            </span>
            {list ? <span className="ml-2">{tview("count", { count: list.total })}</span> : null}
          </DialogDescription>
        </DialogHeader>

        <div ref={scrollRef} className="bg-muted/30 relative min-h-0 flex-1 overflow-y-auto p-4">
          {loading && list ? (
            <div
              role="status"
              className="bg-card/60 absolute inset-0 z-10 flex items-start justify-center pt-16 backdrop-blur-[1px]"
            >
              <span className="bg-card ring-border/60 flex items-center gap-2 rounded-full px-3 py-1.5 text-sm shadow-md ring-1">
                <LoaderCircle className="text-primary size-4 animate-spin" />
                <span className="text-muted-foreground">{t("table.loading")}</span>
              </span>
            </div>
          ) : null}
          {!current || (loading && !list) ? (
            <div role="status" className="text-muted-foreground flex items-center justify-center gap-2 py-12 text-sm">
              <LoaderCircle className="text-primary size-4 animate-spin" />
              {t("table.loading")}
            </div>
          ) : !list ? (
            <div className="text-muted-foreground py-12 text-center text-sm">
              <TriangleAlert className="text-warning mx-auto mb-2 size-8" />
              {tview("loadError")}
              {"error" in current && current.error ? (
                <div className="mt-1 text-xs">{current.error}</div>
              ) : null}
            </div>
          ) : list.so.length === 0 ? (
            <div className="text-muted-foreground py-12 text-center text-sm">
              <SearchX className="text-primary/40 mx-auto mb-2 size-8" />
              {tview("empty")}
            </div>
          ) : (
            <div className="border-border/60 bg-card overflow-hidden rounded-lg border">
              <Table>
                <TableHeader className="bg-muted/60">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-muted-foreground w-14 pl-4 text-xs font-semibold tracking-wide uppercase">{tview("no")}</TableHead>
                    <TableHead className="text-muted-foreground w-44 text-xs font-semibold tracking-wide uppercase">{tview("so_code")}</TableHead>
                    <TableHead className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{tview("product_name")}</TableHead>
                    <TableHead className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{tview("vendor_name")}</TableHead>
                    <TableHead className="text-muted-foreground w-32 pr-4 text-right text-xs font-semibold tracking-wide uppercase">{tview("amount")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.so.map((row, index) => (
                    <TableRow key={row.id} className="border-border/50">
                      <TableCell className="text-muted-foreground py-1.5 pl-4 font-mono text-xs">{rowNumber(index)}</TableCell>
                      <TableCell className="py-1.5 font-mono text-xs font-semibold">{row.so_code}</TableCell>
                      <TableCell className="max-w-[260px] truncate py-1.5" title={row.product_name ?? undefined}>{row.product_name}</TableCell>
                      <TableCell className="text-muted-foreground max-w-[220px] truncate py-1.5" title={row.vendor_name ?? undefined}>{row.vendor_name}</TableCell>
                      <TableCell className="py-1.5 pr-4 text-right font-mono text-xs">{money(row.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={4} className="pl-4 text-right text-xs font-semibold">{tview("total")}</TableCell>
                    <TableCell className="text-primary pr-4 text-right font-mono text-sm font-semibold">{money(list.total_amount)}</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          )}
        </div>

        {/* แบ่งหน้าอยู่นอกกรอบที่เลื่อน — กลุ่มยาวแค่ไหนก็กดเปลี่ยนหน้าได้โดยไม่ต้องเลื่อนลงล่าง */}
        {list && list.total > 0 ? (
          <div className="border-border/60 border-t px-4 py-3">
            <TablePagination
              page={page}
              pageSize={pageSize}
              total={list.total}
              onPageChange={(next) => {
                setPage(next)
                scrollRef.current?.scrollTo({ top: 0 })
              }}
              onPageSizeChange={(size) => {
                setPageSize(size)
                setPage(1)
                scrollRef.current?.scrollTo({ top: 0 })
              }}
            />
          </div>
        ) : null}

        {/* mx-0 mb-0: DialogFooter ติด -mx-4 -mb-4 มาชดเชย p-4 ของ DialogContent แต่กล่องนี้ p-0 */}
        <DialogFooter className="from-primary/12 border-border/60 mx-0 mb-0 border-t bg-transparent bg-gradient-to-r via-transparent to-transparent p-4">
          <DialogClose render={<Button type="button" variant="outline" />}>
            {t("close")}
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
