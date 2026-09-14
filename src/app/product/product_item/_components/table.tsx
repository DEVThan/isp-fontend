"use client"

import * as React from "react"
import {
  Eye,
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
  getProductItemFilterOptions,
  getProductItems,
  ITEM_PAGE_SIZE,
} from "@/app/product/product_item/_components/api"
import { DeleteModal } from "@/app/product/product_item/_components/delete_modal"
import { FormModal } from "@/app/product/product_item/_components/form_modal"
import {
  isProductItemActive,
  ITEM_ACTIVE,
  ITEM_INACTIVE,
  type ProductItem,
  type ProductItemFilterOptions,
  type ProductItemFormMode,
  type ProductItemList,
  type ProductItemRow,
} from "@/app/product/product_item/_components/model"
import { TablePagination } from "@/app/product/product_item/_components/pagination"
import { ProductImage } from "@/app/product/product_item/_components/product_image"
import {
  SelectOption,
  type SelectOptionItem,
} from "@/app/product/product_item/_components/selectoption"
import { ViewModal } from "@/app/product/product_item/_components/view_modal"
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
import type { InitialResult } from "@/lib/initial-list"

/** คอลัมน์ข้อมูลที่เปิดใช้อยู่ + ช่องปุ่มแก้ไข/ลบ — ใช้กับ colSpan ตอนไม่มีแถวให้แสดง
 *  (เปิด/ปิดคอลัมน์ไหนต้องแก้เลขนี้ตาม ไม่งั้นแถว "ไม่พบข้อมูล" จะกินความกว้างไม่ครบ) */
const COLUMN_COUNT = 7

/** หน่วงก่อนยิง API ตอนพิมพ์ค้นหา — พิมพ์รัว ๆ จะได้ไม่ยิงทุกตัวอักษร */
const SEARCH_DELAY_MS = 350

/** เงื่อนไขทั้งหมดที่ส่งไปให้ API ตัดหน้ามาให้ — null = ไม่กรองตัวนั้น */
type Filters = {
  code: string
  name: string
  status: string | null
  /** ชื่อประเภทสินค้า */
  productType: string | null
  /** ชื่อประเภทการจัดส่ง */
  shipmentType: string | null
  /** รหัสผู้ขาย (vendor.code) */
  vendor: string | null
  page: number
  pageSize: number
}

export function Tables({
  initial,
}: {
  /**
   * หน้าแรกจาก page.tsx — promise ที่ยังไม่เสร็จ (page.tsx ไม่ await เพื่อให้หน้าเปิดได้ทันทีตอนกดเมนู)
   * React.use() รอจนเสร็จ ระหว่างนั้น <Suspense> ใน page.tsx โชว์ TableLoading แทน · API ล่มได้ failed: true ไม่ throw
   */
  initial: Promise<InitialResult<ProductItemList>>
}) {
  const first = React.use(initial)
  const t = useTranslations("common.table")
  const tall = useTranslations("common")
  const tr = useTranslations("productitems")
  const tcol = useTranslations("productitems.columns")

  const [list, setList] = React.useState(first.list)
  const [failed, setFailed] = React.useState(first.failed)
  const [loading, setLoading] = React.useState(false)

  /** ฟอร์มที่เปิดอยู่ — null คือปิด · โหมดมาจากปุ่มที่กด (เพิ่ม/แก้ไข) */
  const [form, setForm] = React.useState<{
    mode: ProductItemFormMode
    item?: ProductItemRow
  } | null>(null)
  /** แถวที่กำลังถามยืนยันจะลบ — null คือปิดกล่อง */
  const [removing, setRemoving] = React.useState<ProductItem | null>(null)
  /** แถวที่กำลังเปิดดูข้อมูลทั้งหมด — null คือปิดกล่อง */
  const [viewing, setViewing] = React.useState<ProductItemRow | null>(null)
  /**
   * เลขต่อท้าย URL รูป — เปลี่ยนทุกครั้งที่บันทึกสินค้า
   * รูปชื่อ {item_code}.{นามสกุล} เปลี่ยนรูปแล้ว URL มักเหมือนเดิม browser จะโชว์รูปเก่าจากหน่วยความจำ
   * (get-list ไม่ได้ส่ง updated_at มาให้ใช้แทน)
   */
  const [imageVersion, setImageVersion] = React.useState(0)

  /** ค้นจากรหัสสินค้า — แยกช่องจากชื่อ เพราะ API รับคนละพารามิเตอร์ */
  const [codeQuery, setCodeQuery] = React.useState("")
  const [nameQuery, setNameQuery] = React.useState("")
  /** null = ไม่กรองสถานะ (ทั้งหมด) */
  const [status, setStatus] = React.useState<string | null>(null)
  const [productType, setProductType] = React.useState<string | null>(null)
  const [shipmentType, setShipmentType] = React.useState<string | null>(null)
  const [vendor, setVendor] = React.useState<string | null>(null)
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(ITEM_PAGE_SIZE)

  /** ตัวเลือกของตัวกรองแบบ dropdown — ดึงครั้งเดียวตอนเปิดหน้า ยังไม่ได้ก็เลือกไม่ได้เฉย ๆ */
  const [filterOptions, setFilterOptions] = React.useState<ProductItemFilterOptions>({
    productTypes: [],
    shipmentTypes: [],
    vendors: [],
  })
  React.useEffect(() => {
    let cancelled = false
    // getProductItemFilterOptions ไม่มีทาง throw — เส้นไหนล้ม ตัวกรองนั้นได้ [] ไป
    getProductItemFilterOptions().then((next) => {
      if (!cancelled) setFilterOptions(next)
    })
    return () => {
      cancelled = true
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

  /** เงื่อนไขชุดปัจจุบัน — แต่ละที่ที่เปลี่ยนเงื่อนไข เอาไปทับเฉพาะตัวที่เปลี่ยนแล้วส่งเข้า load */
  const filters: Filters = {
    code: codeQuery,
    name: nameQuery,
    status,
    productType,
    shipmentType,
    vendor,
    page,
    pageSize,
  }

  /**
   * ยิง API ใหม่ทุกครั้งที่เงื่อนไขเปลี่ยน — ค้นหา กรอง และแบ่งหน้า ทำที่เซิร์ฟเวอร์ทั้งหมด
   * ต้องส่งค่าใหม่เข้ามาเป็น argument เพราะ state ที่เพิ่ง set ยังไม่อัปเดตในรอบนี้
   */
  const load = (next: Filters, delay = 0) => {
    if (timer.current) clearTimeout(timer.current)
    setLoading(true)
    // เลื่อนขึ้นมาที่หัวตารางก่อน จะได้เห็นทั้งตัวหมุนและแถวชุดใหม่ตั้งแต่แถวแรก
    tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    const id = ++latest.current
    timer.current = setTimeout(async () => {
      try {
        const result = await getProductItems({
          itemCode: next.code.trim(),
          productName: next.name.trim(),
          status: next.status,
          productType: next.productType,
          shipmentType: next.shipmentType,
          vendorCode: next.vendor,
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
    { value: ITEM_ACTIVE, label: tr("active") },
    { value: ITEM_INACTIVE, label: tr("inactive") },
  ]

  /** ประเภทสินค้า / การจัดส่ง ผูกกับสินค้าด้วยชื่อ — value จึงเป็นชื่อ */
  const productTypeOptions: SelectOptionItem[] = filterOptions.productTypes.map(
    (option) => ({ value: option.name, label: option.name })
  )
  const shipmentTypeOptions: SelectOptionItem[] = filterOptions.shipmentTypes.map(
    (option) => ({ value: option.name, label: option.name })
  )
  /** ผู้ขายชื่อซ้ำกันได้ — value เป็นรหัส ป้ายมีรหัสนำหน้า */
  const vendorOptions: SelectOptionItem[] = filterOptions.vendors.map((option) => ({
    value: option.code,
    label: `${option.code} — ${option.name}`,
  }))

  /**
   * ตัวกรองแบบ dropdown — ป้ายไม่ผูก htmlFor (ตัวช่องเป็นปุ่ม และ Label กว้างเต็มคอลัมน์
   * คลิกที่ว่างข้างชื่อแล้วรายการจะเด้งเปิด) · เปลี่ยนค่าแล้วกลับไปหน้า 1 เสมอ
   */
  const selectFilter = (
    id: string,
    label: string,
    options: SelectOptionItem[],
    value: string | null,
    apply: (next: string | null) => Filters
  ) => (
    <div className="space-y-2">
      <Label className="text-muted-foreground w-fit text-xs">{label}</Label>
      <SelectOption
        id={id}
        options={options}
        value={value}
        onValueChange={(next) => {
          setPage(1)
          load(apply(next))
        }}
        placeholder={tall("all")}
        label={label}
      />
    </div>
  )

  // ตารางไม่กรองเองแล้ว แถวที่ได้มาคือหน้าที่ API ตัดมาให้ตรงเงื่อนไขอยู่แล้ว
  const visible = list.products

  /** ลำดับที่โชว์แทนรหัส — นับต่อจากหน้าก่อนหน้า (หน้า 2 แถวแรกได้ 31 เมื่อหน้าละ 30)
   *  ใช้ page/per_page ที่ API ตอบกลับมา ไม่ใช่ state ของตัวกรอง เลขจึงตรงกับแถวที่เห็นจริง */
  const rowNumber = (index: number) =>
    ((list.page || 1) - 1) * (list.per_page || pageSize) + index + 1

  return (
    <Card className="border-primary/10 mt-4 overflow-hidden p-0">
      {/* แถวบน: รหัส + ชื่อสินค้า (ช่องพิมพ์ค้น กินครึ่งแถวคนละครึ่ง) · แถวล่าง: dropdown 4 ตัว
          ไม่ใช้ div ครอบแยกแถว — xl:col-span-2 ของสองช่องบนดันให้ 4 ตัวที่เหลือตกไปแถวล่างเอง */}
      <CardContent className="from-primary/12 border-border/60 grid grid-cols-1 gap-4 border-b bg-gradient-to-r via-transparent to-transparent py-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-2 xl:col-span-2">
          <Label htmlFor="filter-code" className="text-muted-foreground text-xs">
            {tcol("itemCode")}
          </Label>
          <div className="group relative">
            <Search className="text-muted-foreground group-focus-within:text-primary pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 transition-colors" />
            <Input
              id="filter-code"
              value={codeQuery}
              onChange={(event) => {
                const code = event.target.value
                setCodeQuery(code)
                setPage(1)
                load({ ...filters, code, page: 1 }, SEARCH_DELAY_MS)
              }}
              placeholder={t("search")}
              className="bg-card/80 focus-visible:border-primary/50 pl-8"
            />
          </div>
        </div>
        <div className="space-y-2 xl:col-span-2">
          <Label htmlFor="filter-name" className="text-muted-foreground text-xs">
            {tcol("productName")}
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
                load({ ...filters, name, page: 1 }, SEARCH_DELAY_MS)
              }}
              placeholder={t("search")}
              className="bg-card/80 focus-visible:border-primary/50 pl-8"
            />
          </div>
        </div>
        {selectFilter(
          "filter-product_type",
          tcol("productTypeName"),
          productTypeOptions,
          productType,
          (next) => {
            setProductType(next)
            return { ...filters, productType: next, page: 1 }
          }
        )}
        {selectFilter(
          "filter-shipment_type",
          tcol("shipmentType"),
          shipmentTypeOptions,
          shipmentType,
          (next) => {
            setShipmentType(next)
            return { ...filters, shipmentType: next, page: 1 }
          }
        )}
        {selectFilter(
          "filter-vendor",
          tcol("supplierName"),
          vendorOptions,
          vendor,
          (next) => {
            setVendor(next)
            return { ...filters, vendor: next, page: 1 }
          }
        )}
        {selectFilter(
          "filter-status",
          tcol("status"),
          statusOptions,
          status,
          (next) => {
            setStatus(next)
            return { ...filters, status: next, page: 1 }
          }
        )}
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
                {/* ลำดับเป็นเลขสั้น ๆ ตรึงความกว้างไว้ ไม่งั้นตารางเฉลี่ยความกว้างให้เท่าคอลัมน์ข้อความ */}
                <TableHead className="text-muted-foreground w-16 pl-6 text-xs font-semibold tracking-wide uppercase">{tcol("no")}</TableHead>
                {/* รูป + รหัส + ชื่อสินค้า รวมอยู่คอลัมน์เดียว ไม่ตรึงความกว้าง ให้กินที่ที่เหลือของตาราง */}
                <TableHead className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{tcol("itemCode")} / {tcol("productName")}</TableHead>
                <TableHead className="text-muted-foreground w-28 text-xs font-semibold tracking-wide uppercase">{tcol("productTypeName")}</TableHead>
                <TableHead className="text-muted-foreground w-32 text-xs font-semibold tracking-wide uppercase">{tcol("supplierName")}</TableHead>
                <TableHead className="text-muted-foreground w-28 text-xs font-semibold tracking-wide uppercase">{tcol("shipmentType")}</TableHead>
                <TableHead className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{tcol("status")}</TableHead>
                <TableHead className="w-32 pr-6 text-right"> <span className="sr-only">{t("edit")}</span> </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((item, index) => (
                <TableRow
                  key={item.id}
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
                  <TableCell className="pt-1.5 pb-1.5">
                    {/* รูปซ้ายสุด ข้างขวาเป็นรหัส (บน) + ชื่อสินค้า (ล่าง) ซ้อนกัน
                        ไม่มีรูป ProductImage ไม่แสดงอะไร ข้อความจึงชิดซ้ายเอง */}
                    <div className="flex max-w-[400px] items-center gap-3">
                      <ProductImage
                        src={item.image}
                        version={imageVersion}
                        alt={item.item_code}
                        className="size-12"
                      />
                      <div className="grid min-w-0 gap-1">
                        <span className="bg-primary/10 text-primary w-fit rounded-md px-2 py-0.5 font-mono text-xs font-semibold">
                          {item.item_code}
                        </span>
                        {/* ชื่อสินค้ายาวมาก (มีเดือน/โปรฯ ต่อท้าย) ตัดทิ้งแล้วให้ชี้ดูเต็มด้วย title */}
                        <span className="truncate font-medium" title={item.product_name}>
                          {item.product_name}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="pt-1 pb-1 text-muted-foreground">{item.product_type_name}</TableCell>
                  <TableCell className="pt-1 pb-1 text-muted-foreground max-w-[160px] truncate">{item.supplier_name}</TableCell>
                  <TableCell className="pt-1 pb-1 text-muted-foreground">{item.shipment_type}</TableCell>
                  <TableCell className="pt-1 pb-1">
                    <Badge
                      variant="secondary"
                      className={`border-transparent font-medium ${
                        isProductItemActive(item)
                          ? "bg-success/12 text-success-ink hover:bg-success/12"
                          : "bg-muted text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {isProductItemActive(item) ? tr("active") : tr("inactive")}
                    </Badge>
                  </TableCell>
                  <TableCell className="pt-1 pb-1 pr-6 text-right">
                    <div className="flex justify-end gap-0.5">
                      {/* ดูข้อมูลทั้งหมด — สี info แยกจากส้ม (แก้ไข) และแดง (ลบ) */}
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={t("view")}
                        onClick={() => setViewing(item)}
                        className="bg-info/12 text-info-ink hover:bg-info/20"
                      >
                        <Eye />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={t("edit")}
                        onClick={() => setForm({ mode: "edit", item })}
                        className="bg-warning/18 text-warning-ink hover:bg-orange-50 hover:text-orange-300"
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={tall("delete")}
                        onClick={() => setRemoving(item)}
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
            load({ ...filters, page: next })
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
        item={form?.item}
        // บันทึกเสร็จแล้วดึงข้อมูลหน้าปัจจุบันใหม่ ด้วยเงื่อนไขค้นหา/กรองเดิม
        onSaved={() => {
          setImageVersion(Date.now())
          load(filters)
        }}
      />

      {/* ดูข้อมูลทั้งหมดแบบอ่านอย่างเดียว */}
      <ViewModal
        open={viewing !== null}
        onOpenChange={(next) => {
          if (!next) setViewing(null)
        }}
        item={viewing ?? undefined}
        imageVersion={imageVersion}
      />

      {/* ถามยืนยันก่อนลบ — โหลดตารางใหม่เฉพาะตอนลบสำเร็จเท่านั้น */}
      <DeleteModal
        open={removing !== null}
        onOpenChange={(next) => {
          if (!next) setRemoving(null)
        }}
        item={removing ?? undefined}
        onDeleted={() => load(filters)}
      />
    </Card>
  )
}
