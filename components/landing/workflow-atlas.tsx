"use client"

import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  Landmark,
  Network,
  PackageSearch,
  RotateCcw,
  Settings2,
  ShieldCheck,
  ShoppingCart,
  Store,
  Users,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import { useMemo, useState } from "react"

import { Link } from "@/i18n/navigation"
import {
  getWorkflowAtlasOutcomesForRole,
  getWorkflowAtlasWorkflowsForSelection,
  workflowAtlasRoles,
  type WorkflowAtlasIconKey,
  type WorkflowAtlasOutcome,
  type WorkflowAtlasRole,
  type WorkflowAtlasWorkflow,
} from "@/components/landing/workflow-atlas-data"

type ActiveRole = WorkflowAtlasRole | "all"
type ActiveOutcome = WorkflowAtlasOutcome | "all"

const iconMap: Record<WorkflowAtlasIconKey | "Network", LucideIcon> = {
  Activity,
  BadgeCheck,
  BriefcaseBusiness,
  ClipboardCheck,
  FileCheck2,
  Landmark,
  Network,
  PackageSearch,
  Settings2,
  ShieldCheck,
  ShoppingCart,
  Store,
  Users,
}

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ")
}

export function WorkflowAtlas() {
  const t = useTranslations("landing.workflowAtlas")
  const [activeRole, setActiveRole] = useState<ActiveRole>("all")
  const [activeOutcome, setActiveOutcome] = useState<ActiveOutcome>("all")

  const availableOutcomes = useMemo(() => getWorkflowAtlasOutcomesForRole(activeRole), [activeRole])
  const visibleWorkflows = useMemo(
    () => getWorkflowAtlasWorkflowsForSelection(activeRole, activeOutcome),
    [activeOutcome, activeRole],
  )
  const outcomeCounts = useMemo(() => {
    const roleWorkflows = getWorkflowAtlasWorkflowsForSelection(activeRole, "all")
    return new Map<ActiveOutcome, number>([
      ["all", roleWorkflows.length],
      ...availableOutcomes.map(
        ({ key }) =>
          [key, roleWorkflows.filter((workflow) => workflow.outcome === key).length] as const,
      ),
    ])
  }, [activeRole, availableOutcomes])

  const recommendedWorkflows = visibleWorkflows.slice(0, 3)
  const roleButtons = [{ key: "all" as const, icon: "Network" as const }, ...workflowAtlasRoles]
  const outcomeButtons = [{ key: "all" as const, icon: "Network" as const }, ...availableOutcomes]
  const selectedRoleText = t(`roles.${activeRole}`)
  const selectedOutcomeText = t(`outcomes.${activeOutcome}`)

  function selectRole(role: ActiveRole) {
    const outcomeStillAvailable =
      activeOutcome === "all" ||
      getWorkflowAtlasOutcomesForRole(role).some((outcome) => outcome.key === activeOutcome)

    setActiveRole(role)
    if (!outcomeStillAvailable) setActiveOutcome("all")
  }

  function resetFilters() {
    setActiveRole("all")
    setActiveOutcome("all")
  }

  return (
    <main data-workflow-atlas>
      <section
        id="workflow-atlas"
        className="section-divider relative isolate overflow-hidden bg-[var(--ink-0)] px-6 py-14 lg:px-8"
      >
        <div className="landing-grid-bg absolute inset-0 opacity-70" aria-hidden="true" />
        <div className="relative mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(24rem,0.85fr)] lg:items-stretch">
            <div className="flex min-h-[24rem] flex-col justify-center">
              <div className="eyebrow mb-4">{t("eyebrow")}</div>
              <h1 className="display max-w-3xl text-4xl text-[var(--text-hi)] sm:text-5xl lg:text-6xl">
                {t("title")}
              </h1>
              <p className="mt-6 max-w-2xl body-text text-lg leading-8 text-[var(--text-lo)]">
                {t("description")}
              </p>
              <div className="mt-7 grid gap-3 sm:grid-cols-3" data-workflow-hero-metrics>
                <div className="rounded-lg border border-[var(--rule-1)] px-3 py-3">
                  <div className="data-text text-[0.68rem] font-semibold uppercase text-[var(--accent-hi)]">
                    {t("selectedRoleLabel")}
                  </div>
                  <div className="mt-1 body-text text-sm font-semibold text-[var(--text-hi)]">
                    {selectedRoleText}
                  </div>
                </div>
                <div className="rounded-lg border border-[var(--rule-1)] px-3 py-3">
                  <div className="data-text text-[0.68rem] font-semibold uppercase text-[var(--accent-hi)]">
                    {t("selectedOutcomeLabel")}
                  </div>
                  <div className="mt-1 body-text text-sm font-semibold text-[var(--text-hi)]">
                    {selectedOutcomeText}
                  </div>
                </div>
                <div className="rounded-lg border border-[var(--rule-1)] px-3 py-3">
                  <div className="data-text text-[0.68rem] font-semibold uppercase text-[var(--accent-hi)]">
                    {t("recommendedLabel")}
                  </div>
                  <div className="mt-1 body-text text-sm font-semibold text-[var(--text-hi)]">
                    {visibleWorkflows.length}
                  </div>
                </div>
              </div>
            </div>

            <aside
              className="flex flex-col justify-between rounded-lg border border-[var(--rule-1)] bg-[var(--ink-1)]/95 p-5 shadow-2xl shadow-black/20 sm:p-6 lg:p-7"
              data-workflow-hero-command
            >
              <div>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="data-text text-xs font-semibold uppercase text-[var(--accent-hi)]">
                      {t("selectionLabel")}
                    </div>
                    <p className="mt-2 body-text text-sm leading-6 text-[var(--text-lo)]">
                      {t("selectionAnnouncement", {
                        count: visibleWorkflows.length,
                        outcome: selectedOutcomeText,
                        role: selectedRoleText,
                      })}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="grid size-10 shrink-0 place-items-center rounded-lg border border-[var(--rule-1)] bg-[var(--ink-2)] text-[var(--text-lo)] transition hover:border-[var(--accent-hi)] hover:text-[var(--text-hi)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-hi)]"
                    aria-label={t("resetFilters")}
                    title={t("resetFilters")}
                  >
                    <RotateCcw className="size-4" aria-hidden="true" />
                  </button>
                </div>

                <div className="mt-6 overflow-hidden rounded-lg border border-[var(--rule-1)] divide-y divide-[var(--rule-1)]" data-workflow-audience-panels>
                  <div className="grid gap-4 py-4 sm:grid-cols-[2.5rem_minmax(0,1fr)]">
                    <span className="grid size-10 place-items-center rounded-lg border border-[var(--accent-hi)]/35 text-[var(--accent-hi)]" aria-hidden="true">
                      <ArrowUpRight className="size-5" />
                    </span>
                    <div>
                      <div className="data-text text-xs font-semibold uppercase text-[var(--accent-hi)]">
                        {t("prospectLabel")}
                      </div>
                      <h2 className="mt-1 body-text text-lg font-semibold text-[var(--text-hi)]">
                        {t("prospectTitle")}
                      </h2>
                      <p className="mt-2 body-text text-sm leading-6 text-[var(--text-lo)]">
                        {t("prospectBody")}
                      </p>
                    </div>
                  </div>
                  <div className="grid gap-4 py-4 sm:grid-cols-[2.5rem_minmax(0,1fr)]">
                    <span className="grid size-10 place-items-center rounded-lg border border-[var(--signal-up)]/35 text-[var(--signal-up)]" aria-hidden="true">
                      <CheckCircle2 className="size-5" />
                    </span>
                    <div>
                      <div className="data-text text-xs font-semibold uppercase text-[var(--accent-hi)]">
                        {t("userLabel")}
                      </div>
                      <h2 className="mt-1 body-text text-lg font-semibold text-[var(--text-hi)]">
                        {t("userTitle")}
                      </h2>
                      <p className="mt-2 body-text text-sm leading-6 text-[var(--text-lo)]">
                        {t("userBody")}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <Link
                href="/login"
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent-hi)] px-4 py-3 body-text text-sm font-semibold text-[var(--ink-0)] transition hover:bg-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-hi)]"
              >
                {t("openProtected", { route: t("routeLabels.dailyDigest") })}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </aside>
          </div>

          <div
            className="mt-8 rounded-lg border border-[var(--rule-1)] bg-[var(--ink-1)]/90 px-4 py-5 sm:px-5"
            data-workflow-decision-bar
          >
            <div className="grid gap-6 xl:grid-cols-[0.78fr_1.22fr]">
              <div>
                <div
                  id="workflow-role-label"
                  className="flex items-center gap-2 data-text text-xs font-semibold uppercase text-[var(--accent-hi)]"
                >
                  <span className="grid size-6 place-items-center rounded-full border border-current/30" aria-hidden="true">
                    1
                  </span>
                  {t("roleHubLabel")}
                </div>
                <div
                  className="mt-3 flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0"
                  role="group"
                  aria-labelledby="workflow-role-label"
                  aria-label={t("roleLensLabel")}
                >
                  {roleButtons.map(({ key, icon }) => {
                    const Icon = iconMap[icon]
                    const active = activeRole === key

                    return (
                      <button
                        key={key}
                        type="button"
                        data-workflow-atlas-role={key}
                        aria-pressed={active}
                        onClick={() => selectRole(key)}
                        className={classNames(
                          "inline-flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 body-text text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-hi)]",
                          active
                            ? "border-[var(--accent-hi)] bg-[var(--accent-hi)] text-[var(--ink-0)]"
                            : "border-[var(--rule-1)] bg-[var(--ink-2)] text-[var(--text-lo)] hover:border-[var(--accent-hi)] hover:text-[var(--text-hi)]",
                        )}
                      >
                        <Icon className="size-4" aria-hidden="true" />
                        {t(`roles.${key}`)}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <div
                  id="workflow-outcome-label"
                  className="flex items-center gap-2 data-text text-xs font-semibold uppercase text-[var(--accent-hi)]"
                >
                  <span className="grid size-6 place-items-center rounded-full border border-current/30" aria-hidden="true">
                    2
                  </span>
                  {t("outcomeChooserLabel")}
                </div>
                <p id="workflow-outcome-context" className="mt-2 body-text text-sm leading-6 text-[var(--text-lo)]">
                  {t("outcomeContext", {
                    count: availableOutcomes.length,
                    role: selectedRoleText,
                  })}
                </p>
                <div
                  className="mt-3 flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0"
                  role="group"
                  aria-labelledby="workflow-outcome-label"
                  aria-describedby="workflow-outcome-context"
                >
                  {outcomeButtons.map(({ key, icon }) => {
                    const Icon = iconMap[icon]
                    const active = activeOutcome === key
                    const count = outcomeCounts.get(key) ?? 0

                    return (
                      <button
                        key={key}
                        type="button"
                        data-workflow-atlas-outcome={key}
                        aria-pressed={active}
                        aria-label={t("outcomeOptionLabel", {
                          count,
                          outcome: t(`outcomes.${key}`),
                        })}
                        onClick={() => setActiveOutcome(key)}
                        className={classNames(
                          "inline-flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 body-text text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-hi)]",
                          active
                            ? "border-[var(--signal-up)] bg-[var(--signal-up)] text-[var(--ink-0)]"
                            : "border-[var(--rule-1)] bg-[var(--ink-2)] text-[var(--text-lo)] hover:border-[var(--signal-up)] hover:text-[var(--text-hi)]",
                        )}
                      >
                        <Icon className="size-4" aria-hidden="true" />
                        {t(`outcomes.${key}`)}
                        <span
                          data-workflow-atlas-outcome-count={key}
                          className="grid min-w-6 place-items-center rounded-full border border-current/25 px-1.5 py-0.5 data-text text-[0.65rem]"
                          aria-hidden="true"
                        >
                          {count}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="surface-grid bg-[var(--paper-0)] px-6 py-16 text-[var(--color-text-on-paper)] lg:px-8" data-workflow-launchpad>
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-6 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
            <div>
              <div className="eyebrow mb-4 !text-[var(--accent)]">{t("dailyHubEyebrow")}</div>
              <h2 className="display text-4xl sm:text-5xl">{t("dailyHubTitle")}</h2>
              <p className="mt-4 body-text text-base leading-7 text-[var(--color-text-on-paper-muted)]">
                {t("dailyHubBody")}
              </p>
            </div>
            <div className="rounded-lg border border-[var(--paper-rule)] bg-[var(--paper-1)] px-5 py-5">
              <div className="data-text text-xs font-semibold uppercase text-[var(--accent)]">
                {t("selectionLabel")}
              </div>
              <p
                className="sr-only"
                role="status"
                aria-live="polite"
                aria-atomic="true"
                data-workflow-atlas-live
              >
                {t("selectionAnnouncement", {
                  count: visibleWorkflows.length,
                  outcome: selectedOutcomeText,
                  role: selectedRoleText,
                })}
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <SummaryMetric label={t("selectedRoleLabel")} value={selectedRoleText} />
                <SummaryMetric label={t("selectedOutcomeLabel")} value={selectedOutcomeText} />
                <SummaryMetric label={t("recommendedLabel")} value={String(visibleWorkflows.length)} />
              </div>
            </div>
          </div>

          {visibleWorkflows.length === 0 ? (
            <div className="mt-8 rounded-lg border border-[var(--paper-rule)] bg-[var(--paper-1)] px-5 py-6" data-workflow-empty-state>
              <h3 className="body-text text-xl font-semibold">{t("noMatchesTitle")}</h3>
              <p className="mt-2 body-text text-sm leading-6 text-[var(--color-text-on-paper-muted)]">
                {t("noMatchesBody")}
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2.5 body-text text-sm font-semibold text-white transition hover:bg-[var(--color-brand-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              >
                <RotateCcw className="size-4" aria-hidden="true" />
                {t("resetFilters")}
              </button>
            </div>
          ) : (
            <div className="mt-8 grid gap-4 lg:grid-cols-3" data-workflow-recommendations>
              {recommendedWorkflows.map((workflow, index) => (
                <WorkflowPlaybookCard key={workflow.key} workflow={workflow} index={index} featured />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="section-divider bg-[var(--ink-0)] px-6 py-14 lg:px-8" data-workflow-map-index>
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="eyebrow mb-4">{t("mapIndexLabel")}</div>
              <h2 className="display max-w-3xl text-4xl text-[var(--text-hi)] sm:text-5xl">{t("mapIndexTitle")}</h2>
            </div>
            <p className="max-w-xl body-text text-sm leading-7 text-[var(--text-lo)]">{t("mapIndexBody")}</p>
          </div>
          <nav className="mt-8 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-label={t("mapIndexLabel")}>
            {visibleWorkflows.map((workflow, index) => {
              const Icon = iconMap[workflow.icon]
              return (
                <a
                  key={workflow.key}
                  href={`#workflow-${workflow.key}`}
                  className="group flex min-h-[5.5rem] items-start gap-3 rounded-lg border border-[var(--rule-1)] bg-[var(--ink-1)] p-4 transition hover:border-[var(--accent-hi)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-hi)]"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[var(--accent-hi)]/10 text-[var(--accent-hi)]">
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="data-text text-[0.68rem] text-[var(--accent-hi)]">
                      {String(index + 1).padStart(2, "0")} / {t(`outcomes.${workflow.outcome}`)}
                    </span>
                    <span className="mt-1 block body-text text-sm font-semibold leading-6 text-[var(--text-hi)] group-hover:text-[var(--accent-hi)]">
                      {t(`workflows.${workflow.key}.shortTitle`)}
                    </span>
                  </span>
                </a>
              )
            })}
          </nav>
        </div>
      </section>

      <section className="section-divider bg-[var(--ink-1)] px-6 py-16 lg:px-8" data-workflow-playbook-library>
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <div className="eyebrow mb-4">{t("libraryLabel")}</div>
            <h2 className="display text-4xl text-[var(--text-hi)] sm:text-5xl">{t("libraryTitle")}</h2>
            <p className="mt-4 body-text text-base leading-7 text-[var(--text-lo)]">{t("libraryBody")}</p>
          </div>
          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            {visibleWorkflows.map((workflow, index) => (
              <WorkflowPlaybookCard key={workflow.key} workflow={workflow} index={index} />
            ))}
          </div>
        </div>
      </section>
    </main>
  )

  function WorkflowPlaybookCard({ workflow, index, featured = false }: { workflow: WorkflowAtlasWorkflow; index: number; featured?: boolean }) {
    const Icon = iconMap[workflow.icon]
    const firstControl = workflow.controlKeys[0]
    const firstEvidence = workflow.evidenceKeys[0]
    const mapNodes = [
      { key: "source", label: t("sourceLabel"), value: t(`workflows.${workflow.key}.source`) },
      { key: "control", label: t("controlPointLabel"), value: t(`workflows.${workflow.key}.controls.${firstControl}`) },
      { key: "proof", label: t("proofLabel"), value: t(`workflows.${workflow.key}.evidence.${firstEvidence}`) },
      { key: "destination", label: t("destinationLabel"), value: t(`workflows.${workflow.key}.destination`) },
    ]

    return (
      <article
        id={featured ? undefined : `workflow-${workflow.key}`}
        data-workflow-atlas-section={workflow.key}
        className={classNames(
          "rounded-lg border p-5",
          featured
            ? "border-[var(--paper-rule)] bg-[var(--paper-1)]"
            : "border-[var(--rule-1)] bg-[var(--ink-2)] text-[var(--text-hi)]",
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span
              className={classNames(
                "grid size-11 shrink-0 place-items-center rounded-lg",
                featured ? "bg-[var(--accent)]/10 text-[var(--accent)]" : "bg-[var(--accent-hi)]/10 text-[var(--accent-hi)]",
              )}
            >
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <div>
              <div className="data-text text-xs font-semibold uppercase text-[var(--accent-hi)]">
                {t("workflowLabel", { number: index + 1 })} / {t(`outcomes.${workflow.outcome}`)}
              </div>
              <h3 className="mt-2 body-text text-xl font-semibold leading-7">{t(`workflows.${workflow.key}.title`)}</h3>
            </div>
          </div>
          <a
            href={`#workflow-${workflow.key}`}
            className="grid size-9 shrink-0 place-items-center rounded-lg border border-current/15 text-current transition hover:text-[var(--accent-hi)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-hi)]"
            aria-label={t("jumpToPlaybook", { title: t(`workflows.${workflow.key}.shortTitle`) })}
            title={t("jumpToPlaybook", { title: t(`workflows.${workflow.key}.shortTitle`) })}
          >
            <ArrowRight className="size-4" aria-hidden="true" />
          </a>
        </div>

        <p className={classNames("mt-4 body-text text-sm leading-7", featured ? "text-[var(--color-text-on-paper-muted)]" : "text-[var(--text-lo)]")}>
          {t(`workflows.${workflow.key}.dailyUse`)}
        </p>

        <div className="mt-5 border-y border-current/15 py-4" data-workflow-best-next-action>
          <div className="flex items-center gap-2 data-text text-xs font-semibold uppercase text-[var(--accent-hi)]">
            <CheckCircle2 className="size-4" aria-hidden="true" />
            {t("bestNextActionLabel")}
          </div>
          <p className="mt-2 body-text text-sm font-semibold leading-6">{t(`workflows.${workflow.key}.nextAction`)}</p>
        </div>

        <div className="mt-5" data-workflow-visual-map>
          <div className="data-text text-xs font-semibold uppercase text-[var(--accent-hi)]">{t("mapLabel")}</div>
          <div className="mt-3 grid gap-2 md:grid-cols-4">
            {mapNodes.map((node) => (
              <div key={node.key} className="min-h-[7rem] rounded-md border border-current/15 p-3">
                <div className="data-text text-[0.68rem] font-semibold uppercase text-[var(--accent-hi)]">{node.label}</div>
                <p className="mt-2 body-text text-sm font-semibold leading-6">{node.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div>
            <div className="data-text text-xs font-semibold uppercase text-[var(--accent-hi)]">{t("fastPathLabel")}</div>
            <ol className="mt-3 grid gap-2">
              {workflow.stepKeys.slice(0, 4).map((stepKey, stepIndex) => (
                <li key={stepKey} data-workflow-atlas-step={stepKey} className="flex items-start gap-2 body-text text-sm leading-6">
                  <span className="data-text mt-0.5 text-[0.68rem] font-semibold text-[var(--accent-hi)]">
                    {String(stepIndex + 1).padStart(2, "0")}
                  </span>
                  <span>{t(`workflows.${workflow.key}.steps.${stepKey}`)}</span>
                </li>
              ))}
            </ol>
          </div>

          <div>
            <div className="data-text text-xs font-semibold uppercase text-[var(--accent-hi)]">{t("controlLabel")}</div>
            <ul className="mt-3 grid gap-2">
              {workflow.controlKeys.slice(0, 3).map((controlKey) => (
                <li key={controlKey} data-workflow-atlas-control={controlKey} className="flex items-start gap-2 body-text text-sm leading-6">
                  <BadgeCheck className="mt-1 size-4 shrink-0 text-[var(--signal-up)]" aria-hidden="true" />
                  <span>{t(`workflows.${workflow.key}.controls.${controlKey}`)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-5 border-t border-current/15 pt-5">
          <div className="data-text text-xs font-semibold uppercase text-[var(--accent-hi)]">{t("quickLaunchLabel")}</div>
          <p className={classNames("mt-2 body-text text-xs leading-5", featured ? "text-[var(--color-text-on-paper-muted)]" : "text-[var(--text-lo)]")}>
            {t("routeHelp")}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={workflow.dailyRoute.href}
              data-protected-route={workflow.dailyRoute.href}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-brand-action)] px-3 py-2 body-text text-sm font-semibold text-white transition hover:bg-[var(--color-brand-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-hi)]"
            >
              {t("openProtected", { route: t(`routeLabels.${workflow.dailyRoute.labelKey}`) })}
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </Link>
            {workflow.routes
              .filter((route) => route.href !== workflow.dailyRoute.href)
              .slice(0, 3)
              .map((route) => (
                <Link
                  key={route.href}
                  href={route.href}
                  data-protected-route={route.href}
                  className="inline-flex items-center gap-2 rounded-lg border border-current/15 px-3 py-2 body-text text-sm font-semibold transition hover:border-[var(--accent-hi)] hover:text-[var(--accent-hi)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-hi)]"
                >
                  {t(`routeLabels.${route.labelKey}`)}
                  <ArrowUpRight className="size-4" aria-hidden="true" />
                </Link>
              ))}
          </div>
        </div>
      </article>
    )
  }
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="data-text text-xs font-semibold uppercase text-[var(--color-text-on-paper-muted)]">{label}</div>
      <div className="mt-1 body-text text-lg font-semibold leading-7">{value}</div>
    </div>
  )
}


