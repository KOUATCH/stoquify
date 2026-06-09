import { useTranslations } from "next-intl"

const steps = [
  "sale",
  "stock",
  "reorder",
  "approval",
  "finance",
]

export function ConnectedWorkflow() {
  const t = useTranslations("landing.workflow")

  return (
    <section id="workflow" className="section-divider relative isolate overflow-hidden bg-[var(--ink-0)] px-6 py-20 lg:px-8">
      <div className="landing-grid-bg absolute inset-0" />
      <div className="relative mx-auto max-w-7xl">
        <div className="eyebrow mb-4">{t("eyebrow")}</div>
        <h2 className="display max-w-4xl text-4xl text-[var(--text-hi)] sm:text-5xl lg:text-6xl">{t("title")}</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-5">
          {steps.map((step, index) => (
            <div key={step} className="glass-panel rounded-lg p-5">
              <div className="data-text text-sm text-[var(--accent-hi)]">0{index + 1}</div>
              <div className="mt-8 body-text text-lg font-semibold text-[var(--text-hi)]">{t(`steps.${step}.title`)}</div>
              <p className="mt-3 body-text text-sm leading-6 text-[var(--text-faint)]">{t(`steps.${step}.copy`)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
