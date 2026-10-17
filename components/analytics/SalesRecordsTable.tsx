"use client"

import { useEffect, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table"
import { DataTableSearch } from "@/components/DataTableComponents/DataTableSearch"
import { DataTablePagination } from "@/components/DataTableComponents/DataTablePagination"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { SalesPerformance } from "@/services/analytics/sales-performance.service"

type RecordRow = SalesPerformance["records"][number]

export default function SalesRecordsTable({ data, search, pageSize, pending, canFirst, canPrevious, onSearch, onPageSize, onFirst, onPrevious, onNext, onOpen, money, time }: {
  data: SalesPerformance
  search: string
  pageSize: number
  pending: boolean
  canFirst: boolean
  canPrevious: boolean
  onSearch: (search: string) => void
  onPageSize: (size: "10" | "25" | "50") => void
  onFirst: () => void
  onPrevious: () => void
  onNext: () => void
  onOpen: (id: string, opener: HTMLButtonElement) => void
  money: (value: string) => string
  time: (value: string) => string
}) {
  const t = useTranslations("salesPerformance"), locale = useLocale() === "fr" ? "fr" : "en"
  const [draft, setDraft] = useState(search)
  useEffect(() => setDraft(search), [search])
  const columns: ColumnDef<RecordRow>[] = [
    { accessorKey: "number", header: t("number"), cell: ({ row }) => <Button id={`sales-record-${encodeURIComponent(row.original.id)}`} variant="link" className="h-auto px-0 text-[var(--dash-brand-strong)]" onClick={event => onOpen(row.original.id, event.currentTarget)}>{row.original.number}</Button> },
    { accessorKey: "date", header: t("date"), cell: ({ row }) => time(row.original.date) },
    { accessorKey: "customer", header: t("customer"), cell: ({ row }) => row.original.customer ?? t("restrictedCustomer") },
    { accessorKey: "channel", header: t("channel"), cell: ({ row }) => t(row.original.channel) },
    { accessorKey: "value", header: t("value"), cell: ({ row }) => money(row.original.value) },
    { accessorKey: "status", header: t("status"), cell: ({ row }) => t(row.original.status) },
    { accessorKey: "paymentStatus", header: t("paymentStatus"), cell: ({ row }) => t("payment." + row.original.paymentStatus) },
  ]
  const table = useReactTable({ data: data.records, columns, getCoreRowModel: getCoreRowModel(), getRowId: row => row.id,
    manualPagination: true, manualSorting: true, enableSorting: false,
    state: { pagination: { pageIndex: 0, pageSize } },
    onPaginationChange: updater => {
      const next = typeof updater === "function" ? updater({ pageIndex: 0, pageSize }) : updater
      if (next.pageSize !== pageSize) onPageSize(String(next.pageSize) as "10" | "25" | "50")
    },
  })
  return <div className="space-y-3" aria-busy={pending}>
    <form className="dashboard-table-toolbar flex flex-wrap items-center gap-2" onSubmit={event => { event.preventDefault(); onSearch(draft.trim().slice(0, 100)) }}>
      <div className="min-w-0 flex-1 basis-64"><DataTableSearch value={draft} onChange={value => { setDraft(value.slice(0, 100)); if (!value && search) onSearch("") }} ariaLabel={t(data.canReadCustomers ? "search" : "searchOrders")} placeholder={t(data.canReadCustomers ? "search" : "searchOrders")} clearButtonLabel={t("clearSearch")} /></div>
      <Button type="submit" variant="outline" className="dashboard-button-secondary" disabled={pending}>{t("searchButton")}</Button>
    </form>
    <p className="text-xs text-[var(--dash-text-muted)]">{t("searchHelp")}</p>
    <div className="dashboard-table-shell dashboard-data-table overflow-hidden rounded-lg">
        <Table scrollRegionLabel={t("records")}>
          <caption className="sr-only">{t("records")} — {t("livePages")}</caption>
          <TableHeader>{table.getHeaderGroups().map(group => <TableRow key={group.id}>{group.headers.map(header => <TableHead key={header.id} scope="col" className={header.id === "value" ? "text-right" : ""}>{flexRender(header.column.columnDef.header, header.getContext())}</TableHead>)}</TableRow>)}</TableHeader>
          <TableBody>{table.getRowModel().rows.length ? table.getRowModel().rows.map(row => <TableRow key={row.id}>{row.getVisibleCells().map(cell => <TableCell key={cell.id} className={cell.column.id === "value" ? "whitespace-nowrap text-right tabular-nums" : cell.column.id === "date" ? "whitespace-nowrap" : ""}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>)}</TableRow>) : <TableRow><TableCell colSpan={columns.length} className="h-24 text-center"><span role="status">{t("noRecords")}</span></TableCell></TableRow>}</TableBody>
        </Table>
    </div>
    <DataTablePagination table={table} variant="landing" locale={locale} showSelectionCount={false} pageSizeOptions={[10, 25, 50]}
      copy={{ firstPage: t("firstPage"), previousPage: t("previousPage"), nextPage: t("nextPage") }}
      cursor={{ hasMore: Boolean(data.nextCursor), canPrevious, canFirst, pending, onNext, onPrevious, onFirst, summary: t("pageRecords", { count: data.records.length }) }} />
  </div>
}
