"use client"

import * as React from "react"
import { ImageIcon, ImageUp, LoaderCircle } from "lucide-react"
import { useTranslations } from "next-intl"

import { uploadBroadcastLogo } from "@/app/broadcast/_components/api"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

/**
 * logo_picker.tsx — ช่องเลือกโลโก้ช่องทาง (browse ไฟล์) พร้อมรูปตัวอย่าง แบบเดียวกับรูปสินค้า
 *
 * โลโก้เก็บที่ /uploads/broadcast/{id}/logo/{ชื่อไฟล์} — API ลบรูปเดิมทิ้งและเขียนคอลัมน์ logo ให้เลย
 * ต้องรู้ id ก่อนถึงจะอัปโหลดได้ จึงมีสองแบบ:
 * - มี broadcastId (โหมดแก้ไข): เลือกไฟล์ปุ๊บอัปโหลดทันที แล้วส่ง path กลับผ่าน onChange
 *   ระหว่างอัปโหลดบอกพ่อผ่าน onUploadingChange ให้ปิดปุ่มบันทึก ไม่งั้นบันทึกไปก่อนได้ path รูปใหม่
 * - ไม่มี broadcastId (โหมดเพิ่ม): ถือไฟล์ไว้ผ่าน onPendingFileChange โชว์ตัวอย่างจากเครื่อง
 *   ฟอร์มเป็นคนอัปโหลดหลังบันทึกแถวเสร็จแล้วได้ id จริง
 * โลโก้ไม่บังคับ (ผู้ใช้ขอ 2026-09-16) · ยังไม่มีปุ่มลบรูป — เปลี่ยนได้อย่างเดียว
 */

/** ชนิดที่ API ยอมรับ — ตรงกับ _image_type() ฝั่ง Flask (ที่นั่นดูจากเนื้อไฟล์ ที่นี่แค่กรองในหน้าต่างเลือก) */
const ACCEPT = "image/jpeg,image/png,image/gif,image/webp"

/** ตรงกับ _IMAGE_MAX_BYTES ฝั่ง API — เช็คก่อน จะได้ไม่ต้องรออัปโหลดไฟล์ใหญ่จนเสร็จแล้วค่อยโดนปฏิเสธ */
const MAX_BYTES = 5 * 1024 * 1024

export function LogoPicker({
  id,
  label,
  value,
  broadcastId,
  pendingFile,
  onChange,
  onPendingFileChange,
  onUploadingChange,
}: {
  id: string
  label: string
  /** path ที่แถวเก็บอยู่ — "" คือไม่มีรูป */
  value: string
  /** id ของช่องทาง — มี = อัปโหลดทันที · ไม่มี = ถือไฟล์ไว้ให้ฟอร์มอัปโหลดหลังบันทึก */
  broadcastId?: number
  /** ไฟล์ที่เลือกไว้แต่ยังไม่ได้อัปโหลด (โหมดเพิ่ม) */
  pendingFile: File | null
  onChange: (value: string) => void
  onPendingFileChange: (file: File | null) => void
  onUploadingChange?: (uploading: boolean) => void
}) {
  const tform = useTranslations("broadcasts.form")
  const input = React.useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  /** รูปตัวอย่างของไฟล์ที่ยังไม่ได้อัปโหลด — คืน URL ทิ้งเมื่อเปลี่ยนไฟล์/ปิดกล่อง ไม่งั้นค้างในหน่วยความจำ */
  const previewUrl = React.useMemo(
    () => (pendingFile ? URL.createObjectURL(pendingFile) : null),
    [pendingFile]
  )
  React.useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    },
    [previewUrl]
  )

  /** src ที่เปิดไม่ขึ้น (แถวเก่าที่ path ไม่มีไฟล์จริง) — จำตัว src ไว้ เปลี่ยนรูปแล้วลองแสดงใหม่เอง */
  const [brokenSrc, setBrokenSrc] = React.useState<string | null>(null)
  /** อัปโหลดชื่อไฟล์เดิมซ้ำได้ path เดิมเป๊ะ — ต่อ ?v= หลังอัปโหลดให้ <img> โหลดใหม่ (แสดงผลเท่านั้น) */
  const [version, setVersion] = React.useState<number | null>(null)
  const src = previewUrl ?? (value && version ? `${value}?v=${version}` : value)
  const showImage = Boolean(src) && brokenSrc !== src
  const hasImage = Boolean(pendingFile || value)

  const choose = async (file: File | undefined) => {
    if (!file) return
    if (file.size > MAX_BYTES) {
      setError(tform("logoTooLarge"))
      return
    }
    setError(null)

    // โหมดเพิ่ม: ยังไม่มี id ถือไฟล์ไว้ก่อน
    if (!broadcastId) {
      onPendingFileChange(file)
      return
    }

    setUploading(true)
    onUploadingChange?.(true)
    try {
      onChange(await uploadBroadcastLogo(file, broadcastId))
      setVersion(Date.now())
    } catch (cause) {
      // ข้อความจาก API บอกสาเหตุตรง ๆ (ไม่ใช่รูป / ใหญ่เกิน) — ห้าม console.error ใน dev จะขึ้นเต็มจอ
      setError(
        cause instanceof Error && cause.message
          ? cause.message
          : tform("logoUploadError")
      )
    } finally {
      setUploading(false)
      onUploadingChange?.(false)
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="border-border bg-muted/40 flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border">
        {showImage ? (
          // รูปมาจาก /uploads (rewrite ไป API) หรือ blob: ของไฟล์ในเครื่อง — next/image ใช้กับสองแบบนี้ไม่ได้ตรง ๆ
          // โลโก้ใช้ object-contain ไม่ตัดขอบ (ต่างจากรูปสินค้า)
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={label}
            className="size-full object-contain p-1"
            onError={() => setBrokenSrc(src)}
          />
        ) : (
          <ImageIcon className="text-muted-foreground size-7" />
        )}
      </div>

      <div className="grid min-w-0 gap-2">
        {/* ไม่ผูก htmlFor กับ input ไฟล์ — คลิกป้ายแล้วหน้าต่างเลือกไฟล์จะเด้ง ทั้งที่ไม่ได้กดปุ่ม */}
        <Label className="text-muted-foreground w-fit text-xs">
          {label}
        </Label>
        <div className="flex flex-wrap gap-2">
          {/* input จริงซ่อนไว้ (sr-only ยังโฟกัสด้วยคีย์บอร์ดได้) ให้ปุ่มเป็นตัวเปิดหน้าต่างเลือกไฟล์ */}
          <input
            ref={input}
            id={id}
            type="file"
            accept={ACCEPT}
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0]
              // ล้างทิ้ง ไม่งั้นเลือกไฟล์เดิมซ้ำ onChange จะไม่ยิง
              event.target.value = ""
              void choose(file)
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => input.current?.click()}
          >
            {uploading ? <LoaderCircle className="animate-spin" /> : <ImageUp />}
            {uploading
              ? tform("logoUploading")
              : hasImage
                ? tform("logoChange")
                : tform("logoBrowse")}
          </Button>
        </div>
        <p className={error ? "text-destructive text-xs" : "text-muted-foreground text-xs"}>
          {error ?? (pendingFile ? tform("logoPendingHint") : tform("logoHint"))}
        </p>
      </div>
    </div>
  )
}
