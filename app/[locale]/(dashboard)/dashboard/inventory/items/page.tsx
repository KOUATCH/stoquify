"use server"

import getOrgBrands from "@/actions/brands/getOrgBrands"
import getOrgCategories from "@/actions/categories/getOrgCategories"
import { getOrgItemsWithInventoryLevels } from "@/actions/itemsShow/getOrgItemsWithInventoryLevels"
import getOrgTaxRates from "@/actions/taxRate/getOrgTaxRates"
import getOrgUnits from "@/actions/units/getOrgUnits"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TableLoading } from "@/components/ui/data-table"
import ItemManagement from "@/components/ui/groups/inventory/ItemManagement"
import { getAuthenticatedUser } from "@/config/useAuth"
import { pickLocale } from "@/i18n/routing"
import type { Locale } from "@/types/bilingual"
import type { ItemWithInventoryLevelsPayload } from "@/types/itemTypes"
import {
  AlertTriangle,
  DollarSign,
  FileText,
  Package,
  Plus,
  ShoppingCart,
  Target,
  TrendingUp,
} from "lucide-react"
import { getLocale } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import { Suspense, type CSSProperties } from "react"

function toStringParam(input: unknown): string {
  return typeof input === "string" ? input : ""
}

function toNumberParam(
  input: unknown,
  fallback: number,
  { min, max }: { min?: number; max?: number } = {},
): number {
  const n = typeof input === "string" ? Number.parseInt(input, 10) : Number.NaN
  let value = Number.isFinite(n) ? n : fallback
  if (typeof min === "number") value = Math.max(min, value)
  if (typeof max === "number") value = Math.min(max, value)
  return value
}

function formatCurrency(amount: number, locale: Locale, currency = "USD"): string {
  return new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0)
}

type SearchParams = Record<string, string | string[] | undefined>
type StockStatusFilter =
  | "all"
  | "in-stock"
  | "low-stock"
  | "out-of-stock"
  | "overstock"
  | "reorder"
  | "available"
  | "reserved"

const stockFilterLabels: Record<StockStatusFilter, string> = {
  all: "Items",
  "in-stock": "In Stock Items",
  "low-stock": "Low Stock Items",
  "out-of-stock": "Out of Stock Items",
  overstock: "Overstock Items",
  reorder: "Reorder Candidates",
  available: "Available Stock Items",
  reserved: "Reserved Stock Items",
}

function normalizeStockFilter(input: unknown): StockStatusFilter {
  const value = toStringParam(input).toLowerCase()

  if (value === "in-stock") return "in-stock"
  if (value === "low-stock") return "low-stock"
  if (value === "out-of-stock" || value === "no-stock") return "out-of-stock"
  if (value === "overstock" || value === "high-stock") return "overstock"
  if (value === "reorder" || value === "reorder-candidates") return "reorder"
  if (value === "available") return "available"
  if (value === "reserved") return "reserved"

  return "all"
}

function getItemStockSnapshot(item: ItemWithInventoryLevelsPayload) {
  const stock = item.inventoryLevels.reduce((total, level) => total + (Number(level.quantityOnHand) || 0), 0)
  const available = item.inventoryLevels.reduce((total, level) => total + (Number(level.quantityAvailable) || 0), 0)
  const reserved = item.inventoryLevels.reduce((total, level) => total + (Number(level.quantityReserved) || 0), 0)
  const reorderPoint = item.inventoryLevels.reduce(
    (highest, level) => Math.max(highest, Number(level.reorderPoint) || 0),
    0,
  )
  const threshold = Math.max(Number(item.minStockLevel) || 0, Number(item.reorderLevel) || 0, reorderPoint)
  const maxStock = Number(item.maxStockLevel) || 0

  return { stock, available, reserved, threshold, maxStock }
}

function matchesStockFilter(item: ItemWithInventoryLevelsPayload, filter: StockStatusFilter) {
  if (filter === "all") return true

  const { stock, available, reserved, threshold, maxStock } = getItemStockSnapshot(item)

  if (filter === "in-stock") return stock > 0 && stock > threshold && !(maxStock > 0 && stock >= maxStock)
  if (filter === "low-stock") return stock > 0 && stock <= threshold
  if (filter === "out-of-stock") return stock <= 0
  if (filter === "overstock") return maxStock > 0 && stock >= maxStock
  if (filter === "reorder") return stock <= threshold
  if (filter === "available") return available > 0
  if (filter === "reserved") return reserved > 0

  return true
}

export default async function ItemsPage(props: {
  searchParams?: Promise<SearchParams>
}) {
  const resolvedSearchParams: SearchParams = props.searchParams ? await props.searchParams : {}

  const q = toStringParam(resolvedSearchParams.q)
  const stockFilter = normalizeStockFilter(resolvedSearchParams.stock)
  const page = toNumberParam(resolvedSearchParams.page, 1, { min: 1 })
  const pageSize = toNumberParam(resolvedSearchParams.pageSize, 50, { min: 1, max: 100 })

  const user = await getAuthenticatedUser()
  const userOrg = user?.organizationId
  const locale: Locale = pickLocale(await getLocale())

  if (!userOrg) {
    return (
      <div className="dashboard-landing-theme dark min-h-screen overflow-x-hidden">
      <div className="dashboard-landing-content mx-auto w-full max-w-[88rem] min-w-0 px-4 py-8 sm:px-6">
          <div className="dashboard-glass-panel mx-auto max-w-md rounded-lg px-6 py-14 text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-danger-soft)]">
              <AlertTriangle className="h-8 w-8 text-[var(--dash-danger)]" />
            </div>
            <h3 className="mb-3 text-xl font-semibold text-[var(--dash-text)]">Organization Required</h3>
            <p className="text-sm text-[var(--dash-text-soft)]">No organization found for the current user.</p>
          </div>
        </div>
      </div>
    )
  }

  const [itemsRes, brandsRes, unitsRes, taxRatesRes, catsRes] = await Promise.all([
    getOrgItemsWithInventoryLevels(userOrg).catch(() => null),
    getOrgBrands(userOrg).catch(() => null),
    getOrgUnits(userOrg).catch(() => null),
    getOrgTaxRates(userOrg).catch(() => null),
    getOrgCategories(userOrg).catch(() => null),
  ])

  const allItemData: ItemWithInventoryLevelsPayload[] =
    itemsRes?.success && Array.isArray(itemsRes.data) ? itemsRes.data : []

  const searchedItemData = q
    ? allItemData.filter((item) => {
        const searchValue = q.toLowerCase()
        return [
          item.name,
          item.sku,
          item.category?.title,
          item.brand?.brandName,
        ].some((value) => value?.toLowerCase().includes(searchValue))
      })
    : allItemData

  const filteredItemData =
    stockFilter === "all"
      ? searchedItemData
      : searchedItemData.filter((item) => matchesStockFilter(item, stockFilter))

  const totalItems = filteredItemData.length
  const initialItemData = filteredItemData.slice((page - 1) * pageSize, page * pageSize)
  const initialCategoryData = catsRes?.success && Array.isArray(catsRes.data) ? catsRes.data : []
  const initialBrandData = brandsRes?.success && Array.isArray(brandsRes.data) ? brandsRes.data : []
  const initialUnitData = unitsRes?.success ? unitsRes.data ?? [] : []
  const initialTaxRateData = taxRatesRes?.success ? taxRatesRes.data ?? [] : []

  const totalValue = initialItemData.reduce((sum, item) => {
    const qty = Number(item.inventoryLevels?.[0]?.quantityOnHand) || 0
    const val = (Number(item.sellingPrice) || 0) * qty
    return sum + (Number.isNaN(val) ? 0 : val)
  }, 0)

  const totalProfit = initialItemData.reduce((sum, item) => {
    const qty = Number(item.inventoryLevels?.[0]?.quantityOnHand) || 0
    const profit = ((Number(item.sellingPrice) || 0) - (Number(item.costPrice) || 0)) * qty
    return sum + (Number.isNaN(profit) ? 0 : profit)
  }, 0)

  const lowStockCount = initialItemData.filter(
    (item) => (Number(item.inventoryLevels?.[0]?.quantityOnHand) || 0) < 10,
  ).length

  const outOfStockCount = initialItemData.filter(
    (item) => (Number(item.inventoryLevels?.[0]?.quantityOnHand) || 0) === 0,
  ).length

  const statsCards = [
    {
      label: "Total Items",
      value: totalItems.toString(),
      Icon: Package,
      accent: "var(--dash-brand)",
      soft: "var(--dash-brand-soft)",
      sub: "Active products",
    },
    {
      label: "Total Value",
      value: formatCurrency(totalValue, locale, "USD"),
      Icon: DollarSign,
      accent: "var(--dash-info)",
      soft: "var(--dash-info-soft)",
      sub: "Inventory worth",
    },
    {
      label: "Low Stock",
      value: lowStockCount.toString(),
      Icon: AlertTriangle,
      accent: "var(--dash-warning)",
      soft: "var(--dash-warning-soft)",
      sub: "Need attention",
    },
    {
      label: "Out of Stock",
      value: outOfStockCount.toString(),
      Icon: ShoppingCart,
      accent: "var(--dash-danger)",
      soft: "var(--dash-danger-soft)",
      sub: "Unavailable",
    },
    {
      label: "Categories",
      value: initialCategoryData.length.toString(),
      Icon: Target,
      accent: "var(--dash-gold)",
      soft: "var(--dash-gold-soft)",
      sub: "Product groups",
    },
    {
      label: "Profit Potential",
      value: formatCurrency(totalProfit, locale, "USD"),
      Icon: TrendingUp,
      accent: "var(--dash-success)",
      soft: "var(--dash-success-soft)",
      sub: "Total potential",
    },
  ]

  return (
    <div className="dashboard-landing-theme dark min-h-screen overflow-x-hidden">
      <div className="dashboard-landing-content mx-auto w-full max-w-[88rem] min-w-0 px-4 py-6 sm:px-6 sm:py-8">
        {/* Page Header */}
        <div className="mb-6 flex min-w-0 flex-col gap-5 sm:mb-8 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0 max-w-3xl">
            <div className="dashboard-eyebrow mb-4">
              <span className="dashboard-live-dot" />
              Inventory workspace
            </div>
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-brand-soft)] shadow-[0_16px_34px_rgba(47,125,246,0.18)]">
                <Package className="h-6 w-6 text-[var(--dash-brand-strong)]" />
              </div>
              <div className="min-w-0">
                <h1 className="text-3xl font-semibold tracking-tight text-[var(--dash-text)] sm:text-4xl">
                  Inventory Items
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--dash-text-soft)] sm:text-base">
                  Manage your product catalog, pricing, stock health, and item workflows from one focused table.
                </p>
              </div>
            </div>
          </div>
          <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <Button variant="outline" size="sm" className="dashboard-button-secondary hidden h-10 rounded-lg sm:inline-flex">
              <FileText className="h-4 w-4" />
              Export
            </Button>
            <Button asChild size="sm" className="dashboard-button-create h-10 w-full rounded-lg px-4 sm:w-auto">
              <Link href="/dashboard/inventory/items/create">
                <Plus className="h-4 w-4" />
                <span>Add Item</span>
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
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

        {/* Main Items Management */}
        <Card className="dashboard-glass-panel min-w-0 overflow-hidden rounded-lg text-[var(--dash-text)]">
          <Suspense fallback={<div className="p-8"><TableLoading title="Loading inventory data..." /></div>}>
            <div className="min-w-0 overflow-hidden">
              <ItemManagement
                title={stockFilterLabels[stockFilter]}
                editingId=""
                organizationId={userOrg}
                initialItemData={initialItemData as never}
                initialCategoryData={initialCategoryData as never}
                initialBrandData={initialBrandData as never}
                initialUnitData={initialUnitData as never}
                initialTaxRateData={initialTaxRateData as never}
              />
            </div>
          </Suspense>
        </Card>
      </div>
    </div>
  )
}
