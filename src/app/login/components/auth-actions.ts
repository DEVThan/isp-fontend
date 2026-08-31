"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { ApiError, API_NETWORK_ERROR, login, type LoginUser } from "@/app/login/components/api"

import {
  SESSION_COOKIE,
  decodeSession,
  encodeSession,
  toSession,
  validateCredentials,
  type Session,
  type SignInState,
} from "./auth"

/** แปลง code จาก API เป็น key ใต้ "login.errors" ให้ฟอร์มเอาไปแปล */
function errorKey(error: ApiError) {
  switch (error.code) {
    case 401:
      return "invalidCredentials"
    case 403:
      return "accountDisabled"
    case API_NETWORK_ERROR:
      return "serverUnavailable"
    default:
      return "serverError"
  }
}

export async function signIn(
  _prev: SignInState,
  formData: FormData
): Promise<SignInState> {
  const username = String(formData.get("username") ?? "").trim()
  const password = String(formData.get("password") ?? "")
  const remember = formData.get("remember") === "on"

  const errors = validateCredentials(username, password)
  if (Object.keys(errors).length > 0) {
    return { errors, values: { username, remember } }
  }

  let user: LoginUser
  try {
    user = await login(username, password)
  } catch (error) {
    if (!(error instanceof ApiError)) throw error
    // log ไว้ฝั่งเซิร์ฟเวอร์ ส่วนผู้ใช้เห็นแค่ข้อความกลาง ๆ ไม่บอกว่าพลาดที่ช่องไหน
    console.error("[signIn] %s", error.message)
    return { errors: { form: errorKey(error) }, values: { username, remember } }
  }

  // API ยังไม่ออก token (logout ฝั่ง API ตอบ 501) — เก็บโปรไฟล์ที่ได้เป็น session ไปก่อน
  ;(await cookies()).set(SESSION_COOKIE, encodeSession(toSession(user)), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: remember ? 60 * 60 * 24 * 30 : undefined,
  })

  redirect("/")
}

/** ผู้ใช้ที่ล็อกอินอยู่ หรือ null ถ้ายังไม่ได้ล็อกอิน */
export async function getSession(): Promise<Session | null> {
  return decodeSession((await cookies()).get(SESSION_COOKIE)?.value)
}

export async function signOut() {
  ;(await cookies()).delete(SESSION_COOKIE)
  redirect("/login")
}
