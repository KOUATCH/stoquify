"use client"

import { useId, useRef, useState, type FormEvent } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { getPOSSaleReturnPreviewAction } from "@/actions/pos/returns.actions"
import { refundPOSSaleAction } from "@/actions/pos/tender.actions"
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { posOperationsKeys } from "@/hooks/posHooks/usePosOperations"
import type { POSSaleReturnPreview } from "@/services/pos/pos.service"
import { cn } from "@/lib/utils"

type POSReturnsProps = {
  locale: string
  organizationId: string
  actorId: string
  locationId: string
  terminalId: string
  sessionId: string
  disabled?: boolean
  className?: string
}

const labels = {
  en: {
    title: "Returns",
    scope: "Look up the original sale from this register and shift. This screen supports full cash refunds.",
    close: "Close returns",
    number: "Order number on the receipt",
    lookup: "Find sale",
    checking: "Checking sale…",
    missing: "No completed sale or return was found with that number on this register and shift.",
    unavailable: "Unable to check this sale. Check your access and that your shift is still open, then try again.",
    unsupported: "A full cash refund is unavailable for this sale. Ask a manager to review its payment and return history.",
    amount: "Cash refund",
    reason: "Return reason",
    confirm: "Confirm full cash refund",
    pending: "Recording refund…",
    confirmHint: "Confirm that every item below is being returned. Hand out cash only after the refund is confirmed.",
    confirmed: "Cash refund confirmed.",
    recorded: "A refund is already recorded. Check whether cash was already handed out.",
    uncertain: "The outcome is unconfirmed. Keep the order number and check the refund status before handing out cash.",
    notConfirmed: "The refund has not been confirmed. Ask a manager to check this sale before trying again.",
    recheck: "Check refund status",
    needsRefresh: "This refund could not be completed. Check the latest sale status before confirming again.",
    denied: "Your account cannot record this refund. Ask an authorized colleague to review it.",
    auth: "Verify your current password to continue.",
    password: "Current password",
    verify: "Verify password",
    verifying: "Verifying…",
    authFailed: "Password verification failed. Check your password and try again.",
    authLimited: "Too many verification attempts. Try again later.",
    authVerified: "Password verified. Review the refund and confirm it again.",
    offline: "Reconnect to the register before recording a refund.",
  },
  fr: {
    title: "Retours",
    scope: "Recherchez la vente d’origine de cette caisse et de cette session. Seuls les remboursements intégraux en espèces sont disponibles ici.",
    close: "Fermer les retours",
    number: "Numéro de commande sur le reçu",
    lookup: "Rechercher la vente",
    checking: "Vérification de la vente…",
    missing: "Aucune vente finalisée ni aucun retour ne porte ce numéro dans cette caisse et cette session.",
    unavailable: "Impossible de vérifier cette vente. Vérifiez vos droits et que votre session est toujours ouverte, puis réessayez.",
    unsupported: "Le remboursement intégral en espèces est indisponible pour cette vente. Demandez à un responsable de vérifier l’historique des paiements et des retours.",
    amount: "Remboursement en espèces",
    reason: "Motif du retour",
    confirm: "Confirmer le remboursement intégral",
    pending: "Enregistrement du remboursement…",
    confirmHint: "Vérifiez que tous les articles ci-dessous sont retournés. Remettez les espèces après confirmation du remboursement.",
    confirmed: "Remboursement en espèces confirmé.",
    recorded: "Un remboursement est déjà enregistré. Vérifiez si les espèces ont déjà été remises.",
    uncertain: "Le résultat est incertain. Conservez le numéro de commande et vérifiez le remboursement avant de remettre des espèces.",
    notConfirmed: "Le remboursement reste non confirmé. Demandez à un responsable de vérifier cette vente avant de réessayer.",
    recheck: "Vérifier le remboursement",
    needsRefresh: "Ce remboursement n’a pas abouti. Vérifiez l’état de la vente avant de confirmer de nouveau.",
    denied: "Votre compte ne peut pas enregistrer ce remboursement. Demandez à une personne autorisée de le vérifier.",
    auth: "Vérifiez votre mot de passe actuel pour continuer.",
    password: "Mot de passe actuel",
    verify: "Vérifier le mot de passe",
    verifying: "Vérification…",
    authFailed: "La vérification du mot de passe a échoué. Vérifiez votre mot de passe, puis réessayez.",
    authLimited: "Trop de tentatives de vérification. Réessayez plus tard.",
    authVerified: "Mot de passe vérifié. Revérifiez le remboursement et confirmez-le de nouveau.",
    offline: "Reconnectez cette caisse avant d’enregistrer un remboursement.",
  },
} as const

export function POSReturns({
  locale, organizationId, actorId, locationId, terminalId, sessionId, disabled, className,
}: POSReturnsProps) {
  const french = locale.startsWith("fr")
  const t = french ? labels.fr : labels.en
  const queryClient = useQueryClient()
  const id = useId()
  const orderInput = useRef<HTMLInputElement>(null)
  const passwordInput = useRef<HTMLInputElement>(null)
  const inFlight = useRef(false)
  const [open, setOpen] = useState(false)
  const [orderNumber, setOrderNumber] = useState("")
  const [sale, setSale] = useState<POSSaleReturnPreview | null>(null)
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState<"lookup" | "refund" | "auth" | null>(null)
  const [notice, setNotice] = useState("")
  const [error, setError] = useState("")
  const [correlationId, setCorrelationId] = useState<string>()
  const [phase, setPhase] = useState<"review" | "fresh-auth" | "needs-recheck" | "uncertain" | "confirmed">("review")
  const uncertain = phase === "uncertain"
  const needsRecheck = phase === "needs-recheck"
  const scope = { locationId, terminalId, sessionId }

  async function readSale(number: string) {
    const result = await getPOSSaleReturnPreviewAction({ ...scope, orderNumber: number })
    if (!result.success) {
      setCorrelationId(result.correlationId)
      throw new Error(t.unavailable)
    }
    if (result.data.scope.organizationId !== organizationId || result.data.scope.actorId !== actorId) {
      throw new Error(t.unavailable)
    }
    return result.data.data
  }

  async function lookup(recheck = false) {
    if (inFlight.current || disabled) return
    const number = (recheck ? sale?.orderNumber : orderNumber)?.trim()
    if (!number) return
    inFlight.current = true
    setBusy("lookup")
    setError("")
    setNotice("")
    setCorrelationId(undefined)
    if (!recheck) {
      setSale(null)
      setReason("")
      setPhase("review")
    }
    try {
      const preview = await readSale(number)
      if (uncertain && preview?.status !== "RECORDED") {
        setError(t.notConfirmed)
        return
      }
      setSale(preview)
      setPhase("review")
      if (!preview) setNotice(t.missing)
      if (preview?.status === "RECORDED") {
        void queryClient.invalidateQueries({ queryKey: posOperationsKeys.all })
      }
    } catch {
      setError(uncertain ? t.uncertain : t.unavailable)
    } finally {
      inFlight.current = false
      setBusy(null)
    }
  }

  async function confirmReturn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (inFlight.current || disabled || phase !== "review" ||
      sale?.status !== "ELIGIBLE" || reason.trim().length < 3) return
    if (!navigator.onLine) {
      setError(t.offline)
      return
    }
    inFlight.current = true
    setBusy("refund")
    setError("")
    setNotice("")
    setCorrelationId(undefined)
    try {
      const result = await refundPOSSaleAction({
        ...scope,
        salesOrderId: sale.saleId,
        reason: reason.trim(),
        reviewedTotal: sale.total,
      })
      if (result.success) {
        setPhase("confirmed")
        setSale({ ...sale, status: "RECORDED", total: { ...sale.total, amount: result.data.totalRefunded.toFixed(2) } })
        void queryClient.invalidateQueries({ queryKey: posOperationsKeys.all })
      } else {
        setCorrelationId(result.correlationId)
        if (result.code === "FRESH_AUTH_REQUIRED") {
          setPhase("fresh-auth")
        } else if (result.status >= 500) {
          setPhase("uncertain")
          setError(t.uncertain)
        } else {
          setPhase("needs-recheck")
          setError(result.code === "FORBIDDEN" || result.code === "AUTH_REQUIRED" ? t.denied : t.needsRefresh)
        }
      }
    } catch {
      setPhase("uncertain")
      setError(t.uncertain)
    } finally {
      inFlight.current = false
      setBusy(null)
    }
  }

  async function verifyPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const input = passwordInput.current
    if (inFlight.current || disabled || !input?.value || sale?.status !== "ELIGIBLE") return
    const password = input.value
    input.value = ""
    inFlight.current = true
    setBusy("auth")
    setError("")
    setCorrelationId(undefined)
    let verified = false
    try {
      const result = await stepUpWithPasswordAction({ password })
      if (!result.success) {
        setError(result.code === "RATE_LIMITED" ? t.authLimited : t.authFailed)
        return
      }
      verified = true
      setPhase("needs-recheck")
      const refreshed = await readSale(sale.orderNumber)
      setSale(refreshed)
      setPhase("review")
      if (!refreshed) setNotice(t.missing)
      else if (refreshed.status === "ELIGIBLE") setNotice(t.authVerified)
    } catch {
      setError(verified ? t.unavailable : t.authFailed)
    } finally {
      inFlight.current = false
      setBusy(null)
    }
  }

  function changeOpen(nextOpen: boolean) {
    if (inFlight.current) return
    if (!nextOpen && !uncertain) {
      setSale(null)
      setOrderNumber("")
      setReason("")
      setError("")
      setNotice("")
      setCorrelationId(undefined)
      setPhase("review")
    }
    setOpen(nextOpen)
  }

  const amount = sale && new Intl.NumberFormat(locale, { style: "currency", currency: sale.total.currency }).format(Number(sale.total.amount))

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" disabled={disabled} className={cn("dashboard-button-secondary min-h-11", className)}>{t.title}</Button>
      </DialogTrigger>
      <DialogContent
        data-testid="pos-returns"
        closeLabel={t.close}
        closeDisabled={Boolean(busy)}
        className="enterprise-floating-surface max-h-[85dvh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-lg text-[var(--dash-text)] motion-reduce:animate-none"
        onOpenAutoFocus={(event) => {
          if (!uncertain) {
            event.preventDefault()
            orderInput.current?.focus()
          }
        }}
        onEscapeKeyDown={(event) => { if (inFlight.current) event.preventDefault() }}
        onInteractOutside={(event) => { if (inFlight.current) event.preventDefault() }}
      >
        <DialogHeader>
          <DialogTitle>{t.title}</DialogTitle>
          <DialogDescription className="text-[var(--dash-text-soft)]">{t.scope}</DialogDescription>
        </DialogHeader>

        <form className="space-y-1" onSubmit={(event) => { event.preventDefault(); void lookup() }}>
          <label className="text-sm font-medium" htmlFor={`${id}-order`}>{t.number}</label>
          <div className="flex flex-wrap gap-2">
            <Input
              ref={orderInput}
              id={`${id}-order`}
              className="dashboard-control h-11 min-w-32 flex-1"
              maxLength={120}
              autoComplete="off"
              value={orderNumber}
              disabled={Boolean(busy) || uncertain}
              onChange={(event) => {
                setOrderNumber(event.target.value)
                setSale(null)
                setPhase("review")
                setNotice("")
                setError("")
                setCorrelationId(undefined)
              }}
            />
            <Button type="submit" variant="outline" className="dashboard-button-secondary min-h-11" disabled={Boolean(busy) || uncertain || disabled || !orderNumber.trim()}>
              {busy === "lookup" ? t.checking : t.lookup}
            </Button>
          </div>
        </form>

        {notice && <p role="status" className="text-sm text-[var(--dash-text-soft)]">{notice}</p>}
        {error && <p role="alert" className="rounded-md border border-[var(--dash-warning)]/30 p-3 text-sm">
          {error}
          {correlationId && <span className="mt-1 block break-all text-xs text-[var(--dash-text-soft)]">{correlationId}</span>}
        </p>}
        {(needsRecheck || uncertain) && sale && <Button type="button" variant="outline" className="dashboard-button-secondary min-h-11" disabled={Boolean(busy) || disabled} onClick={() => void lookup(true)}>{t.recheck}</Button>}

        {sale && (
          <section aria-label={sale.orderNumber} className="space-y-3 rounded-lg border border-[var(--dash-border-subtle)] p-3">
            <p className="break-words text-sm font-semibold">{sale.orderNumber}</p>
            {sale.status === "UNSUPPORTED" ? <p role="status" className="text-sm">{t.unsupported}</p> : (
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-sm">{t.amount}</span>
                <strong className="tabular-nums">{amount}</strong>
              </div>
            )}
            {sale.status === "RECORDED" && <p role="status" className="text-sm text-[var(--dash-success)]">{phase === "confirmed" ? t.confirmed : t.recorded}</p>}
            {sale.status === "ELIGIBLE" && !uncertain && !needsRecheck && (
              <>
                <p className="text-sm text-[var(--dash-text-soft)]">{t.confirmHint}</p>
                <ul className="divide-y divide-[var(--dash-border-subtle)] text-sm">
                  {sale.lines.map((line) => (
                    <li key={line.id} className="flex justify-between gap-3 py-1.5">
                      <span className="min-w-0 break-words">{(french && line.nameFr) || line.nameEn} <span className="text-xs text-[var(--dash-text-soft)]">{line.sku}</span></span>
                      <span className="shrink-0 tabular-nums">× {new Intl.NumberFormat(locale, { maximumFractionDigits: 3 }).format(Number(line.quantity))}</span>
                    </li>
                  ))}
                </ul>
                {phase === "fresh-auth" ? (
                  <form onSubmit={(event) => void verifyPassword(event)} className="space-y-2">
                    <p role="status" className="text-sm">{t.auth}</p>
                    <label className="text-sm font-medium" htmlFor={`${id}-password`}>{t.password}</label>
                    <Input ref={passwordInput} id={`${id}-password`} type="password" autoComplete="current-password" maxLength={1024} required className="dashboard-control h-11" disabled={Boolean(busy)} />
                    <Button type="submit" variant="outline" className="dashboard-button-secondary min-h-11" disabled={Boolean(busy) || disabled}>{busy === "auth" ? t.verifying : t.verify}</Button>
                  </form>
                ) : (
                  <form onSubmit={(event) => void confirmReturn(event)} className="space-y-2">
                    <label className="text-sm font-medium" htmlFor={`${id}-reason`}>{t.reason}</label>
                    <Textarea id={`${id}-reason`} value={reason} onChange={(event) => setReason(event.target.value)} required minLength={3} maxLength={500} rows={2} disabled={Boolean(busy)} className="dashboard-control" />
                    <Button type="submit" className="dashboard-button-primary min-h-11 whitespace-normal" disabled={Boolean(busy) || disabled || reason.trim().length < 3}>
                      {busy === "refund" ? t.pending : t.confirm}
                    </Button>
                  </form>
                )}
              </>
            )}
          </section>
        )}
      </DialogContent>
    </Dialog>
  )
}
