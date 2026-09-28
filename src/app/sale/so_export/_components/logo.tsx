"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * logo.tsx — โลโก้ช่องทางออกอากาศ ใช้ในคอลัมน์ "ช่องทางออกอากาศ" ของตารางใบสั่งขาย
 *
 * ตาราง so เก็บช่องทางเป็น "ชื่อ" (คอลัมน์ channel) ไม่ได้ผูก id กับตาราง broadcast
 * โลโก้จึงมาจากการจับคู่ชื่อกับผลของ /broadcast-get-option (ดู channelLogos ใน table.tsx)
 * ชื่อที่ไม่มีในทะเบียน (เช่น "outbound call", "Retail", "Line OA") ไม่มีโลโก้ — เป็นเรื่องปกติ
 *
 * ว่าง หรือ path เปิดไม่ขึ้น ไม่แสดงอะไรเลย (แบบเดียวกับรูปสินค้า) ที่วางจึงต้องไม่พึ่งว่ามีกล่องนี้อยู่เสมอ
 * (คัดมาจาก broadcast/_components/logo.tsx — ไฟล์ของหน้าอยู่ในโฟลเดอร์ของหน้า · ตัด prop version ออก
 *  เพราะหน้านี้ไม่ได้อัปโหลดโลโก้ ไม่มีรูปเปลี่ยนกลางทางให้ต้องล้าง cache)
 */
export function BroadcastLogo({
  src,
  alt,
  className,
}: {
  src: string | null | undefined
  alt: string
  className?: string
}) {
  const url = src?.trim() || null
  /** จำ src ที่เปิดไม่ขึ้นไว้ ไม่ใช่ true/false — แก้ path แล้ว src ไม่ตรงก็ลองแสดงใหม่เอง */
  const [brokenSrc, setBrokenSrc] = React.useState<string | null>(null)

  if (!url || brokenSrc === url) return null

  return (
    <span
      className={cn(
        "border-border bg-card inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md border",
        className
      )}
    >
      {/* path อิสระจากคอลัมน์ ไม่รู้ขนาดล่วงหน้า — next/image ใช้ตรง ๆ ไม่ได้ */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={alt}
        className="size-full object-contain"
        onError={() => setBrokenSrc(url)}
      />
    </span>
  )
}
