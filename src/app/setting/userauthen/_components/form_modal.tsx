"use client"

import * as React from "react"
import { CircleCheck, LoaderCircle, TriangleAlert } from "lucide-react"
import { useTranslations } from "next-intl"

import {
  getRoleOptions,
  saveUser,
} from "@/app/setting/userauthen/_components/api"
import {
  USER_ACTIVE,
  USER_INACTIVE,
  type RoleOption,
  type UserAuthen,
  type UserFormMode,
  type UserFormValues,
} from "@/app/setting/userauthen/_components/model"
import { SelectOption } from "@/app/setting/userauthen/_components/selectoption"
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

/**
 * form_modal.tsx — ฟอร์มเพิ่ม/แก้ไขผู้ใช้งานในกล่องซ้อน
 *
 * ปุ่มที่เปิดฟอร์มเป็นคนบอกโหมดมาเอง: "add" เปิดฟอร์มเปล่า "edit" เปิดพร้อมค่าของแถวนั้น
 * กดบันทึกแล้วยิง POST /api/web/userauthen-action เอง เสร็จแล้วบอกพ่อผ่าน onSaved ให้โหลดตารางใหม่
 */
// คลาสขอบแดง — ต้องสลับคลาสเอง ไม่ใช้ variant aria-invalid: เพราะ Tailwind v4 ห่อ variant
// ด้วย :where() ความจำเพาะจึงเท่ากับ border-input แล้วแพ้ลำดับใน stylesheet
const INVALID_FIELD =
  "border-destructive ring-3 ring-destructive/20 dark:border-destructive/50 dark:ring-destructive/40"

const emptyValues: UserFormValues = {
  username: "",
  password: "",
  fullname: "",
  role: "",
  email: "",
  telephone: "",
  status: USER_ACTIVE,
}

const toValues = (user: UserAuthen | undefined): UserFormValues =>
  user
    ? {
        username: user.username,
        // API ไม่เคยส่งรหัสผ่านออกมา และเว้นว่างไว้แปลว่าใช้รหัสเดิม
        password: "",
        fullname: user.fullname ?? "",
        role: user.role ?? "",
        email: user.email ?? "",
        telephone: user.telephone ?? "",
        status: user.status,
      }
    : emptyValues

export function FormModal({
  open,
  onOpenChange,
  mode,
  user,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** ปุ่มไหนเป็นคนเปิด — "add" หรือ "edit" */
  mode: UserFormMode
  /** แถวที่กำลังแก้ (โหมด edit เท่านั้น) */
  user?: UserAuthen
  /** บันทึกสำเร็จแล้ว — ตารางเอาไปโหลดข้อมูลใหม่ */
  onSaved?: () => void
}) {
  const t = useTranslations("common")
  const tu = useTranslations("userauthens")
  const tform = useTranslations("userauthens.form")
  const tcol = useTranslations("userauthens.columns")

  const [values, setValues] = React.useState(() => toValues(user))
  const [saving, setSaving] = React.useState(false)
  /** ช่องบังคับที่ยังว่างตอนกดบันทึก — ตรวจเองแทน required ของเบราว์เซอร์
   *  (ป้ายของเบราว์เซอร์ชี้ไม่ตรงช่องเวลาเป็น combobox และหน้าตาไม่เข้ากับที่เหลือ) */
  const [errors, setErrors] = React.useState<
    Partial<Record<keyof UserFormValues, boolean>>
  >({})
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
  const formKey = `${mode}-${user?.id ?? "new"}-${String(open)}`
  const [lastKey, setLastKey] = React.useState(formKey)
  if (formKey !== lastKey) {
    setLastKey(formKey)
    setValues(toValues(user))
    setResult(null)
    setSaving(false)
    setErrors({})
  }

  // ตัวเลือกสิทธิ์มาจากเส้นของหน้าจัดการสิทธิ์ ดึงตอนเปิดฟอร์ม ไม่ได้ดึงค้างไว้ตั้งแต่โหลดหน้า
  const [roles, setRoles] = React.useState<RoleOption[]>([])
  React.useEffect(() => {
    if (!open) return
    let alive = true
    getRoleOptions()
      .then((rows) => alive && setRoles(rows))
      // ดึงตัวเลือกไม่ได้ ต้องไม่ทำให้ฟอร์มพัง — เหลือแต่ตัวเลือกว่าง
      .catch(() => alive && setRoles([]))
    return () => {
      alive = false
    }
  }, [open])

  const set = <K extends keyof UserFormValues>(
    key: K,
    value: UserFormValues[K]
  ) => setValues((current) => ({ ...current, [key]: value }))

  const statusOptions = [
    { value: USER_ACTIVE, label: tu("active") },
    { value: USER_INACTIVE, label: tu("inactive") },
  ]

  const roleOptions = roles.map((role) => ({
    value: role.id,
    label: role.rolename,
  }))

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
            const missing: Partial<Record<keyof UserFormValues, boolean>> = {}
            if (!values.username.trim()) missing.username = true
            // รหัสผ่านบังคับเฉพาะตอนเพิ่มใหม่ · แก้ไขเว้นว่างได้ = ใช้รหัสเดิม
            if (mode === "add" && !values.password.trim()) missing.password = true
            if (!values.fullname.trim()) missing.fullname = true
            if (!values.role) missing.role = true
            if (Object.keys(missing).length > 0) {
              setErrors(missing)
              return
            }
            setErrors({})
            setSaving(true)
            setResult(null)
            try {
              // โหมดของฟอร์มคือ action ที่ API ใช้ตัดสินใจ ("add" / "edit")
              await saveUser(mode, values, user?.id)
              setResult({ ok: true })
              onSaved?.()
              // ให้เห็นข้อความว่าสำเร็จสักครู่ก่อนปิด ไม่งั้นกล่องหายไปเลยเหมือนไม่มีอะไรเกิดขึ้น
              setTimeout(() => onOpenChange(false), 1400)
            } catch (error) {
              // ข้อความจาก API บอกสาเหตุตรง ๆ (เช่น "username already exists") เอามาแสดงต่อ
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
            <Field
              id="user-username"
              label={tcol("username")}
              required
              error={errors.username ? t("required") : undefined}
            >
              <Input
                id="user-username"
                value={values.username}
                onChange={(event) => {
                  set("username", event.target.value)
                  if (event.target.value.trim())
                    setErrors((e) => ({ ...e, username: false }))
                }}
                aria-required
                aria-invalid={errors.username || undefined}
                className={errors.username ? INVALID_FIELD : undefined}
                autoComplete="off"
              />
            </Field>
            <Field
              id="user-password"
              label={tcol("password")}
              required={mode === "add"}
              hint={mode === "edit" ? tform("passwordHint") : undefined}
              error={errors.password ? t("required") : undefined}
            >
              <Input
                id="user-password"
                type="password"
                value={values.password}
                onChange={(event) => {
                  set("password", event.target.value)
                  if (event.target.value.trim())
                    setErrors((e) => ({ ...e, password: false }))
                }}
                // เพิ่มใหม่ต้องตั้งรหัส · แก้ไขเว้นว่างได้ = ใช้รหัสเดิม
                aria-required={mode === "add"}
                aria-invalid={errors.password || undefined}
                className={errors.password ? INVALID_FIELD : undefined}
                autoComplete="new-password"
              />
            </Field>
            <Field
              id="user-fullname"
              label={tcol("fullname")}
              required
              error={errors.fullname ? t("required") : undefined}
            >
              <Input
                id="user-fullname"
                value={values.fullname}
                onChange={(event) => {
                  set("fullname", event.target.value)
                  if (event.target.value.trim())
                    setErrors((e) => ({ ...e, fullname: false }))
                }}
                aria-required
                aria-invalid={errors.fullname || undefined}
                className={errors.fullname ? INVALID_FIELD : undefined}
              />
            </Field>
            <Field
              id="user-role"
              label={tcol("role")}
              required
              error={errors.role ? t("selectRequired") : undefined}
            >
              <SelectOption
                id="user-role"
                options={roleOptions}
                value={values.role || null}
                onValueChange={(next) => {
                  set("role", next ?? "")
                  if (next) setErrors((e) => ({ ...e, role: false }))
                }}
                placeholder={tu("noRole")}
                label={tcol("role")}
                invalid={errors.role}
              />
            </Field>
            <Field id="user-email" label={tcol("email")}>
              <Input
                id="user-email"
                type="email"
                value={values.email}
                onChange={(event) => set("email", event.target.value)}
              />
            </Field>
            <Field id="user-telephone" label={tcol("telephone")}>
              <Input
                id="user-telephone"
                value={values.telephone}
                onChange={(event) => set("telephone", event.target.value)}
              />
            </Field>
            <Field id="user-status" label={tcol("status")}>
              <SelectOption
                id="user-status"
                options={statusOptions}
                value={values.status}
                onValueChange={(next) => set("status", next ?? USER_ACTIVE)}
                placeholder={tu("active")}
                label={tcol("status")}
              />
            </Field>
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

/** ป้ายกำกับ + ช่องกรอก วางแบบเดียวกันทุกช่อง */
function Field({
  id,
  label,
  required,
  hint,
  error,
  children,
}: {
  id: string
  label: string
  /** ใส่ดอกจันให้รู้ตั้งแต่ก่อนกดบันทึกว่าช่องนี้ต้องกรอก */
  required?: boolean
  /** คำอธิบายใต้ช่อง เช่น เว้นว่างไว้แปลว่าอะไร */
  hint?: string
  /** ข้อความผิดพลาดใต้ช่อง — ขึ้นมาแทน hint */
  error?: string
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
      {error ? (
        <p className="text-destructive text-xs">{error}</p>
      ) : hint ? (
        <p className="text-muted-foreground/80 text-xs">{hint}</p>
      ) : null}
    </div>
  )
}
