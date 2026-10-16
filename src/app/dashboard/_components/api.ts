import {
  API_NETWORK_ERROR,
  ApiError,
  type ApiEnvelope,
} from "@/app/login/components/api"

/**
 * api.ts — เส้น API ของหน้า /dashboard (controller/web/dashboard.py)
 *
 * ฝั่ง browser ยิง "/api/web" แล้วให้ rewrite ใน next.config.ts ส่งต่อไป Flask (เลี่ยง CORS)
 */
const API_BASE_URL =
  typeof window === "undefined"
    ? (process.env.API_BASE_URL ?? "http://localhost:8081/api/web")
    : (process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api/web")

/** ผลของ POST /api/web/dashboard-so-month — นับจาก so.po_date ตามเวลาไทย */
export type SoMonthStats = {
  /** เดือนปัจจุบัน "YYYY-MM" */
  month: string
  /** วันนี้ "YYYY-MM-DD" (เวลาไทย) */
  today: string
  /** จำนวนบรรทัด (so_code ซ้ำก็นับรวม — 13/10/2026) ที่ po_date อยู่ในเดือนนี้ — รวมยกเลิก · เท่ากับ lines */
  so_count: number
  /** บรรทัดที่สถานะยกเลิก (นับรวมอยู่ใน so_count แล้ว) */
  cancelled: number
  /** จำนวนบรรทัดสินค้า (แถว so) ของเดือนนี้ */
  lines: number
  prev_month: string
  /** ช่วงเทียบของเดือนก่อน = วันที่ 1 ถึงวันนี้ (YYYY-MM-DD) */
  prev_until: string
  /** จำนวนบรรทัดของเดือนก่อน ช่วงวันเดียวกัน */
  prev_same_period: number
  /** จำนวนบรรทัดของเดือนก่อนทั้งเดือน */
  prev_month_total: number
}

/** ผลของ POST /api/web/dashboard-revenue-month — ผลรวม so.pay_amount ตาม po_date ไม่นับใบยกเลิก */
export type RevenueMonthStats = {
  month: string
  today: string
  /** รายได้เดือนนี้ (บาท) */
  revenue: number
  /** จำนวนบรรทัดที่นับรายได้ (ไม่รวมยกเลิก · so_code ซ้ำก็นับรวม) */
  so_count: number
  prev_month: string
  prev_until: string
  /** รายได้เดือนก่อน ช่วงวันเดียวกัน */
  prev_same_period: number
  /** รายได้เดือนก่อนทั้งเดือน */
  prev_month_total: number
}

/** ผลของ POST /api/web/dashboard-cancelled-month — ใบสั่งขายที่ยกเลิก (ตาม po_date) */
export type CancelledMonthStats = {
  month: string
  today: string
  /** จำนวนบรรทัดที่ยกเลิกเดือนนี้ (so_code ซ้ำก็นับรวม) */
  cancelled: number
  /** ผลรวม pay_amount ของบรรทัดที่ยกเลิก (บาท) */
  amount: number
  prev_month: string
  prev_until: string
  /** จำนวนบรรทัดยกเลิกของเดือนก่อน ช่วงวันเดียวกัน */
  prev_same_period: number
  /** จำนวนบรรทัดยกเลิกของเดือนก่อนทั้งเดือน */
  prev_month_total: number
  /** ผลรวม pay_amount ที่ยกเลิกของเดือนก่อนทั้งเดือน */
  prev_month_amount: number
}

/** ผลของ POST /api/web/dashboard-completed-month — ใบสั่งขายสำเร็จ (ลูกค้าได้รับสินค้าแล้ว) ตาม po_date */
export type CompletedMonthStats = Omit<CancelledMonthStats, "cancelled"> & {
  /** จำนวนบรรทัดที่สำเร็จเดือนนี้ (so_code ซ้ำก็นับรวม) */
  completed: number
}

/** ยิงเส้นสรุปของ dashboard แล้วแกะ envelope — ผิดพลาดโยน ApiError */
async function fetchStats<T>(path: string, payload: object = {}): Promise<T> {
  const url = `${API_BASE_URL}/${path}`
  let res: Response
  try {
    res = await fetch(url, {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
  } catch (cause) {
    throw new ApiError(
      API_NETWORK_ERROR,
      `เรียก API ไม่สำเร็จ: ${url} (${String(cause)})`
    )
  }
  const envelope = (await res.json().catch(() => null)) as ApiEnvelope<T> | null
  if (!envelope) {
    throw new ApiError(res.status, res.statusText || "Invalid response")
  }
  if (!envelope.status || !envelope.result) {
    throw new ApiError(envelope.resultcode ?? res.status, envelope.message)
  }
  return envelope.result
}

/** POST /api/web/dashboard-so-month — จำนวนใบสั่งขายเดือนนี้ */
export const getSoMonthStats = () => fetchStats<SoMonthStats>("dashboard-so-month")

/** POST /api/web/dashboard-revenue-month — รายได้เดือนนี้ */
export const getRevenueMonthStats = () =>
  fetchStats<RevenueMonthStats>("dashboard-revenue-month")

/** POST /api/web/dashboard-cancelled-month — ใบสั่งขายที่ยกเลิกเดือนนี้ */
export const getCancelledMonthStats = () =>
  fetchStats<CancelledMonthStats>("dashboard-cancelled-month")

/** POST /api/web/dashboard-completed-month — ใบสั่งขายที่สำเร็จ (ลูกค้าได้รับสินค้าแล้ว) เดือนนี้ */
export const getCompletedMonthStats = () =>
  fetchStats<CompletedMonthStats>("dashboard-completed-month")

/** ผลของ POST /api/web/dashboard-so-today — ใบสั่งขายวันนี้แยกรายชั่วโมง ตาม so.po_date (เวลาไทย) รวมใบยกเลิก */
export type SoTodayStats = {
  /** วันที่ของข้อมูล "YYYY-MM-DD" — วันนี้ (เวลาไทย) หรือ date ที่ส่งไป */
  today: string
  /** จำนวนแถวทั้งวัน — นับแยกจาก hours (แถวที่ po_date ไม่มีเวลาไม่อยู่ในชั่วโมงไหน) */
  total: number
  /** จำนวนแถว so (so_code ซ้ำก็นับ เหมือน card เดือนนี้ — 14/10/2026) ชั่วโมง 00–23 — 24 ช่องเสมอ */
  hours: number[]
  /** ยอดขาย (บาท) รายชั่วโมง = sum(pay_amount) ไม่นับยกเลิก — 24 ช่อง (เพิ่ม 08/10/2026) */
  amounts: number[]
  /** ยอดขายทั้งวัน (บาท) */
  total_amount: number
}

/** POST /api/web/dashboard-so-today — ใบสั่งขายวันนี้ แยกรายชั่วโมง · date "YYYY-MM-DD" ดูวันอื่นแทน (ไม่ส่ง = วันนี้) */
export const getSoTodayStats = (date?: string) =>
  fetchStats<SoTodayStats>("dashboard-so-today", date ? { date } : {})

/** สินค้าหนึ่งรายการใน /dashboard-top-items (จัดกลุ่มตาม so.item_code) */
export type TopItem = {
  item_code: string
  /** so.product_name ของบรรทัดล่าสุดในกลุ่ม — อาจว่าง */
  product_name: string
  /** จำนวนชิ้น sum(qty) — qty ว่างนับเป็น 1 */
  qty: number
  /** จำนวนใบสั่งขายที่มีสินค้านี้ */
  orders: number
  /** ผลรวม pay_amount (บาท) */
  amount: number
}

/** ผลของ POST /api/web/dashboard-top-items — สินค้าขายดี 5 อันดับของวัน ไม่นับใบยกเลิก */
export type TopItemsStats = {
  /** วันที่ของข้อมูล "YYYY-MM-DD" */
  today: string
  /** จำนวนชิ้นทั้งวัน (ทุกสินค้า) */
  total_qty: number
  /** จำนวนรหัสสินค้าที่ขายได้ทั้งวัน */
  item_count: number
  /** สูงสุด 5 รายการ เรียงจากขายมากไปน้อย */
  items: TopItem[]
}

/** POST /api/web/dashboard-top-items — สินค้าขายดี 5 อันดับ · date "YYYY-MM-DD" (ไม่ส่ง = วันนี้) */
export const getTopItemsStats = (date?: string) =>
  fetchStats<TopItemsStats>("dashboard-top-items", date ? { date } : {})

/** ช่องทางหนึ่งรายการใน /dashboard-top-channels (จัดกลุ่มตาม so.channel) */
export type TopChannel = {
  channel: string
  /** broadcast.logo ของช่องทางชื่อเดียวกัน — ไม่เจอ = "" */
  logo: string
  /** จำนวนใบสั่งขาย (so_code ไม่ซ้ำ) */
  orders: number
  /** จำนวนชิ้น sum(qty) — qty ว่างนับเป็น 1 */
  qty: number
  /** ผลรวม pay_amount (บาท) */
  amount: number
}

/** ผลของ POST /api/web/dashboard-top-channels — ช่องทางขายดี 5 อันดับของวัน ไม่นับใบยกเลิก */
export type TopChannelsStats = {
  /** วันที่ของข้อมูล "YYYY-MM-DD" */
  today: string
  /** จำนวนใบทั้งวัน (ทุกช่องทาง) */
  total_orders: number
  /** จำนวนช่องทางที่ขายได้ทั้งวัน */
  channel_count: number
  /** สูงสุด 5 รายการ เรียงจากจำนวนใบมากไปน้อย */
  channels: TopChannel[]
}

/** POST /api/web/dashboard-top-channels — ช่องทางขายดี 5 อันดับ · date "YYYY-MM-DD" (ไม่ส่ง = วันนี้) */
export const getTopChannelsStats = (date?: string) =>
  fetchStats<TopChannelsStats>("dashboard-top-channels", date ? { date } : {})

/** ประเภทสินค้าหนึ่งรายการใน /dashboard-top-types (จัดกลุ่มตาม so.product_type_name) */
export type TopType = {
  product_type_name: string
  /** จำนวนชิ้น sum(qty) — qty ว่างนับเป็น 1 */
  qty: number
  /** จำนวนใบสั่งขายที่มีสินค้าประเภทนี้ */
  orders: number
  /** จำนวนรหัสสินค้า (item_code) ในประเภทนี้ที่ขายได้ */
  items: number
  /** ผลรวม pay_amount (บาท) */
  amount: number
}

/** ผลของ POST /api/web/dashboard-top-types — ประเภทสินค้าขายดี 5 อันดับของวัน ไม่นับใบยกเลิก */
export type TopTypesStats = {
  /** วันที่ของข้อมูล "YYYY-MM-DD" */
  today: string
  /** จำนวนชิ้นทั้งวัน (ทุกประเภท) */
  total_qty: number
  /** จำนวนประเภทที่ขายได้ทั้งวัน */
  type_count: number
  /** สูงสุด 5 รายการ เรียงจากขายมากไปน้อย */
  types: TopType[]
}

/** POST /api/web/dashboard-top-types — ประเภทสินค้าขายดี 5 อันดับ · date "YYYY-MM-DD" (ไม่ส่ง = วันนี้) */
export const getTopTypesStats = (date?: string) =>
  fetchStats<TopTypesStats>("dashboard-top-types", date ? { date } : {})

/** ผลของ POST /api/web/dashboard-so-daily — ใบสั่งขายของเดือนแยกรายวัน ตาม so.po_date (เวลาไทย) รวมใบยกเลิก */
export type SoDailyStats = {
  /** เดือนของข้อมูล "YYYY-MM" — เดือนนี้ หรือ month ที่ส่งไป */
  month: string
  /** จำนวนแถวทั้งเดือน — นับแยกจาก days (แถวที่วันที่ผิดรูปไม่อยู่ในวันไหน) */
  total: number
  /** จำนวนแถว so (so_code ซ้ำก็นับ — 14/10/2026) ของวันที่ 1… — ยาวเท่าจำนวนวันของเดือน (28–31) */
  days: number[]
  /** ยอดขาย (บาท) รายวัน = sum(pay_amount) ไม่นับยกเลิก — ยาวเท่า days */
  amounts: number[]
  /** ยอดขายทั้งเดือน (บาท) */
  total_amount: number
}

/** POST /api/web/dashboard-so-daily — ใบสั่งขายรายวันของเดือน · month "YYYY-MM" (ไม่ส่ง = เดือนนี้) */
export const getSoDailyStats = (month?: string) =>
  fetchStats<SoDailyStats>("dashboard-so-daily", month ? { month } : {})

/** ผลของ POST /api/web/dashboard-top-types-month — เหมือน /dashboard-top-types แต่ทั้งเดือน (มี month แทน today) */
export type TopTypesMonthStats = Omit<TopTypesStats, "today"> & {
  /** เดือนของข้อมูล "YYYY-MM" */
  month: string
}

/** POST /api/web/dashboard-top-types-month — ประเภทสินค้าขายดี 5 อันดับของเดือน · month "YYYY-MM" (ไม่ส่ง = เดือนนี้) */
export const getTopTypesMonthStats = (month?: string) =>
  fetchStats<TopTypesMonthStats>("dashboard-top-types-month", month ? { month } : {})

/** ผลของ POST /api/web/dashboard-top-items-month — เหมือน /dashboard-top-items แต่ทั้งเดือน (มี month แทน today) */
export type TopItemsMonthStats = Omit<TopItemsStats, "today"> & {
  /** เดือนของข้อมูล "YYYY-MM" */
  month: string
}

/** POST /api/web/dashboard-top-items-month — สินค้าขายดี 5 อันดับของเดือน · month "YYYY-MM" (ไม่ส่ง = เดือนนี้) */
export const getTopItemsMonthStats = (month?: string) =>
  fetchStats<TopItemsMonthStats>("dashboard-top-items-month", month ? { month } : {})

/** เพศของลูกค้า — male/female จาก customer.gender (หรือเดาจากชื่อ ดู gender_est) · unknown = ไม่รู้ */
export type Gender = "male" | "female" | "unknown"

/** ยอดแยกเพศ — ใบเดียวมีเพศเดียว (customer_id เดียว) สามเพศรวมกันจึงเท่ายอดรวม */
export type GenderSplit = Record<Gender, { orders: number; amount: number }>

/** ยอดของจังหวัดเดียวใน /dashboard-province */
export type ProvinceRow = {
  /** id จังหวัด — ตรงกับ properties.id ใน public/geo/thailand-provinces.geojson */
  province_id: number
  province: string
  province_en: string
  /** จำนวนแถว so (so_code ซ้ำก็นับ เหมือน card เดือนนี้) รวมยกเลิก */
  orders: number
  /** ยอดขาย (บาท) / จำนวนชิ้น — ไม่นับยกเลิก */
  amount: number
  qty: number
  /** แยกตาม customer.gender (ส่วนใหญ่ยังว่าง = unknown) */
  gender: GenderSplit
  /** เพศจริงถ้ามี ไม่งั้นประมาณจากชื่อลูกค้า — ค่าประมาณ */
  gender_est: GenderSplit
}

/** ผลของ POST /api/web/dashboard-province — ยอดขายรายจังหวัด (แผนที่) ตาม so.po_date */
export type ProvinceStats = {
  /** ช่วงของข้อมูล — มีอย่างใดอย่างหนึ่งตามที่ส่งไป ("YYYY-MM" / "YYYY-MM-DD") */
  month?: string
  date?: string
  /** true = ทุกวันที่ (ส่ง all ไป) */
  all?: boolean
  total_orders: number
  total_amount: number
  gender: GenderSplit
  gender_est: GenderSplit
  /** ที่มาของ gender_est รายใบ + ความแม่นของตัวเดาชื่อ (controller/web/gender_guess.py) */
  gender_est_meta: {
    source: { actual: number; title: number; name: number; unknown: number }
    model: { accuracy: number | null; coverage: number | null; threshold: number; trained_on: number }
  }
  /** จำนวนจังหวัดที่มียอด (เต็ม 77) */
  province_count: number
  /** จังหวัดที่มียอด เรียงตามจำนวนใบ */
  provinces: ProvinceRow[]
  /** so.province ที่จับคู่จังหวัดไม่ได้ (รวมค่าว่าง) */
  unmatched: { province: string; orders: number; amount: number; qty: number }[]
}

/** POST /api/web/dashboard-province — ยอดขายรายจังหวัด · month "YYYY-MM" หรือ date "YYYY-MM-DD" (ไม่ส่ง = เดือนนี้)
 *  all = true ทุกวันที่ · channel = ชื่อช่องทางการขาย (เทียบ so.channel ไม่สนตัวพิมพ์) ไม่ส่ง = ทุกช่องทาง */
export const getProvinceStats = (period: { month?: string; date?: string; all?: boolean; channel?: string } = {}) =>
  fetchStats<ProvinceStats>("dashboard-province", period)

/** ช่องทางการขายจาก /broadcast-get-option — name ตรงกับ so.channel · logo = path รูป (ว่างได้) */
export type BroadcastOption = { id: number; name: string; logo: string }

/** POST /api/web/broadcast-get-option — ตัวเลือกช่องทางการขายของ card แผนที่ */
export const getBroadcastOptions = () => fetchStats<BroadcastOption[]>("broadcast-get-option")

/** หนึ่งแถวของอันดับพนักงานขาย — จัดกลุ่ม so.sell_by · ตัวเลขทุกช่องไม่นับบรรทัดยกเลิก ยกเว้น cancelled */
export type SalesmanRow = {
  /** null = แถวไม่ระบุพนักงาน หรือพนักงานที่ไม่มีบรรทัดในช่วงนี้ (16/10/2026 API คืนทุกชื่อที่เคยมีใน so) */
  rank: number | null
  /** ชื่อพนักงาน (so.sell_by ข้อความ) — "" = บรรทัดที่ไม่ระบุพนักงาน */
  sell_by: string
  /** จำนวนแถว so (so_code ซ้ำก็นับรวม) */
  orders: number
  /** แถวที่ยกเลิก (ไม่รวมใน orders) */
  cancelled: number
  qty: number
  /** ยอดขาย sum(pay_amount) (บาท) */
  amount: number
  /** ยอดเฉลี่ยต่อแถว */
  avg_amount: number
  /** % ของ total_amount */
  share: number
}

/** ผลของ POST /api/web/dashboard-salesman-daily / -month — ทุกพนักงานในช่วง เรียงยอดขายมากไปน้อย */
export type SalesmanStats = {
  /** พนักงานทุกคนที่เคยมีใน so (ไม่นับแถวไม่ระบุพนักงาน) */
  salesman_count: number
  /** พนักงานที่มีบรรทัดในช่วงนี้ — ไม่มีใน API รุ่นเก่า */
  active_count?: number
  total_orders: number
  total_amount: number
  salesmen: SalesmanRow[]
}

/** POST /api/web/dashboard-salesman-daily — อันดับพนักงานขายของวัน · date "YYYY-MM-DD" (ไม่ส่ง = วันนี้) */
export const getSalesmanDailyStats = (date?: string) =>
  fetchStats<SalesmanStats & { today: string }>("dashboard-salesman-daily", date ? { date } : {})

/** POST /api/web/dashboard-salesman-month — อันดับพนักงานขายของเดือน · month "YYYY-MM" (ไม่ส่ง = เดือนนี้) */
export const getSalesmanMonthStats = (month?: string) =>
  fetchStats<SalesmanStats & { month: string }>("dashboard-salesman-month", month ? { month } : {})
