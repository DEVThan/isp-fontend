/**
 * model.ts — รูปร่างข้อมูลของหน้าจัดการประเภทสินค้า
 *
 * ชื่อฟิลด์ยึดตามคอลัมน์ในตาราง product_type ที่ API ส่งมาตรง ๆ (snake_case)
 * จะได้ไม่ต้องแปลงชื่อไปกลับสองทาง
 */

/** ค่า active_status ที่ถือว่าประเภทสินค้าเปิดใช้งาน — ตรงกับ _ACTIVE ฝั่ง API */
export const TYPE_ACTIVE = "active"

/** ค่าที่ใช้แทน "ไม่เปิดใช้งาน" ในตัวกรอง — ในฐานข้อมูลอาจเป็นค่าอื่นก็ได้ จึงเทียบด้วย isProductTypeActive() */
export const TYPE_INACTIVE = "inactive"

/**
 * หนึ่งแถวในตาราง product_type ตามที่ POST /api/web/product-type-get-list คืนมา
 *
 * id เป็นตัวเลข (คอลัมน์ identity ฐานข้อมูลออกให้เอง) ไม่ใช่สตริงรหัสแบบหน้าสิทธิ์ผู้ใช้
 * ตอน add จึงไม่ต้องส่ง id ไป (ส่ง 0)
 */
export type ProductType = {
  id: number
  name: string
  detail: string | null
  active_status: string
}

/** ประเภทสินค้านี้เปิดใช้งานอยู่ไหม */
export function isProductTypeActive(type: ProductType) {
  return type.active_status === TYPE_ACTIVE
}

/**
 * ผลลัพธ์ของ POST /api/web/product-type-get-list — API ค้นหา/แบ่งหน้าให้ตั้งแต่ฝั่งเซิร์ฟเวอร์
 * total คือจำนวนหลังกรองแล้ว ไม่ใช่จำนวนทั้งตาราง
 */
export type ProductTypeList = {
  producttypes: ProductType[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

/** ตัวเลือกประเภทสินค้าจาก POST /api/web/product-type-get-option — เฉพาะที่ active */
export type ProductTypeOption = {
  id: number
  name: string
}

/** ปุ่มไหนเป็นคนเปิดฟอร์ม — ค่าเดียวกับ action ที่ POST /api/web/product-type-action รับ */
export type ProductTypeFormMode = "add" | "edit"

/** ค่าที่ฟอร์มถืออยู่และส่งไปบันทึก — ชื่อฟิลด์ตามคอลัมน์ในตาราง product_type
 *  name บังคับ (คอลัมน์ not null) และห้ามซ้ำกับแถวอื่น API เช็คให้อีกชั้น */
export type ProductTypeFormValues = {
  name: string
  detail: string
  active_status: string
}

/**
 * ผลของ POST /api/web/product-type-delete — คืนมาแค่แถวที่หายไป
 * (ตารางนี้เป็นทะเบียนชื่อล้วน ไม่มีตารางไหนอ้างแถวจากมัน — products.product_type_name เก็บชื่อเป็นข้อความ
 *  ตรง ๆ เปลี่ยนชื่อที่นี่แถวใน products ไม่เปลี่ยนตาม เส้นลบจึงไม่ต้องนับของที่ค้างใช้อยู่)
 */
export type ProductTypeDeleted = {
  id: number
  name: string
}
