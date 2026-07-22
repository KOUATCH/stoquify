import type { Metadata } from "next"

import { getBranchDailyCloseCompletionAction } from "@/actions/end-of-day-close/branch-daily-close-completion.actions"
import {
  BranchDailyCloseWorkspace,
  type BranchDailyCloseWorkspaceModel,
} from "@/components/manager-action-center/BranchDailyCloseWorkspace"
import { localizePath, pickLocale } from "@/i18n/routing"
import { canUsePermission, RbacError, requirePermission } from "@/lib/security/rbac"

export const metadata: Metadata = {
  title: "Branch Daily Close | Kontava",
  description: "Read-only, branch-scoped daily-close evidence for an explicitly selected business date.",
}

type SearchParams = {
  locationId?: string | string[]
  businessDate?: string | string[]
}

export default async function BranchDailyClosePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams?: Promise<SearchParams>
}) {
  const { locale: rawLocale } = await params
  const locale = pickLocale(rawLocale)
  const workspaceHref = localizePath("/dashboard/manager-action-center/daily-close", locale)
  const backHref = localizePath("/dashboard/manager-action-center", locale)
  let ctx: Awaited<ReturnType<typeof requirePermission>>

  try {
    ctx = await requirePermission("dashboard.read", {
      resource: "BranchDailyCloseWorkspace",
      auditAllowed: true,
    })
  } catch (error) {
    if (error instanceof RbacError) {
      return (
        <BranchDailyCloseWorkspace
          locale={locale}
          model={{ kind: "ACCESS_DENIED" }}
          workspaceHref={workspaceHref}
          backHref={backHref}
        />
      )
    }

    throw error
  }

  const query = (await searchParams) ?? {}
  const locationId = firstQueryValue(query.locationId)?.trim() ?? ""
  const businessDate = firstQueryValue(query.businessDate)?.trim() ?? ""
  let model: BranchDailyCloseWorkspaceModel

  if (!locationId) {
    model = { kind: "SELECT_LOCATION" }
  } else if (!businessDate) {
    model = { kind: "SELECT_DATE", locationId }
  } else if (!isCalendarDate(businessDate)) {
    model = { kind: "INVALID_DATE", locationId, businessDate }
  } else {
    const response = await getBranchDailyCloseCompletionAction({
      locationId,
      businessDate,
    })

    model = response.success
      ? {
          kind: "READY",
          data: response.data,
          canStartReview: canUsePermission(ctx, "branch.daily-close.review"),
          canSign: canUsePermission(ctx, "branch.daily-close.sign"),
        }
      : {
          kind: "ERROR",
          errorKind: response.status === 401 || response.status === 403 ? "ACCESS_OR_SCOPE" : "UNAVAILABLE",
          locationId,
          businessDate,
          message: response.error,
        }
  }

  return (
    <BranchDailyCloseWorkspace
      locale={locale}
      model={model}
      workspaceHref={workspaceHref}
      backHref={backHref}
    />
  )
}

function firstQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function isCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}
