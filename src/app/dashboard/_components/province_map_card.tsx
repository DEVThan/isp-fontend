"use client"

import * as React from "react"
import { geoMercator, geoPath } from "d3-geo"
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson"
import { ChevronDown, ChevronUp, TriangleAlert } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"

import {
  getBroadcastOptions,
  getProvinceStats,
  type BroadcastOption,
  type Gender,
  type GenderSplit,
  type ProvinceRow,
  type ProvinceStats,
} from "@/app/dashboard/_components/api"
import { DayPicker, toDayKey } from "@/app/dashboard/_components/day_picker"
import { MonthPicker, toMonthKey } from "@/app/dashboard/_components/month_picker"
import { BroadcastLogo } from "@/app/broadcast/_components/logo"
import { SelectOption } from "@/app/sale/so/_components/selectoption"
import { intlLocale } from "@/i18n/config"
import { formatTHB } from "@/lib/mock-data"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

/**
 * province_map_card.tsx — แผนที่ยอดขายรายจังหวัด (14/10/2026 ยกมาจาก isp-dashbord-old-main/web/src/pages/ProvinceMap.tsx)
 *
 * ข้อมูล /dashboard-province (รายเดือนหรือรายวัน) · ขอบเขตจังหวัด public/geo/thailand-provinces.geojson (77 จังหวัด,
 * properties.id = province_id ของ API) วาดด้วย d3-geo · ระบายสีเป็นขั้น (quantile) ไม่งั้น กทม. กินทั้งสเกล
 * ตัวเลือก: ช่วง เดือน/วัน · ตัวชี้วัด จำนวนใบ/ยอดขาย · เพศ · เพศจริง/ประมาณจากชื่อ (gender_est ของ API) · ช่องทางการขาย
 * (14/10/2026 จาก /broadcast-get-option ส่งชื่อไปเทียบ so.channel) · ตัวเลขบนแผนที่
 * ชี้ (คอม) หรือแตะ (มือถือ — แตะซ้ำปิด) จังหวัด/แถวอันดับ = กล่องรายละเอียดของจังหวัดนั้น
 */

type GeoProps = { id: number; name: string; name_en: string }
type Geo = FeatureCollection<Polygon | MultiPolygon, GeoProps>
type Metric = "orders" | "amount"

const GENDERS: Gender[] = ["male", "female", "unknown"]
/** สีเพศ: ชาย chart-1 · หญิง chart-5 (คู่นี้ผ่าน CVD เมื่ออยู่ติดกัน) · ไม่ระบุ เทา — ใช้ทั้งแถบสัดส่วน จุด และกล่องรายละเอียด */
const GENDER_BG: Record<Gender, string> = {
  male: "bg-chart-1",
  female: "bg-chart-5",
  unknown: "bg-muted-foreground/45",
}

/** ขนาด viewBox ของแผนที่ — ประเทศไทยสูงกว่ากว้างราว 1.8 เท่า */
const W = 420
const H = 760
/** จำนวนขั้นสี */
const STEPS = 6
/** ความเข้มของขั้นสี s (0…STEPS-1) — ผสม chart-1 กับสีการ์ด จาง → เข้ม ใช้ทั้งแผนที่และแถบ "น้อย–มาก" */
const stepColor = (s: number) =>
  `color-mix(in oklab, var(--chart-1) ${18 + (s * 82) / (STEPS - 1)}%, var(--card))`

// โหลดไฟล์ครั้งเดียวต่อหน้า (242KB) — เปลี่ยนเดือน/วันไม่ต้องโหลดใหม่
let geoCache: Promise<Geo> | null = null
const loadGeo = () =>
  (geoCache ??= fetch("/geo/thailand-provinces.geojson").then((res) => {
    if (!res.ok) throw new Error(`geojson ${res.status}`)
    return res.json() as Promise<Geo>
  }))

export function ProvinceMapCard() {
  const t = useTranslations("dashboard.provinceMap")
  const tm = useTranslations("dashboard.month")
  const locale = useLocale()
  const nf = new Intl.NumberFormat(intlLocale(locale))
  // ตัวเลขบนแผนที่ต้องสั้น: 948,347 → 948K ทุกภาษา (แบบย่อของพม่าเป็นคำยาว ล้นจังหวัดเล็ก)
  const compact = new Intl.NumberFormat("en", { notation: "compact", maximumSignificantDigits: 3 })

  /** ช่วง: เดือน / วัน / ทั้งหมด (ทุกวันที่ — 14/10/2026 ผู้ใช้ขอ) */
  const [scope, setScope] = React.useState<"month" | "day" | "all">("month")
  /** เดือน/วันที่เลือก · ว่าง = เดือนนี้/วันนี้ ให้ API ตัดสินตามเวลาไทย */
  const [month, setMonth] = React.useState("")
  const [date, setDate] = React.useState("")
  const [stats, setStats] = React.useState<ProvinceStats | null>(null)
  const [failed, setFailed] = React.useState(false)
  const [metric, setMetric] = React.useState<Metric>("orders")
  const [gender, setGender] = React.useState<Gender | "all">("all")
  /** true = gender_est (เพศจริงถ้ามี ไม่งั้นเดาจากชื่อ) · false = customer.gender อย่างเดียว (ส่วนใหญ่ไม่ระบุ) */
  const [est, setEst] = React.useState(true)
  const [labels, setLabels] = React.useState(true)
  /** ช่องทางการขาย (ชื่อ) · null = ทุกช่องทาง */
  const [channel, setChannel] = React.useState<string | null>(null)
  const [channels, setChannels] = React.useState<BroadcastOption[]>([])
  /** จังหวัดที่ชี้อยู่ (คอม) / แตะค้างไว้ (มือถือ) */
  const [hover, setHover] = React.useState<number | null>(null)

  /**
   * รายการจังหวัด scroll ในกรอบ — ยังเลื่อนขึ้น/ลงได้อีกไหม โชว์ขอบจาง + ปุ่มลูกศรฝั่งนั้น ให้รู้ว่าเลื่อนได้
   * (14/10/2026 ผู้ใช้ขอ แบบเดียวกับกราฟแท่งใน count_bars) · ใช้ callback ref เพราะ <ol> เพิ่งโผล่หลังโหลดข้อมูลเสร็จ
   */
  const listRef = React.useRef<HTMLOListElement | null>(null)
  const [more, setMore] = React.useState({ up: false, down: false })
  const checkMore = React.useCallback(() => {
    const el = listRef.current
    if (!el) return
    // เผื่อ 1px — scrollTop บนจอ retina เป็นทศนิยม ชนขอบแล้วอาจขาดอีกเศษเสี้ยว
    const up = el.scrollTop > 1
    const down = el.scrollTop + el.clientHeight < el.scrollHeight - 1
    setMore((prev) => (prev.up === up && prev.down === down ? prev : { up, down }))
  }, [])
  const attachList = React.useCallback(
    (el: HTMLOListElement | null) => {
      listRef.current = el
      if (!el) return
      // จำนวนแถวเปลี่ยน (สลับเดือน/ช่องทาง/ตัวชี้วัด) หรือกรอบเปลี่ยนขนาด ต้องเช็กใหม่ — onScroll อย่างเดียวไม่พอ
      const observer = new ResizeObserver(checkMore)
      observer.observe(el)
      const rows = new MutationObserver(checkMore)
      rows.observe(el, { childList: true })
      return () => {
        observer.disconnect()
        rows.disconnect()
      }
    },
    [checkMore]
  )
  /** ปุ่มลูกศร: เลื่อนทีละ ~ 80% ของความสูงที่เห็น (เหลือแถวเดิมไว้นิดหน่อยให้ต่อเนื่อง) */
  const scrollList = (dir: -1 | 1) => {
    const el = listRef.current
    if (el) el.scrollBy({ top: dir * el.clientHeight * 0.8, behavior: "smooth" })
  }
  const [picked, setPicked] = React.useState<number | null>(null)
  const active = hover ?? picked
  const [geo, setGeo] = React.useState<Geo | null>(null)
  const [geoFailed, setGeoFailed] = React.useState(false)

  // ตัวเลือกช่องทาง — โหลดครั้งเดียว ล้มก็แค่ไม่มีตัวเลือก (แผนที่ยังใช้ได้)
  React.useEffect(() => {
    getBroadcastOptions()
      .then(setChannels)
      .catch(() => setChannels([]))
  }, [])

  React.useEffect(() => {
    loadGeo()
      .then(setGeo)
      .catch(() => {
        geoCache = null
        setGeoFailed(true)
      })
  }, [])

  // ล้างผลเก่าตรงนี้ (ไม่ใช่ใน effect) — กลับเป็น skeleton ระหว่างโหลดช่วงใหม่
  const reset = () => {
    setStats(null)
    setFailed(false)
  }
  const changeScope = (next: "month" | "day" | "all") => {
    if (next === scope) return
    setScope(next)
    reset()
  }
  const changeMonth = (next: string) => {
    setMonth(next === toMonthKey(new Date()) ? "" : next)
    reset()
  }
  const changeDate = (next: string) => {
    setDate(next === toDayKey(new Date()) ? "" : next)
    reset()
  }
  const changeChannel = (next: string | null) => {
    setChannel(next)
    reset()
  }

  React.useEffect(() => {
    let cancelled = false
    // วัน: ต้องส่ง date เสมอ (ไม่ส่ง = API ตีเป็นเดือนนี้) — วันนี้ใช้วันของเครื่อง เขตเวลาเดียวกับผู้ใช้ไทย
    const period =
      scope === "all"
        ? { all: true }
        : scope === "month"
          ? month
            ? { month }
            : {}
          : { date: date || toDayKey(new Date()) }
    getProvinceStats(channel ? { ...period, channel } : period)
      .then((next) => {
        if (!cancelled) setStats(next)
      })
      // ห้าม console.error — ใน dev overlay จะขึ้นเต็มจอเหมือนหน้าพัง
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [scope, month, date, channel])

  const split = (row: ProvinceRow | ProvinceStats): GenderSplit => (est ? row.gender_est : row.gender)
  const byId = React.useMemo(
    () => new Map((stats?.provinces ?? []).map((row) => [row.province_id, row])),
    [stats]
  )
  /** ค่าที่ระบายสี/เขียนตัวเลข = ตัวชี้วัดที่เลือก ของเพศที่เลือก */
  const value = (row?: ProvinceRow) =>
    !row ? 0 : gender === "all" ? row[metric] : (est ? row.gender_est : row.gender)[gender][metric]

  // ขอบขั้นสีจากค่าของจังหวัดที่มียอด (quantile) — คำนวณทุก render ได้ เพราะมีแค่ 77 ค่า
  const sorted = (stats?.provinces ?? []).map(value).filter((v) => v > 0).sort((a, b) => a - b)
  const breaks = sorted.length
    ? Array.from({ length: STEPS - 1 }, (_, i) => sorted[Math.floor(((i + 1) / STEPS) * sorted.length)] ?? sorted.at(-1)!)
    : []
  const fill = (v: number) => (v <= 0 ? "var(--muted)" : stepColor(breaks.filter((b) => v > b).length))

  /** path + จุดวางตัวเลขของทุกจังหวัด — คำนวณครั้งเดียวต่อไฟล์ geojson */
  const shapes = React.useMemo(() => {
    if (!geo) return []
    const path = geoPath(geoMercator().fitSize([W, H], geo))
    return geo.features.map((feature) => {
      // ตัวเลขวางที่ centroid ของ polygon ที่ใหญ่สุด (เกาะไม่ดึงตัวเลขออกทะเล) · ขนาดตัวอักษรตามพื้นที่จังหวัด
      const polygons: Feature<Polygon>[] =
        feature.geometry.type === "Polygon"
          ? [feature as Feature<Polygon>]
          : feature.geometry.coordinates.map((coordinates) => ({
              type: "Feature",
              properties: {},
              geometry: { type: "Polygon", coordinates },
            }))
      const main = polygons.reduce((a, b) => (path.area(b) > path.area(a) ? b : a))
      const [x, y] = path.centroid(main)
      return {
        id: feature.properties.id,
        name: feature.properties.name,
        nameEn: feature.properties.name_en,
        d: path(feature) ?? "",
        x,
        y,
        size: Math.max(6.5, Math.min(11, Math.sqrt(path.area(main)) / 3.2)),
      }
    })
  }, [geo])

  const provinceName = (row: { province: string; province_en: string }) =>
    locale === "th" ? row.province : row.province_en || row.province
  const fmt = (v: number) => (metric === "orders" ? t("orders", { value: nf.format(v) }) : formatTHB(v, locale))
  const top = (stats?.provinces ?? [])
    .filter((row) => value(row) > 0)
    .sort((a, b) => value(b) - value(a))
  const max = value(top[0]) || 1
  const totals = stats ? split(stats) : null
  const genderSum = totals ? GENDERS.reduce((sum, g) => sum + totals[g][metric], 0) || 1 : 1
  const meta = stats?.gender_est_meta
  const unmatched = (stats?.unmatched ?? []).reduce((sum, row) => sum + row.orders, 0)

  const activeShape = active != null ? shapes.find((shape) => shape.id === active) : undefined
  const activeRow = active != null ? byId.get(active) : undefined
  const pick = (id: number) => setPicked((prev) => (prev === id ? null : id))

  const periodLabel = stats
    ? stats.all
      ? t("scopeAll")
      : stats.date
      ? new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: "long" }).format(new Date(`${stats.date}T00:00`))
      : new Intl.DateTimeFormat(intlLocale(locale), { month: "long", year: "numeric" }).format(
          new Date(`${stats.month}-01T00:00`)
        )
    : null

  /** ปุ่มแบบแบ่งช่อง (Tabs ไม่มี panel) — ใช้กับทุกตัวเลือกบนหัว card */
  const segment = <V extends string>(value: V, onChange: (next: V) => void, options: [V, string][]) => (
    <Tabs value={value} onValueChange={(next) => onChange(next as V)}>
      <TabsList>
        {options.map(([key, text]) => (
          <TabsTrigger key={key} value={key} className="px-2.5">
            {text}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          {/* มือถือ: title เต็มแถว ปุ่มเดือน/วัน + picker ลงไปแถวถัดไปด้วยกัน (14/10/2026 ผู้ใช้ขอ) */}
          <CardTitle className="min-w-40 flex-1 max-sm:basis-full">
            {t("title")}
            {periodLabel ? <span className="text-muted-foreground font-normal"> · {periodLabel}</span> : null}
          </CardTitle>
          {segment(scope, changeScope, [
            ["month", t("scopeMonth")],
            ["day", t("scopeDay")],
            ["all", t("scopeAll")],
          ])}
          {/* ตัวเลือกเดือน/วัน: ค่าเริ่มต้นจากเครื่องผู้ใช้ — โชว์หลังโหลดรอบแรก (stats) เรนเดอร์ฝั่ง server จะได้ไม่ hydrate ไม่ตรง */}
          {/* ทั้งหมด = ไม่มีช่วงให้เลือก ซ่อนตัวเลือก */}
          {scope === "all" ? null : stats || month || date ? (
            scope === "month" ? (
              <MonthPicker value={month || toMonthKey(new Date())} onChange={changeMonth} />
            ) : (
              <DayPicker value={date || toDayKey(new Date())} onChange={changeDate} />
            )
          ) : failed ? null : (
            <Skeleton className="h-8 w-48" />
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {segment(metric, setMetric, [
            ["orders", t("metricOrders")],
            ["amount", t("metricAmount")],
          ])}
          {segment(gender, setGender, [
            ["all", t("genderAll")],
            ...GENDERS.map((g): [Gender, string] => [g, t(`gender.${g}`)]),
          ])}
          <div title={t("estHint")}>
            {segment(est ? "est" : "actual", (next) => setEst(next === "est"), [
              ["actual", t("actual")],
              ["est", t("estimated")],
            ])}
          </div>
          {/* ช่องทางการขาย — ค้นได้ มีโลโก้ · ล้างช่อง = ทุกช่องทาง */}
          <div className="w-full sm:w-56">
            <SelectOption
              id="province-map-channel"
              options={channels.map((option) => ({
                value: option.name,
                label: option.name,
                icon: <BroadcastLogo src={option.logo} alt={option.name} className="size-5" />,
              }))}
              value={channel}
              onValueChange={changeChannel}
              placeholder={t("channelAll")}
              label={t("channel")}
            />
          </div>
          <Label className="ml-auto flex cursor-pointer items-center gap-2 text-sm font-normal">
            <Checkbox checked={labels} onCheckedChange={(checked) => setLabels(checked === true)} />
            {t("labels")}
          </Label>
        </div>
      </CardHeader>

      <CardContent>
        {failed ? (
          <p className="text-warning-ink mb-3 flex items-center gap-1.5 text-sm font-medium">
            <TriangleAlert className="size-4" />
            {tm("loadError")}
          </p>
        ) : null}
        <div className="grid gap-6 lg:grid-cols-[minmax(260px,440px)_1fr]">
          {/* แผนที่ + กล่องรายละเอียด (จอกว้างลอยมุมขวาล่างของแผนที่ · จอแคบต่อใต้แผนที่) + แถบขั้นสี */}
          <div className="relative mx-auto w-full max-w-[440px]">
            {geo && shapes.length ? (
              <svg
                viewBox={`0 0 ${W} ${H}`}
                role="img"
                aria-label={t("mapLabel")}
                className={cn("block h-auto w-full", !stats && "animate-pulse opacity-60")}
                onMouseLeave={() => setHover(null)}
              >
                {shapes.map((shape) => {
                  const v = value(byId.get(shape.id))
                  const isActive = shape.id === active
                  return (
                    <path
                      key={shape.id}
                      d={shape.d}
                      fill={stats ? fill(v) : "var(--muted)"}
                      stroke={isActive ? "var(--foreground)" : "var(--card)"}
                      strokeWidth={isActive ? 1.4 : 0.5}
                      className="cursor-pointer transition-[fill] duration-150"
                      onMouseEnter={() => setHover(shape.id)}
                      onClick={() => pick(shape.id)}
                    >
                      <title>{`${locale === "th" ? shape.name : shape.nameEn}: ${fmt(v)}`}</title>
                    </path>
                  )
                })}
                {/* วาดเส้นขอบของจังหวัดที่เลือกซ้ำทับบนสุด — ไม่งั้นจังหวัดข้าง ๆ ที่วาดทีหลังบังขอบไปครึ่งหนึ่ง */}
                {activeShape ? (
                  <path d={activeShape.d} fill="none" stroke="var(--foreground)" strokeWidth={1.4} pointerEvents="none" />
                ) : null}
                {labels && stats
                  ? shapes.map((shape) => {
                      const v = value(byId.get(shape.id))
                      if (!v) return null
                      return (
                        <text
                          key={shape.id}
                          x={shape.x}
                          y={shape.y}
                          fontSize={shape.id === active ? shape.size + 2 : shape.size}
                          textAnchor="middle"
                          dominantBaseline="central"
                          className="fill-foreground stroke-card pointer-events-none font-semibold tabular-nums"
                          style={{ strokeWidth: 2.5, paintOrder: "stroke" }}
                        >
                          {compact.format(v)}
                        </text>
                      )
                    })
                  : null}
              </svg>
            ) : geoFailed ? (
              <p className="text-warning-ink flex items-center gap-1.5 text-sm font-medium">
                <TriangleAlert className="size-4" />
                {t("mapError")}
              </p>
            ) : (
              <Skeleton className="aspect-[420/760] w-full" />
            )}

            <div className="bg-popover text-popover-foreground ring-border mt-3 rounded-lg px-3 py-2 text-sm shadow-md ring-1 lg:absolute lg:right-0 lg:bottom-10 lg:mt-0 lg:min-w-44">
              {activeShape ? (
                <>
                  <div className="font-semibold">
                    {locale === "th" ? activeShape.name : activeShape.nameEn}
                  </div>
                  <div className="tabular-nums">
                    {t("orders", { value: nf.format(activeRow?.orders ?? 0) })} ·{" "}
                    {formatTHB(activeRow?.amount ?? 0, locale)}
                  </div>
                  <div className="text-muted-foreground text-xs tabular-nums">
                    {t("qty", { value: nf.format(activeRow?.qty ?? 0) })}
                  </div>
                  {activeRow ? (
                    <div className="border-border mt-1.5 space-y-0.5 border-t pt-1.5 text-xs tabular-nums">
                      {GENDERS.map((g) => (
                        <div key={g} className="flex items-center gap-1.5">
                          <span className={cn("size-2 rounded-full", GENDER_BG[g])} />
                          {t(`gender.${g}`)}
                          <span className="font-semibold">{nf.format(split(activeRow)[g].orders)}</span>
                          <span className="text-muted-foreground">{formatTHB(split(activeRow)[g].amount, locale)}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </>
              ) : (
                <span className="text-muted-foreground">{t("hoverHint")}</span>
              )}
            </div>

            {breaks.length ? (
              <div className="text-muted-foreground mt-3 flex items-center gap-1.5 text-xs">
                {t("less")}
                {Array.from({ length: STEPS }, (_, s) => (
                  <span key={s} className="h-2.5 w-5 rounded-[2px]" style={{ background: stepColor(s) }} />
                ))}
                {t("more")}
              </div>
            ) : null}
          </div>

          {/* ฝั่งขวา: ยอดรวม · สัดส่วนเพศ · ทุกจังหวัดที่มียอด (14/10/2026 เดิม 10 อันดับ — ผู้ใช้ขอให้แสดงทั้งหมดแล้ว scroll เอา)
              จอกว้าง: คอลัมน์นี้ยืดเท่าแถวของ grid ซึ่งสูงเท่าแผนที่ — รายการลอย (absolute) เต็มพื้นที่ที่เหลือ
              จึงไม่ดันแถวให้สูงเกินแผนที่ ก้นรายการตรงกับก้นแผนที่ (ผู้ใช้ขอ) · จอแคบ: ต่อใต้แผนที่ สูงสุด 34rem */}
          <div className="min-w-0 lg:flex lg:flex-col">
            {stats && totals ? (
              <>
                <div className="flex flex-wrap gap-x-8 gap-y-2">
                  {(
                    [
                      [t("total"), t("orders", { value: nf.format(stats.total_orders) })],
                      [t("sales"), formatTHB(stats.total_amount, locale)],
                      [t("provinces"), `${nf.format(stats.province_count)} / 77`],
                    ] as const
                  ).map(([name, text]) => (
                    <div key={name}>
                      <div className="text-muted-foreground text-xs">{name}</div>
                      <div className="text-lg font-semibold tabular-nums">{text}</div>
                    </div>
                  ))}
                </div>

                <div className="bg-muted mt-4 flex h-2.5 overflow-hidden rounded-full">
                  {GENDERS.map((g) => (
                    <span
                      key={g}
                      className={cn("h-full", GENDER_BG[g])}
                      style={{ width: `${(totals[g][metric] / genderSum) * 100}%` }}
                    />
                  ))}
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm tabular-nums">
                  {GENDERS.map((g) => (
                    <span key={g} className="flex items-center gap-1.5">
                      <span className={cn("size-2 rounded-full", GENDER_BG[g])} />
                      {t(`gender.${g}`)} {fmt(totals[g][metric])}
                      <span className="text-muted-foreground">
                        ({((totals[g][metric] / genderSum) * 100).toFixed(1)}%)
                      </span>
                    </span>
                  ))}
                </div>
                {est && meta ? (
                  <p className="text-muted-foreground mt-1.5 text-xs">
                    {meta.model?.accuracy != null
                      ? t("estNote", {
                          actual: nf.format(meta.source.actual),
                          guessed: nf.format(meta.source.name + meta.source.title),
                          accuracy: Math.round(meta.model.accuracy * 100),
                          threshold: Math.round(meta.model.threshold * 100),
                          trained: nf.format(meta.model.trained_on),
                        })
                      : t("estNoteShort", {
                          actual: nf.format(meta.source.actual),
                          guessed: nf.format(meta.source.name + meta.source.title),
                        })}
                  </p>
                ) : null}

                {top.length ? (
                  <div className="relative mt-4 lg:min-h-64 lg:flex-1">
                    <ol
                      ref={attachList}
                      onScroll={checkMore}
                      className="max-h-[34rem] overflow-y-auto overscroll-contain pr-1 lg:absolute lg:inset-0 lg:max-h-none"
                    >
                      {top.map((row, index) => (
                        <li
                          key={row.province_id}
                          onMouseEnter={() => setHover(row.province_id)}
                          onMouseLeave={() => setHover(null)}
                          onClick={() => pick(row.province_id)}
                          className={cn(
                            "border-border flex cursor-pointer items-center gap-3 rounded-md border-b px-1 py-2.5 last:border-b-0",
                            row.province_id === active && "bg-muted"
                          )}
                        >
                          <span className="bg-muted text-muted-foreground grid size-6 shrink-0 place-items-center rounded-full text-xs tabular-nums">
                            {index + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium">{provinceName(row)}</div>
                            <div className="bg-muted mt-1.5 h-1.5 overflow-hidden rounded-full">
                              <div
                                className="bg-chart-1 h-full rounded-full"
                                style={{ width: `${(value(row) / max) * 100}%` }}
                              />
                            </div>
                          </div>
                          <div className="shrink-0 text-right tabular-nums">
                            <div className="text-sm font-semibold">{fmt(value(row))}</div>
                            <div className="text-muted-foreground text-xs">
                              {t("genderShort.male")} {nf.format(split(row).male.orders)} · {t("genderShort.female")}{" "}
                              {nf.format(split(row).female.orders)}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ol>
                    {/* ขอบจาง + ปุ่มลูกศร ฝั่งที่ยังมีแถวซ่อนอยู่ — ขอบจางไม่รับคลิก (แตะแถวใต้มันได้) ปุ่มรับคลิกเอง */}
                    {(["up", "down"] as const).map((side) =>
                      more[side] ? (
                        <div
                          key={side}
                          className={cn(
                            "from-card pointer-events-none absolute inset-x-0 flex h-12 justify-center to-transparent",
                            side === "up" ? "top-0 items-start bg-gradient-to-b" : "bottom-0 items-end bg-gradient-to-t"
                          )}
                        >
                          <button
                            type="button"
                            aria-label={t(side === "up" ? "scrollUp" : "scrollDown")}
                            onClick={() => scrollList(side === "up" ? -1 : 1)}
                            className="bg-card text-muted-foreground ring-border hover:text-foreground pointer-events-auto flex size-7 cursor-pointer items-center justify-center rounded-full shadow-md ring-1"
                          >
                            {side === "up" ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                          </button>
                        </div>
                      ) : null
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground mt-6 text-sm">{t("empty")}</p>
                )}
                {unmatched > 0 ? (
                  <p className="text-muted-foreground mt-2 text-xs">
                    {t("unmatched", { value: nf.format(unmatched) })}
                  </p>
                ) : null}
              </>
            ) : failed ? null : (
              <div className="space-y-3">
                <Skeleton className="h-12 w-72" />
                <Skeleton className="h-2.5 w-full" />
                <Skeleton className="h-4 w-80" />
                {Array.from({ length: 6 }, (_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
