import type { Metadata } from "next"
import { CreditCard, Activity, Router, Users } from "lucide-react"
import { getTranslations } from "next-intl/server"

import { LanguageSwitcher } from "@/components/language-switcher"
import { Card, CardContent } from "@/components/ui/card"
import { LoginForm } from "@/app/login/components/login-form"
import { ThemeToggle } from "@/components/theme-toggle"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("login")
  return { title: t("title") }
}

export default async function LoginPage() {
  const t = await getTranslations("login")
  const tc = await getTranslations("common")

  const highlights = [
    { key: "customers", icon: Users },
    { key: "billing", icon: CreditCard },
    { key: "network", icon: Activity },
  ] as const

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* แผงซ้าย — โทนเดียวกับเมนูข้าง ซ่อนบนจอเล็กเพื่อให้ฟอร์มได้พื้นที่เต็ม */}
      <aside className="bg-sidebar text-sidebar-foreground relative hidden flex-col justify-between overflow-hidden p-10 lg:flex">
        <div
          aria-hidden
          className="from-chart-1/25 pointer-events-none absolute -top-32 -left-24 size-96 rounded-full bg-gradient-to-br to-transparent blur-3xl"
        />
        <div
          aria-hidden
          className="from-chart-5/20 pointer-events-none absolute -right-24 -bottom-32 size-96 rounded-full bg-gradient-to-tl to-transparent blur-3xl"
        />

        <div className="relative flex items-center gap-3">
          <div className="from-chart-1 to-chart-5 flex size-10 items-center justify-center rounded-xl bg-gradient-to-br text-white">
            <Router className="size-5" />
          </div>
          <div className="leading-tight">
            <p className="font-semibold text-white">{tc("appName")}</p>
            <p className="text-xs opacity-70">{tc("appSubtitle")}</p>
          </div>
        </div>

        <div className="relative space-y-8">
          <h1 className="max-w-md text-3xl leading-snug font-semibold text-white">
            {t("brandTagline")}
          </h1>
          <ul className="space-y-4">
            {highlights.map(({ key, icon: Icon }) => (
              <li key={key} className="flex items-center gap-3">
                <span className="bg-sidebar-primary/20 text-sidebar-active flex size-9 shrink-0 items-center justify-center rounded-lg">
                  <Icon className="size-4" />
                </span>
                <span className="text-sm">{t(`highlights.${key}`)}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs opacity-60">
          © {new Date().getFullYear()} {tc("appSubtitle")}
        </p>
      </aside>

      {/* แผงขวา — ฟอร์ม */}
      <main className="relative flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="absolute top-4 right-4 flex items-center gap-1">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>

        <div className="mx-auto w-full max-w-sm space-y-8">
          {/* โลโก้โผล่เฉพาะจอเล็กที่ไม่มีแผงซ้าย */}
          <div className="flex items-center gap-3 lg:hidden">
            <div className="from-chart-1 to-chart-5 flex size-10 items-center justify-center rounded-xl bg-gradient-to-br text-white">
              <Router className="size-5" />
            </div>
            <div className="leading-tight">
              <p className="font-semibold">{tc("appName")}</p>
              <p className="text-muted-foreground text-xs">
                {tc("appSubtitle")}
              </p>
            </div>
          </div>

          {/* ฟอร์มอยู่บนการ์ดขาว ให้ภาษาเดียวกับหน้าอื่นในระบบ */}
          <Card>
            <CardContent className="space-y-6 py-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold tracking-tight">
                  {t("heading")}
                </h2>
                <p className="text-muted-foreground text-sm">
                  {t("subheading")}
                </p>
              </div>

              <LoginForm />
            </CardContent>
          </Card>

          {/* <p className="text-muted-foreground text-center text-xs">
            {t("needHelp")}{" "}
            <a
              href="mailto:support@softtechnw.com"
              className="text-info-ink font-medium hover:underline"
            >
              {t("contactSupport")}
            </a>
          </p> */}
        </div>
      </main>
    </div>
  )
}
