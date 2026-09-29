"use client"

import * as React from "react"

import { Combobox } from "@base-ui/react/combobox"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * freeselect.tsx — ช่องที่เลือกจากรายการได้ และพิมพ์ค่าเองได้ในช่องเดียวกัน (ใช้กับ "ขนส่งโดย")
 *
 * ตัวช่องคือ input จริง แบบเดียวกับ customerselect.tsx — ข้อความในช่องคือค่าของฟิลด์เลย
 * พิมพ์อะไรก็เป็นค่านั้น (ไม่ต้องอยู่ในรายการ) · เลือกจากรายการ = เขียนค่าของตัวเลือกลงช่อง
 * รายการกรองตามที่พิมพ์ "หลังเปิดป๊อปอัป" เท่านั้น — เปิดมาครั้งแรกเห็นครบทุกตัว ถึงช่องจะมีค่าอยู่แล้ว
 * (ถ้ากรองด้วยค่าในช่องตั้งแต่เปิด ค่า "KEX" จะซ่อนตัวเลือกอื่นทั้งหมด เปลี่ยนไม่ได้)
 * Combobox ไม่ถือค่าที่เลือก (value={null}) — ค่าจริงอยู่ในฟอร์ม ผู้เรียกเขียนผ่าน onChange
 */
export type FreeSelectItem = {
  /** ค่าที่เขียนลงช่องเมื่อเลือก */
  value: string
  /** ข้อความเสริมสีจางด้านขวา (เช่น รหัสผู้ส่งของขนส่งนั้น) */
  hint?: string
}

export function FreeSelect({
  id,
  value,
  items,
  onChange,
  placeholder,
  emptyText,
  toggleLabel,
  className,
}: {
  id?: string
  value: string
  items: FreeSelectItem[]
  onChange: (value: string) => void
  placeholder?: string
  /** ข้อความตอนไม่มีตัวเลือก (หรือพิมพ์แล้วไม่ตรงตัวไหน) */
  emptyText: string
  /** aria-label ของปุ่มลูกศรเปิดรายการ */
  toggleLabel: string
  className?: string
}) {
  const [open, setOpen] = React.useState(false)
  /** ข้อความที่พิมพ์ตั้งแต่เปิดป๊อปอัปครั้งนี้ — null = ยังไม่ได้พิมพ์ (แสดงครบทุกตัว) */
  const [query, setQuery] = React.useState<string | null>(null)

  const needle = (query ?? "").trim().toLowerCase()
  const visible = needle
    ? items.filter(
        (item) =>
          item.value.toLowerCase().includes(needle) ||
          (item.hint ?? "").toLowerCase().includes(needle)
      )
    : items

  return (
    <Combobox.Root
      items={visible}
      filter={null}
      value={null}
      onValueChange={(next: FreeSelectItem | null) => {
        if (next) onChange(next.value)
      }}
      inputValue={value}
      onInputValueChange={(next, details) => {
        if (details.reason !== "input-change") return
        onChange(next)
        setQuery(next)
      }}
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setQuery(null)
      }}
      itemToStringLabel={(item: FreeSelectItem) => item.value}
      isItemEqualToValue={(item, current) => item.value === current.value}
    >
      <div className="relative">
        <Combobox.Input
          id={id}
          placeholder={placeholder}
          className={cn(
            "border-input bg-card placeholder:text-muted-foreground focus-visible:border-primary/50 focus-visible:ring-ring/50 h-8 w-full min-w-0 rounded-lg border py-1 pr-8 pl-2.5 text-sm transition-colors outline-none focus-visible:ring-3 md:text-sm dark:bg-input/30",
            className
          )}
        />
        <div className="absolute inset-y-0 right-1.5 flex items-center">
          <Combobox.Trigger
            aria-label={toggleLabel}
            className="text-muted-foreground hover:text-foreground flex size-6 cursor-default items-center justify-center rounded-md transition-colors"
          >
            <ChevronDown className="size-4" />
          </Combobox.Trigger>
        </div>
      </div>

      <Combobox.Portal>
        <Combobox.Positioner sideOffset={4} className="isolate z-50">
          <Combobox.Popup className="bg-popover text-popover-foreground ring-foreground/10 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 w-(--anchor-width) min-w-48 origin-(--transform-origin) overflow-hidden rounded-lg shadow-md ring-1 duration-100">
            {/* ห้ามซ่อนตัว Empty เอง (screen reader ต้องได้ยินตอนผลลัพธ์เปลี่ยน) — ใส่ช่องไฟที่ลูกแทน */}
            <Combobox.Empty>
              <div className="text-muted-foreground px-2 py-3 text-center text-sm">{emptyText}</div>
            </Combobox.Empty>
            <Combobox.List className="max-h-60 overflow-y-auto p-1">
              {(item: FreeSelectItem) => (
                <Combobox.Item
                  key={item.value}
                  value={item}
                  className="data-highlighted:bg-accent data-highlighted:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-md px-1.5 py-1 text-sm outline-none select-none"
                >
                  <span className="flex-1 truncate">{item.value}</span>
                  {item.hint ? (
                    <span className="text-muted-foreground shrink-0 font-mono text-xs">{item.hint}</span>
                  ) : null}
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  )
}
