"use client"

import * as React from "react"
import { Plus, Trash2 } from "lucide-react"
import { useTranslations } from "next-intl"

import { SelectOption } from "@/app/product/product_item/_components/selectoption"
import { getShippingOptions } from "@/app/shipping/_components/api"
import type { ShippingOption } from "@/app/shipping/_components/model"
import {
  parseSenderCodes,
  serializeSenderCodes,
  type SenderCode,
} from "@/app/vendor/vendor_list/_components/model"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

/**
 * sender_code_editor.tsx — ตารางรหัสผู้ส่งของสินค้า (products.sender_code) ย้ายมาจากฟอร์มผู้ขาย (01/10/2026)
 *
 * สินค้าหนึ่งตัวมีได้หลายขนส่ง แต่ละแถว = ขนส่ง (เลือกจากทะเบียน /shipping-get-option เก็บ "ชื่อ") + รหัสผู้ส่ง
 * เก็บรวมเป็น JSON string ในคอลัมน์เดียว รูปแบบเดียวกับ vendor.sender_code เดิม (parse/serialize ใช้ของหน้า vendor)
 * ใบสั่งขายอ่านค่านี้ผ่าน so.item_code -> products แล้วเลือกรหัสตาม "ขนส่งโดย"
 *
 * แถวที่กำลังแก้ถือไว้ใน state ของตัวเอง — serializeSenderCodes() ตัดแถวที่ยังว่างทิ้ง ถ้าอ่านจากสตริงตรง ๆ
 * แถวที่เพิ่งกดเพิ่มจะหายก่อนได้พิมพ์ · ค่าเริ่มต้นอ่านครั้งเดียวตอน mount ฟอร์มจึงต้องใส่ key ให้ remount ตอนเปิดใหม่
 */
export function SenderCodeEditor({
  value,
  onChange,
}: {
  /** products.sender_code ตอนเปิดฟอร์ม (JSON string) */
  value: string
  /** ค่าใหม่ที่จะเก็บลง products.sender_code — แถวที่ยังว่างถูกตัดทิ้งแล้ว */
  onChange: (value: string) => void
}) {
  const t = useTranslations("common")
  const tform = useTranslations("productitems.form")
  const tcol = useTranslations("productitems.columns")

  const [rows, setRows] = React.useState<SenderCode[]>(() => parseSenderCodes(value))

  /** บริษัทขนส่งที่ active — ดึงทุกครั้งที่ฟอร์มเปิด (ตัวนี้ mount ใหม่ทุกครั้ง) ดึงไม่ได้ = ไม่มีตัวเลือก */
  const [shippings, setShippings] = React.useState<ShippingOption[]>([])
  React.useEffect(() => {
    let cancelled = false
    getShippingOptions()
      .then((next) => {
        if (!cancelled) setShippings(next)
      })
      // ห้าม console.error — ใน dev overlay จะขึ้นเต็มจอเหมือนหน้าพัง
      .catch(() => {
        if (!cancelled) setShippings([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  /** แก้ทีเดียวทั้งสองที่ — ตาราง (ที่ผู้ใช้เห็น) กับค่าที่จะส่งไปบันทึก */
  const update = (next: SenderCode[]) => {
    setRows(next)
    onChange(serializeSenderCodes(next))
  }

  /**
   * ตัวเลือกขนส่งของแถวที่ index — ตัดขนส่งที่แถวอื่นเลือกไปแล้ว (เลือกซ้ำไม่ได้)
   * ค่าเดิมของแถวที่ไม่อยู่ในทะเบียน (ข้อมูลเก่าที่พิมพ์เอง หรือขนส่งที่ถูกปิดไป) เติมเข้าไปให้เห็น ไม่หายเงียบ ๆ
   */
  const optionsFor = (index: number) => {
    const taken = new Set(
      rows
        .filter((_, i) => i !== index)
        .map((row) => row.shipping.trim())
        .filter(Boolean)
    )
    const own = rows[index]?.shipping.trim() ?? ""
    return [
      ...shippings
        .filter((option) => !taken.has(option.name))
        .map((option) => ({ value: option.name, label: option.name })),
      ...(own && !shippings.some((option) => option.name === own)
        ? [{ value: own, label: own }]
        : []),
    ]
  }

  /** เพิ่มแถวได้ไม่เกินจำนวนขนส่งในทะเบียน (แต่ละเจ้าใช้ได้แถวเดียว) */
  const limitReached = rows.length >= shippings.length

  return (
    <div className="space-y-2">
      <Label className="text-muted-foreground w-fit text-xs">{tcol("senderCode")}</Label>
      <div className="border-border/60 bg-card overflow-hidden rounded-lg border">
        <Table>
          <TableHeader className="bg-muted/60">
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-muted-foreground pl-3 text-xs font-semibold tracking-wide uppercase">
                {tcol("shipping")}
              </TableHead>
              <TableHead className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                {tcol("senderCode")}
              </TableHead>
              <TableHead className="w-12 pr-3">
                <span className="sr-only">{t("delete")}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, index) => (
              // แถวไม่มี id ของตัวเอง คีย์จึงเป็นตำแหน่ง — ค่ามาจาก state ทั้งหมด ลบแถวกลางแล้ว reuse ช่องได้ถูกต้อง
              <TableRow key={index} className="border-border/50 hover:bg-transparent">
                <TableCell className="py-1 pl-3">
                  <SelectOption
                    id={`item-shipping-${index}`}
                    options={optionsFor(index)}
                    value={row.shipping.trim() || null}
                    onValueChange={(next) =>
                      update(
                        rows.map((current, i) =>
                          i === index ? { ...current, shipping: next ?? "" } : current
                        )
                      )
                    }
                    placeholder="..."
                    label={`${tcol("shipping")} ${index + 1}`}
                  />
                </TableCell>
                <TableCell className="py-1">
                  <Input
                    value={row.sendercode}
                    placeholder="..."
                    aria-label={`${tcol("senderCode")} ${index + 1}`}
                    onChange={(event) =>
                      update(
                        rows.map((current, i) =>
                          i === index ? { ...current, sendercode: event.target.value } : current
                        )
                      )
                    }
                  />
                </TableCell>
                <TableCell className="py-1 pr-3 text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={t("delete")}
                    onClick={() => update(rows.filter((_, i) => i !== index))}
                    className="bg-danger/12 text-danger-ink hover:bg-red-50 hover:text-red-300"
                  >
                    <Trash2 />
                  </Button>
                </TableCell>
              </TableRow>
            ))}

            {rows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={3} className="text-muted-foreground py-4 text-center text-xs">
                  {tform("noSenderCode")}
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>

        <div className="border-border/50 flex flex-wrap items-center gap-2 border-t p-2">
          {/* เพิ่มแถวได้ไม่เกินจำนวนขนส่งในทะเบียน — ครบแล้วปุ่มกดไม่ได้ พร้อมบอกเหตุผล */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={limitReached}
            onClick={() => update([...rows, { shipping: "", sendercode: "" }])}
          >
            <Plus /> {tform("addSenderCode")}
          </Button>
          {limitReached ? (
            <span className="text-muted-foreground text-xs">
              {shippings.length === 0
                ? tform("noShipping")
                : tform("senderCodeLimit", { count: shippings.length })}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  )
}
