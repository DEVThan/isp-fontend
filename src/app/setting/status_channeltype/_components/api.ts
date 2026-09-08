import {
  API_NETWORK_ERROR,
  ApiError,
  type ApiEnvelope,
} from "@/app/login/components/api"
import type {
  ChannelType,
  ChannelTypeDeleted,
  ChannelTypeFormMode,
  ChannelTypeFormValues,
  ChannelTypeList,
  ChannelTypeOption,
} from "@/app/setting/status_channeltype/_components/model"

/**
 * api.ts — เส้น API ของหน้าจัดการช่องทางการขาย (ตาราง channel_type)
 *
 * ฝั่ง browser ยิง "/api/web" แล้วให้ rewrite ใน next.config.ts ส่งต่อไป Flask (เลี่ยง CORS)
 * ฝั่ง server ไม่มี origin ให้อ้าง path สัมพัทธ์จึงใช้ไม่ได้ ต้องใช้ URL เต็มจาก API_BASE_URL
 */
const API_BASE_URL =
  typeof window === "undefined"
    ? (process.env.API_BASE_URL ?? "http://localhost:8081/api/web")
    : (process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api/web")

/** ขอทีเดียวได้มากสุดเท่าที่ API ยอม (_PER_PAGE_MAX ฝั่ง Flask) */
export const CHANNEL_PER_PAGE_MAX = 100

/** จำนวนแถวต่อหน้าที่หน้านี้ใช้ตอนเปิดครั้งแรก */
export const CHANNEL_PAGE_SIZE = 30

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

export type ChannelTypeQuery = {
  /** ค้นจาก channel_type.name ฝั่งเซิร์ฟเวอร์ (ilike) — ไม่ส่ง = ไม่กรอง */
  name?: string
  /** "active" / "inactive" — null หรือไม่ส่ง = ไม่กรองสถานะ */
  status?: string | null
  page?: number
  perPage?: number
}

/**
 * POST /api/web/status-channeltype-get-list — ช่องทางการขายทั้งหมด (รวมที่ปิดอยู่)
 *
 * ค้นหา/กรองสถานะ/แบ่งหน้า ทำที่ฝั่งเซิร์ฟเวอร์ทั้งหมด ตารางแค่ส่งเงื่อนไขไปแล้วแสดงผลที่ได้
 * ตารางว่าง API ตอบ 200 พร้อม channeltypes = [] — ไม่ใช่ error
 */
export async function getChannelTypes(
  query: ChannelTypeQuery = {}
): Promise<ChannelTypeList> {
  const result = await post<ChannelTypeList>("status-channeltype-get-list", {
    name: query.name ?? "",
    // ไม่ส่ง active_status เลยเมื่อไม่ได้กรอง — ส่งสตริงว่างไปก็ได้ แต่ไม่ส่งอ่านง่ายกว่าตอน debug
    ...(query.status ? { active_status: query.status } : {}),
    page: query.page ?? 1,
    per_page: query.perPage ?? CHANNEL_PAGE_SIZE,
  })
  return {
    channeltypes: result?.channeltypes ?? [],
    total: result?.total ?? 0,
    page: result?.page ?? 1,
    per_page: result?.per_page ?? 0,
    total_pages: result?.total_pages ?? 1,
  }
}

/**
 * POST /api/web/status-channeltype-get-option — ตัวเลือกช่องทางการขายที่ active (id + name + logo)
 * ไม่รับพารามิเตอร์ ไม่แบ่งหน้า
 */
export async function getChannelTypeOptions(): Promise<ChannelTypeOption[]> {
  return (
    (await post<ChannelTypeOption[]>("status-channeltype-get-option", {})) ?? []
  )
}

/**
 * POST /api/web/status-channeltype-action — เพิ่ม/แก้ไข เส้นเดียวจบ แยกด้วย action ใน body
 *
 * "add" ส่ง id เป็น 0 (คอลัมน์ id เป็น identity ฐานข้อมูลออกเลขให้เอง) · "edit" ต้องส่ง id ของแถวที่แก้
 * ทั้งสองแบบส่งไปทุกฟิลด์ ไม่ใช่เฉพาะที่แก้ และคืนแถวหลังบันทึกกลับมา
 */
export async function saveChannelType(
  action: ChannelTypeFormMode,
  values: ChannelTypeFormValues,
  channelId?: number
): Promise<ChannelType> {
  return (await post<ChannelType>("status-channeltype-action", {
    action,
    id: channelId ?? 0,
    ...values,
  })) as ChannelType
}

/**
 * POST /api/web/status-channeltype-delete — ลบช่องทางการขายตาม id (ส่งไปแค่ id เท่านั้น)
 *
 * ลบออกจากตารางจริง กู้คืนไม่ได้ · ผลลัพธ์บอกจำนวน SO ที่ยังใช้ชื่อนี้อยู่มาด้วย
 */
export async function deleteChannelType(
  id: number
): Promise<ChannelTypeDeleted> {
  return (await post<ChannelTypeDeleted>("status-channeltype-delete", {
    id,
  })) as ChannelTypeDeleted
}
