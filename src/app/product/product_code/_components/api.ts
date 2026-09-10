import {
  API_NETWORK_ERROR,
  ApiError,
  type ApiEnvelope,
} from "@/app/login/components/api"
import type {
  ProductCode,
  ProductCodeDeleted,
  ProductCodeFormMode,
  ProductCodeFormValues,
  ProductCodeList,
  ProductCodeOption,
} from "@/app/product/product_code/_components/model"

/**
 * api.ts — เส้น API ของหน้าจัดการรหัสสินค้า (ตาราง product_code)
 *
 * ฝั่ง browser ยิง "/api/web" แล้วให้ rewrite ใน next.config.ts ส่งต่อไป Flask (เลี่ยง CORS)
 * ฝั่ง server ไม่มี origin ให้อ้าง path สัมพัทธ์จึงใช้ไม่ได้ ต้องใช้ URL เต็มจาก API_BASE_URL
 */
const API_BASE_URL =
  typeof window === "undefined"
    ? (process.env.API_BASE_URL ?? "http://localhost:8081/api/web")
    : (process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api/web")

/** ขอทีเดียวได้มากสุดเท่าที่ API ยอม (_PER_PAGE_MAX ฝั่ง Flask) */
export const CODE_PER_PAGE_MAX = 100

/** จำนวนแถวต่อหน้าที่หน้านี้ใช้ตอนเปิดครั้งแรก */
export const CODE_PAGE_SIZE = 30

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

export type ProductCodeQuery = {
  /** ค้นจาก product_code.prefix ฝั่งเซิร์ฟเวอร์ (ilike ไม่สนตัวพิมพ์เล็ก/ใหญ่) — ไม่ส่ง = ไม่กรอง */
  prefix?: string
  /** ค้นจาก product_code.name ฝั่งเซิร์ฟเวอร์ (ilike) — ไม่ส่ง = ไม่กรอง */
  name?: string
  /** "active" / "inactive" — null หรือไม่ส่ง = ไม่กรองสถานะ */
  status?: string | null
  page?: number
  perPage?: number
}

/**
 * POST /api/web/product-code-get-list — รหัสสินค้าทั้งหมด (รวมที่ปิดอยู่)
 *
 * ค้นหา/กรองสถานะ/แบ่งหน้า ทำที่ฝั่งเซิร์ฟเวอร์ทั้งหมด ตารางแค่ส่งเงื่อนไขไปแล้วแสดงผลที่ได้
 * ตารางว่าง API ตอบ 200 พร้อม productcodes = [] — ไม่ใช่ error
 */
export async function getProductCodes(
  query: ProductCodeQuery = {}
): Promise<ProductCodeList> {
  const result = await post<ProductCodeList>("product-code-get-list", {
    prefix: query.prefix ?? "",
    name: query.name ?? "",
    // ไม่ส่ง active_status เลยเมื่อไม่ได้กรอง — ส่งสตริงว่างไปก็ได้ แต่ไม่ส่งอ่านง่ายกว่าตอน debug
    ...(query.status ? { active_status: query.status } : {}),
    page: query.page ?? 1,
    per_page: query.perPage ?? CODE_PAGE_SIZE,
  })
  return {
    productcodes: result?.productcodes ?? [],
    total: result?.total ?? 0,
    page: result?.page ?? 1,
    per_page: result?.per_page ?? 0,
    total_pages: result?.total_pages ?? 1,
  }
}

/**
 * POST /api/web/product-code-get-option — ตัวเลือกรหัสสินค้าที่ active (id + prefix + name)
 * ไม่รับพารามิเตอร์ ไม่แบ่งหน้า
 */
export async function getProductCodeOptions(): Promise<ProductCodeOption[]> {
  return (
    (await post<ProductCodeOption[]>("product-code-get-option", {})) ??
    []
  )
}

/**
 * POST /api/web/product-code-action — เพิ่ม/แก้ไข เส้นเดียวจบ แยกด้วย action ใน body
 *
 * "add" ส่ง id เป็น 0 (คอลัมน์ id เป็น identity ฐานข้อมูลออกเลขให้เอง) · "edit" ต้องส่ง id ของแถวที่แก้
 * ทั้งสองแบบส่งไปทุกฟิลด์ ไม่ใช่เฉพาะที่แก้ และคืนแถวหลังบันทึกกลับมา
 * prefix/name ซ้ำกับแถวอื่น API ตอบ 400 "prefix already exists" — ข้อความนั้นถูกโชว์ในฟอร์มตรง ๆ
 */
export async function saveProductCode(
  action: ProductCodeFormMode,
  values: ProductCodeFormValues,
  codeId?: number
): Promise<ProductCode> {
  return (await post<ProductCode>("product-code-action", {
    action,
    id: codeId ?? 0,
    ...values,
  })) as ProductCode
}

/**
 * POST /api/web/product-code-delete — ลบรหัสสินค้าตาม id (ส่งไปแค่ id เท่านั้น)
 *
 * ลบออกจากตารางจริง กู้คืนไม่ได้ · ผลลัพธ์คือแถวที่หายไป (ตารางนี้ไม่มีใครอ้างแถวจากมัน)
 */
export async function deleteProductCode(
  id: number
): Promise<ProductCodeDeleted> {
  return (await post<ProductCodeDeleted>("product-code-delete", {
    id,
  })) as ProductCodeDeleted
}
