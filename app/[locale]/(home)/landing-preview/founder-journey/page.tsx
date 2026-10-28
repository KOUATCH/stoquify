import { FounderJourneyPreview } from "@/components/landing-preview/founder-journey/founder-journey-preview"
import { pickLocale } from "@/i18n/routing"
import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

type FounderJourneyPreviewPageProps = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({
  params,
}: FounderJourneyPreviewPageProps): Promise<Metadata> {
  const { locale: rawLocale } = await params
  const locale = pickLocale(rawLocale)
  const t = await getTranslations({
    locale,
    namespace: "landingPreview.founderJourney.meta",
  })

  return {
    title: t("title"),
    description: t("description"),
    robots: {
      index: false,
      follow: false,
      nocache: true,
      googleBot: {
        index: false,
        follow: false,
        noimageindex: true,
      },
    },
  }
}

export default function FounderJourneyPreviewPage() {
  return <FounderJourneyPreview />
}
