import Image from "next/image"
import { useTranslations } from "next-intl"
import { CircleDollarSign, ClipboardCheck, PackageSearch } from "lucide-react"

const panels = [
  { key: "inventory", widths: [82, 54, 68], Icon: PackageSearch, tone: "text-[var(--color-spruce)]", accent: "bg-[var(--color-spruce)]" },
  { key: "purchase", widths: [64, 78, 42], Icon: ClipboardCheck, tone: "text-[var(--signal-warn)]", accent: "bg-[var(--signal-warn)]" },
  { key: "finance", widths: [88, 44, 72], Icon: CircleDollarSign, tone: "text-[var(--accent-hi)]", accent: "bg-[var(--color-brand)]" },
]

export function ProductGallery() {
  const t = useTranslations("landing.gallery")

  return (
    <section id="product" className="section-divider bg-[var(--ink-1)] px-6 py-20 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-8 lg:grid-cols-[0.86fr_1.14fr] lg:items-end">
          <div>
            <div className="eyebrow mb-4">{t("eyebrow")}</div>
            <h2 className="display max-w-4xl text-4xl text-[var(--text-hi)] sm:text-5xl">{t("title")}</h2>
            <p className="mt-5 max-w-2xl body-text text-base leading-8 text-[var(--text-lo)] sm:text-lg">{t("description")}</p>
          </div>
          <div className="gallery-shot frame-glow relative min-h-[18rem] overflow-hidden rounded-lg border border-[var(--rule-1)] bg-[var(--ink-2)] shadow-2xl shadow-black/25">
            <Image
              src="/images/dash.webp"
              alt={t("screenshotAlt")}
              fill
              className="object-cover object-left-top opacity-[0.78]"
              sizes="(min-width: 1024px) 46vw, 100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--ink-1)] via-black/20 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 rounded-lg border border-white/10 bg-black/[0.35] p-3 backdrop-blur-md">
              <div className="data-text text-xs text-[var(--accent-hi)]">{t("preview.meta")}</div>
              <div className="mt-1 body-text text-sm font-semibold text-[var(--text-hi)]">{t("preview.title")}</div>
            </div>
          </div>
        </div>
        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {panels.map(({ key, widths, Icon, tone, accent }) => (
            <div key={key} className="gallery-card frame-glow rounded-lg border border-[var(--rule-1)] bg-[var(--ink-2)] p-5 transition hover:-translate-y-1 hover:border-[var(--rule-3)]">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className={`grid size-10 shrink-0 place-items-center rounded-lg bg-black/[0.15] ${tone}`}>
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <div className="body-text text-lg font-semibold text-[var(--text-hi)]">{t(`panels.${key}.title`)}</div>
                </div>
                <div className="rounded-lg bg-white/[0.06] px-2 py-1 data-text text-xs text-[var(--accent-hi)]">{t(`panels.${key}.meta`)}</div>
              </div>
              <p className="mt-4 body-text text-sm leading-6 text-[var(--text-faint)]">{t(`panels.${key}.copy`)}</p>
              <div className="mt-6 space-y-4 rounded-lg border border-[var(--rule-1)] bg-black/[0.15] p-4">
                {widths.map((width, index) => (
                  <div key={index}>
                    <div className="mb-2 flex items-center justify-between data-text text-[0.66rem] text-[var(--text-dim)]">
                      <span>{t(`panels.${key}.signals.${index + 1}`)}</span>
                      <span>{width}%</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded bg-white/10">
                      <div className={`h-full rounded ${index === 0 ? accent : index === 1 ? "bg-[var(--signal-up)]" : "bg-[var(--editorial)]"}`} style={{ width: `${width}%` }} />
                    </div>
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
