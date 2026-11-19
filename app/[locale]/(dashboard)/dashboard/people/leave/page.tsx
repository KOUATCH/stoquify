import { HrisLeaveManagementClient } from "@/components/hris/HrisLeaveManagementClient"
import { getManagedLeaveWorkspaceAction } from "@/actions/hris/leave-entitlement.actions"
import { DashboardRouteState } from "@/components/dashboard/DashboardRouteState"
import { pickLocale, localizePath } from "@/i18n/routing"
export default async function LeavePage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ employeeId?: string; requestId?: string }> }) {
  const locale = pickLocale((await params).locale), {employeeId,requestId} = await searchParams
  const result = employeeId ? await getManagedLeaveWorkspaceAction({ employeeId,requestId }) : null
  if (!result?.success) return <DashboardRouteState kind="permission_denied" locale={locale} primaryHref={localizePath("/dashboard/people/manage", locale)} />
  return <HrisLeaveManagementClient initial={result.data} locale={locale} />
}
