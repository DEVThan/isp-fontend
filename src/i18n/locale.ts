import { cookies } from "next/headers"

import { LOCALE_COOKIE, defaultLocale, locales, type Locale } from "./config"

/**
 * เก็บภาษาไว้ใน cookie แทนการใส่ prefix ใน URL
 * (/customers ยังคงเป็น /customers ไม่ว่าจะภาษาอะไร)
 */
export async function getUserLocale(): Promise<Locale> {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value
  return locales.includes(value as Locale) ? (value as Locale) : defaultLocale
}
