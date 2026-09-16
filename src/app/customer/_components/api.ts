import {
  API_NETWORK_ERROR,
  ApiError,
  type ApiEnvelope,
} from "@/app/login/components/api"
import type {
  Customer,
  CustomerDeleted,
  CustomerFormMode,
  CustomerFormValues,
  CustomerList,
} from "@/app/customer/_components/model"

/**
 * api.ts — เส้น API ของหน้าจัดการลูกค้า (ตาราง customer)
 *
 * ฝั่ง browser ยิง "/api/web" แล้วให้ rewrite ใน next.config.ts ส่งต่อไป Flask (เลี่ยง CORS)
 * ฝั่ง server ไม่มี origin ให้อ้าง path สัมพัทธ์จึงใช้ไม่ได้ ต้องใช้ URL เต็มจาก API_BASE_URL
 *
 * ไม่มี customer-get-option — ฝั่ง API ตั้งใจไม่ทำ (ตารางราว 99,000 แถว ใหญ่เกินกว่าจะเป็น dropdown)
 */
const API_BASE_URL =
  typeof window === "undefined"
    ? (process.env.API_BASE_URL ?? "http://localhost:8081/api/web")
    : (process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api/web")

/** ขอทีเดียวได้มากสุดเท่าที่ API ยอม (_PER_PAGE_MAX ฝั่ง Flask) */
export const CUSTOMER_PER_PAGE_MAX = 100

/** จำนวนแถวต่อหน้าที่หน้านี้ใช้ตอนเปิดครั้งแรก */
export const CUSTOMER_PAGE_SIZE = 30

/** ยิง POST พร้อม body แล้วแกะ envelope มาตรฐานของ /api/web ให้ — ผิดพลาดจะโยน ApiError */
async function post<T>(path: string, body: unknown): Promise<T | undefined> {
  const url = `${API_BASE_URL}/${path}`
  let res: Response

  try {
    res = await fetch(url, {
      method: "POST",
      // หน้าจัดการต้องเห็นของที่เพิ่งแก้เสมอ ห้ามให้ Next cache ไว้
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  } catch (cause) {
    throw new ApiError(
      API_NETWORK_ERROR,
      `เรียก API ไม่สำเร็จ: ${url} (${String(cause)})`
    )
  }

  // API ควรตอบ JSON เสมอ แต่ถ้าเจอหน้า HTML ของ proxy/error page ก็ต้องไม่ระเบิดตรง .json()
  const envelope = (await res.json().catch(() => null)) as ApiEnvelope<T> | null
  if (!envelope) {
    throw new ApiError(res.status, res.statusText || "Invalid response")
  }
  if (!envelope.status) {
    throw new ApiError(envelope.resultcode ?? res.status, envelope.message)
  }
  return envelope.result
}

export type CustomerQuery = {
  /** ค้นจาก customer.name ฝั่งเซิร์ฟเวอร์ (ilike "มีคำนี้อยู่") — ไม่ส่ง = ไม่กรอง */
  name?: string
  /** ค้นจาก customer.tel (ilike) */
  tel?: string
  /** ค้นจาก customer.province (ilike) */
  province?: string
  page?: number
  perPage?: number
}

/**
 * POST /api/web/customer-get-list — ลูกค้าทั้งหมด เรียง updated_at ล่าสุดก่อน
 *
 * ค้นหา/แบ่งหน้า ทำที่ฝั่งเซิร์ฟเวอร์ทั้งหมด ตารางแค่ส่งเงื่อนไขไปแล้วแสดงผลที่ได้
 * ไม่เจอเลย API ตอบ 200 พร้อม customers = [] — ไม่ใช่ error
 */
export async function getCustomers(
  query: CustomerQuery = {}
): Promise<CustomerList> {
  const result = await post<CustomerList>("customer-get-list", {
    name: query.name ?? "",
    tel: query.tel ?? "",
    province: query.province ?? "",
    page: query.page ?? 1,
    per_page: query.perPage ?? CUSTOMER_PAGE_SIZE,
  })
  return {
    customers: result?.customers ?? [],
    total: result?.total ?? 0,
    page: result?.page ?? 1,
    per_page: result?.per_page ?? 0,
    total_pages: result?.total_pages ?? 1,
  }
}

/**
 * POST /api/web/customer-action — เพิ่ม/แก้ไข เส้นเดียวจบ แยกด้วย action ใน body
 *
 * "add" ส่ง id เป็น 0 (ฐานข้อมูลออกเลขให้จาก sequence) · "edit" ต้องส่ง id ของแถวที่แก้
 * ทั้งสองแบบส่งไปทุกฟิลด์ ไม่ใช่เฉพาะที่แก้ และคืนแถวหลังบันทึกกลับมา (รวมยอดสรุปคำสั่งซื้อ)
 * tel ซ้ำกับแถวอื่น API ตอบ 400 "tel already exists" · gender นอกเหนือ ชาย/หญิง ตอบ 400
 * ข้อความจาก API ถูกโชว์ในฟอร์มตรง ๆ ไม่ได้แปลใหม่
 */
export async function saveCustomer(
  action: CustomerFormMode,
  values: CustomerFormValues,
  customerId?: number
): Promise<Customer> {
  return (await post<Customer>("customer-action", {
    action,
    id: customerId ?? 0,
    ...values,
  })) as Customer
}

/**
 * POST /api/web/customer-delete — ลบลูกค้าตาม id (ส่งไปแค่ id เท่านั้น)
 *
 * ลบออกจากตารางจริง กู้คืนไม่ได้ · ลูกค้าที่มี SO อ้างถึงอยู่ API ตอบ 400 ไม่ลบให้
 */
export async function deleteCustomer(
  id: number
): Promise<CustomerDeleted> {
  return (await post<CustomerDeleted>("customer-delete", {
    id,
  })) as CustomerDeleted
}
