import path from "node:path";
import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ปักหมุด root ไว้ที่โปรเจกต์นี้ กัน Turbopack ไปหยิบ lockfile จากโฟลเดอร์แม่
  turbopack: {
    root: path.resolve(import.meta.dirname),
  },
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
