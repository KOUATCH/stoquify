import type { Metadata } from "next"

import { DashboardErrorState } from "@/components/dashboard/DashboardErrorState"
import { ManagerActionCenterDashboard } from "@/components/manager-action-center/ManagerActionCenterDashboard"
import { ManagerLocationActionCenterDashboard } from "@/components/manager-action-center/ManagerLocationActionCenterDashboard"
import { localizePath } from "@/i18n/routing"
import { ForbiddenError } from "@/services/_shared/action-errors"
import { getManagerActionCenterQuery } from "@/services/manager-action-center/manager-action-center-query.service"
import { routeByKey, withManagerActionSurfaceAccess } from "./manager-action-route-access"

export const metadata: Metadata = {
  title: "Manager Action Center | Kontava",
  description: "Permission-filtered, evidence-backed manager action center for daily operating control.",
}

const copy = {
  en: {
    title: "Manager Action Center",
    subtitle:
      "A source-owned daily control surface for visible operating work and guarded commands, backed by evidence, freshness, redaction, and server-side permissions.",
    scopeUnavailableTitle: "Manager Action Center is unavailable for this operating scope",
    scopeUnavailableMessage:
      "The operating scope could not be verified safely. No tenant or location evidence has been shown.",
  },
  fr: {
    title: "Centre d'actions manager",
    subtitle:
      "Une surface de controle quotidienne pilotee par les sources pour le travail visible et les commandes protegees, appuyee par les preuves, la fraicheur, les masquages et les permissions serveur.",
    scopeUnavailableTitle: "Le centre d'actions est indisponible pour ce perimetre",
    scopeUnavailableMessage:
      "Le perimetre operationnel n'a pas pu etre verifie de maniere sure. Aucune preuve globale ou par site n'est affichee.",
  },
} as const

function pickLocale(locale: string) {
  return locale === "fr" ? "fr" : "en"
}

export default async function ManagerActionCenterPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const resolvedLocale = pickLocale(locale)
  const surface = routeByKey("manager-action-center")

  if (!surface) {
    throw new Error("Missing manager action center route surface definition: manager-action-center")
  }

  return withManagerActionSurfaceAccess({
    params,
    surface,
    onAllowed: async (ctx, _locale) => {
      let result: Awaited<ReturnType<typeof getManagerActionCenterQuery>>
      try {
        result = await getManagerActionCenterQuery({
          accessContext: ctx,
        })
      } catch (error) {
        if (error instanceof ForbiddenError) {
          return (
            <DashboardErrorState
              error={error.message}
              title={copy[resolvedLocale].scopeUnavailableTitle}
              message={copy[resolvedLocale].scopeUnavailableMessage}
              dashboardHref={localizePath("/dashboard", resolvedLocale)}
            />
          )
        }

        throw error
      }

      if (result.kind === "LOCATIONS") {
        return (
          <ManagerLocationActionCenterDashboard
            data={result.data}
            locale={resolvedLocale}
            title={copy[resolvedLocale].title}
            subtitle={copy[resolvedLocale].subtitle}
          />
        )
      }

      return (
        <ManagerActionCenterDashboard
          data={result.data}
          locale={resolvedLocale}
          title={copy[resolvedLocale].title}
          subtitle={copy[resolvedLocale].subtitle}
        />
      )
    },
    onDenied: ({ noActiveOrg, title, message, error, href }) => (
      <DashboardErrorState
        error={error}
        title={title}
        message={message}
        dashboardHref={href}
      />
    ),
  })
}
