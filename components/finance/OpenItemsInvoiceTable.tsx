"use client"

import { getCoreRowModel, useReactTable } from "@tanstack/react-table"
import { DataTablePagination } from "@/components/DataTableComponents/DataTablePagination"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { OpenItemsDashboard, OpenItemsScope } from "@/services/finance/open-items-dashboard.contract"
import { formatSalesDecimal } from "@/lib/analytics/sales-performance-scope"
import { openItemsHistoryHref, openItemsWorkflowLinks, type OpenItemsActivityPeriod } from "@/lib/finance/open-items-navigation"
import { OpenItemDetails } from "./OpenItemsExplorer"

export function OpenItemsInvoiceTable({ report, scope, locale, pending, onChange, canHistory, permissions, period }: {
  report: OpenItemsDashboard; scope: OpenItemsScope; locale: "en" | "fr"; pending: boolean
  onChange: (scope: OpenItemsScope) => void; canHistory: boolean; permissions: string[]; period?: OpenItemsActivityPeriod
}) {
  const fr = locale === "fr"
  const title = fr ? "Factures restant à régler" : "Outstanding invoices"
  const unavailable = fr ? "Indisponible" : "Unavailable"
  const pagination = { pageIndex: report.records.page - 1, pageSize: report.records.pageSize }
  const table = useReactTable({
    data: report.records.rows, columns: [], getRowId: row => row.id, getCoreRowModel: getCoreRowModel(),
    manualPagination: true, autoResetPageIndex: false,
    pageCount: Math.max(1, Math.ceil(report.records.total / pagination.pageSize)),
    state: { pagination },
    onPaginationChange: updater => {
      if (pending) return
      const next = typeof updater === "function" ? updater(pagination) : updater
      const resized = next.pageSize !== pagination.pageSize
      onChange({ ...scope, page: resized ? 1 : next.pageIndex + 1,
        ...(resized ? { pageSize: next.pageSize as 10 | 25 | 50 } : {}),
        revision: resized ? undefined : report.revision })
    },
  })
  const buckets = fr
    ? { current: "Sans retard", "1-30": "1–30 jours", "31-60": "31–60 jours", "61-90": "61–90 jours", "90+": "90+ jours", unknown: "Échéance indisponible" }
    : { current: "Not overdue", "1-30": "1–30 days", "31-60": "31–60 days", "61-90": "61–90 days", "90+": "90+ days", unknown: "Due date unavailable" }
  const evidence = fr ? { posted: "Cycle de créance comptabilisée", operational: "Justificatifs fournisseurs opérationnels", unverified: "Non vérifiés" }
    : { posted: "Posted AR lifecycle", operational: "Operational AP evidence", unverified: "Unverified" }
  const filtered = scope.search || scope.counterpartyId || (scope.queue && scope.queue !== "all") || (scope.bucket && scope.bucket !== "all")
  const empty = filtered ? fr ? "Aucune facture ne correspond aux filtres." : "No invoices match these filters."
    : fr ? "Aucune facture à régler dans les justificatifs disponibles." : "No outstanding invoices in the available evidence."
  return <div className="min-w-0 space-y-3" aria-busy={pending}>
    <div className="dashboard-table-shell dashboard-data-table min-w-0 overflow-hidden rounded-lg">
      <Table scrollRegionLabel={title}>
        <caption className="sr-only">{title}</caption>
        <TableHeader><TableRow>{(fr ? ["Facture", "Client / fournisseur", "Échéance", "Montant restant", "Justificatifs"] : ["Invoice", "Customer / supplier", "Due date", "Remaining amount", "Evidence"]).map((label, index) => <TableHead key={label} scope="col" className={index === 3 ? "text-right" : ""}>{label}</TableHead>)}</TableRow></TableHeader>
        <TableBody>{report.records.rows.length ? report.records.rows.map(row => <TableRow key={row.id}>
          <TableCell><OpenItemDetails row={row} locale={locale} timezone={report.organization.timezone} history={canHistory ? openItemsHistoryHref(locale, scope, row, period) : undefined} view={scope.view} workflowLinks={openItemsWorkflowLinks(locale, scope.view, permissions, row)} /></TableCell>
          <TableCell>{row.counterparty}</TableCell>
          <TableCell className="whitespace-nowrap">{row.dueDate ? new Intl.DateTimeFormat(locale, { timeZone: report.organization.timezone, dateStyle: "medium" }).format(new Date(row.dueDate)) : unavailable}<span className="block text-xs">{buckets[row.bucket]}</span></TableCell>
          <TableCell className="whitespace-nowrap text-right tabular-nums">{row.outstanding === null ? unavailable : `${formatSalesDecimal(row.outstanding, locale)} ${row.currency}`}</TableCell>
          <TableCell>{evidence[row.evidence]}</TableCell>
        </TableRow>) : <TableRow><TableCell colSpan={5} className="h-24 text-center"><span role="status">{empty}</span></TableCell></TableRow>}</TableBody>
      </Table>
    </div>
    <p className="text-sm text-[var(--dash-text-soft)]" aria-live="polite">{report.records.total} {fr ? "factures correspondantes" : "matching invoices"}</p>
    <nav aria-label={`${title} — pagination`}><fieldset disabled={pending} className="min-w-0">
      <DataTablePagination table={table} variant="landing" locale={locale} showSelectionCount={false} pageSizeOptions={[10, 25, 50]} />
    </fieldset></nav>
  </div>
}
