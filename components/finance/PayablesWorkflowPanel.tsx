"use client"
import Link from "next/link"
import { hasRbacPermission } from "@/lib/security/rbac-permissions"
import { openItemsWorkflowLinks } from "@/lib/finance/open-items-navigation"
import { usePayablesWorkflow, type FinanceDashboardIdentity } from "@/hooks/finance/useFinanceDashboardSupplements"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { dashboardPanelClass } from "./finance-dashboard-theme"

const copy = {
  en: { title: "AP workflow review", note: "Organization-wide workflow counts, independent of invoice location, currency and table filters. Counts can overlap. Draft requests require evidence review; approved payments still require execution checks. Released does not mean reconciled.", restricted: "AP workbench permission is required for these workflow signals.", unavailable: "Restricted", loading: "Loading workflow signals…", error: "Workflow signals are unavailable. Invoice evidence remains separate.", retry: "Retry workflows", review: "Open workflow", approval: "Draft requests awaiting review", execution: "Approved payments awaiting execution", match: "Matching exceptions", bank: "Pending bank changes", ledger: "Ledger blockers", reconciliation: "Reconciliation blockers", pending: "Payment-pending invoices", released: "Released payments", scope: "Destinations open their existing organization scope and enforce independent permissions.", checked: "Checked" },
  fr: { title: "Revue des opérations fournisseurs", note: "Compteurs de toute l’organisation, indépendants des filtres d’établissement, de devise et de factures. Ils peuvent se recouper. Les demandes brouillon nécessitent une revue des preuves ; les paiements approuvés nécessitent encore les contrôles d’exécution. Libéré ne signifie pas rapproché.", restricted: "L’autorisation de l’atelier fournisseurs est nécessaire pour ces signaux.", unavailable: "Accès restreint", loading: "Chargement des signaux…", error: "Signaux indisponibles. Les justificatifs de factures restent indépendants.", retry: "Réessayer les opérations", review: "Ouvrir le parcours", approval: "Demandes brouillon à examiner", execution: "Paiements approuvés à exécuter", match: "Exceptions de concordance", bank: "Modifications bancaires en attente", ledger: "Blocages comptables", reconciliation: "Blocages de rapprochement", pending: "Factures en attente de paiement", released: "Paiements libérés", scope: "Les parcours ouvrent leur périmètre organisationnel et vérifient leurs propres autorisations.", checked: "Vérifié le" },
}
export function PayablesWorkflowPanel({ organizationId, locale, timezone, identity }: { organizationId: string; locale: "en" | "fr"; timezone: string; identity: FinanceDashboardIdentity }) {
  const t = copy[locale], query = usePayablesWorkflow(organizationId, identity), result = query.data
  const report = result?.state === "ready" ? result.report : undefined
  const root = `/${locale}/dashboard/purchases/payables`
  const permissions = identity?.enabled ? identity.permissionKey.split("|") : []
  const links = openItemsWorkflowLinks(locale, "payables", permissions)
  const canVisit = (href: string) => links.some(link => link.href === href) || (href === root || href === `${root}/history`) && hasRbacPermission(permissions, "purchasing.ap.invoice.view") || href === `${root}/exceptions/review` && hasRbacPermission(permissions, "purchasing.ap.match.review")
  const items: Array<[string, number | null, string]> = report ? [
    [locale === "fr" ? "Factures brouillon à examiner" : "Draft invoices awaiting review", report.draftInvoices, `${root}/approve`],
    [t.ledger, report.counts.ledgerBlockers, root], [t.reconciliation, report.counts.reconciliationBlockers, `${root}/payments/reconcile`],
    [t.match, report.counts.matchExceptions, `${root}/exceptions/review`], [t.bank, report.counts.pendingBankChanges, root],
    [t.approval, report.awaitingApproval, `${root}/payments/approve`], [t.execution, report.awaitingExecution, `${root}/payments/record`],
    [t.pending, report.counts.paymentPendingInvoices, `${root}/history`], [t.released, report.counts.releasedPayments, `${root}/history`],
  ] : []
  return <Card className={dashboardPanelClass}><CardHeader><h2 className="font-semibold">{t.title}</h2><p className="text-sm">{t.note}</p></CardHeader><CardContent className="space-y-3">
    {query.isError ? <div role="alert"><p>{t.error}</p><Button variant="outline" onClick={() => void query.refetch()}>{t.retry}</Button></div> : !result ? <p role="status">{t.loading}</p> : result.state === "restricted" ? <p>{t.restricted}</p> : report && <>
      <p className="text-sm">{t.checked}: {new Intl.DateTimeFormat(locale, { timeZone: timezone, dateStyle: "medium", timeStyle: "short" }).format(new Date(report.checkedAt))} · {timezone}</p>
      <ul className="grid gap-3 sm:grid-cols-2">{items.map(([label, count, href]) => <li key={label} className="rounded-lg border border-[var(--dash-border)] p-3"><p className="font-medium">{label}: <span className="tabular-nums">{count === null ? t.unavailable : count}</span></p>{count !== null && canVisit(href) && <Link href={href} className="underline focus-visible:outline" aria-label={`${t.review}: ${label}`}>{t.review}</Link>}</li>)}</ul>
      <p className="text-sm">{t.scope}</p>
      <nav className="flex flex-wrap gap-3" aria-label={locale === "fr" ? "Parcours disponibles" : "Available workflows"}>{links.map(link => <Link className="underline focus-visible:outline" key={link.href} href={link.href}>{link.label}</Link>)}</nav>
    </>}
  </CardContent></Card>
}
