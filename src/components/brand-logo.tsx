import Image from "next/image"

import icon from "@/assets/brand/ishopping-icon.png"
import { cn } from "@/lib/utils"

/**
 * brand-logo.tsx — โลโก้ iShopping (รูปถุง) ในกรอบสี่เหลี่ยมมุมมน พื้นขาว — ใช้ที่หัวเมนูข้างและหน้า login (06/10/2026)
 *
 * ไฟล์ต้นฉบับ ishopping-logo.jpeg (1024², พื้นขาว ไม่โปร่งใส) — ตัดเฉพาะรูปถุงมาย่อเป็น 256² ที่ src/assets/brand/
 * ตัวหนังสือ "iShopping" ไม่เอามา: ขนาด 32px อ่านไม่ออก · favicon (src/app/favicon.ico) ตัดจากรูปเดียวกัน
 *
 * import แบบ static ไม่วางใน public/ — proxy.ts กันทุก path นอก api|uploads|_next|favicon.ico
 * รูปใน public/ จึงโดน redirect ไป /login ตอนยังไม่ login (หน้า login เองจะไม่มีโลโก้) · static import ได้ /_next/static/media/…
 */
export function BrandLogo({
  className,
  alt = "iShopping",
}: {
  /** ขนาดกรอบ (เช่น size-8 / size-10) + มุมมน — รูปข้างในยืดเต็มกรอบ */
  className?: string
  alt?: string
}) {
  return (
    <span
      className={cn(
        "relative flex aspect-square shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white ring-1 ring-black/5",
        className
      )}
    >
      <Image src={icon} alt={alt} fill sizes="64px" className="object-contain p-[8%]" priority />
    </span>
  )
}
