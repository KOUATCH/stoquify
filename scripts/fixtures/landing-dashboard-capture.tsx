"use client"

// Capture-only fixture. This renders the production dashboard components with
// fictional records. It is never imported by a public or authenticated route.
import EnhancedEnterpriseDashboard, { type EnterpriseDashboardLabels } from "@/components/dashboard/EnhancedEnterpriseDashboard"
import Sidebar from "@/components/dashboard/Sidebar"
import Navbar from "@/components/dashboard/Navbar"
import type { DashboardData } from "@/actions/dashboard/getDashboardData"

export default function LandingDashboardCapture({ locale, labels }: { locale: "en" | "fr"; labels: EnterpriseDashboardLabels }) {
  const fr = locale === "fr"
  const data: DashboardData = {
    organization: { id: "illustrative-workspace", name: fr ? "Maison du Marché · Démonstration" : "Market House · Demonstration", slug: "illustrative-workspace", country: "Cameroon", countryCode: "CM", taxIdentifier: null, currency: "XAF" },
    period: { key: "30d", from: "2026-10-01T00:00:00.000Z", to: "2026-10-18T18:00:00.000Z", previousFrom: "2026-09-01T00:00:00.000Z", previousTo: "2026-09-30T23:59:59.000Z" },
    filters: {}, generatedAt: "2026-10-18T18:00:00.000Z",
    kpis: {
      revenue: { current: 1250000, previous: 1000000, change: 25 },
      orders: { current: 42, previous: 40, change: 5 },
      customers: { current: 18, previous: 18, change: 0 },
      inventoryValue: { current: 560000, previous: 600000, change: -6.7 },
      averageOrderValue: { current: 29762, previous: 25000, change: 19 },
      cashCollected: { current: 980000, previous: 900000, change: 8.9 },
    },
    stockHealth: { trackedItems: 22, inStock: 18, lowStock: 3, outOfStock: 1, overstock: 0, reorderCandidates: 4, availableUnits: 420, reservedUnits: 18 },
    salesTrend: [], topProducts: [], locations: [], alerts: [],
    activities: [
      { id: "sample-sale", type: "sale", title: fr ? "Vente enregistrée" : "Sale recorded", description: fr ? "SALE-104 · Boutique principale" : "SALE-104 · Main shop", timestamp: "2026-10-18T17:45:00.000Z", status: "success", href: "/dashboard/sales" },
      { id: "sample-stock", type: "inventory", title: fr ? "Stock mis à jour" : "Stock updated", description: fr ? "Réception de 24 unités · Entrepôt" : "24 units received · Warehouse", timestamp: "2026-10-18T17:30:00.000Z", status: "success", href: "/dashboard/inventory" },
    ],
    pendingActions: [
      { id: "sample-reorder", label: fr ? "Examiner les articles à réapprovisionner" : "Review items to replenish", count: 4, href: "/dashboard/inventory", severity: "warning" },
      { id: "sample-purchase", label: fr ? "Examiner les commandes fournisseurs" : "Review supplier purchase orders", count: 2, href: "/dashboard/purchases", severity: "info" },
    ],
    counts: { activeLocations: 2, activeSessions: 1, pendingPurchaseOrders: 2, openSalesOrders: 4, totalCustomers: 18, totalItems: 22 },
    setupProgress: { completedRequiredSteps: 7, totalRequiredSteps: 7, percent: 100, steps: [] },
  }
  const session = { user: { id: "illustrative-user", name: fr ? "Équipe démo" : "Demo team", email: "demo@example.test", organizationId: data.organization.id, organizationName: data.organization.name, permissions: ["*"], roles: [{ name: "ADMIN", nameEn: "Administrator", nameFr: "Administrateur" }] } }
  return (
    <div id="dashboard-capture" className="dark min-h-screen w-full overflow-x-hidden [color-scheme:dark]">
      <Sidebar session={session} />
      <div className="flex min-h-screen min-w-0 flex-col overflow-x-hidden md:pl-[220px] lg:pl-[280px]">
        <Navbar session={session} />
        {/* Empty query organization disables all dashboard fetching; only fixture data is rendered. */}
        <EnhancedEnterpriseDashboard organizationId="" dashboardData={data} labels={labels} locale={locale} dashboardBasePath={`/${locale}/dashboard`} />
      </div>
    </div>
  )
}
