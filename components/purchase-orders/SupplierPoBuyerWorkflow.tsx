"use client"

import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { getSupplierPoAcknowledgementWorkbenchAction, issueSupplierPoInviteAction, reviewSupplierPoProposalAction, revokeSupplierPoInviteAction } from "@/actions/purchaseOrderWorkflow/supplier-po-acknowledgement.actions"
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"
import { emptySupplierBuyerRecovery, matchesSupplierBuyerReceipt, prepareSupplierBuyerCommand, readSupplierBuyerRecovery, saveSupplierBuyerRecovery, type SupplierBuyerDraft, type SupplierBuyerRecovery } from "@/hooks/supplier-po-buyer-request"
import type { getSupplierPoAcknowledgementWorkbench } from "@/services/purchase-order/supplier-po-acknowledgement.service"
import type { SupplierPoWorkbenchInput } from "@/services/purchase-order/supplier-po-buyer-contracts"
import { localizePath } from "@/i18n/routing"
import type { Locale } from "@/types/bilingual"
import { PurchaseOrderAmendmentDialog } from "./PurchaseOrderAmendmentDialog"

type WorkbenchData = Awaited<ReturnType<typeof getSupplierPoAcknowledgementWorkbench>>
const panel = "min-w-0 rounded-2xl border border-[var(--dash-border)] bg-[var(--dash-surface)] p-4 sm:p-6"
const focus = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--dash-brand-strong)]"
const button = `min-h-11 max-w-full rounded-lg border border-[var(--dash-border)] px-4 py-2 text-sm font-semibold whitespace-normal disabled:opacity-50 ${focus}`
const control = `mt-2 min-h-11 w-full min-w-0 rounded-lg border border-[var(--dash-border)] bg-[var(--dash-surface)] px-3 py-2 text-[var(--dash-text)] ${focus}`

export function SupplierPoAcknowledgementWorkbench({ initialData, locale }: { initialData: WorkbenchData; locale: Locale }) {
  const t = useTranslations("supplierPoAcknowledgement"), b = useTranslations("supplierPoAcknowledgement.buyerWorkbench")
  const scope = useMemo(() => ({ organizationId: initialData.scope.organizationId, actorId: initialData.scope.actorId, purchaseOrderId: initialData.purchaseOrder.id }), [initialData.scope.organizationId, initialData.scope.actorId, initialData.purchaseOrder.id])
  const latestInitialData = useRef(initialData)
  latestInitialData.current = initialData
  const [data, setData] = useState<WorkbenchData | null>(initialData)
  const [recovery, setRecovery] = useState(emptySupplierBuyerRecovery), recoveryRef = useRef(recovery)
  const [busy, setBusy] = useState(false), locked = useRef(false), generation = useRef(0)
  const reading = useRef(false), pagedHistory = useRef(false)
  const [storageFailed, setStorageFailed] = useState(false), [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState<string | null>(null), [message, setMessage] = useState<string | null>(null)
  const [amendmentProposalId, setAmendmentProposalId] = useState<string | null>(null)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null), [copied, setCopied] = useState(false)
  const password = useRef<HTMLInputElement>(null), draftHeading = useRef<HTMLHeadingElement>(null), receiptHeading = useRef<HTMLHeadingElement>(null)
  const replaceRecovery = useCallback((saved: SupplierBuyerRecovery) => { recoveryRef.current = saved; setRecovery(saved) }, [])
  useEffect(() => {
    generation.current += 1; locked.current = false; reading.current = false; pagedHistory.current = false; setBusy(false); setData(latestInitialData.current); setError(null); setMessage(null); setInviteUrl(null); setConfirmed(false)
    if (password.current) password.current.value = ""
    try { replaceRecovery(readSupplierBuyerRecovery(sessionStorage, scope)); setStorageFailed(false) }
    catch { replaceRecovery(emptySupplierBuyerRecovery()); setStorageFailed(true) }
    return () => { generation.current += 1 }
  }, [scope, replaceRecovery])
  useEffect(() => {
    // A server action can also refresh the route's default page. Keep the page
    // explicitly requested by the reader; changed authority/order requires a new read.
    if (reading.current) return
    setData(current => {
      if (!pagedHistory.current) return initialData
      if (!current || current.canManage !== initialData.canManage || current.canIssue !== initialData.canIssue || current.purchaseOrder.currentOrderHash !== initialData.purchaseOrder.currentOrderHash) return null
      return current
    })
  }, [initialData])
  useEffect(() => { if (message) receiptHeading.current?.focus() }, [message])
  function save(saved: SupplierBuyerRecovery) {
    try { saveSupplierBuyerRecovery(sessionStorage, scope, saved); replaceRecovery(saved); return true }
    catch { setStorageFailed(true); return false }
  }
  function date(value: string) { const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? t("valueUnavailable") : new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(parsed) }
  function quantity(value: string) { const [whole, fraction] = value.split("."); const significant = fraction?.replace(/0+$/, ""); return significant ? whole + (locale === "fr" ? "," : ".") + significant : whole }
  function matchesScope(result: WorkbenchData) { return result.scope.organizationId === scope.organizationId && result.scope.actorId === scope.actorId && result.purchaseOrder.id === scope.purchaseOrderId }
  async function refresh(page: Partial<SupplierPoWorkbenchInput> = {}) {
    const owner = generation.current
    reading.current = true; pagedHistory.current = Boolean(page.envelopeId || page.beforeEnvelopeId)
    setBusy(true); setData(null); setConfirmed(false); if (password.current) password.current.value = ""
    try {
      const result = await getSupplierPoAcknowledgementWorkbenchAction({ ...page, purchaseOrderId: scope.purchaseOrderId })
      if (generation.current !== owner) return
      if (!result.success || !matchesScope(result.data)) { setError(b("readFailed")); setInviteUrl(null); return }
      setData(result.data); setError(null)
    } catch { if (generation.current === owner) setError(b("readFailed")) }
    finally { if (generation.current === owner) { reading.current = false; setBusy(false) } }
  }
  function openDraft(draft: SupplierBuyerDraft) {
    if (locked.current || recoveryRef.current.command || storageFailed) return
    if (!save({ draft, command: null, rejected: false })) return
    setConfirmed(false); setMessage(null); setError(null); setInviteUrl(null)
    requestAnimationFrame(() => draftHeading.current?.focus())
  }
  function editDraft(value: string) {
    const draft = recoveryRef.current.draft
    if (!draft || recoveryRef.current.command || locked.current) return
    const next: SupplierBuyerDraft = draft.kind === "issue"
      ? { ...draft, input: { ...draft.input, recipientReference: value } }
      : draft.kind === "review"
        ? { ...draft, input: { ...draft.input, reason: value } }
        : { ...draft, input: { ...draft.input, reason: value } }
    save({ draft: next, command: null, rejected: false }); setConfirmed(false)
  }
  function reviewCurrentDraft() {
    if (!data || !recovery.draft || (recovery.command && !recovery.rejected)) return
    let draft = recovery.draft
    if (draft.kind === "issue") draft = { ...draft, input: { ...draft.input, expectedOrderHash: data.purchaseOrder.currentOrderHash } }
    if (draft.kind === "review") {
      const proposalId = draft.input.proposalId
      const row = data.envelopes.flatMap(envelope => envelope.proposals).find(proposal => proposal.proposalId === proposalId)
      if (!row || row.status !== "SUBMITTED") { setError(b("decisionFinished")); return }
      draft = { ...draft, input: { ...draft.input, expectedOrderHash: data.purchaseOrder.currentOrderHash, expectedStateHash: row.stateHash } }
    }
    save({ draft, command: null, rejected: false }); setConfirmed(false); setError(null)
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (locked.current || !data?.canManage || !confirmed || storageFailed || recoveryRef.current.rejected || !recoveryRef.current.draft || !password.current?.value || (!recoveryRef.current.command && !validPreview)) return
    const owner = generation.current
    let command = recoveryRef.current.command
    if (!command) {
      try { command = prepareSupplierBuyerCommand(recoveryRef.current.draft) }
      catch { setError(b("validationFailed")); return }
      if (!save({ ...recoveryRef.current, command, rejected: false })) return
    }
    locked.current = true; setBusy(true); setError(null); setMessage(null)
    const credential = password.current.value; password.current.value = ""
    try {
      const auth = await stepUpWithPasswordAction({ password: credential })
      if (generation.current !== owner) return
      if (!auth.success) { setError(b("authenticationFailed")); return }
      const result = command.kind === "issue" ? await issueSupplierPoInviteAction(command.input) : command.kind === "review" ? await reviewSupplierPoProposalAction(command.input) : await revokeSupplierPoInviteAction(command.input)
      if (generation.current !== owner) return
      if (!result.success) {
        if (["VALIDATION_ERROR", "BUSINESS_RULE_VIOLATION", "CONFLICT"].includes(result.code)) { save({ ...recoveryRef.current, rejected: true }); setData(null); setConfirmed(false); setError(b("rejectedRequest")) }
        else if (["FORBIDDEN", "AUTH_REQUIRED", "NOT_FOUND"].includes(result.code)) { setData(null); setInviteUrl(null); setError(b("readFailed")) }
        else setError(b("uncertainResult"))
        return
      }
      if (!matchesSupplierBuyerReceipt(command, result.data)) { setError(b("receiptMismatch")); return }
      if (command.kind === "issue" && "inviteUrl" in result.data) { setInviteUrl(result.data.inviteUrl); setCopied(false) }
      if (command.kind === "revoke") setInviteUrl(null)
      save(emptySupplierBuyerRecovery()); setConfirmed(false)
      setMessage(b(command.kind === "issue" ? "invitationReady" : command.kind === "review" ? "reviewed" : "accessRevoked"))
      await refresh()
    } catch { if (generation.current === owner) setError(b("uncertainResult")) }
    finally { if (generation.current === owner) { locked.current = false; setBusy(false) } }
  }
  async function copyInvite() { if (!inviteUrl) return; try { await navigator.clipboard.writeText(new URL(inviteUrl, window.location.origin).href); setCopied(true) } catch { setError(b("copyFailed")) } }
  const draft = recovery.draft, pending = recovery.command
  const foundProposal = draft?.kind === "review" ? data?.envelopes.flatMap(envelope => envelope.proposals).find(proposal => proposal.proposalId === draft.input.proposalId) : null
  const foundToken = draft?.kind === "revoke" ? data?.envelopes.flatMap(envelope => envelope.tokens).find(token => token.id === draft.input.tokenId) : null
  const validPreview = Boolean(data && draft && (draft.kind === "revoke" || draft.input.expectedOrderHash === data.purchaseOrder.currentOrderHash) &&
    (draft.kind !== "issue" || data.canIssue) && (draft.kind !== "revoke" || foundToken?.status === "ACTIVE") &&
    (draft.kind !== "review" || foundProposal?.status === "SUBMITTED" && foundProposal.stateHash === draft.input.expectedStateHash && (draft.input.decision !== "ACCEPT" || foundProposal.canAccept)))
  const disabled = busy || storageFailed || Boolean(pending)
  return <section className="dashboard-landing-theme mx-auto w-full min-w-0 max-w-[88rem] space-y-5 p-4 text-[var(--dash-text)] sm:p-6 [overflow-wrap:anywhere]" data-testid="supplier-po-buyer-workbench" aria-busy={busy}>
    <header className={panel}><Link className={`text-sm underline ${focus}`} href={localizePath(`/dashboard/purchase-orders/${scope.purchaseOrderId}`, locale)}>{b("backToOrder")}</Link>
      <h1 className="mt-4 text-2xl font-semibold">{b("title")}</h1><p className="mt-2 text-sm text-[var(--dash-text-muted)]">{b("description")}</p>
      <p className="mt-4 rounded-lg border border-[var(--dash-warning)] p-3 text-sm" data-testid="buyer-authoritative-boundary">{b("authoritativeBoundary")}</p>
      {data && <p className="mt-3 text-sm">{data.purchaseOrder.orderNumber} · {data.purchaseOrder.supplier.name} · {b("checkedAt")}: {date(data.checkedAt)}</p>}
      <button type="button" className={`mt-4 ${button}`} disabled={busy} onClick={() => void refresh()}>{b("refresh")}</button>
    </header>
    {error && <p className={`${panel} border-[var(--dash-warning)] text-sm`} role="alert">{error}</p>}
    {storageFailed && <p className={`${panel} text-sm`} role="alert">{b("storageUnavailable")}</p>}
    {message && <section className={panel} aria-label={b("recordedOutcome")}><h2 ref={receiptHeading} tabIndex={-1} className={`text-lg font-semibold ${focus}`}>{b("recordedOutcome")}</h2><p className="mt-2 text-sm" role="status">{message}</p>
      {inviteUrl && <div className="mt-3 space-y-3" data-testid="supplier-po-invite-ready"><p className="text-sm">{b("oneTimeWarning")}</p><input className={control} readOnly value={inviteUrl} aria-label={b("invitationReady")} data-testid="supplier-po-invite-url" /><button className={button} type="button" onClick={() => void copyInvite()}>{b(copied ? "copied" : "copyLink")}</button></div>}
    </section>}
    {pending && <p className={`${panel} text-sm`}>{b("retainedRequest")} <code className="break-all">{pending.input.idempotencyKey}</code></p>}
    {!data && <p className={`${panel} text-sm`} role="status">{b(busy ? "loading" : "refreshRequired")}</p>}
    {data && <>
      {!data.canManage && <p className={`${panel} text-sm`}>{b("readOnly")}</p>}
      <div className={panel}><h2 className="text-lg font-semibold">{b("issueTitle")}</h2><p className="mt-2 text-sm">{b("issueExplanation")}</p>
        <button type="button" className={`mt-4 ${button}`} disabled={disabled || !data.canIssue} data-testid="issue-supplier-po-invite" onClick={() => openDraft({ kind: "issue", input: { purchaseOrderId: scope.purchaseOrderId, expectedOrderHash: data.purchaseOrder.currentOrderHash, recipientReference: data.purchaseOrder.supplier.email ?? "" } })}>{b("prepareInvitation")}</button>
        {!data.canIssue && <p className="mt-2 text-sm">{b("issueUnavailable")}</p>}
      </div>
      {draft && <form className={`${panel} border-[var(--dash-brand-strong)] space-y-4`} onSubmit={submit} data-testid="supplier-po-buyer-draft">
        <h2 ref={draftHeading} tabIndex={-1} className={`text-lg font-semibold ${focus}`}>{b(draft.kind === "issue" ? "issueTitle" : draft.kind === "review" ? "reviewReason" : "revokeReason")}</h2>
        {draft.kind === "review" && <p>{b(draft.input.decision === "ACCEPT" ? "acceptProposal" : "rejectProposal")}</p>}
        <div><label className="text-sm font-semibold" htmlFor="supplier-buyer-reason">{b(draft.kind === "issue" ? "recipientReference" : draft.kind === "review" ? "reviewReason" : "revokeReason")}</label>
          <textarea className={`${control} min-h-24`} id="supplier-buyer-reason" maxLength={draft.kind === "issue" ? 320 : 500} disabled={disabled || !data.canManage} value={draft.kind === "issue" ? draft.input.recipientReference ?? "" : draft.input.reason} onChange={event => editDraft(event.target.value)} />
        </div>
        {!pending && !validPreview && <p className="text-sm" role="alert">{b("staleDraft")}</p>}
        {(recovery.rejected || !pending && !validPreview) && <button type="button" className={button} disabled={busy || !data.canManage} onClick={reviewCurrentDraft}>{b("reviewCurrent")}</button>}
        <div><label className="text-sm font-semibold" htmlFor="supplier-buyer-password">{b("password")}</label><input ref={password} id="supplier-buyer-password" type="password" autoComplete="current-password" required className={control} disabled={busy || !data.canManage || storageFailed} /></div>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={confirmed} disabled={busy || !data.canManage || storageFailed} onChange={event => setConfirmed(event.target.checked)} className={`mt-1 shrink-0 ${focus}`} /><span>{b("confirmDecision")}</span></label>
        <div className="flex flex-wrap gap-3"><button type="submit" className={`${button} bg-[var(--product-brand-action)] text-white hover:bg-[var(--product-brand-action-hover)]`} disabled={busy || storageFailed || !confirmed || !data.canManage || (!pending && !validPreview) || recovery.rejected} data-testid="submit-supplier-buyer-command">{b(busy ? "saving" : pending ? "retryRequest" : "confirmSubmit")}</button>
          {(!pending || recovery.rejected) && <button className={button} type="button" disabled={busy} onClick={() => { save(emptySupplierBuyerRecovery()); setConfirmed(false) }}>{b("cancelDraft")}</button>}
        </div>
      </form>}
      {data.envelopes.length === 0 ? <p className={panel}>{b("noEnvelope")}</p> : data.envelopes.map(envelope => <article key={envelope.id} className={`${panel} space-y-5`}>
        <h2 className="text-lg font-semibold">{b("envelope")} · {date(envelope.createdAt)}</h2>
        {!envelope.matchesCurrentOrder && <p className="rounded-lg border border-[var(--dash-warning)] p-3 text-sm">{b("changedOrder")}</p>}
        <details className="text-xs"><summary className={focus}>{b("hash")}</summary><p className="mt-2 break-all font-mono">{envelope.contentHash}</p></details>
        <section><h3 className="font-semibold">{b("tokens")}</h3>{!envelope.tokens.length && <p className="mt-2 text-sm">{b("noTokens")}</p>}<ul className="mt-3 space-y-3">{envelope.tokens.map(token => <li key={token.id} className="min-w-0 rounded-lg border border-[var(--dash-border)] p-3" data-testid={`supplier-po-token-${token.id}`}>
          <p className="text-sm font-semibold">{b(token.status === "ACTIVE" ? "active" : token.status === "REVOKED" ? "revoked" : "expired")} · {b("expires")}: {date(token.expiresAt)}</p>
          <p className="mt-2 text-xs">{b("accesses")}: {token.accessCount} · {b("requestReference")}: {token.requestReference}</p>
          {token.revocationReason && <p className="mt-2 whitespace-pre-wrap text-sm">{token.revocationReason}</p>}
          {token.status === "ACTIVE" && <button className={`mt-3 ${button}`} type="button" disabled={disabled || !data.canManage} data-testid={`revoke-supplier-po-token-${token.id}`} onClick={() => openDraft({ kind: "revoke", input: { purchaseOrderId: scope.purchaseOrderId, tokenId: token.id, reason: "" } })}>{b("revoke")}</button>}
        </li>)}</ul>{envelope.nextTokenId && <button className={`mt-3 ${button}`} type="button" disabled={busy} onClick={() => void refresh({ envelopeId: envelope.id, beforeTokenId: envelope.nextTokenId! })}>{b("olderInvitations")}</button>}</section>
        <section><h3 className="font-semibold">{b("proposals")}</h3>{!envelope.proposals.length && <p className="mt-2 text-sm">{b("noProposals")}</p>}<ul className="mt-3 space-y-3">{envelope.proposals.map(proposal => <li key={proposal.proposalId} className="min-w-0 rounded-lg border border-[var(--dash-border)] p-3" data-testid={`supplier-po-proposal-${proposal.proposalId}`}>
          <h4 className="font-semibold">{t(`proposalType.${proposal.proposalType}`)}</h4><p className="mt-2 text-sm" data-testid="buyer-proposal-status">{t(`proposalStatus.${proposal.status}`)}</p>
          {proposal.requestedDeliveryDate && <p className="mt-2 text-sm">{t("requestedDate")}: {date(proposal.requestedDeliveryDate)}</p>}
          {proposal.quantityChanges.map(line => <p className="mt-2 text-sm" key={line.purchaseOrderLineId}>{line.itemName ?? t("valueUnavailable")}: {quantity(line.originalOrderedQuantity)} → {quantity(line.requestedQuantity)}</p>)}
          {proposal.note && <p className="mt-3 whitespace-pre-wrap text-sm">{proposal.note}</p>}
          {proposal.amendment && <p className="mt-3 rounded-lg border border-[var(--dash-success)] p-3 text-sm" role="status">{b("amendmentApplied")} · {date(proposal.amendment.approvedAt)} · <span className="break-all">{proposal.amendment.requestReference}</span></p>}
          {proposal.status === "BUYER_ACCEPTED" && proposal.proposalType === "REQUEST_CHANGE" && <button type="button" className={`mt-3 ${button}`} disabled={disabled} data-testid="review-order-amendment" onClick={() => setAmendmentProposalId(proposal.proposalId)}>{b("reviewAmendment")}</button>}
          <details className="mt-3 text-sm"><summary className={focus}>{b("history")}</summary><ol className="mt-3 space-y-3 border-l border-[var(--dash-border)] pl-3">{proposal.history.map(state => <li key={state.version}><p>{t(`proposalStatus.${state.status}`)} · {t(state.actorType === "SUPPLIER" ? "supplierActor" : "buyerActor")} · {date(state.effectiveAt)}</p>{state.reason && <p className="mt-1 whitespace-pre-wrap">{state.reason}</p>}</li>)}</ol></details>
          {proposal.status === "SUBMITTED" && <div className="mt-4 flex flex-wrap gap-3">{(["ACCEPT", "REJECT"] as const).map(decision => <button key={decision} className={button} type="button" disabled={disabled || !data.canManage || decision === "ACCEPT" && !proposal.canAccept} data-testid={decision === "ACCEPT" ? "buyer-accept-supplier-proposal" : "buyer-reject-supplier-proposal"} onClick={() => openDraft({ kind: "review", input: { purchaseOrderId: scope.purchaseOrderId, proposalId: proposal.proposalId, expectedOrderHash: data.purchaseOrder.currentOrderHash, expectedStateHash: proposal.stateHash, decision, reason: "" } })}>{b(decision === "ACCEPT" ? "acceptProposal" : "rejectProposal")}</button>)}</div>}
        </li>)}</ul>{envelope.nextProposalId && <button className={`mt-3 ${button}`} type="button" disabled={busy} onClick={() => void refresh({ envelopeId: envelope.id, beforeProposalId: envelope.nextProposalId! })}>{b("olderResponses")}</button>}</section>
      </article>)}
      {data.nextEnvelopeId && <button type="button" className={button} disabled={busy} onClick={() => void refresh({ beforeEnvelopeId: data.nextEnvelopeId! })}>{b("olderEnvelopes")}</button>}
    </>}
    <PurchaseOrderAmendmentDialog orderId={scope.purchaseOrderId} proposalId={amendmentProposalId} organizationId={scope.organizationId} actorId={scope.actorId} onClose={() => setAmendmentProposalId(null)} onConfirmed={() => { void refresh() }} />
  </section>
}
