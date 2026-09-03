"use client"

import { useId, useTransition, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { Check } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { localeNames, locales, type Locale } from "@/i18n/config"
import { setUserLocale } from "@/i18n/actions"

/**
 * ธงเล็กหน้าชื่อภาษา — วาดเป็น SVG เอง ไม่ใช้ emoji ธง (🇹🇭)
 * เพราะ Windows ไม่มีฟอนต์ธง จะกลายเป็นตัวอักษร "TH" แทน
 * รับ id มาจากผู้เรียก เพราะธงใบเดียวถูกวาดหลายที่ ใช้ id ซ้ำใน DOM ไม่ได้
 */
const flags: Record<Locale, (id: string) => ReactNode> = {
  th: () => (
    <svg viewBox="0 0 9 6" className="size-full">
      <rect width="9" height="6" fill="#A51931" />
      <rect y="1" width="9" height="4" fill="#F4F5F8" />
      <rect y="2" width="9" height="2" fill="#2D2A4A" />
    </svg>
  ),
  en: (id) => (
    <svg viewBox="0 0 60 30" className="size-full">
      <clipPath id={id}>
        <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" />
      </clipPath>
      <rect width="60" height="30" fill="#012169" />
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#FFF" strokeWidth="6" />
      <path
        d="M0,0 L60,30 M60,0 L0,30"
        clipPath={`url(#${id})`}
        stroke="#C8102E"
        strokeWidth="4"
      />
      <path d="M30,0 v30 M0,15 h60" stroke="#FFF" strokeWidth="10" />
      <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
    </svg>
  ),
  // mm: () => (
  //   <svg viewBox="0 0 9 6" className="size-full">
  //     <rect width="9" height="6" fill="#FECB00" />
  //     <rect y="2" width="9" height="4" fill="#34B233" />
  //     <rect y="4" width="9" height="2" fill="#EA2839" />
  //     <path
  //       d="M4.50,1.15 L4.89,2.36 L6.16,2.36 L5.14,3.11 L5.53,4.32 L4.50,3.57 L3.47,4.32 L3.86,3.11 L2.84,2.36 L4.11,2.36 Z"
  //       fill="#FFF"
  //     />
  //   </svg>
  // ),
}

/** ครอบด้วย span เพราะเมนู/ปุ่มบังคับ svg เปล่าให้เป็นสี่เหลี่ยมจัตุรัส 16px */
function Flag({ locale }: { locale: Locale }) {
  // useId ให้ค่ามีอักขระพิเศษ (« ») ซึ่งใช้ใน url(#...) ของ SVG ไม่ได้ จึงตัดทิ้ง
  const id = `flag-${useId().replace(/[^a-zA-Z0-9]/g, "")}`
  return (
    <span className="h-3 w-[18px] shrink-0 overflow-hidden rounded-[2px] ring-1 ring-black/10 dark:ring-white/15">
      {flags[locale](id)}
    </span>
  )
}

export function LanguageSwitcher() {
  const t = useTranslations("common")
  const active = useLocale()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function change(locale: Locale) {
    startTransition(async () => {
      await setUserLocale(locale)
      // URL ไม่เปลี่ยน จึงต้องสั่งดึงหน้าใหม่เองหลังเปลี่ยน cookie
      router.refresh()
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" aria-label={t("language")} />
        }
      >
        <Flag locale={active} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t("language")}</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {locales.map((locale) => (
            <DropdownMenuItem
              key={locale}
              disabled={isPending}
              onClick={() => change(locale)}
            >
              <Check
                className={locale === active ? "opacity-100" : "opacity-0"}
              />
              <Flag locale={locale} />
              {localeNames[locale]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
