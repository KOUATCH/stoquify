import { AutomationSection } from "@/components/landing/automation-section"
import { ConnectedWorkflow } from "@/components/landing/connected-workflow"
import { DisconnectProblem } from "@/components/landing/disconnect-problem"
import { FinalCTA } from "@/components/landing/final-cta"
import { LandingHero } from "@/components/landing/hero"
import { ModuleDeepDives } from "@/components/landing/module-deep-dives"
import { OperationsMap } from "@/components/landing/operations-map"
import { PeopleToPay } from "@/components/landing/people-to-pay"
import { PricingSection } from "@/components/landing/pricing-section"
import { ProductGallery } from "@/components/landing/product-gallery"
import { TrustSection } from "@/components/landing/trust-section"
import { UseCases } from "@/components/landing/use-cases"

export default function LandingPage() {
  return (
    <main>
      <LandingHero />
      <DisconnectProblem />
      <ProductGallery />
      <ConnectedWorkflow />
      <OperationsMap />
      <PeopleToPay />
      <ModuleDeepDives />
      <AutomationSection />
      <TrustSection />
      <UseCases />
      <PricingSection />
      <FinalCTA />
    </main>
  )
}