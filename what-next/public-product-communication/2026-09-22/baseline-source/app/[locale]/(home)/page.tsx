import { FinalCTA } from "@/components/landing/final-cta"
import { LandingHero } from "@/components/landing/hero"
import { GettingStarted, LandingBenefits, SaleWorkflow } from "@/components/landing/landing-message-sections"
import { ProductGallery } from "@/components/landing/product-gallery"

export default function LandingPage() {
  return (
    <main>
      <LandingHero />
      <LandingBenefits />
      <SaleWorkflow />
      <ProductGallery />
      <GettingStarted />
      <FinalCTA />
    </main>
  )
}
