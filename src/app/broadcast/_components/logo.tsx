"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * logo.tsx — โลโก้ช่องทางจากคอลัมน์ logo (ข้อความ path/URL) ใช้ในตารางและตัวอย่างในฟอร์ม
 *
 * ว่าง หรือ path เปิดไม่ขึ้น ไม่แสดงอะไรเลย (แบบเดียวกับรูปสินค้า) — แถวเก่ามี path ที่พิมพ์เองซึ่งอาจไม่มีไฟล์จริง
 * ที่วางจึงต้องไม่พึ่งว่ามีกล่องนี้อยู่เสมอ
 * version: อัปโหลดชื่อไฟล์เดิมซ้ำได้ URL เดิม browser จะหยิบรูปเก่าจาก cache — ส่งเลขใหม่มาหลังบันทึกจะต่อ ?v= ให้
 */
export function BroadcastLogo({
  src,
  alt,
  version,
  className,
}: {
  src: string | null | undefined
  alt: string
  version?: number
  className?: string
}) {
  const path = src?.trim() || null
  const url = path && version ? `${path}?v=${version}` : path
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
