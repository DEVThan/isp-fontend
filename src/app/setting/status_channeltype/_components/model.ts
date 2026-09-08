/**
 * model.ts — รูปร่างข้อมูลของหน้าจัดการช่องทางการขาย
 *
 * ชื่อฟิลด์ยึดตามคอลัมน์ในตาราง channel_type ที่ API ส่งมาตรง ๆ (snake_case)
 * จะได้ไม่ต้องแปลงชื่อไปกลับสองทาง
 */

/** ค่า active_status ที่ถือว่าช่องทางการขายเปิดใช้งาน — ตรงกับ _ACTIVE ฝั่ง API */
export const CHANNEL_ACTIVE = "active"

/** ค่าที่ใช้แทน "ไม่เปิดใช้งาน" ในตัวกรอง — ในฐานข้อมูลอาจเป็นค่าอื่นก็ได้ จึงเทียบด้วย isChannelTypeActive() */
export const CHANNEL_INACTIVE = "inactive"

/**
 * หนึ่งแถวในตาราง channel_type ตามที่ POST /api/web/status-channeltype-get-list คืนมา
 *
 * id เป็นตัวเลข (คอลัมน์ identity ฐานข้อมูลออกให้เอง) ตอน add จึงไม่ต้องส่ง id ไป (ส่ง 0)
 * logo เก็บเป็น "ข้อความ" เฉย ๆ (path / URL / dataURL) — ฝั่ง API ไม่ตรวจว่าเป็นรูปจริงไหม
 */
export type ChannelType = {
  id: number
  name: string
  logo: string | null
  detail: string | null
  active_status: string
}

/** ช่องทางการขายนี้เปิดใช้งานอยู่ไหม */
export function isChannelTypeActive(channel: ChannelType) {
  return channel.active_status === CHANNEL_ACTIVE
}

/**
 * ผลลัพธ์ของ POST /api/web/status-channeltype-get-list — API ค้นหา/แบ่งหน้าให้ตั้งแต่ฝั่งเซิร์ฟเวอร์
 * total คือจำนวนหลังกรองแล้ว ไม่ใช่จำนวนทั้งตาราง
 */
export type ChannelTypeList = {
  channeltypes: ChannelType[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

/**
 * ตัวเลือกช่องทางการขายจาก POST /api/web/status-channeltype-get-option — เฉพาะที่ active
 * logo ติดมาด้วยเพราะ dropdown ช่องทางมักโชว์โลโก้คู่กับชื่อ
 */
export type ChannelTypeOption = {
  id: number
  name: string
  logo: string | null
}

/** ปุ่มไหนเป็นคนเปิดฟอร์ม — ค่าเดียวกับ action ที่ POST /api/web/status-channeltype-action รับ */
export type ChannelTypeFormMode = "add" | "edit"

/** ค่าที่ฟอร์มถืออยู่และส่งไปบันทึก — ชื่อฟิลด์ตามคอลัมน์ในตาราง channel_type */
export type ChannelTypeFormValues = {
  name: string
  logo: string
  detail: string
  active_status: string
}

/**
 * ผลของ POST /api/web/status-channeltype-delete — แถวที่หายไป พร้อมจำนวน SO ที่ยังใช้ชื่อนี้อยู่
 * (sales_orders.channel_name เก็บเป็นข้อความชื่อ ไม่ได้ผูก id กัน ลบทะเบียนชื่อแล้วแถวใน sales_orders ไม่เปลี่ยนตาม)
 */
export type ChannelTypeDeleted = {
  id: number
  name: string
  sales_orders: number
}
