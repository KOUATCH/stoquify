import type { Metadata } from "next"

import { getPOSActivityDetailAction, listPOSActivityAction } from "@/actions/pos/pos-activity.actions"
import { getPOSActivityAttentionAction } from "@/actions/pos/pos-activity-attention.actions"
import { getPOSActivityShiftSummaryAction } from "@/actions/pos/pos-activity-shift-summary.actions"
import { DashboardRouteState } from "@/components/dashboard/DashboardRouteState"
import { POSActivityAttention } from "@/components/pos/POSActivityAttention"
import { POSActivityShiftSummary } from "@/components/pos/POSActivityShiftSummary"
import { POSActivityView } from "@/components/pos/POSActivityView"
import { posActivityCopy } from "@/components/pos/pos-activity-copy"
import { localizePath, pickLocale } from "@/i18n/routing"
import { posActivityKinds } from "@/services/pos/pos-activity.types"

import { routeByKey, withPosSurfaceAccess } from "../pos-route-access"

export const dynamic = "force-dynamic"

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  return {
    title: posActivityCopy[pickLocale(locale)].historyTitle,
    robots: { index: false, follow: false, nocache: true },
    referrer: "no-referrer",
  }
}

type SearchParams = Record<string, string | string[] | undefined>

export default async function POSActivityPage({ params, searchParams }: {
  params: Promise<{ locale: string }>
  searchParams: Promise<SearchParams>
}) {
  const surface = routeByKey("pos-activity")
  if (!surface) throw new Error("Missing pos route surface definition: pos-activity")

  return withPosSurfaceAccess({
    params,
    surface,
    permissionOptions: { auditAllowed: false },
    onAllowed: async (_context, locale) => {
      const query = await searchParams
      const copy = posActivityCopy[locale]
      const path = localizePath("/dashboard/pos/activity", locale)
      const back = localizePath("/dashboard/pos", locale)
      const invalidFilters = (
        <DashboardRouteState
          kind="empty"
          title={copy.invalidFilters}
          message={copy.invalidFiltersHelp}
          primaryHref={path}
          primaryLabel={copy.resetFilters}
          secondaryHref={back}
          secondaryLabel={copy.back}
          locale={locale}
        />
      )

      const filterNames = ["date", "locationId", "terminalId", "sessionId", "view", "search", "total", "fromTime", "toTime", "cursor"] as const
      if (filterNames.some(name => Array.isArray(query[name]))) return invalidFilters
      const value = (name: string) => typeof query[name] === "string" ? query[name] : undefined
      const scope = (name: string) => value(name) === "" ? null : value(name)
      const view = value("view")
      if (view !== undefined && view !== "all" && view !== "receipts" && view !== "attention") return invalidFilters
      const attentionActive = view === "attention"

      const cursor = value("cursor") || undefined
      const locationId = scope("locationId")
      const terminalId = scope("terminalId")
      const sessionId = scope("sessionId")
      const requestedDate = value("date")
      const result = await listPOSActivityAction({
        date: requestedDate,
        ...(locationId !== undefined && { locationId }),
        ...(terminalId !== undefined && { terminalId }),
        ...(sessionId !== undefined && { sessionId }),
        view: attentionActive ? "all" : view,
        search: attentionActive ? undefined : value("search"),
        total: view === "receipts" ? value("total") || undefined : undefined,
        fromTime: view === "receipts" ? value("fromTime") || undefined : undefined,
        toTime: view === "receipts" ? value("toTime") || undefined : undefined,
        cursor: attentionActive ? undefined : cursor,
      })

      if (!result.success) {
        if (result.status === 400 || result.status === 422) return invalidFilters
        if (result.status === 401 || result.status === 403 || result.status === 404) {
          return (
            <DashboardRouteState kind="permission_denied" title={copy.accessError} message={copy.accessErrorHelp} primaryHref={path} primaryLabel={copy.resetFilters} secondaryHref={back} secondaryLabel={copy.back} locale={locale} />
          )
        }
        const retry = new URLSearchParams()
        for (const name of filterNames) {
          const current = value(name)
          if (current !== undefined) retry.set(name, current)
        }
        return (
          <DashboardRouteState kind="error" title={copy.loadError} message={copy.loadErrorHelp} primaryHref={retry.size > 0 ? `${path}?${retry}` : path} primaryLabel={copy.tryAgain} secondaryHref={back} secondaryLabel={copy.back} locale={locale} />
        )
      }

      const activity = result.data
      if (attentionActive && activity.accessMode !== "manager") {
        return (
          <DashboardRouteState kind="permission_denied" title={copy.accessError} message={copy.accessErrorHelp}
            primaryHref={path} primaryLabel={copy.all} secondaryHref={back} secondaryLabel={copy.back} locale={locale} />
        )
      }
      const activityScope = {
        date: activity.date,
        locationId: activity.filters.locationId,
        terminalId: activity.filters.terminalId,
        sessionId: activity.filters.sessionId,
      }
      const id = value("id")
      const kind = posActivityKinds.find(option => option === value("kind"))
      const [detailResult, summaryResult, attentionResult] = await Promise.all([
        !attentionActive && id && kind ? getPOSActivityDetailAction({ ...activityScope, id, kind }) : null,
        !attentionActive && activity.filters.view === "all" && activityScope.sessionId
          ? getPOSActivityShiftSummaryAction({ ...activityScope, sessionId: activityScope.sessionId }) : null,
        attentionActive ? getPOSActivityAttentionAction({ ...activityScope, cursor }) : null,
      ])

      return (
        <POSActivityView
          locale={locale}
          activity={activity}
          detail={detailResult?.success ? detailResult.data : null}
          detailError={!attentionActive && Boolean(query.id || query.kind) && !detailResult?.success}
          currentCursor={attentionActive ? undefined : cursor}
          shiftSummary={summaryResult?.success && summaryResult.data
            ? <POSActivityShiftSummary summary={summaryResult.data} activity={activity} locale={locale} /> : null}
          attentionActive={attentionActive}
          attention={attentionActive
            ? <POSActivityAttention activity={activity} locale={locale} path={path} attention={attentionResult?.success ? attentionResult.data : null} /> : null}
        />
      )
    },
  })
}
