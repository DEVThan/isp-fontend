"use client"

import * as React from "react"
import { CircleCheck, LoaderCircle, TriangleAlert } from "lucide-react"
import { useTranslations } from "next-intl"

import {
  getMenuChoices,
  saveUserRole,
} from "@/app/setting/userrole/_components/api"
import {
  ROLE_ACTIVE,
  ROLE_INACTIVE,
  type MenuChoice,
  type RoleFormMode,
  type RoleFormValues,
  type UserRole,
} from "@/app/setting/userrole/_components/model"
import { SelectOption } from "@/app/setting/userrole/_components/selectoption"
import { useNavLabel } from "@/components/app-sidebar"
import {
  Alert,
  AlertContent,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
 * form_modal.tsx — ฟอร์มเพิ่ม/แก้ไขสิทธิ์ผู้ใช้ในกล่องซ้อน
 *
 * ปุ่มที่เปิดฟอร์มเป็นคนบอกโหมดมาเอง: "add" เปิดฟอร์มเปล่า "edit" เปิดพร้อมค่าของแถวนั้น
 * กดบันทึกแล้วยิง POST /api/web/userrole-action เอง เสร็จแล้วบอกพ่อผ่าน onSaved ให้โหลดตารางใหม่
 */
const emptyValues: RoleFormValues = {
  rolename: "",
  detail: "",
  permission_menus: [],
  active_status: ROLE_ACTIVE,
}

const toValues = (role: UserRole | undefined): RoleFormValues =>
  role
    ? {
        rolename: role.rolename,
        detail: role.detail ?? "",
        // API ส่ง permission_menus มาเป็น array ของสตริง แต่ตอนบันทึกต้องเป็นตัวเลข
        permission_menus: role.permission_menus.map(Number),
        active_status: role.active_status,
      }
    : emptyValues

export function FormModal({
  open,
  onOpenChange,
  mode,
  role,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** ปุ่มไหนเป็นคนเปิด — "add" หรือ "edit" */
  mode: RoleFormMode
  /** แถวที่กำลังแก้ (โหมด edit เท่านั้น) */
  role?: UserRole
  /** บันทึกสำเร็จแล้ว — ตารางเอาไปโหลดข้อมูลใหม่ */
  onSaved?: () => void
}) {
  const t = useTranslations("common")
  const tr = useTranslations("userroles")
  const tform = useTranslations("userroles.form")
  const tcol = useTranslations("userroles.columns")
  const navLabel = useNavLabel()

  const [values, setValues] = React.useState(() => toValues(role))
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
  const formKey = `${mode}-${role?.id ?? "new"}-${String(open)}`
  const [lastKey, setLastKey] = React.useState(formKey)
  if (formKey !== lastKey) {
    setLastKey(formKey)
    setValues(toValues(role))
    setResult(null)
    setSaving(false)
  }

  // รายการเมนูสำหรับติ๊กเลือกสิทธิ์ — ดึงตอนเปิดฟอร์ม ไม่ได้ดึงค้างไว้ตั้งแต่โหลดหน้า
  const [menus, setMenus] = React.useState<MenuChoice[]>([])
  React.useEffect(() => {
    if (!open) return
    let alive = true
    getMenuChoices()
      .then((rows) => {
        if (!alive) return
        setMenus(rows)
        // สิทธิ์ที่ชี้ไปเมนูที่ถูกลบไปแล้วต้องตัดทิ้ง — ติ๊กให้ไม่ได้เพราะไม่มีช่องให้ติ๊ก
        // และถ้าปล่อยติดไปด้วย พอกดบันทึก API จะตอบ 400 unknown menu id ทั้งที่ผู้ใช้ไม่ได้แตะอะไร
        const exists = new Set(rows.map((row) => row.id))
        setValues((current) => {
          const kept = current.permission_menus.filter((id) => exists.has(id))
          return kept.length === current.permission_menus.length
            ? current
            : { ...current, permission_menus: kept }
        })
      })
      // ดึงเมนูไม่ได้ ต้องไม่ทำให้ฟอร์มพัง — เหลือแต่รายการว่าง
      .catch(() => alive && setMenus([]))
    return () => {
      alive = false
    }
  }, [open])

  const set = <K extends keyof RoleFormValues>(
    key: K,
    value: RoleFormValues[K]
  ) => setValues((current) => ({ ...current, [key]: value }))

  const statusOptions = [
    { value: ROLE_ACTIVE, label: tr("active") },
    { value: ROLE_INACTIVE, label: tr("inactive") },
  ]

  const checked = new Set(values.permission_menus)
  const toggle = (id: number, on: boolean) => {
    const next = new Set(checked)
    if (on) next.add(id)
    else next.delete(id)
    set("permission_menus", [...next].sort((a, b) => a - b))
  }

  // เมนูหลักก่อน แล้วลูกของมันตามหลัง — ให้ผังในฟอร์มตรงกับที่เห็นในเมนูข้าง
  const parents = menus.filter((menu) => !menu.parent_id)
  const childrenOf = (parentId: number) =>
    menus.filter((menu) => menu.parent_id === parentId)
  const orphans = menus.filter(
    (menu) => menu.parent_id && !parents.some((p) => p.id === menu.parent_id)
  )
  const allIds = menus.map((menu) => menu.id)
  const allChecked = allIds.length > 0 && allIds.every((id) => checked.has(id))

  const menuLabel = (menu: MenuChoice) =>
    navLabel({ code: menu.code, name: menu.name })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        {/* แถบหัวไล่เฉดชุดเดียวกับแถบตัวกรองในตาราง */}
        <DialogHeader className="from-primary/12 border-border/60 -mx-4 -mt-4 rounded-t-xl border-b bg-gradient-to-r via-transparent to-transparent p-4">
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
              await saveUserRole(mode, values, role?.id)
              setResult({ ok: true })
              onSaved?.()
              // ให้เห็นข้อความว่าสำเร็จสักครู่ก่อนปิด ไม่งั้นกล่องหายไปเลยเหมือนไม่มีอะไรเกิดขึ้น
              setTimeout(() => onOpenChange(false), 1400)
            } catch (error) {
              // ข้อความจาก API บอกสาเหตุตรง ๆ (เช่น "rolename is required") เอามาแสดงต่อ
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


          {mode === "edit" && role ? (
            <Field id="role-id" label={tcol("id")}>
              <Input
                id="role-id"
                value={role.id}
                readOnly
                disabled
                className="font-mono"
              />
            </Field>
          ) : null}
          
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="role-name" label={tcol("rolename")} required>
              <Input
                id="role-name"
                value={values.rolename}
                onChange={(event) => set("rolename", event.target.value)}
                placeholder="..."
                required
              />
            </Field>
            <Field id="role-status" label={tcol("status")}>
              <SelectOption
                id="role-status"
                options={statusOptions}
                value={values.active_status}
                onValueChange={(next) =>
                  set("active_status", next ?? ROLE_ACTIVE)
                }
                placeholder={tr("active")}
                label={tcol("status")}
              />
            </Field>
          </div>

          <Field id="role-detail" label={tcol("detail")}>
            <Textarea
              id="role-detail"
              rows={2}
              value={values.detail}
              placeholder="..."
              onChange={(event) => set("detail", event.target.value)}
            />
          </Field>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-muted-foreground text-xs">
                {tcol("menus")}
                <span className="text-muted-foreground/70">
                  ({values.permission_menus.length})
                </span>
              </Label>
              <label className="text-muted-foreground hover:text-foreground flex cursor-default items-center gap-2 text-xs transition-colors">
                <Checkbox
                  checked={allChecked}
                  onCheckedChange={(next) =>
                    set("permission_menus", next ? allIds : [])
                  }
                />
                {tr("selectAll")}
              </label>
            </div>

            <div className="border-input max-h-56 space-y-1 overflow-y-auto rounded-lg border p-2">
              {menus.length === 0 ? (
                <p className="text-muted-foreground px-1 py-3 text-center text-sm">
                  {t("table.loading")}
                </p>
              ) : null}
              {parents.map((parent) => (
                <div key={parent.id}>
                  <MenuCheck
                    label={menuLabel(parent)}
                    checked={checked.has(parent.id)}
                    onChange={(on) => toggle(parent.id, on)}
                  />
                  {childrenOf(parent.id).map((child) => (
                    <MenuCheck
                      key={child.id}
                      label={menuLabel(child)}
                      checked={checked.has(child.id)}
                      onChange={(on) => toggle(child.id, on)}
                      indent
                    />
                  ))}
                </div>
              ))}
              {/* เมนูลูกที่แม่ถูกลบไปแล้ว ยังต้องเลือกได้ ไม่งั้นสิทธิ์เดิมจะหายไปเงียบ ๆ ตอนบันทึก */}
              {orphans.map((menu) => (
                <MenuCheck
                  key={menu.id}
                  label={menuLabel(menu)}
                  checked={checked.has(menu.id)}
                  onChange={(on) => toggle(menu.id, on)}
                  indent
                />
              ))}
            </div>
          </div>

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
          <DialogFooter className="from-primary/12 border-border/60 bg-transparent bg-gradient-to-r via-transparent to-transparent">
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

/** หนึ่งบรรทัดในรายการเมนู — ทั้งแถวกดได้ ไม่ต้องเล็งที่กล่องติ๊กเล็ก ๆ */
function MenuCheck({
  label,
  checked,
  onChange,
  indent,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  indent?: boolean
}) {
  return (
    <label
      className={`hover:bg-accent/50 flex cursor-default items-center gap-2 rounded-md px-1.5 py-1 text-sm transition-colors ${
        indent ? "ml-5" : "font-medium"
      }`}
    >
      <Checkbox checked={checked} onCheckedChange={onChange} />
      {label}
    </label>
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
