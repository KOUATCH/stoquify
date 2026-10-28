"use client"

import {
  BriefcaseBusiness,
  CircleDollarSign,
  ClipboardCheck,
  Landmark,
  PackageSearch,
  ShoppingCart,
  UserRoundCheck,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState } from "react"

type ControlKey =
  | "inventory"
  | "purchasing"
  | "finance"
  | "accounting"
  | "compliance"
  | "hris"
  | "payroll"

type ControlModule = {
  key: ControlKey
  Icon: LucideIcon
  tone: string
}

const modules: ControlModule[] = [
  { key: "inventory", Icon: PackageSearch, tone: "text-[var(--color-spruce)] bg-[var(--color-spruce)]/10" },
  { key: "purchasing", Icon: ShoppingCart, tone: "text-[var(--signal-warn)] bg-[var(--signal-warn)]/10" },
  { key: "finance", Icon: CircleDollarSign, tone: "text-[var(--accent-hi)] bg-[var(--accent-hi)]/10" },
  { key: "accounting", Icon: Landmark, tone: "text-[var(--editorial)] bg-[var(--editorial)]/10" },
  { key: "compliance", Icon: ClipboardCheck, tone: "text-[var(--signal-down)] bg-[var(--signal-down)]/10" },
  { key: "hris", Icon: BriefcaseBusiness, tone: "text-[var(--signal-up)] bg-[var(--signal-up)]/10" },
  { key: "payroll", Icon: UserRoundCheck, tone: "text-[var(--color-warm)] bg-[var(--color-warm)]/10" },
]

const signalKeys = ["a", "b", "c"] as const

export function ModuleDeepDives() {
  const t = useTranslations("landing.deepDives")
  const [activeKey, setActiveKey] = useState<ControlKey>("inventory")
  const activeIndex = modules.findIndex(({ key }) => key === activeKey)
  const activeModule = modules[activeIndex]
  const ActiveIcon = activeModule.Icon

  function selectTab(index: number) {
    const normalizedIndex = (index + modules.length) % modules.length
    const nextKey = modules[normalizedIndex].key
    setActiveKey(nextKey)
    document.querySelector<HTMLButtonElement>(`[data-daily-control-tab="${nextKey}"]`)?.focus()
  }

  function handleTabKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key === "ArrowRight") {
      event.preventDefault()
      selectTab(index + 1)
    } else if (event.key === "ArrowLeft") {
      event.preventDefault()
      selectTab(index - 1)
    } else if (event.key === "Home") {
      event.preventDefault()
      selectTab(0)
    } else if (event.key === "End") {
      event.preventDefault()
      selectTab(modules.length - 1)
    }
  }

  return (
    <section id="daily-control" data-daily-control className="section-divider relative isolate scroll-mt-20 overflow-hidden bg-[var(--ink-1)] px-6 py-20 lg:px-8">
      <div className="landing-grid-bg absolute inset-0 opacity-60" />
      <div className="relative mx-auto max-w-7xl">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <div>
            <div className="eyebrow mb-4">{t("eyebrow")}</div>
            <h2 className="display text-4xl text-[var(--text-hi)] sm:text-5xl">{t("title")}</h2>
          </div>
          <p className="body-text text-lg leading-8 text-[var(--text-lo)]">{t("description")}</p>
        </div>

        <div className="mt-10 overflow-hidden rounded-lg border border-[var(--rule-1)] bg-[var(--ink-2)] shadow-[0_24px_70px_rgba(0,0,0,0.18)]">
          <div
            className="flex gap-1 overflow-x-auto border-b border-[var(--rule-1)] bg-[var(--ink-0)] p-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="tablist"
            aria-label={t("tablistLabel")}
          >
            {modules.map(({ key, Icon, tone }, index) => {
              const selected = key === activeKey
              return (
                <button
                  key={key}
                  id={`daily-control-tab-${key}`}
                  type="button"
                  role="tab"
                  data-daily-control-tab={key}
                  aria-selected={selected}
                  aria-controls={`daily-control-panel-${key}`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setActiveKey(key)}
                  onKeyDown={(event) => handleTabKeyDown(event, index)}
                  className={`flex min-h-12 min-w-[9.5rem] flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 body-text text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-hi)] ${
                    selected
                      ? "bg-white/[0.09] text-[var(--text-hi)]"
                      : "text-[var(--text-faint)] hover:bg-white/[0.05] hover:text-[var(--text-hi)]"
                  }`}
                >
                  <span className={`grid size-7 shrink-0 place-items-center rounded-md ${tone}`}>
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  {t(`items.${key}.title`)}
                </button>
              )
            })}
          </div>

          <div
            id={`daily-control-panel-${activeKey}`}
            role="tabpanel"
            data-daily-control-panel={activeKey}
            aria-labelledby={`daily-control-tab-${activeKey}`}
            className="grid lg:grid-cols-[1.05fr_0.95fr]"
          >
            <div className="p-6 sm:p-8 lg:p-10">
              <div className="flex items-center gap-3">
                <span className={`grid size-11 place-items-center rounded-lg ${activeModule.tone}`}>
                  <ActiveIcon className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <div className="data-text text-xs uppercase text-[var(--accent-hi)]">{t("focusLabel")}</div>
                  <div className="mt-1 body-text text-sm font-semibold text-[var(--text-lo)]">{t(`items.${activeKey}.role`)}</div>
                </div>
              </div>

              <h3 className="mt-7 display text-4xl text-[var(--text-hi)]">{t(`items.${activeKey}.title`)}</h3>
              <p className="mt-4 max-w-2xl body-text text-lg leading-8 text-[var(--text-faint)]">{t(`items.${activeKey}.copy`)}</p>

              <div className="mt-8 border-t border-[var(--rule-1)] pt-6">
                <div className="data-text text-xs uppercase text-[var(--signal-info)]">{t("decisionLabel")}</div>
                <p className="mt-3 body-text text-xl font-semibold leading-8 text-[var(--text-hi)]">{t(`items.${activeKey}.decision`)}</p>
              </div>
            </div>

            <div className="border-t border-[var(--rule-1)] bg-black/[0.10] lg:border-l lg:border-t-0">
              <div className="px-6 py-5 sm:px-8">
                <div className="data-text text-xs uppercase text-[var(--signal-info)]">{t("controlSignal")}</div>
              </div>
              <div className="border-t border-[var(--rule-1)]">
                {signalKeys.map((signal, index) => (
                  <div key={signal} className="flex min-h-20 items-center gap-4 border-b border-[var(--rule-1)] px-6 py-4 last:border-b-0 sm:px-8">
                    <span className="data-text text-xs text-[var(--accent-hi)]">{String(index + 1).padStart(2, "0")}</span>
                    <span className="body-text text-sm font-semibold text-[var(--text-hi)]">{t(`items.${activeKey}.labels.${signal}`)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-[var(--rule-1)] px-6 py-5 sm:px-8">
                <div className="data-text text-xs uppercase text-[var(--signal-up)]">{t("evidenceLabel")}</div>
                <p className="mt-2 body-text text-sm leading-6 text-[var(--text-faint)]">{t(`items.${activeKey}.evidence`)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
