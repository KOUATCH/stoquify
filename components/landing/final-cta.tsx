import { Link } from "@/i18n/navigation"
import { ArrowRight } from "lucide-react"
import { useLocale } from "next-intl"
import { landingMessageCopy } from "./landing-message-copy"

export function FinalCTA() {
  const copy = landingMessageCopy[useLocale() === "fr" ? "fr" : "en"]
  return (
    <section id="get-started" className="section-divider bg-[var(--ink-1)] px-6 py-16 text-center lg:px-8">
      <div className="mx-auto max-w-3xl">
        <h2 className="display text-4xl text-[var(--text-hi)] sm:text-5xl">{copy.finalTitle}</h2>
        <Link href="/register" className="body-text mt-8 inline-flex min-h-12 items-center gap-2 rounded-lg bg-[var(--color-brand-action)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-brand-hover)]">{copy.create}<ArrowRight className="size-4" aria-hidden="true" /></Link>
        <p className="body-text mt-5 text-sm leading-7 text-[var(--text-lo)]">{copy.finalBody} <Link href="/login" className="font-semibold text-[var(--accent-hi)] underline underline-offset-4">{copy.login}</Link></p>
      </div>
    </section>
  )
}
