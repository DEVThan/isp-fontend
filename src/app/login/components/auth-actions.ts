"use server"

import { cookies } from "next/headers"

import { SESSION_COOKIE, decodeSession, type Session } from "./auth"

/**
 * เข้าและออกจากระบบทำฝั่ง browser ทั้งคู่ (ดู login-form.tsx และ clearSession ใน auth.ts)
 * เหลือไว้ที่นี่แค่การอ่าน session ซึ่งต้องทำบนเซิร์ฟเวอร์ — สำหรับ server component
 * และ route guard (src/proxy.ts) ที่ยังไม่ได้เขียน
 */

/** ผู้ใช้ที่ล็อกอินอยู่ หรือ null ถ้ายังไม่ได้ล็อกอิน */
export async function getSession(): Promise<Session | null> {
  return decodeSession((await cookies()).get(SESSION_COOKIE)?.value)
}
