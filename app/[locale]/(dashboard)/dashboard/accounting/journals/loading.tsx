"use client"

import { useLocale } from "next-intl"
import { Skeleton } from "@/components/ui/skeleton"

export default function JournalsLoading() {
  const french = useLocale() === "fr"
  return (
    <div className="dashboard-landing-theme dark min-h-screen overflow-x-hidden bg-[var(--dash-canvas)] motion-reduce:[&_.animate-pulse]:animate-none">
      <div className="dashboard-landing-content mx-auto w-full max-w-[1920px] space-y-4 px-4 py-4 text-[var(--dash-text)] sm:px-6 sm:py-6">
        <section role="status" aria-live="polite" className="dashboard-glass-panel space-y-2 rounded-lg p-5">
          <h1 className="text-2xl font-semibold">{french ? "Chargement des écritures comptables…" : "Loading journal entries…"}</h1>
          <p className="text-sm text-[var(--dash-text-soft)]">{french ? "Les données comptables sont en cours de chargement." : "Accounting data is loading."}</p>
        </section>
        <Skeleton aria-hidden="true" className="h-28 w-full rounded-lg bg-[var(--dash-surface-raised)]" />
        <Skeleton aria-hidden="true" className="h-64 w-full rounded-lg bg-[var(--dash-surface-raised)]" />
      </div>
    </div>
  )
}
