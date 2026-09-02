import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import { getUserRoles } from "@/app/setting/userrole/_components/api"
import type { UserRoleList } from "@/app/setting/userrole/_components/model"
import { Tables } from "@/app/setting/userrole/_components/table"
import { PageHeader } from "@/components/page-header"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("userroles")
  return { title: t("title") }
}

export default async function UserRolePage() {
  const t = await getTranslations("userroles")

  // API ล่ม/ต่อไม่ได้ ต้องไม่ทำให้ทั้งหน้าพัง — โชว์ตารางว่างพร้อมข้อความบอกแทน
  // ดึงหน้าแรกให้ตั้งแต่ฝั่งเซิร์ฟเวอร์ จากนั้นตาราง (client) จะยิงเองทุกครั้งที่ค้นหา/เปลี่ยนหน้า
  let list: UserRoleList = {
    userroles: [],
    total: 0,
    page: 1,
    per_page: 0,
    total_pages: 1,
  }
  let loadError = false
  try {
    list = await getUserRoles()
  } catch {
    loadError = true
  }

  return (
    <div className="flex flex-col gap-0">
      <PageHeader
        title={t("title")}
        description={t("description", { count: list.total })}
      />

      <Tables initial={list} initialError={loadError} />
    </div>
  )
}
