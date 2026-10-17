"use client"
import { useLocale, useTranslations } from "next-intl"
import { getSalesCashAttentionAction, getSalesReceivablesAction, getSalesProductsAction } from "@/actions/analytics/sales-insights.actions"
import { useSalesInsight } from "@/hooks/analytics/useSalesInsight"
import { buildSalesAttention, type SalesAttentionFinding } from "@/lib/analytics/sales-attention"
import { formatSalesDecimal, type PerformanceScope } from "@/lib/analytics/sales-performance-scope"
import { ActionQueueItem } from "@/components/dashboard/primitives/command-center-primitives"
import { Button } from "@/components/ui/button"
import { analyticsMutedTextClass, analyticsPanelClass } from "./dashboard/analytics-dashboard-theme"

export default function SalesAttentionQueue({ scope, identity, revision, location }: { scope: PerformanceScope; identity: string; revision: string; location: string }) {
  const t = useTranslations("salesAttention"), locale = useLocale()
  const cash = useSalesInsight("cash-attention", getSalesCashAttentionAction, scope, identity, revision)
  const receivables = useSalesInsight("receivables", getSalesReceivablesAction, scope, identity, revision)
  const products = useSalesInsight("products", getSalesProductsAction, scope, identity, revision)
  // Never retain a finding after its source fails or loses permission.
  const c = !cash.error && cash.data?.state === "ready" ? cash.data.report : undefined
  const r = !receivables.error && receivables.data?.state === "ready" ? receivables.data.report : undefined
  const p = !products.error && products.data?.state === "ready" ? products.data.report : undefined
  const queries = [cash, receivables, products], pending = queries.some(query => query.isPending), refreshing = queries.some(query => query.isFetching)
  const gaps = [!r || !r.documentCount ? "receivablesGap" : null, !c || !c.expectedDays || c.coveredDays < c.expectedDays ? "cashGap" : null,
    !p?.canReadStock || p.rows.some(row => /[1-9]/.test(row.quantity) && row.available === null) ? "stockGap" : null].filter((key): key is string => key !== null)
  const findings = buildSalesAttention({ organizationId: scope.organizationId!, receivables: r, products: p, cash: c })
  const time = (date: string, timezone: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: timezone }).format(new Date(date))
  const item = (row: SalesAttentionFinding) => <ActionQueueItem key={row.id} item={{ id: row.id, title: t(row.kind + "Title", { name: locale === "fr" ? row.nameFr ?? row.name ?? "" : row.name ?? "" }),
    summary: t(row.kind + "Reason", { amount: formatSalesDecimal(row.amount, locale), currency: row.currency ?? "", unit: row.unit ?? t("unknownUnit"), date: row.date ?? "", location: row.location ?? location }),
    tone: "warning", riskLabel: t("finding"), stateLabel: row.kind === "cash" ? t(row.finalized ? "finalized" : "provisional") : undefined,
    metadata: [{ label: t("scope"), value: row.location ?? location }, { label: t(row.kind === "cash" ? "recorded" : "checked"), value: time(row.checkedAt, row.timezone) + " · " + row.timezone }],
    action: { label: t(row.kind + "Link"), href: row.href.startsWith("#") ? row.href : `/${locale}${row.href}` },
  }} />
  return <section className={analyticsPanelClass + " p-4 space-y-3"} aria-label={t("title")}>
    <div className="flex flex-wrap justify-between gap-2"><h2 className="font-semibold">{t("title")}</h2><Button variant="outline" className="dashboard-button-secondary" disabled={refreshing} onClick={() => { for (const query of queries) void query.refetch() }}>{t("refresh")}</Button></div>
    <p className={analyticsMutedTextClass + " text-sm"}>{t("basis", { location })}</p>
    {pending ? <p role="status">{t("loading")}</p> : refreshing && <p role="status">{t("refreshing")}</p>}
    {gaps.length > 0 && <p role="status" className="text-sm">{t("partial")} {gaps.map(key => t(key)).join(" ")}</p>}
    {!pending && !findings.length && <p>{t("empty")}</p>}
    {findings.slice(0, 3).map(item)}
    {findings.length > 3 && <details><summary className="cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--dash-brand)]">{t("more", { count: findings.length - 3 })}</summary><div className="mt-3 space-y-3">{findings.slice(3).map(item)}</div></details>}
    <p className={analyticsMutedTextClass + " text-xs"}>{t("destinations")}</p>
  </section>
}
