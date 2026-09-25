"use client"

import { type FormEvent, useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { AlertCircle, CheckCircle2, Info, LockKeyhole } from "lucide-react"
import {
  emptyStatementResponse, prepareStatementResponse, readStatementResponse, statementResponseStorageKey,
  writeStatementResponse, type RetainedStatementResponse, type StatementRecipientDraft,
} from "@/hooks/statement-recipient-request"
import type { CustomerStatementRecipientActionResult } from "@/services/accounting/customer-statement-recipient-action.service"
import { statementPortalCopy } from "./statement-portal-copy"

type Line = {
  customerReceivableDocumentId: string; documentNumber: string; invoiceDate: string; dueDate: string;
  status: string; debitAmount: string; periodCreditAmount: string; closingBalance: string
}
type PublicStatement = {
  statementId: string; statementNumber: string; version: number; contentHash: string; currency: string;
  periodStart: string; periodEnd: string; expiresAt: string; permissions: string[];
  payload: {
    organization?: { name?: string; tradeName?: string | null };
    customer?: { name?: string; preferredLocale?: string };
    scope?: { recordedThrough?: string };
    balances?: { opening?: string; periodDebits?: string; periodCredits?: string; closing?: string; overdue?: string };
    lines?: Line[];
  };
  branding: { referralUrl: string | null }
}
type Message = "storage" | "validation" | "rejected" | "conflict" | "unknownResult" | "linkChanged" | null
const panel = "rounded-2xl border border-[var(--product-border)] bg-[var(--product-surface)] p-[16px] sm:p-6"
const muted = "text-[var(--product-text-muted)]"
const focus = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--product-brand-strong)]"
const field = `mt-2 min-h-11 w-full min-w-0 rounded-lg border border-[var(--product-border)] bg-[var(--product-canvas)] p-3 text-[var(--product-text)] ${focus} disabled:opacity-70`
const button = `min-h-11 max-w-full rounded-lg px-4 py-3 text-sm font-semibold whitespace-normal ${focus} disabled:opacity-50`
const primary = `${button} bg-[var(--product-brand-action)] text-white hover:bg-[var(--product-brand-action-hover)]`
const secondary = `${button} border border-[var(--product-border)] bg-[var(--product-surface-raised)]`
const numeric = (value: unknown): value is string => typeof value === "string" && /^-?\d+(\.\d+)?$/.test(value) && Number.isFinite(Number(value))

export function CustomerStatementPortal({ statementId }: { statementId: string }) {
  const search = useSearchParams(), token = search.get("token")?.trim() ?? "", requestedLocale = search.get("lang")
  const [locale, setLocale] = useState<"en" | "fr">(requestedLocale === "fr" ? "fr" : "en")
  const t = statementPortalCopy[locale]
  const [statement, setStatement] = useState<PublicStatement | null>(null)
  const [loading, setLoading] = useState(true), [loadError, setLoadError] = useState<"missing" | "denied" | "loadError" | null>(null)
  const [reload, setReload] = useState(0), [retained, setRetained] = useState(emptyStatementResponse)
  const [storageKey, setStorageKey] = useState<string | null>(null), [storageFailed, setStorageFailed] = useState(false)
  const [submitting, setSubmitting] = useState(false), [message, setMessage] = useState<Message>(null)
  const [confirmed, setConfirmed] = useState(false), [receipt, setReceipt] = useState<CustomerStatementRecipientActionResult | null>(null)
  const busy = useRef(false), scope = useRef(""), responseHeading = useRef<HTMLHeadingElement>(null)
  // Invalidate an in-flight result immediately when a different link is rendered.
  scope.current = statementId + ":" + token

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setLoadError(null); setStatement(null); setReceipt(null); setMessage(null); setConfirmed(false)
    setStorageKey(null); setStorageFailed(false); setRetained(emptyStatementResponse()); setSubmitting(false); busy.current = false
    setLocale(requestedLocale === "fr" ? "fr" : "en")
    async function load() {
      if (!token) { setLoadError("missing"); setLoading(false); return }
      let draft = emptyStatementResponse()
      try {
        const key = await statementResponseStorageKey(statementId, token)
        draft = readStatementResponse(sessionStorage, key)
        if (!controller.signal.aborted) { setStorageKey(key); setRetained(draft) }
      } catch { if (!controller.signal.aborted) setStorageFailed(true) }
      try {
        const response = await fetch(`/api/customer-statements/${encodeURIComponent(statementId)}?token=${encodeURIComponent(token)}`, {
          cache: "no-store", credentials: "omit", referrerPolicy: "no-referrer", signal: controller.signal,
        })
        const body = await response.json()
        if (controller.signal.aborted) return
        if (!response.ok || !body.success || !body.data) { setLoadError(response.status === 404 ? "denied" : "loadError"); return }
        const data = body.data as PublicStatement
        if (data.statementId !== statementId || !Array.isArray(data.permissions) || !data.payload || !data.branding) { setLoadError("loadError"); return }
        setStatement(data)
        if (!requestedLocale && data.payload.customer?.preferredLocale === "FR") setLocale("fr")
        if (!draft.command && !data.permissions.includes("promise_to_pay") && data.permissions.includes("dispute")) {
          draft = { ...draft, draft: { ...draft.draft, actionType: "DISPUTE" } }
          setRetained(draft)
        }
      } catch { if (!controller.signal.aborted) setLoadError("loadError") }
      finally { if (!controller.signal.aborted) setLoading(false) }
    }
    void load()
    return () => controller.abort()
  }, [statementId, token, requestedLocale, reload])

  useEffect(() => { if (receipt) responseHeading.current?.focus() }, [receipt])
  function save(next: RetainedStatementResponse) {
    if (!storageKey || storageFailed) { setStorageFailed(true); return false }
    try { writeStatementResponse(sessionStorage, storageKey, next); setRetained(next); return true }
    catch { setStorageFailed(true); return false }
  }
  function change(patch: Partial<StatementRecipientDraft>) {
    if (retained.command || busy.current) return
    setConfirmed(false); setMessage(null)
    const next = { ...retained, draft: { ...retained.draft, ...patch } }
    if (!save(next)) setRetained(next)
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy.current || !statement || !storageKey || storageFailed || receipt || (!retained.command && !confirmed)) return
    const currentScope = scope.current
    let command = retained.command
    if (!command) {
      try { command = prepareStatementResponse(retained.draft) }
      catch { setMessage("validation"); return }
      if (!save({ ...retained, command })) return // Persist exact identity BEFORE making the request.
    }
    busy.current = true; setSubmitting(true); setMessage(null)
    try {
      const response = await fetch(`/api/customer-statements/${encodeURIComponent(statementId)}/actions?token=${encodeURIComponent(token)}`, {
        method: "POST", credentials: "omit", referrerPolicy: "no-referrer", cache: "no-store",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify(command),
      })
      const body = await response.json()
      if (scope.current !== currentScope) return
      if (!response.ok || !body.success) {
        // Only a definite validation rejection permits editing. Unknown outcomes retain their identity.
        if (body.success === false && response.status === 422) {
          if (save({ ...retained, command: null })) setConfirmed(false)
          setMessage("rejected")
        } else setMessage(response.status === 404 || response.status === 403 ? "linkChanged" : response.status === 409 ? "conflict" : "unknownResult")
        return
      }
      const result = body.data as CustomerStatementRecipientActionResult | undefined
      if (!result || !result.actionId || result.statementSnapshotId !== statementId || result.statementContentHash !== statement.contentHash ||
        result.actionType !== command.actionType || !numeric(result.requestedAmount) || Number(result.requestedAmount) !== Number(command.requestedAmount) ||
        result.customerReceivableDocumentId !== command.customerReceivableDocumentId ||
        (command.promisedFor ? result.promisedFor !== new Date(command.promisedFor).toISOString() : result.promisedFor !== null) ||
        !result.status || !/^[a-f0-9]{64}$/.test(result.payloadHash) || !/^[a-f0-9]{64}$/.test(result.stateHash) || !Number.isFinite(Date.parse(result.submittedAt))) {
        setMessage("unknownResult"); return
      }
      setReceipt(result)
    } catch { if (scope.current === currentScope) setMessage("unknownResult") }
    finally { if (scope.current === currentScope) { busy.current = false; setSubmitting(false) } }
  }
  function another() {
    if (!receipt) return
    const next = emptyStatementResponse()
    if (!statement?.permissions.includes("promise_to_pay")) next.draft.actionType = "DISPUTE"
    if (save(next)) { setReceipt(null); setMessage(null); setConfirmed(false); responseHeading.current?.focus() }
  }
  function date(value: string | undefined) {
    return value && Number.isFinite(Date.parse(value)) ? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value)) : t.unknown
  }
  function money(value: unknown) {
    if (!numeric(value) || !statement) return t.unknown
    try { return new Intl.NumberFormat(locale, { style: "currency", currency: statement.currency, currencyDisplay: "code", minimumFractionDigits: 2 }).format(Number(value)) }
    catch { return t.unknown }
  }
  const language = <label className="flex flex-wrap items-center gap-2 text-sm">{t.language}<select aria-label={t.language} value={locale} onChange={event => setLocale(event.target.value as "en" | "fr")} className={`${field} mt-0 w-auto`}><option value="en">English</option><option value="fr">Français</option></select></label>
  const reference = retained.command ? <p className="mt-3 text-sm">{t.request}: <code className="break-all">{retained.command.idempotencyKey}</code></p> : null
  const frame = "dark min-h-screen bg-[var(--product-canvas)] px-[16px] py-6 text-[var(--product-text)] sm:px-6 sm:py-10 [overflow-wrap:anywhere] [color-scheme:dark]"
  if (loading || loadError || !statement) return <main lang={locale} className={frame}><div className={`${panel} mx-auto max-w-xl space-y-4`}>
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="font-semibold">Stoquify</p>{language}</div>
    {loading ? <p role="status">{t.loading}</p> : <><h1 className="text-2xl font-semibold">{t.unavailable}</h1><p role="alert">{t[loadError ?? "loadError"]}</p>{reference}<button className={secondary} onClick={() => setReload(value => value + 1)}>{t.retryLoad}</button></>}
  </div></main>

  const { payload } = statement, lines = Array.isArray(payload.lines) ? payload.lines : []
  const complete = Array.isArray(payload.lines) && payload.balances && Object.values({ opening: payload.balances.opening, debits: payload.balances.periodDebits, credits: payload.balances.periodCredits, closing: payload.balances.closing, overdue: payload.balances.overdue }).every(numeric)
  const canDispute = statement.permissions.includes("dispute"), canPromise = statement.permissions.includes("promise_to_pay")
  const draft = retained.draft, locked = Boolean(retained.command || receipt || submitting)
  const allowed = draft.actionType === "DISPUTE" ? canDispute : canPromise
  const lineRows = (line: Line) => [[t.invoice, date(line.invoiceDate)], [t.due, date(line.dueDate)], [t.status, t.statuses[line.status] ?? t.unknown], [t.debits, money(line.debitAmount)], [t.credits, money(line.periodCreditAmount)], [t.open, money(line.closingBalance)]]
  return <main lang={locale} className={frame}><div className="mx-auto max-w-6xl space-y-6">
    <header className={panel}>
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className={`text-sm font-semibold ${muted}`}>{t.title}</p><h1 className="mt-2 text-2xl font-semibold sm:text-3xl">{payload.organization?.tradeName || payload.organization?.name || t.unknown}</h1></div>{language}</div>
      <p className={`mt-3 ${muted}`}>{t.statement} {statement.statementNumber} · {t.version} {statement.version}</p>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">{[[t.customer, payload.customer?.name || t.unknown], [t.period, `${date(statement.periodStart)} – ${date(statement.periodEnd)}`], [t.recorded, date(payload.scope?.recordedThrough)]].map(([key, value]) => <div key={key}><dt className={muted}>{key}</dt><dd className="mt-1 font-medium">{value}</dd></div>)}</dl>
      <p className={`mt-4 flex items-start gap-2 text-sm ${muted}`}><Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />{t.snapshot}</p>
      <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{[[t.opening, payload.balances?.opening], [t.debits, payload.balances?.periodDebits], [t.credits, payload.balances?.periodCredits], [t.closing, payload.balances?.closing], [t.overdue, payload.balances?.overdue]].map(([label, value]) => <div className="min-w-0 rounded-xl border border-[var(--product-border-subtle)] bg-[var(--product-surface-raised)] p-4" key={label}><dt className={`text-sm ${muted}`}>{label}</dt><dd className="mt-2 text-lg font-semibold tabular-nums">{money(value)}</dd></div>)}</dl>
    </header>
    {!complete && <p role="alert" className={`${panel} flex items-start gap-2 text-[var(--product-warning)]`}><AlertCircle aria-hidden="true" className="size-5 shrink-0" />{t.partial}</p>}
    <section className={panel} aria-labelledby="statement-documents"><h2 id="statement-documents" className="text-xl font-semibold">{t.documents}</h2><p className={`mt-1 text-sm ${muted}`}>{t.documentsHelp}</p>
      <div className="mt-4 space-y-3 lg:hidden">{lines.map(line => <article key={line.customerReceivableDocumentId} className="rounded-xl border border-[var(--product-border)] p-4"><h3 className="font-semibold">{line.documentNumber}</h3><dl className="mt-3 grid gap-3 sm:grid-cols-2">{lineRows(line).map(([label, value]) => <div key={label}><dt className={`text-sm ${muted}`}>{label}</dt><dd className="mt-1 tabular-nums">{value}</dd></div>)}</dl></article>)}</div>
      {lines.length > 0 && <div className={`mt-4 hidden overflow-x-auto lg:block ${focus}`} tabIndex={0} role="region" aria-label={t.documents}><table className="w-full text-left text-sm"><thead className={muted}><tr>{[t.document, t.invoice, t.due, t.status, t.debits, t.credits, t.open].map(label => <th key={label} scope="col" className="p-3 font-medium">{label}</th>)}</tr></thead><tbody>{lines.map(line => <tr key={line.customerReceivableDocumentId} className="border-t border-[var(--product-border)]"><th scope="row" className="p-3 font-semibold">{line.documentNumber}</th>{lineRows(line).map(([label, value]) => <td key={label} className="p-3 tabular-nums">{value}</td>)}</tr>)}</tbody></table></div>}
      {lines.length === 0 && <p className={`py-6 ${muted}`}>{Array.isArray(payload.lines) ? t.noLines : t.partial}</p>}
    </section>
    <section className={panel} aria-labelledby="statement-response"><h2 id="statement-response" tabIndex={-1} ref={responseHeading} className={`text-xl font-semibold ${focus}`}>{receipt ? t.success : t.respond}</h2>
      <p className={`mt-2 text-sm ${muted}`}>{receipt ? t.receiptHelp : canDispute || canPromise ? t.responseHelp : t.viewOnly}</p>
      {receipt ? <div role="status" className="mt-5 space-y-3"><p className="flex items-center gap-2 text-[var(--product-success)]"><CheckCircle2 aria-hidden="true" className="size-5 shrink-0" />{t.success}</p><p>{t.receipt}: <code className="break-all">{receipt.actionId}</code></p><p>{t.status}: {t.statuses[receipt.status] ?? t.unknown}</p><p>{t.received}: {date(receipt.submittedAt)}</p>{reference}<button type="button" className={secondary} onClick={another}>{t.another}</button></div> : canDispute || canPromise ? <form className="mt-5 space-y-5" onSubmit={submit} aria-busy={submitting}>
        {retained.command && <div className="rounded-xl border border-[var(--product-warning)] p-4"><p className="flex items-start gap-2"><LockKeyhole aria-hidden="true" className="mt-0.5 size-5 shrink-0" />{t.recovery}</p>{reference}</div>}
        <fieldset disabled={locked} className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 [&>div]:min-w-0">
          <div><label htmlFor="response-type" className="text-sm font-medium">{t.type}</label><select id="response-type" className={field} value={draft.actionType} onChange={e => change({ actionType: e.target.value as StatementRecipientDraft["actionType"] })}>{canPromise && <option value="PROMISE_TO_PAY">{t.promise}</option>}{canDispute && <option value="DISPUTE">{t.dispute}</option>}</select></div>
          <div><label htmlFor="response-amount" className="text-sm font-medium">{t.amount} ({statement.currency})</label><input id="response-amount" name="requestedAmount" className={field} type="text" inputMode="decimal" maxLength={32} required value={draft.requestedAmount} onChange={e => change({ requestedAmount: e.target.value })} /></div>
          {draft.actionType === "DISPUTE" ? <div className="md:col-span-2"><label htmlFor="response-document" className="text-sm font-medium">{t.document}</label><select id="response-document" name="customerReceivableDocumentId" className={field} required value={draft.customerReceivableDocumentId} onChange={e => change({ customerReceivableDocumentId: e.target.value })}><option value="">{t.selectDocument}</option>{lines.map(line => <option key={line.customerReceivableDocumentId} value={line.customerReceivableDocumentId}>{line.documentNumber} · {money(line.closingBalance)}</option>)}</select></div> : <div className="md:col-span-2"><label htmlFor="response-date" className="text-sm font-medium">{t.date}</label><input id="response-date" name="promisedFor" className={field} type="date" required min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)} max={new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10)} aria-describedby="response-date-help" value={draft.promisedFor} onChange={e => change({ promisedFor: e.target.value })} /><p id="response-date-help" className={`mt-2 text-sm ${muted}`}>{t.dateHelp}</p></div>}
          <div className="md:col-span-2"><label htmlFor="response-note" className="text-sm font-medium">{t.note}</label><textarea id="response-note" name="note" className={`${field} min-h-28`} required minLength={3} maxLength={500} value={draft.note} onChange={e => change({ note: e.target.value })} /></div>
          {!retained.command && <label className="flex items-start gap-3 text-sm md:col-span-2"><input type="checkbox" required className={`mt-0.5 size-5 shrink-0 ${focus}`} checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />{t.confirm}</label>}
        </fieldset>
        {storageFailed && <p role="alert" className="text-[var(--product-warning)]">{t.storage}</p>}
        {message && <p role="alert" className="flex items-start gap-2 text-[var(--product-warning)]"><AlertCircle aria-hidden="true" className="mt-0.5 size-5 shrink-0" />{t[message]}</p>}
        {!allowed && <p role="alert">{t.linkChanged}</p>}
        <button type="submit" className={`${primary} w-full sm:w-auto`} disabled={submitting || storageFailed || !storageKey || !complete || !allowed || (!retained.command && !confirmed)}>{submitting ? t.submitting : retained.command ? t.retry : t.submit}</button>
        <p className={`text-sm ${muted}`}>{t.saved}</p>
      </form> : reference}
    </section>
    <footer className={`${panel} space-y-3 text-sm ${muted}`}><p className="font-semibold text-[var(--product-text)]">{t.powered}</p><p>{t.expiry}: {date(statement.expiresAt)}</p><details><summary className={`cursor-pointer ${focus}`}>{t.hash}</summary><code className="mt-2 block break-all">{statement.contentHash}</code></details>{statement.branding.referralUrl && <a className={`inline-block text-[var(--product-brand-strong)] underline ${focus}`} href={statement.branding.referralUrl} referrerPolicy="no-referrer">{t.referral}</a>}</footer>
  </div></main>
}
