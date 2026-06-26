"use client"

import { notify } from "@/lib/notifications/notify"
import { memo, useCallback, useMemo, useState } from "react"
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

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

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
  FileText,
  MoreHorizontal,
  Package,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Truck,
  XCircle
} from "lucide-react"
import { getLocaleFromPathname, localizePath } from "@/i18n/routing"
import { DEFAULT_LOCALE } from "@/types/bilingual"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"

// Import real hooks and types
import {
  useApprovePurchaseOrder,
  useCancelPurchaseOrder,
  useDeletePurchaseOrder,
  usePurchaseOrders,
  useReceiveItems
} from "@/hooks/useRecentPurchaseOrderQueries"
import type { PurchaseOrderWithRelations } from "@/types/purchase-orders-system-types"

// Use the real type from the database
type PurchaseOrderData = PurchaseOrderWithRelations

function dateSortValue(value: unknown) {
  if (!value) return null

  const timestamp = new Date(value as Date | string).getTime()
  return Number.isNaN(timestamp) ? null : timestamp
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
  localizedHref: (href: string) => string
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
            {/* Edit Action - Only for DRAFT status */}
            <Link href={localizedHref(`/dashboard/purchase-orders/${po.id}/edit`)}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEditClick(po)}
                disabled={status !== 'DRAFT'}
                className={`h-8 w-8 p-0 ${getActionButtonVariant('edit', status)}`}
                title={status === 'DRAFT' ? 'Edit purchase order' : 'Cannot edit non-draft orders'}
              >
                <Edit className="h-3 w-3" />
              </Button>
            </Link>
            {/* More Actions Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />

                {/* Approve Action - For SUBMITTED status */}
                {status === 'SUBMITTED' && (
                  <DropdownMenuItem
                    onClick={() => handleApproveClick(po)}
                    className="text-emerald-700 focus:text-emerald-700 dark:text-emerald-300 dark:focus:text-emerald-300"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Approve Order
                  </DropdownMenuItem>
                )}

                {/* Receive Action - For APPROVED/ORDERED status */}
                {(['APPROVED', 'ORDERED', 'PARTIALLY_RECEIVED'].includes(status)) && (
                  <DropdownMenuItem
                    onClick={() => handleReceiveClick(po)}
                    className="text-blue-700 focus:text-blue-700 dark:text-blue-300 dark:focus:text-blue-300"
                  >
                    <Package className="mr-2 h-4 w-4" />
                    Receive Items
                  </DropdownMenuItem>
                )}

                {/* Cancel Action - For non-completed orders */}
                {!['RECEIVED', 'COMPLETED', 'CANCELLED'].includes(status) && (
                  <DropdownMenuItem
                    onClick={() => handleCancelClick(po)}
                    className="text-rose-700 focus:text-rose-700 dark:text-rose-300 dark:focus:text-rose-300"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Cancel Order
                  </DropdownMenuItem>
                )}

                {/* Delete Action - Only for DRAFT status */}
                {status === 'DRAFT' && (
                  <DropdownMenuItem
                    onClick={() => handleDeleteClick(po)}
                    className="text-rose-700 focus:text-rose-700 dark:text-rose-300 dark:focus:text-rose-300"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Delete Order
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleDownloadPDF(po)}>
                  <FileText className="mr-2 h-4 w-4" />
                  Download PDF
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
}) => {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState({})
  const [globalFilter, setGlobalFilter] = useState("")

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  })

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
          <Link href={localizedHref("/dashboard/purchase-orders/new")}>
            <Button
              size="sm"
              className="dashboard-button-primary h-9 w-full justify-center rounded-lg sm:w-auto"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create PO
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--dash-text-faint)]" />
          <Input
            placeholder="Search purchase orders..."
            value={globalFilter ?? ""}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className="dashboard-control h-10 w-full rounded-lg pl-10"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="dashboard-button-secondary h-10 justify-center rounded-lg">
              <SlidersHorizontal className="w-4 h-4 mr-2" />
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
      </div>

      {/* Selected rows info */}
      {Object.keys(rowSelection).length > 0 && (
        <div className="dashboard-filter-chip flex items-center gap-2 rounded-lg p-2 text-sm">
          <span>{Object.keys(rowSelection).length} of {table.getFilteredRowModel().rows.length} row(s) selected</span>
        </div>
      )}

      {/* Table */}
      <div className="dashboard-table-shell dashboard-data-table min-w-0 overflow-x-auto rounded-lg">
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
                      className="py-4 text-[var(--dash-text-muted)]"
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
      </div>

      {/* Pagination */}
      <div className="flex flex-col gap-3 py-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1 text-sm text-[var(--dash-text-soft)]">
          {Object.keys(rowSelection).length > 0 && (
            <span>{Object.keys(rowSelection).length} of {table.getFilteredRowModel().rows.length} row(s) selected. </span>
          )}
          Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{" "}
          {Math.min(
            (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
            table.getFilteredRowModel().rows.length
          )}{" "}
          of {table.getFilteredRowModel().rows.length} entries
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="dashboard-button-secondary h-9 rounded-lg disabled:opacity-50"
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="dashboard-button-secondary h-9 rounded-lg disabled:opacity-50"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}

interface PurchaseOrderManagementProps {
  title: string
  organizationId: string
  initialPurchaseOrderData: any[]
  initialSupplierData: SupplierData[]
  initialLocationData: LocationData[]
}

const PurchaseOrderManagement = memo(function PurchaseOrderManagement({
  title,
  organizationId,
  initialPurchaseOrderData,
  initialSupplierData,
  initialLocationData
}: PurchaseOrderManagementProps) {
  const router = useRouter()
  const pathname = usePathname()
  const locale = getLocaleFromPathname(pathname) ?? DEFAULT_LOCALE
  const localizedHref = useCallback((href: string) => localizePath(href, locale), [locale])

  // Use real data hooks
  const { data: purchaseOrdersResponse, isLoading, error, refetch } = usePurchaseOrders(organizationId)
  const deleteMutation = useDeletePurchaseOrder()
  const approveMutation = useApprovePurchaseOrder()
  const cancelMutation = useCancelPurchaseOrder()
  const receiveMutation = useReceiveItems()

  // Confirmation dialog state
  const [confirmationDialog, setConfirmationDialog] = useState<{
    isOpen: boolean
    type: 'delete' | 'cancel' | 'approve' | null
    purchaseOrder: PurchaseOrderData | null
    title: string
    description: string
    confirmText: string
    confirmVariant: 'default' | 'destructive'
  }>({
    isOpen: false,
    type: null,
    purchaseOrder: null,
    title: '',
    description: '',
    confirmText: '',
    confirmVariant: 'default'
  })

  // Helper function to open confirmation dialogs
  const openConfirmationDialog = useCallback((
    type: 'delete' | 'cancel' | 'approve',
    purchaseOrder: PurchaseOrderData,
    title: string,
    description: string,
    confirmText: string,
    confirmVariant: 'default' | 'destructive' = 'default'
  ) => {
    setConfirmationDialog({
      isOpen: true,
      type,
      purchaseOrder,
      title,
      description,
      confirmText,
      confirmVariant
    })
  }, [])

  // Handle confirmation dialog actions
  const handleConfirmAction = useCallback(() => {
    if (!confirmationDialog.purchaseOrder || !confirmationDialog.type) return

    const { purchaseOrder, type } = confirmationDialog

    switch (type) {
      case 'delete':
        deleteMutation.mutate({
          id: purchaseOrder.id,
          organizationId: organizationId
        })
        break
      case 'cancel':
        cancelMutation.mutate({
          id: purchaseOrder.id,
          organizationId: organizationId,
          reason: 'Cancelled by user'
        })
        break
      case 'approve':
        approveMutation.mutate({
          id: purchaseOrder.id,
          organizationId: organizationId,
        })
        break
    }

    // Close dialog
    setConfirmationDialog(prev => ({ ...prev, isOpen: false }))
  }, [confirmationDialog, deleteMutation, cancelMutation, approveMutation, organizationId])

  // Get purchase orders data
  const purchaseOrdersArray = useMemo(() => {
    if (purchaseOrdersResponse?.data && purchaseOrdersResponse.data != null) {
      return purchaseOrdersResponse.data ?? []
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
    if (po.status !== 'DRAFT') {
      notify.error("Cannot edit", {
        description: "Only draft purchase orders can be edited"
      })
      return
    }
    // Navigate to edit page
    router.push(localizedHref(`/dashboard/purchase-orders/${po.id}/edit`))
  }, [localizedHref, router])

  const handleApproveClick = useCallback((po: PurchaseOrderData) => {
    openConfirmationDialog(
      'approve',
      po,
      'Approve Purchase Order',
      `Are you sure you want to approve purchase order ${po.orderNumber}? This action will mark the order as approved and allow it to proceed to the next stage.`,
      'Approve Order',
      'default'
    )
  }, [openConfirmationDialog])

  const handleReceiveClick = useCallback((po: PurchaseOrderData) => {
    // Navigate to purchase order detail page where receive functionality exists
    router.push(localizedHref(`/dashboard/purchase-orders/${po.id}?tab=receive`))
    notify.info("Receive Items", {
      description: `Opening receive dialog for ${po.orderNumber}`
    })
  }, [localizedHref, router])

  const handleCancelClick = useCallback((po: PurchaseOrderData) => {
    openConfirmationDialog(
      'cancel',
      po,
      'Cancel Purchase Order',
      `Are you sure you want to cancel purchase order ${po.orderNumber}? This action will mark the order as cancelled and cannot be undone.`,
      'Cancel Order',
      'destructive'
    )
  }, [openConfirmationDialog])

  const handleDeleteClick = useCallback((po: PurchaseOrderData) => {
    if (po.status !== 'DRAFT') {
      notify.error("Cannot delete", {
        description: "Only draft purchase orders can be deleted"
      })
      return
    }

    openConfirmationDialog(
      'delete',
      po,
      'Delete Purchase Order',
      `Are you sure you want to delete purchase order ${po.orderNumber}? This action cannot be undone and all associated data will be permanently removed.`,
      'Delete Order',
      'destructive'
    )
  }, [openConfirmationDialog])

  const handleDownloadPDF = useCallback((po: PurchaseOrderData) => {
    // Navigate to PDF download or API endpoint
    window.open(`/api/purchase-orders/${po.id}/pdf?organizationId=${organizationId}`, '_blank')
    notify.success("PDF Download", {
      description: `Download initiated for ${po.orderNumber}`
    })
  }, [organizationId])

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
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Purchase Orders")
      XLSX.writeFile(wb, `purchase-orders-${format(new Date(), 'yyyy-MM-dd')}.xlsx`)

      notify.success("Export successful", {
        description: `Exported ${data.length} purchase orders`
      })
    } catch (error) {
      notify.error("Export failed", {
        description: "Failed to export purchase orders"
      })
    }
  }, [])

  // Format currency helper
  const formatCurrencyValue = useCallback((amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(amount)
  }, [])

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
      localizedHref
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
      localizedHref
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
      />

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmationDialog.isOpen}
        onOpenChange={(open) => setConfirmationDialog(prev => ({ ...prev, isOpen: open }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {confirmationDialog.type === 'delete' && <XCircle className="h-5 w-5 text-rose-500" />}
              {confirmationDialog.type === 'cancel' && <XCircle className="h-5 w-5 text-amber-500" />}
              {confirmationDialog.type === 'approve' && <CheckCircle className="h-5 w-5 text-emerald-500" />}
              {confirmationDialog.title}
            </DialogTitle>
            <DialogDescription>
              {confirmationDialog.description}
            </DialogDescription>
          </DialogHeader>

          {confirmationDialog.purchaseOrder && (
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-slate-600 dark:text-slate-400">Order Number:</span>
                  <div className="font-semibold">{confirmationDialog.purchaseOrder.orderNumber}</div>
                </div>
                <div>
                  <span className="font-medium text-slate-600 dark:text-slate-400">Total Amount:</span>
                  <div className="font-semibold text-emerald-600">{formatCurrencyValue(confirmationDialog.purchaseOrder.total)}</div>
                </div>
                <div>
                  <span className="font-medium text-slate-600 dark:text-slate-400">Supplier:</span>
                  <div className="font-semibold">{confirmationDialog.purchaseOrder.supplier?.name || 'Unknown'}</div>
                </div>
                <div>
                  <span className="font-medium text-slate-600 dark:text-slate-400">Current Status:</span>
                  <div className="font-semibold">
                    <ModernStatusBadge status={confirmationDialog.purchaseOrder.status} />
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmationDialog(prev => ({ ...prev, isOpen: false }))}
              disabled={deleteMutation.isPending || cancelMutation.isPending || approveMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant={confirmationDialog.confirmVariant}
              onClick={handleConfirmAction}
              disabled={deleteMutation.isPending || cancelMutation.isPending || approveMutation.isPending}
            >
              {(deleteMutation.isPending || cancelMutation.isPending || approveMutation.isPending) ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                confirmationDialog.confirmText
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
})

PurchaseOrderManagement.displayName = 'PurchaseOrderManagement'

export default PurchaseOrderManagement
