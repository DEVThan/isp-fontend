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
  /** จำนวนใบ (so_code ไม่ซ้ำ) ที่ po_date อยู่ในเดือนนี้ — รวมใบยกเลิก */
  so_count: number
  /** ใบที่สถานะยกเลิก (นับรวมอยู่ใน so_count แล้ว) */
  cancelled: number
  /** จำนวนบรรทัดสินค้า (แถว so) ของเดือนนี้ */
  lines: number
  prev_month: string
  /** ช่วงเทียบของเดือนก่อน = วันที่ 1 ถึงวันนี้ (YYYY-MM-DD) */
  prev_until: string
  /** จำนวนใบของเดือนก่อน ช่วงวันเดียวกัน */
  prev_same_period: number
  /** จำนวนใบของเดือนก่อนทั้งเดือน */
  prev_month_total: number
}

/** ผลของ POST /api/web/dashboard-revenue-month — ผลรวม so.pay_amount ตาม po_date ไม่นับใบยกเลิก */
export type RevenueMonthStats = {
  month: string
  today: string
  /** รายได้เดือนนี้ (บาท) */
  revenue: number
  /** จำนวนใบที่นับรายได้ (ไม่รวมยกเลิก) */
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
  /** จำนวนใบที่ยกเลิกเดือนนี้ */
  cancelled: number
  /** ผลรวม pay_amount ของบรรทัดที่ยกเลิก (บาท) */
  amount: number
  prev_month: string
  prev_until: string
  /** จำนวนใบยกเลิกของเดือนก่อน ช่วงวันเดียวกัน */
  prev_same_period: number
  /** จำนวนใบยกเลิกของเดือนก่อนทั้งเดือน */
  prev_month_total: number
  /** ผลรวม pay_amount ที่ยกเลิกของเดือนก่อนทั้งเดือน */
  prev_month_amount: number
}

/** ผลของ POST /api/web/dashboard-completed-month — ใบสั่งขายสำเร็จ (ลูกค้าได้รับสินค้าแล้ว) ตาม po_date */
export type CompletedMonthStats = Omit<CancelledMonthStats, "cancelled"> & {
  /** จำนวนใบที่สำเร็จเดือนนี้ */
  completed: number
}

/** ยิงเส้นสรุปของ dashboard (ไม่มี body) แล้วแกะ envelope — ผิดพลาดโยน ApiError */
async function fetchStats<T>(path: string): Promise<T> {
  const url = `${API_BASE_URL}/${path}`
  let res: Response
  try {
    res = await fetch(url, {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: "{}",
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
