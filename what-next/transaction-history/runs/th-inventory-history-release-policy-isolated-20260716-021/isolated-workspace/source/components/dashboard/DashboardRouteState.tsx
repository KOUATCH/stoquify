import type { ReactNode } from "react"
import Link from "next/link"
import { AlertTriangle, Building2, Clock3, LockKeyhole, PackageX, SearchX } from "lucide-react"

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
    eyebrow: string
    defaultTitle: string
    defaultMessage: string
  }
> = {
  permission_denied: {
    icon: LockKeyhole,
    toneClass: "bg-[var(--dash-danger-soft)] text-[var(--dash-danger)]",
    eyebrow: "Permission required",
    defaultTitle: "This dashboard surface is not available for this role",
    defaultMessage:
      "The route is protected by server-side permissions. Ask an administrator for access or return to the command center.",
  },
  no_active_org: {
    icon: Building2,
    toneClass: "bg-[var(--dash-gold-soft)] text-[var(--dash-gold)]",
    eyebrow: "Organization required",
    defaultTitle: "Choose an active organization",
    defaultMessage:
      "Your session does not have an active organization for this route. Refresh the session from the dashboard.",
  },
  error: {
    icon: AlertTriangle,
    toneClass: "bg-[var(--dash-danger-soft)] text-[var(--dash-danger)]",
    eyebrow: "Load failed",
    defaultTitle: "Dashboard surface could not load",
    defaultMessage: "One read-only command source failed or timed out. Retry or return to the command center.",
  },
  empty: {
    icon: SearchX,
    toneClass: "bg-[var(--dash-info-soft)] text-[var(--dash-info)]",
    eyebrow: "No data",
    defaultTitle: "No command data yet",
    defaultMessage: "This surface needs trusted source activity before it can produce a dashboard view.",
  },
  partial: {
    icon: AlertTriangle,
    toneClass: "bg-[var(--dash-gold-soft)] text-[var(--dash-gold)]",
    eyebrow: "Partial data",
    defaultTitle: "Some command data is partial",
    defaultMessage:
      "The route loaded safely, but one or more source modules are unavailable or incomplete.",
  },
  locked_module: {
    icon: PackageX,
    toneClass: "bg-[rgba(37,57,67,0.34)] text-[var(--dash-text-soft)]",
    eyebrow: "Module locked",
    defaultTitle: "This module is not enabled",
    defaultMessage:
      "The tenant does not currently have this module enabled. Open settings or contact an administrator.",
  },
  stale_session: {
    icon: Clock3,
    toneClass: "bg-[var(--dash-warning-soft)] text-[var(--dash-warning)]",
    eyebrow: "Session refresh required",
    defaultTitle: "Refresh your dashboard session",
    defaultMessage:
      "Your session context is stale. Refresh the session before relying on this dashboard surface.",
  },
  not_found: {
    icon: SearchX,
    toneClass: "bg-[var(--dash-info-soft)] text-[var(--dash-info)]",
    eyebrow: "Not found",
    defaultTitle: "Dashboard page not found",
    defaultMessage:
      "This route is not available in the current dashboard workspace. Return to the command center.",
  },
  loading: {
    icon: Clock3,
    toneClass: "bg-[var(--dash-info-soft)] text-[var(--dash-info)]",
    eyebrow: "Loading",
    defaultTitle: "Preparing command surface",
    defaultMessage: "Trusted dashboard data is loading. The layout is reserved so content does not jump.",
  },
}

export function DashboardRouteState({
  kind,
  title,
  message,
  primaryHref,
  primaryLabel = "Back to dashboard",
  secondaryHref,
  secondaryLabel,
  actions,
}: {
  kind: DashboardRouteStateKind
  title?: string
  message?: string
  primaryHref: string
  primaryLabel?: string
  secondaryHref?: string
  secondaryLabel?: string
  actions?: ReactNode
}) {
  const state = stateCopy[kind]
  const Icon = state.icon
  const isLoading = kind === "loading"

  return (
    <main className="dashboard-landing-theme dark min-h-screen bg-[var(--dash-canvas)] text-[var(--dash-text)]">
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
            {state.eyebrow}
          </p>
          <h1 className="mt-2 text-xl font-semibold tracking-normal text-[var(--dash-text)]">
            {title ?? state.defaultTitle}
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[var(--dash-text-soft)]">
            {message ?? state.defaultMessage}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Link
              href={primaryHref}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-[var(--dash-border-subtle)] px-4 text-sm font-semibold text-[var(--dash-text)] transition hover:bg-[var(--dash-surface-raised)]"
            >
              {primaryLabel}
            </Link>
            {secondaryHref && secondaryLabel ? (
              <Link
                href={secondaryHref}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-[var(--dash-border-subtle)] px-4 text-sm font-semibold text-[var(--dash-text-soft)] transition hover:bg-[var(--dash-surface-raised)] hover:text-[var(--dash-text)]"
              >
                {secondaryLabel}
              </Link>
            ) : null}
            {actions}
          </div>
        </section>
      </div>
    </main>
  )
}