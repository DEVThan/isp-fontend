import {
  API_NETWORK_ERROR,
  ApiError,
  type ApiEnvelope,
} from "@/app/login/components/api"
import type {
  BroadcastOption,
  CustomerOption,
  NamedOption,
  So,
  SoDeleted,
  SoExportOption,
  SoFormMode,
  SoFormValues,
  SoList,
  SoOptions,
  VendorOption,
  ShippingRegistryOption,
} from "@/app/sale/so_export/_components/model"

/**
 * api.ts — เส้น API ของหน้าใบสั่งขาย (ตาราง so)
 *
 * ฝั่ง browser ยิง "/api/web" แล้วให้ rewrite ใน next.config.ts ส่งต่อไป Flask (เลี่ยง CORS)
 * ฝั่ง server ไม่มี origin ให้อ้าง path สัมพัทธ์จึงใช้ไม่ได้ ต้องใช้ URL เต็มจาก API_BASE_URL
 *
 * หน้าส่งออกใบสั่งขาย (so_export) — ข้อมูลเป็นคอลัมน์ชุดเดียวกับตาราง so (ดู model.ts) แต่ยิงเส้นของตัวเอง 4 เส้น:
 *   so_export-get-list / so_export-action / so_export-get-delet / so_export-get-option
 * (แก้ 29/09/2026: ฝั่ง API จริงชื่อ so_export-action ไม่ใช่ -get-action · -get-delet / -get-option ยังไม่มีใน API)
 * (ชื่อเส้นตามที่สั่งมา 28/09/2026 — ตอนนั้นใน routes/web.py ยังไม่มีทั้ง 4 เส้น มีแค่ /so-export ที่คืนไฟล์ .xlsx)
 * ตัวเลือกของช่อง select ในฟอร์มยังมาจากเส้น -get-option ของทะเบียนอื่น ดู getSoOptions ท้ายไฟล์
 */
const API_BASE_URL =
  typeof window === "undefined"
    ? (process.env.API_BASE_URL ?? "http://localhost:8081/api/web")
    : (process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api/web")

/** ขอทีเดียวได้มากสุดเท่าที่ API ยอม (_PER_PAGE_MAX ฝั่ง Flask) */
export const SO_PER_PAGE_MAX = 100

/** จำนวนแถวต่อหน้าที่หน้านี้ใช้ตอนเปิดครั้งแรก */
export const SO_PAGE_SIZE = 30

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

/** เงื่อนไขที่ so_export-get-list รับ (ชุดเดียวกับ so-get-list) — ทุกตัวไม่บังคับ ไม่ส่ง = ไม่กรองตัวนั้น */
export type SoQuery = {
  /** ค้นจาก so.so_code ฝั่งเซิร์ฟเวอร์ (ilike "มีคำนี้อยู่") */
  soCode?: string
  /** ค้นจาก so.name (ชื่อผู้สั่ง) */
  name?: string
  tel?: string
  status?: string
  channel?: string
  itemCode?: string
  productName?: string
  sellBy?: string
  /** ค้นจาก so.vendor_name — ตัวกรองผู้ขายส่งชื่อเต็มจาก /vendor-get-option (API ค้นแบบมีคำนี้อยู่) */
  vendorName?: string
  /** ค้นจาก so.shipment_type — ตัวกรองประเภทการจัดส่งส่งชื่อจาก /status-shiptmenttype-get-option */
  shipmentType?: string
  /** po_date (วันที่สั่งซื้อ) ตั้งแต่วันนี้ — รูปแบบ YYYY-MM-DD เท่านั้น ผิดรูป API ตอบ 400 */
  dateFrom?: string
  dateTo?: string
  page?: number
  perPage?: number
}

/** ส่งไปเฉพาะวันที่ครบรูป YYYY-MM-DD — ช่อง type="date" ที่กรอกไม่ครบคืนสตริงว่างมา */
const dateParam = (value: string | undefined) =>
  value && /^\d{4}-\d{2}-\d{2}$/.test(value.trim()) ? value.trim() : ""

/**
 * POST /api/web/so_export-get-list — ใบสั่งขายทั้งหมด ออเดอร์ใหม่ขึ้นก่อน แล้ว po_date ใหม่สุดก่อน
 *
 * ค้นหา/กรองช่วงวันที่/แบ่งหน้า ทำที่ฝั่งเซิร์ฟเวอร์ทั้งหมด ตารางแค่ส่งเงื่อนไขไปแล้วแสดงผลที่ได้
 * ไม่เจอเลย API ตอบ 200 พร้อม so = [] — ไม่ใช่ error
 * (เรียงด้วย po_date ไม่ใช่ updated_at เพราะงาน sync เขียน updated_at เท่ากันทั้งรอบ)
 */
export async function getSoExportList(query: SoQuery = {}): Promise<SoList> {
  const result = await post<SoList & { so_export?: So[] }>("so_export-get-list", {
    so_code: query.soCode ?? "",
    name: query.name ?? "",
    tel: query.tel ?? "",
    status: query.status ?? "",
    channel: query.channel ?? "",
    item_code: query.itemCode ?? "",
    product_name: query.productName ?? "",
    sell_by: query.sellBy ?? "",
    vendor_name: query.vendorName ?? "",
    shipment_type: query.shipmentType ?? "",
    date_from: dateParam(query.dateFrom),
    date_to: dateParam(query.dateTo),
    page: query.page ?? 1,
    per_page: query.perPage ?? SO_PAGE_SIZE,
  })
  return {
    // เส้นนี้ยังไม่มีตอนเขียน ไม่รู้ว่าจะตอบคีย์ "so_export" หรือ "so" (แบบ so-get-list) — รับได้ทั้งคู่
    so: result?.so_export ?? result?.so ?? [],
    total: result?.total ?? 0,
    page: result?.page ?? 1,
    per_page: result?.per_page ?? 0,
    total_pages: result?.total_pages ?? 1,
  }
}

/**
 * POST /api/web/so_export-action — เพิ่ม/แก้ไข เส้นเดียวจบ แยกด้วย action ใน body
 *
 * "add" ส่ง id เป็น 0 (ฐานข้อมูลออกเลขให้จาก sequence) · "edit" ต้องส่ง id ของแถวที่แก้
 * ทั้งสองแบบส่งไปทุกฟิลด์ ไม่ใช่เฉพาะที่แก้ และคืนแถวหลังบันทึกกลับมา (รวมคอลัมน์ของงาน sync)
 * บังคับแค่ so_code · ซ้ำกับแถวเดิมทั้ง (so_code, product_name, product_group) API ตอบ 400
 * "so_code with this product already exists" · customer_id / shipment_type_id ที่ไม่มีจริงตอบ 400
 * ข้อความจาก API ถูกโชว์ในฟอร์มตรง ๆ ไม่ได้แปลใหม่
 */
export async function saveSoExport(
  action: SoFormMode,
  values: SoFormValues,
  soId?: number
): Promise<So> {
  return (await post<So>("so_export-action", {
    action,
    id: soId ?? 0,
    ...values,
  })) as So
}

/**
 * POST /api/web/so_export-get-delet — ลบรายการตาม id (ส่งไปแค่ id เท่านั้น)
 *
 * ลบทีละแถว ไม่ใช่ทั้งใบ · ลบออกจากตารางจริง กู้คืนไม่ได้
 * แถวที่มาจากไฟล์ sync งาน sync รอบถัดไปจะเติมกลับมาใหม่
 */
export async function deleteSoExport(id: number): Promise<SoDeleted> {
  // ชื่อเส้นสะกด "delet" ตามที่สั่งมา — ถ้าฝั่ง API ตั้งเป็น "-delete" ต้องแก้ตรงนี้ให้ตรงกัน
  return (await post<SoDeleted>("so_export-get-delet", { id })) as SoDeleted
}

/** ไฟล์ที่ได้จากการส่งออกตามเทมเพลตผู้ขาย — group คือชื่อกลุ่มที่ถูกเขียนลง so.export_group_name แล้ว */
export type SoVendorExport = {
  blob: Blob
  fileName: string
  group: string
}

/**
 * POST /api/web/so_export-vendor — ส่งออกรายการที่เลือกตามเทมเพลตของผู้ขาย
 *
 * API หาเทมเพลตจาก vendor.export_template แล้วเติมข้อมูลลงแถว {token} ในไฟล์
 * สร้างไฟล์สำเร็จแล้วตั้ง export_group_name = "{รหัสผู้ขาย}-yymmdd-hhmmss" ให้ทุกแถวที่ส่งไป
 * สำเร็จตอบเป็นไฟล์ (ชื่อกลุ่มอยู่ใน header X-Export-Group) · ผิดพลาดตอบ JSON envelope ปกติ
 * จึงแยกด้วย Content-Type ไม่ใช้ post() ข้างบนที่อ่านเป็น JSON อย่างเดียว
 */
export async function exportSoByVendor(
  vendorId: number,
  ids: number[]
): Promise<SoVendorExport> {
  const url = `${API_BASE_URL}/so_export-vendor`
  let res: Response

  try {
    res = await fetch(url, {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vendor_id: vendorId, ids }),
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

  const group = res.headers.get("X-Export-Group") ?? ""
  // ชื่อไฟล์จริงอยู่ใน Content-Disposition (นามสกุลตามเทมเพลต .xlsx / .xlsm) — อ่านไม่ได้ใช้ชื่อกลุ่ม
  const disposition = res.headers.get("Content-Disposition") ?? ""
  const fileName =
    /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition)?.[1] ??
    `${group || "so_export"}.xlsx`
  return { blob: await res.blob(), fileName: decodeURIComponent(fileName), group }
}

/** ยิงเส้น -get-option หนึ่งเส้น — พังก็คืน [] ช่องนั้นแค่ไม่มีตัวเลือก ไม่ลากช่องอื่นพังไปด้วย */
async function options<T>(path: string): Promise<T[]> {
  try {
    return (await post<T[]>(path, {})) ?? []
  } catch {
    // ห้าม console.error — ใน dev overlay จะขึ้นเต็มจอเหมือนหน้าพัง
    return []
  }
}

/**
 * ตัวเลือกของช่อง select ทั้งหมดในหน้านี้ — 7 เส้นยิงพร้อมกัน ไม่รับพารามิเตอร์ ได้เฉพาะตัวที่ active
 *
 * ช่องในฟอร์มอ้างถึงทะเบียนอื่น จึงดึงจากทะเบียนที่แต่ละคอลัมน์อ้างถึง (ไม่ใช่ so_export-get-option):
 *   status -> status_po · pay_by -> payment_type · is_payment -> status_payment
 *   shipment_type -> shiptment_type (ตัวเดียวที่ผูกด้วย id: so.shipment_type_id)
 *   channel / channel_name -> broadcast · product_type_name -> product_type · vendor_name -> vendor
 * ไม่มีทาง throw: เส้นไหนล้มช่องนั้นว่าง ส่วนค่าเดิมของแถวยังโชว์อยู่ (ฟอร์มเติมให้เอง)
 */
export async function getSoOptions(): Promise<SoOptions> {
  const [
    statuses,
    payTypes,
    paymentStatuses,
    shipmentTypes,
    broadcasts,
    productTypes,
    vendors,
    shippings,
  ] = await Promise.all([
    options<NamedOption>("status-po-get-option"),
    options<NamedOption>("payment-type-get-option"),
    options<NamedOption>("status-payment-get-option"),
    options<NamedOption>("status-shiptmenttype-get-option"),
    options<BroadcastOption>("broadcast-get-option"),
    options<NamedOption>("product-type-get-option"),
    options<VendorOption>("vendor-get-option"),
    options<ShippingRegistryOption>("shipping-get-option"),
  ])
  return {
    statuses,
    payTypes,
    paymentStatuses,
    shipmentTypes,
    broadcasts,
    productTypes,
    vendors,
    shippings,
  }
}

/**
 * POST /api/web/so_export-get-option — ตัวเลือกของหน้านี้เอง (ไม่รับพารามิเตอร์)
 *
 * รูปแบบแถวยังไม่รู้แน่ (เส้นยังไม่มีตอนเขียน) — เดาไว้ว่า id + so_code แบบเส้น -get-option อื่น ดู SoExportOption
 * ยังไม่ได้ผูกกับช่องไหนในหน้า · พังก็คืน [] เหมือนเส้นตัวเลือกอื่น
 */
export async function getSoExportOptions(): Promise<SoExportOption[]> {
  return options<SoExportOption>("so_export-get-option")
}

/**
 * POST /api/web/customer-get-option — ค้นลูกค้าสำหรับช่องผู้สั่งซื้อ
 *
 * ทะเบียนลูกค้ามี ~99,000 คน เส้นนี้จึงไม่คืนทั้งตาราง: ค้นด้วย name หรือ tel (ilike "มีคำนี้อยู่")
 * แล้วได้ไม่เกิน 20 คน · ไม่ส่งคำค้น = ลูกค้าล่าสุด 20 คน
 * คำค้นที่เป็นตัวเลขล้วน (ยอมขีด/เว้นวรรค) ถือเป็นเบอร์โทร นอกนั้นค้นจากชื่อ
 * ต่างจาก getSoOptions ตรงที่ throw ได้ — ช่องค้นหาต้องบอกผู้ใช้ว่าค้นไม่สำเร็จ ไม่ใช่ "ไม่พบ"
 */
export async function getCustomerOptions(
  search: string
): Promise<CustomerOption[]> {
  const text = search.trim()
  const digits = text.replace(/[\s-]/g, "")
  const byTel = /^\d+$/.test(digits)
  return (
    (await post<CustomerOption[]>("customer-get-option", {
      name: byTel ? "" : text,
      tel: byTel ? digits : "",
    })) ?? []
  )
}
