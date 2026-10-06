import path from "node:path";
import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

/**
 * ที่อยู่จริงของ Flask API — อ่านฝั่งเซิร์ฟเวอร์เท่านั้น ไม่หลุดไป browser
 * dev: จาก .env.local ของเครื่อง (ปกติ localhost:8081) · production (build/Docker): จาก .env.production (api-isp.softtechnw.com)
 */
const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:8081/api/web";

/**
 * API ที่ปุ่ม "อัปเดตข้อมูล" ของหน้า so ใช้ (/so-sync, /so-sync-status) — แยกจาก API_BASE_URL (05/10/2026)
 * ไม่ตั้งไว้ = API production แม้ตอน dev (API ในเครื่องที่รันด้วย run_remote.sh ไม่มีรหัส ssh ของเครื่อง sync)
 * จะให้ dev ยิงเครื่องตัวเองก็ใส่ SO_SYNC_API_BASE_URL ใน .env.local
 */
const syncApiBaseUrl =
  process.env.SO_SYNC_API_BASE_URL ?? "https://api-isp.softtechnw.com/api/web";

/** ต้นทางของ Flask (ตัด /api/web ท้ายออก) — ไฟล์ที่อัปโหลดอยู่ที่ /uploads ไม่ได้อยู่ใต้ /api/web */
const apiOrigin = apiBaseUrl.replace(/\/api\/web\/?$/, "");

const nextConfig: NextConfig = {
  /**
   * docker (06/10/2026): ได้ .next/standalone ที่มี server.js + node_modules เท่าที่ใช้ — image ไม่ต้องลง node_modules ทั้งก้อน
   * ระวัง: next.config ถูกอ่านตอน build แล้วฝังลง output — ปลายทาง rewrites ข้างล่าง (API_BASE_URL / SO_SYNC_API_BASE_URL)
   * มาจาก .env.production ตอน build · เปลี่ยน env ตอนรัน container อย่างเดียวไม่พอ ต้อง build ใหม่
   */
  output: "standalone",

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
      // ปุ่ม sync ของหน้า so — ผ่าน Next เหมือนเส้นอื่น เพราะ API production ก็ไม่ได้เปิด CORS (เช็คแล้ว ไม่มี Access-Control-Allow-Origin)
      { source: "/api/sync/so-sync", destination: `${syncApiBaseUrl}/so-sync` },
      { source: "/api/sync/so-sync-status", destination: `${syncApiBaseUrl}/so-sync-status` },
      { source: "/api/web/:path*", destination: `${apiBaseUrl}/:path*` },
      // รูปสินค้า: คอลัมน์ image เก็บ /uploads/products/{item_code}/thump/{ชื่อไฟล์} ใช้เป็น src ได้ตรง ๆ
      { source: "/uploads/:path*", destination: `${apiOrigin}/uploads/:path*` },
    ];
  },
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
