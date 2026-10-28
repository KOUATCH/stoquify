import { useTranslations } from "next-intl"

const systems = ["pos", "inventory", "purchasing", "finance", "attendance", "approvals"]

export function DisconnectProblem() {
  const t = useTranslations("landing.problem")

  return (
    <section className="surface-grid bg-[var(--paper-0)] px-6 py-20 text-[var(--color-text-on-paper)] lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="eyebrow mb-4 !text-[var(--accent)]">{t("eyebrow")}</div>
        <div className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-center">
          <h2 className="display text-4xl sm:text-5xl lg:text-6xl">{t("title")}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {systems.map((system) => (
              <div key={system} className="rounded-lg border border-[var(--paper-rule)] bg-[var(--paper-1)] p-5 shadow-sm">
                <div className="body-text font-semibold">{t(`systems.${system}`)}</div>
                <div className="mt-2 body-text text-sm text-[var(--color-text-on-paper-muted)]">{t("copy")}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
