"use client"

import type { FormEvent } from "react"
import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, CheckCircle2, KeyRound, Loader2, ShieldCheck } from "lucide-react"

import { signBranchDailyCloseAction } from "@/actions/end-of-day-close/branch-daily-close-sign-off.actions"
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"
import {
  dashboardMutedTextClass,
  dashboardPanelClass,
  dashboardToneClass,
} from "@/components/finance/finance-dashboard-theme"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

type Locale = "en" | "fr"

type SignNotice =
  | { kind: "signed" | "replayed"; message: string }
  | { kind: "access" | "error"; message: string; correlationId?: string }

type AuthNotice = {
  kind: "invalid" | "rate" | "fresh" | "error"
  message: string
}

type BranchDailyCloseSignOffCommandProps = {
  locale: Locale
  locationId: string
  locationName: string
  businessDate: string
}

const copy = {
  en: {
    title: "Sign daily close",
    detail: "Confirm this reviewed branch evidence with independent approval and fresh authentication.",
    action: "Sign daily close",
    pending: "Signing daily close",
    confirmed: "Daily close signed",
    context: "Sign-off scope",
    dialogTitle: "Confirm daily-close sign-off",
    dialogDetail: "Enter your password to verify this sensitive action. The reviewed evidence and your access are checked again by the server.",
    independent: "The reviewer cannot approve their own daily-close record.",
    password: "Password",
    passwordPlaceholder: "Enter your password",
    cancel: "Cancel",
    confirm: "Verify and sign",
    verifying: "Verifying and signing",
    required: "Enter your password to continue.",
    invalid: "Authentication could not be verified. Re-enter your password and try again.",
    rate: (seconds: number) => `Too many attempts. Try again in about ${seconds} seconds.`,
    auth: "Your session is no longer available. The workspace is refreshing.",
    fresh: "Fresh authentication expired before sign-off completed. Verify again to retry the same request safely.",
    stepUpError: "Authentication could not be verified safely. Try again.",
    signed: "Daily close signed. Refreshing completion evidence.",
    replayed: "The same sign-off request was already recorded. Refreshing completion evidence.",
    access: "Sign permission, session, or managed-location scope changed. The workspace is refreshing.",
    error: "The daily close could not be signed safely. Review the current evidence and approval policy before retrying.",
    reference: "Reference",
  },
  fr: {
    title: "Valider la cloture quotidienne",
    detail: "Confirmer les preuves revues du site avec une approbation independante et une authentification recente.",
    action: "Valider la cloture",
    pending: "Validation de la cloture",
    confirmed: "Cloture quotidienne validee",
    context: "Perimetre de validation",
    dialogTitle: "Confirmer la validation de cloture",
    dialogDetail: "Saisissez votre mot de passe pour verifier cette action sensible. Les preuves revues et vos acces sont controles a nouveau par le serveur.",
    independent: "La personne ayant effectue la revue ne peut pas valider son propre dossier.",
    password: "Mot de passe",
    passwordPlaceholder: "Saisissez votre mot de passe",
    cancel: "Annuler",
    confirm: "Verifier et valider",
    verifying: "Verification et validation",
    required: "Saisissez votre mot de passe pour continuer.",
    invalid: "L'authentification n'a pas pu etre verifiee. Saisissez a nouveau votre mot de passe.",
    rate: (seconds: number) => `Trop de tentatives. Reessayez dans environ ${seconds} secondes.`,
    auth: "Votre session n'est plus disponible. L'espace est actualise.",
    fresh: "L'authentification recente a expire avant la validation. Verifiez-la a nouveau pour reprendre la meme demande.",
    stepUpError: "L'authentification n'a pas pu etre verifiee en securite. Reessayez.",
    signed: "Cloture quotidienne validee. Actualisation des preuves de realisation.",
    replayed: "La meme demande de validation etait deja enregistree. Actualisation des preuves de realisation.",
    access: "La permission, la session ou le perimetre du site a change. L'espace est actualise.",
    error: "La cloture n'a pas pu etre validee en securite. Verifiez les preuves et la politique d'approbation avant de reessayer.",
    reference: "Reference",
  },
} as const

export function BranchDailyCloseSignOffCommand({
  locale,
  locationId,
  locationName,
  businessDate,
}: BranchDailyCloseSignOffCommandProps) {
  const router = useRouter()
  const t = copy[locale]
  const idempotencyKeyRef = useRef<string | null>(null)
  const inFlightRef = useRef(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [password, setPassword] = useState("")
  const [authNotice, setAuthNotice] = useState<AuthNotice | null>(null)
  const [notice, setNotice] = useState<SignNotice | null>(null)
  const [isPending, startTransition] = useTransition()
  const terminal = notice?.kind === "signed" || notice?.kind === "replayed"

  function changeDialogOpen(nextOpen: boolean) {
    if (inFlightRef.current) return
    setDialogOpen(nextOpen)
    setPassword("")
    setAuthNotice(null)
  }

  function submitSignOff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (inFlightRef.current || terminal) return

    if (!password) {
      setAuthNotice({ kind: "invalid", message: t.required })
      return
    }

    inFlightRef.current = true
    setAuthNotice(null)
    setNotice(null)
    const submittedPassword = password
    setPassword("")
    const idempotencyKey = idempotencyKeyRef.current ?? createSignOffIdempotencyKey()
    idempotencyKeyRef.current = idempotencyKey

    startTransition(async () => {
      try {
        const stepUpResponse = await stepUpWithPasswordAction({ password: submittedPassword })

        if (!stepUpResponse.success) {
          if (stepUpResponse.code === "AUTH_REQUIRED") {
            setDialogOpen(false)
            setNotice({ kind: "access", message: t.auth })
            router.refresh()
            return
          }

          if (stepUpResponse.code === "RATE_LIMITED") {
            setAuthNotice({
              kind: "rate",
              message: t.rate(Math.max(1, stepUpResponse.retryAfterSeconds ?? 1)),
            })
            return
          }

          setAuthNotice({
            kind: stepUpResponse.code === "INVALID_CREDENTIALS" || stepUpResponse.code === "VALIDATION_ERROR"
              ? "invalid"
              : "error",
            message: stepUpResponse.code === "INVALID_CREDENTIALS" || stepUpResponse.code === "VALIDATION_ERROR"
              ? t.invalid
              : t.stepUpError,
          })
          return
        }

        const signResponse = await signBranchDailyCloseAction({
          locationId,
          businessDate,
          idempotencyKey,
        })

        if (!signResponse.success) {
          if (signResponse.code === "FRESH_AUTH_REQUIRED") {
            setAuthNotice({ kind: "fresh", message: t.fresh })
            return
          }

          const accessChanged = signResponse.status === 401 || signResponse.status === 403
          setDialogOpen(false)
          setNotice({
            kind: accessChanged ? "access" : "error",
            message: accessChanged ? t.access : signResponse.error || t.error,
            correlationId: signResponse.correlationId,
          })
          router.refresh()
          return
        }

        setDialogOpen(false)
        setNotice({
          kind: signResponse.data.replayed ? "replayed" : "signed",
          message: signResponse.data.replayed ? t.replayed : t.signed,
        })
        router.refresh()
      } catch {
        setDialogOpen(false)
        setNotice({ kind: "error", message: t.error })
      } finally {
        inFlightRef.current = false
      }
    })
  }

  return (
    <>
      <section className={cn(dashboardPanelClass, "p-4 md:p-5")} aria-labelledby="daily-close-sign-command-heading">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 shrink-0 text-[var(--dash-brand)]" aria-hidden="true" />
              <h2 id="daily-close-sign-command-heading" className="text-base font-semibold text-[var(--dash-text)]">{t.title}</h2>
            </div>
            <p className={cn("mt-1 max-w-3xl text-sm leading-6", dashboardMutedTextClass)}>{t.detail}</p>
            <p className="mt-2 break-words text-xs text-[var(--dash-text-faint)]">
              <span className="font-semibold text-[var(--dash-text-soft)]">{t.context}: </span>
              {locationName} / {businessDate}
            </p>
          </div>
          <Button
            type="button"
            onClick={() => changeDialogOpen(true)}
            disabled={isPending || terminal}
            className="min-w-40 rounded-lg"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : terminal ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <KeyRound className="h-4 w-4" aria-hidden="true" />}
            {isPending ? t.pending : terminal ? t.confirmed : t.action}
          </Button>
        </div>

        {notice ? (
          <div
            className={cn(
              "mt-4 flex items-start gap-2 rounded-lg border p-3 text-sm",
              dashboardToneClass(notice.kind === "signed" || notice.kind === "replayed" ? "success" : "danger"),
            )}
            role={notice.kind === "signed" || notice.kind === "replayed" ? "status" : "alert"}
          >
            {notice.kind === "signed" || notice.kind === "replayed" ? (
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

      <Dialog open={dialogOpen} onOpenChange={changeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={submitSignOff}>
            <DialogHeader className="pr-8">
              <DialogTitle>{t.dialogTitle}</DialogTitle>
              <DialogDescription>{t.dialogDetail}</DialogDescription>
            </DialogHeader>

            <div className="mt-4 space-y-4">
              <div className={cn("rounded-lg border p-3 text-sm", dashboardToneClass("gold"))}>
                {t.independent}
              </div>
              <div className="space-y-2">
                <Label htmlFor="daily-close-sign-password">{t.password}</Label>
                <Input
                  id="daily-close-sign-password"
                  name="dailyCloseSignPassword"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={t.passwordPlaceholder}
                  disabled={isPending}
                  required
                  autoFocus
                />
              </div>
              {authNotice ? (
                <div className={cn("flex items-start gap-2 rounded-lg border p-3 text-sm", dashboardToneClass("danger"))} role="alert">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <p className="break-words">{authNotice.message}</p>
                </div>
              ) : null}
            </div>

            <DialogFooter className="mt-5 gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => changeDialogOpen(false)} disabled={isPending}>
                {t.cancel}
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ShieldCheck className="h-4 w-4" aria-hidden="true" />}
                {isPending ? t.verifying : t.confirm}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

function createSignOffIdempotencyKey() {
  const nonce = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `daily-close-sign-ui:${nonce}`
}
