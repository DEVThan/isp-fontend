"use server"

import { cookies } from "next/headers"

import { LOCALE_COOKIE, locales, type Locale } from "./config"

/** เรียกจากตัวสลับภาษาฝั่ง client — เขียน cookie แล้วให้ client สั่ง refresh */
export async function setUserLocale(locale: Locale) {
  if (!locales.includes(locale)) return
  ;(await cookies()).set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  })
}
