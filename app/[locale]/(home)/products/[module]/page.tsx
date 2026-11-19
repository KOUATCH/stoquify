import { notFound } from "next/navigation"
import { ProductPage } from "@/components/landing/public-pages"
import { isProductId } from "@/components/landing/public-page-routes"
import { landingModuleCatalog } from "@/components/landing/landing-module-catalog-data"
import { publicMetadata } from "@/lib/public-site"

export async function generateMetadata({ params }: { params: Promise<{ locale: string; module: string }> }) {
  const { locale, module: id } = await params
  if (!isProductId(id)) return { title: locale === "fr" ? "Page introuvable | Stoquify" : "Page not found | Stoquify", robots: { index: false, follow: false } }
  const item = landingModuleCatalog.find(entry => entry.href === `/products/${id}`)!
  const language = locale === "fr" ? 1 : 0
  return publicMetadata(locale, `/products/${id}`, false, { title: `${item.name[language]} | Stoquify`, description: item.purpose[language] })
}

export default async function Page({ params }: { params: Promise<{ module: string }> }) {
  const { module: productId } = await params
  if (!isProductId(productId)) notFound()
  return <ProductPage id={productId} />
}
