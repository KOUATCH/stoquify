import { Link } from "@/i18n/navigation"
import { ArrowLeft, Languages, ScanSearch } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"

export function PreviewBar() {
  const t = useTranslations("landingPreview.founderJourney.previewBar")
  const locale = useLocale()
  const targetLocale = locale === "fr" ? "en" : "fr"

  return (
    <aside
      data-preview-bar
      className="sticky top-16 z-40 border-b border-[var(--rule-2)] bg-[var(--ink-1)]/95 backdrop-blur"
    >
      <div className="mx-auto flex min-h-12 max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-2 lg:px-8">
        <div className="inline-flex min-w-0 items-center gap-2 data-text text-xs font-semibold uppercase text-[var(--accent-hi)]">
          <ScanSearch className="size-4 shrink-0" aria-hidden="true" />
          <span>{t("status")}</span>
        </div>
        <nav aria-label={t("aria")} className="flex items-center gap-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--rule-2)] px-3 py-2 body-text text-xs font-semibold text-[var(--text-lo)] transition hover:border-[var(--rule-3)] hover:text-[var(--text-hi)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-hi)]"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            {t("currentLanding")}
          </Link>
          <Link
            href="/landing-preview/founder-journey"
            locale={targetLocale}
            aria-label={t("languageAria")}
            className="grid size-9 place-items-center rounded-lg border border-[var(--rule-2)] text-[var(--text-lo)] transition hover:border-[var(--rule-3)] hover:text-[var(--text-hi)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-hi)]"
          >
            <Languages className="size-4" aria-hidden="true" />
          </Link>
        </nav>
      </div>
    </aside>
  )
}
