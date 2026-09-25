import type { ReactNode } from "react"

import { BIEmptyState } from "@/components/bi/BIEmptyState"
import type { BIKpiState } from "@/services/bi/bi-contracts"

type BIStateSurfaceProps = {
  locale?: string
  state: BIKpiState
  title?: string
  detail?: string
  action?: ReactNode
  className?: string
}

const stateCopy: Record<BIKpiState, { title: string; detail: string }> = {
  loading: {
    title: "BI surface is loading",
    detail: "Kontava is preparing this command surface. Trust state will appear when the data is ready.",
  },
  empty: {
    title: "No command data yet",
    detail: "This surface needs trusted source activity before it can produce a business command view.",
  },
  ready: {
    title: "Command data ready",
    detail: "This surface has enough trusted data to display the current business state.",
  },
  stale: {
    title: "Command data is stale",
    detail: "The last trusted rebuild is outside the expected freshness window. Refresh or rebuild before relying on it.",
  },
  partial: {
    title: "Command data is partial",
    detail: "Some source modules are available, but the command view is missing enough evidence to be complete.",
  },
  blocked: {
    title: "Command data is blocked",
    detail: "Kontava found a blocker that must be cleared before this surface can be trusted.",
  },
  redacted: {
    title: "Sensitive command data is redacted",
    detail: "This view is intentionally hiding protected information according to redaction policy.",
  },
  permission_denied: {
    title: "Permission required",
    detail: "The current user does not have the server-side permission required for this command surface.",
  },
  module_unavailable: {
    title: "Module unavailable",
    detail: "This command surface depends on a module that is unavailable for the current tenant entitlement state.",
  },
  safe_error: {
    title: "Command data temporarily unavailable",
    detail: "Kontava could not load this command surface safely. No hidden or untrusted data is shown.",
  },
}

const emptyStateKinds: Partial<Record<BIKpiState, Parameters<typeof BIEmptyState>[0]["kind"]>> = {
  empty: "empty",
  blocked: "blocked",
  redacted: "redacted",
  permission_denied: "permission_denied",
  module_unavailable: "module_unavailable",
  safe_error: "safe_error",
}

const frenchStateCopy: typeof stateCopy = {
  loading: { title: "Chargement des données de pilotage", detail: "L’état de fiabilité apparaîtra lorsque les données seront prêtes." },
  empty: { title: "Aucune donnée de pilotage", detail: "Une activité source fiable est nécessaire pour présenter la situation métier." },
  ready: { title: "Données de pilotage disponibles", detail: "Les données fiables disponibles permettent d’afficher la situation métier actuelle." },
  stale: { title: "Données de pilotage périmées", detail: "Le dernier recalcul dépasse la durée de validité attendue. Actualisez ou recalculez avant de vous y fier." },
  partial: { title: "Données de pilotage partielles", detail: "Certaines sources sont disponibles, mais des preuves manquent pour compléter cette vue." },
  blocked: { title: "Données de pilotage bloquées", detail: "Un blocage doit être résolu avant de pouvoir se fier à cette vue." },
  redacted: { title: "Données sensibles masquées", detail: "Les informations protégées sont masquées conformément à la politique de confidentialité." },
  permission_denied: { title: "Autorisation requise", detail: "L’utilisateur actuel ne dispose pas de l’autorisation serveur nécessaire pour cette vue." },
  module_unavailable: { title: "Module indisponible", detail: "Cette vue dépend d’un module indisponible selon les droits actuels de l’organisation." },
  safe_error: { title: "Données temporairement indisponibles", detail: "Cette vue n’a pas pu être chargée de façon fiable. Aucune donnée masquée ou non fiable n’est affichée." },
}

export function BIStateSurface({ state, title, detail, action, className, locale = "en" }: BIStateSurfaceProps) {
  const copy = (locale.startsWith("fr") ? frenchStateCopy : stateCopy)[state]

  return (
    <BIEmptyState
      kind={emptyStateKinds[state] ?? "empty"}
      title={title ?? copy.title}
      detail={detail ?? copy.detail}
      action={action}
      className={className}
    />
  )
}
