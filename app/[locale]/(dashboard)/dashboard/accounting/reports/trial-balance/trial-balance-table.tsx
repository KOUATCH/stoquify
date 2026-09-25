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
import {
  accountingTrialBalanceTableContract,
  createCanonicalTableQuery,
} from "@/components/DataTableComponents"
import { useCanonicalTablePreferences } from "@/components/DataTableComponents/useCanonicalTablePreferences"

export type TrialBalanceRow = {
  accountId: string
  code: string
  nameEn: string
  type: string
  normalBalance: string
  activityDebit: string
  activityCredit: string
  debitBalance: string
  creditBalance: string
}

export type TrialBalanceTotals = {
  activityDebit: string
  activityCredit: string
  debitBalance: string
  creditBalance: string
}

type ActivityFilter = "all" | "with-activity"
type TrialLocale = "en" | "fr"
type NumericId = "activityDebit" | "activityCredit" | "debitBalance" | "creditBalance"

const COPY = {
  en: {
    accountCode: "Account code",
    account: "Account",
    type: "Type",
    normal: "Normal",
    activityDebit: "Activity debit",
    activityCredit: "Activity credit",
    debitBalance: "Debit balance",
    creditBalance: "Credit balance",
    evidence: "Evidence",
    postedLedger: "Posted ledger",
    search: "Search accounts",
    searchPlaceholder: "Search by account code or name",
    accountType: "Account type",
    allTypes: "All types",
    activity: "Posted activity",
    allAccounts: "All accounts",
    withActivity: "With activity only",
    rows: "Rows per page",
    showing: "Showing",
    of: "of",
    accounts: "accounts",
    total: "total",
    clear: "Clear filters",
    tableLabel: "Scrollable trial balance table",
    caption: "Trial balance accounts with posted debit and credit activity and resulting balances.",
    totals: "Report totals",
    all: "All",
    noMatch: "No matching accounts",
    noData: "No accounts or posted ledger lines yet",
    adjust: "Adjust or clear the current filters.",
    configure: "Accounts will appear after the chart of accounts is configured.",
    page: "Page",
    previous: "Previous",
    next: "Next",
    sort: "Sort by",
  },
  fr: {
    accountCode: "Code compte",
    account: "Compte",
    type: "Type",
    normal: "Sens normal",
    activityDebit: "Mouvements debit",
    activityCredit: "Mouvements credit",
    debitBalance: "Solde debit",
    creditBalance: "Solde credit",
    evidence: "Preuve",
    postedLedger: "Grand livre poste",
    search: "Rechercher des comptes",
    searchPlaceholder: "Rechercher par code ou libelle",
    accountType: "Type de compte",
    allTypes: "Tous les types",
    activity: "Mouvements postes",
    allAccounts: "Tous les comptes",
    withActivity: "Avec mouvements uniquement",
    rows: "Lignes par page",
    showing: "Affichage",
    of: "sur",
    accounts: "comptes",
    total: "total",
    clear: "Effacer les filtres",
    tableLabel: "Tableau de balance defilant",
    caption: "Comptes de balance avec mouvements postes debit et credit et soldes resultants.",
    totals: "Totaux du rapport",
    all: "Tous les",
    noMatch: "Aucun compte correspondant",
    noData: "Aucun compte ou mouvement poste pour le moment",
    adjust: "Modifiez ou effacez les filtres actuels.",
    configure: "Les comptes apparaitront apres configuration du plan comptable.",
    page: "Page",
    previous: "Precedent",
    next: "Suivant",
    sort: "Trier par",
  },
} as const

function hasPostedActivity(row: TrialBalanceRow) {
  return Number(row.activityDebit) !== 0 || Number(row.activityCredit) !== 0
}

function formatMoney(value: string, locale: TrialLocale, currency: string) {
  const amount = Number(value)
  return new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
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
      className="text-left font-semibold hover:text-[var(--dash-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dash-focus)]"
    >
      {label}
      {sorted ? (sorted === "asc" ? " ↑" : " ↓") : null}
    </button>
  )
}

function numericColumn(id: NumericId, label: string, sortLabel: string, locale: TrialLocale, currency: string): ColumnDef<TrialBalanceRow> {
  return {
    accessorKey: id,
    header: ({ column }) => <SortHeader label={label} sortLabel={sortLabel} column={column} />,
    cell: ({ row }) => <span className="block whitespace-nowrap text-right tabular-nums text-[var(--dash-text)]">{formatMoney(row.original[id], locale, currency)}</span>,
    sortingFn: (rowA, rowB) => Number(rowA.original[id]) - Number(rowB.original[id]),
  }
}

export function TrialBalanceTable({
  rows,
  totals,
  locale = "en",
  currency = "XAF",
}: {
  rows: TrialBalanceRow[]
  totals: TrialBalanceTotals
  locale?: TrialLocale
  currency?: string
}) {
  const copy = COPY[locale]
  const [query, setQuery] = useState("")
  const [accountType, setAccountType] = useState("all")
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("all")
  const [sorting, setSorting] = useState<SortingState>([{ id: "code", desc: false }])
  const {
    columnVisibility,
    columnOrder,
    density,
    setColumnVisibility,
    setColumnOrder,
    setDensity,
  } = useCanonicalTablePreferences(accountingTrialBalanceTableContract)

  const accountTypes = useMemo(
    () => Array.from(new Set(rows.map((row) => row.type))).sort((left, right) => left.localeCompare(right)),
    [rows],
  )
  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase()
    return rows.filter((row) => {
      const matchesQuery = !normalizedQuery || [row.code, row.nameEn, row.type, row.normalBalance].some((value) => value.toLocaleLowerCase().includes(normalizedQuery))
      const matchesType = accountType === "all" || row.type === accountType
      const matchesActivity = activityFilter === "all" || hasPostedActivity(row)
      return matchesQuery && matchesType && matchesActivity
    })
  }, [accountType, activityFilter, query, rows])

  const columns = useMemo<ColumnDef<TrialBalanceRow>[]>(
    () => [
      {
        accessorKey: "code",
        enableHiding: false,
        header: ({ column }) => <SortHeader label={copy.accountCode} sortLabel={`${copy.sort} ${copy.accountCode}`} column={column} />,
        cell: ({ row }) => <span className="font-mono text-xs font-semibold tracking-wide text-[var(--dash-brand-strong)]">{row.original.code}</span>,
      },
      {
        id: "name",
        accessorFn: (row) => row.nameEn,
        header: ({ column }) => <SortHeader label={copy.account} sortLabel={`${copy.sort} ${copy.account}`} column={column} />,
        cell: ({ row }) => <span className="block max-w-72 truncate text-xs font-medium text-[var(--dash-text)]" title={row.original.nameEn}>{row.original.nameEn}</span>,
      },
      { accessorKey: "type", header: ({ column }) => <SortHeader label={copy.type} sortLabel={`${copy.sort} ${copy.type}`} column={column} /> },
      { accessorKey: "normalBalance", header: ({ column }) => <SortHeader label={copy.normal} sortLabel={`${copy.sort} ${copy.normal}`} column={column} /> },
      numericColumn("activityDebit", copy.activityDebit, `${copy.sort} ${copy.activityDebit}`, locale, currency),
      numericColumn("activityCredit", copy.activityCredit, `${copy.sort} ${copy.activityCredit}`, locale, currency),
      numericColumn("debitBalance", copy.debitBalance, `${copy.sort} ${copy.debitBalance}`, locale, currency),
      numericColumn("creditBalance", copy.creditBalance, `${copy.sort} ${copy.creditBalance}`, locale, currency),
      { id: "evidence", header: copy.evidence, cell: () => <span className="text-xs text-[var(--dash-text-soft)]">{copy.postedLedger}</span> },
    ],
    [copy, currency, locale],
  )

  const table = useReactTable({
    data: filteredRows,
    columns,
    getRowId: (row) => row.accountId,
    state: { sorting, columnVisibility, columnOrder },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageIndex: 0, pageSize: 10 } },
  })

  const hasActiveFilters = Boolean(query.trim()) || accountType !== "all" || activityFilter !== "all"
  const pageIndex = table.getState().pagination.pageIndex
  const pageSize = table.getState().pagination.pageSize
  const visibleStart = filteredRows.length ? pageIndex * pageSize + 1 : 0
  const visibleEnd = Math.min((pageIndex + 1) * pageSize, filteredRows.length)
  const canonicalQuery = createCanonicalTableQuery(accountingTrialBalanceTableContract, {
    search: query,
    filters: {
      ...(accountType !== "all" ? { accountType: [accountType] } : {}),
      ...(activityFilter !== "all" ? { activity: [activityFilter] } : {}),
    },
    sort: sorting,
    pageIndex,
    pageSize,
  })
  const canonicalState = filteredRows.length ? "ready" : hasActiveFilters ? "no-results" : "empty"

  function resetPage() {
    table.setPageIndex(0)
  }

  function clearFilters() {
    setQuery("")
    setAccountType("all")
    setActivityFilter("all")
    resetPage()
  }

  return (
    <CanonicalTableBoundary contract={accountingTrialBalanceTableContract} locale={locale} query={canonicalQuery} state={canonicalState} density={density}>
      <div data-statement-context="period-and-entity-required">
        <div className="dashboard-table-toolbar border-b border-[var(--dash-border-subtle)] bg-[var(--dash-surface)]/55 p-4">
          <div className="flex flex-nowrap items-center gap-3 overflow-x-auto">
            <div className="min-w-48 flex-1"><DataTableSearch value={query} onChange={(value) => { setQuery(value); resetPage() }} ariaLabel={copy.search} placeholder={copy.searchPlaceholder} clearButtonLabel={locale === "fr" ? "Effacer la recherche" : "Clear table search"} /></div>
            <select aria-label={copy.accountType} value={accountType} onChange={(event) => { setAccountType(event.target.value); resetPage() }} className="dashboard-control h-9 shrink-0 rounded-lg px-3 text-sm text-[var(--dash-text)]"><option value="all">{copy.allTypes}</option>{accountTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select>
            <select aria-label={copy.activity} value={activityFilter} onChange={(event) => { setActivityFilter(event.target.value as ActivityFilter); resetPage() }} className="dashboard-control h-9 shrink-0 rounded-lg px-3 text-sm text-[var(--dash-text)]"><option value="all">{copy.allAccounts}</option><option value="with-activity">{copy.withActivity}</option></select>
            <div className="shrink-0"><CanonicalTableDensityControl density={density} locale={locale} onDensityChange={setDensity} /></div>
          </div>
          <div className="mt-3 flex min-h-8 flex-wrap items-center justify-between gap-2 text-xs text-[var(--dash-text-soft)]"><p aria-live="polite">{copy.showing} <span className="font-semibold text-[var(--dash-text)]">{visibleStart}-{visibleEnd}</span> {copy.of} <span className="font-semibold text-[var(--dash-text)]">{filteredRows.length}</span> {copy.accounts}{filteredRows.length !== rows.length ? ` (${rows.length} ${copy.total})` : ""}</p>{hasActiveFilters ? <button type="button" onClick={clearFilters} className="dashboard-button-secondary h-8 rounded-lg px-3 font-medium">{copy.clear}</button> : null}</div>
        </div>

        <div className="max-h-[36rem] overflow-auto" role="region" tabIndex={0} aria-label={copy.tableLabel}>
          <table className="dashboard-table-base w-full min-w-[1160px] text-sm">
            <caption className="sr-only">{copy.caption}</caption>
            <thead className="sticky top-0 z-20 border-b border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] text-left text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-[var(--dash-text-faint)] shadow-sm">
              {table.getHeaderGroups().map((headerGroup) => <tr key={headerGroup.id}>{headerGroup.headers.map((header) => <th key={header.id} scope="col" data-column-id={header.column.id} data-frozen={header.column.id === "code" || header.column.id === "name" ? "start" : undefined} className={`whitespace-nowrap px-4 py-3 ${header.column.id === "code" ? "sticky left-0 z-30 min-w-36 bg-[var(--dash-surface-raised)]" : ""} ${header.column.id === "name" ? "sticky left-36 z-30 min-w-56 bg-[var(--dash-surface-raised)]" : ""} ${["activityDebit", "activityCredit", "debitBalance", "creditBalance"].includes(header.column.id) ? "text-right" : ""}`}>{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}</th>)}</tr>)}
            </thead>
            <tbody>
              {table.getRowModel().rows.length ? table.getRowModel().rows.map((row) => <tr key={row.id} className="border-b border-[var(--dash-border-subtle)] transition-colors hover:bg-[var(--dash-brand-soft)]/35">{row.getVisibleCells().map((cell) => <td key={cell.id} data-column-id={cell.column.id} data-frozen={cell.column.id === "code" || cell.column.id === "name" ? "start" : undefined} className={`px-4 py-2.5 ${cell.column.id === "code" ? "sticky left-0 z-10 min-w-36 bg-[var(--dash-surface)] shadow-[1px_0_0_var(--dash-border-subtle)]" : ""} ${cell.column.id === "name" ? "sticky left-36 z-10 min-w-56 bg-[var(--dash-surface)] shadow-[1px_0_0_var(--dash-border-subtle)]" : ""}`}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}</tr>) : <tr><td colSpan={9} className="px-4 py-14 text-center"><p className="font-medium text-[var(--dash-text)]">{rows.length ? copy.noMatch : copy.noData}</p><p className="mt-1 text-sm text-[var(--dash-text-soft)]">{rows.length ? copy.adjust : copy.configure}</p></td></tr>}
            </tbody>
            <tfoot className="sticky bottom-0 z-20 border-t border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] text-sm font-semibold text-[var(--dash-text)] shadow-[0_-4px_12px_rgba(0,0,0,0.12)]"><tr><th scope="row" className="sticky left-0 z-30 bg-[var(--dash-surface-raised)] px-4 py-3 text-left" colSpan={4}>{copy.totals}<span className="ms-2 text-xs font-normal text-[var(--dash-text-faint)]">{copy.all} {rows.length} {copy.accounts}</span></th><td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">{formatMoney(totals.activityDebit, locale, currency)}</td><td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">{formatMoney(totals.activityCredit, locale, currency)}</td><td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">{formatMoney(totals.debitBalance, locale, currency)}</td><td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">{formatMoney(totals.creditBalance, locale, currency)}</td><td /></tr></tfoot>
          </table>
        </div>

        <nav aria-label={`${copy.account} pagination`} className="border-t border-[var(--dash-border-subtle)] bg-[var(--dash-surface)]/55 px-4 py-3">
          <DataTablePagination table={table} variant="landing" locale={locale} showSelectionCount={false} pageSizeOptions={accountingTrialBalanceTableContract.query.allowedPageSizes} />
        </nav>
      </div>
    </CanonicalTableBoundary>
  )
}
