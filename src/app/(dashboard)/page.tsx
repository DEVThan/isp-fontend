import Link from "next/link"
import { ArrowRight, Download, Plus } from "lucide-react"
import { getLocale, getTranslations } from "next-intl/server"

import { PackageMix } from "@/components/package-mix"
import { PageHeader } from "@/components/page-header"
import { StatCard } from "@/components/stat-card"
import { StatusBadge } from "@/components/status-badge"
import { TrafficChart } from "@/components/traffic-chart"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatTHB, invoices, stats, tickets, traffic } from "@/lib/mock-data"
import { intlLocale } from "@/i18n/config"

export default async function DashboardPage() {
  const t = await getTranslations("dashboard")
  const ti = await getTranslations("invoices.columns")
  const tc = await getTranslations("common")
  const locale = await getLocale()
  const nf = new Intl.NumberFormat(intlLocale(locale))

  return (
    <>
      <PageHeader title={t("title")} description={t("description")}>
        <Button variant="outline">
          <Download />
          {t("exportReport")}
        </Button>
        <Button>
          <Plus />
          {t("addCustomer")}
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard
            key={stat.labelKey}
            label={t(`stats.${stat.labelKey}`)}
            value={
              stat.format === "currency"
                ? formatTHB(stat.value, locale)
                : nf.format(stat.value)
            }
            delta={stat.delta}
            trend={stat.trend}
            hint={t(`stats.${stat.hintKey}`)}
            tone={stat.tone}
          />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TrafficChart data={traffic} />
        </div>
        <PackageMix />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("latestInvoices.title")}</CardTitle>
            <CardDescription>{t("latestInvoices.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{ti("id")}</TableHead>
                  <TableHead>{ti("customer")}</TableHead>
                  <TableHead className="text-right">{ti("amount")}</TableHead>
                  <TableHead>{ti("dueDate")}</TableHead>
                  <TableHead>{ti("status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-mono text-xs">
                      {invoice.id}
                    </TableCell>
                    <TableCell className="font-medium">
                      {invoice.customer}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatTHB(invoice.amount, locale)}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {invoice.dueDate}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={invoice.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("latestTickets.title")}</CardTitle>
            <CardDescription>{t("latestTickets.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {tickets.map((ticket) => (
              <div key={ticket.id} className="space-y-1.5">
                <div className="flex items-start gap-2">
                  <p className="min-w-0 flex-1 truncate text-sm font-medium">
                    {ticket.subject}
                  </p>
                  <StatusBadge status={ticket.priority} />
                </div>
                <p className="text-muted-foreground text-xs">
                  {ticket.customer} · {ticket.updatedAt}
                </p>
              </div>
            ))}
            <Button
              variant="outline"
              className="w-full"
              nativeButton={false}
              render={<Link href="/tickets" />}
            >
              {tc("viewAll")}
              <ArrowRight />
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
