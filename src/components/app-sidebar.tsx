"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight } from "lucide-react"
import { useTranslations } from "next-intl"

import { NavUser } from "@/components/nav-user"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  DASHBOARD_ROOT,
  brand,
  fallbackIcon,
  iconByName,
  isItemActive,
  navId,
  type IconName,
  type NavGroup,
  type NavItem,
  type NavKey,
  type NavLabel,
} from "@/lib/nav"

/**
 * เมนูที่เลือกอยู่: ไล่เฉดจากสีแบรนด์จาง ๆ + เส้นบอกตำแหน่งด้านซ้าย + ไอคอนสีฟ้าสว่าง
 * (นุ่มกว่าถมสีทึบทั้งแถบ และยังเห็นชัดจากมุมตา)
 */
const activeClasses = [
  "relative overflow-hidden transition-colors",
  "hover:bg-sidebar-accent/60",
  "data-active:bg-gradient-to-r data-active:from-sidebar-primary/32 data-active:via-sidebar-primary/12 data-active:to-transparent",
  "data-active:text-white data-active:font-medium",
  "data-active:ring-1 data-active:ring-inset data-active:ring-sidebar-primary/25",
  "data-active:hover:from-sidebar-primary/40 data-active:hover:via-sidebar-primary/16",
  "data-active:[&>svg]:text-sidebar-active",
].join(" ")

const subActiveClasses = [
  "relative overflow-hidden transition-colors",
  "hover:bg-sidebar-accent/60",
  "data-active:bg-sidebar-primary/18 data-active:font-medium data-active:text-white",
].join(" ")

/** แถบบอกตำแหน่งด้านซ้ายของเมนูที่เลือกอยู่ */
function ActiveMarker({ thin = false }: { thin?: boolean }) {
  return (
    <span
      aria-hidden
      className={
        thin
          ? "bg-sidebar-active absolute inset-y-0.5 left-0 w-[2px] rounded-r-full"
          : "bg-sidebar-active absolute inset-y-1 left-0 w-[3px] rounded-r-full"
      }
    />
  )
}

/**
 * ไอคอนของเมนู — เมนูพกมาแค่ "ชื่อ" ไอคอน (ข้ามจาก server มาเป็นข้อมูลธรรมดา)
 * ฐานข้อมูลเขียนได้ทั้ง "Package" และ "PackageOpenIcon" — lucide ใช้ชื่อที่ไม่มี Icon ต่อท้าย
 *
 * ต้องหยิบจากตารางตรง ๆ ห้ามผ่านฟังก์ชันช่วย: กฎ react-hooks/static-components ถือว่า
 * ค่าที่ได้จากการ "เรียกฟังก์ชัน" แล้วเอาไปใช้เป็น <Tag /> คือคอมโพเนนต์ที่สร้างใหม่ทุกรอบ
 * (ที่จริงเป็นตัวเดิมจากตาราง แต่กฎมองไม่เห็น) — เขียนแบบนี้จึงไม่ต้องปิดกฎทิ้ง
 */
function NavIcon({ name }: { name?: IconName }) {
  const Icon = (name && iconByName[name.replace(/Icon$/, "")]) || fallbackIcon
  return <Icon />
}

function NavLeaf({ item, pathname }: { item: NavItem; pathname: string }) {
  const label = useNavLabel()
  const isActive = isItemActive(item, pathname)

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={isActive}
        tooltip={label(item)}
        className={activeClasses}
        render={<Link href={item.url} />}
      >
        {isActive ? <ActiveMarker /> : null}
        <NavIcon name={item.icon} />
        <span>{label(item)}</span>
      </SidebarMenuButton>
      {item.badge ? (
        <SidebarMenuBadge className="bg-sidebar-primary/25 text-sidebar-accent-foreground rounded-full px-1.5">
          {item.badge}
        </SidebarMenuBadge>
      ) : null}
    </SidebarMenuItem>
  )
}

/**
 * ป้ายชื่อเมนู: ถ้ามีคำแปลของ code นั้นก็ใช้ ไม่มีก็ใช้ name จากฐานข้อมูล
 * (cast เพราะ code จาก API เป็นสตริงอิสระ ไม่ใช่คีย์ที่ TypeScript รู้จัก)
 * export ให้ site-header ใช้กับ breadcrumb ด้วย จะได้เรียกชื่อเมนูเหมือนกันทั้งหน้า
 */
export function useNavLabel() {
  const t = useTranslations("nav")
  return (label: NavLabel) => {
    if ("key" in label) return t(label.key)
    const code = label.code as NavKey
    return t.has(code) ? t(code) : label.name
  }
}

function NavBranch({ item, pathname }: { item: NavItem; pathname: string }) {
  const label = useNavLabel()
  const isActive = isItemActive(item, pathname)

  // controlled: กางเองเมื่อเข้าหน้าในกลุ่มนี้ แต่ผู้ใช้ยังพับ/กางเองได้
  // (uncontrolled ไม่ได้ เพราะ defaultOpen เปลี่ยนหลัง mount ตอนเปลี่ยนหน้า)
  const [open, setOpen] = React.useState(isActive)
  const [wasActive, setWasActive] = React.useState(isActive)
  if (wasActive !== isActive) {
    setWasActive(isActive)
    if (isActive) setOpen(true)
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen} render={<SidebarMenuItem />}>
      <CollapsibleTrigger
        render={
          <SidebarMenuButton
            isActive={isActive}
            tooltip={label(item)}
            className={`${activeClasses} data-panel-open:[&>svg:last-child]:rotate-90`}
          />
        }
      >
        {isActive ? <ActiveMarker /> : null}
        <NavIcon name={item.icon} />
        <span>{label(item)}</span>
        {/* เมนูที่มีลูกใช้ badge แบบอินไลน์ ไม่งั้นจะทับกับลูกศร */}
        {item.badge ? (
          <span className="bg-sidebar-primary/25 text-sidebar-accent-foreground ml-auto rounded-full px-1.5 text-xs tabular-nums group-data-[collapsible=icon]:hidden">
            {item.badge}
          </span>
        ) : null}
        <ChevronRight
          className={`${item.badge ? "" : "ml-auto"} transition-transform duration-200`}
        />
      </CollapsibleTrigger>

      <CollapsibleContent>
        <SidebarMenuSub>
          {item.children?.map((child) => (
            <SidebarMenuSubItem key={child.url}>
              <SidebarMenuSubButton
                isActive={pathname === child.url}
                className={subActiveClasses}
                render={<Link href={child.url} />}
              >
                {pathname === child.url ? <ActiveMarker thin /> : null}
                <span>{label(child)}</span>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          ))}
        </SidebarMenuSub>
      </CollapsibleContent>
    </Collapsible>
  )
}

export function AppSidebar({
  groups,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  /** เมนูที่จะแสดง — dashboard-shell ดึงมาจาก API แล้วส่งเข้ามา */
  groups: NavGroup[]
}) {
  const pathname = usePathname()
  const t = useTranslations("nav")
  const tc = useTranslations("common")
  const BrandIcon = brand.icon

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href={DASHBOARD_ROOT} />}>
              <div className="from-chart-1 to-chart-5 flex aspect-square size-8 items-center justify-center rounded-lg bg-gradient-to-br text-white">
                <BrandIcon className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">
                  {tc("appName")}
                </span>
                <span className="truncate text-xs opacity-70">
                  {tc("appSubtitle")}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.key ?? "api"}>
            {group.key ? <SidebarGroupLabel>{t(group.key)}</SidebarGroupLabel> : null}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) =>
                  item.children?.length ? (
                    <NavBranch key={navId(item)} item={item} pathname={pathname} />
                  ) : (
                    <NavLeaf key={navId(item)} item={item} pathname={pathname} />
                  )
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
