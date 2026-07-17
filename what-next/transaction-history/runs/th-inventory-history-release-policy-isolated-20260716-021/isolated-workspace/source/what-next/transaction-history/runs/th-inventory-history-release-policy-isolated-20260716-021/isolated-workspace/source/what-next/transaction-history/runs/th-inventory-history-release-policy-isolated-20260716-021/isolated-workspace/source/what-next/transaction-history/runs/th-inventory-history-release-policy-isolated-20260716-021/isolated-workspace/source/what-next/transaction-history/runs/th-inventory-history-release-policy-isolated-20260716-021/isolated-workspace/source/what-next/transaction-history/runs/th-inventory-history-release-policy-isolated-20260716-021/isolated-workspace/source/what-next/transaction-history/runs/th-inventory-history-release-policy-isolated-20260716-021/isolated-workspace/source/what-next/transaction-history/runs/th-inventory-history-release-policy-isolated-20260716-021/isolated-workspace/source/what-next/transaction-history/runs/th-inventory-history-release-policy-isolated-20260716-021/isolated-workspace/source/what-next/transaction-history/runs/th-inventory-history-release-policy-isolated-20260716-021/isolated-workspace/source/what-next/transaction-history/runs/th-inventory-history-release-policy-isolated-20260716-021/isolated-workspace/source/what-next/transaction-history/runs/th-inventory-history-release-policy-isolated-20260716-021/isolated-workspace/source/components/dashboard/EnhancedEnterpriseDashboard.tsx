"use client"

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ActionQueue,
  CommandBriefHeader,
  EvidenceTimeline,
  KpiTile,
  StatusStrip,
  dashboardPanelClass,
  dashboardToneClass,
} from "@/components/dashboard/primitives"
import {
  buildTodaysOperatingTruthModel,
  type TodaysOperatingTruthModel,
} from "@/components/dashboard/todays-operating-truth"
import { useNotifications } from "@/components/notifications/NotificationProvider"
import useDashboardData from "@/hooks/useDashboardData"
import type {
  DashboardAlert,
  DashboardData,
  DashboardPeriod,
} from "@/actions/dashboard/getDashboardData"
import { cn } from "@/lib/utils"
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Boxes,
  Building2,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Package,
  RefreshCw,
  ShoppingCart,
} from "lucide-react"
import Link from "next/link"
import { useMemo, useState } from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

export interface EnterpriseDashboardLabels {
  title: string
  subtitle: string
  connected: string
  generated: string
  refresh: string
  refreshing: string
  refreshStarted: string
  refreshStartedMessage: string
  refreshSuccess: string
  refreshSuccessMessage: string
  refreshError: string
  allLocations: string
  filters: {
    period: string
    location: string
  }
  periods: Record<DashboardPeriod, string>
  tabs: {
    overview: string
    inventory: string
    operations: string
  }
  metrics: {
    revenue: string
    orders: string
    customers: string
    inventoryValue: string
    averageOrderValue: string
    cashCollected: string
  }
  metricDescriptions: {
    revenue: string
    orders: string
    customers: string
    inventoryValue: string
    averageOrderValue: string
    cashCollected: string
  }
  sections: {
    salesTrend: string
    salesTrendDescription: string
    topProducts: string
    topProductsDescription: string
    pendingActions: string
    stockHealth: string
    stockHealthDescription: string
    locationPerformance: string
    locationPerformanceDescription: string
    alerts: string
    alertsDescription: string
    recentActivity: string
    recentActivityDescription: string
    quickActions: string
    quickActionsDescription: string
  }
  stock: {
    trackedItems: string
    inStock: string
    lowStock: string
    outOfStock: string
    overstock: string
    reorderCandidates: string
    availableUnits: string
    reservedUnits: string
  }
  empty: {
    topProducts: string
    alerts: string
    activity: string
    locations: string
  }
  actions: {
    view: string
    open: string
    inventory: string
    sales: string
    purchases: string
    finance: string
  }
  comparison: string
}

export const defaultEnterpriseDashboardLabels: EnterpriseDashboardLabels = {
  title: "Operations dashboard",
  subtitle: "A real-time overview of sales, stock, purchasing, and branch health.",
  connected: "Live data",
  generated: "Updated",
  refresh: "Refresh",
  refreshing: "Refreshing",
  refreshStarted: "Dashboard refresh started",
  refreshStartedMessage: "Fetching the latest operating data.",
  refreshSuccess: "Dashboard refreshed",
  refreshSuccessMessage: "The latest dashboard data is now visible.",
  refreshError: "Dashboard refresh failed",
  allLocations: "All locations",
  filters: {
    period: "Period",
    location: "Location",
  },
  periods: {
    "7d": "Last 7 days",
    "30d": "Last 30 days",
    "90d": "Last 90 days",
    mtd: "Month to date",
  },
  tabs: {
    overview: "Overview",
    inventory: "Inventory",
    operations: "Operations",
  },
  metrics: {
    revenue: "Revenue",
    orders: "Orders",
    customers: "Customers",
    inventoryValue: "Inventory value",
    averageOrderValue: "Avg. order value",
    cashCollected: "Cash collected",
  },
  metricDescriptions: {
    revenue: "Completed sales in the selected period",
    orders: "Completed and delivered sales orders",
    customers: "Customers in this organization",
    inventoryValue: "Current value of tracked stock",
    averageOrderValue: "Revenue divided by completed orders",
    cashCollected: "Paid customer payments in the period",
  },
  sections: {
    salesTrend: "Sales trend",
    salesTrendDescription: "Daily revenue and completed order movement.",
    topProducts: "Top products",
    topProductsDescription: "Best revenue contributors in the selected period.",
    pendingActions: "Pending actions",
    stockHealth: "Inventory health",
    stockHealthDescription: "Tracked stock posture across the selected scope.",
    locationPerformance: "Location performance",
    locationPerformanceDescription: "Revenue, orders, and stock value by branch.",
    alerts: "Operating alerts",
    alertsDescription: "Important issues that need attention.",
    recentActivity: "Recent activity",
    recentActivityDescription: "Latest sales, purchase, and stock movements.",
    quickActions: "Quick actions",
    quickActionsDescription: "Move from insight to the operational surface.",
  },
  stock: {
    trackedItems: "Tracked items",
    inStock: "Healthy",
    lowStock: "Low stock",
    outOfStock: "Out of stock",
    overstock: "Overstock",
    reorderCandidates: "Reorder candidates",
    availableUnits: "Available units",
    reservedUnits: "Reserved units",
  },
  empty: {
    topProducts: "No product sales were found for this period.",
    alerts: "No urgent operating alerts right now.",
    activity: "No recent activity was found for this period.",
    locations: "No active locations were found.",
  },
  actions: {
    view: "View",
    open: "Open",
    inventory: "Inventory",
    sales: "Sales",
    purchases: "Purchases",
    finance: "Finance",
  },
  comparison: "vs previous period",
}

interface EnhancedEnterpriseDashboardProps {
  organizationId: string
  dashboardData: DashboardData
  labels?: EnterpriseDashboardLabels
  locale?: string
  dashboardBasePath?: string
  className?: string
}

const periodOptions: DashboardPeriod[] = ["7d", "30d", "90d", "mtd"]

function formatNumber(value: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
  }).format(value)
}

function formatCurrency(value: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "XAF" ? 0 : 2,
  }).format(value)
}

function formatDateTime(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

function resolveDashboardHref(href: string | undefined, dashboardBasePath: string) {
  if (!href) return dashboardBasePath
  if (href === "/dashboard") return dashboardBasePath
  if (href.startsWith("/dashboard/")) {
    return `${dashboardBasePath}${href.slice("/dashboard".length)}`
  }
  return href
}

function alertClasses(type: DashboardAlert["type"]) {
  switch (type) {
    case "critical":
      return "border-[var(--dash-danger)] bg-[var(--dash-danger-soft)] text-[var(--dash-text)]"
    case "warning":
      return "border-[var(--dash-warning)] bg-[var(--dash-warning-soft)] text-[var(--dash-text)]"
    case "success":
      return "border-[var(--dash-success)] bg-[var(--dash-success-soft)] text-[var(--dash-text)]"
    default:
      return "border-[var(--dash-info)] bg-[var(--dash-info-soft)] text-[var(--dash-text)]"
  }
}

function LoadingDashboard() {
  return (
    <div className="dashboard-landing-theme dark min-h-screen overflow-x-hidden">
      <div className="dashboard-landing-content mx-auto w-full max-w-[88rem] min-w-0 space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        <Skeleton className="h-24 w-full rounded-lg bg-[rgba(37,57,67,0.74)]" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-40 w-full rounded-lg bg-[rgba(37,57,67,0.74)]" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
          <Skeleton className="h-96 w-full rounded-lg bg-[rgba(37,57,67,0.74)]" />
          <Skeleton className="h-96 w-full rounded-lg bg-[rgba(37,57,67,0.74)]" />
        </div>
      </div>
    </div>
  )
}

function WorkspaceSetupPanel({ onboarding }: { onboarding: TodaysOperatingTruthModel["onboarding"] }) {
  return (
    <section className={cn(dashboardPanelClass, "p-4")}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 max-w-3xl">
          <h2 className="text-base font-semibold text-[var(--dash-text)]">{onboarding.title}</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--dash-text-soft)]">{onboarding.detail}</p>
        </div>
        <div className="w-full min-w-0 lg:w-[320px]">
          <div className="flex items-center justify-between gap-3 text-xs font-semibold text-[var(--dash-text-soft)]">
            <span>{onboarding.progressLabel}</span>
            <span>{onboarding.progressValue}%</span>
          </div>
          <Progress value={onboarding.progressValue} className="mt-2 h-2 bg-[var(--dash-surface-raised)]" />
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {onboarding.steps.map((step) => {
          const Icon = step.icon

          return (
            <article
              key={step.id}
              className="min-w-0 rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.30)] p-3"
            >
              <div className="flex min-w-0 items-start justify-between gap-3">
                <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border", dashboardToneClass(step.tone))}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className={cn("rounded-md border px-2 py-1 text-xs font-semibold", dashboardToneClass(step.tone))}>
                  {step.stateLabel}
                </span>
              </div>
              <h3 className="mt-3 line-clamp-2 text-sm font-semibold text-[var(--dash-text)]">{step.title}</h3>
              <p className="mt-1 line-clamp-3 text-sm leading-6 text-[var(--dash-text-soft)]">{step.detail}</p>
              <Link
                href={step.href}
                className="mt-3 inline-flex min-h-8 max-w-full items-center gap-1.5 rounded-md border border-[var(--dash-border-subtle)] px-2.5 py-1 text-xs font-semibold text-[var(--dash-text-soft)] transition hover:bg-[var(--dash-surface-raised)] hover:text-[var(--dash-text)]"
              >
                <span className="truncate">{step.actionLabel}</span>
                <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              </Link>
            </article>
          )
        })}
      </div>
    </section>
  )
}

export default function EnhancedEnterpriseDashboard({
  organizationId,
  dashboardData,
  labels = defaultEnterpriseDashboardLabels,
  locale = "en",
  dashboardBasePath = "/dashboard",
  className,
}: EnhancedEnterpriseDashboardProps) {
  const [period, setPeriod] = useState<DashboardPeriod>(dashboardData.period.key)
  const [locationId, setLocationId] = useState<string>("all")
  const notifications = useNotifications()
  const locationOptions = dashboardData.locations

  const filters = useMemo(
    () => ({
      period,
      locationId: locationId === "all" ? undefined : locationId,
    }),
    [period, locationId]
  )
  const shouldUseInitialData = period === dashboardData.period.key && locationId === "all"

  const {
    data,
    error,
    isFetching,
    isLoading,
    refetch,
  } = useDashboardData(organizationId, filters, shouldUseInitialData ? dashboardData : undefined)

  const dashboard = data || dashboardData
  const currency = dashboard.organization.currency || "XAF"

  const selectedLocationLabel =
    locationId === "all"
      ? labels.allLocations
      : locationOptions.find((location) => location.id === locationId)?.name ?? labels.allLocations
  const operatingTruth = buildTodaysOperatingTruthModel({
    dashboard,
    locale,
    dashboardBasePath,
    selectedLocationLabel,
  })

  const criticalAlert = dashboard.alerts.find((alert) => alert.type === "critical")
  const stockTotal = Math.max(dashboard.stockHealth.trackedItems, 1)
  const panelClassName = "dashboard-glass-panel min-w-0 overflow-hidden rounded-lg text-[var(--dash-text)]"
  const panelHeaderClassName = "border-b border-[var(--dash-border-subtle)] bg-[rgba(12,20,24,0.58)] px-5 py-4 sm:px-6"
  const panelTitleClassName = "text-lg font-semibold text-[var(--dash-text)]"
  const panelDescriptionClassName = "mt-1 text-sm leading-6 text-[var(--dash-text-soft)]"
  const stockHealthLinks = [
    {
      label: labels.stock.trackedItems,
      value: dashboard.stockHealth.trackedItems,
      href: "/dashboard/inventory/items",
    },
    {
      label: labels.stock.inStock,
      value: dashboard.stockHealth.inStock,
      href: "/dashboard/inventory/items?stock=in-stock",
    },
    {
      label: labels.stock.lowStock,
      value: dashboard.stockHealth.lowStock,
      href: "/dashboard/inventory/items?stock=low-stock",
    },
    {
      label: labels.stock.outOfStock,
      value: dashboard.stockHealth.outOfStock,
      href: "/dashboard/inventory/items?stock=out-of-stock",
    },
    {
      label: labels.stock.overstock,
      value: dashboard.stockHealth.overstock,
      href: "/dashboard/inventory/items?stock=overstock",
    },
    {
      label: labels.stock.reorderCandidates,
      value: dashboard.stockHealth.reorderCandidates,
      href: "/dashboard/inventory/items?stock=reorder",
    },
  ]

  async function handleRefresh() {
    notifications.info(labels.refreshStarted, labels.refreshStartedMessage, {
      category: "operation",
      duration: 2500,
    })

    const result = await refetch()

    if (result.error) {
      notifications.error(labels.refreshError, result.error.message, {
        category: "operation",
      })
      return
    }

    notifications.success(labels.refreshSuccess, labels.refreshSuccessMessage, {
      category: "operation",
    })
  }

  if (isLoading && !dashboard) {
    return <LoadingDashboard />
  }

  return (
    <div className={cn("dashboard-landing-theme dark min-h-screen overflow-x-hidden", className)}>
      <div className="dashboard-landing-content mx-auto w-full max-w-[88rem] min-w-0 space-y-6 px-4 py-6 text-[var(--dash-text)] sm:px-6 sm:py-8">
        <CommandBriefHeader {...operatingTruth.brief}>
          <div className="mt-4 grid gap-3 rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.34)] p-3 sm:grid-cols-2 xl:grid-cols-[170px_210px_auto] xl:items-end">
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-normal text-[var(--dash-text-faint)]">{labels.filters.period}</p>
              <Select value={period} onValueChange={(value) => setPeriod(value as DashboardPeriod)}>
                <SelectTrigger className="dashboard-control h-10 w-full rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] text-[var(--dash-text)]">
                  {periodOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {labels.periods[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-normal text-[var(--dash-text-faint)]">{labels.filters.location}</p>
              <Select value={locationId} onValueChange={setLocationId}>
                <SelectTrigger className="dashboard-control h-10 w-full rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] text-[var(--dash-text)]">
                  <SelectItem value="all">{labels.allLocations}</SelectItem>
                  {locationOptions.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleRefresh} disabled={isFetching} className="dashboard-button-primary h-10 rounded-lg px-4">
              <RefreshCw className={cn("mr-2 h-4 w-4", isFetching && "animate-spin")} />
              {isFetching ? labels.refreshing : labels.refresh}
            </Button>
          </div>
        </CommandBriefHeader>

        {error && (
          <Alert className="dashboard-glass-panel border-[var(--dash-danger)] bg-[var(--dash-danger-soft)] text-[var(--dash-text)]">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{labels.refreshError}</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}

        {criticalAlert && (
          <Alert className={cn("dashboard-glass-panel", alertClasses(criticalAlert.type))}>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{criticalAlert.title}</AlertTitle>
            <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span>{criticalAlert.description}</span>
              {criticalAlert.href && (
                <Button asChild size="sm" variant="outline" className="dashboard-button-secondary rounded-lg">
                  <Link href={resolveDashboardHref(criticalAlert.href, dashboardBasePath)}>
                    {labels.actions.view}
                    <ExternalLink className="ml-2 h-3.5 w-3.5" />
                  </Link>
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}

        <WorkspaceSetupPanel onboarding={operatingTruth.onboarding} />

        <StatusStrip
          title={operatingTruth.status.title}
          detail={operatingTruth.status.detail}
          items={operatingTruth.status.items}
        />

        <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <ActionQueue
            title={operatingTruth.actionQueue.title}
            detail={operatingTruth.actionQueue.detail}
            emptyTitle={operatingTruth.actionQueue.emptyTitle}
            emptyMessage={operatingTruth.actionQueue.emptyMessage}
            items={operatingTruth.actionQueue.items}
          />
          <EvidenceTimeline
            title={operatingTruth.evidence.title}
            detail={operatingTruth.evidence.detail}
            emptyMessage={operatingTruth.evidence.emptyMessage}
            events={operatingTruth.evidence.events}
          />
        </div>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {operatingTruth.kpis.map((kpi) => (
            <KpiTile key={kpi.label} {...kpi} />
          ))}
        </section>

        <section className={cn(dashboardPanelClass, "p-4")}>
          <div className="flex flex-col gap-1">
            <h2 className="text-base font-semibold text-[var(--dash-text)]">{operatingTruth.shortcuts.title}</h2>
            <p className="text-sm leading-6 text-[var(--dash-text-soft)]">{operatingTruth.shortcuts.detail}</p>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {operatingTruth.shortcuts.actions.map((action) => {
              const Icon = action.icon

              return (
                <Button key={`${action.label}-${action.href}`} asChild variant="outline" className="dashboard-button-secondary h-11 justify-between rounded-lg">
                  <Link href={action.href ?? dashboardBasePath}>
                    <span className="inline-flex min-w-0 items-center gap-2">
                      {Icon ? <Icon className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
                      <span className="truncate">{action.label}</span>
                    </span>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  </Link>
                </Button>
              )
            })}
          </div>
        </section>

        <Tabs defaultValue="overview" className="space-y-5">
          <TabsList className="grid h-auto w-full grid-cols-3 gap-1 rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.72)] p-1 text-[var(--dash-text-soft)] md:w-[520px]">
            <TabsTrigger value="overview" className="gap-2 rounded-md data-[state=active]:bg-[var(--dash-brand-soft)] data-[state=active]:text-[var(--dash-text)]">
              <BarChart3 className="h-4 w-4" />
              <span className="truncate">{labels.tabs.overview}</span>
            </TabsTrigger>
            <TabsTrigger value="inventory" className="gap-2 rounded-md data-[state=active]:bg-[var(--dash-brand-soft)] data-[state=active]:text-[var(--dash-text)]">
              <Boxes className="h-4 w-4" />
              <span className="truncate">{labels.tabs.inventory}</span>
            </TabsTrigger>
            <TabsTrigger value="operations" className="gap-2 rounded-md data-[state=active]:bg-[var(--dash-brand-soft)] data-[state=active]:text-[var(--dash-text)]">
              <Activity className="h-4 w-4" />
              <span className="truncate">{labels.tabs.operations}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-5">
            <div className="grid gap-5 xl:grid-cols-[1.35fr_0.85fr]">
              <Card className={panelClassName}>
                <CardHeader className={panelHeaderClassName}>
                  <CardTitle className={panelTitleClassName}>{labels.sections.salesTrend}</CardTitle>
                  <CardDescription className={panelDescriptionClassName}>{labels.sections.salesTrendDescription}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[330px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dashboard.salesTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(169,184,178,0.22)" />
                        <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                        <YAxis tickLine={false} axisLine={false} fontSize={12} />
                        <Tooltip
                          contentStyle={{
                            background: "var(--dash-surface-raised)",
                            border: "1px solid var(--dash-border-subtle)",
                            borderRadius: 8,
                            color: "var(--dash-text)",
                          }}
                          formatter={(value, name) => {
                            if (name === "revenue") return [formatCurrency(Number(value), currency, locale), labels.metrics.revenue]
                            return [formatNumber(Number(value), locale), labels.metrics.orders]
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="revenue"
                          stroke="var(--dash-success)"
                          fill="var(--dash-success)"
                          fillOpacity={0.18}
                          strokeWidth={2}
                        />
                        <Area
                          type="monotone"
                          dataKey="orders"
                          stroke="var(--dash-brand)"
                          fill="var(--dash-brand)"
                          fillOpacity={0.12}
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className={panelClassName}>
                <CardHeader className={panelHeaderClassName}>
                  <CardTitle className={panelTitleClassName}>{labels.sections.topProducts}</CardTitle>
                  <CardDescription className={panelDescriptionClassName}>{labels.sections.topProductsDescription}</CardDescription>
                </CardHeader>
                <CardContent>
                  {dashboard.topProducts.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.32)] p-6 text-sm text-[var(--dash-text-soft)]">
                      {labels.empty.topProducts}
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {dashboard.topProducts.map((product, index) => (
                        <Link
                          key={product.id}
                          href={resolveDashboardHref(product.href, dashboardBasePath)}
                          className="group flex items-center gap-3 rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.32)] p-3 transition-colors hover:bg-[rgba(73,198,229,0.10)]"
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--dash-surface-raised)] text-sm font-semibold text-[var(--dash-text-muted)]">
                            {index + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{product.name}</p>
                            <p className="truncate text-xs text-[var(--dash-text-soft)]">
                              {product.sku} · {product.category}
                            </p>
                          </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">{formatCurrency(product.revenue, currency, locale)}</p>
                          <p className="text-xs text-[var(--dash-text-soft)]">
                            {formatNumber(product.quantitySold, locale)} sold
                          </p>
                        </div>
                          <ExternalLink className="h-4 w-4 text-[var(--dash-text-soft)] opacity-0 transition-opacity group-hover:opacity-100" />
                        </Link>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

          </TabsContent>

          <TabsContent value="inventory" className="space-y-5">
            <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
              <Card className={panelClassName}>
                <CardHeader className={panelHeaderClassName}>
                  <CardTitle className={panelTitleClassName}>{labels.sections.stockHealth}</CardTitle>
                  <CardDescription className={panelDescriptionClassName}>{labels.sections.stockHealthDescription}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid grid-cols-2 gap-3">
                    {stockHealthLinks.map((item) => (
                      <Link
                        key={item.label}
                        href={resolveDashboardHref(item.href, dashboardBasePath)}
                        className="group rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.32)] p-3 transition-colors hover:border-[var(--dash-border)] hover:bg-[rgba(73,198,229,0.10)]"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs text-[var(--dash-text-soft)]">{item.label}</p>
                          <ExternalLink className="h-3.5 w-3.5 shrink-0 text-[var(--dash-text-faint)] opacity-0 transition-opacity group-hover:opacity-100" />
                        </div>
                        <p className="mt-1 text-xl font-semibold text-[var(--dash-text)]">{formatNumber(item.value, locale)}</p>
                      </Link>
                    ))}
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span>{labels.stock.inStock}</span>
                      <span>{formatNumber(dashboard.stockHealth.inStock, locale)}</span>
                    </div>
                    <Progress value={(dashboard.stockHealth.inStock / stockTotal) * 100} className="h-2 bg-[var(--dash-surface-raised)]" />
                    <div className="grid gap-2 text-xs text-[var(--dash-text-soft)] sm:grid-cols-2">
                      <Link
                        href={resolveDashboardHref("/dashboard/inventory/items?stock=available", dashboardBasePath)}
                        className="rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.24)] px-3 py-2 transition hover:border-[var(--dash-border)] hover:bg-[rgba(73,198,229,0.10)]"
                      >
                        {labels.stock.availableUnits}: {formatNumber(dashboard.stockHealth.availableUnits, locale)}
                      </Link>
                      <Link
                        href={resolveDashboardHref("/dashboard/inventory/items?stock=reserved", dashboardBasePath)}
                        className="rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.24)] px-3 py-2 transition hover:border-[var(--dash-border)] hover:bg-[rgba(73,198,229,0.10)]"
                      >
                        {labels.stock.reservedUnits}: {formatNumber(dashboard.stockHealth.reservedUnits, locale)}
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className={panelClassName}>
                <CardHeader className={panelHeaderClassName}>
                  <CardTitle className={panelTitleClassName}>{labels.sections.locationPerformance}</CardTitle>
                  <CardDescription className={panelDescriptionClassName}>{labels.sections.locationPerformanceDescription}</CardDescription>
                </CardHeader>
                <CardContent>
                  {dashboard.locations.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.32)] p-6 text-sm text-[var(--dash-text-soft)]">
                      {labels.empty.locations}
                    </p>
                  ) : (
                    <div className="h-[360px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dashboard.locations}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(169,184,178,0.22)" />
                          <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                          <YAxis tickLine={false} axisLine={false} fontSize={12} />
                          <Tooltip
                            contentStyle={{
                              background: "var(--dash-surface-raised)",
                              border: "1px solid var(--dash-border-subtle)",
                              borderRadius: 8,
                              color: "var(--dash-text)",
                            }}
                            formatter={(value, name) => {
                              if (name === "revenue") return [formatCurrency(Number(value), currency, locale), labels.metrics.revenue]
                              if (name === "inventoryValue") return [formatCurrency(Number(value), currency, locale), labels.metrics.inventoryValue]
                              return [formatNumber(Number(value), locale), labels.metrics.orders]
                            }}
                          />
                          <Bar dataKey="revenue" fill="var(--dash-spruce)" radius={[6, 6, 0, 0]} />
                          <Bar dataKey="inventoryValue" fill="var(--dash-gold)" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="operations" className="space-y-5">
            <div className="grid gap-5 xl:grid-cols-2">
              <Card className={panelClassName}>
                <CardHeader className={panelHeaderClassName}>
                  <CardTitle className={panelTitleClassName}>{labels.sections.alerts}</CardTitle>
                  <CardDescription className={panelDescriptionClassName}>{labels.sections.alertsDescription}</CardDescription>
                </CardHeader>
                <CardContent>
                  {dashboard.alerts.length === 0 ? (
                    <div className="flex items-center gap-3 rounded-lg border border-dashed border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.32)] p-6 text-sm text-[var(--dash-text-soft)]">
                      <CheckCircle2 className="h-5 w-5 text-[var(--dash-success)]" />
                      {labels.empty.alerts}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {dashboard.alerts.map((alert) => (
                        <Link
                          key={alert.id}
                          href={resolveDashboardHref(alert.href, dashboardBasePath)}
                          className={cn("block rounded-lg border p-4 transition-opacity hover:opacity-90", alertClasses(alert.type))}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-medium">{alert.title}</p>
                              <p className="mt-1 text-sm opacity-85">{alert.description}</p>
                            </div>
                            <ExternalLink className="h-4 w-4 shrink-0 opacity-70" />
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className={panelClassName}>
                <CardHeader className={panelHeaderClassName}>
                  <CardTitle className={panelTitleClassName}>{labels.sections.recentActivity}</CardTitle>
                  <CardDescription className={panelDescriptionClassName}>{labels.sections.recentActivityDescription}</CardDescription>
                </CardHeader>
                <CardContent>
                  {dashboard.activities.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.32)] p-6 text-sm text-[var(--dash-text-soft)]">
                      {labels.empty.activity}
                    </p>
                  ) : (
                    <ScrollArea className="h-[360px] pr-3">
                      <div className="space-y-3">
                        {dashboard.activities.map((activity) => {
                          const Icon =
                            activity.type === "sale"
                              ? ShoppingCart
                              : activity.type === "purchase"
                                ? Building2
                                : Package

                          return (
                            <Link
                              key={activity.id}
                              href={resolveDashboardHref(activity.href, dashboardBasePath)}
                              className="flex gap-3 rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.32)] p-3 transition-colors hover:bg-[rgba(73,198,229,0.10)]"
                            >
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--dash-surface-raised)] text-[var(--dash-text-muted)]">
                                <Icon className="h-4 w-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium capitalize">{activity.title}</p>
                                <p className="line-clamp-2 text-xs text-[var(--dash-text-soft)]">{activity.description}</p>
                                <p className="mt-1 text-xs text-[var(--dash-text-soft)]">
                                  {formatDateTime(activity.timestamp, locale)}
                                </p>
                              </div>
                            </Link>
                          )
                        })}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className={panelClassName}>
              <CardHeader className={panelHeaderClassName}>
                <CardTitle className={panelTitleClassName}>{labels.sections.quickActions}</CardTitle>
                <CardDescription className={panelDescriptionClassName}>{labels.sections.quickActionsDescription}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    { label: labels.actions.inventory, href: "/dashboard/inventory", icon: Package },
                    { label: labels.actions.sales, href: "/dashboard/sales", icon: ShoppingCart },
                    { label: labels.actions.purchases, href: "/dashboard/purchases", icon: Building2 },
                    { label: labels.actions.finance, href: "/dashboard/finance", icon: CreditCard },
                  ].map((action) => (
                    <Button key={action.href} asChild variant="outline" className="dashboard-button-secondary h-12 justify-between rounded-lg">
                      <Link href={resolveDashboardHref(action.href, dashboardBasePath)}>
                        <span className="inline-flex items-center gap-2">
                          <action.icon className="h-4 w-4" />
                          {action.label}
                        </span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
