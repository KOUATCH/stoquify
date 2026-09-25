"use client"

import { useMemo, useState } from "react"
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table"

import { CanonicalTableBoundary } from "@/components/DataTableComponents/CanonicalTableBoundary"
import { CanonicalTableDensityControl } from "@/components/DataTableComponents/CanonicalTableDensityControl"
import { DataTableSearch } from "@/components/DataTableComponents/DataTableSearch"
import { DataTablePagination } from "@/components/DataTableComponents/DataTablePagination"
import { useCanonicalTablePreferences } from "@/components/DataTableComponents/useCanonicalTablePreferences"
import {
  createCanonicalTableQuery,
  type CanonicalTableContract,
} from "@/components/DataTableComponents/table-system-contract"

export type FinancialStatementLineTableRow = {
  accountId: string
  code: string
  nameEn: string
  nameFr: string | null
  classificationSource: string
  amount: string
}

function formatMoney(value: string, locale: "en" | "fr", currency: string) {
  const amount = Number(value)
  return new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0)
}

function SortHeader({
  label,
  sortLabel,
  column,
}: {
  label: string
  sortLabel: string
  column: { getIsSorted: () => false | "asc" | "desc"; toggleSorting: (desc?: boolean) => void }
}) {
  const sorted = column.getIsSorted()
  return (
    <button
      type="button"
      aria-label={sortLabel}
      aria-pressed={Boolean(sorted)}
      onClick={() => column.toggleSorting(sorted === "asc")}
      className="font-semibold hover:text-[var(--dash-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dash-focus)]"
    >
      {label}{sorted ? (sorted === "asc" ? " ↑" : " ↓") : null}
    </button>
  )
}

export function FinancialStatementLinesTable({
  title,
  lines,
  currency,
  contract,
  periodId,
  locale: localeProp = "en",
}: {
  title: string
  lines: FinancialStatementLineTableRow[]
  currency: string
  contract: CanonicalTableContract
  periodId?: string
  locale?: "en" | "fr"
}) {
  const locale: "en" | "fr" = localeProp
  const copy = locale === "fr"
    ? { account: "Compte", classification: "Classification", amount: "Montant", evidence: "Preuve", posted: "Grand livre poste", sort: "Trier par", page: "Page", previous: "Precedent", next: "Suivant" }
    : { account: "Account", classification: "Classification", amount: "Amount", evidence: "Evidence", posted: "Posted ledger", sort: "Sort by", page: "Page", previous: "Previous", next: "Next" }
  const [sorting, setSorting] = useState<SortingState>([{ id: "code", desc: false }])
  const [search, setSearch] = useState("")
  const filteredLines = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    return lines.filter((line) => [line.code, line.nameEn, line.nameFr, line.classificationSource, line.amount].join(" ").toLocaleLowerCase().includes(query))
  }, [lines, search])
  const {
    columnVisibility,
    columnOrder,
    density,
    setColumnVisibility,
    setColumnOrder,
    setDensity,
  } = useCanonicalTablePreferences(contract)

  const columns = useMemo<ColumnDef<FinancialStatementLineTableRow>[]>(
    () => [
      {
        accessorKey: "code",
        enableHiding: false,
        header: ({ column }) => <SortHeader label={locale === "fr" ? "Compte" : "Account code"} sortLabel={`${copy.sort} ${locale === "fr" ? "Compte" : "Account code"}`} column={column} />,
        cell: ({ row }) => <span className="font-mono text-xs font-semibold text-[var(--dash-brand-strong)]">{row.original.code}</span>,
      },
      {
        id: "account",
        accessorFn: (row) => locale === "fr" ? row.nameFr || row.nameEn : row.nameEn,
        header: ({ column }) => <SortHeader label={copy.account} sortLabel={`${copy.sort} ${copy.account}`} column={column} />,
        cell: ({ row }) => <span className="block max-w-72 truncate text-xs font-medium text-[var(--dash-text)]">{locale === "fr" ? row.original.nameFr || row.original.nameEn : row.original.nameEn}</span>,
      },
      { accessorKey: "classificationSource", header: copy.classification, cell: ({ row }) => <span className="text-xs text-[var(--dash-text-soft)]">{row.original.classificationSource}</span> },
      {
        accessorKey: "amount",
        header: ({ column }) => <SortHeader label={copy.amount} sortLabel={`${copy.sort} ${copy.amount}`} column={column} />,
        cell: ({ row }) => <span className="block whitespace-nowrap text-right tabular-nums font-semibold text-[var(--dash-text)]">{formatMoney(row.original.amount, locale, currency)}</span>,
        sortingFn: (rowA, rowB) => Number(rowA.original.amount) - Number(rowB.original.amount),
      },
      { id: "evidence", header: copy.evidence, cell: () => <span className="text-xs text-[var(--dash-text-soft)]">{copy.posted}</span> },
    ],
    [copy, currency, locale],
  )

  const table = useReactTable({
    data: filteredLines,
    columns,
    getRowId: (row) => row.accountId,
    state: { sorting, columnVisibility, columnOrder },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageIndex: 0, pageSize: 25 } },
  })
  const pageIndex = table.getState().pagination.pageIndex
  const pageSize = table.getState().pagination.pageSize
  const query = createCanonicalTableQuery(contract, {
    search,
    filters: periodId ? { periodId: [periodId] } : {},
    sort: sorting,
    pageIndex,
    pageSize,
  })
  const state = filteredLines.length ? "ready" : search.trim() ? "no-results" : "empty"

  return (
    <CanonicalTableBoundary contract={contract} locale={locale} query={query} state={state} density={density}>
      <div data-statement-title={title} data-statement-period-id={periodId} className="min-w-0 border-t border-[var(--dash-border-subtle)]">
        <div className="dashboard-table-toolbar flex flex-nowrap items-center gap-3 overflow-x-auto border-b border-[var(--dash-border-subtle)] bg-[var(--dash-surface)]/50 p-3">
          <div className="min-w-48 flex-1"><DataTableSearch value={search} onChange={(value) => { setSearch(value); table.setPageIndex(0) }} ariaLabel={`${locale === "fr" ? "Rechercher" : "Search"}: ${title}`} placeholder={locale === "fr" ? "Rechercher des comptes..." : "Search accounts..."} clearButtonLabel={locale === "fr" ? "Effacer la recherche" : "Clear table search"} /></div>
          <div className="shrink-0"><CanonicalTableDensityControl density={density} locale={locale} onDensityChange={setDensity} /></div>
        </div>
        <div className="max-h-[28rem] overflow-auto" role="region" tabIndex={0} aria-label={title}>
        <table className="dashboard-table-base w-full min-w-[760px] text-sm">
          <caption className="sr-only">{title} account detail</caption>
          <thead className="sticky top-0 z-10 bg-[var(--dash-surface)] text-left text-[0.68rem] uppercase tracking-[0.12em] text-[var(--dash-text-faint)]">
            {table.getHeaderGroups().map((headerGroup) => <tr key={headerGroup.id}>{headerGroup.headers.map((header) => <th key={header.id} scope="col" data-column-id={header.column.id} data-frozen={header.column.id === "code" || header.column.id === "account" ? "start" : undefined} className={`whitespace-nowrap px-4 py-2.5 font-semibold ${header.column.id === "code" ? "sticky left-0 z-20 min-w-36 bg-[var(--dash-surface)]" : ""} ${header.column.id === "account" ? "sticky left-36 z-20 min-w-56 bg-[var(--dash-surface)]" : ""} ${header.column.id === "amount" ? "text-right" : ""}`}>{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}</th>)}</tr>)}
          </thead>
          <tbody>
            {table.getRowModel().rows.length ? table.getRowModel().rows.map((row) => <tr key={row.id} className="border-b border-[var(--dash-border-subtle)] hover:bg-[var(--dash-brand-soft)]/35">{row.getVisibleCells().map((cell) => <td key={cell.id} data-column-id={cell.column.id} data-frozen={cell.column.id === "code" || cell.column.id === "account" ? "start" : undefined} className={`px-4 py-2.5 ${cell.column.id === "code" ? "sticky left-0 z-10 min-w-36 bg-[var(--dash-surface)]" : ""} ${cell.column.id === "account" ? "sticky left-36 z-10 min-w-56 bg-[var(--dash-surface)]" : ""}`}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}</tr>) : <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-[var(--dash-text-soft)]">{search.trim() ? (locale === "fr" ? "Aucun résultat." : "No results.") : locale === "fr" ? "Aucune activite postee dans cette section pour la periode selectionnee." : "No posted activity in this section for the selected period."}</td></tr>}
          </tbody>
        </table>
        </div>
        <nav aria-label={`${title} pagination`} className="border-t border-[var(--dash-border-subtle)] p-3">
          <DataTablePagination table={table} variant="landing" locale={locale} showSelectionCount={false} pageSizeOptions={contract.query.allowedPageSizes} />
        </nav>
      </div>
    </CanonicalTableBoundary>
  )
}
