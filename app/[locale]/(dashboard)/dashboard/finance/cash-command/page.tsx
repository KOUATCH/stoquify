import type { Metadata } from "next"
import { localizeCashCommandNavigation } from "@/services/cash-command/cash-command-navigation"
import { presentCashCommand } from "@/services/cash-command/cash-command-presentation"

import { CashCommandDashboard } from "@/components/cash-command/CashCommandDashboard"
import { DashboardRouteState } from "@/components/dashboard/DashboardRouteState"
import { localizePath } from "@/i18n/routing"
import { RbacError } from "@/lib/security/rbac"
import { getCashCommandData } from "@/services/cash-command/cash-command.service"
import { withFinanceSurfaceAccess, routeByKey } from "../finance-route-access"

export const metadata: Metadata = {
  title: "Cash Command | Stoquify",
  description: "Read-only cash command intelligence for collected cash, suspense, drawer risk, and provider risk.",
}

const copy = {
  en: {
    deniedTitle: "Cash Command requires organization-wide authority",
    deniedMessage: "Your current role cannot view cash across the organization. Ask your organization administrator to review your access, or return to your dashboard for the work available to you.",
    back: "Back to dashboard",
    title: "Cash Command Intelligence",
    subtitle:
      "Read-only cash truth for collected cash, unreconciled cash, suspense, drawer risk, provider risk, freshness, and proof-linked action pressure.",
  },
  fr: {
    deniedTitle: "Le pilotage de la trésorerie exige une autorisation pour toute l’organisation",
    deniedMessage: "Votre rôle actuel ne permet pas de consulter la trésorerie de toute l’organisation. Demandez à votre administrateur de vérifier vos droits ou revenez au tableau de bord pour accéder à vos activités autorisées.",
    back: "Retour au tableau de bord",
    title: "Pilotage de la trésorerie",
    subtitle:
      "Vue en lecture seule des encaissements, des suspens, des risques de caisse et de prestataires, avec la fraîcheur des données et les actions liées aux preuves.",
  },
} as const

export default async function CashCommandPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const surface = routeByKey("finance-cash-command")

  if (!surface) {
    throw new Error("Missing finance route surface definition: finance-cash-command")
  }

  return withFinanceSurfaceAccess({
    params,
    surface,
    onAllowed: async (context, locale) => {
      let data
      try {
        data = await getCashCommandData({
          organizationId: context.orgId,
          actorId: context.userId,
          actorPermissions: context.permissions,
          actorRoleCodes: context.roles.map((role) => role.code),
          isSuperUser: context.isSuperUser,
        })
      } catch (error) {
        if (!(error instanceof RbacError) || error.code !== "FORBIDDEN") throw error

        return (
          <DashboardRouteState
            embedded
            kind="permission_denied"
            locale={locale}
            title={copy[locale].deniedTitle}
            message={copy[locale].deniedMessage}
            primaryHref={localizePath("/dashboard", locale)}
            primaryLabel={copy[locale].back}
          />
        )
      }

      return (
        <CashCommandDashboard
          data={presentCashCommand(localizeCashCommandNavigation(data, locale), locale)}
          locale={locale}
          title={copy[locale].title}
          subtitle={copy[locale].subtitle}
        />
      )
    },
  })
}
