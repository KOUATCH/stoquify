import { Link } from "@/i18n/navigation"
import { ArrowRight } from "lucide-react"
import { useLocale } from "next-intl"
import { landingMessageCopy } from "./landing-message-copy"

export function LandingHero() {
  const copy = landingMessageCopy[useLocale() === "fr" ? "fr" : "en"]
  return (
    <section id="overview" className="landing-hero px-6 py-12 text-[var(--color-text-primary)] sm:py-16 lg:px-8 lg:py-20">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-16">
        <div>
          <p className="body-text max-w-lg text-sm font-semibold leading-6 text-[var(--color-spruce)]">{copy.audience}</p>
          <h1 className="display mt-5 max-w-2xl text-5xl sm:text-6xl lg:text-7xl">{copy.title} <span className="display-italic text-[var(--color-editorial)]">{copy.emphasis}</span>.</h1>
          <p className="body-text mt-6 max-w-2xl text-base leading-8 text-[var(--color-text-secondary)] sm:text-lg">{copy.intro}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/register" className="body-text inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[var(--color-brand-action)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-brand-hover)]">{copy.create}<ArrowRight className="size-4" aria-hidden="true" /></Link>
            <Link href="/#workflow" className="body-text inline-flex min-h-12 items-center justify-center rounded-lg border border-[var(--color-border-muted)] px-5 py-3 text-sm font-semibold transition hover:bg-white/5">{copy.seeWorkflow}</Link>
          </div>
          <p className="body-text mt-4 max-w-xl text-sm leading-6 text-[var(--color-text-tertiary)]">{copy.accountNote}</p>
        </div>
        <figure data-visual-classification="sample" className="min-w-0 rounded-xl border border-[var(--color-border-muted)] bg-[var(--color-surface-panel)] p-5 shadow-xl shadow-black/15 sm:p-7">
          <figcaption className="body-text text-xs leading-5 text-[var(--color-text-tertiary)]">{copy.sample}</figcaption>
          <h2 className="body-text mt-3 text-xl font-semibold leading-7">{copy.sampleTitle}</h2>
          <ol className="mt-6 divide-y divide-[var(--color-border-subtle)]">
            {copy.sampleRows.map(([title, detail], index) => <li key={title} className="flex gap-4 py-5">
              <span className="data-text grid size-8 shrink-0 place-items-center rounded-full bg-[var(--color-brand-soft)] text-sm text-[var(--accent-hi)]">{index + 1}</span>
              <div><p className="body-text font-semibold">{title}</p><p className="body-text mt-1 text-sm leading-6 text-[var(--color-text-secondary)]">{detail}</p></div>
            </li>)}
          </ol>
          <p className="body-text mt-3 border-t border-[var(--color-border-subtle)] pt-4 text-xs leading-5 text-[var(--color-text-tertiary)]">{copy.sampleNote}</p>
        </figure>
      </div>
    </section>
  )
}
