import { Link } from "@/i18n/navigation"
import { ArrowRight } from "lucide-react"
import { useTranslations } from "next-intl"

export function FinalCTA() {
  const t = useTranslations("landing.finalCta")

  return (
    <section className="relative isolate overflow-hidden bg-[var(--ink-0)] px-6 py-24 text-center lg:px-8">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--accent-hi)]/50 to-transparent" />
      <div className="relative mx-auto max-w-4xl">
        <div className="eyebrow mb-5">{t("eyebrow")}</div>
        <h2 className="display text-4xl text-[var(--text-hi)] sm:text-5xl lg:text-6xl">{t("title")}</h2>
        <p className="mx-auto mt-6 max-w-2xl body-text text-lg leading-8 text-[var(--text-lo)]">{t("copy")}</p>
        <Link href="/register" className="mt-9 inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-6 py-3 body-text text-sm font-semibold text-white transition hover:bg-[var(--accent-hi)]">
          {t("cta")}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  )
}
