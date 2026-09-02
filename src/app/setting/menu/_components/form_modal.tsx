"use client"

import * as React from "react"
import { CircleCheck, LoaderCircle, TriangleAlert } from "lucide-react"
import { useTranslations } from "next-intl"

import { getMenuOptions, saveMenu } from "@/app/setting/menu/_components/api"
import {
  MENU_ACTIVE,
  MENU_INACTIVE,
  MENU_NO_PARENT_ID,
  type Menu,
  type MenuFormMode,
  type MenuFormValues,
  type MenuOption,
} from "@/app/setting/menu/_components/model"
import { SelectOption } from "@/app/setting/menu/_components/selectoption"
import { useNavLabel } from "@/components/app-sidebar"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

/**
 * form_modal.tsx — ฟอร์มเพิ่ม/แก้ไขเมนูในกล่องซ้อน
 *
 * ปุ่มที่เปิดฟอร์มเป็นคนบอกโหมดมาเอง: "add" เปิดฟอร์มเปล่า "edit" เปิดพร้อมค่าของแถวนั้น
 * กดบันทึกแล้วยิง POST /api/web/menu-action เอง เสร็จแล้วบอกพ่อผ่าน onSaved ให้โหลดตารางใหม่
 */
const emptyValues: MenuFormValues = {
  name: "",
  path: "",
  code: "",
  icon: "",
  sort_order: 1,
  parent_id: null,
  detail: "",
  active_status: MENU_ACTIVE,
}

const toValues = (menu: Menu | undefined): MenuFormValues =>
  menu
    ? {
        name: menu.name,
        path: menu.path,
        code: menu.code,
        icon: menu.icon,
        sort_order: menu.sort_order,
        // 0 กับ null ในฐานข้อมูลหมายถึงเมนูหลักเหมือนกัน — ในฟอร์มใช้ null อย่างเดียว
        parent_id: menu.parent_id || null,
        detail: menu.detail ?? "",
        active_status: menu.active_status,
      }
    : emptyValues

export function FormModal({
  open,
  onOpenChange,
  mode,
  menu,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: MenuFormMode
  menu?: Menu
  onSaved?: () => void
}) {
  const t = useTranslations("common")
  const tm = useTranslations("menus")
  const tform = useTranslations("menus.form")
  const tcol = useTranslations("menus.columns")

  const [values, setValues] = React.useState(() => toValues(menu))
  const [saving, setSaving] = React.useState(false)
  /** ผลของการกดบันทึกครั้งล่าสุด — null คือยังไม่ได้กด */
  const [result, setResult] = React.useState<{
    ok: boolean
    message?: string
  } | null>(null)

  /**
   * เปิดใหม่หรือสลับแถวเมื่อไหร่ ให้ล้างค่าในฟอร์มทิ้ง
   * ปรับ state ระหว่าง render ตามแบบที่ React แนะนำ ไม่ใช้ useEffect ไป setState
   * (กฎ react-hooks/set-state-in-effect ของ eslint-config-next 16 ห้ามไว้)
   */
  const formKey = `${mode}-${menu?.id ?? "new"}-${String(open)}`
  const [lastKey, setLastKey] = React.useState(formKey)
  if (formKey !== lastKey) {
    setLastKey(formKey)
    setValues(toValues(menu))
    setResult(null)
    setSaving(false)
  }

  // ตัวเลือกเมนูแม่มาจาก API ไม่ได้ปั้นจากแถวในตาราง — ตารางแบ่งหน้ามาแล้ว
  // เมนูแม่ที่อยู่คนละหน้าจะหายไปจาก dropdown ถ้าใช้ข้อมูลในตาราง
  const [options, setOptions] = React.useState<MenuOption[]>([])
  React.useEffect(() => {
    if (!open) return
    let alive = true
    getMenuOptions()
      .then((rows) => alive && setOptions(rows))
      // ดึงตัวเลือกไม่ได้ ต้องไม่ทำให้ฟอร์มพัง — เหลือแต่ตัวเลือกว่าง
      .catch(() => alive && setOptions([]))
    return () => {
      alive = false
    }
  }, [open])

  const set = <K extends keyof MenuFormValues>(
    key: K,
    value: MenuFormValues[K]
  ) => setValues((current) => ({ ...current, [key]: value }))

  const statusOptions = [
    { value: MENU_ACTIVE, label: tm("active") },
    { value: MENU_INACTIVE, label: tm("inactive") },
  ]

  // API ส่งมาเฉพาะเมนูชั้นบนสุดที่ active อยู่แล้ว เหลือแค่กันไม่ให้เลือกตัวเองเป็นแม่ตัวเอง
  // ชื่อที่โชว์ใช้ตัวแปลตัวเดียวกับตารางและเมนูข้าง — code ไหนมีคำแปลก็เปลี่ยนตามภาษา
  // ไม่มีก็ใช้ name จากฐานข้อมูล · id 0 คือ "ไม่มีเมนูแม่" ใช้คำแปลของเราเสมอ
  const navLabel = useNavLabel()
  const parentOptions = options
    .filter((row) => row.id !== menu?.id)
    .map((row) => ({
      value: String(row.id),
      label:
        row.id === MENU_NO_PARENT_ID
          ? tm("root")
          : navLabel({ code: row.code, name: row.name }),
    }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        {/* แถบหัวไล่เฉดชุดเดียวกับแถบตัวกรองในตาราง */}
        <DialogHeader
          className="from-primary/12 border-border/60 -mx-4 -mt-4 rounded-t-xl border-b bg-gradient-to-r via-transparent to-transparent p-4"
        >
          <DialogTitle>
            {mode === "add" ? tform("addTitle") : tform("editTitle")}
          </DialogTitle>
          <DialogDescription>
            {mode === "add"
              ? tform("addDescription")
              : tform("editDescription")}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={async (event) => {
            event.preventDefault()
            if (saving) return
            setSaving(true)
            setResult(null)
            try {
              // โหมดของฟอร์มคือ action ที่ API ใช้ตัดสินใจ ("add" / "edit")
              await saveMenu(mode, values, menu?.id)
              setResult({ ok: true })
              onSaved?.()
              // ให้เห็นข้อความว่าสำเร็จสักครู่ก่อนปิด ไม่งั้นกล่องหายไปเลยเหมือนไม่มีอะไรเกิดขึ้น
              setTimeout(() => onOpenChange(false), 1400)
            } catch (error) {
              // ข้อความจาก API บอกสาเหตุตรง ๆ (เช่น "name is required") เอามาแสดงต่อ
              setResult({
                ok: false,
                message: error instanceof Error ? error.message : undefined,
              })
            } finally {
              setSaving(false)
            }
          }}
          className="grid gap-4"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="menu-name" label={tcol("name")} required>
              <Input
                id="menu-name"
                value={values.name}
                onChange={(event) => set("name", event.target.value)}
                placeholder="Menu Name..."
                required
              />
            </Field>
            <Field id="menu-code" label={tcol("code")} required>
              <Input
                id="menu-code"
                value={values.code}
                onChange={(event) => set("code", event.target.value)}
                required
                placeholder="code-***"
                className="font-mono"
              />
            </Field>
            <Field id="menu-path" label={tcol("path")} required>
              <Input
                id="menu-path"
                value={values.path}
                onChange={(event) => set("path", event.target.value)}
                required
                placeholder="/path"
                className="font-mono"
              />
            </Field>
            <Field id="menu-icon" label={tcol("icon")}>
              {/* ปล่อยให้พิมพ์เอง ฐานข้อมูลเก็บได้ทั้งชื่อ lucide และโค้ดของเมนู */}
              <Input
                id="menu-icon"
                value={values.icon}
                onChange={(event) => set("icon", event.target.value)}
                placeholder="Icon"
                className="font-mono"
              />
            </Field>
            <Field id="menu-parent" label={tcol("parent")}>
              <SelectOption
                id="menu-parent"
                options={parentOptions}
                value={String(values.parent_id ?? MENU_NO_PARENT_ID)}
                onValueChange={(next) => {
                  // ทั้ง "ไม่ได้เลือก" และ id 0 หมายถึงไม่มีเมนูแม่เหมือนกัน
                  const id = next === null ? MENU_NO_PARENT_ID : Number(next)
                  set("parent_id", id === MENU_NO_PARENT_ID ? null : id)
                }}
                placeholder={tm("root")}
                label={tcol("parent")}
              />
            </Field>
            <Field id="menu-sort" label={tcol("sortOrder")}>
              <Input
                id="menu-sort"
                type="number"
                min={1}
                value={values.sort_order}
                onChange={(event) =>
                  set("sort_order", Number(event.target.value) || 1)
                }
              />
            </Field>
            <Field id="menu-status" label={tcol("status")}>
              <SelectOption
                id="menu-status"
                options={statusOptions}
                value={values.active_status}
                onValueChange={(next) =>
                  set("active_status", next ?? MENU_ACTIVE)
                }
                placeholder={tm("active")}
                label={tcol("status")}
              />
            </Field>
          </div>

          <Field id="menu-detail" label={tcol("detail")}>
            <Textarea
              id="menu-detail"
              rows={3}
              value={values.detail}
              placeholder="..."
              onChange={(event) => set("detail", event.target.value)}
            />
          </Field>

          {result ? (
            <Alert variant={result.ok ? "success" : "destructive"}>
              {result.ok ? <CircleCheck /> : <TriangleAlert />}
              <AlertContent>
                <AlertTitle>
                  {result.ok ? tform("saved") : tform("saveError")}
                </AlertTitle>
                {result.message ? (
                  <AlertDescription>{result.message}</AlertDescription>
                ) : null}
              </AlertContent>
            </Alert>
          ) : null}

          {/* แถบท้ายไล่เฉดชุดเดียวกับแถบแบ่งหน้าในตาราง */}
          <DialogFooter
            className="from-primary/12 border-border/60 bg-transparent bg-gradient-to-r via-transparent to-transparent"
          >
            <DialogClose
              render={
                <Button type="button" variant="outline" disabled={saving} />
              }
            >
              {t("cancel")}
            </DialogClose>
            <Button
              type="submit"
              disabled={saving}
              className="from-chart-1 to-chart-5 bg-gradient-to-r text-white transition-transform hover:-translate-y-0.5 hover:opacity-95"
            >
              {saving ? <LoaderCircle className="animate-spin" /> : null}
              {t("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** ป้ายกำกับ + ช่องกรอก วางแบบเดียวกันทุกช่อง */
function Field({
  id,
  label,
  required,
  children,
}: {
  id: string
  label: string
  /** ใส่ดอกจันให้รู้ตั้งแต่ก่อนกดบันทึกว่าช่องนี้ต้องกรอก */
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-muted-foreground text-xs">
        {label}
        {required ? (
          <span aria-hidden className="text-destructive -ml-1.5">
            *
          </span>
        ) : null}
      </Label>
      {children}
    </div>
  )
}
