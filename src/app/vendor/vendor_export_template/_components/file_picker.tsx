"use client"

import * as React from "react"
import { FileSpreadsheet, FileUp, LoaderCircle } from "lucide-react"
import { useTranslations } from "next-intl"

import { uploadVendorExportTemplateFile } from "@/app/vendor/vendor_export_template/_components/api"
import { templateFileName } from "@/app/vendor/vendor_export_template/_components/model"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

/**
 * file_picker.tsx — ช่องเลือกไฟล์เทมเพลต Excel (browse ไฟล์) แบบเดียวกับ logo_picker ของ broadcast
 *
 * ไฟล์เก็บที่ /uploads/vendor_export_template/{id}/template/{ชื่อไฟล์} — API ลบไฟล์เดิมทิ้งและเขียนคอลัมน์ path ให้เลย
 * ต้องรู้ id ก่อนถึงจะอัปโหลดได้ จึงมีสองแบบ:
 * - มี templateId (โหมดแก้ไข): เลือกไฟล์ปุ๊บอัปโหลดทันที แล้วส่ง path กลับผ่าน onChange
 *   ระหว่างอัปโหลดบอกพ่อผ่าน onUploadingChange ให้ปิดปุ่มบันทึก ไม่งั้นบันทึกไปก่อนได้ path ไฟล์ใหม่
 * - ไม่มี templateId (โหมดเพิ่ม): ถือไฟล์ไว้ผ่าน onPendingFileChange
 *   ฟอร์มเป็นคนอัปโหลดหลังบันทึกแถวเสร็จแล้วได้ id จริง
 * ไฟล์บังคับ (ผู้ใช้ขอ 2026-09-28) — ฟอร์มเป็นคนตรวจแล้วส่ง required/error มา · ยังไม่มีปุ่มลบไฟล์ — เปลี่ยนได้อย่างเดียว
 */

/** นามสกุลที่ API ยอมรับ — ตรงกับ _EXCEL_EXTS ฝั่ง Flask (ที่นั่นตรวจเนื้อไฟล์ด้วย ที่นี่แค่กรองในหน้าต่างเลือก) */
const EXTENSIONS = ["xlsx", "xlsm", "xls"]
const ACCEPT = [
  ...EXTENSIONS.map((ext) => `.${ext}`),
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel.sheet.macroEnabled.12",
  "application/vnd.ms-excel",
].join(",")

/** ตรงกับ _FILE_MAX_BYTES ฝั่ง API — เช็คก่อน จะได้ไม่ต้องรออัปโหลดไฟล์ใหญ่จนเสร็จแล้วค่อยโดนปฏิเสธ */
const MAX_BYTES = 10 * 1024 * 1024

export function FilePicker({
  id,
  label,
  required,
  error: requiredError,
  value,
  templateId,
  pendingFile,
  onChange,
  onPendingFileChange,
  onUploadingChange,
}: {
  id: string
  label: string
  /** ใส่ดอกจันที่ป้าย ให้รู้ตั้งแต่ก่อนกดบันทึกว่าต้องมีไฟล์ */
  required?: boolean
  /** ข้อความจากฟอร์มตอนกดบันทึกแล้วยังไม่มีไฟล์ — ขึ้นกรอบแดง */
  error?: string
  /** path ที่แถวเก็บอยู่ — "" คือยังไม่มีไฟล์ */
  value: string
  /** id ของเทมเพลต — มี = อัปโหลดทันที · ไม่มี = ถือไฟล์ไว้ให้ฟอร์มอัปโหลดหลังบันทึก */
  templateId?: number
  /** ไฟล์ที่เลือกไว้แต่ยังไม่ได้อัปโหลด (โหมดเพิ่ม) */
  pendingFile: File | null
  onChange: (value: string) => void
  onPendingFileChange: (file: File | null) => void
  onUploadingChange?: (uploading: boolean) => void
}) {
  const tform = useTranslations("vendorexporttemplates.form")
  const input = React.useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const fileName = pendingFile?.name ?? templateFileName(value)

  const choose = async (file: File | undefined) => {
    if (!file) return
    // หน้าต่างเลือกไฟล์ยังให้เปลี่ยนเป็น "ทุกไฟล์" ได้ — กันนามสกุลอื่นไว้ก่อนถึง API
    const ext = file.name.split(".").pop()?.toLowerCase() ?? ""
    if (!EXTENSIONS.includes(ext)) {
      setError(tform("fileNotExcel"))
      return
    }
    if (file.size > MAX_BYTES) {
      setError(tform("fileTooLarge"))
      return
    }
    setError(null)

    // โหมดเพิ่ม: ยังไม่มี id ถือไฟล์ไว้ก่อน
    if (!templateId) {
      onPendingFileChange(file)
      return
    }

    setUploading(true)
    onUploadingChange?.(true)
    try {
      onChange(await uploadVendorExportTemplateFile(file, templateId))
    } catch (cause) {
      // ข้อความจาก API บอกสาเหตุตรง ๆ (ไม่ใช่ Excel / ใหญ่เกิน) — ห้าม console.error ใน dev จะขึ้นเต็มจอ
      setError(
        cause instanceof Error && cause.message
          ? cause.message
          : tform("fileUploadError")
      )
    } finally {
      setUploading(false)
      onUploadingChange?.(false)
    }
  }

  return (
    <div className="grid gap-2">
      {/* ไม่ผูก htmlFor กับ input ไฟล์ — คลิกป้ายแล้วหน้าต่างเลือกไฟล์จะเด้ง ทั้งที่ไม่ได้กดปุ่ม */}
      <Label className="text-muted-foreground w-fit text-xs">
        {label}
        {required ? (
          <span aria-hidden className="text-destructive -ml-1.5">
            *
          </span>
        ) : null}
      </Label>
      <div
        className={cn(
          "border-border bg-muted/30 flex items-center gap-3 rounded-lg border p-2",
          requiredError &&
            "border-destructive ring-destructive/20 dark:border-destructive/50 dark:ring-destructive/40 ring-3"
        )}
      >
        <div className="bg-success/12 text-success-ink flex size-10 shrink-0 items-center justify-center rounded-md">
          <FileSpreadsheet className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          {fileName ? (
            pendingFile ? (
              <p className="truncate text-sm font-medium">{fileName}</p>
            ) : (
              // ไฟล์ที่อัปโหลดแล้ว กดชื่อเพื่อดาวน์โหลด (/uploads/* rewrite ไป API ซึ่งส่งเป็น attachment)
              <a
                href={value}
                download
                className="text-primary block truncate text-sm font-medium hover:underline"
              >
                {fileName}
              </a>
            )
          ) : (
            <p className="text-muted-foreground text-sm">{tform("fileEmpty")}</p>
          )}
        </div>
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
          className="shrink-0"
        >
          {uploading ? <LoaderCircle className="animate-spin" /> : <FileUp />}
          {uploading
            ? tform("fileUploading")
            : fileName
              ? tform("fileChange")
              : tform("fileBrowse")}
        </Button>
      </div>
      {/* ข้อผิดพลาดของไฟล์เอง (ไม่ใช่ Excel / ใหญ่เกิน / อัปโหลดล้ม) มาก่อน "ต้องกรอก" จากฟอร์ม */}
      <p className={error || requiredError ? "text-destructive text-xs" : "text-muted-foreground text-xs"}>
        {error ??
          requiredError ??
          (pendingFile ? tform("filePendingHint") : tform("fileHint"))}
      </p>
    </div>
  )
}
