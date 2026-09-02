"use client"

import * as React from "react"
import {
  ChevronRight,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  SearchX,
  Trash2,
  TriangleAlert,
} from "lucide-react"
import { useTranslations } from "next-intl"

import {
  getAllMenus,
  MENU_PAGE_SIZE,
} from "@/app/setting/menu/_components/api"
import { DeleteModal } from "@/app/setting/menu/_components/delete_modal"
import { FormModal } from "@/app/setting/menu/_components/form_modal"
import {
  isMenuActive,
  MENU_ACTIVE,
  MENU_INACTIVE,
  type Menu,
  type MenuFormMode,
  type MenuList,
} from "@/app/setting/menu/_components/model"
import { TablePagination } from "@/app/setting/menu/_components/pagination"
import { SelectOption } from "@/app/setting/menu/_components/selectoption"
import { useNavLabel } from "@/components/app-sidebar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { fallbackIcon, iconByName } from "@/lib/nav"

/** คอลัมน์ข้อมูลที่เปิดใช้อยู่ + ช่องปุ่มแก้ไข — ใช้กับ colSpan ตอนไม่มีแถวให้แสดง
 *  (เปิด/ปิดคอลัมน์ไหนต้องแก้เลขนี้ตาม ไม่งั้นแถว "ไม่พบข้อมูล" จะกินความกว้างไม่ครบ) */
const COLUMN_COUNT = 8

/** parent_id = 0 หรือ null คือเมนูหลัก นอกนั้นเป็นเมนูย่อยของแถวอื่น */
const isChild = (menu: Menu) => Boolean(menu.parent_id)

/** ฐานข้อมูลเขียนได้ทั้ง "Package" และ "PackageOpenIcon" — lucide ใช้ชื่อที่ไม่มี Icon ต่อท้าย */
function MenuIcon({ name }: { name: string }) {
  const Icon = iconByName[name.replace(/Icon$/, "")] ?? fallbackIcon
  return <Icon className="text-primary size-4" />
}

/** หน่วงก่อนยิง API ตอนพิมพ์ค้นหา — พิมพ์รัว ๆ จะได้ไม่ยิงทุกตัวอักษร */
const SEARCH_DELAY_MS = 350

export function Tables({
  initial,
  initialError,
}: {
  /** ผลลัพธ์หน้าแรกที่ page.tsx ดึงมาให้ตั้งแต่ฝั่งเซิร์ฟเวอร์ (กันตารางว่างตอนโหลดหน้า) */
  initial: MenuList
  initialError?: boolean
}) {
  const t = useTranslations("common.table")
  const tm = useTranslations("menus")
  const tcol = useTranslations("menus.columns")
  const tall = useTranslations("common")

  const [list, setList] = React.useState(initial)
  const [failed, setFailed] = React.useState(Boolean(initialError))
  const [loading, setLoading] = React.useState(false)

  /** ฟอร์มที่เปิดอยู่ — null คือปิด · โหมดมาจากปุ่มที่กด (เพิ่ม/แก้ไข) */
  const [form, setForm] = React.useState<{
    mode: MenuFormMode
    menu?: Menu
  } | null>(null)

  /** แถวที่กำลังถามยืนยันจะลบ — null คือปิดกล่อง */
  const [removing, setRemoving] = React.useState<Menu | null>(null)

  const [nameQuery, setNameQuery] = React.useState("")
  // const [pathQuery, setPathQuery] = React.useState("")
  const [status, setStatus] = React.useState<string | null>(null)
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(MENU_PAGE_SIZE)

  /** กรอบตาราง — ใช้เลื่อนหน้าให้เห็นหัวตารางทุกครั้งที่เริ่มโหลดข้อมูลใหม่ */
  const tableRef = React.useRef<HTMLDivElement>(null)
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  /** เลขคำขอล่าสุด — ผลลัพธ์ของคำขอเก่าที่มาช้ากว่าต้องถูกทิ้ง ไม่งั้นตารางเด้งกลับไปค่าที่แล้ว */
  const latest = React.useRef(0)
  React.useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    []
  )

  /**
   * ยิง API ใหม่ทุกครั้งที่เงื่อนไขเปลี่ยน — ค้นหา กรองสถานะ และแบ่งหน้า ทำที่เซิร์ฟเวอร์ทั้งหมด
   * ต้องส่งค่าใหม่เข้ามาเป็น argument เพราะ state ที่เพิ่ง set ยังไม่อัปเดตในรอบนี้
   */
  const load = (
    next: {
      name: string
      status: string | null
      page: number
      pageSize: number
    },
    delay = 0
  ) => {
    if (timer.current) clearTimeout(timer.current)
    setLoading(true)
    // เลื่อนขึ้นมาที่หัวตารางก่อน จะได้เห็นทั้งตัวหมุนและแถวชุดใหม่ตั้งแต่แถวแรก
    // (scroll-mt-20 ที่กรอบตารางเผื่อที่ให้แถบหัวเว็บที่ปักหมุดอยู่ h-14)
    tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    const id = ++latest.current
    timer.current = setTimeout(async () => {
      try {
        const result = await getAllMenus({
          name: next.name.trim(),
          status: next.status,
          page: next.page,
          perPage: next.pageSize,
        })
        if (id !== latest.current) return
        setList(result)
        setFailed(false)
      } catch {
        // ห้าม console.error — ใน dev overlay จะขึ้นเต็มจอเหมือนหน้าพัง
        if (id !== latest.current) return
        setFailed(true)
      } finally {
        if (id === latest.current) setLoading(false)
      }
    }, delay)
  }

  /**
   * ชื่อที่แสดง — ตัวเดียวกับที่เมนูข้างและ breadcrumb ใช้
   * code ไหนมีคำแปลใน nav ใช้คำแปล ไม่มีก็ใช้ name จากฐานข้อมูล
   * (เรียก nav(menu.code) ตรง ๆ ไม่ได้ code ส่วนใหญ่ไม่มีคำแปล แล้วจะโยน MISSING_MESSAGE)
   */
  const label = useNavLabel()
  const labelOf = (menu: Menu) => label({ code: menu.code, name: menu.name })

  const statusOptions = [
    { value: MENU_ACTIVE, label: tm("active") },
    { value: MENU_INACTIVE, label: tm("inactive") },
  ]

  // เมนูแม่ต้องอยู่ในหน้าเดียวกันถึงจะหาชื่อเจอ — API แบ่งหน้ามาแล้ว ลูกกับแม่อาจอยู่คนละหน้า
  const labelById = new Map(list.menus.map((row) => [row.id, labelOf(row)]))
  /** ชื่อเมนูแม่ — หาเจอเฉพาะตอนแม่อยู่หน้าเดียวกัน (API เรียงลูกไว้ต่อจากแม่อยู่แล้ว) */
  const parentNameOf = (menu: Menu) =>
    menu.parent_id ? labelById.get(menu.parent_id) : undefined

  // ตารางไม่กรองเองแล้ว แถวที่ได้มาคือหน้าที่ API ตัดมาให้ตรงเงื่อนไขอยู่แล้ว
  const visible = list.menus

  return (
    <Card className="border-primary/10 mt-4 overflow-hidden p-0">
      <CardContent className="from-primary/12 border-border/60 grid grid-cols-1 gap-4 border-b bg-gradient-to-r via-transparent to-transparent py-4 md:grid-cols-4">
        {/* <div className="space-y-2">
          <Label htmlFor="filter-name" className="text-muted-foreground text-xs">
            {tcol("name")}
          </Label>
          <div className="group relative">
            <Search className="text-muted-foreground group-focus-within:text-primary pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 transition-colors" />
            <Input
              id="filter-name"
              value={nameQuery}
              onChange={(event) => {
                const name = event.target.value
                setNameQuery(name)
                setPage(1)
                load({ name, status, page: 1, pageSize }, SEARCH_DELAY_MS)
              }}
              placeholder={t("search")}
              className="bg-card/80 focus-visible:border-primary/50 pl-8"
            />
          </div>
        </div> */}
        <div className="space-y-2">
          <Label htmlFor="filter-status" className="text-muted-foreground text-xs" >{tcol("status")}</Label>
          <SelectOption
            id="filter-status"
            options={statusOptions}
            value={status}
            onValueChange={(next) => {
              setStatus(next)
              setPage(1)
              load({ name: nameQuery, status: next, page: 1, pageSize })
            }}
            placeholder={tall("all")}
            label={tcol("status")}
          />
        </div>
      </CardContent>

      <CardContent className="px-4 py-0">
        {/* <div className="flex flex-wrap items-end justify-end gap-0 p-0 md:p-0">
          <Button
            onClick={() => setForm({ mode: "add" })}
            className="from-chart-1 to-chart-5  bg-gradient-to-r text-white  transition-transform hover:-translate-y-0.5 hover:opacity-95"
          >
            <Plus /> {t("add")}
          </Button>
        </div> */}
        {/* relative ไว้ให้ตัวหมุนตอนโหลดวางทับตารางได้ (ห้ามใช้ opacity ที่ตัวครอบ
            ไม่งั้นตัวหมุนจะจางตามไปด้วย — ใช้พื้นโปร่งของตัวคลุมแทน) */}
        <div
          aria-busy={loading}
          ref={tableRef}
          className="border-border/60 relative mt-1 mb-4 scroll-mt-20 overflow-hidden rounded-lg border"
        >
          {loading ? (
            // เกาะไว้ด้านบน ไม่ใช่กึ่งกลาง — ตารางยาว ๆ ตัวหมุนจะได้ไม่ไปอยู่นอกจอ
            <div
              role="status"
              aria-live="polite"
              className="from-card/85 via-card/70 to-card/85 animate-in fade-in absolute inset-0 z-10 flex items-start justify-center bg-gradient-to-b pt-14 backdrop-blur-[2px] duration-200"
            >
              {/* แถบวิ่งบนขอบตาราง ไล่เฉดชุดเดียวกับปุ่มหลักและโลโก้ */}
              <span aria-hidden className="absolute inset-x-0 top-0 h-[3px] overflow-hidden" >
                <span className="from-chart-1 via-chart-5 to-chart-1 animate-loading-sweep absolute top-0 h-full w-[30%] rounded-full bg-gradient-to-r" />
              </span>

              <span className="bg-card/95 ring-border/60 animate-in fade-in zoom-in-95 flex items-center gap-2.5 rounded-full py-2 pr-4 pl-2.5 text-sm font-medium shadow-lg ring-1 duration-200">
                <span className="bg-primary/10 flex size-6 items-center justify-center rounded-full">
                  <LoaderCircle className="text-primary size-4 animate-spin" />
                </span>
                <span className="text-muted-foreground">{t("loading")}</span>
              </span>
            </div>
          ) : null}
          <Table>
            <TableHeader className="bg-muted/60">
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-muted-foreground pl-6 text-xs font-semibold tracking-wide uppercase">{tcol("name")}</TableHead>
                <TableHead className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{tcol("path")}</TableHead>
                <TableHead className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{tcol("code")}</TableHead>
                <TableHead className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{tcol("detail")}</TableHead>
                {/* <TableHead className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{tcol("parent")}</TableHead> */}
                <TableHead className="text-muted-foreground text-right text-xs font-semibold tracking-wide uppercase">{tcol("sortOrder")}</TableHead>
                <TableHead className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{tcol("status")}</TableHead>
                <TableHead className="w-24 pr-6 text-right"> <span className="sr-only">{t("edit")}</span> </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((menu) => (
                <TableRow key={menu.id} className="group/row border-border/50 hover:bg-accent/40 transition-colors" >
                  <TableCell className="relative pl-6">
                    <span
                      aria-hidden
                      className="bg-primary absolute inset-y-1 left-0 w-[3px] rounded-r-full opacity-0 transition-opacity group-hover/row:opacity-100"
                    />
                    <div className="flex min-w-0 items-center gap-2.5">
                      {isChild(menu) ? (
                        // <span
                        //   aria-hidden
                        //   className="border-border/70 ml-4 size-4 shrink-0 -translate-y-1.5 rounded-bl-[6px] border-b border-l"
                        // />
                        <span aria-hidden className="border-border/70 ml-4 size-4 shrink-0 " />
                      ) : (
                        <span className="bg-primary/10 ring-primary/20 flex size-8 shrink-0 items-center justify-center rounded-md ring-1">
                          <MenuIcon name={menu.icon} />
                        </span>
                      )}
                      {isChild(menu) ? (
                        // เมนูย่อย: ชื่อเมนูแม่นำหน้าแบบ breadcrumb ตัวเล็กสีจาง แล้วตามด้วยชื่อจริงที่อ่านง่าย
                        <span className="flex min-w-0 items-center gap-1">
                          {parentNameOf(menu) ? (
                            <>
                              <span className="text-muted-foreground/80 truncate text-xs">{parentNameOf(menu)}</span>
                              <ChevronRight aria-hidden className="text-muted-foreground/50 size-3 shrink-0"/>
                            </>
                          ) : null}
                          <span className="truncate">{labelOf(menu)}</span>
                        </span>
                      ) : (
                        <span className="truncate font-medium">{labelOf(menu)}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground group-hover/row:text-foreground font-mono text-xs transition-colors">{menu.path}</TableCell>
                  <TableCell className="text-muted-foreground font-mono text-xs">{menu.code}</TableCell>
                  <TableCell className="text-muted-foreground max-w-[220px] truncate">{menu.detail || ""}</TableCell>
                  {/* <TableCell className="text-muted-foreground">{(menu.parent_id && labelById.get(menu.parent_id)) || tm("root")}</TableCell> */}
                  <TableCell className="text-muted-foreground text-right tabular-nums">{menu.sort_order}</TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={`border-transparent font-medium ${
                        isMenuActive(menu)
                          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                          : "bg-orange-100 text-orange-700 hover:bg-orange-100"
                      }`}
                    >
                      {isMenuActive(menu) ? tm("active") : tm("inactive")}
                    </Badge>
                  </TableCell>
                  <TableCell className="pr-6 text-right">
                    <div className="flex justify-end gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={t("edit")}
                        onClick={() => setForm({ mode: "edit", menu })}
                        className="border border-orange-200 text-orange-500 transition-colors hover:bg-orange-50 hover:text-orange-700"
                      >
                        <Pencil />
                      </Button>
                      {/* <Button
                        variant="ghost"
                        size="icon"
                        aria-label={tall("delete")}
                        onClick={() => setRemoving(menu)}
                        className="border border-red-200 text-red-500 transition-colors hover:bg-red-50 hover:text-red-700 "
                      >
                        <Trash2 />
                      </Button> */}
                    </div>
                  </TableCell>
                </TableRow>
              ))}

              {visible.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={COLUMN_COUNT}
                    className="text-muted-foreground py-12 text-center"
                  >
                    {failed ? (
                      <>
                        <TriangleAlert className="text-warning mx-auto mb-2 size-8" />
                        {tm("loadError")}
                      </>
                    ) : (
                      <>
                        <SearchX className="text-primary/40 mx-auto mb-2 size-8" />
                        {t("empty")}
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <CardContent className="from-primary/12 border-border/60 border-t bg-gradient-to-r via-transparent to-transparent py-3">
        <TablePagination
          page={page}
          pageSize={pageSize}
          total={list.total}
          onPageChange={(next) => {
            setPage(next)
            load({ name: nameQuery, status, page: next, pageSize })
          }}
          onPageSizeChange={(size) => {
            setPageSize(size)
            setPage(1)
            load({ name: nameQuery, status, page: 1, pageSize: size })
          }}
        />
      </CardContent>

      {/* ฟอร์มอยู่นอกตาราง เปิด/ปิดด้วย state เดียว ปุ่มเป็นคนบอกว่าโหมดไหน */}
      <FormModal
        open={form !== null}
        onOpenChange={(next) => {
          if (!next) setForm(null)
        }}
        mode={form?.mode ?? "add"}
        menu={form?.menu}
        // บันทึกเสร็จแล้วดึงข้อมูลหน้าปัจจุบันใหม่ ด้วยเงื่อนไขค้นหา/กรองเดิม
        onSaved={() => load({ name: nameQuery, status, page, pageSize })}
      />

      {/* ถามยืนยันก่อนลบ — โหลดตารางใหม่เฉพาะตอนลบสำเร็จเท่านั้น */}
      <DeleteModal
        open={removing !== null}
        onOpenChange={(next) => {
          if (!next) setRemoving(null)
        }}
        menu={removing ?? undefined}
        onDeleted={() => load({ name: nameQuery, status, page, pageSize })}
      />
    </Card>
  )
}
