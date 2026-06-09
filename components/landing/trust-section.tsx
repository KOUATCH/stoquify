import { CheckCircle2 } from "lucide-react"
import { useTranslations } from "next-intl"

const points = [
  "permissions",
  "audit",
  "branches",
  "finance",
]

export function TrustSection() {
  const t = useTranslations("landing.trust")

  return (
    <section id="trust" className="surface-grid bg-[var(--paper-0)] px-6 py-20 text-[var(--color-text-on-paper)] lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="eyebrow mb-4 !text-[var(--accent)]">{t("eyebrow")}</div>
        <h2 className="display max-w-4xl text-4xl sm:text-5xl">{t("title")}</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-4">
          {points.map((point) => (
            <div key={point} className="rounded-lg border border-[var(--paper-rule)] bg-[var(--paper-1)] p-5 shadow-sm">
              <CheckCircle2 className="size-5 text-[var(--accent)]" aria-hidden="true" />
              <div className="mt-4 body-text font-semibold">{t(`points.${point}.title`)}</div>
              <p className="mt-2 body-text text-sm leading-6 text-[var(--color-text-on-paper-muted)]">{t(`points.${point}.copy`)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
