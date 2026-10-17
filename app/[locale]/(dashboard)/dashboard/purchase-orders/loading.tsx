"use client"

import { useLocale } from "next-intl"
import { DashboardLoadingState } from "@/components/dashboard/DashboardLoadingState"

export default function PurchaseOrdersLoading() {
  const french = useLocale() === "fr"
  return <DashboardLoadingState embedded locale={french ? "fr" : "en"}
    loadingLabel={french ? "Chargement" : "Loading"}
    title={french ? "Chargement des bons de commande" : "Loading purchase orders"}
    subtitle={french ? "Le registre et les engagements fournisseurs sont en cours de chargement." : "The register and supplier commitments are loading."}
  />
}
