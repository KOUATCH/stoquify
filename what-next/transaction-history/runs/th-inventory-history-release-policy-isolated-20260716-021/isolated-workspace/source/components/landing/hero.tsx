import { Link } from "@/i18n/navigation"
import { ArrowRight, Boxes, Landmark, PlayCircle, ShieldCheck } from "lucide-react"
import { useTranslations } from "next-intl"

import { HeroDashboard } from "./hero-dashboard"

export function LandingHero() {
  const t = useTranslations("landing.hero")
  const metrics = [
    { key: "branches", value: t("metrics.branches.value"), label: t("metrics.branches.label"), Icon: ShieldCheck },
    { key: "accuracy", value: t("metrics.accuracy.value"), label: t("metrics.accuracy.label"), Icon: Boxes },
    { key: "close", value: t("metrics.close.value"), label: t("metrics.close.label"), Icon: Landmark },
  ]

  return (
    <section className="landing-hero relative isolate overflow-hidden bg-[var(--color-canvas)] px-4 pb-10 pt-8 text-[var(--color-text-primary)] sm:px-6 sm:pb-12 sm:pt-10 lg:min-h-[calc(100vh-4rem)] lg:px-8 lg:pb-10 lg:pt-12">
      <div className="landing-grid-bg absolute inset-0" />
      <div className="landing-grain" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--color-spruce)] to-[var(--color-brand)] opacity-[0.45]" />
      <div className="relative mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
        <div className="min-w-0">
          <div className="mb-5 inline-flex items-center gap-3 rounded-lg border border-[var(--color-border-subtle)] bg-white/[0.045] px-4 py-2 data-text text-xs text-[var(--color-text-secondary)]">
            <span className="live-dot size-2 rounded-full bg-[var(--color-success)]" />
            {t("badge")}
          </div>
          <h1 className="display max-w-full text-4xl sm:text-5xl lg:text-6xl">
            {t("titleStart")} <span className="display-italic text-[var(--color-editorial)]">{t("titleEmphasis")}</span>.
          </h1>
          <p className="body-text mt-5 max-w-2xl text-base leading-7 text-[var(--color-text-secondary)] sm:text-lg sm:leading-8">
            {t("description")}
          </p>
          <div className="mt-7 grid max-w-2xl gap-3 sm:grid-cols-3">
            {metrics.map(({ key, value, label, Icon }) => (
              <div key={key} className="metric-card rounded-lg border border-[var(--color-border-subtle)] bg-white/[0.052] p-3 sm:p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="data-text text-xl font-semibold text-[var(--color-text-primary)] sm:text-2xl">{value}</div>
                  <Icon className="size-4 shrink-0 text-[var(--color-spruce)]" aria-hidden="true" />
                </div>
                <div className="mt-2 body-text text-[0.68rem] leading-5 text-[var(--color-text-tertiary)] sm:text-xs">{label}</div>
              </div>
            ))}
          </div>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/register" className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-brand)] px-5 py-3 body-text text-sm font-semibold text-white shadow-lg shadow-[var(--color-brand-glow)] transition hover:bg-[var(--color-brand-hover)]">
              {t("primaryCta")}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link href="/#product" className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border-muted)] px-5 py-3 body-text text-sm font-semibold text-[var(--color-text-primary)] transition hover:border-[var(--color-border-strong)] hover:bg-white/5">
              <PlayCircle className="size-4" aria-hidden="true" />
              {t("secondaryCta")}
            </Link>
          </div>
        </div>
        <div className="min-w-0 lg:-mr-2">
          <HeroDashboard />
        </div>
      </div>
    </section>
  )
}