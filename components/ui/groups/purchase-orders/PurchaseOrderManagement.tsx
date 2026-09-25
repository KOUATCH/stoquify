"use client"
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { PurchaseOrderDecisionHistory } from "@/components/purchase-orders/PurchaseOrderDecisionHistory"
import { PurchaseOrderLifecycleDialog } from "@/components/purchase-orders/PurchaseOrderLifecycleDialog"
import type { PurchaseLifecycleKind } from "@/services/purchase-order/purchase-order-lifecycle-contracts"
import { PurchaseOrderApprovalDialog } from "@/components/purchase-orders/PurchaseOrderApprovalDialog"
import { useSession } from "@/lib/auth-client"
import { useTranslations } from "next-intl"

import {
  buildCanonicalTableExportIntent,
  canonicalTableExportEvidenceRows,
  CanonicalTableBoundary,
  CanonicalTableDensityControl,
  createCanonicalTableQuery,
  createCanonicalTableSelection,
  purchaseOrdersTableContract,
  useCanonicalTablePreferences,
  useCanonicalTableUrlState,
} from "@/components/DataTableComponents"

import { notify } from "@/lib/notifications/notify"
import { useCallback, useEffect, useMemo, useState } from "react"
import * as XLSX from "xlsx"

// Import TanStack Table components
import {
  ColumnDef,
  ColumnFiltersState,
  FilterFn,
  SortingFn,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState
} from "@tanstack/react-table"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { DataTablePagination } from "@/components/DataTableComponents/DataTablePagination"
import {
  TableDateRangePicker,
  type TableDateRangeValue,
} from "@/components/DataTableComponents/TableDateRangePicker"

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"


import { ModernStatusBadge } from "@/components/purchase-orders/ModernStatusBadge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import SortableColumn from "@/components/DataTableColumns/SortableColumn"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"

import { format } from "date-fns"
import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle,
  ChevronDownIcon,
  DollarSign,
  Download,
  Edit,
  Eye,
  MoreHorizontal,
  Package,
  Plus,
  Printer,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Truck,
  XCircle
} from "lucide-react"
import { getLocaleFromPathname, localizePath } from "@/i18n/routing"
import { DEFAULT_LOCALE, type Locale } from "@/types/bilingual"
import { formatCurrency as formatMoney } from "@/lib/i18n/formatters"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"

// Import real hooks and types
import {

  usePurchaseOrders,
  useReceiveItems
} from "@/hooks/useRecentPurchaseOrderQueries"
import type { PurchaseOrderWithRelations } from "@/types/purchase-orders-system-types"
import type { PurchaseOrderPresentation } from "@/services/purchase-order/purchase-order-capabilities"

// Use the real type from the database
type PurchaseOrderData = PurchaseOrderWithRelations & PurchaseOrderPresentation

function dateSortValue(value: unknown) {
  if (!value) return null

  const timestamp = new Date(value as Date | string).getTime()
  return Number.isNaN(timestamp) ? null : timestamp
}

function isOrderDateWithinRange(
  value: Date | string | null | undefined,
  range: TableDateRangeValue,
) {
  if (!range.from && !range.to) return true

  const timestamp = dateSortValue(value)
  if (timestamp === null) return false

  const from = range.from ? new Date(`${range.from}T00:00:00`).getTime() : null
  const to = range.to ? new Date(`${range.to}T23:59:59.999`).getTime() : null

  if (from !== null && timestamp < from) return false
  if (to !== null && timestamp > to) return false
  return true
}

const dateSortingFn: SortingFn<PurchaseOrderData> = (rowA, rowB, columnId) => {
  const first = dateSortValue(rowA.getValue(columnId))
  const second = dateSortValue(rowB.getValue(columnId))

  if (first === null && second === null) return 0
  if (first === null) return 1
  if (second === null) return -1

  return first - second
}

interface SupplierData {
  id: string
  name: string
  email?: string | null
  phone?: string | null
}

interface LocationData {
  id: string
  name: string
  address?: string | null
}

// Action button colors based on action type
const getActionButtonVariant = (action: string, status: PurchaseOrderData['status']) => {
  switch (action) {
    case 'view':
      return 'bg-[#f0c54d]/14 text-[#8b4a2f] hover:bg-[#f0c54d]/22 dark:bg-[#bf7145]/20 dark:text-[#f6d574] dark:hover:bg-[#bf7145]/30'
    case 'edit':
      return status === 'DRAFT' ?
        'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/40' :
        'bg-slate-50 text-slate-400 cursor-not-allowed dark:bg-slate-800 dark:text-slate-600'
    case 'approve':
      return 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/35 dark:text-emerald-300 dark:hover:bg-emerald-950/50'
    case 'receive':
      return 'bg-[#f0c54d]/14 text-[#8b4a2f] hover:bg-[#f0c54d]/22 dark:bg-[#bf7145]/20 dark:text-[#f6d574] dark:hover:bg-[#bf7145]/30'
    case 'cancel':
      return 'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/35 dark:text-rose-300 dark:hover:bg-rose-950/50'
    default:
      return 'bg-slate-50 text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
  }
}

// Custom filter function for global search
const globalFilterFn: FilterFn<PurchaseOrderData> = (row, columnId, value) => {
  const po = row.original
  const searchValue = value.toLowerCase()

  return (
    po.orderNumber?.toLowerCase().includes(searchValue) ||
    po.supplier?.name?.toLowerCase().includes(searchValue) ||
    po.location?.name?.toLowerCase().includes(searchValue) ||
    po.status?.toLowerCase().includes(searchValue) ||
    String(po.total).includes(searchValue)
  )
}

// Define table columns
const getColumns = (
  formatCurrency: (amount: number) => string,
  formatDate: (date: Date | string) => string,
  handleViewClick: (po: PurchaseOrderData) => void,
  handleEditClick: (po: PurchaseOrderData) => void,
  handleApproveClick: (po: PurchaseOrderData) => void,
  handleReceiveClick: (po: PurchaseOrderData) => void,
  handleCancelClick: (po: PurchaseOrderData) => void,
  handleDeleteClick: (po: PurchaseOrderData) => void,
  handleDownloadPDF: (po: PurchaseOrderData) => void,
  localizedHref: (href: string) => string,
  approvalLabel: string
): ColumnDef<PurchaseOrderData>[] => [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "orderNumber",
      header: ({ column }) => <SortableColumn column={column} title="Order Number" />,
      cell: ({ row }) => (
        <div className="font-mono font-medium text-sm">
          {row.getValue("orderNumber")}
        </div>
      ),
    },
    {
      accessorKey: "supplier",
      header: "Supplier",
      cell: ({ row }) => {
        const supplier = row.original.supplier
        return (
          <div className="space-y-1">
            <div className="font-medium text-sm">{supplier?.name || 'Unknown Supplier'}</div>
            {supplier?.email && (
              <div className="text-xs text-slate-500 dark:text-slate-400">{supplier.email}</div>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "location",
      header: "Location",
      cell: ({ row }) => {
        const location = row.original.location
        return (
          <div className="space-y-1">
            <div className="font-medium text-sm flex items-center gap-1">
              <Building2 className="w-3 h-3 text-slate-400" />
              {location?.name || 'Unknown Location'}
            </div>
            {location?.address && (
              <div className="text-xs text-slate-500 dark:text-slate-400">{location.address}</div>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as PurchaseOrderData['status']
        return <ModernStatusBadge status={status} />
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
      },
    },
    {
      accessorKey: "orderDate",
      header: ({ column }) => <SortableColumn column={column} title="Order Date" />,
      sortingFn: dateSortingFn,
      cell: ({ row }) => {
        const date = row.getValue("orderDate") as Date | string
        return (
          <div className="text-sm flex items-center gap-1">
            <Calendar className="w-3 h-3 text-slate-400" />
            {formatDate(date)}
          </div>
        )
      },
    },
    {
      accessorKey: "expectedDeliveryDate",
      header: ({ column }) => <SortableColumn column={column} title="Expected Delivery" />,
      sortingFn: dateSortingFn,
      cell: ({ row }) => {
        const date = row.getValue("expectedDeliveryDate") as Date | string
        const now = new Date()
        const deliveryDate = new Date(date)
        const isOverdue = deliveryDate < now && !['RECEIVED', 'COMPLETED', 'CANCELLED'].includes(row.original.status)

        return (
          <div className={`text-sm flex items-center gap-1 ${isOverdue ? 'text-rose-700 dark:text-rose-300' : ''}`}>
            <Truck className="w-3 h-3 text-slate-400" />
            {formatDate(date)}
            {isOverdue && <AlertTriangle className="w-3 h-3 text-rose-500" />}
          </div>
        )
      },
    },
    {
      accessorKey: "total",
      header: ({ column }) => <SortableColumn column={column} title="Total" />,
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue("total"))
        return (
          <div className="font-medium text-sm flex items-center gap-1">
            <DollarSign className="w-3 h-3 text-slate-400" />
            {formatCurrency(amount)}
          </div>
        )
      },
    },
    {
      accessorKey: "lines",
      header: "Items",
      cell: ({ row }) => {
        const lines = row.original.lines
        return (
          <div className="text-sm flex items-center gap-1">
            <Package className="w-3 h-3 text-slate-400" />
            {lines.length} item{lines.length !== 1 ? 's' : ''}
          </div>
        )
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const po = row.original
        const status = po.status

        return (
          <div className="flex items-center gap-1">
            {/* View Action - Always available */}
            <Link href={localizedHref(`/dashboard/purchase-orders/${po.id}`)}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleViewClick(po)}
                className={`h-8 w-8 p-0 ${getActionButtonVariant('view', status)}`}
                title="View purchase order"
              >
                <Eye className="h-3 w-3" />
              </Button>
            </Link>
            {po.capabilities.edit.allowed ? (
              <Link href={localizedHref(`/dashboard/purchase-orders/${po.id}/edit`)}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEditClick(po)}
                  className={`h-8 w-8 p-0 ${getActionButtonVariant('edit', status)}`}
                  title="Edit purchase order"
                >
                  <Edit className="h-3 w-3" />
                </Button>
              </Link>
            ) : null}
            {/* More Actions Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />

                {/* Approve Action - For SUBMITTED status */}
                {po.capabilities.approve.allowed && (
                  <DropdownMenuItem
                    onClick={() => handleApproveClick(po)}
                    className="text-[var(--dash-brand-strong)]"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    {approvalLabel}
                  </DropdownMenuItem>
                )}

                {/* Receive Action - For APPROVED/ORDERED status */}
                {po.capabilities.receive.allowed && (
                  <DropdownMenuItem
                    onClick={() => handleReceiveClick(po)}
                    className="text-blue-700 focus:text-blue-700 dark:text-blue-300 dark:focus:text-blue-300"
                  >
                    <Package className="mr-2 h-4 w-4" />
                    Receive Items
                  </DropdownMenuItem>
                )}

                {/* Cancel Action - For non-completed orders */}
                {po.capabilities.cancel.allowed && (
                  <DropdownMenuItem
                    onClick={() => handleCancelClick(po)}
                    className="text-rose-700 focus:text-rose-700 dark:text-rose-300 dark:focus:text-rose-300"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Cancel Order
                  </DropdownMenuItem>
                )}

                {po.capabilities.archive.allowed && (
                  <DropdownMenuItem
                    onClick={() => handleDeleteClick(po)}
                    className="text-rose-700 focus:text-rose-700 dark:text-rose-300 dark:focus:text-rose-300"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Archive Order
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleDownloadPDF(po)}>
                  <Printer className="mr-2 h-4 w-4" />
                  Print Order
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      },
    },
  ]

// Modern TanStack Table Component
const ModernPurchaseOrderTable = ({
  data,
  columns,
  isLoading,
  onRefresh,
  onAdd,
  onExport,
  title,
  subtitle,
  localizedHref,
  canCreate,
  locale,
}: {
  data: PurchaseOrderData[]
  columns: ColumnDef<PurchaseOrderData>[]
  isLoading: boolean
  onRefresh: () => void
  onAdd: () => void
  onExport: (data: PurchaseOrderData[]) => void
  title: string
  subtitle: string
  localizedHref: (href: string) => string
  canCreate: boolean
  locale: Locale
}) => {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const {
    columnVisibility,
    columnOrder,
    density,
    setColumnVisibility,
    setColumnOrder,
    setDensity,
  } = useCanonicalTablePreferences(purchaseOrdersTableContract)
  const { setSearch: setCanonicalSearch } = useCanonicalTableUrlState(purchaseOrdersTableContract)
  const [rowSelection, setRowSelection] = useState({})
  const [globalFilter, setGlobalFilter] = useState("")
  const [orderDateRange, setOrderDateRange] = useState<TableDateRangeValue>({})

  const dateFilteredData = useMemo(
    () => data.filter((order) => isOrderDateWithinRange(order.orderDate, orderDateRange)),
    [data, orderDateRange],
  )

  useEffect(() => {
    setCanonicalSearch(globalFilter)
  }, [globalFilter, setCanonicalSearch])

  const table = useReactTable({
    data: dateFilteredData,
    columns,
    getRowId: (row) => String(row.id),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      columnOrder,
      rowSelection,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  })

  const hasActiveTableState = Boolean(
    globalFilter || orderDateRange.from || orderDateRange.to || sorting.length || columnFilters.length,
  )

  const clearTableState = () => {
    setGlobalFilter("")
    setOrderDateRange({})
    setSorting([])
    setColumnFilters([])
    table.setPageIndex(0)
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    )
  }

  const canonicalQuery = createCanonicalTableQuery(purchaseOrdersTableContract, {
    search: globalFilter,
    filters: {
      ...(orderDateRange.from ? { orderDateFrom: [orderDateRange.from] } : {}),
      ...(orderDateRange.to ? { orderDateTo: [orderDateRange.to] } : {}),
    },
    sort: sorting.map((entry) => ({ id: entry.id, desc: entry.desc })),
    pageIndex: table.getState().pagination.pageIndex,
    pageSize: table.getState().pagination.pageSize,
  })
  const canonicalSelection = createCanonicalTableSelection(
    "explicit",
    canonicalQuery,
    table.getSelectedRowModel().rows.map((row) => String(row.original.id)),
    { kind: "known", total: table.getFilteredRowModel().rows.length },
  )

  return (
    <div className="min-w-0 space-y-5 text-[var(--dash-text)]">
      {/* Header */}
      <div className="flex min-w-0 flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div className="min-w-0 space-y-1">
          <h2 className="text-2xl font-semibold text-[var(--dash-text)]">{title}</h2>
          <p className="break-words text-sm text-[var(--dash-text-soft)]">{subtitle}</p>
        </div>
        <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:flex sm:flex-wrap sm:items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            className="dashboard-button-secondary h-9 justify-center rounded-lg"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onExport(table.getFilteredRowModel().rows.map(row => row.original))}
            className="dashboard-button-secondary h-9 justify-center rounded-lg"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          {canCreate ? (
            <Link href={localizedHref("/dashboard/purchase-orders/new")}>
              <Button
                size="sm"
                className="dashboard-button-primary h-9 w-full justify-center rounded-lg sm:w-auto"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create PO
              </Button>
            </Link>
          ) : null}
        </div>
      </div>

      {/* Filters */}
      <div className="dashboard-table-toolbar flex min-w-0 flex-col gap-3 rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-surface)]/70 p-3 lg:flex-row lg:items-center lg:justify-between xl:flex-nowrap">
        <div className="relative w-full min-w-0 flex-1 xl:min-w-0">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--dash-text-faint)]" />
          <Input
            placeholder="Search purchase orders..."
            value={globalFilter ?? ""}
            onChange={(event) => {
              setGlobalFilter(event.target.value)
              table.setPageIndex(0)
            }}
            className="dashboard-control h-9 w-full rounded-lg pl-10"
          />
        </div>
        <div
          className="flex w-full min-w-0 flex-wrap items-center gap-2 lg:w-auto lg:flex-1 lg:justify-end xl:flex-none xl:flex-nowrap"
          data-slot="purchase-order-table-filter-controls"
        >
          <TableDateRangePicker
            value={orderDateRange}
            onChange={(range) => {
              setOrderDateRange(range)
              table.setPageIndex(0)
            }}
            locale={locale}
            placeholder="Order date range"
            ariaLabel="Order date range"
            className="min-w-[210px] flex-1 sm:flex-none xl:w-[230px] xl:min-w-0 xl:flex-none"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="dashboard-button-secondary h-9 shrink-0 justify-center whitespace-nowrap rounded-lg">
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                View
                <ChevronDownIcon className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] text-[var(--dash-text)]">
              <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) => column.toggleVisibility(!!value)}
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  )
                })}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={clearTableState}
            disabled={!hasActiveTableState}
            className="dashboard-button-secondary h-9 shrink-0 whitespace-nowrap rounded-lg"
          >
            <XCircle className="mr-2 h-4 w-4" />
            Clear filters
          </Button>
        </div>
      </div>

      {/* Selected rows info */}
      {Object.keys(rowSelection).length > 0 && (
        <div className="dashboard-filter-chip flex items-center gap-2 rounded-lg p-2 text-sm">
          <span>{Object.keys(rowSelection).length} of {table.getFilteredRowModel().rows.length} row(s) selected</span>
        </div>
      )}

      {/* Table */}
      <div className="flex justify-end">
        <CanonicalTableDensityControl
          density={density}
          locale={locale === "fr" ? "fr" : "en"}
          onDensityChange={setDensity}
        />
      </div>
      <div className="dashboard-table-shell dashboard-data-table min-w-0 overflow-x-auto rounded-lg">
        <CanonicalTableBoundary
          contract={purchaseOrdersTableContract}
          locale={locale === "fr" ? "fr" : "en"}
          query={canonicalQuery}
          selection={canonicalSelection}
          state={table.getFilteredRowModel().rows.length === 0 ? (globalFilter || orderDateRange.from || orderDateRange.to ? "no-results" : "empty") : "ready"}
          density={density}
        >
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead
                      key={header.id}
                      colSpan={header.colSpan}
                      className="px-3"
                      aria-sort={header.column.getCanSort() ? (header.column.getIsSorted() === "asc" ? "ascending" : header.column.getIsSorted() === "desc" ? "descending" : "none") : undefined}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="border-[var(--dash-border-subtle)] transition-colors hover:bg-[rgba(73,198,229,0.1)] data-[state=selected]:bg-[rgba(73,198,229,0.14)]"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={density === "compact" ? "py-1.5 text-[var(--dash-text-muted)]" : "py-4 text-[var(--dash-text-muted)]"}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-[var(--dash-text-soft)]"
                >
                  No purchase orders found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        </CanonicalTableBoundary>
      </div>

      {/* Pagination */}
      <DataTablePagination table={table} variant="landing" locale={locale} />
    </div>
  )
}

interface PurchaseOrderManagementProps {
  title: string
  organizationId: string
  initialPurchaseOrderData: PurchaseOrderData[]
  initialSupplierData: SupplierData[]
  initialLocationData: LocationData[]
  currency: string
  canCreate: boolean
  locale?: Locale
}

function PurchaseOrderManagement({
  title,
  organizationId,
  initialPurchaseOrderData,
  initialSupplierData,
  initialLocationData,
  currency,
  canCreate,
  locale: localeProp,
}: PurchaseOrderManagementProps) {
  const router = useRouter()
  const pathname = usePathname()
  const locale = localeProp ?? getLocaleFromPathname(pathname) ?? DEFAULT_LOCALE
  const localizedHref = useCallback((href: string) => localizePath(href, locale), [locale])

  // Use real data hooks
  const { data: purchaseOrdersResponse, isLoading, error, refetch } = usePurchaseOrders(organizationId)
  const { data: approvalSession } = useSession()
  const lifecycleText = useTranslations("purchaseOrderLifecycle")
  const approvalLabel = useTranslations("purchaseOrderApproval")("open")
  const [approvalOrderId, setApprovalOrderId] = useState<string | null>(null)
  const receiveMutation = useReceiveItems()

  const [lifecycle, setLifecycle] = useState<{ id: string; kind: PurchaseLifecycleKind } | null>(null)

  // Get purchase orders data
  const purchaseOrdersArray = useMemo(() => {
    if (purchaseOrdersResponse?.data && purchaseOrdersResponse.data != null) {
      return (purchaseOrdersResponse.data ?? []) as PurchaseOrderData[]
    }
    // Fallback to initial data if hook hasn't loaded yet
    return initialPurchaseOrderData as PurchaseOrderData[]
  }, [purchaseOrdersResponse, initialPurchaseOrderData])

  // Action handlers with real mutations
  const handleViewClick = useCallback((po: PurchaseOrderData) => {
    // Navigate to view page
    router.push(localizedHref(`/dashboard/purchase-orders/${po.id}`))
  }, [localizedHref, router])

  const handleEditClick = useCallback((po: PurchaseOrderData) => {
    if (!po.capabilities.edit.allowed) {
      notify.error("Cannot edit", {
        description: po.capabilities.edit.reason ?? "Editing is unavailable for this purchase order."
      })
      return
    }
    // Navigate to edit page
    router.push(localizedHref(`/dashboard/purchase-orders/${po.id}/edit`))
  }, [localizedHref, router])

  const handleApproveClick = useCallback((po: PurchaseOrderData) => setApprovalOrderId(po.id), [])

  const handleReceiveClick = useCallback((po: PurchaseOrderData) => {
    // Navigate to purchase order detail page where receive functionality exists
    router.push(localizedHref(`/dashboard/purchase-orders/${po.id}?tab=receive`))
    notify.info("Receive Items", {
      description: `Opening receive dialog for ${po.orderNumber}`
    })
  }, [localizedHref, router])

  const handleCancelClick = useCallback((po: PurchaseOrderData) => setLifecycle({ id: po.id, kind: "cancel" }), [])
  const handleDeleteClick = useCallback((po: PurchaseOrderData) => setLifecycle({ id: po.id, kind: "archive" }), [])

  const handleDownloadPDF = useCallback((po: PurchaseOrderData) => {
    window.print()
    notify.success("Print Purchase Order", {
      description: `Use the browser print dialog to save ${po.orderNumber} as a PDF.`
    })
  }, [])

  const handleRefresh = useCallback(async () => {
    await refetch()
    notify.success("Data refreshed", {
      description: "Purchase orders have been updated"
    })
  }, [refetch])

  const handleAdd = useCallback(() => {
    // Navigation is handled by Link component
  }, [])

  const handleExport = useCallback((data: PurchaseOrderData[]) => {
    try {
      const exportQuery = createCanonicalTableQuery(purchaseOrdersTableContract, { pageSize: 100 })
      const exportIntent = buildCanonicalTableExportIntent({
        contract: purchaseOrdersTableContract,
        organizationId,
        query: exportQuery,
        selection: createCanonicalTableSelection(
          "explicit",
          exportQuery,
          data.map((purchaseOrder) => String(purchaseOrder.id)),
          { kind: "known", total: data.length },
        ),
        columns: purchaseOrdersTableContract.columns.allowed.map((column) => column.id),
        locale,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        format: "xlsx",
      })
      const exportData = data.map(po => ({
        'Order Number': po.orderNumber,
        'Supplier': po.supplier?.name || 'Unknown',
        'Location': po.location?.name || 'Unknown',
        'Status': po.status,
        'Order Date': format(new Date(po.orderDate), 'yyyy-MM-dd'),
        'Expected Delivery': format(new Date(po?.expectedDeliveryDate ?? ""), 'yyyy-MM-dd'),
        'Total': po.total,
        'Items': po.lines.length,
        'Created At': format(new Date(po?.createdAt ?? ""), 'yyyy-MM-dd HH:mm:ss')
      }))

      const ws = XLSX.utils.json_to_sheet(exportData)
      const evidenceWs = XLSX.utils.json_to_sheet(canonicalTableExportEvidenceRows(exportIntent))
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Purchase Orders")
      XLSX.utils.book_append_sheet(wb, evidenceWs, "Export Evidence")
      XLSX.writeFile(wb, `purchase-orders-${format(new Date(), 'yyyy-MM-dd')}.xlsx`)

      notify.success("Export successful", {
        description: `Exported ${data.length} purchase orders`
      })
    } catch (error) {
      notify.error("Export failed", {
        description: "Failed to export purchase orders"
      })
    }
  }, [locale, organizationId])

  // Format currency helper
  const formatCurrencyValue = useCallback((amount: number) => {
    return formatMoney(amount, locale, currency)
  }, [currency, locale])

  // Format date helper
  const formatDateValue = useCallback((date: Date | string) => {
    return format(new Date(date), 'MMM dd, yyyy')
  }, [])

  // Table columns
  const columns = useMemo(
    () => getColumns(
      formatCurrencyValue,
      formatDateValue,
      handleViewClick,
      handleEditClick,
      handleApproveClick,
      handleReceiveClick,
      handleCancelClick,
      handleDeleteClick,
      handleDownloadPDF,
      localizedHref,
      approvalLabel
    ),
    [
      formatCurrencyValue,
      formatDateValue,
      handleViewClick,
      handleEditClick,
      handleApproveClick,
      handleReceiveClick,
      handleCancelClick,
      handleDeleteClick,
      handleDownloadPDF,
      localizedHref,
      approvalLabel
    ]
  )

  // Subtitle with stats
  const subtitle = useMemo(() => {
    if (purchaseOrdersArray.length === 0) return "No purchase orders found"
    const totalValue = purchaseOrdersArray.reduce((sum: number, po: { total: number }) => sum + po.total, 0)
    return `${purchaseOrdersArray.length} ${purchaseOrdersArray.length === 1 ? "order" : "orders"} | Total Value: ${formatCurrencyValue(totalValue)}`
  }, [purchaseOrdersArray, formatCurrencyValue])

  if (error) {
    throw error instanceof Error ? error : new Error(error.message || "Purchase order list failed to load")
  }

  return (
    <>
      <ModernPurchaseOrderTable
        data={purchaseOrdersArray}
        columns={columns}
        isLoading={isLoading && purchaseOrdersArray.length === 0}
        onRefresh={handleRefresh}
        onAdd={handleAdd}
        onExport={handleExport}
        title={title}
        subtitle={subtitle}
        localizedHref={localizedHref}
        canCreate={canCreate}
        locale={locale}
      />

      {approvalSession?.user?.id && <Dialog><DialogTrigger asChild><Button className="dashboard-button-secondary" variant="outline">{lifecycleText("history.title")}</Button></DialogTrigger><DialogContent closeLabel={lifecycleText("close")} className="dashboard-landing-theme dark dashboard-glass-panel max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl grid-cols-[minmax(0,1fr)] overflow-y-auto p-4 text-[var(--dash-text)] [&>*]:min-w-0 sm:p-6"><DialogHeader><DialogTitle>{lifecycleText("history.title")}</DialogTitle><DialogDescription>{lifecycleText("recordMeaning")}</DialogDescription></DialogHeader><PurchaseOrderDecisionHistory organizationId={organizationId} actorId={approvalSession.user.id} /></DialogContent></Dialog>}
      {approvalSession?.user?.id && <PurchaseOrderApprovalDialog orderId={approvalOrderId} organizationId={organizationId} actorId={approvalSession.user.id} onClose={() => setApprovalOrderId(null)} onConfirmed={() => { void refetch() }} />}
      {/* Confirmation Dialog */}
      {approvalSession?.user?.id && <PurchaseOrderLifecycleDialog orderId={lifecycle?.id ?? null} kind={lifecycle?.kind ?? "cancel"} organizationId={organizationId} actorId={approvalSession.user.id} onClose={() => setLifecycle(null)} onConfirmed={() => { void refetch() }} />}

    </>
  )
}

PurchaseOrderManagement.displayName = 'PurchaseOrderManagement'

export default PurchaseOrderManagement
