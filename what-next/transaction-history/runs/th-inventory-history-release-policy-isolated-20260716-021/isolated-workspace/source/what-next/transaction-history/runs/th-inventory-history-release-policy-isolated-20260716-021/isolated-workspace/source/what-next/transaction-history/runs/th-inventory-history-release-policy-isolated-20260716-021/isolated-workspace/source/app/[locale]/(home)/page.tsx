import { FinalCTA } from "@/components/landing/final-cta"
import { LandingHero } from "@/components/landing/hero"
import { OperationsMap } from "@/components/landing/operations-map"
import { PricingSection } from "@/components/landing/pricing-section"
import { ProductGallery } from "@/components/landing/product-gallery"
import { TrustSection } from "@/components/landing/trust-section"

export default function LandingPage() {
  return (
    <main>
      <LandingHero />
      <ProductGallery />
      <OperationsMap />
      <TrustSection />
      <PricingSection />
      <FinalCTA />
    </main>
  )
}