import { MasterDataOnboardingWorkbench } from "@/components/onboarding/MasterDataOnboardingWorkbench"
import { MASTER_DATA_ONBOARDING_TARGET_PERMISSIONS } from "@/config/master-data-onboarding"
import { hasRbacPermission } from "@/lib/security/rbac"
import { getMasterDataOnboardingDashboard } from "@/services/onboarding/master-data-import.service"
import { MASTER_DATA_IMPORT_TARGETS } from "@/services/onboarding/master-data-csv"
import { routeByKey, withSettingsSurfaceAccess } from "../settings-route-access"

const surface = routeByKey("settings-data-onboarding")

export default async function MasterDataOnboardingPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  return withSettingsSurfaceAccess({
    params,
    surface,
    onAllowed: async (ctx) => {
      const allowedTargets = MASTER_DATA_IMPORT_TARGETS.filter((target) =>
        hasRbacPermission(ctx.permissions, MASTER_DATA_ONBOARDING_TARGET_PERMISSIONS[target].read),
      )
      const data = await getMasterDataOnboardingDashboard(ctx.orgId, allowedTargets, ctx.userId)
      const writableTargets = allowedTargets.filter((target) =>
        hasRbacPermission(ctx.permissions, MASTER_DATA_ONBOARDING_TARGET_PERMISSIONS[target].write),
      )
      return <MasterDataOnboardingWorkbench initialData={data} writableTargets={writableTargets} />
    },
  })
}
