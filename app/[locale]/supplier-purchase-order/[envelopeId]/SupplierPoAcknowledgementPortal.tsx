"use client"

import { type FormEvent, useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { emptySupplierResponse, prepareSupplierResponse, readSupplierResponse, supplierResponseStorageKey, writeSupplierResponse, type RetainedSupplierResponse, type SupplierResponseDraft } from "@/hooks/supplier-po-response-request"
import { matchesSupplierProposal } from "@/services/purchase-order/supplier-po-response-contracts"
import type { getPublicSupplierPoEnvelope } from "@/services/purchase-order/supplier-po-acknowledgement.service"

type PublicEnvelope = Awaited<ReturnType<typeof getPublicSupplierPoEnvelope>>
type Proposal = NonNullable<PublicEnvelope["proposal"]>
type ApiEnvelope<T> = { success: boolean; data?: T; code?: string; error?: { code?: string } }
const panel = "min-w-0 rounded-2xl border border-[var(--product-border)] bg-[var(--product-surface)] p-[16px] sm:p-6"
const muted = "text-[var(--product-text-muted)]"
const focus = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--product-brand-strong)]"
const button = `min-h-11 max-w-full rounded-xl px-4 py-3 text-sm font-semibold whitespace-normal disabled:opacity-50 ${focus}`
const secondary = `${button} border border-[var(--product-border)] bg-[var(--product-surface-raised)]`
const control = `mt-2 min-h-11 w-full min-w-0 rounded-lg border border-[var(--product-border)] bg-[var(--product-canvas)] px-3 py-2 text-[var(--product-text)] ${focus}`

export function SupplierPoAcknowledgementPortal({ envelopeId, locale }: { envelopeId: string; locale: "en" | "fr" }) {
  const t = useTranslations("supplierPoAcknowledgement"), token = useSearchParams().get("token")?.trim() ?? ""
  const [envelope, setEnvelope] = useState<PublicEnvelope | null>(null), [loading, setLoading] = useState(true), [unavailable, setUnavailable] = useState(false), [loadFailed, setLoadFailed] = useState(false)
  const [retained, setRetained] = useState(emptySupplierResponse), retainedRef = useRef(retained), key = useRef<string | null>(null)
  const [storageFailed, setStorageFailed] = useState(false), [submitting, setSubmitting] = useState(false), lock = useRef(false)
  const [submissionError, setSubmissionError] = useState<string | null>(null), [confirmed, setConfirmed] = useState(false), [loadAttempt, setLoadAttempt] = useState(0)
  const receiptHeading = useRef<HTMLHeadingElement>(null)
  const generation = useRef(0)
  const endpoint = "/api/supplier-po-envelopes/" + encodeURIComponent(envelopeId)
  const alternateHref = `/${locale === "fr" ? "en" : "fr"}/supplier-purchase-order/${encodeURIComponent(envelopeId)}?token=${encodeURIComponent(token)}`
  const setRecovery = useCallback((value: RetainedSupplierResponse) => { retainedRef.current = value; setRetained(value) }, [])
  function persist(value: RetainedSupplierResponse) {
    try { if (!key.current) throw new Error("Unavailable recovery"); writeSupplierResponse(sessionStorage, key.current, value); setRecovery(value); return true }
    catch { setRecovery(value); setStorageFailed(true); return false }
  }
  const clearRecovery = useCallback(() => {
    try { if (key.current) sessionStorage.removeItem(key.current); setRecovery(emptySupplierResponse()) }
    catch { setStorageFailed(true) }
  }, [setRecovery])
  useEffect(() => {
    const controller = new AbortController()
    generation.current += 1
    lock.current = false; setSubmitting(false); setRecovery(emptySupplierResponse()); setStorageFailed(false)
    setLoading(true); setUnavailable(false); setLoadFailed(false); setConfirmed(false); setSubmissionError(null); setEnvelope(null); key.current = null
    async function load() {
      if (!token) { setUnavailable(true); setLoading(false); return }
      let saved = emptySupplierResponse(), recoveryAvailable = true
      try {
        const storageKey = await supplierResponseStorageKey(envelopeId, token)
        if (controller.signal.aborted) return
        key.current = storageKey; saved = readSupplierResponse(sessionStorage, storageKey); setRecovery(saved); setStorageFailed(false)
      } catch { if (controller.signal.aborted) return; recoveryAvailable = false; setStorageFailed(true) }
      try {
        const response = await fetch(endpoint + "?token=" + encodeURIComponent(token), { cache: "no-store", credentials: "omit", referrerPolicy: "no-referrer", signal: controller.signal })
        const body = await response.json() as ApiEnvelope<PublicEnvelope>
        if (controller.signal.aborted) return
        if (!response.ok || !body.success || !body.data || body.data.envelopeId !== envelopeId) {
          if (response.status === 404 || response.status === 410) setUnavailable(true)
          else setLoadFailed(true)
          return
        }
        if (controller.signal.aborted) return
        const data = body.data
        if (saved.envelopeHash && saved.envelopeHash !== data.contentHash) { setStorageFailed(true); setSubmissionError(t("recoveryMismatch")) }
        setEnvelope(data)
        if (saved.command && data.proposal) {
          if (matchesSupplierProposal(data.proposal, saved.command, envelopeId) && recoveryAvailable) clearRecovery()
          else setSubmissionError(t("recoveryMismatch"))
        }
      } catch (error) { if (!controller.signal.aborted && (error as { name?: string }).name !== "AbortError") setLoadFailed(true) }
      finally { if (!controller.signal.aborted) setLoading(false) }
    }
    void load()
    return () => { controller.abort(); generation.current += 1 }
  }, [envelopeId, token, endpoint, loadAttempt, t, setRecovery, clearRecovery])
  const recordedProposalId = envelope?.proposal?.proposalId
  useEffect(() => { if (recordedProposalId) receiptHeading.current?.focus() }, [recordedProposalId])

  function updateDraft(patch: Partial<SupplierResponseDraft>) {
    if (lock.current || retainedRef.current.command || !envelope) return
    persist({ ...retainedRef.current, envelopeHash: envelope.contentHash, draft: { ...retainedRef.current.draft, ...patch } })
    setConfirmed(false); setSubmissionError(null)
  }
  function date(value: string | null) {
    if (!value) return "—"
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? t("valueUnavailable") : new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(parsed)
  }
  function number(value: unknown, currency?: string) {
    if (typeof value !== "string" || !value.trim() || !Number.isFinite(Number(value))) return t("valueUnavailable")
    try { return new Intl.NumberFormat(locale, currency ? { style: "currency", currency, currencyDisplay: "code" } : { maximumFractionDigits: 3 }).format(Number(value)) }
    catch { return t("valueUnavailable") }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (lock.current || !envelope || !token || envelope.proposal || !confirmed || storageFailed || !envelope.permissions.includes("respond")) return
    let command = retainedRef.current.command
    if (!command) {
      try { command = prepareSupplierResponse(retainedRef.current.draft, envelope.payload.lines) }
      catch { setSubmissionError(t("validationFailed")); return }
      if (!persist({ ...retainedRef.current, envelopeHash: envelope.contentHash, command })) return
    }
    const submissionGeneration = generation.current
    lock.current = true; setSubmitting(true); setSubmissionError(null)
    try {
      const response = await fetch(endpoint + "/proposals?token=" + encodeURIComponent(token), { method: "POST", credentials: "omit", referrerPolicy: "no-referrer", headers: { "Content-Type": "application/json" }, body: JSON.stringify(command) })
      const body = await response.json() as ApiEnvelope<Proposal>
      if (generation.current !== submissionGeneration) return
      if (!response.ok || !body.success || !body.data) {
        if ([400, 422].includes(response.status)) {
          persist({ ...retainedRef.current, command: null }); setConfirmed(false); setSubmissionError(t("validationFailed"))
        } else if ([404, 410].includes(response.status)) { setEnvelope(null); setUnavailable(true) }
        else setSubmissionError(t("uncertainResult"))
        return
      }
      if (!matchesSupplierProposal(body.data, command, envelopeId)) { setSubmissionError(t("recoveryMismatch")); return }
      setEnvelope({ ...envelope, proposal: body.data }); clearRecovery(); setConfirmed(false)
    } catch { if (generation.current === submissionGeneration) setSubmissionError(t("uncertainResult")) }
    finally { if (generation.current === submissionGeneration) { lock.current = false; setSubmitting(false) } }
  }

  const frame = "dark min-h-screen bg-[var(--product-canvas)] px-[16px] py-6 text-[var(--product-text)] sm:px-6 sm:py-10 [overflow-wrap:anywhere] [color-scheme:dark]"
  const { draft, command: pending } = retained
  const feedback = <>
    {submissionError && <p className="mt-4 rounded-lg border border-[var(--product-warning)] p-3 text-sm" role="alert">{submissionError}</p>}
    {storageFailed && <p className="mt-4 text-sm" role="alert">{t("storageUnavailable")}</p>}
    {pending && <p className="mt-3 text-sm">{t("requestReference")}: <code className="break-all">{pending.idempotencyKey}</code></p>}
  </>
  if (loading) return <main className={frame}><div className={`mx-auto max-w-5xl ${panel}`}><p role="status">{t("loading")}</p></div></main>
  if (unavailable || loadFailed || !envelope) return <main className={frame}><div className={`mx-auto max-w-xl ${panel}`} data-testid="supplier-po-access-unavailable">
    <p className="text-sm font-semibold">Stoquify</p><h1 className="mt-3 text-2xl font-semibold">{t(unavailable ? "invalidTitle" : "loadFailedTitle")}</h1>
    <p className={`mt-3 text-sm leading-6 ${muted}`} role="alert">{t(unavailable ? "invalidDescription" : "loadFailedDescription")}</p>{feedback}
    <button className={`mt-4 ${secondary}`} type="button" onClick={() => setLoadAttempt(value => value + 1)}>{t("refreshRecord")}</button>
    <Link className={`mt-5 block text-sm underline ${focus}`} href={alternateHref} referrerPolicy="no-referrer">{t("switchLanguage")}</Link>
  </div></main>
  const po = envelope.payload.purchaseOrder, proposal = envelope.proposal
  return <main className={frame}><div className="mx-auto max-w-6xl space-y-5">
    <header className={panel}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><p className={`text-sm ${muted}`}>{t("secureEnvelope")}</p><h1 className="mt-2 text-2xl font-semibold sm:text-3xl" data-testid="supplier-po-order-number">{t("purchaseOrder")} {po.orderNumber}</h1><p className={`mt-3 text-sm ${muted}`}>{envelope.payload.buyer.displayName} → {envelope.payload.supplier.displayName}</p></div><Link className={`text-sm underline ${focus}`} href={alternateHref} referrerPolicy="no-referrer">{t("switchLanguage")}</Link></div>
      <p className={`mt-4 text-sm ${muted}`}>{t("snapshotAt")}: {date(envelope.capturedAt)} · {t("accessExpires")}: {date(envelope.expiresAt)}</p>
      <p className="mt-4 rounded-xl border border-[var(--product-warning)] p-3 text-sm" data-testid="proposal-boundary"><strong>{t("proposalBoundaryTitle")}</strong> {t("proposalBoundary")}</p>
      <dl className="mt-5 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">{[[t("orderDate"), date(po.orderDate)], [t("expectedDate"), date(po.expectedDeliveryDate)], [t("deliveryLocation"), po.deliveryLocation], [t("paymentTerms"), po.paymentTerms || "—"]].map(([label, value]) => <div className="min-w-0 rounded-lg bg-[var(--product-surface-raised)] p-3" key={label}><dt className={`text-sm ${muted}`}>{label}</dt><dd className="mt-2 font-semibold">{value}</dd></div>)}</dl>
    </header>
    <section className={panel} aria-label={t("orderLines")}><h2 className="text-xl font-semibold">{t("orderLines")}</h2>
      <div className="mt-4 hidden overflow-x-auto md:block"><table className="w-full text-left text-sm"><thead className={muted}><tr><th className="p-3">{t("item")}</th><th className="p-3 text-right">{t("quantity")}</th><th className="p-3 text-right">{t("unitCost")}</th><th className="p-3 text-right">{t("lineTotal")}</th></tr></thead><tbody>{envelope.payload.lines.map(line => <tr className="border-t border-[var(--product-border)]" key={line.purchaseOrderLineId}><td className="p-3"><span className="font-semibold">{line.itemName}</span>{line.sku && <span className={`ml-2 text-xs ${muted}`}>{line.sku}</span>}</td><td className="p-3 text-right tabular-nums">{number(line.orderedQuantity)}</td><td className="p-3 text-right tabular-nums">{number(line.unitCost, po.currency)}</td><td className="p-3 text-right tabular-nums">{number(line.lineTotal, po.currency)}</td></tr>)}</tbody></table></div>
      <ul className="mt-4 space-y-3 md:hidden">{envelope.payload.lines.map(line => <li key={line.purchaseOrderLineId} className="min-w-0 rounded-lg border border-[var(--product-border)] p-3"><h3 className="font-semibold">{line.itemName}</h3>{line.sku && <p className={`mt-1 text-xs ${muted}`}>{line.sku}</p>}<dl className="mt-3 space-y-2 text-sm">{[[t("quantity"), number(line.orderedQuantity)], [t("unitCost"), number(line.unitCost, po.currency)], [t("lineTotal"), number(line.lineTotal, po.currency)]].map(([label, value]) => <div key={label} className="flex flex-wrap justify-between gap-2"><dt className={muted}>{label}</dt><dd className="font-semibold tabular-nums">{value}</dd></div>)}</dl></li>)}</ul>
      <dl className="mt-5 ml-auto max-w-md space-y-2 border-t border-[var(--product-border)] pt-4 text-sm">{[[t("subtotal"), po.subtotal], [t("tax"), po.taxAmount], [t("shipping"), po.shippingCost], [t("total"), po.total]].map(([label, value]) => <div key={label} className="flex flex-wrap justify-between gap-2"><dt>{label}</dt><dd className="font-semibold tabular-nums">{number(value, po.currency)}</dd></div>)}</dl>
    </section>
    {proposal ? <section className={panel} data-testid="supplier-po-proposal-recorded">
      <h2 ref={receiptHeading} tabIndex={-1} className={`text-xl font-semibold ${focus}`}>{t("submittedProposal")}</h2><p className="mt-3 font-semibold" role="status" data-testid="supplier-po-proposal-status">{t(`proposalStatus.${proposal.status}`)}</p><p className={`mt-2 text-sm ${muted}`}>{t("proposalBoundary")}</p>
      <p className="mt-3 font-semibold">{t(`proposalType.${proposal.proposalType}`)}</p>
      {proposal.requestedDeliveryDate && <p className="mt-3 text-sm">{t("requestedDate")}: {date(proposal.requestedDeliveryDate)}</p>}
      {proposal.quantityChanges.map(change => <p className="mt-2 text-sm" key={change.purchaseOrderLineId}>{envelope.payload.lines.find(line => line.purchaseOrderLineId === change.purchaseOrderLineId)?.itemName ?? t("item")}: {number(change.originalOrderedQuantity)} → {number(change.requestedQuantity)}</p>)}
      {proposal.note && <p className="mt-4 whitespace-pre-wrap rounded-lg bg-[var(--product-surface-raised)] p-3 text-sm">{proposal.note}</p>}
      <details className="mt-4 text-sm"><summary className={focus}>{t("responseReferences")}</summary><p className="mt-2 break-all">{proposal.proposalId}</p><p className="break-all">{proposal.requestReference}</p></details>
      <ol className="mt-5 space-y-3 border-l-2 border-[var(--product-border)] pl-4">{proposal.history.map(state => <li key={state.version}><p className="text-sm font-semibold">{t(`proposalStatus.${state.status}`)}</p><p className={`mt-1 text-xs ${muted}`}>{date(state.effectiveAt)} · {t(state.actorType === "SUPPLIER" ? "supplierActor" : "buyerActor")}</p>{state.reason && <p className="mt-2 whitespace-pre-wrap text-sm">{state.reason}</p>}</li>)}</ol>
      {feedback}<button type="button" className={`mt-4 ${secondary}`} onClick={() => setLoadAttempt(value => value + 1)}>{t("refreshRecord")}</button>
    </section> : !envelope.permissions.includes("respond") ? <section className={panel}><p>{t("viewOnly")}</p>{feedback}</section> : <form className={panel} onSubmit={submit} noValidate data-testid="supplier-po-response-form" aria-busy={submitting}>
      <h2 className="text-xl font-semibold">{t("respondTitle")}</h2><p className={`mt-2 text-sm ${muted}`}>{t("respondDescription")}</p>{pending && <p className="mt-4 text-sm">{t("retainedRequest")}</p>}
      <fieldset disabled={submitting || Boolean(pending) || storageFailed} className="mt-5 grid min-w-0 grid-cols-1 gap-4"><legend className="sr-only">{t("respondTitle")}</legend>
        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3">{(["ACCEPT", "REJECT", "REQUEST_CHANGE"] as const).map(type => <label className={`flex min-w-0 items-start gap-2 rounded-xl border p-3 text-sm font-semibold ${draft.proposalType === type ? "border-[var(--product-brand-strong)] bg-[var(--product-surface-raised)]" : "border-[var(--product-border)]"}`} key={type}><input className={`mt-1 shrink-0 accent-[var(--product-brand-strong)] ${focus}`} type="radio" name="supplier-proposal-type" value={type} checked={draft.proposalType === type} onChange={() => updateDraft({ proposalType: type })} data-testid={`proposal-type-${type.toLowerCase()}`} /><span>{t(`proposalType.${type}`)}</span></label>)}</div>
        {draft.proposalType === "REQUEST_CHANGE" && <div className="min-w-0 space-y-4 rounded-xl border border-[var(--product-border)] p-3">
          <div className="min-w-0"><label className="text-sm font-semibold" htmlFor="requested-delivery-date">{t("requestedDate")}</label><input className={control} id="requested-delivery-date" type="date" value={draft.requestedDate} onChange={event => updateDraft({ requestedDate: event.target.value })} /></div>
          <fieldset className="min-w-0"><legend className="text-sm font-semibold">{t("requestedQuantities")}</legend><p className={`mt-2 text-xs ${muted}`}>{t("quantityPrecision")}</p><div className="mt-3 grid min-w-0 grid-cols-1 gap-3">{envelope.payload.lines.map(line => <label className="grid min-w-0 grid-cols-1 gap-2 text-sm sm:grid-cols-[minmax(0,1fr)_180px] sm:items-center" key={line.purchaseOrderLineId}><span>{line.itemName} <span className={muted}>({t("ordered")}: {number(line.orderedQuantity)})</span></span><input className={control} aria-label={t("requestedQuantityFor", { item: line.itemName })} type="text" inputMode="decimal" maxLength={32} value={draft.quantities[line.purchaseOrderLineId] ?? line.orderedQuantity} onChange={event => updateDraft({ quantities: { ...draft.quantities, [line.purchaseOrderLineId]: event.target.value } })} /></label>)}</div></fieldset>
        </div>}
        <div className="min-w-0"><label className="text-sm font-semibold" htmlFor="supplier-note">{t(draft.proposalType === "ACCEPT" ? "noteOptional" : "reasonRequired")}</label><textarea className={`${control} min-h-28`} id="supplier-note" maxLength={500} value={draft.note} onChange={event => updateDraft({ note: event.target.value })} placeholder={t("notePlaceholder")} /></div>
      </fieldset>
      <label className="mt-5 flex items-start gap-2 text-sm"><input className={`mt-1 shrink-0 ${focus}`} type="checkbox" checked={confirmed} disabled={submitting || storageFailed} onChange={event => setConfirmed(event.target.checked)} /><span>{t("confirmResponse")}</span></label>{feedback}
      <div className="mt-5 flex flex-wrap gap-3"><button className={`${button} bg-[var(--product-brand-action)] text-white hover:bg-[var(--product-brand-action-hover)]`} disabled={submitting || storageFailed || !confirmed} type="submit" data-testid="submit-supplier-po-proposal">{t(submitting ? "submitting" : pending ? "retryResponse" : "submitProposal")}</button><button className={secondary} disabled={submitting} type="button" onClick={() => setLoadAttempt(value => value + 1)}>{t("refreshRecord")}</button></div>
    </form>}
    <footer className={`${panel} text-xs leading-5 ${muted}`}><p>{t("footerControl")}</p><details className="mt-3"><summary className={focus}>{t("evidenceHash")}</summary><p className="mt-2 break-all font-mono">{envelope.contentHash}</p></details></footer>
  </div></main>
}
