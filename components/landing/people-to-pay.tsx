import { Link } from "@/i18n/navigation"
import {
  ArrowDown,
  ArrowRight,
  BriefcaseBusiness,
  CircleCheckBig,
  FileCheck2,
  Landmark,
  LockKeyhole,
  ShieldAlert,
  UserRoundCheck,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useTranslations } from "next-intl"

type Stage = {
  key: string
  Icon: LucideIcon
  tone: string
}

const stages: Stage[] = [
  {
    key: "people",
    Icon: BriefcaseBusiness,
    tone: "border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/10",
  },
  {
    key: "payroll",
    Icon: UserRoundCheck,
    tone: "border-[var(--signal-up)] text-[var(--signal-up)] bg-[var(--signal-up)]/10",
  },
  {
    key: "proof",
    Icon: FileCheck2,
    tone: "border-[var(--editorial)] text-[var(--editorial)] bg-[var(--editorial)]/10",
  },
  {
    key: "close",
    Icon: Landmark,
    tone: "border-[var(--signal-info)] text-[var(--signal-info)] bg-[var(--signal-info)]/10",
  },
]

export function PeopleToPay() {
  const t = useTranslations("landing.peopleToPay")

  return (
    <section
      id="people-to-pay"
      data-people-to-pay
      className="surface-grid scroll-mt-20 bg-[var(--paper-0)] px-6 py-20 text-[var(--color-text-on-paper)] lg:px-8"
    >
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
          <div>
            <div className="eyebrow mb-4 !text-[var(--accent)]">{t("eyebrow")}</div>
            <h2 className="display text-4xl sm:text-5xl">{t("title")}</h2>
          </div>
          <p className="body-text text-lg leading-8 text-[var(--color-text-on-paper-muted)]">
            {t("description")}
          </p>
        </div>

        <div
          data-people-flow-summary
          className="mt-10 flex flex-col gap-3 border-y border-[var(--paper-rule)] bg-[var(--paper-1)] px-5 py-5 sm:flex-row sm:items-center sm:gap-5"
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-[var(--accent)]/10 text-[var(--accent)]">
            <LockKeyhole className="size-5" aria-hidden="true" />
          </span>
          <div>
            <div className="data-text text-xs font-semibold uppercase text-[var(--accent)]">
              {t("flowLabel")}
            </div>
            <p className="body-text mt-1 text-base font-semibold leading-7 sm:text-lg">
              {t("flowSummary")}
            </p>
          </div>
        </div>

        <ol
          data-people-to-pay-flow
          aria-label={t("flowAria")}
          className="grid border-b border-[var(--paper-rule)] lg:grid-cols-4"
        >
          {stages.map(({ key, Icon, tone }, index) => (
            <li
              key={key}
              data-people-stage={key}
              className="relative flex min-w-0 flex-col border-b border-[var(--paper-rule)] px-5 py-7 last:border-b-0 lg:min-h-[28rem] lg:border-b-0 lg:border-r lg:px-6 lg:last:border-r-0"
            >
              <div className="flex items-center justify-between gap-4">
                <span className={`grid size-11 place-items-center rounded-lg border ${tone}`}>
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <span className="data-text text-xs font-semibold uppercase text-[var(--color-text-on-paper-muted)]">
                  {t("stageLabel", { number: index + 1 })}
                </span>
              </div>

              <div className="mt-5 flex items-center gap-2 data-text text-xs font-semibold uppercase text-[var(--color-text-on-paper-muted)]">
                <LockKeyhole className="size-3.5 shrink-0 text-[var(--accent)]" aria-hidden="true" />
                <span>{t("ownerLabel")}</span>
                <span aria-hidden="true">/</span>
                <span className="text-[var(--color-text-on-paper)]">{t(`stages.${key}.owner`)}</span>
              </div>

              <h3 className="mt-4 body-text text-xl font-semibold">{t(`stages.${key}.title`)}</h3>
              <p className="mt-3 body-text text-sm leading-6 text-[var(--color-text-on-paper-muted)]">
                {t(`stages.${key}.copy`)}
              </p>

              <dl className="mt-6 grid gap-4 border-t border-[var(--paper-rule)] pt-5">
                <div>
                  <dt className="data-text text-xs font-semibold uppercase text-[var(--color-text-on-paper-muted)]">
                    {t("inputLabel")}
                  </dt>
                  <dd className="body-text mt-1 text-sm leading-6">{t(`stages.${key}.input`)}</dd>
                </div>
                <div>
                  <dt className="data-text text-xs font-semibold uppercase text-[var(--color-text-on-paper-muted)]">
                    {t("proofLabel")}
                  </dt>
                  <dd className="body-text mt-1 flex items-start gap-2 text-sm font-semibold leading-6">
                    <CircleCheckBig
                      className="mt-1 size-4 shrink-0 text-[var(--signal-up)]"
                      aria-hidden="true"
                    />
                    <span>{t(`stages.${key}.output`)}</span>
                  </dd>
                </div>
              </dl>

              <div className="mt-auto pt-6">
                <span className="inline-flex items-center rounded-lg border border-[var(--paper-rule)] bg-[var(--paper-1)] px-3 py-2 data-text text-xs font-semibold text-[var(--color-text-on-paper-muted)]">
                  {t(`stages.${key}.status`)}
                </span>
              </div>

              {index < stages.length - 1 ? (
                <>
                  <ArrowDown
                    className="mx-auto mt-6 size-5 text-[var(--accent)] lg:hidden"
                    aria-hidden="true"
                  />
                  <span
                    className="absolute -right-3 top-10 z-10 hidden size-6 place-items-center rounded-full border border-[var(--paper-rule)] bg-[var(--paper-0)] text-[var(--accent)] lg:grid"
                    aria-hidden="true"
                  >
                    <ArrowRight className="size-3.5" />
                  </span>
                </>
              ) : null}
            </li>
          ))}
        </ol>

        <div className="mt-10 overflow-hidden border-y border-[#2a373d] bg-[#10181d] text-white">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
            <div data-people-implemented className="border-b border-white/10 p-6 lg:border-b-0 lg:border-r lg:p-8">
              <div className="flex items-center gap-2 data-text text-xs font-semibold uppercase text-[#7de8dc]">
                <CircleCheckBig className="size-4" aria-hidden="true" />
                {t("liveLabel")}
              </div>
              <h3 className="mt-3 body-text text-2xl font-semibold">{t("statusTitle")}</h3>
              <p className="mt-3 body-text text-sm leading-7 text-[#b9c8c3]">{t("statusBody")}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/#pricing"
                  className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-brand-action)] px-4 py-2.5 body-text text-sm font-semibold text-white transition hover:bg-[var(--color-brand-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  {t("peopleCta")}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
                <Link
                  href="/#pricing"
                  className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-4 py-2.5 body-text text-sm font-semibold text-white transition hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  {t("payrollCta")}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
            <div data-people-gated className="p-6 lg:p-8">
              <div className="flex items-center gap-2 data-text text-xs font-semibold uppercase text-[#f2bf63]">
                <ShieldAlert className="size-4" aria-hidden="true" />
                {t("gatedLabel")}
              </div>
              <h3 className="mt-3 body-text text-xl font-semibold">{t("boundaryTitle")}</h3>
              <p className="mt-3 body-text text-sm leading-7 text-[#b9c8c3]">{t("boundaryBody")}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
