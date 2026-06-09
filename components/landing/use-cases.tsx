import { useTranslations } from "next-intl"

const cases = [
  "retail",
  "wholesale",
  "restaurants",
  "pharmacies",
  "service",
]

export function UseCases() {
  const t = useTranslations("landing.useCases")

  return (
    <section className="section-divider bg-[var(--ink-1)] px-6 py-20 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="eyebrow mb-4">{t("eyebrow")}</div>
        <h2 className="display max-w-4xl text-4xl text-[var(--text-hi)] sm:text-5xl">{t("title")}</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {cases.map((item) => (
            <div key={item} className="rounded-lg border border-[var(--rule-1)] bg-[var(--ink-2)] p-6">
              <div className="data-text text-xs text-[var(--accent-hi)]">{t(`items.${item}.label`)}</div>
              <div className="body-text text-2xl font-semibold text-[var(--text-hi)]">{t(`items.${item}.title`)}</div>
              <p className="mt-4 body-text leading-7 text-[var(--text-faint)]">{t(`items.${item}.copy`)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
