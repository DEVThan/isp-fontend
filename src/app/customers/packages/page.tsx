import type { Metadata } from "next"
import { Plus } from "lucide-react"
import { getLocale, getTranslations } from "next-intl/server"

import { PageHeader } from "@/components/page-header"
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
import { formatTHB, servicePackages } from "@/lib/mock-data"
import { intlLocale } from "@/i18n/config"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("packages")
  return { title: t("title") }
}

export default async function PackagesPage() {
  const t = await getTranslations("packages")
  const tcol = await getTranslations("packages.columns")
  const locale = await getLocale()
  const nf = new Intl.NumberFormat(intlLocale(locale))

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description", { count: servicePackages.length })}
      >
        <Button>
          <Plus />
          {t("add")}
        </Button>
      </PageHeader>

      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tcol("name")}</TableHead>
                <TableHead>{tcol("speed")}</TableHead>
                <TableHead className="text-right">{tcol("price")}</TableHead>
                <TableHead className="text-right">
                  {tcol("subscribers")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {servicePackages.map((pkg) => (
                <TableRow key={pkg.id}>
                  <TableCell className="font-medium">{pkg.name}</TableCell>
                  <TableCell className="tabular-nums">
                    {pkg.down} / {pkg.up} Mbps
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatTHB(pkg.price, locale)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {nf.format(pkg.subscribers)}
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
