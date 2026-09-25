"use client"

import { useEffect, useId, useRef, useState } from "react"
import { getCustomerStatementRecordAction, listCustomerStatementHistoryAction } from "@/actions/accounting/customer-statement-history.actions"
import type { CustomerStatementHistory as History, CustomerStatementRecord, CustomerStatementSummary } from "@/services/accounting/customer-statement-history.service"
import type { Locale } from "@/types/bilingual"
import type { RetryCustomerStatementInput } from "@/services/accounting/customer-statement.schemas"

const button = "min-h-11 max-w-full rounded-lg border border-[var(--dash-border-subtle)] px-3 py-2 text-sm font-bold disabled:opacity-50"
const control = "dashboard-control mt-1 w-full min-w-0 rounded-lg"

export function CustomerStatementHistory({ customerId, locale, initialStatementId, pendingStatementId, busy, canOpen, canRevoke, onOpen, onRevoke, canRetry = false, pendingRetry, onRetry }: {
  customerId: string; locale: Locale; initialStatementId?: string; pendingStatementId?: string; busy: boolean; canOpen: boolean; canRevoke: boolean
  onOpen: (statement: CustomerStatementSummary) => void
  onRevoke: (tokenId: string, reason: string, password: string) => Promise<void>
  canRetry?: boolean; pendingRetry?: RetryCustomerStatementInput
  onRetry?: (command: Omit<RetryCustomerStatementInput, "idempotencyKey" | "customerId">, password: string) => Promise<void>
}) {
  const [history, setHistory] = useState<History | null>(null)
  const [record, setRecord] = useState<CustomerStatementRecord | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [revoking, setRevoking] = useState<string | null>(null)
  const [retrying, setRetrying] = useState<{ statementId: string; deliveryId: string; expectedRevision: string } | null>(null)
  const lock = useRef(false), heading = useRef<HTMLHeadingElement>(null), fieldId = useId()
  const retryReason = useRef<HTMLTextAreaElement>(null)
  useEffect(() => { if (retrying) retryReason.current?.focus() }, [retrying])
  const tr = (en: string, fr: string) => locale === "fr" ? fr : en
  const date = (value: string) => new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
  const deliveryStatus = (value: string | null) => ({
    QUEUED: tr("Queued", "En file d’attente"), SENT: tr("Sent through provider", "Envoyé via le fournisseur"),
    DEFERRED: tr("Deferred", "Différé"), FAILED: tr("Failed", "Échec"),
    DEAD_LETTER: tr("Operator review required", "Vérification par un opérateur requise"), CANCELLED: tr("Cancelled", "Annulé"),
    PENDING: tr("Waiting to process", "Traitement en attente"), LOCKED: tr("Claimed by worker", "Pris en charge par le traitement"),
  } as Record<string, string>)[value ?? ""] ?? tr("Evidence unavailable", "Justificatif indisponible")
  const tokenStatus = (value: string) => value === "REVOKED" ? tr("Revoked", "Révoqué") : value === "EXPIRED" ? tr("Expired", "Expiré") : tr("Active", "Actif")
  const deliveryGuidance = (code: string | null) => ({
    PROVIDER_OUTCOME_UNKNOWN: tr("The provider outcome is unconfirmed. Automatic retry is paused to avoid another copy. Ask an operator to reconcile the provider evidence before any new delivery.", "Le résultat chez le fournisseur n’est pas confirmé. La reprise automatique est suspendue pour éviter une autre copie. Demandez à un opérateur de rapprocher les justificatifs du fournisseur avant tout nouvel envoi."),
    PROVIDER_NOT_CONFIGURED: tr("Delivery is waiting for provider setup. Automatic retry is paused; ask an administrator to review the configuration and the retained request.", "L’envoi attend la configuration du fournisseur. La reprise automatique est suspendue ; demandez à un administrateur de vérifier la configuration et la demande conservée."),
    STATEMENT_ACCESS_UNAVAILABLE: tr("This delivery was cancelled because its link is revoked, expired or unavailable. Customer obligations are retained.", "Cet envoi a été annulé car son lien est révoqué, expiré ou indisponible. Les obligations du client sont conservées."),
    STATEMENT_DELIVERY_INTEGRITY_FAILED: tr("Delivery evidence failed validation. Automatic retry is stopped; an operator must investigate the original records.", "Les justificatifs d’envoi ont échoué à la validation. La reprise automatique est arrêtée ; un opérateur doit vérifier les enregistrements d’origine."),
    INVALID_PAYLOAD: tr("The recorded delivery request is invalid and needs operator review.", "La demande d’envoi enregistrée est invalide et nécessite la vérification d’un opérateur."),
    ORGANIZATION_UNAVAILABLE: tr("Delivery was cancelled because the organization is unavailable.", "L’envoi a été annulé car l’organisation est indisponible."),
    STATEMENT_DELIVERY_ATTEMPTS_EXHAUSTED: tr("The delivery attempt limit was reached. An operator must review the retained results.", "La limite de tentatives d’envoi a été atteinte. Un opérateur doit examiner les résultats conservés."),
  } as Record<string, string>)[code ?? ""]

  function failure(result?: { code?: string }) {
    if (["FORBIDDEN", "AUTH_REQUIRED", "TENANT_SCOPE_VIOLATION"].includes(result?.code ?? "")) {
      setHistory(null); setRecord(null); setRevoking(null)
      setError(tr("History access is unavailable. Check your session and current permissions.", "L’accès à l’historique est indisponible. Vérifiez votre session et vos autorisations actuelles."))
    } else {
      setError(tr("History could not be refreshed. Any records still shown may be out of date. Retry or return to the latest statements.", "L’historique n’a pas pu être actualisé. Les données encore affichées peuvent être anciennes. Réessayez ou revenez aux derniers relevés."))
    }
  }

  async function loadList(cursor?: string) {
    if (lock.current) return
    lock.current = true; setLoading(true); setError(null)
    try {
      const result = await listCustomerStatementHistoryAction({ customerId, ...(cursor ? { cursor } : {}) })
      if (!result.success) { failure(result); return }
      setHistory(result.data); setRecord(null); setRevoking(null); setNotice(null)
    } catch { failure() } finally { lock.current = false; setLoading(false) }
  }
  async function loadRecord(statementId: string, cursor?: string) {
    if (lock.current) return
    lock.current = true; setLoading(true); setError(null)
    try {
      const result = await getCustomerStatementRecordAction({ customerId, statementId, ...(cursor ? { cursor } : {}) })
      if (!result.success) { failure(result); return }
      setRecord(result.data); setRevoking(null)
    } catch { failure() } finally { lock.current = false; setLoading(false) }
  }
  async function revoke(event: React.FormEvent<HTMLFormElement>, tokenId: string) {
    event.preventDefault()
    if (lock.current || busy || !canRevoke) return
    const form = new FormData(event.currentTarget)
    if (form.get("confirmRevocation") !== "on") return
    lock.current = true; setLoading(true); setError(null); setNotice(null)
    try {
      await onRevoke(tokenId, String(form.get("reason") ?? ""), String(form.get("password") ?? ""))
      setRevoking(null)
      setNotice(tr("Link access was revoked. The delivery record and customer obligations are retained.", "L’accès par ce lien a été révoqué. L’envoi enregistré et les obligations du client sont conservés."))
      heading.current?.focus()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : tr("Revocation could not be confirmed. Keep the same link and retry.", "La révocation n’a pas pu être confirmée. Conservez le même lien et réessayez."))
      return
    } finally { lock.current = false; setLoading(false) }
    if (record) await loadRecord(record.statement.statementId)
  }

  const retryCommand = pendingRetry ?? retrying
  async function retry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (lock.current || busy || !canRetry || !onRetry || !retryCommand) return
    const form = new FormData(event.currentTarget)
    if (form.get("confirmRetry") !== "on") return
    lock.current = true; setLoading(true); setError(null); setNotice(null)
    try {
      await onRetry({ ...retryCommand, reason: pendingRetry?.reason ?? String(form.get("retryReason") ?? "") }, String(form.get("retryPassword") ?? ""))
      setRetrying(null)
      setNotice(tr("The processing retry was recorded. This does not confirm sending. Refresh history to follow the outcome.", "La reprise du traitement a été enregistrée. Cela ne confirme pas l’envoi. Actualisez l’historique pour suivre le résultat."))
      heading.current?.focus()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : tr("Retry is unconfirmed. Keep the same request.", "La reprise n’est pas confirmée. Conservez la même demande."))
      return
    } finally { lock.current = false; setLoading(false) }
    await loadRecord(retryCommand.statementId)
  }

  return <section aria-busy={loading} aria-label={tr("Statement history", "Historique des relevés")} className="min-w-0 rounded-2xl border border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] p-4 sm:p-6">
    <h2 ref={heading} tabIndex={-1} className="text-xl font-black focus-visible:outline focus-visible:outline-2">{tr("Statement history", "Historique des relevés")}</h2>
    <p className="mt-2 text-sm text-[var(--dash-text-soft)]">{tr("Review saved statements and previous deliveries before preparing another copy. Opening history creates no statement or delivery.", "Consultez les relevés et envois enregistrés avant de préparer une autre copie. L’ouverture de l’historique ne crée aucun relevé ni envoi.")}</p>
    <div className="mt-3 flex flex-wrap gap-2">
      <button type="button" className={button} disabled={loading || busy} onClick={() => void loadList()}>{tr("Latest statements", "Derniers relevés")}</button>
      {initialStatementId ? <button type="button" className={button} disabled={loading || busy} onClick={() => void loadRecord(initialStatementId)}>{tr("Open saved statement", "Ouvrir le relevé conservé")}</button> : null}
      {record ? <button type="button" className={button} disabled={loading || busy} onClick={() => void loadRecord(record.statement.statementId)}>{tr("Refresh this record", "Actualiser ce relevé")}</button> : null}
    </div>
    {loading ? <p role="status" className="mt-3 text-sm">{tr("Loading history…", "Chargement de l’historique…")}</p> : null}
    {error ? <p role="alert" className="mt-3 rounded-lg border border-[var(--dash-warning)] p-3 text-sm">{error}</p> : null}
    {notice ? <p role="status" className="mt-3 text-sm">{notice}</p> : null}
    {retryCommand && onRetry ? <form aria-label={tr("Resume statement processing", "Reprendre le traitement du relevé")} className="mt-3 space-y-3 rounded-lg border border-[var(--dash-border-subtle)] p-3" onSubmit={event => void retry(event)}>
      <p className="text-sm">{pendingRetry ? tr("A processing request is retained. Confirm your password to check the same request; its details cannot change while the result is uncertain.", "Une demande de traitement est conservée. Confirmez votre mot de passe pour vérifier la même demande ; ses détails restent inchangés tant que le résultat est incertain.") : tr("Review provider setup with your administrator. This resumes the same recorded request and keeps its recipient, consent, link and attempt count. If setup is still unavailable, processing will pause again.", "Vérifiez la configuration du fournisseur avec votre administrateur. Cette reprise conserve la demande, le destinataire, le consentement, le lien et le nombre de tentatives. Si la configuration reste indisponible, le traitement sera de nouveau suspendu.")}</p>
      <div><label className="block text-sm" htmlFor={fieldId + "retryReason"}>{tr("Reason for retry", "Motif de reprise")}</label><textarea ref={retryReason} key={pendingRetry?.idempotencyKey ?? retryCommand.deliveryId} id={fieldId + "retryReason"} name="retryReason" defaultValue={pendingRetry?.reason ?? ""} readOnly={Boolean(pendingRetry)} required minLength={3} maxLength={500} disabled={loading || busy || !canRetry} className={control} /></div>
      <label className="block text-sm" htmlFor={fieldId + "retryPassword"}>{tr("Confirm your current password", "Confirmez votre mot de passe actuel")}<input id={fieldId + "retryPassword"} name="retryPassword" type="password" autoComplete="current-password" required disabled={loading || busy || !canRetry} className={control} /></label>
      <label className="flex items-start gap-2 text-sm"><input name="confirmRetry" type="checkbox" required disabled={loading || busy || !canRetry} /><span>{tr("I reviewed this request and want to resume its processing with the same details.", "J’ai vérifié cette demande et je souhaite reprendre son traitement avec les mêmes détails.")}</span></label>
      <div className="flex flex-wrap gap-2"><button type="submit" className={button} disabled={loading || busy || !canRetry}>{pendingRetry ? tr("Check retained retry", "Vérifier la reprise conservée") : tr("Confirm processing retry", "Confirmer la reprise du traitement")}</button>{!pendingRetry ? <button type="button" className={button} disabled={loading || busy} onClick={() => { setRetrying(null); heading.current?.focus() }}>{tr("Cancel", "Annuler")}</button> : null}</div>
      {!canRetry ? <p className="text-sm">{tr("Current access does not permit this retry. The request is retained for review.", "Vos droits actuels ne permettent pas cette reprise. La demande est conservée pour vérification.")}</p> : null}
    </form> : null}
    {history && !record ? <div className="mt-4 space-y-3">
      <p className="text-xs">{tr("Checked", "Vérifié le")} : {date(history.checkedAt)}</p>
      {history.statements.length === 0 ? <p>{tr("No saved statements for this customer.", "Aucun relevé enregistré pour ce client.")}</p> : <ul className="space-y-3">{history.statements.map(item => <li key={item.statementId} className="rounded-lg border border-[var(--dash-border-subtle)] p-3">
        <p className="font-bold">{item.statementNumber} · {tr("Version", "Version")} {item.version}</p>
        <p className="mt-1 text-sm">{date(item.periodStart)} — {date(item.periodEnd)}</p>
        <p className="mt-1 text-sm">{tr("Recorded closing balance", "Solde de clôture enregistré")} : {item.closingBalance} {item.currency}</p>
        <button type="button" className={button + " mt-2"} disabled={loading || busy} onClick={() => { setNotice(null); void loadRecord(item.statementId) }}>{tr("Review", "Consulter")} {item.statementNumber} {tr("version", "version")} {item.version}</button>
      </li>)}</ul>}
      {history.nextCursor ? <button type="button" className={button} disabled={loading || busy} onClick={() => void loadList(history.nextCursor!)}>{tr("Older statements", "Relevés précédents")}</button> : null}
    </div> : null}
    {record ? <div className="mt-4 space-y-3">
      <h3 className="text-lg font-bold">{record.statement.statementNumber} · {tr("Version", "Version")} {record.statement.version}</h3>
      <p className="text-xs">{tr("Checked", "Vérifié le")} : {date(record.checkedAt)}</p>
      <p className="text-sm">{tr("Recorded closing balance", "Solde de clôture enregistré")} : {record.statement.closingBalance} {record.statement.currency}</p>
      <p className="text-sm">{tr("As of", "À la date du")} : {date(record.statement.asOf)} · {tr("Recorded through", "Enregistré jusqu’au")} : {date(record.statement.recordedThrough)}</p>
      <p className="text-sm">{tr("Queuing or provider acceptance does not prove recipient delivery or reading. Revoking a link stops its access; it does not cancel or reverse customer obligations.", "La mise en file ou l’acceptation par le fournisseur ne prouve ni la livraison ni la lecture. Révoquer un lien bloque son accès ; cela n’annule pas les obligations du client.")}</p>
      {record.statement.truncated ? <p role="status">{tr("This incomplete snapshot cannot be used for delivery.", "Cet instantané incomplet ne peut pas être utilisé pour un envoi.")}</p> : null}
      <button type="button" className={button} disabled={loading || busy || !canOpen || Boolean(error) || record.statement.truncated || Boolean(pendingStatementId && pendingStatementId !== record.statement.statementId)} onClick={() => onOpen(record.statement)}>{initialStatementId === record.statement.statementId ? tr("Resume this statement", "Reprendre ce relevé") : tr("Use this statement for a new delivery", "Utiliser ce relevé pour un nouvel envoi")}</button>
      {!canOpen ? <p className="text-sm">{tr("New delivery is unavailable while another request is unresolved or new-work access is restricted. You can still inspect history.", "Un nouvel envoi est indisponible tant qu’une autre demande n’est pas résolue ou que les nouveaux traitements sont restreints. L’historique reste consultable.")}</p> : null}
      {record.deliveries.length === 0 ? <p>{tr("No recorded deliveries on this page.", "Aucun envoi enregistré sur cette page.")}</p> : <ul className="space-y-3">{record.deliveries.map(item => <li key={item.deliveryId} className="rounded-lg border border-[var(--dash-border-subtle)] p-3">
        <p className="font-bold">{item.channel === "EMAIL" ? tr("Email", "E-mail") : "WhatsApp"} · {item.redactedDestination}</p>
        <p className="mt-1 text-sm">{tr("Delivery record", "Envoi enregistré")} : {deliveryStatus(item.status)}</p>
        <p className="text-sm">{tr("Processing queue", "File de traitement")} : {deliveryStatus(item.queue?.status ?? null)} {item.queue ? `(${item.queue.attempts})` : ""}</p>
        {deliveryGuidance(item.queue ? item.queue.errorCode : item.errorCode) ? <p className="mt-2 text-sm text-[var(--dash-text-soft)]">{deliveryGuidance(item.queue ? item.queue.errorCode : item.errorCode)}</p> : null}
        <p className="text-sm">{tr("Link access", "Accès par le lien")} : {tokenStatus(item.token.status)} · {tr("Expiry", "Expiration")} : {date(item.token.expiresAt)}</p>
        <p className="text-xs">{tr("Consent recorded", "Consentement enregistré")} : {date(item.consentCapturedAt)}</p>
        {item.recovery && canRetry && onRetry ? <button type="button" className={button + " mt-2"} disabled={loading || busy || Boolean(error) || Boolean(pendingRetry)} onClick={() => { setRevoking(null); setRetrying({ statementId: record.statement.statementId, deliveryId: item.deliveryId, expectedRevision: item.recovery!.revision }); setNotice(null) }}>{tr("Review processing retry", "Examiner la reprise du traitement")}</button> : null}
        {item.token.status === "ACTIVE" && canRevoke ? <button type="button" className={button + " mt-2"} disabled={loading || busy || Boolean(error)} onClick={() => setRevoking(item.token.id)}>{tr("Revoke link access", "Révoquer l’accès par le lien")}</button> : null}
        {revoking === item.token.id ? <form aria-label={tr("Revoke link access", "Révoquer l’accès par le lien")} className="mt-3 space-y-3" onSubmit={event => void revoke(event, item.token.id)}>
          <label className="block text-sm" htmlFor={fieldId + "reason"}>{tr("Reason for revocation", "Motif de révocation")}<textarea id={fieldId + "reason"} name="reason" required minLength={3} maxLength={500} className={control} disabled={loading || busy} /></label>
          <label className="block text-sm" htmlFor={fieldId + "password"}>{tr("Confirm your current password", "Confirmez votre mot de passe actuel")}<input id={fieldId + "password"} type="password" name="password" autoComplete="current-password" required className={control} disabled={loading || busy} /></label>
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="confirmRevocation" required disabled={loading || busy} /><span>{tr("I confirm that this link should no longer provide access.", "Je confirme que ce lien ne doit plus donner accès au relevé.")}</span></label>
          <div className="flex flex-wrap gap-2"><button type="submit" className={button + " text-[var(--dash-danger)]"} disabled={loading || busy}>{tr("Confirm revocation", "Confirmer la révocation")}</button><button type="button" className={button} disabled={loading || busy} onClick={() => setRevoking(null)}>{tr("Cancel", "Annuler")}</button></div>
        </form> : null}
      </li>)}</ul>}
      {record.nextCursor ? <button type="button" className={button} disabled={loading || busy} onClick={() => void loadRecord(record.statement.statementId, record.nextCursor!)}>{tr("Older deliveries", "Envois précédents")}</button> : null}
    </div> : null}
  </section>
}
