"use client"

import * as React from "react"
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  // Eye, Pencil, Trash2 — ช่องปุ่มในแถวซ่อนไว้ (16/10/2026) ดูข้อมูลกดที่เลขที่ใบแทน
  LoaderCircle,
  // Plus, — ปุ่มเพิ่มปิดไว้ (แถวมาจากงาน sync เหมือนหน้า /sale/so)
  Search,
  SearchX,
  Truck,
  TriangleAlert,
} from "lucide-react"
import { useTranslations } from "next-intl"

import {
  getSoList,
  getSoOptions,
  SO_PAGE_SIZE,
  type SoSort,
} from "@/app/so_tracking/_components/api"
import { DateRangeFilter } from "@/app/so_tracking/_components/daterange"
import { DeleteModal } from "@/app/so_tracking/_components/delete_modal"
import { FormModal } from "@/app/so_tracking/_components/form_modal"
// ใช้กับโลโก้ในตัวกรองขนส่ง (และคอลัมน์ช่องทางที่ซ่อนอยู่)
import { BroadcastLogo } from "@/app/so_tracking/_components/logo"
import {
  NO_SO_OPTIONS,
  type So,
  type SoFormMode,
  type SoList,
} from "@/app/so_tracking/_components/model"
import { TablePagination } from "@/app/so_tracking/_components/pagination"
import {
  NEUTRAL_STYLE,
  PAY_BY_FALLBACK_ICON,
  PAY_BY_ICON,
  PAYMENT_ICON,
  PAYMENT_TEXT_STYLE,
  STATUS_STYLE,
} from "@/app/so_tracking/_components/status_style"
import { TrackingModal } from "@/app/so_tracking/_components/tracking_modal"
import { ViewModal } from "@/app/so_tracking/_components/view_modal"
import {
  SelectOption,
  type SelectOptionItem,
} from "@/app/so_tracking/_components/selectoption"
import { Badge } from "@/components/ui/badge"
// ปุ่มในแถว (ดู / แก้ไข / ลบ) — ปุ่มเพิ่มยังปิดอยู่
// import { Button } from "@/components/ui/button" — ใช้แค่ในช่องปุ่มที่ซ่อนอยู่
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

/** คอลัมน์ข้อมูล 15 (14 เดิม + เลขพัสดุ) · ช่องปุ่ม (ดู / แก้ไข / ลบ) ซ่อนอยู่ — ใช้กับ colSpan ตอนไม่มีแถวให้แสดง
 *  (เปิด/ปิดคอลัมน์ไหนต้องแก้เลขนี้ตาม ไม่งั้นแถว "ไม่พบข้อมูล" จะกินความกว้างไม่ครบ) */
const COLUMN_COUNT = 15

/**
 * ขนส่งที่ดูสถานะพัสดุได้ — ตอนนี้มีแค่ KERRY (/tracking-kex) ขนส่งอื่นยังไม่มี API (16/10/2026)
 * so.shipping_by เก็บเป็นชื่อ ("KERRY") เทียบแบบไม่สนตัวพิมพ์ เผื่อเขียนเป็น Kerry Express / KEX
 */
const isKerry = (shippingBy: string | null) => /^(kerry|kex)\b/i.test((shippingBy ?? "").trim())

/**
 * คอลัมน์ยอดเงินของแถว so (numeric ทั้งหมด) เรียงตามที่ผู้ใช้สั่ง (05/10/2026)
 * หัวคอลัมน์เป็นภาษาอังกฤษทุกภาษาตามที่ผู้ใช้ขอ — จึงไม่ผ่าน tcol (คำแปลใน so.columns ยังใช้ในฟอร์ม/หน้าดู)
 */
const MONEY_COLUMNS = [
  { key: "price_per_unit", label: "Price/Unit" },
  { key: "amount", label: "Amount" },
  { key: "pay_amount", label: "Pay Amount" },
  { key: "shipping", label: "Shipping" },
  { key: "discount", label: "Discount" },
] as const

/** หน่วงก่อนยิง API ตอนพิมพ์ค้นหา — พิมพ์รัว ๆ จะได้ไม่ยิงทุกตัวอักษร */
const SEARCH_DELAY_MS = 350

// สีป้ายสถานะ (STATUS_STYLE / PAYMENT_STYLE) ย้ายไป status_style.ts — กล่องดูข้อมูลใช้ร่วมกัน

/** เงื่อนไขทั้งหมดที่ส่งไปให้ API ตัดหน้ามาให้ — ชื่อตรงกับพารามิเตอร์ของ so_tracking_get_list */
type Filters = {
  soCode: string
  name: string
  tel: string
  /** หมายเลขพัสดุ (so.shipping_code) */
  shippingCode: string
  productName: string
  /** null = ไม่กรองสถานะ (ทั้งหมด) */
  status: string | null
  channel: string | null
  /** null = ไม่กรองผู้ขาย · ค่าคือชื่อผู้ขาย (so เก็บแค่ vendor_name) */
  vendor: string | null
  /** null = ไม่กรองประเภทการจัดส่ง · ค่าคือชื่อ (so.shipment_type) */
  shipmentType: string | null
  /** null = ไม่กรองขนส่ง · ค่าคือชื่อบริษัทขนส่ง (so.shipping_by) */
  shippingBy: string | null
  /** YYYY-MM-DD จากช่อง type="date" — ว่าง = ไม่กรอง */
  dateFrom: string
  dateTo: string
  page: number
  pageSize: number
  /** เรียงตามเลขที่ใบสั่งขาย — ว่าง = ลำดับเดิมของ API */
  sort: SoSort
  /** true = เฉพาะ SO ที่ซ้ำกัน (so_code มีหลายแถว) */
  duplicate: boolean
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
  const tr = useTranslations("so_tracking")
  const tcol = useTranslations("so_tracking.columns")
  // คำอธิบายปุ่มเรียงใช้ชุดเดียวกับหน้า so (so.sort.*) ไม่ทำซ้ำใน so_tracking
  const tso = useTranslations("so")

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
  /** แถวที่กำลังดูข้อมูล (กล่องอ่านอย่างเดียว ปุ่มรูปตา) — null คือปิดกล่อง */
  const [viewing, setViewing] = React.useState<So | null>(null)
  /** แถวที่กำลังดูสถานะพัสดุ (กดป้ายเลขพัสดุ เฉพาะ KERRY) — null คือปิดกล่อง */
  const [tracking, setTracking] = React.useState<So | null>(null)
  /** แถวที่กำลังถามยืนยันจะลบ — null คือปิดกล่อง */
  const [removing, setRemoving] = React.useState<So | null>(null)

  const [soCode, setSoCode] = React.useState("")
  const [name, setName] = React.useState("")
  // setTel ปิดไว้คู่กับช่องค้นหาเบอร์โทรที่ซ่อนอยู่ — tel คงเป็นค่าว่างตลอด (ไม่กรอง)
  const [tel /* , setTel */] = React.useState("")
  const [shippingCode, setShippingCode] = React.useState("")
  const [productName, setProductName] = React.useState("")
  // หน้านี้เปิดมาเป็น "ทั้งหมด" (16/10/2026 ผู้ใช้ขอ — ต่างจากหน้า so ที่กรองออเดอร์ใหม่ไว้ก่อน
  // แถวที่มีเลขพัสดุแล้วแทบไม่มีออเดอร์ใหม่ กรองไว้จะเห็นแค่ไม่กี่แถว)
  const [status, setStatus] = React.useState<string | null>(null)
  // setChannel ปิดไว้คู่กับตัวกรองช่องทางที่ซ่อนอยู่ — channel คงเป็น null (ไม่กรอง)
  const [channel /* , setChannel */] = React.useState<string | null>(null)
  const [vendor, setVendor] = React.useState<string | null>(null)
  const [shipmentType, setShipmentType] = React.useState<string | null>(null)
  const [shippingBy, setShippingBy] = React.useState<string | null>(null)
  const [dateFrom, setDateFrom] = React.useState("")
  const [dateTo, setDateTo] = React.useState("")
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(SO_PAGE_SIZE)
  const [sort, setSort] = React.useState<SoSort>("")
  const [duplicate, setDuplicate] = React.useState(false)

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
    shippingCode,
    productName,
    status,
    channel,
    vendor,
    shipmentType,
    shippingBy,
    dateFrom,
    dateTo,
    page,
    pageSize,
    sort,
    duplicate,
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
          shippingCode: next.shippingCode.trim(),
          productName: next.productName.trim(),
          status: next.status ?? "",
          channel: next.channel ?? "",
          vendorName: next.vendor ?? "",
          shipmentType: next.shipmentType ?? "",
          shippingBy: next.shippingBy ?? "",
          dateFrom: next.dateFrom,
          dateTo: next.dateTo,
          page: next.page,
          perPage: next.pageSize,
          sort: next.sort,
          duplicate: next.duplicate,
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

  // ใช้แค่ในตัวกรองช่องทางที่ซ่อนอยู่ — เปิดตัวกรองกลับให้เอา comment ตรงนี้ + setChannel ออกด้วย
  // /** ช่องทางออกอากาศ — ทะเบียน broadcast (ชื่อตรงกับที่เก็บใน so.channel) */
  // const channelOptions: SelectOptionItem[] = options.broadcasts.map((option) => ({
  //   value: option.name,
  //   label: option.name,
  // }))

  /** ผู้ขาย — ทะเบียน vendor · ค่าคือชื่อ (ตรงกับ so.vendor_name) ป้ายมีรหัสนำหน้า ค้นด้วยรหัสก็ได้ (ชุดเดียวกับฟอร์ม) */
  const vendorOptions: SelectOptionItem[] = options.vendors.map((option) => ({
    value: option.name,
    label: `${option.code} — ${option.name}`,
  }))


  /** ประเภทการจัดส่ง — ทะเบียน shiptment_type · ค่าคือชื่อ (ตรงกับ so.shipment_type) */
  const shipmentTypeOptions: SelectOptionItem[] = options.shipmentTypes.map((option) => ({
    value: option.name,
    label: option.name,
  }))

  /** ขนส่ง — ทะเบียนบริษัทขนส่ง (/shipping-get-option) · ค่าคือชื่อ (ตรงกับ so.shipping_by) · โลโก้หน้าชื่อ
   *  (เหมือนหน้า so 30/09/2026) BroadcastLogo ไม่มีรูป/เปิดไม่ขึ้นก็ซ่อนตัวเอง */
  const shippingOptions: SelectOptionItem[] = options.shippings.map((option) => ({
    value: option.name,
    label: option.name,
    icon: <BroadcastLogo src={option.logo} alt={option.name} className="size-5" />,
  }))

  /**
   * ชื่อช่องทาง -> path โลโก้ · so.channel เก็บเป็นชื่อ ไม่ได้ผูก id กับตาราง broadcast
   * จึงจับคู่ด้วยชื่อตรง ๆ · ชื่อที่ไม่มีในทะเบียน (outbound call, Retail, Line OA, …) ไม่มีโลโก้
   * ตัวเลือกถูกดึงหลังรายการโหลดเสร็จ (ดู effect ของ options) โลโก้จึงขึ้นช้ากว่าแถวเล็กน้อย
   */
  // ใช้แค่ในคอลัมน์ช่องทางที่ซ่อนอยู่ — เปิดคอลัมน์กลับให้เอา comment ตรงนี้ + import BroadcastLogo ออกด้วย
  // const channelLogos = new Map(
  //   options.broadcasts.map((option) => [option.name, option.logo])
  // )

  /**
   * ชื่อผู้ขาย -> รหัส · so เก็บแค่ vendor_name จึงจับคู่กับทะเบียน vendor ด้วยชื่อ
   * ชื่อที่ซ้ำกันในทะเบียนไม่ใส่รหัส (เดาไม่ได้ว่าคนไหน) · ชื่อที่ไม่มีในทะเบียนก็ไม่มีรหัส
   * ตัวเลือกถูกดึงหลังรายการโหลดเสร็จ รหัสจึงขึ้นช้ากว่าแถวเล็กน้อย
   */
  const vendorCodes = new Map<string, string>()
  const duplicateVendors = new Set<string>()
  for (const vendor of options.vendors) {
    if (vendorCodes.has(vendor.name)) duplicateVendors.add(vendor.name)
    vendorCodes.set(vendor.name, vendor.code)
  }
  for (const name of duplicateVendors) vendorCodes.delete(name)

  /**
   * ชื่อบริษัทขนส่ง -> path โลโก้ สำหรับคอลัมน์ "ขนส่งโดย" (12/10/2026) — so.shipping_by เก็บเป็นชื่อ ไม่ได้ผูก id กับทะเบียน shipping
   * จับคู่ด้วยชื่อ (ตัดช่องว่าง ไม่สนตัวพิมพ์) และรหัสของทะเบียนเผื่อแถวที่เก็บรหัสไว้ · ไม่เจอ/ไม่มีรูป = โชว์แค่ชื่อ
   */
  const shippingLogos = new Map<string, string>()
  for (const shipping of options.shippings) {
    if (!shipping.logo) continue
    shippingLogos.set(shipping.name.trim().toLowerCase(), shipping.logo)
    if (shipping.code) shippingLogos.set(shipping.code.trim().toLowerCase(), shipping.logo)
  }

  // ตารางไม่กรองเองแล้ว แถวที่ได้มาคือหน้าที่ API ตัดมาให้ตรงเงื่อนไขอยู่แล้ว
  const visible = list.so

  /** ลำดับที่โชว์แทนรหัส — นับต่อจากหน้าก่อนหน้า (หน้า 2 แถวแรกได้ 31 เมื่อหน้าละ 30)
   *  ใช้ page/per_page ที่ API ตอบกลับมา ไม่ใช่ state ของตัวกรอง เลขจึงตรงกับแถวที่เห็นจริง */
  const rowNumber = (index: number) =>
    ((list.page || 1) - 1) * (list.per_page || pageSize) + index + 1

  /** ช่องพิมพ์ค้นหาหนึ่งช่อง — ทุกช่องกลับไปหน้า 1 แล้วค่อยยิงหลังหยุดพิมพ์ */
  const searchFilter = (
    key: "soCode" | "name" | "tel" | "shippingCode" | "productName",
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

  // ตัวกรองวันที่แบบสองช่องเดิม — แทนด้วย DateRangeFilter แล้ว เก็บไว้เผื่อกลับไปใช้
  // /** ช่วงวันที่ — เทียบกับ create_date ฝั่ง API (10 ตัวแรกของข้อความ) ไม่มีหน่วง ยิงทันทีที่เลือก */
  // const dateFilter = (
  //   key: "dateFrom" | "dateTo",
  //   label: string,
  //   value: string,
  //   setValue: (next: string) => void
  // ) => (
  //   <div className="space-y-2">
  //     <Label htmlFor={`filter-${key}`} className="text-muted-foreground w-fit text-xs">
  //       {label}
  //     </Label>
  //     <Input
  //       id={`filter-${key}`}
  //       type="date"
  //       value={value}
  //       onChange={(event) => {
  //         const next = event.target.value
  //         setValue(next)
  //         setPage(1)
  //         load({ ...filters, [key]: next, page: 1 })
  //       }}
  //       className="bg-card/80 focus-visible:border-primary/50"
  //     />
  //   </div>
  // )

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
      {/* ที่ xl ตาราง 4 ช่อง: เลขที่ SO / ชื่อผู้สั่ง / ชื่อสินค้า / สถานะ · ผู้ขาย / ประเภทการจัดส่ง / ขนส่ง / ช่วงวันที่สั่งซื้อ · SO ที่ซ้ำกัน / เลขพัสดุ */}
      <CardContent className="from-primary/12 border-border/60 grid grid-cols-1 gap-4 border-b bg-gradient-to-r via-transparent to-transparent py-4 md:grid-cols-2 xl:grid-cols-4">
        {searchFilter("soCode", tcol("so_code"), soCode, setSoCode)}
        {searchFilter("name", tcol("name"), name, setName)}
        {/* เบอร์โทร — ซ่อนไว้ (เปิดกลับ: เอา comment ออก · state/ตัวกรอง tel ยังอยู่ครบ ส่งค่าว่างไป API) */}
        {/* {searchFilter("tel", tcol("tel"), tel, setTel)} */}
        {searchFilter("productName", tcol("product_name"), productName, setProductName)}
        {selectFilter("filter-status", tcol("status"), statusOptions, status, (next) => {
          setStatus(next)
          return { ...filters, status: next, page: 1 }
        })}
        {/* ช่องทางออกอากาศ — ซ่อนไว้ก่อน (เปิดกลับ: เอา comment ออก + channelOptions / setChannel ด้านบน) */}
        {/* {selectFilter("filter-channel", tcol("channel"), channelOptions, channel, (next) => {
          setChannel(next)
          return { ...filters, channel: next, page: 1 }
        })} */}
        {selectFilter("filter-vendor", tcol("vendor_name"), vendorOptions, vendor, (next) => {
          setVendor(next)
          return { ...filters, vendor: next, page: 1 }
        })}
        {selectFilter("filter-shipmentType", tcol("shipment_type"), shipmentTypeOptions, shipmentType, (next) => {
          setShipmentType(next)
          return { ...filters, shipmentType: next, page: 1 }
        })}
        {/* ขนส่ง (so.shipping_by) — ตัวเลือกจากทะเบียนบริษัทขนส่ง พร้อมโลโก้ (เหมือนหน้า so) */}
        {selectFilter("filter-shippingBy", tcol("shipping_by"), shippingOptions, shippingBy, (next) => {
          setShippingBy(next)
          return { ...filters, shippingBy: next, page: 1 }
        })}
        {/* วันที่สั่งซื้อ (po_date) — เดิมกรองวันที่สร้าง · ช่วงวันที่ช่องเดียว (ปฏิทินในป๊อปอัป) แทนสองช่อง ตั้งแต่/ถึง แบบเดิม
            ค่าที่ส่ง API ยังเป็น date_from / date_to (YYYY-MM-DD) — ฝั่ง API เทียบกับ po_date แล้ว (so.py) · กว้างคอลัมน์เดียวเท่าช่องอื่น (ข้อความช่วงวันที่ยังพอดี) */}
        <div className="space-y-2">
          {/* ป้ายไม่ผูก htmlFor — ตัวช่องเป็นปุ่มเปิดปฏิทิน (แบบเดียวกับตัวกรอง dropdown) */}
          <Label className="text-muted-foreground w-fit text-xs">{tr("dateRange.label")}</Label>
          <DateRangeFilter
            id="filter-dateRange"
            from={dateFrom}
            to={dateTo}
            placeholder={tr("dateRange.placeholder")}
            onChange={(nextFrom, nextTo) => {
              setDateFrom(nextFrom)
              setDateTo(nextTo)
              setPage(1)
              load({ ...filters, dateFrom: nextFrom, dateTo: nextTo, page: 1 })
            }}
          />
        </div>
        {/* SO ที่ซ้ำกัน (14/10/2026 ผู้ใช้ขอ · ช่องสุดท้ายต่อจากวันที่สั่งซื้อ) — ทั้งหมด / เฉพาะ so_code ที่มีหลายแถว · ล้างช่อง = ทั้งหมด */}
        {selectFilter(
          "filter-duplicate",
          tso("duplicate.label"),
          [
            { value: "all", label: tall("all") },
            { value: "duplicate", label: tso("duplicate.only") },
          ],
          duplicate ? "duplicate" : "all",
          (next) => {
            const on = next === "duplicate"
            setDuplicate(on)
            return { ...filters, duplicate: on, page: 1 }
          }
        )}
        {/* หมายเลขพัสดุ (so.shipping_code) — 16/10/2026 ผู้ใช้ขอ · มีเฉพาะหน้านี้ · ช่องสุดท้าย */}
        {searchFilter("shippingCode", tcol("shipping_code"), shippingCode, setShippingCode)}
      </CardContent>

      <CardContent className="px-4 py-0">
        <div className="flex flex-wrap items-center justify-end gap-2 p-0 pt-3 md:p-0 md:pt-3">
          {/* ปิดปุ่มเพิ่มไว้ก่อน — เปิดกลับให้เอา Plus ใน import ออกจาก comment ด้วย
              (FormModal ด้านล่างยังอยู่ ตอนนี้เปิดได้แต่โหมดแก้ไขจากปุ่มดินสอในแถว — ทุกแถวมาจากงาน sync รายวันอยู่แล้ว)
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

            w-0 min-w-full + overflow-x-auto: ตารางนี้มี 14 คอลัมน์ ความกว้างขั้นต่ำของมัน (~1,174px)
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
                {/* ช่อง checkbox เลือกแถว — เอาออกแล้ว (30/09/2026) ลำดับกลับมาเป็นคอลัมน์แรก */}
                {/* ลำดับเป็นเลขสั้น ๆ ตรึงความกว้างไว้ ไม่งั้นตารางเฉลี่ยความกว้างให้เท่าคอลัมน์ข้อความ */}
                <TableHead className="text-muted-foreground w-16 pl-6 text-right text-xs font-semibold tracking-wide uppercase">{tcol("no")}</TableHead>
                {/* ปุ่มเรียงตามเลขที่ใบสั่งขาย (14/10/2026 แบบเดียวกับหน้า so) — กดวน: ลำดับเดิม → น้อยไปมาก → มากไปน้อย → ลำดับเดิม
                    เรียงที่ API (ทั้งชุด) แล้วกลับไปหน้า 1 */}
                <TableHead
                  className="text-muted-foreground w-40 text-xs font-semibold tracking-wide uppercase"
                  aria-sort={sort === "so_code_asc" ? "ascending" : sort === "so_code_desc" ? "descending" : "none"}
                >
                  <button
                    type="button"
                    onClick={() => {
                      const next: SoSort = sort === "" ? "so_code_asc" : sort === "so_code_asc" ? "so_code_desc" : ""
                      setSort(next)
                      setPage(1)
                      load({ ...filters, sort: next, page: 1 })
                    }}
                    title={tso(`sort.${sort || "none"}`)}
                    className={cn(
                      "hover:text-foreground -ml-1.5 inline-flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-1 uppercase transition-colors",
                      sort && "text-primary"
                    )}
                  >
                    {tcol("so_code")}
                    {sort === "so_code_asc" ? (
                      <ArrowUp className="size-3.5" />
                    ) : sort === "so_code_desc" ? (
                      <ArrowDown className="size-3.5" />
                    ) : (
                      <ArrowUpDown className="size-3.5 opacity-50" />
                    )}
                  </button>
                </TableHead>
                {/* สถานะทั้งสองย้ายมาต่อจากเลขที่ใบ (12/10/2026 เหมือนหน้า so) — เห็นได้โดยไม่ต้องเลื่อนแนวนอน */}
                {/* สถานะออเดอร์ (บน) + สถานะการชำระเงิน (ล่าง) รวมเป็นคอลัมน์เดียว (12/10/2026 ผู้ใช้ขอ) — หัวคอลัมน์สองบรรทัดเรียงตามเซลล์ */}
                <TableHead className="text-muted-foreground w-44 py-1.5 text-xs leading-tight font-semibold tracking-wide uppercase">
                  <div>{tcol("status")}</div>
                  <div>{tcol("is_payment")}</div>
                </TableHead>
                {/* เลขพัสดุ (so.shipping_code) ก่อนชื่อผู้สั่ง — 16/10/2026 ผู้ใช้ขอ */}
                <TableHead className="text-muted-foreground w-40 text-xs font-semibold tracking-wide uppercase">{tcol("shipping_code")}</TableHead>
                <TableHead className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{tcol("name")}</TableHead>
                <TableHead className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{tcol("product_name")}</TableHead>
                {/* ช่องทางออกอากาศ — ซ่อนไว้ แสดงผู้ขายแทน (เปิดกลับ: เอา comment ออก ทั้งหัวคอลัมน์และเซลล์) */}
                {/* <TableHead className="text-muted-foreground w-32 text-xs font-semibold tracking-wide uppercase">{tcol("channel")}</TableHead> */}
                <TableHead className="text-muted-foreground w-32 text-xs font-semibold tracking-wide uppercase">{tcol("vendor_name")}</TableHead>
                {/* หัวคอลัมน์ยาวกว่าค่าข้างใน ("Pick Up", "Dropship") — ให้ขึ้นบรรทัดใหม่ได้ ไม่งั้นหัวดันคอลัมน์กว้างเกิน */}
                <TableHead className="text-muted-foreground w-20 text-xs leading-tight font-semibold tracking-wide whitespace-normal uppercase">{tcol("shipment_type")}</TableHead>
                {/* ขนส่งโดย (so.shipping_by) + โลโก้จากทะเบียนบริษัทขนส่ง — ต่อจากประเภทการจัดส่ง (12/10/2026) */}
                <TableHead className="text-muted-foreground w-32 text-xs font-semibold tracking-wide uppercase">{tcol("shipping_by")}</TableHead>
                {/* ตัวเลขชิดขวา หัวคอลัมน์ชิดตาม */}
                <TableHead className="text-muted-foreground w-16 text-right text-xs font-semibold tracking-wide uppercase">{tcol("qty")}</TableHead>
                {/* ยอดเงิน 5 คอลัมน์แบบเดียวกับหน้า so (12/10/2026) — เดิมหน้านี้โชว์แค่ยอดรวม (amount) */}
                {MONEY_COLUMNS.map((column) => (
                  <TableHead key={column.key} className="text-muted-foreground w-24 text-right text-xs font-semibold tracking-wide whitespace-nowrap uppercase">{column.label}</TableHead>
                ))}
                {/* ช่องปุ่ม (ดู / แก้ไข / ลบ) ท้ายตาราง — ซ่อนไว้ 16/10/2026 ผู้ใช้ขอ (ดูข้อมูลกดที่เลขที่ใบแทน)
                    เปิดกลับ: เอา comment ออกทั้งหัวและเซลล์ + import Eye/Pencil/Trash2/Button + COLUMN_COUNT */}
                {/* <TableHead className="w-32 pr-6 text-right">
                  <span className="sr-only">{t("edit")}</span>
                </TableHead> */}
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((row, index) => {
                const statusStyle = row.status ? STATUS_STYLE[row.status] : undefined
                const StatusIcon = statusStyle?.icon
                const PaymentIcon = row.is_payment ? PAYMENT_ICON[row.is_payment] : undefined
                const PayByIcon = (row.pay_by && PAY_BY_ICON[row.pay_by]) || PAY_BY_FALLBACK_ICON
                return (
                <TableRow
                  key={row.id}
                  className="group/row border-border/50 hover:bg-accent/40 transition-colors"
                >
                  <TableCell className="pt-1 pb-1 relative pl-6 text-right tabular-nums">
                    {/* เส้นบอกแถวที่ชี้อยู่ ภาษาเดียวกับเมนูข้างที่เลือกอยู่ */}
                    <span
                      aria-hidden
                      className="bg-primary absolute inset-y-1 left-0 w-[3px] rounded-r-full opacity-0 transition-opacity group-hover/row:opacity-100"
                    />
                    <span className="text-muted-foreground font-mono text-xs">{rowNumber(index)}</span>
                  </TableCell>
                  {/* เลขที่ใบ + วันที่สั่งซื้อ (po_date) — API เรียงตาม po_date วันที่จึงอยู่คู่กับเลขที่ใบ (เดิมโชว์ create_date) */}
                  <TableCell className="pt-1 pb-1">
                    {/* กดเลขที่ใบ = เปิดกล่องดูข้อมูล (16/10/2026 ผู้ใช้ขอ — แทนปุ่มรูปตาที่ซ่อนไปพร้อมช่องปุ่ม) */}
                    <button
                      type="button"
                      onClick={() => setViewing(row)}
                      title={t("view")}
                      className="bg-primary/10 text-primary hover:bg-primary/20 focus-visible:ring-ring/50 cursor-pointer rounded-md px-2 py-0.5 font-mono text-xs font-semibold transition-colors outline-none focus-visible:ring-2"
                    >
                      {row.so_code}
                    </button>
                    <div className="text-muted-foreground mt-0.5 font-mono text-xs">
                      {formatDateTime(row.po_date)}
                    </div>
                  </TableCell>
                  {/* คอลัมน์สถานะรวม: ป้ายสถานะออเดอร์อยู่บน ป้ายการชำระเงินอยู่ล่าง ชิดซ้ายทั้งคู่
                      คอลัมน์กว้างตามป้ายชำระเงิน (~150px) ป้ายสถานะออเดอร์จึงไม่ต้องตัดข้อความแล้ว (title ยังอยู่) */}
                  <TableCell className="pt-1 pb-1">
                    <div className="flex flex-col items-start gap-1">
                    {row.status ? (
                      <Badge
                        variant="secondary"
                        title={row.status}
                        className={cn(
                          "max-w-full gap-1 border-transparent font-medium",
                          statusStyle?.className ?? NEUTRAL_STYLE
                        )}
                      >
                        {StatusIcon ? <StatusIcon className="size-3 shrink-0" /> : null}
                        <span className="truncate">{row.status}</span>
                      </Badge>
                    ) : null}
                    {/* สถานะการชำระเงิน — ข้อความ + ไอคอน ไม่มีพื้นป้าย (12/10/2026 ผู้ใช้ขอ · ป้ายเหลือแค่สถานะออเดอร์ข้างบน)
                        สถานะมีสีตามความหมาย (รอ = เหลืองอำพัน · ชำระแล้ว = เขียว) ตามด้วยวิธีชำระตัวจาง คั่นด้วยจุด
                        ไอคอน: รอ = นาฬิกาทราย · ชำระแล้ว = ติ๊กถูก · COD ธนบัตร · โอนเงิน ธนาคาร · บัตรเครดิต บัตร */}
                    {row.is_payment || row.pay_by ? (
                      <div className="flex items-center gap-1.5 pl-0.5 text-xs whitespace-nowrap">
                        {row.is_payment ? (
                          <span
                            className={cn(
                              "flex items-center gap-1 font-medium",
                              PAYMENT_TEXT_STYLE[row.is_payment] ?? "text-muted-foreground"
                            )}
                          >
                            {PaymentIcon ? <PaymentIcon className="size-3 shrink-0" /> : null}
                            {row.is_payment}
                          </span>
                        ) : null}
                        {row.is_payment && row.pay_by ? (
                          <span aria-hidden className="text-muted-foreground/60">·</span>
                        ) : null}
                        {row.pay_by ? (
                          <span className="text-muted-foreground flex items-center gap-1">
                            <PayByIcon className="size-3.5 shrink-0" />
                            {row.pay_by}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                    </div>
                  </TableCell>
                  {/* เลขพัสดุเป็นป้าย (16/10/2026) — KERRY กดได้ เปิดกล่องสถานะพัสดุ (/tracking-kex)
                      ขนส่งอื่นยังไม่มี API: ป้ายสีจาง กดไม่ได้ บอกเหตุผลใน title */}
                  <TableCell className="pt-1 pb-1">
                    {row.shipping_code ? (
                      isKerry(row.shipping_by) ? (
                        <button
                          type="button"
                          onClick={() => setTracking(row)}
                          title={tr("tracking.open")}
                          className="bg-info/12 text-info-ink hover:bg-info/22 ring-info/25 focus-visible:ring-ring/50 inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-0.5 font-mono text-xs font-semibold whitespace-nowrap ring-1 ring-inset transition-colors outline-none focus-visible:ring-2"
                        >
                          <Truck className="size-3.5 shrink-0" />
                          {row.shipping_code}
                        </button>
                      ) : (
                        <span
                          title={tr("tracking.unsupported", { carrier: row.shipping_by || "-" })}
                          className="bg-muted text-muted-foreground inline-flex rounded-md px-2 py-0.5 font-mono text-xs font-medium whitespace-nowrap"
                        >
                          {row.shipping_code}
                        </span>
                      )
                    ) : null}
                  </TableCell>
                  {/* ชื่อผู้สั่ง + เบอร์โทรตัวจางบรรทัดล่าง (170 -> 150 ตอนเพิ่มคอลัมน์ประเภทการจัดส่ง) */}
                  <TableCell className="pt-1 pb-1 max-w-[150px]">
                    <div className="truncate font-medium" title={row.name ?? undefined}>{row.name}</div>
                    <div className="text-muted-foreground truncate font-mono text-xs">{row.tel}</div>
                  </TableCell>
                  {/* ชื่อสินค้า + รหัสสินค้าตัวจางบรรทัดล่าง
                      max-w คุมความกว้างของทั้งคอลัมน์ (คอลัมน์ตารางไม่มี w ก็จะกินตามข้อความ)
                      ชื่อสินค้ายาวที่สุดในตาราง จึงเป็นคอลัมน์ที่ปรับเวลาต้องแบ่งที่ให้คอลัมน์อื่น
                      (ได้คืน 32px ตอนปิดปุ่มลบ แล้วคืนให้ปุ่มดูข้อมูลไป — ช่องปุ่มเป็น w-24 สองปุ่ม
                       แล้ว 150 -> 130 แบ่งให้คอลัมน์ประเภทการจัดส่ง) */}
                  <TableCell className="pt-1 pb-1 max-w-[130px]">
                    <div className="truncate" title={row.product_name ?? undefined}>{row.product_name}</div>
                    <div className="text-muted-foreground truncate font-mono text-xs">{row.item_code}</div>
                  </TableCell>
                  {/* โลโก้จากทะเบียนช่องทางออกอากาศ + ชื่อที่เก็บในแถว — ซ่อนไว้ แสดงผู้ขายแทน
                      ชื่อที่ไม่มีโลโก้ (หรือไฟล์เปิดไม่ขึ้น) BroadcastLogo คืน null ชื่อจึงเลื่อนมาชิดซ้ายเอง */}
                  {/* <TableCell className="pt-1 pb-1 max-w-[116px]">
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
                  </TableCell> */}
                  {/* ผู้ขาย — ชื่อ + รหัสตัวจางบรรทัดล่าง (รหัสหาจากทะเบียนด้วยชื่อ ดู vendorCodes)
                      ชื่อบริษัทยาว ตัดด้วย truncate ข้อความเต็มอยู่ใน title · 116 -> 106 แบ่งให้คอลัมน์ประเภทการจัดส่ง */}
                  <TableCell className="pt-1 pb-1 max-w-[106px]">
                    <div className="truncate" title={row.vendor_name ?? undefined}>{row.vendor_name}</div>
                    <div className="text-muted-foreground truncate font-mono text-xs">
                      {row.vendor_name ? vendorCodes.get(row.vendor_name) : null}
                    </div>
                  </TableCell>
                  {/* ประเภทการจัดส่ง — ชื่อที่เก็บในแถว (ไม่เทียบทะเบียน ชื่อที่ปิดใช้ไปแล้วก็ยังโชว์)
                      ขึ้นบรรทัดใหม่แทน truncate — ตัดแล้ว "Own Fleet W" / "Own Fleet C" เหลือ "Own Fl…" เหมือนกันทั้งคู่ */}
                  <TableCell className="pt-1 pb-1 max-w-[80px]">
                    {/* ประเภทการจัดส่ง — ของสินค้า (product_shipment_type ที่ API join มา: so.item_code -> products · ย้ายจาก vendor 01/10/2026)
                        ไม่มีใช้ so.shipment_type ของแถว หรือว่าง (เหมือนหน้า so 29/09/2026) · ตัวกรองยังกรอง so.shipment_type */}
                    <div className="text-muted-foreground leading-tight whitespace-normal">
                      {row.product_shipment_type || row.shipment_type || ""}
                    </div>
                  </TableCell>
                  {/* ขนส่งโดย — โลโก้ (ถ้าทะเบียนมีรูป) + ชื่อที่เก็บในแถว · ชื่อยาวตัดด้วย truncate ข้อความเต็มอยู่ใน title
                      BroadcastLogo คืน null เมื่อไม่มีรูป/เปิดไม่ขึ้น ชื่อจึงเลื่อนมาชิดซ้ายเอง */}
                  <TableCell className="pt-1 pb-1 max-w-[128px]">
                    {row.shipping_by ? (
                      <div className="flex items-center gap-1.5">
                        <BroadcastLogo
                          src={shippingLogos.get(row.shipping_by.trim().toLowerCase())}
                          alt={row.shipping_by}
                          className="size-6"
                        />
                        <span className="truncate" title={row.shipping_by}>{row.shipping_by}</span>
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell className="pt-1 pb-1 text-right tabular-nums">
                    {formatNumber(row.qty, 0)}
                  </TableCell>
                  {/* Amount ตัวหนา — เป็นยอดหลักของแถว ที่เหลือน้ำหนักปกติ */}
                  {MONEY_COLUMNS.map((column) => (
                    <TableCell
                      key={column.key}
                      className={cn(
                        "pt-1 pb-1 text-right tabular-nums last:pr-6",
                        column.key === "amount" && "font-medium"
                      )}
                    >
                      {/* Pay Amount ใส่ป้ายสีทอง (12/10/2026) — โทนเดียวกับการ์ด "สำเร็จ" บนแดชบอร์ด (warning tokens)
                          ค่าว่างไม่มีป้าย · ป้ายอยู่ในความกว้างคอลัมน์เดิม ตารางไม่กว้างขึ้น */}
                      {column.key === "pay_amount" ? (
                        formatNumber(row.pay_amount, 2) !== null ? (
                          <span className="bg-warning/18 text-warning-ink inline-block rounded-md px-2 py-0.5 font-semibold">
                            {formatNumber(row.pay_amount, 2)}
                          </span>
                        ) : null
                      ) : (
                        formatNumber(row[column.key], 2)
                      )}
                    </TableCell>
                  ))}
                  {/* ช่องปุ่ม ดู / แก้ไข (/so-action) / ลบ (/so-delete) — ซ่อนไว้ 16/10/2026 (ดูหัวคอลัมน์)
                  <TableCell className="pt-1 pb-1 pr-6 text-right">
                    <div className="flex justify-end gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={t("view")}
                        onClick={() => setViewing(row)}
                        className="bg-info/12 text-info-ink hover:bg-info/20"
                      >
                        <Eye />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={t("edit")}
                        onClick={() => setForm({ mode: "edit", so: row })}
                        className="bg-warning/18 text-warning-ink hover:bg-orange-50 hover:text-orange-300"
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={tall("delete")}
                        onClick={() => setRemoving(row)}
                        className="bg-danger/12 text-danger-ink hover:bg-red-50 hover:text-red-300"
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </TableCell>
                  */}
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

      {/* ดูข้อมูลอย่างเดียว — ใช้ตัวเลือกที่ตารางดึงไว้แล้ว (รหัสผู้ขาย โลโก้ช่องทาง) ไม่ยิง API เพิ่ม */}
      <ViewModal
        open={viewing !== null}
        onOpenChange={(next) => {
          if (!next) setViewing(null)
        }}
        so={viewing ?? undefined}
        options={options}
      />

      {/* สถานะพัสดุ KERRY — key = เลขพัสดุ เปิดเลขใหม่ได้ state ใหม่ (กำลังโหลด) ไม่ต้องล้างใน effect */}
      {tracking?.shipping_code ? (
        <TrackingModal
          key={tracking.shipping_code}
          open
          onOpenChange={(next) => {
            if (!next) setTracking(null)
          }}
          trackingNo={tracking.shipping_code}
          soCode={tracking.so_code}
          carrier={tracking.shipping_by}
          carrierLogo={tracking.shipping_by ? shippingLogos.get(tracking.shipping_by.trim().toLowerCase()) : undefined}
        />
      ) : null}

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
