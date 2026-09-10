"use client"

import { useTranslations } from "next-intl"

import {
  parseSenderCodes,
  type Vendor,
} from "@/app/vendor/_components/model"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

/**
 * sender_modal.tsx — กล่องดูรหัสผู้ส่งของผู้ขายรายหนึ่ง (อ่านอย่างเดียว)
 *
 * ในตารางหลักโชว์ได้แค่ปุ่ม เพราะผู้ขายหนึ่งรายมีรหัสผู้ส่งได้หลายขนส่ง ยัดลงช่องเดียวไม่พอ
 * ค่าจริงเก็บเป็น JSON string ในคอลัมน์ vendor.sender_code — แกะด้วย parseSenderCodes()
 * แก้ไขทำที่ฟอร์ม (form_modal.tsx) ที่นี่ไม่มีปุ่มบันทึก
 */
export function SenderModal({
  open,
  onOpenChange,
  vendor,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** แถวที่กดดู — undefined ตอนกล่องปิด */
  vendor?: Vendor
}) {
  const t = useTranslations("common")
  const tform = useTranslations("vendors.form")
  const tcol = useTranslations("vendors.columns")

  const rows = parseSenderCodes(vendor?.sender_code)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {/* แถบหัวไล่เฉดชุดเดียวกับแถบตัวกรองในตาราง */}
        <DialogHeader className="from-primary/12 border-border/60 -mx-4 -mt-4 rounded-t-xl border-b bg-gradient-to-r via-transparent to-transparent p-4">
          <DialogTitle>{tcol("senderCode")}</DialogTitle>
          <DialogDescription>
            {tform("senderDescription", { name: vendor?.name ?? "" })}
          </DialogDescription>
        </DialogHeader>

        <div className="border-border/60 overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-muted/60">
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-muted-foreground pl-4 text-xs font-semibold tracking-wide uppercase">
                  {tcol("shipping")}
                </TableHead>
                <TableHead className="text-muted-foreground pr-4 text-xs font-semibold tracking-wide uppercase">
                  {tcol("senderCode")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, index) => (
                // แถวไม่มี id ของตัวเอง คีย์จึงเป็นตำแหน่ง — กล่องนี้อ่านอย่างเดียว ลำดับไม่เปลี่ยน
                <TableRow
                  key={index}
                  className="border-border/50 hover:bg-accent/40 transition-colors"
                >
                  <TableCell className="py-2 pl-4 font-medium">
                    {/* ข้อมูลเก่าที่ยังไม่ได้ระบุขนส่ง มีแต่รหัส */}
                    {row.shipping || "—"}
                  </TableCell>
                  <TableCell className="py-2 pr-4">
                    <span className="bg-primary/10 text-primary rounded-md px-2 py-0.5 font-mono text-xs font-semibold">
                      {row.sendercode || "—"}
                    </span>
                  </TableCell>
                </TableRow>
              ))}

              {rows.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={2}
                    className="text-muted-foreground py-6 text-center text-xs"
                  >
                    {tform("noSenderCode")}
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>

        {/* แถบท้ายไล่เฉดชุดเดียวกับแถบแบ่งหน้าในตาราง */}
        <DialogFooter className="from-primary/12 border-border/60 bg-transparent bg-gradient-to-r via-transparent to-transparent">
          {/* กล่องนี้ดูอย่างเดียว ไม่มีอะไรให้ยกเลิก — ปุ่มจึงเป็น "ปิด" */}
          <DialogClose render={<Button type="button" variant="outline" />}>
            {t("close")}
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
