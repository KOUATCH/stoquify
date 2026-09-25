"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import { listCustomerStatementResponsesAction, getCustomerStatementResponseHistoryAction, reviewCustomerStatementResponseAction } from "@/actions/accounting/customer-statement-response.actions"
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"
import type { CustomerStatementResponse, CustomerStatementResponseHistory, CustomerStatementResponses as ResponseList, StatementResponseReviewReceipt } from "@/services/accounting/customer-statement-response.service"
import { statementResponseReviewSchema } from "@/services/accounting/customer-statement-response.schemas"
import { readStatementReview, saveStatementReview, type RetainedStatementReview, type StatementReviewDraft, type StatementReviewScope } from "@/hooks/customer-statement-review-request"
import type { Locale } from "@/types/bilingual"

const focus = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--dash-brand-strong)]"
const button = `min-h-11 max-w-full rounded-lg border border-[var(--dash-border)] px-3 py-3 text-sm font-semibold whitespace-normal disabled:opacity-50 ${focus}`
const control = `dashboard-control mt-2 w-full min-w-0 rounded-lg ${focus}`
type List = ResponseList & { canReview: boolean }

export function CustomerStatementResponses({ organizationId, actorId, customerId, locale }: StatementReviewScope & { locale: Locale }) {
  const tr = (en: string, fr: string) => locale === "fr" ? fr : en
  const scope = { organizationId, actorId, customerId }
  const [list, setList] = useState<List | null>(null), [history, setHistory] = useState<CustomerStatementResponseHistory | null>(null)
  const [retained, setRetained] = useState<RetainedStatementReview>({ draft: null, command: null })
  const retainedRef = useRef(retained), lock = useRef(false), heading = useRef<HTMLHeadingElement>(null), reasonField = useRef<HTMLTextAreaElement>(null), passwordField = useRef<HTMLInputElement>(null)
  const [ready, setReady] = useState(false), [storageFailed, setStorageFailed] = useState(false), [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null), [stale, setStale] = useState(false), [confirmed, setConfirmed] = useState(false)
  const [reference, setReference] = useState(""), [searchedReference, setSearchedReference] = useState<string | undefined>()
  const [receipt, setReceipt] = useState<StatementResponseReviewReceipt | null>(null)
  const [selected, setSelected] = useState<CustomerStatementResponse | null>(null)
  const status = (value: string) => ({ OPEN: tr("Awaiting review", "En attente d’examen"), ACKNOWLEDGED: tr("Under review", "En cours d’examen"), RESOLVED: tr("Review completed", "Examen terminé"), REJECTED: tr("Response declined", "Réponse refusée"), CANCELLED: tr("Closed without action", "Clôturé sans action") } as Record<string, string>)[value] ?? tr("Unavailable", "Indisponible")
  const date = (value: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))

  useEffect(() => {
    try {
      const value = readStatementReview(sessionStorage, { organizationId, actorId, customerId })
      retainedRef.current = value; setRetained(value); setReady(true)
    } catch { setStorageFailed(true); setReady(true) }
  }, [organizationId, actorId, customerId])
  const draftActionId = retained.draft?.actionId, selectedActionId = selected?.actionId
  useEffect(() => { if (draftActionId && selectedActionId) reasonField.current?.focus() }, [draftActionId, selectedActionId])
  function persist(value: RetainedStatementReview) {
    try { saveStatementReview(sessionStorage, scope, value); retainedRef.current = value; setRetained(value); return true }
    catch { setStorageFailed(true); return false }
  }
  function failure(code?: string) {
    setStale(true)
    if (["AUTH_REQUIRED", "FORBIDDEN", "TENANT_SCOPE_VIOLATION"].includes(code ?? "")) {
      setList(null); setHistory(null); setSelected(null)
      setError(tr("Current access is unavailable. Check your session and permissions; any pending review request is retained.", "L’accès actuel est indisponible. Vérifiez votre session et vos droits ; toute demande d’examen en attente est conservée."))
    } else setError(tr("Responses could not be refreshed. Displayed records may be out of date; retry before making a decision.", "Les réponses n’ont pas pu être actualisées. Les données affichées peuvent être anciennes ; réessayez avant de décider."))
  }
  async function load(cursor?: string, search = searchedReference) {
    if (lock.current) return
    lock.current = true; setLoading(true); setError(null)
    try {
      const result = await listCustomerStatementResponsesAction({ customerId, ...(cursor ? { cursor } : {}), ...(search ? { reference: search } : {}) })
      if (!result.success) { failure(result.code); return }
      setList(result.data); setStale(false); setHistory(null); setSearchedReference(search)
      const activeDraft = retainedRef.current.draft
      if (activeDraft) setSelected(result.data.responses.find(row => row.actionId === activeDraft.actionId) ?? null)
    } catch { failure() } finally { lock.current = false; setLoading(false) }
  }
  async function loadHistory(actionId: string, beforeVersion?: number) {
    if (lock.current) return
    lock.current = true; setLoading(true); setError(null)
    try {
      const result = await getCustomerStatementResponseHistoryAction({ customerId, actionId, ...(beforeVersion ? { beforeVersion } : {}) })
      if (!result.success) { failure(result.code); return }
      setHistory(result.data)
    } catch { failure() } finally { lock.current = false; setLoading(false) }
  }
  function begin(row: CustomerStatementResponse) {
    if (retainedRef.current.command || storageFailed || stale || !list?.canReview) return
    const draft: StatementReviewDraft = { actionId: row.actionId, expectedStateHash: row.current.stateHash, reason: "", outcome: row.current.status === "ACKNOWLEDGED" ? "RESOLVED" : "ACKNOWLEDGED" }
    if (persist({ draft, command: null })) { setSelected(row); setConfirmed(false); setError(null); setReceipt(null); setHistory(null) }
  }
  function update(patch: Partial<StatementReviewDraft>) {
    if (!retainedRef.current.draft || retainedRef.current.command || lock.current) return
    persist({ draft: { ...retainedRef.current.draft, ...patch }, command: null }); setConfirmed(false); setError(null)
  }
  function cancelDraft() {
    if (retainedRef.current.command || lock.current) return
    if (persist({ draft: null, command: null })) { setSelected(null); setConfirmed(false); heading.current?.focus() }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const current = retainedRef.current
    if (lock.current || !current.draft || !confirmed || storageFailed || stale || !list?.canReview || !selected) return
    const password = passwordField.current?.value ?? ""
    if (!password) { setError(tr("Enter your current password.", "Saisissez votre mot de passe actuel.")); return }
    let command = current.command
    if (!command) {
      const parsed = statementResponseReviewSchema.safeParse({ ...current.draft, customerId, requestId: crypto.randomUUID() })
      if (!parsed.success) { setError(tr("Choose a review outcome and enter a factual reason of 3–1000 characters.", "Choisissez une décision et indiquez un motif factuel de 3 à 1000 caractères.")); return }
      command = parsed.data
      if (!persist({ draft: current.draft, command })) return
    }
    lock.current = true; setLoading(true); setError(null); setReceipt(null)
    let applied = false
    try {
      const auth = await stepUpWithPasswordAction({ password })
      if (!auth.success) {
        setError(auth.code === "RATE_LIMITED" ? tr("Too many authentication attempts. Wait before retrying the same review.", "Trop de tentatives d’authentification. Patientez avant de réessayer le même examen.") : tr("Authentication could not be verified. Enter your current password or sign in again.", "L’authentification n’a pas pu être vérifiée. Saisissez votre mot de passe actuel ou reconnectez-vous.")); return
      }
      const result = await reviewCustomerStatementResponseAction(command)
      if (!result.success) {
        if (["CONFLICT", "BUSINESS_RULE_VIOLATION", "VALIDATION_ERROR"].includes(result.code)) {
          persist({ draft: current.draft, command: null }); setConfirmed(false); setStale(true)
          setError(tr("The review was not applied. Refresh this response, then cancel this draft and review the current state before deciding again.", "L’examen n’a pas été appliqué. Actualisez cette réponse, puis annulez ce brouillon et examinez l’état actuel avant de décider à nouveau."))
        } else if (["FORBIDDEN", "AUTH_REQUIRED"].includes(result.code)) failure(result.code)
        else setError(tr("The review result is unconfirmed. Keep the same request and use Check retained review.", "Le résultat de l’examen n’est pas confirmé. Conservez la même demande et utilisez Vérifier l’examen conservé."))
        return
      }
      const value = result.data
      if (value.requestId !== command.requestId || value.actionId !== command.actionId || value.status !== command.outcome || !value.eventId || !value.stateId || !/^[a-f0-9]{64}$/.test(value.stateHash)) {
        setError(tr("The review receipt could not be matched. Keep this request and ask an administrator to check the records.", "Le reçu d’examen n’a pas pu être rapproché. Conservez cette demande et demandez à un administrateur de vérifier les enregistrements.")); return
      }
      setReceipt(value)
      if (persist({ draft: null, command: null })) { setSelected(null); setConfirmed(false) }
      applied = true; heading.current?.focus()
    } catch { setError(tr("The review result is unconfirmed. Keep the same request and use Check retained review.", "Le résultat de l’examen n’est pas confirmé. Conservez la même demande et utilisez Vérifier l’examen conservé.")) }
    finally { if (passwordField.current) passwordField.current.value = ""; lock.current = false; setLoading(false) }
    if (applied) await load(undefined, command.actionId)
  }
  const draft = retained.draft, pending = retained.command, validPreview = selected && draft && selected.current.stateHash === draft.expectedStateHash
  const actionsDisabled = loading || stale || storageFailed || !ready
  return <section aria-label={tr("Customer responses", "Réponses du client")} aria-busy={loading} className="min-w-0 rounded-2xl border border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] p-[16px] sm:p-6 [overflow-wrap:anywhere]">
    <h2 ref={heading} tabIndex={-1} className={`text-xl font-semibold ${focus}`}>{tr("Customer responses", "Réponses du client")}</h2>
    <p className="mt-2 text-sm text-[var(--dash-text-soft)]">{tr("Review disputes and payment promises across this customer’s saved statements. Review decisions do not make payments, cancel debts or change account balances.", "Examinez les contestations et promesses de paiement des relevés enregistrés de ce client. Ces décisions n’effectuent aucun paiement, n’annulent aucune dette et ne modifient aucun solde.")}</p>
    <div className="mt-4 flex flex-wrap gap-2"><button className={button} disabled={loading || !ready} type="button" onClick={() => void load(undefined, draft?.actionId ?? "")}>{draft ? tr("Refresh retained response", "Actualiser la réponse conservée") : tr("Latest responses", "Dernières réponses")}</button></div>
    {!draft && <form className="mt-3 flex flex-wrap items-end gap-3" onSubmit={event => { event.preventDefault(); void load(undefined, reference.trim()) }}><div className="min-w-0 flex-1"><label htmlFor={`response-reference-${customerId}`} className="text-sm">{tr("Response or request reference", "Référence de réponse ou de demande")}</label><input id={`response-reference-${customerId}`} className={control} maxLength={191} value={reference} onChange={event => setReference(event.target.value)} /></div><button className={button} disabled={loading || !ready} type="submit">{tr("Find response", "Rechercher la réponse")}</button></form>}
    {loading && <p role="status" className="mt-3 text-sm">{tr("Checking response records…", "Vérification des réponses…")}</p>}
    {error && <p role="alert" className="mt-3 rounded-lg border border-[var(--dash-warning)] p-3 text-sm">{error}</p>}
    {storageFailed && <p role="alert" className="mt-3 text-sm">{tr("Review recovery storage is unavailable. New decisions are disabled. Keep any pending request reference and contact an administrator.", "Le stockage de reprise est indisponible. Les nouvelles décisions sont désactivées. Conservez toute référence en attente et contactez un administrateur.")}</p>}
    {pending && <p className="mt-3 text-sm">{tr("Retained request", "Demande conservée")}: <code className="break-all">{pending.requestId}</code></p>}
    {draft && !selected && <p className="mt-3 text-sm">{tr("A review draft is retained. Refresh the retained response to verify current access and evidence before continuing.", "Un brouillon d’examen est conservé. Actualisez la réponse conservée pour vérifier les droits et justificatifs actuels avant de continuer.")}</p>}
    {draft && !selected && !pending && <button type="button" className={button} disabled={loading} onClick={cancelDraft}>{tr("Cancel draft", "Annuler le brouillon")}</button>}
    {receipt && <div role="status" className="mt-4 rounded-lg border border-[var(--dash-success)] p-3 text-sm"><p>{tr("Review decision recorded", "Décision d’examen enregistrée")}: {status(receipt.status)}</p><p>{tr("Record", "Enregistrement")}: <code className="break-all">{receipt.stateId}</code> · {tr("Version", "Version")} {receipt.version}</p><p>{tr("Recorded at", "Enregistrée le")}: {date(receipt.reviewedAt)}</p></div>}
    {list && <div className="mt-4 space-y-3"><p className="text-xs text-[var(--dash-text-soft)]">{tr("Checked", "Vérifié le")}: {date(list.checkedAt)}</p>
      {!list.canReview && <p className="text-sm">{tr("You can inspect responses. Recording decisions requires customer update permission, statement access and current Accounting write access.", "Vous pouvez consulter les réponses. Enregistrer une décision nécessite le droit de modifier les clients, l’accès aux relevés et le droit d’écriture actuel en Comptabilité.")}</p>}
      {list.responses.length === 0 ? <p>{tr("No responses match this view.", "Aucune réponse ne correspond à cette vue.")}</p> : <ul className="space-y-3">{list.responses.map(row => <li key={row.actionId} className="min-w-0 rounded-lg border border-[var(--dash-border)] p-3">
        <h3 className="font-semibold">{row.actionType === "DISPUTE" ? tr("Document dispute", "Contestation de pièce") : tr("Payment promise", "Promesse de paiement")} · {row.amount} {row.currency}</h3>
        <p className="mt-1 text-sm">{row.statementNumber} · {tr("Version", "Version")} {row.statementVersion}{row.documentNumber ? ` · ${row.documentNumber}` : ""}</p>
        <p className="mt-2 text-sm">{tr("Review status", "État de l’examen")}: {status(row.current.status)}</p>
        <p className="mt-1 text-sm">{tr("Received", "Reçue le")}: {date(row.submittedAt)}{row.promisedFor ? ` · ${tr("Promised date", "Date promise")}: ${date(row.promisedFor)}` : ""}</p>
        <p className="mt-3 whitespace-pre-wrap text-sm">{row.note}</p>
        <details className="mt-2 text-sm"><summary className={focus}>{tr("Response references", "Références de réponse")}</summary><p className="mt-2 break-all">{row.actionId}</p><p className="break-all">{row.requestReference}</p></details>
        <div className="mt-3 flex flex-wrap gap-2"><button className={button} type="button" disabled={actionsDisabled || Boolean(draft) || !list.canReview} onClick={() => begin(row)}>{["OPEN", "ACKNOWLEDGED"].includes(row.current.status) ? tr("Review response", "Examiner la réponse") : tr("Reopen review", "Rouvrir l’examen")}</button><button className={button} type="button" disabled={loading} onClick={() => void loadHistory(row.actionId)}>{tr("Review history", "Historique de l’examen")}</button></div>
      </li>)}</ul>}
      {list.nextCursor && !draft && <button type="button" className={button} disabled={loading} onClick={() => void load(list.nextCursor!)}>{tr("Older responses", "Réponses précédentes")}</button>}
    </div>}
    {selected && draft && <form aria-label={tr("Record response review", "Enregistrer l’examen de la réponse")} onSubmit={submit} noValidate className="mt-5 min-w-0 space-y-4 rounded-xl border border-[var(--dash-brand)] p-3">
      <h3 className="font-semibold">{selected.statementNumber} · {selected.amount} {selected.currency}</h3>
      {pending && <p className="text-sm">{tr("This request is retained for an exact retry. Its decision and reason cannot change while the result is uncertain.", "Cette demande est conservée pour une reprise identique. Sa décision et son motif ne peuvent changer tant que le résultat est incertain.")}</p>}
      {!validPreview && !pending && <p role="alert" className="text-sm">{tr("This response has changed. Cancel this draft and review the current record.", "Cette réponse a changé. Annulez ce brouillon et examinez l’enregistrement actuel.")}</p>}
      <fieldset disabled={loading || Boolean(pending) || storageFailed} className="grid min-w-0 grid-cols-1 gap-4">
        <div className="min-w-0"><label htmlFor={`response-outcome-${customerId}`} className="text-sm">{tr("Review outcome", "Décision d’examen")}</label><select id={`response-outcome-${customerId}`} className={control} value={draft.outcome} onChange={event => update({ outcome: event.target.value as StatementReviewDraft["outcome"] })}>{(["ACKNOWLEDGED", "RESOLVED", "REJECTED", "CANCELLED"] as const).filter(outcome => pending ? outcome === pending.outcome : outcome !== selected.current.status && (["OPEN", "ACKNOWLEDGED"].includes(selected.current.status) || outcome === "ACKNOWLEDGED")).map(outcome => <option key={outcome} value={outcome}>{status(outcome)}</option>)}</select><p className="mt-2 text-sm">{tr("Selected outcome", "Décision choisie")}: {status(draft.outcome)}</p></div>
        <div><label htmlFor={`response-reason-${customerId}`} className="text-sm">{tr("Review reason", "Motif de l’examen")}</label><textarea ref={reasonField} id={`response-reason-${customerId}`} className={`${control} min-h-28`} minLength={3} maxLength={1000} value={draft.reason} onChange={event => update({ reason: event.target.value })} /></div>
      </fieldset>
      <div><label htmlFor={`response-password-${customerId}`} className="text-sm">{tr("Confirm your current password", "Confirmez votre mot de passe actuel")}</label><input ref={passwordField} id={`response-password-${customerId}`} type="password" autoComplete="current-password" className={control} disabled={loading || !list?.canReview} /></div>
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" className={`mt-1 shrink-0 ${focus}`} checked={confirmed} onChange={event => setConfirmed(event.target.checked)} disabled={loading || !list?.canReview} /><span>{tr("I reviewed this response and confirm this decision. It does not post a payment or change a balance.", "J’ai examiné cette réponse et je confirme cette décision. Elle ne comptabilise aucun paiement et ne modifie aucun solde.")}</span></label>
      <div className="flex flex-wrap gap-2"><button type="submit" className={`${button} bg-[var(--dash-brand)] text-white`} disabled={actionsDisabled || !confirmed || !list?.canReview || (!pending && !validPreview)}>{pending ? tr("Check retained review", "Vérifier l’examen conservé") : tr("Record review decision", "Enregistrer la décision")}</button>{!pending && <button type="button" className={button} disabled={loading} onClick={cancelDraft}>{tr("Cancel draft", "Annuler le brouillon")}</button>}</div>
    </form>}
    {history && <div className="mt-5 space-y-3 rounded-lg border border-[var(--dash-border)] p-3">
      <h3 className="font-semibold">{tr("Review history", "Historique de l’examen")} · {history.response.statementNumber}</h3>
      <ol className="space-y-3">{history.states.map(state => <li key={state.id} className="border-t border-[var(--dash-border-subtle)] pt-3 text-sm">
        <p>{tr("Version", "Version")} {state.version} · {status(state.status)} · {date(state.recordedAt)}</p>
        {state.reason && <p className="mt-1 whitespace-pre-wrap">{state.reason}</p>}
        <p className="mt-1 break-all">{tr("Record", "Enregistrement")}: {state.id}</p>
        {state.actorId && <p className="break-all">{tr("Reviewer reference", "Référence du réviseur")}: {state.actorId}</p>}
      </li>)}</ol>
      <div className="flex flex-wrap gap-2">
        {history.nextBeforeVersion && <button type="button" className={button} disabled={loading} onClick={() => void loadHistory(history.response.actionId, history.nextBeforeVersion!)}>{tr("Earlier review history", "Examens antérieurs")}</button>}
        <button type="button" className={button} disabled={loading} onClick={() => setHistory(null)}>{tr("Close history", "Fermer l’historique")}</button>
      </div>
    </div>}
  </section>
}
