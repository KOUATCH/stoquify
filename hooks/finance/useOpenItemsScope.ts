"use client"
import { useSearchParams, useRouter } from "next/navigation"
import { openItemsHref, parseOpenItemsScope, parseOpenItemsActivity, type OpenItemsActivityPeriod } from "@/lib/finance/open-items-navigation"
import type { OpenItemsScope } from "@/services/finance/open-items-dashboard.contract"

export function useOpenItemsScope(view: OpenItemsScope["view"], locale: "en" | "fr") {
  const params = useSearchParams(), router = useRouter()
  const scope = parseOpenItemsScope(new URLSearchParams(params.toString()), view)
  const period = parseOpenItemsActivity(new URLSearchParams(params.toString()))
  return [scope, (next: OpenItemsScope) => router.replace(openItemsHref(locale, next, period), { scroll: false }), { period, setPeriod: (period: OpenItemsActivityPeriod) => router.replace(openItemsHref(locale, scope, period), { scroll: false }) }] as const
}
