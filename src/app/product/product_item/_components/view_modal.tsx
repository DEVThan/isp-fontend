"use client"

import * as React from "react"
import {
  ClipboardCheck,
  ExternalLink,
  Package,
  StickyNote,
  Tags,
  Truck,
  Wallet,
  type LucideIcon,
} from "lucide-react"
import { useTranslations } from "next-intl"

import { ACCENTS, type Accent } from "@/app/product/product_item/_components/accents"
import { getProductItemFormOptions } from "@/app/product/product_item/_components/api"
import {
  isProductItemActive,
  ITEM_NO,
  ITEM_YES,
  parseNameList,
  type NamedOption,
  type ProductItemFormOptions,
  type ProductItemRow,
} from "@/app/product/product_item/_components/model"
import { ProductImage } from "@/app/product/product_item/_components/product_image"
import { parseSenderCodes } from "@/app/vendor/_components/model"
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
 * view_modal.tsx — ดูข้อมูลสินค้าครบทุกคอลัมน์ แบบอ่านอย่างเดียว (ปุ่มรูปตาในตาราง)
 *
 * แถวที่ได้จาก -get-list มีครบทุกคอลัมน์อยู่แล้ว (รวมชื่อ/รหัสผู้ส่งของผู้ขายที่ API join มา) ไม่ต้องยิงดึงแถวใหม่
 * ไม่ใช้แท็บแบบฟอร์ม — กล่องนี้มีไว้อ่าน ไล่ดูได้ทั้งหมดโดยไม่ต้องกดสลับ
 *
 * การจัดหน้า: บนสุดเป็นการ์ดสรุป (รูป รหัส สถานะ ชื่อ และตัวเลขที่ดูบ่อยสุด 4 ตัว)
 * ที่เหลือแยกเป็นการ์ดตามกลุ่มเดียวกับแท็บในฟอร์ม มีไอคอน + หัวการ์ด
 * จอกว้างวางเป็นสองคอลัมน์ที่เรียงการ์ดลงมาอิสระกัน ไม่ใช่ตารางแถวคู่ — แถวคู่ยืดการ์ดสั้นให้สูงเท่าการ์ดยาว
 * (ราคามี 3 แถว ผู้ขายมี 6) เหลือที่ว่างโล่ง จึงแบ่งให้ความสูงรวมสองฝั่งใกล้กันแทน:
 * ซ้าย ข้อมูลหลัก → ราคา → สถานะ · ขวา ประเภทและกลุ่ม → ผู้ขาย → อื่น ๆ
 * ค่าว่างเป็นขีดสีจาง ให้ช่องที่มีข้อมูลเด่นกว่า
 *
 * สถานะ KM / MOU / KM Protocall / หนังสือยินยอมฯ เก็บเป็น id — ดึงทะเบียนครั้งแรกที่เปิดเพื่อแปลงเป็นชื่อ
 * (ยังโหลดไม่เสร็จ หรือ id ไม่อยู่ในทะเบียน โชว์เลข id ไปก่อน)
 */

/** ค่าว่าง — ขีดสีจาง ไม่งั้นช่องว่างเปล่าดูเหมือนลืมแสดง และไม่แย่งสายตาจากช่องที่มีค่า */
const EMPTY = <span className="text-muted-foreground/50 font-normal">—</span>

const isBlank = (value: string | number | null | undefined) =>
  value === null || value === undefined || String(value).trim() === ""

const show = (value: string | number | null | undefined): React.ReactNode =>
  isBlank(value) ? EMPTY : String(value)

/**
 * ตัวเลข — คั่นหลักพัน · numeric(…,2) โชว์ทศนิยม 2 ตำแหน่ง, integer ไม่มีทศนิยม
 * price / gp_percentage เป็น varchar ในฐานข้อมูล ถ้าข้างในไม่ใช่ตัวเลขโชว์ค่าดิบตามที่เก็บ
 */
const num = (
  value: string | number | null | undefined,
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

/**
 * href ของลิงก์เว็บ — มีค่าเมื่อไหร่ก็เป็นลิงก์กดได้ (ผู้ใช้ขอ)
 * - ขึ้นต้น http(s):// ใช้ตามนั้น
 * - พิมพ์มาไม่มี scheme (www.shopee.co.th/… , lin.ee/…) เติม https:// ให้ ไม่งั้นเบราว์เซอร์ถือเป็น path ในเว็บเรา
 * - scheme อื่น (javascript: / data: / ftp: …) ไม่ทำเป็นลิงก์ คืน null ให้โชว์เป็นข้อความ — กันลิงก์อันตรายจากค่าที่ใครก็พิมพ์ได้
 */
const toWebHref = (value: string | null) => {
  const text = (value ?? "").trim()
  if (!text) return null
  if (/^https?:\/\//i.test(text)) return text
  if (/^[a-z][a-z0-9+.-]*:/i.test(text)) return null
  return `https://${text.replace(/^\/+/, "")}`
}

// สีประจำกลุ่ม (ACCENTS) อยู่ใน accents.ts — ใช้ร่วมกับฟอร์ม กลุ่มเดียวกันจะได้สีเดียวกันทั้งสองกล่อง

export function ViewModal({
  open,
  onOpenChange,
  item,
  imageVersion,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** แถวที่กำลังดู — แถวจาก -get-list มีชื่อ/รหัสผู้ส่งของผู้ขายติดมาด้วย */
  item?: ProductItemRow
  /** เลขต่อท้าย URL รูปจากตาราง — ให้รูปตรงกับที่ตารางโชว์หลังเพิ่งเปลี่ยนรูป */
  imageVersion?: number
}) {
  const t = useTranslations("common")
  const tr = useTranslations("productitems")
  const tform = useTranslations("productitems.form")
  const tcol = useTranslations("productitems.columns")

  /** ทะเบียนไว้แปลง id เป็นชื่อ — ดึงครั้งเดียวต่อหน้า (ทะเบียนเปลี่ยนไม่บ่อย และ 11 เส้นต่อครั้งช้า) */
  const [options, setOptions] = React.useState<ProductItemFormOptions | null>(
    null
  )
  React.useEffect(() => {
    if (!open || options) return
    let cancelled = false
    // getProductItemFormOptions ไม่มีทาง throw — เส้นไหนล้ม ทะเบียนนั้นได้ [] แล้วโชว์เป็น id แทน
    getProductItemFormOptions().then((next) => {
      if (!cancelled) setOptions(next)
    })
    return () => {
      cancelled = true
    }
  }, [open, options])

  const nameOf = (list: NamedOption[] | undefined, id: number | null) =>
    id === null
      ? EMPTY
      : (list?.find((option) => option.id === id)?.name ?? String(id))

  /** ใช่ = ป้ายเขียว · ไม่ใช่ = ป้ายเทา (สีสถานะชุดเดียวกับ เปิดขาย/ปิดขาย) · ค่าอื่นโชว์ดิบ */
  const yesNo = (value: string | null) => {
    if (value !== ITEM_YES && value !== ITEM_NO) return show(value)
    const yes = value === ITEM_YES
    return (
      <Badge
        variant="secondary"
        className={cn(
          "border-transparent font-medium",
          yes
            ? "bg-success/12 text-success-ink hover:bg-success/12"
            : "bg-muted text-muted-foreground hover:bg-muted"
        )}
      >
        {yes ? tr("yes") : tr("no")}
      </Badge>
    )
  }

  /** ช่องเลือกได้หลายค่า (ชื่อคั่นด้วย ,) โชว์เป็นป้ายทีละชื่อ — แต่ละช่องใช้สีพื้นจาง ๆ ของตัวเอง ให้แยกกันออก */
  const tags = (raw: string | null, accent: Accent) => {
    const names = parseNameList(raw ?? "")
    if (!names.length) return EMPTY
    return (
      <span className="flex flex-wrap gap-1.5">
        {names.map((name) => (
          <Badge
            key={name}
            variant="outline"
            className={cn("font-normal", ACCENTS[accent].tag)}
          >
            {name}
          </Badge>
        ))}
      </span>
    )
  }

  /** รหัสผู้ส่งของผู้ขาย — แต่ละขนส่งเป็นป้าย "ขนส่ง | รหัส" */
  const senderCodes = (raw: string | null) => {
    const senders = parseSenderCodes(raw).filter((sender) => sender.sendercode)
    if (!senders.length) return EMPTY
    return (
      <span className="flex flex-wrap gap-1.5">
        {senders.map((sender, index) => (
          <span
            key={index}
            className="border-border inline-flex overflow-hidden rounded-md border text-xs"
          >
            {sender.shipping ? (
              <span className="bg-muted text-muted-foreground px-2 py-0.5">
                {sender.shipping}
              </span>
            ) : null}
            <span className="bg-primary/8 text-primary px-2 py-0.5 font-mono font-semibold">
              {sender.sendercode}
            </span>
          </span>
        ))}
      </span>
    )
  }

  const active = item ? isProductItemActive(item) : true

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* p-0 + หัว/ท้ายตรึง เนื้อในเลื่อนเอง — ข้อมูลยาวเกินจอ ปุ่มปิดต้องไม่หลุดลงไปล่างสุด */}
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
        <DialogHeader className="from-primary/12 border-border/60 rounded-t-xl border-b bg-gradient-to-r via-transparent to-transparent p-4">
          <DialogTitle>{tform("viewTitle")}</DialogTitle>
          <DialogDescription>{tform("viewDescription")}</DialogDescription>
        </DialogHeader>

        {/* พื้นหลังเทาอ่อน ให้การ์ดแต่ละกลุ่มลอยขึ้นมาแยกกันชัด
            auto-rows-max ห้ามเอาออก: กล่องนี้สูงจำกัด (flex-1) เนื้อในยาวเกิน grid จะหดแถวลงให้พอดีกล่อง
            การ์ดสรุปมี overflow-hidden (ตัดมุมแถบสี) ขนาดขั้นต่ำเลยเป็น 0 แถวของมันหดเหลือ 38px
            ตัวการ์ดยังสูงเท่าเดิมแต่ล้นแถว แล้วการ์ดกลุ่มแถวถัดไปวาดทับจนเห็นแค่แถบสี (วัดเจอมาแล้ว) */}
        <div className="bg-muted/30 grid min-h-0 flex-1 auto-rows-max content-start gap-4 overflow-y-auto p-4">
          {item ? (
            <>
              {/* ---- การ์ดสรุป: ตัวบอกว่ากำลังดูสินค้าตัวไหน + ตัวเลขที่ดูบ่อยสุด ---- */}
              {/* แถบไล่เฉดสีด้านบนชุดเดียวกับโลโก้ + พื้นไล่เฉดจาง ๆ ให้การ์ดสรุปเด่นกว่าการ์ดกลุ่มข้างล่าง
                  (overflow-hidden ตัดมุมแถบสี — ต้องคู่กับ auto-rows-max ของกล่องเลื่อนด้านบน) */}
              <section className="bg-card border-border/70 from-chart-1/6 to-chart-5/6 relative grid gap-4 overflow-hidden rounded-xl border bg-gradient-to-br via-transparent p-4 pt-5 shadow-sm">
                <span
                  aria-hidden
                  className="from-chart-1 via-chart-5 to-chart-2 absolute inset-x-0 top-0 h-1 bg-gradient-to-r"
                />
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  {/* ไม่มีรูป ProductImage ไม่แสดงอะไร ข้อความชิดซ้ายเอง */}
                  <ProductImage
                    src={item.image}
                    version={imageVersion}
                    alt={item.product_name}
                    className="size-28 rounded-lg"
                  />
                  <div className="grid min-w-0 flex-1 gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="bg-primary/10 text-primary rounded-md px-2 py-0.5 font-mono text-xs font-semibold">
                        {item.item_code}
                      </span>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "border-transparent font-medium",
                          active
                            ? "bg-success/12 text-success-ink hover:bg-success/12"
                            : "bg-muted text-muted-foreground hover:bg-muted"
                        )}
                      >
                        {active ? tr("active") : tr("inactive")}
                      </Badge>
                    </div>
                    <h3 className="text-base leading-snug font-semibold break-words sm:text-lg">
                      {item.product_name}
                    </h3>
                    {/* ประเภท · การจัดส่ง — บอกคร่าว ๆ ว่าเป็นสินค้าแบบไหน ไม่ต้องเลื่อนลงไปหา */}
                    {item.product_type_name || item.shipment_type ? (
                      <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                        {item.product_type_name ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Tags className="size-3.5" />
                            {item.product_type_name}
                          </span>
                        ) : null}
                        {item.product_type_name && item.shipment_type ? (
                          <span aria-hidden className="text-border">
                            •
                          </span>
                        ) : null}
                        {item.shipment_type ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Truck className="size-3.5" />
                            {item.shipment_type}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>

                <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Stat label={tcol("price")} accent="blue">{num(item.price)}</Stat>
                  <Stat label={tcol("cost")} accent="orange">{num(item.cost)}</Stat>
                  <Stat label={tcol("cogs")} accent="magenta">{num(item.cogs)}</Stat>
                  <Stat label={tcol("qty")} accent="aqua">
                    {num(item.qty)}
                    {item.unit ? (
                      <span className="text-muted-foreground ml-1 font-sans text-xs font-normal">
                        {item.unit}
                      </span>
                    ) : null}
                  </Stat>
                </dl>
              </section>

              {/* ---- การ์ดตามกลุ่ม: สองคอลัมน์ต่างคนต่างเรียงลงมา (จอเล็กต่อกันเป็นคอลัมน์เดียว) ---- */}
              <div className="grid items-start gap-4 lg:grid-cols-2">
                <div className="grid gap-4">
                  <Section icon={Package} label={tform("sectionMain")} accent="blue">
                    <Item label={tcol("product_group")}>{show(item.product_group)}</Item>
                    <Item label={tcol("barcode")}>{show(item.barcode)}</Item>
                    <Item label={tcol("unit")}>{show(item.unit)}</Item>
                    <Item label={tcol("qty")} numeric>{num(item.qty)}</Item>
                  </Section>

                  <Section icon={Wallet} label={tform("sectionPrice")} accent="orange" columns={3}>
                    <Item label={tcol("price")} numeric>{num(item.price)}</Item>
                    <Item label={tcol("cost")} numeric>{num(item.cost)}</Item>
                    <Item label={tcol("cogs")} numeric>{num(item.cogs)}</Item>
                    <Item label={tcol("gp_percentage")} numeric>{num(item.gp_percentage)}</Item>
                    <Item label={tcol("gp_amout")} numeric>{num(item.gp_amout)}</Item>
                    <Item label={tcol("cm_percentage")} numeric>{num(item.cm_percentage)}</Item>
                    <Item label={tcol("cm_bath")} numeric>{num(item.cm_bath)}</Item>
                    <Item label={tcol("check1")} numeric>{num(item.check1)}</Item>
                    <Item label={tcol("check2")} numeric>{num(item.check2)}</Item>
                  </Section>

                  <Section icon={ClipboardCheck} label={tform("sectionStatus")} accent="magenta">
                    <Item label={tcol("status_km")}>{nameOf(options?.kms, item.status_km)}</Item>
                    <Item label={tcol("status_mou")}>{nameOf(options?.mous, item.status_mou)}</Item>
                    <Item label={tcol("status_km_protocall")}>
                      {nameOf(options?.kmProtocalls, item.status_km_protocall)}
                    </Item>
                    <Item label={tcol("status_line_my_shop")}>{show(item.status_line_my_shop)}</Item>
                    <Item label={tcol("status_deduct_stock")}>{yesNo(item.status_deduct_stock)}</Item>
                    <Item label={tcol("status_allow_oversell")}>{yesNo(item.status_allow_oversell)}</Item>
                    <Item label={tcol("status_tv_program_footage")} wide>
                      {nameOf(options?.tvProgramFootages, item.status_tv_program_footage)}
                    </Item>
                    <Item label={tcol("channel_type")} wide>{tags(item.channel_type, "aqua")}</Item>
                    <Item label={tcol("important_doc")} wide>{tags(item.important_doc, "orange")}</Item>
                  </Section>
                </div>

                <div className="grid gap-4">
                  <Section icon={Tags} label={tform("sectionGroup")} accent="yellow">
                    <Item label={tcol("product_type_name")}>{show(item.product_type_name)}</Item>
                    <Item label={tcol("item_group")}>{show(item.item_group)}</Item>
                    <Item label={tcol("l_group")}>{show(item.l_group)}</Item>
                    <Item label={tcol("m_group")}>{show(item.m_group)}</Item>
                  </Section>

                  <Section icon={Truck} label={tform("sectionSupply")} accent="aqua">
                    {/* ผู้ขาย + รหัสผู้ส่งอยู่ด้วยกันในกรอบย่อย — รหัสผู้ส่งเป็นของผู้ขาย ไม่ใช่ของสินค้า */}
                    <div className="border-border/60 bg-muted/30 col-span-full grid gap-3 rounded-lg border p-3">
                      {/* vendor มาจากทะเบียนผู้ขายที่ API join ด้วย vendo_code — ไม่เอา supplier_name มาแทน (คนละช่องกันแล้ว) */}
                      <Item label={tcol("vendor")} wide>
                        {isBlank(item.vendor_name ?? item.vendo_code) ? (
                          EMPTY
                        ) : (
                          <span className="flex flex-wrap items-center gap-2">
                            {item.vendor_name ?? item.vendo_code}
                            {item.vendo_code ? (
                              <span className="text-muted-foreground font-mono text-xs font-normal">
                                {item.vendo_code}
                              </span>
                            ) : null}
                          </span>
                        )}
                      </Item>
                      <Item label={tcol("senderCode")} wide>
                        {senderCodes(item.vendor_sender_code)}
                      </Item>
                    </div>
                    <Item label={tcol("supplier_name")}>{show(item.supplier_name)}</Item>
                    <Item label={tcol("shipment_type")}>{show(item.shipment_type)}</Item>
                    <Item label={tcol("delivery_fee")} numeric>
                      {num(item.delivery_fee, { integer: true })}
                    </Item>
                    <Item label={tcol("weight_kg")} numeric>{num(item.weight_kg)}</Item>
                    <Item label={tcol("dimension_cm")} numeric>
                      {num(item.dimension_cm, { integer: true })}
                    </Item>
                    {/* ขนาดกล่องสามด้านอยู่แถวเดียวกัน อ่านเป็น กว้าง × สูง × ลึก */}
                    <div className="col-span-full grid grid-cols-3 gap-x-4">
                      <Item label={tcol("avg_box_w_mm")} numeric>{num(item.avg_box_w_mm)}</Item>
                      <Item label={tcol("avg_box_h_mm")} numeric>{num(item.avg_box_h_mm)}</Item>
                      <Item label={tcol("avg_box_d_mm")} numeric>{num(item.avg_box_d_mm)}</Item>
                    </div>
                    <Item label={tcol("avg_deelivery_cost")} numeric>
                      {num(item.avg_deelivery_cost)}
                    </Item>
                  </Section>

                  <Section icon={StickyNote} label={tform("sectionOther")} accent="neutral">
                    <Item label={tcol("md_name")} wide>{show(item.md_name)}</Item>
                    <Item label={tcol("link_web")} wide>
                      {toWebHref(item.link_web) ? (
                        // เปิดแท็บใหม่เสมอ — noopener noreferrer กันหน้าปลายทางเข้าถึง/พาหน้านี้เปลี่ยนไปที่อื่น
                        <a
                          href={toWebHref(item.link_web)!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary inline-flex items-center gap-1 break-all hover:underline"
                        >
                          {item.link_web!.trim()}
                          <ExternalLink className="size-3.5 shrink-0" />
                        </a>
                      ) : (
                        show(item.link_web)
                      )}
                    </Item>
                    <Item label={tcol("remark")} wide>
                      {isBlank(item.remark) ? (
                        EMPTY
                      ) : (
                        <span className="bg-muted/40 border-border/60 block rounded-md border px-3 py-2 font-normal whitespace-pre-wrap">
                          {item.remark}
                        </span>
                      )}
                    </Item>
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
