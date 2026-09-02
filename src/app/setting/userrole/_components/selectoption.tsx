"use client"

import { Combobox } from "@base-ui/react/combobox"
import { Check, ChevronDown, Search, X } from "lucide-react"
import { useTranslations } from "next-intl"

/**
 * selectoption.tsx — ช่องเลือกตัวเลือกที่พิมพ์ค้นหาได้ (Base UI Combobox)
 *
 * ใช้ Combobox ไม่ใช่ Select เพราะ Select ของ Base UI พิมพ์ค้นหาไม่ได้
 * และวางช่องค้นหาไว้ "ในป๊อปอัป" ไม่ใช่ที่ตัวช่องเอง — แบบเดิมที่ input เป็นตัวช่อง
 * พอมีค่าที่เลือกไว้แล้ว ข้อความในช่องจะกลายเป็นคำค้นไปด้วย เปิดมาจึงเห็นตัวเลือกเดียว
 * และพิมพ์ต่อท้ายก็ไม่เจออะไรเลย (ดูเหมือนค้นหาไม่ได้)
 *
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
  /** ใช้เป็นชื่อของช่องให้ screen reader — ปกติส่งชื่อหัวข้อของช่องนี้มา */
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
      <div className="relative">
        <Combobox.Trigger
          id={id}
          aria-label={label}
          className="border-input bg-card/80 data-placeholder:text-muted-foreground focus-visible:border-primary/50 focus-visible:ring-ring/50 flex h-8 w-full items-center justify-between gap-2 rounded-lg border py-1 pr-14 pl-2.5 text-left text-sm transition-colors outline-none select-none focus-visible:ring-3 md:text-sm dark:bg-input/30"
        >
          {/* Value ไม่ได้ render element ของตัวเอง (ไม่มี className) จึงต้องมี span ครอบ */}
          <span className="truncate">
            <Combobox.Value placeholder={placeholder} />
          </span>
        </Combobox.Trigger>

        {/* วางนอกปุ่มเปิด เพราะปุ่มซ้อนในปุ่มเป็น HTML ที่ผิด */}
        <div className="pointer-events-none absolute inset-y-0 right-1.5 flex items-center gap-0.5">
          <Combobox.Clear
            aria-label={t("clear")}
            className="text-muted-foreground hover:text-foreground pointer-events-auto flex size-6 cursor-default items-center justify-center rounded-md transition-colors"
          >
            <X className="size-3.5" />
          </Combobox.Clear>
          <Combobox.Icon className="text-muted-foreground flex size-6 items-center justify-center">
            <ChevronDown className="size-4" />
          </Combobox.Icon>
        </div>
      </div>

      <Combobox.Portal>
        <Combobox.Positioner sideOffset={4} className="isolate z-50">
          <Combobox.Popup className="bg-popover text-popover-foreground ring-foreground/10 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 w-(--anchor-width) origin-(--transform-origin) overflow-hidden rounded-lg shadow-md ring-1 duration-100">
            {/* ช่องค้นหาเริ่มว่างทุกครั้งที่เปิด จึงเห็นตัวเลือกครบและพิมพ์ค้นได้ทันที */}
            <div className="border-border/60 relative border-b">
              <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
              <Combobox.Input
                placeholder={t("search")}
                className="placeholder:text-muted-foreground h-9 w-full bg-transparent pr-2.5 pl-8 text-sm outline-none"
              />
            </div>

            {/* ห้ามซ่อนตัว Empty เอง (screen reader ต้องได้ยินตอนผลลัพธ์เปลี่ยน) — ใส่ช่องไฟที่ลูกแทน */}
            <Combobox.Empty>
              <div className="text-muted-foreground px-2 py-4 text-center text-sm">
                {t("empty")}
              </div>
            </Combobox.Empty>

            <Combobox.List className="max-h-60 overflow-y-auto p-1">
              {(option: SelectOptionItem) => (
                <Combobox.Item
                  key={option.value}
                  value={option}
                  className="data-highlighted:bg-accent data-highlighted:text-accent-foreground relative flex cursor-default items-center gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm outline-none select-none"
                >
                  <span className="flex-1 truncate">{option.label}</span>
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
