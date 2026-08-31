"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { SESSION_COOKIE, decodeSession, type Session } from "./auth"

/**
 * การล็อกอินย้ายไปทำฝั่ง browser แล้ว — ดู handleSubmit ใน login-form.tsx
 * ไฟล์นี้เหลือแค่ส่วนที่ต้องทำบนเซิร์ฟเวอร์จริง ๆ (อ่าน/ลบ cookie แล้วพาไปหน้าอื่น)
 */

/** ผู้ใช้ที่ล็อกอินอยู่ หรือ null ถ้ายังไม่ได้ล็อกอิน */
export async function getSession(): Promise<Session | null> {
  return decodeSession((await cookies()).get(SESSION_COOKIE)?.value)
}

export async function signOut() {
  ;(await cookies()).delete(SESSION_COOKIE)
  redirect("/login")
}
