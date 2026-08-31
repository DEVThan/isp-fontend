"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Check, Languages } from "lucide-react"
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
        <Languages className="size-4" />
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
              {localeNames[locale]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
