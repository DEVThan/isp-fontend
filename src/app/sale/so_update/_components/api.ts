import {
  API_NETWORK_ERROR,
  ApiError,
  type ApiEnvelope,
} from "@/app/login/components/api"
import type {
  SoUpdateApplied,
  SoUpdateField,
  SoUpdatePreview,
} from "@/app/sale/so_update/_components/model"

/**
 * api.ts — เส้น API ของหน้าอัปเดตข้อมูลใบสั่งขาย (controller/web/so_update.py)
 *
 * ฝั่ง browser ยิง "/api/web" แล้วให้ rewrite ใน next.config.ts ส่งต่อไป Flask (เลี่ยง CORS)
 * ฝั่ง server ไม่มี origin ให้อ้าง path สัมพัทธ์จึงใช้ไม่ได้ ต้องใช้ URL เต็มจาก API_BASE_URL
 */
const API_BASE_URL =
  typeof window === "undefined"
    ? (process.env.API_BASE_URL ?? "http://localhost:8081/api/web")
    : (process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api/web")

/** ตรงกับ _FILE_MAX_BYTES ฝั่ง API — เช็คก่อนส่ง จะได้ไม่ต้องรออัปโหลดไฟล์ใหญ่จนเสร็จแล้วค่อยโดนปฏิเสธ */
export const SO_UPDATE_MAX_BYTES = 10 * 1024 * 1024

/** นามสกุลที่ API อ่านได้ (openpyxl อ่าน .xls ไม่ได้ — ต้องบันทึกเป็น .xlsx ก่อน) */
export const SO_UPDATE_EXTENSIONS = ["xlsx", "xlsm"]

/** ยิง POST แล้วแกะ envelope มาตรฐานของ /api/web — body เป็น FormData ได้ (ไม่ตั้ง Content-Type เอง ให้ browser ใส่ boundary) */
async function post<T>(path: string, body: unknown): Promise<T | undefined> {
  const url = `${API_BASE_URL}/${path}`
  const isForm = body instanceof FormData
  let res: Response

  try {
    res = await fetch(url, {
      method: "POST",
      cache: "no-store",
      ...(isForm ? {} : { headers: { "Content-Type": "application/json" } }),
      body: isForm ? body : JSON.stringify(body),
    })
  } catch (cause) {
    throw new ApiError(
      API_NETWORK_ERROR,
      `เรียก API ไม่สำเร็จ: ${url} (${String(cause)})`
    )
  }

  // API ควรตอบ JSON เสมอ แต่ถ้าเจอหน้า HTML ของ proxy/error page ก็ต้องไม่ระเบิดตรง .json()
  const envelope = (await res.json().catch(() => null)) as ApiEnvelope<T> | null
  if (!envelope) {
    throw new ApiError(res.status, res.statusText || "Invalid response")
  }
  if (!envelope.status) {
    throw new ApiError(envelope.resultcode ?? res.status, envelope.message)
  }
  return envelope.result
}

/**
 * POST /api/web/so-update-preview — อัปโหลด Excel (ชีตแรก หัวคอลัมน์ so_code + ชื่อ field) ให้ API ตรวจ
 * อ่านอย่างเดียว ยังไม่อัปเดตอะไร · หาหัวไม่เจอ / ไม่ใช่ Excel / ไม่มีแถว -> ApiError (400) พร้อมข้อความ
 */
export async function previewSoUpdate(
  field: SoUpdateField,
  file: File
): Promise<SoUpdatePreview> {
  const form = new FormData()
  form.append("field", field)
  form.append("file", file)
  return (await post<SoUpdatePreview>("so-update-preview", form)) as SoUpdatePreview
}

/**
 * POST /api/web/so-update-apply — ยืนยันอัปเดตคอลัมน์ของ field ทุกแถวของ so_code ที่ส่งไป
 * API ตรวจซ้ำทั้งหมดก่อนเขียน (ข้อมูลอาจเปลี่ยนระหว่างดูตัวอย่าง) แล้วอัปเดตใน transaction เดียว
 */
export async function applySoUpdate(
  field: SoUpdateField,
  items: { so_code: string; value: string }[]
): Promise<SoUpdateApplied> {
  return (await post<SoUpdateApplied>("so-update-apply", { field, items })) as SoUpdateApplied
}

/**
 * POST /api/web/so-update-template — ไฟล์ตัวอย่าง so_update_<field>_template.xlsx (สร้างใหม่ทุกครั้ง)
 * ชีต so_update: หัว so_code | <field> + dropdown · ชีต <field>: รายชื่อค่า active ของทะเบียน + วิธีใช้
 * สำเร็จตอบเป็นไฟล์ ผิดพลาดตอบ JSON envelope — แยกด้วย Content-Type (post() อ่านเป็น JSON อย่างเดียวจึงใช้ไม่ได้)
 */
export async function downloadSoUpdateTemplate(
  field: SoUpdateField
): Promise<{ blob: Blob; fileName: string }> {
  const url = `${API_BASE_URL}/so-update-template`
  let res: Response
  try {
    res = await fetch(url, {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ field }),
    })
  } catch (cause) {
    throw new ApiError(
      API_NETWORK_ERROR,
      `เรียก API ไม่สำเร็จ: ${url} (${String(cause)})`
    )
  }
  if (!res.ok || (res.headers.get("Content-Type") ?? "").includes("json")) {
    const envelope = (await res.json().catch(() => null)) as ApiEnvelope<unknown> | null
    throw new ApiError(
      envelope?.resultcode ?? res.status,
      envelope?.message ?? (res.statusText || "Invalid response")
    )
  }
  const disposition = res.headers.get("Content-Disposition") ?? ""
  const fileName =
    /filename="?([^";]+)"?/i.exec(disposition)?.[1] ?? `so_update_${field}_template.xlsx`
  return { blob: await res.blob(), fileName }
}
