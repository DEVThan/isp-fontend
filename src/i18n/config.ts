// export const locales = ["th", "en", "mm"] as const
export const locales = ["th", "en"] as const

export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = "th"

/** ชื่อภาษาที่แสดงในตัวสลับภาษา — เขียนด้วยภาษานั้น ๆ เอง */
export const localeNames: Record<Locale, string> = {
  th: "ไทย",
  en: "English",
  // mm: "မြန်မာ",
}

export const LOCALE_COOKIE = "NEXT_LOCALE"

/**
 * รหัสภาษาตามมาตรฐาน BCP-47 สำหรับ <html lang> และ Intl
 * เราใช้ "mm" เป็นรหัสภายในระบบ แต่ "mm" คือรหัส *ประเทศ* เมียนมา
 * รหัส *ภาษา* พม่าคือ "my" — เบราว์เซอร์กับ screen reader รู้จักแค่ตัวหลัง
 */
export const bcp47: Record<Locale, string> = {
  th: "th",
  en: "en",
  // mm: "my",
}

/**
 * locale ที่ส่งให้ Intl — ค่าตั้งต้นของภาษาพม่าคือเลขพม่า (၁၂၃)
 * ตัวเลขในตาราง/กราฟจึงถูกบังคับเป็นเลขอารบิกให้อ่านเทียบกันได้ทุกภาษา
 */
export function intlLocale(locale: string) {
  return locale === "mm" ? "my-u-nu-latn" : locale
}
