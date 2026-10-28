import type { ReactNode } from "react"

import { DashboardRouteState } from "@/components/dashboard/DashboardRouteState"
import { TenantModuleActivationButton } from "@/components/modules/TenantModuleActivationButton"
import { localizePath, pickLocale } from "@/i18n/routing"
import { RbacError } from "@/lib/security/rbac"
import type { Locale } from "@/types/bilingual"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { getFinanceRouteSurface, type FinanceRouteSurface, type FinanceRouteSurfaceModule } from "./finance-route-data-access"

import { requireAnyPermission } from "@/lib/security/rbac"

type FinanceRouteContext = Awaited<ReturnType<typeof requireAnyPermission>>

type FinanceRouteAccessResult =
  | {
      kind: "blocked"
      node: ReactNode
    }
  | {
      kind: "allowed"
      context: FinanceRouteContext
      locale: Locale
    }

const NO_ACTIVE_ORG_TITLE_SUFFIX = "needs an active organization"
const PERMISSION_DENIED_TITLE_SUFFIX = "is not available for this role"
const NO_ACTIVE_ORG_MESSAGE =
  "Refresh your session from the dashboard so this finance surface can load tenant-scoped data."
const PERMISSION_DENIED_MESSAGE =
  "This finance surface is read-only, but it still requires the matching finance permission. The denial was recorded by the RBAC guard."
const DEFAULT_MODULE_LOCKED_TITLE_SUFFIX = "is not enabled for this tenant"
const DEFAULT_MODULE_LOCKED_MESSAGE =
  "This workflow is protected by the payment reconciliation module entitlement. Enable the module before relying on cash, bank, card, or mobile-money reconciliation results here."

const FINANCE_ROUTE_STATE_COPY = {
  en: {
    backToDashboard: "Back to dashboard",
    moduleLockedEyebrow: "Module locked",
    permissionDeniedEyebrow: "Permission required",
    reconciliationLockedTitle: "Payment reconciliation is not enabled for this tenant",
    reconciliationLockedMessage:
      "Enable the payment reconciliation module so cash, bank, card, or mobile-money reconciliation results can be validated by this surface.",
    reconciliationDeniedTitle: "Payment reconciliation is not available for this role",
    permissionDeniedMessage: PERMISSION_DENIED_MESSAGE,
  },
  fr: {
    backToDashboard: "Retour au tableau de bord",
    moduleLockedEyebrow: "Module verrouillé",
    permissionDeniedEyebrow: "Autorisation requise",
    reconciliationLockedTitle: "Le rapprochement des paiements n’est pas activé pour ce locataire",
    reconciliationLockedMessage:
      "Activez le module de rapprochement des paiements afin de valider ici les résultats liés aux espèces, aux banques, aux cartes et au mobile money.",
    reconciliationDeniedTitle: "Le rapprochement des paiements n’est pas accessible à ce rôle",
    permissionDeniedMessage:
      "Cette surface financière est en lecture seule, mais elle exige toujours l’autorisation financière correspondante. Le refus a été enregistré par le contrôle RBAC.",
  },
} as const

const MODULE_ACTIVATION_COPY = {
  en: {
    button: "Enable reconciliation",
    pending: "Enabling…",
    confirm:
      "Enable Payment Reconciliation and any missing required Finance or Accounting modules for this tenant? This access change will be audit logged.",
    success: "Reconciliation enabled. Reloading the workbench…",
    error: "Reconciliation could not be enabled.",
    freshAuthRequired: "Confirm your current password to authorize this module access change.",
    passwordLabel: "Current password",
    verifyAndEnable: "Verify and enable",
  },
  fr: {
    button: "Activer le rapprochement",
    pending: "Activation…",
    confirm:
      "Activer le rapprochement des paiements ainsi que les modules Finance ou Comptabilité requis et manquants pour ce locataire ? Cette modification d’accès sera journalisée.",
    success: "Rapprochement activé. Rechargement de l’espace de travail…",
    error: "Le rapprochement n’a pas pu être activé.",
    freshAuthRequired: "Confirmez votre mot de passe actuel pour autoriser cette modification d’accès.",
    passwordLabel: "Mot de passe actuel",
    verifyAndEnable: "Vérifier et activer",
  },
} as const

function getModuleRequirements(surface: FinanceRouteSurface): FinanceRouteSurfaceModule[] {
  if (surface.modules && surface.modules.length > 0) return surface.modules
  return surface.module ? [surface.module] : []
}

async function evaluateFinanceRouteAccess(
  surface: FinanceRouteSurface,
  localePromise: Promise<{ locale: string }>,
): Promise<FinanceRouteAccessResult> {
  const { locale: rawLocale } = await localePromise
  const locale = pickLocale(rawLocale)
  const routeStateCopy = FINANCE_ROUTE_STATE_COPY[locale]
  const isReconciliationSurface = surface.key === "finance-reconciliation"

  let context: FinanceRouteContext

  try {
    context = await requireAnyPermission(surface.permissions, { resource: surface.resource })
  } catch (error) {
    if (error instanceof RbacError) {
      const noActiveOrg = error.code === "NO_ACTIVE_ORG"

      return {
        kind: "blocked",
        node: (
          <DashboardRouteState
            kind={noActiveOrg ? "no_active_org" : "permission_denied"}
            eyebrow={!noActiveOrg ? routeStateCopy.permissionDeniedEyebrow : undefined}
            title={
              noActiveOrg
                ? `${surface.title} ${NO_ACTIVE_ORG_TITLE_SUFFIX}`
                : isReconciliationSurface
                  ? routeStateCopy.reconciliationDeniedTitle
                  : `${surface.title} ${PERMISSION_DENIED_TITLE_SUFFIX}`
            }
            message={noActiveOrg ? NO_ACTIVE_ORG_MESSAGE : routeStateCopy.permissionDeniedMessage}
            primaryHref={localizePath("/dashboard", locale)}
            primaryLabel={routeStateCopy.backToDashboard}
          />
        ),
      }
    }

    throw error
  }

  const modules = getModuleRequirements(surface)

  for (const moduleRequirement of modules) {
    const decision = await observeModuleAccess({
      organizationId: context.orgId,
      userId: context.userId,
      actorPermissions: context.permissions,
      moduleSlug: moduleRequirement.moduleSlug,
      surfaceType: "page",
      surface: moduleRequirement.surface,
      accessIntent: moduleRequirement.accessIntent ?? "read",
      mode: "enforce",
      audit: true,
    })

    if (!decision.allowed) {
      const canManageModules = context.permissions.includes("MANAGE_SYSTEM_SETTINGS") || context.permissions.includes("*")
      const activationAction =
        canManageModules && moduleRequirement.moduleSlug === "payment_reconciliation" ? (
          <TenantModuleActivationButton
            moduleSlug="payment_reconciliation"
            labels={MODULE_ACTIVATION_COPY[locale]}
          />
        ) : undefined

      return {
        kind: "blocked",
        node: (
          <DashboardRouteState
            kind="locked_module"
            eyebrow={routeStateCopy.moduleLockedEyebrow}
            title={
              isReconciliationSurface
                ? routeStateCopy.reconciliationLockedTitle
                : moduleRequirement.moduleLockedTitle ?? `${surface.title} ${DEFAULT_MODULE_LOCKED_TITLE_SUFFIX}`
            }
            message={
              isReconciliationSurface
                ? routeStateCopy.reconciliationLockedMessage
                : moduleRequirement.moduleLockedMessage ?? DEFAULT_MODULE_LOCKED_MESSAGE
            }
            primaryHref={localizePath("/dashboard", locale)}
            primaryLabel={routeStateCopy.backToDashboard}
            actions={activationAction}
          />
        ),
      }
    }
  }

  return {
    kind: "allowed",
    context,
    locale,
  }
}

export async function withFinanceSurfaceAccess({
  params,
  surface,
  onAllowed,
}: {
  params: Promise<{ locale: string }>
  surface: FinanceRouteSurface
  onAllowed: (context: FinanceRouteContext, locale: Locale) => Promise<ReactNode> | ReactNode
}) {
  const state = await evaluateFinanceRouteAccess(surface, params)

  if (state.kind === "blocked") {
    return state.node
  }

  return onAllowed(state.context, state.locale)
}

export function routeByKey(key: string) {
  return getFinanceRouteSurface(key)
}
