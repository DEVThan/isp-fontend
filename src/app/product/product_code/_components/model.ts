/**
 * model.ts — รูปร่างข้อมูลของหน้าจัดการรหัสสินค้า
 *
 * ชื่อฟิลด์ยึดตามคอลัมน์ในตาราง product_code ที่ API ส่งมาตรง ๆ (snake_case)
 * จะได้ไม่ต้องแปลงชื่อไปกลับสองทาง
 */

/** ค่า active_status ที่ถือว่ารหัสสินค้าเปิดใช้งาน — ตรงกับ _ACTIVE ฝั่ง API */
export const CODE_ACTIVE = "active"

/** ค่าที่ใช้แทน "ไม่เปิดใช้งาน" ในตัวกรอง — ในฐานข้อมูลอาจเป็นค่าอื่นก็ได้ จึงเทียบด้วย isProductCodeActive() */
export const CODE_INACTIVE = "inactive"

/**
 * หนึ่งแถวในตาราง product_code ตามที่ POST /api/web/product-code-get-list คืนมา
 *
 * id เป็นตัวเลข (คอลัมน์ identity ฐานข้อมูลออกให้เอง) ไม่ใช่สตริงรหัสแบบหน้าสิทธิ์ผู้ใช้
 * ตอน add จึงไม่ต้องส่ง id ไป (ส่ง 0)
 * prefix คือตัวอักษรนำหน้ารหัสสินค้า (P / D / S / F) — API เก็บเป็นตัวพิมพ์ใหญ่ให้เสมอ
 */
export type ProductCode = {
  id: number
  prefix: string
  name: string
  detail: string | null
  active_status: string
}

/** รหัสสินค้านี้เปิดใช้งานอยู่ไหม */
export function isProductCodeActive(code: ProductCode) {
  return code.active_status === CODE_ACTIVE
}

/**
 * ผลลัพธ์ของ POST /api/web/product-code-get-list — API ค้นหา/แบ่งหน้าให้ตั้งแต่ฝั่งเซิร์ฟเวอร์
 * total คือจำนวนหลังกรองแล้ว ไม่ใช่จำนวนทั้งตาราง
 */
export type ProductCodeList = {
  productcodes: ProductCode[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

/** ตัวเลือกรหัสสินค้าจาก POST /api/web/product-code-get-option — เฉพาะที่ active
 *  มี prefix มาด้วย เพราะ dropdown รหัสสินค้าต้องโชว์ตัวอักษรนำหน้าคู่กับชื่อ */
export type ProductCodeOption = {
  id: number
  prefix: string
  name: string
}

/** ปุ่มไหนเป็นคนเปิดฟอร์ม — ค่าเดียวกับ action ที่ POST /api/web/product-code-action รับ */
export type ProductCodeFormMode = "add" | "edit"

/** ค่าที่ฟอร์มถืออยู่และส่งไปบันทึก — ชื่อฟิลด์ตามคอลัมน์ในตาราง product_code
 *  prefix กับ name บังคับทั้งคู่ (คอลัมน์ not null) และห้ามซ้ำกับแถวอื่น API เช็คให้อีกชั้น */
export type ProductCodeFormValues = {
  prefix: string
  name: string
  detail: string
  active_status: string
}

/**
 * ผลของ POST /api/web/product-code-delete — คืนมาแค่แถวที่หายไป
 * (ตารางนี้เป็นทะเบียนรหัสล้วน ไม่มีตารางไหนอ้างแถวจากมัน — products.item_code เก็บรหัสเป็นข้อความตรง ๆ
 *  เส้นลบจึงไม่ต้องนับของที่ค้างใช้อยู่)
 */
export type ProductCodeDeleted = {
  id: number
  prefix: string
  name: string
}
