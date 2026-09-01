import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import { Tables } from "@/app/setting/menu/_components/table"
import { PageHeader } from "@/components/page-header"
import { adminUsers } from "@/lib/mock-data"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("users")
  return { title: t("title") }
}

export default async function UsersPage() {
  const t = await getTranslations("users")

  return (
    <>
      <div className="flex flex-col gap-0">
        <PageHeader
          title={t("title")}
          description={t("description", { count: adminUsers.length })}
        />

        <Tables rows={adminUsers} />
      </div>
    </>
  )
}
