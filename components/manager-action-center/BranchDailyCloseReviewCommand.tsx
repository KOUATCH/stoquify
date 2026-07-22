"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, CheckCircle2, Loader2, PlayCircle, ShieldCheck } from "lucide-react"

import { startBranchDailyCloseReviewAction } from "@/actions/end-of-day-close/branch-daily-close-review.actions"
import {
  dashboardMutedTextClass,
  dashboardPanelClass,
  dashboardToneClass,
} from "@/components/finance/finance-dashboard-theme"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Locale = "en" | "fr"

type ReviewNotice =
  | { kind: "created" | "replayed"; message: string }
  | { kind: "access" | "error"; message: string; correlationId?: string }

type BranchDailyCloseReviewCommandProps = {
  locale: Locale
  locationId: string
  locationName: string
  businessDate: string
}

const copy = {
  en: {
    title: "Start daily-close review",
    detail: "Capture the current branch readiness evidence as the durable review record.",
    action: "Start review",
    pending: "Starting review",
    confirmed: "Review started",
    created: "Review started. Refreshing completion evidence.",
    replayed: "The same review request was already recorded. Refreshing completion evidence.",
    access: "Review permission or managed-location scope changed. The workspace is refreshing.",
    error: "The review could not be started safely. Verify the current evidence and retry.",
    reference: "Reference",
    context: "Review scope",
  },
  fr: {
    title: "Demarrer la revue de cloture",
    detail: "Capturer les preuves actuelles de preparation du site dans le dossier durable de revue.",
    action: "Demarrer la revue",
    pending: "Demarrage de la revue",
    confirmed: "Revue demarree",
    created: "Revue demarree. Actualisation des preuves de realisation.",
    replayed: "La meme demande de revue etait deja enregistree. Actualisation des preuves de realisation.",
    access: "La permission de revue ou le perimetre du site a change. L'espace est actualise.",
    error: "La revue n'a pas pu demarrer en securite. Verifiez les preuves actuelles et reessayez.",
    reference: "Reference",
    context: "Perimetre de revue",
  },
} as const

export function BranchDailyCloseReviewCommand({
  locale,
  locationId,
  locationName,
  businessDate,
}: BranchDailyCloseReviewCommandProps) {
  const router = useRouter()
  const t = copy[locale]
  const idempotencyKeyRef = useRef<string | null>(null)
  const inFlightRef = useRef(false)
  const [notice, setNotice] = useState<ReviewNotice | null>(null)
  const [isPending, startTransition] = useTransition()
  const terminal = notice?.kind === "created" || notice?.kind === "replayed"

  function startReview() {
    if (inFlightRef.current || terminal) return

    inFlightRef.current = true
    setNotice(null)
    const idempotencyKey = idempotencyKeyRef.current ?? createReviewIdempotencyKey()
    idempotencyKeyRef.current = idempotencyKey

    startTransition(async () => {
      try {
        const response = await startBranchDailyCloseReviewAction({
          locationId,
          businessDate,
          idempotencyKey,
        })

        if (!response.success) {
          const accessChanged = response.status === 401 || response.status === 403
          setNotice({
            kind: accessChanged ? "access" : "error",
            message: accessChanged ? t.access : response.error || t.error,
            correlationId: response.correlationId,
          })
          if (accessChanged) router.refresh()
          return
        }

        setNotice({
          kind: response.data.replayed ? "replayed" : "created",
          message: response.data.replayed ? t.replayed : t.created,
        })
        router.refresh()
      } catch {
        setNotice({ kind: "error", message: t.error })
      } finally {
        inFlightRef.current = false
      }
    })
  }

  return (
    <section className={cn(dashboardPanelClass, "p-4 md:p-5")} aria-labelledby="daily-close-review-command-heading">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 shrink-0 text-[var(--dash-brand)]" aria-hidden="true" />
            <h2 id="daily-close-review-command-heading" className="text-base font-semibold text-[var(--dash-text)]">{t.title}</h2>
          </div>
          <p className={cn("mt-1 max-w-3xl text-sm leading-6", dashboardMutedTextClass)}>{t.detail}</p>
          <p className="mt-2 break-words text-xs text-[var(--dash-text-faint)]">
            <span className="font-semibold text-[var(--dash-text-soft)]">{t.context}: </span>
            {locationName} / {businessDate}
          </p>
        </div>
        <Button
          type="button"
          onClick={startReview}
          disabled={isPending || terminal}
          className="min-w-36 rounded-lg"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : terminal ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <PlayCircle className="h-4 w-4" aria-hidden="true" />}
          {isPending ? t.pending : terminal ? t.confirmed : t.action}
        </Button>
      </div>

      {notice ? (
        <div
          className={cn(
            "mt-4 flex items-start gap-2 rounded-lg border p-3 text-sm",
            dashboardToneClass(notice.kind === "created" || notice.kind === "replayed" ? "success" : "danger"),
          )}
          role={notice.kind === "created" || notice.kind === "replayed" ? "status" : "alert"}
        >
          {notice.kind === "created" || notice.kind === "replayed" ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          ) : (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          )}
          <div className="min-w-0">
            <p className="break-words">{notice.message}</p>
            {"correlationId" in notice && notice.correlationId ? (
              <p className="mt-1 break-all text-xs opacity-80">{t.reference}: {notice.correlationId}</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  )
}

function createReviewIdempotencyKey() {
  const nonce = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `daily-close-review-ui:${nonce}`
}
