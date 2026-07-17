import type { Metadata } from "next"

import { CashCommandDashboard } from "@/components/cash-command/CashCommandDashboard"
import { DashboardRouteState } from "@/components/dashboard/DashboardRouteState"
import { localizePath } from "@/i18n/routing"
import { RbacError, requireAnyPermission } from "@/lib/security/rbac"
import { getCashCommandData } from "@/services/cash-command/cash-command.service"

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

function pickLocale(locale: string) {
  return locale === "fr" ? "fr" : "en"
}

export default async function CashCommandPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const resolvedLocale = pickLocale(locale)
  let ctx: Awaited<ReturnType<typeof requireAnyPermission>>

  try {
    ctx = await requireAnyPermission(["finance.read", "dashboard.read"], {
      resource: "KontavaCashCommand",
    })
  } catch (error) {
    if (error instanceof RbacError) {
      const noActiveOrg = error.code === "NO_ACTIVE_ORG"

      return (
        <DashboardRouteState
          kind={noActiveOrg ? "no_active_org" : "permission_denied"}
          title={noActiveOrg ? "Cash Command needs an active organization" : "Cash Command is not available for this role"}
          message={
            noActiveOrg
              ? "Refresh your session from the dashboard so Cash Command can load tenant-scoped evidence."
              : "Cash Command requires finance or dashboard access. The denial was recorded by the RBAC guard."
          }
          primaryHref={localizePath("/dashboard", resolvedLocale)}
        />
      )
    }

    throw error
  }

  const data = await getCashCommandData({
    organizationId: ctx.orgId,
    actorId: ctx.userId,
    actorPermissions: ctx.permissions,
  })

  return (
    <CashCommandDashboard
      data={data}
      locale={resolvedLocale}
      title={copy[resolvedLocale].title}
      subtitle={copy[resolvedLocale].subtitle}
    />
  )
}
