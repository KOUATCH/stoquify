import { PricingPage } from "@/components/landing/public-pages"
import { publicMetadata } from "@/lib/public-site"

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  return publicMetadata(locale, "/pricing", false, {
    title: locale === "fr" ? "Offres et tarifs | Stoquify" : "Offers and pricing | Stoquify",
    description: locale === "fr" ? "Comparez les parcours opérations, finance et personnel. Précisez modules, mise en place, connexions et accompagnement avant votre devis." : "Compare operations, finance and people starting points. Clarify modules, setup, connections and support before your tailored quote.",
  })
}

export default function Page() {
  return <PricingPage />
}
