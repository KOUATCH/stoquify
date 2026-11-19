import { notFound } from "next/navigation"
import { OfferPage } from "@/components/landing/public-pages"
import { offerPaths } from "@/components/landing/cinematic-offers-data"
import { publicMetadata } from "@/lib/public-site"

export async function generateMetadata({ params }: { params: Promise<{ locale: string; offer: string }> }) {
  const { locale, offer } = await params
  const path = offerPaths.find(item => item.id === offer)
  if (!path) return { title: locale === "fr" ? "Page introuvable | Stoquify" : "Page not found | Stoquify", robots: { index: false, follow: false } }
  const language = locale === "fr" ? 1 : 0
  return publicMetadata(locale, `/offers/${path.id}`, false, { title: `${path.name[language]} | Stoquify`, description: path.description[language] })
}

export default async function Page({ params }: { params: Promise<{ offer: string }> }) {
  const { offer } = await params
  const path = offerPaths.find(item => item.id === offer)
  if (!path) notFound()
  return <OfferPage id={path.id} />
}
