export type RecordSearchDomain = "items" | "customers" | "purchaseOrders"
export type RecordSearchHit = {
  id: string
  domain: RecordSearchDomain
  title: string
  reference: string
  href: string
}
export type RecordSearchResult = {
  query: string
  hits: RecordSearchHit[]
  partialDomains: RecordSearchDomain[]
}

export function normalizeRecordSearchQuery(query: unknown): string {
  return typeof query === "string" ? query.trim().slice(0, 100) : ""
}
