import {
  API_NETWORK_ERROR,
  ApiError,
  type ApiEnvelope,
} from "@/app/login/components/api"
import type {
  Shipping,
  ShippingDeleted,
  ShippingFormMode,
  ShippingFormValues,
  ShippingList,
  ShippingOption,
} from "@/app/shipping/_components/model"

/**
 * api.ts — เส้น API ของหน้าบริษัทขนส่ง (ตาราง shipping)
 *
 * ฝั่ง browser ยิง "/api/web" แล้วให้ rewrite ใน next.config.ts ส่งต่อไป Flask (เลี่ยง CORS)
 * ฝั่ง server ไม่มี origin ให้อ้าง path สัมพัทธ์จึงใช้ไม่ได้ ต้องใช้ URL เต็มจาก API_BASE_URL
 */
const API_BASE_URL =
  typeof window === "undefined"
    ? (process.env.API_BASE_URL ?? "http://localhost:8081/api/web")
    : (process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api/web")

/** ขอทีเดียวได้มากสุดเท่าที่ API ยอม (_PER_PAGE_MAX ฝั่ง Flask) */
export const SHIPPING_PER_PAGE_MAX = 100

/** จำนวนแถวต่อหน้าที่หน้านี้ใช้ตอนเปิดครั้งแรก */
export const SHIPPING_PAGE_SIZE = 30

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

export type ShippingQuery = {
  /** ค้นจาก shipping.code ฝั่งเซิร์ฟเวอร์ (ilike "มีคำนี้อยู่") — ไม่ส่ง = ไม่กรอง */
  code?: string
  /** ค้นจาก shipping.name ฝั่งเซิร์ฟเวอร์ (ilike "มีคำนี้อยู่") — ไม่ส่ง = ไม่กรอง */
  name?: string
  /** "active" / "inactive" — null หรือไม่ส่ง = ไม่กรองสถานะ */
  status?: string | null
  page?: number
  perPage?: number
}

/**
 * POST /api/web/shipping-get-list — บริษัทขนส่งทั้งหมด (รวมที่ปิดอยู่) เรียง updated_at ล่าสุดก่อน
 *
 * ค้นหา/กรองสถานะ/แบ่งหน้า ทำที่ฝั่งเซิร์ฟเวอร์ทั้งหมด ตารางแค่ส่งเงื่อนไขไปแล้วแสดงผลที่ได้
 * ไม่เจอเลย API ตอบ 200 พร้อม shippings = [] — ไม่ใช่ error
 */
export async function getShippings(
  query: ShippingQuery = {}
): Promise<ShippingList> {
  const result = await post<ShippingList>("shipping-get-list", {
    code: query.code ?? "",
    name: query.name ?? "",
    // ไม่ส่ง active_status เลยเมื่อไม่ได้กรอง — ส่งสตริงว่างไปก็ได้ แต่ไม่ส่งอ่านง่ายกว่าตอน debug
    ...(query.status ? { active_status: query.status } : {}),
    page: query.page ?? 1,
    per_page: query.perPage ?? SHIPPING_PAGE_SIZE,
  })
  return {
    shippings: result?.shippings ?? [],
    total: result?.total ?? 0,
    page: result?.page ?? 1,
    per_page: result?.per_page ?? 0,
    total_pages: result?.total_pages ?? 1,
  }
}

/**
 * POST /api/web/shipping-get-option — ตัวเลือกขนส่งที่ active (id + code + name + prefix)
 * ไม่รับพารามิเตอร์ ไม่แบ่งหน้า · หน้านี้เองไม่ได้ใช้ — ไว้ให้หน้าอื่นทำ dropdown ขนส่ง
 */
export async function getShippingOptions(): Promise<ShippingOption[]> {
  return (await post<ShippingOption[]>("shipping-get-option", {})) ?? []
}

/**
 * POST /api/web/shipping-action — เพิ่ม/แก้ไข เส้นเดียวจบ แยกด้วย action ใน body
 *
 * "add" ส่ง id เป็น 0 · "edit" ต้องส่ง id ของแถวที่แก้ · ทั้งสองแบบส่งไปทุกฟิลด์ และคืนแถวหลังบันทึกกลับมา
 * รหัสซ้ำ API ตอบ 400 "code already exists" · ช่องบังคับว่าง/ยาวเกินตอบ 400
 * ข้อความจาก API ถูกโชว์ในฟอร์มตรง ๆ ไม่ได้แปลใหม่
 */
export async function saveShipping(
  action: ShippingFormMode,
  values: ShippingFormValues,
  shippingId?: number
): Promise<Shipping> {
  return (await post<Shipping>("shipping-action", {
    action,
    id: shippingId ?? 0,
    ...values,
  })) as Shipping
}

/**
 * POST /api/web/shipping-upload-logo — อัปโหลดโลโก้ (multipart: id + file) คืน path ที่เก็บในคอลัมน์ logo
 *
 * เก็บที่ /uploads/shipping/{id}/logo/{ชื่อไฟล์} — API ลบโลโก้เดิมทิ้งและเขียน path ลง shipping.logo ให้เลย
 * ต้องมีแถวอยู่แล้ว (มี id) ฟอร์มเพิ่มจึงอัปโหลดหลังบันทึกแถวเสร็จ
 * ไม่ใช้ post() ข้างบน เพราะ body เป็น FormData ไม่ใช่ JSON (ห้ามตั้ง Content-Type เอง ให้ browser ใส่ boundary)
 */
export async function uploadShippingLogo(
  file: File,
  shippingId: number
): Promise<string> {
  const url = `${API_BASE_URL}/shipping-upload-logo`
  const form = new FormData()
  form.append("id", String(shippingId))
  form.append("file", file)
  let res: Response

  try {
    res = await fetch(url, { method: "POST", cache: "no-store", body: form })
  } catch (cause) {
    throw new ApiError(
      API_NETWORK_ERROR,
      `เรียก API ไม่สำเร็จ: ${url} (${String(cause)})`
    )
  }

  const envelope = (await res.json().catch(() => null)) as ApiEnvelope<{
    logo: string
  }> | null
  if (!envelope) {
    throw new ApiError(res.status, res.statusText || "Invalid response")
  }
  if (!envelope.status || !envelope.result?.logo) {
    throw new ApiError(envelope.resultcode ?? res.status, envelope.message)
  }
  return envelope.result.logo
}

/**
 * POST /api/web/shipping-delete — ลบขนส่งตาม id (ส่งไปแค่ id เท่านั้น)
 *
 * ลบออกจากตารางจริง กู้คืนไม่ได้ · ผลลัพธ์คือแถวที่หายไป (ไม่มีตารางไหนอ้างแถวจากที่นี่)
 */
export async function deleteShipping(id: number): Promise<ShippingDeleted> {
  return (await post<ShippingDeleted>("shipping-delete", { id })) as ShippingDeleted
}
