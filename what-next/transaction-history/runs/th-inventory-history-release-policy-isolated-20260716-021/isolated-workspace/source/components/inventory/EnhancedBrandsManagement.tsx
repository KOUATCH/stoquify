"use client"

import { type CSSProperties, useMemo, useState } from "react"
import { Activity, Archive, CheckCircle2, Download, Languages, Package, RefreshCw, Sparkles, Tags } from "lucide-react"

import { createEnhancedBrandsColumns } from "@/_legacy-dashboard/dashboard/inventory/brands/enhanced-columns"
import DataTable from "@/components/DataTableComponents/DataTable"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useDeleteBrand, useOrgBrands } from "@/hooks/useBrands"
import type { BrandDTO } from "@/types/brand"

interface EnhancedBrandsManagementProps {
  data: BrandDTO[]
  organizationId: string
  basePath?: string
}

function downloadCsv(brands: BrandDTO[]) {
  const headers = ["Name EN", "Name FR", "Slug", "Status", "Items", "Created", "Updated"]
  const rows = brands.map((brand) => [
    brand.nameEn,
    brand.nameFr ?? "",
    brand.slug,
    brand.isActive ? "Active" : "Inactive",
    String(brand.itemCount ?? 0),
    new Date(brand.createdAt).toISOString(),
    new Date(brand.updatedAt).toISOString(),
  ])

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
    .join("\n")

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = "brands.csv"
  link.click()
  URL.revokeObjectURL(url)
}

export default function EnhancedBrandsManagement({
  data,
  organizationId,
  basePath = "/dashboard/inventory/brands",
}: EnhancedBrandsManagementProps) {
  const [statusFilter, setStatusFilter] = useState("all")
  const [usageFilter, setUsageFilter] = useState("all")
  const [brandToArchive, setBrandToArchive] = useState<BrandDTO | null>(null)

  const brandsQuery = useOrgBrands(organizationId, { initialData: data })
  const archiveBrand = useDeleteBrand()
  const brands = brandsQuery.data ?? data

  const stats = useMemo(() => {
    const active = brands.filter((brand) => brand.isActive).length
    const inactive = brands.length - active
    const assignedItems = brands.reduce((total, brand) => total + (brand.itemCount ?? 0), 0)
    const unassigned = brands.filter((brand) => (brand.itemCount ?? 0) === 0).length
    const bilingual = brands.filter((brand) => Boolean(brand.nameFr)).length

    return {
      total: brands.length,
      active,
      inactive,
      assignedItems,
      unassigned,
      bilingual,
    }
  }, [brands])

  const filteredData = useMemo(() => {
    return brands.filter((brand) => {
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && brand.isActive) ||
        (statusFilter === "inactive" && !brand.isActive)

      const matchesUsage =
        usageFilter === "all" ||
        (usageFilter === "assigned" && (brand.itemCount ?? 0) > 0) ||
        (usageFilter === "unassigned" && (brand.itemCount ?? 0) === 0)

      return matchesStatus && matchesUsage
    })
  }, [brands, statusFilter, usageFilter])

  const statsCards = useMemo(
    () => [
      {
        label: "Total Brands",
        value: stats.total.toLocaleString(),
        Icon: Tags,
        accent: "var(--dash-brand)",
        soft: "var(--dash-brand-soft)",
        sub: "Brand catalog",
      },
      {
        label: "Active",
        value: stats.active.toLocaleString(),
        Icon: CheckCircle2,
        accent: "var(--dash-success)",
        soft: "var(--dash-success-soft)",
        sub: `${stats.inactive.toLocaleString()} inactive`,
      },
      {
        label: "Assigned Items",
        value: stats.assignedItems.toLocaleString(),
        Icon: Package,
        accent: "var(--dash-info)",
        soft: "var(--dash-info-soft)",
        sub: "Linked products",
      },
      {
        label: "Unassigned",
        value: stats.unassigned.toLocaleString(),
        Icon: Archive,
        accent: "var(--dash-gold)",
        soft: "var(--dash-gold-soft)",
        sub: "No linked items",
      },
      {
        label: "Bilingual",
        value: stats.bilingual.toLocaleString(),
        Icon: Languages,
        accent: "var(--dash-spruce)",
        soft: "var(--dash-spruce-soft)",
        sub: "French names",
      },
      {
        label: "Filtered View",
        value: filteredData.length.toLocaleString(),
        Icon: Activity,
        accent: "var(--dash-warm)",
        soft: "var(--dash-warm-soft)",
        sub: "Visible records",
      },
    ],
    [filteredData.length, stats],
  )

  const columns = useMemo(
    () =>
      createEnhancedBrandsColumns({
        onArchive: setBrandToArchive,
        basePath,
      }),
    [basePath],
  )

  async function confirmArchive() {
    if (!brandToArchive) return

    await archiveBrand.mutateAsync(brandToArchive.id)
    setBrandToArchive(null)
  }

  return (
    <div className="space-y-6">
      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
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
        <CardHeader className="border-b border-[var(--dash-border-subtle)] bg-[rgba(12,20,24,0.58)] px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--dash-spruce-soft)] text-[var(--dash-spruce)]">
                <Tags className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-lg font-semibold text-[var(--dash-text)]">Brand Management</CardTitle>
                <p className="mt-1 break-words text-sm text-[var(--dash-text-soft)]">
                  Showing {filteredData.length} of {brands.length} brands
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="dashboard-filter-chip h-9 w-fit rounded-lg">
                <Sparkles className="me-1 h-3 w-3 text-[var(--dash-spruce)]" />
                Live Data
              </Badge>
              <Button variant="outline" size="sm" onClick={() => brandsQuery.refetch()} disabled={brandsQuery.isFetching} className="dashboard-button-secondary h-9 rounded-lg">
                <RefreshCw className={`mr-2 h-4 w-4 ${brandsQuery.isFetching ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={() => downloadCsv(filteredData)} className="dashboard-button-secondary h-9 rounded-lg">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-3 sm:p-5">
          {(usageFilter !== "all" || statusFilter !== "all") && (
            <div className="flex flex-wrap items-center gap-2">
              {usageFilter !== "all" ? <Badge variant="outline" className="dashboard-filter-chip rounded-lg">{usageFilter}</Badge> : null}
              {statusFilter !== "all" ? <Badge variant="outline" className="dashboard-filter-chip rounded-lg">{statusFilter}</Badge> : null}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 rounded-lg text-[var(--dash-text-soft)] hover:bg-[var(--dash-brand-soft)] hover:text-[var(--dash-brand-strong)]"
                onClick={() => {
                  setUsageFilter("all")
                  setStatusFilter("all")
                }}
              >
                Clear
              </Button>
            </div>
          )}

          <DataTable
            columns={columns}
            data={filteredData}
            searchPlaceholder="Search brands"
            showToolbar={false}
            variant="landing"
            filters={{
              additionalFilters: (
                <>
                  <Select value={usageFilter} onValueChange={setUsageFilter}>
                    <SelectTrigger className="dashboard-control h-9 w-full rounded-lg sm:w-[160px]">
                      <SelectValue placeholder="Usage" />
                    </SelectTrigger>
                    <SelectContent className="border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] text-[var(--dash-text)]">
                      <SelectItem value="all">All Usage</SelectItem>
                      <SelectItem value="assigned">With Items</SelectItem>
                      <SelectItem value="unassigned">No Items</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="dashboard-control h-9 w-full rounded-lg sm:w-[160px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent className="border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] text-[var(--dash-text)]">
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </>
              ),
            }}
          />
        </CardContent>
      </Card>

      <AlertDialog open={Boolean(brandToArchive)} onOpenChange={(open) => !open && setBrandToArchive(null)}>
        <AlertDialogContent className="dashboard-glass-panel border-[var(--dash-border-subtle)] text-[var(--dash-text)]">
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Brand</AlertDialogTitle>
            <AlertDialogDescription className="text-[var(--dash-text-soft)]">
              {brandToArchive
                ? `${brandToArchive.nameEn} will be hidden from active brand lists. Existing item history will be preserved.`
                : "This brand will be archived."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={archiveBrand.isPending} className="dashboard-button-secondary rounded-lg">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmArchive} disabled={archiveBrand.isPending} className="rounded-lg bg-[var(--dash-danger)] text-white hover:bg-[var(--dash-danger)]/90">
              {archiveBrand.isPending ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Archive className="mr-2 h-4 w-4" />}
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
