/**
 * accents.ts — สีประจำกลุ่มข้อมูลของหน้าใบสั่งขาย ใช้ในแท็บและการ์ดกลุ่มของฟอร์ม
 * ใบสั่งขาย = blue · ลูกค้า = aqua · สินค้า = yellow · การชำระเงิน = orange · การจัดส่ง = magenta
 *
 * ใช้ชุด chart-1..5 แบบเดียวกับไล่เฉดของโลโก้/ปุ่มหลัก เป็นสีตกแต่งอย่างเดียว ไม่ได้สื่อความหมาย
 * ไม่ใช้ success/warning/danger/info เพราะสีพวกนั้นสงวนไว้บอกสถานะ (ป้ายสถานะออเดอร์ กรอบแดงช่องบังคับ)
 * ตัวหนังสือยังเป็นสีปกติเสมอ สีอยู่แค่ แถบ ไอคอน และพื้นจาง ๆ — อ่านง่ายเท่าเดิมทั้งสองธีม
 * Tailwind ต้องเห็นชื่อคลาสเต็ม ๆ ในไฟล์ จึงเขียนครบทุกตัว ห้ามประกอบชื่อคลาสจากสตริง
 * (ชุดเดียวกับ product_item/_components/accents.ts — ไฟล์ของหน้าอยู่ในโฟลเดอร์ของหน้า)
 */
export const ACCENTS = {
  blue: {
    bar: "bg-chart-1",
    header: "from-chart-1/14",
    chip: "bg-chart-1/15 text-chart-1",
    icon: "text-chart-1",
    tile: "border-l-chart-1 bg-chart-1/6",
    tag: "border-chart-1/30 bg-chart-1/10",
    tab: "data-active:bg-chart-1/12 data-active:border-chart-1/40 data-active:border-b-2 data-active:border-b-chart-1",
    panel: "bg-gradient-to-b from-chart-1/6 to-transparent",
  },
  orange: {
    bar: "bg-chart-2",
    header: "from-chart-2/14",
    chip: "bg-chart-2/15 text-chart-2",
    icon: "text-chart-2",
    tile: "border-l-chart-2 bg-chart-2/6",
    tag: "border-chart-2/30 bg-chart-2/10",
    tab: "data-active:bg-chart-2/12 data-active:border-chart-2/40 data-active:border-b-2 data-active:border-b-chart-2",
    panel: "bg-gradient-to-b from-chart-2/6 to-transparent",
  },
  aqua: {
    bar: "bg-chart-3",
    header: "from-chart-3/14",
    chip: "bg-chart-3/15 text-chart-3",
    icon: "text-chart-3",
    tile: "border-l-chart-3 bg-chart-3/6",
    tag: "border-chart-3/30 bg-chart-3/10",
    tab: "data-active:bg-chart-3/12 data-active:border-chart-3/40 data-active:border-b-2 data-active:border-b-chart-3",
    panel: "bg-gradient-to-b from-chart-3/6 to-transparent",
  },
  yellow: {
    bar: "bg-chart-4",
    header: "from-chart-4/16",
    chip: "bg-chart-4/20 text-chart-4",
    icon: "text-chart-4",
    tile: "border-l-chart-4 bg-chart-4/8",
    tag: "border-chart-4/40 bg-chart-4/12",
    tab: "data-active:bg-chart-4/14 data-active:border-chart-4/50 data-active:border-b-2 data-active:border-b-chart-4",
    panel: "bg-gradient-to-b from-chart-4/8 to-transparent",
  },
  magenta: {
    bar: "bg-chart-5",
    header: "from-chart-5/14",
    chip: "bg-chart-5/15 text-chart-5",
    icon: "text-chart-5",
    tile: "border-l-chart-5 bg-chart-5/6",
    tag: "border-chart-5/30 bg-chart-5/10",
    tab: "data-active:bg-chart-5/12 data-active:border-chart-5/40 data-active:border-b-2 data-active:border-b-chart-5",
    panel: "bg-gradient-to-b from-chart-5/6 to-transparent",
  },
  neutral: {
    bar: "bg-muted-foreground/30",
    header: "from-muted",
    chip: "bg-muted text-muted-foreground",
    icon: "text-muted-foreground",
    tile: "border-l-border bg-muted/40",
    tag: "",
    tab: "",
    panel: "",
  },
} as const

export type Accent = keyof typeof ACCENTS
