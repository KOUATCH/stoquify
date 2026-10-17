"use client"
import { useEffect, useRef, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useLocale, useTranslations } from "next-intl"
import { useClientAuth } from "@/hooks/useClientAuth"
import { useSalesDashboardScope } from "@/hooks/analytics/useSalesDashboardScope"
import { getSalesPerformanceAction, getSalesPerformanceOrderAction } from "@/actions/analytics/sales-performance.actions"
import { formatSalesDecimal, type PerformanceScope } from "@/lib/analytics/sales-performance-scope"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import SalesInsightsPanels from "./SalesInsightsPanels"
import SalesAttentionQueue from "./SalesAttentionQueue"
import SalesPerformanceExport from "./SalesPerformanceExport"
import SalesRecordsTable from "./SalesRecordsTable"
import { analyticsContentClass, analyticsControlClass, analyticsMutedTextClass, analyticsPageClass, analyticsPanelClass } from "./dashboard/analytics-dashboard-theme"

export default function SalesPerformanceDashboard() {
  const auth = useClientAuth(), t = useTranslations("salesPerformance"), locale = useLocale()
  const queryClient = useQueryClient()
  const state = useSalesDashboardScope(auth.organizationId), scope = state.scope as PerformanceScope
  const identity = `${auth.user?.id}:${auth.organizationId}`
  const [detail, setDetail] = useState<{ identity: string; id: string } | null>(null)
  const opener = useRef<HTMLButtonElement | null>(null), recordsHeading = useRef<HTMLHeadingElement | null>(null)
  const query = useQuery({ queryKey: ["sales-performance", identity, scope], enabled: Boolean(auth.user?.id && auth.organizationId) && !state.invalid, retry: false, staleTime: 30_000,
    queryFn: async () => { const result = await getSalesPerformanceAction({ ...scope, organizationId: auth.organizationId }); if (!result.success) throw Object.assign(new Error(result.error), { code: result.code }); return result.data } })
  const orderId = detail?.identity === identity ? detail.id : undefined
  const orderQuery = useQuery({ queryKey: ["sales-performance-order", identity, orderId], enabled: Boolean(orderId && auth.user?.id && auth.organizationId), retry: false, staleTime: 0,
    queryFn: async () => { const result = await getSalesPerformanceOrderAction({ organizationId: auth.organizationId, orderId: orderId! }); if (!result.success) throw new Error(result.error); return result.data } })
  const data = !query.error && !state.invalid ? query.data : undefined
  const pageScope = JSON.stringify([identity, { ...scope, cursor: undefined }])
  const [pageTrail, setPageTrail] = useState<{ key: string; previous: Record<string, string | undefined> }>({ key: "", previous: {} })
  const previousPages = pageTrail.key === pageScope ? pageTrail.previous : {}
  const canPrevious = Boolean(scope.cursor && Object.prototype.hasOwnProperty.call(previousPages, scope.cursor))
  const focusRecords = useRef(false)
  useEffect(() => { if (data && focusRecords.current) { focusRecords.current = false; recordsHeading.current?.focus(); recordsHeading.current?.scrollIntoView({ block: "center" }) } }, [data])
  const order = !orderQuery.error ? orderQuery.data : undefined
  const change = (patch: PerformanceScope) => state.write({ ...scope, cursor: undefined, ...patch })
  const format = (value: string | null | undefined) => value == null ? t("unavailable") : formatSalesDecimal(value, locale)
  const money = (value: string | null | undefined, currency = data?.currency) => value == null ? t("unavailable") : `${format(value)} ${currency}`
  const time = (value: string, timezone = data?.timezone) => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: timezone }).format(new Date(value))
  const openDay = (date: string) => change({ preset: "custom", start: date, end: date, search: undefined })
  const denied = query.error && "code" in query.error && ["FORBIDDEN", "UNAUTHENTICATED"].includes(String(query.error.code))
  // Only normalized chart coordinates use Number; displayed money stays decimal text.
  const amounts = data?.trend.map(row => BigInt(row.value.replace(".", ""))) ?? []
  const min = amounts.reduce((a, b) => a < b ? a : b, BigInt(0)), max = amounts.reduce((a, b) => a > b ? a : b, BigInt(0))
  const points = data?.trend.map((row, i) => ({ ...row, x: 20 + i * 660 / Math.max(data.trend.length - 1, 1), y: max === min ? 160 : 160 - Number((amounts[i] - min) * BigInt(14000) / (max - min)) / 100 })) ?? []
  return <main className={analyticsPageClass} aria-busy={query.isFetching}>
    <div className={analyticsContentClass}>
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-semibold">{t("performance")}</h1><p className={analyticsMutedTextClass}>{t("description")}</p></div>
        <Button className="dashboard-button-secondary" variant="outline" disabled={query.isFetching || state.invalid || !auth.user?.id || !auth.organizationId} onClick={() => { if (scope.cursor) change({}); else void query.refetch() }}>{t("refresh")}</Button></div>
      <div className="flex flex-wrap gap-2" aria-label={t("periods")} role="group">{(["today", "yesterday", "7d", "month"] as const).map(preset => <Button key={preset} variant="outline" className="dashboard-button-secondary" aria-pressed={(scope.preset ?? "7d") === preset} onClick={() => change({ preset, start: undefined, end: undefined })}>{t(preset)}</Button>)}</div>
      <form key={state.search + identity + Boolean(data)} className={analyticsPanelClass + " grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4"} onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); change({ preset: "custom", start: String(form.get("start")), end: String(form.get("end")), locationId: String(form.get("locationId")) || undefined, status: (String(form.get("status")) || undefined) as PerformanceScope["status"], channel: (String(form.get("channel")) || undefined) as PerformanceScope["channel"] }) }}>
        <label className="min-w-0 text-sm">{t("start")}<Input className={analyticsControlClass} type="date" name="start" required defaultValue={scope.start ?? data?.scope.start} key={scope.start ?? data?.scope.start ?? "start"} /></label>
        <label className="min-w-0 text-sm">{t("end")}<Input className={analyticsControlClass} type="date" name="end" required defaultValue={scope.end ?? data?.scope.end} key={scope.end ?? data?.scope.end ?? "end"} /></label>
        <label className="min-w-0 text-sm">{t("location")}<select className={analyticsControlClass + " h-10 w-full"} name="locationId" defaultValue={scope.locationId ?? ""}><option value="">{t("allLocations")}</option>{scope.locationId && !data?.locations.some(location => location.id === scope.locationId) && <option value={scope.locationId}>{t("unavailable")}</option>}{data?.locations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label>
        <label className="min-w-0 text-sm">{t("status")}<select className={analyticsControlClass + " h-10 w-full"} name="status" defaultValue={scope.status ?? ""}><option value="">{t("bothStatuses")}</option>{["COMPLETED", "DELIVERED"].map(value => <option key={value} value={value}>{t(value)}</option>)}</select></label>
        <label className="min-w-0 text-sm">{t("channel")}<select className={analyticsControlClass + " h-10 w-full"} name="channel" defaultValue={scope.channel ?? ""}><option value="">{t("allChannels")}</option>{["POS", "DELIVERY"].map(value => <option key={value} value={value}>{t(value)}</option>)}</select></label>
        <Button type="submit" disabled={query.isPending} variant="outline" className="dashboard-button-secondary self-end">{t("apply")}</Button><p className={analyticsMutedTextClass + " text-xs sm:col-span-2"}>{t("rangeHelp")}</p>
      </form>
      {!auth.isLoading && (!auth.user?.id || !auth.organizationId) && <p role="status">{t("organizationRequired")}</p>}
      {state.invalid && <p role="alert">{t("invalid")}</p>}
      {query.isPending && !state.invalid && auth.user?.id && auth.organizationId && <p role="status">{t("loading")}</p>}
      {query.error && <p role="alert">{t(denied ? "denied" : "failed")}</p>}
      {(state.invalid || query.error) && <Button className="dashboard-button-secondary" variant="outline" onClick={() => state.write({})}>{t("reset")}</Button>}
      {data && <>
        {query.isFetching && <p role="status">{t("refreshing")}</p>}
        <div className={analyticsMutedTextClass + " space-y-1 text-sm"}><p>{data.timezone} · {data.currency} · {t("checked", { time: time(data.checkedAt) })}</p>
          <p>{t("window", { start: time(data.period.start), end: time(data.period.endExclusive) })} {data.period.partial && t("partial")}</p>
          <p>{data.period.previousEndExclusive ? t("comparisonWindow", { start: time(data.period.previousStart), end: time(data.period.previousEndExclusive) }) : t("comparisonUnavailable")}</p></div>
        <details className={analyticsMutedTextClass + " text-sm"}><summary className="cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--dash-brand)]">{t("basis")}</summary><p className="mt-2">{t("meaning")}</p><p className="mt-2">{t("coverage")}</p></details>
        <div className="grid gap-3 sm:grid-cols-3">{(["value", "count", "average"] as const).map(metric => <Card className={analyticsPanelClass} key={metric}><CardContent className="p-4"><p className={analyticsMutedTextClass}>{t(metric)}</p>
          <p className="my-2 break-words text-xl font-semibold tabular-nums">{metric === "count" ? format(data.current[metric]) : money(data.current[metric])}</p>
          <p className="text-sm">{t("change", { absolute: metric === "count" ? format(data.changes[metric].absolute) : money(data.changes[metric].absolute), percent: data.changes[metric].percent === null ? t("unavailable") : format(data.changes[metric].percent) + "%" })}</p>
          <Button variant="link" className="px-0 text-[var(--dash-brand-strong)]" onClick={() => { if (scope.search || scope.cursor) { focusRecords.current = true; change({ search: undefined }) } else { recordsHeading.current?.focus(); recordsHeading.current?.scrollIntoView({ block: "center" }) } }}>{t("inspect")}</Button>
        </CardContent></Card>)}</div>
        {data.current.count === "0" && <p role="status">{t("empty")}</p>}
        {data.canExport && <SalesPerformanceExport key={"export:" + identity + JSON.stringify(scope)} scope={{ ...scope, organizationId: auth.organizationId }} onReport={async report => { await queryClient.cancelQueries({ queryKey: ["sales-performance", identity, scope], exact: true }); queryClient.setQueryData(["sales-performance", identity, scope], { ...report, canExport: true }) }} />}
        <SalesAttentionQueue key={"attention:" + identity + JSON.stringify({ ...scope, search: undefined, cursor: undefined })} scope={{ ...scope, organizationId: auth.organizationId }} identity={identity} revision={data.checkedAt} location={data.locations.find(row => row.id === scope.locationId)?.name ?? t("allLocations")} />
        <section className={analyticsPanelClass + " p-4 space-y-3"} aria-label={t("trend")}><h2 className="font-semibold">{t("trend")}</h2><p className={analyticsMutedTextClass + " text-sm"}>{t("trendSummary", { count: format(data.current.count), value: money(data.current.value), days: data.trend.length })}</p>
          <svg viewBox="0 0 700 190" className="w-full max-h-64" role="group" aria-label={t("trendChart")}><title>{t("trendChart")}</title><text x="20" y="12" fontSize="11" fill="var(--dash-text-muted)">{money(data.trend.reduce((highest, day) => BigInt(day.value.replace(".", "")) > BigInt(highest.replace(".", "")) ? day.value : highest, "0.00"))}</text><text x="20" y="185" fontSize="11" fill="var(--dash-text-muted)">{data.scope.start}</text>{data.scope.end !== data.scope.start && <text x="680" y="185" textAnchor="end" fontSize="11" fill="var(--dash-text-muted)">{data.scope.end}</text>}<desc>{t("tableHelp")}</desc><polyline fill="none" stroke="var(--dash-brand-strong)" strokeWidth="3" points={points.map(point => `${point.x},${point.y}`).join(" ")} />{points.map(point => <g key={point.date} role="button" tabIndex={0} aria-label={`${point.date}: ${money(point.value)}`} onClick={() => openDay(point.date)} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openDay(point.date) } }} className="cursor-pointer focus:outline focus:outline-2 focus:outline-[var(--dash-brand)]"><circle cx={point.x} cy={point.y} r="12" fill="transparent" /><circle cx={point.x} cy={point.y} r="4" fill="var(--dash-brand-strong)" /><title>{point.date}: {money(point.value)}</title></g>)}</svg>
          <p className={analyticsMutedTextClass + " text-xs"}>{t("tableHelp")}</p>
          <details><summary className="cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--dash-brand)]">{t("trendTable")}</summary><div className="dashboard-table-shell max-h-80 overflow-auto rounded-lg" tabIndex={0} role="region" aria-label={t("trendTable")}><table className="dashboard-data-table w-full text-sm"><thead><tr><th scope="col" className="text-left">{t("date")}</th><th scope="col">{t("value")}</th><th scope="col">{t("count")}</th></tr></thead><tbody>{data.trend.map(day => <tr key={day.date}><td><Button variant="link" className="text-[var(--dash-brand-strong)]" onClick={() => openDay(day.date)}>{day.date}</Button></td><td className="text-center tabular-nums">{money(day.value)}</td><td className="text-center">{format(day.count)}</td></tr>)}</tbody></table></div></details>
        </section>
        <section className={analyticsPanelClass + " p-4 space-y-3"}><h2 ref={recordsHeading} tabIndex={-1} className="font-semibold focus-visible:ring-2 focus-visible:ring-[var(--dash-brand)]">{t("records")}</h2><p className={analyticsMutedTextClass + " text-xs"}>{t("livePages")}</p>
          <SalesRecordsTable data={data} search={scope.search ?? ""} pageSize={Number(scope.pageSize ?? 25)} pending={query.isFetching}
            canFirst={Boolean(scope.cursor)} canPrevious={canPrevious}
            onSearch={search => { focusRecords.current = true; change({ search: search || undefined }) }}
            onPageSize={pageSize => { focusRecords.current = true; change({ pageSize }) }}
            onFirst={() => { focusRecords.current = true; change({}) }}
            onPrevious={() => { if (scope.cursor && canPrevious) { focusRecords.current = true; change({ cursor: previousPages[scope.cursor] }) } }}
            onNext={() => { if (data.nextCursor) { focusRecords.current = true; setPageTrail({ key: pageScope, previous: { ...previousPages, [data.nextCursor]: scope.cursor } }); change({ cursor: data.nextCursor }) } }}
            onOpen={(id, button) => { opener.current = button; setDetail({ identity, id }) }} money={money} time={time} />
        </section>
        <SalesInsightsPanels key={"insights:" + identity + JSON.stringify({ ...scope, search: undefined, cursor: undefined })} scope={{ ...scope, organizationId: auth.organizationId }} identity={identity} revision={data.checkedAt} />
      </>}
      <Dialog open={Boolean(orderId)} onOpenChange={open => { if (!open) setDetail(null) }}><DialogContent className={analyticsPanelClass + " max-h-[85vh] overflow-y-auto"} closeLabel={t("close")} onCloseAutoFocus={event => {
        event.preventDefault()
        // Table cells can remount while the independently fetched detail is open.
        const trigger = opener.current?.isConnected ? opener.current : opener.current?.id ? document.getElementById(opener.current.id) : null
        ;(trigger ?? recordsHeading.current)?.focus()
      }}><DialogTitle>{order?.number ?? t("detail")}</DialogTitle><DialogDescription>{t("detailMeaning")}</DialogDescription>
        {orderQuery.isPending && <p role="status">{t("loading")}</p>}{orderQuery.error && <p role="alert">{t("detailFailed")}</p>}
        {order && <><p>{time(order.date, order.timezone)} · {order.timezone}</p><p>{t(order.status)} · {t(order.channel)} · {t("payment." + order.paymentStatus)}</p><p>{order.customer ?? t("restrictedCustomer")}</p><dl className="space-y-2">{Object.entries(order.amounts).map(([key, value]) => <div key={key} className="flex justify-between gap-3"><dt>{t("amount." + key)}</dt><dd className="tabular-nums">{money(value, order.currency)}</dd></div>)}</dl></>}
      </DialogContent></Dialog>
    </div>
  </main>
}
