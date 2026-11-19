"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { localizePath } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import {
  dashboardPanelClass,
  dashboardRowClass,
  dashboardMutedTextClass,
} from "@/components/finance/finance-dashboard-theme";
import {
  getCommandCenterFollowUps,
  changeCommandCenterFollowUp,
  reviewCommandCenterFollowUps,
  getCommandCenterCandidates,
  saveCommandCenterPreference,
  acknowledgeCommandCenterNotice,
} from "@/actions/command-center/follow-up.actions";
import type {
  Center,
  FollowUpQuery,
  FollowUpData,
  FollowUpItem,
  FollowUpCommand,
  ReviewCommand,
  SourceKey,
  Coordination,
  FollowUpCandidate,
  PreferenceCommand,
  NoticeCommand,
} from "@/services/command-center/contracts";
const words = {
  en: {
    title: "Work & follow-up",
    help: "Saved across Digest, Manager and Owner for the same source and scope. Coordination never certifies a business outcome.",
    loading: "Checking current access and source evidence…",
    refresh: "Refresh follow-ups",
    empty: "No saved work is available in this scope.",
    limited:
      "Some sources are restricted or unavailable. This view does not establish organization-wide completion.",
    save: "Save follow-up",
    saved: "Follow-up saved. Other centers receive it on refresh.",
    review: "Record review of these follow-ups",
    reviewed: "Review recorded for the current evidence.",
    reviewHelp:
      "This records your review of the follow-ups below, not approval of the financial brief or source transactions.",
    failed:
      "Follow-ups are unavailable. Refresh to check current access and evidence.",
    retry: "Retry the same request",
    uncertain:
      "The result is uncertain. Retry the same request or refresh before editing.",
    open: "Open source",
    owner: "Assignee",
    me: "Me",
    unassigned: "Unassigned",
    due: "Follow-up date (UTC)",
    state: "Coordination",
    search: "Find eligible assignee",
    find: "Search",
    narrow: "Refine your search to see more candidates.",
    history: "Recent history (up to 5 events)",
    episode: "Occurrence",
    mine: "Assigned to me",
    all: "All permitted follow-ups",
    noMatches: "No follow-ups match this filter.",
    active: "Source needs attention",
    clear: "Source condition cleared",
    unknown: "Source evidence unavailable",
    unavailableOwner: "Assignee unavailable",
    states: {
      OPEN: "Open",
      ASSIGNED: "Assigned",
      WAITING: "Waiting",
      REVIEWED: "Reviewed",
    },
    events: {
      OBSERVED: "Source observed",
      SOURCE_CHANGED: "Source evidence changed",
      COORDINATED: "Follow-up updated",
    },
  },
  fr: {
    title: "Travail et suivi",
    help: "Enregistré dans Digest, Manager et Owner pour la même source et le même périmètre. Le suivi ne certifie aucun résultat métier.",
    loading: "Vérification des accès et des preuves…",
    refresh: "Actualiser les suivis",
    empty: "Aucun travail enregistré n’est disponible dans ce périmètre.",
    limited:
      "Certaines sources sont restreintes ou indisponibles. Cette vue ne prouve pas l’achèvement des travaux de l’organisation.",
    save: "Enregistrer le suivi",
    saved:
      "Suivi enregistré. Les autres centres le recevront après actualisation.",
    review: "Enregistrer la revue de ces suivis",
    reviewed: "Revue enregistrée pour les preuves actuelles.",
    reviewHelp:
      "Cette action enregistre la revue des suivis ci-dessous, sans approuver la synthèse financière ni les opérations sources.",
    failed:
      "Les suivis sont indisponibles. Actualisez pour vérifier les accès et les preuves.",
    retry: "Réessayer la même demande",
    uncertain:
      "Le résultat est incertain. Réessayez la même demande ou actualisez avant de modifier.",
    open: "Ouvrir la source",
    owner: "Responsable",
    me: "Moi",
    unassigned: "Non attribué",
    due: "Date de suivi (UTC)",
    state: "Coordination",
    search: "Rechercher un responsable autorisé",
    find: "Rechercher",
    narrow: "Affinez la recherche pour afficher d’autres responsables.",
    history: "Historique récent (5 événements maximum)",
    episode: "Occurrence",
    mine: "Attribués à moi",
    all: "Tous les suivis autorisés",
    noMatches: "Aucun suivi ne correspond à ce filtre.",
    active: "La source demande une intervention",
    clear: "Condition levée à la source",
    unknown: "Preuves sources indisponibles",
    unavailableOwner: "Responsable indisponible",
    states: {
      OPEN: "Ouvert",
      ASSIGNED: "Attribué",
      WAITING: "En attente",
      REVIEWED: "Examiné",
    },
    events: {
      OBSERVED: "Source observée",
      SOURCE_CHANGED: "Preuves sources modifiées",
      COORDINATED: "Suivi mis à jour",
    },
  },
};
const titles: Record<"en" | "fr", Record<SourceKey, string>> = {
  en: {
    suspense: "Payment suspense",
    stockout: "Stock availability",
    receiving: "Overdue receiving",
    loss: "Recorded inventory loss",
    close: "Close obligations across retained periods",
    payroll_forecast: "Payroll forecast evidence — next 30 UTC days",
    employee_balance: "Employee balance recovery",
  },
  fr: {
    suspense: "Paiements en suspens",
    stockout: "Disponibilité du stock",
    receiving: "Réceptions en retard",
    loss: "Pertes de stock enregistrées",
    close: "Obligations de clôture des périodes conservées",
    payroll_forecast: "Preuves de paie — 30 prochains jours UTC",
    employee_balance: "Recouvrement des soldes salariés",
  },
};
type Pending =
  | { kind: "change"; input: FollowUpCommand }
  | { kind: "review"; input: ReviewCommand }
  | { kind: "preference"; input: PreferenceCommand }
  | { kind: "notice"; input: NoticeCommand };
type Props = {
  center: Center;
  periodStart: string;
  periodEnd: string;
  locationId?: string | null;
  locale: "en" | "fr";
};
export function FollowUpPanel({
  center,
  periodStart,
  periodEnd,
  locationId,
  locale,
}: Props) {
  const [chosenLocation, setChosenLocation] = useState<string | null>(
    locationId ?? null,
  );
  useEffect(() => {
    const restore = () =>
      setChosenLocation(
        locationId ??
          new URL(window.location.href).searchParams.get("followUpLocation"),
      );
    restore();
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, [locationId]);
  function chooseLocation(value: string) {
    const url = new URL(window.location.href);
    if (value) url.searchParams.set("followUpLocation", value);
    else url.searchParams.delete("followUpLocation");
    window.history.replaceState(
      window.history.state,
      "",
      url.pathname + url.search + url.hash,
    );
    setChosenLocation(value || null);
  }
  const effectiveLocation = locationId ?? chosenLocation;
  const query = useMemo<FollowUpQuery>(
    () => ({ center, periodStart, periodEnd, locationId: effectiveLocation }),
    [center, periodStart, periodEnd, effectiveLocation],
  );
  const [data, setData] = useState<FollowUpData | null>(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [retry, setRetry] = useState<Pending | null>(null),
    [mine, setMine] = useState(center === "digest");
  const generation = useRef(0),
    inFlight = useRef(false),
    pending = useRef<Pending | null>(null);
  const t = words[locale];
  const load = useCallback(async () => {
    const token = ++generation.current;
    inFlight.current = true;
    pending.current = null;
    setRetry(null);
    setData(null);
    setBusy(true);
    setMessage(words[locale].loading);
    try {
      const result = await getCommandCenterFollowUps(query);
      if (token !== generation.current) return;
      if (result.success) {
        setData(result.data);
        setMessage("");
      } else setMessage(words[locale].failed);
    } catch {
      if (token === generation.current) setMessage(words[locale].failed);
    } finally {
      if (token === generation.current) {
        inFlight.current = false;
        setBusy(false);
      }
    }
  }, [query, locale]);
  useEffect(() => {
    const counter = generation;
    void load();
    const refresh = () => {
      if (!inFlight.current && !pending.current) void load();
    };
    window.addEventListener("focus", refresh);
    return () => {
      counter.current++;
      window.removeEventListener("focus", refresh);
    };
  }, [load]);
  async function submit(command: Pending) {
    const token = ++generation.current;
    inFlight.current = true;
    pending.current = command;
    setBusy(true);
    setRetry(null);
    setMessage(t.loading);
    try {
      const result =
        command.kind === "change"
          ? await changeCommandCenterFollowUp(command.input)
          : command.kind === "review"
            ? await reviewCommandCenterFollowUps(command.input)
            : command.kind === "preference"
              ? await saveCommandCenterPreference(command.input)
              : await acknowledgeCommandCenterNotice(command.input);
      if (token !== generation.current) return;
      if (result.success) {
        pending.current = null;
        setData(result.data);
        setMessage(command.kind === "review" ? t.reviewed : t.saved);
      } else if (
        result.retryable &&
        !["FORBIDDEN", "DATABASE_CONFLICT", "CONFLICT"].includes(result.code)
      ) {
        setRetry(command);
        setMessage(t.uncertain);
      } else {
        pending.current = null;
        setData(null);
        setMessage(t.failed);
      }
    } catch {
      if (token === generation.current) {
        setRetry(command);
        setMessage(t.uncertain);
      }
    } finally {
      if (token === generation.current) {
        inFlight.current = false;
        setBusy(false);
      }
    }
  }
  const items =
    data?.items.filter((item) => !mine || item.ownerId === data.actorId) ?? [];
  return (
    <section
      aria-label={t.title}
      className={`${dashboardPanelClass} space-y-4 p-4`}
      aria-busy={busy}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{t.title}</h2>
          <p className={`${dashboardMutedTextClass} max-w-3xl text-sm`}>
            {t.help}
          </p>
        </div>
        <Button variant="outline" disabled={busy} onClick={() => void load()}>
          {t.refresh}
        </Button>
      </div>
      <p
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="text-sm"
      >
        {message}
      </p>
      {!data && !busy && !locationId && chosenLocation ? (
        <Button variant="outline" onClick={() => chooseLocation("")}>
          {locale === "fr"
            ? "Réinitialiser le périmètre des suivis"
            : "Reset follow-up scope"}
        </Button>
      ) : null}
      {retry ? (
        <Button disabled={busy} onClick={() => void submit(retry)}>
          {t.retry}
        </Button>
      ) : null}
      {data ? (
        <>
          {!locationId && data.availableLocations?.length ? (
            <label className="block text-sm">
              {locale === "fr" ? "Périmètre des suivis" : "Follow-up scope"}
              <select
                className="dashboard-control ml-2 max-w-full rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-surface)] px-3 py-2 text-[var(--dash-text)]"
                value={chosenLocation ?? ""}
                disabled={busy || Boolean(retry)}
                onChange={(event) => chooseLocation(event.target.value)}
              >
                <option value="">
                  {locale === "fr" ? "Organisation" : "Organization"}
                </option>
                {data.availableLocations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {data.notices?.length ? (
            <aside
              aria-label={
                locale === "fr" ? "Nouveaux suivis" : "New follow-ups"
              }
              className="space-y-2"
            >
              {data.notices.map((notice) => (
                <div
                  key={notice.id}
                  className="flex flex-wrap items-center gap-3 text-sm"
                >
                  <span>
                    {locale === "fr"
                      ? "Suivi attribué ou date modifiée : "
                      : "Assignment or follow-up date changed: "}
                    {titles[locale][notice.source]}
                  </span>
                  <Button
                    disabled={busy || Boolean(retry)}
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      void submit({
                        kind: "notice",
                        input: { ...query, noticeId: notice.id },
                      })
                    }
                  >
                    {locale === "fr"
                      ? "Marquer la notification comme lue"
                      : "Mark notice read"}
                  </Button>
                </div>
              ))}
            </aside>
          ) : null}
          {data.unavailable.length > 0 ? (
            <p className={`${dashboardMutedTextClass} text-sm`}>{t.limited}</p>
          ) : null}
          <label className="flex gap-2 text-sm">
            <input
              type="checkbox"
              checked={mine}
              onChange={(event) => setMine(event.target.checked)}
            />
            {t.mine}
          </label>
          {!items.length ? (
            <p className={dashboardMutedTextClass}>
              {data.items.length ? t.noMatches : t.empty}
            </p>
          ) : null}
          <fieldset disabled={busy || Boolean(retry)} className="space-y-3">
            <legend className="sr-only">{t.title}</legend>
            {items.map((item) => (
              <FollowUpRow
                key={`${item.id}:${item.revision}`}
                item={item}
                actorId={data.actorId}
                query={query}
                locale={locale}
                onSave={(input) => void submit({ kind: "change", input })}
              />
            ))}
          </fieldset>
          <div className="border-t border-[var(--dash-border-subtle)] pt-3">
            <p className={`${dashboardMutedTextClass} mb-2 text-sm`}>
              {t.reviewHelp}
              {mine
                ? " " +
                  (locale === "fr"
                    ? "Affichez tous les suivis autorisés pour enregistrer cette revue."
                    : "Show all permitted follow-ups to record this review.")
                : ""}
            </p>
            <Button
              variant="outline"
              disabled={
                mine ||
                busy ||
                Boolean(retry) ||
                data.review.current ||
                data.items.some((i) => i.condition === "UNKNOWN")
              }
              onClick={() =>
                void submit({
                  kind: "review",
                  input: {
                    ...query,
                    requestId: crypto.randomUUID(),
                    expectedRevision: data.revision,
                    evidenceKey: data.evidenceKey,
                  },
                })
              }
            >
              {data.review.current ? t.reviewed : t.review}
            </Button>
          </div>
          <PreferenceControls
            key={JSON.stringify(data.preference)}
            value={data.preference}
            locale={locale}
            disabled={busy || Boolean(retry)}
            onSave={(value) =>
              void submit({ kind: "preference", input: { ...query, ...value } })
            }
          />
        </>
      ) : null}
    </section>
  );
}
function FollowUpRow({
  item,
  actorId,
  query,
  locale,
  onSave,
}: {
  item: FollowUpItem;
  actorId: string;
  query: FollowUpQuery;
  locale: "en" | "fr";
  onSave: (input: FollowUpCommand) => void;
}) {
  const t = words[locale],
    [owner, setOwner] = useState(item.ownerId ?? actorId),
    [state, setState] = useState<Coordination>(
      item.coordination === "OPEN" ? "ASSIGNED" : item.coordination,
    ),
    [due, setDue] = useState(item.dueAt?.slice(0, 10) ?? ""),
    [search, setSearch] = useState(""),
    [candidates, setCandidates] = useState<FollowUpCandidate[]>([]),
    [searchState, setSearchState] = useState("");
  const live = useRef(true),
    searchId = useRef(0);
  useEffect(() => {
    const counter = searchId;
    live.current = true;
    return () => {
      live.current = false;
      counter.current++;
    };
  }, []);
  async function find() {
    const token = ++searchId.current;
    setCandidates([]);
    setSearchState(t.loading);
    try {
      const response = await getCommandCenterCandidates({
        ...query,
        itemId: item.id,
        search,
      });
      if (!live.current || token !== searchId.current) return;
      if (response.success) {
        setCandidates(response.data.candidates);
        setSearchState(response.data.limited ? t.narrow : "");
      } else setSearchState(t.failed);
    } catch {
      if (live.current && token === searchId.current) setSearchState(t.failed);
    }
  }
  const options = [
    { id: actorId, name: t.me },
    ...(item.ownerId && item.ownerId !== actorId
      ? [{ id: item.ownerId, name: item.ownerName ?? t.unavailableOwner }]
      : []),
    ...candidates,
  ].filter((c, i, a) => a.findIndex((x) => x.id === c.id) === i);
  const cls =
    "dashboard-control w-full min-w-0 rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-surface)] px-3 py-2 text-[var(--dash-text)]";
  return (
    <article className={`${dashboardRowClass} space-y-3 p-3`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold">{titles[locale][item.source]}</h3>
          <p className={`${dashboardMutedTextClass} text-sm`}>
            {item.condition === "ACTIVE"
              ? t.active
              : item.condition === "CLEAR"
                ? t.clear
                : t.unknown}{" "}
            · {t.episode} {item.episode} · {t.states[item.coordination]}
          </p>
          {item.ownerId ? (
            <p className="text-sm">
              {t.owner}: {item.ownerName ?? t.unavailableOwner}
            </p>
          ) : null}
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href={localizePath(item.actionPath, locale)}>{t.open}</Link>
        </Button>
      </div>
      {item.canAssign ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSave({
              ...query,
              requestId: crypto.randomUUID(),
              itemId: item.id,
              expectedRevision: item.revision,
              ownerId: owner || null,
              state,
              dueAt:
                due === (item.dueAt?.slice(0, 10) ?? "")
                  ? item.dueAt
                  : due
                    ? new Date(`${due}T00:00:00Z`).toISOString()
                    : null,
            });
          }}
          className="space-y-3"
        >
          <div className="grid gap-3 md:grid-cols-3">
            <label className="min-w-0 text-sm">
              {t.owner}
              <select
                disabled={!item.canDelegate}
                className={cls}
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
              >
                <option value="">{t.unassigned}</option>
                {options.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="min-w-0 text-sm">
              {t.state}
              <select
                className={cls}
                value={state}
                onChange={(e) => setState(e.target.value as Coordination)}
              >
                {Object.entries(t.states).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="min-w-0 text-sm">
              {t.due}
              <input
                className={cls}
                type="date"
                style={{ colorScheme: "dark" }}
                value={due}
                onChange={(e) => setDue(e.target.value)}
              />
            </label>
          </div>
          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-end">
            {item.canDelegate ? (
              <>
                <label className="min-w-0 w-full text-sm sm:w-auto sm:flex-1">
                  {t.search}
                  <input
                    className={cls}
                    value={search}
                    maxLength={80}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </label>
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => void find()}
                >
                  {t.find}
                </Button>
              </>
            ) : null}
            <Button type="submit">{t.save}</Button>
          </div>
          <p role="status" className="text-sm">
            {searchState}
          </p>
        </form>
      ) : null}
      <details>
        <summary className="cursor-pointer text-sm">{t.history}</summary>
        <ul className="mt-2 space-y-1 text-sm">
          {item.history.map((event, i) => (
            <li key={i}>
              {t.events[event.type as keyof typeof t.events] ??
                t.events.SOURCE_CHANGED}{" "}
              ·{" "}
              {new Intl.DateTimeFormat(locale, {
                dateStyle: "medium",
                timeStyle: "short",
                timeZone: "UTC",
              }).format(new Date(event.at))}{" "}
              UTC
            </li>
          ))}
        </ul>
      </details>
    </article>
  );
}

function PreferenceControls({
  value,
  locale,
  disabled,
  onSave,
}: {
  value: FollowUpData["preference"];
  locale: "en" | "fr";
  disabled: boolean;
  onSave: (value: FollowUpData["preference"]) => void;
}) {
  const [enabled, setEnabled] = useState(value?.enabled ?? true),
    [start, setStart] = useState(value?.quietStart?.toString() ?? ""),
    [end, setEnd] = useState(value?.quietEnd?.toString() ?? "");
  const fr = locale === "fr",
    cls =
      "dashboard-control rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-surface)] px-2 py-1 text-[var(--dash-text)]";
  return (
    <details>
      <summary className="cursor-pointer text-sm">
        {fr
          ? "Préférences des notifications de suivi"
          : "Follow-up notification preferences"}
      </summary>
      <form
        className="mt-3 flex flex-wrap items-end gap-3 text-sm"
        onSubmit={(event) => {
          event.preventDefault();
          onSave({
            enabled,
            quietStart: start === "" ? null : Number(start),
            quietEnd: end === "" ? null : Number(end),
          });
        }}
      >
        <fieldset
          disabled={disabled}
          className="flex flex-wrap items-end gap-3"
        >
          <legend className="sr-only">
            {fr ? "Notifications dans l’application" : "In-app notifications"}
          </legend>
          <label>
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />{" "}
            {fr ? "Notifications dans l’application" : "In-app notifications"}
          </label>
          <label>
            {fr ? "Début de pause (heure UTC)" : "Quiet start (UTC hour)"}
            <input
              className={`${cls} ml-2 w-20`}
              type="number"
              min={0}
              max={23}
              value={start}
              onChange={(e) => setStart(e.target.value)}
              required={end !== ""}
            />
          </label>
          <label>
            {fr ? "Fin de pause (heure UTC)" : "Quiet end (UTC hour)"}
            <input
              className={`${cls} ml-2 w-20`}
              type="number"
              min={0}
              max={23}
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              required={start !== ""}
            />
          </label>
          <Button variant="outline" type="submit">
            {fr ? "Enregistrer les préférences" : "Save preferences"}
          </Button>
        </fieldset>
      </form>
      <p className={`${dashboardMutedTextClass} mt-2 text-xs`}>
        {fr
          ? "Les notifications en attente apparaissent lors d’une prochaine consultation autorisée, après la pause. Aucun e-mail n’est envoyé."
          : "Pending notices appear on a later authorized visit after quiet hours. No email is sent."}
      </p>
    </details>
  );
}
