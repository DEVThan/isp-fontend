/**
 * ข้อมูลตัวอย่างสำหรับเทมเพลต — เปลี่ยนไปเรียก API จริงได้เลย
 * โดยแทนที่ฟังก์ชันเหล่านี้ด้วย fetch() ใน Server Component
 */

export type Customer = {
  id: string
  name: string
  package: string
  area: string
  status: "active" | "suspended" | "pending"
  monthlyFee: number
  installedAt: string
}

export type Invoice = {
  id: string
  customer: string
  period: string
  amount: number
  dueDate: string
  status: "paid" | "unpaid" | "overdue"
}

export type Ticket = {
  id: string
  customer: string
  subject: string
  priority: "low" | "medium" | "high"
  status: "open" | "in_progress" | "closed"
  updatedAt: string
}

export const customers: Customer[] = [
  { id: "CUS-1042", name: "สมชาย ใจดี", package: "Fiber 500/500", area: "เมืองเชียงใหม่", status: "active", monthlyFee: 799, installedAt: "2026-01-14" },
  { id: "CUS-1043", name: "ร้านกาแฟ Bloom", package: "Fiber 1000/1000", area: "หางดง", status: "active", monthlyFee: 1290, installedAt: "2026-02-03" },
  { id: "CUS-1044", name: "วิภา ทองสุข", package: "Fiber 300/300", area: "สันทราย", status: "suspended", monthlyFee: 599, installedAt: "2025-11-27" },
  { id: "CUS-1045", name: "บจก. นอร์ทเทิร์นเทค", package: "Leased Line 200", area: "เมืองเชียงใหม่", status: "active", monthlyFee: 8500, installedAt: "2025-08-19" },
  { id: "CUS-1046", name: "ธนพล ศรีวงศ์", package: "Fiber 500/500", area: "สารภี", status: "pending", monthlyFee: 799, installedAt: "2026-08-21" },
  { id: "CUS-1047", name: "โรงเรียนบ้านสันป่าตอง", package: "Fiber 1000/1000", area: "สันป่าตอง", status: "active", monthlyFee: 1290, installedAt: "2026-03-30" },
]

export const invoices: Invoice[] = [
  { id: "INV-20268-011", customer: "สมชาย ใจดี", period: "ส.ค. 2026", amount: 799, dueDate: "2026-09-05", status: "unpaid" },
  { id: "INV-20268-012", customer: "ร้านกาแฟ Bloom", period: "ส.ค. 2026", amount: 1290, dueDate: "2026-09-05", status: "paid" },
  { id: "INV-20268-013", customer: "วิภา ทองสุข", period: "ก.ค. 2026", amount: 599, dueDate: "2026-08-05", status: "overdue" },
  { id: "INV-20268-014", customer: "บจก. นอร์ทเทิร์นเทค", period: "ส.ค. 2026", amount: 8500, dueDate: "2026-09-05", status: "paid" },
  { id: "INV-20268-015", customer: "โรงเรียนบ้านสันป่าตอง", period: "ส.ค. 2026", amount: 1290, dueDate: "2026-09-05", status: "unpaid" },
]

export const tickets: Ticket[] = [
  { id: "TKT-3391", customer: "วิภา ทองสุข", subject: "เน็ตหลุดบ่อยช่วงกลางคืน", priority: "high", status: "in_progress", updatedAt: "2026-08-27 09:12" },
  { id: "TKT-3392", customer: "สมชาย ใจดี", subject: "ขอย้ายจุดติดตั้ง ONU", priority: "medium", status: "open", updatedAt: "2026-08-26 16:40" },
  { id: "TKT-3393", customer: "ร้านกาแฟ Bloom", subject: "ขอเปิด port สำหรับ CCTV", priority: "low", status: "closed", updatedAt: "2026-08-25 11:05" },
]

export type StatTone = "info" | "success" | "warning" | "danger"

export const stats: {
  labelKey: string
  value: number
  format: "number" | "currency"
  delta: string
  trend: "up" | "down"
  hintKey: string
  tone: StatTone
}[] = [
  { labelKey: "customers", value: 1284, format: "number", delta: "+4.2%", trend: "up", hintKey: "vsLastMonth", tone: "info" },
  { labelKey: "revenue", value: 1842300, format: "currency", delta: "+8.1%", trend: "up", hintKey: "vsLastMonth", tone: "success" },
  { labelKey: "outstanding", value: 96400, format: "currency", delta: "-2.4%", trend: "down", hintKey: "downFromLastMonth", tone: "warning" },
  { labelKey: "openTickets", value: 23, format: "number", delta: "+5", trend: "up", hintKey: "openOver24h", tone: "danger" },
]

/** สัดส่วนลูกค้าตามแพ็กเกจ — ใช้สีชุดกราฟตามลำดับสล็อต */
export const packageMix: {
  name?: string
  labelKey?: string
  customers: number
  slot: number
}[] = [
  { name: "Fiber 500/500", customers: 612, slot: 1 },
  { name: "Fiber 1000/1000", customers: 388, slot: 2 },
  { name: "Fiber 300/300", customers: 221, slot: 3 },
  { labelKey: "other", customers: 63, slot: 0 },
]

/** ปริมาณทราฟฟิกรายชั่วโมง (Gbps) สำหรับกราฟตัวอย่าง */
export const traffic = [
  12, 9, 7, 6, 5, 6, 9, 14, 21, 26, 29, 31, 33, 32, 30, 31, 35, 42, 51, 58, 61, 54, 38, 22,
]

/** สกุลเงินคงเป็นบาทเสมอ แต่รูปแบบตัวเลขเปลี่ยนตามภาษาที่เลือก */
export const formatTHB = (value: number, locale = "th-TH") =>
  new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(value)

export type ServicePackage = {
  id: string
  name: string
  down: number
  up: number
  price: number
  subscribers: number
}

export const servicePackages: ServicePackage[] = [
  { id: "PKG-01", name: "Fiber 300/300", down: 300, up: 300, price: 599, subscribers: 221 },
  { id: "PKG-02", name: "Fiber 500/500", down: 500, up: 500, price: 799, subscribers: 612 },
  { id: "PKG-03", name: "Fiber 1000/1000", down: 1000, up: 1000, price: 1290, subscribers: 388 },
  { id: "PKG-04", name: "Leased Line 200", down: 200, up: 200, price: 8500, subscribers: 18 },
]

export type ServiceArea = {
  name: string
  customers: number
  coverage: number
  status: "active" | "planned"
}

export const serviceAreas: ServiceArea[] = [
  { name: "เมืองเชียงใหม่", customers: 486, coverage: 94, status: "active" },
  { name: "หางดง", customers: 231, coverage: 78, status: "active" },
  { name: "สันทราย", customers: 198, coverage: 71, status: "active" },
  { name: "สารภี", customers: 154, coverage: 65, status: "active" },
  { name: "สันป่าตอง", customers: 132, coverage: 52, status: "active" },
  { name: "แม่ริม", customers: 0, coverage: 12, status: "planned" },
]

export type Payment = {
  id: string
  customer: string
  methodKey: "transfer" | "promptpay" | "card" | "cash"
  amount: number
  paidAt: string
}

export const payments: Payment[] = [
  { id: "PAY-88231", customer: "ร้านกาแฟ Bloom", methodKey: "promptpay", amount: 1290, paidAt: "2026-08-26" },
  { id: "PAY-88232", customer: "บจก. นอร์ทเทิร์นเทค", methodKey: "transfer", amount: 8500, paidAt: "2026-08-25" },
  { id: "PAY-88233", customer: "ธนพล ศรีวงศ์", methodKey: "card", amount: 799, paidAt: "2026-08-24" },
  { id: "PAY-88234", customer: "โรงเรียนบ้านสันป่าตอง", methodKey: "cash", amount: 1290, paidAt: "2026-08-22" },
]

export type AdminUser = {
  name: string
  email: string
  roleKey: "owner" | "admin" | "support" | "billing"
  lastActive: string
}

export const adminUsers: AdminUser[] = [
  { name: "ณัฐพงษ์ กิตติวัฒน์", email: "nattapong@softtechnw.com", roleKey: "owner", lastActive: "2026-08-27 09:41" },
  { name: "ศิริพร วงศ์คำ", email: "siriporn@softtechnw.com", roleKey: "admin", lastActive: "2026-08-27 08:15" },
  { name: "อนุชา แสงทอง", email: "anucha@softtechnw.com", roleKey: "support", lastActive: "2026-08-26 17:52" },
  { name: "กมลชนก ใจงาม", email: "kamonchanok@softtechnw.com", roleKey: "billing", lastActive: "2026-08-26 14:09" },
]
