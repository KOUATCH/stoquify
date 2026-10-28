import Image from "next/image"
import { ArrowDown, ShieldCheck } from "lucide-react"
import { useTranslations } from "next-intl"

export function PreviewHero() {
  const t = useTranslations("landingPreview.founderJourney.hero")

  return (
    <section
      id="preview-overview"
      data-preview-section="hero"
      className="relative isolate flex min-h-[calc(100svh-10rem)] items-end overflow-hidden border-b border-[var(--rule-1)]"
    >
      <Image
        src="/images/product-command-branch-close-2026-07-18.png"
        alt={t("imageAlt")}
        fill
        priority
        className="object-cover object-left-top"
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-black/70" aria-hidden="true" />
      <div
        className="absolute inset-y-0 left-0 w-full bg-[var(--ink-0)]/80 lg:w-[64%]"
        aria-hidden="true"
      />

      <div className="relative mx-auto w-full max-w-7xl px-6 pb-12 pt-20 lg:px-8 lg:pb-16">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 data-text text-xs font-semibold uppercase text-[var(--accent-hi)]">
            <ShieldCheck className="size-4" aria-hidden="true" />
            {t("category")}
          </div>
          <h1 className="display mt-5 text-5xl text-white sm:text-6xl lg:text-7xl">
            {t("brand")}
          </h1>
          <p className="display mt-4 max-w-3xl text-3xl leading-tight text-white sm:text-4xl lg:text-5xl">
            {t("promise")}
          </p>
          <p className="body-text mt-6 max-w-2xl text-base leading-7 text-white/78 sm:text-lg sm:leading-8">
            {t("copy")}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#adoption"
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-brand-action)] px-5 py-3 body-text text-sm font-semibold text-white transition hover:bg-[var(--color-brand-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              {t("primaryCta")}
              <ArrowDown className="size-4" aria-hidden="true" />
            </a>
            <a
              href="#proof"
              className="inline-flex items-center gap-2 rounded-lg border border-white/35 bg-black/20 px-5 py-3 body-text text-sm font-semibold text-white transition hover:border-white/65 hover:bg-black/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              {t("secondaryCta")}
            </a>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-3 data-text text-xs text-white/65">
          <span>{t("evidenceLabel")}</span>
          <span className="h-1 w-1 rounded-full bg-[var(--accent-hi)]" aria-hidden="true" />
          <span>{t("classification")}</span>
        </div>
      </div>
    </section>
  )
}
