"use client"
import { useSyncExternalStore } from "react"
import { performanceKeys, readPerformanceScope, type PerformanceScope } from "@/lib/analytics/sales-performance-scope"

function subscribe(notify: () => void) {
  const events = ["popstate", "stoquify:daily-sales-scope", "stoquify:sales-view"]
  events.forEach(event => window.addEventListener(event, notify))
  return () => events.forEach(event => window.removeEventListener(event, notify))
}
export function useSalesDashboardScope(organizationId?: string) {
  const snapshot = useSyncExternalStore<string | null>(subscribe, () => window.location.search, () => null)
  const search = snapshot ?? ""
  const parsed = readPerformanceScope(search, organizationId)
  const view = new URLSearchParams(search).get("view") === "performance" ? "performance" : "daily"
  const write = (scope: PerformanceScope, nextView = view) => {
    const url = new URL(window.location.href)
    for (const key of [...performanceKeys, "date", "view", "locationId", "reportOrg"]) url.searchParams.delete(key)
    for (const [key, value] of Object.entries(scope)) if (value && key !== "organizationId") url.searchParams.set(key, value)
    url.searchParams.set("view", nextView)
    if (organizationId) url.searchParams.set("reportOrg", organizationId)
    window.history.pushState(null, "", url.pathname + url.search + url.hash)
    window.dispatchEvent(new Event("stoquify:sales-view"))
  }
  return { ...parsed, view, search, hydrated: snapshot !== null, write }
}
