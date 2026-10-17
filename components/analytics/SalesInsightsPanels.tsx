"use client"
import { useState, type ReactNode } from "react"
import { useSalesInsight as useInsight } from "@/hooks/analytics/useSalesInsight"
import { useLocale, useTranslations } from "next-intl"
import { getSalesCollectionsAction, getSalesReceivablesAction, getSalesProductsAction } from "@/actions/analytics/sales-insights.actions"
import { formatSalesDecimal, type PerformanceScope } from "@/lib/analytics/sales-performance-scope"
import { Button } from "@/components/ui/button"
import { getCoreRowModel, getPaginationRowModel, useReactTable } from "@tanstack/react-table"
import { DataTableSearch } from "@/components/DataTableComponents/DataTableSearch"
import { DataTablePagination } from "@/components/DataTableComponents/DataTablePagination"
import { analyticsControlClass, analyticsMutedTextClass, analyticsPanelClass } from "./dashboard/analytics-dashboard-theme"

function compareDecimal(a: string, b: string) {
  const scaled = (value: string) => { const [whole, decimal = ""] = value.split("."); return BigInt(whole + decimal.padEnd(3, "0")) }
  const left = scaled(a), right = scaled(b)
  return left === right ? 0 : left < right ? -1 : 1
}
export default function SalesInsightsPanels({ scope, identity, revision }: { scope: PerformanceScope; identity: string; revision: string }) {
  const t = useTranslations("salesInsights"), locale = useLocale()
  const population = { ...scope, search: undefined, cursor: undefined }
  const collections = useInsight("collections", getSalesCollectionsAction, population, identity, revision)
  const receivables = useInsight("receivables", getSalesReceivablesAction, population, identity, revision)
  const products = useInsight("products", getSalesProductsAction, population, identity, revision)
  const [sort, setSort] = useState("value"), [unit, setUnit] = useState(""), [page, setPage] = useState(0)
  const [productSearch, setProductSearch] = useState(""), [pageSize, setPageSize] = useState(25)
  const format = (amount: string | null | undefined) => amount == null ? t("unavailable") : formatSalesDecimal(amount, locale)
  const money = (amount: string | null | undefined, currency: string) => amount == null ? t("unavailable") : `${format(amount)} ${currency}`
  const checked = (date: string, timezone: string) => t("checked", { time: new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: timezone }).format(new Date(date)), timezone })
  const c = !collections.error && collections.data?.state === "ready" ? collections.data.report : null
  const r = !receivables.error && receivables.data?.state === "ready" ? receivables.data.report : null
  const p = !products.error && products.data?.state === "ready" ? products.data.report : null
  const units = [...new Map(p?.rows.flatMap(row => row.unit ? [[row.unit.id, row.unit] as const] : []) ?? []).values()]
  const search = productSearch.trim().toLocaleLowerCase(locale)
  const filtered = p?.rows.filter(row => (!unit || row.unit?.id === unit) && (!search || [row.name, row.nameFr, row.sku].some(value => value?.toLocaleLowerCase(locale).includes(search)))) ?? []
  const canSortQuantity = filtered.length > 0 && filtered.every(row => row.unit && row.unit.id === filtered[0].unit?.id)
  const sorted = [...filtered].sort((a, b) => compareDecimal(b[sort === "quantity" && canSortQuantity ? "quantity" : "value"], a[sort === "quantity" && canSortQuantity ? "quantity" : "value"]) || a.id.localeCompare(b.id))
  const currentPage = Math.min(page, Math.max(0, Math.ceil(sorted.length / pageSize) - 1))
  const productTable = useReactTable({
    data: sorted, columns: [],
    state: { pagination: { pageIndex: currentPage, pageSize } },
    onPaginationChange: updater => {
      const next = typeof updater === "function" ? updater({ pageIndex: currentPage, pageSize }) : updater
      setPage(next.pageSize === pageSize ? next.pageIndex : 0)
      setPageSize(next.pageSize)
    },
    autoResetPageIndex: false,
    getCoreRowModel: getCoreRowModel(), getPaginationRowModel: getPaginationRowModel(),
  })
  const link = (path: string, label: string) => <a className="inline-flex min-h-10 items-center text-sm text-[var(--dash-brand-strong)] underline focus-visible:ring-2 focus-visible:ring-[var(--dash-brand)]" href={`/${locale}${path}`}>{label}</a>
  function panel(title: string, query: { isFetching: boolean; isPending: boolean; error: unknown; data?: { state: string }; refetch: () => unknown }, content: ReactNode) {
    return <section id={title === "products" ? "sales-products" : undefined} className={analyticsPanelClass + " p-4 space-y-3 min-w-0"} aria-label={t(title)} aria-busy={query.isFetching}>
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">{t(title)}</h2><Button variant="outline" className="dashboard-button-secondary" disabled={query.isFetching} onClick={() => void query.refetch()}>{t("refresh")}</Button></div>
      {query.isPending ? <p role="status">{t("loading")}</p> : query.error ? <p role="alert">{t("failed")}</p> : query.data?.state === "restricted" ? <p>{t("restricted")}</p> : <>{query.isFetching && <p role="status">{t("refreshing")}</p>}{content}</>}
    </section>
  }
  return <>
    <div className="grid gap-4 xl:grid-cols-2">
      {panel("collections", collections, c && <>
        <p className={analyticsMutedTextClass + " text-sm"}>{t("collectionsBasis", { start: c.start, end: c.end })}</p>
        <p className={analyticsMutedTextClass + " text-xs"}>{checked(c.checkedAt, c.timezone)}</p>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">{(["receipts", "refunds", "reversals", "net"] as const).map(key => <div key={key}><dt className="text-sm">{t(key)}</dt><dd className="text-lg font-semibold tabular-nums">{money(c[key], c.currency)}</dd></div>)}</dl>
        <p className={analyticsMutedTextClass + " text-xs"}>{t("collectionsCoverage")}</p>
        <p className="border-t border-[var(--dash-border)] pt-3 text-sm">{t("creditIssued", { amount: money(c.creditIssued, c.currency) })}</p>
        {c.missingTimes > 0 && <p role="status">{t("missingTimes", { count: c.missingTimes })}</p>}
        {!c.methods.length ? <p>{t("noReceipts")}</p> : <div className="dashboard-table-shell overflow-x-auto" role="region" tabIndex={0} aria-label={t("methods")}><table className="dashboard-data-table w-full text-sm"><caption className="text-left py-2">{t("denominator", { amount: money(c.receipts, c.currency) })}</caption><thead><tr><th scope="col" className="text-left">{t("method")}</th><th scope="col">{t("amount")}</th><th scope="col">{t("share")}</th></tr></thead><tbody>{c.methods.map(row => <tr key={row.method}><td className="py-2">{t("paymentMethod." + row.method)}</td><td className="text-center tabular-nums">{money(row.amount, c.currency)}</td><td className="text-center">{row.percent === null ? t("unavailable") : format(row.percent) + "%"}</td></tr>)}</tbody></table></div>}
        {link("/dashboard/finance/payments", t("paymentsLink"))}
      </>)}
      {panel("receivables", receivables, r && <>
        <p className={analyticsMutedTextClass + " text-sm"}>{t("receivablesBasis")}</p>
        <p className={analyticsMutedTextClass + " text-xs"}>{checked(r.checkedAt, r.timezone)}</p>
        {!r.documentCount ? <p role="status">{t("noReceivables")}</p> : r.currencies.map(row => <dl key={row.currency} className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div><dt>{t("outstanding", { count: row.count })}</dt><dd className="text-lg font-semibold tabular-nums">{money(row.outstanding, row.currency)}</dd></div><div><dt>{t("overdue")}</dt><dd className="text-lg font-semibold tabular-nums">{money(row.overdue, row.currency)}</dd></div></dl>)}
        <p className={analyticsMutedTextClass + " text-xs"}>{t("receivablesCoverage")}</p>
        {link("/dashboard/finance/receivables/history", t("receivablesLink"))}
      </>)}
    </div>
    {panel("products", products, p && <>
      <p className={analyticsMutedTextClass + " text-sm"}>{t("productsBasis")}</p>
      <p className={analyticsMutedTextClass + " text-xs"}>{checked(p.checkedAt, p.timezone)} · {t("tieout", { lines: money(p.lineValue, p.currency), orders: money(p.orderValue, p.currency), difference: money(p.orderDifference, p.currency) })}</p>
      <p className={analyticsMutedTextClass + " text-xs"}>{p.stockCheckedAt ? t("stockBasis", { checked: checked(p.stockCheckedAt, p.timezone) }) : t("stockRestricted")}</p>
      <p className={analyticsMutedTextClass + " text-xs"}>{t(p.canReadMargin ? "marginBasis" : "marginRestricted")}</p>
      {!p.rows.length ? <p role="status">{t("noProducts")}</p> : <>
        <div className="dashboard-table-toolbar flex flex-wrap items-end gap-3">
          <div className="w-full sm:max-w-sm"><DataTableSearch value={productSearch} onChange={value => { setProductSearch(value); setPage(0) }} placeholder={t("searchProducts")} clearButtonLabel={t("clearProductSearch")} /></div>
          <label className="text-sm">{t("unitFilter")}<select className={analyticsControlClass + " block h-10"} value={unit} onChange={event => { setUnit(event.target.value); setSort("value"); setPage(0) }}><option value="">{t("allUnits")}</option>{units.map(value => <option key={value.id} value={value.id}>{value.symbol}</option>)}</select></label>
          <label className="text-sm">{t("sort")}<select className={analyticsControlClass + " block h-10"} value={sort === "quantity" && !canSortQuantity ? "value" : sort} onChange={event => { setSort(event.target.value); setPage(0) }}><option value="value">{t("value")}</option><option value="quantity" disabled={!canSortQuantity}>{t("quantity")}</option></select></label></div>
        {!canSortQuantity && <p className={analyticsMutedTextClass + " text-xs"}>{t("quantityHelp")}</p>}
        <p className={analyticsMutedTextClass + " text-xs"}>{t("productSearchHelp", { count: sorted.length })}</p>
        <div className="dashboard-table-shell overflow-x-auto" role="region" tabIndex={0} aria-label={t("products")}><table className="dashboard-data-table w-full text-sm"><thead><tr>{["product", "value", "change", "quantity", ...(p.canReadStock ? ["available", "stockStatus"] : []), ...(p.canReadMargin ? ["contribution", "margin"] : [])].map(key => <th key={key} scope="col" className="text-left p-2">{t(key)}</th>)}</tr></thead>
          <tbody>{productTable.getRowModel().rows.map(({ original: row }) => <tr key={row.id} className="border-t border-[var(--dash-border)]"><td className="p-2">{row.active ? link(`/dashboard/inventory/items/${encodeURIComponent(row.id)}`, locale === "fr" ? row.nameFr ?? row.name : row.name) : <span>{locale === "fr" ? row.nameFr ?? row.name : row.name} · {t("inactive")}</span>}<span className="block text-xs">{row.sku}</span></td><td className="p-2 whitespace-nowrap tabular-nums">{money(row.value, p.currency)}</td><td className="p-2 whitespace-nowrap">{money(row.change.absolute, p.currency)}<span className="block text-xs">{row.change.percent === null ? t("unavailable") : format(row.change.percent) + "%"}</span></td><td className="p-2 whitespace-nowrap">{format(row.quantity)} {row.unit?.symbol ?? t("unknownUnit")}</td>{p.canReadStock && <><td className="p-2 whitespace-nowrap">{format(row.available)} {row.available !== null && (row.unit?.symbol ?? t("unknownUnit"))}</td><td className="p-2">{t("stock." + row.stockStatus)}</td></>}{p.canReadMargin && <><td className="p-2 whitespace-nowrap">{money(row.contribution, p.currency)}</td><td className="p-2">{row.margin === null ? t("unavailable") : format(row.margin) + "%"}{Boolean(row.uncoveredCosts) && <span className="block text-xs">{t("costMissing", { count: row.uncoveredCosts! })}</span>}</td></>}</tr>)}{!sorted.length && <tr><td colSpan={4 + (p.canReadStock ? 2 : 0) + (p.canReadMargin ? 2 : 0)} className="p-6 text-center" role="status">{t("noMatchingProducts")}</td></tr>}</tbody></table></div>
        <DataTablePagination table={productTable} variant="landing" locale={locale === "fr" ? "fr" : "en"} showSelectionCount={false} pageSizeOptions={[10, 25, 50]} copy={{ previousPage: t("previous"), nextPage: t("next") }} />
      </>}
    </>)}
  </>
}
