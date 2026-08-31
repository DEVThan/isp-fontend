"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, Eye, EyeOff, LoaderCircle, LogIn } from "lucide-react"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
// import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  ApiError,
  API_NETWORK_ERROR,
  login,
} from "@/app/login/components/api"
import {
  saveSession,
  toSession,
  validateCredentials,
  type LoginErrorKey,
  type SignInState,
} from "@/app/login/components/auth"

/** แปลง code จาก API เป็น key ใต้ "login.errors" ให้ฟอร์มเอาไปแปล */
function errorKey(error: unknown): LoginErrorKey {
  if (!(error instanceof ApiError)) return "serverError"
  switch (error.code) {
    case 401:
      return "invalidCredentials"
    case 403:
      return "accountDisabled"
    // 0 = ยิงไม่ถึง Next เลย · 502/503/504 = Next ต่อ Flask ไม่ได้ (proxy ใน next.config.ts)
    case API_NETWORK_ERROR:
    case 502:
    case 503:
    case 504:
      return "serverUnavailable"
    default:
      return "serverError"
  }
}

export function LoginForm() {
  const t = useTranslations("login")
  const te = useTranslations("login.errors")
  const router = useRouter()
  const [state, setState] = React.useState<SignInState>({})
  const [isPending, setIsPending] = React.useState(false)
  const [showPassword, setShowPassword] = React.useState(false)

  /**
   * ส่งฟอร์ม — ทำงานทั้งหมดบน browser
   * ตรวจว่ากรอกครบ -> ยิง API -> เก็บ session ลง cookie -> เข้าหน้าแรก
   * ถูก/ผิดเป็นคำตอบของ API ฟอร์มแค่เอา code มาแปลงเป็นข้อความ
   */
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    const username = String(formData.get("username") ?? "").trim()
    const password = String(formData.get("password") ?? "")
    const remember = formData.get("remember") === "on"

    const errors = validateCredentials(username, password)
    if (Object.keys(errors).length > 0) {
      setState({ errors, values: { username, remember } })
      return
    }

    setIsPending(true)
    try {
      const user = await login(username, password)
      saveSession(toSession(user), remember)
      router.replace("/")
      // cookie เพิ่งเปลี่ยน — สั่งดึงหน้าใหม่เพื่อให้ฝั่ง server เห็น session
      router.refresh()
    } catch (error) {
      if (!(error instanceof ApiError)) console.error("[login]", error)
      setState({ errors: { form: errorKey(error) }, values: { username, remember } })
      setIsPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {state.errors?.form ? (
        <p
          role="alert"
          className="bg-danger/10 text-danger-ink flex items-start gap-2 rounded-lg px-3 py-2 text-sm"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {te(state.errors.form)}
        </p>
      ) : null}

      {/* ไม่ต้องใส่ defaultValue คืนค่าที่พิมพ์ — ฟอร์มไม่ได้ remount ตอนล็อกอินไม่ผ่าน
          ค่าที่พิมพ์ไว้ยังอยู่ใน DOM เอง และการเปลี่ยน defaultValue ทีหลังจะทำให้
          Base UI เตือน "changing the default value state of an uncontrolled FieldControl" */}
      <div className="space-y-2">
        <Label htmlFor="username">{t("username")}</Label>
        <Input
          id="username"
          name="username"
          autoComplete="username"
          placeholder={t("usernamePlaceholder")}
          aria-invalid={Boolean(state.errors?.username)}
          aria-describedby={
            state.errors?.username ? "username-error" : undefined
          }
        />
        {state.errors?.username ? (
          <p id="username-error" className="text-danger-ink text-xs">
            {te(state.errors.username)}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        {/* <div className="flex items-center justify-between">
          <Label htmlFor="password">{t("password")}</Label>
          <a
            href="#"
            className="text-info-ink text-xs font-medium hover:underline"
          >
            {t("forgot")}
          </a>
        </div> */}
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder={t("passwordPlaceholder")}
            className="pr-10"
            aria-invalid={Boolean(state.errors?.password)}
            aria-describedby={
              state.errors?.password ? "password-error" : undefined
            }
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? t("hidePassword") : t("showPassword")}
            className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1 transition-colors"
          >
            {showPassword ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </button>
        </div>
        {state.errors?.password ? (
          <p id="password-error" className="text-danger-ink text-xs">
            {te(state.errors.password)}
          </p>
        ) : null}
      </div>

      {/* <div className="flex items-center gap-2">
        <Checkbox
          id="remember"
          name="remember"
          defaultChecked={state.values?.remember}
        />
        <Label htmlFor="remember" className="text-sm font-normal">
          {t("remember")}
        </Label>
      </div> */}

      <Button type="submit" className="w-full cursor-pointer" disabled={isPending}>
        {/* API ตอบช้าได้หลายวินาที — ต้องมีอะไรหมุนให้เห็นว่ายังทำงานอยู่ */}
        {isPending ? <LoaderCircle className="animate-spin" /> : <LogIn />}
        {isPending ? t("submitting") : t("submit")}
      </Button>
    </form>
  )
}
