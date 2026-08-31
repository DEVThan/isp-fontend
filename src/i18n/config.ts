export const locales = ["th", "en"] as const

export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = "th"

/** ชื่อภาษาที่แสดงในตัวสลับภาษา — เขียนด้วยภาษานั้น ๆ เอง */
export const localeNames: Record<Locale, string> = {
  th: "ไทย",
  en: "English",
}

export const LOCALE_COOKIE = "NEXT_LOCALE"
