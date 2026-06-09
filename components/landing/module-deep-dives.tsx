import { useTranslations } from "next-intl"

const modules = [
  ["inventory", ["a", "b", "c"], [88, 62, 74]],
  ["purchasing", ["a", "b", "c"], [52, 78, 43]],
  ["finance", ["a", "b", "c"], [91, 68, 24]],
]

export function ModuleDeepDives() {
  const t = useTranslations("landing.deepDives")

  return (
    <section className="surface-grid bg-[var(--paper-0)] px-6 py-20 text-[var(--color-text-on-paper)] lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="eyebrow mb-4 !text-[var(--accent)]">{t("eyebrow")}</div>
        <h2 className="display max-w-4xl text-4xl sm:text-5xl">{t("title")}</h2>
        <div className="mt-10 space-y-5">
        {modules.map(([key, labels, values]) => (
          <div key={key as string} className="grid gap-6 rounded-lg border border-[var(--paper-rule)] bg-[var(--paper-1)] p-6 shadow-sm lg:grid-cols-[0.65fr_1.35fr] lg:items-center">
            <div>
              <h3 className="display text-4xl">{t(`items.${key}.title`)}</h3>
              <p className="mt-3 body-text text-lg leading-8 text-[var(--color-text-on-paper-muted)]">{t(`items.${key}.copy`)}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {(labels as string[]).map((label, index) => (
                <div key={label} className="rounded-lg border border-[var(--paper-rule)] bg-[var(--paper-muted)] p-4">
                  <div className="data-text text-xs text-[var(--color-text-on-paper-muted)]">{t(`items.${key}.labels.${label}`)}</div>
                  <div className="mt-5 h-2 rounded bg-black/20">
                    <div
                      className={`h-full rounded ${index === 0 ? "bg-[var(--accent)]" : index === 1 ? "bg-[var(--signal-up)]" : "bg-[var(--signal-warn)]"}`}
                      style={{ width: `${(values as number[])[index]}%` }}
                    />
                  </div>
                  <div className="mt-3 data-text text-sm font-semibold text-[var(--color-text-on-paper)]">{(values as number[])[index]}%</div>
                </div>
              ))}
            </div>
          </div>
        ))}
        </div>
      </div>
    </section>
  )
}
