import { FileSearch } from "lucide-react"
import { OpeningPositionWorkbench } from "@/components/onboarding/OpeningPositionWorkbench"
import { OpeningCutoverPanel } from "@/components/onboarding/OpeningCutoverPanel"
import { AccountingPageShell } from "../_components/accounting-ui"
import { routeByKey, withAccountingSurfaceAccess } from "../accounting-route-access"
export default async function OpeningPositionPage(props: {
  params: Promise<{ locale: string }>; searchParams?: Promise<{ clientOrganizationId?: string }>
}) {
  const surface = routeByKey("accounting-opening-position")!
  return withAccountingSurfaceAccess({ params: props.params, surface, onAllowed: async () => {
    const { locale } = await props.params, query = await props.searchParams, language = locale === "fr" ? "fr" : "en"
    return <AccountingPageShell eyebrow={language === "fr" ? "Préparation financière" : "Financial onboarding"}
      title={language === "fr" ? "Situation d’ouverture" : "Opening position"}
      description={language === "fr" ? "Préparer, rapprocher et examiner les justificatifs avant toute application." : "Stage, reconcile and review evidence before any financial apply."} icon={FileSearch}>
      <OpeningPositionWorkbench locale={language} clientOrganizationId={query?.clientOrganizationId} />
      <OpeningCutoverPanel locale={language} clientOrganizationId={query?.clientOrganizationId} />
    </AccountingPageShell>
  } })
}
