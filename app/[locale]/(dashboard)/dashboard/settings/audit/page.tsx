import AuditExplorer from "@/components/audit/AuditExplorer"
import { routeByKey, withSettingsSurfaceAccess } from "../settings-route-access"

export default async function AuditExplorerPage({ params }: { params: Promise<{ locale: string }> }) {
  const surface = routeByKey("settings-audit")
  if (!surface) throw new Error("Missing audit route surface")
  return withSettingsSurfaceAccess({ params, surface, onAllowed: async (ctx, locale) => <AuditExplorer key={JSON.stringify([ctx.orgId, ctx.userId, ctx.permissions])} locale={locale} /> })
}
