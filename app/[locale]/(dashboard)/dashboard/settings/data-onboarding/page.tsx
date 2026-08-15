import { MasterDataOnboardingWorkbench } from "@/components/onboarding/MasterDataOnboardingWorkbench"
import { hasRbacPermission, requireAnyPermission } from "@/lib/security/rbac"
import { getMasterDataOnboardingDashboard } from "@/services/onboarding/master-data-import.service"
import { MASTER_DATA_IMPORT_TARGETS } from "@/services/onboarding/master-data-csv"

const readPermissions = {
  CUSTOMER: "customers.read",
  SUPPLIER: "purchases.suppliers.read",
  ITEM: "inventory.items.read",
} as const

const writePermissions = {
  CUSTOMER: "customers.create",
  SUPPLIER: "purchases.suppliers.create",
  ITEM: "inventory.items.create",
} as const

export default async function MasterDataOnboardingPage() {
  const ctx = await requireAnyPermission(
    Object.values(readPermissions),
    { resource: "MasterDataOnboarding" },
  )
  const allowedTargets = MASTER_DATA_IMPORT_TARGETS.filter((target) =>
    hasRbacPermission(ctx.permissions, readPermissions[target]),
  )
  const data = await getMasterDataOnboardingDashboard(ctx.orgId, allowedTargets)
  const writableTargets = allowedTargets.filter((target) =>
    hasRbacPermission(ctx.permissions, writePermissions[target]),
  )
  return <MasterDataOnboardingWorkbench initialData={data} writableTargets={writableTargets} />
}
