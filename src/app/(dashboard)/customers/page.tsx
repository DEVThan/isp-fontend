import type { Metadata } from "next"
import { Plus, Search } from "lucide-react"
import { getLocale, getTranslations } from "next-intl/server"

import { PageHeader } from "@/components/page-header"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { customers, formatTHB } from "@/lib/mock-data"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("customers")
  return { title: t("title") }
}

export default async function CustomersPage() {
  const t = await getTranslations("customers")
  const tcol = await getTranslations("customers.columns")
  const ts = await getTranslations("status")
  const locale = await getLocale()

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description", { count: customers.length })}
      >
        <Button>
          <Plus />
          {t("add")}
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <div className="relative min-w-56 flex-1">
              <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
              <Input placeholder={t("search")} className="pl-8" />
            </div>
            <Select defaultValue="all">
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("filterAll")}</SelectItem>
                <SelectItem value="active">{ts("active")}</SelectItem>
                <SelectItem value="suspended">{ts("suspended")}</SelectItem>
                <SelectItem value="pending">{ts("pending")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tcol("id")}</TableHead>
                <TableHead>{tcol("name")}</TableHead>
                <TableHead>{tcol("package")}</TableHead>
                <TableHead>{tcol("area")}</TableHead>
                <TableHead className="text-right">
                  {tcol("monthlyFee")}
                </TableHead>
                <TableHead>{tcol("installedAt")}</TableHead>
                <TableHead>{tcol("status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-mono text-xs">
                    {customer.id}
                  </TableCell>
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell>{customer.package}</TableCell>
                  <TableCell>{customer.area}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatTHB(customer.monthlyFee, locale)}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {customer.installedAt}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={customer.status} />
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
