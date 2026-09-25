"use client"

import * as React from "react"

import { Combobox } from "@base-ui/react/combobox"
import { ChevronDown, LoaderCircle } from "lucide-react"
import { useTranslations } from "next-intl"

import { getCustomerOptions } from "@/app/sale/so/_components/api"
import type { CustomerOption } from "@/app/sale/so/_components/model"
import { cn } from "@/lib/utils"

/**
 * customerselect.tsx — ช่องผู้สั่งซื้อ: พิมพ์ชื่อเองได้ และเลือกจากทะเบียนลูกค้าได้ในช่องเดียวกัน
 *
 * ตัวช่องคือ input จริง (ไม่ใช่ปุ่มเปิดป๊อปอัปแบบ SelectOption) — ข้อความในช่องคือชื่อผู้สั่งของแถว
 * และเป็นคำค้นไปด้วย: พิมพ์แล้วรอ 300ms ค่อยยิง /customer-get-option (ได้ไม่เกิน 20 คน)
 * ปิดตัวกรองของ Combobox เอง (filter={null}) เพราะเซิร์ฟเวอร์กรองมาให้แล้ว
 * (ถ้ากรองซ้ำ คำค้นที่เป็นเบอร์โทรจะไม่ตรงกับชื่อ แล้วรายการหายหมด)
 *
 * ข้อความในช่องคุมเองทั้งหมด (inputValue) และรับเฉพาะการพิมพ์ (reason "input-change")
 * Base UI จะล้างช่องตอนปิดป๊อปอัป หรือเขียนป้ายของตัวเลือกลงช่องตอนเลือก — ไม่เอาทั้งคู่
 * ตอนเลือกผู้เรียกเป็นคนเขียนชื่อใหม่ลง values เอง (onPick) ช่องจึงเปลี่ยนตามอยู่แล้ว
 * Combobox ไม่ถือค่าที่เลือก (value={null}) — ค่าจริงคือ name / tel / customer_id ในฟอร์ม
 */
export function CustomerSelect({
  id,
  value,
  onType,
  onPick,
  placeholder,
}: {
  id?: string
  /** ชื่อผู้สั่งของแถวตอนนี้ */
  value: string
  /** พิมพ์ชื่อเอง — ผู้เรียกเขียนลง name */
  onType: (text: string) => void
  /** เลือกจากทะเบียน — ผู้เรียกเขียน name / tel / customer_id */
  onPick: (customer: CustomerOption) => void
  placeholder?: string
}) {
  const t = useTranslations("common.table")
  const tform = useTranslations("so.form")

  const [open, setOpen] = React.useState(false)
  /** คำค้นล่าสุดที่ผู้ใช้พิมพ์ — ว่างตอนเพิ่งเปิด (ได้ลูกค้าล่าสุด 20 คน) */
  const [query, setQuery] = React.useState("")
  const [items, setItems] = React.useState<CustomerOption[]>([])
  const [status, setStatus] = React.useState<"loading" | "idle" | "error">(
    "idle"
  )

  // ยิงค้นเฉพาะตอนป๊อปอัปเปิด · คำค้นว่างยิงทันที ไม่ว่างรอ 300ms (ไม่ยิงทุกตัวอักษร)
  // setState ทำในคอลแบ็กของ timer/promise เท่านั้น (กฎ react-hooks/set-state-in-effect)
  // สถานะ "loading" ตั้งจากตัวจัดการเหตุการณ์ข้างล่างแทน
  React.useEffect(() => {
    if (!open) return
    let cancelled = false
    const timer = setTimeout(
      () => {
        getCustomerOptions(query)
          .then((list) => {
            if (cancelled) return
            setItems(list)
            setStatus("idle")
          })
          .catch(() => {
            // ห้าม console.error — ใน dev overlay จะขึ้นเต็มจอเหมือนหน้าพัง
            if (cancelled) return
            setItems([])
            setStatus("error")
          })
      },
      query.trim() ? 300 : 0
    )
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [open, query])

  return (
    <Combobox.Root
      items={items}
      filter={null}
      value={null}
      onValueChange={(next: CustomerOption | null) => {
        if (next) onPick(next)
      }}
      inputValue={value}
      onInputValueChange={(next, details) => {
        if (details.reason !== "input-change") return
        onType(next)
        setQuery(next)
        setStatus("loading")
      }}
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) setStatus("loading")
        else setQuery("")
      }}
      itemToStringLabel={(item: CustomerOption) => item.name ?? item.tel}
      isItemEqualToValue={(item, current) => item.id === current.id}
    >
      <div className="relative">
        <Combobox.Input
          id={id}
          placeholder={placeholder}
          className="border-input bg-card placeholder:text-muted-foreground focus-visible:border-primary/50 focus-visible:ring-ring/50 h-8 w-full min-w-0 rounded-lg border py-1 pr-8 pl-2.5 text-sm transition-colors outline-none focus-visible:ring-3 md:text-sm dark:bg-input/30"
        />
        <div className="absolute inset-y-0 right-1.5 flex items-center">
          {status === "loading" && open ? (
            <LoaderCircle className="text-muted-foreground size-4 animate-spin" />
          ) : (
            <Combobox.Trigger
              aria-label={tform("customerSearch")}
              className="text-muted-foreground hover:text-foreground flex size-6 cursor-default items-center justify-center rounded-md transition-colors"
            >
              <ChevronDown className="size-4" />
            </Combobox.Trigger>
          )}
        </div>
      </div>

      <Combobox.Portal>
        <Combobox.Positioner sideOffset={4} className="isolate z-50">
          <Combobox.Popup className="bg-popover text-popover-foreground ring-foreground/10 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 w-(--anchor-width) min-w-72 origin-(--transform-origin) overflow-hidden rounded-lg shadow-md ring-1 duration-100">
            {/* ห้ามซ่อนตัว Empty เอง (screen reader ต้องได้ยินตอนผลลัพธ์เปลี่ยน) — ใส่ช่องไฟที่ลูกแทน */}
            <Combobox.Empty>
              <div
                className={cn(
                  "px-2 py-4 text-center text-sm",
                  status === "error" ? "text-destructive" : "text-muted-foreground"
                )}
              >
                {status === "loading"
                  ? t("loading")
                  : status === "error"
                    ? tform("customerSearchError")
                    : t("empty")}
              </div>
            </Combobox.Empty>

            <Combobox.List className="max-h-60 overflow-y-auto p-1">
              {(customer: CustomerOption) => (
                <Combobox.Item
                  key={customer.id}
                  value={customer}
                  className="data-highlighted:bg-accent data-highlighted:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-md px-1.5 py-1 text-sm outline-none select-none"
                >
                  <span className="flex-1 truncate">{customer.name || "—"}</span>
                  <span className="text-muted-foreground shrink-0 font-mono text-xs">
                    {customer.tel}
                  </span>
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  )
}
