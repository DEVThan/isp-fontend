import {
  API_NETWORK_ERROR,
  ApiError,
  type ApiEnvelope,
} from "@/app/login/components/api"
import type {
  ExportGroup,
  ExportGroupDeleted,
  ExportGroupFormMode,
  ExportGroupFormValues,
  ExportGroupList,
  ExportGroupOption,
  ExportGroupSoList,
  NamedOption,
} from "@/app/sale/export_group/_components/model"

/**
 * api.ts — เส้น API ของหน้ากลุ่มการส่งออก (ตาราง export_group)
 *
 * ฝั่ง browser ยิง "/api/web" แล้วให้ rewrite ใน next.config.ts ส่งต่อไป Flask (เลี่ยง CORS)
 * ฝั่ง server ไม่มี origin ให้อ้าง path สัมพัทธ์จึงใช้ไม่ได้ ต้องใช้ URL เต็มจาก API_BASE_URL
 */
const API_BASE_URL =
  typeof window === "undefined"
    ? (process.env.API_BASE_URL ?? "http://localhost:8081/api/web")
    : (process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api/web")

/** ขอทีเดียวได้มากสุดเท่าที่ API ยอม (_PER_PAGE_MAX ฝั่ง Flask) */
export const EXPORT_GROUP_PER_PAGE_MAX = 100

/** จำนวนแถวต่อหน้าที่หน้านี้ใช้ตอนเปิดครั้งแรก */
export const EXPORT_GROUP_PAGE_SIZE = 30

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

export type ExportGroupQuery = {
  /** ค้นจาก export_group.name ฝั่งเซิร์ฟเวอร์ (ilike "มีคำนี้อยู่") — ไม่ส่ง = ไม่กรอง */
  name?: string
  /** ประเภทการจัดส่ง เทียบตรงตัว ไม่สนตัวพิมพ์ — null หรือไม่ส่ง = ไม่กรอง */
  shiptmentType?: string | null
  page?: number
  perPage?: number
}

/**
 * POST /api/web/export-group-get-list — กลุ่มการส่งออก เรียง updated_at ล่าสุดก่อน
 *
 * ค้นหา/กรอง/แบ่งหน้า ทำที่ฝั่งเซิร์ฟเวอร์ทั้งหมด ตารางแค่ส่งเงื่อนไขไปแล้วแสดงผลที่ได้
 * ไม่เจอเลย API ตอบ 200 พร้อม exportgroups = [] — ไม่ใช่ error
 */
export async function getExportGroups(
  query: ExportGroupQuery = {}
): Promise<ExportGroupList> {
  const result = await post<ExportGroupList>("export-group-get-list", {
    name: query.name ?? "",
    shiptment_type: query.shiptmentType ?? "",
    page: query.page ?? 1,
    per_page: query.perPage ?? EXPORT_GROUP_PAGE_SIZE,
  })
  return {
    exportgroups: result?.exportgroups ?? [],
    total: result?.total ?? 0,
    page: result?.page ?? 1,
    per_page: result?.per_page ?? 0,
    total_pages: result?.total_pages ?? 1,
  }
}

/**
 * POST /api/web/export-group-get-option — ตัวเลือกกลุ่ม (id + name) ค้นจากชื่อ ได้ไม่เกิน 20 ตัว ล่าสุดก่อน
 * ตารางนี้โตทุกครั้งที่ส่งออก จึงไม่คืนทั้งตาราง (แบบเดียวกับ customer-get-option)
 * หน้านี้เองไม่ได้ใช้ — ไว้ให้หน้าอื่นทำ dropdown เลือกกลุ่ม
 */
export async function getExportGroupOptions(search = ""): Promise<ExportGroupOption[]> {
  return (await post<ExportGroupOption[]>("export-group-get-option", { search })) ?? []
}

/**
 * POST /api/web/export-group-get-so — so ที่ so.export_group_name ตรงกับชื่อกลุ่ม (ไม่สนตัวพิมพ์) ทีละหน้า
 * ใช้กับปุ่มดูในตาราง · total / total_amount เป็นของทั้งกลุ่ม · ไม่มีแถวเลย API ตอบ 200 พร้อม so = [] — ไม่ใช่ error
 */
export async function getExportGroupSo(
  name: string,
  { page = 1, perPage = EXPORT_GROUP_PAGE_SIZE }: { page?: number; perPage?: number } = {}
): Promise<ExportGroupSoList> {
  const result = await post<ExportGroupSoList>("export-group-get-so", {
    name,
    page,
    per_page: perPage,
  })
  return {
    so: result?.so ?? [],
    total: result?.total ?? 0,
    total_amount: result?.total_amount ?? "0",
    page: result?.page ?? 1,
    per_page: result?.per_page ?? perPage,
    total_pages: result?.total_pages ?? 1,
  }
}

/**
 * ประเภทการจัดส่งจาก /status-shiptmenttype-get-option — ใช้กับตัวกรองและช่องในฟอร์ม
 * ดึงไม่ได้ = รายการว่าง (ช่องในฟอร์มยังพิมพ์เองได้) ไม่ให้ทั้งหน้าพังเพราะตัวเลือก
 */
export async function getShipmentTypeOptions(): Promise<NamedOption[]> {
  try {
    return (await post<NamedOption[]>("status-shiptmenttype-get-option", {})) ?? []
  } catch {
    // ห้าม console.error — ใน dev overlay จะขึ้นเต็มจอเหมือนหน้าพัง
    return []
  }
}

/**
 * POST /api/web/export-group-action — เพิ่ม/แก้ไข เส้นเดียวจบ แยกด้วย action ใน body
 *
 * "add" ส่ง id เป็น 0 · "edit" ต้องส่ง id ของแถวที่แก้ · ทั้งสองแบบส่งไปทุกฟิลด์ และคืนแถวหลังบันทึกกลับมา
 * ชื่อซ้ำ API ตอบ 400 "name already exists" · ช่องบังคับว่าง/ยาวเกิน/ยอดรวมไม่ใช่จำนวนเต็ม ตอบ 400
 * ข้อความจาก API ถูกโชว์ในฟอร์มตรง ๆ ไม่ได้แปลใหม่
 */
export async function saveExportGroup(
  action: ExportGroupFormMode,
  values: ExportGroupFormValues,
  groupId?: number
): Promise<ExportGroup> {
  return (await post<ExportGroup>("export-group-action", {
    action,
    id: groupId ?? 0,
    ...values,
  })) as ExportGroup
}

/** ไฟล์ที่ได้จากการส่งออกกลุ่มซ้ำ — count = จำนวนแถว so ในไฟล์ (X-Export-Count) */
export type ExportGroupFile = {
  blob: Blob
  fileName: string
  count: number
}

/**
 * POST /api/web/export-group-export — ส่งออกกลุ่มเดิมซ้ำ: so ที่ so.export_group_name = ชื่อกลุ่ม
 * ด้วยเทมเพลตที่บันทึกไว้ตอนส่งออก (template_id) · API อ่านอย่างเดียว ไม่ update อะไรเลย
 * สำเร็จตอบเป็นไฟล์ · ผิดพลาดตอบ JSON envelope (เช่น 400 กลุ่มไม่มีเทมเพลต) จึงแยกด้วย Content-Type
 * (แบบเดียวกับ downloadExport ของหน้า so_export)
 */
export async function exportExportGroup(id: number): Promise<ExportGroupFile> {
  const url = `${API_BASE_URL}/export-group-export`
  let res: Response

  try {
    res = await fetch(url, {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
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

  // อ่าน filename*=UTF-8''… ก่อน — filename="…" เป็นตัวสำรอง ASCII ที่ภาษาไทย (ชื่อเทมเพลต) หายไปแล้ว
  const disposition = res.headers.get("Content-Disposition") ?? ""
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(disposition)?.[1]
  const plain = /filename="?([^";]+)"?/i.exec(disposition)?.[1]
  return {
    blob: await res.blob(),
    fileName: encoded ? decodeURIComponent(encoded) : (plain ?? "export_group.xlsx"),
    count: Number(res.headers.get("X-Export-Count") ?? 0),
  }
}

/**
 * POST /api/web/export-group-delete — ลบกลุ่มตาม id (ส่งไปแค่ id เท่านั้น)
 *
 * ลบออกจากตารางจริง กู้คืนไม่ได้ · ใบสั่งขายในกลุ่มนี้ (so.export_group_name) ถูกคืนเป็น "ออเดอร์ใหม่"
 * พร้อมล้าง export_group_name / shipping_code ในทรานแซกชันเดียวกัน — ผลมีจำนวนแถวที่คืน (so_reset)
 */
export async function deleteExportGroup(id: number): Promise<ExportGroupDeleted> {
  return (await post<ExportGroupDeleted>("export-group-delete", { id })) as ExportGroupDeleted
}
