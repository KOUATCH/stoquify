"use client"

import { useEffect, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import {
  dashboardPanelClass,
  dashboardRowClass,
} from "@/components/finance/finance-dashboard-theme"
import { cn } from "@/lib/utils"
import { managerLanes, type ManagerLane, type ManagerView } from "./useManagerView"

export type ManagerQueueEntry = {
  id: string
  title: string
  source: string
  role: string
  lane: ManagerLane
  blockerCount: number
}
export const managerQueueCopy = {
  en: {
    brief: "Brief",
    command: "Command",
    investigate: "Investigate",
    queue: "Complete action queue",
    all: "All",
    source: "Source",
    role: "Responsible role",
    clear: "Clear filters",
    details: "Action details",
    empty: "No permitted actions are available in this scope.",
    noMatch: "No actions match these filters.",
    previous: "Previous page",
    next: "Next page",
    viewAll: "View complete queue",
    urgency: "Urgency lanes",
    loaded: "authorized actions loaded",
    matched: "matching filters",
    shown: "shown",
    page: "Page",
    preview: "priorities shown",
    ranking: "Source priority order is preserved. Check blockers before acting.",
    lanes: {
      overdue: "Overdue",
      critical: "Critical / high",
      due_today: "Due today",
      blocked: "Blocked",
      waiting: "Waiting",
      assigned: "Assigned",
      routine: "Routine",
    },
    sources: {
      SIGNAL: "Business signals",
      ASSURANCE: "Assurance",
      ACCOUNTANT_REQUEST: "Accountant requests",
      SOURCE_COMMAND: "Source workflows",
    },
    roles: {
      owner: "Owner",
      accountant: "Accountant",
      finance: "Finance",
      stockkeeper: "Stockkeeper",
      purchasing: "Purchasing",
      payroll: "Payroll",
      manager: "Manager",
    },
  },
  fr: {
    brief: "Synthèse",
    command: "Actions",
    investigate: "Analyse",
    queue: "File complète des actions",
    all: "Tous",
    source: "Source",
    role: "Rôle responsable",
    clear: "Effacer les filtres",
    details: "Détails de l’action",
    empty: "Aucune action autorisée n’est disponible dans ce périmètre.",
    noMatch: "Aucune action ne correspond à ces filtres.",
    previous: "Page précédente",
    next: "Page suivante",
    viewAll: "Voir toute la file",
    urgency: "Catégories d’urgence",
    loaded: "actions autorisées chargées",
    matched: "correspondant aux filtres",
    shown: "affichées",
    page: "Page",
    preview: "priorités affichées",
    ranking: "L’ordre de priorité des sources est conservé. Vérifiez les blocages avant d’agir.",
    lanes: {
      overdue: "En retard",
      critical: "Critique / élevée",
      due_today: "Aujourd’hui",
      blocked: "Bloquées",
      waiting: "En attente",
      assigned: "Affectées",
      routine: "Courantes",
    },
    sources: {
      SIGNAL: "Signaux métier",
      ASSURANCE: "Assurance",
      ACCOUNTANT_REQUEST: "Demandes du comptable",
      SOURCE_COMMAND: "Processus sources",
    },
    roles: {
      owner: "Dirigeant",
      accountant: "Comptable",
      finance: "Finance",
      stockkeeper: "Magasinier",
      purchasing: "Achats",
      payroll: "Paie",
      manager: "Responsable",
    },
  },
} as const

export function ManagerUrgencyFilters({
  entries,
  locale,
  view,
  update,
}: {
  entries: ManagerQueueEntry[]
  locale: "en" | "fr"
  view: ManagerView
  update: (patch: Partial<ManagerView>) => void
}) {
  const t = managerQueueCopy[locale]
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={t.urgency}>
      {managerLanes.map((lane) => (
        <Button
          key={lane}
          type="button"
          variant="outline"
          size="sm"
          className="h-auto min-h-11 whitespace-normal border-[var(--dash-border-subtle)] text-[var(--dash-text)]"
          aria-pressed={view.mode === "command" && view.urgency === lane}
          onClick={() => update({ mode: "command", urgency: lane, source: "all", role: "all" })}
        >
          {t.lanes[lane]} ({entries.filter((item) => item.lane === lane).length})
        </Button>
      ))}
    </div>
  )
}

export function ManagerActionQueue<T extends ManagerQueueEntry>({
  entries,
  locale,
  view,
  update,
  renderAction,
}: {
  entries: T[]
  locale: "en" | "fr"
  view: ManagerView
  update: (patch: Partial<ManagerView>) => void
  renderAction: (item: T) => ReactNode
}) {
  const t = managerQueueCopy[locale]
  const filtered = entries.filter(
    (item) =>
      (view.source === "all" || item.source === view.source) &&
      (view.role === "all" || item.role === view.role) &&
      (view.urgency === "all" || item.lane === view.urgency),
  )
  const pages = Math.max(1, Math.ceil(filtered.length / 10))
  const page = Math.min(view.page, pages)
  const displayed = filtered.slice((page - 1) * 10, page * 10)
  // Correct a deep-linked page after access/source refresh without fetching extra scope.
  useEffect(() => {
    if (view.page !== page) update({ page })
  }, [view.page, page, update])
  return (
    <section
      className={cn(dashboardPanelClass, "space-y-4 p-4")}
      aria-labelledby="manager-queue-title"
    >
      <h2 id="manager-queue-title" className="text-lg font-semibold">
        {t.queue}
      </h2>
      <ManagerUrgencyFilters entries={entries} locale={locale} view={view} update={update} />
      <div className="flex flex-wrap items-end gap-3">
        {(["source", "role", "urgency"] as const).map((key) => (
          <label key={key} className="grid min-w-40 gap-1 text-sm">
            {key === "urgency" ? t.urgency : t[key]}
            <select
              value={view[key]}
              onChange={(event) => update({ [key]: event.target.value })}
              className="min-h-11 max-w-full rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-canvas)] px-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--dash-brand)]"
            >
              <option value="all">{t.all}</option>
              {(key === "urgency"
                ? [...managerLanes]
                : [...new Set(entries.map((item) => item[key]))]
              ).map((value) => (
                <option key={value} value={value}>
                  {key === "urgency"
                    ? t.lanes[value as ManagerLane]
                    : key === "source"
                      ? (t.sources[value as keyof typeof t.sources] ?? value)
                      : (t.roles[value as keyof typeof t.roles] ?? value)}
                </option>
              ))}
            </select>
          </label>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={() => update({ source: "all", role: "all", urgency: "all" })}
        >
          {t.clear}
        </Button>
      </div>
      <p role="status" className="text-sm text-[var(--dash-text-soft)]">
        {entries.length} {t.loaded} · {filtered.length} {t.matched} · {displayed.length} {t.shown}
      </p>
      {displayed.length ? (
        <div className="space-y-3">
          {displayed.map((item) => (
            <details key={item.id} className={cn(dashboardRowClass, "p-3")}>
              <summary className="min-h-11 cursor-pointer break-words py-2 font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--dash-brand)]">
                {item.title}{" "}
                <span className="text-xs font-normal text-[var(--dash-text-soft)]">
                  — {t.lanes[item.lane]}
                  {item.blockerCount ? ` · ${t.lanes.blocked} (${item.blockerCount})` : ""} ·{" "}
                  {t.details}
                </span>
              </summary>
              {renderAction(item)}
            </details>
          ))}
        </div>
      ) : (
        <p className="py-6 text-sm">{entries.length ? t.noMatch : t.empty}</p>
      )}
      <nav aria-label={t.queue} className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={page === 1}
          onClick={() => update({ page: page - 1 })}
        >
          {t.previous}
        </Button>
        <span className="text-sm">
          {t.page} {page} / {pages}
        </span>
        <Button
          type="button"
          variant="outline"
          disabled={page === pages}
          onClick={() => update({ page: page + 1 })}
        >
          {t.next}
        </Button>
      </nav>
    </section>
  )
}
