"use client"

import * as React from "react"
import {
  CircleCheck,
  Clock,
  ExternalLink,
  LoaderCircle,
  MapPin,
  PackageCheck,
  RotateCw,
  TriangleAlert,
  Truck,
  UserRound,
} from "lucide-react"
import { useTranslations } from "next-intl"

import { ApiError } from "@/app/login/components/api"
import { trackKex } from "@/app/so_tracking/_components/api"
import { BroadcastLogo } from "@/app/so_tracking/_components/logo"
import type { KexTracking } from "@/app/so_tracking/_components/model"
import { Alert, AlertContent, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
 * tracking_modal.tsx — สถานะการจัดส่งพัสดุ (16/10/2026 ผู้ใช้ขอ · กดป้ายเลขพัสดุในตาราง)
 *
 * เปิดได้เฉพาะแถวที่ขนส่งโดย KERRY — ยิง POST /tracking-kex ส่งเลขพัสดุไป API ดึงสดจากเว็บ KEX ทุกครั้งที่เปิด
 * ขนส่งอื่นยังไม่มี API ตารางจึงไม่ให้กด (ดู isKerry ใน table.tsx)
 *
 * ตารางใส่ key = เลขพัสดุ ให้ทุกครั้งที่เปิดเลขใหม่ได้ state ใหม่ (กำลังโหลด) ไม่ต้องล้างค่าใน effect
 * KEX ตอบช้าได้ถึง ~20 วิ — โชว์ตัวหมุนระหว่างรอ · ไม่พบเลข (404) / KEX ล่ม (502) แยกข้อความ + ปุ่มลองใหม่
 * ปุ่มลองใหม่มีทั้ง 404 ด้วย — เว็บ KEX ตอบ "ไม่พบ" ชั่วคราวกับเลขที่มีจริงได้ (ISPI000035423 ได้ 200 แล้ว 404 ติดกัน)
 */

/** "2026-10-10T13:33:53" → "10/10/2026 13:33" — อ่านไม่ออกโชว์ค่าดิบ */
const formatDateTime = (value: string | null) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}:\d{2})/.exec(value ?? "")
  if (match) return `${match[3]}/${match[2]}/${match[1]} ${match[4]}`
  return value
}

type Load =
  | { state: "loading" }
  | { state: "ok"; data: KexTracking }
  | { state: "error"; code: number; message: string }

export function TrackingModal({
  open,
  onOpenChange,
  trackingNo,
  soCode,
  carrier,
  carrierLogo,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** เลขพัสดุ (so.shipping_code) */
  trackingNo: string
  soCode?: string
  /** ชื่อขนส่งตามแถว (so.shipping_by) */
  carrier?: string | null
  carrierLogo?: string
}) {
  const t = useTranslations("common")
  const tt = useTranslations("so_tracking.tracking")

  const [load, setLoad] = React.useState<Load>({ state: "loading" })
  /** เพิ่มทีละหนึ่งตอนกดลองใหม่ — effect ยิงใหม่ตามค่านี้ */
  const [attempt, setAttempt] = React.useState(0)

  React.useEffect(() => {
    if (!open || !trackingNo) return
    let cancelled = false
    trackKex(trackingNo)
      .then((data) => {
        if (!cancelled) setLoad({ state: "ok", data })
      })
      .catch((error: unknown) => {
        if (cancelled) return
        const code = error instanceof ApiError ? error.code : 0
        setLoad({ state: "error", code, message: error instanceof Error ? error.message : String(error) })
      })
    return () => {
      cancelled = true
    }
  }, [open, trackingNo, attempt])

  const retry = () => {
    setLoad({ state: "loading" })
    setAttempt((n) => n + 1)
  }

  const data = load.state === "ok" ? load.data : null
  const steps = data?.steps ?? []
  const current = data?.current_idx ?? -1
  // KEX ส่ง URL รูปเดียวกันซ้ำมาได้ (เจอ ISPI000035423) — ตัดซ้ำก่อน ไม่งั้นรูปขึ้นสองใบและ key ชน
  const photos = [...new Set(data?.epod_photo ?? [])]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="from-primary/12 border-border/60 rounded-t-xl border-b bg-gradient-to-r via-transparent to-transparent p-4">
          <DialogTitle>{tt("title")}</DialogTitle>
          <DialogDescription>{tt("description")}</DialogDescription>
        </DialogHeader>

        <div className="bg-muted/30 grid min-h-0 flex-1 auto-rows-max content-start gap-4 overflow-y-auto p-4">
          {/* ---- การ์ดสรุป: เลขพัสดุ ขนส่ง และสถานะล่าสุด ---- */}
          <section className="bg-card border-border/70 from-chart-1/6 to-chart-5/6 relative grid gap-3 overflow-hidden rounded-xl border bg-gradient-to-br via-transparent p-4 pt-5 shadow-sm">
            <span
              aria-hidden
              className="from-chart-1 via-chart-5 to-chart-2 absolute inset-x-0 top-0 h-1 bg-gradient-to-r"
            />
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-info/12 text-info-ink rounded-md px-2 py-0.5 font-mono text-xs font-semibold">
                {trackingNo}
              </span>
              {carrier ? (
                <span className="text-muted-foreground flex items-center gap-1.5 text-sm">
                  <BroadcastLogo src={carrierLogo} alt={carrier} className="size-5" />
                  {carrier}
                </span>
              ) : null}
              {soCode ? (
                <span className="text-muted-foreground ml-auto font-mono text-xs">{soCode}</span>
              ) : null}
            </div>

            {load.state === "loading" ? (
              <div className="text-muted-foreground flex items-center gap-2 py-2 text-sm">
                <LoaderCircle className="text-primary size-4 animate-spin" />
                {tt("loading")}
              </div>
            ) : data ? (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h3 className="text-base leading-snug font-semibold sm:text-lg">
                  {data.last_status ?? "—"}
                </h3>
                {data.delivered ? (
                  <Badge variant="secondary" className="bg-success/12 text-success-ink gap-1 border-transparent">
                    <CircleCheck className="size-3" />
                    {tt("delivered")}
                  </Badge>
                ) : null}
                {data.last_datetime ? (
                  <span className="text-muted-foreground flex items-center gap-1 font-mono text-xs">
                    <Clock className="size-3.5" />
                    {formatDateTime(data.last_datetime)}
                  </span>
                ) : null}
              </div>
            ) : null}

            {/* แถบความคืบหน้า 4 ขั้นของ KEX — ขั้นที่ผ่านแล้ว/ขั้นปัจจุบันเป็นสีหลัก */}
            {steps.length ? (
              <ol className="grid gap-2 pt-1" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
                {steps.map((step, index) => {
                  const done = index <= current
                  return (
                    <li key={`${step.code}-${index}`} className="grid gap-1.5">
                      <span
                        className={cn(
                          "h-1.5 rounded-full",
                          done ? (data?.delivered ? "bg-success" : "bg-primary") : "bg-muted"
                        )}
                      />
                      <span
                        className={cn(
                          "text-xs leading-tight",
                          index === current ? "text-foreground font-semibold" : done ? "text-foreground/80" : "text-muted-foreground"
                        )}
                      >
                        {step.desc}
                      </span>
                    </li>
                  )
                })}
              </ol>
            ) : null}
          </section>

          {load.state === "error" ? (
            <Alert variant={load.code === 404 ? "warning" : "destructive"}>
              <TriangleAlert />
              <AlertContent>
                <AlertTitle>
                  {load.code === 404 ? tt("notFound") : load.code === 400 ? tt("invalid") : tt("error")}
                </AlertTitle>
                <AlertDescription>{load.message}</AlertDescription>
              </AlertContent>
            </Alert>
          ) : null}

          {data ? (
            <>
              {/* ---- ข้อมูลการส่ง ---- */}
              <section className="bg-card border-border/70 rounded-xl border p-4 shadow-sm">
                <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <Truck className="text-primary size-4" />
                  {tt("shipment")}
                </h4>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
                  <Item label={tt("route")} wide>
                    {[data.shipment.org_province, data.shipment.dest_province].filter(Boolean).join(" → ") || "—"}
                    {data.shipment.dest_postcode ? (
                      <span className="text-muted-foreground ml-1 font-mono text-xs">{data.shipment.dest_postcode}</span>
                    ) : null}
                  </Item>
                  <Item label={tt("edt")}>{data.shipment.edt || "—"}</Item>
                  <Item label={tt("receiver")}>{data.shipment.r_name || "—"}</Item>
                  <Item label={tt("sender")}>{data.shipment.sender || "—"}</Item>
                  <Item label={tt("pickupDate")}>
                    <span className="font-mono text-xs">{formatDateTime(data.shipment.pickup_date) || "—"}</span>
                  </Item>
                  <Item label={tt("conType")}>{data.shipment.con_type || "—"}</Item>
                  <Item label={tt("cod")}>
                    <span className="font-mono tabular-nums">
                      {(data.shipment.cod_amount ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </Item>
                  <Item label={tt("bookingNo")}>
                    <span className="font-mono text-xs">{data.shipment.booking_no || "—"}</span>
                  </Item>
                </dl>
              </section>

              {/* ---- เหตุการณ์ทั้งหมด ล่าสุดอยู่บนสุด ---- */}
              <section className="bg-card border-border/70 rounded-xl border p-4 shadow-sm">
                <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <MapPin className="text-primary size-4" />
                  {tt("events", { count: data.events.length })}
                </h4>
                <ol className="relative grid gap-4">
                  {data.events.map((event, index) => (
                    <li key={`${event.datetime}-${index}`} className="relative grid grid-cols-[1rem_1fr] gap-3">
                      {/* เส้นเชื่อมจุด — ไม่มีหลังเหตุการณ์สุดท้าย */}
                      {index < data.events.length - 1 ? (
                        <span aria-hidden className="bg-border absolute top-4 bottom-[-1rem] left-[7px] w-0.5" />
                      ) : null}
                      <span
                        aria-hidden
                        className={cn(
                          "relative mt-1 size-4 rounded-full border-2",
                          index === 0
                            ? data.delivered
                              ? "border-success bg-success"
                              : "border-primary bg-primary"
                            : "border-border bg-card"
                        )}
                      />
                      <div className="min-w-0">
                        <div className={cn("text-sm", index === 0 ? "font-semibold" : "font-medium")}>
                          {event.desc ?? "—"}
                        </div>
                        <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
                          <span className="font-mono">{formatDateTime(event.datetime)}</span>
                          {event.location ? (
                            <span className="flex items-center gap-1">
                              <MapPin className="size-3" />
                              {event.location}
                            </span>
                          ) : null}
                          {event.courier_name ? (
                            <span className="flex items-center gap-1">
                              <UserRound className="size-3" />
                              {event.courier_name}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>

              {/* ---- รูปหลักฐานการส่ง (ePOD) — เปิดรูปเต็มในแท็บใหม่ ---- */}
              {photos.length ? (
                <section className="bg-card border-border/70 rounded-xl border p-4 shadow-sm">
                  <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                    <PackageCheck className="text-primary size-4" />
                    {tt("epod")}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {photos.map((url) => (
                      <a
                        key={url}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group border-border/70 relative block size-24 overflow-hidden rounded-lg border"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt={tt("epod")} loading="lazy" className="size-full object-cover transition-transform group-hover:scale-105" />
                        <ExternalLink className="absolute top-1 right-1 size-3.5 text-white opacity-0 drop-shadow transition-opacity group-hover:opacity-100" />
                      </a>
                    ))}
                  </div>
                </section>
              ) : null}
            </>
          ) : null}
        </div>

        <DialogFooter className="from-primary/12 border-border/60 bg-transparent bg-gradient-to-r via-transparent to-transparent">
          {load.state === "error" && load.code !== 400 ? (
            <Button type="button" variant="outline" onClick={retry}>
              <RotateCw /> {tt("retry")}
            </Button>
          ) : null}
          <DialogClose render={<Button type="button" variant="outline" />}>
            {t("close")}
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Item({
  label,
  wide,
  children,
}: {
  label: string
  wide?: boolean
  children: React.ReactNode
}) {
  return (
    <div className={cn("min-w-0", wide && "col-span-2 sm:col-span-3")}>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="mt-1 text-sm font-medium break-words">{children}</dd>
    </div>
  )
}
