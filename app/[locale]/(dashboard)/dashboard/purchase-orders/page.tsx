import { Suspense } from "react"
import type { CSSProperties } from "react"
import {
  BarChart3,
  CheckCircle2,
  Clock,
  FileText,
  Package,
  Plus,
  ShoppingCart,
  Truck,
} from "lucide-react"
import { getLocale, getTranslations } from "next-intl/server"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { TableLoading } from "@/components/ui/data-table"
import PurchaseOrderManagement from "@/components/ui/groups/purchase-orders/PurchaseOrderManagement"
import { Link } from "@/i18n/navigation"
import { pickLocale } from "@/i18n/routing"
import { formatCurrency } from "@/lib/i18n/formatters"
import {
  getPurchaseOrderCurrency,
  getPurchaseOrderFormOptions,
  getSummary,
  listPurchaseOrders,
} from "@/services/purchase-order/purchase-order.service"
import {
  derivePurchaseOrderCreateCapability,
  projectPurchaseOrderForActor,
} from "@/services/purchase-order/purchase-order-capabilities"
import { Locale } from "@/types/bilingual"

import { routeByKey, withPurchaseOrdersSurfaceAccess } from "./purchase-orders-route-access"

function MetricCard({
  title,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  title: string
  value: string | number
  detail: string
  icon: typeof ShoppingCart
  tone: "blue" | "emerald" | "amber" | "rose" | "slate"
}) {
  const tones = {
    blue: { accent: "var(--dash-info)", soft: "var(--dash-info-soft)" },
    emerald: { accent: "var(--dash-success)", soft: "var(--dash-success-soft)" },
    amber: { accent: "var(--dash-gold)", soft: "var(--dash-gold-soft)" },
    rose: { accent: "var(--dash-danger)", soft: "var(--dash-danger-soft)" },
    slate: { accent: "var(--dash-brand-strong)", soft: "var(--dash-brand-soft)" },
  }
  const toneStyle = tones[tone]

  return (
    <Card
      className="dashboard-stat-card group relative min-h-[128px] min-w-0 overflow-hidden"
      style={{
        "--stat-accent": toneStyle.accent,
        "--stat-soft": toneStyle.soft,
      } as CSSProperties}
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-[var(--stat-accent)] opacity-80" />
      <CardContent className="relative z-10 flex items-start justify-between gap-3 p-4">
        <div className="min-w-0 pe-10">
          <div className="text-[0.68rem] font-semibold uppercase leading-4 tracking-[0.08em] text-[var(--dash-text-faint)]">{title}</div>
          <div className="mt-2 break-words text-2xl font-semibold leading-tight text-[var(--dash-text)] tabular-nums">{value}</div>
          <div className="mt-2 flex items-center gap-1.5 text-xs leading-5 text-[var(--dash-text-soft)]">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--stat-accent)]" />
            <span>{detail}</span>
          </div>
        </div>
        <span className="absolute right-4 top-4 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--stat-soft)] text-[var(--stat-accent)] transition-transform duration-200 group-hover:scale-105">
          <Icon className="h-4 w-4" />
        </span>
      </CardContent>
    </Card>
  )
}

export default async function PurchaseOrdersPage() {
  const locale = pickLocale(await getLocale())
  const t = await getTranslations("purchaseOrders")
  const surface = routeByKey("purchase-orders-dashboard")

  if (!surface) {
    throw new Error("Missing purchase orders route surface definition: purchase-orders-dashboard")
  }

  return withPurchaseOrdersSurfaceAccess({
    params: Promise.resolve({ locale }),
    surface,
    permissionOptions: {
      resource: "PurchaseOrder",
    },
    onAllowed: async (_ctx, activeLocale: Locale) => {
      const [purchaseOrders, options, summary, currency] = await Promise.all([
        listPurchaseOrders(_ctx.orgId),
        getPurchaseOrderFormOptions(_ctx.orgId),
        getSummary(_ctx.orgId),
        getPurchaseOrderCurrency(_ctx.orgId),
      ])
      const createCapability = derivePurchaseOrderCreateCapability(_ctx.permissions)
      const presentedPurchaseOrders = purchaseOrders.map((order) =>
        projectPurchaseOrderForActor(order, _ctx, currency),
      )

      const totalValue = Number(summary.totalValue)
      const overdueOrders = summary.overdueOrders

      return (
        <div className="dashboard-landing-theme dark min-h-screen overflow-x-hidden">
          <main className="dashboard-landing-content mx-auto w-full max-w-[88rem] min-w-0 space-y-6 px-4 py-6 text-[var(--dash-text)] sm:px-6 sm:py-8">
            <section className="dashboard-glass-panel rounded-lg p-5 sm:p-6">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                <div className="min-w-0 max-w-3xl">
                  <div className="dashboard-eyebrow mb-4">
                    <span className="dashboard-live-dot" />
                    Purchase workspace
                  </div>
                  <div className="flex min-w-0 items-start gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-brand-soft)] shadow-[0_16px_34px_rgba(47,125,246,0.18)]">
                      <ShoppingCart className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <h1 className="text-3xl font-semibold tracking-tight text-[var(--dash-text)] sm:text-4xl">{t("title")}</h1>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--dash-text-soft)] sm:text-base">{t("subtitle")}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-[var(--dash-text-soft)]">
                    <Badge variant="outline" className="dashboard-filter-chip gap-1 rounded-lg">
                      <FileText className="h-3 w-3 text-[var(--dash-info)]" />
                      {t("stats.totalOrdersBadge", { n: purchaseOrders.length })}
                    </Badge>
                    <Badge variant="outline" className="dashboard-filter-chip rounded-lg">
                      {t("stats.valueLabel", { amount: formatCurrency(totalValue, activeLocale, currency) })}
                    </Badge>
                    {overdueOrders > 0 ? (
                      <Badge className="rounded-lg border border-[var(--dash-danger)]/35 bg-[var(--dash-danger-soft)] text-[var(--dash-text)] hover:bg-[var(--dash-danger-soft)]">
                        {t("stats.overdueBadge", { n: overdueOrders })}
                      </Badge>
                    ) : null}
                  </div>
                </div>

                <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                  <Button asChild variant="outline" size="sm" className="dashboard-button-secondary h-10 justify-center rounded-lg">
                    <Link href="/dashboard/purchase-orders/analytics">
                      <BarChart3 className="h-4 w-4" />
                      {t("header.analyticsCta")}
                    </Link>
                  </Button>
                  {createCapability.allowed ? (
                    <Button asChild size="sm" className="dashboard-button-create h-10 justify-center rounded-lg px-4">
                      <Link href="/dashboard/purchase-orders/new">
                        <Plus className="h-4 w-4" />
                        {t("header.createCta")}
                      </Link>
                    </Button>
                  ) : null}
                </div>
              </div>
            </section>

            <section className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <MetricCard title={t("stats.totalOrders")} value={summary.totalOrders} detail={t("stats.totalOrdersSubtitle")} icon={ShoppingCart} tone="blue" />
              <MetricCard title={t("stats.totalValue")} value={formatCurrency(totalValue, activeLocale, currency)} detail={t("stats.totalValueSubtitle")} icon={FileText} tone="slate" />
              <MetricCard title={t("stats.draftOrders")} value={summary.statusBreakdown.draft} detail={t("stats.draftSubtitle")} icon={Clock} tone="amber" />
              <MetricCard title={t("stats.received")} value={summary.statusBreakdown.received} detail={t("stats.receivedSubtitle")} icon={CheckCircle2} tone="emerald" />
              <MetricCard title={t("stats.overdue")} value={overdueOrders} detail={t("stats.overdueSubtitle")} icon={Truck} tone={overdueOrders > 0 ? "rose" : "slate"} />
            </section>

            <Card className="dashboard-glass-panel min-w-0 overflow-hidden rounded-lg text-[var(--dash-text)]">
              <div className="border-b border-[var(--dash-border-subtle)] bg-[rgba(12,20,24,0.58)] px-5 py-4 sm:px-6">
                <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--dash-spruce-soft)] text-[var(--dash-spruce)]">
                      <Package className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <h2 className="text-lg font-semibold text-[var(--dash-text)]">{t("panel.title")}</h2>
                      <p className="break-words text-sm text-[var(--dash-text-soft)]">
                        {t("panel.summary", {
                          n: purchaseOrders.length,
                          overdue: overdueOrders,
                          value: formatCurrency(totalValue, activeLocale, currency),
                        })}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="dashboard-filter-chip w-fit rounded-lg">
                    <span className="me-1 h-2 w-2 rounded-full bg-[var(--dash-spruce)]" />
                    {t("panel.liveData")}
                  </Badge>
                </div>
              </div>

              <Suspense fallback={<div className="p-8"><TableLoading title={t("panel.loading")} /></div>}>
                <div className="p-5 sm:p-6">
                  <PurchaseOrderManagement
                    title={t("title")}
                    organizationId={_ctx.orgId}
                    initialPurchaseOrderData={presentedPurchaseOrders}
                    initialSupplierData={options.suppliers}
                    initialLocationData={options.locations}
                    currency={currency}
                    canCreate={createCapability.allowed}
                    locale={locale}
                  />
                </div>
              </Suspense>
            </Card>
          </main>
        </div>
      )
    },
  })
}
