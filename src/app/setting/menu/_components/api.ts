import {
  API_NETWORK_ERROR,
  ApiError,
  type ApiEnvelope,
} from "@/app/login/components/api"
import type { MenuList } from "@/app/setting/menu/_components/model"

const API_BASE_URL =
  typeof window === "undefined"
    ? (process.env.API_BASE_URL ?? "http://localhost:8081/api/web")
    : (process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api/web")


/** ขอทีเดียวได้มากสุดเท่าที่ API ยอม (_PER_PAGE_MAX ฝั่ง Flask) */
export const MENU_PER_PAGE_MAX = 100

/** จำนวนแถวต่อหน้าที่หน้าจัดการเมนูใช้ตอนเปิดครั้งแรก */
export const MENU_PAGE_SIZE = 30

export type MenuQuery = {
  /** ค้นจากชื่อเมนู (menus.name) ฝั่งเซิร์ฟเวอร์ (ilike) — ไม่ส่ง = ไม่กรอง */
  name?: string
  /** "active" / "inactive" — null หรือไม่ส่ง = ไม่กรองสถานะ */
  status?: string | null
  page?: number
  perPage?: number
}

/**
 * POST /api/web/menu-get-all — เมนูในตาราง menus (รวมที่ปิดอยู่)
 *
 * ต่างจาก /menu-get ตรงที่ไม่ได้กรองตามสิทธิ์ และมี active_status ติดมาให้รู้ว่าเปิด/ปิด
 * body ทุกตัวไม่บังคับ ค่าตั้งต้นของ API คือหน้า 1 หน้าละ 10
 * ค้นหา/กรองสถานะ/แบ่งหน้า ทำที่ฝั่งเซิร์ฟเวอร์ทั้งหมด ตารางแค่ส่งเงื่อนไขไปแล้วแสดงผลที่ได้
 *
 * ตารางว่าง API ตอบ 200 พร้อม menus = [] — ไม่ใช่ error
 * ถ้าเรียกไม่สำเร็จจะโยน ApiError ผู้เรียกต้องดักเอง
 */
export async function getAllMenus(query: MenuQuery = {}): Promise<MenuList> {
  const url = `${API_BASE_URL}/menu-get-all`
  let res: Response

  try {
    res = await fetch(url, {
      // เส้นนี้ผูกไว้กับ POST ที่ routes/web.py แม้ body จะไม่บังคับสักตัว
      method: "POST",
      // หน้าจัดการเมนูต้องเห็นของที่เพิ่งแก้เสมอ ห้ามให้ Next cache ไว้
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: query.name ?? "",
        // ไม่ส่ง active_status เลยเมื่อไม่ได้กรอง — ส่งสตริงว่างไปก็ได้ แต่ไม่ส่งอ่านง่ายกว่าตอน debug
        ...(query.status ? { active_status: query.status } : {}),
        page: query.page ?? 1,
        per_page: query.perPage ?? MENU_PAGE_SIZE,
      }),
    })
  } catch (cause) {
    throw new ApiError(
      API_NETWORK_ERROR,
      `เรียก API ไม่สำเร็จ: ${url} (${String(cause)})`
    )
  }

  // API ควรตอบ JSON เสมอ แต่ถ้าเจอหน้า HTML ของ proxy/error page ก็ต้องไม่ระเบิดตรง .json()
  const envelope = (await res
    .json()
    .catch(() => null)) as ApiEnvelope<MenuList> | null
  if (!envelope) {
    throw new ApiError(res.status, res.statusText || "Invalid response")
  }
  if (!envelope.status) {
    throw new ApiError(envelope.resultcode ?? res.status, envelope.message)
  }
  const result = envelope.result
  return {
    menus: result?.menus ?? [],
    total: result?.total ?? 0,
    page: result?.page ?? 1,
    per_page: result?.per_page ?? 0,
    total_pages: result?.total_pages ?? 1,
  }
}
