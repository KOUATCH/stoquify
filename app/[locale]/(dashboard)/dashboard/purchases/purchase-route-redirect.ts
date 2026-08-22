import { localizePath, pickLocale } from "@/i18n/routing"

export type PurchaseRouteSearchParams = Record<string, string | string[] | undefined>

export function buildPurchaseOrderRedirect(params: {
  locale: string
  id?: string
  searchParams?: PurchaseRouteSearchParams
}) {
  const locale = pickLocale(params.locale)
  const suffix = params.id ? `/${encodeURIComponent(params.id)}` : ""
  const target = localizePath(`/dashboard/purchase-orders${suffix}`, locale)
  const query = new URLSearchParams()

  for (const [key, value] of Object.entries(params.searchParams ?? {})) {
    if (Array.isArray(value)) {
      for (const entry of value) query.append(key, entry)
    } else if (value !== undefined) {
      query.append(key, value)
    }
  }

  const serialized = query.toString()
  return serialized ? `${target}?${serialized}` : target
}
