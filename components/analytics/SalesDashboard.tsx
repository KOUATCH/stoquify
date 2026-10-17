"use client"
import { useTranslations } from "next-intl"
import { useClientAuth } from "@/hooks/useClientAuth"
import { useSalesDashboardScope } from "@/hooks/analytics/useSalesDashboardScope"
import { Button } from "@/components/ui/button"
import CompleteIntegratedDailySalesDashboard from "./CompleteIntegratedDailySalesDashboard"
import SalesPerformanceDashboard from "./SalesPerformanceDashboard"

export default function SalesDashboard() {
  const auth = useClientAuth(), t = useTranslations("salesPerformance")
  const state = useSalesDashboardScope(auth.organizationId)
  if (!state.hydrated) return <p role="status" className="p-4">{t("loading")}</p>
  return <div className="dashboard-landing-theme dark">
    <nav aria-label={t("views")} className="flex flex-wrap gap-2 px-4 pt-4">
      <Button className={state.view === "daily" ? "dashboard-button-primary" : "dashboard-button-secondary"} variant="outline" aria-pressed={state.view === "daily"} onClick={() => { if (state.view !== "daily") state.write({ locationId: state.scope.locationId }, "daily") }}>{t("daily")}</Button>
      <Button className={state.view === "performance" ? "dashboard-button-primary" : "dashboard-button-secondary"} variant="outline" aria-pressed={state.view === "performance"} onClick={() => { if (state.view !== "performance") state.write({ locationId: state.scope.locationId }, "performance") }}>{t("performance")}</Button>
    </nav>
    {state.view === "performance" ? <SalesPerformanceDashboard /> : <CompleteIntegratedDailySalesDashboard persistScope />}
  </div>
}
