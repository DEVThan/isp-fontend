"use client"

import { Combobox } from "@base-ui/react/combobox"
import { Check, ChevronDown, Search, X } from "lucide-react"
import { useTranslations } from "next-intl"

import type { SelectOptionItem } from "@/app/product/product_item/_components/selectoption"

/**
 * multiselectoption.tsx — ช่องเลือกได้หลายตัวที่พิมพ์ค้นหาได้ (Base UI Combobox แบบ multiple)
 *
 * หน้าตาและพฤติกรรมเดียวกับ SelectOption ทุกอย่าง ต่างกันแค่:
 * - ตัวที่เลือกไว้โชว์เป็นป้ายเรียงในช่อง (ขึ้นบรรทัดใหม่ได้ ช่องจึงสูงขึ้นตามจำนวน)
 * - คลิกตัวเลือกในป๊อปอัปคือสลับเลือก/ไม่เลือก ป๊อปอัปไม่ปิด
 * ป้ายไม่มีปุ่ม × ของตัวเอง เพราะป้ายอยู่ในปุ่มเปิด (ปุ่มซ้อนในปุ่มเป็น HTML ที่ผิด)
 * เอาออกทีละตัวให้ติ๊กออกในป๊อปอัป หรือกด × ด้านขวาเพื่อล้างทั้งหมด
 */
export function MultiSelectOption({
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
  /** value ของตัวที่เลือกไว้ เรียงตามลำดับที่เลือก — [] คือยังไม่ได้เลือก */
  value: string[]
  onValueChange: (value: string[]) => void
  placeholder?: string
  label?: string
}) {
  const t = useTranslations("common.table")

  // ค่าที่ไม่มีใน options ถูกตัดทิ้งตรงนี้ — ผู้เรียกต้องเติมค่าเดิมเข้า options เอง ไม่งั้นหายตอนแก้
  const selected = value
    .map((current) => options.find((option) => option.value === current))
    .filter((option): option is SelectOptionItem => Boolean(option))

  return (
    <Combobox.Root
      multiple
      items={options}
      value={selected}
      onValueChange={(next) => onValueChange(next.map((option) => option.value))}
      isItemEqualToValue={(item, current) => item.value === current.value}
    >
      <div className="relative">
        <Combobox.Trigger
          id={id}
          aria-label={label}
          className="border-input bg-card/80 focus-visible:border-primary/50 focus-visible:ring-ring/50 flex min-h-8 w-full items-center gap-2 rounded-lg border py-1 pr-14 pl-2.5 text-left text-sm transition-colors outline-none select-none focus-visible:ring-3 md:text-sm dark:bg-input/30"
        >
          {selected.length ? (
            <span className="flex flex-wrap gap-1">
              {selected.map((option) => (
                <span
                  key={option.value}
                  className="bg-primary/10 text-primary rounded-md px-1.5 py-0.5 text-xs font-medium"
                >
                  {option.label}
                </span>
              ))}
            </span>
          ) : (
            <span className="text-muted-foreground truncate">{placeholder}</span>
          )}
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
            <div className="border-border/60 relative border-b">
              <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
              <Combobox.Input
                placeholder={t("search")}
                className="placeholder:text-muted-foreground h-9 w-full bg-transparent pr-2.5 pl-8 text-sm outline-none"
              />
            </div>

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
