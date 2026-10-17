import DeliveryIssues from "@/components/communication/DeliveryIssues"
import { routeByKey, withSettingsSurfaceAccess } from "../settings-route-access"

export default async function DeliveryIssuesPage({ params }: { params: Promise<{ locale: string }> }) {
  const surface = routeByKey("settings-delivery-issues")
  if (!surface) throw new Error("Missing settings delivery route")
  return withSettingsSurfaceAccess({ params, surface, onAllowed: async (ctx, locale) => <DeliveryIssues key={JSON.stringify([ctx.orgId, ctx.userId, ctx.permissions])} locale={locale} /> })
}
