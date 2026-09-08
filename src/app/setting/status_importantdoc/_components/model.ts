/**
 * model.ts — รูปร่างข้อมูลของหน้าจัดการเอกสารสำคัญ
 *
 * ชื่อฟิลด์ยึดตามคอลัมน์ในตาราง important_doc ที่ API ส่งมาตรง ๆ (snake_case)
 * จะได้ไม่ต้องแปลงชื่อไปกลับสองทาง
 */

/** ค่า active_status ที่ถือว่าเอกสารสำคัญเปิดใช้งาน — ตรงกับ _ACTIVE ฝั่ง API */
export const DOC_ACTIVE = "active"

/** ค่าที่ใช้แทน "ไม่เปิดใช้งาน" ในตัวกรอง — ในฐานข้อมูลอาจเป็นค่าอื่นก็ได้ จึงเทียบด้วย isImportantDocActive() */
export const DOC_INACTIVE = "inactive"

/**
 * หนึ่งแถวในตาราง important_doc ตามที่ POST /api/web/status-importantdoc-get-list คืนมา
 *
 * id เป็นตัวเลข (คอลัมน์ identity ฐานข้อมูลออกให้เอง) ไม่ใช่สตริงรหัสแบบหน้าสิทธิ์ผู้ใช้
 * ตอน add จึงไม่ต้องส่ง id ไป (ส่ง 0)
 */
export type ImportantDoc = {
  id: number
  name: string
  detail: string | null
  active_status: string
}

/** เอกสารสำคัญนี้เปิดใช้งานอยู่ไหม */
export function isImportantDocActive(doc: ImportantDoc) {
  return doc.active_status === DOC_ACTIVE
}

/**
 * ผลลัพธ์ของ POST /api/web/status-importantdoc-get-list — API ค้นหา/แบ่งหน้าให้ตั้งแต่ฝั่งเซิร์ฟเวอร์
 * total คือจำนวนหลังกรองแล้ว ไม่ใช่จำนวนทั้งตาราง
 */
export type ImportantDocList = {
  importantdocs: ImportantDoc[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

/** ตัวเลือกเอกสารสำคัญจาก POST /api/web/status-importantdoc-get-option — เฉพาะที่ active */
export type ImportantDocOption = {
  id: number
  name: string
}

/** ปุ่มไหนเป็นคนเปิดฟอร์ม — ค่าเดียวกับ action ที่ POST /api/web/status-importantdoc-action รับ */
export type ImportantDocFormMode = "add" | "edit"

/** ค่าที่ฟอร์มถืออยู่และส่งไปบันทึก — ชื่อฟิลด์ตามคอลัมน์ในตาราง important_doc */
export type ImportantDocFormValues = {
  name: string
  detail: string
  active_status: string
}

/**
 * ผลของ POST /api/web/status-importantdoc-delete — คืนมาแค่แถวที่หายไป
 * (ตารางนี้เป็นทะเบียนชื่อล้วน ไม่มีตารางไหนอ้างชื่อจากมัน เส้นลบจึงไม่ต้องนับของที่ค้างใช้อยู่)
 */
export type ImportantDocDeleted = {
  id: number
  name: string
}
