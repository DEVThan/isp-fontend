/**
 * await-value.tsx — รอ promise แล้วแสดงผลจาก children(value) (server component)
 *
 * ใช้ครอบด้วย <Suspense> สำหรับข้อความเล็ก ๆ ที่ต้องใช้ข้อมูล เช่น "สินค้าทั้งหมด 155 รายการ" ในหัวหน้า
 * หัวเรื่องขึ้นทันที ส่วนที่ต้องรอข้อมูลค่อยตามมา ไม่บล็อกทั้งหน้า
 * (children เป็นฟังก์ชันได้เพราะอยู่ฝั่ง server ทั้งคู่ — ไม่ได้ข้ามไปหา client component)
 */
export async function AwaitValue<T>({
  promise,
  children,
}: {
  promise: Promise<T>
  children: (value: T) => React.ReactNode
}) {
  return children(await promise)
}
