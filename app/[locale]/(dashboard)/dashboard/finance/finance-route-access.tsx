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
const PERMISSION_DENIED_MESSAGE =
  "Ask your organization administrator to review your finance access. This access denial has been recorded."
const DEFAULT_MODULE_LOCKED_TITLE_SUFFIX = "is not enabled for this organization"
const DEFAULT_MODULE_LOCKED_MESSAGE =
  "Ask your organization administrator to review the modules required to use this page."

const FINANCE_ROUTE_STATE_COPY = {
  en: {
    backToDashboard: "Back to dashboard",
    moduleLockedEyebrow: "Module locked",
    permissionDeniedEyebrow: "Permission required",
    noActiveOrgTitle: "An active organization is required",
    noActiveOrgMessage: "Refresh your session from the dashboard to load your organization’s financial data.",
    permissionDeniedTitle: "This finance page is not available for your role",
    cashCommandDeniedTitle: "Cash Command Intelligence is not available for this role",
    reconciliationLockedTitle: "Payment reconciliation is not enabled for this organization",
    reconciliationLockedMessage:
      "An administrator must enable payment reconciliation before you can review cash, bank, card or mobile-money reconciliation here.",
    cashDrawerLockedTitle: "Cash drawer is not enabled for this organization",
    cashDrawerLockedMessage:
      "An administrator must enable the cash drawer module before you can view cash movements and payment history.",
    reconciliationDeniedTitle: "Payment reconciliation is not available for this role",
    permissionDeniedMessage: PERMISSION_DENIED_MESSAGE,
  },
  fr: {
    backToDashboard: "Retour au tableau de bord",
    moduleLockedEyebrow: "Module verrouillé",
    permissionDeniedEyebrow: "Autorisation requise",
    noActiveOrgTitle: "Une organisation active est requise",
    noActiveOrgMessage: "Actualisez votre session depuis le tableau de bord pour charger les données financières de votre organisation.",
    permissionDeniedTitle: "Cette page financière n’est pas accessible à votre rôle",
    cashCommandDeniedTitle: "Le pilotage de la trésorerie n’est pas accessible à votre rôle",
    reconciliationLockedTitle: "Le rapprochement des paiements n’est pas activé pour cette organisation",
    reconciliationLockedMessage:
      "Un administrateur doit activer le rapprochement des paiements pour vous permettre de consulter ici les rapprochements d’espèces, de banque, de cartes ou de mobile money.",
    cashDrawerLockedTitle: "Le module de caisse n’est pas activé pour cette organisation",
    cashDrawerLockedMessage:
      "Un administrateur doit activer le module de caisse pour vous permettre de consulter les mouvements de caisse et l’historique des paiements.",
    reconciliationDeniedTitle: "Le rapprochement des paiements n’est pas accessible à ce rôle",
    permissionDeniedMessage:
      "Demandez à votre administrateur de vérifier vos droits d’accès aux pages financières. Ce refus d’accès a été enregistré.",
  },
} as const

const MODULE_ACTIVATION_COPY = {
  en: {
    button: "Enable reconciliation",
    pending: "Enabling…",
    confirm:
      "Enable Payment Reconciliation and any missing required Finance or Accounting modules for this organization? This access change will be audit logged.",
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
      "Activer le rapprochement des paiements ainsi que les modules Finance ou Comptabilité requis et manquants pour cette organisation ? Cette modification d’accès sera journalisée.",
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
            embedded
            locale={locale}
            kind={noActiveOrg ? "no_active_org" : "permission_denied"}
            eyebrow={!noActiveOrg ? routeStateCopy.permissionDeniedEyebrow : undefined}
            title={
              noActiveOrg
                ? locale === "en" ? `${surface.title} ${NO_ACTIVE_ORG_TITLE_SUFFIX}` : routeStateCopy.noActiveOrgTitle
                : isReconciliationSurface
                  ? routeStateCopy.reconciliationDeniedTitle
                  : surface.key === "finance-cash-command"
                    ? routeStateCopy.cashCommandDeniedTitle
                    : locale === "en" ? `${surface.title} ${PERMISSION_DENIED_TITLE_SUFFIX}` : routeStateCopy.permissionDeniedTitle
            }
            message={noActiveOrg ? routeStateCopy.noActiveOrgMessage : routeStateCopy.permissionDeniedMessage}
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
            embedded
            locale={locale}
            kind="locked_module"
            eyebrow={routeStateCopy.moduleLockedEyebrow}
            title={
              moduleRequirement.moduleSlug === "payment_reconciliation"
                ? routeStateCopy.reconciliationLockedTitle
                : moduleRequirement.moduleSlug === "cash_drawer"
                  ? routeStateCopy.cashDrawerLockedTitle
                  : moduleRequirement.moduleLockedTitle ?? `${surface.title} ${DEFAULT_MODULE_LOCKED_TITLE_SUFFIX}`
            }
            message={
              moduleRequirement.moduleSlug === "payment_reconciliation"
                ? routeStateCopy.reconciliationLockedMessage
                : moduleRequirement.moduleSlug === "cash_drawer"
                  ? routeStateCopy.cashDrawerLockedMessage
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
