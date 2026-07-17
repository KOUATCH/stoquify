import { DashboardRouteState } from "@/components/dashboard/DashboardRouteState"
import { EnhancedNotificationTest } from "@/components/notifications/EnhancedNotificationTest"
import { localizePath, pickLocale } from "@/i18n/routing"
import { RbacError, requirePermission } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"

export default async function NotificationsDemoPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: rawLocale } = await params
  const locale = pickLocale(rawLocale)

  try {
    const ctx = await requirePermission("communication.notifications.read", {
      resource: "NotificationSystemDemo",
      auditAllowed: true,
    })
    await observeModuleAccess({
      organizationId: ctx.orgId,
      userId: ctx.userId,
      actorPermissions: ctx.permissions,
      moduleSlug: "settings",
      surfaceType: "page",
      surface: "/dashboard/notifications-demo",
      accessIntent: "read",
      mode: "observe",
    })
  } catch (error) {
    if (error instanceof RbacError) {
      const noActiveOrg = error.code === "NO_ACTIVE_ORG"

      return (
        <DashboardRouteState
          kind={noActiveOrg ? "no_active_org" : "permission_denied"}
          title={noActiveOrg ? "Notification demo needs an active organization" : "Notification demo is not available for this role"}
          message={
            noActiveOrg
              ? "Refresh your session from the dashboard so notification diagnostics can load tenant-scoped settings."
              : "Viewing notification diagnostics requires notification settings read access. The denial was recorded by the RBAC guard."
          }
          primaryHref={localizePath(noActiveOrg ? "/dashboard" : "/dashboard/settings/notifications", locale)}
        />
      )
    }

    throw error
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Notification System Demo</h1>
        <p className="text-muted-foreground mt-2">Test all features of the enhanced notification system</p>
      </div>
      <EnhancedNotificationTest />
    </div>
  )
}