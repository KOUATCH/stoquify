import { CinematicLanding } from "@/components/landing/cinematic-landing"
import { publicMetadata } from "@/lib/public-site"

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  return publicMetadata((await params).locale)
}

export default function LandingPage() {
  return <CinematicLanding />
}
