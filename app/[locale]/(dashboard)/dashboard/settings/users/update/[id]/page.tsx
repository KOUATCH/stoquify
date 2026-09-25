import MemberAccessEditor from "@/components/settings/MemberAccessEditor"
import { requirePermission } from "@/lib/security/rbac"
import { routeByKey, withSettingsSurfaceAccess } from "../../../settings-route-access"

export default async function MemberAccessPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const surface = routeByKey("settings-users-update")
  if (!surface) throw new Error("Missing settings member access route")
  return withSettingsSurfaceAccess({ params, surface, onAllowed: async () => {
    const { id, locale } = await params
    const ctx = await requirePermission("users.read", { resource: "User", resourceId: id })
    return <div className="dashboard-landing-theme min-h-screen overflow-x-hidden"><MemberAccessEditor key={`${ctx.orgId}:${ctx.userId}:${id}`} organizationId={ctx.orgId} actorId={ctx.userId} memberId={id} locale={locale === "fr" ? "fr" : "en"} /></div>
  } })
}
