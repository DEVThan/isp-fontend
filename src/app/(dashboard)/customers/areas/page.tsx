import type { Metadata } from "next"
import { getLocale, getTranslations } from "next-intl/server"

import { PageHeader } from "@/components/page-header"
import { StatusBadge } from "@/components/status-badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { serviceAreas } from "@/lib/mock-data"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("areas")
  return { title: t("title") }
}

export default async function AreasPage() {
  const t = await getTranslations("areas")
  const tcol = await getTranslations("areas.columns")
  const locale = await getLocale()
  const nf = new Intl.NumberFormat(locale)

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description", { count: serviceAreas.length })}
      />

      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tcol("name")}</TableHead>
                <TableHead className="text-right">
                  {tcol("customers")}
                </TableHead>
                <TableHead>{tcol("coverage")}</TableHead>
                <TableHead>{tcol("status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {serviceAreas.map((area) => (
                <TableRow key={area.name}>
                  <TableCell className="font-medium">{area.name}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {nf.format(area.customers)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="bg-muted h-1.5 w-24 overflow-hidden rounded-full">
                        <div
                          className="bg-chart-1 h-full rounded-full"
                          style={{ width: `${area.coverage}%` }}
                        />
                      </div>
                      <span className="text-muted-foreground text-xs tabular-nums">
                        {area.coverage}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={area.status} />
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
