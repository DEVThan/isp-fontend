/**
 * model.ts — รูปร่างข้อมูลของหน้าเทมเพลตส่งออกผู้ขาย
 *
 * ชื่อฟิลด์ยึดตามคอลัมน์ในตาราง vendor_export_template ที่ API ส่งมาตรง ๆ (snake_case)
 * จะได้ไม่ต้องแปลงชื่อไปกลับสองทาง
 */

/** ค่า active_status ที่ถือว่าเทมเพลตเปิดใช้งาน — ตรงกับ _ACTIVE ฝั่ง API */
export const TEMPLATE_ACTIVE = "active"

/** ค่าที่ใช้แทน "ไม่เปิดใช้งาน" ในตัวกรอง — ในฐานข้อมูลอาจเป็นค่าอื่นก็ได้ จึงเทียบด้วย isTemplateActive() */
export const TEMPLATE_INACTIVE = "inactive"

/**
 * หนึ่งแถวในตาราง vendor_export_template ตามที่ POST /api/web/vendor-export-template-get-list คืนมา
 *
 * id เป็นตัวเลข (คอลัมน์ identity ฐานข้อมูลออกให้เอง) ตอน add จึงไม่ต้องส่ง id ไป (ส่ง 0)
 * name บังคับและห้ามซ้ำ (API กันเอง ไม่สนตัวพิมพ์เล็ก/ใหญ่) · detail กับ path ไม่บังคับ
 * API เก็บเป็นสตริงว่างเมื่อไม่ได้ส่งมา แต่แถวเก่าอาจเป็น null
 */
export type VendorExportTemplate = {
  id: number
  name: string
  detail: string | null
  /** ไฟล์ Excel ที่อัปโหลดไว้ — /uploads/vendor_export_template/{id}/template/{ชื่อไฟล์} · "" คือยังไม่มีไฟล์ */
  path: string | null
  active_status: string
  /** ชีต / แถวหัวตาราง ที่จับคู่คอลัมน์ไว้ — null = ยังไม่ได้จับคู่ (อัปโหลดไฟล์ใหม่ล้างทิ้ง) */
  sheet: string | null
  header_row: number | null
  /** บันทึกการจับคู่คอลัมน์ไว้แล้ว — ส่งออกได้ */
  mapped: boolean
}

/** เทมเพลตนี้เปิดใช้งานอยู่ไหม */
export function isTemplateActive(template: VendorExportTemplate) {
  return template.active_status === TEMPLATE_ACTIVE
}

/**
 * ผลลัพธ์ของ POST /api/web/vendor-export-template-get-list — API ค้นหา/แบ่งหน้าให้ตั้งแต่ฝั่งเซิร์ฟเวอร์
 * total คือจำนวนหลังกรองแล้ว ไม่ใช่จำนวนทั้งตาราง
 */
export type VendorExportTemplateList = {
  vendorexporttemplates: VendorExportTemplate[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

/** ตัวเลือกเทมเพลตจาก POST /api/web/vendor-export-template-get-option — เฉพาะที่ active */
export type VendorExportTemplateOption = {
  id: number
  name: string
  path: string | null
}

/** ปุ่มไหนเป็นคนเปิดฟอร์ม — ค่าเดียวกับ action ที่ POST /api/web/vendor-export-template-action รับ */
export type VendorExportTemplateFormMode = "add" | "edit"

/** ค่าที่ฟอร์มถืออยู่และส่งไปบันทึก — ชื่อฟิลด์ตามคอลัมน์ในตาราง vendor_export_template
 *  ฟิลด์ที่ไม่ได้กรอกส่งเป็นสตริงว่าง ไม่ใช่ undefined — API เขียนทับทุกฟิลด์ทุกครั้งที่บันทึก */
export type VendorExportTemplateFormValues = {
  name: string
  detail: string
  path: string
  active_status: string
}

/** ความยาวสูงสุดของ name / path — ตรงกับ _MAX_LEN ฝั่ง API (varchar(255) / varchar(100))
 *  ใส่เป็น maxLength ให้ช่องกรอกด้วย เบราว์เซอร์จะได้กันไว้ก่อนที่ API จะตอบ 400 */
export const TEMPLATE_NAME_MAX_LEN = 255
export const TEMPLATE_PATH_MAX_LEN = 100

/** ชื่อไฟล์ท้าย path — ใช้โชว์แทน path เต็มในตารางและฟอร์ม */
export function templateFileName(path: string | null | undefined) {
  return (path ?? "").split("/").pop() ?? ""
}

/**
 * ผลของ POST /api/web/vendor-export-template-delete — คืนมาแค่แถวที่หายไป
 * (ยังไม่มีตารางไหนอ้างแถวจากตารางนี้ เส้นลบจึงไม่ต้องนับของที่ค้างใช้อยู่)
 */
export type VendorExportTemplateDeleted = {
  id: number
  name: string
}

/** หนึ่งคอลัมน์ในแถวหัวตารางของไฟล์ — expr คือค่าที่จะเติม ("{name}", "{pay_by} {amount}", "Y", "" = ปล่อยว่าง) */
export type MappingColumn = {
  /** ตัวอักษรคอลัมน์ของ Excel (A, B, …) */
  column: string
  header: string
  expr: string
  /** ระบบเดาให้ (ยังไม่เคยบันทึก) — หน้าเว็บติดป้าย "ระบบเดา" ให้ผู้ใช้ตรวจ */
  guessed: boolean
}

/** ผลของ POST /api/web/vendor-export-template-mapping-get */
export type TemplateMapping = {
  id: number
  name: string
  sheets: string[]
  sheet: string
  header_row: number
  /** ตัวเลือกแถวหัวตาราง — เลขแถว + ข้อความ 4 ช่องแรก */
  rows: { row: number; text: string }[]
  columns: MappingColumn[]
  /** columns[].expr มาจากที่บันทึกไว้ (ไม่ใช่เดาใหม่) */
  saved: boolean
  /** ชื่อช่องทั้งหมดที่ใส่ใน {…} ได้ — ช่องคำนวณก่อน แล้วตามด้วยคอลัมน์ของ so */
  fields: string[]
  /** ค่าตัวอย่างจากใบสั่งขายล่าสุด ไว้โชว์ว่าแต่ละคอลัมน์จะได้อะไร */
  sample: Record<string, string | null>
}

/** ช่องที่คำนวณตอนส่งออก (ไม่ได้อยู่ในตาราง so) — ตรงกับ VIRTUAL_FIELDS ใน export_mapping.py */
export const VIRTUAL_FIELDS = [
  "no",
  "export_group_name",
  "export_date",
  "vendor_code",
  "full_address",
  "cod_amount",
] as const

/** {ช่อง} หรือ {ตาราง.ช่อง} ในนิพจน์ — ชุดเดียวกับ TOKEN ฝั่ง API (export_mapping.py) */
export const TOKEN = /\{([A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)?)\}/g

/** นิพจน์ที่เป็น token ล้วนคั่นด้วยช่องว่าง — แบบที่หน้าจับคู่สร้างจากการเลือกหลายช่อง */
export const TOKENS_ONLY = /^\{[^{}]+\}(?:\s+\{[^{}]+\})*$/

/** ตารางที่เลือกคอลัมน์มาใส่ได้ — ตรงกับ SOURCES ฝั่ง API (token เป็น "ตาราง.คอลัมน์") */
export const SOURCES = ["so", "customer", "products", "vendor"] as const

/**
 * นิพจน์ + ค่าตัวอย่าง -> ข้อความที่จะได้ (โชว์ในหน้าจับคู่เท่านั้น ของจริงคำนวณฝั่ง API)
 * token ล้วนหลายตัว ข้ามตัวที่ว่างแบบเดียวกับ fill() ฝั่ง API จะได้ไม่มีช่องว่างห้อย
 */
export function previewExpr(expr: string, sample: Record<string, string | null>) {
  if (TOKENS_ONLY.test(expr.trim())) {
    return [...expr.matchAll(TOKEN)]
      .map((match) => sample[match[1]] ?? "")
      .filter((value) => value.trim() !== "")
      .join(" ")
  }
  return expr.replace(TOKEN, (_, name: string) => sample[name] ?? "")
}
