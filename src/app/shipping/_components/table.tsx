"use client"

import * as React from "react"
import {
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  SearchX,
  // Trash2, — ปุ่มลบซ่อนไว้ก่อน
  TriangleAlert,
} from "lucide-react"
import { useTranslations } from "next-intl"

import {
  getShippingOptions,
  getShippings,
  setShippingDefault,
  SHIPPING_PAGE_SIZE,
} from "@/app/shipping/_components/api"
import { DeleteModal } from "@/app/shipping/_components/delete_modal"
import { FormModal } from "@/app/shipping/_components/form_modal"
import { ShippingLogo } from "@/app/shipping/_components/logo"
import {
  SHIPPING_ACTIVE,
  SHIPPING_INACTIVE,
  isShippingActive,
  type Shipping,
  type ShippingFormMode,
  type ShippingList,
  type ShippingOption,
} from "@/app/shipping/_components/model"
import { TablePagination } from "@/app/shipping/_components/pagination"
import { SelectOption } from "@/app/shipping/_components/selectoption"
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
import { PageHeader } from "@/components/page-header"

/** คอลัมน์ข้อมูลที่เปิดใช้อยู่ + ช่องปุ่มแก้ไข/ลบ — ใช้กับ colSpan ตอนไม่มีแถวให้แสดง
 *  (เปิด/ปิดคอลัมน์ไหนต้องแก้เลขนี้ตาม ไม่งั้นแถว "ไม่พบข้อมูล" จะกินความกว้างไม่ครบ) */
const COLUMN_COUNT = 7

/** หน่วงก่อนยิง API ตอนพิมพ์ค้นหา — พิมพ์รัว ๆ จะได้ไม่ยิงทุกตัวอักษร */
const SEARCH_DELAY_MS = 350

/** ตัวกรองของตาราง — code / name ตรงกับพารามิเตอร์ของ shipping-get-list · status null = ไม่กรอง */
type Filters = { code: string; name: string; status: string | null }

const EMPTY_FILTERS: Filters = { code: "", name: "", status: null }

/**
 * รายการว่างตอนเริ่ม — ตารางดึงหน้าแรกเองตอนเปิดหน้า (page.tsx ไม่ดึงให้)
 * ทุกครั้งที่เปลี่ยนภาษา (router.refresh) server เรนเดอร์ใหม่แค่ข้อความ ตารางตัวเดิมอยู่ต่อ ไม่ยิง API และตัวกรองไม่รีเซ็ต
 */
const EMPTY_LIST: ShippingList = {
  shippings: [],
  total: 0,
  page: 1,
  per_page: 0,
  total_pages: 1,
}

export function Tables() {
  const t = useTranslations("common.table")
  const tall = useTranslations("common")
  const tr = useTranslations("shippings")
  const tcol = useTranslations("shippings.columns")

  const [list, setList] = React.useState<ShippingList>(EMPTY_LIST)
  const [failed, setFailed] = React.useState(false)
  // เริ่มที่ true — หน้าแรกกำลังดึงอยู่ตั้งแต่เปิดหน้า (ดู effect ใต้ load)
  const [loading, setLoading] = React.useState(true)
  /** ดึงหน้าแรกเสร็จแล้วหรือยัง — ก่อนหน้านั้นหัวหน้าโชว์ "กำลังโหลด…" แทนจำนวน และแถวว่างไม่โชว์ "ไม่พบข้อมูล" */
  const [loaded, setLoaded] = React.useState(false)

  /** ฟอร์มที่เปิดอยู่ — null คือปิด · โหมดมาจากปุ่มที่กด (เพิ่ม/แก้ไข) */
  const [form, setForm] = React.useState<{
    mode: ShippingFormMode
    shipping?: Shipping
  } | null>(null)
  /** แถวที่กำลังถามยืนยันจะลบ — null คือปิดกล่อง */
  const [removing, setRemoving] = React.useState<Shipping | null>(null)
  /** เปลี่ยนทุกครั้งที่บันทึก — โลโก้ในตารางต่อ ?v= ให้โหลดใหม่ (ไฟล์ชื่อเดิม URL เดิม) · -get-list ไม่มี updated_at ให้ใช้แทน */
  const [logoVersion, setLogoVersion] = React.useState<number | undefined>(undefined)

  /** ตัวกรองทั้งหมดถือเป็นก้อนเดียว — load() ทุกจุดส่งก้อนนี้ไปทั้งก้อน */
  const [filters, setFilters] = React.useState<Filters>(EMPTY_FILTERS)
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(SHIPPING_PAGE_SIZE)

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
    next: Filters & { page: number; pageSize: number },
    delay = 0
  ) => {
    if (timer.current) clearTimeout(timer.current)
    setLoading(true)
    // เลื่อนขึ้นมาที่หัวตารางก่อน จะได้เห็นทั้งตัวหมุนและแถวชุดใหม่ตั้งแต่แถวแรก
    // ครั้งแรกตอนเปิดหน้าไม่ต้องเลื่อน — หน้าเพิ่งเปิด ผู้ใช้ยังอยู่บนสุดอยู่แล้ว
    if (loaded) tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    const id = ++latest.current
    timer.current = setTimeout(async () => {
      try {
        const result = await getShippings({
          code: next.code.trim(),
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
        if (id === latest.current) {
          setLoading(false)
          setLoaded(true)
        }
      }
    }, delay)
  }

  /**
   * ดึงหน้าแรกครั้งเดียวตอนเปิดหน้า ด้วยเงื่อนไขเริ่มต้น
   * เรียกผ่าน setTimeout — set state ตรง ๆ ใน effect ผิดกฎ react-hooks/set-state-in-effect
   * dev (StrictMode) mount ซ้ำ: cleanup ยกเลิกรอบแรกก่อนยิง จึงยิงจริงครั้งเดียว
   */
  React.useEffect(() => {
    const start = setTimeout(() => load({ ...filters, page, pageSize }))
    return () => clearTimeout(start)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ตั้งใจดึงแค่ตอนเปิดหน้า ที่เหลือ load ถูกเรียกจากตัวกรอง/แบ่งหน้าเอง
  }, [])

  /**
   * ขนส่งเริ่มต้น (2026-09-30 — เก็บไว้ก่อน ยังไม่มีที่ไหนใช้)
   * ตัวเลือก = ขนส่งที่ active จาก /shipping-get-option (มี is_default บอกเจ้าปัจจุบัน) · เลือกแล้วบันทึกทันที
   */
  const [defaultOptionsRaw, setDefaultOptionsRaw] = React.useState<ShippingOption[]>([])
  const [savingDefault, setSavingDefault] = React.useState(false)
  const [defaultMessage, setDefaultMessage] = React.useState<{ ok: boolean; text: string } | null>(null)
  const reloadDefaults = () =>
    getShippingOptions()
      .then(setDefaultOptionsRaw)
      // ห้าม console.error — ใน dev overlay จะขึ้นเต็มจอ
      .catch(() => {})
  React.useEffect(() => {
    let cancelled = false
    getShippingOptions()
      .then((next) => {
        if (!cancelled) setDefaultOptionsRaw(next)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])
  const defaultOptions = defaultOptionsRaw.map((option) => ({ value: String(option.id), label: option.name }))
  const currentDefault = defaultOptionsRaw.find((option) => option.is_default)

  const changeDefault = async (next: string | null) => {
    setSavingDefault(true)
    setDefaultMessage(null)
    try {
      const saved = await setShippingDefault(next ? Number(next) : 0)
      setDefaultMessage({
        ok: true,
        text: saved ? tr("defaultSaved", { name: saved.name }) : tr("defaultCleared"),
      })
      await reloadDefaults()
      // ป้าย "ค่าเริ่มต้น" ในตารางเปลี่ยนแถว — โหลดหน้าปัจจุบันใหม่
      load({ ...filters, page, pageSize })
    } catch (error) {
      setDefaultMessage({
        ok: false,
        text: error instanceof Error && error.message ? `${tr("defaultError")}: ${error.message}` : tr("defaultError"),
      })
    } finally {
      setSavingDefault(false)
    }
  }

  /** เปลี่ยนตัวกรองตัวไหนก็ตาม — กลับไปหน้า 1 แล้วยิงใหม่ (ช่องพิมพ์หน่วงก่อน ตัวเลือกยิงเลย) */
  const filter = (next: Filters, delay = 0) => {
    setFilters(next)
    setPage(1)
    load({ ...next, page: 1, pageSize }, delay)
  }

  const statusOptions = [
    { value: SHIPPING_ACTIVE, label: tr("active") },
    { value: SHIPPING_INACTIVE, label: tr("inactive") },
  ]

  // ตารางไม่กรองเองแล้ว แถวที่ได้มาคือหน้าที่ API ตัดมาให้ตรงเงื่อนไขอยู่แล้ว
  const visible = list.shippings

  /** ลำดับที่โชว์แทนรหัส — นับต่อจากหน้าก่อนหน้า (หน้า 2 แถวแรกได้ 31 เมื่อหน้าละ 30)
   *  ใช้ page/per_page ที่ API ตอบกลับมา ไม่ใช่ state ของตัวกรอง เลขจึงตรงกับแถวที่เห็นจริง */
  const rowNumber = (index: number) =>
    ((list.page || 1) - 1) * (list.per_page || pageSize) + index + 1

  return (
    <>
      <PageHeader
        title={tr("title")}
        description={loaded ? tr("description", { count: list.total }) : t("loading")}
      />

    <Card className="border-primary/10 mt-4 overflow-hidden p-0">
      <CardContent className="from-primary/12 border-border/60 grid grid-cols-1 gap-4 border-b bg-gradient-to-r via-transparent to-transparent py-4 md:grid-cols-4">
        {/* ค้นจากรหัสขนส่ง — ซ่อนไว้ก่อน (ผู้ใช้สั่ง 29/09/2026 · filters.code คงเป็น "" ส่งไป API เหมือนไม่กรอง)
            เปิดกลับ: เอา comment ออก */}
        {/* <div className="space-y-2">
          <Label htmlFor="filter-code" className="text-muted-foreground w-fit text-xs">
            {tcol("code")}
          </Label>
          <div className="group relative">
            <Search className="text-muted-foreground group-focus-within:text-primary pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 transition-colors" />
            <Input
              id="filter-code"
              value={filters.code}
              onChange={(event) =>
                filter({ ...filters, code: event.target.value }, SEARCH_DELAY_MS)
              }
              placeholder={t("search")}
              className="bg-card/80 focus-visible:border-primary/50 pl-8"
            />
          </div>
        </div> */}
        <div className="space-y-2">
          <Label htmlFor="filter-name" className="text-muted-foreground w-fit text-xs">
            {tcol("name")}
          </Label>
          <div className="group relative">
            <Search className="text-muted-foreground group-focus-within:text-primary pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 transition-colors" />
            <Input
              id="filter-name"
              value={filters.name}
              onChange={(event) =>
                filter({ ...filters, name: event.target.value }, SEARCH_DELAY_MS)
              }
              placeholder={t("search")}
              className="bg-card/80 focus-visible:border-primary/50 pl-8"
            />
          </div>
        </div>
        <div className="space-y-2">
          {/* ไม่ผูก htmlFor — ตัวเปิดของ SelectOption เป็น <button> คลิกที่ว่างข้างป้ายจะเปิดกล่องเลือกเอง
              ชื่อช่องมาจาก aria-label ของตัวเปิดแทน */}
          <Label className="text-muted-foreground w-fit text-xs">
            {tcol("status")}
          </Label>
          <SelectOption
            id="filter-status"
            options={statusOptions}
            value={filters.status}
            onValueChange={(status) => filter({ ...filters, status })}
            placeholder={tall("all")}
            label={tcol("status")}
          />
        </div>
      </CardContent>

      <CardContent className="px-4 py-0">
        <div className="flex flex-wrap items-end justify-end gap-2 p-0 pt-3 md:p-0 md:pt-3">
          {/* ขนส่งเริ่มต้น — ฝั่งซ้ายเหนือตาราง ป้ายอยู่บนช่อง (แบบเดียวกับแถบตัวกรอง) เลือกแล้วบันทึกทันที (ล้าง × = ไม่มีค่าเริ่มต้น)
              ป้ายไม่ผูก htmlFor — ตัวเปิดของ SelectOption เป็น <button> คลิกที่ว่างข้างป้ายจะเปิดกล่องเลือกเอง */}
          <div className="w-full space-y-2 sm:w-64">
            <Label className="text-muted-foreground w-fit text-xs">{tr("defaultShipping")}</Label>
            <SelectOption
              id="default-shipping"
              options={defaultOptions}
              value={currentDefault ? String(currentDefault.id) : null}
              onValueChange={(next) => void changeDefault(next)}
              placeholder={tr("defaultNone")}
              label={tr("defaultShipping")}
            />
          </div>
          {/* สถานะการบันทึก — ชิดล่างให้อยู่แนวเดียวกับช่องเลือก */}
          {savingDefault ? <LoaderCircle className="text-primary mb-2 size-4 animate-spin" /> : null}
          {defaultMessage ? (
            <span className={defaultMessage.ok ? "text-success-ink mb-2 text-xs" : "text-destructive mb-2 text-xs"}>
              {defaultMessage.text}
            </span>
          ) : null}
          <div className="mr-auto" />
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
                {/* ลำดับเป็นเลขสั้น ๆ ตรึงความกว้างไว้ ไม่งั้นตารางเฉลี่ยความกว้างให้เท่าคอลัมน์ข้อความ */}
                <TableHead className="text-muted-foreground w-16 pl-6 text-xs font-semibold tracking-wide uppercase">{tcol("no")}</TableHead>
                {/* รหัสขนส่ง — ซ่อนไว้ก่อน (เปิดกลับ: เอา comment ออกทั้งหัวคอลัมน์และเซลล์ + COLUMN_COUNT กลับเป็น 8) */}
                {/* <TableHead className="text-muted-foreground w-28 text-xs font-semibold tracking-wide uppercase">{tcol("code")}</TableHead> */}
                <TableHead className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{tcol("name")}</TableHead>
                <TableHead className="text-muted-foreground w-24 text-xs font-semibold tracking-wide uppercase">{tcol("prefix")}</TableHead>
                <TableHead className="text-muted-foreground w-36 text-xs font-semibold tracking-wide uppercase">{tcol("tel")}</TableHead>
                <TableHead className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{tcol("email")}</TableHead>
                <TableHead className="text-muted-foreground w-28 text-xs font-semibold tracking-wide uppercase">{tcol("status")}</TableHead>
                <TableHead className="w-24 pr-6 text-right"> <span className="sr-only">{t("edit")}</span> </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((shipping, index) => (
                <TableRow
                  key={shipping.id}
                  className="group/row border-border/50 hover:bg-accent/40 transition-colors"
                >
                  <TableCell className="pt-1 pb-1 relative pl-6">
                    {/* เส้นบอกแถวที่ชี้อยู่ ภาษาเดียวกับเมนูข้างที่เลือกอยู่ */}
                    <span
                      aria-hidden
                      className="bg-primary absolute inset-y-1 left-0 w-[3px] rounded-r-full opacity-0 transition-opacity group-hover/row:opacity-100"
                    />
                    <span className="text-muted-foreground font-mono text-xs">{rowNumber(index)}</span>
                  </TableCell>
                  {/* <TableCell className="pt-1 pb-1">
                    <span className="bg-primary/10 text-primary rounded-md px-2 py-0.5 font-mono text-xs font-semibold">
                      {shipping.code}
                    </span>
                  </TableCell> */}
                  {/* โลโก้ + ชื่อในช่องเดียว — ไม่มีโลโก้/เปิดไม่ขึ้นก็เหลือแค่ชื่อ */}
                  <TableCell className="pt-1 pb-1">
                    <div className="flex items-center gap-2">
                      <ShippingLogo src={shipping.logo} alt={shipping.name} version={logoVersion} className="size-7" />
                      <span className="font-medium">{shipping.name}</span>
                      {/* ขนส่งเริ่มต้น — ป้ายสีเดียวกับปุ่มหลัก (ไม่ใช้สีสถานะ) */}
                      {shipping.is_default ? (
                        <Badge variant="secondary" className="bg-primary/10 text-primary border-transparent font-medium">
                          {tr("defaultBadge")}
                        </Badge>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="pt-1 pb-1 text-muted-foreground font-mono text-xs">{shipping.prefix}</TableCell>
                  <TableCell className="pt-1 pb-1 text-muted-foreground font-mono text-xs">{shipping.tel}</TableCell>
                  <TableCell className="pt-1 pb-1 text-muted-foreground max-w-[220px] truncate" title={shipping.email ?? undefined}>{shipping.email}</TableCell>
                  <TableCell className="pt-1 pb-1">
                    <Badge
                      variant="secondary"
                      className={`border-transparent font-medium ${
                        isShippingActive(shipping)
                          ? "bg-success/12 text-success-ink hover:bg-success/12"
                          : "bg-muted text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {isShippingActive(shipping) ? tr("active") : tr("inactive")}
                    </Badge>
                  </TableCell>
                  <TableCell className="pt-1 pb-1 pr-6 text-right">
                    <div className="flex justify-end gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={t("edit")}
                        onClick={() => setForm({ mode: "edit", shipping })}
                        className="bg-warning/18 text-warning-ink hover:bg-orange-50 hover:text-orange-300"
                      >
                        <Pencil />
                      </Button>
                      {/* ปุ่มลบ — ซ่อนไว้ก่อน (ผู้ใช้สั่ง 29/09/2026 · เปิดกลับ: เอา comment ออก + Trash2 ใน import)
                          DeleteModal ด้านล่างยังอยู่ แค่ไม่มีปุ่มเปิด */}
                      {/* <Button
                        variant="ghost"
                        size="icon"
                        aria-label={tall("delete")}
                        onClick={() => setRemoving(shipping)}
                        className="bg-danger/12 text-danger-ink hover:bg-red-50 hover:text-red-300"
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
                    {/* ดึงข้อมูลไม่สำเร็จ ต้องแยกให้ออกจาก "ค้นหาแล้วไม่เจอ" */}
                    {loading && !loaded ? null : failed ? (
                      <>
                        <TriangleAlert className="text-warning mx-auto mb-2 size-8" />
                        {tr("loadError")}
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
            load({ ...filters, page: next, pageSize })
          }}
          onPageSizeChange={(size) => {
            setPageSize(size)
            setPage(1)
            load({ ...filters, page: 1, pageSize: size })
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
        shipping={form?.shipping}
        // บันทึกเสร็จแล้วดึงข้อมูลหน้าปัจจุบันใหม่ ด้วยเงื่อนไขค้นหาเดิม
        onSaved={() => {
          setLogoVersion(Date.now())
          load({ ...filters, page, pageSize })
          // ชื่อ/สถานะอาจเปลี่ยน — ตัวเลือกขนส่งเริ่มต้นต้องตามด้วย
          void reloadDefaults()
        }}
      />

      {/* ถามยืนยันก่อนลบ — โหลดตารางใหม่เฉพาะตอนลบสำเร็จเท่านั้น */}
      <DeleteModal
        open={removing !== null}
        onOpenChange={(next) => {
          if (!next) setRemoving(null)
        }}
        shipping={removing ?? undefined}
        onDeleted={() => load({ ...filters, page, pageSize })}
      />
    </Card>
    </>
  )
}
