"use client"

import { useLocale } from "next-intl"

import { RouteStatePanel } from "@/components/dashboard/primitives/command-center-primitives"

export default function SupplierCompatibilityLoading() {
  const french = useLocale() === "fr"

  return (
    <div className="dashboard-landing-theme dark min-h-screen overflow-x-hidden">
      <div className="dashboard-landing-content mx-auto w-full max-w-[92rem] px-4 py-6 sm:px-6">
        <RouteStatePanel
          kind="loading"
          title={french ? "Préparation des fournisseurs" : "Preparing supplier management"}
          message={french ? "La route de compatibilité charge le même dossier fournisseur contrôlé." : "The compatibility route is loading the same controlled supplier workspace."}
        />
      </div>
    </div>
  )
}
