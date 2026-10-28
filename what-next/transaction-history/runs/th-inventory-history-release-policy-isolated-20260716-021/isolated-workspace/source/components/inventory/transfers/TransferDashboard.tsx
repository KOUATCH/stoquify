"use client"

import type { CSSProperties } from "react"
import { useMemo, useState } from "react"
import { format } from "date-fns"
import type { LucideIcon } from "lucide-react"
import {
  ArrowRight,
  Calendar,
  CheckCircle,
  Clock,
  MapPin,
  Package,
  Plus,
  Search,
  Truck,
  User,
  XCircle,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useOrgLocationsNew } from "@/hooks/useAllLocationsQueries"
import { useClientAuth } from "@/hooks/useClientAuth"
import { useTransfers } from "@/hooks/useTransferQueries"
import type { TransferPriority, TransferStatus } from "@/types/inventoryMovementTypes"

import { CreateTransferModal } from "./CreateTransferModal"
import { TransferDetailsModal } from "./TransferDetailsModal"

type StatusConfig = {
  Icon: LucideIcon
  className: string
  label: string
  description: string
  accent: string
  soft: string
}

const transferStatusConfig: Record<TransferStatus, StatusConfig> = {
  DRAFT: {
    Icon: Clock,
    className: "border-[var(--dash-border-subtle)] bg-[rgba(126,145,137,0.14)] text-[var(--dash-text-soft)]",
    label: "Draft",
    description: "Being prepared",
    accent: "var(--dash-text-faint)",
    soft: "rgba(126,145,137,0.14)",
  },
  SUBMITTED: {
    Icon: Clock,
    className: "border-[var(--dash-info)] bg-[var(--dash-info-soft)] text-[var(--dash-info)]",
    label: "Submitted",
    description: "Awaiting approval",
    accent: "var(--dash-info)",
    soft: "var(--dash-info-soft)",
  },
  APPROVED: {
    Icon: CheckCircle,
    className: "border-[var(--dash-success)] bg-[var(--dash-success-soft)] text-[var(--dash-success)]",
    label: "Approved",
    description: "Ready to ship",
    accent: "var(--dash-success)",
    soft: "var(--dash-success-soft)",
  },
  IN_TRANSIT: {
    Icon: Truck,
    className: "border-[var(--dash-warning)] bg-[var(--dash-warning-soft)] text-[var(--dash-warning)]",
    label: "In Transit",
    description: "Being transferred",
    accent: "var(--dash-warning)",
    soft: "var(--dash-warning-soft)",
  },
  PARTIALLY_RECEIVED: {
    Icon: Package,
    className: "border-[var(--dash-gold)] bg-[var(--dash-gold-soft)] text-[var(--dash-gold)]",
    label: "Partial",
    description: "Partially received",
    accent: "var(--dash-gold)",
    soft: "var(--dash-gold-soft)",
  },
  COMPLETED: {
    Icon: CheckCircle,
    className: "border-[var(--dash-spruce)] bg-[var(--dash-spruce-soft)] text-[var(--dash-spruce)]",
    label: "Completed",
    description: "Transfer complete",
    accent: "var(--dash-spruce)",
    soft: "var(--dash-spruce-soft)",
  },
  CANCELLED: {
    Icon: XCircle,
    className: "border-[var(--dash-danger)] bg-[var(--dash-danger-soft)] text-[var(--dash-danger)]",
    label: "Cancelled",
    description: "Transfer cancelled",
    accent: "var(--dash-danger)",
    soft: "var(--dash-danger-soft)",
  },
  REJECTED: {
    Icon: XCircle,
    className: "border-[var(--dash-danger)] bg-[var(--dash-danger-soft)] text-[var(--dash-danger)]",
    label: "Rejected",
    description: "Transfer rejected",
    accent: "var(--dash-danger)",
    soft: "var(--dash-danger-soft)",
  },
}

const priorityConfig: Record<TransferPriority, { className: string; label: string }> = {
  LOW: {
    className: "border-[var(--dash-border-subtle)] bg-[rgba(126,145,137,0.14)] text-[var(--dash-text-soft)]",
    label: "Low",
  },
  NORMAL: {
    className: "border-[var(--dash-info)] bg-[var(--dash-info-soft)] text-[var(--dash-info)]",
    label: "Normal",
  },
  HIGH: {
    className: "border-[var(--dash-warning)] bg-[var(--dash-warning-soft)] text-[var(--dash-warning)]",
    label: "High",
  },
  URGENT: {
    className: "border-[var(--dash-danger)] bg-[var(--dash-danger-soft)] text-[var(--dash-danger)]",
    label: "Urgent",
  },
}

export function TransferDashboard() {
  const auth = useClientAuth()
  const orgId = auth.organizationId ?? ""

  const [selectedStatus, setSelectedStatus] = useState<TransferStatus | "all">("all")
  const [selectedFromLocation, setSelectedFromLocation] = useState("all")
  const [selectedToLocation, setSelectedToLocation] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedTransfer, setSelectedTransfer] = useState<string | null>(null)

  const { data: transfersResponse, isLoading: transfersLoading } = useTransfers(orgId, {
    search: searchQuery || undefined,
    status: selectedStatus === "all" ? undefined : selectedStatus,
    fromLocationId: selectedFromLocation === "all" ? undefined : selectedFromLocation,
    toLocationId: selectedToLocation === "all" ? undefined : selectedToLocation,
    page: 1,
    limit: 50,
  })

  const { data: locationsResponse } = useOrgLocationsNew(orgId, { enabled: !!orgId })

  const transfers = useMemo(() => transfersResponse ?? [], [transfersResponse])
  const locations = useMemo(() => locationsResponse?.data ?? [], [locationsResponse?.data])
  const isLoading = auth.isLoading || transfersLoading
  const hasFilters =
    searchQuery.trim() !== "" ||
    selectedStatus !== "all" ||
    selectedFromLocation !== "all" ||
    selectedToLocation !== "all"

  const summaryStats = useMemo(() => {
    return {
      total: transfers.length,
      draft: transfers.filter((transfer) => transfer.status === "DRAFT").length,
      inTransit: transfers.filter((transfer) => transfer.status === "IN_TRANSIT").length,
      completed: transfers.filter((transfer) => transfer.status === "COMPLETED").length,
    }
  }, [transfers])

  const statusBreakdown = useMemo(
    () =>
      Object.entries(transferStatusConfig)
        .map(([status, config]) => ({
          status: status as TransferStatus,
          ...config,
          count: transfers.filter((transfer) => transfer.status === status).length,
        }))
        .filter((entry) => entry.count > 0),
    [transfers],
  )

  function clearFilters() {
    setSearchQuery("")
    setSelectedStatus("all")
    setSelectedFromLocation("all")
    setSelectedToLocation("all")
  }

  if (isLoading) {
    return <TransferDashboardSkeleton />
  }

  if (!orgId) {
    return <TransferDashboardEmptyState />
  }

  const statsCards = [
    {
      label: "Total Transfers",
      value: summaryStats.total,
      detail: "Current result set",
      Icon: Package,
      accent: "var(--dash-brand)",
      soft: "var(--dash-brand-soft)",
    },
    {
      label: "Draft",
      value: summaryStats.draft,
      detail: "Awaiting submission",
      Icon: Clock,
      accent: "var(--dash-text-faint)",
      soft: "rgba(126,145,137,0.14)",
    },
    {
      label: "In Transit",
      value: summaryStats.inTransit,
      detail: "Being transferred",
      Icon: Truck,
      accent: "var(--dash-warning)",
      soft: "var(--dash-warning-soft)",
    },
    {
      label: "Completed",
      value: summaryStats.completed,
      detail: "Closed successfully",
      Icon: CheckCircle,
      accent: "var(--dash-spruce)",
      soft: "var(--dash-spruce-soft)",
    },
  ]

  return (
    <div className="dashboard-landing-theme dark min-h-screen overflow-x-hidden">
      <div className="dashboard-landing-content mx-auto flex w-full max-w-[88rem] min-w-0 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
        <section className="flex min-w-0 flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0 max-w-3xl">
            <div className="dashboard-eyebrow mb-4">
              <span className="dashboard-live-dot" />
              Transfer hub
            </div>
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-info-soft)] shadow-[0_16px_34px_rgba(73,198,229,0.16)]">
                <Truck className="h-6 w-6 text-[var(--dash-info)]" />
              </div>
              <div className="min-w-0">
                <h1 className="text-3xl font-semibold tracking-tight text-[var(--dash-text)] sm:text-4xl">
                  Location Transfers
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--dash-text-soft)] sm:text-base">
                  Create and monitor inventory transfers between warehouses, stores, and operational locations.
                </p>
              </div>
            </div>
          </div>
          <Button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="dashboard-button-create h-10 w-full rounded-lg px-4 sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            Create Transfer
          </Button>
        </section>

        <section className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {statsCards.map(({ label, value, detail, Icon, accent, soft }) => (
            <Card
              key={label}
              className="dashboard-stat-card group relative min-h-[140px] min-w-0 overflow-hidden"
              style={{ "--stat-accent": accent, "--stat-soft": soft } as CSSProperties}
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
              <CardContent className="relative z-10">
                <div className="text-3xl font-semibold text-[var(--dash-text)]">{value}</div>
                <p className="mt-1 text-xs leading-5 text-[var(--dash-text-soft)]">{detail}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <Tabs defaultValue="transfers" className="min-w-0 space-y-5">
          <TabsList className="dashboard-control grid h-auto w-full grid-cols-2 rounded-lg p-1 sm:w-fit sm:min-w-[24rem]">
            <TabsTrigger
              value="transfers"
              className="rounded-md text-[var(--dash-text-soft)] data-[state=active]:bg-[var(--dash-brand-soft)] data-[state=active]:text-[var(--dash-text)]"
            >
              Transfer History
            </TabsTrigger>
            <TabsTrigger
              value="analytics"
              className="rounded-md text-[var(--dash-text-soft)] data-[state=active]:bg-[var(--dash-brand-soft)] data-[state=active]:text-[var(--dash-text)]"
            >
              Transfer Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="transfers" className="space-y-5">
            <Card className="dashboard-glass-panel min-w-0 overflow-hidden rounded-lg text-[var(--dash-text)]">
              <CardHeader className="border-b border-[var(--dash-border-subtle)] bg-[rgba(12,20,24,0.58)] px-5 py-4 sm:px-6">
                <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <CardTitle className="flex items-center gap-2 text-lg font-semibold text-[var(--dash-text)]">
                      <Package className="h-5 w-5 text-[var(--dash-info)]" />
                      Location Transfers
                    </CardTitle>
                    <CardDescription className="mt-1 text-[var(--dash-text-soft)]">
                      Showing {transfers.length} transfer{transfers.length === 1 ? "" : "s"} in the current filter.
                    </CardDescription>
                  </div>
                  {hasFilters ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={clearFilters}
                      className="dashboard-button-secondary h-9 rounded-lg"
                    >
                      Clear Filters
                    </Button>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="space-y-5 p-5 sm:p-6">
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_repeat(3,minmax(0,0.8fr))]">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--dash-text-faint)]" />
                    <Input
                      placeholder="Search transfers..."
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      className="dashboard-control h-11 rounded-lg pl-10"
                    />
                  </div>

                  <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as TransferStatus | "all")}>
                    <SelectTrigger className="dashboard-control h-11 rounded-lg">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent className="border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] text-[var(--dash-text)]">
                      <SelectItem value="all">All Statuses</SelectItem>
                      {Object.entries(transferStatusConfig).map(([key, config]) => {
                        const Icon = config.Icon
                        return (
                          <SelectItem key={key} value={key}>
                            <span className="flex items-center gap-2">
                              <Icon className="h-3.5 w-3.5" />
                              {config.label}
                            </span>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>

                  <Select value={selectedFromLocation} onValueChange={setSelectedFromLocation}>
                    <SelectTrigger className="dashboard-control h-11 rounded-lg">
                      <SelectValue placeholder="From Location" />
                    </SelectTrigger>
                    <SelectContent className="border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] text-[var(--dash-text)]">
                      <SelectItem value="all">All Sources</SelectItem>
                      {locations.map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={selectedToLocation} onValueChange={setSelectedToLocation}>
                    <SelectTrigger className="dashboard-control h-11 rounded-lg">
                      <SelectValue placeholder="To Location" />
                    </SelectTrigger>
                    <SelectContent className="border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] text-[var(--dash-text)]">
                      <SelectItem value="all">All Destinations</SelectItem>
                      {locations.map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="dashboard-table-shell min-w-0 overflow-x-auto rounded-lg">
                  <Table className="dashboard-data-table min-w-[980px]">
                    <TableHeader>
                      <TableRow className="border-[var(--dash-border-subtle)] hover:bg-transparent">
                        <TableHead>Transfer #</TableHead>
                        <TableHead>Route</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Created By</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transfers.length === 0 ? (
                        <TableRow className="border-[var(--dash-border-subtle)]">
                          <TableCell colSpan={8} className="h-56 text-center">
                            <div className="mx-auto flex max-w-md flex-col items-center gap-3 text-[var(--dash-text-soft)]">
                              <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-brand-soft)] text-[var(--dash-brand-strong)]">
                                <Package className="h-7 w-7" />
                              </div>
                              <div>
                                <p className="text-lg font-semibold text-[var(--dash-text)]">No transfers found</p>
                                <p className="mt-1 text-sm">
                                  {hasFilters ? "Try adjusting your filters." : "Create your first location transfer."}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        transfers.map((transfer) => {
                          const statusConfig = transferStatusConfig[transfer.status]
                          const priorityConfigItem = priorityConfig[transfer.priority]
                          const StatusIcon = statusConfig.Icon

                          return (
                            <TableRow
                              key={transfer.id}
                              className="cursor-pointer border-[var(--dash-border-subtle)] transition-colors hover:bg-[var(--dash-brand-soft)]"
                              onClick={() => setSelectedTransfer(transfer.id)}
                            >
                              <TableCell>
                                <div className="font-semibold text-[var(--dash-text)]">{transfer.transferNumber}</div>
                              </TableCell>
                              <TableCell>
                                <div className="flex min-w-[260px] items-center gap-2 text-sm text-[var(--dash-text-muted)]">
                                  <span className="flex items-center gap-1 truncate">
                                    <MapPin className="h-3.5 w-3.5 text-[var(--dash-info)]" />
                                    {transfer.fromLocation.name}
                                  </span>
                                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[var(--dash-text-faint)]" />
                                  <span className="flex items-center gap-1 truncate">
                                    <MapPin className="h-3.5 w-3.5 text-[var(--dash-spruce)]" />
                                    {transfer.toLocation.name}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className={`gap-1.5 rounded-lg ${statusConfig.className}`}>
                                  <StatusIcon className="h-3 w-3" />
                                  {statusConfig.label}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className={`rounded-lg ${priorityConfigItem.className}`}>
                                  {priorityConfigItem.label}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1.5 text-sm text-[var(--dash-text-muted)]">
                                  <Package className="h-3.5 w-3.5 text-[var(--dash-gold)]" />
                                  {transfer.lines.length} items
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1.5 text-sm text-[var(--dash-text-muted)]">
                                  <User className="h-3.5 w-3.5 text-[var(--dash-text-faint)]" />
                                  {transfer.createdBy?.name || "Unknown"}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1.5 text-sm text-[var(--dash-text-muted)]">
                                  <Calendar className="h-3.5 w-3.5 text-[var(--dash-text-faint)]" />
                                  {format(new Date(transfer.createdAt), "MMM dd, yyyy")}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    setSelectedTransfer(transfer.id)
                                  }}
                                  className="h-8 rounded-lg text-[var(--dash-text-soft)] hover:bg-[var(--dash-brand-soft)] hover:text-[var(--dash-brand-strong)]"
                                >
                                  View
                                </Button>
                              </TableCell>
                            </TableRow>
                          )
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-5">
            <div className="grid gap-5 lg:grid-cols-2">
              <Card className="dashboard-glass-panel rounded-lg text-[var(--dash-text)]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg text-[var(--dash-text)]">
                    <Package className="h-5 w-5 text-[var(--dash-brand-strong)]" />
                    Status Mix
                  </CardTitle>
                  <CardDescription className="text-[var(--dash-text-soft)]">
                    Transfer volume by current workflow state.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {statusBreakdown.length === 0 ? (
                    <p className="text-sm text-[var(--dash-text-soft)]">No transfer activity in the current filter.</p>
                  ) : (
                    statusBreakdown.map((entry) => {
                      const pct = summaryStats.total ? Math.round((entry.count / summaryStats.total) * 100) : 0
                      const Icon = entry.Icon

                      return (
                        <div key={entry.status} className="rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(24,38,45,0.48)] p-3">
                          <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                            <span className="flex items-center gap-2 font-medium text-[var(--dash-text)]">
                              <Icon className="h-4 w-4" style={{ color: entry.accent }} />
                              {entry.label}
                            </span>
                            <span className="text-[var(--dash-text-soft)]">{entry.count} / {pct}%</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-[rgba(126,145,137,0.16)]">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: entry.accent }} />
                          </div>
                        </div>
                      )
                    })
                  )}
                </CardContent>
              </Card>

              <Card className="dashboard-glass-panel rounded-lg text-[var(--dash-text)]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg text-[var(--dash-text)]">
                    <Truck className="h-5 w-5 text-[var(--dash-warning)]" />
                    Route Snapshot
                  </CardTitle>
                  <CardDescription className="text-[var(--dash-text-soft)]">
                    Quick operational signals for transfer planning.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  <MetricTile label="Locations" value={locations.length} tone="info" />
                  <MetricTile label="Open Transfers" value={summaryStats.total - summaryStats.completed} tone="warning" />
                  <MetricTile label="Completed" value={summaryStats.completed} tone="success" />
                  <MetricTile label="Filtered Rows" value={transfers.length} tone="brand" />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        <CreateTransferModal open={showCreateModal} onOpenChange={setShowCreateModal} organizationId={orgId} />

        {selectedTransfer ? (
          <TransferDetailsModal
            transferId={selectedTransfer}
            open={Boolean(selectedTransfer)}
            onOpenChange={(open) => !open && setSelectedTransfer(null)}
            organizationId={orgId}
          />
        ) : null}
      </div>
    </div>
  )
}

function TransferDashboardSkeleton() {
  return (
    <div className="dashboard-landing-theme dark min-h-screen overflow-x-hidden">
      <div className="dashboard-landing-content mx-auto flex w-full max-w-[88rem] flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
        <div className="space-y-3">
          <Skeleton className="h-8 w-48 bg-[rgba(37,57,67,0.7)]" />
          <Skeleton className="h-12 w-full max-w-xl bg-[rgba(37,57,67,0.7)]" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-36 rounded-lg bg-[rgba(37,57,67,0.7)]" />
          ))}
        </div>
        <Skeleton className="h-[28rem] rounded-lg bg-[rgba(37,57,67,0.7)]" />
      </div>
    </div>
  )
}

function TransferDashboardEmptyState() {
  return (
    <div className="dashboard-landing-theme dark min-h-screen overflow-x-hidden">
      <div className="dashboard-landing-content mx-auto w-full max-w-[88rem] px-4 py-8 sm:px-6">
        <div className="dashboard-glass-panel mx-auto max-w-md rounded-lg px-6 py-14 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-danger-soft)]">
            <XCircle className="h-8 w-8 text-[var(--dash-danger)]" />
          </div>
          <h3 className="mb-3 text-xl font-semibold text-[var(--dash-text)]">Organization Required</h3>
          <p className="text-sm text-[var(--dash-text-soft)]">No organization found for the current user.</p>
        </div>
      </div>
    </div>
  )
}

function MetricTile({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: "brand" | "info" | "success" | "warning"
}) {
  const tones = {
    brand: { accent: "var(--dash-brand)", soft: "var(--dash-brand-soft)" },
    info: { accent: "var(--dash-info)", soft: "var(--dash-info-soft)" },
    success: { accent: "var(--dash-success)", soft: "var(--dash-success-soft)" },
    warning: { accent: "var(--dash-warning)", soft: "var(--dash-warning-soft)" },
  }
  const selectedTone = tones[tone]

  return (
    <div className="rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(24,38,45,0.48)] p-4">
      <div className="mb-3 h-1 w-12 rounded-full" style={{ background: selectedTone.accent }} />
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--dash-text-faint)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-[var(--dash-text)]">{value}</p>
    </div>
  )
}
