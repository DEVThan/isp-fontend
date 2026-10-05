"use client"

import * as React from "react"
import { CircleCheck, Info, LoaderCircle, RefreshCw, TriangleAlert } from "lucide-react"
import { useTranslations } from "next-intl"

import { ApiError } from "@/app/login/components/api"
import {
  getSoSyncStatus,
  SO_SYNC_RUNNING,
  startSoSync,
  type SoSyncState,
} from "@/app/sale/so/_components/api"
import {
  Alert,
  AlertContent,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

/**
 * sync_button.tsx — ปุ่ม "อัปเดตข้อมูล" ที่หัวตาราง so (05/10/2026) + กล่องแจ้งผล
 *
 * /so-sync แค่สั่งงานแล้วตอบทันที (งาน sync รันต่อบนเครื่อง sync อีกเป็นนาที) — "สำเร็จ" จริงคือตอนงานจบ
 * จึงถาม /so-sync-status ซ้ำทุก POLL_MS จนกว่า state จะไม่ใช่ "กำลังรัน" แล้วค่อยแจ้งผล + ให้ตารางโหลดใหม่ (onSynced)
 * มีรอบที่รันอยู่แล้ว (409) ไม่สั่งซ้ำ แต่รอรอบนั้นจบให้แทน
 */

/** ถามสถานะทุกกี่มิลลิวินาที — แต่ละครั้ง API ต้อง ssh ไปอีกเครื่อง (~2–5 วิ) ถี่กว่านี้ไม่ได้อะไร */
const POLL_MS = 5000
/** ถามสถานะล้มติดกันกี่ครั้งถึงยอมแพ้ — ssh หลุดครั้งเดียวไม่ได้แปลว่างานพัง */
const MAX_STATUS_ERRORS = 3
/** รอนานสุดเท่านี้ (15 นาที) — เกินแล้วเลิกรอ งานอาจยังรันต่ออยู่ */
const MAX_WAIT_MS = 15 * 60 * 1000
/** กล่องสำเร็จหายเองหลังกี่มิลลิวินาที — ผิดพลาดค้างไว้จนกดใหม่ */
const SUCCESS_HIDE_MS = 6000

type Notice = {
  kind: "info" | "success" | "destructive"
  title: string
  message?: string
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export function SyncButton({ onSynced }: { onSynced: () => void }) {
  const tsync = useTranslations("so.sync")

  const [running, setRunning] = React.useState(false)
  const [notice, setNotice] = React.useState<Notice | null>(null)

  /** ปิดหน้าไปแล้วต้องหยุดถามสถานะ และห้าม setState ต่อ */
  const alive = React.useRef(true)
  React.useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  /** ถามสถานะจนงานจบ — คืนสถานะสุดท้าย · ถามไม่ได้ติดกันเกินกำหนด/รอนานเกิน โยน Error */
  const waitUntilDone = async (): Promise<SoSyncState | undefined> => {
    const until = Date.now() + MAX_WAIT_MS
    let errors = 0
    while (alive.current) {
      await delay(POLL_MS)
      if (!alive.current) return undefined
      try {
        const status = await getSoSyncStatus()
        errors = 0
        if (!SO_SYNC_RUNNING.includes(status?.state ?? "")) return status
      } catch (error) {
        if (++errors >= MAX_STATUS_ERRORS) throw error
      }
      if (Date.now() > until) throw new Error(tsync("timeout"))
    }
    return undefined
  }

  const sync = async () => {
    if (running) return
    setRunning(true)
    setNotice({ kind: "info", title: tsync("running"), message: tsync("runningHint") })
    try {
      try {
        await startSoSync()
      } catch (error) {
        // มีรอบที่รันอยู่แล้ว — ไม่ใช่ความผิดพลาด รอรอบนั้นจบแทน
        if (!(error instanceof ApiError && error.code === 409)) throw error
        setNotice({ kind: "info", title: tsync("alreadyRunning"), message: tsync("runningHint") })
      }
      const final = await waitUntilDone()
      if (!alive.current || !final) return
      if (final.state === "failed" || (final.result && final.result !== "success")) {
        setNotice({
          kind: "destructive",
          title: tsync("failed"),
          message: [final.result, final.finished_at].filter(Boolean).join(" · ") || undefined,
        })
        return
      }
      setNotice({ kind: "success", title: tsync("success"), message: final.finished_at ?? undefined })
      // โหลดตารางใหม่แบบเดียวกับหลังแก้ไขเสร็จ — ตัวกรอง/หน้าเดิม
      onSynced()
      setTimeout(() => {
        if (alive.current) setNotice((current) => (current?.kind === "success" ? null : current))
      }, SUCCESS_HIDE_MS)
    } catch (error) {
      // ห้าม console.error — ใน dev overlay จะขึ้นเต็มจอเหมือนหน้าพัง · ข้อความจาก API โชว์ตรง ๆ
      if (!alive.current) return
      setNotice({
        kind: "destructive",
        title: tsync("error"),
        message: error instanceof Error ? error.message : undefined,
      })
    } finally {
      if (alive.current) setRunning(false)
    }
  }

  return (
    <div className="flex w-full flex-col items-end gap-2">
      <Button
        variant="outline"
        onClick={sync}
        disabled={running}
        className="border-primary/30 text-primary hover:bg-primary/10 hover:text-primary gap-1.5"
      >
        {running ? <LoaderCircle className="animate-spin" /> : <RefreshCw />}
        {running ? tsync("buttonRunning") : tsync("button")}
      </Button>

      {notice ? (
        <Alert variant={notice.kind} aria-live="polite" className="mb-1">
          {notice.kind === "success" ? (
            <CircleCheck />
          ) : notice.kind === "destructive" ? (
            <TriangleAlert />
          ) : running ? (
            <LoaderCircle className="animate-spin" />
          ) : (
            <Info />
          )}
          <AlertContent>
            <AlertTitle>{notice.title}</AlertTitle>
            {notice.message ? <AlertDescription>{notice.message}</AlertDescription> : null}
          </AlertContent>
        </Alert>
      ) : null}
    </div>
  )
}
