/**
 * model.ts — รูปร่างข้อมูลของหน้ากลุ่มการส่งออก (ตาราง export_group)
 *
 * ชื่อฟิลด์ยึดตามคอลัมน์ในตาราง export_group ที่ API ส่งมาตรง ๆ (snake_case)
 * จะได้ไม่ต้องแปลงชื่อไปกลับสองทาง · คอลัมน์ที่ API คืนมาดูได้ที่ _ROW_COLS ใน controller/web/export_group.py
 *
 * แถวส่วนใหญ่เกิดเองตอนส่งออกใบสั่งขาย (/so_export-template สร้างชื่อ export-yyyymmddNNN ให้)
 * ไม่มี foreign key — so.export_group_name เก็บ "ชื่อ" กลุ่มเป็นข้อความ เปลี่ยนชื่อที่นี่แล้ว so ไม่เปลี่ยนตาม
 * แต่ลบกลุ่มแล้ว API คืนแถว so ของกลุ่มเป็น "ออเดอร์ใหม่" และล้าง export_group_name / shipping_code
 */

/**
 * หนึ่งแถวในตาราง export_group ตามที่ POST /api/web/export-group-get-list คืนมา
 *
 * id เป็นตัวเลข (identity ฐานข้อมูลออกให้เอง) — ตอน add ส่ง 0
 * บังคับ name (ห้ามซ้ำ ไม่สนตัวพิมพ์ — API กันเอง) กับ shiptment_type
 * created_at / updated_at มาเป็นข้อความแบบ "Tue, 30 Sep 2026 10:15:00 GMT" (Flask แปลง datetime ให้)
 */
export type ExportGroup = {
  id: number
  /** ชื่อกลุ่ม เช่น "export-20260930001" — ตัวเดียวกับ so.export_group_name */
  name: string
  detail: string | null
  /** ประเภทการจัดส่ง — สะกด shiptment ตามคอลัมน์จริงในฐานข้อมูล · กลุ่มที่ประเภทปนกันเก็บเป็น "Dropship, Pick Up" */
  shiptment_type: string
  /** ยอดรวม (integer) — กลุ่มจากการส่งออก = sum(so.amount) ปัดเป็นจำนวนเต็ม · null = ไม่ได้ใส่ */
  total_price: number | null
  created_at: string | null
  updated_at: string | null
}

/**
 * ผลลัพธ์ของ POST /api/web/export-group-get-list — API ค้นหา/กรอง/แบ่งหน้าให้ตั้งแต่ฝั่งเซิร์ฟเวอร์
 * total คือจำนวนหลังกรองแล้ว ไม่ใช่จำนวนทั้งตาราง
 */
export type ExportGroupList = {
  exportgroups: ExportGroup[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

/** ตัวเลือกกลุ่มจาก POST /api/web/export-group-get-option — ค้นจากชื่อ ได้ไม่เกิน 20 ตัว ล่าสุดก่อน */
export type ExportGroupOption = {
  id: number
  name: string
}

/** หนึ่งแถว so ในกลุ่ม ตามที่ POST /api/web/export-group-get-so คืนมา — ตัวเลขมาเป็นข้อความ ("999.0") */
export type ExportGroupSo = {
  id: number
  so_code: string
  product_name: string | null
  vendor_name: string | null
  qty: string | null
  amount: string | null
}

/** ผลของ POST /api/web/export-group-get-so — แถวของหน้านี้ · total / total_amount คิดจากทั้งกลุ่ม */
export type ExportGroupSoList = {
  so: ExportGroupSo[]
  total: number
  total_amount: string
  page: number
  per_page: number
  total_pages: number
}

/** ตัวเลือกที่มีแค่ id + name — ประเภทการจัดส่งจาก /status-shiptmenttype-get-option */
export type NamedOption = {
  id: number
  name: string
}

/** ปุ่มไหนเป็นคนเปิดฟอร์ม — ค่าเดียวกับ action ที่ POST /api/web/export-group-action รับ */
export type ExportGroupFormMode = "add" | "edit"

/** ค่าที่ฟอร์มถืออยู่และส่งไปบันทึก — ชื่อฟิลด์ตามคอลัมน์ในตาราง export_group
 *  ส่งไปครบทุกฟิลด์เสมอ — API เขียนทับทั้งแถวทุกครั้งที่บันทึก
 *  total_price ถือเป็นข้อความ (ช่องกรอก) — API รับ "12990" / "12,990" · ว่าง = null */
export type ExportGroupFormValues = {
  name: string
  detail: string
  shiptment_type: string
  total_price: string
}

/** ช่องข้อความ varchar → ความยาวสูงสุดของคอลัมน์ — ตรงกับ _MAX_LEN ฝั่ง API
 *  ใส่เป็น maxLength ให้ช่องกรอก เบราว์เซอร์จะได้กันไว้ก่อนที่ API จะตอบ 400 */
export const EXPORT_GROUP_MAX_LEN = {
  name: 100,
  shiptment_type: 50,
} as const

/** ช่องบังคับที่ฟอร์มตรวจ — ตรงกับที่ API บังคับ */
export type ExportGroupRequiredField = "name" | "shiptment_type"

/** ผลของ POST /api/web/export-group-delete — แถวที่หายไป + จำนวน so ที่ถูกคืนเป็น "ออเดอร์ใหม่" */
export type ExportGroupDeleted = {
  id: number
  name: string
  /** แถว so ของกลุ่มนี้ที่ถูกคืนสถานะ (status = ออเดอร์ใหม่, export_group_name / shipping_code = '') */
  so_reset: number
}

/**
 * วันเวลาจาก API ("Tue, 30 Sep 2026 10:15:00 GMT") → "30/09/2026 10:15"
 * อ่านตัวเลขตรง ๆ ไม่ผ่าน Date — คอลัมน์ไม่มี timezone ("GMT" เป็นแค่รูปแบบของ Flask) แปลงแล้วเวลาจะเลื่อน 7 ชั่วโมง
 */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
export function formatDateTime(value: string | null | undefined) {
  const match = /(\d{1,2}) (\w{3}) (\d{4}) (\d{2}):(\d{2})/.exec(value ?? "")
  if (!match) return value ?? ""
  const month = MONTHS.indexOf(match[2]) + 1
  if (!month) return value ?? ""
  return `${match[1].padStart(2, "0")}/${String(month).padStart(2, "0")}/${match[3]} ${match[4]}:${match[5]}`
}
