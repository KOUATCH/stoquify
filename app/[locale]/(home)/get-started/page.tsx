import { GettingStartedPage } from "@/components/landing/public-pages"
import { publicMetadata } from "@/lib/public-site"

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  return publicMetadata(locale, "/get-started", false, {
    title: locale === "fr" ? "Préparer votre espace | Stoquify" : "Prepare your workspace | Stoquify",
    description: locale === "fr" ? "Préparez votre compte, les modules, les sites, les accès de votre équipe et les données d’ouverture de votre espace Stoquify." : "Prepare your account, modules, locations, team access and opening records for your Stoquify workspace.",
  })
}

export default function Page() {
  return <GettingStartedPage />
}
