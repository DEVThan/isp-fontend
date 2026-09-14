import { LoaderCircle } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"

/**
 * table-loading.tsx — หน้าตาตารางระหว่างรอข้อมูลหน้าแรก (fallback ของ <Suspense> ใน page.tsx ทุกหน้ารายการ)
 *
 * หน้าเปิดทันทีตอนกดเมนู แล้วโชว์กรอบนี้แทนตารางจนกว่า API จะตอบ
 * หน้าตาเลียนแบบตารางจริง (แถบตัวกรองไล่เฉดด้านบน + กรอบตาราง) และใช้ตัวบอกกำลังโหลดชุดเดียวกับ
 * ตอนค้นหา/เปลี่ยนหน้า (แถบวิ่งสี chart-1 → chart-5 + ป้าย "กำลังโหลด…") พอข้อมูลมาจะได้ไม่กระตุกเปลี่ยนหน้าตา
 */
export function TableLoading({ label }: { label: string }) {
  return (
    <Card
      role="status"
      aria-live="polite"
      aria-busy
      className="border-primary/10 mt-4 overflow-hidden p-0"
    >
      {/* แถบตัวกรอง — กล่องจาง ๆ แทนช่องค้นหา ขนาดใกล้ของจริง */}
      <CardContent className="from-primary/12 border-border/60 grid grid-cols-1 gap-4 border-b bg-gradient-to-r via-transparent to-transparent py-4 md:grid-cols-2">
        {[0, 1].map((key) => (
          <div key={key} className="space-y-2">
            <div className="bg-muted h-3 w-20 animate-pulse rounded" />
            <div className="bg-muted/70 h-8 animate-pulse rounded-lg" />
          </div>
        ))}
      </CardContent>

      <CardContent className="px-4 py-4">
        <div className="border-border/60 relative min-h-[320px] overflow-hidden rounded-lg border">
          {/* แถบวิ่งบนขอบตาราง ไล่เฉดชุดเดียวกับปุ่มหลักและโลโก้ */}
          <span aria-hidden className="absolute inset-x-0 top-0 h-[3px] overflow-hidden">
            <span className="from-chart-1 via-chart-5 to-chart-1 animate-loading-sweep absolute top-0 h-full w-[30%] rounded-full bg-gradient-to-r" />
          </span>
          <div className="bg-muted/60 h-10 border-b border-border/60" />
          <div className="flex justify-center pt-14">
            <span className="bg-card/95 ring-border/60 animate-in fade-in zoom-in-95 flex items-center gap-2.5 rounded-full py-2 pr-4 pl-2.5 text-sm font-medium shadow-lg ring-1 duration-200">
              <span className="bg-primary/10 flex size-6 items-center justify-center rounded-full">
                <LoaderCircle className="text-primary size-4 animate-spin" />
              </span>
              <span className="text-muted-foreground">{label}</span>
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
