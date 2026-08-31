
import type { LoginUser } from "@/app/login/components/model"
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api/web"

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


export async function login( username: string, password: string ): Promise<LoginUser> {
  const url = `${API_BASE_URL}/login`
  let res: Response

  try {
    res = await fetch(`${API_BASE_URL}/login`, {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        "password": password,
        "username": username
      }),
    })
  } catch (cause) {
    throw new ApiError(
      API_NETWORK_ERROR,
      `เรียก API ไม่สำเร็จ: ${url} (${String(cause)})`
    )
  }

  // API ควรตอบ JSON เสมอ แต่ถ้าเจอหน้า HTML ของ proxy/error page ก็ต้องไม่ระเบิดตรง .json()
  const envelope = (await res .json() .catch(() => null)) as ApiEnvelope<LoginUser> | null
  if (!envelope) { throw new ApiError(res.status, res.statusText || "Invalid response") }
  if (!envelope.status) { throw new ApiError(envelope.resultcode ?? res.status, envelope.message) }
  return envelope.result as LoginUser
}
