"use client"

import { useEffect, useState } from "react"
import type { BICommandMode } from "@/services/bi/bi-contracts"

export const managerLanes = [
  "overdue",
  "critical",
  "due_today",
  "blocked",
  "waiting",
  "assigned",
  "routine",
] as const
export type ManagerLane = (typeof managerLanes)[number]
export type ManagerView = {
  mode: BICommandMode
  source: string
  role: string
  location: string
  urgency: string
  page: number
}
type Options = {
  sources: string[]
  roles: string[]
  locations?: string[]
  defaultMode?: BICommandMode
}
const keys = ["mode", "source", "role", "location", "urgency", "page"] as const

// Navigation state filters only the already-authorized DTO. It never drives a fetch.
export function normalizeManagerView(
  raw: Partial<Record<keyof ManagerView, unknown>>,
  options: Options,
): ManagerView {
  const allowed = (value: unknown, values: readonly string[], fallback = "all") =>
    typeof value === "string" && values.includes(value) ? value : fallback
  return {
    mode: allowed(
      raw.mode,
      ["brief", "command", "investigate"],
      options.defaultMode ?? "brief",
    ) as BICommandMode,
    source: allowed(raw.source, options.sources),
    role: allowed(raw.role, options.roles),
    location: allowed(raw.location, options.locations ?? [], options.locations?.[0] ?? "all"),
    urgency: allowed(raw.urgency, managerLanes),
    page: /^\d{1,6}$/.test(String(raw.page)) && Number(raw.page) > 0 ? Number(raw.page) : 1,
  }
}

export function useManagerView(options: Options) {
  const [raw, setRaw] = useState<Partial<ManagerView>>({})
  const [ready, setReady] = useState(false)
  const view = normalizeManagerView(raw, options)
  const signature = JSON.stringify(view)

  useEffect(() => {
    const restore = () => {
      const params = new URL(window.location.href).searchParams
      setRaw(Object.fromEntries(keys.map((key) => [key, params.get(key)])) as Partial<ManagerView>)
    }
    restore()
    setReady(true)
    window.addEventListener("popstate", restore)
    return () => window.removeEventListener("popstate", restore)
  }, [])

  useEffect(() => {
    if (!ready) return
    const safe = JSON.parse(signature) as ManagerView
    writeView(safe, false)
  }, [signature, ready])

  function update(patch: Partial<ManagerView>) {
    const filtering = ["source", "role", "location", "urgency"].some((key) => key in patch)
    const next = normalizeManagerView(
      { ...view, ...patch, ...(filtering ? { page: 1 } : {}) },
      options,
    )
    writeView(next, true)
    setRaw(next)
  }
  return { view, update, ready }
}

function writeView(view: ManagerView, push: boolean) {
  const url = new URL(window.location.href)
  for (const key of keys) {
    if (view[key] === "all" || (key === "page" && view.page === 1)) url.searchParams.delete(key)
    else url.searchParams.set(key, String(view[key]))
  }
  if (url.href !== window.location.href) {
    window.history[push ? "pushState" : "replaceState"](window.history.state, "", url)
  }
}
