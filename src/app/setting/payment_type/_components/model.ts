/**
 * model.ts — รูปร่างข้อมูลของหน้าจัดการประเภทการชำระเงิน
 *
 * ชื่อฟิลด์ยึดตามคอลัมน์ในตาราง payment_type ที่ API ส่งมาตรง ๆ (snake_case)
 * จะได้ไม่ต้องแปลงชื่อไปกลับสองทาง
 */

/** ค่า active_status ที่ถือว่าประเภทการชำระเงินเปิดใช้งาน — ตรงกับ _ACTIVE ฝั่ง API */
export const PAYMENT_TYPE_ACTIVE = "active"

/** ค่าที่ใช้แทน "ไม่เปิดใช้งาน" ในตัวกรอง — ในฐานข้อมูลอาจเป็นค่าอื่นก็ได้ จึงเทียบด้วย isPaymentTypeActive() */
export const PAYMENT_TYPE_INACTIVE = "inactive"

/**
 * หนึ่งแถวในตาราง payment_type ตามที่ POST /api/web/payment-type-get-list คืนมา
 *
 * id เป็นตัวเลข (คอลัมน์ identity ฐานข้อมูลออกให้เอง) ไม่ใช่สตริงรหัสแบบหน้าสิทธิ์ผู้ใช้
 * ตอน add จึงไม่ต้องส่ง id ไป (ส่ง 0)
 */
export type PaymentType = {
  id: number
  name: string
  detail: string | null
  active_status: string
}

/** ประเภทการชำระเงินนี้เปิดใช้งานอยู่ไหม */
export function isPaymentTypeActive(paymentType: PaymentType) {
  return paymentType.active_status === PAYMENT_TYPE_ACTIVE
}

/**
 * ผลลัพธ์ของ POST /api/web/payment-type-get-list — API ค้นหา/แบ่งหน้าให้ตั้งแต่ฝั่งเซิร์ฟเวอร์
 * total คือจำนวนหลังกรองแล้ว ไม่ใช่จำนวนทั้งตาราง
 */
export type PaymentTypeList = {
  paymenttypes: PaymentType[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

/** ตัวเลือกประเภทการชำระเงินจาก POST /api/web/payment-type-get-option — เฉพาะที่ active */
export type PaymentTypeOption = {
  id: number
  name: string
}

/** ปุ่มไหนเป็นคนเปิดฟอร์ม — ค่าเดียวกับ action ที่ POST /api/web/payment-type-action รับ */
export type PaymentTypeFormMode = "add" | "edit"

/** ค่าที่ฟอร์มถืออยู่และส่งไปบันทึก — ชื่อฟิลด์ตามคอลัมน์ในตาราง payment_type */
export type PaymentTypeFormValues = {
  name: string
  detail: string
  active_status: string
}

/**
 * ผลของ POST /api/web/payment-type-delete — คืนมาแค่แถวที่หายไป
 * (ตารางนี้เป็นทะเบียนชื่อล้วน ไม่มีตารางไหนอ้างชื่อจากมัน เส้นลบจึงไม่ต้องนับของที่ค้างใช้อยู่
 *  so.pay_by เก็บวิธีชำระเป็นข้อความของตัวเอง (COD / โอนเงิน / บัตรเครดิต) ไม่ได้ผูกกับตารางนี้)
 */
export type PaymentTypeDeleted = {
  id: number
  name: string
}
