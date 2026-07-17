import type { ReactNode } from "react"

import { BIEmptyState } from "@/components/bi/BIEmptyState"
import type { BIKpiState } from "@/services/bi/bi-contracts"

type BIStateSurfaceProps = {
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

export function BIStateSurface({ state, title, detail, action, className }: BIStateSurfaceProps) {
  const copy = stateCopy[state]

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
