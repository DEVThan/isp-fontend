"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { Bell, Search } from "lucide-react"
import { useTranslations } from "next-intl"

import { LanguageSwitcher } from "@/components/language-switcher"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { breadcrumbKeys } from "@/lib/nav"

export function SiteHeader() {
  const pathname = usePathname()
  const t = useTranslations("nav")
  const tc = useTranslations("common")
  const crumbs = breadcrumbKeys(pathname)

  return (
    <header className="bg-background/80 sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b px-4 backdrop-blur">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-1 h-4" />

      <Breadcrumb className="min-w-0">
        {/* ห้ามตกบรรทัด — แถบนี้สูงคงที่ 56px */}
        <BreadcrumbList className="flex-nowrap whitespace-nowrap">
          <BreadcrumbItem className="hidden md:block">
            <span className="text-muted-foreground">{tc("appName")}</span>
          </BreadcrumbItem>
          {crumbs.map((key, index) => (
            <React.Fragment key={key}>
              {/* จอแคบเหลือเฉพาะหน้าปัจจุบัน กัน breadcrumb ตกบรรทัดในแถบสูง 56px */}
              <BreadcrumbSeparator className="hidden shrink-0 md:block" />
              <BreadcrumbItem>
                {index === crumbs.length - 1 ? (
                  <BreadcrumbPage className="truncate">{t(key)}</BreadcrumbPage>
                ) : (
                  <span className="text-muted-foreground hidden shrink-0 md:block">
                    {t(key)}
                  </span>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>

      <div className="ml-auto flex items-center gap-2">
        <div className="relative hidden lg:block">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input placeholder={tc("search")} className="w-56 pl-8 xl:w-72" />
        </div>
        <Button variant="ghost" size="icon" aria-label={tc("notifications")}>
          <Bell className="size-4" />
        </Button>
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
    </header>
  )
}
