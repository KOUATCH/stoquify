import { openItemsScopeSchema, type OpenItemsScope, type OpenItemsRow } from "@/services/finance/open-items-dashboard.contract"
import { hasRbacPermission, hasAnyRbacPermission } from "@/lib/security/rbac-permissions"

const keys = ["locationId", "currency", "search", "bucket", "queue", "counterpartyId", "page", "pageSize", "revision"] as const

export function parseOpenItemsScope(params: URLSearchParams, view: OpenItemsScope["view"]): OpenItemsScope {
  const input: Record<string, unknown> = { view }
  for (const key of keys) {
    const value = params.get(key)
    if (value) input[key] = key === "page" || key === "pageSize" ? Number(value) : value
  }
  const parsed = openItemsScopeSchema.safeParse(input)
  return parsed.success ? parsed.data : { view }
}

export type OpenItemsActivityPeriod = { start: string; end: string }
export function parseOpenItemsActivity(params: URLSearchParams): OpenItemsActivityPeriod | undefined {
  const start = params.get("activityStart"), end = params.get("activityEnd")
  const valid = (value: string | null): value is string => Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value)
  return valid(start) && valid(end) && start <= end ? { start, end } : undefined
}

export function openItemsHref(locale: "en" | "fr", scope: OpenItemsScope, activity?: OpenItemsActivityPeriod) {
  const params = new URLSearchParams()
  for (const key of keys) if (scope[key] !== undefined && scope[key] !== "") params.set(key, String(scope[key]))
  if (activity) { params.set("activityStart", activity.start); params.set("activityEnd", activity.end) }
  return `/${locale}/dashboard/finance/${scope.view}${params.size ? `?${params}` : ""}`
}

/** Only dashboard routes and allowlisted, validated scope can be returned to. */
export function safeOpenItemsReturn(value: string | null, locale: "en" | "fr") {
  if (!value || value.length > 3000) return undefined
  const [path, query = ""] = value.split("?")
  const view = (["receivables", "payables"] as const).find(view => path === `/${locale}/dashboard/finance/${view}`)
  return view ? openItemsHref(locale, parseOpenItemsScope(new URLSearchParams(query), view), parseOpenItemsActivity(new URLSearchParams(query))) : undefined
}

export function openItemsHistoryHref(locale: "en" | "fr", scope: OpenItemsScope, row?: OpenItemsRow, activity?: OpenItemsActivityPeriod) {
  const params = new URLSearchParams({ returnTo: openItemsHref(locale, scope, activity) })
  if (row) {
    params.set(scope.view === "receivables" ? "customerId" : "supplierId", row.counterpartyId)
    params.set("selected", scope.view === "receivables" ? row.id : `supplier-invoice:${row.id}`)
    if (scope.view === "payables") { params.set("lane", "invoice"); params.set("invoiceId", row.id) }
  }
  return `/${locale}/dashboard/${scope.view === "receivables" ? "finance/receivables" : "purchases/payables"}/history?${params}`
}

export type OpenItemsWorkflowLink = { label: string; href: string }
export function openItemsWorkflowLinks(locale: "en" | "fr", view: OpenItemsScope["view"], permissions: string[], row?: OpenItemsRow): OpenItemsWorkflowLink[] {
  const fr = locale === "fr", root = `/${locale}/dashboard/purchases/payables`
  if (view === "receivables") return row && ["customers.read", "accounting.exports.create"].every(p => hasRbacPermission(permissions, p))
    ? [{ label: fr ? "Contestations et promesses du client" : "Customer disputes and promises", href: `/${locale}/dashboard/customers/${encodeURIComponent(row.counterpartyId)}/statement` }] : []
  const candidates: Array<[string, string, string[]]> = [
    [fr ? "Examiner les factures" : "Review invoices", "/approve", ["purchasing.ap.invoice.post"]],
    [fr ? "Préparer une demande" : "Prepare payment request", "/payments/request", ["purchasing.ap.payment.request"]],
    [fr ? "Approbation indépendante" : "Independent approval", "/payments/approve", ["purchasing.ap.payment.approve"]],
    [fr ? "Exécution des paiements" : "Payment execution", "/payments/record", ["purchasing.ap.payment.release"]],
    [fr ? "Reprise comptable des factures" : "Invoice ledger recovery", "/recovery", ["purchasing.ap.invoice.post"]],
    [fr ? "Reprise des paiements" : "Payment recovery", "/payments/recovery", ["purchasing.ap.payment.release"]],
    [fr ? "Justificatifs de rapprochement" : "Reconciliation evidence", "/payments/reconcile", ["payments.reconciliation.read", "accounting.journal.read"]],
  ]
  return candidates.filter(([, , required]) => required.every(p => hasRbacPermission(permissions, p))).map(([label, path]) => ({ label, href: `${root}${path}` }))
}

export function canOpenItemsHistory(view: OpenItemsScope["view"], permissions: string[]) {
  return hasAnyRbacPermission(permissions, view === "receivables" ? ["finance.receivables.read", "finance.read"] : ["purchasing.ap.invoice.view", "finance.payables.read", "purchases.suppliers.read"])
}
