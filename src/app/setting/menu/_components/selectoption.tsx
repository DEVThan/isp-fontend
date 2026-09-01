"use client"

import { Combobox } from "@base-ui/react/combobox"
import { Check, ChevronDown, Search, X } from "lucide-react"
import { useTranslations } from "next-intl"

import { Input } from "@/components/ui/input"

/**
 * selectoption.tsx — ช่องเลือกตัวเลือกที่พิมพ์ค้นหาได้ (Base UI Combobox)
 *
 * ใช้ Combobox ไม่ใช่ Select เพราะ Select ของ Base UI พิมพ์ค้นหาไม่ได้
 * ผู้เรียกส่งแค่ options เข้ามา (เช่น active / inactive) แล้วรับค่ากลับเป็น value ของตัวเลือก
 */

/** ตัวเลือกหนึ่งอัน — label คือข้อความที่โชว์และใช้ค้นหา ส่วน value คือค่าที่ส่งกลับ */
export type SelectOptionItem = { value: string; label: string }

export function SelectOption({
  id,
  options,
  value,
  onValueChange,
  placeholder,
  /** ใช้เป็นชื่อของปุ่มเปิดรายการให้ screen reader — ปกติส่งชื่อหัวข้อของช่องนี้มา */
  label,
}: {
  id?: string
  options: SelectOptionItem[]
  /** null = ยังไม่ได้เลือก (ฝั่งตารางถือว่าไม่กรอง) */
  value: string | null
  onValueChange: (value: string | null) => void
  placeholder?: string
  label?: string
}) {
  const t = useTranslations("common.table")

  // Combobox ทำงานกับตัวออบเจกต์ของตัวเลือก ไม่ใช่สตริง — แปลงเข้า/ออกให้ผู้เรียกใช้แค่ value
  const selected = options.find((option) => option.value === value) ?? null

  return (
    <Combobox.Root
      items={options}
      value={selected}
      onValueChange={(next) => onValueChange(next?.value ?? null)}
      // ตัวเลือกถูกสร้างใหม่ทุก render (คำแปลเปลี่ยนตามภาษาได้) เทียบด้วย value จึงชัวร์กว่าเทียบตัวออบเจกต์
      isItemEqualToValue={(item, current) => item.value === current.value}
    >
      <Combobox.InputGroup className="group relative block">
        <Search className="text-muted-foreground group-focus-within:text-primary pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 transition-colors" />
        <Combobox.Input
          id={id}
          placeholder={placeholder}
          render={
            <Input className="bg-card/80 focus-visible:border-primary/50 pr-14 pl-8" />
          }
        />
        <div className="absolute inset-y-0 right-1 flex items-center">
          {/* Clear โผล่เองเฉพาะตอนมีค่าให้ล้าง (keepMounted ปริยายเป็น false) */}
          <Combobox.Clear
            aria-label={t("clear")}
            className="text-muted-foreground hover:text-foreground flex size-6 cursor-default items-center justify-center rounded-md transition-colors"
          >
            <X className="size-3.5" />
          </Combobox.Clear>
          <Combobox.Trigger
            aria-label={label}
            className="text-muted-foreground hover:text-foreground flex size-6 cursor-default items-center justify-center rounded-md transition-colors"
          >
            <ChevronDown className="size-4" />
          </Combobox.Trigger>
        </div>
      </Combobox.InputGroup>

      <Combobox.Portal>
        <Combobox.Positioner sideOffset={4} className="isolate z-50">
          <Combobox.Popup className="bg-popover text-popover-foreground ring-foreground/10 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 max-h-(--available-height) w-(--anchor-width) origin-(--transform-origin) overflow-y-auto rounded-lg shadow-md ring-1 duration-100">
            {/* ห้ามซ่อนตัว Empty เอง (screen reader ต้องได้ยินตอนผลลัพธ์เปลี่ยน) — ใส่ช่องไฟที่ลูกแทน */}
            <Combobox.Empty>
              <div className="text-muted-foreground px-2 py-4 text-center text-sm">
                {t("empty")}
              </div>
            </Combobox.Empty>
            <Combobox.List className="p-1">
              {(option: SelectOptionItem) => (
                <Combobox.Item
                  key={option.value}
                  value={option}
                  className="data-highlighted:bg-accent data-highlighted:text-accent-foreground relative flex cursor-default items-center gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm outline-none select-none"
                >
                  <span className="flex-1">{option.label}</span>
                  <Combobox.ItemIndicator className="absolute right-2 flex size-4 items-center justify-center">
                    <Check className="size-4" />
                  </Combobox.ItemIndicator>
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  )
}
