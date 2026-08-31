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
  /** id ของเมนูที่ role นี้เข้าได้ */
  menus: string[]
}
