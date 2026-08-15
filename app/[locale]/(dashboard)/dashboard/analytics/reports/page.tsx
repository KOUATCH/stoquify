import type { Metadata } from "next"

import ReportsClient from "./ReportsClient"

import { routeByKey, withAnalyticsSurfaceAccess } from "../analytics-route-access"

type SearchParams = Record<string, string | string[] | undefined>

function firstParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0]
  return value
}

export const metadata: Metadata = {
  title: "Analytics Reports | Stoquify",
  description: "Server-owned analytics and reporting exports with tenant-scoped guard and search params.",
}

export default async function ReportsPage({
  params = Promise.resolve({ locale: "en" }),
  searchParams,
}: {
  params?: Promise<{ locale: string }>
  searchParams?: Promise<SearchParams>
}) {
  const surface = routeByKey("analytics-reports")

  if (!surface) {
    throw new Error("Missing analytics route surface definition: analytics-reports")
  }

  return withAnalyticsSurfaceAccess({
    params,
    surface,
    onAllowed: async (ctx, locale) => {
      const resolvedSearchParams = searchParams ? await searchParams : {}

      return (
        <ReportsClient
          organizationId={ctx.orgId}
          locationId={firstParam(resolvedSearchParams.locationId) || "all"}
          initialReport={firstParam(resolvedSearchParams.report)}
          initialPeriod={firstParam(resolvedSearchParams.period)}
          focusItemId={firstParam(resolvedSearchParams.itemId)}
        />
      )
    },
  })
}
