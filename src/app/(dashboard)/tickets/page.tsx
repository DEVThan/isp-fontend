import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import { PageHeader } from "@/components/page-header"
import { StatusBadge } from "@/components/status-badge"
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
import { tickets } from "@/lib/mock-data"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("tickets")
  return { title: t("title") }
}

export default async function TicketsPage() {
  const t = await getTranslations("tickets")
  const tcol = await getTranslations("tickets.columns")
  const open = tickets.filter((ticket) => ticket.status !== "closed").length

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description", { count: open })}
      >
        <Button>{t("create")}</Button>
      </PageHeader>

      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tcol("id")}</TableHead>
                <TableHead>{tcol("customer")}</TableHead>
                <TableHead>{tcol("subject")}</TableHead>
                <TableHead>{tcol("priority")}</TableHead>
                <TableHead>{tcol("status")}</TableHead>
                <TableHead>{tcol("updatedAt")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.map((ticket) => (
                <TableRow key={ticket.id}>
                  <TableCell className="font-mono text-xs">
                    {ticket.id}
                  </TableCell>
                  <TableCell className="font-medium">
                    {ticket.customer}
                  </TableCell>
                  <TableCell>{ticket.subject}</TableCell>
                  <TableCell>
                    <StatusBadge status={ticket.priority} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={ticket.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm tabular-nums">
                    {ticket.updatedAt}
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
