import { ProductsPage } from "@/components/landing/public-pages"
import { publicMetadata } from "@/lib/public-site"

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  return publicMetadata(locale, "/products", false, {
    title: locale === "fr" ? "Modules et espaces | Stoquify" : "Modules and workspaces | Stoquify",
    description: locale === "fr" ? "Explorez 18 présentations de modules et d’espaces, leurs fonctions, leurs utilisateurs et les données qu’ils partagent." : "Explore 18 module and workspace presentations, their capabilities, users and the records they share.",
  })
}

export default function Page() {
  return <ProductsPage />
}
