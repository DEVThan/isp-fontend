import type { locales } from "@/i18n/config"
import type messages from "../messages/en.json"

/**
 * บอก type ของคำแปลให้ next-intl รู้จัก — ใช้ en.json เป็นต้นแบบโครงสร้าง
 * ผลคือ t("keyผิด") หรือ namespace ที่ไม่มีจริง จะฟ้องตั้งแต่ตอน compile
 * (ไฟล์ภาษาอื่นถูกบังคับให้มีคีย์ตรงกันด้วย scripts/check-messages.mjs)
 */
declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof locales)[number]
    Messages: typeof messages
  }
}
