"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * product_image.tsx — รูปสินค้าจากคอลัมน์ image ในกรอบ ใช้ทั้งในตารางและกล่องดูข้อมูล
 *
 * ไม่มีรูป หรือ path เปิดไม่ขึ้น (แถวเก่าที่ชี้เส้น /api/web/product-item-image/... ซึ่งไม่มีแล้ว)
 * ไม่แสดงอะไรเลย ไม่มีกรอบว่าง/ไอคอนแทน (ผู้ใช้ขอ) — ที่วางต้องไม่พึ่งว่ามีกล่องนี้อยู่เสมอ
 * version: ชื่อไฟล์คือรหัสสินค้า เปลี่ยนรูปนามสกุลเดิมได้ URL เดิม browser จะหยิบรูปเก่าจากหน่วยความจำมาโชว์
 * ส่งเลขใหม่มาหลังบันทึก จะต่อ ?v= ให้โหลดใหม่ (ใช้แสดงผลเท่านั้น ไม่ได้เก็บลงคอลัมน์)
 */
export function ProductImage({
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
  const url = src?.trim() ? (version ? `${src}?v=${version}` : src) : null
  /** จำ src ที่เปิดไม่ขึ้นไว้ ไม่ใช่ true/false — เปลี่ยนรูปแล้ว src ไม่ตรงก็ลองแสดงใหม่เอง */
  const [brokenSrc, setBrokenSrc] = React.useState<string | null>(null)

  if (!url || brokenSrc === url) return null

  return (
    <div
      className={cn(
        "border-border bg-muted/40 shrink-0 overflow-hidden rounded-md border",
        className
      )}
    >
      {/* รูปมาจาก /uploads (rewrite ไป API) — next/image ใช้กับ path ที่ไม่รู้ขนาดล่วงหน้าแบบนี้ไม่ได้ตรง ๆ */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={alt}
        loading="lazy"
        className="size-full object-cover"
        onError={() => setBrokenSrc(url)}
      />
    </div>
  )
}
