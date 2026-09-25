"use client"

import { useState } from "react"
import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
import { ArrowLeft, ArrowRight, CheckCircle2, RefreshCw, Truck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { localizePath, pickLocale } from "@/i18n/routing"
import { useTransferCommand, useTransferWorkflow } from "@/hooks/useTransferLifecycle"
import type { TransferDetail, TransferOperation } from "@/types/transferLifecycle"

const stages = ["DRAFT", "SUBMITTED", "APPROVED", "IN_TRANSIT", "PARTIALLY_RECEIVED", "COMPLETED"] as const

export function TransferWorkflowPage({ organizationId, transferId }: { organizationId: string; transferId: string }) {
  const query = useTransferWorkflow(organizationId, transferId)
  const locale = pickLocale(useLocale())
  const t = useTranslations("inventoryTransferLifecycle")
  return (
    <div className="dashboard-landing-theme min-h-screen text-[var(--dash-text)]">
      <div className="dashboard-landing-content mx-auto flex w-full min-w-0 max-w-[88rem] flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
        <nav><Button asChild variant="outline" className="dashboard-button-secondary"><Link href={localizePath("/dashboard/inventory/transfers", locale)}><ArrowLeft className="mr-2 h-4 w-4" />{t("back")}</Link></Button></nav>
        {query.isLoading ? <p role="status">{t("loading")}</p> : query.isError ? (
          <Card className="rounded-lg border-[var(--dash-border-subtle)] bg-[var(--dash-surface)] text-[var(--dash-text)]"><CardContent className="space-y-3 pt-6"><p role="alert">{query.error.message}</p><Button onClick={() => query.refetch()}>{t("retry")}</Button></CardContent></Card>
        ) : query.data ? <TransferWorkflow key={transferId} data={query.data} organizationId={organizationId} refresh={() => query.refetch()} /> : <p>{t("unavailable")}</p>}
      </div>
    </div>
  )
}

function TransferWorkflow({ data, organizationId, refresh }: { data: TransferDetail; organizationId: string; refresh: () => void }) {
  const { transfer, allowedOperations, history, blockingIssue } = data
  const t = useTranslations("inventoryTransferLifecycle")
  const locale = useLocale()
  const mutation = useTransferCommand()
  const [operation, setOperation] = useState<TransferOperation | null>(null)
  const [notes, setNotes] = useState("")
  const [operationRevision, setOperationRevision] = useState("")
  const [quantities, setQuantities] = useState<Record<string, string>>({})
  const [locationConfirmed, setLocationConfirmed] = useState(false)
  const [success, setSuccess] = useState(false)
  const received = transfer.lines.reduce((sum, line) => sum + (line.receivedQuantity ?? 0), 0)
  const shipped = transfer.lines.reduce((sum, line) => sum + (line.shippedQuantity ?? 0), 0)
  const quantityFormat = new Intl.NumberFormat(locale, { maximumFractionDigits: 3 })
  const date = (value: string | Date) => new Date(value).toLocaleString(locale)
  const receiptLines = transfer.lines.flatMap(line => Number(quantities[line.id]) > 0 ? [{ lineId: line.id, quantity: Number(quantities[line.id]) }] : [])
  const invalidReceipt = transfer.lines.some(line => {
    const raw = quantities[line.id] ?? ""
    const value = Number(raw)
    return raw !== "" && (!Number.isFinite(value) || value < 0 || value > (line.shippedQuantity ?? 0) - (line.receivedQuantity ?? 0) || !/^\d+(\.\d{1,3})?$/.test(raw))
  })
  const returning = operation === "RETURN_TO_DRAFT"
  const needsReason = operation === "CANCEL" || operation === "REJECT" || returning
  const needsLocation = operation === "RECEIVE" || operation === "DISPATCH"
  const disabled = mutation.isPending || !operation || !allowedOperations.includes(operation)
    || ((needsLocation || returning) && !locationConfirmed)
    || (needsReason && !notes.trim())
    || (operation === "RECEIVE" && (!receiptLines.length || invalidReceipt))

  function choose(next: TransferOperation) {
    setOperation(next); setOperationRevision(new Date(transfer.updatedAt).toISOString()); setNotes(""); setQuantities({}); setLocationConfirmed(false); setSuccess(false); mutation.reset()
  }
  function refreshReview() {
    setOperation(null); setLocationConfirmed(false); mutation.reset(); refresh()
  }
  async function execute() {
    if (disabled || !operation) return
    try {
      await mutation.mutateAsync({
        organizationId, transferId: transfer.id, operation,
        expectedUpdatedAt: operationRevision,
        ...(returning ? { confirmNoMovement: locationConfirmed } : {}),
        ...(needsLocation ? { locationId: operation === "RECEIVE" ? transfer.toLocationId : transfer.fromLocationId } : {}),
        ...(operation === "RECEIVE" ? { lines: receiptLines } : {}),
        notes: notes.trim() || undefined,
      })
      setOperation(null); setQuantities({}); setNotes(""); setSuccess(true)
    } catch { /* Keep the entered receipt and its retry key after a failed request. */ }
  }
  return (
    <>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-sm text-[var(--dash-text-muted)]">{t("title")}</p><h1 className="mt-1 text-3xl font-semibold">{transfer.transferNumber}</h1>
          <p className="mt-3 flex flex-wrap items-center gap-2 text-[var(--dash-text-muted)]">{transfer.fromLocation.name}<ArrowRight className="h-4 w-4" />{transfer.toLocation.name}</p></div>
        <div className="flex items-center gap-3"><Badge variant="outline" className={blockingIssue ? "border-[var(--dash-warning)] bg-[var(--dash-warning-soft)] text-[var(--dash-warning)]" : transfer.status === "COMPLETED" ? "border-[var(--dash-success)] bg-[var(--dash-success-soft)] text-[var(--dash-success)]" : transfer.status === "CANCELLED" ? "border-[var(--dash-danger)] bg-[var(--dash-danger-soft)] text-[var(--dash-danger)]" : ["IN_TRANSIT", "PARTIALLY_RECEIVED"].includes(transfer.status) ? "border-[var(--dash-warning)] bg-[var(--dash-warning-soft)] text-[var(--dash-warning)]" : "border-[var(--dash-info)] bg-[var(--dash-info-soft)] text-[var(--dash-info)]"}>{blockingIssue ? t("needsCorrection") : t(`status.${transfer.status}`)}</Badge>
          <Button variant="outline" disabled={mutation.isPending} onClick={refreshReview} aria-label={t("refresh")}><RefreshCw className="h-4 w-4" /></Button></div>
      </header>
      {success && <p role="status" className="rounded-xl bg-[var(--dash-success-soft)] p-4 text-[var(--dash-success)]">{t("saved")}</p>}
      <ol aria-label={t("progress")} className="grid grid-cols-2 gap-2 md:grid-cols-6">
        {stages.map((stage, index) => <li key={stage} aria-current={transfer.status === stage ? "step" : undefined}
          className={`rounded-xl border p-3 text-sm ${index <= stages.indexOf(transfer.status as typeof stages[number]) ? "border-[var(--dash-brand)] bg-[var(--dash-brand-soft)] text-[var(--dash-brand-strong)]" : "border-[var(--dash-border-subtle)] text-[var(--dash-text-muted)]"}`}>
          <span className="mb-1 block text-xs">{index + 1}</span>{blockingIssue && stage === transfer.status ? t("needsCorrection") : t(`status.${stage}`)}
        </li>)}
      </ol>
      <Card className="rounded-lg border-[var(--dash-border-subtle)] bg-[var(--dash-surface)] text-[var(--dash-text)]"><CardHeader><CardTitle>{t("nextStep")}</CardTitle></CardHeader><CardContent className="space-y-4">
        <p className="text-[var(--dash-text-muted)]">{blockingIssue ? t("issue." + blockingIssue) : t("guidance." + transfer.status)}</p>
        {blockingIssue && <p role="alert" className="rounded-lg bg-[var(--dash-warning-soft)] p-3 text-sm text-[var(--dash-warning)]">{t(allowedOperations.includes("RETURN_TO_DRAFT") ? "correctionAvailable" : "reconciliationRequired")}</p>}
        {transfer.status === "SUBMITTED" && !allowedOperations.includes("APPROVE") && <p className="text-sm text-[var(--dash-warning)]">{t("independentApproval")}</p>}
        <div className="flex flex-wrap gap-2">{allowedOperations.map(action => <Button key={action} disabled={mutation.isPending} onClick={() => choose(action)}
          variant={action === "CANCEL" || action === "REJECT" ? "outline" : "default"} className={action === "CANCEL" || action === "REJECT" ? "dashboard-button-secondary" : "dashboard-button-primary"}>{t(`operation.${action}`)}</Button>)}</div>
        {operation && <section aria-label={t(`operation.${operation}`)} className="space-y-4 rounded-xl border border-[var(--dash-border-subtle)] p-4">
          <h2 className="font-semibold">{t(`operation.${operation}`)}</h2>
          <p className="text-sm text-[var(--dash-text-muted)]">{t(`confirm.${operation}`)}</p>
          {operation === "RECEIVE" && <div className="space-y-3">
            {transfer.lines.filter(line => (line.shippedQuantity ?? 0) > (line.receivedQuantity ?? 0)).map(line => (
              <div key={line.id} className="grid items-center gap-2 border-b border-[var(--dash-border-subtle)] pb-3 sm:grid-cols-[1fr_10rem]">
                <Label htmlFor={`receive-${line.id}`}><span className="block">{line.item.name} · {line.item.sku}</span><span className="mt-1 block font-normal text-[var(--dash-text-muted)]">{t("outstanding")}: {quantityFormat.format((line.shippedQuantity ?? 0) - (line.receivedQuantity ?? 0))}</span></Label>
                <Input id={`receive-${line.id}`} aria-label={t("receiveQuantity", { item: line.item.name })} className="dashboard-control" type="number" inputMode="decimal" min="0" step="0.001"
                  max={(line.shippedQuantity ?? 0) - (line.receivedQuantity ?? 0)} value={quantities[line.id] ?? ""} disabled={mutation.isPending}
                  onChange={event => setQuantities(current => ({ ...current, [line.id]: event.target.value }))} />
              </div>
            ))}
            {invalidReceipt && <p role="alert" className="text-[var(--dash-danger)]">{t("invalidQuantity")}</p>}
          </div>}
          {(needsLocation || returning) && <label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={locationConfirmed} disabled={mutation.isPending} onChange={event => setLocationConfirmed(event.target.checked)} className="mt-1 h-4 w-4" />
            {t(returning ? "confirmNoMovement" : operation === "RECEIVE" ? "confirmDestination" : "confirmSource", { location: operation === "RECEIVE" ? transfer.toLocation.name : transfer.fromLocation.name })}</label>}
          <div className="space-y-2"><Label htmlFor="transfer-operation-notes">{t(needsReason ? "reason" : "notes")}</Label><Textarea id="transfer-operation-notes" className="dashboard-control" value={notes} maxLength={2000} disabled={mutation.isPending} onChange={event => setNotes(event.target.value)} /></div>
          {mutation.isError && <div role="alert" className="space-y-2 text-[var(--dash-danger)]"><p>{mutation.error.message}</p><Button variant="outline" onClick={refreshReview}>{t("refresh")}</Button></div>}
          <div className="flex flex-wrap gap-2"><Button className="dashboard-button-primary" disabled={disabled} onClick={execute}>{mutation.isPending ? t("saving") : t(`operation.${operation}`)}</Button>
            <Button variant="outline" disabled={mutation.isPending} onClick={() => setOperation(null)}>{t("closeAction")}</Button></div>
        </section>}
      </CardContent></Card>
      <Card className="rounded-lg border-[var(--dash-border-subtle)] bg-[var(--dash-surface)] text-[var(--dash-text)]"><CardHeader><CardTitle className="flex items-center gap-2"><Truck className="h-5 w-5" />{t("items")}</CardTitle>
        <p className="text-sm text-[var(--dash-text-muted)]">{t(blockingIssue ? "recordedSummary" : "receivedSummary", { received: quantityFormat.format(received), shipped: quantityFormat.format(shipped) })}</p></CardHeader>
        <CardContent><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b border-[var(--dash-border-subtle)]">
          {[t("item"), t("requested"), t("shipped"), t("received"), t("outstanding")].map(label => <th key={label} className="p-3 font-medium">{label}</th>)}
        </tr></thead><tbody>{transfer.lines.map(line => <tr key={line.id} className="border-b border-[var(--dash-border-subtle)]">
          <td className="p-3"><span className="block font-medium">{line.item.name}</span><span className="text-[var(--dash-text-muted)]">{line.item.sku}</span></td>
          {[line.requestedQuantity, line.shippedQuantity ?? 0, line.receivedQuantity ?? 0, (line.shippedQuantity ?? 0) - (line.receivedQuantity ?? 0)].map((value, index) => <td key={index} className="p-3 tabular-nums">{quantityFormat.format(value)}</td>)}
        </tr>)}</tbody></table></div>{transfer.notes && <p className="mt-4 whitespace-pre-wrap text-sm text-[var(--dash-text-muted)]">{transfer.notes}</p>}</CardContent>
      </Card>
      <Card className="rounded-lg border-[var(--dash-border-subtle)] bg-[var(--dash-surface)] text-[var(--dash-text)]"><CardHeader><CardTitle>{t("history")}</CardTitle></CardHeader><CardContent>
        <ol className="space-y-4"><li className="border-l-2 border-[var(--dash-border-subtle)] pl-4"><p className="font-medium">{t("created")}</p><p className="text-sm text-[var(--dash-text-muted)]">{date(transfer.createdAt)} · {transfer.createdBy?.name}</p></li>
          {history.map(entry => <li key={entry.id} className="border-l-2 border-[var(--dash-brand)] pl-4">
            <p className="flex items-center gap-2 font-medium"><CheckCircle2 className="h-4 w-4" />{t.has(`event.${entry.operation}`) ? t(`event.${entry.operation}`) : entry.operation}</p>
            <p className="text-sm text-[var(--dash-text-muted)]">{date(entry.occurredAt)} · {entry.actor} · {entry.locationId === transfer.toLocationId ? transfer.toLocation.name : transfer.fromLocation.name}</p>
            {entry.lines.map(line => <p key={line.lineId} className="text-sm">{transfer.lines.find(item => item.id === line.lineId)?.item.name}: {quantityFormat.format(line.quantity)}</p>)}
            {entry.notes && <p className="mt-1 whitespace-pre-wrap text-sm">{entry.notes}</p>}
          </li>)}
        </ol>
      </CardContent></Card>
    </>
  )
}
