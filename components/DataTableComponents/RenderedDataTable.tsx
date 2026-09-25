"use client"

import { useMemo, useState, type ReactNode } from "react"
import { flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table"
import { DataTableSearch } from "@/components/DataTableComponents/DataTableSearch"
import { DataTablePagination } from "@/components/DataTableComponents/DataTablePagination"
import { CanonicalTableBoundary } from "@/components/DataTableComponents/CanonicalTableBoundary"
import { createCanonicalTableQuery, type CanonicalTableContract } from "@/components/DataTableComponents/table-system-contract"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"

type RenderedTableRow = {
  id: string
  searchText: string
  cells: ReactNode[]
}

// Cells may contain server-rendered forms. Search only explicitly supplied text,
// keeping React elements and protected action references out of the filter data.
export function RenderedDataTable({
  columns,
  rows,
  caption,
  emptyMessage,
  locale = "en",
  contract,
  scopeFilters,
  className,
  tableClassName,
}: {
  columns: { label: string; className?: string }[]
  rows: RenderedTableRow[]
  caption: string
  emptyMessage?: string
  locale?: "en" | "fr"
  contract?: CanonicalTableContract
  scopeFilters?: Record<string, string[]>
  className?: string
  tableClassName?: string
}) {
  const [search, setSearch] = useState("")
  const tableColumns = useMemo<ColumnDef<RenderedTableRow>[]>(() => columns.map((column, index) => ({
    id: String(index),
    header: column.label,
    accessorFn: (row) => row.searchText,
    cell: ({ row }) => row.original.cells[index],
    enableSorting: false,
  })), [columns])
  const pageSizes = contract?.query.allowedPageSizes ?? [10, 25, 50]
  const table = useReactTable({
    data: rows,
    columns: tableColumns,
    getRowId: (row) => row.id,
    state: { globalFilter: search },
    globalFilterFn: (row, _columnId, value: string) => row.original.searchText.toLocaleLowerCase().includes(value.trim().toLocaleLowerCase()),
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageIndex: 0, pageSize: pageSizes[0] } },
  })
  const matches = table.getFilteredRowModel().rows.length
  const query = contract ? createCanonicalTableQuery(contract, {
    search,
    filters: scopeFilters,
    ...table.getState().pagination,
  }) : null
  const content = (
    <div className={cn("dashboard-data-table min-w-0 space-y-3 p-4", className)} data-canonical-table-contract={contract?.id} data-canonical-table-locale={locale} data-canonical-table-query={query ? JSON.stringify(query) : undefined}>
      <div className="dashboard-table-toolbar flex min-w-0 items-center gap-3 rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-surface)]/70 p-3">
        <DataTableSearch
          value={search}
          onChange={(value) => { setSearch(value); table.setPageIndex(0) }}
          ariaLabel={`${locale === "fr" ? "Rechercher" : "Search"}: ${caption}`}
          placeholder={locale === "fr" ? "Rechercher dans le tableau..." : "Search table data..."}
          clearButtonLabel={locale === "fr" ? "Effacer la recherche" : "Clear table search"}
        />
      </div>
      <div className="dashboard-table-shell rounded-lg">
        <Table scrollRegionLabel={caption} className={tableClassName}>
          <caption className="sr-only">{caption}</caption>
          <TableHeader>
            {table.getHeaderGroups().map((group) => <TableRow key={group.id}>{group.headers.map((header, index) => (
              <TableHead key={header.id} scope="col" className={cn("whitespace-nowrap px-3", columns[index].className)}>
                {flexRender(header.column.columnDef.header, header.getContext())}
              </TableHead>
            ))}</TableRow>)}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>{row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id} className="px-3 py-3 align-top text-[var(--dash-text-soft)]">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}</TableRow>
            )) : <TableRow><TableCell colSpan={columns.length} className="h-24 text-center text-[var(--dash-text-soft)]">
              {search.trim() ? (locale === "fr" ? "Aucun résultat." : "No results.") : emptyMessage || (locale === "fr" ? "Aucun enregistrement disponible." : "No records available.")}
            </TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-[var(--dash-text-soft)]" aria-live="polite">{matches} {locale === "fr" ? "sur" : "of"} {rows.length} {locale === "fr" ? "enregistrements chargés" : "loaded records"}</p>
      <nav aria-label={`${caption} pagination`}>
        <DataTablePagination table={table} variant="landing" locale={locale} showSelectionCount={false} pageSizeOptions={pageSizes} />
      </nav>
    </div>
  )
  return contract && query ? (
    <CanonicalTableBoundary contract={contract} locale={locale} query={query} state={matches ? "ready" : search.trim() ? "no-results" : "empty"}>
      {content}
    </CanonicalTableBoundary>
  ) : content
}
