import {
  API_NETWORK_ERROR,
  ApiError,
  type ApiEnvelope,
} from "@/app/login/components/api"
import type {
  TemplateMapping,
  VendorExportTemplate,
  VendorExportTemplateDeleted,
  VendorExportTemplateFormMode,
  VendorExportTemplateFormValues,
  VendorExportTemplateList,
  VendorExportTemplateOption,
  ShipmentTypeOption,
} from "@/app/vendor/vendor_export_template/_components/model"

/**
 * api.ts — เส้น API ของหน้าเทมเพลตส่งออกผู้ขาย (ตาราง vendor_export_template)
 *
 * ฝั่ง browser ยิง "/api/web" แล้วให้ rewrite ใน next.config.ts ส่งต่อไป Flask (เลี่ยง CORS)
 * ฝั่ง server ไม่มี origin ให้อ้าง path สัมพัทธ์จึงใช้ไม่ได้ ต้องใช้ URL เต็มจาก API_BASE_URL
 */
const API_BASE_URL =
  typeof window === "undefined"
    ? (process.env.API_BASE_URL ?? "http://localhost:8081/api/web")
    : (process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api/web")

/** ขอทีเดียวได้มากสุดเท่าที่ API ยอม (_PER_PAGE_MAX ฝั่ง Flask) */
export const TEMPLATE_PER_PAGE_MAX = 100

/** จำนวนแถวต่อหน้าที่หน้านี้ใช้ตอนเปิดครั้งแรก */
export const TEMPLATE_PAGE_SIZE = 30

/** ยิง POST พร้อม body แล้วแกะ envelope มาตรฐานของ /api/web ให้ — ผิดพลาดจะโยน ApiError */
async function post<T>(path: string, body: unknown): Promise<T | undefined> {
  const url = `${API_BASE_URL}/${path}`
  let res: Response

  try {
    res = await fetch(url, {
      method: "POST",
      // หน้าจัดการต้องเห็นของที่เพิ่งแก้เสมอ ห้ามให้ Next cache ไว้
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
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

export type VendorExportTemplateQuery = {
  /** ค้นจาก vendor_export_template.name ฝั่งเซิร์ฟเวอร์ (ilike ไม่สนตัวพิมพ์เล็ก/ใหญ่) — ไม่ส่ง = ไม่กรอง */
  name?: string
  /** ชื่อประเภทการจัดส่งจาก dropdown — ตรงตัว ไม่สนตัวพิมพ์ · null = ไม่กรอง */
  shipmentType?: string | null
  /** "active" / "inactive" — null หรือไม่ส่ง = ไม่กรองสถานะ */
  status?: string | null
  page?: number
  perPage?: number
}

/**
 * POST /api/web/vendor-export-template-get-list — เทมเพลตทั้งหมด (รวมที่ปิดอยู่)
 *
 * ค้นหา/กรองสถานะ/แบ่งหน้า ทำที่ฝั่งเซิร์ฟเวอร์ทั้งหมด ตารางแค่ส่งเงื่อนไขไปแล้วแสดงผลที่ได้
 * ตารางว่าง API ตอบ 200 พร้อม vendorexporttemplates = [] — ไม่ใช่ error
 */
export async function getVendorExportTemplates(
  query: VendorExportTemplateQuery = {}
): Promise<VendorExportTemplateList> {
  const result = await post<VendorExportTemplateList>(
    "vendor-export-template-get-list",
    {
      name: query.name ?? "",
      // ไม่ส่ง active_status เลยเมื่อไม่ได้กรอง — ส่งสตริงว่างไปก็ได้ แต่ไม่ส่งอ่านง่ายกว่าตอน debug
      ...(query.status ? { active_status: query.status } : {}),
      ...(query.shipmentType ? { shipment_type: query.shipmentType } : {}),
      page: query.page ?? 1,
      per_page: query.perPage ?? TEMPLATE_PAGE_SIZE,
    }
  )
  return {
    vendorexporttemplates: result?.vendorexporttemplates ?? [],
    total: result?.total ?? 0,
    page: result?.page ?? 1,
    per_page: result?.per_page ?? 0,
    total_pages: result?.total_pages ?? 1,
  }
}

/**
 * POST /api/web/vendor-export-template-get-option — ตัวเลือกเทมเพลตที่ active (id + name + path)
 * ไม่รับพารามิเตอร์ ไม่แบ่งหน้า
 */
export async function getVendorExportTemplateOptions(): Promise<
  VendorExportTemplateOption[]
> {
  return (
    (await post<VendorExportTemplateOption[]>(
      "vendor-export-template-get-option",
      {}
    )) ?? []
  )
}

/**
 * POST /api/web/status-shiptmenttype-get-option — ประเภทการจัดส่งที่ active (id + name) ไม่รับพารามิเตอร์
 * ใช้ทั้งในฟอร์มและตัวกรอง · พังก็คืน [] ช่องนั้นแค่ไม่มีตัวเลือก (ห้าม console.error — dev overlay ขึ้นเต็มจอ)
 */
export async function getShipmentTypeOptions(): Promise<ShipmentTypeOption[]> {
  try {
    return (await post<ShipmentTypeOption[]>("status-shiptmenttype-get-option", {})) ?? []
  } catch {
    return []
  }
}

/**
 * POST /api/web/vendor-export-template-action — เพิ่ม/แก้ไข เส้นเดียวจบ แยกด้วย action ใน body
 *
 * "add" ส่ง id เป็น 0 (คอลัมน์ id เป็น identity ฐานข้อมูลออกเลขให้เอง) · "edit" ต้องส่ง id ของแถวที่แก้
 * ทั้งสองแบบส่งไปทุกฟิลด์ ไม่ใช่เฉพาะที่แก้ และคืนแถวหลังบันทึกกลับมา
 * ชื่อซ้ำกับแถวอื่น API ตอบ 400 "name already exists" · name/path ยาวเกินตอบ 400 เหมือนกัน
 * path ส่งว่างได้ (ตอน add ยังไม่มีไฟล์) — path จริงมาจาก uploadVendorExportTemplateFile() ซึ่งเขียนคอลัมน์ให้เอง
 * ข้อความจาก API ถูกโชว์ในฟอร์มตรง ๆ ไม่ได้แปลใหม่
 */
export async function saveVendorExportTemplate(
  action: VendorExportTemplateFormMode,
  values: VendorExportTemplateFormValues,
  templateId?: number
): Promise<VendorExportTemplate> {
  return (await post<VendorExportTemplate>("vendor-export-template-action", {
    action,
    id: templateId ?? 0,
    ...values,
  })) as VendorExportTemplate
}

/**
 * POST /api/web/vendor-export-template-upload — อัปโหลดไฟล์เทมเพลต Excel (multipart: id + file) คืน path ที่เก็บในคอลัมน์ path
 *
 * เก็บที่ /uploads/vendor_export_template/{id}/template/{ชื่อไฟล์} — API ลบไฟล์เดิมทิ้งและเขียน path ลงคอลัมน์ให้เลย
 * ต้องมีแถวอยู่แล้ว (มี id) ฟอร์มเพิ่มจึงอัปโหลดหลังบันทึกแถวเสร็จ
 * ไม่ใช้ post() ข้างบน เพราะ body เป็น FormData ไม่ใช่ JSON (ห้ามตั้ง Content-Type เอง ให้ browser ใส่ boundary)
 */
export async function uploadVendorExportTemplateFile(
  file: File,
  templateId: number
): Promise<string> {
  const url = `${API_BASE_URL}/vendor-export-template-upload`
  const form = new FormData()
  form.append("id", String(templateId))
  form.append("file", file)
  let res: Response

  try {
    res = await fetch(url, { method: "POST", cache: "no-store", body: form })
  } catch (cause) {
    throw new ApiError(
      API_NETWORK_ERROR,
      `เรียก API ไม่สำเร็จ: ${url} (${String(cause)})`
    )
  }

  const envelope = (await res.json().catch(() => null)) as ApiEnvelope<{
    path: string
  }> | null
  if (!envelope) {
    throw new ApiError(res.status, res.statusText || "Invalid response")
  }
  if (!envelope.status || !envelope.result?.path) {
    throw new ApiError(envelope.resultcode ?? res.status, envelope.message)
  }
  return envelope.result.path
}

/**
 * POST /api/web/vendor-export-template-mapping-get — หัวคอลัมน์ในไฟล์ + การจับคู่ที่บันทึกไว้ (หรือที่ระบบเดาให้)
 *
 * ส่ง sheet / headerRow เมื่อผู้ใช้เปลี่ยนชีตหรือแถวหัวตาราง — API อ่านหัวคอลัมน์ของแถวนั้นแล้วเดาใหม่
 * ไม่ส่ง = ใช้ที่บันทึกไว้ หรือให้ API หาแถวหัวตารางเอง
 */
export async function getTemplateMapping(
  id: number,
  sheet?: string,
  headerRow?: number
): Promise<TemplateMapping> {
  return (await post<TemplateMapping>("vendor-export-template-mapping-get", {
    id,
    ...(sheet ? { sheet } : {}),
    ...(headerRow ? { header_row: headerRow } : {}),
  })) as TemplateMapping
}

/**
 * POST /api/web/vendor-export-template-mapping-save — บันทึกการจับคู่ (ตัวอักษรคอลัมน์ -> นิพจน์)
 *
 * API จำหัวคอลัมน์ -> นิพจน์ ทุกคู่ไว้ เทมเพลตถัดไปที่มีหัวเดียวกันจึงจับคู่ได้เอง
 * ชื่อใน {…} ที่ไม่รู้จัก / ไม่มีคอลัมน์ไหนถูกจับคู่ API ตอบ 400
 */
export async function saveTemplateMapping(
  id: number,
  sheet: string,
  headerRow: number,
  mapping: Record<string, string>
): Promise<VendorExportTemplate> {
  return (await post<VendorExportTemplate>("vendor-export-template-mapping-save", {
    id,
    sheet,
    header_row: headerRow,
    mapping,
  })) as VendorExportTemplate
}

/**
 * POST /api/web/vendor-export-template-delete — ลบเทมเพลตตาม id (ส่งไปแค่ id เท่านั้น)
 *
 * ลบออกจากตารางจริง กู้คืนไม่ได้ · ผลลัพธ์คือแถวที่หายไป
 */
export async function deleteVendorExportTemplate(
  id: number
): Promise<VendorExportTemplateDeleted> {
  return (await post<VendorExportTemplateDeleted>(
    "vendor-export-template-delete",
    { id }
  )) as VendorExportTemplateDeleted
}
