import "@/components/landing/workflow-atlas.css"
import "@/components/landing/landing-sections.css"
import { WorkflowAtlas } from "@/components/landing/workflow-atlas"
import { publicMetadata } from "@/lib/public-site"

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  return publicMetadata(locale, "/workflows", false, {
    title: locale === "fr" ? "Parcours métier connectés | Stoquify" : "Connected business workflows | Stoquify",
    description: locale === "fr" ? "Suivez les étapes, responsabilités, contrôles et justificatifs entre opérations, finance, personnel et cabinet comptable." : "Follow steps, responsibilities, controls and evidence across operations, finance, people and your accounting firm.",
  })
}

export default function WorkflowsPage() {
  return <WorkflowAtlas />
}
