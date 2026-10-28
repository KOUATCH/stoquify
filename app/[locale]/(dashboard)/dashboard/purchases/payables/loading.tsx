"use client"

import { useLocale } from "next-intl"

import { RouteStatePanel } from "@/components/dashboard/primitives/command-center-primitives"

export default function PayablesLoading() {
  const french = useLocale() === "fr"

  return (
    <div className="dashboard-landing-theme dark min-h-screen overflow-x-hidden">
      <div className="dashboard-landing-content mx-auto w-full max-w-[1920px] px-4 py-6 sm:px-6">
        <RouteStatePanel
          kind="loading"
          title={french ? "Préparation de l'atelier AP" : "Preparing the AP workbench"}
          message={french ? "Les contrôles fournisseurs fiables sont en cours de chargement." : "Trusted supplier payable controls are loading."}
        />
      </div>
    </div>
  )
}
