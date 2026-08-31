import type { Messages } from "next-intl"

import type { LoginUser } from "@/app/login/components/model"

export const SESSION_COOKIE = "isp_session"

/** key ใต้ namespace "login.errors" — พิมพ์ผิดแล้วไม่ compile */
export type LoginErrorKey = keyof Messages["login"]["errors"]

export type SignInState = {
  /** เก็บเป็น key ไม่ใช่ข้อความจริง — แปลตอน render ฝั่ง client */
  errors?: {
    username?: LoginErrorKey
    password?: LoginErrorKey
    form?: LoginErrorKey
  }
  values?: { username?: string; remember?: boolean }
}

/** ข้อมูลที่เก็บไว้ใน cookie หลัง login (ย่อจาก LoginUser ให้เหลือเท่าที่ UI ใช้) */
export type Session = Pick<
  LoginUser,
  "id" | "username" | "fullname" | "role" | "rolename" | "email" | "menus"
>

export function toSession(user: LoginUser): Session {
  return {
    id: user.id,
    username: user.username,
    fullname: user.fullname,
    role: user.role,
    rolename: user.rolename,
    email: user.email,
    menus: user.menus,
  }
}

/** ชื่อ cookie นี้ถูกเขียนจากฝั่ง browser และอ่านจากฝั่ง server จึงใช้ได้แค่ btoa/atob
 *  (Buffer เป็นของ Node ไม่มีใน browser) */
const toBase64Url = (text: string) =>
  btoa(String.fromCharCode(...new TextEncoder().encode(text)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")

const fromBase64Url = (value: string) =>
  new TextDecoder().decode(
    Uint8Array.from(atob(value.replace(/-/g, "+").replace(/_/g, "/")), (c) =>
      c.charCodeAt(0)
    )
  )

/** encode เป็น base64url ก่อนลง cookie — JSON ดิบมี , ; " ที่ทำ header เพี้ยนได้ */
export function encodeSession(session: Session) {
  return toBase64Url(JSON.stringify(session))
}

/** ค่าใน cookie เชื่อไม่ได้ (ผู้ใช้แก้เองได้) — พังเมื่อไหร่ถือว่าไม่มี session */
export function decodeSession(value: string | undefined): Session | null {
  if (!value) return null
  try {
    const session = JSON.parse(fromBase64Url(value)) as Session
    return typeof session?.id === "number" && session.username ? session : null
  } catch {
    return null
  }
}

/**
 * เขียน session ลง cookie จากฝั่ง browser
 *
 * cookie นี้เก็บแค่โปรไฟล์ไว้ให้ UI รู้ว่าใครล็อกอินอยู่ ไม่ใช่หลักฐานยืนยันตัวตน
 * (API ยังไม่ออก token) — เมื่อไหร่ที่ backend ออก token แล้ว ต้องย้ายการล็อกอิน
 * กลับไปทำฝั่ง server เพื่อให้ cookie เป็น httpOnly และตรวจสอบได้จริง
 */
export function saveSession(session: Session, remember: boolean) {
  const maxAge = remember ? `; max-age=${60 * 60 * 24 * 30}` : ""
  document.cookie = `${SESSION_COOKIE}=${encodeSession(session)}; path=/; samesite=lax${maxAge}`
}

/**
 * ออกจากระบบ — ลบ cookie ด้วยการตั้งวันหมดอายุเป็นอดีต
 * path ต้องตรงกับตอนเขียน ไม่งั้นเบราว์เซอร์จะมองว่าเป็นคนละ cookie แล้วลบไม่ออก
 *
 * ยังไม่ได้เรียก POST /api/web/logout เพราะฝั่ง API ตอบ 501 (ยังไม่มีระบบ token)
 * เมื่อไหร่ที่ API ออก token แล้ว ต้องยิงไปบอกให้ยกเลิก token ที่นี่ด้วย
 */
export function clearSession() {
  document.cookie = `${SESSION_COOKIE}=; path=/; samesite=lax; max-age=0`
}

/** ตรวจฟอร์มฝั่งเซิร์ฟเวอร์ คืนคีย์ข้อความ ไม่ใช่ข้อความจริง
 * เช็กแค่ "กรอกครบไหม" — ถูก/ผิดเป็นเรื่องของ API ไม่ใช่ของฟอร์ม */
export function validateCredentials(username: string, password: string) {
  const errors: NonNullable<SignInState["errors"]> = {}

  if (!username) errors.username = "usernameRequired"
  if (!password) errors.password = "passwordRequired"

  return errors
}
