"use client"

import { useEffect, type ReactNode } from "react"
import Link from "next/link"
import { AlertTriangle } from "lucide-react"

import { Button } from "@/components/ui/button"

export type DashboardRouteError = Error & { digest?: string }

const DEFAULT_MESSAGE =
  "One command source failed or timed out. Retry the read-only dashboard without exposing internal details."

export function DashboardErrorState({
  error,
  reset,
  title = "Dashboard page could not load",
  message = DEFAULT_MESSAGE,
  retryLabel = "Try again",
  dashboardHref,
  dashboardLabel = "Open command center",
  actions,
}: {
  error?: DashboardRouteError | string | null
  reset?: () => void
  title?: string
  message?: string
  retryLabel?: string
  dashboardHref?: string
  dashboardLabel?: string
  actions?: ReactNode
}) {
  useEffect(() => {
    if (error) {
      console.error(error)
    }
  }, [error])

  const handleRetry = () => {
    if (reset) {
      reset()
      return
    }

    window.location.reload()
  }

  return (
    <main className="dashboard-landing-theme dark min-h-screen bg-[var(--dash-canvas)] text-[var(--dash-text)]">
      <div className="dashboard-landing-content mx-auto flex min-h-screen w-full max-w-[1920px] items-center justify-center px-4 py-8 md:px-6 lg:px-8">
        <section className="dashboard-glass-panel flex max-w-lg flex-col items-center gap-3 rounded-lg p-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-danger-soft)]">
            <AlertTriangle className="h-7 w-7 text-[var(--dash-danger)]" aria-hidden="true" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-normal text-[var(--dash-text-soft)]">Load failed</p>
          <h1 className="text-lg font-semibold text-[var(--dash-text)]">{title}</h1>
          <p className="text-sm leading-6 text-[var(--dash-text-soft)]">{message}</p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-lg border-[var(--dash-border-subtle)] text-[var(--dash-text)]"
              onClick={handleRetry}
            >
              {retryLabel}
            </Button>
            {dashboardHref ? (
              <Link
                href={dashboardHref}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-[var(--dash-border-subtle)] px-4 text-sm font-semibold text-[var(--dash-text-soft)] transition hover:bg-[var(--dash-surface-raised)] hover:text-[var(--dash-text)]"
              >
                {dashboardLabel}
              </Link>
            ) : null}
            {actions}
          </div>
        </section>
      </div>
    </main>
  )
}