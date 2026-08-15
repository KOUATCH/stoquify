"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { ArrowLeft, Check, Copy, Link2, ShieldCheck, X } from "lucide-react"

import {
  issueSupplierPoInviteAction,
  reviewSupplierPoProposalAction,
  revokeSupplierPoInviteAction,
} from "@/actions/purchaseOrderWorkflow/supplier-po-acknowledgement.actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { localizePath } from "@/i18n/routing"
import type { Locale } from "@/types/bilingual"

type ProposalStatus = "SUBMITTED" | "BUYER_ACCEPTED" | "BUYER_REJECTED"

type WorkbenchData = {
  purchaseOrder: {
    id: string
    orderNumber: string
    status: string
    expectedDeliveryDate: string | null
    updatedAt: string
    supplier: { name: string; email: string | null; preferredLocale: string }
  }
  envelopes: Array<{
    id: string
    contentHash: string
    sourceStateHash: string
    preferredLocale: string
    createdAt: string
    tokens: Array<{
      id: string
      status: string
      tokenHashPrefix: string
      recipientHashPrefix: string | null
      issuedAt: string
      expiresAt: string
      revokedAt: string | null
      revocationReason: string | null
      accessCount: number
    }>
    proposals: Array<{
      proposalId: string
      proposalType: "ACCEPT" | "REJECT" | "REQUEST_CHANGE"
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
    }>
  }>
  controls: {
    externalActionsAreProposals: true
    purchaseOrderAuthoritative: true
    stockAuthoritative: true
    accountsPayableAuthoritative: true
    accountingAuthoritative: true
  }
}

function identity(prefix: string) {
  return prefix + ":" + (globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36))
}

function shortHash(value: string) {
  return value.length > 25 ? value.slice(0, 12) + "…" + value.slice(-12) : value
}

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "ACTIVE" || status === "BUYER_ACCEPTED") return "default"
  if (status === "REVOKED" || status === "BUYER_REJECTED") return "destructive"
  return "secondary"
}

export function SupplierPoAcknowledgementWorkbench({
  initialData,
  locale,
}: {
  initialData: WorkbenchData
  locale: Locale
}) {
  const t = useTranslations("supplierPoAcknowledgement")
  const b = useTranslations("supplierPoAcknowledgement.buyerWorkbench")
  const router = useRouter()
  const [recipientReference, setRecipientReference] = useState(
    initialData.purchaseOrder.supplier.email ?? "",
  )
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [issuing, setIssuing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const issueIdentity = useRef({
    idempotencyKey: identity("supplier-po-invite"),
    correlationId: identity("supplier-po-invite-correlation"),
  })

  const dateFormatter = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
  const formatDate = (value: string) => dateFormatter.format(new Date(value))

  async function issueInvite() {
    setIssuing(true)
    setError(null)
    setMessage(null)
    const result = await issueSupplierPoInviteAction({
      purchaseOrderId: initialData.purchaseOrder.id,
      recipientReference: recipientReference || null,
      ...issueIdentity.current,
    })
    if (!result.success) {
      setError(result.error || b("actionFailed"))
      setIssuing(false)
      return
    }
    setInviteUrl(result.data.inviteUrl)
    issueIdentity.current = {
      idempotencyKey: identity("supplier-po-invite"),
      correlationId: identity("supplier-po-invite-correlation"),
    }
    setIssuing(false)
    router.refresh()
  }

  async function copyInvite() {
    if (!inviteUrl) return
    const absolute = inviteUrl.startsWith("http")
      ? inviteUrl
      : window.location.origin + inviteUrl
    await navigator.clipboard.writeText(absolute)
    setCopied(true)
  }

  async function revoke(tokenId: string, reason: string) {
    setBusyKey("revoke:" + tokenId)
    setError(null)
    const result = await revokeSupplierPoInviteAction({ tokenId, reason })
    if (!result.success) setError(result.error || b("actionFailed"))
    else {
      setMessage(b("accessRevoked"))
      setInviteUrl(null)
      router.refresh()
    }
    setBusyKey(null)
  }

  async function review(
    proposalId: string,
    decision: "ACCEPT" | "REJECT",
    reason: string,
  ) {
    setBusyKey("review:" + proposalId)
    setError(null)
    setMessage(null)
    const result = await reviewSupplierPoProposalAction({
      proposalId,
      decision,
      reason,
      idempotencyKey: identity("supplier-po-review"),
      correlationId: identity("supplier-po-review-correlation"),
    })
    if (!result.success) setError(result.error || b("actionFailed"))
    else {
      setMessage(b("reviewed"))
      router.refresh()
    }
    setBusyKey(null)
  }

  return (
    <div className="dashboard-landing-theme dark min-h-screen overflow-x-hidden">
      <main className="dashboard-landing-content mx-auto w-full max-w-[88rem] space-y-6 px-4 py-6 sm:px-6 sm:py-8" data-testid="supplier-po-buyer-workbench">
        <header className="dashboard-glass-panel rounded-2xl border border-[var(--dash-border-subtle)] p-6">
          <Link className="inline-flex items-center gap-2 text-sm font-bold text-[var(--dash-brand-strong)]" href={localizePath(`/dashboard/purchase-orders/${initialData.purchaseOrder.id}`, locale)}>
            <ArrowLeft className="h-4 w-4" /> {b("backToOrder")}
          </Link>
          <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--dash-brand-strong)]">{initialData.purchaseOrder.orderNumber}</p>
              <h1 className="mt-2 text-3xl font-black text-[var(--dash-text)]">{b("title")}</h1>
              <p className="mt-2 max-w-3xl text-sm text-[var(--dash-text-muted)]">{b("description")}</p>
            </div>
            <Badge variant="outline">{initialData.purchaseOrder.supplier.name}</Badge>
          </div>
          <div className="mt-6 flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-[var(--dash-text)]" data-testid="buyer-authoritative-boundary">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
            <p><strong>{t("proposalBoundaryTitle")}</strong> {b("authoritativeBoundary")}</p>
          </div>
        </header>

        {error ? <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-bold text-red-300" role="alert">{error}</div> : null}
        {message ? <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm font-bold text-emerald-300" role="status">{message}</div> : null}

        <Card className="dashboard-glass-panel border-[var(--dash-border-subtle)] text-[var(--dash-text)]">
          <CardHeader><CardTitle>{b("issueTitle")}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 sm:max-w-xl">
              <Label htmlFor="recipient-reference">{b("recipientReference")}</Label>
              <Input id="recipient-reference" placeholder={b("recipientPlaceholder")} value={recipientReference} onChange={(event) => setRecipientReference(event.target.value)} />
            </div>
            <Button disabled={issuing || initialData.purchaseOrder.status !== "APPROVED"} onClick={issueInvite} data-testid="issue-supplier-po-invite">
              <Link2 className="mr-2 h-4 w-4" /> {issuing ? b("issuing") : b("issue")}
            </Button>
            {inviteUrl ? (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4" data-testid="supplier-po-invite-ready">
                <p className="font-black">{b("invitationReady")}</p>
                <p className="mt-1 text-sm text-[var(--dash-text-muted)]">{b("oneTimeWarning")}</p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <Input aria-label={b("invitationReady")} readOnly value={inviteUrl} data-testid="supplier-po-invite-url" />
                  <Button variant="outline" onClick={copyInvite} type="button"><Copy className="mr-2 h-4 w-4" /> {copied ? b("copied") : b("copyLink")}</Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {initialData.envelopes.length === 0 ? (
          <Card className="dashboard-glass-panel border-[var(--dash-border-subtle)] p-6 text-[var(--dash-text-muted)]">{b("noEnvelope")}</Card>
        ) : initialData.envelopes.map((envelope) => (
          <Card className="dashboard-glass-panel border-[var(--dash-border-subtle)] text-[var(--dash-text)]" key={envelope.id}>
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center justify-between gap-3">
                <span>{b("envelope")} · {formatDate(envelope.createdAt)}</span>
                <code className="text-xs font-normal text-[var(--dash-text-muted)]">{b("hash")}: {shortHash(envelope.contentHash)}</code>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              <section>
                <h2 className="font-black">{b("tokens")}</h2>
                {envelope.tokens.length === 0 ? <p className="mt-3 text-sm text-[var(--dash-text-muted)]">{b("noTokens")}</p> : (
                  <div className="mt-3 grid gap-3">
                    {envelope.tokens.map((token) => (
                      <TokenRow key={token.id} token={token} busy={busyKey === "revoke:" + token.id} formatDate={formatDate} onRevoke={revoke} b={b} />
                    ))}
                  </div>
                )}
              </section>
              <section>
                <h2 className="font-black">{b("proposals")}</h2>
                {envelope.proposals.length === 0 ? <p className="mt-3 text-sm text-[var(--dash-text-muted)]">{b("noProposals")}</p> : (
                  <div className="mt-3 grid gap-4">
                    {envelope.proposals.map((proposal) => (
                      <ProposalCard key={proposal.proposalId} proposal={proposal} busy={busyKey === "review:" + proposal.proposalId} formatDate={formatDate} onReview={review} t={t} b={b} />
                    ))}
                  </div>
                )}
              </section>
            </CardContent>
          </Card>
        ))}
      </main>
    </div>
  )
}

type Translator = ReturnType<typeof useTranslations>

function TokenRow({
  token,
  busy,
  formatDate,
  onRevoke,
  b,
}: {
  token: WorkbenchData["envelopes"][number]["tokens"][number]
  busy: boolean
  formatDate: (value: string) => string
  onRevoke: (tokenId: string, reason: string) => Promise<void>
  b: Translator
}) {
  const [reason, setReason] = useState("")
  return (
    <div className="rounded-xl border border-[var(--dash-border-subtle)] p-4" data-testid={`supplier-po-token-${token.id}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><Badge variant={statusVariant(token.status)}>{b(token.status === "ACTIVE" ? "active" : token.status === "REVOKED" ? "revoked" : "expired")}</Badge><span className="ml-3 font-mono text-xs text-[var(--dash-text-muted)]">{token.tokenHashPrefix}</span></div>
        <p className="text-xs text-[var(--dash-text-muted)]">{b("expires")}: {formatDate(token.expiresAt)} · {b("accesses")}: {token.accessCount}</p>
      </div>
      {token.status === "ACTIVE" ? (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Input aria-label={b("revokeReason")} placeholder={b("revokeReason")} value={reason} onChange={(event) => setReason(event.target.value)} />
          <Button variant="destructive" disabled={busy || reason.trim().length < 3} onClick={() => onRevoke(token.id, reason)} data-testid={`revoke-supplier-po-token-${token.id}`}><X className="mr-2 h-4 w-4" /> {b("revoke")}</Button>
        </div>
      ) : token.revocationReason ? <p className="mt-3 text-sm text-[var(--dash-text-muted)]">{token.revocationReason}</p> : null}
    </div>
  )
}

function ProposalCard({
  proposal,
  busy,
  formatDate,
  onReview,
  t,
  b,
}: {
  proposal: WorkbenchData["envelopes"][number]["proposals"][number]
  busy: boolean
  formatDate: (value: string) => string
  onReview: (proposalId: string, decision: "ACCEPT" | "REJECT", reason: string) => Promise<void>
  t: Translator
  b: Translator
}) {
  const [reason, setReason] = useState("")
  return (
    <article className="rounded-xl border border-[var(--dash-border-subtle)] p-5" data-testid={`supplier-po-proposal-${proposal.proposalId}`}>
      <div className="flex flex-wrap items-center gap-3"><h3 className="font-black">{t(`proposalType.${proposal.proposalType}`)}</h3><Badge variant={statusVariant(proposal.status)} data-testid="buyer-proposal-status">{t(`proposalStatus.${proposal.status}`)}</Badge></div>
      {proposal.requestedDeliveryDate ? <p className="mt-3 text-sm"><strong>{t("requestedDate")}:</strong> {formatDate(proposal.requestedDeliveryDate)}</p> : null}
      {proposal.quantityChanges.length ? <div className="mt-3 text-sm"><strong>{b("requestedChanges")}:</strong>{proposal.quantityChanges.map((line) => <p className="mt-1 font-mono text-xs" key={line.purchaseOrderLineId}>{line.purchaseOrderLineId}: {line.originalOrderedQuantity} → {line.requestedQuantity}</p>)}</div> : null}
      {proposal.note ? <div className="mt-3 rounded-lg bg-[var(--dash-surface-muted)] p-3 text-sm"><strong>{b("supplierNote")}:</strong> {proposal.note}</div> : null}
      <h4 className="mt-5 text-sm font-black">{b("history")}</h4>
      <ol className="mt-2 space-y-3 border-l-2 border-[var(--dash-border-subtle)] pl-4">
        {proposal.history.map((state) => <li key={state.version}><p className="text-sm font-bold">{t(`proposalStatus.${state.status}`)} · {state.actorType}</p><p className="text-xs text-[var(--dash-text-muted)]">{formatDate(state.effectiveAt)} · {shortHash(state.stateHash)}</p>{state.reason ? <p className="mt-1 text-sm">{state.reason}</p> : null}</li>)}
      </ol>
      {proposal.status === "SUBMITTED" ? (
        <div className="mt-5 space-y-3">
          <Label htmlFor={`review-reason-${proposal.proposalId}`}>{b("reviewReason")}</Label>
          <Textarea id={`review-reason-${proposal.proposalId}`} value={reason} onChange={(event) => setReason(event.target.value)} />
          <div className="flex flex-wrap gap-2">
            <Button disabled={busy || reason.trim().length < 3} onClick={() => onReview(proposal.proposalId, "ACCEPT", reason)} data-testid="buyer-accept-supplier-proposal"><Check className="mr-2 h-4 w-4" /> {b("acceptProposal")}</Button>
            <Button variant="destructive" disabled={busy || reason.trim().length < 3} onClick={() => onReview(proposal.proposalId, "REJECT", reason)} data-testid="buyer-reject-supplier-proposal"><X className="mr-2 h-4 w-4" /> {b("rejectProposal")}</Button>
          </div>
        </div>
      ) : null}
    </article>
  )
}
