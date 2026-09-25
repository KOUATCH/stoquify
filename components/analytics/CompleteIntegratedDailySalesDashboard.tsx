"use client"

import { useEffect, useId, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { BarChart3, RefreshCw } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { useClientAuth } from "@/hooks/useClientAuth"
import { useDailySalesReport } from "@/hooks/analytics/useDailySalesReport"
import type { DailySalesReadModel } from "@/services/analytics/daily-sales-read.service"
import { analyticsContentClass, analyticsControlClass, analyticsMutedTextClass, analyticsPageClass, analyticsPanelClass, analyticsRowClass, analyticsToneClass } from "@/components/analytics/dashboard/analytics-dashboard-theme"

type Props = { organizationId?: string; locationId?: string; date?: Date }

export default function CompleteIntegratedDailySalesDashboard({ organizationId, locationId, date }: Props) {
  const auth = useClientAuth(), locale = useLocale(), t = useTranslations("dailySalesReport")
  const fieldId = useId()
  const orgId = organizationId ?? auth.organizationId
  const identity = (auth.user?.id ?? "") + ":" + (orgId ?? "")
  const [draft, setDraft] = useState<{ identity: string; locationId?: string; date?: string }>({ identity })
  const selected = draft.identity === identity ? draft : undefined
  const query = useDailySalesReport({ userId: auth.user?.id, organizationId: orgId, locationId: selected?.locationId ?? locationId, date: selected?.date ?? date })
  const data = query.data
  const [knownLocations, setKnownLocations] = useState<{ identity: string; rows: DailySalesReadModel["locations"] } | null>(null)
  useEffect(() => { if (data) setKnownLocations({ identity, rows: data.locations }) }, [data, identity])
  const locations = data?.locations ?? (knownLocations?.identity === identity ? knownLocations.rows : [])
  const changeScope = (patch: { locationId?: string; date?: string }) => setDraft(current => ({ ...(current.identity === identity ? current : {}), identity, ...patch }))
  const decimal = (value: string | null | undefined) => {
    const match = value ? /^(-?)(\d+)\.(\d+)$/.exec(value) : null
    if (!match) return t("unavailable")
    const integer = BigInt(match[2]), signed = match[1] ? integer === BigInt(0) ? -0 : -integer : integer
    const separator = new Intl.NumberFormat(locale).formatToParts(1.1).find(part => part.type === "decimal")?.value ?? "."
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(signed) + separator + match[3]
  }
  const money = (value: string | null | undefined) => value === null || value === undefined ? t("unavailable") : decimal(value) + " " + (data?.context.currency.code ?? "")
  const instant = (value: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: data?.context.timezone.iana }).format(new Date(value))
  const errorCode = query.error && "code" in query.error ? String(query.error.code) : ""
  const denied = ["FORBIDDEN", "AUTH_REQUIRED"].includes(errorCode)
  const visible = data && !query.error
  const metrics = visible ? data.metrics : null

  return (
    <main className={analyticsPageClass} aria-busy={query.isFetching || auth.isLoading}>
      <div className={analyticsContentClass}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold"><BarChart3 aria-hidden="true" className="h-5 w-5 text-[var(--dash-brand-strong)]" />{t("title")}</h1>
            <p className={cn("mt-1 text-sm", analyticsMutedTextClass)}>{t("description")}</p>
          </div>
          <Button type="button" variant="outline" className="dashboard-button-secondary" disabled={query.isFetching || !orgId || !auth.user?.id} onClick={() => { void query.refetch() }}><RefreshCw aria-hidden="true" className="mr-2 h-4 w-4" />{t("refresh")}</Button>
        </div>

        <Card className={analyticsPanelClass}>
          <CardContent className="grid gap-4 p-4 sm:grid-cols-2">
            <div className="min-w-0 space-y-1 text-sm"><label htmlFor={fieldId + "-date"}>{t("date")}</label>
              <Input id={fieldId + "-date"} type="date" className={analyticsControlClass} value={selected?.date ?? data?.date ?? ""} onChange={event => changeScope({ date: event.target.value || undefined })} />
            </div>
            <div className="min-w-0 space-y-1 text-sm"><label htmlFor={fieldId + "-location"}>{t("location")}</label>
              <select id={fieldId + "-location"} className={cn(analyticsControlClass, "h-10 w-full px-3")} value={selected?.locationId ?? locationId ?? data?.locationId ?? ""} disabled={!locations.length} onChange={event => changeScope({ locationId: event.target.value })}>
                {!locations.length && <option value="">{t("locationUnavailable")}</option>}
                {locations.map(location => <option key={location.id} value={location.id}>{location.name}{location.retained ? " (" + t("retained") + ")" : ""}</option>)}
              </select>
            </div>
          </CardContent>
        </Card>

        {(auth.isLoading || (query.isPending && orgId && auth.user?.id)) && <div role="status" className="space-y-3"><p>{t("loading")}</p><Skeleton className="h-36 w-full" /></div>}
        {!auth.isLoading && (!orgId || !auth.user?.id) && <p role="status" className={analyticsMutedTextClass}>{t("organizationRequired")}</p>}
        {query.error && <div role="alert" className={cn("rounded-lg border p-4", analyticsToneClass("gold"))}><p className="font-medium">{t(denied ? "denied" : "failed")}</p><p className="mt-1 text-sm">{t(denied ? "deniedHelp" : "retryHelp")}</p></div>}
        {visible && <>
          <div className={cn("flex flex-wrap items-center gap-2 text-sm", analyticsMutedTextClass)}>
            <Badge variant="outline" className={analyticsToneClass("info")}>{t("source." + data.source.kind)}</Badge>
            <span>{t("checkedAt", { time: instant(data.context.generatedAt) })}</span>
            <span>{data.context.timezone.iana} · {data.context.currency.code}</span>
            {data.source.recordedAt && <span>{t("recordedAt", { time: instant(data.source.recordedAt) })}</span>}
            {data.source.finalized !== null && <Badge variant="outline" className={analyticsToneClass("muted")}>{t(data.source.finalized ? "finalized" : "draft")}</Badge>}
          </div>
          <p className={cn("text-sm", analyticsMutedTextClass)}>{t(data.source.kind === "ORDER_AGGREGATION" ? "orderMeaning" : data.source.kind === "STORED_REPORT" ? "savedMeaning" : "noLocations")}</p>
          {metrics && <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                [t(data.source.kind === "ORDER_AGGREGATION" ? "orderValue" : "recordedValue"), money(metrics.value)],
                [t(data.source.kind === "ORDER_AGGREGATION" ? "orderCount" : "recordedCount"), new Intl.NumberFormat(locale).format(metrics.count)],
                [t("quantity"), decimal(metrics.quantity)],
                [t("average"), money(metrics.average)],
              ].map(([label, value]) => <Card key={label} className={analyticsPanelClass}><CardContent className="p-4"><p className={cn("text-sm", analyticsMutedTextClass)}>{label}</p><p className="mt-2 break-words text-xl font-semibold tabular-nums">{value}</p></CardContent></Card>)}
            </div>
            {metrics.count === 0 && <p role="status" className={analyticsMutedTextClass}>{t("empty")}</p>}
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className={analyticsPanelClass}><CardHeader><CardTitle className="text-base">{t("cashTitle")}</CardTitle></CardHeader><CardContent>
                {data.recordedCash ? <dl className="space-y-2">{Object.entries(data.recordedCash).map(([name, value]) => <div key={name} className="flex flex-wrap justify-between gap-2 text-sm"><dt className={analyticsMutedTextClass}>{t("cash." + name)}</dt><dd className="tabular-nums">{money(value)}</dd></div>)}</dl> : <p className={cn("text-sm", analyticsMutedTextClass)}>{t("cashUnavailable")}</p>}
                <p className={cn("mt-3 text-xs", analyticsMutedTextClass)}>{t("cashMeaning")}</p>
              </CardContent></Card>
              <Card className={analyticsPanelClass}><CardHeader><CardTitle className="text-base">{t("topItems")}</CardTitle></CardHeader><CardContent className="space-y-2">
                {data.topItems.length ? data.topItems.map(item => <div key={item.itemId} className={cn(analyticsRowClass, "flex flex-wrap justify-between gap-2 p-3")}><div className="min-w-0"><p className="break-words text-sm font-medium">{(locale.startsWith("fr") ? item.nameFr ?? item.nameEn : item.nameEn ?? item.nameFr) ?? t("unavailable")}</p><p className={cn("text-xs", analyticsMutedTextClass)}>{item.sku ?? t("unavailable")} · {t("itemQuantity", { quantity: decimal(item.quantity) })}</p></div><span className="text-sm tabular-nums">{money(item.value)}</span></div>) : <p className={cn("text-sm", analyticsMutedTextClass)}>{t("noItems")}</p>}
                <p className={cn("text-xs", analyticsMutedTextClass)}>{t("topItemsMeaning")}</p>
              </CardContent></Card>
            </div>
            {data.recordedPayments && <Card className={analyticsPanelClass}><CardHeader><CardTitle className="text-base">{t("paymentsTitle")}</CardTitle></CardHeader><CardContent><dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{Object.entries(data.recordedPayments).map(([name, value]) => <div key={name}><dt className={cn("text-sm", analyticsMutedTextClass)}>{t("payments." + name)}</dt><dd className="mt-1 tabular-nums">{money(value)}</dd></div>)}</dl></CardContent></Card>}
          </>}
        </>}
      </div>
    </main>
  )
}
