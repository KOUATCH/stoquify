"use client"

import { useTranslations } from "next-intl"
import { RouteStatePanel } from "@/components/dashboard/primitives"

export default function ModuleCompositionError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("moduleComposition.states")
  return <div className="dashboard-landing-theme dark min-h-screen text-[var(--dash-text)]"><div role="alert" className="dashboard-landing-content mx-auto max-w-[88rem] px-4 py-8 sm:px-6"><RouteStatePanel kind="error" title={t("errorTitle")} message={t("errorDescription")} action={{ label: t("retry"), onClick: reset }} /></div></div>
}
