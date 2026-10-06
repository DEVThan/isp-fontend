/**
 * model.ts — รูปร่างข้อมูลของหน้าอัปเดตข้อมูลใบสั่งขาย (อัปโหลด Excel แล้วอัปเดต so.status / so.is_payment)
 *
 * ไม่มีตารางของตัวเอง (ผู้ใช้เลือกไม่เก็บประวัติ 2026-10-06) — อ่านไฟล์ที่ API แล้วเขียนลงตาราง so ตรง ๆ
 * ชื่อฟิลด์ตามที่ controller/web/so_update.py ส่งมา (snake_case)
 */

/**
 * คอลัมน์ของ so ที่หน้านี้อัปเดตได้ — หนึ่ง card ต่อหนึ่งคอลัมน์ ตรงกับ _FIELDS ใน so_update.py
 * status -> ทะเบียน status_po · is_payment -> ทะเบียน status_payment (เพิ่ม 06/10/2026)
 * shipping_code -> ข้อความอิสระ (เลขพัสดุ) ไม่มีทะเบียน — รับทุกค่าที่ไม่ว่าง ไม่มี unknown_value (เพิ่ม 06/10/2026)
 */
export const SO_UPDATE_FIELDS = ["status", "is_payment", "shipping_code"] as const
export type SoUpdateField = (typeof SO_UPDATE_FIELDS)[number]

/**
 * ผลของแต่ละแถวในไฟล์ — ตรงกับค่าคงที่ใน so_update.py
 * update = จะอัปเดต · same = สถานะเดิมอยู่แล้ว (ไม่ต้องทำอะไร) · ที่เหลือ = ไม่อัปเดต พร้อมเหตุผล
 */
export const UPDATE_RESULTS = [
  "update",
  "same",
  "not_found",
  "unknown_value",
  "empty_value",
  "duplicate",
] as const
export type UpdateResult = (typeof UPDATE_RESULTS)[number]

/** ผลที่ถือว่าเป็นปัญหา (แถวนั้นไม่ถูกอัปเดต) — หน้าเว็บนับรวมเป็น "ข้าม" */
export const PROBLEM_RESULTS: UpdateResult[] = [
  "not_found",
  "unknown_value",
  "empty_value",
  "duplicate",
]

/** หนึ่งแถวในไฟล์ หลัง API ตรวจกับฐานข้อมูลแล้ว */
export type SoUpdateRow = {
  /** เลขแถวใน Excel — ผู้ใช้กลับไปแก้ไฟล์ได้ตรงแถว */
  row: number
  so_code: string
  /** ค่าใหม่ — ตัวสะกดของทะเบียนถ้าเจอ ไม่เจอเป็นค่าดิบจากไฟล์ */
  value: string
  /** จำนวนแถว so (บรรทัดสินค้า) ของ so_code นี้ — 0 = ไม่มีในระบบ */
  lines: number
  /** ค่าปัจจุบัน (ที่ไม่ซ้ำกัน) ของคอลัมน์นั้นใน so_code นี้ */
  current: string[]
  result: UpdateResult
  /** result = duplicate: แถวแรกในไฟล์ที่ใช้ so_code นี้ไปแล้ว */
  duplicate_of?: number
}

/** จำนวนแถวต่อผล — ผลที่ไม่มีเลยไม่อยู่ในนี้ */
export type SoUpdateSummary = Partial<Record<UpdateResult, number>>

/** ผลของ POST /api/web/so-update-preview */
export type SoUpdatePreview = {
  field: SoUpdateField
  file_name: string
  /** แถวหัวตารางที่ API หาเจอ (มี so_code + คอลัมน์ของ field) */
  header_row: number
  rows: SoUpdateRow[]
  summary: SoUpdateSummary
}

/** ผลของ POST /api/web/so-update-apply */
export type SoUpdateApplied = {
  field: SoUpdateField
  /** จำนวนใบ (so_code) ที่อัปเดต */
  updated_so: number
  /** จำนวนบรรทัดสินค้า (แถว so) ที่อัปเดต */
  updated_lines: number
  summary: SoUpdateSummary
  /** แถวที่ไม่ได้อัปเดต (ตรวจซ้ำตอนยืนยัน) */
  skipped: SoUpdateRow[]
}
