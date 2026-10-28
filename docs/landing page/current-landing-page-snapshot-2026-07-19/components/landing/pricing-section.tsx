"use client"

import type { KeyboardEvent } from "react"
import { useState } from "react"
import {
  ArrowRight,
  BarChart3,
  Boxes,
  Building2,
  Check,
  CircleDollarSign,
  Landmark,
  Layers3,
  Network,
  PackageCheck,
  ScanLine,
  ShieldCheck,
  ShoppingCart,
  UsersRound,
  Wrench,
} from "lucide-react"
import { useTranslations } from "next-intl"

import { Link } from "@/i18n/navigation"

const views = [
  { key: "paths", icon: PackageCheck },
  { key: "extensions", icon: Network },
  { key: "delivery", icon: Wrench },
] as const

const adoptionPaths = [
  { key: "operations", icon: Boxes, accent: "var(--color-brand-action)" },
  { key: "finance", icon: Landmark, accent: "var(--color-info)" },
  { key: "people", icon: UsersRound, accent: "var(--color-editorial)" },
] as const

const extensions = [
  { key: "retail", icon: ShoppingCart },
  { key: "reconciliation", icon: ScanLine },
  { key: "production", icon: Building2 },
  { key: "intelligence", icon: BarChart3 },
] as const

const serviceKeys = [
  { key: "onboarding", icon: Layers3 },
  { key: "country", icon: ShieldCheck },
  { key: "providers", icon: Network },
  { key: "assurance", icon: Wrench },
] as const

const pointKeys = ["a", "b", "c"] as const

type ViewKey = (typeof views)[number]["key"]

export function PricingSection() {
  const t = useTranslations("landing.pricing")
  const [activeView, setActiveView] = useState<ViewKey>("paths")

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return

    event.preventDefault()
    const nextIndex = event.key === "Home"
      ? 0
      : event.key === "End"
        ? views.length - 1
        : (index + (event.key === "ArrowRight" ? 1 : -1) + views.length) % views.length
    const nextView = views[nextIndex]
    setActiveView(nextView.key)
    document.getElementById(`adoption-tab-${nextView.key}`)?.focus()
  }

  return (
    <section
      id="pricing"
      data-adoption-section
      className="surface-grid scroll-mt-20 bg-[var(--paper-0)] px-6 py-20 text-[var(--color-text-on-paper)] lg:px-8"
    >
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(20rem,0.7fr)] lg:items-end">
          <div>
            <div className="eyebrow mb-4 !text-[var(--accent)]">{t("eyebrow")}</div>
            <h2 className="display max-w-4xl text-4xl sm:text-5xl">{t("title")}</h2>
          </div>
          <p className="body-text max-w-2xl text-base leading-7 text-[var(--color-text-on-paper-muted)] lg:justify-self-end">
            {t("description")}
          </p>
        </div>

        <div
          data-platform-foundation
          className="mt-10 grid gap-6 border-y border-[var(--paper-rule)] py-7 md:grid-cols-[auto_minmax(0,1fr)] lg:grid-cols-[auto_minmax(0,1.25fr)_minmax(0,0.75fr)] lg:items-center"
        >
          <div className="flex size-12 items-center justify-center rounded-lg bg-[var(--color-brand-action)] text-white">
            <Layers3 className="size-5" aria-hidden="true" />
          </div>
          <div>
            <div className="data-text text-xs uppercase text-[var(--accent)]">{t("foundation.label")}</div>
            <h3 className="mt-2 body-text text-xl font-semibold">{t("foundation.title")}</h3>
            <p className="mt-2 body-text text-sm leading-6 text-[var(--color-text-on-paper-muted)]">
              {t("foundation.copy")}
            </p>
          </div>
          <ul className="grid gap-2 body-text text-sm text-[var(--color-text-on-paper-muted)] md:col-start-2 lg:col-start-auto">
            {(["governance", "scope", "evidence"] as const).map((point) => (
              <li key={point} className="flex items-start gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-[var(--color-brand-action)]" aria-hidden="true" />
                <span>{t(`foundation.points.${point}`)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div
          role="tablist"
          aria-label={t("tabs.label")}
          className="mt-10 grid w-full grid-cols-3 overflow-hidden rounded-lg border border-[var(--paper-rule)] bg-[var(--paper-1)] lg:w-fit"
        >
          {views.map((view, index) => {
            const Icon = view.icon
            const selected = activeView === view.key
            return (
              <button
                key={view.key}
                id={`adoption-tab-${view.key}`}
                type="button"
                role="tab"
                data-adoption-tab={view.key}
                aria-selected={selected}
                aria-controls="adoption-panel"
                tabIndex={selected ? 0 : -1}
                onClick={() => setActiveView(view.key)}
                onKeyDown={(event) => handleTabKeyDown(event, index)}
                className={`flex min-h-12 items-center justify-center gap-2 px-3 py-3 body-text text-xs font-semibold transition sm:px-5 sm:text-sm ${
                  selected
                    ? "bg-[var(--color-brand-action)] text-white"
                    : "text-[var(--color-text-on-paper-muted)] hover:bg-black/5 hover:text-[var(--color-text-on-paper)]"
                }`}
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                <span>{t(`tabs.${view.key}`)}</span>
              </button>
            )
          })}
        </div>

        <div
          id="adoption-panel"
          role="tabpanel"
          aria-labelledby={`adoption-tab-${activeView}`}
          data-adoption-panel={activeView}
          className="mt-8"
        >
          {activeView === "paths" ? (
            <div>
              <div className="max-w-3xl">
                <div className="data-text text-xs uppercase text-[var(--accent)]">{t("paths.label")}</div>
                <p className="mt-3 body-text leading-7 text-[var(--color-text-on-paper-muted)]">{t("paths.intro")}</p>
              </div>
              <div className="mt-7 grid gap-5 lg:grid-cols-3">
                {adoptionPaths.map((path) => {
                  const Icon = path.icon
                  return (
                    <article
                      key={path.key}
                      data-adoption-path={path.key}
                      className="soft-card flex min-h-full flex-col rounded-lg border-t-4 p-6"
                      style={{ borderTopColor: path.accent }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex size-11 items-center justify-center rounded-lg border border-[var(--paper-rule)] bg-white/5">
                          <Icon className="size-5" aria-hidden="true" />
                        </div>
                        <span className="data-text text-right text-[0.68rem] uppercase text-[var(--accent)]">
                          {t(`paths.${path.key}.kicker`)}
                        </span>
                      </div>
                      <h3 className="mt-6 body-text text-2xl font-semibold">{t(`paths.${path.key}.name`)}</h3>
                      <p className="mt-3 body-text text-sm leading-6 text-[var(--color-text-on-paper-muted)]">
                        {t(`paths.${path.key}.outcome`)}
                      </p>
                      <div className="mt-6">
                        <div className="data-text text-[0.68rem] uppercase text-[var(--color-text-on-paper-muted)]">
                          {t("paths.bestForLabel")}
                        </div>
                        <p className="mt-2 body-text text-sm font-medium">{t(`paths.${path.key}.bestFor`)}</p>
                      </div>
                      <div className="mt-6">
                        <div className="data-text text-[0.68rem] uppercase text-[var(--color-text-on-paper-muted)]">
                          {t("paths.includesLabel")}
                        </div>
                        <ul className="mt-3 grid gap-2 body-text text-sm text-[var(--color-text-on-paper-muted)]">
                          {pointKeys.map((point) => (
                            <li key={point} className="flex items-start gap-2">
                              <Check className="mt-0.5 size-4 shrink-0 text-[var(--color-brand-action)]" aria-hidden="true" />
                              <span>{t(`paths.${path.key}.points.${point}`)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <dl className="mt-auto grid gap-4 border-t border-[var(--paper-rule)] pt-6 body-text text-sm">
                        <div>
                          <dt className="data-text text-[0.68rem] uppercase text-[var(--color-text-on-paper-muted)]">{t("paths.dependencyLabel")}</dt>
                          <dd className="mt-1 leading-6">{t(`paths.${path.key}.dependency`)}</dd>
                        </div>
                        <div>
                          <dt className="data-text text-[0.68rem] uppercase text-[var(--color-text-on-paper-muted)]">{t("paths.commercialLabel")}</dt>
                          <dd className="mt-1 leading-6">{t(`paths.${path.key}.commercial`)}</dd>
                        </div>
                      </dl>
                    </article>
                  )
                })}
              </div>
            </div>
          ) : null}

          {activeView === "extensions" ? (
            <div>
              <div className="max-w-3xl">
                <div className="data-text text-xs uppercase text-[var(--accent)]">{t("extensions.label")}</div>
                <p className="mt-3 body-text leading-7 text-[var(--color-text-on-paper-muted)]">{t("extensions.intro")}</p>
              </div>
              <div className="mt-7 grid gap-5 md:grid-cols-2">
                {extensions.map((extension) => {
                  const Icon = extension.icon
                  return (
                    <article key={extension.key} data-adoption-extension={extension.key} className="soft-card rounded-lg p-6">
                      <div className="flex items-start gap-4">
                        <div className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-[var(--paper-rule)] bg-white/5">
                          <Icon className="size-5" aria-hidden="true" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="data-text text-[0.68rem] uppercase text-[var(--accent)]">{t(`extensions.${extension.key}.status`)}</div>
                          <h3 className="mt-2 body-text text-xl font-semibold">{t(`extensions.${extension.key}.name`)}</h3>
                        </div>
                      </div>
                      <p className="mt-5 body-text text-sm leading-6 text-[var(--color-text-on-paper-muted)]">{t(`extensions.${extension.key}.copy`)}</p>
                      <dl className="mt-6 grid gap-4 border-t border-[var(--paper-rule)] pt-5 body-text text-sm sm:grid-cols-2">
                        <div>
                          <dt className="data-text text-[0.68rem] uppercase text-[var(--color-text-on-paper-muted)]">{t("extensions.requiresLabel")}</dt>
                          <dd className="mt-1 leading-6">{t(`extensions.${extension.key}.requires`)}</dd>
                        </div>
                        <div>
                          <dt className="data-text text-[0.68rem] uppercase text-[var(--color-text-on-paper-muted)]">{t("extensions.driverLabel")}</dt>
                          <dd className="mt-1 leading-6">{t(`extensions.${extension.key}.driver`)}</dd>
                        </div>
                      </dl>
                    </article>
                  )
                })}
              </div>
            </div>
          ) : null}

          {activeView === "delivery" ? (
            <div>
              <div className="max-w-3xl">
                <div className="data-text text-xs uppercase text-[var(--accent)]">{t("delivery.label")}</div>
                <p className="mt-3 body-text leading-7 text-[var(--color-text-on-paper-muted)]">{t("delivery.intro")}</p>
              </div>
              <div className="mt-7 border-y border-[var(--paper-rule)] py-7">
                <div className="flex items-start gap-4">
                  <CircleDollarSign className="mt-1 size-6 shrink-0 text-[var(--color-brand-action)]" aria-hidden="true" />
                  <div>
                    <h3 className="body-text text-xl font-semibold">{t("delivery.modelTitle")}</h3>
                    <p className="mt-2 max-w-4xl body-text text-sm leading-6 text-[var(--color-text-on-paper-muted)]">{t("delivery.modelCopy")}</p>
                  </div>
                </div>
                <dl className="mt-7 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                  {(["platform", "retail", "people", "regulated"] as const).map((driver) => (
                    <div key={driver} className="border-l-2 border-[var(--paper-rule)] pl-4">
                      <dt className="body-text text-sm font-semibold">{t(`delivery.drivers.${driver}.name`)}</dt>
                      <dd className="mt-2 body-text text-sm leading-6 text-[var(--color-text-on-paper-muted)]">{t(`delivery.drivers.${driver}.basis`)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <h3 className="mt-9 body-text text-xl font-semibold">{t("delivery.servicesTitle")}</h3>
              <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
                {serviceKeys.map((service) => {
                  const Icon = service.icon
                  return (
                    <article key={service.key} data-adoption-service={service.key} className="soft-card rounded-lg p-5">
                      <Icon className="size-5 text-[var(--color-brand-action)]" aria-hidden="true" />
                      <h4 className="mt-5 body-text text-base font-semibold">{t(`delivery.services.${service.key}.name`)}</h4>
                      <p className="mt-2 body-text text-sm leading-6 text-[var(--color-text-on-paper-muted)]">{t(`delivery.services.${service.key}.copy`)}</p>
                    </article>
                  )
                })}
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-10 flex flex-col gap-6 border-t border-[var(--paper-rule)] pt-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <div className="data-text text-xs uppercase text-[var(--accent)]">{t("cta.label")}</div>
            <h3 className="mt-2 body-text text-2xl font-semibold">{t("cta.title")}</h3>
            <p className="mt-3 body-text text-sm leading-6 text-[var(--color-text-on-paper-muted)]">{t("cta.copy")}</p>
            <p className="mt-2 data-text text-xs leading-5 text-[var(--color-text-on-paper-muted)]">{t("cta.note")}</p>
          </div>
          <Link
            href="/register"
            className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-lg bg-[var(--color-brand-action)] px-5 py-3 body-text text-sm font-semibold text-white transition hover:bg-[var(--color-brand-hover)]"
          >
            {t("cta.button")}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  )
}
