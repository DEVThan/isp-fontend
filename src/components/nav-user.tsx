"use client"

import { useRouter } from "next/navigation"
import { ChevronsUpDown, CreditCard, LogOut, UserRound } from "lucide-react"
import { useTranslations } from "next-intl"

import { clearSession, type Session } from "@/app/login/components/auth"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

/** อักษรย่อบน avatar — ชื่อหลายคำเอาตัวแรกของสองคำแรก ("Somchai Jaidee" → "SJ") คำเดียวเอาสองตัวแรก */
function initialsOf(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean)
  const letters =
    words.length > 1
      ? [...words[0]][0] + [...words[1]][0]
      : [...(words[0] ?? "")].slice(0, 2).join("")
  return letters.toUpperCase() || "?"
}

export function NavUser({ user }: { user: Session | null }) {
  const { isMobile } = useSidebar()
  const t = useTranslations("user")
  const router = useRouter()

  // fullname ว่างได้ (null ใน user_authen) — ถอยไปใช้ username
  // อีเมลว่างก็แสดง username แทน เว้นแต่บรรทัดชื่อแสดง username อยู่แล้ว
  const name = user?.fullname?.trim() || user?.username || t("name")
  const email =
    user?.email?.trim() || (user && name !== user.username ? user.username : "")
  const initials = initialsOf(name)

  function handleSignOut() {
    clearSession()
    router.replace("/login")
    // cookie เพิ่งถูกลบ — สั่งดึงหน้าใหม่เพื่อให้ฝั่ง server เห็นว่าไม่มี session แล้ว
    router.refresh()
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger render={<SidebarMenuButton size="lg" />}>
            <Avatar className="size-8 rounded-lg">
              <AvatarFallback className="rounded-lg">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{name}</span>
              <span className="truncate text-xs opacity-70">{email}</span>
            </div>
            <ChevronsUpDown className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--anchor-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="font-normal">
                <div className="grid text-sm leading-tight">
                  <span className="truncate font-medium">{name}</span>
                  <span className="text-muted-foreground truncate text-xs">
                    {email}
                  </span>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            {/* <DropdownMenuGroup>
              <DropdownMenuItem>
                <UserRound />
                {t("profile")}
              </DropdownMenuItem>
              <DropdownMenuItem>
                <CreditCard />
                {t("billing")}
              </DropdownMenuItem>
            </DropdownMenuGroup> */}
            {/* <DropdownMenuSeparator /> */}
            <DropdownMenuItem
              variant="destructive"
              onClick={handleSignOut}
            >
              <LogOut />
              {t("signOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
