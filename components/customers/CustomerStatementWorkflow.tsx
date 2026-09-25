"use client"

import { type FormEvent, useEffect, useId, useRef, useState } from "react"
import Link from "next/link"

import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"
import { retryCustomerStatementDeliveryAction } from "@/actions/accounting/customer-statement-history.actions"
import type { RetryCustomerStatementInput } from "@/services/accounting/customer-statement.schemas"
import {
  createCustomerStatementAction,
  queueCustomerStatementDeliveryAction,
  revokeCustomerStatementAccessAction,
} from "@/actions/accounting/customer-statement.actions"
import { localizePath } from "@/i18n/routing"
import type { CustomerStatementSummary } from "@/services/accounting/customer-statement-history.service"
import { CustomerStatementHistory } from "./CustomerStatementHistory"
import { CustomerStatementResponses } from "./CustomerStatementResponses"
import type { CustomerStatementDeliveryResult } from "@/services/accounting/customer-statement-delivery.service"
import type { Locale } from "@/types/bilingual"
import { readStatementRequests, saveStatementRequests, type StatementRequests } from "@/hooks/customer-statement-request"

type CustomerSummary = {
  id: string
  name: string
  code: string | null
  email: string | null
}

function commandKey(prefix: string) {
  const random = globalThis.crypto?.randomUUID?.()
  return prefix + ":" + (random || Date.now().toString(36))
}

function messageFromResult(result: {
  error?: unknown
  message?: unknown
}) {
  if (typeof result.error === "string") return result.error
  if (
    result.error &&
    typeof result.error === "object" &&
    "message" in result.error &&
    typeof result.error.message === "string"
  ) {
    return result.error.message
  }
  return typeof result.message === "string"
    ? result.message
    : "The operation could not be completed."
}

async function requireFreshPassword(password: string, locale: Locale) {
  const result = await stepUpWithPasswordAction({ password })
  if (result.success) return
  if (result.code === "RATE_LIMITED") {
    throw new Error(
      (locale === "fr" ? "Trop de tentatives d’authentification. Réessayez dans " : "Too many authentication attempts. Try again in ") +
        Math.max(1, result.retryAfterSeconds ?? 1) +
        (locale === "fr" ? " secondes." : " seconds."),
    )
  }
  if (result.code === "AUTH_REQUIRED") {
    throw new Error(locale === "fr" ? "Votre session a expiré. Reconnectez-vous avant de continuer." : "Your session expired. Sign in again before continuing.")
  }
  throw new Error(locale === "fr" ? "L’authentification n’a pas pu être vérifiée." : result.error || "Authentication could not be verified.")
}

function statementPeriodEnd(value: string) {
  const endOfDay = new Date(value + "T23:59:59.999Z")
  const now = new Date()
  return endOfDay.getTime() > now.getTime()
    ? now.toISOString()
    : endOfDay.toISOString()
}

async function consentHash(value: string) {
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  )
  return "sha256:" + Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}

function localDate(value: Date) {
  const offset = value.getTimezoneOffset() * 60_000
  return new Date(value.getTime() - offset).toISOString().slice(0, 10)
}

export function CustomerStatementWorkflow({
  currency,
  customer,
  locale,
  organizationId,
  actorId,
  canCreateNew = true,
}: {
  currency: string
  organizationId: string
  actorId: string
  canCreateNew?: boolean
  customer: CustomerSummary
  locale: Locale
}) {
  const today = new Date()
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const [periodStartValue, setPeriodStartValue] = useState(localDate(firstOfMonth))
  const [periodEndValue, setPeriodEndValue] = useState(localDate(today))
  const [snapshot, setSnapshot] =
    useState<CustomerStatementSummary | null>(null)
  const [delivery, setDelivery] =
    useState<CustomerStatementDeliveryResult | null>(null)
  const [creating, setCreating] = useState(false)
  const [delivering, setDelivering] = useState(false)
  const [revokingAccess, setRevokingAccess] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [channel, setChannel] = useState<"EMAIL" | "WHATSAPP">("EMAIL")
  const channelInputId = useId()
  const tr = (english: string, french: string) => locale === "fr" ? french : english
  const deliveryStatus: Record<CustomerStatementDeliveryResult["status"], string> = {
    QUEUED: tr("Queued", "En file d’attente"),
    SENT: tr("Sent through provider", "Envoyé via le fournisseur"),
    DEFERRED: tr("Deferred", "Différé"),
    FAILED: tr("Failed", "Échec"),
    DEAD_LETTER: tr("Operator review required", "Vérification par un opérateur requise"),
    CANCELLED: tr("Cancelled", "Annulé"),
  }


  const [requests, setRequests] = useState<StatementRequests>({ statement: null, delivery: null })
  const requestsRef = useRef<StatementRequests>({ statement: null, delivery: null })
  const operationLock = useRef(false)
  const [recoveryReady, setRecoveryReady] = useState(false)
  const [recoveryFailed, setRecoveryFailed] = useState(false)
  const [deliveryFormVersion, setDeliveryFormVersion] = useState(0)
  const scope = { organizationId, actorId, customerId: customer.id }
  const unresolvedDelivery = Boolean(requests.delivery && !delivery)
  const working = creating || delivering || revokingAccess

  useEffect(() => {
    try {
      const saved = readStatementRequests(sessionStorage, { organizationId, actorId, customerId: customer.id })
      requestsRef.current = saved
      setRequests(saved)
      if (saved.statement) {
        setPeriodStartValue(saved.statement.periodStart.slice(0, 10))
        setPeriodEndValue(saved.statement.periodEnd.slice(0, 10))
      }
      if (saved.delivery) setChannel(saved.delivery.channel)
      setRecoveryReady(true)
    } catch {
      setRecoveryFailed(true)
    }
  }, [organizationId, actorId, customer.id])

  function persist(next: StatementRequests) {
    try { saveStatementRequests(sessionStorage, scope, next) }
    catch { throw new Error(tr("Could not retain this request for safe retry. Check browser session storage and try again.", "Impossible de conserver cette demande pour une reprise sans doublon. Vérifiez le stockage de session du navigateur puis réessayez.")) }
    requestsRef.current = next
    setRequests(next)
  }

  async function createStatement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (operationLock.current || requestsRef.current.retry || !canCreateNew || requestsRef.current.historicalStatementId || !recoveryReady || (unresolvedDelivery && snapshot)) return
    const form = new FormData(event.currentTarget)
    const periodStart = periodStartValue, periodEnd = periodEndValue
    if (!periodStart || !periodEnd || periodStart > periodEnd) {
      setMessage(tr("Choose a valid period whose end is on or after its start.", "Choisissez une période valide dont la fin est postérieure ou égale au début."))
      return
    }
    operationLock.current = true
    setCreating(true); setMessage(null)
    const existed = Boolean(requestsRef.current.statement)
    let submitted = false
    try {
      await requireFreshPassword(String(form.get("password") || ""), locale)
      const command = requestsRef.current.statement || {
        customerId: customer.id,
        periodStart: periodStart + "T00:00:00.000Z",
        periodEnd: statementPeriodEnd(periodEnd),
        currency,
        idempotencyKey: commandKey("customer-statement"),
        correlationId: commandKey("customer-statement-correlation"),
      }
      persist({ ...requestsRef.current, statement: command })
      submitted = true
      const result = await createCustomerStatementAction(command)
      if (!result.success) {
        if (!existed && ["VALIDATION_ERROR", "BUSINESS_RULE_VIOLATION"].includes(result.code)) persist({ statement: null, delivery: null })
        throw new Error(messageFromResult(result))
      }
      if (!result.data) throw new Error(tr("The statement outcome is unconfirmed.", "Le résultat du relevé n’est pas confirmé."))
      setSnapshot(result.data)
      setMessage(result.data.replayed
        ? tr("The existing immutable statement was loaded.", "Le relevé immuable existant a été chargé.")
        : tr("Immutable statement created and content-hashed.", "Le relevé immuable a été créé et son contenu a été haché."))
    } catch (caught) {
      const detail = caught instanceof Error ? caught.message : tr("Statement creation failed.", "La création du relevé a échoué.")
      setMessage((submitted && requestsRef.current.statement
        ? tr("Outcome unconfirmed. Retry the existing request to check it safely. ", "Résultat non confirmé. Réessayez la demande existante pour la vérifier sans doublon. ")
        : "") + detail)
    } finally { operationLock.current = false; setCreating(false) }
  }

  async function deliverStatement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (operationLock.current || requestsRef.current.retry || !canCreateNew || !recoveryReady || !snapshot || snapshot.truncated) return
    const form = new FormData(event.currentTarget)
    const existed = Boolean(requestsRef.current.delivery)
    if (!existed && form.get("consentConfirmed") !== "on") {
      setMessage(tr("Confirm explicit customer consent before delivery.", "Confirmez le consentement explicite du client avant l’envoi."))
      return
    }
    operationLock.current = true
    setDelivering(true); setMessage(null)
    let submitted = false
    try {
      await requireFreshPassword(String(form.get("password") || ""), locale)
      let command = requestsRef.current.delivery
      if (!command) {
        const destination = String(form.get("destination") || "").trim()
        const consentCapturedAt = new Date().toISOString()
        const consentEvidenceHash = await consentHash(["customer-statement-delivery-consent.v1", customer.id, snapshot.statementId, channel, destination.toLowerCase(), consentCapturedAt, "explicit-client-confirmation"].join("|"))
        command = { statementSnapshotId: snapshot.statementId, channel, destination, consentBasis: "EXPLICIT", consentEvidenceHash, consentCapturedAt, allowDispute: form.get("allowDispute") === "on", allowPromiseToPay: form.get("allowPromiseToPay") === "on", locale: locale.toUpperCase() as "EN" | "FR", tokenTtlSeconds: 30 * 24 * 60 * 60, idempotencyKey: commandKey("statement-delivery"), correlationId: commandKey("statement-delivery-correlation") }
      }
      if (command.statementSnapshotId !== snapshot.statementId) throw new Error(tr("This delivery belongs to another statement. Reopen the original statement before retrying.", "Cet envoi concerne un autre relevé. Rouvrez le relevé d’origine avant de réessayer."))
      persist({ ...requestsRef.current, delivery: command })
      submitted = true
      const result = await queueCustomerStatementDeliveryAction(command)
      if (!result.success) {
        if (!existed && ["VALIDATION_ERROR", "BUSINESS_RULE_VIOLATION"].includes(result.code)) persist({ ...requestsRef.current, delivery: null })
        throw new Error(messageFromResult(result))
      }
      if (!result.data) throw new Error(tr("The delivery outcome is unconfirmed.", "Le résultat de l’envoi n’est pas confirmé."))
      setDelivery(result.data)
      setMessage(result.data.replayed
        ? tr("The existing consented delivery was loaded.", "L’envoi consenti existant a été chargé.")
        : tr("Secure statement delivery queued.", "L’envoi sécurisé du relevé a été mis en file d’attente."))
    } catch (caught) {
      const detail = caught instanceof Error ? caught.message : tr("Statement delivery failed.", "L’envoi du relevé a échoué.")
      setMessage((submitted && requestsRef.current.delivery
        ? tr("Outcome unconfirmed. Retry the existing request; do not send another copy yet. ", "Résultat non confirmé. Réessayez la demande existante ; n’envoyez pas encore une autre copie. ")
        : "") + detail)
    } finally { operationLock.current = false; setDelivering(false) }
  }

  function startAnotherStatement() {
    if (operationLock.current || requestsRef.current.retry || unresolvedDelivery || !snapshot) return
    try { persist({ statement: null, delivery: null }); setSnapshot(null); setDelivery(null); setMessage(null) }
    catch { setMessage(tr("Could not update local recovery information. Check browser session storage and try again.", "Impossible de mettre à jour les informations locales de reprise. Vérifiez le stockage de session du navigateur puis réessayez.")) }
  }

  function startAnotherDelivery() {
    if (operationLock.current || !delivery) return
    try { persist({ ...requestsRef.current, delivery: null }); setDelivery(null); setDeliveryFormVersion(value => value + 1); setMessage(null) }
    catch { setMessage(tr("Could not update local recovery information. Check browser session storage and try again.", "Impossible de mettre à jour les informations locales de reprise. Vérifiez le stockage de session du navigateur puis réessayez.")) }
  }

  function openHistoricalStatement(record: CustomerStatementSummary) {
    if (operationLock.current || requestsRef.current.retry || !canCreateNew || !recoveryReady || record.truncated || requestsRef.current.statement || (requestsRef.current.delivery && requestsRef.current.delivery.statementSnapshotId !== record.statementId)) return
    try {
      persist({ ...requestsRef.current, historicalStatementId: record.statementId })
      setSnapshot(record); setDelivery(null); setDeliveryFormVersion(value => value + 1)
      setPeriodStartValue(record.periodStart.slice(0, 10)); setPeriodEndValue(record.periodEnd.slice(0, 10))
      setMessage(tr("The saved statement was opened. No new statement or delivery was created. Review previous deliveries before requesting another copy.", "Le relevé enregistré a été ouvert. Aucun relevé ni envoi n’a été créé. Consultez les envois précédents avant de demander une autre copie."))
    } catch (caught) { setMessage(caught instanceof Error ? caught.message : tr("The saved statement could not be opened.", "Le relevé enregistré n’a pas pu être ouvert.")) }
  }

  async function revokeHistoricalAccess(tokenId: string, reason: string, password: string) {
    if (operationLock.current || !canCreateNew) throw new Error(tr("Another operation is running or new-work access is unavailable.", "Une autre opération est en cours ou les nouveaux traitements sont indisponibles."))
    operationLock.current = true; setRevokingAccess(true)
    try {
      await requireFreshPassword(password, locale)
      const result = await revokeCustomerStatementAccessAction({ tokenId, reason }).catch(() => {
        throw new Error(tr("Revocation outcome is unconfirmed. Retry the same link to check its result safely.", "Le résultat de la révocation n’est pas confirmé. Réessayez pour le même lien afin de vérifier son résultat sans doublon."))
      })
      if (!result.success) throw new Error(tr("Revocation could not be confirmed. Recheck your access and retry the same link.", "La révocation n’a pas pu être confirmée. Vérifiez vos droits et réessayez pour le même lien."))
    } finally { operationLock.current = false; setRevokingAccess(false) }
  }

  async function retryHistoricalDelivery(command: Omit<RetryCustomerStatementInput, "idempotencyKey" | "customerId">, password: string) {
    if (operationLock.current || !canCreateNew || !recoveryReady) throw new Error(tr("Another operation is running or access is unavailable.", "Une autre opération est en cours ou l’accès est indisponible."))
    operationLock.current = true; setRevokingAccess(true)
    try {
      const retained = requestsRef.current.retry ?? { ...command, customerId: customer.id, idempotencyKey: globalThis.crypto.randomUUID() }
      persist({ ...requestsRef.current, retry: retained })
      await requireFreshPassword(password, locale)
      const result = await retryCustomerStatementDeliveryAction(retained).catch(() => {
        throw new Error(tr("The retry request is unconfirmed. Keep this request and check it again after reconnecting.", "La demande de reprise n’est pas confirmée. Conservez-la et vérifiez-la après reconnexion."))
      })
      if (!result.success) {
        if (["CONFLICT", "BUSINESS_RULE_VIOLATION", "IDEMPOTENCY_CONFLICT", "NOT_FOUND", "VALIDATION_ERROR"].includes(result.code)) {
          persist({ ...requestsRef.current, retry: undefined })
          throw new Error(tr("This retry was not accepted. Refresh the record and review its current state before another request.", "Cette reprise n’a pas été acceptée. Actualisez le relevé et vérifiez son état actuel avant une autre demande."))
        }
        throw new Error(tr("Retry could not be confirmed. Check your current access and use the retained request again.", "La reprise n’a pas pu être confirmée. Vérifiez vos droits et réutilisez la demande conservée."))
      }
      persist({ ...requestsRef.current, retry: undefined })
    } finally { operationLock.current = false; setRevokingAccess(false) }
  }

  return (
    <div className="min-w-0 space-y-6 [overflow-wrap:anywhere] text-[var(--dash-text)]">
      <header className="rounded-2xl border border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] p-4 shadow-sm sm:p-6">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--dash-brand-strong)]">
          {tr("Customer receivable proof", "Preuve de créance client")}
        </p>
        <h1 className="mt-2 text-3xl font-black">{tr("Customer statement", "Relevé client")}</h1>
        <p className="mt-2 text-[var(--dash-text-soft)]">
          {tr("Freeze a trustworthy receivable snapshot for", "Figez un instantané fiable des créances de")} {customer.name}, {tr("then share it through a consented, expiring, revocable channel.", "puis partagez-le via un canal consenti, temporaire et révocable.")}
        </p>
        <Link
          className="mt-4 inline-block text-sm font-bold text-[var(--dash-brand-strong)] underline"
          href={localizePath("/dashboard/customers/" + customer.id, locale)}
        >
          {tr("Back to customer", "Retour au client")}
        </Link>
      </header>

      <CustomerStatementHistory customerId={customer.id} locale={locale} initialStatementId={requests.retry?.statementId ?? requests.historicalStatementId} pendingStatementId={requests.delivery?.statementSnapshotId} busy={working} canOpen={canCreateNew && recoveryReady && !requests.statement && !requests.retry} canRevoke={canCreateNew} onOpen={openHistoricalStatement} onRevoke={revokeHistoricalAccess} canRetry={canCreateNew && recoveryReady} pendingRetry={requests.retry} onRetry={retryHistoricalDelivery} />
      {!canCreateNew ? <p role="status" className="rounded-lg border border-[var(--dash-warning)] p-3 text-sm">{tr("You can review retained history. Generating statements, requesting deliveries and revoking links are unavailable under the current module access.", "Vous pouvez consulter l’historique conservé. La création de relevés, les demandes d’envoi et la révocation des liens sont indisponibles avec l’accès actuel au module.")}</p> : null}
      {requests.historicalStatementId ? <p role="status" className="text-sm">{tr("A saved statement is selected. After reload, choose Open saved statement, then Resume this statement to confirm its current record before continuing.", "Un relevé enregistré est sélectionné. Après actualisation, choisissez Ouvrir le relevé conservé, puis Reprendre ce relevé pour vérifier son enregistrement avant de continuer.")}</p> : null}

      <section className="rounded-2xl border border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] p-4 shadow-sm sm:p-6">
        <h2 className="text-xl font-black">{requests.historicalStatementId ? tr("1. Saved statement", "1. Relevé enregistré") : tr("1. Freeze statement snapshot", "1. Figer l’instantané du relevé")}</h2>
        <p role="status" className="mt-3 text-sm text-[var(--dash-text-soft)]">{recoveryFailed ? tr("Stored recovery information could not be read. Do not create another request until the previous outcome has been checked. Ask your operator to review this customer’s statement and delivery records.", "Les informations de reprise sont illisibles. Ne créez pas une autre demande avant d’avoir vérifié le résultat précédent. Demandez à votre opérateur de consulter les relevés et envois de ce client.") : !recoveryReady ? tr("Loading request recovery…", "Chargement de la reprise…") : requests.statement ? tr("A previous request is retained in this tab. Re-enter your password to check the same request. No stored result is treated as confirmation.", "Une demande précédente est conservée dans cet onglet. Ressaisissez votre mot de passe pour vérifier la même demande. Aucun résultat local n’est considéré comme une confirmation.") : tr("Request details are retained in this tab for safe retry, including the recipient but never your password. A queued request is not proof of delivery.", "Les détails de la demande, dont le destinataire mais jamais le mot de passe, sont conservés dans cet onglet pour une reprise sans doublon. Une mise en file ne prouve pas la livraison.")}</p>
        {!requests.historicalStatementId ? <form className="mt-5 grid gap-4 sm:grid-cols-3" onSubmit={createStatement}>
          <label className="text-sm font-bold">
            {tr("Period start", "Début de période")}
            <input className="dashboard-control mt-1 w-full rounded-lg" disabled={creating || delivering || Boolean(requests.statement)} name="periodStart" onChange={(event) => setPeriodStartValue(event.target.value)} required type="date" value={periodStartValue} />
          </label>
          <label className="text-sm font-bold">
            {tr("Period end", "Fin de période")}
            <input className="dashboard-control mt-1 w-full rounded-lg" disabled={creating || delivering || Boolean(requests.statement)} name="periodEnd" onChange={(event) => setPeriodEndValue(event.target.value)} required type="date" value={periodEndValue} />
          </label>
          <label className="text-sm font-bold">
            {tr("Currency", "Devise")}
            <input aria-readonly="true" className="dashboard-control mt-1 w-full rounded-lg uppercase" name="currency" readOnly value={currency} />
          </label>
          <label className="text-sm font-bold sm:col-span-3">
            {tr("Confirm your current password", "Confirmez votre mot de passe actuel")}
            <input autoComplete="current-password" className="dashboard-control mt-1 w-full rounded-lg sm:max-w-md" name="password" required type="password" />
          </label>
          <button className="w-fit max-w-full rounded-lg bg-[var(--dash-brand)] px-3 py-3 text-sm font-black text-white disabled:opacity-50 sm:col-span-3 sm:px-5" disabled={working || Boolean(requests.retry) || !canCreateNew || Boolean(requests.historicalStatementId) || !recoveryReady || (unresolvedDelivery && Boolean(snapshot))} type="submit">
            {creating ? tr("Freezing…", "Création…") : requests.statement ? tr("Retry existing statement request", "Vérifier la demande de relevé existante") : tr("Generate immutable statement", "Générer le relevé immuable")}
          </button>
        </form> : <p className="mt-3 text-sm">{tr("This uses the saved period and recorded balance. Creating a new snapshot is a separate action.", "Cette opération utilise la période et le solde enregistrés. La création d’un nouvel instantané est une action distincte.")}</p>}
        {snapshot ? <button type="button" disabled={working || Boolean(requests.retry) || unresolvedDelivery} className="mt-4 min-h-11 rounded-lg border border-[var(--dash-border-subtle)] px-4 py-2 text-sm disabled:opacity-50" onClick={startAnotherStatement}>{tr("Start a new statement", "Préparer un nouveau relevé")}</button> : null}
      </section>

      {snapshot ? (
        <section className="rounded-2xl border border-[var(--dash-success)]/30 bg-[var(--dash-success-soft)] p-4 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-black">{snapshot.statementNumber}</h2>
              <p className="mt-1 text-sm">{tr("Version", "Version")} {snapshot.version} · {snapshot.itemCount} {tr("open items", "éléments ouverts")}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold uppercase">{tr("Closing balance", "Solde de clôture")}</p>
              <p className="text-2xl font-black">{snapshot.closingBalance} {snapshot.currency}</p>
            </div>
          </div>
          <div className="mt-4 grid gap-2 text-xs text-[var(--dash-text-soft)] sm:grid-cols-2">
            <p>
              {tr("As of", "À la date du")}:{" "}
              {new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(snapshot.asOf))}
            </p>
            <p>
              {tr("Recorded through", "Enregistré jusqu’au")}:{" "}
              {new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(snapshot.recordedThrough))}
            </p>
          </div>
          {snapshot.truncated ? (
            <p className="mt-3 rounded-lg border border-[var(--dash-warning)] bg-[var(--dash-warning-soft)] p-3 text-sm text-[var(--dash-warning)]">
              {tr(
                "This snapshot reached its item limit. Review the supporting export before relying on the balance.",
                "Cet instantané a atteint sa limite d’éléments. Vérifiez l’export justificatif avant de vous appuyer sur le solde.",
              )}
            </p>
          ) : null}
          <p className="mt-4 break-all font-mono text-xs" title={snapshot.contentHash}>
            {tr("Content hash", "Empreinte du contenu")}: {snapshot.contentHash}
          </p>
        </section>
      ) : null}

      {snapshot ? (
        <section className="rounded-2xl border border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] p-4 shadow-sm sm:p-6">
          <h2 className="text-xl font-black">{tr("2. Share with explicit consent", "2. Partager avec consentement explicite")}</h2>
          <p className="mt-1 text-sm text-[var(--dash-text-soft)]">
            {tr("Raw destinations and access tokens are sealed for the provider; audit records retain hashes and redacted values only.", "Les destinations brutes et les jetons d’accès sont scellés pour le fournisseur ; les traces d’audit ne conservent que les empreintes et les valeurs masquées.")}
          </p>
          <form key={deliveryFormVersion} className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={deliverStatement}>
            <div className="text-sm font-bold">
              <label htmlFor={channelInputId}>{tr("Channel", "Canal")}</label>
              <select id={channelInputId} disabled={delivering || creating || Boolean(requests.delivery)} className="dashboard-control mt-1 w-full rounded-lg" onChange={(event) => setChannel(event.target.value as typeof channel)} value={channel}>
                <option value="EMAIL">{tr("Email", "E-mail")}</option>
                <option value="WHATSAPP">WhatsApp</option>
              </select>
            </div>
            <label className="text-sm font-bold">
              {tr("Destination", "Destination")}
              <input className="dashboard-control mt-1 w-full rounded-lg" disabled={delivering || creating || Boolean(requests.delivery)} defaultValue={requests.delivery?.destination ?? (channel === "EMAIL" ? customer.email || "" : "")} key={channel} name="destination" required type={channel === "EMAIL" ? "email" : "tel"} />
            </label>
            <label className="flex items-start gap-3 rounded-lg border p-4 text-sm sm:col-span-2">
              <input disabled={delivering || creating || Boolean(requests.delivery)} defaultChecked={Boolean(requests.delivery)} className="mt-1" name="consentConfirmed" required type="checkbox" />
              <span>{tr("I confirm the customer explicitly requested or approved delivery of this exact statement through this channel.", "Je confirme que le client a explicitement demandé ou approuvé l’envoi de ce relevé précis par ce canal.")}</span>
            </label>
            <label className="flex items-center gap-3 text-sm font-bold">
              <input disabled={delivering || creating || Boolean(requests.delivery)} defaultChecked={requests.delivery?.allowDispute ?? true} name="allowDispute" type="checkbox" />
              {tr("Allow disputes", "Autoriser les contestations")}
            </label>
            <label className="flex items-center gap-3 text-sm font-bold">
              <input disabled={delivering || creating || Boolean(requests.delivery)} defaultChecked={requests.delivery?.allowPromiseToPay ?? true} name="allowPromiseToPay" type="checkbox" />
              {tr("Allow promises to pay", "Autoriser les promesses de paiement")}
            </label>
            <label className="text-sm font-bold sm:col-span-2">
              {tr("Confirm your current password", "Confirmez votre mot de passe actuel")}
              <input autoComplete="current-password" className="dashboard-control mt-1 w-full rounded-lg sm:max-w-md" name="password" required type="password" />
            </label>
            <button className="w-fit max-w-full rounded-lg bg-[var(--dash-brand)] px-3 py-3 text-sm font-black text-white disabled:opacity-50 sm:col-span-2 sm:px-5" disabled={working || Boolean(requests.retry) || !canCreateNew || !recoveryReady || snapshot.truncated} type="submit">
              {delivering ? tr("Queueing…", "Mise en file…") : requests.delivery ? tr("Retry existing delivery request", "Vérifier la demande d’envoi existante") : tr("Queue secure delivery", "Mettre l’envoi sécurisé en file")}
            </button>
          </form>
          {requests.delivery ? <p className="mt-3 text-sm text-[var(--dash-text-soft)]">{tr("These are the originally submitted details. Retrying preserves the same consent time, recipient and access permissions.", "Il s’agit des détails transmis à l’origine. La reprise conserve la même date de consentement, le destinataire et les droits d’accès.")}</p> : null}
          {delivery ? <button type="button" disabled={creating || delivering} className="mt-4 min-h-11 rounded-lg border border-[var(--dash-border-subtle)] px-4 py-2 text-sm disabled:opacity-50" onClick={startAnotherDelivery}>{tr("Prepare another delivery", "Préparer un autre envoi")}</button> : null}
        </section>
      ) : null}

      {delivery ? (
        <section className="rounded-2xl border border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] p-4 sm:p-6">
          <h2 className="text-xl font-black">{tr("Delivery request", "Demande d’envoi")} : {deliveryStatus[delivery.status]}</h2>
          <p className="mt-2 text-sm">{tr("Last confirmed request result. Queuing or provider acceptance does not prove recipient delivery or reading.", "Dernier résultat confirmé de la demande. La mise en file ou l’acceptation par le fournisseur ne prouve ni la livraison ni la lecture par le destinataire.")}</p>
          <p className="mt-2 text-sm">
            {delivery.channel === "EMAIL" ? tr("Email", "E-mail") : "WhatsApp"} {tr("to", "vers")} {delivery.redactedDestination}. {tr("Scheduled access expiry", "Expiration prévue de l’accès")}{" "}
            {new Date(delivery.expiresAt).toLocaleString(locale === "fr" ? "fr-FR" : "en-US")}.
          </p>
          <p className="mt-2 text-xs font-bold">
            {tr("Referral code", "Code de parrainage")}: {delivery.referralCode}
          </p>
        </section>
      ) : null}

      <CustomerStatementResponses organizationId={organizationId} actorId={actorId} customerId={customer.id} locale={locale} />
      <p aria-live="polite" className="rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] p-4 text-sm">
        {message || tr("No operation is currently running.", "Aucune opération n’est en cours.")}
      </p>
    </div>
  )
}
