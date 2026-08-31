import type { Metadata } from "next"
import { getLocale, getTranslations } from "next-intl/server"

import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatTHB, payments } from "@/lib/mock-data"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("payments")
  return { title: t("title") }
}

export default async function PaymentsPage() {
  const t = await getTranslations("payments")
  const tcol = await getTranslations("payments.columns")
  const tm = await getTranslations("payments.methods")
  const locale = await getLocale()
  const total = payments.reduce((sum, payment) => sum + payment.amount, 0)

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description", { total: formatTHB(total, locale) })}
      />

      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tcol("id")}</TableHead>
                <TableHead>{tcol("customer")}</TableHead>
                <TableHead>{tcol("method")}</TableHead>
                <TableHead className="text-right">{tcol("amount")}</TableHead>
                <TableHead>{tcol("paidAt")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-mono text-xs">
                    {payment.id}
                  </TableCell>
                  <TableCell className="font-medium">
                    {payment.customer}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{tm(payment.methodKey)}</Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatTHB(payment.amount, locale)}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {payment.paidAt}
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
