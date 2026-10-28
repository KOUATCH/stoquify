import { Calculator, ClipboardCheck, Landmark, PackageSearch, ShoppingCart, Store } from "lucide-react"
import { useTranslations } from "next-intl"

const systems = [
  ["pos", Store],
  ["inventory", PackageSearch],
  ["purchasing", ShoppingCart],
  ["finance", Landmark],
  ["attendance", Calculator],
  ["approvals", ClipboardCheck],
] as const

export function DisconnectProblem() {
  const t = useTranslations("landing.problem")

  return (
    <section id="problem" className="surface-grid scroll-mt-20 bg-[var(--paper-0)] px-6 py-20 text-[var(--color-text-on-paper)] lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="eyebrow mb-4 !text-[var(--accent)]">{t("eyebrow")}</div>
        <div className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-center">
          <div>
            <h2 className="display text-4xl sm:text-5xl lg:text-6xl">{t("title")}</h2>
            <p className="mt-5 max-w-xl body-text text-lg leading-8 text-[var(--color-text-on-paper-muted)]">{t("copy")}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {systems.map(([system, Icon]) => (
              <div key={system} className="rounded-lg border border-[var(--paper-rule)] bg-[var(--paper-1)] p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[var(--paper-muted)] text-[var(--accent)]">
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <div className="body-text font-semibold">{t(`systems.${system}.title`)}</div>
                </div>
                <div className="mt-3 body-text text-sm leading-6 text-[var(--color-text-on-paper-muted)]">{t(`systems.${system}.copy`)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
