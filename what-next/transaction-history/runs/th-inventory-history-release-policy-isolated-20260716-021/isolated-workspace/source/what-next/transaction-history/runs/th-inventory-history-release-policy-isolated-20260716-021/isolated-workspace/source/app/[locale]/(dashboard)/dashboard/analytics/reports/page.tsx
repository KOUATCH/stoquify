import ReportsClient from "./ReportsClient"

import { requirePermission } from "@/lib/security/rbac"

type SearchParams = Record<string, string | string[] | undefined>

function firstParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0]
  return value
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>
}) {
  const ctx = await requirePermission("reports.read", { resource: "AnalyticsReports" })
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
}
