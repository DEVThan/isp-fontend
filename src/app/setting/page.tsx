import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings")
  return { title: t("title") }
}

export default async function SettingsPage() {
  const t = await getTranslations("settings")
  const org = await getTranslations("settings.org")
  const billing = await getTranslations("settings.billing")
  const tc = await getTranslations("common")

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{org("title")}</CardTitle>
            <CardDescription>{org("description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company">{org("company")}</Label>
              <Input id="company" defaultValue="Softtech Network Co., Ltd." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxId">{org("taxId")}</Label>
              <Input id="taxId" defaultValue="0505560000000" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="support">{org("supportEmail")}</Label>
              <Input
                id="support"
                type="email"
                defaultValue="support@softtechnw.com"
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button>{tc("save")}</Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{billing("title")}</CardTitle>
            <CardDescription>{billing("description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cycle">{billing("cycle")}</Label>
              <Select defaultValue="monthly">
                <SelectTrigger id="cycle">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">{billing("monthly")}</SelectItem>
                  <SelectItem value="quarterly">
                    {billing("quarterly")}
                  </SelectItem>
                  <SelectItem value="yearly">{billing("yearly")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDays">{billing("dueDays")}</Label>
              <Input id="dueDays" type="number" defaultValue={5} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vat">{billing("vat")}</Label>
              <Input id="vat" type="number" defaultValue={7} />
            </div>
          </CardContent>
          <CardFooter>
            <Button>{tc("save")}</Button>
          </CardFooter>
        </Card>
      </div>
    </>
  )
}
