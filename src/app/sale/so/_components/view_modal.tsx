"use client"

import * as React from "react"
import {
  Package,
  ReceiptText,
  Truck,
  UserRound,
  Wallet,
  type LucideIcon,
} from "lucide-react"
import { useTranslations } from "next-intl"

import { ACCENTS, type Accent } from "@/app/sale/so/_components/accents"
import { BroadcastLogo } from "@/app/sale/so/_components/logo"
import type { So, SoOptions } from "@/app/sale/so/_components/model"
import {
  NEUTRAL_STYLE,
  PAYMENT_STYLE,
  STATUS_STYLE,
} from "@/app/sale/so/_components/status_style"
import { Badge } from "@/components/ui/badge"
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
import { cn } from "@/lib/utils"

/**
 * view_modal.tsx — ดูข้อมูลรายการในใบสั่งขายแบบอ่านอย่างเดียว (ปุ่มรูปตาในตาราง)
 *
 * แบบเดียวกับกล่องดูข้อมูลของหน้าสินค้า (product_item/_components/view_modal.tsx):
 * การ์ดสรุปบนสุด แล้วการ์ดตามกลุ่มเดียวกับแท็บในฟอร์ม ไล่ดูได้ทั้งหมดโดยไม่ต้องกดสลับแท็บ
 * จอกว้างวางสองคอลัมน์ที่เรียงการ์ดลงมาอิสระกัน (ซ้าย ใบสั่งขาย → ลูกค้า · ขวา สินค้า → ชำระเงิน → จัดส่ง)
 *
 * แถวจาก -get-list มีครบทุกคอลัมน์อยู่แล้ว ไม่ยิงดึงใหม่ · รหัสผู้ขายกับโลโก้ช่องทางมาจากตัวเลือก
 * ที่ตารางดึงไว้แล้ว (ส่งเข้ามาทาง options) — ตารางยังดึงไม่เสร็จก็แค่ไม่มีรหัส/โลโก้ ชื่อยังขึ้นครบ
 *
 * โชว์เฉพาะช่องที่ฟอร์มโชว์ — ช่องที่ถูกสั่งซ่อนในฟอร์ม (รหัสลูกค้า วันที่ชำระ/จัดส่ง/รับ/นัดหมาย
 * ไฟล์ต้นทาง เวลา sync) ไม่ขึ้นที่นี่ด้วย · ยกเว้นวันที่สร้าง ที่ตารางโชว์อยู่แล้วใต้เลขที่ใบ
 * ค่าว่างเป็นขีดสีจาง ให้ช่องที่มีข้อมูลเด่นกว่า
 */

const EMPTY = <span className="text-muted-foreground/50 font-normal">—</span>

const isBlank = (value: string | number | null | undefined) =>
  value === null || value === undefined || String(value).trim() === ""

const show = (value: string | number | null | undefined): React.ReactNode =>
  isBlank(value) ? EMPTY : String(value)

/** ตัวเลข — numeric มาเป็นข้อความ ("999.0") คั่นหลักพัน · ไม่ใช่ตัวเลขโชว์ค่าดิบตามที่เก็บ */
const num = (
  value: string | null,
  { integer = false }: { integer?: boolean } = {}
): React.ReactNode => {
  if (isBlank(value)) return EMPTY
  const parsed = Number(String(value).replace(/,/g, ""))
  if (!Number.isFinite(parsed)) return String(value)
  return parsed.toLocaleString("en-US", {
    minimumFractionDigits: integer ? 0 : 2,
    maximumFractionDigits: integer ? 0 : 2,
  })
}

/** "2026-09-24 10:59:52" → "24/09/2026 10:59" (ชุดเดียวกับตาราง) — อ่านไม่ออกโชว์ค่าดิบ */
const formatDateTime = (value: string | null) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}:\d{2})/.exec(value ?? "")
  if (match) return `${match[3]}/${match[2]}/${match[1]} ${match[4]}`
  return value
}

export function ViewModal({
  open,
  onOpenChange,
  so,
  options,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** แถวที่กำลังดู */
  so?: So
  /** ตัวเลือกที่ตารางดึงไว้แล้ว — ใช้หารหัสผู้ขายกับโลโก้ช่องทาง */
  options: SoOptions
}) {
  const t = useTranslations("common")
  const tform = useTranslations("so.form")
  const tcol = useTranslations("so.columns")

  /** ป้ายสถานะ — สีชุดเดียวกับตาราง ค่าที่ไม่รู้จักเป็นสีกลาง */
  const statusBadge = (value: string | null) => {
    if (isBlank(value)) return EMPTY
    const style = STATUS_STYLE[value!]
    const Icon = style?.icon
    return (
      <Badge
        variant="secondary"
        className={cn("gap-1 border-transparent font-medium", style?.className ?? NEUTRAL_STYLE)}
      >
        {Icon ? <Icon className="size-3 shrink-0" /> : null}
        {value}
      </Badge>
    )
  }

  const paymentBadge = (value: string | null) =>
    isBlank(value) ? (
      EMPTY
    ) : (
      <Badge
        variant="secondary"
        className={cn("border-transparent font-medium", PAYMENT_STYLE[value!] ?? NEUTRAL_STYLE)}
      >
        {value}
      </Badge>
    )

  /** รหัสผู้ขาย — so เก็บแค่ชื่อ หาจากทะเบียนด้วยชื่อ · ชื่อซ้ำ/ไม่มีในทะเบียน ไม่ใส่รหัส */
  const vendorMatches = so
    ? options.vendors.filter((vendor) => vendor.name === so.vendor_name)
    : []
  const vendorCode = vendorMatches.length === 1 ? vendorMatches[0].code : null

  const channelLogo = so
    ? options.broadcasts.find((option) => option.name === so.channel)?.logo
    : undefined

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* p-0 + หัว/ท้ายตรึง เนื้อในเลื่อนเอง — ข้อมูลยาวเกินจอ ปุ่มปิดต้องไม่หลุดลงไปล่างสุด */}
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
        <DialogHeader className="from-primary/12 border-border/60 rounded-t-xl border-b bg-gradient-to-r via-transparent to-transparent p-4">
          <DialogTitle>{tform("viewTitle")}</DialogTitle>
          <DialogDescription>{tform("viewDescription")}</DialogDescription>
        </DialogHeader>

        {/* auto-rows-max ห้ามเอาออก: กล่องสูงจำกัด เนื้อในยาวเกิน grid จะหดแถวของการ์ดสรุป (overflow-hidden)
            จนการ์ดถัดไปวาดทับ — เจอมาแล้วในกล่องดูข้อมูลของหน้าสินค้า */}
        <div className="bg-muted/30 grid min-h-0 flex-1 auto-rows-max content-start gap-4 overflow-y-auto p-4">
          {so ? (
            <>
              {/* ---- การ์ดสรุป: บอกว่ากำลังดูรายการไหน + ตัวเลขที่ดูบ่อยสุด ---- */}
              <section className="bg-card border-border/70 from-chart-1/6 to-chart-5/6 relative grid gap-4 overflow-hidden rounded-xl border bg-gradient-to-br via-transparent p-4 pt-5 shadow-sm">
                <span
                  aria-hidden
                  className="from-chart-1 via-chart-5 to-chart-2 absolute inset-x-0 top-0 h-1 bg-gradient-to-r"
                />
                <div className="grid min-w-0 gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="bg-primary/10 text-primary rounded-md px-2 py-0.5 font-mono text-xs font-semibold">
                      {so.so_code}
                    </span>
                    {so.status ? statusBadge(so.status) : null}
                    {so.create_date ? (
                      <span className="text-muted-foreground font-mono text-xs">
                        {formatDateTime(so.create_date)}
                      </span>
                    ) : null}
                  </div>
                  <h3 className="text-base leading-snug font-semibold break-words sm:text-lg">
                    {so.product_name || EMPTY}
                  </h3>
                  <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                    {so.item_code ? (
                      <span className="font-mono text-xs">{so.item_code}</span>
                    ) : null}
                    {so.item_code && so.name ? (
                      <span aria-hidden className="text-border">
                        •
                      </span>
                    ) : null}
                    {so.name ? (
                      <span className="inline-flex items-center gap-1.5">
                        <UserRound className="size-3.5" />
                        {so.name}
                      </span>
                    ) : null}
                  </div>
                </div>

                <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Stat label={tcol("qty")} accent="aqua">
                    {num(so.qty, { integer: true })}
                  </Stat>
                  <Stat label={tcol("price_per_unit")} accent="yellow">
                    {num(so.price_per_unit)}
                  </Stat>
                  <Stat label={tcol("amount")} accent="blue">
                    {num(so.amount)}
                  </Stat>
                  <Stat label={tcol("pay_amount")} accent="orange">
                    {num(so.pay_amount)}
                  </Stat>
                </dl>
              </section>

              {/* ---- การ์ดตามกลุ่ม: สองคอลัมน์ต่างคนต่างเรียงลงมา (จอเล็กต่อกันเป็นคอลัมน์เดียว) ---- */}
              <div className="grid items-start gap-4 lg:grid-cols-2">
                <div className="grid gap-4">
                  <Section icon={ReceiptText} label={tform("sectionOrder")} accent="blue">
                    <Item label={tcol("status")}>{statusBadge(so.status)}</Item>
                    <Item label={tcol("sell_by")}>{show(so.sell_by)}</Item>
                    <Item label={tcol("did")}>{show(so.did)}</Item>
                    <Item label={tcol("channel")}>
                      {isBlank(so.channel) ? (
                        EMPTY
                      ) : (
                        <span className="inline-flex items-center gap-1.5">
                          <BroadcastLogo src={channelLogo} alt={so.channel ?? ""} className="size-5" />
                          {so.channel}
                        </span>
                      )}
                    </Item>
                    <Item label={tcol("remark")} wide>
                      {isBlank(so.remark) ? (
                        EMPTY
                      ) : (
                        <span className="bg-muted/40 border-border/60 block rounded-md border px-3 py-2 font-normal whitespace-pre-wrap">
                          {so.remark}
                        </span>
                      )}
                    </Item>
                  </Section>

                  <Section icon={UserRound} label={tform("sectionCustomer")} accent="aqua">
                    <Item label={tcol("name")}>{show(so.name)}</Item>
                    <Item label={tcol("tel")} numeric>{show(so.tel)}</Item>
                    <Item label={tcol("address")} wide>{show(so.address)}</Item>
                    <Item label={tcol("subdistrict")}>{show(so.subdistrict)}</Item>
                    <Item label={tcol("district")}>{show(so.district)}</Item>
                    <Item label={tcol("province")}>{show(so.province)}</Item>
                    <Item label={tcol("zipcode")} numeric>{show(so.zipcode)}</Item>
                  </Section>
                </div>

                <div className="grid gap-4">
                  <Section icon={Package} label={tform("sectionProduct")} accent="yellow">
                    {/* ผู้ขาย — ชื่อ + รหัสจากทะเบียน (ชุดเดียวกับฟอร์มและตาราง) */}
                    <Item label={tcol("vendor_name")} wide>
                      {isBlank(so.vendor_name) ? (
                        EMPTY
                      ) : (
                        <span className="flex flex-wrap items-center gap-2">
                          {so.vendor_name}
                          {vendorCode ? (
                            <span className="text-muted-foreground font-mono text-xs font-normal">
                              {vendorCode}
                            </span>
                          ) : null}
                        </span>
                      )}
                    </Item>
                    <Item label={tcol("product_group")}>{show(so.product_group)}</Item>
                    <Item label={tcol("barcode")}>{show(so.barcode)}</Item>
                    <Item label={tcol("product_type_name")}>{show(so.product_type_name)}</Item>
                    <Item label={tcol("supplier_name")}>{show(so.supplier_name)}</Item>
                  </Section>

                  <Section icon={Wallet} label={tform("sectionPayment")} accent="orange" columns={3}>
                    <Item label={tcol("pay_by")}>{show(so.pay_by)}</Item>
                    <Item label={tcol("is_payment")}>{paymentBadge(so.is_payment)}</Item>
                    <Item label={tcol("cash_in")}>{show(so.cash_in)}</Item>
                    <Item label={tcol("amount")} numeric>{num(so.amount)}</Item>
                    <Item label={tcol("pay_amount")} numeric>{num(so.pay_amount)}</Item>
                    <Item label={tcol("discount")} numeric>{num(so.discount)}</Item>
                    <Item label={tcol("shipping")} numeric>{num(so.shipping)}</Item>
                  </Section>

                  <Section icon={Truck} label={tform("sectionShipping")} accent="magenta">
                    <Item label={tcol("shipment_type")}>{show(so.shipment_type)}</Item>
                    <Item label={tcol("shipping_by")}>{show(so.shipping_by)}</Item>
                    <Item label={tcol("shipping_code")} wide numeric>{show(so.shipping_code)}</Item>
                  </Section>
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* mx-0 mb-0: DialogFooter ติด -mx-4 -mb-4 มาชดเชย p-4 ของ DialogContent แต่กล่องนี้ p-0 */}
        <DialogFooter className="from-primary/12 border-border/60 mx-0 mb-0 border-t bg-transparent bg-gradient-to-r via-transparent to-transparent p-4">
          <DialogClose render={<Button type="button" variant="outline" />}>
            {t("close")}
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** ช่องตัวเลขเด่นในการ์ดสรุป — ป้ายเล็กด้านบน ตัวเลขใหญ่ด้านล่าง · ขอบซ้ายหนาเป็นสีประจำช่อง */
function Stat({
  label,
  accent,
  children,
}: {
  label: string
  accent: Accent
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "border-border/60 min-w-0 rounded-lg border border-l-4 px-3 py-2",
        ACCENTS[accent].tile
      )}
    >
      <dt className="text-muted-foreground truncate text-xs">{label}</dt>
      <dd className="mt-0.5 truncate font-mono text-base font-semibold tabular-nums">
        {children}
      </dd>
    </div>
  )
}

/** การ์ดหนึ่งกลุ่ม — แถบสีด้านบน + หัวการ์ดไล่เฉดสีประจำกลุ่ม มีไอคอน + ชื่อกลุ่ม คั่นเส้นจากเนื้อใน */
function Section({
  icon: Icon,
  label,
  accent,
  columns = 2,
  children,
}: {
  icon: LucideIcon
  label: string
  accent: Accent
  /** จำนวนคอลัมน์ของช่องข้อมูลบนจอ sm ขึ้นไป (จอเล็กสุดเป็น 2 เสมอ) */
  columns?: 2 | 3
  children: React.ReactNode
}) {
  const colors = ACCENTS[accent]
  return (
    <section className="bg-card border-border/70 overflow-hidden rounded-xl border shadow-xs">
      <span aria-hidden className={cn("block h-1", colors.bar)} />
      <header
        className={cn(
          "border-border/60 flex items-center gap-2.5 border-b bg-gradient-to-r via-transparent to-transparent px-4 py-2.5",
          colors.header
        )}
      >
        <span
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-md",
            colors.chip
          )}
        >
          <Icon className="size-4" />
        </span>
        <h4 className="text-sm font-semibold">{label}</h4>
      </header>
      <dl
        className={cn(
          "grid grid-cols-2 gap-x-4 gap-y-3.5 p-4",
          columns === 3 && "sm:grid-cols-3"
        )}
      >
        {children}
      </dl>
    </section>
  )
}

/** ป้ายชื่อช่อง + ค่า · wide = กินเต็มแถวของการ์ด (ค่ายาว) · numeric = เลขความกว้างเท่ากัน */
function Item({
  label,
  wide,
  numeric,
  children,
}: {
  label: string
  wide?: boolean
  numeric?: boolean
  children: React.ReactNode
}) {
  return (
    <div className={cn("min-w-0", wide && "col-span-full")}>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd
        className={cn(
          "mt-1 text-sm font-medium break-words",
          numeric && "font-mono tabular-nums"
        )}
      >
        {children}
      </dd>
    </div>
  )
}
