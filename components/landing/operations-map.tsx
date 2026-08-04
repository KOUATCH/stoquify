import { Link } from "@/i18n/navigation"
import {
  ArrowRight,
  Compass,
  Landmark,
  Scale,
  ShieldCheck,
  ShoppingCart,
  Store,
  TrendingUp,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useTranslations } from "next-intl"

type OperatingModule = {
  key: string
  href: string
  Icon: LucideIcon
  tone: string
}

const modules: OperatingModule[] = [
  { key: "retailControl", href: "/#pricing", Icon: Store, tone: "text-[var(--signal-up)] bg-[var(--signal-up)]/10" },
  { key: "cashClose", href: "/#pricing", Icon: Landmark, tone: "text-[var(--editorial)] bg-[var(--editorial)]/10" },
  { key: "procurement", href: "/#pricing", Icon: ShoppingCart, tone: "text-[var(--accent-hi)] bg-[var(--accent-hi)]/10" },
  { key: "regulatedOps", href: "/#pricing", Icon: ShieldCheck, tone: "text-[var(--signal-info)] bg-[var(--signal-info)]/10" },
]

const founderStages: Array<Pick<OperatingModule, "key" | "Icon" | "tone">> = [
  { key: "foundation", Icon: Compass, tone: "text-[var(--accent-hi)] bg-[var(--accent-hi)]/10" },
  { key: "launch", Icon: Store, tone: "text-[var(--signal-up)] bg-[var(--signal-up)]/10" },
  { key: "control", Icon: Scale, tone: "text-[var(--editorial)] bg-[var(--editorial)]/10" },
  { key: "growth", Icon: TrendingUp, tone: "text-[var(--signal-info)] bg-[var(--signal-info)]/10" },
]

export function OperationsMap() {
  const t = useTranslations("landing.operations")

  return (
    <section id="modules" className="section-divider scroll-mt-20 bg-[var(--ink-1)] px-6 py-16 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="eyebrow mb-4">{t("eyebrow")}</div>
        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
          <h2 className="display text-4xl text-[var(--text-hi)] sm:text-5xl">{t("title")}</h2>
          <p className="body-text text-lg leading-8 text-[var(--text-lo)]">{t("description")}</p>
        </div>

        <div data-founder-journey className="mt-10 border-y border-[var(--rule-2)] py-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="max-w-3xl">
              <div className="data-text text-xs font-semibold uppercase text-[var(--accent-hi)]">
                {t("founderJourney.eyebrow")}
              </div>
              <h3 data-founder-journey-title className="display mt-3 text-3xl text-[var(--text-hi)] sm:text-4xl">
                {t("founderJourney.title")}
              </h3>
              <p className="body-text mt-3 max-w-2xl text-base leading-7 text-[var(--text-lo)]">
                {t("founderJourney.description")}
              </p>
            </div>
            <Link
              href="/#pricing"
              data-founder-journey-cta
              className="inline-flex w-fit items-center gap-2 rounded-lg border border-[var(--rule-3)] px-4 py-3 body-text text-sm font-semibold text-[var(--text-hi)] transition hover:border-[var(--accent-hi)] hover:text-[var(--accent-hi)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-hi)]"
            >
              {t("founderJourney.cta")}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>

          <ol
            aria-label={t("founderJourney.title")}
            className="mt-8 grid border-y border-[var(--rule-1)] md:grid-cols-2 xl:grid-cols-4"
          >
            {founderStages.map(({ key, Icon, tone }, index) => (
              <li
                key={key}
                data-founder-stage={key}
                className="min-w-0 border-b border-[var(--rule-1)] p-5 last:border-b-0 md:border-r xl:border-b-0 xl:last:border-r-0"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className={`grid size-10 shrink-0 place-items-center rounded-lg ${tone}`}>
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="data-text text-xs font-semibold uppercase text-[var(--text-faint)]">
                    {t("founderJourney.stageLabel", { number: index + 1 })}
                  </span>
                </div>
                <h4 className="body-text mt-5 text-lg font-semibold text-[var(--text-hi)]">
                  {t(`founderJourney.stages.${key}.title`)}
                </h4>
                <p className="body-text mt-2 text-sm leading-6 text-[var(--text-lo)]">
                  {t(`founderJourney.stages.${key}.copy`)}
                </p>
                <p className="data-text mt-4 border-t border-[var(--rule-1)] pt-3 text-xs leading-5 text-[var(--signal-info)]">
                  {t(`founderJourney.stages.${key}.boundary`)}
                </p>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {modules.map(({ key, href, Icon, tone }) => (
            <Link
              key={key}
              href={href}
              data-operations-module={key}
              className="glass-panel group flex min-h-[14.5rem] flex-col rounded-lg p-5 transition hover:-translate-y-1 hover:border-[var(--rule-3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-hi)]"
            >
              <div className="flex items-center justify-between gap-4">
                <span className={`grid size-10 place-items-center rounded-lg ${tone}`}>
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <span className="data-text text-xs uppercase tracking-[0.18em] text-[var(--accent-hi)]">{t("moduleLabel")}</span>
              </div>
              <h3 className="mt-5 body-text text-xl font-semibold text-[var(--text-hi)]">{t(`modules.${key}.name`)}</h3>
              <p className="mt-2 body-text text-sm leading-6 text-[var(--text-faint)]">{t(`modules.${key}.description`)}</p>
              <div className="mt-auto border-t border-[var(--rule-1)] pt-4 data-text text-xs text-[var(--signal-info)]">{t(`modules.${key}.meta`)}</div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
