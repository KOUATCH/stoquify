"use client"

import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronDown,
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
import { useLocale, useTranslations } from "next-intl"
import { useEffect, useMemo, useRef, useState } from "react"

import { Link } from "@/i18n/navigation"
import { WorkflowStory } from "./workflow-story"
import { WorkflowDetails } from "./workflow-details"
import { additionalJourneys } from "./landing-workflow-library"
import { useCinematicSignedIn } from "./cinematic-shell"
import { productCommunicationCopy, workflowGuidance } from "./public-product-copy"
import {
  getWorkflowAtlasOutcomesForRole,
  getWorkflowAtlasWorkflowsForSelection,
  workflowAtlasRoles,
  workflowAtlasWorkflows,
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
  const locale = useLocale() === "fr" ? "fr" : "en"
  const copy = productCommunicationCopy[locale]
  const signedIn = useCinematicSignedIn()
  const rootRef = useRef<HTMLElement>(null)
  const text = (en: string, fr: string) => locale === "fr" ? fr : en
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

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    let frame = 0
    let arrivalFrame = 0
    let highlightTimer = 0
    let highlightedTarget: HTMLElement | null = null
    const clearArrival = () => {
      cancelAnimationFrame(arrivalFrame)
      window.clearTimeout(highlightTimer)
      highlightedTarget?.classList.remove("workflow-destination-highlight")
      highlightedTarget = null
    }
    const highlightOnArrival = (target: HTMLElement) => {
      const started = performance.now()
      let settledFrames = 0
      const checkArrival = () => {
        const margin = parseFloat(getComputedStyle(target).scrollMarginTop) || 0
        const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
        const destination = Math.min(maxScroll, Math.max(0, window.scrollY + target.getBoundingClientRect().top - margin))
        settledFrames = Math.abs(window.scrollY - destination) <= 2 ? settledFrames + 1 : 0
        if (settledFrames >= 2) {
          highlightedTarget = target
          target.classList.add("workflow-destination-highlight")
          highlightTimer = window.setTimeout(clearArrival, 1400)
        } else if (performance.now() - started < 3000) {
          // Check actual arrival, including no-op scrolls; interrupted scrolls must not flash a distant guide.
          arrivalFrame = requestAnimationFrame(checkArrival)
        }
      }
      arrivalFrame = requestAnimationFrame(checkArrival)
    }
    const isWorkflowHash = (hash: string) => workflowAtlasWorkflows.some(item => hash === `#workflow-${item.key}`) || additionalJourneys.some(item => hash === `#workflow-${item.id}`)
    const scrollToHash = (hash: string, animate = false) => {
      const isWorkflow = isWorkflowHash(hash)
      if (!isWorkflow && hash !== "#workflow-finder" && hash !== "#workflow-specialists") return
      clearArrival()
      if (isWorkflow) {
        setActiveRole("all")
        setActiveOutcome("all")
      }
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => {
          const target = root.querySelector<HTMLElement>(hash)
          const details = isWorkflow ? target?.querySelector("details") : null
          const summary = details?.querySelector("summary")
          if (details && (!details.open || summary?.getAttribute("aria-expanded") === "false")) summary?.click()
          const motionOff = window.matchMedia("(prefers-reduced-motion: reduce)").matches || root.closest(".motion-off")
          target?.scrollIntoView({ block: "start", behavior: animate && !motionOff ? "smooth" : "instant" })
          target?.focus({ preventScroll: true })
          if (target && animate) highlightOnArrival(target)
        })
      })
    }
    const followHash = () => scrollToHash(window.location.hash)
    const click = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href^="#workflow-"]') : null
      if (!link || link.hasAttribute("download") || (link.target && link.target !== "_self")) return
      if (!isWorkflowHash(link.hash) && link.hash !== "#workflow-finder" && link.hash !== "#workflow-specialists") return
      // Update the URL without the browser's native jump, then scroll after filters render.
      event.preventDefault()
      if (link.hash !== window.location.hash) window.history.pushState(window.history.state, "", link.hash)
      scrollToHash(link.hash, true)
    }
    followHash()
    window.addEventListener("hashchange", followHash)
    root.addEventListener("click", click)
    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) {
        entry.target.classList.add("workflow-entered")
        observer?.unobserve(entry.target)
      }
    }, { threshold: 0.08 })
    root.querySelectorAll("section").forEach(section => observer?.observe(section))
    return () => {
      cancelAnimationFrame(frame)
      clearArrival()
      observer?.disconnect()
      window.removeEventListener("hashchange", followHash)
      root.removeEventListener("click", click)
    }
  }, [])

  return (
    <main id="main" tabIndex={-1} ref={rootRef} className="workflow-atlas public-contour-page" data-workflow-atlas>
      <section
        id="workflow-atlas"
        className="workflow-opening px-6 lg:px-8"
      >
        <div className="relative mx-auto max-w-7xl">
          <div className="workflow-intro">
            <div className="workflow-intro-copy">
              <p className="eyebrow">{text("YOUR BUSINESS, CONNECTED", "VOTRE ENTREPRISE, CONNECTÉE")}</p>
              <h1 className="display">{text("Every working day. One connected story.", "Chaque journée. Une histoire connectée.")}</h1>
              <p className="workflow-lead">{text("From the first sale to the monthly close, see how your teams, payments and records work together.", "De la première vente à la clôture mensuelle, découvrez comment équipes, paiements et pièces se relient.")}</p>
              <p className="workflow-scope">{text("POS & inventory. Suppliers & client invoices. Reconciliation & OHADA accounting. HRIS & payroll.", "Caisse et stocks. Fournisseurs et factures clients. Rapprochement et comptabilité OHADA. SIRH et paie.")}</p>
              <div className="workflow-intro-actions">
                <a className="button primary" href="#workflow-finder">{text("Find your workflow", "Trouver mon parcours")}<ArrowRight size={18} aria-hidden="true" /></a>
                <Link className="text-link" href={signedIn ? "/dashboard" : "/login"}>{signedIn ? text("Open workspace", "Ouvrir l’espace") : copy.signIn}<ArrowUpRight size={17} aria-hidden="true" /></Link>
              </div>
              <p className="workflow-guide-note">{copy.guideNote}</p>
              <a href="#workflow-specialists" className="workflow-specialists-link">{text("Accounting firms & supporting workflows", "Cabinets et parcours complémentaires")}<ArrowRight size={16} aria-hidden="true" /></a>
            </div>
            <WorkflowStory />
          </div>

          <div
            className="mt-8 rounded-lg border border-[var(--rule-1)] bg-[var(--ink-1)]/90 px-4 py-5 sm:px-5"
            id="workflow-finder"
            tabIndex={-1}
            data-workflow-decision-bar
          >
            <div className="workflow-finder-heading">
              <div><p className="eyebrow">{text("START WITH YOUR DAY", "PARTEZ DE VOTRE QUOTIDIEN")}</p><h2>{text("What would you like to move forward?", "Que souhaitez-vous faire avancer ?")}</h2></div>
              <button type="button" className="workflow-reset" onClick={resetFilters}><RotateCcw size={16} aria-hidden="true" />{t("resetFilters")}</button>
            </div>
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
                <select className="workflow-filter-select" aria-labelledby="workflow-role-label" value={activeRole} onChange={event => selectRole(event.target.value as ActiveRole)}>
                  {roleButtons.map(({ key }) => <option key={key} value={key}>{t(`roles.${key}`)}</option>)}
                </select>
                <div
                  className="workflow-filter-buttons mt-3 flex flex-wrap gap-2"
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
                        <span className="workflow-filter-label">{t(`roles.${key}`)}</span>
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
                <select className="workflow-filter-select" aria-labelledby="workflow-outcome-label" value={activeOutcome} onChange={event => setActiveOutcome(event.target.value as ActiveOutcome)}>
                  {outcomeButtons.map(({ key }) => <option key={key} value={key}>{t(`outcomes.${key}`)} ({outcomeCounts.get(key) || 0})</option>)}
                </select>
                <p id="workflow-outcome-context" className="mt-2 body-text text-sm leading-6 text-[var(--text-lo)]">
                  {t("outcomeContext", {
                    count: availableOutcomes.length,
                    role: selectedRoleText,
                  })}
                </p>
                <div
                  className="workflow-filter-buttons mt-3 flex flex-wrap gap-2"
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
                        <span className="workflow-filter-label">{t(`outcomes.${key}`)}</span>
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

      <section className="bg-[var(--paper-0)] px-6 py-16 text-[var(--color-text-on-paper)] lg:px-8" data-workflow-launchpad>
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-6 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
            <div>
              <div className="eyebrow mb-4 !text-[var(--accent-hi)]">{t("dailyHubEyebrow")}</div>
              <h2 className="display text-4xl sm:text-5xl">{t("dailyHubTitle")}</h2>
              <p className="mt-4 body-text text-base leading-7 text-[var(--color-text-on-paper-muted)]">
                {t("dailyHubBody")}
              </p>
            </div>
            <div className="rounded-lg border border-[var(--paper-rule)] bg-[var(--paper-1)] px-5 py-5">
              <div className="data-text text-xs font-semibold uppercase text-[var(--accent-hi)]">
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
            <div key={`${activeRole}-${activeOutcome}`} className="mt-8 grid gap-4 lg:grid-cols-3" data-workflow-recommendations>
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
          <div className="mt-8 grid items-start gap-4 lg:grid-cols-2">
            {visibleWorkflows.map((workflow, index) => (
              <WorkflowPlaybookCard key={workflow.key} workflow={workflow} index={index} />
            ))}
          </div>
        </div>
      </section>
      <section id="workflow-specialists" tabIndex={-1} className="workflow-specialists" aria-labelledby="workflow-specialists-title">
        <div className="mx-auto max-w-7xl">
          <p className="eyebrow">{text("MORE CONNECTED RESPONSIBILITIES", "D’AUTRES RESPONSABILITÉS CONNECTÉES")}</p>
          <h2 id="workflow-specialists-title" className="display">{text("Your team. Your firm. The same supporting records.", "Votre équipe. Votre cabinet. Les mêmes justificatifs.")}</h2>
          <p className="workflow-specialists-intro">{text("Explore the supporting journeys alongside the filtered guides above. Client access, evidence review, payments and starting records each have their own controls.", "Explorez les parcours complémentaires aux guides filtrés ci-dessus. Accès clients, revue des pièces, paiements et données initiales ont chacun leurs contrôles.")}</p>
          <div className="workflow-specialists-grid">
            {additionalJourneys.map(journey => {
              const local = (value: readonly [string, string]) => value[locale === "fr" ? 1 : 0]
              return <article key={journey.id} id={`workflow-${journey.id}`} tabIndex={-1}>
                <div className="workflow-specialist-heading"><journey.icon size={23} aria-hidden="true" /><h3>{local(journey.label)}</h3></div>
                <p>{local(journey.body)}</p>
                <WorkflowDetails summary={<>{copy.details}<ChevronDown size={16} aria-hidden="true" /></>}>
                  <h4>{local(journey.title)}</h4>
                  <ol>{journey.steps.map(step => <li key={step[0]}>{local(step)}</li>)}</ol>
                  <div className="workflow-specialist-evidence"><div><h4>{t("controlLabel")}</h4><ul>{journey.controls.map(control => <li key={control[0]}>{local(control)}</li>)}</ul></div><div><h4>{copy.records}</h4><ul>{journey.evidence.map(item => <li key={item[0]}>{local(item)}</li>)}</ul></div></div>
                  <p className="workflow-specialist-review">{local(journey.review)}</p>
                  <Link href={journey.source} className="workflow-specialists-link">{text("Open workspace step", "Ouvrir l’étape dans l’espace")}<ArrowUpRight size={16} aria-hidden="true" /></Link>
                  <p className="workflow-guide-note">{text("Sign in with the required organization, client scope and permissions.", "Connectez-vous avec l’organisation, le périmètre client et les droits requis.")}</p>
                </WorkflowDetails>
              </article>
            })}
          </div>
        </div>
      </section>
      <section className="section-divider bg-[var(--paper-0)] px-6 py-14 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="display text-3xl text-[var(--text-hi)]">{copy.readyTitle}</h2><p className="body-text mt-3 max-w-2xl text-sm leading-7 text-[var(--text-lo)]">{copy.readyBody}</p></div>
          <Link href={signedIn ? "/dashboard" : "/register"} className="body-text inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-lg bg-[var(--color-brand-action)] px-5 py-3 text-sm font-semibold text-white">{signedIn ? text("Open workspace", "Ouvrir l’espace") : copy.create}<ArrowRight className="size-4" aria-hidden="true" /></Link>
        </div>
      </section>
    </main>
  )

}

function WorkflowPlaybookCard({ workflow, index, featured = false }: { workflow: WorkflowAtlasWorkflow; index: number; featured?: boolean }) {
    const t = useTranslations("landing.workflowAtlas")
    const locale = useLocale() === "fr" ? "fr" : "en"
    const copy = productCommunicationCopy[locale]
    const Icon = iconMap[workflow.icon]
    const guide = workflowGuidance[locale][workflow.key]
    const firstControl = workflow.controlKeys[0]
    const firstEvidence = workflow.evidenceKeys[0]
    const mapNodes = [
      { key: "source", label: t("sourceLabel"), value: t(`workflows.${workflow.key}.source`) },
      { key: "control", label: t("controlPointLabel"), value: t(`workflows.${workflow.key}.controls.${firstControl}`) },
      { key: "proof", label: t("proofLabel"), value: t(`workflows.${workflow.key}.evidence.${firstEvidence}`) },
      { key: "destination", label: t("destinationLabel"), value: t(`workflows.${workflow.key}.destination`) },
    ]

    if (featured) return (
      <article data-workflow-atlas-section={workflow.key} className="flex flex-col rounded-xl border border-[var(--paper-rule)] bg-[var(--paper-1)] p-5">
        <div className="flex items-center gap-3"><Icon className="size-5 shrink-0 text-[var(--accent-hi)]" aria-hidden="true" /><h3 className="body-text text-lg font-semibold text-[var(--text-hi)]">{t(`workflows.${workflow.key}.shortTitle`)}</h3></div>
        <p className="body-text mt-4 flex-1 text-sm leading-7 text-[var(--text-lo)]">{guide.result}</p>
        <a href={`#workflow-${workflow.key}`} className="body-text mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--accent-hi)] underline underline-offset-4">{copy.details}<ArrowRight className="size-4" aria-hidden="true" /></a>
      </article>
    )

    return (
      <article
        id={featured ? undefined : `workflow-${workflow.key}`}
        data-workflow-atlas-section={workflow.key}
        tabIndex={-1}
        className={classNames(
          "scroll-mt-24 rounded-xl border p-5",
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
          {guide.result}
        </p>

        <WorkflowDetails summary={<>{copy.details}<ChevronDown className="size-4 shrink-0" aria-hidden="true" /></>}>
        <div className="workflow-summary-path">
          <div><span>{t("sourceLabel")}</span><p>{t(`workflows.${workflow.key}.source`)}</p></div>
          <ArrowRight size={18} aria-hidden="true" />
          <div><span>{t("destinationLabel")}</span><p>{t(`workflows.${workflow.key}.destination`)}</p></div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2" aria-label={t("roleLabel")}>
          {workflow.roles.map(role => <span key={role} className="body-text rounded-full border border-[var(--rule-2)] px-2.5 py-1 text-xs text-[var(--text-lo)]">{t(`roles.${role}`)}</span>)}
        </div>
        <div data-workflow-prerequisites className="mt-5 border-l-2 border-[var(--color-spruce)] pl-4">
          <h4 className="body-text text-sm font-semibold text-[var(--text-hi)]">{copy.prerequisites}</h4>
          <p className="body-text mt-1 text-sm leading-6 text-[var(--text-lo)]">{guide.prerequisites}</p>
        </div>

          <div data-workflow-handoff className="mt-2">
            <h4 className="body-text font-semibold">{copy.handoff}</h4>
            <p className="body-text mt-2 text-sm leading-7 text-[var(--text-lo)]">{guide.handoff}</p>
            <h4 className="body-text mt-4 font-semibold">{copy.execution}</h4>
            <p className="body-text mt-2 text-sm leading-7 text-[var(--text-lo)]">{guide.execution}</p>
          </div>

        <div className="mt-5 border-y border-current/15 py-4" data-workflow-best-next-action>
          <div className="flex items-center gap-2 data-text text-xs font-semibold uppercase text-[var(--accent-hi)]">
            <CheckCircle2 className="size-4" aria-hidden="true" />
            {t("bestNextActionLabel")}
          </div>
          <p className="mt-2 body-text text-sm font-semibold leading-6">{t(`workflows.${workflow.key}.nextAction`)}</p>
        </div>

        <div className="mt-5" data-workflow-visual-map>
          <div className="data-text text-xs font-semibold uppercase text-[var(--accent-hi)]">{t("mapLabel")}</div>
          <ol className="mt-3 grid gap-2 sm:grid-cols-2">
            {mapNodes.map((node) => (
              <li key={node.key} className="min-h-[7rem] rounded-md border border-current/15 p-3">
                <div className="data-text text-[0.68rem] font-semibold uppercase text-[var(--accent-hi)]">{node.label}</div>
                <p className="mt-2 body-text text-sm font-semibold leading-6">{node.value}</p>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div>
            <div className="data-text text-xs font-semibold uppercase text-[var(--accent-hi)]">{copy.ownership}</div>
            <ol className="mt-3 grid gap-2">
              {workflow.stepKeys.map((stepKey, stepIndex) => (
                <li key={stepKey} data-workflow-atlas-step={stepKey} className="flex items-start gap-2 body-text text-sm leading-6">
                  <span className="data-text mt-0.5 text-[0.68rem] font-semibold text-[var(--accent-hi)]">
                    {String(stepIndex + 1).padStart(2, "0")}
                  </span>
                  <span><span className="mb-1 block text-xs font-semibold text-[var(--color-spruce)]">{guide.owners[stepIndex]}</span>{t(`workflows.${workflow.key}.steps.${stepKey}`)}</span>
                </li>
              ))}
            </ol>
          </div>

          <div>
            <div className="data-text text-xs font-semibold uppercase text-[var(--accent-hi)]">{t("controlLabel")}</div>
            <ul className="mt-3 grid gap-2">
              {workflow.controlKeys.map((controlKey) => (
                <li key={controlKey} data-workflow-atlas-control={controlKey} className="flex items-start gap-2 body-text text-sm leading-6">
                  <BadgeCheck className="mt-1 size-4 shrink-0 text-[var(--signal-up)]" aria-hidden="true" />
                  <span>{t(`workflows.${workflow.key}.controls.${controlKey}`)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-5 rounded-lg border border-[var(--rule-2)] p-4">
          <h4 className="body-text text-sm font-semibold">{copy.records}</h4>
          <ul className="body-text mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[var(--text-lo)]">{workflow.evidenceKeys.map(key => <li key={key}>{t(`workflows.${workflow.key}.evidence.${key}`)}</li>)}</ul>
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
        </WorkflowDetails>
      </article>
    )
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="data-text text-xs font-semibold uppercase text-[var(--color-text-on-paper-muted)]">{label}</div>
      <div className="mt-1 body-text text-lg font-semibold leading-7">{value}</div>
    </div>
  )
}
