"use client"

import { type CSSProperties, useMemo, useState } from "react"
import { Activity, Archive, CheckCircle2, Download, FolderOpen, Languages, Layers, Package, RefreshCw, Sparkles } from "lucide-react"

import { createEnhancedCategoriesColumns } from "@/_legacy-dashboard/dashboard/inventory/categories/enhanced-columns"
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
import { useDeleteCategory, useOrgCategories } from "@/hooks/useCategories"
import type { CategoryDTO } from "@/types/category"

interface EnhancedCategoriesManagementProps {
  data: CategoryDTO[]
  organizationId: string
  basePath?: string
}

function downloadCsv(categories: CategoryDTO[]) {
  const headers = ["Title EN", "Title FR", "Slug", "Status", "Hierarchy", "Items", "Created", "Updated"]
  const rows = categories.map((category) => [
    category.titleEn,
    category.titleFr ?? "",
    category.slug,
    category.isActive ? "Active" : "Inactive",
    category.parentId ? "Child" : "Root",
    String(category.itemCount ?? 0),
    new Date(category.createdAt).toISOString(),
    new Date(category.updatedAt).toISOString(),
  ])

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n")

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = "categories.csv"
  link.click()
  URL.revokeObjectURL(url)
}

export default function EnhancedCategoriesManagement({
  data,
  organizationId,
  basePath = "/dashboard/inventory/categories",
}: EnhancedCategoriesManagementProps) {
  const [statusFilter, setStatusFilter] = useState("all")
  const [hierarchyFilter, setHierarchyFilter] = useState("all")
  const [categoryToArchive, setCategoryToArchive] = useState<CategoryDTO | null>(null)

  const categoriesQuery = useOrgCategories(organizationId, { initialData: data })
  const archiveCategory = useDeleteCategory()
  const categories = categoriesQuery.data ?? data

  const stats = useMemo(() => {
    const active = categories.filter((category) => category.isActive).length
    const inactive = categories.length - active
    const assignedItems = categories.reduce((total, category) => total + (category.itemCount ?? 0), 0)
    const bilingual = categories.filter((category) => Boolean(category.titleFr)).length
    const root = categories.filter((category) => !category.parentId).length

    return {
      total: categories.length,
      active,
      inactive,
      assignedItems,
      bilingual,
      root,
    }
  }, [categories])

  const filteredData = useMemo(() => {
    return categories.filter((category) => {
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && category.isActive) ||
        (statusFilter === "inactive" && !category.isActive)

      const matchesHierarchy =
        hierarchyFilter === "all" ||
        (hierarchyFilter === "root" && !category.parentId) ||
        (hierarchyFilter === "child" && Boolean(category.parentId))

      return matchesStatus && matchesHierarchy
    })
  }, [categories, hierarchyFilter, statusFilter])

  const statsCards = useMemo(
    () => [
      {
        label: "Total Categories",
        value: stats.total.toLocaleString(),
        Icon: FolderOpen,
        accent: "var(--dash-brand)",
        soft: "var(--dash-brand-soft)",
        sub: "Catalog groups",
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
        label: "Root Categories",
        value: stats.root.toLocaleString(),
        Icon: Layers,
        accent: "var(--dash-gold)",
        soft: "var(--dash-gold-soft)",
        sub: "Top-level groups",
      },
      {
        label: "Bilingual",
        value: stats.bilingual.toLocaleString(),
        Icon: Languages,
        accent: "var(--dash-spruce)",
        soft: "var(--dash-spruce-soft)",
        sub: "French titles",
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
      createEnhancedCategoriesColumns({
        onArchive: setCategoryToArchive,
        basePath,
      }),
    [basePath],
  )

  async function confirmArchive() {
    if (!categoryToArchive) return

    await archiveCategory.mutateAsync(categoryToArchive.id)
    setCategoryToArchive(null)
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
                <FolderOpen className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-lg font-semibold text-[var(--dash-text)]">Category Management</CardTitle>
                <p className="mt-1 break-words text-sm text-[var(--dash-text-soft)]">
                  Showing {filteredData.length} of {categories.length} categories
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="dashboard-filter-chip h-9 w-fit rounded-lg">
                <Sparkles className="me-1 h-3 w-3 text-[var(--dash-spruce)]" />
                Live Data
              </Badge>
              <Button variant="outline" size="sm" onClick={() => categoriesQuery.refetch()} disabled={categoriesQuery.isFetching} className="dashboard-button-secondary h-9 rounded-lg">
                <RefreshCw className={`mr-2 h-4 w-4 ${categoriesQuery.isFetching ? "animate-spin" : ""}`} />
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
          {(hierarchyFilter !== "all" || statusFilter !== "all") && (
            <div className="flex flex-wrap items-center gap-2">
              {hierarchyFilter !== "all" ? <Badge variant="outline" className="dashboard-filter-chip rounded-lg">{hierarchyFilter}</Badge> : null}
              {statusFilter !== "all" ? <Badge variant="outline" className="dashboard-filter-chip rounded-lg">{statusFilter}</Badge> : null}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 rounded-lg text-[var(--dash-text-soft)] hover:bg-[var(--dash-brand-soft)] hover:text-[var(--dash-brand-strong)]"
                onClick={() => {
                  setHierarchyFilter("all")
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
            searchPlaceholder="Search categories"
            showToolbar={false}
            variant="landing"
            filters={{
              additionalFilters: (
                <>
                  <Select value={hierarchyFilter} onValueChange={setHierarchyFilter}>
                    <SelectTrigger className="dashboard-control h-9 w-full rounded-lg sm:w-[160px]">
                      <SelectValue placeholder="Hierarchy" />
                    </SelectTrigger>
                    <SelectContent className="border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] text-[var(--dash-text)]">
                      <SelectItem value="all">All Levels</SelectItem>
                      <SelectItem value="root">Root</SelectItem>
                      <SelectItem value="child">Child</SelectItem>
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

      <AlertDialog open={Boolean(categoryToArchive)} onOpenChange={(open) => !open && setCategoryToArchive(null)}>
        <AlertDialogContent className="dashboard-glass-panel border-[var(--dash-border-subtle)] text-[var(--dash-text)]">
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Category</AlertDialogTitle>
            <AlertDialogDescription className="text-[var(--dash-text-soft)]">
              {categoryToArchive
                ? `${categoryToArchive.titleEn} will be hidden from active category lists. Existing item history will be preserved.`
                : "This category will be archived."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={archiveCategory.isPending} className="dashboard-button-secondary rounded-lg">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmArchive} disabled={archiveCategory.isPending} className="rounded-lg bg-[var(--dash-danger)] text-white hover:bg-[var(--dash-danger)]/90">
              {archiveCategory.isPending ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Archive className="mr-2 h-4 w-4" />}
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
