import type { ReactNode } from "react"

import type {
  CommercialModuleSlug,
  ModuleAccessIntent,
} from "@/services/modules/module-control-contracts"
import { getFinanceRouteSurfaceByResource } from "./finance-route-data-access"
import { withFinanceSurfaceAccess } from "./finance-route-access"
import type { FinanceRouteSurface } from "./finance-route-data-access"
import type { FinanceDashboardView } from "@/services/finance/finance-dashboard.schemas"
import { getFinanceDashboardViewPermissions } from "@/services/finance/finance-dashboard-access"

export type FinanceRouteParams = Promise<{ locale: string }>

export async function FinanceRouteAccess({
  params,
  permissions,
  resource,
  title,
  module,
  children,
}: {
  params: FinanceRouteParams
  permissions: readonly string[]
  resource: string
  title: string
  module?: {
    moduleSlug: CommercialModuleSlug
    surface: string
    accessIntent?: ModuleAccessIntent
  }
  children: ReactNode
}) {
  const catalogSurface = getFinanceRouteSurfaceByResource(resource)

  const surface: FinanceRouteSurface = catalogSurface
    ? {
        ...catalogSurface,
        permissions: catalogSurface.permissions.length ? catalogSurface.permissions : permissions,
        title: catalogSurface.title ?? title,
        modules: catalogSurface.modules,
        module: module
          ? {
              moduleSlug: module.moduleSlug,
              surface: module.surface,
              accessIntent: module.accessIntent,
            }
          : catalogSurface.module,
      }
    : {
        key: `finance-legacy-${resource}`,
        route: "",
        title,
        resource,
        permissions,
        module: module
          ? {
              moduleSlug: module.moduleSlug,
              surface: module.surface,
              accessIntent: module.accessIntent,
            }
          : undefined,
      }

  return withFinanceSurfaceAccess({
    params,
    surface,
    onAllowed: () => children,
  })
}

export function financeViewPermissions(view: FinanceDashboardView) {
  return getFinanceDashboardViewPermissions(view)
}
