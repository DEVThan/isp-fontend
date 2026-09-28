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
