import {
  API_NETWORK_ERROR,
  ApiError,
  type ApiEnvelope,
} from "@/app/login/components/api"
import type {
  RoleOption,
  UserAuthen,
  UserAuthenDeleted,
  UserAuthenList,
  UserFormMode,
  UserFormValues,
} from "@/app/setting/userauthen/_components/model"

/**
 * api.ts — เส้น API ของหน้าจัดการผู้ใช้งาน (ตาราง user_authen)
 *
 * ฝั่ง browser ยิง "/api/web" แล้วให้ rewrite ใน next.config.ts ส่งต่อไป Flask (เลี่ยง CORS)
 * ฝั่ง server ไม่มี origin ให้อ้าง path สัมพัทธ์จึงใช้ไม่ได้ ต้องใช้ URL เต็มจาก API_BASE_URL
 */
const API_BASE_URL =
  typeof window === "undefined"
    ? (process.env.API_BASE_URL ?? "http://localhost:8081/api/web")
    : (process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api/web")

/** ขอทีเดียวได้มากสุดเท่าที่ API ยอม (_PER_PAGE_MAX ฝั่ง Flask) */
export const USER_PER_PAGE_MAX = 100

/** จำนวนแถวต่อหน้าที่หน้านี้ใช้ตอนเปิดครั้งแรก */
export const USER_PAGE_SIZE = 30

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

export type UserQuery = {
  /** ค้นจาก user_authen.username ฝั่งเซิร์ฟเวอร์ (ilike) — ไม่ส่ง = ไม่กรอง */
  username?: string
  /** ค้นจาก user_authen.fullname (ilike) */
  fullname?: string
  /** id ของสิทธิ์ — null หรือไม่ส่ง = ไม่กรองสิทธิ์ */
  role?: string | null
  /** "active" / "inactive" — null หรือไม่ส่ง = ไม่กรองสถานะ */
  status?: string | null
  page?: number
  perPage?: number
}

/**
 * POST /api/web/userauthen-get-list — ผู้ใช้งานทั้งหมด (รวมที่ปิดอยู่)
 *
 * ค้นหา/กรอง/แบ่งหน้า ทำที่ฝั่งเซิร์ฟเวอร์ทั้งหมด ตารางแค่ส่งเงื่อนไขไปแล้วแสดงผลที่ได้
 * ตารางว่าง API ตอบ 200 พร้อม userauthens = [] — ไม่ใช่ error
 */
export async function getUsers(query: UserQuery = {}): Promise<UserAuthenList> {
  const result = await post<UserAuthenList>("userauthen-get-list", {
    username: query.username ?? "",
    fullname: query.fullname ?? "",
    // ไม่ส่งคีย์ที่ไม่ได้กรองเลย — อ่านง่ายกว่าตอน debug
    ...(query.role ? { role: query.role } : {}),
    ...(query.status ? { status: query.status } : {}),
    page: query.page ?? 1,
    per_page: query.perPage ?? USER_PAGE_SIZE,
  })
  return {
    userauthens: result?.userauthens ?? [],
    total: result?.total ?? 0,
    page: result?.page ?? 1,
    per_page: result?.per_page ?? 0,
    total_pages: result?.total_pages ?? 1,
  }
}

/**
 * POST /api/web/userrole-get-option — ตัวเลือกสิทธิ์ที่ active (id + rolename)
 * เป็นเส้นของหน้าจัดการสิทธิ์ แต่หน้านี้ยืมมาใช้ทำ dropdown เลือกสิทธิ์ให้ผู้ใช้
 */
export async function getRoleOptions(): Promise<RoleOption[]> {
  return (await post<RoleOption[]>("userrole-get-option", {})) ?? []
}

/**
 * POST /api/web/userauthen-action — เพิ่ม/แก้ไขผู้ใช้ เส้นเดียวจบ แยกด้วย action ใน body
 *
 * "add" ส่ง id เป็น 0 (คอลัมน์ id เป็น identity ฐานข้อมูลออกเลขให้เอง) · "edit" ต้องส่ง id
 * password: ตอนเพิ่มบังคับ · ตอนแก้ไขส่งค่าว่างไป = ใช้รหัสเดิม API ไม่ได้ล้างทิ้ง
 */
export async function saveUser(
  action: UserFormMode,
  values: UserFormValues,
  userId?: number
): Promise<UserAuthen> {
  return (await post<UserAuthen>("userauthen-action", {
    action,
    id: userId ?? 0,
    ...values,
  })) as UserAuthen
}

/**
 * POST /api/web/userauthen-delete — ลบผู้ใช้ตาม id (ส่งไปแค่ id เท่านั้น)
 * ลบออกจากตารางจริง กู้คืนไม่ได้
 */
export async function deleteUser(id: number): Promise<UserAuthenDeleted> {
  return (await post<UserAuthenDeleted>("userauthen-delete", {
    id,
  })) as UserAuthenDeleted
}
