import type { Metadata } from "next"
import { UserPlus } from "lucide-react"
import { getTranslations } from "next-intl/server"

import { PageHeader } from "@/components/page-header"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { adminUsers } from "@/lib/mock-data"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("users")
  return { title: t("title") }
}

export default async function UsersPage() {
  const t = await getTranslations("users")
  const tcol = await getTranslations("users.columns")
  const tr = await getTranslations("users.roles")

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description", { count: adminUsers.length })}
      >
        <Button>
          <UserPlus />
          {t("invite")}
        </Button>
      </PageHeader>

      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tcol("name")}</TableHead>
                <TableHead>{tcol("email")}</TableHead>
                <TableHead>{tcol("role")}</TableHead>
                <TableHead>{tcol("lastActive")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {adminUsers.map((user) => (
                <TableRow key={user.email}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="size-7">
                        <AvatarFallback className="text-xs">
                          {user.name.slice(0, 1)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{user.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.email}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={
                        user.roleKey === "owner"
                          ? "bg-info/12 text-info-ink border-transparent"
                          : undefined
                      }
                    >
                      {tr(user.roleKey)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {user.lastActive}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  )
}
