import type { Metadata } from "next";
import { Geist_Mono, Noto_Sans_Myanmar, Noto_Sans_Thai } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";

import { bcp47 } from "@/i18n/config";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

// ฟอนต์ตามภาษา — Noto Sans Thai ไม่มีอักษรพม่า จึงต้องสลับทั้งชุดเมื่อเลือกภาษาเมียนมา
// ตัวแปรแยกชื่อกัน แล้วให้ globals.css เลือกเป็น --font-app ตาม <html lang> (:lang(my)) — ดูเหตุผลที่ <html className> ข้างล่าง
const thaiSans = Noto_Sans_Thai({
  variable: "--font-thai",
  subsets: ["thai", "latin"],
});

const myanmarSans = Noto_Sans_Myanmar({
  variable: "--font-myanmar",
  subsets: ["myanmar", "latin"],
});

const mono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("common");

  return {
    title: {
      default: t("appName"),
      template: `%s · ${t("appName")}`,
    },
    description: t("appSubtitle"),
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // ภาษามาจาก cookie ไม่ใช่ URL — ดู src/i18n/locale.ts
  const locale = await getLocale();
  return (
    // className ของ <html> ต้องเหมือนเดิมทุกภาษา: next-themes ใส่ class "dark" ที่ <html> เองฝั่ง browser
    // ถ้า className เปลี่ยนตอนเปลี่ยนภาษา (router.refresh) React จะเขียนทับทั้งก้อน แล้ว "dark" หาย
    // (08/10/2026 เปลี่ยนเป็นพม่าแล้วกลายเป็นโหมดสว่าง) — ฟอนต์จึงสลับด้วย lang ใน CSS แทนการสลับ class
    <html
      lang={bcp47[locale]}
      suppressHydrationWarning
      className={`${thaiSans.variable} ${myanmarSans.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <TooltipProvider>{children}</TooltipProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
