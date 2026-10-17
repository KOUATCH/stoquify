"use client"

import { useSyncExternalStore } from "react"

const eventName = "stoquify:daily-sales-scope"
function subscribe(notify: () => void) {
  window.addEventListener("popstate", notify)
  window.addEventListener(eventName, notify)
  return () => {
    window.removeEventListener("popstate", notify)
    window.removeEventListener(eventName, notify)
  }
}

export function readDailySalesScope(search: string, organizationId?: string) {
  const params = new URLSearchParams(search)
  // A bookmark never selects the actor's organization. Old-tenant filters are discarded.
  if (params.has("reportOrg") && params.get("reportOrg") !== organizationId) return { invalid: false }
  const date = params.get("date") ?? undefined
  const locationId = params.get("locationId") ?? undefined
  const parsedDate = date ? new Date(`${date}T00:00:00Z`) : null
  const invalid = ["date", "locationId", "view", "reportOrg"].some(key => params.getAll(key).length > 1)
    || (date !== undefined && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !parsedDate || !Number.isFinite(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date))
    || (locationId !== undefined && (!locationId.trim() || locationId.length > 200))
    || (params.has("view") && params.get("view") !== "daily")
  return { date, locationId, invalid }
}

export function useDailySalesScope(organizationId: string | undefined, enabled: boolean) {
  const search = useSyncExternalStore(subscribe, () => window.location.search, () => "")
  const scope = readDailySalesScope(enabled ? search : "", organizationId)
  const write = (value: { date?: string; locationId?: string }, replace = false) => {
    if (!enabled) return
    const url = new URL(window.location.href)
    for (const key of ["date", "locationId", "view", "reportOrg"]) url.searchParams.delete(key)
    if (value.date) url.searchParams.set("date", value.date)
    if (value.locationId) url.searchParams.set("locationId", value.locationId)
    url.searchParams.set("view", "daily")
    if (organizationId) url.searchParams.set("reportOrg", organizationId)
    window.history[replace ? "replaceState" : "pushState"](null, "", url.pathname + url.search + url.hash)
    window.dispatchEvent(new Event(eventName))
  }
  return { ...scope, write, search }
}

export function organizationCalendarDay(timezone: string, offset = 0, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now)
  const part = (type: string) => parts.find(value => value.type === type)!.value
  const date = new Date(`${part("year")}-${part("month")}-${part("day")}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + offset)
  return date.toISOString().slice(0, 10)
}
