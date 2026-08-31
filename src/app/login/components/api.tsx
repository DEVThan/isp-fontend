/**
 * api.tsx — จุดเดียวที่คุยกับ backend (Flask API: /api/web)
 *
 * ทุก endpoint ใต้ /api/web ตอบรูปแบบเดียวกัน (ดู controller/web/__init__.py ฝั่ง API):
 *   { "status": true/false, "resultcode": <เลขเดียวกับ HTTP code>, "message": "...", "result": {...} }
 *
 * ไฟล์นี้จึงแกะ envelope ให้เสร็จในที่เดียว — ผู้เรียกได้ result ตรง ๆ
 * ถ้าไม่สำเร็จจะ throw ApiError ที่มี code ให้เอาไปแมปเป็นข้อความของ UI
 *
 * เรียกจากฝั่งเซิร์ฟเวอร์เท่านั้น (server action / server component) เพราะ URL ของ API
 * อ่านจาก process.env.API_BASE_URL ซึ่งไม่ถูกส่งไป client
 */

/** ปลายทางของ API — ตั้งค่าใน .env.local (ค่าตั้งต้นคือ dev server ที่รันด้วย server.py) */
export const API_BASE_URL =
  process.env.API_BASE_URL ?? "http://localhost:8081/api/web"

/** รูปแบบ response มาตรฐานของ /api/web */
export type ApiEnvelope<T> = {
  status: boolean
  resultcode: number
  message: string
  result?: T
}

/** ต่อ API ไม่ได้เลย (เน็ตหลุด / API ไม่ได้รัน) — ไม่มี HTTP code จริงจึงใช้ 0 */
export const API_NETWORK_ERROR = 0

export class ApiError extends Error {
  /** = resultcode ที่ API ส่งมา หรือ API_NETWORK_ERROR ถ้ายิงไม่ถึง */
  readonly code: number

  constructor(code: number, message: string) {
    super(message)
    this.name = "ApiError"
    this.code = code
  }
}

/**
 * ยิง request ไป /api/web แล้วคืนเฉพาะ result
 * - ไม่ cache (ข้อมูลหลังบ้านต้องสด และ login ต้องยิงจริงทุกครั้ง)
 * - ทั้ง error จาก network และ resultcode >= 400 ออกมาเป็น ApiError เหมือนกัน
 */
export async function apiFetch<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        ...init.headers,
      },
    })
  } catch (cause) {
    throw new ApiError(
      API_NETWORK_ERROR,
      `เรียก API ไม่สำเร็จ: ${API_BASE_URL}${path} (${String(cause)})`
    )
  }

  // API ควรตอบ JSON เสมอ แต่ถ้าเจอ 502/หน้า HTML ของ proxy ก็ต้องไม่ระเบิดตรง .json()
  const envelope = (await res.json().catch(() => null)) as ApiEnvelope<T> | null
  if (!envelope) {
    throw new ApiError(res.status, res.statusText || "Invalid response")
  }
  if (!envelope.status) {
    throw new ApiError(envelope.resultcode ?? res.status, envelope.message)
  }

  return envelope.result as T
}

/** ข้อมูลผู้ใช้ที่ /login คืนกลับมา (ตัด password ออกแล้วฝั่ง API) */
export type LoginUser = {
  id: number
  username: string
  fullname: string | null
  /** รหัส role เช่น "UR202606-001" */
  role: string | null
  rolename: string | null
  email: string | null
  telephone: string | null
  status: string
  /** id ของเมนูที่ role นี้เข้าได้ */
  menus: string[]
}

/**
 * POST /api/web/login — ตรวจ username/password กับตาราง user_authen
 * สำเร็จ -> ข้อมูลผู้ใช้ · ไม่สำเร็จ -> ApiError (401 รหัสผิด, 403 บัญชีถูกปิด)
 *
 * หมายเหตุ: ตอนนี้ API ยังไม่ออก token ให้ (logout ฝั่ง API ยังตอบ 501)
 * session จึงสร้างจากข้อมูลผู้ใช้ชุดนี้ที่ฝั่ง Next ไปก่อน — ดู src/lib/auth-actions.ts
 */
export function login(username: string, password: string) {
  return apiFetch<LoginUser>("/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  })
}
