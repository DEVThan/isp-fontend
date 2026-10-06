import Link from "next/link"
import { ArrowRight, Download, Plus } from "lucide-react"
import { getLocale, getTranslations } from "next-intl/server"

import { CancelledMonthCard } from "@/app/dashboard/_components/cancelled_month_card"
import { CompletedMonthCard } from "@/app/dashboard/_components/completed_month_card"
import { RevenueMonthCard } from "@/app/dashboard/_components/revenue_month_card"
import { SoMonthCard } from "@/app/dashboard/_components/so_month_card"
import { PackageMix } from "@/components/package-mix"
import { PageHeader } from "@/components/page-header"
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
import { formatTHB, invoices, tickets, traffic } from "@/lib/mock-data"

export default async function DashboardPage() {
  const t = await getTranslations("dashboard")
  const ti = await getTranslations("invoices.columns")
  const tc = await getTranslations("common")
  const locale = await getLocale()

  return (
    <>
      <PageHeader title={t("title")} description={t("description")}>
        {/* <Button variant="outline">
          <Download />
          {t("exportReport")}
        </Button>
        <Button>
          <Plus />
          {t("addCustomer")}
        </Button> */}
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* ข้อมูลจริง ดึงเองใน component (06/10/2026): ใบสั่งขายเดือนนี้ แทน "ลูกค้าทั้งหมด" ·
            รายได้เดือนนี้ = sum(so.pay_amount) แทนตัวอย่างเดิม — ทั้ง 4 card เป็นข้อมูลจริงแล้ว */}
        <SoMonthCard />
        <RevenueMonthCard />
        {/* สำเร็จเดือนนี้ (ลูกค้าได้รับสินค้าแล้ว) — ข้อมูลจริง (06/10/2026 แทน "ค้างชำระ" ตัวอย่างใบสุดท้าย) */}
        <CompletedMonthCard />
        {/* ยกเลิกเดือนนี้ — ข้อมูลจริง (06/10/2026 แทน "งานแจ้งซ่อมค้าง") */}
        <CancelledMonthCard />
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
