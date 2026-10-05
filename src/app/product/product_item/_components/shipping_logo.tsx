"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * shipping_logo.tsx — โลโก้บริษัทขนส่ง ใช้กับ "ขนส่งโดย" (products.shipping_by) ในตาราง ฟอร์ม และหน้าดูสินค้า
 *
 * products.shipping_by เก็บ "ชื่อ" ไม่ได้ผูก id กับตาราง shipping
 * โลโก้จึงมาจากการจับคู่ชื่อกับผลของ /shipping-get-option · ขนส่งที่ไม่มีโลโก้/ถูกปิดไปแล้ว ไม่มีรูป — เป็นเรื่องปกติ
 *
 * ว่าง หรือ path เปิดไม่ขึ้น ไม่แสดงอะไรเลย (แบบเดียวกับรูปสินค้า) ที่วางจึงต้องไม่พึ่งว่ามีกล่องนี้อยู่เสมอ
 * (คัดมาจาก sale/so/_components/logo.tsx — ไฟล์ของหน้าอยู่ในโฟลเดอร์ของหน้า)
 */
export function ShippingLogo({
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
