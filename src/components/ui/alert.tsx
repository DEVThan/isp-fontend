import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * alert.tsx — กล่องข้อความบอกผลของสิ่งที่เพิ่งทำ (สำเร็จ / ไม่สำเร็จ)
 *
 * ใช้ตัวแปรสีชุด status ที่มีคู่สี -ink ให้แล้ว จึงอ่านชัดทั้งธีมสว่างและมืด
 * สีไม่ได้สื่อความหมายเพียงลำพัง — ทุกกล่องมีข้อความและไอคอนกำกับเสมอ
 */
const alertVariants = cva(
  "relative flex w-full items-start gap-2.5 rounded-lg px-3 py-2.5 text-sm ring-1 ring-inset [&_svg]:mt-0.5 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-muted/60 text-foreground ring-border",
        info: "bg-info/10 text-info-ink ring-info/25",
        success: "bg-success/12 text-success-ink ring-success/25",
        warning: "bg-warning/15 text-warning-ink ring-warning/30",
        destructive: "bg-danger/10 text-danger-ink ring-danger/25",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      // role=alert ทำให้ screen reader อ่านทันทีที่กล่องโผล่ ไม่ต้องรอผู้ใช้เลื่อนไปเจอ
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn("font-medium", className)}
      {...props}
    />
  )
}

function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn("text-current/75 text-sm", className)}
      {...props}
    />
  )
}

/** ตัวครอบข้อความ ใช้คู่กับไอคอนที่วางไว้ก่อนหน้า */
function AlertContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-content"
      className={cn("min-w-0 flex-1 space-y-0.5", className)}
      {...props}
    />
  )
}

export { Alert, AlertContent, AlertTitle, AlertDescription, alertVariants }
