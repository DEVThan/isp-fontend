import path from "node:path";
import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

/** ที่อยู่จริงของ Flask API — อ่านฝั่งเซิร์ฟเวอร์เท่านั้น ไม่หลุดไป browser */
const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:8081/api/web";

/** ต้นทางของ Flask (ตัด /api/web ท้ายออก) — ไฟล์ที่อัปโหลดอยู่ที่ /uploads ไม่ได้อยู่ใต้ /api/web */
const apiOrigin = apiBaseUrl.replace(/\/api\/web\/?$/, "");

const nextConfig: NextConfig = {
  // ปักหมุด root ไว้ที่โปรเจกต์นี้ กัน Turbopack ไปหยิบ lockfile จากโฟลเดอร์แม่
  turbopack: {
    root: path.resolve(import.meta.dirname),
  },

  /**
   * browser ยิง /api/web/... แล้ว Next ส่งต่อให้ Flask
   * ทำแบบนี้เพราะเรียกข้าม origin ตรง ๆ จะโดน CORS บล็อก (Flask ยังไม่ได้เปิด CORS)
   */
  async rewrites() {
    return [
      { source: "/api/web/:path*", destination: `${apiBaseUrl}/:path*` },
      // รูปสินค้า: คอลัมน์ image เก็บ /uploads/products/{item_code}/thump/{ชื่อไฟล์} ใช้เป็น src ได้ตรง ๆ
      { source: "/uploads/:path*", destination: `${apiOrigin}/uploads/:path*` },
    ];
  },
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
