"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { postSupplierCreditNoteAction } from "@/actions/purchasing/purchase-return-credit.actions"
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { postSupplierCreditNoteInputSchema } from "@/services/purchasing/purchase-return-credit.schemas"
import type { SupplierCreditWorkbenchData } from "@/services/purchasing/supplier-credit-workbench.service"
import type { z } from "zod"

const draftSchema = postSupplierCreditNoteInputSchema.omit({ organizationId: true, postedById: true })
type Draft = z.infer<typeof draftSchema>
type CreditResult = NonNullable<Awaited<ReturnType<typeof postSupplierCreditNoteAction>>["data"]>
const copy = {
  en: {
    title: "Record supplier credit", description: "Apply a supplier-issued credit to the posted invoice for a verified return.",
    limit: "This workbench supports returns matched to one verified invoice. Split invoices and unresolved evidence require AP review.",
    back: "AP workbench", search: "Return number", find: "Find return",
    empty: "No eligible returns match this search.", truncated: "Showing recent returns. Search by return number for an older return.",
    source: "Purchase return", select: "Select a return", supplier: "Supplier", receipt: "Goods receipt", invoice: "Posted invoice",
    lines: "Invoice lines covered by the credit", quantity: "Credited quantity", total: "Expected credit",
    number: "Supplier credit note number", date: "Credit document date and time", reason: "Reason",
    proof: "Supplier credit document", proofHelp: "The file stays on this device. Stoquify records its SHA-256 fingerprint.",
    password: "Current password", fresh: "Verify your password to confirm this credit.", freshFailed: "Password verification failed. Try again.",
    submit: "Record credit", retry: "Retry the same credit", busy: "Recording credit…",
    invalid: "Enter the document date, number, reason, and a file up to 10 MB.",
    denied: "Access to this credit changed. Refresh the page.",
    conflict: "The selected evidence changed or a credit already exists. Review the source and retry.",
    unknown: "The result could not be confirmed. Retry the same credit to recover its result.",
    storage: "The request could not be retained in this browser. Enable session storage and try again.",
    success: "Supplier credit recorded.", pending: "Supplier credit recorded. Accounting posting needs review.",
  },
  fr: {
    title: "Enregistrer un avoir fournisseur", description: "Affectez l’avoir émis par le fournisseur à la facture comptabilisée du retour vérifié.",
    limit: "Cet écran traite les retours liés à une seule facture vérifiée. Les factures fractionnées et les justificatifs incomplets nécessitent une revue comptable.",
    back: "Comptes fournisseurs", search: "Numéro du retour", find: "Rechercher un retour",
    empty: "Aucun retour admissible ne correspond à cette recherche.", truncated: "Retours récents affichés. Recherchez le numéro d’un retour plus ancien.",
    source: "Retour fournisseur", select: "Sélectionner un retour", supplier: "Fournisseur", receipt: "Réception", invoice: "Facture comptabilisée",
    lines: "Lignes de facture couvertes par l’avoir", quantity: "Quantité créditée", total: "Montant attendu de l’avoir",
    number: "Numéro de l’avoir fournisseur", date: "Date et heure de l’avoir", reason: "Motif",
    proof: "Document de l’avoir fournisseur", proofHelp: "Le fichier reste sur cet appareil. Stoquify enregistre son empreinte SHA-256.",
    password: "Mot de passe actuel", fresh: "Vérifiez votre mot de passe pour confirmer l’avoir.", freshFailed: "La vérification du mot de passe a échoué. Réessayez.",
    submit: "Enregistrer l’avoir", retry: "Réessayer le même avoir", busy: "Enregistrement de l’avoir…",
    invalid: "Saisissez la date, le numéro, le motif et joignez un fichier de 10 Mo maximum.",
    denied: "L’accès à cet avoir a changé. Actualisez la page.",
    conflict: "Les justificatifs ont changé ou un avoir existe déjà. Vérifiez la source et réessayez.",
    unknown: "Le résultat n’a pas pu être confirmé. Réessayez le même avoir pour retrouver le résultat.",
    storage: "La demande n’a pas pu être conservée dans ce navigateur. Activez le stockage de session et réessayez.",
    success: "Avoir fournisseur enregistré.", pending: "Avoir fournisseur enregistré. La comptabilisation nécessite une revue.",
  },
} as const

function localDateTime(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 19)
}

export function SupplierCreditWorkbench({ data, search, locale, organizationId, actorId }: {
  data: SupplierCreditWorkbenchData; search: string; locale: "en" | "fr"; organizationId: string; actorId: string
}) {
  const t = copy[locale]
  const router = useRouter()
  const key = `stoquify:supplier-credit:${JSON.stringify([organizationId, actorId])}`
  const [selected, setSelected] = useState("")
  const [creditDate, setCreditDate] = useState("")
  const [request, setRequest] = useState<Draft | null>(null)
  const [needsPassword, setNeedsPassword] = useState(false)
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [recorded, setRecorded] = useState<CreditResult | null>(null)
  const inFlight = useRef(false)
  const candidate = data.candidates.find(row => row.purchaseReturnId === selected)
  const formatMoney = (amount: string, currency: string) => new Intl.NumberFormat(locale, { style: "currency", currency, minimumFractionDigits: 2 }).format(Number(amount))

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(key)
      if (raw && raw.length < 50000) {
        const retained = draftSchema.safeParse(JSON.parse(raw))
        if (retained.success) setRequest(retained.data)
      }
    } catch { setError(t.storage) }
  }, [key, t.storage])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (inFlight.current) return
    inFlight.current = true
    setBusy(true)
    setError("")
    try {
      let command = request
      if (!command) {
        if (!candidate) { setError(t.invalid); return }
        const form = new FormData(event.currentTarget)
        const file = form.get("proof")
        const date = new Date(creditDate)
        if (!(file instanceof File) || !file.size || file.size > 10 * 1024 * 1024 || !Number.isFinite(date.getTime()) || date < new Date(candidate.occurredAt)) {
          setError(t.invalid)
          return
        }
        const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", await file.arrayBuffer()))
        const documentHash = "sha256:" + Array.from(digest, byte => byte.toString(16).padStart(2, "0")).join("")
        const parsed = draftSchema.safeParse({
          purchaseReturnId: candidate.purchaseReturnId, supplierInvoiceId: candidate.supplierInvoiceId,
          idempotencyKey: crypto.randomUUID(), creditNoteNumber: form.get("number"), creditDate: date.toISOString(),
          expectedTotal: candidate.total, reason: form.get("reason"), documentHash,
          lines: candidate.lines.map(({ sourcePurchaseReturnLineId, sourceSupplierInvoiceLineId }) => ({ sourcePurchaseReturnLineId, sourceSupplierInvoiceLineId })),
        })
        if (!parsed.success) { setError(t.invalid); return }
        command = parsed.data
        try { sessionStorage.setItem(key, JSON.stringify(command)) }
        catch { setError(t.storage); return }
        setRequest(command)
      }
      if (needsPassword) {
        const assurance = await stepUpWithPasswordAction({ password })
        setPassword("")
        if (!assurance.success) { setError(t.freshFailed); return }
        setNeedsPassword(false)
      }

      const result = await postSupplierCreditNoteAction(command)
      if (!result.success || !result.data) {
        if (result.code === "FRESH_AUTH_REQUIRED") {
          setNeedsPassword(true)
          setError(t.fresh)
        } else if (["FORBIDDEN", "AUTH_REQUIRED", "UNAUTHENTICATED", "TENANT_SCOPE_VIOLATION", "NOT_FOUND", "CONFLICT", "BUSINESS_RULE_VIOLATION", "INVOICE_EVIDENCE_REQUIRED", "VALIDATION_ERROR"].includes(result.code ?? "")) {
          setError(["FORBIDDEN", "AUTH_REQUIRED", "UNAUTHENTICATED", "TENANT_SCOPE_VIOLATION"].includes(result.code ?? "") ? t.denied : t.conflict)
          try { sessionStorage.removeItem(key) } catch { /* The protected action still enforces the original identity. */ }
          setRequest(null)
          router.refresh()
        } else {
          setError(t.unknown)
        }
        return
      }
      setRecorded(result.data)
      setSelected("")
      setNeedsPassword(false)
      setRequest(null)
      try { sessionStorage.removeItem(key) } catch { /* Exact replay remains safe. */ }
      router.refresh()
    } catch {
      setError(t.unknown)
    } finally {
      inFlight.current = false
      setBusy(false)
    }
  }

  return <main className="space-y-5">
    <header className="space-y-2">
      <Button asChild variant="outline"><Link href={`/${locale}/dashboard/purchases/payables`}>{t.back}</Link></Button>
      <h1 className="text-2xl font-semibold text-[var(--dash-text)]">{t.title}</h1>
      <p className="text-sm text-[var(--dash-text-soft)]">{t.description}</p>
      <p className="text-sm text-[var(--dash-text-soft)]">{t.limit}</p>
    </header>
    <form className="flex flex-wrap items-end gap-3">
      <div className="min-w-0 flex-1 space-y-1">
        <Label htmlFor="credit-return-search">{t.search}</Label>
        <Input id="credit-return-search" name="q" maxLength={80} defaultValue={search} />
      </div>
      <Button type="submit" variant="outline" disabled={busy || !!request}>{t.find}</Button>
    </form>
    {data.truncated && <p className="text-sm text-[var(--dash-text-soft)]">{t.truncated}</p>}
    {recorded && <p role="status" className="rounded-lg border border-[var(--dash-border)] p-3">
      {recorded.ledgerStatus === "BLOCKED_PENDING_RULES" ? t.pending : t.success}{" "}
      <span className="break-words">{recorded.supplierCreditNote.creditNoteNumber} · {formatMoney(recorded.supplierCreditNote.total, recorded.supplierCreditNote.currency)}</span>
    </p>}
    {error && <p role="alert" className="text-sm text-[var(--dash-text)]">{error}</p>}
    {!data.candidates.length && !request ? <p className="rounded-lg border border-[var(--dash-border)] p-4">{t.empty}</p> :
      <form onSubmit={submit} className="space-y-4 rounded-lg border border-[var(--dash-border)] bg-[var(--dash-surface-raised)] p-4">
        {!request && <>
          <div className="space-y-1">
            <Label htmlFor="credit-return">{t.source}</Label>
            <select className="dashboard-control block w-full min-w-0 rounded-md border border-[var(--dash-border)] px-3 py-2" id="credit-return" required value={selected}
              onChange={event => {
                const id = event.target.value
                const next = data.candidates.find(row => row.purchaseReturnId === id)
                setSelected(id)
                setRecorded(null)
                if (next) setCreditDate(localDateTime(new Date(Math.max(Date.now(), Math.ceil(Date.parse(next.occurredAt) / 1000) * 1000))))
              }}>
              <option value="">{t.select}</option>
              {data.candidates.map(row => <option key={row.purchaseReturnId} value={row.purchaseReturnId}>{row.returnNumber} · {row.supplierName} · {row.invoiceNumber}</option>)}
            </select>
          </div>
          {candidate && <>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div><dt>{t.supplier}</dt><dd className="break-words font-medium">{candidate.supplierName}</dd></div>
              <div><dt>{t.receipt}</dt><dd className="break-words font-medium">{candidate.receiptNumber} · {candidate.orderNumber}</dd></div>
              <div><dt>{t.invoice}</dt><dd className="break-words font-medium">{candidate.invoiceNumber}</dd></div>
              <div><dt>{t.total}</dt><dd className="font-medium tabular-nums">{formatMoney(candidate.total, candidate.currency)}</dd></div>
            </dl>
            <section aria-labelledby="credit-lines" className="space-y-1">
              <h2 id="credit-lines" className="font-medium">{t.lines}</h2>
              <ul className="space-y-1 text-sm">{candidate.lines.map(line => <li className="break-words" key={line.sourcePurchaseReturnLineId}>{line.description} · {t.quantity} {line.quantity}</li>)}</ul>
            </section>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><Label htmlFor="credit-number">{t.number}</Label><Input id="credit-number" name="number" required maxLength={80} /></div>
              <div><Label htmlFor="credit-date">{t.date}</Label><Input id="credit-date" type="datetime-local" step={1} required value={creditDate} onChange={event => setCreditDate(event.target.value)} /></div>
            </div>
            <div><Label htmlFor="credit-reason">{t.reason}</Label><Textarea id="credit-reason" name="reason" required minLength={3} maxLength={500} /></div>
            <div><Label htmlFor="credit-proof">{t.proof}</Label><Input id="credit-proof" name="proof" type="file" required aria-describedby="credit-proof-help" /><p id="credit-proof-help" className="text-sm text-[var(--dash-text-soft)]">{t.proofHelp}</p></div>
          </>}
        </>}
        {request && <p className="break-words text-sm">{t.number} · {request.creditNoteNumber}</p>}
        {needsPassword && <div><Label htmlFor="credit-password">{t.password}</Label><Input id="credit-password" type="password" autoComplete="current-password" value={password} required onChange={event => setPassword(event.target.value)} disabled={busy} /></div>}
        <Button type="submit" disabled={busy || (!request && !candidate) || (needsPassword && !password)}>{busy ? t.busy : request && !needsPassword ? t.retry : t.submit}</Button>
      </form>}
  </main>
}
