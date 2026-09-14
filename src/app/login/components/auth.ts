import type { Messages } from "next-intl"

import type { LoginUser } from "@/app/login/components/model"
import type { NavItem } from "@/lib/nav"

export const SESSION_COOKIE = "isp_session"

/**
 * เมนูของผู้ใช้ — cookie แยกจาก session เพราะ cookie หนึ่งตัวเก็บได้ราว 4KB
 * admin (18 เมนู) ถ้ารวมไว้ในตัวเดียวกับโปรไฟล์กินไป ~3KB แล้ว เมนูเพิ่มอีกไม่กี่ตัว browser จะทิ้ง cookie
 * ทั้งตัวแบบเงียบ ๆ = หลุดออกจากระบบ · แยกไว้คนละตัว แต่ละตัวได้ 4KB ของตัวเอง และพังก็แค่เมนูหาย
 */
export const MENU_COOKIE = "isp_menus"

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

/**
 * ข้อมูลที่เก็บไว้ใน cookie หลัง login (ย่อจาก LoginUser ให้เหลือเท่าที่ UI ใช้)
 * เมนูไม่อยู่ในนี้แล้ว — /login ส่งเมนูเต็มมา ซึ่งใหญ่เกินจะอยู่ cookie เดียวกับโปรไฟล์ แยกไปเก็บที่ MENU_COOKIE
 */
export type Session = Pick<
  LoginUser,
  "id" | "username" | "fullname" | "role" | "rolename" | "email"
>

export function toSession(user: LoginUser): Session {
  return {
    id: user.id,
    username: user.username,
    fullname: user.fullname,
    role: user.role,
    rolename: user.rolename,
    email: user.email,
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
 * เมนูที่เก็บลง cookie = ต้นเมนูที่ toNavGroups สร้างเสร็จแล้วตอน login (ชื่อ ลิงก์ ไอคอน เมนูลูก เรียงลำดับแล้ว)
 * ไม่ใช่แถวดิบจาก API — ตัด id / sort_order / parent_id / detail ที่ sidebar ไม่ใช้ และทิ้ง icon ว่าง
 * cookie เล็กลงเกือบครึ่ง ฝั่ง server แค่อ่านไปวาด ไม่ต้องยิง API ทุกครั้งที่โหลดหน้า
 */
export function encodeMenus(items: NavItem[]) {
  const compact = items.map(({ icon, ...item }) => (icon ? { ...item, icon } : item))
  return toBase64Url(JSON.stringify(compact))
}

/** ค่าใน cookie เชื่อไม่ได้ — อ่านไม่ออกหรือรูปร่างผิด = ไม่มีเมนู (sidebar ว่าง) ไม่ทำหน้าพัง */
export function decodeMenus(value: string | undefined): NavItem[] {
  if (!value) return []
  try {
    const items: unknown = JSON.parse(fromBase64Url(value))
    if (!Array.isArray(items)) return []
    return items.filter(
      (item): item is NavItem =>
        typeof item?.url === "string" &&
        typeof item?.code === "string" &&
        typeof item?.name === "string"
    )
  } catch {
    return []
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
 * เขียนเมนูลง cookie คู่กับ session — อายุเท่ากันเสมอ (จำฉันไว้ = 30 วัน · ไม่จำ = ปิด browser แล้วหาย)
 * เมนูไม่อัปเดตเองระหว่างใช้งาน — แก้สิทธิ์ของ role แล้วผู้ใช้ต้องล็อกอินใหม่ถึงจะเห็น
 */
export function saveMenus(items: NavItem[], remember: boolean) {
  const maxAge = remember ? `; max-age=${60 * 60 * 24 * 30}` : ""
  document.cookie = `${MENU_COOKIE}=${encodeMenus(items)}; path=/; samesite=lax${maxAge}`
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
  // เมนูต้องหายไปพร้อมกัน ไม่งั้นคนถัดไปที่ล็อกอินในเครื่องเดียวกันจะเห็นเมนูของคนก่อนจนกว่าจะเขียนทับ
  document.cookie = `${MENU_COOKIE}=; path=/; samesite=lax; max-age=0`
}

/** ตรวจฟอร์มฝั่งเซิร์ฟเวอร์ คืนคีย์ข้อความ ไม่ใช่ข้อความจริง
 * เช็กแค่ "กรอกครบไหม" — ถูก/ผิดเป็นเรื่องของ API ไม่ใช่ของฟอร์ม */
export function validateCredentials(username: string, password: string) {
  const errors: NonNullable<SignInState["errors"]> = {}

  if (!username) errors.username = "usernameRequired"
  if (!password) errors.password = "passwordRequired"

  return errors
}
