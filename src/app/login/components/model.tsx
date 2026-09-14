import type { ApiMenu } from "@/lib/menu"

export type LoginUser = {
  id: number
  username: string
  fullname: string | null
  /** รหัส role เช่น "UR202606-001" */
  role: string | null
  rolename: string | null
  email: string | null
  telephone: string | null
  status: string
  /**
   * เมนูเต็มที่ role นี้เข้าได้ — API join ตาราง menus มาให้แล้ว (active เท่านั้น เรียงแบบ /menu-get)
   * เดิมเป็นแค่ id (["7","6"]) ที่ต้องเอาไปแลกรายละเอียดที่ /menu-get แยกอีกรอบ
   */
  menus: ApiMenu[]
}
