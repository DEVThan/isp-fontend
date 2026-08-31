import type { Metadata } from "next"
import { Download } from "lucide-react"
import { getLocale, getTranslations } from "next-intl/server"

import { PageHeader } from "@/components/page-header"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatTHB, invoices, type Invoice } from "@/lib/mock-data"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("invoices")
  return { title: t("title") }
}

const tabs = ["all", "unpaid", "overdue", "paid"] as const

async function InvoiceTable({ rows }: { rows: Invoice[] }) {
  const t = await getTranslations("invoices")
  const tcol = await getTranslations("invoices.columns")
  const locale = await getLocale()

  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        {t("empty")}
      </p>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{tcol("id")}</TableHead>
          <TableHead>{tcol("customer")}</TableHead>
          <TableHead>{tcol("period")}</TableHead>
          <TableHead className="text-right">{tcol("amount")}</TableHead>
          <TableHead>{tcol("dueDate")}</TableHead>
          <TableHead>{tcol("status")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((invoice) => (
          <TableRow key={invoice.id}>
            <TableCell className="font-mono text-xs">{invoice.id}</TableCell>
            <TableCell className="font-medium">{invoice.customer}</TableCell>
            <TableCell>{invoice.period}</TableCell>
            <TableCell className="text-right tabular-nums">
              {formatTHB(invoice.amount, locale)}
            </TableCell>
            <TableCell className="tabular-nums">{invoice.dueDate}</TableCell>
            <TableCell>
              <StatusBadge status={invoice.status} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export default async function InvoicesPage() {
  const t = await getTranslations("invoices")
  const tc = await getTranslations("common")
  const ts = await getTranslations("status")
  const locale = await getLocale()
  const total = invoices.reduce((sum, invoice) => sum + invoice.amount, 0)

  const tabLabel = (tab: (typeof tabs)[number]) =>
    tab === "all" ? tc("all") : ts(tab)

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description", { total: formatTHB(total, locale) })}
      >
        <Button variant="outline">
          <Download />
          {t("downloadCsv")}
        </Button>
        <Button>{t("create")}</Button>
      </PageHeader>

      <Tabs defaultValue="all">
        <TabsList>
          {tabs.map((tab) => (
            <TabsTrigger key={tab} value={tab}>
              {tabLabel(tab)}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map((tab) => (
          <TabsContent key={tab} value={tab}>
            <Card>
              <CardContent>
                <InvoiceTable
                  rows={
                    tab === "all"
                      ? invoices
                      : invoices.filter((i) => i.status === tab)
                  }
                />
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </>
  )
}
