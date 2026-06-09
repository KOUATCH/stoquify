"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DatePicker } from "@/components/ui/date-picker"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useInventoryTransactions, useStockMovementSummary } from "@/hooks/useInventoryMovementQueries"
import { useOrgLocationsNew } from "@/hooks/useAllLocationsQueries"
import { useOrgItemsNew } from "@/hooks/useAllItemQueries"
import { getLocaleFromPathname, localizePath } from "@/i18n/routing"
import { cn, formatCurrency } from "@/lib/utils"
import { DEFAULT_LOCALE } from "@/types/bilingual"
import type { TransactionType } from "@/types/inventoryMovementTypes"
import {
  Activity,
  ArrowDown,
  ArrowRightLeft,
  ArrowUp,
  BarChart3,
  Boxes,
  CalendarClock,
  ClipboardCheck,
  FileClock,
  Package,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react"
import { useClientAuth } from "@/hooks/useClientAuth"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { type CSSProperties, useMemo, useState } from "react"
import { format } from "date-fns"

const transactionTypeConfig = {
  INBOUND: {
    icon: <ArrowDown className="h-3 w-3" />,
    className: "border-[var(--dash-success)] bg-[var(--dash-success-soft)] text-[var(--dash-success)]",
    label: "Inbound",
    description: "Goods received",
  },
  PURCHASE_RECEIPT: {
    icon: <ArrowDown className="h-3 w-3" />,
    className: "border-[var(--dash-success)] bg-[var(--dash-success-soft)] text-[var(--dash-success)]",
    label: "Purchase Receipt",
    description: "Supplier receipt",
  },
  RETURN_FROM_CUSTOMER: {
    icon: <RotateCcw className="h-3 w-3" />,
    className: "border-[var(--dash-success)] bg-[var(--dash-success-soft)] text-[var(--dash-success)]",
    label: "Customer Return",
    description: "Returned stock",
  },
  PRODUCTION_IN: {
    icon: <Boxes className="h-3 w-3" />,
    className: "border-[var(--dash-success)] bg-[var(--dash-success-soft)] text-[var(--dash-success)]",
    label: "Production In",
    description: "Produced stock",
  },
  INITIAL_STOCK: {
    icon: <ClipboardCheck className="h-3 w-3" />,
    className: "border-[var(--dash-brand)] bg-[var(--dash-brand-soft)] text-[var(--dash-brand-strong)]",
    label: "Initial Stock",
    description: "Opening quantity",
  },
  OUTBOUND: {
    icon: <ArrowUp className="h-3 w-3" />,
    className: "border-[var(--dash-danger)] bg-[var(--dash-danger-soft)] text-[var(--dash-danger)]",
    label: "Outbound",
    description: "Sales/consumption",
  },
  SALE: {
    icon: <ArrowUp className="h-3 w-3" />,
    className: "border-[var(--dash-danger)] bg-[var(--dash-danger-soft)] text-[var(--dash-danger)]",
    label: "Sale",
    description: "POS sale",
  },
  RETURN_TO_SUPPLIER: {
    icon: <ArrowUp className="h-3 w-3" />,
    className: "border-[var(--dash-warning)] bg-[var(--dash-warning-soft)] text-[var(--dash-warning)]",
    label: "Supplier Return",
    description: "Returned to supplier",
  },
  PRODUCTION_OUT: {
    icon: <Boxes className="h-3 w-3" />,
    className: "border-[var(--dash-warning)] bg-[var(--dash-warning-soft)] text-[var(--dash-warning)]",
    label: "Production Out",
    description: "Production consumption",
  },
  TRANSFER_IN: {
    icon: <ArrowRightLeft className="h-3 w-3" />,
    className: "border-[var(--dash-info)] bg-[var(--dash-info-soft)] text-[var(--dash-info)]",
    label: "Transfer In",
    description: "Received from transfer",
  },
  TRANSFER_OUT: {
    icon: <ArrowRightLeft className="h-3 w-3" />,
    className: "border-[var(--dash-info)] bg-[var(--dash-info-soft)] text-[var(--dash-info)]",
    label: "Transfer Out",
    description: "Sent via transfer",
  },
  ADJUSTMENT_IN: {
    icon: <ClipboardCheck className="h-3 w-3" />,
    className: "border-[var(--dash-brand)] bg-[var(--dash-brand-soft)] text-[var(--dash-brand-strong)]",
    label: "Adjustment In",
    description: "Positive adjustment",
  },
  ADJUSTMENT_OUT: {
    icon: <ClipboardCheck className="h-3 w-3" />,
    className: "border-[var(--dash-warning)] bg-[var(--dash-warning-soft)] text-[var(--dash-warning)]",
    label: "Adjustment Out",
    description: "Negative adjustment",
  },
  RESERVED: {
    icon: <ShieldAlert className="h-3 w-3" />,
    className: "border-[var(--dash-gold)] bg-[var(--dash-gold-soft)] text-[var(--dash-gold)]",
    label: "Reserved",
    description: "Reserved for orders",
  },
  UNRESERVED: {
    icon: <RotateCcw className="h-3 w-3" />,
    className: "border-[var(--dash-spruce)] bg-[var(--dash-spruce-soft)] text-[var(--dash-spruce)]",
    label: "Unreserved",
    description: "Released from reservation",
  },
  DAMAGED: {
    icon: <ArrowUp className="h-3 w-3" />,
    className: "border-[var(--dash-danger)] bg-[var(--dash-danger-soft)] text-[var(--dash-danger)]",
    label: "Damaged",
    description: "Damaged goods",
  },
  EXPIRED: {
    icon: <CalendarClock className="h-3 w-3" />,
    className: "border-[var(--dash-danger)] bg-[var(--dash-danger-soft)] text-[var(--dash-danger)]",
    label: "Expired",
    description: "Expired items",
  },
  THEFT: {
    icon: <ShieldAlert className="h-3 w-3" />,
    className: "border-[var(--dash-danger)] bg-[var(--dash-danger-soft)] text-[var(--dash-danger)]",
    label: "Theft",
    description: "Theft/loss",
  },
  SHRINKAGE: {
    icon: <TrendingDown className="h-3 w-3" />,
    className: "border-[var(--dash-danger)] bg-[var(--dash-danger-soft)] text-[var(--dash-danger)]",
    label: "Shrinkage",
    description: "Inventory loss",
  },
  CORRECTION: {
    icon: <RotateCcw className="h-3 w-3" />,
    className: "border-[var(--dash-text-faint)] bg-[rgba(126,145,137,0.14)] text-[var(--dash-text-soft)]",
    label: "Correction",
    description: "Correction entry",
  },
  OPENING_BALANCE: {
    icon: <FileClock className="h-3 w-3" />,
    className: "border-[var(--dash-brand)] bg-[var(--dash-brand-soft)] text-[var(--dash-brand-strong)]",
    label: "Opening Balance",
    description: "Opening balance",
  },
  CYCLE_COUNT: {
    icon: <ClipboardCheck className="h-3 w-3" />,
    className: "border-[var(--dash-gold)] bg-[var(--dash-gold-soft)] text-[var(--dash-gold)]",
    label: "Cycle Count",
    description: "Cycle count",
  },
  PHYSICAL_COUNT: {
    icon: <ClipboardCheck className="h-3 w-3" />,
    className: "border-[var(--dash-gold)] bg-[var(--dash-gold-soft)] text-[var(--dash-gold)]",
    label: "Physical Count",
    description: "Physical count",
  },
}

const inboundTypes = ["INBOUND", "PURCHASE_RECEIPT", "RETURN_FROM_CUSTOMER", "TRANSFER_IN", "ADJUSTMENT_IN", "PRODUCTION_IN", "INITIAL_STOCK", "OPENING_BALANCE"]
const outboundTypes = ["OUTBOUND", "SALE", "RETURN_TO_SUPPLIER", "TRANSFER_OUT", "ADJUSTMENT_OUT", "PRODUCTION_OUT", "DAMAGED", "EXPIRED", "THEFT", "SHRINKAGE"]

type StockMovementTransactionRow = {
  id: string
  type: string
  quantity: number
  reservedQuantity?: number
  unitPrice: number
  totalValue: number
  reference?: string | null
  referenceNumber?: string | null
  notes?: string | null
  createdAt: Date | string
  item: {
    name: string
    sku: string
  }
  location?: {
    name?: string | null
  } | null
}

export function StockMovementDashboard() {
  const { organizationId } = useClientAuth()
  const orgId = organizationId || ""
  const pathname = usePathname()
  const locale = getLocaleFromPathname(pathname) ?? DEFAULT_LOCALE
  const itemsHref = localizePath("/dashboard/inventory/items", locale)

  const [selectedItem, setSelectedItem] = useState<string>("all")
  const [selectedLocation, setSelectedLocation] = useState<string>("all")
  const [selectedType, setSelectedType] = useState<TransactionType | "all">("all")
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined)
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined)

  // Fetch data
  const { data: transactions, isLoading: transactionsLoading } = useInventoryTransactions(orgId, {
    itemId: selectedItem === "all" ? undefined : selectedItem,
    locationId: selectedLocation === "all" ? undefined : selectedLocation,
    type: selectedType === "all" ? undefined : selectedType,
    dateFrom: dateFrom?.toISOString().split('T')[0] || undefined,
    dateTo: dateTo?.toISOString().split('T')[0] || undefined,
    limit: 100,
  })

  const { data: summary, isLoading: summaryLoading } = useStockMovementSummary(orgId, {
    itemId: selectedItem === "all" ? undefined : selectedItem,
    locationId: selectedLocation === "all" ? undefined : selectedLocation,
    dateFrom: dateFrom?.toISOString().split('T')[0] || undefined,
    dateTo: dateTo?.toISOString().split('T')[0] || undefined,
  })

  const { data: itemsResponse } = useOrgItemsNew(orgId, { enabled: !!orgId })
  const { data: locationsResponse } = useOrgLocationsNew(orgId, { enabled: !!orgId })

  const items = itemsResponse?.data || []
  const locations = locationsResponse?.data || []

  const hasActiveFilters = selectedItem !== "all" || selectedLocation !== "all" || selectedType !== "all" || Boolean(dateFrom || dateTo)
  const transactionCount = transactions?.length ?? 0
  const netMovement = summary?.netMovement ?? 0
  const valueChange = summary?.valueChange ?? 0

  const statsCards = useMemo(
    () => [
      {
        label: "Total Inbound",
        value: (summary?.totalInbound ?? 0).toLocaleString(),
        Icon: TrendingUp,
        accent: "var(--dash-success)",
        soft: "var(--dash-success-soft)",
        sub: "Received quantity",
      },
      {
        label: "Total Outbound",
        value: (summary?.totalOutbound ?? 0).toLocaleString(),
        Icon: TrendingDown,
        accent: "var(--dash-danger)",
        soft: "var(--dash-danger-soft)",
        sub: "Issued quantity",
      },
      {
        label: "Net Movement",
        value: netMovement.toLocaleString(),
        Icon: Activity,
        accent: netMovement >= 0 ? "var(--dash-spruce)" : "var(--dash-warning)",
        soft: netMovement >= 0 ? "var(--dash-spruce-soft)" : "var(--dash-warning-soft)",
        sub: "Current filter impact",
      },
      {
        label: "Value Change",
        value: formatCurrency(valueChange),
        Icon: BarChart3,
        accent: valueChange >= 0 ? "var(--dash-info)" : "var(--dash-warm)",
        soft: valueChange >= 0 ? "var(--dash-info-soft)" : "var(--dash-warm-soft)",
        sub: "Net stock value",
      },
      {
        label: "Transfers",
        value: (summary?.totalTransfers ?? 0).toLocaleString(),
        Icon: ArrowRightLeft,
        accent: "var(--dash-brand)",
        soft: "var(--dash-brand-soft)",
        sub: "Location moves",
      },
      {
        label: "Transactions",
        value: (summary?.transactionCount ?? transactionCount).toLocaleString(),
        Icon: FileClock,
        accent: "var(--dash-gold)",
        soft: "var(--dash-gold-soft)",
        sub: "Ledger entries",
      },
    ],
    [netMovement, summary, transactionCount, valueChange],
  )

  const resetFilters = () => {
    setSelectedItem("all")
    setSelectedLocation("all")
    setSelectedType("all")
    setDateFrom(undefined)
    setDateTo(undefined)
  }

  if (!orgId || transactionsLoading || summaryLoading) {
    return <StockMovementLoadingSkeleton />
  }

  return (
    <div className="dashboard-landing-theme dark min-h-screen overflow-x-hidden">
      <div className="dashboard-landing-content mx-auto w-full max-w-[88rem] min-w-0 px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 flex min-w-0 flex-col gap-5 sm:mb-8 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0 max-w-3xl">
            <div className="dashboard-eyebrow mb-4">
              <span className="dashboard-live-dot" />
              Inventory ledger
            </div>
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-brand-soft)] shadow-[0_16px_34px_rgba(47,125,246,0.18)]">
                <ArrowRightLeft className="h-6 w-6 text-[var(--dash-brand-strong)]" />
              </div>
              <div className="min-w-0">
                <h1 className="text-3xl font-semibold tracking-tight text-[var(--dash-text)] sm:text-4xl">
                  Stock Movements
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--dash-text-soft)] sm:text-base">
                  Follow stock receipts, sales, transfers, adjustments, and reservations across items and locations.
                </p>
              </div>
            </div>
          </div>
          <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={resetFilters}
              disabled={!hasActiveFilters}
              className="dashboard-button-secondary h-10 w-full rounded-lg sm:w-auto"
            >
              <RotateCcw className="h-4 w-4" />
              Reset Filters
            </Button>
            <Button asChild size="sm" className="dashboard-button-primary h-10 w-full rounded-lg px-4 sm:w-auto">
              <Link href={itemsHref}>
                <Package className="h-4 w-4" />
                <span>View Items</span>
              </Link>
            </Button>
          </div>
        </div>

        <div className="mb-6 grid min-w-0 grid-cols-1 gap-3 sm:mb-8 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
          {statsCards.map(({ label, value, Icon, accent, soft, sub }) => (
            <Card
              key={label}
              className="dashboard-stat-card group relative min-h-[146px] min-w-0 overflow-hidden"
              style={{
                "--stat-accent": accent,
                "--stat-soft": soft,
              } as CSSProperties}
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-[var(--stat-accent)] opacity-80" />
              <div className="absolute end-4 top-4 flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--stat-soft)] text-[var(--stat-accent)] transition-transform duration-200 group-hover:scale-105">
                <Icon className="h-4 w-4" />
              </div>
              <CardHeader className="pb-2 pe-14">
                <CardTitle className="text-[0.7rem] font-semibold uppercase leading-4 text-[var(--dash-text-faint)]">
                  {label}
                </CardTitle>
              </CardHeader>
              <CardContent className="relative z-10 pe-4">
                <div className="mb-1 break-words text-2xl font-semibold leading-tight text-[var(--dash-text)]">{value}</div>
                <p className="text-xs leading-5 text-[var(--dash-text-soft)]">{sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="dashboard-glass-panel min-w-0 overflow-hidden rounded-lg text-[var(--dash-text)]">
          <div className="border-b border-[var(--dash-border-subtle)] bg-[rgba(12,20,24,0.58)] px-5 py-4 sm:px-6">
            <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--dash-spruce-soft)] text-[var(--dash-spruce)]">
                  <Activity className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold text-[var(--dash-text)]">Movement Workspace</h3>
                  <p className="break-words text-sm text-[var(--dash-text-soft)]">
                    {transactionCount} visible entries / {items.length} items / {locations.length} locations
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="dashboard-filter-chip w-fit rounded-lg">
                  <Sparkles className="me-1 h-3 w-3 text-[var(--dash-spruce)]" />
                  Live Data
                </Badge>
                {hasActiveFilters && (
                  <Badge variant="outline" className="dashboard-filter-chip w-fit rounded-lg">
                    <Activity className="me-1 h-3 w-3 text-[var(--dash-brand-strong)]" />
                    Filtered
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <Tabs defaultValue="transactions" className="space-y-5 p-3 sm:p-5">
            <TabsList className="dashboard-filter-chip grid h-auto w-full grid-cols-2 rounded-lg p-1 sm:w-[24rem]">
              <TabsTrigger value="transactions" className="rounded-md data-[state=active]:bg-[var(--dash-brand-soft)] data-[state=active]:text-[var(--dash-brand-strong)]">
                Transaction History
              </TabsTrigger>
              <TabsTrigger value="analytics" className="rounded-md data-[state=active]:bg-[var(--dash-brand-soft)] data-[state=active]:text-[var(--dash-brand-strong)]">
                Movement Analytics
              </TabsTrigger>
            </TabsList>

            <TabsContent value="transactions" className="space-y-5">
              <div className="dashboard-filter-chip rounded-lg p-4">
                <div className="mb-4 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h4 className="text-sm font-semibold uppercase text-[var(--dash-text-muted)]">Filters</h4>
                    <p className="mt-1 text-sm text-[var(--dash-text-soft)]">Narrow the ledger by item, location, type, and date.</p>
                  </div>
                  {hasActiveFilters && (
                    <Button type="button" variant="ghost" size="sm" onClick={resetFilters} className="h-9 rounded-lg text-[var(--dash-text-soft)] hover:bg-[var(--dash-brand-soft)] hover:text-[var(--dash-brand-strong)]">
                      <RotateCcw className="h-4 w-4" />
                      Clear
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
                  <Select value={selectedItem} onValueChange={setSelectedItem}>
                    <SelectTrigger className="dashboard-control h-10 rounded-lg">
                      <SelectValue placeholder="All Items" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Items</SelectItem>
                      {items.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name} ({item.sku})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                    <SelectTrigger className="dashboard-control h-10 rounded-lg">
                      <SelectValue placeholder="All Locations" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Locations</SelectItem>
                      {locations.map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={selectedType}
                    onValueChange={(value) => setSelectedType(value as TransactionType | "all")}
                  >
                    <SelectTrigger className="dashboard-control h-10 rounded-lg">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {Object.entries(transactionTypeConfig).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            {config.icon}
                            {config.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <DatePicker
                    date={dateFrom}
                    onDateChange={setDateFrom}
                    placeholder="From Date"
                    maxDate={dateTo || new Date()}
                    className="dashboard-control h-10 rounded-lg"
                  />

                  <DatePicker
                    date={dateTo}
                    onDateChange={setDateTo}
                    placeholder="To Date"
                    minDate={dateFrom}
                    maxDate={new Date()}
                    className="dashboard-control h-10 rounded-lg"
                  />
                </div>
              </div>

              <div className="dashboard-table-shell">
                <div className="dashboard-data-table w-full overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Item</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-center">Quantity</TableHead>
                        <TableHead className="text-center">Reserved</TableHead>
                        <TableHead className="text-right">Unit Price</TableHead>
                        <TableHead className="text-right">Total Value</TableHead>
                        <TableHead>Reference</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {!transactions || transactions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="h-72 text-center">
                            <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-4 py-10">
                              <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-brand-soft)] text-[var(--dash-brand-strong)]">
                                <Activity className="h-7 w-7" />
                              </div>
                              <div>
                                <h3 className="text-base font-semibold text-[var(--dash-text)]">No transactions found</h3>
                                <p className="mt-2 text-sm leading-6 text-[var(--dash-text-soft)]">
                                  {hasActiveFilters
                                    ? "Try a broader item, location, type, or date range."
                                    : "Inventory movements will appear here once stock activity is recorded."}
                                </p>
                              </div>
                              {hasActiveFilters && (
                                <Button type="button" size="sm" onClick={resetFilters} className="dashboard-button-primary rounded-lg">
                                  <RotateCcw className="h-4 w-4" />
                                  Reset Filters
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        transactions.map((transaction: StockMovementTransactionRow) => {
                          const typeConfig = transactionTypeConfig[transaction.type as keyof typeof transactionTypeConfig]
                          const isInbound = inboundTypes.includes(transaction.type)
                          const isOutbound = outboundTypes.includes(transaction.type)
                          const reservedQuantity = transaction.reservedQuantity ?? 0
                          const quantityClass = isInbound
                            ? "text-[var(--dash-success)]"
                            : isOutbound
                              ? "text-[var(--dash-danger)]"
                              : "text-[var(--dash-text-muted)]"
                          const quantityPrefix = isInbound ? "+" : isOutbound ? "-" : ""

                          return (
                            <TableRow key={transaction.id}>
                              <TableCell>
                                <div className="min-w-[8.5rem]">
                                  <p className="font-medium text-[var(--dash-text)]">{format(new Date(transaction.createdAt), "MMM dd, yyyy")}</p>
                                  <p className="text-xs text-[var(--dash-text-faint)]">
                                    {format(new Date(transaction.createdAt), "HH:mm:ss")}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="min-w-[13rem]">
                                  <p className="font-medium text-[var(--dash-text)]">{transaction.item.name}</p>
                                  <p className="text-xs text-[var(--dash-text-faint)]">{transaction.item.sku}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="inline-flex min-w-[8rem] text-sm text-[var(--dash-text-muted)]">
                                  {transaction.location?.name || "No Location"}
                                </span>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "inline-flex min-w-max gap-1.5 rounded-lg px-2 py-1 font-medium",
                                    typeConfig?.className || "border-[var(--dash-border-subtle)] bg-[rgba(126,145,137,0.14)] text-[var(--dash-text-soft)]",
                                  )}
                                >
                                  {typeConfig?.icon}
                                  {typeConfig?.label || transaction.type}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <span className={cn("font-semibold", quantityClass)}>
                                  {quantityPrefix}
                                  {Math.abs(transaction.quantity).toLocaleString()}
                                </span>
                              </TableCell>
                              <TableCell className="text-center">
                                <span className={cn("font-medium", reservedQuantity > 0 ? "text-[var(--dash-gold)]" : "text-[var(--dash-text-faint)]")}>
                                  {reservedQuantity > 0 ? reservedQuantity.toLocaleString() : "-"}
                                </span>
                              </TableCell>
                              <TableCell className="text-right text-[var(--dash-text-muted)]">{formatCurrency(transaction.unitPrice)}</TableCell>
                              <TableCell className="text-right">
                                <span className={cn("font-semibold", quantityClass)}>
                                  {quantityPrefix}
                                  {formatCurrency(Math.abs(transaction.totalValue))}
                                </span>
                              </TableCell>
                              <TableCell>
                                <div className="min-w-[11rem]">
                                  <p className="text-sm font-medium text-[var(--dash-text)]">{transaction.reference || transaction.referenceNumber || "N/A"}</p>
                                  {transaction.notes && (
                                    <p className="line-clamp-2 text-xs text-[var(--dash-text-faint)]">{transaction.notes}</p>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-5">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <Card className="dashboard-stat-card relative min-h-[160px] overflow-hidden" style={{ "--stat-accent": "var(--dash-info)", "--stat-soft": "var(--dash-info-soft)" } as CSSProperties}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm uppercase text-[var(--dash-text-faint)]">
                      <BarChart3 className="h-4 w-4 text-[var(--dash-info)]" />
                      Movement Mix
                    </CardTitle>
                    <CardDescription className="text-[var(--dash-text-soft)]">Transfers and adjustments in the current filter.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <MovementMetric label="Transfers" value={summary?.totalTransfers ?? 0} accent="var(--dash-info)" />
                    <MovementMetric label="Adjustments" value={summary?.totalAdjustments ?? 0} accent="var(--dash-warning)" />
                    <MovementMetric label="Reservations" value={summary?.totalReservations ?? 0} accent="var(--dash-gold)" />
                  </CardContent>
                </Card>

                <Card className="dashboard-stat-card relative min-h-[160px] overflow-hidden" style={{ "--stat-accent": "var(--dash-spruce)", "--stat-soft": "var(--dash-spruce-soft)" } as CSSProperties}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm uppercase text-[var(--dash-text-faint)]">
                      <Activity className="h-4 w-4 text-[var(--dash-spruce)]" />
                      Ledger Balance
                    </CardTitle>
                    <CardDescription className="text-[var(--dash-text-soft)]">Inbound against outbound quantity.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-end justify-between gap-4">
                      <div>
                        <p className="text-3xl font-semibold text-[var(--dash-text)]">{netMovement.toLocaleString()}</p>
                        <p className="mt-1 text-xs text-[var(--dash-text-soft)]">Net units</p>
                      </div>
                      <div className="text-right text-sm text-[var(--dash-text-soft)]">
                        <p><span className="text-[var(--dash-success)]">+</span>{(summary?.totalInbound ?? 0).toLocaleString()} in</p>
                        <p><span className="text-[var(--dash-danger)]">-</span>{(summary?.totalOutbound ?? 0).toLocaleString()} out</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="dashboard-stat-card relative min-h-[160px] overflow-hidden" style={{ "--stat-accent": "var(--dash-gold)", "--stat-soft": "var(--dash-gold-soft)" } as CSSProperties}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm uppercase text-[var(--dash-text-faint)]">
                      <FileClock className="h-4 w-4 text-[var(--dash-gold)]" />
                      Audit Scope
                    </CardTitle>
                    <CardDescription className="text-[var(--dash-text-soft)]">Visible entries and valuation impact.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-end justify-between gap-4">
                      <div>
                        <p className="text-3xl font-semibold text-[var(--dash-text)]">{transactionCount.toLocaleString()}</p>
                        <p className="mt-1 text-xs text-[var(--dash-text-soft)]">Visible rows</p>
                      </div>
                      <p className={cn("text-right text-lg font-semibold", valueChange >= 0 ? "text-[var(--dash-success)]" : "text-[var(--dash-danger)]")}>
                        {formatCurrency(valueChange)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  )
}

const StockMovementLoadingSkeleton = () => (
  <div className="dashboard-landing-theme dark min-h-screen overflow-x-hidden">
    <div className="dashboard-landing-content mx-auto w-full max-w-[88rem] min-w-0 px-4 py-6 sm:px-6 sm:py-8">
      <div className="space-y-6">
        <div className="space-y-3">
          <Skeleton className="h-8 w-44 bg-white/10" />
          <Skeleton className="h-12 w-full max-w-2xl bg-white/10" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full rounded-lg bg-white/10" />
          ))}
        </div>
        <Skeleton className="h-[32rem] w-full rounded-lg bg-white/10" />
      </div>
    </div>
  </div>
)

function MovementMetric({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(24,38,45,0.52)] px-3 py-2">
      <span className="text-sm text-[var(--dash-text-soft)]">{label}</span>
      <span className="text-sm font-semibold" style={{ color: accent }}>
        {value.toLocaleString()}
      </span>
    </div>
  )
}
