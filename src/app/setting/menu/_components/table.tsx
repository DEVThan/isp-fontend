"use client"

import * as React from "react"
import { Pencil, Plus, Search, SearchX } from "lucide-react"
import { useTranslations } from "next-intl"

import { TablePagination } from "@/app/setting/menu/_components/pagination"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { AdminUser } from "@/lib/mock-data"

/** 4 คอลัมน์ข้อมูล + ช่องปุ่มแก้ไข — ใช้กับ colSpan ตอนไม่มีแถวให้แสดง */
const COLUMN_COUNT = 5

/**
 * สีของป้ายสิทธิ์ — ใช้ตัวแปรสีชุด status ที่มีคู่สี -ink ให้แล้ว (อ่านชัดทั้งสองธีม)
 * สีไม่ได้สื่อความหมายเอง ทุกป้ายมีข้อความกำกับอยู่แล้ว
 */
const roleTone: Record<AdminUser["roleKey"], string> = {
  owner: "bg-info/12 text-info-ink ring-info/25",
  admin: "bg-primary/12 text-accent-foreground ring-primary/30",
  support: "bg-success/12 text-success-ink ring-success/25",
  billing: "bg-warning/15 text-warning-ink ring-warning/30",
}

export function Tables({ rows }: { rows: AdminUser[] }) {
  const t = useTranslations("common.table")
  const tcol = useTranslations("users.columns")
  const tr = useTranslations("users.roles")

  const [query, setQuery] = React.useState("")
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(50)

  const filtered = React.useMemo(() => {
    const keyword = query.trim().toLowerCase()
    if (!keyword) return rows
    return rows.filter(
      (row) =>
        row.name.toLowerCase().includes(keyword) ||
        row.email.toLowerCase().includes(keyword)
    )
  }, [rows, query])

  // หนีบหน้าปัจจุบันไว้เสมอ ผลการค้นหาหดแล้วจะได้ไม่ค้างอยู่หน้าที่ไม่มีแถวเหลือ
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const visible = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  return (<>
    <div className="flex flex-wrap items-end justify-end gap-0 p-0 md:p-0 mt-4">
      {/* ไล่เฉดเดียวกับโลโก้ในเมนูข้าง ให้ปุ่มหลักของหน้าเป็นจุดสีที่สะดุดตาที่สุด */}
      <Button className="from-chart-1 to-chart-5 shadow-primary/25 bg-gradient-to-r text-white shadow-lg transition-transform hover:-translate-y-0.5 hover:opacity-95">
        <Plus /> {t("add")}
      </Button>
    </div>

    <Card className="border-primary/10 mt-1 overflow-hidden pt-0">
      {/* แถบหัวการ์ด: พื้นไล่เฉดจาง ๆ คั่นเครื่องมือค้นหาออกจากตาราง */}
      <CardContent className="from-primary/8 border-border/60 border-b bg-gradient-to-r via-transparent to-transparent py-4">
        <div className="group relative min-w-56 flex-1">
          <Search className="text-muted-foreground group-focus-within:text-primary pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 transition-colors" />
          <Input
            value={query}
            // พิมพ์ค้นหาแล้วต้องกลับไปหน้าแรก ไม่งั้นอาจเจอหน้าว่าง
            onChange={(event) => {
              setQuery(event.target.value)
              setPage(1)
            }}
            placeholder={t("search")}
            className="bg-card/80 focus-visible:border-primary/50 pl-8"
          />
        </div>
      </CardContent>

      <CardContent className="px-4 py-0">
        <Table>
          <TableHeader className="bg-muted/60">
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-muted-foreground pl-6 text-xs font-semibold tracking-wide uppercase">
                {tcol("name")}
              </TableHead>
              <TableHead className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                {tcol("email")}
              </TableHead>
              <TableHead className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                {tcol("role")}
              </TableHead>
              <TableHead className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                {tcol("lastActive")}
              </TableHead>
              <TableHead className="w-14 pr-6 text-right">
                <span className="sr-only">{t("edit")}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((user) => (
              <TableRow
                key={user.email}
                className="group/row border-border/50 hover:bg-accent/40 transition-colors"
              >
                <TableCell className="relative pl-6">
                  {/* เส้นบอกแถวที่ชี้อยู่ ภาษาเดียวกับเมนูข้างที่เลือกอยู่ */}
                  <span
                    aria-hidden
                    className="bg-primary absolute inset-y-1 left-0 w-[3px] rounded-r-full opacity-0 transition-opacity group-hover/row:opacity-100"
                  />
                  <div className="flex items-center gap-2.5">
                    <Avatar className="ring-primary/20 size-8 ring-1">
                      <AvatarFallback className="bg-primary/12 text-accent-foreground text-xs font-semibold">
                        {user.name.slice(0, 1)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{user.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground group-hover/row:text-foreground transition-colors">
                  {user.email}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={`border-transparent ring-1 ring-inset ${roleTone[user.roleKey]}`}
                  >
                    {tr(user.roleKey)}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground tabular-nums">
                  {user.lastActive}
                </TableCell>
                <TableCell className="pr-6 text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t("edit")}
                    className="text-muted-foreground hover:text-primary hover:bg-primary/10 opacity-60 transition group-hover/row:opacity-100"
                  >
                    <Pencil />
                  </Button>
                </TableCell>
              </TableRow>
            ))}

            {visible.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={COLUMN_COUNT}
                  className="text-muted-foreground py-12 text-center"
                >
                  <SearchX className="text-primary/40 mx-auto mb-2 size-8" />
                  {t("empty")}
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </CardContent>

      <CardContent className="bg-muted/30 border-border/60 border-t py-3">
        <TablePagination
          page={currentPage}
          pageSize={pageSize}
          total={filtered.length}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size)
            setPage(1)
          }}
        />
      </CardContent>
    </Card>
  </>)
}
