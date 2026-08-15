"use client"

import { type FormEvent, useState } from "react"
import Link from "next/link"

import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"
import {
  createCustomerStatementAction,
  queueCustomerStatementDeliveryAction,
} from "@/actions/accounting/customer-statement.actions"
import { localizePath } from "@/i18n/routing"
import type { CustomerStatementSnapshotResult } from "@/services/accounting/customer-statement.service"
import type { CustomerStatementDeliveryResult } from "@/services/accounting/customer-statement-delivery.service"
import type { Locale } from "@/types/bilingual"

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

async function requireFreshPassword(password: string) {
  const result = await stepUpWithPasswordAction({ password })
  if (result.success) return
  if (result.code === "RATE_LIMITED") {
    throw new Error(
      "Too many authentication attempts. Try again in " +
        Math.max(1, result.retryAfterSeconds ?? 1) +
        " seconds.",
    )
  }
  if (result.code === "AUTH_REQUIRED") {
    throw new Error("Your session expired. Sign in again before continuing.")
  }
  throw new Error(result.error || "Authentication could not be verified.")
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
}: {
  currency: string
  customer: CustomerSummary
  locale: Locale
}) {
  const today = new Date()
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const [periodStartValue, setPeriodStartValue] = useState(localDate(firstOfMonth))
  const [periodEndValue, setPeriodEndValue] = useState(localDate(today))
  const [snapshot, setSnapshot] =
    useState<CustomerStatementSnapshotResult | null>(null)
  const [delivery, setDelivery] =
    useState<CustomerStatementDeliveryResult | null>(null)
  const [creating, setCreating] = useState(false)
  const [delivering, setDelivering] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [channel, setChannel] = useState<"EMAIL" | "WHATSAPP">("EMAIL")
  const tr = (english: string, french: string) => locale === "fr" ? french : english

  async function createStatement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const periodStart = String(form.get("periodStart"))
    const periodEnd = String(form.get("periodEnd"))
    if (!periodStart || !periodEnd || periodStart > periodEnd) {
      setMessage(tr(
        "Choose a valid period whose end is on or after its start.",
        "Choisissez une période valide dont la fin est postérieure ou égale au début.",
      ))
      return
    }
    setCreating(true)
    setMessage(null)
    setDelivery(null)
    try {
      await requireFreshPassword(String(form.get("password") || ""))
      const result = await createCustomerStatementAction({
        customerId: customer.id,
        periodStart: periodStart + "T00:00:00.000Z",
        periodEnd: statementPeriodEnd(periodEnd),
        currency,
        idempotencyKey: commandKey("customer-statement"),
        correlationId: commandKey("customer-statement-correlation"),
      })
      if (!result.success || !result.data) {
        throw new Error(messageFromResult(result))
      }
      setSnapshot(result.data)
      setMessage(
        result.data.replayed
          ? tr("The existing immutable statement was loaded.", "Le relevé immuable existant a été chargé.")
          : tr("Immutable statement created and content-hashed.", "Le relevé immuable a été créé et son contenu a été haché."),
      )
    } catch (caught) {
      setMessage(
        caught instanceof Error ? caught.message : tr("Statement creation failed.", "La création du relevé a échoué."),
      )
    } finally {
      setCreating(false)
    }
  }

  async function deliverStatement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!snapshot) return
    const form = new FormData(event.currentTarget)
    const destination = String(form.get("destination") || "").trim()
    const consentConfirmed = form.get("consentConfirmed") === "on"
    if (!consentConfirmed) {
      setMessage(tr("Confirm explicit customer consent before delivery.", "Confirmez le consentement explicite du client avant l’envoi."))
      return
    }
    setDelivering(true)
    setMessage(null)
    try {
      await requireFreshPassword(String(form.get("password") || ""))
      const consentCapturedAt = new Date().toISOString()
      const evidence = await consentHash([
        "customer-statement-delivery-consent.v1",
        customer.id,
        snapshot.statementId,
        channel,
        destination.toLowerCase(),
        consentCapturedAt,
        "explicit-client-confirmation",
      ].join("|"))
      const result = await queueCustomerStatementDeliveryAction({
        statementSnapshotId: snapshot.statementId,
        channel,
        destination,
        consentBasis: "EXPLICIT",
        consentEvidenceHash: evidence,
        consentCapturedAt,
        allowDispute: form.get("allowDispute") === "on",
        allowPromiseToPay: form.get("allowPromiseToPay") === "on",
        locale: locale.toUpperCase(),
        tokenTtlSeconds: 30 * 24 * 60 * 60,
        idempotencyKey: commandKey("statement-delivery"),
        correlationId: commandKey("statement-delivery-correlation"),
      })
      if (!result.success || !result.data) {
        throw new Error(messageFromResult(result))
      }
      setDelivery(result.data)
      setMessage(
        result.data.replayed
          ? tr("The existing consented delivery was loaded.", "L’envoi consenti existant a été chargé.")
          : tr("Secure statement delivery queued.", "L’envoi sécurisé du relevé a été mis en file d’attente."),
      )
    } catch (caught) {
      setMessage(
        caught instanceof Error ? caught.message : tr("Statement delivery failed.", "L’envoi du relevé a échoué."),
      )
    } finally {
      setDelivering(false)
    }
  }

  return (
    <div className="space-y-6 text-[var(--dash-text)]">
      <header className="rounded-2xl border border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] p-6 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--dash-brand-strong)]">
          {tr("Customer receivable proof", "Preuve de créance client")}
        </p>
        <h1 className="mt-2 text-3xl font-black">{tr("Customer statement", "Relevé client")}</h1>
        <p className="mt-2 text-[var(--dash-text-soft)]">
          {tr("Freeze a trustworthy receivable snapshot for", "Figez un instantané fiable des créances de")} {customer.name}, {tr("then", "puis")}
          {tr("share it through a consented, expiring, revocable channel.", "partagez-le via un canal consenti, temporaire et révocable.")}
        </p>
        <Link
          className="mt-4 inline-block text-sm font-bold text-[var(--dash-brand-strong)] underline"
          href={localizePath("/dashboard/customers/" + customer.id, locale)}
        >
          {tr("Back to customer", "Retour au client")}
        </Link>
      </header>

      <section className="rounded-2xl border border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] p-6 shadow-sm">
        <h2 className="text-xl font-black">{tr("1. Freeze statement snapshot", "1. Figer l’instantané du relevé")}</h2>
        <form className="mt-5 grid gap-4 sm:grid-cols-3" onSubmit={createStatement}>
          <label className="text-sm font-bold">
            {tr("Period start", "Début de période")}
            <input className="dashboard-control mt-1 w-full rounded-lg" name="periodStart" onChange={(event) => setPeriodStartValue(event.target.value)} required type="date" value={periodStartValue} />
          </label>
          <label className="text-sm font-bold">
            {tr("Period end", "Fin de période")}
            <input className="dashboard-control mt-1 w-full rounded-lg" name="periodEnd" onChange={(event) => setPeriodEndValue(event.target.value)} required type="date" value={periodEndValue} />
          </label>
          <label className="text-sm font-bold">
            {tr("Currency", "Devise")}
            <input aria-readonly="true" className="dashboard-control mt-1 w-full rounded-lg uppercase" name="currency" readOnly value={currency} />
          </label>
          <label className="text-sm font-bold sm:col-span-3">
            {tr("Confirm your current password", "Confirmez votre mot de passe actuel")}
            <input autoComplete="current-password" className="dashboard-control mt-1 w-full rounded-lg sm:max-w-md" name="password" required type="password" />
          </label>
          <button className="w-fit rounded-lg bg-[var(--dash-brand)] px-5 py-3 text-sm font-black text-white disabled:opacity-50 sm:col-span-3" disabled={creating} type="submit">
            {creating ? tr("Freezing…", "Création…") : tr("Generate immutable statement", "Générer le relevé immuable")}
          </button>
        </form>
      </section>

      {snapshot ? (
        <section className="rounded-2xl border border-[var(--dash-success)]/30 bg-[var(--dash-success-soft)] p-6">
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
        <section className="rounded-2xl border border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] p-6 shadow-sm">
          <h2 className="text-xl font-black">{tr("2. Share with explicit consent", "2. Partager avec consentement explicite")}</h2>
          <p className="mt-1 text-sm text-[var(--dash-text-soft)]">
            {tr("Raw destinations and access tokens are sealed for the provider;", "Les destinations brutes et les jetons d’accès sont scellés pour le fournisseur ;")}
            {tr("audit records retain hashes and redacted values only.", "les traces d’audit ne conservent que les empreintes et les valeurs masquées.")}
          </p>
          <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={deliverStatement}>
            <label className="text-sm font-bold">
              {tr("Channel", "Canal")}
              <select className="dashboard-control mt-1 w-full rounded-lg" onChange={(event) => setChannel(event.target.value as typeof channel)} value={channel}>
                <option value="EMAIL">Email</option>
                <option value="WHATSAPP">WhatsApp</option>
              </select>
            </label>
            <label className="text-sm font-bold">
              {tr("Destination", "Destination")}
              <input className="dashboard-control mt-1 w-full rounded-lg" defaultValue={channel === "EMAIL" ? customer.email || "" : ""} key={channel} name="destination" required type={channel === "EMAIL" ? "email" : "tel"} />
            </label>
            <label className="flex items-start gap-3 rounded-lg border p-4 text-sm sm:col-span-2">
              <input className="mt-1" name="consentConfirmed" required type="checkbox" />
              <span>{tr("I confirm the customer explicitly requested or approved delivery of this exact statement through this channel.", "Je confirme que le client a explicitement demandé ou approuvé l’envoi de ce relevé précis par ce canal.")}</span>
            </label>
            <label className="flex items-center gap-3 text-sm font-bold">
              <input defaultChecked name="allowDispute" type="checkbox" />
              {tr("Allow disputes", "Autoriser les contestations")}
            </label>
            <label className="flex items-center gap-3 text-sm font-bold">
              <input defaultChecked name="allowPromiseToPay" type="checkbox" />
              {tr("Allow promises to pay", "Autoriser les promesses de paiement")}
            </label>
            <label className="text-sm font-bold sm:col-span-2">
              {tr("Confirm your current password", "Confirmez votre mot de passe actuel")}
              <input autoComplete="current-password" className="dashboard-control mt-1 w-full rounded-lg sm:max-w-md" name="password" required type="password" />
            </label>
            <button className="w-fit rounded-lg bg-[var(--dash-brand)] px-5 py-3 text-sm font-black text-white disabled:opacity-50 sm:col-span-2" disabled={delivering} type="submit">
              {delivering ? tr("Queueing…", "Mise en file…") : tr("Queue secure delivery", "Mettre l’envoi sécurisé en file")}
            </button>
          </form>
        </section>
      ) : null}

      {delivery ? (
        <section className="rounded-2xl border border-[var(--dash-brand)]/30 bg-[var(--dash-brand-soft)] p-6">
          <h2 className="text-xl font-black">{tr("Delivery", "Envoi")} {delivery.status}</h2>
          <p className="mt-2 text-sm">
            {delivery.channel} {tr("to", "vers")} {delivery.redactedDestination}. {tr("Access expires", "L’accès expire")}{" "}
            {new Date(delivery.expiresAt).toLocaleString(locale === "fr" ? "fr-FR" : "en-US")}.
          </p>
          <p className="mt-2 text-xs font-bold">
            {tr("Referral code", "Code de parrainage")}: {delivery.referralCode}
          </p>
        </section>
      ) : null}

      <p aria-live="polite" className="rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] p-4 text-sm">
        {message || tr("No operation is currently running.", "Aucune opération n’est en cours.")}
      </p>
    </div>
  )
}
