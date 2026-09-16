import {
  API_NETWORK_ERROR,
  ApiError,
  type ApiEnvelope,
} from "@/app/login/components/api"
import type {
  Broadcast,
  BroadcastDeleted,
  BroadcastFormMode,
  BroadcastFormValues,
  BroadcastList,
  BroadcastOption,
} from "@/app/broadcast/_components/model"

/**
 * api.ts — เส้น API ของหน้าจัดการช่องทาง Broadcast (ตาราง broadcast — เดิมชื่อ chanels เส้น /chanels-*)
 *
 * ฝั่ง browser ยิง "/api/web" แล้วให้ rewrite ใน next.config.ts ส่งต่อไป Flask (เลี่ยง CORS)
 * ฝั่ง server ไม่มี origin ให้อ้าง path สัมพัทธ์จึงใช้ไม่ได้ ต้องใช้ URL เต็มจาก API_BASE_URL
 */
const API_BASE_URL =
  typeof window === "undefined"
    ? (process.env.API_BASE_URL ?? "http://localhost:8081/api/web")
    : (process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api/web")

/** ขอทีเดียวได้มากสุดเท่าที่ API ยอม (_PER_PAGE_MAX ฝั่ง Flask) */
export const BROADCAST_PER_PAGE_MAX = 100

/** จำนวนแถวต่อหน้าที่หน้านี้ใช้ตอนเปิดครั้งแรก */
export const BROADCAST_PAGE_SIZE = 30

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

export type BroadcastQuery = {
  /** ค้นจาก broadcast.name ฝั่งเซิร์ฟเวอร์ (ilike "มีคำนี้อยู่") — ไม่ส่ง = ไม่กรอง */
  name?: string
  /** "active" / "inactive" — null หรือไม่ส่ง = ไม่กรองสถานะ */
  status?: string | null
  page?: number
  perPage?: number
}

/**
 * POST /api/web/broadcast-get-list — ช่องทางทั้งหมด (รวมที่ปิดอยู่) เรียง updated_at ล่าสุดก่อน
 *
 * ค้นหา/กรองสถานะ/แบ่งหน้า ทำที่ฝั่งเซิร์ฟเวอร์ทั้งหมด ตารางแค่ส่งเงื่อนไขไปแล้วแสดงผลที่ได้
 * ไม่เจอเลย API ตอบ 200 พร้อม broadcasts = [] — ไม่ใช่ error
 */
export async function getBroadcasts(
  query: BroadcastQuery = {}
): Promise<BroadcastList> {
  const result = await post<BroadcastList>("broadcast-get-list", {
    name: query.name ?? "",
    // ไม่ส่ง active_status เลยเมื่อไม่ได้กรอง — ส่งสตริงว่างไปก็ได้ แต่ไม่ส่งอ่านง่ายกว่าตอน debug
    ...(query.status ? { active_status: query.status } : {}),
    page: query.page ?? 1,
    per_page: query.perPage ?? BROADCAST_PAGE_SIZE,
  })
  return {
    broadcasts: result?.broadcasts ?? [],
    total: result?.total ?? 0,
    page: result?.page ?? 1,
    per_page: result?.per_page ?? 0,
    total_pages: result?.total_pages ?? 1,
  }
}

/**
 * POST /api/web/broadcast-get-option — ตัวเลือกช่องทางที่ active (id + name + logo)
 * ไม่รับพารามิเตอร์ ไม่แบ่งหน้า · หน้านี้เองไม่ได้ใช้ เตรียมไว้ให้หน้าอื่นที่ต้องเลือกช่องทาง
 */
export async function getBroadcastOptions(): Promise<BroadcastOption[]> {
  return (await post<BroadcastOption[]>("broadcast-get-option", {})) ?? []
}

/**
 * POST /api/web/broadcast-action — เพิ่ม/แก้ไข เส้นเดียวจบ แยกด้วย action ใน body
 *
 * "add" ส่ง id เป็น 0 · "edit" ต้องส่ง id ของแถวที่แก้ · ทั้งสองแบบส่งไปทุกฟิลด์ และคืนแถวหลังบันทึกกลับมา
 * ชื่อซ้ำ API ตอบ 400 "name already exists" · ช่องบังคับว่าง/ยาวเกินตอบ 400
 * logo ส่งว่างได้ (ตอน add ยังไม่มีรูป) — path จริงมาจาก uploadBroadcastLogo() ซึ่งเขียนคอลัมน์ให้เอง
 * ข้อความจาก API ถูกโชว์ในฟอร์มตรง ๆ ไม่ได้แปลใหม่
 */
export async function saveBroadcast(
  action: BroadcastFormMode,
  values: BroadcastFormValues,
  broadcastId?: number
): Promise<Broadcast> {
  return (await post<Broadcast>("broadcast-action", {
    action,
    id: broadcastId ?? 0,
    ...values,
  })) as Broadcast
}

/**
 * POST /api/web/broadcast-upload-logo — อัปโหลดโลโก้ (multipart: id + file) คืน path ที่เก็บในคอลัมน์ logo
 *
 * เก็บที่ /uploads/broadcast/{id}/logo/{ชื่อไฟล์} — API ลบโลโก้เดิมทิ้งและเขียน path ลง broadcast.logo ให้เลย
 * ต้องมีแถวอยู่แล้ว (มี id) ฟอร์มเพิ่มจึงอัปโหลดหลังบันทึกแถวเสร็จ
 * ไม่ใช้ post() ข้างบน เพราะ body เป็น FormData ไม่ใช่ JSON (ห้ามตั้ง Content-Type เอง ให้ browser ใส่ boundary)
 */
export async function uploadBroadcastLogo(
  file: File,
  broadcastId: number
): Promise<string> {
  const url = `${API_BASE_URL}/broadcast-upload-logo`
  const form = new FormData()
  form.append("id", String(broadcastId))
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
 * POST /api/web/broadcast-delete — ลบช่องทางตาม id (ส่งไปแค่ id เท่านั้น)
 *
 * ลบออกจากตารางจริง กู้คืนไม่ได้ · ผลลัพธ์คือแถวที่หายไป (ไม่มีตารางไหนอ้างแถวจากที่นี่)
 */
export async function deleteBroadcast(
  id: number
): Promise<BroadcastDeleted> {
  return (await post<BroadcastDeleted>("broadcast-delete", {
    id,
  })) as BroadcastDeleted
}
