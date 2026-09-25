"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { approvePurchaseOrder, previewPurchaseOrderApproval } from "@/actions/purchaseOrderWorkflow/purchaseOrderSystemAction"
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"
import { purchaseApprovalRequestSchema, purchaseApprovalReceiptSchema, type PurchaseApprovalRequest, type PurchaseApprovalPreview, type PurchaseApprovalReceipt } from "@/services/purchase-order/purchase-order-approval-contracts"

export const purchaseApprovalStorageKey = (organizationId: string, actorId: string) => `stoquify:purchase-approval:${JSON.stringify([organizationId, actorId])}`

// Retains only the exact command identifiers. Passwords, session credentials and order contents never enter storage.
export function PurchaseOrderApprovalDialog({ orderId, organizationId, actorId, onClose, onConfirmed }: {
  orderId: string | null; organizationId: string; actorId: string; onClose: () => void; onConfirmed: () => void;
}) {
  const t = useTranslations("purchaseOrderApproval"), locale = useLocale()
  const [activeId, setActiveId] = useState<string | null>(null), [preview, setPreview] = useState<PurchaseApprovalPreview | null>(null)
  const [pending, setPending] = useState<PurchaseApprovalRequest | null>(null), [receipt, setReceipt] = useState<PurchaseApprovalReceipt | null>(null)
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [needsPassword, setNeedsPassword] = useState(false), [password, setPassword] = useState("")
  const generation = useRef(0), inFlight = useRef(false), initializedKey = useRef("")
  const invalidatePending = useCallback(() => { ++generation.current }, [])
  const returnFocus = useRef<HTMLElement | null>(null)
  const key = purchaseApprovalStorageKey(organizationId, actorId)
  const explain = useCallback((code?: string) => t(code === "CONFLICT" ? "stale" : code === "FRESH_AUTH_REQUIRED" ? "fresh" : ["FORBIDDEN", "AUTH_REQUIRED", "NOT_FOUND"].includes(code ?? "") ? "denied" : code === "SOD_VIOLATION" ? "separation" : code === "BUSINESS_RULE_VIOLATION" ? "unavailable" : "unknown"), [t])

  const load = useCallback(async (id: string) => {
    const current = ++generation.current
    setBusy(true); setError(""); setPreview(null)
    try {
      const result = await previewPurchaseOrderApproval(id, organizationId)
      if (current !== generation.current) return
      if (!result.success || !result.data) { setError(explain(result.code)); return }
      if (result.data.actorId !== actorId || result.data.organizationId !== organizationId || result.data.orderId !== id) { setError(t("denied")); return }
      setPreview(result.data); setNeedsPassword(result.data.requiresFreshAuth)
    } catch { if (current === generation.current) setError(t("loadFailed")) }
    finally { if (current === generation.current) setBusy(false) }
  }, [actorId, organizationId, explain, t])
  const loadCurrent = useRef(load), currentText = useRef(t)
  loadCurrent.current = load; currentText.current = t

  useEffect(() => {
    if (!actorId || !organizationId) return
    if (!orderId && initializedKey.current === key) return
    initializedKey.current = key
    ++generation.current; setReceipt(null); setPreview(null); setPassword(""); setNeedsPassword(false); setPending(null); setError("")
    let stored: { orderId: string; request: PurchaseApprovalRequest } | null = null
    try {
      const raw = sessionStorage.getItem(key)
      if (raw && raw.length < 2000) { const value = JSON.parse(raw); const parsed = purchaseApprovalRequestSchema.safeParse(value.request); if (parsed.success && typeof value.orderId === "string" && value.orderId.length > 0 && value.orderId.length < 192) stored = { orderId: value.orderId, request: parsed.data } }
    } catch { setError(currentText.current("storage")) }
    if (stored) { setActiveId(stored.orderId); setPending(stored.request); setBusy(false); setError(currentText.current("unknown")) }
    else { setActiveId(orderId); if (orderId) void loadCurrent.current(orderId) }
    return invalidatePending
  }, [orderId, actorId, organizationId, key, invalidatePending])

  const confirm = async () => {
    if (!activeId || inFlight.current || (!pending && !preview)) return
    const current = generation.current
    inFlight.current = true; setBusy(true); setError("")
    try {
      if (needsPassword) {
        const verified = await stepUpWithPasswordAction({ password }); setPassword("")
        if (current !== generation.current) return
        if (!verified.success) { setError(t("passwordFailed")); return }
      }
      const request = pending ?? { expectedRevision: preview!.revision, idempotencyKey: crypto.randomUUID() }
      try { sessionStorage.setItem(key, JSON.stringify({ orderId: activeId, request })) } catch { setError(t("storage")); return }
      setPending(request)
      const result = await approvePurchaseOrder(activeId, organizationId, request)
      if (current !== generation.current) return
      if (!result.success || !result.data) {
        setError(explain(result.code))
        if (result.code === "FRESH_AUTH_REQUIRED") setNeedsPassword(true)
        // These responses definitively rejected the transaction; unknown failures keep exact recovery available.
        if (["CONFLICT", "SOD_VIOLATION", "BUSINESS_RULE_VIOLATION", "VALIDATION_ERROR"].includes(result.code ?? "")) { sessionStorage.removeItem(key); setPending(null); setPreview(null) }
        return
      }
      const received = result.data.approvalReceipt
      const { replayed, ...record } = received
      const valid = purchaseApprovalReceiptSchema.safeParse(record)
      if (!valid.success || typeof replayed !== "boolean" || received.requestReference !== request.idempotencyKey || received.reviewedRevision !== request.expectedRevision || received.orderId !== activeId || received.approvedById !== actorId) { setError(t("unknown")); return }
      sessionStorage.removeItem(key); setPending(null); setReceipt(received); setNeedsPassword(false)
    } catch { if (current === generation.current) { setPassword(""); setError(t("unknown")) } }
    finally { inFlight.current = false; if (current === generation.current) setBusy(false) }
  }
  const close = () => { if (busy) return; ++generation.current; setActiveId(null); setPassword(""); onClose(); if (receipt) onConfirmed() }
  const money = (value: string) => preview ? new Intl.NumberFormat(locale, { style: "currency", currency: preview.currency }).format(Number(value)) : value
  return <Dialog open={Boolean(activeId)} onOpenChange={open => { if (!open) close() }}>
    <DialogContent closeLabel={t("close")} closeDisabled={busy} className="dashboard-landing-theme dark dashboard-glass-panel max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl grid-cols-[minmax(0,1fr)] overflow-y-auto p-4 text-[var(--dash-text)] [overflow-wrap:anywhere] [&>*]:min-w-0 sm:p-6 motion-reduce:animate-none" onOpenAutoFocus={() => { returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null }} onCloseAutoFocus={event => { event.preventDefault(); if (returnFocus.current?.isConnected) returnFocus.current.focus() }} onEscapeKeyDown={event => { if (busy) event.preventDefault() }} onPointerDownOutside={event => { if (busy) event.preventDefault() }}>
      <DialogHeader className="text-left"><DialogTitle>{t("title")}</DialogTitle><DialogDescription>{t("consequence")}</DialogDescription></DialogHeader>
      <div aria-live="polite">{busy && <p role="status">{t("working")}</p>}</div>
      {error && <p role="alert" className="break-words text-[var(--dash-warning)]">{error}</p>}
      {pending && !preview && <p className="break-all text-sm">{activeId}<br />{t("reference")}: {pending.idempotencyKey}</p>}
      {receipt ? <div role="status" className="space-y-2 break-words"><p>{t("recorded")}</p><p>{new Date(receipt.approvedAt).toLocaleString(locale)}</p><p>{t("reference")}: {receipt.requestReference}</p><p>{t("recordMeaning")}</p></div> : preview && <section aria-label={t("review")} className="min-w-0 space-y-4 break-words">
        <h3 className="font-semibold">{preview.orderNumber}</h3>
        <dl className="grid gap-3 sm:grid-cols-2">{([["requester", preview.requester], ["supplier", preview.supplier], ["location", preview.location], ["total", money(preview.total)], ["orderDate", new Date(preview.orderDate).toLocaleDateString(locale)], ["delivery", preview.expectedDeliveryDate ? new Date(preview.expectedDeliveryDate).toLocaleDateString(locale) : t("unspecified")], ["shipping", money(preview.shippingCost)], ["tax", money(preview.taxAmount)], ["discount", money(preview.discount)], ["terms", preview.paymentTerms || t("unspecified")]] as const).map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-sm text-[var(--dash-text-soft)]">{t(label)}</dt><dd>{value}</dd></div>)}</dl>
        <ul className="space-y-2" aria-label={t("lines")}>{preview.lines.map(line => <li key={line.id} className="rounded-lg border border-[var(--dash-border-subtle)] p-3"><p>{locale === "fr" ? line.nameFr : line.nameEn}</p><p>{t("quantity")}: {line.quantity} × {money(line.unitCost)} · {money(line.total)}</p><p>{t("tax")}: {line.taxRate}% · {t("discount")}: {money(line.discount)}</p>{line.notes && <p className="whitespace-pre-wrap">{t("notes")}: {line.notes}</p>}</li>)}</ul>
        {preview.notes && <div><h4>{t("notes")}</h4><p className="whitespace-pre-wrap">{preview.notes}</p></div>}
      </section>}
      {!receipt && needsPassword && <div className="space-y-2"><Label htmlFor="purchase-approval-password">{t("password")}</Label><Input id="purchase-approval-password" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} disabled={busy} /><p className="text-sm">{t("fresh")}</p></div>}
      <div className="flex flex-wrap justify-end gap-2 pt-3 [&>button]:h-auto [&>button]:min-h-10 [&>button]:min-w-0 [&>button]:max-w-full">
        <Button type="button" className="dashboard-button-secondary whitespace-normal" variant="outline" disabled={busy} onClick={close}>{t("close")}</Button>
        {!receipt && !pending && <Button type="button" className="dashboard-button-secondary whitespace-normal" variant="outline" disabled={busy} onClick={() => activeId && void load(activeId)}>{t("reviewCurrent")}</Button>}
        {!receipt && (pending || preview) && <Button type="button" className="dashboard-button-primary whitespace-normal" disabled={busy || (needsPassword && !password)} onClick={() => void confirm()}>{t(pending ? "recover" : "approve")}</Button>}
      </div>
    </DialogContent>
  </Dialog>
}
