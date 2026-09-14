"use client"

import * as React from "react"
import { ImageIcon, ImageUp, LoaderCircle, Trash2 } from "lucide-react"
import { useTranslations } from "next-intl"

import { uploadProductItemImage } from "@/app/product/product_item/_components/api"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

/**
 * image_picker.tsx — ช่องเลือกรูปสินค้า (browse ไฟล์) พร้อมรูปตัวอย่าง
 *
 * รูปเก็บที่ /uploads/products/{item_code}/thump/{ชื่อไฟล์} — ต้องรู้รหัสสินค้าก่อนถึงจะอัปโหลดได้ จึงมีสองแบบ:
 * - มี itemCode (โหมดแก้ไข): เลือกไฟล์ปุ๊บอัปโหลดทันที แล้วส่ง path กลับผ่าน onChange
 *   ระหว่างอัปโหลดบอกพ่อผ่าน onUploadingChange ให้ปิดปุ่มบันทึก ไม่งั้นบันทึกไปก่อนได้ path รูปใหม่
 * - ไม่มี itemCode (โหมดเพิ่ม — รหัสออกให้ตอนบันทึก): ถือไฟล์ไว้ผ่าน onPendingFileChange
 *   โชว์รูปตัวอย่างจากเครื่อง ฟอร์มเป็นคนอัปโหลดหลังบันทึกแถวเสร็จแล้วได้รหัสจริง
 */

/** ชนิดที่ API ยอมรับ — ตรงกับ _image_type() ฝั่ง Flask (ที่นั่นดูจากเนื้อไฟล์ ที่นี่แค่กรองในหน้าต่างเลือก) */
const ACCEPT = "image/jpeg,image/png,image/gif,image/webp"

/** ตรงกับ _IMAGE_MAX_BYTES ฝั่ง API — เช็คก่อน จะได้ไม่ต้องรออัปโหลดไฟล์ใหญ่จนเสร็จแล้วค่อยโดนปฏิเสธ */
const MAX_BYTES = 5 * 1024 * 1024

export function ImagePicker({
  id,
  label,
  value,
  itemCode,
  pendingFile,
  onChange,
  onPendingFileChange,
  onUploadingChange,
}: {
  id: string
  label: string
  /** path ที่แถวเก็บอยู่ — "" คือไม่มีรูป */
  value: string
  /** รหัสสินค้า — มี = อัปโหลดทันที · ไม่มี = ถือไฟล์ไว้ให้ฟอร์มอัปโหลดหลังบันทึก */
  itemCode?: string
  /** ไฟล์ที่เลือกไว้แต่ยังไม่ได้อัปโหลด (โหมดเพิ่ม) */
  pendingFile: File | null
  onChange: (value: string) => void
  onPendingFileChange: (file: File | null) => void
  onUploadingChange?: (uploading: boolean) => void
}) {
  const tform = useTranslations("productitems.form")
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

  /**
   * src ที่เปิดไม่ขึ้น (ข้อมูลเก่าที่ path ไม่มีไฟล์จริง) — จำตัว src ไว้ ไม่ใช่ true/false
   * พอเปลี่ยนรูปใหม่ src ไม่ตรงแล้วก็ลองแสดงใหม่เอง ไม่ต้องล้างค่าด้วย effect
   */
  const [brokenSrc, setBrokenSrc] = React.useState<string | null>(null)
  const src = previewUrl ?? value
  const showImage = Boolean(src) && brokenSrc !== src
  const hasImage = Boolean(pendingFile || value)

  const choose = async (file: File | undefined) => {
    if (!file) return
    if (file.size > MAX_BYTES) {
      setError(tform("imageTooLarge"))
      return
    }
    setError(null)

    // โหมดเพิ่ม: ยังไม่มีรหัสสินค้า ถือไฟล์ไว้ก่อน
    if (!itemCode) {
      onPendingFileChange(file)
      return
    }

    setUploading(true)
    onUploadingChange?.(true)
    try {
      onChange(await uploadProductItemImage(file, itemCode))
    } catch (cause) {
      // ข้อความจาก API บอกสาเหตุตรง ๆ (ไม่ใช่รูป / ใหญ่เกิน) — ห้าม console.error ใน dev จะขึ้นเต็มจอ
      setError(
        cause instanceof Error && cause.message
          ? cause.message
          : tform("imageUploadError")
      )
    } finally {
      setUploading(false)
      onUploadingChange?.(false)
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="border-border bg-muted/40 flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border">
        {showImage ? (
          // รูปมาจาก /uploads (rewrite ไป API) หรือ blob: ของไฟล์ในเครื่อง — next/image ใช้กับสองแบบนี้ไม่ได้ตรง ๆ
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={label}
            className="size-full object-cover"
            onError={() => setBrokenSrc(src)}
          />
        ) : (
          <ImageIcon className="text-muted-foreground size-8" />
        )}
      </div>

      <div className="grid min-w-0 gap-2">
        {/* ไม่ผูก htmlFor กับ input ไฟล์ — คลิกป้ายแล้วหน้าต่างเลือกไฟล์จะเด้ง ทั้งที่ไม่ได้กดปุ่ม */}
        <Label className="text-muted-foreground w-fit text-xs">{label}</Label>
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
              // ล้างทิ้ง ไม่งั้นเลือกไฟล์เดิมซ้ำ (เช่นหลังกดลบรูป) onChange จะไม่ยิง
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
              ? tform("imageUploading")
              : hasImage
                ? tform("imageChange")
                : tform("imageBrowse")}
          </Button>
          {hasImage ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={uploading}
              onClick={() => {
                // เอารูปออกจากสินค้าเท่านั้น ไฟล์บนเครื่อง API ยังอยู่
                onPendingFileChange(null)
                onChange("")
                setError(null)
              }}
              className="text-danger-ink hover:bg-danger/12"
            >
              <Trash2 />
              {tform("imageRemove")}
            </Button>
          ) : null}
        </div>
        <p
          className={
            error ? "text-destructive text-xs" : "text-muted-foreground text-xs"
          }
        >
          {error ??
            (pendingFile ? tform("imagePendingHint") : tform("imageHint"))}
        </p>
      </div>
    </div>
  )
}
