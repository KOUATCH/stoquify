"use client"

import {
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { useSearchParams } from "next/navigation"

type StatementLine = {
  customerReceivableDocumentId: string
  documentNumber: string
  invoiceDate: string
  dueDate: string
  status: string
  daysPastDue: number
  debitAmount: string
  periodCreditAmount: string
  closingBalance: string
}

type StatementPayload = {
  organization?: {
    name?: string
    tradeName?: string | null
    taxIdentifier?: string | null
    address?: string | null
    country?: string | null
  }
  customer?: {
    name?: string
    code?: string | null
  }
  balances?: {
    opening?: string
    periodDebits?: string
    periodCredits?: string
    closing?: string
    overdue?: string
  }
  lines?: StatementLine[]
}

type PublicStatement = {
  statementId: string
  statementNumber: string
  version: number
  contentHash: string
  currency: string
  periodStart: string
  periodEnd: string
  expiresAt: string
  permissions: Array<"view" | "dispute" | "promise_to_pay">
  responseHash: string
  payload: StatementPayload
  branding: {
    poweredBy: "Stoquify"
    referralCode: string | null
    referralUrl: string | null
  }
  controls: {
    redacted: true
    rawTokenStored: false
    requestMetadataHashed: true
  }
}

type ApiEnvelope<T> = {
  success: boolean
  data?: T
  error?: string | { message?: string }
  message?: string
}

function errorMessage(value: ApiEnvelope<unknown> | null) {
  if (typeof value?.error === "string" && value.error) return value.error
  if (
    value?.error &&
    typeof value.error === "object" &&
    typeof value.error.message === "string"
  ) {
    return value.error.message
  }
  return value?.message || "This statement link is unavailable."
}

function actionIdentity(prefix: string) {
  const random = globalThis.crypto?.randomUUID?.()
  return prefix + ":" + (random || Date.now().toString(36))
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
      }).format(date)
}

function money(value: string | undefined, currency: string) {
  const amount = Number(value ?? 0)
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      currencyDisplay: "code",
    }).format(Number.isFinite(amount) ? amount : 0)
  } catch {
    return (Number.isFinite(amount) ? amount : 0).toFixed(2) + " " + currency
  }
}

function hashLabel(value: string) {
  return value.length > 24
    ? value.slice(0, 12) + "…" + value.slice(-12)
    : value
}

export function CustomerStatementPortal({
  statementId,
}: {
  statementId: string
}) {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")?.trim() ?? ""
  const [statement, setStatement] = useState<PublicStatement | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionType, setActionType] = useState<
    "DISPUTE" | "PROMISE_TO_PAY"
  >("PROMISE_TO_PAY")
  const [submitting, setSubmitting] = useState(false)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const identity = useRef({
    idempotencyKey: actionIdentity("statement-recipient"),
    correlationId: actionIdentity("statement-correlation"),
  })

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      if (!token) {
        setError("This statement link is incomplete.")
        setLoading(false)
        return
      }
      try {
        const response = await fetch(
          "/api/customer-statements/" +
            encodeURIComponent(statementId) +
            "?token=" +
            encodeURIComponent(token),
          {
            cache: "no-store",
            credentials: "omit",
            referrerPolicy: "no-referrer",
            signal: controller.signal,
          },
        )
        const body = await response.json() as ApiEnvelope<PublicStatement>
        if (!response.ok || !body.success || !body.data) {
          throw new Error(errorMessage(body))
        }
        setStatement(body.data)
        if (
          !body.data.permissions.includes("promise_to_pay") &&
          body.data.permissions.includes("dispute")
        ) {
          setActionType("DISPUTE")
        }
      } catch (caught) {
        if ((caught as { name?: string }).name !== "AbortError") {
          setError(
            caught instanceof Error
              ? caught.message
              : "This statement link is unavailable.",
          )
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    void load()
    return () => controller.abort()
  }, [statementId, token])

  const lines = useMemo(
    () => Array.isArray(statement?.payload.lines)
      ? statement.payload.lines
      : [],
    [statement],
  )

  async function submitAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!statement || !token) return
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    setSubmitting(true)
    setActionMessage(null)
    try {
      const response = await fetch(
        "/api/customer-statements/" +
          encodeURIComponent(statementId) +
          "/actions?token=" +
          encodeURIComponent(token),
        {
          method: "POST",
          credentials: "omit",
          referrerPolicy: "no-referrer",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            actionType,
            customerReceivableDocumentId:
              form.get("customerReceivableDocumentId") || null,
            requestedAmount: form.get("requestedAmount"),
            promisedFor:
              actionType === "PROMISE_TO_PAY"
                ? form.get("promisedFor")
                : null,
            note: form.get("note"),
            ...identity.current,
          }),
        },
      )
      const body = await response.json() as ApiEnvelope<{
        replayed: boolean
      }>
      if (!response.ok || !body.success) {
        throw new Error(errorMessage(body))
      }
      setActionMessage(
        actionType === "DISPUTE"
          ? "Your dispute was recorded."
          : "Your promise to pay was recorded.",
      )
      identity.current = {
        idempotencyKey: actionIdentity("statement-recipient"),
        correlationId: actionIdentity("statement-correlation"),
      }
      formElement.reset()
    } catch (caught) {
      setActionMessage(
        caught instanceof Error
          ? caught.message
          : "Your response could not be recorded.",
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f3f7f5] px-4 py-16 text-[#132028]">
        <div className="mx-auto max-w-5xl rounded-2xl border border-[#d9e1dc] bg-white p-8 shadow-sm">
          <p role="status">Verifying your secure statement…</p>
        </div>
      </main>
    )
  }

  if (error || !statement) {
    return (
      <main className="min-h-screen bg-[#f3f7f5] px-4 py-16 text-[#132028]">
        <div className="mx-auto max-w-xl rounded-2xl border border-[#d9e1dc] bg-white p-8 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#178e83]">
            Stoquify secure statement
          </p>
          <h1 className="mt-3 text-2xl font-black">Link unavailable</h1>
          <p className="mt-3 text-sm leading-6 text-[#53675f]" role="alert">
            {error || "This statement link is unavailable."}
          </p>
          <p className="mt-5 text-sm text-[#53675f]">
            Ask the sender for a new statement link.
          </p>
        </div>
      </main>
    )
  }

  const payload = statement.payload
  const organizationName =
    payload.organization?.tradeName ||
    payload.organization?.name ||
    "Business"
  const customerName = payload.customer?.name || "Customer"
  const canDispute = statement.permissions.includes("dispute")
  const canPromise = statement.permissions.includes("promise_to_pay")
  const canRespond = canDispute || canPromise

  return (
    <main className="min-h-screen bg-[#f3f7f5] px-4 py-8 text-[#132028] sm:px-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-2xl border border-[#d9e1dc] bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#178e83]">
                Verified customer statement
              </p>
              <h1 className="mt-2 text-3xl font-black">{organizationName}</h1>
              <p className="mt-2 text-[#53675f]">
                Statement {statement.statementNumber} · Version {statement.version}
              </p>
            </div>
            <div className="rounded-xl border border-[#178e83]/25 bg-[#edf8f5] px-4 py-3 text-sm">
              <p className="font-bold">For {customerName}</p>
              <p className="mt-1 text-[#53675f]">
                {formatDate(statement.periodStart)} – {formatDate(statement.periodEnd)}
              </p>
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              ["Opening", payload.balances?.opening],
              ["Debits", payload.balances?.periodDebits],
              ["Credits", payload.balances?.periodCredits],
              ["Closing", payload.balances?.closing],
              ["Overdue", payload.balances?.overdue],
            ].map(([label, value]) => (
              <div className="rounded-xl border border-[#d9e1dc] bg-[#f8faf9] p-4" key={label}>
                <p className="text-xs font-bold uppercase tracking-wide text-[#647972]">{label}</p>
                <p className="mt-2 text-lg font-black">{money(value, statement.currency)}</p>
              </div>
            ))}
          </div>
        </header>

        <section className="overflow-hidden rounded-2xl border border-[#d9e1dc] bg-white shadow-sm">
          <div className="border-b border-[#d9e1dc] p-5">
            <h2 className="text-xl font-black">Open receivables</h2>
            <p className="mt-1 text-sm text-[#53675f]">
              Immutable posted documents included in this statement snapshot.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-[#f3f7f5] text-xs uppercase tracking-wide text-[#53675f]">
                <tr>
                  <th className="p-4">Document</th>
                  <th className="p-4">Invoice date</th>
                  <th className="p-4">Due date</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Debits</th>
                  <th className="p-4 text-right">Credits</th>
                  <th className="p-4 text-right">Open</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <tr className="border-t border-[#e4ebe7]" key={line.customerReceivableDocumentId}>
                    <td className="p-4 font-bold">{line.documentNumber}</td>
                    <td className="p-4">{formatDate(line.invoiceDate)}</td>
                    <td className="p-4">{formatDate(line.dueDate)}</td>
                    <td className="p-4">{line.status.replaceAll("_", " ")}</td>
                    <td className="p-4 text-right">{money(line.debitAmount, statement.currency)}</td>
                    <td className="p-4 text-right">{money(line.periodCreditAmount, statement.currency)}</td>
                    <td className="p-4 text-right font-black">{money(line.closingBalance, statement.currency)}</td>
                  </tr>
                ))}
                {lines.length === 0 ? (
                  <tr>
                    <td className="p-8 text-center text-[#53675f]" colSpan={7}>
                      No open receivables in this statement.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        {canRespond ? (
          <section className="rounded-2xl border border-[#d9e1dc] bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black">Respond to this statement</h2>
            <p className="mt-1 text-sm text-[#53675f]">
              Your response is recorded against this exact statement hash.
            </p>
            <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={submitAction}>
              <label className="text-sm font-bold">
                Response type
                <select
                  className="mt-1 w-full rounded-lg border border-[#b8c8c1] bg-white p-3"
                  onChange={(event) => setActionType(event.target.value as typeof actionType)}
                  value={actionType}
                >
                  {canPromise ? <option value="PROMISE_TO_PAY">Promise to pay</option> : null}
                  {canDispute ? <option value="DISPUTE">Dispute a document</option> : null}
                </select>
              </label>
              <label className="text-sm font-bold">
                Amount ({statement.currency})
                <input
                  className="mt-1 w-full rounded-lg border border-[#b8c8c1] p-3"
                  min="0.01"
                  name="requestedAmount"
                  required
                  step="0.01"
                  type="number"
                />
              </label>
              {actionType === "DISPUTE" ? (
                <label className="text-sm font-bold sm:col-span-2">
                  Document
                  <select
                    className="mt-1 w-full rounded-lg border border-[#b8c8c1] bg-white p-3"
                    name="customerReceivableDocumentId"
                    required
                  >
                    <option value="">Select a document</option>
                    {lines.map((line) => (
                      <option key={line.customerReceivableDocumentId} value={line.customerReceivableDocumentId}>
                        {line.documentNumber} · {money(line.closingBalance, statement.currency)}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <label className="text-sm font-bold sm:col-span-2">
                  Payment date
                  <input
                    className="mt-1 w-full rounded-lg border border-[#b8c8c1] p-3"
                    min={new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)}
                    name="promisedFor"
                    required
                    type="date"
                  />
                </label>
              )}
              <label className="text-sm font-bold sm:col-span-2">
                Note
                <textarea
                  className="mt-1 min-h-28 w-full rounded-lg border border-[#b8c8c1] p-3"
                  maxLength={500}
                  minLength={3}
                  name="note"
                  required
                />
              </label>
              <button
                className="w-fit rounded-lg bg-[#132028] px-5 py-3 text-sm font-black text-white disabled:opacity-50"
                disabled={submitting}
                type="submit"
              >
                {submitting ? "Recording…" : "Record response"}
              </button>
              <p aria-live="polite" className="self-center text-sm text-[#31515d]">
                {actionMessage}
              </p>
            </form>
          </section>
        ) : null}

        <footer className="rounded-2xl border border-[#d9e1dc] bg-white p-5 text-sm text-[#53675f] shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-black text-[#132028]">Powered by {statement.branding.poweredBy}</p>
              <p className="mt-1">
                Content hash <code title={statement.contentHash}>{hashLabel(statement.contentHash)}</code>
              </p>
              <p>
                Secure access expires {formatDate(statement.expiresAt)}. Personal request metadata is hashed.
              </p>
            </div>
            {statement.branding.referralUrl ? (
              <a
                className="rounded-lg border border-[#178e83] px-4 py-3 font-black text-[#126f67]"
                href={statement.branding.referralUrl}
                referrerPolicy="no-referrer"
              >
                Build your own trusted workspace
              </a>
            ) : null}
          </div>
        </footer>
      </div>
    </main>
  )
}
