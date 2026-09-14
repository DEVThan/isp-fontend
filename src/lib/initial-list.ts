/**
 * initial-list.ts — ข้อมูลหน้าแรกของตารางที่ page.tsx ส่งให้ Tables (client) แบบ "ไม่ await"
 *
 * เดิม page.tsx รอ API ตอบก่อนค่อยส่งหน้า — API ช้า (~4 วินาที) กดเมนูแล้วหน้าจอค้างอยู่หน้าเดิมจนข้อมูลมา
 * ตอนนี้ page.tsx ส่งหัวเรื่อง + กรอบตารางไปทันที ข้อมูลหน้าแรกตามมาทีหลังผ่าน <Suspense>
 * แล้ว Tables อ่านด้วย React.use() (แบบที่เอกสาร Next แนะนำ: docs/01-app/01-getting-started/06-fetching-data.md)
 *
 * API ล่ม/ต่อไม่ได้ ต้องไม่ทำให้ทั้งหน้าพัง — promise นี้ไม่มีวัน reject ได้ { list ว่าง, failed: true } แทน
 * ตารางเอา failed ไปโชว์ข้อความ "ดึงข้อมูลไม่สำเร็จ" เหมือนเดิม
 */
export type InitialResult<T> = { list: T; failed: boolean }

export function settleInitial<T>(
  request: Promise<T>,
  empty: T
): Promise<InitialResult<T>> {
  return request.then(
    (list) => ({ list, failed: false }),
    // ห้าม console.error — ใน dev overlay จะขึ้นเต็มจอเหมือนหน้าพัง
    () => ({ list: empty, failed: true })
  )
}
