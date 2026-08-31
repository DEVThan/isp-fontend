import type { Messages } from "next-intl"

import type { LoginUser } from "@/app/login/components/api"

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

/** encode เป็น base64url ก่อนลง cookie — JSON ดิบมี , ; " ที่ทำ header เพี้ยนได้ */
export function encodeSession(session: Session) {
  return Buffer.from(JSON.stringify(session), "utf8").toString("base64url")
}

/** ค่าใน cookie เชื่อไม่ได้ (ผู้ใช้แก้เองได้) — พังเมื่อไหร่ถือว่าไม่มี session */
export function decodeSession(value: string | undefined): Session | null {
  if (!value) return null
  try {
    const session = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8")
    ) as Session
    return typeof session?.id === "number" && session.username ? session : null
  } catch {
    return null
  }
}

/** ตรวจฟอร์มฝั่งเซิร์ฟเวอร์ คืนคีย์ข้อความ ไม่ใช่ข้อความจริง
 * เช็กแค่ "กรอกครบไหม" — ถูก/ผิดเป็นเรื่องของ API ไม่ใช่ของฟอร์ม */
export function validateCredentials(username: string, password: string) {
  const errors: NonNullable<SignInState["errors"]> = {}

  if (!username) errors.username = "usernameRequired"
  if (!password) errors.password = "passwordRequired"

  return errors
}
