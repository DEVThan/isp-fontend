import {
  Banknote,
  CheckCircle2,
  CircleDot,
  Clock,
  CreditCard,
  Hourglass,
  Landmark,
  Wallet,
  XCircle,
  type LucideIcon,
} from "lucide-react"

/**
 * status_style.ts — สีป้ายสถานะของหน้าใบสั่งขาย ใช้ร่วมกันระหว่างตาราง (table.tsx) และกล่องดูข้อมูล (view_modal.tsx)
 * แยกไฟล์ออกมาเพื่อไม่ให้สองไฟล์นั้น import กันไปมา
 */

/**
 * สีป้ายสถานะออเดอร์ — คีย์คือค่าที่เก็บในคอลัมน์ status (= ชื่อในทะเบียน status_po)
 * ใช้ตระกูลสีสถานะเป็นพื้นทึบ + ตัวหนังสือขาว คู่กับไอคอนเสมอ สีจึงไม่ใช่ช่องทางสื่อความหมายเดียว
 * ค่าที่ไม่รู้จัก (ทะเบียนเพิ่มใหม่ หรือ sync เขียนค่าใหม่มา) ได้สีกลาง ไม่ใช่ไม่โชว์
 * 12/10/2026 ผู้ใช้ขอ: ทุกสถานะเป็นพื้นทึบ + ตัวหนังสือขาวแบบเดียวกับ "ออเดอร์ใหม่" (info-vivid) —
 * กำลังจัดส่ง = warning-vivid · ได้รับแล้ว = success · ยกเลิก = danger (contrast ตัวขาว 2.3–4.8:1 ต่ำกว่า 4.5 เกือบทุกสี ผู้ใช้เลือกแบบนี้)
 */
export const STATUS_STYLE: Record<string, { className: string; icon: LucideIcon }> = {
  "ออเดอร์ใหม่": { className: "bg-info-vivid text-info-vivid-ink font-semibold", icon: CircleDot },
  "กำลังจัดส่ง": { className: "bg-warning-vivid text-white font-semibold", icon: Clock },
  "ลูกค้าได้รับสินค้าแล้ว": {
    className: "bg-success text-white font-semibold",
    icon: CheckCircle2,
  },
  "ยกเลิก": { className: "bg-danger text-white font-semibold", icon: XCircle },
}

/**
 * สีป้ายสถานะการชำระเงิน — คีย์คือค่าในคอลัมน์ is_payment (= ชื่อในทะเบียน status_payment)
 * 12/10/2026 (ผู้ใช้ขอแบบใหม่): รอชำระเงินเป็นสีเหลืองอำพัน (เดิมสีกลาง) ชำระแล้วเขียว · คู่กับไอคอนใน PAYMENT_ICON เสมอ
 */
export const PAYMENT_STYLE: Record<string, string> = {
  "ชำระเงินแล้ว": "bg-success/12 text-success-ink",
  "รอชำระเงิน": "bg-warning/18 text-warning-ink",
}

/**
 * สีตัวหนังสือของสถานะการชำระเงินในตาราง — ตารางโชว์เป็นข้อความ + ไอคอน ไม่มีพื้นป้าย (12/10/2026 ผู้ใช้ขอ)
 * PAYMENT_STYLE (มีพื้น) ยังใช้กับป้ายในกล่องดูข้อมูล · ค่าที่ไม่รู้จักใช้สีจาง
 */
export const PAYMENT_TEXT_STYLE: Record<string, string> = {
  "ชำระเงินแล้ว": "text-success-ink",
  "รอชำระเงิน": "text-warning-ink",
}

/** ไอคอนหน้าป้ายสถานะการชำระเงิน — ค่าที่ไม่รู้จักไม่มีไอคอน */
export const PAYMENT_ICON: Record<string, LucideIcon> = {
  "ชำระเงินแล้ว": CheckCircle2,
  "รอชำระเงิน": Hourglass,
}

/** ไอคอนหน้าวิธีชำระ (pay_by = ชื่อในทะเบียน payment_type) — ค่าที่ไม่รู้จักใช้ PAY_BY_FALLBACK_ICON */
export const PAY_BY_ICON: Record<string, LucideIcon> = {
  "COD": Banknote,
  "โอนเงิน": Landmark,
  "บัตรเครดิต": CreditCard,
}
export const PAY_BY_FALLBACK_ICON: LucideIcon = Wallet

/** สีกลางของค่าที่ไม่อยู่ใน STATUS_STYLE / PAYMENT_STYLE */
export const NEUTRAL_STYLE = "bg-muted text-muted-foreground"
