"use client"

import * as React from "react"
import { CircleCheck, LoaderCircle, TriangleAlert } from "lucide-react"
import { useTranslations } from "next-intl"

import { deleteUser } from "@/app/setting/userauthen/_components/api"
import type { UserAuthen } from "@/app/setting/userauthen/_components/model"
import {
  Alert,
  AlertContent,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

/**
 * delete_modal.tsx — ถามยืนยันก่อนลบผู้ใช้ แล้วค่อยยิง POST /api/web/userauthen-delete
 *
 * ลบสำเร็จเท่านั้นถึงจะเรียก onDeleted ให้ตารางโหลดใหม่ · ลบไม่สำเร็จกล่องยังเปิดค้าง
 * พร้อมข้อความจาก API และตารางไม่ถูกแตะต้อง
 */
export function DeleteModal({
  open,
  onOpenChange,
  user,
  onDeleted,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** แถวที่กำลังจะลบ */
  user?: UserAuthen
  /** ลบสำเร็จแล้ว — ตารางเอาไปโหลดข้อมูลใหม่ */
  onDeleted?: () => void
}) {
  const t = useTranslations("common")
  const tform = useTranslations("userauthens.form")

  const [deleting, setDeleting] = React.useState(false)
  /** ผลของการกดลบครั้งล่าสุด — null คือยังไม่ได้กด */
  const [result, setResult] = React.useState<{
    ok: boolean
    message?: string
  } | null>(null)

  // เปิดใหม่หรือสลับแถวเมื่อไหร่ ให้ล้างผลของรอบก่อนทิ้ง (ปรับ state ระหว่าง render)
  const key = `${user?.id ?? "none"}-${String(open)}`
  const [lastKey, setLastKey] = React.useState(key)
  if (key !== lastKey) {
    setLastKey(key)
    setResult(null)
    setDeleting(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {/* แถบหัวไล่เฉดชุดเดียวกับแถบตัวกรองในตาราง */}
        <DialogHeader className="from-primary/12 border-border/60 -mx-4 -mt-4 rounded-t-xl border-b bg-gradient-to-r via-transparent to-transparent p-4">
          <DialogTitle>{tform("deleteTitle")}</DialogTitle>
        </DialogHeader>
        
        <DialogDescription>
          {tform("deleteDescription", {
            name: user?.fullname || user?.username || "",
          })}
        </DialogDescription>

        {result ? (
          <Alert variant={result.ok ? "success" : "destructive"}>
            {result.ok ? <CircleCheck /> : <TriangleAlert />}
            <AlertContent>
              <AlertTitle>
                {result.ok ? tform("deleted") : tform("deleteError")}
              </AlertTitle>
              {result.message ? (
                <AlertDescription>{result.message}</AlertDescription>
              ) : null}
            </AlertContent>
          </Alert>
        ) : null}

        {/* แถบท้ายไล่เฉดชุดเดียวกับแถบแบ่งหน้าในตาราง */}
        <DialogFooter className="from-primary/12 border-border/60 bg-transparent bg-gradient-to-r via-transparent to-transparent">
          <DialogClose
            render={
              <Button type="button" variant="outline" disabled={deleting} />
            }
          >
            {t("cancel")}
          </DialogClose>
          <Button
            variant="destructive"
            disabled={deleting || !user}
            onClick={async () => {
              if (!user || deleting) return
              setDeleting(true)
              setResult(null)
              try {
                // ส่งไปแค่ id ตามที่เส้นนี้ต้องการ
                await deleteUser(user.id)
                setResult({ ok: true })
                onDeleted?.()
                setTimeout(() => onOpenChange(false), 1400)
              } catch (error) {
                // ล้มเหลว = ไม่เรียก onDeleted ตารางจึงไม่ถูกโหลดใหม่
                setResult({
                  ok: false,
                  message: error instanceof Error ? error.message : undefined,
                })
              } finally {
                setDeleting(false)
              }
            }}
          >
            {deleting ? <LoaderCircle className="animate-spin" /> : null}
            {t("delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
