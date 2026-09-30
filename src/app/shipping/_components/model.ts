/**
 * model.ts — รูปร่างข้อมูลของหน้าบริษัทขนส่ง
 *
 * ชื่อฟิลด์ยึดตามคอลัมน์ในตาราง shipping ที่ API ส่งมาตรง ๆ (snake_case)
 * จะได้ไม่ต้องแปลงชื่อไปกลับสองทาง · คอลัมน์ที่ API คืนมาดูได้ที่ _ROW_COLS ใน controller/web/shipping.py
 */

/** ค่า active_status ที่ถือว่าขนส่งเจ้านี้เปิดใช้งาน — ตรงกับ _ACTIVE ฝั่ง API */
export const SHIPPING_ACTIVE = "active"

/** ค่าที่ใช้แทน "ไม่เปิดใช้งาน" ในตัวกรอง — API นับทุกค่าที่ไม่ใช่ active เป็น inactive จึงเทียบด้วย isShippingActive() */
export const SHIPPING_INACTIVE = "inactive"

/**
 * หนึ่งแถวในตาราง shipping ตามที่ POST /api/web/shipping-get-list คืนมา
 *
 * id เป็นตัวเลข (identity ฐานข้อมูลออกให้เอง) — ตอน add ส่ง 0
 * บังคับแค่ name (code เลิกบังคับ 29/09/2026 — ช่องรหัสซ่อนไว้ก่อน) · code ถ้ามีห้ามซ้ำ (API กันเอง) · name ซ้ำได้
 * ที่เหลือไม่บังคับ — API เก็บเป็นสตริงว่างเมื่อไม่ได้ส่งมา แต่แถวเก่าอาจเป็น null
 * ไม่มีตารางไหนอ้างแถวจากที่นี่ (so.shipping_by / vendor.sender_code เก็บชื่อ/รหัสขนส่งเป็นข้อความเอง)
 */
export type Shipping = {
  id: number
  /** รหัสขนส่ง เช่น "KEX" — ตัวที่ vendor.sender_code อ้างถึง */
  code: string
  name: string
  prefix: string | null
  /** path โลโก้ที่อัปโหลดไว้ — /uploads/shipping/{id}/logo/{ชื่อไฟล์} (text) · ""/null = ยังไม่มีรูป */
  logo: string | null
  email: string | null
  tel: string | null
  address: string | null
  remark: string | null
  active_status: string
  /** ขนส่งเริ่มต้น — มีได้เจ้าเดียว ตั้งผ่าน /shipping-set-default (2026-09-30 เก็บไว้ก่อน ยังไม่มีที่ไหนใช้) */
  is_default?: boolean
}

/** ขนส่งเจ้านี้เปิดใช้งานอยู่ไหม */
export function isShippingActive(shipping: Shipping) {
  return shipping.active_status === SHIPPING_ACTIVE
}

/**
 * ผลลัพธ์ของ POST /api/web/shipping-get-list — API ค้นหา/กรอง/แบ่งหน้าให้ตั้งแต่ฝั่งเซิร์ฟเวอร์
 * total คือจำนวนหลังกรองแล้ว ไม่ใช่จำนวนทั้งตาราง
 */
export type ShippingList = {
  shippings: Shipping[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

/** ตัวเลือกขนส่งจาก POST /api/web/shipping-get-option — เฉพาะที่ active */
export type ShippingOption = {
  id: number
  code: string
  name: string
  prefix: string | null
  logo: string | null
  is_default?: boolean
}

/** ปุ่มไหนเป็นคนเปิดฟอร์ม — ค่าเดียวกับ action ที่ POST /api/web/shipping-action รับ */
export type ShippingFormMode = "add" | "edit"

/** ค่าที่ฟอร์มถืออยู่และส่งไปบันทึก — ชื่อฟิลด์ตามคอลัมน์ในตาราง shipping
 *  ส่งไปครบทุกฟิลด์เสมอ (ที่ไม่ได้กรอกเป็นสตริงว่าง) — API เขียนทับทั้งแถวทุกครั้งที่บันทึก */
export type ShippingFormValues = {
  code: string
  name: string
  prefix: string
  /** path โลโก้ — มาจากการอัปโหลด (logo_picker) ไม่ได้พิมพ์เอง · add ส่งว่างไปก่อน แล้วอัปโหลดหลังได้ id */
  logo: string
  email: string
  tel: string
  address: string
  remark: string
  active_status: string
}

/** ช่องข้อความ varchar → ความยาวสูงสุดของคอลัมน์ — ตรงกับ _MAX_LEN ฝั่ง API
 *  ใส่เป็น maxLength ให้ช่องกรอก เบราว์เซอร์จะได้กันไว้ก่อนที่ API จะตอบ 400 */
export const SHIPPING_MAX_LEN = {
  code: 100,
  name: 100,
  prefix: 10,
  email: 100,
  tel: 100,
} as const

export type ShippingTextField = keyof typeof SHIPPING_MAX_LEN

/** ช่องบังคับที่ฟอร์มตรวจ — ตรงกับที่ API บังคับ (code เลิกบังคับ 29/09/2026 — ซ่อนช่องไว้ก่อน เปิดกลับให้เติม "code") */
export type ShippingRequiredField = "name"

/** ผลของ POST /api/web/shipping-delete — คืนมาแค่แถวที่หายไป (ไม่มีของค้างใช้ให้นับ) */
export type ShippingDeleted = {
  id: number
  code: string
  name: string
}
