import { useTranslations } from "next-intl"

const rules = [
  "stock",
  "margin",
  "transfer",
]

export function AutomationSection() {
  const t = useTranslations("landing.automation")

  return (
    <section className="section-divider bg-[var(--ink-0)] px-6 py-20 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="eyebrow mb-4">{t("eyebrow")}</div>
        <h2 className="display max-w-4xl text-4xl text-[var(--text-hi)] sm:text-5xl">{t("title")}</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {rules.map((rule) => (
            <div key={rule} className="rounded-lg border border-[var(--rule-1)] bg-[var(--ink-2)] p-6">
              <div className="data-text text-xs text-[var(--signal-warn)]">{t("when")}</div>
              <div className="mt-2 body-text text-lg font-semibold text-[var(--text-hi)]">{t(`rules.${rule}.when`)}</div>
              <div className="mt-8 data-text text-xs text-[var(--signal-up)]">{t("then")}</div>
              <div className="mt-2 body-text text-[var(--text-lo)]">{t(`rules.${rule}.then`)}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
