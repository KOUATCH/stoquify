import { Link } from "@/i18n/navigation"
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  FileCheck2,
  Landmark,
  ShieldAlert,
  UserRoundCheck,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useTranslations } from "next-intl"

type Stage = {
  key: string
  Icon: LucideIcon
}

const stages: Stage[] = [
  { key: "people", Icon: BriefcaseBusiness },
  { key: "payroll", Icon: UserRoundCheck },
  { key: "proof", Icon: FileCheck2 },
  { key: "close", Icon: Landmark },
]

export function PeopleToPay() {
  const t = useTranslations("landing.peopleToPay")

  return (
    <section id="people-to-pay" data-people-to-pay className="surface-grid scroll-mt-20 bg-[var(--paper-0)] px-6 py-20 text-[var(--color-text-on-paper)] lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
          <div>
            <div className="eyebrow mb-4 !text-[var(--accent)]">{t("eyebrow")}</div>
            <h2 className="display text-4xl sm:text-5xl">{t("title")}</h2>
          </div>
          <p className="body-text text-lg leading-8 text-[var(--color-text-on-paper-muted)]">{t("description")}</p>
        </div>

        <div className="mt-10 grid border-y border-[var(--paper-rule)] md:grid-cols-4">
          {stages.map(({ key, Icon }, index) => (
            <div
              key={key}
              className="relative min-h-[15rem] border-b border-[var(--paper-rule)] px-5 py-6 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0"
            >
              <div className="flex items-center justify-between">
                <span className="grid size-10 place-items-center rounded-lg bg-[var(--paper-muted)] text-[var(--accent)]">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <span className="data-text text-xs text-[var(--color-text-on-paper-muted)]">{String(index + 1).padStart(2, "0")}</span>
              </div>
              <h3 className="mt-5 body-text text-xl font-semibold">{t(`stages.${key}.title`)}</h3>
              <p className="mt-3 body-text text-sm leading-6 text-[var(--color-text-on-paper-muted)]">{t(`stages.${key}.copy`)}</p>
              <div className="mt-5 flex items-start gap-2 text-sm font-semibold text-[var(--color-text-on-paper)]">
                <BadgeCheck className="mt-0.5 size-4 shrink-0 text-[var(--signal-up)]" aria-hidden="true" />
                <span>{t(`stages.${key}.signal`)}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 grid overflow-hidden rounded-lg bg-[#10181d] text-white shadow-[0_24px_70px_rgba(16,24,29,0.20)] lg:grid-cols-[1.1fr_0.9fr]">
          <div className="border-b border-white/10 p-6 lg:border-b-0 lg:border-r lg:p-8">
            <div className="data-text text-xs uppercase text-[#7de8dc]">{t("liveLabel")}</div>
            <h3 className="mt-3 body-text text-2xl font-semibold">{t("statusTitle")}</h3>
            <p className="mt-3 body-text text-sm leading-7 text-[#b9c8c3]">{t("statusBody")}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/dashboard/people" className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-brand-action)] px-4 py-2.5 body-text text-sm font-semibold text-white transition hover:bg-[var(--color-brand-hover)]">
                {t("peopleCta")}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <Link href="/dashboard/payroll" className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-4 py-2.5 body-text text-sm font-semibold text-white transition hover:bg-white/[0.07]">
                {t("payrollCta")}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
          <div className="p-6 lg:p-8">
            <div className="flex items-center gap-2 data-text text-xs uppercase text-[#f2bf63]">
              <ShieldAlert className="size-4" aria-hidden="true" />
              {t("gatedLabel")}
            </div>
            <h3 className="mt-3 body-text text-xl font-semibold">{t("boundaryTitle")}</h3>
            <p className="mt-3 body-text text-sm leading-7 text-[#b9c8c3]">{t("boundaryBody")}</p>
          </div>
        </div>
      </div>
    </section>
  )
}
