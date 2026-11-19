import type { ReactNode } from "react"
import Link from "next/link"
import { AlertTriangle, Building2, Clock3, LockKeyhole, PackageX, SearchX } from "lucide-react"

import { dashboardSharedCopy, dashboardLocale, recoveryLabel } from "@/lib/dashboard/presentation"

import { cn } from "@/lib/utils"

export type DashboardRouteStateKind =
  | "permission_denied"
  | "no_active_org"
  | "error"
  | "empty"
  | "partial"
  | "locked_module"
  | "stale_session"
  | "not_found"
  | "loading"

const stateCopy: Record<
  DashboardRouteStateKind,
  {
    icon: typeof AlertTriangle
    toneClass: string
  }
> = {
  permission_denied: {
    icon: LockKeyhole,
    toneClass: "bg-[var(--dash-danger-soft)] text-[var(--dash-danger)]",
  },
  no_active_org: {
    icon: Building2,
    toneClass: "bg-[var(--dash-gold-soft)] text-[var(--dash-gold)]",
  },
  error: {
    icon: AlertTriangle,
    toneClass: "bg-[var(--dash-danger-soft)] text-[var(--dash-danger)]",
  },
  empty: {
    icon: SearchX,
    toneClass: "bg-[var(--dash-info-soft)] text-[var(--dash-info)]",
  },
  partial: {
    icon: AlertTriangle,
    toneClass: "bg-[var(--dash-gold-soft)] text-[var(--dash-gold)]",
  },
  locked_module: {
    icon: PackageX,
    toneClass: "bg-[rgba(37,57,67,0.34)] text-[var(--dash-text-soft)]",
  },
  stale_session: {
    icon: Clock3,
    toneClass: "bg-[var(--dash-warning-soft)] text-[var(--dash-warning)]",
  },
  not_found: {
    icon: SearchX,
    toneClass: "bg-[var(--dash-info-soft)] text-[var(--dash-info)]",
  },
  loading: {
    icon: Clock3,
    toneClass: "bg-[var(--dash-info-soft)] text-[var(--dash-info)]",
  },
}

export function DashboardRouteState({
  kind,
  eyebrow,
  title,
  message,
  primaryHref,
  primaryLabel,
  locale,
  secondaryHref,
  secondaryLabel,
  actions,
  embedded = false,
}: {
  kind: DashboardRouteStateKind
  eyebrow?: string
  title?: string
  message?: string
  primaryHref: string
  primaryLabel?: string
  locale?: "en" | "fr"
  secondaryHref?: string
  secondaryLabel?: string
  actions?: ReactNode
  /** The authenticated dashboard shell already owns the main landmark. */
  embedded?: boolean
}) {
  const state = stateCopy[kind]
  const resolvedLocale = locale ?? dashboardLocale(primaryHref)
  const copy = dashboardSharedCopy[resolvedLocale].states[kind]
  const Icon = state.icon
  const isLoading = kind === "loading"
  const Container = embedded ? "div" : "main"

  return (
    <Container className="dashboard-landing-theme dark min-h-screen bg-[var(--dash-canvas)] text-[var(--dash-text)]">
      <div className="dashboard-landing-content mx-auto flex min-h-screen w-full max-w-[1920px] items-center justify-center px-4 py-8 md:px-6 lg:px-8">
        <section
          aria-busy={isLoading || undefined}
          role={isLoading ? "status" : undefined}
          className="dashboard-glass-panel w-full max-w-xl rounded-lg p-6 text-center"
        >
          <div
            className={cn(
              "mx-auto flex h-14 w-14 items-center justify-center rounded-lg border border-[var(--dash-border-subtle)]",
              state.toneClass,
            )}
          >
            <Icon className="h-7 w-7" aria-hidden="true" />
          </div>
          <p className="mt-4 text-xs font-semibold uppercase tracking-normal text-[var(--dash-text-soft)]">
            {eyebrow ?? copy.eyebrow}
          </p>
          <h1 className={cn("mt-2 text-xl font-semibold tracking-normal text-[var(--dash-text)]", embedded && "break-words")}>
            {title ?? copy.defaultTitle}
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[var(--dash-text-soft)]">
            {message ?? copy.defaultMessage}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Link
              href={primaryHref}
              className="inline-flex min-h-10 max-w-full whitespace-normal py-2 break-words items-center justify-center rounded-lg border border-[var(--dash-border-subtle)] px-4 text-sm font-semibold text-[var(--dash-text)] transition hover:bg-[var(--dash-surface-raised)]"
            >
              {primaryLabel ?? recoveryLabel(primaryHref, resolvedLocale)}
            </Link>
            {secondaryHref && secondaryLabel ? (
              <Link
                href={secondaryHref}
                className="inline-flex min-h-10 max-w-full whitespace-normal py-2 break-words items-center justify-center rounded-lg border border-[var(--dash-border-subtle)] px-4 text-sm font-semibold text-[var(--dash-text-soft)] transition hover:bg-[var(--dash-surface-raised)] hover:text-[var(--dash-text)]"
              >
                {secondaryLabel}
              </Link>
            ) : null}
            {actions}
          </div>
        </section>
      </div>
    </Container>
  )
}
