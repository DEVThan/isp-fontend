"use client"

import * as React from "react"
import {
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
  getRoleOptions,
  getUsers,
  USER_PAGE_SIZE,
} from "@/app/setting/userauthen/_components/api"
import { DeleteModal } from "@/app/setting/userauthen/_components/delete_modal"
import { FormModal } from "@/app/setting/userauthen/_components/form_modal"
import {
  isUserActive,
  USER_ACTIVE,
  USER_INACTIVE,
  type RoleOption,
  type UserAuthen,
  type UserAuthenList,
  type UserFormMode,
} from "@/app/setting/userauthen/_components/model"
import { TablePagination } from "@/app/setting/userauthen/_components/pagination"
import { SelectOption } from "@/app/setting/userauthen/_components/selectoption"
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

/** คอลัมน์ข้อมูลที่เปิดใช้อยู่ + ช่องปุ่มแก้ไข/ลบ — ใช้กับ colSpan ตอนไม่มีแถวให้แสดง
 *  (เปิด/ปิดคอลัมน์ไหนต้องแก้เลขนี้ตาม ไม่งั้นแถว "ไม่พบข้อมูล" จะกินความกว้างไม่ครบ) */
const COLUMN_COUNT = 7

/** หน่วงก่อนยิง API ตอนพิมพ์ค้นหา — พิมพ์รัว ๆ จะได้ไม่ยิงทุกตัวอักษร */
const SEARCH_DELAY_MS = 350

export function Tables({
  initial,
  initialError,
}: {
  /** ผลลัพธ์หน้าแรกที่ page.tsx ดึงมาให้ตั้งแต่ฝั่งเซิร์ฟเวอร์ (กันตารางว่างตอนโหลดหน้า) */
  initial: UserAuthenList
  initialError?: boolean
}) {
  const t = useTranslations("common.table")
  const tall = useTranslations("common")
  const tu = useTranslations("userauthens")
  const tcol = useTranslations("userauthens.columns")

  const [list, setList] = React.useState(initial)
  const [failed, setFailed] = React.useState(Boolean(initialError))
  const [loading, setLoading] = React.useState(false)

  /** ฟอร์มที่เปิดอยู่ — null คือปิด · โหมดมาจากปุ่มที่กด (เพิ่ม/แก้ไข) */
  const [form, setForm] = React.useState<{
    mode: UserFormMode
    user?: UserAuthen
  } | null>(null)
  /** แถวที่กำลังถามยืนยันจะลบ — null คือปิดกล่อง */
  const [removing, setRemoving] = React.useState<UserAuthen | null>(null)

  const [nameQuery, setNameQuery] = React.useState("")
  /** null = ไม่กรองสิทธิ์ (ทั้งหมด) */
  const [role, setRole] = React.useState<string | null>(null)
  /** null = ไม่กรองสถานะ (ทั้งหมด) */
  const [status, setStatus] = React.useState<string | null>(null)
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(USER_PAGE_SIZE)

  // ตัวเลือกสิทธิ์ของช่องกรอง — ดึงครั้งเดียวตอนเปิดหน้า
  const [roles, setRoles] = React.useState<RoleOption[]>([])
  React.useEffect(() => {
    let alive = true
    getRoleOptions()
      .then((rows) => alive && setRoles(rows))
      .catch(() => alive && setRoles([]))
    return () => {
      alive = false
    }
  }, [])

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
   * ยิง API ใหม่ทุกครั้งที่เงื่อนไขเปลี่ยน — ค้นหา กรอง และแบ่งหน้า ทำที่เซิร์ฟเวอร์ทั้งหมด
   * ต้องส่งค่าใหม่เข้ามาเป็น argument เพราะ state ที่เพิ่ง set ยังไม่อัปเดตในรอบนี้
   */
  const load = (
    next: {
      username: string
      role: string | null
      status: string | null
      page: number
      pageSize: number
    },
    delay = 0
  ) => {
    if (timer.current) clearTimeout(timer.current)
    setLoading(true)
    // เลื่อนขึ้นมาที่หัวตารางก่อน จะได้เห็นทั้งตัวหมุนและแถวชุดใหม่ตั้งแต่แถวแรก
    tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    const id = ++latest.current
    timer.current = setTimeout(async () => {
      try {
        const result = await getUsers({
          username: next.username.trim(),
          role: next.role,
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

  const statusOptions = [
    { value: USER_ACTIVE, label: tu("active") },
    { value: USER_INACTIVE, label: tu("inactive") },
  ]
  const roleOptions = roles.map((item) => ({
    value: item.id,
    label: item.rolename,
  }))

  // ตารางไม่กรองเองแล้ว แถวที่ได้มาคือหน้าที่ API ตัดมาให้ตรงเงื่อนไขอยู่แล้ว
  const visible = list.userauthens

  return (
    <Card className="border-primary/10 mt-4 overflow-hidden p-0">
      <CardContent className="from-primary/12 border-border/60 grid grid-cols-1 gap-4 border-b bg-gradient-to-r via-transparent to-transparent py-4 md:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="filter-username" className="text-muted-foreground text-xs">
            {tcol("username")}
          </Label>
          <div className="group relative">
            <Search className="text-muted-foreground group-focus-within:text-primary pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 transition-colors" />
            <Input
              id="filter-username"
              value={nameQuery}
              onChange={(event) => {
                const username = event.target.value
                setNameQuery(username)
                setPage(1)
                load(
                  { username, role, status, page: 1, pageSize },
                  SEARCH_DELAY_MS
                )
              }}
              placeholder={t("search")}
              className="bg-card/80 focus-visible:border-primary/50 pl-8"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="filter-role" className="text-muted-foreground text-xs">
            {tcol("role")}
          </Label>
          <SelectOption
            id="filter-role"
            options={roleOptions}
            value={role}
            onValueChange={(next) => {
              setRole(next)
              setPage(1)
              load({ username: nameQuery, role: next, status, page: 1, pageSize })
            }}
            placeholder={tall("all")}
            label={tcol("role")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="filter-status" className="text-muted-foreground text-xs">
            {tcol("status")}
          </Label>
          <SelectOption
            id="filter-status"
            options={statusOptions}
            value={status}
            onValueChange={(next) => {
              setStatus(next)
              setPage(1)
              load({ username: nameQuery, role, status: next, page: 1, pageSize })
            }}
            placeholder={tall("all")}
            label={tcol("status")}
          />
        </div>
      </CardContent>

      <CardContent className="px-4 py-0">
        <div className="flex flex-wrap items-end justify-end gap-0 p-0 md:p-0">
          {/* ไล่เฉดเดียวกับโลโก้ในเมนูข้าง ให้ปุ่มหลักของหน้าเป็นจุดสีที่สะดุดตาที่สุด */}
          <Button
            onClick={() => setForm({ mode: "add" })}
            className="from-chart-1 to-chart-5 bg-gradient-to-r text-white transition-transform hover:-translate-y-0.5 hover:opacity-95"
          >
            <Plus /> {t("add")}
          </Button>
        </div>

        {/* relative ไว้ให้ตัวหมุนตอนโหลดวางทับตารางได้ (ห้ามใช้ opacity ที่ตัวครอบ
            ไม่งั้นตัวหมุนจะจางตามไปด้วย — ใช้พื้นโปร่งของตัวคลุมแทน) */}
        <div
          ref={tableRef}
          aria-busy={loading}
          className="border-border/60 relative mt-1 mb-4 scroll-mt-20 overflow-hidden rounded-lg border"
        >
          {loading ? (
            <div
              role="status"
              aria-live="polite"
              className="from-card/85 via-card/70 to-card/85 animate-in fade-in absolute inset-0 z-10 flex items-start justify-center bg-gradient-to-b pt-14 backdrop-blur-[2px] duration-200"
            >
              {/* แถบวิ่งบนขอบตาราง ไล่เฉดชุดเดียวกับปุ่มหลักและโลโก้ */}
              <span
                aria-hidden
                className="absolute inset-x-0 top-0 h-[3px] overflow-hidden"
              >
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
                <TableHead className="text-muted-foreground pl-6 text-xs font-semibold tracking-wide uppercase">{tcol("username")}</TableHead>
                <TableHead className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{tcol("fullname")}</TableHead>
                <TableHead className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{tcol("role")}</TableHead>
                <TableHead className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{tcol("email")}</TableHead>
                <TableHead className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{tcol("telephone")}</TableHead>
                <TableHead className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{tcol("status")}</TableHead>
                <TableHead className="w-24 pr-6 text-right"> <span className="sr-only">{t("edit")}</span> </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((user) => (
                <TableRow
                  key={user.id}
                  className="group/row border-border/50 hover:bg-accent/40 transition-colors"
                >
                  <TableCell className="pt-1 pb-1 relative pl-6 font-medium">
                    <span aria-hidden className="bg-primary absolute inset-y-1 left-0 w-[3px] rounded-r-full opacity-0 transition-opacity group-hover/row:opacity-100" />
                    {user.username}
                  </TableCell>
                  <TableCell className="pt-1 pb-1 ">{user.fullname || "—"}</TableCell>
                  <TableCell className="pt-1 pb-1 text-muted-foreground">{user.rolename || tu("noRole")}</TableCell>
                  <TableCell className="pt-1 pb-1 text-muted-foreground max-w-[200px] truncate">{user.email || "—"}</TableCell>
                  <TableCell className="pt-1 pb-1 text-muted-foreground tabular-nums">{user.telephone || "—"}</TableCell>
                  <TableCell className="pt-1 pb-1">
                    <Badge
                      variant="secondary"
                      className={`border-transparent font-medium ${
                        isUserActive(user)
                          ? "bg-success/12 text-success-ink hover:bg-success/12"
                          : "bg-muted text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {isUserActive(user) ? tu("active") : tu("inactive")}
                    </Badge>
                  </TableCell>
                  <TableCell className="pt-1 pb-1 pr-6 text-right">
                    <div className="flex justify-end gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={t("edit")}
                        onClick={() => setForm({ mode: "edit", user })}
                        className="bg-warning/18 text-warning-ink hover:bg-orange-50 hover:text-orange-300"
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={tall("delete")}
                        onClick={() => setRemoving(user)}
                        className="bg-danger/12 text-danger-ink hover:bg-red-50 hover:text-red-300"
                      >
                        <Trash2 />
                      </Button>
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
                    {/* ดึงข้อมูลไม่สำเร็จ ต้องแยกให้ออกจาก "ค้นหาแล้วไม่เจอ" */}
                    {failed ? (
                      <>
                        <TriangleAlert className="text-warning mx-auto mb-2 size-8" />
                        {tu("loadError")}
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
            load({ username: nameQuery, role, status, page: next, pageSize })
          }}
          onPageSizeChange={(size) => {
            setPageSize(size)
            setPage(1)
            load({ username: nameQuery, role, status, page: 1, pageSize: size })
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
        user={form?.user}
        // บันทึกเสร็จแล้วดึงข้อมูลหน้าปัจจุบันใหม่ ด้วยเงื่อนไขค้นหา/กรองเดิม
        onSaved={() =>
          load({ username: nameQuery, role, status, page, pageSize })
        }
      />

      {/* ถามยืนยันก่อนลบ — โหลดตารางใหม่เฉพาะตอนลบสำเร็จเท่านั้น */}
      <DeleteModal
        open={removing !== null}
        onOpenChange={(next) => {
          if (!next) setRemoving(null)
        }}
        user={removing ?? undefined}
        onDeleted={() =>
          load({ username: nameQuery, role, status, page, pageSize })
        }
      />
    </Card>
  )
}
