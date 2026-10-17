"use client"

import {
  buildCanonicalTableExportIntent,
  canonicalTableExportEvidenceRows,
  CanonicalTableBoundary,
  CanonicalTableDensityControl,
  createCanonicalTableQuery,
  createCanonicalTableSelection,
  inventoryItemsTableContract,
  useCanonicalTablePreferences,
  useCanonicalTableUrlState,
} from "@/components/DataTableComponents"

import { notify } from "@/lib/notifications/notify"
import { zodResolver } from "@hookform/resolvers/zod"
import { format } from "date-fns"
import { memo, useCallback, useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Link } from "@/i18n/navigation"
import { useForm } from "react-hook-form"
import * as XLSX from "xlsx"
import { z } from "zod"


import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ConfirmationDialog, EntityForm } from "@/components/ui/data-table"

import { useDeleteItem, useOrgItemsNew } from "@/hooks/useAllItemQueries"

import type { BrandDTO } from "@/types/brand"
import type { TaxRateDTO } from "@/types/taxRates"
import type { CategoryDTO } from "@/types/types"
import type { UnitDTO } from "@/types/unit"

import { useCreateItem } from "@/hooks/itemsHooks/useItemHooks"
import { inventoryItemsText } from "@/components/inventory/inventory-items-copy"
import { createOrganizationMoneyFormatter } from "@/lib/i18n/organization-money"
import { formatDate } from "@/lib/formateDate"
import { fr } from "date-fns/locale"
import { ItemWithInventoryLevelsPayload } from "@/types/itemTypes"
import { ItemForm2 } from "./ItemForm2"
import { useItemManagement } from "./hooks/useItemManagement"
import { getItemInventorySummary } from "./item-inventory-summary"

// Import TanStack Table components
import {
  ColumnDef,
  ColumnFiltersState,
  FilterFn,
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
  ChevronDownIcon,
  Download,
  MoreHorizontal,
  Package,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sparkles
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { DataTablePagination } from "@/components/DataTableComponents/DataTablePagination"
import DateFilters from "@/components/DataTableComponents/DateFilters"
import DateRangeFilter from "@/components/DataTableComponents/DateRangeFilter"
import type { Locale } from "@/types/bilingual"

// Enhanced form schema with better validation
const itemFormSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters").trim(),
    slug: z.string().optional(),
    costPrice: z.number().min(0, "Cost price must be positive").max(1000000, "Cost price seems too high"),
    quantity: z
      .number()
      .int("Quantity must be a whole number")
      .min(0, "Quantity cannot be negative")
      .max(100000, "Quantity seems too high"),
    sellingPrice: z.number().min(0, "Selling price must be positive").max(1000000, "Selling price seems too high"),
    createdAt: z.date().optional(),
    thumbnail: z.string().optional(),
    imageUrls: z.string().optional(),
    organizationId: z.string().min(1, "Organization ID is required"),
    sku: z
      .string()
      .min(3, "SKU must be at least 3 characters")
      .max(50, "SKU must be less than 50 characters")
      .regex(/^[A-Z0-9-_]+$/, "SKU can only contain uppercase letters, numbers, hyphens, and underscores"),
  })
  .refine((data) => data.sellingPrice >= data.costPrice, {
    message: "Selling price should be greater than or equal to cost price",
    path: ["sellingPrice"],
  })

export type ItemFormValues = z.infer<typeof itemFormSchema>

type ActiveFilterChip = {
  id: string
  label: string
  queryParam?: string | string[]
}

const STOCK_FILTER_OPTIONS = [
  { value: "all", label: "All stock" },
  { value: "in-stock", label: "In stock" },
  { value: "low-stock", label: "Low stock" },
  { value: "out-of-stock", label: "Out of stock" },
  { value: "overstock", label: "Overstock" },
  { value: "reorder", label: "Reorder" },
  { value: "available", label: "Available" },
  { value: "reserved", label: "Reserved" },
] as const

interface ItemManagementProps {
  title: string
  editingId: string
  organizationId: string
  initialItemData: ItemWithInventoryLevelsPayload[]
  initialCategoryData: CategoryDTO[]
  initialBrandData: BrandDTO[]
  initialUnitData: UnitDTO[]
  initialTaxRateData: TaxRateDTO[]
  currency?: string
  initialSearch?: string
  activeFilterChips?: ActiveFilterChip[]
  locale?: Locale
}

const DEFAULT_IMAGE_URL = "https://14J7oh8kso.ufs.sh/f/HLxTbDBCDLwfAXaapcezIN7vwylKf1PXSCqAuseUG0gx8mhd"

// Custom filter function for better searching
const globalFilterFn: FilterFn<any> = (row, columnId, value, addMeta) => {
  const item = row.original
  const searchValue = value.toLowerCase()

  return (
    item.name?.toLowerCase().includes(searchValue) ||
    item.sku?.toLowerCase().includes(searchValue) ||
    item.slug?.toLowerCase().includes(searchValue) ||
    String(item.costPrice).includes(searchValue) ||
    String(item.sellingPrice).includes(searchValue)
  )
}

// Define our columns
const getColumns = (
  formatCurrency: (amount: number) => string,
  formatDate: (date: Date | string) => string,
  handleEditClick: (item: ItemWithInventoryLevelsPayload) => void,
  handleDeleteClick: (item: ItemWithInventoryLevelsPayload) => void,
  isDeleting: boolean,
  itemToDelete: ItemWithInventoryLevelsPayload | null,
  locale: Locale
): ColumnDef<ItemWithInventoryLevelsPayload>[] => [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label={inventoryItemsText("Select all", locale)}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label={inventoryItemsText("Select row", locale)}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "name",
      header: inventoryItemsText("Name", locale),
      cell: ({ row }) => {
        const item = row.original
        return (
          <div className="flex min-w-[220px] items-center gap-3">
            <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-md border">
              <img
                src={item.thumbnail || DEFAULT_IMAGE_URL}
                alt={item.name}
                className="h-full w-full object-cover object-center"
              />
            </div>
            <div className="min-w-0 flex flex-col">
              <Link href={`/dashboard/inventory/items/${encodeURIComponent(item.id)}`} className="font-medium text-foreground line-clamp-1 underline underline-offset-4">{item.name}</Link>
              <span className="text-xs text-muted-foreground">{item.sku}</span>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: "costPrice",
      header: inventoryItemsText("Cost", locale),
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue("costPrice"))
        return <span className="font-medium">{formatCurrency(amount)}</span>
      },
    },
    {
      accessorKey: "sellingPrice",
      header: inventoryItemsText("Price", locale),
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue("sellingPrice"))
        return <span className="font-medium text-green-600">{formatCurrency(amount)}</span>
      },
    },
    {
      id: "inventoryLevels",
      accessorFn: (item) => getItemInventorySummary(item).stock,
      header: inventoryItemsText("Stock", locale),
      cell: ({ row }) => {
        const { stock: quantity, threshold } = getItemInventorySummary(row.original)

        let status = "default"
        if (quantity <= 0) status = "destructive"
        else if (quantity <= threshold) status = "warning"

        return (
          <Badge variant={status as any}>
            {quantity.toLocaleString(locale)} {inventoryItemsText("in stock", locale)}
          </Badge>
        )
      },
    },
    {
      id: "value",
      accessorFn: (item) => getItemInventorySummary(item).value,
      header: inventoryItemsText("Total Value", locale),
      cell: ({ row }) => {
        const value = row.getValue<number>("value")
        return <span className="font-medium">{formatCurrency(value)}</span>
      },
    },
    {
      accessorKey: "createdAt",
      header: inventoryItemsText("Date Added", locale),
      cell: ({ row }) => {
        return formatDate(row.getValue("createdAt"))
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const item = row.original
        const isBeingDeleted = isDeleting && itemToDelete?.id === item.id

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">{inventoryItemsText("Open menu", locale)}</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{inventoryItemsText("Actions", locale)}</DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <Link href={`/dashboard/inventory/items/${encodeURIComponent(item.id)}`}>{locale === "fr" ? "Consulter l’article" : "View item"}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigator.clipboard.writeText(item.id || "")}
              >
                {inventoryItemsText("Copy ID", locale)}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleEditClick(item)}>
                {inventoryItemsText("Edit Item", locale)}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleDeleteClick(item)}
                disabled={isBeingDeleted}
                className="text-destructive focus:text-destructive"
              >
                {isBeingDeleted ? inventoryItemsText("Deleting...", locale) : inventoryItemsText("Delete Item", locale)}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

// Modern TanStack Table Component
const ModernItemTable = ({
  data,
  columns,
  isLoading,
  onRefresh,
  onExport,
  title,
  initialSearch = "",
  activeFilterChips = [],
  locale = "en",
}: {
  data: ItemWithInventoryLevelsPayload[]
  columns: ColumnDef<ItemWithInventoryLevelsPayload>[]
  isLoading: boolean
  onRefresh: () => void
  onExport: (data: ItemWithInventoryLevelsPayload[]) => void
  title: string
  initialSearch?: string
  activeFilterChips?: ActiveFilterChip[]
  locale?: Locale
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
  } = useCanonicalTablePreferences(inventoryItemsTableContract)
  const { setSearch: setCanonicalSearch } = useCanonicalTableUrlState(inventoryItemsTableContract)
  const [rowSelection, setRowSelection] = useState({})
  const [globalFilter, setGlobalFilter] = useState(initialSearch)
  const [dateFilteredData, setDateFilteredData] = useState(data)
  const [isDateFilterActive, setIsDateFilterActive] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const hasActiveFilterChips = activeFilterChips.length > 0
  const hasSearchFilterChip = activeFilterChips.some((chip) => chip.id === "search" || chip.id === "q")
  const hasActiveSearch = Boolean(globalFilter.trim())
  const requestedStockFilter = searchParams.get("stock") ?? "all"
  const stockFilter = STOCK_FILTER_OPTIONS.some((option) => option.value === requestedStockFilter)
    ? requestedStockFilter
    : "all"

  useEffect(() => {
    setGlobalFilter(initialSearch)
  }, [initialSearch])

  useEffect(() => {
    setCanonicalSearch(globalFilter)
  }, [globalFilter, setCanonicalSearch])

  useEffect(() => {
    setDateFilteredData(data)
    setIsDateFilterActive(false)
  }, [data])

  const table = useReactTable({
    data: isDateFilterActive ? dateFilteredData : data,
    columns,
    getRowId: (row) => String(row.id),
    filterFns: {
      global: globalFilterFn,
    },
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      columnOrder,
      rowSelection,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    globalFilterFn,
  })

  const selectedRows = table.getFilteredSelectedRowModel().rows
  const filteredRowCount = table.getFilteredRowModel().rows.length
  const selectedItems = selectedRows.map((row) => row.original)
  const tableTitle = title || inventoryItemsText("Items Management", locale)

  const handleClearFilters = useCallback(() => {
    if (hasActiveSearch) {
      setGlobalFilter("")
    }

    if (!hasActiveFilterChips) {
      return
    }

    const nextParams = new URLSearchParams(searchParams)

    activeFilterChips.forEach((chip) => {
      if (!chip.queryParam) {
        return
      }
      const queryKeys = Array.isArray(chip.queryParam) ? chip.queryParam : [chip.queryParam]
      queryKeys.forEach((queryKey) => nextParams.delete(queryKey))
    })
    nextParams.delete("page")
    const queryString = nextParams.toString()
    const nextHref = queryString ? `${pathname}?${queryString}` : pathname

    const currentSearch = searchParams.toString()
    const currentHref = currentSearch ? `${pathname}?${currentSearch}` : pathname

    if (currentHref !== nextHref) {
      void router.replace(nextHref)
    }
  }, [activeFilterChips, hasActiveFilterChips, hasActiveSearch, pathname, router, searchParams, setGlobalFilter])

  const handleStockFilterChange = useCallback((value: string) => {
    const nextParams = new URLSearchParams(searchParams)

    if (value === "all") {
      nextParams.delete("stock")
    } else {
      nextParams.set("stock", value)
    }

    nextParams.delete("page")
    const queryString = nextParams.toString()
    void router.replace(queryString ? `${pathname}?${queryString}` : pathname)
  }, [pathname, router, searchParams])

  const canonicalQuery = createCanonicalTableQuery(inventoryItemsTableContract, {
    search: globalFilter,
    filters: stockFilter === "all" ? {} : { stock: [stockFilter] },
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
    <div className="w-full min-w-0 space-y-4">
      <div className="border-b border-[var(--dash-border-subtle)] bg-[rgba(12,20,24,0.58)] px-5 py-4 sm:px-6">
        <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--dash-spruce-soft)] text-[var(--dash-spruce)]">
              <Package className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-[var(--dash-text)]">{tableTitle}</h2>
              <p className="mt-1 break-words text-sm text-[var(--dash-text-soft)]">
                {locale === "fr" ? `${filteredRowCount.toLocaleString(locale)} articles affichés sur ${data.length.toLocaleString(locale)}` : `Showing ${filteredRowCount.toLocaleString(locale)} of ${data.length.toLocaleString(locale)} items`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="dashboard-filter-chip h-9 w-fit rounded-lg">
              <Sparkles className="me-1 h-3 w-3 text-[var(--dash-spruce)]" />
              {inventoryItemsText("Live Data", locale)}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isLoading}
              className="dashboard-button-secondary h-9 rounded-lg"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              {isLoading ? inventoryItemsText("Refreshing", locale) : inventoryItemsText("Refresh", locale)}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onExport(data)}
              className="dashboard-button-secondary h-9 rounded-lg"
            >
              <Download className="mr-2 h-4 w-4" />
              {inventoryItemsText("Export", locale)}
            </Button>
          </div>
        </div>

        {hasActiveFilterChips || hasActiveSearch ? (
          <div className="mt-3 flex min-w-0 flex-wrap items-center gap-2">
            {activeFilterChips.map((chip) => (
              <Badge
                key={chip.id}
                variant="outline"
                className="dashboard-filter-chip h-9 w-fit rounded-lg"
              >
                {chip.label}
              </Badge>
            ))}
            {hasActiveSearch && !hasSearchFilterChip ? (
              <Badge variant="outline" className="dashboard-filter-chip h-9 w-fit rounded-lg">
                {inventoryItemsText("Search:", locale)} {globalFilter}
              </Badge>
            ) : null}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="h-8 rounded-lg text-[var(--dash-text-soft)] hover:bg-[var(--dash-brand-soft)] hover:text-[var(--dash-brand-strong)]"
            >
              {inventoryItemsText("Clear", locale)}
            </Button>
          </div>
        ) : null}
      </div>

      <div className="space-y-4 p-3 sm:p-5">
        {/* Filters and search */}
        <div className="dashboard-table-toolbar flex flex-col gap-3 rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-surface)]/70 p-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full min-w-0 flex-1 lg:min-w-[18rem]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--dash-text-faint)]" />
            <Input
              aria-label={locale === "fr" ? "Rechercher des articles" : "Search items"}
              placeholder={inventoryItemsText("Search items, SKUs, categories, or brands", locale)}
              value={globalFilter ?? ""}
              onChange={(event) => setGlobalFilter(event.target.value)}
              className="dashboard-control h-9 w-full rounded-lg pl-9 pr-9"
            />
            {hasActiveSearch ? (
              <button
                type="button"
                aria-label={inventoryItemsText("Clear item search", locale)}
                onClick={() => setGlobalFilter("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-1.5 py-0.5 text-xs font-semibold text-[var(--dash-text-faint)] transition hover:bg-[var(--dash-brand-soft)] hover:text-[var(--dash-text)]"
              >
                x
              </button>
            ) : null}
          </div>

          <div className="flex w-full shrink-0 flex-wrap items-center gap-2 lg:w-auto lg:justify-end">
            <DateRangeFilter
              data={data}
              onFilter={setDateFilteredData}
              setIsDateFilterActive={setIsDateFilterActive}
              locale={locale}
              variant="landing"
            />
            <DateFilters
              data={data}
              onFilter={setDateFilteredData}
              setIsDateFilterActive={setIsDateFilterActive}
              locale={locale}
              variant="landing"
            />
            <Select value={stockFilter} onValueChange={handleStockFilterChange}>
              <SelectTrigger aria-label={inventoryItemsText("Stock status", locale)} className="dashboard-control h-9 w-full rounded-lg sm:w-[160px]">
                <SelectValue placeholder={inventoryItemsText("Stock status", locale)} />
              </SelectTrigger>
              <SelectContent className="border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] text-[var(--dash-text)]">
                {STOCK_FILTER_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {inventoryItemsText(option.label, locale)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedRows.length > 0 ? (
              <>
                <Badge variant="outline" className="rounded-lg border-[var(--dash-brand)] bg-[var(--dash-brand-soft)] text-[var(--dash-brand-strong)]">
                  {selectedRows.length.toLocaleString(locale)} {locale === "fr" ? "sélectionné(s)" : "selected"}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onExport(selectedItems)}
                  className="dashboard-button-secondary h-9 rounded-lg"
                >
                  <Download className="mr-2 h-4 w-4" />
                  {inventoryItemsText("Export Selected", locale)}
                </Button>
              </>
            ) : null}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="dashboard-button-secondary h-9 rounded-lg">
                  <SlidersHorizontal className="mr-2 h-4 w-4" />
                  {inventoryItemsText("View", locale)}
                  <ChevronDownIcon className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[150px] border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] text-[var(--dash-text)]">
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
                        {typeof column.columnDef.header === "string" ? column.columnDef.header : column.id}
                      </DropdownMenuCheckboxItem>
                    )
                  })}
              </DropdownMenuContent>
            </DropdownMenu>

          </div>
        </div>

        {/* Table */}
      <div className="flex justify-end">
        <CanonicalTableDensityControl
          density={density}
          locale={locale === "fr" ? "fr" : "en"}
          onDensityChange={setDensity}
        />
      </div>
      <div className="dashboard-table-shell dashboard-data-table min-w-0 overflow-hidden rounded-lg">
        <div className="w-full overflow-x-auto">
        <CanonicalTableBoundary
          contract={inventoryItemsTableContract}
          locale={locale === "fr" ? "fr" : "en"}
          query={canonicalQuery}
          selection={canonicalSelection}
          state={isLoading ? "loading" : table.getFilteredRowModel().rows.length === 0 ? (globalFilter || stockFilter !== "all" ? "no-results" : "empty") : "ready"}
          density={density}
        >
        <Table className="min-w-[920px]" scrollRegionLabel={locale === "fr" ? "Tableau des articles de stock" : "Stock items table"}>
          <TableHeader className="sticky top-0 z-10 bg-[rgba(16,27,32,0.94)] backdrop-blur">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead
                      key={header.id}
                      className="whitespace-nowrap"
                      aria-sort={header.column.getCanSort() ? (header.column.getIsSorted() === "asc" ? "ascending" : header.column.getIsSorted() === "desc" ? "descending" : "none") : undefined}
                    >
                      {header.isPlaceholder
                        ? null
                        : header.column.getCanSort()
                          ? (
                            <button
                              type="button"
                              className="inline-flex min-h-10 items-center gap-1 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dash-focus)]"
                              onClick={header.column.getToggleSortingHandler()}
                            >
                              {flexRender(header.column.columnDef.header, header.getContext())}
                            </button>
                          )
                          : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Skeleton loading state
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell colSpan={columns.length}>
                    <div className="flex items-center space-x-4">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-[250px]" />
                        <Skeleton className="h-4 w-[200px]" />
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="group border-[var(--dash-border-subtle)] hover:bg-[var(--dash-brand-soft)]"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className={density === "compact" ? "h-10 py-1 align-middle" : "align-middle"}>
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
                  className="h-64 text-center"
                >
                  <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-4 py-10">
                    <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-brand-soft)] text-[var(--dash-brand-strong)]">
                      <Package className="h-7 w-7" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-[var(--dash-text)]">
                        {hasActiveSearch ? inventoryItemsText("No matching items", locale) : inventoryItemsText("No inventory items yet", locale)}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-[var(--dash-text-soft)]">
                        {hasActiveSearch
                          ? inventoryItemsText("Try a different search term or clear the filter to see the full catalog.", locale)
                          : inventoryItemsText("Create your first item to start tracking pricing, stock health, and inventory value.", locale)}
                      </p>
                    </div>
                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                      {hasActiveSearch && (
                        <Button variant="outline" size="sm" onClick={() => setGlobalFilter("")} className="dashboard-button-secondary rounded-lg">
                          {inventoryItemsText("Clear Search", locale)}
                        </Button>
                      )}
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        </CanonicalTableBoundary>
        </div>
      </div>

        {/* Pagination and summary */}
        <DataTablePagination table={table} variant="landing" locale={locale} />
      </div>
    </div>
  )
}

const ItemManagement = memo<ItemManagementProps>(
  ({
    title,
    organizationId,
    editingId,
    initialItemData,
    initialCategoryData,
    initialBrandData,
    initialUnitData,
    initialTaxRateData,
    initialSearch = "",
    activeFilterChips = [],
    locale = "en",
    currency = "XAF",
  }) => {
    // Validate required props
    if (!organizationId) {
      throw new Error("Organization ID is required to manage items")
    }

    // Ensure data is properly formatted
    const itemsArray = useMemo(() => (Array.isArray(initialItemData) ? initialItemData : []), [initialItemData])

    // Custom hook for item management logic
    const {
      formDialogOpen,
      setFormDialogOpen,
      deleteDialogOpen,
      setDeleteDialogOpen,
      itemToDelete,
      setItemToDelete,
      handleEditClick,
      handleDeleteClick,
      resetFormToDefaults,
    } = useItemManagement()

    // API hooks
    const { refetch, isLoading, error } = useOrgItemsNew(organizationId)
    const createItemMutation = useCreateItem()
    const deleteItemMutation = useDeleteItem()

    // Form setup
    const form = useForm<ItemFormValues>({
      resolver: zodResolver(itemFormSchema),
      defaultValues: {
        name: "",
        slug: "",
        costPrice: 0,
        quantity: 0,
        sellingPrice: 0,
        thumbnail: "",
        organizationId: organizationId,
        imageUrls: "",
        sku: "",
      },
      mode: "onChange", // Enable real-time validation
    })

    // Local state
    const [itemImageUrl, setItemImageUrl] = useState("")
    const [isImageUploading, setIsImageUploading] = useState(false)

    // Export functionality
    const handleExport = useCallback(
      (filteredItems: ItemWithInventoryLevelsPayload[]) => {
        try {
          const exportQuery = createCanonicalTableQuery(inventoryItemsTableContract, { pageSize: 100 })
          const exportIntent = buildCanonicalTableExportIntent({
            contract: inventoryItemsTableContract,
            organizationId,
            query: exportQuery,
            selection: createCanonicalTableSelection(
              "explicit",
              exportQuery,
              filteredItems.map((item) => String(item.id)),
              { kind: "known", total: filteredItems.length },
            ),
            columns: inventoryItemsTableContract.columns.allowed.map((column) => column.id),
            locale,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
            format: "xlsx",
          })
          const exportData = filteredItems.map((item) => ({
            Name: item.name,
            Slug: item.slug,
            SKU: item.sku,
            "Cost Price": item.costPrice,
            "Selling Price": item.sellingPrice,
            Stock: getItemInventorySummary(item).stock,
            "Total Value": getItemInventorySummary(item).value,
            "Date Added": formatDate(item.createdAt),
          }))

          const worksheet = XLSX.utils.json_to_sheet(exportData)
          const evidenceWorksheet = XLSX.utils.json_to_sheet(canonicalTableExportEvidenceRows(exportIntent))
          const workbook = XLSX.utils.book_new()
          XLSX.utils.book_append_sheet(workbook, worksheet, "Items")
          XLSX.utils.book_append_sheet(workbook, evidenceWorksheet, "Export Evidence")

          const fileName = `Items_${format(new Date(), "yyyy-MM-dd_HH-mm-ss")}.xlsx`
          XLSX.writeFile(workbook, fileName)

          notify.success(inventoryItemsText("Export successful", locale), {
            description: locale === "fr" ? `${filteredItems.length} articles exportés vers ${fileName}` : `${filteredItems.length} items exported to ${fileName}`,
          })
        } catch (error) {
          console.error("Export error:", error)
          notify.error(inventoryItemsText("Export failed", locale), {
            description: error instanceof Error ? error.message : inventoryItemsText("Unknown error occurred", locale),
          })
        }
      },
      [locale, organizationId],
    )

    // Form handlers
    const handleFormDialogClose = useCallback(
      (open: boolean) => {
        setFormDialogOpen(open)
        if (!open) {
          setTimeout(() => {
            resetFormToDefaults()
            form.reset()
            setItemImageUrl("")
          }, 150)
        }
      },
      [setFormDialogOpen, resetFormToDefaults, form],
    )

    const handleRefresh = useCallback(async () => {
      try {
        await refetch()
        notify.success(inventoryItemsText("Items refreshed successfully", locale))
      } catch (error) {
        notify.error(inventoryItemsText("Failed to refresh items", locale))
      }
    }, [refetch, locale])

    // Form submission
    const onSubmit = useCallback(
      async (data: ItemFormValues) => {
        if (isImageUploading || createItemMutation.isPending) return
        if (!itemImageUrl) {
          notify.error(inventoryItemsText("Upload an image before saving this item.", locale))
          return
        }
        try {
          const { id, ...rest } = data
          const newItemData = {
            id: crypto.randomUUID(),
            ...rest,
            slug: data.name.toLowerCase().replace(/\s+/g, "-"),
            thumbnail: itemImageUrl,
            organizationId: organizationId,
            createdAt: new Date(),
            quantity: Number(data.quantity) || 0,
            costPrice: Number(data.costPrice) || 0,
            sellingPrice: Number(data.sellingPrice) || 0,
            sku: data.sku,
            imageUrls: itemImageUrl,
          }

          await createItemMutation.mutateAsync(newItemData)

          notify.success(inventoryItemsText("Item added successfully", locale), {
            description: locale === "fr" ? `${data.name} a été ajouté à votre stock` : `${data.name} has been added to your inventory`,
          })

          setFormDialogOpen(false)
          resetFormToDefaults()
          form.reset()
          setItemImageUrl("")
          await refetch()
        } catch (error) {
          console.error("Submit error:", error)
          notify.error(inventoryItemsText("Failed to add item", locale), {
            description: error instanceof Error ? error.message : inventoryItemsText("Unknown error occurred", locale),
          })
        }
      },
      [itemImageUrl, isImageUploading, organizationId, createItemMutation, setFormDialogOpen, resetFormToDefaults, form, refetch, locale],
    )

    // Delete confirmation
    const handleDeleteConfirmation = useCallback(async () => {
      if (!itemToDelete) return

      try {
        await deleteItemMutation.mutateAsync({ id: itemToDelete.id!, organizationId })
        notify.success(inventoryItemsText("Item deleted successfully", locale), {
          description: locale === "fr" ? `${itemToDelete.name} a été retiré de votre stock` : `${itemToDelete.name} has been removed from your inventory`,
        })
        setDeleteDialogOpen(false)
        setItemToDelete(null)
        await refetch()
      } catch (error) {
        console.error("Delete error:", error)
        notify.error(inventoryItemsText("Failed to delete item", locale), {
          description: error instanceof Error ? error.message : inventoryItemsText("Unknown error occurred", locale),
        })
      }
    }, [itemToDelete, deleteItemMutation, organizationId, setDeleteDialogOpen, setItemToDelete, refetch, locale])

    const moneyFormatter = useMemo(() => createOrganizationMoneyFormatter({ organizationId, locale, currency }), [organizationId, locale, currency])
    const formatDisplayDate = useCallback((date: Date | string) => locale === "fr"
      ? format(typeof date === "string" ? new Date(date) : date, "dd MMM yyyy", { locale: fr })
      : formatDate(date), [locale])

    // Table columns
    const columns = useMemo(
      () => getColumns(moneyFormatter.format, formatDisplayDate, handleEditClick, handleDeleteClick, deleteItemMutation.isPending, itemToDelete, locale),
      [handleEditClick, handleDeleteClick, deleteItemMutation.isPending, itemToDelete, locale, moneyFormatter, formatDisplayDate]
    )

    // Error state
    if (error) {
      return (
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-destructive">{inventoryItemsText("Error Loading Items", locale)}</CardTitle>
            <CardDescription>{inventoryItemsText("Failed to load items. Please try refreshing the page.", locale)}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleRefresh} variant="outline">
              {inventoryItemsText("Try Again", locale)}
            </Button>
          </CardContent>
        </Card>
      )
    }

    return (
      <div className="space-y-6">
        {/* Modern TanStack Table */}
        <ModernItemTable
          data={itemsArray}
          columns={columns}
          isLoading={isLoading}
          onRefresh={handleRefresh}
          onExport={handleExport}
          title={title || inventoryItemsText("Items Management", locale)}
          initialSearch={initialSearch}
          activeFilterChips={activeFilterChips}
          locale={locale}
        />

        {/* Add Item Form Dialog */}
        <EntityForm
          open={formDialogOpen}
          onOpenChange={handleFormDialogClose}
          title={inventoryItemsText("Add New Item", locale)}
          form={form}
          size="lg"
          onSubmit={onSubmit}
          isSubmitting={createItemMutation.isPending || isImageUploading}
          submitLabel={inventoryItemsText("Add Item", locale)}
        >
          <ItemForm2
            form={form}
            itemImageUrl={itemImageUrl}
            setItemImageUrl={setItemImageUrl}
            organizationId={organizationId}
            locale={locale}
            onUploadStart={() => setIsImageUploading(true)}
            onUploadComplete={() => setIsImageUploading(false)}
            onUploadError={() => setIsImageUploading(false)}
          />
        </EntityForm>


        {/* Delete Confirmation Dialog */}
        <ConfirmationDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title={inventoryItemsText("Delete Item", locale)}
          description={
            itemToDelete ? (
              <div className="space-y-2">
                <p>
                  {locale === "fr" ? "Voulez-vous vraiment supprimer " : "Are you sure you want to delete "}<strong>{itemToDelete.name}</strong> ?
                </p>
                <div className="text-sm text-muted-foreground">
                  <p>SKU: {itemToDelete.sku}</p>
                  <p>{inventoryItemsText("This action cannot be undone.", locale)}</p>
                </div>
              </div>
            ) : (
              inventoryItemsText("Are you sure you want to delete this item?", locale)
            )
          }
          onConfirm={handleDeleteConfirmation}
          isConfirming={deleteItemMutation.isPending}
          confirmLabel={inventoryItemsText("Delete Item", locale)}
          variant="destructive"
        />
      </div>
    )
  },
)

ItemManagement.displayName = "Item Management"

export default ItemManagement
