import { Link } from "@/i18n/navigation"
import {
  ArrowRight,
  BadgeCheck,
  BookCheck,
  Boxes,
  Building2,
  ClipboardCheck,
  Compass,
  DatabaseZap,
  Fingerprint,
  GraduationCap,
  Landmark,
  PackageSearch,
  ReceiptText,
  Scale,
  Search,
  Settings2,
  ShieldCheck,
  Store,
  TrendingUp,
  UserRoundCheck,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import Image from "next/image"
import { useTranslations } from "next-intl"

type PreviewItem = {
  key: string
  Icon: LucideIcon
  tone: string
}

const problemSignals: PreviewItem[] = [
  {
    key: "sales",
    Icon: ReceiptText,
    tone: "text-[var(--signal-up)] bg-[var(--signal-up)]/10",
  },
  {
    key: "stock",
    Icon: Boxes,
    tone: "text-[var(--editorial)] bg-[var(--editorial)]/10",
  },
  {
    key: "close",
    Icon: BookCheck,
    tone: "text-[var(--signal-info)] bg-[var(--signal-info)]/10",
  },
]

const journeyStages: PreviewItem[] = [
  {
    key: "foundation",
    Icon: Compass,
    tone: "text-[var(--accent-hi)] bg-[var(--accent-hi)]/10",
  },
  {
    key: "operation",
    Icon: Store,
    tone: "text-[var(--signal-up)] bg-[var(--signal-up)]/10",
  },
  {
    key: "control",
    Icon: Scale,
    tone: "text-[var(--editorial)] bg-[var(--editorial)]/10",
  },
  {
    key: "growth",
    Icon: TrendingUp,
    tone: "text-[var(--signal-info)] bg-[var(--signal-info)]/10",
  },
]

const proofSignals: PreviewItem[] = [
  {
    key: "source",
    Icon: DatabaseZap,
    tone: "text-[var(--signal-up)] bg-[var(--signal-up)]/10",
  },
  {
    key: "owner",
    Icon: UserRoundCheck,
    tone: "text-[var(--accent-hi)] bg-[var(--accent-hi)]/10",
  },
  {
    key: "decision",
    Icon: ClipboardCheck,
    tone: "text-[var(--signal-info)] bg-[var(--signal-info)]/10",
  },
]

const pathways: PreviewItem[] = [
  {
    key: "retail",
    Icon: Store,
    tone: "text-[var(--signal-up)] bg-[var(--signal-up)]/10",
  },
  {
    key: "inventory",
    Icon: PackageSearch,
    tone: "text-[var(--editorial)] bg-[var(--editorial)]/10",
  },
  {
    key: "finance",
    Icon: Landmark,
    tone: "text-[var(--accent-hi)] bg-[var(--accent-hi)]/10",
  },
  {
    key: "leadership",
    Icon: Building2,
    tone: "text-[var(--signal-info)] bg-[var(--signal-info)]/10",
  },
]

const trustItems: PreviewItem[] = [
  {
    key: "traceability",
    Icon: Fingerprint,
    tone: "text-[var(--signal-up)] bg-[var(--signal-up)]/10",
  },
  {
    key: "access",
    Icon: ShieldCheck,
    tone: "text-[var(--signal-info)] bg-[var(--signal-info)]/10",
  },
  {
    key: "ohada",
    Icon: Scale,
    tone: "text-[var(--editorial)] bg-[var(--editorial)]/10",
  },
]

const adoptionSteps: PreviewItem[] = [
  {
    key: "discovery",
    Icon: Search,
    tone: "text-[var(--accent-hi)] bg-[var(--accent-hi)]/10",
  },
  {
    key: "configuration",
    Icon: Settings2,
    tone: "text-[var(--signal-up)] bg-[var(--signal-up)]/10",
  },
  {
    key: "pilot",
    Icon: GraduationCap,
    tone: "text-[var(--editorial)] bg-[var(--editorial)]/10",
  },
  {
    key: "decision",
    Icon: BadgeCheck,
    tone: "text-[var(--signal-info)] bg-[var(--signal-info)]/10",
  },
]

export function PreviewProblem() {
  const t = useTranslations("landingPreview.founderJourney.problem")

  return (
    <section
      id="problem"
      data-preview-section="problem"
      className="border-b border-[var(--rule-1)] bg-[var(--ink-0)] px-6 py-20 lg:px-8"
    >
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
          <div>
            <div className="eyebrow mb-4">{t("eyebrow")}</div>
            <h2 className="display text-4xl text-[var(--text-hi)] sm:text-5xl">
              {t("title")}
            </h2>
          </div>
          <p className="body-text max-w-3xl text-lg leading-8 text-[var(--text-lo)]">
            {t("description")}
          </p>
        </div>

        <div className="mt-12 grid border-y border-[var(--rule-1)] md:grid-cols-3">
          {problemSignals.map(({ key, Icon, tone }) => (
            <article
              key={key}
              className="min-w-0 border-b border-[var(--rule-1)] p-6 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0"
            >
              <span className={`grid size-10 place-items-center rounded-lg ${tone}`}>
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <h3 className="body-text mt-5 text-xl font-semibold text-[var(--text-hi)]">
                {t(`signals.${key}.title`)}
              </h3>
              <p className="body-text mt-2 text-sm leading-6 text-[var(--text-lo)]">
                {t(`signals.${key}.copy`)}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

export function PreviewJourney() {
  const t = useTranslations("landingPreview.founderJourney.journey")

  return (
    <section
      id="journey"
      data-preview-section="journey"
      className="border-b border-[var(--rule-1)] bg-[var(--ink-1)] px-6 py-20 lg:px-8"
    >
      <div className="mx-auto max-w-7xl">
        <div className="max-w-4xl">
          <div className="eyebrow mb-4">{t("eyebrow")}</div>
          <h2 className="display text-4xl text-[var(--text-hi)] sm:text-5xl">
            {t("title")}
          </h2>
          <p className="body-text mt-5 max-w-3xl text-lg leading-8 text-[var(--text-lo)]">
            {t("description")}
          </p>
        </div>

        <ol className="mt-12 grid border-y border-[var(--rule-2)] md:grid-cols-2 xl:grid-cols-4">
          {journeyStages.map(({ key, Icon, tone }, index) => (
            <li
              key={key}
              data-preview-journey-stage={key}
              className="min-w-0 border-b border-[var(--rule-2)] p-6 md:border-r xl:border-b-0 xl:last:border-r-0"
            >
              <div className="flex items-center justify-between gap-4">
                <span className={`grid size-11 place-items-center rounded-lg ${tone}`}>
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <span className="data-text text-xs font-semibold uppercase text-[var(--text-faint)]">
                  {t("stageLabel", { number: index + 1 })}
                </span>
              </div>
              <h3 className="body-text mt-6 text-xl font-semibold text-[var(--text-hi)]">
                {t(`stages.${key}.title`)}
              </h3>
              <p className="body-text mt-3 text-sm leading-6 text-[var(--text-lo)]">
                {t(`stages.${key}.copy`)}
              </p>
              <p className="data-text mt-5 border-t border-[var(--rule-1)] pt-4 text-xs leading-5 text-[var(--signal-info)]">
                {t(`stages.${key}.boundary`)}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

export function PreviewProof() {
  const t = useTranslations("landingPreview.founderJourney.proof")

  return (
    <section
      id="proof"
      data-preview-section="proof"
      className="border-b border-[var(--rule-1)] bg-[var(--ink-0)] px-6 py-20 lg:px-8"
    >
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-8 lg:grid-cols-[0.7fr_1.3fr] lg:items-end">
          <div>
            <div className="eyebrow mb-4">{t("eyebrow")}</div>
            <h2 className="display text-4xl text-[var(--text-hi)] sm:text-5xl">
              {t("title")}
            </h2>
          </div>
          <p className="body-text max-w-3xl text-lg leading-8 text-[var(--text-lo)]">
            {t("description")}
          </p>
        </div>

        <figure
          data-preview-product-evidence
          data-visual-classification="redacted-product"
          className="mt-12 overflow-hidden rounded-lg border border-[var(--rule-2)] bg-[var(--ink-2)] shadow-2xl shadow-black/20"
        >
          <div className="relative aspect-[36/25] w-full overflow-hidden bg-black/20">
            <Image
              src="/images/product-command-branch-close-2026-07-18.png"
              alt={t("imageAlt")}
              fill
              className="object-cover object-left-top"
              sizes="(min-width: 1280px) 80rem, 100vw"
            />
          </div>
          <figcaption className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--rule-1)] px-5 py-4">
            <span className="body-text text-sm font-semibold text-[var(--text-hi)]">
              {t("caption")}
            </span>
            <span className="data-text text-xs text-[var(--accent-hi)]">
              {t("classification")}
            </span>
          </figcaption>
        </figure>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {proofSignals.map(({ key, Icon, tone }) => (
            <div key={key} className="flex min-w-0 gap-4 border-t border-[var(--rule-2)] pt-5">
              <span className={`grid size-10 shrink-0 place-items-center rounded-lg ${tone}`}>
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h3 className="body-text text-base font-semibold text-[var(--text-hi)]">
                  {t(`signals.${key}.title`)}
                </h3>
                <p className="body-text mt-1 text-sm leading-6 text-[var(--text-lo)]">
                  {t(`signals.${key}.copy`)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function PreviewPathways() {
  const t = useTranslations("landingPreview.founderJourney.pathways")

  return (
    <section
      id="pathways"
      data-preview-section="pathways"
      className="border-b border-[var(--rule-1)] bg-[var(--ink-1)] px-6 py-20 lg:px-8"
    >
      <div className="mx-auto max-w-7xl">
        <div className="max-w-4xl">
          <div className="eyebrow mb-4">{t("eyebrow")}</div>
          <h2 className="display text-4xl text-[var(--text-hi)] sm:text-5xl">
            {t("title")}
          </h2>
          <p className="body-text mt-5 max-w-3xl text-lg leading-8 text-[var(--text-lo)]">
            {t("description")}
          </p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {pathways.map(({ key, Icon, tone }) => (
            <article
              key={key}
              data-preview-pathway={key}
              className="flex min-h-[20rem] min-w-0 flex-col rounded-lg border border-[var(--rule-2)] bg-[var(--ink-2)] p-6"
            >
              <span className={`grid size-11 place-items-center rounded-lg ${tone}`}>
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <div className="data-text mt-6 text-xs font-semibold uppercase text-[var(--accent-hi)]">
                {t(`items.${key}.job`)}
              </div>
              <h3 className="body-text mt-3 text-xl font-semibold text-[var(--text-hi)]">
                {t(`items.${key}.title`)}
              </h3>
              <p className="body-text mt-3 text-sm leading-6 text-[var(--text-lo)]">
                {t(`items.${key}.outcome`)}
              </p>
              <div className="data-text mt-auto border-t border-[var(--rule-1)] pt-4 text-xs leading-5 text-[var(--signal-info)]">
                {t(`items.${key}.proof`)}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

export function PreviewTrust() {
  const t = useTranslations("landingPreview.founderJourney.trust")

  return (
    <section
      id="trust"
      data-preview-section="trust"
      className="border-b border-[var(--rule-1)] bg-[var(--ink-0)] px-6 py-20 lg:px-8"
    >
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-end">
          <div>
            <div className="eyebrow mb-4">{t("eyebrow")}</div>
            <h2 className="display text-4xl text-[var(--text-hi)] sm:text-5xl">
              {t("title")}
            </h2>
          </div>
          <p className="body-text max-w-3xl text-lg leading-8 text-[var(--text-lo)]">
            {t("description")}
          </p>
        </div>

        <div className="mt-12 grid border-y border-[var(--rule-2)] md:grid-cols-3">
          {trustItems.map(({ key, Icon, tone }) => (
            <article
              key={key}
              className="min-w-0 border-b border-[var(--rule-2)] p-6 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0"
            >
              <span className={`grid size-11 place-items-center rounded-lg ${tone}`}>
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <h3 className="body-text mt-5 text-xl font-semibold text-[var(--text-hi)]">
                {t(`items.${key}.title`)}
              </h3>
              <p className="body-text mt-3 text-sm leading-6 text-[var(--text-lo)]">
                {t(`items.${key}.copy`)}
              </p>
              <p className="data-text mt-4 text-xs leading-5 text-[var(--signal-info)]">
                {t(`items.${key}.boundary`)}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

export function PreviewAdoption() {
  const t = useTranslations("landingPreview.founderJourney.adoption")

  return (
    <section
      id="adoption"
      data-preview-section="adoption"
      className="bg-[var(--ink-1)] px-6 py-20 lg:px-8"
    >
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
          <div>
            <div className="eyebrow mb-4">{t("eyebrow")}</div>
            <h2 className="display text-4xl text-[var(--text-hi)] sm:text-5xl">
              {t("title")}
            </h2>
          </div>
          <p className="body-text max-w-3xl text-lg leading-8 text-[var(--text-lo)]">
            {t("description")}
          </p>
        </div>

        <ol className="mt-12 grid gap-px overflow-hidden rounded-lg border border-[var(--rule-2)] bg-[var(--rule-2)] md:grid-cols-2 xl:grid-cols-4">
          {adoptionSteps.map(({ key, Icon, tone }, index) => (
            <li key={key} className="min-w-0 bg-[var(--ink-2)] p-6">
              <div className="flex items-center justify-between gap-4">
                <span className={`grid size-10 place-items-center rounded-lg ${tone}`}>
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <span className="data-text text-xs font-semibold text-[var(--text-faint)]">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </div>
              <h3 className="body-text mt-5 text-lg font-semibold text-[var(--text-hi)]">
                {t(`steps.${key}.title`)}
              </h3>
              <p className="body-text mt-2 text-sm leading-6 text-[var(--text-lo)]">
                {t(`steps.${key}.copy`)}
              </p>
            </li>
          ))}
        </ol>

        <div className="mt-10 flex flex-col gap-5 border-t border-[var(--rule-2)] pt-8 lg:flex-row lg:items-center lg:justify-between">
          <p className="data-text max-w-3xl text-xs leading-6 text-[var(--signal-info)]">
            {t("boundary")}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/#pricing"
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-brand-action)] px-5 py-3 body-text text-sm font-semibold text-white transition hover:bg-[var(--color-brand-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-hi)]"
            >
              {t("primaryCta")}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--rule-2)] px-5 py-3 body-text text-sm font-semibold text-[var(--text-hi)] transition hover:border-[var(--rule-3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-hi)]"
            >
              {t("secondaryCta")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
