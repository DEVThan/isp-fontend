"use client"

import * as React from "react"
import {
  CheckCircle2,
  CircleDot,
  Clock,
  LoaderCircle,
  Pencil,
  // Plus, — ปุ่มเพิ่มปิดไว้ก่อน
  Search,
  SearchX,
  // Trash2, — ปุ่มลบปิดไว้ก่อน
  TriangleAlert,
  XCircle,
  type LucideIcon,
} from "lucide-react"
import { useTranslations } from "next-intl"

import {
  getSoList,
  getSoOptions,
  SO_PAGE_SIZE,
} from "@/app/sale/so/_components/api"
import { DeleteModal } from "@/app/sale/so/_components/delete_modal"
import { FormModal } from "@/app/sale/so/_components/form_modal"
import { BroadcastLogo } from "@/app/sale/so/_components/logo"
import {
  NO_SO_OPTIONS,
  type So,
  type SoFormMode,
  type SoList,
} from "@/app/sale/so/_components/model"
import { TablePagination } from "@/app/sale/so/_components/pagination"
import {
  SelectOption,
  type SelectOptionItem,
} from "@/app/sale/so/_components/selectoption"
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
import { cn } from "@/lib/utils"

/** คอลัมน์ข้อมูลที่เปิดใช้อยู่ + ช่องปุ่มแก้ไข/ลบ — ใช้กับ colSpan ตอนไม่มีแถวให้แสดง
 *  (เปิด/ปิดคอลัมน์ไหนต้องแก้เลขนี้ตาม ไม่งั้นแถว "ไม่พบข้อมูล" จะกินความกว้างไม่ครบ) */
const COLUMN_COUNT = 10

/** หน่วงก่อนยิง API ตอนพิมพ์ค้นหา — พิมพ์รัว ๆ จะได้ไม่ยิงทุกตัวอักษร */
const SEARCH_DELAY_MS = 350

/**
 * สีป้ายสถานะออเดอร์ — คีย์คือค่าที่เก็บในคอลัมน์ status (= ชื่อในทะเบียน status_po)
 * ใช้ตระกูลสีสถานะเป็นพื้นจาง + ตัวหนังสือสี -ink คู่กับไอคอนเสมอ สีจึงไม่ใช่ช่องทางสื่อความหมายเดียว
 * ค่าที่ไม่รู้จัก (ทะเบียนเพิ่มใหม่ หรือ sync เขียนค่าใหม่มา) ได้สีกลาง ไม่ใช่ไม่โชว์
 */
const STATUS_STYLE: Record<string, { className: string; icon: LucideIcon }> = {
  "ออเดอร์ใหม่": { className: "bg-info/12 text-info-ink", icon: CircleDot },
  "กำลังจัดส่ง": { className: "bg-warning/18 text-warning-ink", icon: Clock },
  "ลูกค้าได้รับสินค้าแล้ว": {
    className: "bg-success/12 text-success-ink",
    icon: CheckCircle2,
  },
  "ยกเลิก": { className: "bg-danger/12 text-danger-ink", icon: XCircle },
}

/** สีป้ายสถานะการชำระเงิน — ชำระแล้วเขียว ที่เหลือกลาง (รอชำระเงินคือค่าปกติของ 98% ของแถว) */
const PAYMENT_STYLE: Record<string, string> = {
  "ชำระเงินแล้ว": "bg-success/12 text-success-ink",
}

/** เงื่อนไขทั้งหมดที่ส่งไปให้ API ตัดหน้ามาให้ — ชื่อตรงกับพารามิเตอร์ของ so-get-list */
type Filters = {
  soCode: string
  name: string
  tel: string
  productName: string
  /** null = ไม่กรองสถานะ (ทั้งหมด) */
  status: string | null
  channel: string | null
  /** YYYY-MM-DD จากช่อง type="date" — ว่าง = ไม่กรอง */
  dateFrom: string
  dateTo: string
  page: number
  pageSize: number
}

/** ยอดเงิน/จำนวน — numeric มาเป็นข้อความ ("999.0") · ว่าง/ไม่ใช่ตัวเลขไม่โชว์อะไร */
const formatNumber = (value: string | null, fractionDigits: number) => {
  if (value === null || value.trim() === "") return null
  const parsed = Number(value.replace(/,/g, ""))
  if (!Number.isFinite(parsed)) return value
  return parsed.toLocaleString("en-US", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })
}

/** "2026-09-24 10:59:52" → "24/09/2026 10:59" — คอลัมน์วันที่เป็น text ตัดเอาเท่าที่ต้องใช้ */
const formatDateTime = (value: string | null) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}:\d{2})/.exec(value ?? "")
  if (match) return `${match[3]}/${match[2]}/${match[1]} ${match[4]}`
  const day = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? "")
  return day ? `${day[3]}/${day[2]}/${day[1]}` : value
}

/**
 * รายการว่างตอนเริ่ม — ตารางดึงหน้าแรกเองตอนเปิดหน้า (page.tsx ไม่ดึงให้)
 * ทุกครั้งที่เปลี่ยนภาษา (router.refresh) server เรนเดอร์ใหม่แค่ข้อความ ตารางตัวเดิมอยู่ต่อ
 * ไม่ยิง API และตัวกรองไม่รีเซ็ต
 */
const EMPTY_LIST: SoList = {
  so: [],
  total: 0,
  page: 1,
  per_page: 0,
  total_pages: 1,
}

export function Tables() {
  const t = useTranslations("common.table")
  const tall = useTranslations("common")
  const tr = useTranslations("so")
  const tcol = useTranslations("so.columns")

  const [list, setList] = React.useState<SoList>(EMPTY_LIST)
  const [failed, setFailed] = React.useState(false)
  // เริ่มที่ true — หน้าแรกกำลังดึงอยู่ตั้งแต่เปิดหน้า (ดู effect ใต้ load)
  const [loading, setLoading] = React.useState(true)
  /** ดึงหน้าแรกเสร็จแล้วหรือยัง — ก่อนหน้านั้นหัวหน้าโชว์ "กำลังโหลด…" แทนจำนวน และแถวว่างไม่โชว์ "ไม่พบข้อมูล" */
  const [loaded, setLoaded] = React.useState(false)

  /** ฟอร์มที่เปิดอยู่ — null คือปิด · โหมดมาจากปุ่มที่กด (เพิ่ม/แก้ไข) */
  const [form, setForm] = React.useState<{
    mode: SoFormMode
    so?: So
  } | null>(null)
  /** แถวที่กำลังถามยืนยันจะลบ — null คือปิดกล่อง */
  const [removing, setRemoving] = React.useState<So | null>(null)

  const [soCode, setSoCode] = React.useState("")
  const [name, setName] = React.useState("")
  const [tel, setTel] = React.useState("")
  const [productName, setProductName] = React.useState("")
  const [status, setStatus] = React.useState<string | null>(null)
  const [channel, setChannel] = React.useState<string | null>(null)
  const [dateFrom, setDateFrom] = React.useState("")
  const [dateTo, setDateTo] = React.useState("")
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(SO_PAGE_SIZE)

  /**
   * ตัวเลือกของ dropdown ในแถบตัวกรอง — ดึงหลังหน้าแรกโหลดเสร็จ ไม่ใช่พร้อมกันตอนเปิดหน้า
   * API ช้าลงเมื่อยิงพร้อมกันหลายเส้น รายการที่ผู้ใช้รอดูจะช้าไปด้วย
   * loaded เปลี่ยนเป็น true ครั้งเดียว effect นี้จึงยิงครั้งเดียวต่อการเปิดหน้า
   */
  const [options, setOptions] = React.useState(NO_SO_OPTIONS)
  React.useEffect(() => {
    if (!loaded) return
    let cancelled = false
    // getSoOptions ไม่มีทาง throw — เส้นไหนล้ม ตัวกรองนั้นได้ [] ไป
    getSoOptions().then((next) => {
      if (!cancelled) setOptions(next)
    })
    return () => {
      cancelled = true
    }
  }, [loaded])

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
    soCode,
    name,
    tel,
    productName,
    status,
    channel,
    dateFrom,
    dateTo,
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
    // ครั้งแรกตอนเปิดหน้าไม่ต้องเลื่อน — หน้าเพิ่งเปิด ผู้ใช้ยังอยู่บนสุดอยู่แล้ว
    if (loaded) tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    const id = ++latest.current
    timer.current = setTimeout(async () => {
      try {
        const result = await getSoList({
          soCode: next.soCode.trim(),
          name: next.name.trim(),
          tel: next.tel.trim(),
          productName: next.productName.trim(),
          status: next.status ?? "",
          channel: next.channel ?? "",
          dateFrom: next.dateFrom,
          dateTo: next.dateTo,
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
    const start = setTimeout(() => load(filters))
    return () => clearTimeout(start)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ตั้งใจดึงแค่ตอนเปิดหน้า ที่เหลือ load ถูกเรียกจากตัวกรอง/แบ่งหน้าเอง
  }, [])

  /**
   * สถานะออเดอร์: ทะเบียน status_po อย่างเดียว (หน้า /setting/status_po)
   * 24/09/2026 ทะเบียนถูกแก้ให้เก็บค่าไทยชุดเดียวกับที่งาน sync เขียน — ครอบทุกแถวในตาราง
   * ตัวกรองจึงใช้ได้จริง (ก่อนหน้านี้ทะเบียนเป็นอังกฤษ เลือกแล้วไม่เจอแถวไหนเลย)
   * เรียงตาม id ตามที่เส้น -get-option ส่งมา
   */
  const statusOptions: SelectOptionItem[] = options.statuses.map((option) => ({
    value: option.name,
    label: option.name,
  }))

  /** ช่องทางออกอากาศ — ทะเบียน broadcast (ชื่อตรงกับที่เก็บใน so.channel) */
  const channelOptions: SelectOptionItem[] = options.broadcasts.map((option) => ({
    value: option.name,
    label: option.name,
  }))

  /**
   * ชื่อช่องทาง -> path โลโก้ · so.channel เก็บเป็นชื่อ ไม่ได้ผูก id กับตาราง broadcast
   * จึงจับคู่ด้วยชื่อตรง ๆ · ชื่อที่ไม่มีในทะเบียน (outbound call, Retail, Line OA, …) ไม่มีโลโก้
   * ตัวเลือกถูกดึงหลังรายการโหลดเสร็จ (ดู effect ของ options) โลโก้จึงขึ้นช้ากว่าแถวเล็กน้อย
   */
  const channelLogos = new Map(
    options.broadcasts.map((option) => [option.name, option.logo])
  )

  // ตารางไม่กรองเองแล้ว แถวที่ได้มาคือหน้าที่ API ตัดมาให้ตรงเงื่อนไขอยู่แล้ว
  const visible = list.so

  /** ลำดับที่โชว์แทนรหัส — นับต่อจากหน้าก่อนหน้า (หน้า 2 แถวแรกได้ 31 เมื่อหน้าละ 30)
   *  ใช้ page/per_page ที่ API ตอบกลับมา ไม่ใช่ state ของตัวกรอง เลขจึงตรงกับแถวที่เห็นจริง */
  const rowNumber = (index: number) =>
    ((list.page || 1) - 1) * (list.per_page || pageSize) + index + 1

  /** ช่องพิมพ์ค้นหาหนึ่งช่อง — ทุกช่องกลับไปหน้า 1 แล้วค่อยยิงหลังหยุดพิมพ์ */
  const searchFilter = (
    key: "soCode" | "name" | "tel" | "productName",
    label: string,
    value: string,
    setValue: (next: string) => void
  ) => (
    <div className="space-y-2">
      <Label htmlFor={`filter-${key}`} className="text-muted-foreground w-fit text-xs">
        {label}
      </Label>
      <div className="group relative">
        <Search className="text-muted-foreground group-focus-within:text-primary pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 transition-colors" />
        <Input
          id={`filter-${key}`}
          value={value}
          inputMode={key === "tel" ? "tel" : undefined}
          onChange={(event) => {
            const next = event.target.value
            setValue(next)
            setPage(1)
            load({ ...filters, [key]: next, page: 1 }, SEARCH_DELAY_MS)
          }}
          placeholder={t("search")}
          className="bg-card/80 focus-visible:border-primary/50 pl-8"
        />
      </div>
    </div>
  )

  /**
   * ตัวกรองแบบ dropdown — ป้ายไม่ผูก htmlFor (ตัวช่องเป็นปุ่ม และ Label กว้างเต็มคอลัมน์
   * คลิกที่ว่างข้างชื่อแล้วรายการจะเด้งเปิด) · เปลี่ยนค่าแล้วกลับไปหน้า 1 เสมอ
   */
  const selectFilter = (
    id: string,
    label: string,
    items: SelectOptionItem[],
    value: string | null,
    apply: (next: string | null) => Filters
  ) => (
    <div className="space-y-2">
      <Label className="text-muted-foreground w-fit text-xs">{label}</Label>
      <SelectOption
        id={id}
        options={items}
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

  /** ช่วงวันที่ — เทียบกับ create_date ฝั่ง API (10 ตัวแรกของข้อความ) ไม่มีหน่วง ยิงทันทีที่เลือก */
  const dateFilter = (
    key: "dateFrom" | "dateTo",
    label: string,
    value: string,
    setValue: (next: string) => void
  ) => (
    <div className="space-y-2">
      <Label htmlFor={`filter-${key}`} className="text-muted-foreground w-fit text-xs">
        {label}
      </Label>
      <Input
        id={`filter-${key}`}
        type="date"
        value={value}
        onChange={(event) => {
          const next = event.target.value
          setValue(next)
          setPage(1)
          load({ ...filters, [key]: next, page: 1 })
        }}
        className="bg-card/80 focus-visible:border-primary/50"
      />
    </div>
  )

  return (
    <>
      <PageHeader
        title={tr("title")}
        description={
          loaded
            ? tr("description", { count: list.total.toLocaleString("en-US") })
            : t("loading")
        }
      />

    <Card className="border-primary/10 mt-4 overflow-hidden p-0">
      {/* แถวบน: เลขที่ SO / ชื่อผู้สั่ง / เบอร์โทร / ชื่อสินค้า · แถวล่าง: สถานะ ช่องทาง และช่วงวันที่ */}
      <CardContent className="from-primary/12 border-border/60 grid grid-cols-1 gap-4 border-b bg-gradient-to-r via-transparent to-transparent py-4 md:grid-cols-2 xl:grid-cols-4">
        {searchFilter("soCode", tcol("so_code"), soCode, setSoCode)}
        {searchFilter("name", tcol("name"), name, setName)}
        {searchFilter("tel", tcol("tel"), tel, setTel)}
        {searchFilter("productName", tcol("product_name"), productName, setProductName)}
        {selectFilter("filter-status", tcol("status"), statusOptions, status, (next) => {
          setStatus(next)
          return { ...filters, status: next, page: 1 }
        })}
        {selectFilter("filter-channel", tcol("channel"), channelOptions, channel, (next) => {
          setChannel(next)
          return { ...filters, channel: next, page: 1 }
        })}
        {dateFilter("dateFrom", tr("dateFrom"), dateFrom, setDateFrom)}
        {dateFilter("dateTo", tr("dateTo"), dateTo, setDateTo)}
      </CardContent>

      <CardContent className="px-4 py-0">
        <div className="flex flex-wrap items-end justify-end gap-0 p-0 md:p-0">
          {/* ปิดปุ่มเพิ่มไว้ก่อน — เปิดกลับให้เอา Plus ใน import ออกจาก comment ด้วย
              (FormModal ด้านล่างยังอยู่ ตอนนี้เข้าถึงได้แต่โหมดแก้ไขจากปุ่มดินสอในแถว
               ทั้งตารางนี้จึงกลายเป็นอ่าน+แก้ไข ไม่มีทางเพิ่มหรือลบแถวจากหน้าเว็บ
               ซึ่งตรงกับที่ทุกแถวมาจากงาน sync รายวันอยู่แล้ว)
              ไล่เฉดเดียวกับโลโก้ในเมนูข้าง ให้ปุ่มหลักของหน้าเป็นจุดสีที่สะดุดตาที่สุด */}
          {/* <Button
            onClick={() => setForm({ mode: "add" })}
            className="from-chart-1 to-chart-5 bg-gradient-to-r text-white transition-transform hover:-translate-y-0.5 hover:opacity-95"
          >
            <Plus /> {t("add")}
          </Button> */}
        </div>

        {/* relative ไว้ให้ตัวหมุนตอนโหลดวางทับตารางได้ (ห้ามใช้ opacity ที่ตัวครอบ
            ไม่งั้นตัวหมุนจะจางตามไปด้วย — ใช้พื้นโปร่งของตัวคลุมแทน)

            w-0 min-w-full + overflow-x-auto: ตารางนี้มี 10 คอลัมน์ ความกว้างขั้นต่ำของมัน (~1,174px)
            มากกว่าที่เนื้อหามีให้ (1,102px ที่จอ 1440) · main ใน dashboard-shell เป็น flex item ที่
            min-width เป็น auto จึงยืดตามความกว้างขั้นต่ำของลูก แล้วทั้งหน้าเลื่อนออกนอกจอ 72px
            (วัดได้: document.scrollWidth 1512 > innerWidth 1440 — หน้าอื่นที่คอลัมน์น้อยกว่าไม่เจอ)
            width:0 ทำให้ความกว้างขั้นต่ำของกล่องนี้เป็น 0 ไม่ดันพ่อ แล้ว min-w-full ดึงกลับมาเต็มพื้นที่
            ตารางที่ล้นจึงเลื่อนแนวนอนอยู่ในกรอบตัวเอง ไม่ลากทั้งหน้าไปด้วย */}
        <div
          ref={tableRef}
          aria-busy={loading}
          className="border-border/60 relative mt-1 mb-4 w-0 min-w-full scroll-mt-20 overflow-x-auto overflow-y-hidden rounded-lg border"
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
                <TableHead className="text-muted-foreground w-14 pl-6 text-xs font-semibold tracking-wide uppercase">{tcol("no")}</TableHead>
                <TableHead className="text-muted-foreground w-40 text-xs font-semibold tracking-wide uppercase">{tcol("so_code")}</TableHead>
                <TableHead className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{tcol("name")}</TableHead>
                <TableHead className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{tcol("product_name")}</TableHead>
                <TableHead className="text-muted-foreground w-32 text-xs font-semibold tracking-wide uppercase">{tcol("channel")}</TableHead>
                {/* ตัวเลขชิดขวา หัวคอลัมน์ชิดตาม */}
                <TableHead className="text-muted-foreground w-16 text-right text-xs font-semibold tracking-wide uppercase">{tcol("qty")}</TableHead>
                <TableHead className="text-muted-foreground w-28 text-right text-xs font-semibold tracking-wide uppercase">{tcol("amount")}</TableHead>
                <TableHead className="text-muted-foreground w-32 text-xs font-semibold tracking-wide uppercase">{tcol("status")}</TableHead>
                <TableHead className="text-muted-foreground w-32 text-xs font-semibold tracking-wide uppercase">{tcol("is_payment")}</TableHead>
                <TableHead className="w-16 pr-6 text-right"> <span className="sr-only">{t("edit")}</span> </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((row, index) => {
                const statusStyle = row.status ? STATUS_STYLE[row.status] : undefined
                const StatusIcon = statusStyle?.icon
                return (
                <TableRow
                  key={row.id}
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
                  {/* เลขที่ใบ + วันที่สร้าง — เรียงตามวันที่สร้าง วันที่จึงอยู่คู่กับเลขที่ใบ */}
                  <TableCell className="pt-1 pb-1">
                    <span className="bg-primary/10 text-primary rounded-md px-2 py-0.5 font-mono text-xs font-semibold">
                      {row.so_code}
                    </span>
                    <div className="text-muted-foreground mt-0.5 font-mono text-xs">
                      {formatDateTime(row.create_date)}
                    </div>
                  </TableCell>
                  {/* ชื่อผู้สั่ง + เบอร์โทรตัวจางบรรทัดล่าง */}
                  <TableCell className="pt-1 pb-1 max-w-[170px]">
                    <div className="truncate font-medium" title={row.name ?? undefined}>{row.name}</div>
                    <div className="text-muted-foreground truncate font-mono text-xs">{row.tel}</div>
                  </TableCell>
                  {/* ชื่อสินค้า + รหัสสินค้าตัวจางบรรทัดล่าง
                      max-w คุมความกว้างของทั้งคอลัมน์ (คอลัมน์ตารางไม่มี w ก็จะกินตามข้อความ)
                      ชื่อสินค้ายาวที่สุดในตาราง จึงเป็นคอลัมน์ที่ปรับเวลาต้องแบ่งที่ให้คอลัมน์อื่น
                      (ได้คืน 32px ตอนปิดปุ่มลบ — ช่องปุ่มเหลือปุ่มเดียวจึงแคบลงเป็น w-16) */}
                  <TableCell className="pt-1 pb-1 max-w-[182px]">
                    <div className="truncate" title={row.product_name ?? undefined}>{row.product_name}</div>
                    <div className="text-muted-foreground truncate font-mono text-xs">{row.item_code}</div>
                  </TableCell>
                  {/* โลโก้จากทะเบียนช่องทางออกอากาศ + ชื่อที่เก็บในแถว
                      ชื่อที่ไม่มีโลโก้ (หรือไฟล์เปิดไม่ขึ้น) BroadcastLogo คืน null ชื่อจึงเลื่อนมาชิดซ้ายเอง */}
                  <TableCell className="pt-1 pb-1 max-w-[116px]">
                    <div className="flex items-center gap-1.5">
                      <BroadcastLogo
                        src={row.channel ? channelLogos.get(row.channel) : null}
                        alt={row.channel ?? ""}
                        className="size-6"
                      />
                      <span className="text-muted-foreground truncate" title={row.channel ?? undefined}>
                        {row.channel}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="pt-1 pb-1 text-right tabular-nums">
                    {formatNumber(row.qty, 0)}
                  </TableCell>
                  <TableCell className="pt-1 pb-1 text-right font-medium tabular-nums">
                    {formatNumber(row.amount, 2)}
                  </TableCell>
                  {/* ป้ายสถานะตัดข้อความเมื่อยาวเกินคอลัมน์ ("ลูกค้าได้รับสินค้าแล้ว" กว้างกว่าหัวคอลัมน์
                      ~50px) ไม่ตัดแล้วตารางจะกว้างขึ้นทั้งตาราง แล้วปุ่มลบหลุดออกนอกกรอบที่เลื่อนได้
                      ข้อความเต็มอยู่ใน title · span ที่ truncate หดได้เองเพราะ overflow-hidden */}
                  <TableCell className="pt-1 pb-1 max-w-[112px]">
                    {row.status ? (
                      <Badge
                        variant="secondary"
                        title={row.status}
                        className={cn(
                          "max-w-full gap-1 border-transparent font-medium",
                          statusStyle?.className ?? "bg-muted text-muted-foreground"
                        )}
                      >
                        {StatusIcon ? <StatusIcon className="size-3 shrink-0" /> : null}
                        <span className="truncate">{row.status}</span>
                      </Badge>
                    ) : null}
                  </TableCell>
                  {/* สถานะชำระเงิน + วิธีชำระตัวจางบรรทัดล่าง */}
                  <TableCell className="pt-1 pb-1">
                    {row.is_payment ? (
                      <Badge
                        variant="secondary"
                        title={row.is_payment}
                        className={cn(
                          "max-w-full border-transparent font-medium",
                          PAYMENT_STYLE[row.is_payment] ?? "bg-muted text-muted-foreground"
                        )}
                      >
                        <span className="truncate">{row.is_payment}</span>
                      </Badge>
                    ) : null}
                    <div className="text-muted-foreground mt-0.5 text-xs">{row.pay_by}</div>
                  </TableCell>
                  <TableCell className="pt-1 pb-1 pr-6 text-right">
                    <div className="flex justify-end gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={t("edit")}
                        onClick={() => setForm({ mode: "edit", so: row })}
                        className="bg-warning/18 text-warning-ink hover:bg-orange-50 hover:text-orange-300"
                      >
                        <Pencil />
                      </Button>
                      {/* ปิดปุ่มลบไว้ก่อน — เปิดกลับให้เอา Trash2 ใน import ออกจาก comment ด้วย
                          (DeleteModal ด้านล่างยังอยู่ แค่ไม่มีปุ่มเปิด) */}
                      {/* <Button
                        variant="ghost"
                        size="icon"
                        aria-label={tall("delete")}
                        onClick={() => setRemoving(row)}
                        className="bg-danger/12 text-danger-ink hover:bg-red-50 hover:text-red-300"
                      >
                        <Trash2 />
                      </Button> */}
                    </div>
                  </TableCell>
                </TableRow>
                )
              })}

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
        so={form?.so}
        // บันทึกเสร็จแล้วดึงข้อมูลหน้าปัจจุบันใหม่ ด้วยเงื่อนไขค้นหาเดิม
        onSaved={() => load(filters)}
      />

      {/* ถามยืนยันก่อนลบ — โหลดตารางใหม่เฉพาะตอนลบสำเร็จเท่านั้น */}
      <DeleteModal
        open={removing !== null}
        onOpenChange={(next) => {
          if (!next) setRemoving(null)
        }}
        so={removing ?? undefined}
        onDeleted={() => load(filters)}
      />
    </Card>
    </>
  )
}
