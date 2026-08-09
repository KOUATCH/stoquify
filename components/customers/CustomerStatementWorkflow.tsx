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
  customer,
  locale,
}: {
  customer: CustomerSummary
  locale: Locale
}) {
  const today = new Date()
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const [snapshot, setSnapshot] =
    useState<CustomerStatementSnapshotResult | null>(null)
  const [delivery, setDelivery] =
    useState<CustomerStatementDeliveryResult | null>(null)
  const [creating, setCreating] = useState(false)
  const [delivering, setDelivering] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [channel, setChannel] = useState<"EMAIL" | "WHATSAPP">("EMAIL")

  async function createStatement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setCreating(true)
    setMessage(null)
    setDelivery(null)
    try {
      await requireFreshPassword(String(form.get("password") || ""))
      const periodStart = String(form.get("periodStart"))
      const periodEnd = String(form.get("periodEnd"))
      const result = await createCustomerStatementAction({
        customerId: customer.id,
        periodStart: periodStart + "T00:00:00.000Z",
        periodEnd: statementPeriodEnd(periodEnd),
        currency: form.get("currency"),
        idempotencyKey: commandKey("customer-statement"),
        correlationId: commandKey("customer-statement-correlation"),
      })
      if (!result.success || !result.data) {
        throw new Error(messageFromResult(result))
      }
      setSnapshot(result.data)
      setMessage(
        result.data.replayed
          ? "The existing immutable statement was loaded."
          : "Immutable statement created and content-hashed.",
      )
    } catch (caught) {
      setMessage(
        caught instanceof Error ? caught.message : "Statement creation failed.",
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
      setMessage("Confirm explicit customer consent before delivery.")
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
          ? "The existing consented delivery was loaded."
          : "Secure statement delivery queued.",
      )
    } catch (caught) {
      setMessage(
        caught instanceof Error ? caught.message : "Statement delivery failed.",
      )
    } finally {
      setDelivering(false)
    }
  }

  return (
    <div className="space-y-6 text-[var(--dash-text)]">
      <header className="rounded-2xl border border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] p-6 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--dash-brand-strong)]">
          Referral-ready customer proof
        </p>
        <h1 className="mt-2 text-3xl font-black">Customer statement</h1>
        <p className="mt-2 text-[var(--dash-text-soft)]">
          Freeze a trustworthy receivable snapshot for {customer.name}, then
          share it through a consented, expiring, revocable channel.
        </p>
        <Link
          className="mt-4 inline-block text-sm font-bold text-[var(--dash-brand-strong)] underline"
          href={localizePath("/dashboard/customers", locale)}
        >
          Back to customers
        </Link>
      </header>

      <section className="rounded-2xl border border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] p-6 shadow-sm">
        <h2 className="text-xl font-black">1. Freeze statement snapshot</h2>
        <form className="mt-5 grid gap-4 sm:grid-cols-3" onSubmit={createStatement}>
          <label className="text-sm font-bold">
            Period start
            <input className="mt-1 w-full rounded-lg border bg-background p-3" defaultValue={localDate(firstOfMonth)} name="periodStart" required type="date" />
          </label>
          <label className="text-sm font-bold">
            Period end
            <input className="mt-1 w-full rounded-lg border bg-background p-3" defaultValue={localDate(today)} name="periodEnd" required type="date" />
          </label>
          <label className="text-sm font-bold">
            Currency
            <input className="mt-1 w-full rounded-lg border bg-background p-3 uppercase" defaultValue="XAF" maxLength={3} minLength={3} name="currency" required />
          </label>
          <label className="text-sm font-bold sm:col-span-3">
            Confirm your current password
            <input autoComplete="current-password" className="mt-1 w-full rounded-lg border bg-background p-3 sm:max-w-md" name="password" required type="password" />
          </label>
          <button className="w-fit rounded-lg bg-[var(--dash-brand)] px-5 py-3 text-sm font-black text-white disabled:opacity-50 sm:col-span-3" disabled={creating} type="submit">
            {creating ? "Freezing…" : "Generate immutable statement"}
          </button>
        </form>
      </section>

      {snapshot ? (
        <section className="rounded-2xl border border-[var(--dash-success)]/30 bg-[var(--dash-success-soft)] p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-black">{snapshot.statementNumber}</h2>
              <p className="mt-1 text-sm">Version {snapshot.version} · {snapshot.itemCount} open items</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold uppercase">Closing balance</p>
              <p className="text-2xl font-black">{snapshot.closingBalance} {snapshot.currency}</p>
            </div>
          </div>
          <p className="mt-4 break-all font-mono text-xs" title={snapshot.contentHash}>
            Content hash: {snapshot.contentHash}
          </p>
        </section>
      ) : null}

      {snapshot ? (
        <section className="rounded-2xl border border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] p-6 shadow-sm">
          <h2 className="text-xl font-black">2. Share with explicit consent</h2>
          <p className="mt-1 text-sm text-[var(--dash-text-soft)]">
            Raw destinations and access tokens are sealed for the provider;
            audit records retain hashes and redacted values only.
          </p>
          <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={deliverStatement}>
            <label className="text-sm font-bold">
              Channel
              <select className="mt-1 w-full rounded-lg border bg-background p-3" onChange={(event) => setChannel(event.target.value as typeof channel)} value={channel}>
                <option value="EMAIL">Email</option>
                <option value="WHATSAPP">WhatsApp</option>
              </select>
            </label>
            <label className="text-sm font-bold">
              Destination
              <input className="mt-1 w-full rounded-lg border bg-background p-3" defaultValue={channel === "EMAIL" ? customer.email || "" : ""} key={channel} name="destination" required type={channel === "EMAIL" ? "email" : "tel"} />
            </label>
            <label className="flex items-start gap-3 rounded-lg border p-4 text-sm sm:col-span-2">
              <input className="mt-1" name="consentConfirmed" required type="checkbox" />
              <span>I confirm the customer explicitly requested or approved delivery of this exact statement through this channel.</span>
            </label>
            <label className="flex items-center gap-3 text-sm font-bold">
              <input defaultChecked name="allowDispute" type="checkbox" />
              Allow disputes
            </label>
            <label className="flex items-center gap-3 text-sm font-bold">
              <input defaultChecked name="allowPromiseToPay" type="checkbox" />
              Allow promises to pay
            </label>
            <label className="text-sm font-bold sm:col-span-2">
              Confirm your current password
              <input autoComplete="current-password" className="mt-1 w-full rounded-lg border bg-background p-3 sm:max-w-md" name="password" required type="password" />
            </label>
            <button className="w-fit rounded-lg bg-[var(--dash-brand)] px-5 py-3 text-sm font-black text-white disabled:opacity-50 sm:col-span-2" disabled={delivering} type="submit">
              {delivering ? "Queueing…" : "Queue secure delivery"}
            </button>
          </form>
        </section>
      ) : null}

      {delivery ? (
        <section className="rounded-2xl border border-[var(--dash-brand)]/30 bg-[var(--dash-brand-soft)] p-6">
          <h2 className="text-xl font-black">Delivery {delivery.status}</h2>
          <p className="mt-2 text-sm">
            {delivery.channel} to {delivery.redactedDestination}. Access expires{" "}
            {new Date(delivery.expiresAt).toLocaleString()}.
          </p>
          <p className="mt-2 text-xs font-bold">
            Referral code: {delivery.referralCode}
          </p>
        </section>
      ) : null}

      <p aria-live="polite" className="rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] p-4 text-sm">
        {message || "No operation is currently running."}
      </p>
    </div>
  )
}
