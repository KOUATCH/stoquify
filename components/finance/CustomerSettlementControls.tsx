"use client"

import { useEffect, useId, useRef, useState, type FormEvent } from "react"
import {
  collectCustomerSettlementAction,
  getCustomerSettlementWorkbenchAction,
  reverseCustomerSettlementAction,
} from "@/actions/finance/customer-settlement.actions"
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { CustomerSettlementWorkbench } from "@/services/accounting/customer-settlement-workbench.service"
import type { CollectCustomerSettlementInput, ReverseCustomerSettlementInput } from "@/services/accounting/customer-settlement.schemas"

const copy = {
  en: {
    title: "Customer payments", loading: "Checking current payment controls…", unavailable: "Current payments could not be loaded. Refresh before continuing.",
    retryRead: "Refresh payments", noAccess: "Payment controls are unavailable in this workspace.", collect: "Record customer payment", amount: "Amount", method: "Payment method",
    date: "Payment date", reference: "Payment / evidence reference", notes: "Notes (optional)", evidence: "Supporting evidence file", evidenceHelp: "Only the file fingerprint is saved. Keep the original file outside Stoquify with the payment reference. Maximum 10 MB.",
    cash: "Cash", card: "Card", mobile: "Mobile money", bank: "Bank transfer", cheque: "Cheque", submit: "Confirm payment", retry: "Retry the same payment", pending: "Saving…",
    cancel: "Cancel", noPayments: "No later customer payments have been recorded for this invoice.", reverse: "Review reversal", reverseTitle: "Reverse customer payment", reason: "Reason for reversal", reverseDate: "Reversal date",
    independent: "Reversal requires another authorized person and reverses the entire payment, including allocations to other invoices. The original payment remains in history.", confirm: "I confirm this payment should be reversed and its allocated debt restored.", reverseSubmit: "Confirm reversal", reverseRetry: "Retry the same reversal",
    posted: "Posted", reversed: "Reversed", allocated: "Allocated to this invoice", current: "Current amount due", limited: "This invoice is read-only for your current permissions or state.",
    actionFailed: "The payment could not be confirmed. Review current payments, then retry the same request. Its reference prevents duplicate collection.", denied: "This action is not available with your current permissions, workspace or payment state. Refresh payments before continuing.",
    collected: "Customer payment recorded. The invoice and accounting entries have been updated.", reversedDone: "Customer payment reversed. The allocated debt has been restored.",
    identity: "Confirm your identity", identityHelp: "Enter your current password, then retry the payment action. Identity verification does not execute it.", password: "Current password", verify: "Verify identity", verified: "Identity verified. Retry the payment action to continue.", identityFailed: "Identity could not be verified. Check your password and try again.",
    fileFailed: "Choose a readable, non-empty supporting file of at most 10 MB.", validation: "The request was declined. Check the amount, date, reference and accounting setup before trying again.", amountInvalid: "Enter a positive amount with at most two decimal places.", fixed: "These details are held for an exact retry. Refresh payments to review the current result before retrying.",
    providerReceipt: "Confirmed provider receipt (optional)", selectedReceipt: "Selected confirmation", manualReceipt: "Record manually with supporting evidence", manualHelp: "Manual recording does not link a provider confirmation.", receiptHelp: "Choose a matching confirmation to link it to this payment. It is checked again when you save and is not reserved by this selection.", noReceipts: "No matching unclaimed confirmation is available in this preview.", previousReceipt: "Previously selected confirmation",
  },
  fr: {
    title: "Paiements clients", loading: "Vérification des contrôles de paiement actuels…", unavailable: "Impossible de charger les paiements actuels. Actualisez avant de continuer.",
    retryRead: "Actualiser les paiements", noAccess: "Les contrôles de paiement sont indisponibles dans cet espace.", collect: "Enregistrer un paiement client", amount: "Montant", method: "Mode de paiement",
    date: "Date du paiement", reference: "Référence du paiement / justificatif", notes: "Notes (facultatif)", evidence: "Fichier justificatif", evidenceHelp: "Seule l’empreinte du fichier est conservée. Gardez l’original hors de Stoquify avec la référence du paiement. Maximum 10 Mo.",
    cash: "Espèces", card: "Carte", mobile: "Mobile money", bank: "Virement bancaire", cheque: "Chèque", submit: "Confirmer le paiement", retry: "Réessayer le même paiement", pending: "Enregistrement…",
    cancel: "Annuler", noPayments: "Aucun paiement client ultérieur n’a été enregistré pour cette facture.", reverse: "Examiner l’annulation", reverseTitle: "Annuler un paiement client", reason: "Motif de l’annulation", reverseDate: "Date de l’annulation",
    independent: "L’annulation exige une autre personne autorisée et porte sur tout le paiement, y compris ses affectations à d’autres factures. Le paiement d’origine reste dans l’historique.", confirm: "Je confirme l’annulation de ce paiement et le rétablissement de la créance affectée.", reverseSubmit: "Confirmer l’annulation", reverseRetry: "Réessayer la même annulation",
    posted: "Comptabilisé", reversed: "Annulé", allocated: "Affecté à cette facture", current: "Montant dû actuel", limited: "Cette facture est en lecture seule selon vos droits ou son état actuel.",
    actionFailed: "Le paiement n’a pas pu être confirmé. Consultez les paiements actuels, puis réessayez la même demande. Sa référence empêche un double encaissement.", denied: "Cette action est indisponible selon vos droits, l’espace actuel ou l’état du paiement. Actualisez les paiements avant de continuer.",
    collected: "Paiement client enregistré. La facture et les écritures comptables sont actualisées.", reversedDone: "Paiement client annulé. La créance affectée est rétablie.",
    identity: "Confirmez votre identité", identityHelp: "Saisissez votre mot de passe actuel, puis réessayez l’action de paiement. La vérification d’identité ne l’exécute pas.", password: "Mot de passe actuel", verify: "Vérifier l’identité", verified: "Identité vérifiée. Réessayez l’action de paiement pour continuer.", identityFailed: "Impossible de vérifier votre identité. Vérifiez votre mot de passe et réessayez.",
    fileFailed: "Choisissez un justificatif lisible, non vide, de 10 Mo maximum.", validation: "La demande a été refusée. Vérifiez le montant, la date, la référence et la configuration comptable avant de réessayer.", amountInvalid: "Saisissez un montant positif avec deux décimales au maximum.", fixed: "Ces données sont conservées pour réessayer à l’identique. Actualisez les paiements pour consulter le résultat actuel avant de réessayer.",
    providerReceipt: "Confirmation du prestataire (facultatif)", selectedReceipt: "Confirmation sélectionnée", manualReceipt: "Enregistrer manuellement avec un justificatif", manualHelp: "La saisie manuelle ne lie aucune confirmation du prestataire.", receiptHelp: "Choisissez une confirmation correspondante pour la lier à ce paiement. Elle sera revérifiée à l’enregistrement ; cette sélection ne la réserve pas.", noReceipts: "Aucune confirmation correspondante non utilisée n’est disponible dans cet aperçu.", previousReceipt: "Confirmation sélectionnée précédemment",
  },
}

type Props = {
  customerId: string
  referenceId: string
  locale: string
  onChanged: () => unknown
  scope: { userId: string; organizationId: string; permissions: readonly string[] } | null
}
type Pending = { kind: "collect"; input: CollectCustomerSettlementInput } | { kind: "reverse"; input: ReverseCustomerSettlementInput }
type ProviderReceipt = CustomerSettlementWorkbench["providerReceipts"][number]
const secondaryButtonClass = "h-auto min-h-11 whitespace-normal border-[var(--dash-border)] bg-[var(--dash-surface)] text-[var(--dash-text)] hover:bg-[var(--dash-surface-raised)]"
const reversalButtonClass = "border border-[var(--dash-danger)] bg-[var(--dash-danger-soft)] text-[var(--dash-text)] hover:bg-[var(--dash-surface-raised)]"

export function CustomerSettlementControls(props: Props) {
  const t = copy[props.locale === "fr" ? "fr" : "en"]
  const authority = props.scope
  if (!authority) return <p role="status">{t.noAccess}</p>
  const scope = JSON.stringify([authority.userId, authority.organizationId, props.customerId, props.referenceId, [...authority.permissions].sort()])
  // Remounting clears passwords, selected files, commands and results when scope changes.
  // The parent owns permission freshness. A second observer here would refetch
  // permissions on mount, hide the parent's rows, and remount this drawer forever.
  return <SettlementWorkspace key={scope} {...props} userId={authority.userId} organizationId={authority.organizationId} />
}

function SettlementWorkspace({ customerId, referenceId, locale, onChanged, userId, organizationId }: Props & { userId: string; organizationId: string }) {
  const t = copy[locale === "fr" ? "fr" : "en"]
  const id = useId()
  const [data, setData] = useState<CustomerSettlementWorkbench | null>(null)
  const [loading, setLoading] = useState(true)
  const [readFailed, setReadFailed] = useState(false)
  const [form, setForm] = useState<"collect" | string | null>(null)
  const [amount, setAmount] = useState("")
  const [method, setMethod] = useState<CollectCustomerSettlementInput["method"]>("BANK_TRANSFER")
  const [date, setDate] = useState(today())
  const [reference, setReference] = useState("")
  const [providerReceipt, setProviderReceipt] = useState<ProviderReceipt | null>(null)
  const [notes, setNotes] = useState("")
  const [reason, setReason] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [fileKey, setFileKey] = useState(0)
  const [confirmed, setConfirmed] = useState(false)
  const [pending, setPending] = useState<Pending | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [needsAuth, setNeedsAuth] = useState(false)
  const [password, setPassword] = useState("")
  const [authBusy, setAuthBusy] = useState(false)
  const active = useRef(true)
  const request = useRef(0)
  const busyRef = useRef(false)
  const uncertain = useRef(false)
  const passwordRef = useRef<HTMLInputElement>(null)
  const actionRef = useRef<HTMLButtonElement>(null)
  const returnActionFocus = useRef(false)
  const errorRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => { active.current = true; void load(); return () => { active.current = false; request.current++ } }, [])
  useEffect(() => { if (needsAuth) passwordRef.current?.focus() }, [needsAuth])
  useEffect(() => { if (!needsAuth && !authBusy && returnActionFocus.current) { returnActionFocus.current = false; actionRef.current?.focus() } }, [needsAuth, authBusy])
  useEffect(() => { if (error) errorRef.current?.focus() }, [error])

  async function load() {
    const current = ++request.current
    setLoading(true)
    setReadFailed(false)
    setData(null)
    if (!pending) setProviderReceipt(null)
    try {
      const result = await getCustomerSettlementWorkbenchAction({ customerId, referenceId })
      if (!active.current || current !== request.current) return
      if (!result.success || result.data.scope.organizationId !== organizationId || result.data.scope.actorUserId !== userId || result.data.document.customerId !== customerId || result.data.document.referenceId !== referenceId) {
        setReadFailed(true)
        return
      }
      if (!result.data.canCollect && form === "collect") clearPrivateForm()
      setData(result.data)
    } catch { if (active.current && current === request.current) setReadFailed(true) }
    finally { if (active.current && current === request.current) setLoading(false) }
  }

  function openForm(value: string) {
    setForm(value); setAmount(data?.document.openAmount ?? ""); setDate(today()); setFile(null); setFileKey(key => key + 1)
    setReason(""); setNotes(""); setReference(""); setProviderReceipt(null); setConfirmed(false); setError(null); setMessage(null)
    uncertain.current = false
  }

  function clearPrivateForm() {
    setForm(null); setPending(null); setProviderReceipt(null); setAmount(""); setReference(""); setNotes(""); setReason("")
    setFile(null); setFileKey(key => key + 1); setNeedsAuth(false); setPassword(""); setMessage(null); setError(null)
  }

  function selectProviderReceipt(value: string) {
    const selected = data?.providerReceipts?.find(receipt => receipt.id === value && receipt.method === method) ?? null
    setProviderReceipt(selected)
    if (selected) { setAmount(selected.amount); setReference(selected.providerReference); setDate(selected.occurredAt.slice(0, 10)) }
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busyRef.current || !data || !form) return
    busyRef.current = true
    setBusy(true); setError(null); setMessage(null)
    try {
      let command = pending
      if (!command) {
        if (form === "collect" && (!/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,2})?$/.test(amount.trim()) || !/[1-9]/.test(amount))) { setError(t.amountInvalid); return }
        if (!file || file.size === 0 || file.size > 10 * 1024 * 1024) { setError(t.fileFailed); return }
        const documentHash = await digest(await file.arrayBuffer())
        if (!active.current) return
        const identity = { idempotencyKey: `ar-${crypto.randomUUID()}`, correlationId: `ar-${crypto.randomUUID()}` }
        if (form === "collect") {
          const allocation = { ...(data.document.salesOrderId ? { salesOrderId: data.document.salesOrderId } : { customerReceivableDocumentId: data.document.referenceId }), amount: amount.trim() }
          const intent = { customerId, method, amount: amount.trim(), settlementDate: `${date}T00:00:00.000Z`, externalReference: reference.trim(), ...(providerReceipt ? { paymentTransactionId: providerReceipt.id } : {}), ...(notes.trim() ? { notes: notes.trim() } : {}), allocations: [allocation], documentHash }
          command = { kind: "collect", input: { ...intent, ...identity, evidenceHash: await digest(new TextEncoder().encode(JSON.stringify(intent))) } }
        } else {
          const intent = { customerSettlementId: form, reversalDate: `${date}T00:00:00.000Z`, reason: reason.trim(), documentHash }
          command = { kind: "reverse", input: { ...intent, ...identity, evidenceHash: await digest(new TextEncoder().encode(JSON.stringify(intent))) } }
        }
        if (!active.current) return
        setPending(command)
      }
      const result = command.kind === "collect" ? await collectCustomerSettlementAction(command.input) : await reverseCustomerSettlementAction(command.input)
      if (!active.current) return
      if (!result.success) {
        if (result.code === "FRESH_AUTH_REQUIRED") { setPassword(""); setNeedsAuth(true) }
        else if (result.code === "FORBIDDEN" || result.code === "AUTH_REQUIRED" || result.code === "TENANT_SCOPE_VIOLATION") { clearPrivateForm(); setData(null); setReadFailed(true); setError(t.denied) }
        else if (!uncertain.current && (result.code === "VALIDATION_ERROR" || result.code === "BUSINESS_RULE_VIOLATION")) { setPending(null); setError(t.validation) }
        else setError(result.code === "SOD_VIOLATION" ? t.denied : t.actionFailed)
        if (result.code === "INTERNAL_ERROR") uncertain.current = true
        return
      }
      setMessage(command.kind === "collect" ? t.collected : t.reversedDone)
      setPending(null); setForm(null); setProviderReceipt(null); setFile(null); setFileKey(key => key + 1); setNeedsAuth(false); setPassword("")
      await load()
      if (active.current) onChanged()
    } catch { uncertain.current = true; if (active.current) setError(t.actionFailed) }
    finally { busyRef.current = false; if (active.current) setBusy(false) }
  }

  async function confirmIdentity(event: FormEvent) {
    event.preventDefault()
    if (authBusy || !password) return
    const enteredPassword = password
    setPassword(""); setAuthBusy(true); setError(null)
    try {
      const result = await stepUpWithPasswordAction({ password: enteredPassword })
      if (!active.current) return
      if (result.success) { returnActionFocus.current = true; setNeedsAuth(false); setMessage(t.verified) }
      else setError(t.identityFailed)
    } catch { if (active.current) setError(t.identityFailed) }
    finally { if (active.current) setAuthBusy(false) }
  }

  const collecting = form === "collect"
  const electronic = method === "CARD" || method === "MOBILE_MONEY" || method === "BANK_TRANSFER"
  const providerReceipts = data?.providerReceipts?.filter(receipt => receipt.method === method) ?? []
  const retainedSelection = providerReceipt && pending?.kind === "collect" && !providerReceipts.some(receipt => receipt.id === providerReceipt.id) ? providerReceipt : null
  return <section aria-labelledby={`${id}-title`} className="space-y-4 rounded-lg border border-[var(--dash-border)] p-4">
    <h3 id={`${id}-title`} className="font-semibold">{t.title}</h3>
    {message && <p role="status" className="text-sm">{message}</p>}
    {error && <p role="alert" tabIndex={-1} ref={errorRef} className="text-sm text-[var(--dash-danger)]">{error}</p>}
    {loading && <p role="status" className="text-sm">{t.loading}</p>}
    {readFailed && <p role="alert" className="text-sm">{t.unavailable}</p>}
    <Button variant="outline" type="button" disabled={loading || busy || authBusy} onClick={() => void load()} className={secondaryButtonClass}>{t.retryRead}</Button>
    {data && <>
      <p className="text-sm tabular-nums">{t.current}: {formatMoney(data.document.openAmount, locale, data.document.currency)}</p>
      {!data.canCollect && <p className="text-sm text-[var(--dash-text-soft)]">{t.limited}</p>}
      {data.canCollect && !form && <Button type="button" onClick={() => openForm("collect")} className="h-auto min-h-11 whitespace-normal">{t.collect}</Button>}
      <p className="text-sm text-[var(--dash-text-soft)]">{t.independent}</p>
      {data.settlements.length === 0 ? <p className="text-sm">{t.noPayments}</p> : <ul className="space-y-3">
        {data.settlements.map(payment => <li key={payment.id} className="space-y-1 rounded-lg border border-[var(--dash-border)] p-3 text-sm">
          <p className="break-words font-medium">{payment.settlementNumber} · {payment.status === "REVERSED" ? t.reversed : t.posted}</p>
          <p className="tabular-nums">{formatMoney(payment.amount, locale, payment.currency)} · {new Intl.DateTimeFormat(locale).format(new Date(payment.settlementDate))}</p>
          <p>{t.allocated}: {formatMoney(payment.allocatedAmount, locale, payment.currency)}</p>
          {payment.externalReference && <p className="break-words">{payment.externalReference}</p>}
          {payment.canReverse && !form && <Button type="button" variant="outline" className={secondaryButtonClass} onClick={() => openForm(payment.id)}>{t.reverse}</Button>}
        </li>)}
      </ul>}
      {form && (pending || (collecting ? data.canCollect : data.settlements.some(payment => payment.id === form && payment.canReverse))) && <form onSubmit={submit} className="space-y-3" aria-label={collecting ? t.collect : t.reverseTitle}>
        <h4 className="font-medium">{collecting ? t.collect : t.reverseTitle}</h4>
        {pending && <p className="text-sm">{t.fixed}</p>}
        <fieldset disabled={busy || Boolean(pending) || needsAuth || authBusy} className="min-w-0 space-y-3">
          {collecting && <>
            <label className="block space-y-1 text-sm" htmlFor={`${id}-amount`}><span>{t.amount} ({data.document.currency})</span><Input id={`${id}-amount`} required inputMode="decimal" pattern="(?:0|[1-9][0-9]*)(?:\.[0-9]{1,2})?" maxLength={32} value={amount} onChange={event => { setAmount(event.target.value); setProviderReceipt(null) }} className="min-h-11" /></label>
            <div className="space-y-1 text-sm"><label className="block" htmlFor={`${id}-method`}>{t.method}</label><select id={`${id}-method`} className="dashboard-control min-h-11 w-full rounded-md border px-3" value={method} onChange={event => { setMethod(event.target.value as CollectCustomerSettlementInput["method"]); setProviderReceipt(null) }}>
              {([['CASH', t.cash], ['CARD', t.card], ['MOBILE_MONEY', t.mobile], ['BANK_TRANSFER', t.bank], ['CHEQUE', t.cheque]] as const).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select></div>
            {electronic && <div className="space-y-1 text-sm">
              <label className="block" htmlFor={`${id}-provider-receipt`}>{t.providerReceipt}</label>
              <select id={`${id}-provider-receipt`} value={providerReceipt?.id ?? ""} onChange={event => selectProviderReceipt(event.target.value)} aria-describedby={`${id}-provider-help`} className="dashboard-control min-h-11 w-full min-w-0 max-w-full rounded-md border px-3">
                <option value="">{t.manualReceipt}</option>
                {retainedSelection && <option value={retainedSelection.id}>{t.previousReceipt}: {retainedSelection.providerReference} · {retainedSelection.accountLabel} · {formatMoney(retainedSelection.amount, locale, retainedSelection.currency)}</option>}
                {providerReceipts.map(receipt => <option key={receipt.id} value={receipt.id}>{receipt.providerReference} · {receipt.accountLabel} · {formatMoney(receipt.amount, locale, receipt.currency)}</option>)}
              </select>
              <div aria-live="polite" aria-atomic="true">
                {providerReceipt && <p className="break-words text-[var(--dash-text)]"><span className="font-medium">{t.selectedReceipt}:</span> {providerReceipt.accountLabel} · {providerReceipt.providerReference} · {formatMoney(providerReceipt.amount, locale, providerReceipt.currency)}</p>}
              </div>
              <p id={`${id}-provider-help`} className="text-[var(--dash-text-soft)]">{providerReceipt ? t.receiptHelp : t.manualHelp}</p>
              {providerReceipts.length === 0 && !providerReceipt && <p className="text-[var(--dash-text-soft)]">{t.noReceipts}</p>}
            </div>}
            <label className="block space-y-1 text-sm" htmlFor={`${id}-reference`}><span>{t.reference}</span><Input id={`${id}-reference`} required maxLength={160} value={reference} onChange={event => { setReference(event.target.value); setProviderReceipt(null) }} className="min-h-11" /></label>
          </>}
          <label className="block space-y-1 text-sm" htmlFor={`${id}-date`}><span>{collecting ? t.date : t.reverseDate}</span><Input id={`${id}-date`} type="date" required value={date} onChange={event => { setDate(event.target.value); setProviderReceipt(null) }} className="min-h-11" /></label>
          {collecting ? <label className="block space-y-1 text-sm" htmlFor={`${id}-notes`}><span>{t.notes}</span><Input id={`${id}-notes`} maxLength={1000} value={notes} onChange={event => setNotes(event.target.value)} className="min-h-11" /></label> : <label className="block space-y-1 text-sm" htmlFor={`${id}-reason`}><span>{t.reason}</span><Input id={`${id}-reason`} required minLength={3} maxLength={500} value={reason} onChange={event => setReason(event.target.value)} className="min-h-11" /></label>}
          <label className="block space-y-1 text-sm" htmlFor={`${id}-file`}><span>{t.evidence}</span><Input key={fileKey} id={`${id}-file`} type="file" required aria-describedby={`${id}-file-help`} onChange={event => setFile(event.target.files?.[0] ?? null)} className="h-auto min-h-11 py-2 file:mr-3 file:rounded file:bg-[var(--dash-surface-raised)] file:px-2 file:py-1 file:text-[var(--dash-text)]" /></label>
          <p id={`${id}-file-help`} className="text-sm text-[var(--dash-text-soft)]">{t.evidenceHelp}</p>
          {!collecting && <label className="flex items-start gap-3 text-sm"><input type="checkbox" required checked={confirmed} onChange={event => setConfirmed(event.target.checked)} className="mt-1 h-5 w-5 shrink-0" /><span>{t.confirm}</span></label>}
        </fieldset>
        <div className="flex flex-wrap gap-2">
          <Button ref={actionRef} type="submit" variant={collecting ? "default" : "destructive"} disabled={busy || needsAuth || authBusy} className={`h-auto min-h-11 whitespace-normal ${collecting ? "" : reversalButtonClass}`}>{busy ? t.pending : collecting ? pending ? t.retry : t.submit : pending ? t.reverseRetry : t.reverseSubmit}</Button>
          {!pending && <Button type="button" variant="outline" disabled={busy || authBusy} onClick={() => setForm(null)} className={secondaryButtonClass}>{t.cancel}</Button>}
        </div>
      </form>}
    </>}
    {needsAuth && <form onSubmit={confirmIdentity} className="space-y-3 rounded-lg border border-[var(--dash-border)] p-3" aria-label={t.identity}>
      <h4 className="font-medium">{t.identity}</h4><p className="text-sm">{t.identityHelp}</p>
      <label className="block space-y-1 text-sm" htmlFor={`${id}-password`}><span>{t.password}</span><Input ref={passwordRef} id={`${id}-password`} type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} disabled={authBusy} className="min-h-11" /></label>
      <Button type="submit" disabled={authBusy || !password} className="h-auto min-h-11 whitespace-normal">{authBusy ? t.pending : t.verify}</Button>
    </form>}
  </section>
}

async function digest(value: ArrayBuffer | Uint8Array) {
  const hash = await crypto.subtle.digest("SHA-256", value as BufferSource)
  return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, "0")).join("")
}

function today() {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

function formatMoney(value: string, locale: string, currency: string) {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(Number(value))
}
