"use client"

import { useEffect, useId, useRef, useState } from "react"
import { useLocale } from "next-intl"
import { loadPurchaseReturnSource } from "@/actions/purchaseOrderWorkflow/purchase-receiving.actions"
import { postPurchaseReturnFromReceiptAction } from "@/actions/purchasing/purchase-return-credit.actions"
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { purchaseReturnWorkbenchCommandSchema, type PurchaseReturnWorkbenchCommand, type PurchaseReturnWorkbenchSource } from "@/services/purchasing/purchase-return-workbench.contracts"

const copy = {
  en: {
    open: "Return to supplier", title: "Record a supplier return",
    description: "Return accepted stock from its original receipt and warehouse.",
    max: "Available to return", quantity: "Quantity to return", reason: "Reason for return",
    close: "Close", review: "Review return", submit: "Record return", recover: "Recover this return", edit: "Edit",
    empty: "There is no stock available to return from this receipt.", loading: "Checking the current receipt and stock…",
    invalid: "Enter a reason and at least one quantity within the available amount. Use up to three decimal places.",
    failed: "The return could not be recorded. Check the original receipt and current stock before trying again.",
    unknown: "The outcome has not been verified. Recover this return before starting another one.",
    pending: "A return request is retained for recovery.", success: "Supplier return recorded",
    password: "Current password", passwordFailed: "Password verification failed. Try again or sign in again.",
    storage: "Allow session storage before submitting so this return can be safely recovered.",
  },
  fr: {
    open: "Retour fournisseur", title: "Enregistrer un retour fournisseur",
    description: "Retournez le stock accepté depuis sa réception et son dépôt d’origine.",
    max: "Quantité disponible au retour", quantity: "Quantité à retourner", reason: "Motif du retour",
    close: "Fermer", review: "Vérifier le retour", submit: "Enregistrer le retour", recover: "Récupérer ce retour", edit: "Modifier",
    empty: "Aucun stock de cette réception n’est disponible au retour.", loading: "Vérification de la réception et du stock actuel…",
    invalid: "Précisez un motif et une quantité inférieure ou égale au stock disponible. Utilisez au plus trois décimales.",
    failed: "Le retour n’a pas été enregistré. Vérifiez la réception d’origine et le stock actuel avant de réessayer.",
    unknown: "Le résultat n’a pas été vérifié. Récupérez ce retour avant d’en commencer un autre.",
    pending: "Une demande de retour est conservée pour récupération.", success: "Retour fournisseur enregistré",
    password: "Mot de passe actuel", passwordFailed: "La vérification du mot de passe a échoué. Réessayez ou reconnectez-vous.",
    storage: "Autorisez le stockage de session avant l’envoi pour pouvoir récupérer ce retour.",
  },
} as const

const clearedCodes = new Set(["AUTH_REQUIRED", "UNAUTHENTICATED", "FORBIDDEN", "NOT_FOUND", "VALIDATION_ERROR", "BUSINESS_RULE_VIOLATION", "CONFLICT", "IDEMPOTENCY_CONFLICT", "RECEIPT_EVIDENCE_REQUIRED"])

export function PurchaseReturnDialog({ organizationId, actorId, orderId, receiptId, onChanged }: {
  organizationId: string; actorId: string; orderId: string; receiptId: string; onChanged: () => void
}) {
  const locale = useLocale(), t = copy[locale === "fr" ? "fr" : "en"], field = useId()
  const key = "stoquify:purchase-return:" + JSON.stringify([organizationId, actorId, orderId, receiptId])
  const inFlight = useRef(false), generation = useRef(0), trigger = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false)
  const [source, setSource] = useState<PurchaseReturnWorkbenchSource | null>(null)
  const [entries, setEntries] = useState<Record<string, string>>({}), [reason, setReason] = useState("")
  const [review, setReview] = useState<PurchaseReturnWorkbenchCommand | null>(null)
  const [pending, setPending] = useState<PurchaseReturnWorkbenchCommand | null>(null)
  const [resultNumber, setResultNumber] = useState(""), [error, setError] = useState("")
  const [needsPassword, setNeedsPassword] = useState(false), [password, setPassword] = useState("")

  useEffect(() => {
    generation.current++
    inFlight.current = false
    setOpen(false); setBusy(false); setSource(null); setEntries({}); setReason(""); setReview(null)
    setResultNumber(""); setError(""); setPassword(""); setNeedsPassword(false); setPending(null)
    try {
      const raw = sessionStorage.getItem(key)
      const parsed = raw && raw.length <= 30000 ? purchaseReturnWorkbenchCommandSchema.safeParse(JSON.parse(raw)) : null
      if (parsed?.success && parsed.data.purchaseOrderId === orderId && parsed.data.goodsReceiptId === receiptId) setPending(parsed.data)
    } catch { /* Submitting requires available storage before mutation. */ }
    return () => { generation.current++ }
  }, [key, orderId, receiptId])

  async function show() {
    if (inFlight.current) return
    setOpen(true); setResultNumber(""); setError("")
    if (pending) return
    setReview(null); setSource(null)
    const current = generation.current
    inFlight.current = true; setBusy(true)
    try {
      const result = await loadPurchaseReturnSource({ purchaseOrderId: orderId, goodsReceiptId: receiptId })
      if (current !== generation.current) return
      if (!result.success || result.data.organizationId !== organizationId || result.data.actorId !== actorId
        || result.data.purchaseOrderId !== orderId || result.data.goodsReceiptId !== receiptId) {
        setError(t.failed); return
      }
      setSource(result.data); setNeedsPassword(result.data.requiresFreshAuth)
    } catch { if (current === generation.current) setError(t.failed) }
    finally { if (current === generation.current) { inFlight.current = false; setBusy(false) } }
  }

  function reviewReturn() {
    if (!source) return
    const lines = source.lines.filter(line => entries[line.id] && Number(entries[line.id]) !== 0)
      .map(line => ({ sourceGoodsReceiptLineId: line.id, quantity: entries[line.id] }))
    const draft = purchaseReturnWorkbenchCommandSchema.safeParse({
      purchaseOrderId: orderId, goodsReceiptId: receiptId, expectedRevision: source.revision,
      idempotencyKey: crypto.randomUUID(), reason, lines,
    })
    if (!draft.success || lines.some(line => Number(line.quantity) > Number(source.lines.find(row => row.id === line.sourceGoodsReceiptLineId)?.available ?? 0))) {
      setError(t.invalid); return
    }
    setReview(draft.data); setError("")
  }

  function clearPending() {
    setPending(null)
    try { sessionStorage.removeItem(key) } catch { /* Exact replay remains safe if local cleanup fails. */ }
  }

  async function submit() {
    const command = pending ?? review
    if (!command || inFlight.current) return
    try { sessionStorage.setItem(key, JSON.stringify(command)); setPending(command) }
    catch { setError(t.storage); return }
    const current = generation.current
    inFlight.current = true; setBusy(true); setError("")
    try {
      if (needsPassword) {
        const assurance = await stepUpWithPasswordAction({ password })
        if (current !== generation.current) return
        setPassword("")
        if (!assurance.success) { setError(t.passwordFailed); return }
        setNeedsPassword(false)
      }
      const result = await postPurchaseReturnFromReceiptAction(command)
      if (current !== generation.current) return
      if (!result.success) {
        if (result.code === "FRESH_AUTH_REQUIRED") setNeedsPassword(true)
        else if (result.code && clearedCodes.has(result.code)) { clearPending(); setReview(null); setError(t.failed) }
        else setError(t.unknown)
        return
      }
      const record = result.data
      if (record.organizationId !== organizationId || record.actorId !== actorId || record.goodsReceiptId !== receiptId
        || record.purchaseOrderId !== orderId || record.requestReference !== command.idempotencyKey || !record.returnNumber) {
        setError(t.unknown); return
      }
      clearPending(); setReview(null); setSource(null); setEntries({}); setReason(""); setResultNumber(record.returnNumber)
      onChanged()
    } catch { if (current === generation.current) setError(t.unknown) }
    finally { if (current === generation.current) { inFlight.current = false; setBusy(false) } }
  }

  const reviewed = pending ?? review
  return <>
    <Button ref={trigger} size="sm" variant="outline" className="dashboard-button-secondary min-h-11" onClick={() => void show()}>{t.open}</Button>
    <Dialog open={open} onOpenChange={value => { if (!busy) { setOpen(value); if (!value) setPassword("") } }}>
      <DialogContent closeLabel={t.close} closeDisabled={busy} className="dashboard-landing-theme dark dashboard-glass-panel max-h-[90dvh] max-w-lg overflow-y-auto text-[var(--dash-text)]" onCloseAutoFocus={event => { event.preventDefault(); trigger.current?.focus() }}>
        <DialogHeader><DialogTitle>{t.title}</DialogTitle><DialogDescription>{t.description}</DialogDescription></DialogHeader>
        {busy && <p role="status">{t.loading}</p>}
        {error && <p role="alert">{error}</p>}
        {resultNumber && <p role="status">{t.success} · {resultNumber}</p>}
        {source && <p className="font-medium">{source.receiptNumber} · {source.location}</p>}
        {pending && <p className="break-all">{t.pending} · {pending.idempotencyKey}</p>}
        {reviewed && !pending && <>
          <ul>{reviewed.lines.map(line => <li key={line.sourceGoodsReceiptLineId}>{source?.lines.find(row => row.id === line.sourceGoodsReceiptLineId)?.[locale === "fr" ? "nameFr" : "nameEn"]} · {line.quantity}</li>)}</ul>
          <p className="whitespace-pre-wrap">{t.reason} · {reviewed.reason}</p>
        </>}
        {!reviewed && source && (source.lines.length ? <fieldset disabled={busy} className="space-y-3">
          {source.lines.map(line => <div key={line.id} className="space-y-2 rounded-lg border border-[var(--dash-border)] p-3">
            <p className="font-medium">{locale === "fr" ? line.nameFr : line.nameEn}</p>
            <p>{t.max} · {line.available}</p>
            <Label htmlFor={field + line.id}>{t.quantity}</Label>
            <Input id={field + line.id} value={entries[line.id] ?? ""} inputMode="decimal" maxLength={14} onChange={event => setEntries(previous => ({ ...previous, [line.id]: event.target.value.replace(",", ".") }))} />
          </div>)}
          <Label htmlFor={field + "-reason"}>{t.reason}</Label>
          <Textarea id={field + "-reason"} maxLength={500} value={reason} onChange={event => setReason(event.target.value)} />
        </fieldset> : <p>{t.empty}</p>)}
        {reviewed && needsPassword && <div className="space-y-2">
          <Label htmlFor={field + "-password"}>{t.password}</Label>
          <Input id={field + "-password"} type="password" autoComplete="current-password" disabled={busy} value={password} onChange={event => setPassword(event.target.value)} />
        </div>}
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" className="dashboard-button-secondary min-h-11" disabled={busy} onClick={() => { setOpen(false); setPassword("") }}>{t.close}</Button>
          {review && !pending && <Button variant="outline" className="dashboard-button-secondary min-h-11" disabled={busy} onClick={() => { setReview(null); setPassword("") }}>{t.edit}</Button>}
          {!reviewed && !!source?.lines.length && <Button className="dashboard-button-primary min-h-11" disabled={busy} onClick={reviewReturn}>{t.review}</Button>}
          {reviewed && <Button className="dashboard-button-primary min-h-11" disabled={busy || needsPassword && !password} onClick={() => void submit()}>{pending ? t.recover : t.submit}</Button>}
        </div>
      </DialogContent>
    </Dialog>
  </>
}
