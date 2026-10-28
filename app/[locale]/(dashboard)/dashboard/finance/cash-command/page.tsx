import type { Metadata } from "next"

import { CashCommandDashboard } from "@/components/cash-command/CashCommandDashboard"
import { getCashCommandData } from "@/services/cash-command/cash-command.service"
import { withFinanceSurfaceAccess, routeByKey } from "../finance-route-access"

export const metadata: Metadata = {
  title: "Cash Command | Kontava",
  description: "Read-only cash command intelligence for collected cash, suspense, drawer risk, and provider risk.",
}

const copy = {
  en: {
    title: "Cash Command Intelligence",
    subtitle:
      "Read-only cash truth for collected cash, unreconciled cash, suspense, drawer risk, provider risk, freshness, and proof-linked action pressure.",
  },
  fr: {
    title: "Intelligence commande cash",
    subtitle:
      "Verite cash en lecture seule pour encaissements, cash non rapproche, suspense, risque caisse, risque fournisseur, fraicheur et actions liees aux preuves.",
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
      const data = await getCashCommandData({
        organizationId: context.orgId,
        actorId: context.userId,
        actorPermissions: context.permissions,
        actorRoleCodes: context.roles.map((role) => role.code),
        isSuperUser: context.isSuperUser,
      })

      return (
        <CashCommandDashboard
          data={data}
          locale={locale}
          title={copy[locale].title}
          subtitle={copy[locale].subtitle}
        />
      )
    },
  })
}
