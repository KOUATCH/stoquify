import { Link } from "@/i18n/navigation"
import { useTranslations } from "next-intl"

const plans = [
  "starter",
  "growth",
  "enterprise",
]

export function PricingSection() {
  const t = useTranslations("landing.pricing")

  return (
    <section id="pricing" className="surface-grid bg-[var(--paper-0)] px-6 py-20 text-[var(--color-text-on-paper)] lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="eyebrow mb-4 !text-[var(--accent)]">{t("eyebrow")}</div>
        <h2 className="display max-w-4xl text-4xl sm:text-5xl">{t("title")}</h2>
        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {plans.map((plan, index) => (
            <div key={plan} className={`soft-card rounded-lg p-7 ${index === 1 ? "ring-2 ring-[var(--accent)]" : ""}`}>
              {index === 1 ? <div className="mb-4 inline-flex rounded-lg bg-[var(--accent)]/10 px-3 py-1 data-text text-xs text-[var(--accent)]">{t("popular")}</div> : null}
              <div className="body-text text-xl font-semibold">{t(`plans.${plan}.name`)}</div>
              <div className="mt-5 data-text text-4xl font-semibold">{t(`plans.${plan}.price`)}</div>
              <p className="mt-4 body-text text-[var(--color-text-on-paper-muted)]">{t(`plans.${plan}.description`)}</p>
              <p className="mt-5 body-text text-sm leading-6 text-[var(--color-text-on-paper-muted)]">{t(`plans.${plan}.features`)}</p>
              <Link href="/register" className="mt-8 inline-flex rounded-lg bg-[var(--accent)] px-5 py-3 body-text text-sm font-semibold text-white transition hover:bg-[var(--color-brand-hover)]">{t("choose")}</Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
