"use client"

import { useMemo, useState } from "react"

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

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const

function hasPostedActivity(row: TrialBalanceRow) {
  return Number(row.activityDebit) !== 0 || Number(row.activityCredit) !== 0
}

function formatMoney(value: string) {
  const amount = Number(value)

  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XAF",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0)
}

export function TrialBalanceTable({
  rows,
  totals,
}: {
  rows: TrialBalanceRow[]
  totals: TrialBalanceTotals
}) {
  const [query, setQuery] = useState("")
  const [accountType, setAccountType] = useState("all")
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("all")
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE_OPTIONS[0])
  const [page, setPage] = useState(1)

  const accountTypes = useMemo(
    () => Array.from(new Set(rows.map((row) => row.type))).sort((left, right) => left.localeCompare(right)),
    [rows],
  )

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase()

    return rows.filter((row) => {
      const matchesQuery =
        !normalizedQuery ||
        [row.code, row.nameEn, row.type, row.normalBalance].some((value) =>
          value.toLocaleLowerCase().includes(normalizedQuery),
        )
      const matchesType = accountType === "all" || row.type === accountType
      const matchesActivity = activityFilter === "all" || hasPostedActivity(row)

      return matchesQuery && matchesType && matchesActivity
    })
  }, [accountType, activityFilter, query, rows])

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const firstRowIndex = (currentPage - 1) * pageSize
  const pageRows = filteredRows.slice(firstRowIndex, firstRowIndex + pageSize)
  const visibleStart = filteredRows.length ? firstRowIndex + 1 : 0
  const visibleEnd = Math.min(firstRowIndex + pageSize, filteredRows.length)
  const hasActiveFilters = Boolean(query) || accountType !== "all" || activityFilter !== "all"

  function resetPage() {
    setPage(1)
  }

  function clearFilters() {
    setQuery("")
    setAccountType("all")
    setActivityFilter("all")
    resetPage()
  }

  return (
    <div>
      <div className="border-b border-[var(--dash-border-subtle)] bg-[var(--dash-surface)]/55 p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(16rem,1fr)_repeat(3,minmax(9rem,auto))] lg:items-end">
          <label className="flex min-w-0 flex-col gap-1.5 text-xs font-medium text-[var(--dash-text-soft)]">
            Search accounts
            <input
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                resetPage()
              }}
              placeholder="Search by account code or name"
              className="dashboard-control h-10 w-full rounded-lg px-3 text-sm text-[var(--dash-text)] placeholder:text-[var(--dash-text-faint)]"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-xs font-medium text-[var(--dash-text-soft)]">
            Account type
            <select
              value={accountType}
              onChange={(event) => {
                setAccountType(event.target.value)
                resetPage()
              }}
              className="dashboard-control h-10 rounded-lg px-3 text-sm text-[var(--dash-text)]"
            >
              <option value="all">All types</option>
              {accountTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-xs font-medium text-[var(--dash-text-soft)]">
            Posted activity
            <select
              value={activityFilter}
              onChange={(event) => {
                setActivityFilter(event.target.value as ActivityFilter)
                resetPage()
              }}
              className="dashboard-control h-10 rounded-lg px-3 text-sm text-[var(--dash-text)]"
            >
              <option value="all">All accounts</option>
              <option value="with-activity">With activity only</option>
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-xs font-medium text-[var(--dash-text-soft)]">
            Rows per page
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value))
                resetPage()
              }}
              className="dashboard-control h-10 rounded-lg px-3 text-sm text-[var(--dash-text)]"
            >
              {PAGE_SIZE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-3 flex min-h-8 flex-wrap items-center justify-between gap-2 text-xs text-[var(--dash-text-soft)]">
          <p aria-live="polite">
            Showing <span className="font-semibold text-[var(--dash-text)]">{visibleStart}–{visibleEnd}</span> of{" "}
            <span className="font-semibold text-[var(--dash-text)]">{filteredRows.length}</span> accounts
            {filteredRows.length !== rows.length ? ` (${rows.length} total)` : ""}
          </p>
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              className="dashboard-button-secondary h-8 rounded-lg px-3 font-medium"
            >
              Clear filters
            </button>
          ) : null}
        </div>
      </div>

      <div className="max-h-[36rem] overflow-auto" role="region" tabIndex={0} aria-label="Scrollable trial balance table">
        <table className="w-full min-w-[980px] text-sm">
          <caption className="sr-only">
            Trial balance accounts with posted debit and credit activity and resulting balances.
          </caption>
          <thead className="sticky top-0 z-20 border-b border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] text-left text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-[var(--dash-text-faint)] shadow-sm">
            <tr>
              <th scope="col" className="sticky left-0 z-30 min-w-56 bg-[var(--dash-surface-raised)] px-4 py-3">Account</th>
              <th scope="col" className="px-4 py-3">Type</th>
              <th scope="col" className="px-4 py-3">Normal</th>
              <th scope="col" className="px-4 py-3 text-right">Activity debit</th>
              <th scope="col" className="px-4 py-3 text-right">Activity credit</th>
              <th scope="col" className="px-4 py-3 text-right">Debit balance</th>
              <th scope="col" className="px-4 py-3 text-right">Credit balance</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length ? (
              pageRows.map((row) => (
                <tr
                  key={row.accountId}
                  className="border-b border-[var(--dash-border-subtle)] transition-colors hover:bg-[var(--dash-brand-soft)]/35"
                >
                  <th
                    scope="row"
                    className="sticky left-0 z-10 bg-[var(--dash-surface)] px-4 py-2.5 text-left shadow-[1px_0_0_var(--dash-border-subtle)]"
                  >
                    <div className="font-mono text-xs font-semibold tracking-wide text-[var(--dash-brand-strong)]">{row.code}</div>
                    <div className="mt-0.5 max-w-72 truncate text-xs font-medium text-[var(--dash-text)]" title={row.nameEn}>
                      {row.nameEn}
                    </div>
                  </th>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex rounded-md border border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] px-2 py-1 text-[0.68rem] font-semibold text-[var(--dash-text-soft)]">
                      {row.type}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs font-medium text-[var(--dash-text-soft)]">{row.normalBalance}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-[var(--dash-text)]">{formatMoney(row.activityDebit)}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-[var(--dash-text)]">{formatMoney(row.activityCredit)}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums font-medium text-[var(--dash-text)]">{formatMoney(row.debitBalance)}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums font-medium text-[var(--dash-text)]">{formatMoney(row.creditBalance)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-4 py-14 text-center">
                  <p className="font-medium text-[var(--dash-text)]">
                    {rows.length ? "No matching accounts" : "No accounts or posted ledger lines yet"}
                  </p>
                  <p className="mt-1 text-sm text-[var(--dash-text-soft)]">
                    {rows.length ? "Adjust or clear the current filters." : "Accounts will appear after the chart of accounts is configured."}
                  </p>
                </td>
              </tr>
            )}
          </tbody>
          <tfoot className="sticky bottom-0 z-20 border-t border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] text-sm font-semibold text-[var(--dash-text)] shadow-[0_-4px_12px_rgba(0,0,0,0.12)]">
            <tr>
              <th scope="row" className="sticky left-0 z-30 bg-[var(--dash-surface-raised)] px-4 py-3 text-left" colSpan={3}>
                Report totals
                <span className="ms-2 text-xs font-normal text-[var(--dash-text-faint)]">All {rows.length} accounts</span>
              </th>
              <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">{formatMoney(totals.activityDebit)}</td>
              <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">{formatMoney(totals.activityCredit)}</td>
              <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">{formatMoney(totals.debitBalance)}</td>
              <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">{formatMoney(totals.creditBalance)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <nav
        aria-label="Trial balance pagination"
        className="flex flex-col gap-3 border-t border-[var(--dash-border-subtle)] bg-[var(--dash-surface)]/55 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <p className="text-xs text-[var(--dash-text-soft)]">
          Page <span className="font-semibold text-[var(--dash-text)]">{currentPage}</span> of{" "}
          <span className="font-semibold text-[var(--dash-text)]">{pageCount}</span>
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={currentPage === 1}
            className="dashboard-button-secondary h-9 rounded-lg px-4 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
            disabled={currentPage === pageCount}
            className="dashboard-button-secondary h-9 rounded-lg px-4 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </nav>
    </div>
  )
}
