import { NextResponse, type NextRequest } from "next/server"

import { SESSION_COOKIE } from "@/app/login/components/auth"

/**
 * proxy.ts — ด่านหน้าของทุก request (Next 16 เปลี่ยนชื่อมาจาก middleware.ts)
 *
 * ไม่มี session = เข้าได้แค่ /login · มี session แล้วเข้า /login = เด้งกลับหน้าแรก
 *
 * ตรวจแค่ว่า "มี cookie ไหม" เท่านั้น ยังไม่ได้ตรวจว่า cookie จริงหรือเปล่า
 * เพราะ API ยังไม่ออก token ให้เอาไปตรวจ — cookie ปลอมขึ้นมาเองได้
 * เมื่อไหร่ที่มี token ต้องมาตรวจตรงนี้ว่า token ใช้ได้จริง
 */
const PUBLIC_PATHS = ["/login"]

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value)
  const isPublic = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  )

  if (!hasSession && !isPublic) {
    const url = new URL("/login", request.url)
    // จำหน้าที่ตั้งใจจะเข้าไว้ ล็อกอินเสร็จแล้วพากลับมาที่เดิม
    if (pathname !== "/") url.searchParams.set("next", `${pathname}${search}`)
    return NextResponse.redirect(url)
  }

  if (hasSession && isPublic) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  return NextResponse.next()
}

export const config = {
  // ข้าม /api/web (proxy ไป Flask), ไฟล์ static และ favicon — ไม่งั้น CSS/JS โดนเด้งไปด้วย
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
