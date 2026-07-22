import { APHistoryWorkbench } from "@/components/purchasing/APHistoryWorkbench"
import { requirePermission } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"

export const metadata = {
  title: "Supplier AP history | Stoquify",
  description: "Supplier invoice, payment, payable movement, and AP proof history.",
}

export default async function SupplierAPHistoryPage() {
  const ctx = await requirePermission("purchasing.ap.invoice.view", {
    resource: "SupplierAPHistory",
  })
  await observeModuleAccess({
    organizationId: ctx.orgId,
    userId: ctx.userId,
    actorPermissions: ctx.permissions,
    moduleSlug: "purchasing",
    surfaceType: "page",
    surface: "app/[locale]/(dashboard)/dashboard/purchases/payables/history/page.tsx",
    accessIntent: "read",
    mode: "enforce",
    audit: true,
  })

  return <APHistoryWorkbench />
}
