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
    <section id="product" className="section-divider scroll-mt-20 bg-[var(--ink-1)] px-6 py-20 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-8 lg:grid-cols-[0.88fr_1.12fr] lg:items-stretch">
          <div className="min-w-0">
            <div className="eyebrow mb-4">{t("eyebrow")}</div>
            <h2 className="display max-w-4xl text-4xl text-[var(--text-hi)] sm:text-5xl">{t("title")}</h2>
            <p className="mt-5 max-w-2xl body-text text-base leading-8 text-[var(--text-lo)] sm:text-lg">{t("description")}</p>

            <div className="mt-6 flex max-w-2xl flex-wrap gap-2">
              <span className="rounded-lg border border-[var(--rule-1)] bg-black/[0.16] px-3 py-2 data-text text-[0.66rem] text-[var(--accent-hi)]">
                {t("preview.meta")}
              </span>
              <span className="rounded-lg border border-[var(--rule-1)] bg-white/[0.045] px-3 py-2 data-text text-[0.66rem] text-[var(--text-faint)]">
                {t("preview.classification")}
              </span>
            </div>
          </div>

          <figure
            data-product-command-evidence
            data-visual-classification="redacted-product"
            className="gallery-shot frame-glow order-2 flex h-full min-h-[28rem] flex-col overflow-hidden rounded-lg border border-[var(--rule-1)] bg-[var(--ink-2)] shadow-2xl shadow-black/25 sm:min-h-[34rem] lg:order-none lg:row-span-2 lg:min-h-[48rem]"
          >
            <div className="relative min-h-[22rem] flex-1 overflow-hidden bg-black/20 sm:min-h-[28rem] lg:min-h-0">
              <Image
                src="/images/product-command-branch-close-2026-07-18.png"
                alt={t("screenshotAlt")}
                fill
                className="object-cover object-left-top"
                sizes="(min-width: 1024px) 46vw, 100vw"
              />
            </div>
            <figcaption className="border-t border-[var(--rule-1)] bg-[var(--ink-2)] px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="data-text text-xs text-[var(--accent-hi)]">{t("preview.meta")}</div>
                <span className="rounded-lg border border-[var(--rule-1)] bg-black/[0.16] px-2 py-1 data-text text-[0.66rem] text-[var(--text-faint)]">
                  {t("preview.classification")}
                </span>
              </div>
              <div className="mt-1 body-text text-sm font-semibold text-[var(--text-hi)]">{t("preview.title")}</div>
            </figcaption>
          </figure>

          <div className="order-3 grid gap-4 lg:order-none lg:col-start-1">
            {panels.map(({ key, widths, Icon, tone, accent }) => (
              <article
                key={key}
                className="gallery-card frame-glow rounded-lg border border-[var(--rule-1)] bg-[var(--ink-2)] p-4 transition hover:-translate-y-1 hover:border-[var(--rule-3)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className={`grid size-10 shrink-0 place-items-center rounded-lg bg-black/[0.15] ${tone}`}>
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="body-text text-base font-semibold leading-6 text-[var(--text-hi)]">{t(`panels.${key}.title`)}</h3>
                      <p className="mt-1 body-text text-sm leading-6 text-[var(--text-faint)]">{t(`panels.${key}.copy`)}</p>
                    </div>
                  </div>
                  <div className="shrink-0 rounded-lg bg-white/[0.06] px-2 py-1 data-text text-xs text-[var(--accent-hi)]">{t(`panels.${key}.meta`)}</div>
                </div>
                <div className="mt-4 grid gap-3 rounded-lg border border-[var(--rule-1)] bg-black/[0.15] p-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                  {widths.map((width, index) => (
                    <div key={index} className="min-w-0">
                      <div className="mb-2 flex items-start justify-between gap-2 data-text text-[0.62rem] leading-4 text-[var(--text-dim)]">
                        <span>{t(`panels.${key}.signals.${index + 1}`)}</span>
                        <span className="shrink-0">{width}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded bg-white/10">
                        <div className={`h-full rounded ${index === 0 ? accent : index === 1 ? "bg-[var(--signal-up)]" : "bg-[var(--editorial)]"}`} style={{ width: `${width}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
