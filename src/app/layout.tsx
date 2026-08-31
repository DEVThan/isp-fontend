import type { Metadata } from "next";
import { Geist_Mono, Noto_Sans_Thai } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";

import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const sans = Noto_Sans_Thai({
  variable: "--font-sans",
  subsets: ["thai", "latin"],
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
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${sans.variable} ${mono.variable} h-full antialiased`}
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
