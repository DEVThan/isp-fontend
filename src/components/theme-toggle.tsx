"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const t = useTranslations("common")
  // ธีมที่ resolve แล้วรู้ได้เฉพาะฝั่ง client — รอ hydrate ก่อนค่อยสลับไอคอน
  const hydrated = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={t("toggleTheme")}
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      {hydrated && resolvedTheme === "dark" ? (
        <Moon className="size-4" />
      ) : (
        <Sun className="size-4" />
      )}
    </Button>
  )
}
