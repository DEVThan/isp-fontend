import {
  CheckCircle2,
  CircleDot,
  Clock,
  XCircle,
  type LucideIcon,
} from "lucide-react"

/**
 * status_style.ts — สีป้ายสถานะของหน้าใบสั่งขาย ใช้ร่วมกันระหว่างตาราง (table.tsx) และกล่องดูข้อมูล (view_modal.tsx)
 * แยกไฟล์ออกมาเพื่อไม่ให้สองไฟล์นั้น import กันไปมา
 */

/**
 * สีป้ายสถานะออเดอร์ — คีย์คือค่าที่เก็บในคอลัมน์ status (= ชื่อในทะเบียน status_po)
 * ใช้ตระกูลสีสถานะเป็นพื้นจาง + ตัวหนังสือสี -ink คู่กับไอคอนเสมอ สีจึงไม่ใช่ช่องทางสื่อความหมายเดียว
 * ค่าที่ไม่รู้จัก (ทะเบียนเพิ่มใหม่ หรือ sync เขียนค่าใหม่มา) ได้สีกลาง ไม่ใช่ไม่โชว์
 * ยกเว้น "ออเดอร์ใหม่" (12/10/2026 ผู้ใช้ขอให้สดและสว่างขึ้น): พื้นทึบ info-vivid + ตัวหนังสือ info-vivid-ink
 * เป็นสถานะที่ต้องลงมือทำต่อ จึงเด่นกว่าสถานะอื่นที่ยังเป็นพื้นจาง
 */
export const STATUS_STYLE: Record<string, { className: string; icon: LucideIcon }> = {
  "ออเดอร์ใหม่": { className: "bg-info-vivid text-info-vivid-ink font-semibold", icon: CircleDot },
  "กำลังจัดส่ง": { className: "bg-warning/18 text-warning-ink", icon: Clock },
  "ลูกค้าได้รับสินค้าแล้ว": {
    className: "bg-success/12 text-success-ink",
    icon: CheckCircle2,
  },
  "ยกเลิก": { className: "bg-danger/12 text-danger-ink", icon: XCircle },
}

/** สีป้ายสถานะการชำระเงิน — ชำระแล้วเขียว ที่เหลือกลาง (รอชำระเงินคือค่าปกติของ 98% ของแถว) */
export const PAYMENT_STYLE: Record<string, string> = {
  "ชำระเงินแล้ว": "bg-success/12 text-success-ink",
}

/** สีกลางของค่าที่ไม่อยู่ใน STATUS_STYLE / PAYMENT_STYLE */
export const NEUTRAL_STYLE = "bg-muted text-muted-foreground"
