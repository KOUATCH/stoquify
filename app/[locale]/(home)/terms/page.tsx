import { PublicPolicyPage } from "@/components/landing/public-pages"
import { getPublicContact, publicMetadata } from "@/lib/public-site"

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  return { ...publicMetadata(locale, "/terms", false, { title: locale === "fr" ? "Conditions d’utilisation | Stoquify" : "Terms of use | Stoquify", description: locale === "fr" ? "Disponibilité des conditions d’utilisation de Stoquify." : "Availability of Stoquify’s terms of use." }), robots: { index: false, follow: false } }
}

export default function Page() {
  return <PublicPolicyPage kind="terms" policyUrl={getPublicContact().termsUrl} />
}
