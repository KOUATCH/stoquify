import { useLocale } from "next-intl"
import { ArrowRight, ClipboardList, PackageSearch, BookOpenCheck } from "lucide-react"
import { Link } from "@/i18n/navigation"
import { landingMessageCopy } from "./landing-message-copy"
import { PricingSection } from "./pricing-section"

const icons = [ClipboardList, PackageSearch, BookOpenCheck]

export function LandingBenefits() {
  const copy = landingMessageCopy[useLocale() === "fr" ? "fr" : "en"]
  return (
    <section id="problem" className="section-divider scroll-mt-20 px-6 py-16 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <p className="eyebrow">{copy.benefitsLabel}</p>
        <h2 className="display mt-4 max-w-3xl text-4xl text-[var(--text-hi)] sm:text-5xl">{copy.benefitsTitle}</h2>
        <div className="mt-9 grid gap-8 md:grid-cols-3">
          {copy.benefits.map((benefit, index) => {
            const Icon = icons[index]
            return <article key={benefit.title} className="border-t border-[var(--rule-2)] pt-6">
              <Icon className="size-6 text-[var(--color-spruce)]" aria-hidden="true" />
              <h3 className="body-text mt-4 text-xl font-semibold text-[var(--text-hi)]">{benefit.title}</h3>
              <p className="body-text mt-3 text-sm leading-7 text-[var(--text-lo)]">{benefit.body}</p>
            </article>
          })}
        </div>
        <p className="body-text mt-8 max-w-4xl text-sm leading-6 text-[var(--text-faint)]">{copy.conditions}</p>
      </div>
    </section>
  )
}

export function SaleWorkflow() {
  const copy = landingMessageCopy[useLocale() === "fr" ? "fr" : "en"]
  return (
    <section id="workflow" className="section-divider scroll-mt-20 bg-[var(--ink-1)] px-6 py-16 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <p className="eyebrow">{copy.workflowLabel}</p>
        <h2 className="display mt-4 text-4xl text-[var(--text-hi)] sm:text-5xl">{copy.workflowTitle}</h2>
        <p className="body-text mt-5 max-w-3xl leading-7 text-[var(--text-lo)]">{copy.workflowBody}</p>
        <ol className="mt-9 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {copy.workflowSteps.map((step, index) => <li key={step.title} className="border-t border-[var(--rule-2)] pt-5">
            <span className="data-text text-sm text-[var(--accent-hi)]">0{index + 1}</span>
            <h3 className="body-text mt-3 text-lg font-semibold text-[var(--text-hi)]">{step.title}</h3>
            <p className="body-text mt-2 text-sm leading-6 text-[var(--text-lo)]">{step.body}</p>
          </li>)}
        </ol>
        <Link href="/workflows" className="body-text mt-8 inline-flex min-h-11 items-center gap-2 font-semibold text-[var(--accent-hi)] underline underline-offset-4">{copy.guide}<ArrowRight className="size-4" aria-hidden="true" /></Link>
        <p className="body-text mt-2 max-w-3xl text-sm leading-6 text-[var(--text-faint)]">{copy.guideNote}</p>
      </div>
    </section>
  )
}

export function GettingStarted() {
  const copy = landingMessageCopy[useLocale() === "fr" ? "fr" : "en"]
  return (
    <section id="pricing" className="section-divider scroll-mt-20 px-6 py-16 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Preserve old section bookmarks at the consolidated availability explanation. */}
        {["modules", "people-to-pay", "daily-control", "automation", "trust", "use-cases"].map(id => <span key={id} id={id} className="block scroll-mt-20" />)}
        <p className="eyebrow">{copy.startLabel}</p>
        <h2 className="display mt-4 max-w-3xl text-4xl text-[var(--text-hi)] sm:text-5xl">{copy.startTitle}</h2>
        <div className="mt-9 grid gap-8 md:grid-cols-2">
          <div className="border-l-2 border-[var(--color-spruce)] pl-5"><h3 className="body-text text-xl font-semibold text-[var(--text-hi)]">{copy.nowTitle}</h3><p className="body-text mt-3 leading-7 text-[var(--text-lo)]">{copy.nowBody}</p></div>
          <div className="border-l-2 border-[var(--color-brand)] pl-5"><h3 className="body-text text-xl font-semibold text-[var(--text-hi)]">{copy.setupTitle}</h3><p className="body-text mt-3 leading-7 text-[var(--text-lo)]">{copy.setupBody}</p></div>
        </div>
        <p className="body-text mt-8 max-w-4xl text-sm leading-7 text-[var(--text-lo)]">{copy.scope}</p>
        <p className="body-text mt-3 max-w-4xl text-sm leading-7 text-[var(--text-faint)]">{copy.extensions}</p>
        <details data-adoption-details className="mt-8 rounded-lg border border-[var(--rule-2)]">
          <summary className="body-text cursor-pointer p-5 font-semibold text-[var(--text-hi)]">{copy.details}</summary>
          <PricingSection id="adoption-options" />
        </details>
      </div>
    </section>
  )
}
