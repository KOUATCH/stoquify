import { useTranslations } from "next-intl"

const panels = [
  ["inventory", [82, 54, 68]],
  ["purchase", [64, 78, 42]],
  ["finance", [88, 44, 72]],
]

export function ProductGallery() {
  const t = useTranslations("landing.gallery")

  return (
    <section className="section-divider bg-[var(--ink-1)] px-6 py-20 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="eyebrow mb-4">{t("eyebrow")}</div>
        <h2 className="display max-w-4xl text-4xl text-[var(--text-hi)] sm:text-5xl">{t("title")}</h2>
        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {panels.map(([panel, widths]) => (
            <div key={panel as string} className="frame-glow rounded-lg border border-[var(--rule-1)] bg-[var(--ink-2)] p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="body-text text-lg font-semibold text-[var(--text-hi)]">{t(`panels.${panel}.title`)}</div>
                <div className="rounded-lg bg-white/[0.06] px-2 py-1 data-text text-xs text-[var(--accent-hi)]">{t(`panels.${panel}.meta`)}</div>
              </div>
              <p className="mt-2 body-text text-sm leading-6 text-[var(--text-faint)]">{t(`panels.${panel}.copy`)}</p>
              <div className="mt-6 space-y-3 rounded-lg border border-[var(--rule-1)] bg-black/15 p-4">
                {(widths as number[]).map((width, index) => (
                  <div key={index} className="h-3 rounded bg-white/10">
                    <div className={`h-full rounded ${index === 0 ? "bg-[var(--accent)]" : index === 1 ? "bg-[var(--signal-up)]" : "bg-[var(--signal-warn)]"}`} style={{ width: `${width}%` }} />
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
