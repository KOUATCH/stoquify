"use client"

import { type FormEvent, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"

type ProposalType = "ACCEPT" | "REJECT" | "REQUEST_CHANGE"
type ProposalStatus = "SUBMITTED" | "BUYER_ACCEPTED" | "BUYER_REJECTED"

type EnvelopeLine = {
  purchaseOrderLineId: string
  itemName: string
  sku: string | null
  orderedQuantity: string
  unitCost: string
  discount: string
  taxRate: string
  taxAmount: string
  lineTotal: string
}

type Proposal = {
  proposalId: string
  proposalType: ProposalType
  status: ProposalStatus
  requestedDeliveryDate: string | null
  note: string | null
  quantityChanges: Array<{
    purchaseOrderLineId: string
    originalOrderedQuantity: string
    requestedQuantity: string
  }>
  payloadHash: string
  stateHash: string
  submittedAt: string
  history: Array<{
    version: number
    status: ProposalStatus
    actorType: "SUPPLIER" | "BUYER"
    effectiveAt: string
    reason: string | null
    stateHash: string
  }>
  authoritativeMutation: false
}

type PublicEnvelope = {
  envelopeId: string
  purchaseOrderId: string
  contentHash: string
  sourceStateHash: string
  capturedAt: string
  expiresAt: string
  preferredLocale: string
  permissions: Array<"view" | "respond">
  payload: {
    schemaVersion: 1
    purchaseOrder: {
      orderNumber: string
      status: string
      orderDate: string
      expectedDeliveryDate: string | null
      paymentTerms: string | null
      currency: string
      subtotal: string
      taxAmount: string
      shippingCost: string
      discount: string
      total: string
      deliveryLocation: string
    }
    buyer: { displayName: string }
    supplier: { displayName: string }
    lines: EnvelopeLine[]
    controls: {
      redacted: true
      externalActionsAreProposals: true
      authoritativeRecords: string[]
    }
  }
  proposal: Proposal | null
  responseHash: string
  controls: {
    redacted: true
    rawTokenStored: false
    requestMetadataHashed: true
    externalActionsAreProposals: true
    authoritativeMutation: false
  }
}

type ApiEnvelope<T> = {
  success: boolean
  data?: T
}

function requestIdentity(prefix: string) {
  return prefix + ":" + (globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36))
}

function shortHash(value: string) {
  return value.length > 25 ? value.slice(0, 12) + "…" + value.slice(-12) : value
}

export function SupplierPoAcknowledgementPortal({
  envelopeId,
  locale,
}: {
  envelopeId: string
  locale: "en" | "fr"
}) {
  const t = useTranslations("supplierPoAcknowledgement")
  const searchParams = useSearchParams()
  const token = searchParams.get("token")?.trim() ?? ""
  const [envelope, setEnvelope] = useState<PublicEnvelope | null>(null)
  const [loading, setLoading] = useState(true)
  const [unavailable, setUnavailable] = useState(false)
  const [proposalType, setProposalType] = useState<ProposalType>("ACCEPT")
  const [requestedDate, setRequestedDate] = useState("")
  const [quantities, setQuantities] = useState<Record<string, string>>({})
  const [note, setNote] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submissionError, setSubmissionError] = useState<string | null>(null)
  const identity = useRef({
    idempotencyKey: requestIdentity("supplier-po-response"),
    correlationId: requestIdentity("supplier-po-correlation"),
  })

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      if (!token) {
        setUnavailable(true)
        setLoading(false)
        return
      }
      try {
        const response = await fetch(
          "/api/supplier-po-envelopes/" + encodeURIComponent(envelopeId) +
            "?token=" + encodeURIComponent(token),
          {
            cache: "no-store",
            credentials: "omit",
            referrerPolicy: "no-referrer",
            signal: controller.signal,
          },
        )
        const body = await response.json() as ApiEnvelope<PublicEnvelope>
        if (!response.ok || !body.success || !body.data) throw new Error("unavailable")
        setEnvelope(body.data)
        setQuantities(Object.fromEntries(
          body.data.payload.lines.map((line) => [line.purchaseOrderLineId, line.orderedQuantity]),
        ))
      } catch (error) {
        if ((error as { name?: string }).name !== "AbortError") setUnavailable(true)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    void load()
    return () => controller.abort()
  }, [envelopeId, token])

  const alternateLocale = locale === "fr" ? "en" : "fr"
  const alternateHref = `/${alternateLocale}/supplier-purchase-order/${encodeURIComponent(envelopeId)}?token=${encodeURIComponent(token)}`
  const formatter = useMemo(() => new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }), [locale])

  function date(value: string | null) {
    if (!value) return "—"
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? value : formatter.format(parsed)
  }

  function money(value: string, currency: string) {
    const amount = Number(value)
    try {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        currencyDisplay: "code",
      }).format(Number.isFinite(amount) ? amount : 0)
    } catch {
      return value + " " + currency
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!envelope || !token || envelope.proposal) return
    setSubmitting(true)
    setSubmissionError(null)
    const quantityChanges = proposalType === "REQUEST_CHANGE"
      ? envelope.payload.lines.flatMap((line) => {
          const requested = quantities[line.purchaseOrderLineId]
          return requested && Number(requested) !== Number(line.orderedQuantity)
            ? [{ purchaseOrderLineId: line.purchaseOrderLineId, requestedQuantity: requested }]
            : []
        })
      : []
    try {
      const response = await fetch(
        "/api/supplier-po-envelopes/" + encodeURIComponent(envelopeId) +
          "/proposals?token=" + encodeURIComponent(token),
        {
          method: "POST",
          credentials: "omit",
          referrerPolicy: "no-referrer",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            proposalType,
            requestedDeliveryDate:
              proposalType === "REQUEST_CHANGE" && requestedDate
                ? requestedDate
                : null,
            quantityChanges,
            note: note || null,
            ...identity.current,
          }),
        },
      )
      const body = await response.json() as ApiEnvelope<Proposal>
      if (!response.ok || !body.success || !body.data) throw new Error("failed")
      setEnvelope({ ...envelope, proposal: body.data })
      identity.current = {
        idempotencyKey: requestIdentity("supplier-po-response"),
        correlationId: requestIdentity("supplier-po-correlation"),
      }
    } catch {
      setSubmissionError(t("submissionFailed"))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-16 text-slate-950">
        <div className="mx-auto max-w-5xl rounded-2xl border bg-white p-8 shadow-sm">
          <p role="status">{t("loading")}</p>
        </div>
      </main>
    )
  }

  if (unavailable || !envelope) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-16 text-slate-950">
        <div className="mx-auto max-w-xl rounded-2xl border bg-white p-8 shadow-sm" data-testid="supplier-po-access-unavailable">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">Stoquify</p>
          <h1 className="mt-3 text-2xl font-black">{t("invalidTitle")}</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600" role="alert">{t("invalidDescription")}</p>
          <Link className="mt-6 inline-block text-sm font-bold text-emerald-700 underline" href={alternateHref}>
            {t("switchLanguage")}
          </Link>
        </div>
      </main>
    )
  }

  const po = envelope.payload.purchaseOrder
  const proposal = envelope.proposal

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-2xl border bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">{t("secureEnvelope")}</p>
              <h1 className="mt-2 text-3xl font-black" data-testid="supplier-po-order-number">{t("purchaseOrder")} {po.orderNumber}</h1>
              <p className="mt-2 text-slate-600">{envelope.payload.buyer.displayName} → {envelope.payload.supplier.displayName}</p>
            </div>
            <div className="flex flex-col items-end gap-3">
              <Link className="text-sm font-bold text-emerald-700 underline" href={alternateHref}>{t("switchLanguage")}</Link>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">{t("redactedVerified")}</span>
            </div>
          </div>
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950" data-testid="proposal-boundary">
            <strong>{t("proposalBoundaryTitle")}</strong> {t("proposalBoundary")}
          </div>
          <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              [t("orderDate"), date(po.orderDate)],
              [t("expectedDate"), date(po.expectedDeliveryDate)],
              [t("deliveryLocation"), po.deliveryLocation],
              [t("paymentTerms"), po.paymentTerms || "—"],
            ].map(([label, value]) => (
              <div className="rounded-xl bg-slate-50 p-4" key={label}>
                <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</dt>
                <dd className="mt-2 font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
        </header>

        <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
          <div className="border-b p-5">
            <h2 className="text-xl font-black">{t("orderLines")}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr><th className="p-4">{t("item")}</th><th className="p-4 text-right">{t("quantity")}</th><th className="p-4 text-right">{t("unitCost")}</th><th className="p-4 text-right">{t("lineTotal")}</th></tr>
              </thead>
              <tbody>
                {envelope.payload.lines.map((line) => (
                  <tr className="border-t" key={line.purchaseOrderLineId}>
                    <td className="p-4"><span className="font-bold">{line.itemName}</span>{line.sku ? <span className="ml-2 text-xs text-slate-500">{line.sku}</span> : null}</td>
                    <td className="p-4 text-right tabular-nums">{line.orderedQuantity}</td>
                    <td className="p-4 text-right tabular-nums">{money(line.unitCost, po.currency)}</td>
                    <td className="p-4 text-right font-bold tabular-nums">{money(line.lineTotal, po.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <dl className="ml-auto grid max-w-md grid-cols-2 gap-x-6 gap-y-2 border-t p-5 text-sm">
            <dt>{t("subtotal")}</dt><dd className="text-right">{money(po.subtotal, po.currency)}</dd>
            <dt>{t("tax")}</dt><dd className="text-right">{money(po.taxAmount, po.currency)}</dd>
            <dt>{t("shipping")}</dt><dd className="text-right">{money(po.shippingCost, po.currency)}</dd>
            <dt className="font-black">{t("total")}</dt><dd className="text-right font-black">{money(po.total, po.currency)}</dd>
          </dl>
        </section>

        {proposal ? (
          <section className="rounded-2xl border bg-white p-6 shadow-sm" data-testid="supplier-po-proposal-recorded">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">{t("submittedProposal")}</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <h2 className="text-xl font-black">{t(`proposalType.${proposal.proposalType}`)}</h2>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold" data-testid="supplier-po-proposal-status">{t(`proposalStatus.${proposal.status}`)}</span>
            </div>
            {proposal.requestedDeliveryDate ? <p className="mt-4 text-sm"><strong>{t("requestedDate")}:</strong> {date(proposal.requestedDeliveryDate)}</p> : null}
            {proposal.quantityChanges.map((change) => {
              const line = envelope.payload.lines.find((candidate) => candidate.purchaseOrderLineId === change.purchaseOrderLineId)
              return <p className="mt-2 text-sm" key={change.purchaseOrderLineId}><strong>{line?.itemName ?? t("item")}:</strong> {change.originalOrderedQuantity} → {change.requestedQuantity}</p>
            })}
            {proposal.note ? <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm">{proposal.note}</p> : null}
            <ol className="mt-6 space-y-3 border-l-2 border-slate-200 pl-5">
              {proposal.history.map((state) => (
                <li key={state.version}>
                  <p className="font-bold">{t(`proposalStatus.${state.status}`)}</p>
                  <p className="text-xs text-slate-500">{date(state.effectiveAt)} · {state.actorType}</p>
                  {state.reason ? <p className="mt-1 text-sm">{state.reason}</p> : null}
                </li>
              ))}
            </ol>
          </section>
        ) : (
          <form className="rounded-2xl border bg-white p-6 shadow-sm" onSubmit={submit} data-testid="supplier-po-response-form">
            <h2 className="text-xl font-black">{t("respondTitle")}</h2>
            <p className="mt-2 text-sm text-slate-600">{t("respondDescription")}</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label={t("respondTitle")}>
              {(["ACCEPT", "REJECT", "REQUEST_CHANGE"] as ProposalType[]).map((type) => (
                <button
                  className={`rounded-xl border px-4 py-3 text-left text-sm font-bold ${proposalType === type ? "border-emerald-600 bg-emerald-50 text-emerald-900" : "bg-white"}`}
                  key={type}
                  type="button"
                  role="radio"
                  aria-checked={proposalType === type}
                  data-testid={`proposal-type-${type.toLowerCase()}`}
                  onClick={() => setProposalType(type)}
                >
                  {t(`proposalType.${type}`)}
                </button>
              ))}
            </div>

            {proposalType === "REQUEST_CHANGE" ? (
              <div className="mt-6 space-y-5 rounded-xl border bg-slate-50 p-5">
                <label className="block text-sm font-bold" htmlFor="requested-delivery-date">{t("requestedDate")}</label>
                <input className="w-full rounded-lg border bg-white px-3 py-2 sm:max-w-xs" id="requested-delivery-date" name="requestedDeliveryDate" type="date" value={requestedDate} onChange={(event) => setRequestedDate(event.target.value)} />
                <fieldset>
                  <legend className="text-sm font-bold">{t("requestedQuantities")}</legend>
                  <div className="mt-3 grid gap-3">
                    {envelope.payload.lines.map((line) => (
                      <label className="grid gap-2 text-sm sm:grid-cols-[1fr_180px] sm:items-center" key={line.purchaseOrderLineId}>
                        <span>{line.itemName} <span className="text-slate-500">({t("ordered")}: {line.orderedQuantity})</span></span>
                        <input className="rounded-lg border bg-white px-3 py-2" aria-label={t("requestedQuantityFor", { item: line.itemName })} min="0.001" step="0.001" type="number" value={quantities[line.purchaseOrderLineId] ?? line.orderedQuantity} onChange={(event) => setQuantities((current) => ({ ...current, [line.purchaseOrderLineId]: event.target.value }))} />
                      </label>
                    ))}
                  </div>
                </fieldset>
              </div>
            ) : null}

            <label className="mt-6 block text-sm font-bold" htmlFor="supplier-note">
              {proposalType === "ACCEPT" ? t("noteOptional") : t("reasonRequired")}
            </label>
            <textarea className="mt-2 min-h-28 w-full rounded-xl border px-3 py-2" id="supplier-note" maxLength={500} required={proposalType !== "ACCEPT"} value={note} onChange={(event) => setNote(event.target.value)} placeholder={t("notePlaceholder")} />
            {submissionError ? <p className="mt-4 text-sm font-bold text-red-700" role="alert">{submissionError}</p> : null}
            <button className="mt-5 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-black text-white disabled:opacity-60" disabled={submitting} type="submit" data-testid="submit-supplier-po-proposal">
              {submitting ? t("submitting") : t("submitProposal")}
            </button>
          </form>
        )}

        <footer className="rounded-2xl border bg-white p-5 text-xs leading-5 text-slate-500">
          <p>{t("footerControl")}</p>
          <p className="mt-2 font-mono">{t("evidenceHash")}: {shortHash(envelope.contentHash)}</p>
        </footer>
      </div>
    </main>
  )
}
