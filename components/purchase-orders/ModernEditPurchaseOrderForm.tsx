"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useFieldArray, useForm, type FieldPath } from "react-hook-form"
import { useRouter, usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { ArrowLeft, Plus, Save, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useUpdatePurchaseOrder } from "@/hooks/useRecentPurchaseOrderQueries"
import { getLocaleFromPathname, localizePath } from "@/i18n/routing"
import { notify } from "@/lib/notifications/notify"
import type { PurchaseOrderWithRelations } from "@/types/purchase-orders-system-types"
import { formatPurchaseOrderMoney } from "./purchase-order-money"
import { purchaseOrderEditDefaults, purchaseOrderEditPayload, purchaseOrderEditTotals, type PurchaseOrderEditValues } from "./purchase-order-edit-model"
import { getCurrentPurchaseOrderDraft } from "@/actions/purchaseOrderWorkflow/purchaseOrderSystemAction"
import { comparePurchaseOrderDraft, editFields, purchaseOrderDraftKey, readPurchaseOrderDraft, resolvePurchaseOrderDraft, type EditField } from "./purchase-order-edit-draft"
import type { UpdatePurchaseOrderDTO } from "@/types/purchase-orders-system-types"

interface ModernEditPurchaseOrderFormProps {
  purchaseOrder: PurchaseOrderWithRelations
  suppliers: Array<{ id: string; name: string; email?: string }>
  locations: Array<{ id: string; name: string }>
  items: Array<{ id: string; name: string; sku: string; costPrice?: number }>
  organizationId: string
  actorId: string
  currency: string
}

export function ModernEditPurchaseOrderForm({ purchaseOrder, suppliers, locations, items, organizationId, actorId, currency }: ModernEditPurchaseOrderFormProps) {
  const t = useTranslations("purchaseOrderEdit")
  const router = useRouter()
  const locale = getLocaleFromPathname(usePathname()) ?? "en"
  const savedHref = localizePath(`/dashboard/purchase-orders/${purchaseOrder.id}`, locale)
  const mutation = useUpdatePurchaseOrder({ handlesFeedbackLocally: true })
  const locked = purchaseOrder.status !== "DRAFT"
  const [pendingRequest, setPendingRequest] = useState<UpdatePurchaseOrderDTO | null>(null)
  const readOnly = locked || !!pendingRequest
  const baseline = useRef({ revision: purchaseOrder.editRevision ?? "", values: purchaseOrderEditDefaults(purchaseOrder) })
  const [comparison, setComparison] = useState<PurchaseOrderWithRelations | null>(null)
  const [choices, setChoices] = useState<Partial<Record<EditField, "draft" | "current">>>({})
  const [checking, setChecking] = useState(false)
  const [storageFailed, setStorageFailed] = useState(false)
  const draftKey = purchaseOrderDraftKey(organizationId, actorId, purchaseOrder.id)
  const submitting = useRef(false)
  const alertRef = useRef<HTMLDivElement>(null)
  const backRef = useRef<HTMLButtonElement>(null)
  const stepRef = useRef<HTMLHeadingElement>(null)
  const comparisonRef = useRef<HTMLHeadingElement>(null)
  const [ready, setReady] = useState(false)
  const [pending, setPending] = useState(false)
  const [step, setStep] = useState(0)
  const [failure, setFailure] = useState<"rejected" | "unknown" | "validation" | "stale" | "denied" | null>(null)
  const [showLeave, setShowLeave] = useState(false)
  const orderDate = new Date(purchaseOrder.orderDate).toISOString().slice(0, 10)
  const schema = useMemo(() => z.object({
    supplierId: z.string().min(1, t("required")),
    locationId: z.string().min(1, t("required")),
    expectedDeliveryDate: z.string().refine((value) => {
      if (!value) return !purchaseOrder.expectedDeliveryDate
      return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && value >= orderDate
    }, t("invalidDate")),
    paymentTerms: z.string(),
    notes: z.string(),
    shippingCost: z.number({ invalid_type_error: t("nonnegative") }).finite(t("nonnegative")).min(0, t("nonnegative")),
    lines: z.array(z.object({
      itemId: z.string().min(1, t("required")),
      quantity: z.number({ invalid_type_error: t("positiveQuantity") }).finite(t("positiveQuantity")).positive(t("positiveQuantity")).max(999_999_999.999, t("positiveQuantity")).refine(value => /^\d{1,9}(?:\.\d{1,3})?$/.test(String(value)), t("positiveQuantity")),
      unitPrice: z.number({ invalid_type_error: t("nonnegative") }).finite(t("nonnegative")).min(0, t("nonnegative")),
      taxRate: z.number({ invalid_type_error: t("taxRange") }).finite(t("taxRange")).min(0, t("taxRange")).max(100, t("taxRange")),
      discount: z.number({ invalid_type_error: t("nonnegative") }).finite(t("nonnegative")).min(0, t("nonnegative")),
      notes: z.string(),
    })).min(1, t("atLeastOne")),
  }).superRefine((value, ctx) => {
    const seen = new Set<string>()
    value.lines.forEach((line, index) => {
      if (seen.has(line.itemId)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["lines", index, "itemId"], message: t("duplicateItem") })
      seen.add(line.itemId)
    })
  }), [t, orderDate, purchaseOrder.expectedDeliveryDate])
  const form = useForm<PurchaseOrderEditValues>({
    resolver: zodResolver(schema),
    defaultValues: purchaseOrderEditDefaults(purchaseOrder),
  })
  const lines = useFieldArray({ control: form.control, name: "lines" })
  const values = form.watch()
  const totals = purchaseOrderEditTotals(values)
  const steps = [t("details"), t("parties"), t("items"), t("terms")]
  const money = (amount: number) => formatPurchaseOrderMoney(amount, locale, currency)
  const busy = !ready || pending || checking
  const stepFields: Array<FieldPath<PurchaseOrderEditValues>[]> = [["expectedDeliveryDate"], ["supplierId", "locationId"], ["lines"], ["paymentTerms", "notes", "shippingCost"]]

  useEffect(() => {
    try {
      const stored = readPurchaseOrderDraft(sessionStorage.getItem(draftKey), { organizationId, actorId, orderId: purchaseOrder.id })
      if (stored) {
        baseline.current = { revision: stored.baselineRevision, values: stored.baselineValues }
        form.reset(stored.baselineValues)
        for (const field of editFields) form.setValue(field, stored.values[field], { shouldDirty: true })
        setPendingRequest(stored.pending)
        if (stored.pending) { setStep(3); setFailure("unknown") }
      }
    } catch { setStorageFailed(true) }
    setReady(true)
  }, [actorId, draftKey, form, organizationId, purchaseOrder.id])
  useEffect(() => {
    if (!ready) return
    try {
      if (!form.formState.isDirty && !pendingRequest) { sessionStorage.removeItem(draftKey); return }
      sessionStorage.setItem(draftKey, JSON.stringify({ version: 1, organizationId, actorId, orderId: purchaseOrder.id, baselineRevision: baseline.current.revision, baselineValues: baseline.current.values, values, pending: pendingRequest }))
    } catch { setStorageFailed(true) }
  }, [actorId, draftKey, form.formState.isDirty, organizationId, pendingRequest, purchaseOrder.id, ready, values])
  useEffect(() => { if (failure || locked) alertRef.current?.focus() }, [failure, locked])
  useEffect(() => { if (comparison) comparisonRef.current?.focus() }, [comparison])
  useEffect(() => {
    if (!form.formState.isDirty) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault() }
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [form.formState.isDirty])

  function moveStep(next: number) {
    if (failure === "validation") setFailure(null)
    setStep(next)
    requestAnimationFrame(() => stepRef.current?.focus())
  }

  async function continueStep() {
    if (locked) { moveStep(step + 1); return }
    if (await form.trigger(stepFields[step], { shouldFocus: true })) moveStep(step + 1)
  }

  async function save(data: PurchaseOrderEditValues) {
    if (submitting.current || !ready || (locked && !pendingRequest) || comparison) return
    if (step !== 3) { await continueStep(); return }
    submitting.current = true
    setPending(true)
    setFailure(null)
    let confirmed = false
    try {
      const request = pendingRequest ?? purchaseOrderEditPayload(purchaseOrder, organizationId, data, { expectedRevision: baseline.current.revision, idempotencyKey: crypto.randomUUID() })
      setPendingRequest(request)
      // Persist the exact command before transport, without session credentials.
      try { sessionStorage.setItem(draftKey, JSON.stringify({ version: 1, organizationId, actorId, orderId: purchaseOrder.id, baselineRevision: baseline.current.revision, baselineValues: baseline.current.values, values: data, pending: request })) } catch { setStorageFailed(true) }
      const result = await mutation.mutateAsync(request)
      if (!result.success || !result.data) {
        if (result.code === "CONFLICT") { setPendingRequest(null); setFailure("stale") }
        else if (result.code === "FORBIDDEN" || result.code === "AUTH_REQUIRED") { setPendingRequest(null); setFailure("denied") }
        else if (result.code === "VALIDATION_ERROR" || result.code === "BUSINESS_RULE_VIOLATION" || result.code === "IDEMPOTENCY_CONFLICT") { setPendingRequest(null); setFailure("rejected") }
        else setFailure("unknown")
        return
      }
      if (result.data.editReceipt?.requestReference !== request.idempotencyKey || result.data.editReceipt.orderId !== purchaseOrder.id) { setFailure("unknown"); return }
      confirmed = true
      setPendingRequest(null)
      try { sessionStorage.removeItem(draftKey) } catch { /* The completed command can be safely replayed if storage remains. */ }
      form.reset(data)
      notify.success(t("saved"))
      router.push(savedHref)
    } catch {
      // Unknown transport outcomes keep the draft; no redirect, reset or automatic retry.
      setFailure("unknown")
    } finally {
      if (!confirmed) {
        submitting.current = false
        setPending(false)
      }
    }
  }

  async function compareCurrent() {
    if (checking || pending) return
    setChecking(true)
    try {
      const result = await getCurrentPurchaseOrderDraft(purchaseOrder.id, organizationId)
      if (!result.success || !result.data?.editRevision) { setFailure(result.code === "FORBIDDEN" || result.code === "AUTH_REQUIRED" ? "denied" : "rejected"); return }
      setComparison(result.data); setChoices({})
    } catch { setFailure("unknown") }
    finally { setChecking(false) }
  }

  function applyComparedDraft(useCurrent = false) {
    if (!comparison?.editRevision || comparison.status !== "DRAFT") return
    const currentValues = purchaseOrderEditDefaults(comparison)
    const merged = useCurrent ? currentValues : resolvePurchaseOrderDraft(baseline.current.values, form.getValues(), currentValues, choices)
    if (!merged) return
    baseline.current = { revision: comparison.editRevision, values: currentValues }
    form.reset(currentValues)
    for (const field of editFields) form.setValue(field, merged[field], { shouldDirty: true })
    setPendingRequest(null); setComparison(null); setFailure(null); setStep(3)
    requestAnimationFrame(() => stepRef.current?.focus())
  }

  const fieldLabel = (field: EditField) => t(({ supplierId: "supplier", locationId: "location", expectedDeliveryDate: "deliveryDate", paymentTerms: "paymentTerms", notes: "notes", shippingCost: "shipping", lines: "items" } as const)[field])
  function comparisonValue(field: EditField, value: PurchaseOrderEditValues) {
    if (field === "supplierId") return suppliers.find(option => option.id === value.supplierId)?.name ?? t("currentUnavailable")
    if (field === "locationId") return locations.find(option => option.id === value.locationId)?.name ?? t("currentUnavailable")
    if (field === "shippingCost") return money(value.shippingCost)
    if (field === "lines") return value.lines.map(line => `${items.find(item => item.id === line.itemId)?.name ?? t("currentUnavailable")}: ${line.quantity} × ${money(line.unitPrice)} · ${t("taxRate")}: ${line.taxRate}% · ${t("lineDiscount")}: ${money(line.discount)}${line.notes ? ` · ${line.notes}` : ""}`).join("\n")
    return String(value[field] || "—")
  }

  function numericField(name: FieldPath<PurchaseOrderEditValues>, label: string, quantity = false) {
    return <FormField control={form.control} name={name} render={({ field }) => <FormItem>
      <FormLabel>{label}</FormLabel>
      <FormControl><Input className="dashboard-control" type="number" min="0" step={quantity ? "0.001" : "any"} readOnly={readOnly}
        name={field.name} ref={field.ref} onBlur={field.onBlur} value={typeof field.value === "number" && Number.isFinite(field.value) ? field.value : ""}
        onChange={(event) => field.onChange(event.target.value === "" ? Number.NaN : Number(event.target.value))} /></FormControl>
      <FormMessage />
    </FormItem>} />
  }

  function textField(name: "paymentTerms" | "notes", label: string, multiline = false) {
    return <FormField control={form.control} name={name} render={({ field }) => <FormItem>
      <FormLabel>{label}</FormLabel><FormControl>{multiline
        ? <Textarea {...field} rows={3} className="dashboard-control" readOnly={readOnly} />
        : <Input {...field} className="dashboard-control" readOnly={readOnly} />}</FormControl><FormMessage />
    </FormItem>} />
  }

  function summary() {
    return <section aria-label={t("preview")} className="min-w-0 space-y-3 rounded-lg border border-[var(--dash-border-subtle)] p-3 sm:p-4">
      <h3 className="font-semibold">{t("preview")}</h3>
      <p className="text-sm text-[var(--dash-text-muted)]">{t("currency", { currency })}</p>
      <dl className="space-y-2 text-sm">
        {([[t("subtotal"), totals.subtotal], [t("tax"), totals.taxAmount], [t("discount"), totals.discount], [t("shipping"), values.shippingCost], [t("total"), totals.total]] as const).map(([label, value]) =>
          <div key={label} className="flex flex-wrap justify-between gap-x-4 gap-y-1"><dt className="min-w-0 max-w-full">{label}</dt><dd className="min-w-0 max-w-full font-semibold tabular-nums">{money(value)}</dd></div>)}
      </dl>
      <p className="text-sm leading-6 text-[var(--dash-text-muted)]">{t("calculationHelp")}</p>
    </section>
  }

  return <div className="dashboard-landing-theme dark min-h-screen min-w-0 [overflow-wrap:anywhere]"><div className="dashboard-landing-content mx-auto w-full min-w-0 max-w-5xl space-y-6 px-4 py-6 text-[var(--dash-text)] sm:px-6">
    <header className="space-y-3">
      <Button ref={backRef} type="button" variant="outline" className="dashboard-button-secondary h-auto min-h-10 max-w-full whitespace-normal text-left" disabled={pending}
        onClick={() => form.formState.isDirty ? setShowLeave(true) : router.push(savedHref)}><ArrowLeft className="mr-2 size-4 shrink-0" aria-hidden="true" />{t("back")}</Button>
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <p className="text-sm leading-6 text-[var(--dash-text-muted)]">{t("subtitle")}</p>
      <p className="break-words font-medium">{purchaseOrder.orderNumber} · {t(({ DRAFT: "draft", SUBMITTED: "statusSubmitted", APPROVED: "statusApproved", PARTIALLY_RECEIVED: "statusPartiallyReceived", RECEIVED: "statusReceived", COMPLETED: "statusCompleted", CANCELLED: "statusCancelled" } as const)[purchaseOrder.status])}</p>
      <p className="text-sm leading-6 text-[var(--dash-text-muted)]">{t(locked ? "invalidOrder" : "draftScope")}</p>
    </header>

    <nav aria-label={t("progress")}>
      <ol className="grid grid-cols-1 gap-2 text-sm min-[380px]:grid-cols-2 md:grid-cols-4">{steps.map((label, index) => <li key={label} aria-current={index === step ? "step" : undefined}
        className={`rounded-lg border p-3 ${index === step ? "border-[var(--dash-brand)] bg-[var(--dash-brand-soft)]" : "border-[var(--dash-border-subtle)]"}`}>
        <span className="mr-2 font-semibold">{index + 1}.</span>{label}
      </li>)}</ol>
    </nav>

    <Form {...form}><form aria-label={t("title")} aria-busy={busy} onSubmit={(event) => {
      if (pendingRequest) { event.preventDefault(); void save(form.getValues()); return }
      if (locked) { event.preventDefault(); return }
      void form.handleSubmit(save, (errors) => {
      setStep(errors.expectedDeliveryDate ? 0 : errors.supplierId || errors.locationId ? 1 : errors.lines ? 2 : 3)
      setFailure("validation")
      })(event)
    }} className="space-y-5">
      <fieldset disabled={busy} className="min-w-0 space-y-5">
        <Card className="dashboard-glass-panel min-w-0 text-[var(--dash-text)]">
          <CardHeader className="p-4 sm:p-6"><CardTitle><h2 ref={stepRef} tabIndex={-1} className="rounded-md text-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--dash-brand)]">{steps[step]}</h2></CardTitle>
            <p className="text-sm text-[var(--dash-text-muted)]">{t("step", { current: step + 1, total: steps.length })}</p></CardHeader>
          <CardContent className="space-y-5 p-4 pt-0 sm:p-6 sm:pt-0">
            {step === 0 ? <>
              <dl className="grid gap-4 text-sm sm:grid-cols-2">
                <div><dt className="text-[var(--dash-text-muted)]">{t("number")}</dt><dd className="mt-1 break-words font-medium">{purchaseOrder.orderNumber}</dd><dd className="mt-1 text-[var(--dash-text-muted)]">{t("numberHelp")}</dd></div>
                <div><dt className="text-[var(--dash-text-muted)]">{t("orderDate")}</dt><dd className="mt-1">{new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(purchaseOrder.orderDate))}</dd></div>
              </dl>
              <FormField control={form.control} name="expectedDeliveryDate" render={({ field }) => <FormItem>
                <FormLabel>{t("deliveryDate")}</FormLabel><FormControl><Input {...field} type="date" min={orderDate} className="dashboard-control w-full min-w-0" readOnly={readOnly} /></FormControl>
                <p className="text-sm text-[var(--dash-text-muted)]">{t("dateHelp")}</p><FormMessage />
              </FormItem>} />
            </> : null}

            {step === 1 ? <div className="grid gap-5 sm:grid-cols-2">
              <FormField control={form.control} name="supplierId" render={({ field }) => <FormItem><FormLabel>{t("supplier")}</FormLabel>
                <Select value={field.value} onValueChange={field.onChange} disabled={busy || readOnly}><FormControl><SelectTrigger className="dashboard-control"><SelectValue placeholder={t("chooseSupplier")} /></SelectTrigger></FormControl>
                  <SelectContent className="enterprise-floating-surface">{!suppliers.some((option) => option.id === field.value) && field.value ? <SelectItem value={field.value}>{purchaseOrder.supplier?.name ?? t("currentUnavailable")}</SelectItem> : null}{suppliers.map((option) => <SelectItem key={option.id} value={option.id}>{option.name}</SelectItem>)}</SelectContent></Select>
                {!suppliers.length ? <p className="text-sm">{t("noSuppliers")}</p> : null}<FormMessage /></FormItem>} />
              <FormField control={form.control} name="locationId" render={({ field }) => <FormItem><FormLabel>{t("location")}</FormLabel>
                <Select value={field.value} onValueChange={field.onChange} disabled={busy || readOnly}><FormControl><SelectTrigger className="dashboard-control"><SelectValue placeholder={t("chooseLocation")} /></SelectTrigger></FormControl>
                  <SelectContent className="enterprise-floating-surface">{!locations.some((option) => option.id === field.value) && field.value ? <SelectItem value={field.value}>{purchaseOrder.location?.name ?? t("currentUnavailable")}</SelectItem> : null}{locations.map((option) => <SelectItem key={option.id} value={option.id}>{option.name}</SelectItem>)}</SelectContent></Select>
                {!locations.length ? <p className="text-sm">{t("noLocations")}</p> : null}<FormMessage /></FormItem>} />
            </div> : null}

            {step === 2 ? <>
              {!items.length ? <p className="text-sm" role="status">{t("noItems")}</p> : null}
              {lines.fields.map((line, index) => <fieldset key={line.id} className="min-w-0 space-y-4 rounded-lg border border-[var(--dash-border-subtle)] p-4">
                <legend className="px-2 font-medium">{t("line", { number: index + 1 })}</legend>
                <FormField control={form.control} name={`lines.${index}.itemId`} render={({ field }) => <FormItem><FormLabel>{t("item")}</FormLabel>
                  <Select value={field.value} onValueChange={(value) => {
                    field.onChange(value)
                    // Preserve an existing quoted cost. A newly added line can use the current cost suggestion.
                    if (!line.itemId) form.setValue(`lines.${index}.unitPrice`, items.find((item) => item.id === value)?.costPrice ?? 0, { shouldDirty: true })
                  }} disabled={busy || readOnly}><FormControl><SelectTrigger className="dashboard-control"><SelectValue placeholder={t("chooseItem")} /></SelectTrigger></FormControl>
                    <SelectContent className="enterprise-floating-surface">{!items.some((item) => item.id === field.value) && field.value ? <SelectItem value={field.value}>{purchaseOrder.lines.find((item) => item.itemId === field.value)?.item?.name ?? t("currentUnavailable")}</SelectItem> : null}
                      {items.map((item) => <SelectItem key={item.id} value={item.id}>{item.name} · {item.sku}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>} />
                <div className="grid gap-4 sm:grid-cols-2">
                  {numericField(`lines.${index}.quantity`, t("quantity"), true)}
                  {numericField(`lines.${index}.unitPrice`, t("unitPrice"))}
                  {numericField(`lines.${index}.taxRate`, t("taxRate"))}
                  {numericField(`lines.${index}.discount`, t("lineDiscount"))}
                </div>
                <FormField control={form.control} name={`lines.${index}.notes`} render={({ field }) => <FormItem><FormLabel>{t("lineNotes")}</FormLabel><FormControl><Textarea {...field} rows={2} className="dashboard-control" readOnly={readOnly} /></FormControl><FormMessage /></FormItem>} />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm">{t("lineTotal")}: <strong>{money(values.lines[index].quantity * values.lines[index].unitPrice * (1 + values.lines[index].taxRate / 100) - values.lines[index].discount)}</strong></p>
                  <Button type="button" variant="outline" className="dashboard-button-secondary h-auto min-h-10 whitespace-normal" disabled={readOnly || lines.fields.length === 1}
                    onClick={() => lines.remove(index)}><Trash2 className="mr-2 size-4 shrink-0" aria-hidden="true" />{t("removeLine", { number: index + 1 })}</Button>
                </div>
              </fieldset>)}
              <Button type="button" variant="outline" className="dashboard-button-secondary" disabled={readOnly || !items.length} onClick={() => lines.append({ itemId: "", quantity: 1, unitPrice: 0, taxRate: 0, discount: 0, notes: "" })}><Plus className="mr-2 size-4" aria-hidden="true" />{t("addLine")}</Button>
              {summary()}
            </> : null}

            {step === 3 ? <>
              <div className="grid gap-5 sm:grid-cols-2">{textField("paymentTerms", t("paymentTerms"))}{numericField("shippingCost", t("shipping"))}</div>
              {textField("notes", t("notes"), true)}
              {summary()}
            </> : null}
          </CardContent>
        </Card>
        <div className="flex flex-wrap justify-between gap-3">
          <Button type="button" variant="outline" className="dashboard-button-secondary h-auto min-h-10 max-w-full whitespace-normal" disabled={step === 0} onClick={() => moveStep(step - 1)}>{t("previous")}</Button>
          {step < 3
            ? <Button key="continue" type="button" className="dashboard-button-primary h-auto min-h-10 max-w-full whitespace-normal" onClick={(event) => { event.preventDefault(); void continueStep() }}>{t("next")}</Button>
            : <Button key="save" type="submit" disabled={(locked && !pendingRequest) || !!comparison} className="dashboard-button-primary h-auto min-h-10 max-w-full whitespace-normal"><Save className="mr-2 size-4 shrink-0" aria-hidden="true" />{pending ? t("saving") : pendingRequest ? t("retrySave") : t("save")}</Button>}
        </div>
      </fieldset>
      {pending ? <p role="status" className="text-sm">{t("pendingHelp")}</p> : null}
      {storageFailed ? <p role="status" className="text-sm">{t("storageUnavailable")}</p> : null}
      {failure || locked ? <div ref={alertRef} role="alert" tabIndex={-1} className="space-y-2 rounded-lg border border-[var(--dash-danger)] bg-[var(--dash-danger-soft)] p-4 text-sm leading-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--dash-brand)]">
        <p className="font-semibold">{t(failure === "stale" ? "staleTitle" : failure === "denied" ? "deniedTitle" : failure === "unknown" ? "unknownTitle" : failure === "validation" ? "validationTitle" : failure ? "failedTitle" : "lockedTitle")}</p>
        {failure && failure !== "validation" ? <p>{t(failure === "stale" ? "staleHelp" : failure === "denied" ? "deniedHelp" : failure === "unknown" ? "retryHelp" : "failed")}</p> : null}
        {locked ? <><p>{t("invalidOrder")}</p><p>{t("lockedRecovery")}</p></> : null}
        {failure !== "validation" || locked ? <a href={savedHref} target="_blank" rel="noreferrer" className="inline-block underline underline-offset-4">{t("openSaved")}</a> : null}
        {failure && failure !== "validation" ? <Button type="button" variant="outline" className="dashboard-button-secondary h-auto max-w-full whitespace-normal" disabled={pending || checking} onClick={() => void compareCurrent()}>{checking ? t("checkingCurrent") : t("compareCurrent")}</Button> : null}
      </div> : null}
    </form></Form>

    {comparison ? <section aria-labelledby="purchase-draft-comparison-title" className="dashboard-glass-panel min-w-0 space-y-4 rounded-lg p-4">
      <h2 id="purchase-draft-comparison-title" ref={comparisonRef} tabIndex={-1} className="text-lg font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--dash-brand)]">{t("compareTitle")}</h2>
      <p className="text-sm leading-6">{t("mergeHelp")}</p>
      {comparison.status !== "DRAFT" ? <p role="status">{t("invalidOrder")}</p> : null}
      {editFields.map(field => {
        const current = purchaseOrderEditDefaults(comparison)
        const conflict = comparePurchaseOrderDraft(baseline.current.values, values, current).conflicts.includes(field)
        return <fieldset key={field} className="min-w-0 space-y-3 rounded-md border border-[var(--dash-border-subtle)] p-3">
          <legend className="px-2 font-medium">{fieldLabel(field)}</legend>
          <dl className="grid min-w-0 gap-3 text-sm sm:grid-cols-2"><div><dt className="text-[var(--dash-text-muted)]">{t("currentValues")}</dt><dd className="mt-1 whitespace-pre-wrap">{comparisonValue(field, current)}</dd></div><div><dt className="text-[var(--dash-text-muted)]">{t("yourDraft")}</dt><dd className="mt-1 whitespace-pre-wrap">{comparisonValue(field, values)}</dd></div></dl>
          {conflict ? <Select value={choices[field] ?? ""} onValueChange={value => setChoices(previous => ({ ...previous, [field]: value as "draft" | "current" }))} disabled={comparison.status !== "DRAFT"}>
            <SelectTrigger className="dashboard-control h-auto min-h-10 whitespace-normal" aria-label={`${fieldLabel(field)}: ${t("chooseResolution")}`}><SelectValue placeholder={t("chooseResolution")} /></SelectTrigger><SelectContent className="enterprise-floating-surface"><SelectItem value="current">{t("keepCurrent")}</SelectItem><SelectItem value="draft">{t("keepDraft")}</SelectItem></SelectContent>
          </Select> : null}
        </fieldset>
      })}
      <div className="flex flex-wrap gap-3"><Button type="button" className="dashboard-button-primary h-auto max-w-full whitespace-normal" disabled={comparison.status !== "DRAFT" || !resolvePurchaseOrderDraft(baseline.current.values, values, purchaseOrderEditDefaults(comparison), choices)} onClick={() => applyComparedDraft()}>{t("applyComparison")}</Button><Button type="button" variant="outline" className="dashboard-button-secondary h-auto max-w-full whitespace-normal" disabled={comparison.status !== "DRAFT"} onClick={() => applyComparedDraft(true)}>{t("useCurrent")}</Button><Button type="button" variant="outline" className="dashboard-button-secondary h-auto max-w-full whitespace-normal" onClick={() => setComparison(null)}>{t("closeComparison")}</Button></div>
    </section> : null}

    <Dialog open={showLeave} onOpenChange={setShowLeave}><DialogContent className="enterprise-floating-surface" onCloseAutoFocus={(event) => { event.preventDefault(); backRef.current?.focus() }}>
      <DialogHeader><DialogTitle>{t("leaveTitle")}</DialogTitle><DialogDescription>{t("leaveDescription")}</DialogDescription></DialogHeader>
      <DialogFooter><Button type="button" variant="outline" className="dashboard-button-secondary h-auto whitespace-normal" onClick={() => setShowLeave(false)}>{t(locked ? "stayReadOnly" : "stay")}</Button><Button type="button" variant="destructive" className="h-auto whitespace-normal" onClick={() => { try { sessionStorage.removeItem(draftKey) } catch { /* Local storage is unavailable. */ } setPendingRequest(null); form.reset(); router.push(savedHref) }}>{t("discard")}</Button></DialogFooter>
    </DialogContent></Dialog>
  </div></div>
}
