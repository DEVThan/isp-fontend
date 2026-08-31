"use client"

import * as React from "react"
import { useActionState } from "react"
import { AlertCircle, Eye, EyeOff, LogIn } from "lucide-react"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
// import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { signIn } from "@/app/login/components/auth-actions"
import type { SignInState } from "@/app/login/components/auth"

export function LoginForm() {
  const t = useTranslations("login")
  const te = useTranslations("login.errors")
  const [state, formAction, isPending] = useActionState<SignInState, FormData>(
    signIn,
    {}
  )
  const [showPassword, setShowPassword] = React.useState(false)

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state.errors?.form ? (
        <p
          role="alert"
          className="bg-danger/10 text-danger-ink flex items-start gap-2 rounded-lg px-3 py-2 text-sm"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {te(state.errors.form)}
        </p>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="username">{t("username")}</Label>
        <Input
          id="username"
          name="username"
          autoComplete="username"
          placeholder={t("usernamePlaceholder")}
          defaultValue={state.values?.username}
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

      <Button type="submit" className="w-full" disabled={isPending}>
        <LogIn />
        {isPending ? t("submitting") : t("submit")}
      </Button>
    </form>
  )
}
