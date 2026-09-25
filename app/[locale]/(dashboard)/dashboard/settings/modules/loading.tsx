"use client"

import { useTranslations } from "next-intl"
import { RouteStatePanel } from "@/components/dashboard/primitives"

export default function ModuleCompositionLoading() {
  const t = useTranslations("moduleComposition.states")
  return <div className="dashboard-landing-theme dark min-h-screen text-[var(--dash-text)]"><div role="status" aria-live="polite" aria-busy="true" className="dashboard-landing-content mx-auto max-w-[88rem] px-4 py-8 sm:px-6"><RouteStatePanel kind="loading" title={t("loadingTitle")} message={t("loadingDescription")} /></div></div>
}
