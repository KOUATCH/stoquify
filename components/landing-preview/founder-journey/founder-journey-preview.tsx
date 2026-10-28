import { PreviewBar } from "./preview-bar"
import { PreviewHero } from "./preview-hero"
import {
  PreviewAdoption,
  PreviewJourney,
  PreviewPathways,
  PreviewProblem,
  PreviewProof,
  PreviewTrust,
} from "./preview-sections"

export function FounderJourneyPreview() {
  return (
    <main
      data-founder-preview
      className="overflow-x-clip bg-[var(--ink-0)] text-[var(--text-hi)]"
    >
      <PreviewBar />
      <PreviewHero />
      <PreviewProblem />
      <PreviewJourney />
      <PreviewProof />
      <PreviewPathways />
      <PreviewTrust />
      <PreviewAdoption />
    </main>
  )
}
