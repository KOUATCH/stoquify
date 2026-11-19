import { PublicPolicyPage } from "@/components/landing/public-pages"
import { getPublicContact, publicMetadata } from "@/lib/public-site"

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  return { ...publicMetadata(locale, "/privacy", false, { title: locale === "fr" ? "Politique de confidentialité | Stoquify" : "Privacy policy | Stoquify", description: locale === "fr" ? "Disponibilité du document de confidentialité de Stoquify." : "Availability of Stoquify’s privacy document." }), robots: { index: false, follow: false } }
}

export default function Page() {
  return <PublicPolicyPage kind="privacy" policyUrl={getPublicContact().privacyUrl} />
}
