"use client"
import { FollowUpPanel } from "@/components/command-center/FollowUpPanel";

import { commandDateLabel, priorityExplanation } from "@/lib/dashboard/command-center-context"
import { CommandCenterRecovery } from "@/components/dashboard/CommandCenterRecovery"

import Link from "next/link";
import { ArrowUpRight, CalendarClock, EyeOff, LockKeyhole, Sparkles } from "lucide-react";

import { BIActionPriorityBoard } from "@/components/bi/BIActionPriorityBoard";
import { BICommandBriefHeader } from "@/components/bi/BICommandBriefHeader";
import type { BIActionPriorityItem } from "@/components/bi/BIActionPriorityBoard";
import { BIEvidenceBadgeRow } from "@/components/bi/BIEvidenceBadgeRow";
import { BIEmptyState } from "@/components/bi/BIEmptyState";
import { BIKpiCard } from "@/components/bi/BIKpiCard";
import { BISeverityBadge, BIStateBadge } from "@/components/bi/BIStateBadge";
import { EvidenceGradeBadge } from "@/components/evidence/EvidenceGradeBadge";
import { PaymentReconciliationSignOffCommand } from "@/components/manager-action-center/PaymentReconciliationSignOffCommand";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  dashboardMutedTextClass,
  dashboardPanelClass,
  dashboardRowClass,
  dashboardToneClass,
} from "@/components/finance/finance-dashboard-theme";
import { cn } from "@/lib/utils";
import type { ManagerActionCenterData } from "@/services/manager-action-center/manager-action-center-contracts";

type ManagerActionCenterDashboardProps = {
  followUpEnabled?: boolean
  data: ManagerActionCenterData;
  locale: "en" | "fr";
  title: string;
  subtitle: string;
};

import { BIActionButton } from "@/components/bi/BIActionButton";
import { localizePath } from "@/i18n/routing";
import { ManagerActionQueue, ManagerUrgencyFilters, managerQueueCopy } from "./ManagerActionQueue";
import { useManagerView } from "./useManagerView";
const copy = {
  en: {
    sourceOwned: "Source-owned",
    evidenceBacked: "Evidence-backed",
    permissionFiltered: "Permission-filtered",
    generated: "Generated",
    period: "Period",
    open: "Open",
    dueToday: "Due today",
    critical: "Critical",
    overdue: "Overdue",
    hidden: "Hidden",
    actions: "Manager actions",
    insights: "Business signals",
    doFirst: "Do first today",
    doFirstDetail:
      "Permission-filtered actions ranked by urgency, evidence, blockers, and business pressure.",
    runSheet: "Daily run sheet",
    runSheetDetail: "Urgency lanes for the work managers can actually move today.",
    noActions: "No manager action is visible for this tenant and permission set.",
    noSignals: "No business signal is visible for this tenant and permission set.",
    nextStep: "Next step",
    due: "Due",
    role: "Role",
    requiredPermission: "Required permission",
    openSurface: "Open",
    reconciliationTitle: "Sign payment reconciliation",
    reconciliationDetail:
      "Verify provider totals and apply independent sign-off with fresh authentication.",
    reconciliationReadOnly:
      "Review the ready reconciliation evidence. Signing is unavailable for this actor.",
    hiddenNotice: "Some actions are withheld by server-side permission filtering.",
  },
  fr: {
    sourceOwned: "Pilote par les sources",
    evidenceBacked: "Appuye sur preuves",
    permissionFiltered: "Filtre par permission",
    generated: "Genere",
    period: "Periode",
    open: "Ouvert",
    dueToday: "A traiter aujourd'hui",
    critical: "Critique",
    overdue: "En retard",
    hidden: "Masque",
    actions: "Actions manager",
    insights: "Signaux metier",
    doFirst: "A traiter en premier",
    doFirstDetail:
      "Actions filtrees par permission et classees par urgence, preuve, blocages et pression metier.",
    runSheet: "Plan de journee",
    runSheetDetail:
      "Couloirs d'urgence pour le travail qu'un manager peut vraiment faire avancer aujourd'hui.",
    noActions: "Aucune action manager n'est visible pour ce tenant et ces permissions.",
    noSignals: "Aucun signal metier n'est visible pour ce tenant et ces permissions.",
    nextStep: "Prochaine etape",
    due: "Echeance",
    role: "Role",
    requiredPermission: "Permission requise",
    openSurface: "Ouvrir",
    reconciliationTitle: "Valider le rapprochement des paiements",
    reconciliationDetail:
      "Verifier les totaux fournisseur et appliquer une validation independante avec une authentification recente.",
    reconciliationReadOnly:
      "Revoir les preuves du rapprochement pret. La validation n'est pas disponible pour cet acteur.",
    hiddenNotice: "Certaines actions sont retenues par le filtrage serveur des permissions.",
  },
} as const;

function ManagerActionCenterDashboardContent({
  data,
  locale,
  title,
  subtitle,
}: ManagerActionCenterDashboardProps) {
  const t = copy[locale];
  const q = managerQueueCopy[locale];
  const formatterLocale = locale === "fr" ? "fr-FR" : "en-US";
  const entries = data.actionItems.map((item) => ({
    id: item.id,
    title: managerActionCopy(item, locale).title,
    source: item.origin,
    role: item.assignedRole,
    lane:
      data.runSheetGroups.find((group) => group.actions.some((action) => action.id === item.id))
        ?.id ?? ("routine" as const),
    action: item,
    blockerCount: item.blockers.length,
  }));
  const { view, update } = useManagerView({
    sources: entries.map((item) => item.source),
    roles: entries.map((item) => item.role),
    defaultMode: data.commandBrief.mode,
  });
  const openQueue = () => update({ mode: "command", source: "all", role: "all", urgency: "all" });
  return (
    <div className="dashboard-landing-theme dark min-h-screen bg-[var(--dash-canvas)]">
      <div className="dashboard-landing-content mx-auto w-full max-w-[1920px] space-y-4 px-4 py-4 text-[var(--dash-text)] md:px-6 lg:px-8">
        <BICommandBriefHeader
          brief={{ ...data.commandBrief, title }}
          mode={view.mode}
          onModeChange={(mode) => update({ mode })}
          locale={locale}
          timezone="UTC"
          periodTimezone="UTC"
          compact
        />
        <p className="text-sm text-[var(--dash-text-soft)]">{subtitle}</p>
        <ManagerCoverage data={data} locale={locale} />
        <section aria-label={`${title}: ${q[view.mode]}`} className="space-y-4">
          {view.mode === "brief" ? (
            <>
              <BIActionPriorityBoard
                items={data.actionItems.map((item) =>
                  toPriorityAction(item, formatterLocale, locale, data.commandBrief.freshness),
                )}
                locale={locale}
                title={t.doFirst}
                detail={priorityExplanation(data.actionItems[0], "severity_deadline_score", locale)}
                maxItems={3}
              />
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm text-[var(--dash-text-soft)]">
                  {Math.min(3, entries.length)} {q.preview} / {entries.length} {q.loaded}
                </p>
                <Button type="button" variant="outline" onClick={openQueue}>
                  {q.viewAll}
                </Button>
              </div>
              <ManagerUrgencyFilters
                entries={entries}
                locale={locale}
                view={view}
                update={update}
              />
            </>
          ) : null}
          {view.mode === "command" ? (
            <ManagerActionQueue
              key={`${data.organizationId}:${data.generatedAt}`}
              entries={entries}
              locale={locale}
              view={view}
              update={update}
              renderAction={(entry) => <ManagerActionCard item={entry.action} locale={locale} />}
            />
          ) : null}
          {view.mode === "investigate" ? (
            <>
              <section
                className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"
                aria-label={locale === "fr" ? "Indicateurs et preuves" : "Metrics and evidence"}
              >
                <h2 className="sr-only">{locale === "fr" ? "Indicateurs et preuves" : "Metrics and evidence"}</h2>
                {data.kpis.map((card) => (
                  <BIKpiCard key={card.id} card={card} locale={formatterLocale} />
                ))}
              </section>
              <div className={cn(dashboardPanelClass, "p-4")}>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--dash-text)]">{t.insights}</h2>
                  <p className={cn("mt-1 text-sm leading-6", dashboardMutedTextClass)}>
                    {data.insights.length}{" "}
                    {locale === "fr" ? "signaux visibles" : "visible signals"}
                  </p>
                </div>
                <div className="mt-4 space-y-3">
                  {data.insights.length ? (
                    data.insights.map((insight) => (
                      <article key={insight.id} className={cn(dashboardRowClass, "p-3")}>
                        <div className="flex flex-wrap items-center gap-2">
                          <BISeverityBadge severity={insight.severity} />
                          <BIStateBadge state={insight.state} />
                        </div>
                        <h3 className="mt-3 text-sm font-semibold text-[var(--dash-text)]">
                          {insight.title}
                        </h3>
                        <p className={cn("mt-1 text-sm leading-6", dashboardMutedTextClass)}>
                          {insight.businessImpact}
                        </p>
                        <BIEvidenceBadgeRow
                          className="mt-3"
                          locale={locale}
                          evidenceGrade={insight.evidenceGrade}
                          trustState={insight.trustState}
                          freshness={insight.freshness}
                        />
                        {insight.actionLink && !insight.actionLink.disabled ? (
                          <Button
                            asChild
                            size="sm"
                            variant="outline"
                            className="mt-3 h-auto max-w-full whitespace-normal break-words rounded-lg border-[var(--dash-border-subtle)] text-left text-[var(--dash-text)]"
                          >
                            <Link href={localizePath(insight.actionLink.href, locale)}>
                              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                              {insight.actionLink.label}
                            </Link>
                          </Button>
                        ) : null}
                      </article>
                    ))
                  ) : (
                    <BIEmptyState title={t.noSignals} />
                  )}
                </div>
              </div>
              <section className={cn(dashboardPanelClass, "space-y-3 p-4")}>
                <h2 className="text-lg font-semibold">
                  {locale === "fr" ? "Blocages des actions" : "Action blockers"}
                </h2>
                {data.actionItems
                  .filter((item) => item.blockers.length)
                  .map((item) => (
                    <article key={item.id} className={cn(dashboardRowClass, "p-3")}>
                      <h3 className="font-medium">{managerActionCopy(item, locale).title}</h3>
                      {item.blockers.map((blocker) => (
                        <p key={blocker.id} className="mt-2 text-sm">
                          {blocker.title}: {blocker.detail} {blocker.nextAction}
                        </p>
                      ))}
                      <BIActionButton
                        action={item.actionLink}
                        locale={locale}
                        context={managerActionCopy(item, locale).title}
                      />
                    </article>
                  ))}
                {!data.actionItems.some((item) => item.blockers.length) ? (
                  <p className="text-sm">
                    {locale === "fr"
                      ? "Aucun blocage signalé dans les actions chargées."
                      : "No blockers reported in the loaded actions."}
                  </p>
                ) : null}
              </section>
            </>
          ) : null}
        </section>
      </div>
    </div>
  );
}

function ManagerCoverage({
  data,
  locale,
}: Pick<ManagerActionCenterDashboardProps, "data" | "locale">) {
  const fr = locale === "fr";
  const source = data.clientMissingProofSource;
  return (
    <aside
      aria-label={fr ? "Couverture des sources" : "Source coverage"}
      className={cn(dashboardRowClass, "space-y-2 p-3 text-sm text-[var(--dash-text-soft)]")}
    >
      <p>
        {fr
          ? "La file couvre les actions autorisées chargées, pas tous les travaux de l’organisation."
          : "The queue covers loaded authorized actions, not all work in the organization."}
      </p>
      {data.summary.hiddenByPermission > 0 ? (
        <p>
          {copy[locale].hiddenNotice} ({data.summary.hiddenByPermission})
        </p>
      ) : null}
      {data.assuranceCoverage?.state === "AVAILABLE" ? (
        <div>
          <p>{fr ? "Incidents d’assurance autorisés chargés" : "Authorized assurance incidents loaded"}: {data.assuranceCoverage.loaded}. {fr ? "Limite de la source avant filtrage des autorisations" : "Source limit before permission filtering"}: {data.assuranceCoverage.limit}.</p>
          {data.assuranceCoverage.possiblyTruncated ? <p>{fr
            ? "Couverture partielle possible : la limite de la source a été atteinte ; d’autres incidents peuvent exister."
            : "Coverage may be partial: the source limit was reached; more incidents may exist."}</p> : null}
        </div>
      ) : <p>{data.assuranceCoverage?.state === "UNAVAILABLE"
        ? fr ? "Les incidents d’assurance n’ont pas pu être chargés. Actualisez la vue pour réessayer ; leur absence ne confirme pas la fin du travail." : "Assurance incidents could not be loaded. Refresh the view to retry; their absence does not confirm completion."
        : fr ? "La couverture des incidents d’assurance n’est pas confirmée." : "Assurance incident coverage is not confirmed."}</p>}
      {source?.state === "AVAILABLE" ? (
        <>
          <p>
            {fr ? "Demandes du comptable chargées" : "Accountant requests loaded"}:{" "}
            {source.queue.requests.length}. {fr ? "Limite de la source" : "Source limit"}:{" "}
            {source.queue.controls.maxItems}.
          </p>
          {source.queue.summary.truncated || source.queue.nextCursor ? (
            <p>
              {fr
                ? "Couverture partielle : d’autres demandes peuvent être disponibles dans la clôture comptable."
                : "Partial coverage: more requests may be available in Accounting Close."}
            </p>
          ) : null}
          {source.queue.blockers.length ? (
            <p>
              {fr
                ? "Certaines demandes ont des preuves incomplètes. Consultez la source."
                : "Some requests have incomplete evidence. Review the source."}
            </p>
          ) : null}
          <Link
            className="inline-flex min-h-11 items-center underline"
            href={localizePath("/dashboard/accounting/close", locale)}
          >
            {fr ? "Ouvrir la clôture comptable" : "Open Accounting Close"}
          </Link>
        </>
      ) : source?.state === "HIDDEN" ? (
        <p>
          {source.reason === "MODULE_UNAVAILABLE"
            ? fr
              ? "Le module de demandes du comptable est indisponible. Contactez votre administrateur."
              : "The accountant request module is unavailable. Contact your administrator."
            : fr
              ? "Les demandes du comptable sont restreintes. Demandez l’accès à votre administrateur."
              : "Accountant requests are restricted. Ask your administrator for access."}
        </p>
      ) : source?.state === "UNAVAILABLE" ? (
        <div>
          <p>
            {fr
              ? "Les demandes du comptable n’ont pas pu être chargées. Leur absence ne signifie pas que le travail est terminé."
              : "Accountant requests could not be loaded. Their absence does not mean work is complete."}
          </p>
          <Button type="button" variant="outline" onClick={() => window.location.reload()}>
            {fr ? "Réessayer le chargement" : "Retry loading"}
          </Button>
        </div>
      ) : (
        <p>
          {fr
            ? "La couverture des demandes du comptable n’est pas confirmée."
            : "Accountant request coverage is not confirmed."}
        </p>
      )}
    </aside>
  );
}

function ManagerActionCard({
  item,
  locale,
}: {
  item: ManagerActionCenterData["actionItems"][number];
  locale: "en" | "fr";
}) {
  const t = copy[locale];
  const formatterLocale = locale === "fr" ? "fr-FR" : "en-US";
  return (
    <article key={item.id} className={cn(dashboardRowClass, "p-3")}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <BISeverityBadge severity={item.severity} locale={locale} />
            <BIStateBadge state={item.state} locale={locale} />
            <EvidenceGradeBadge grade={item.evidenceGrade} locale={locale} />
          </div>
          <h3 className="mt-3 text-sm font-semibold text-[var(--dash-text)]">
            {managerActionCopy(item, locale).title}
          </h3>
          <p className={cn("mt-1 text-sm leading-6", dashboardMutedTextClass)}>
            {managerActionCopy(item, locale).nextStep}
          </p>
        </div>
        {item.kind === "PAYMENT_RECONCILIATION_SIGN_OFF" && !item.actionLink.disabled ? (
          <PaymentReconciliationSignOffCommand locale={locale} command={item.sourceCommand} />
        ) : (
          <BIActionButton
            action={item.actionLink}
            locale={locale}
            context={managerActionCopy(item, locale).title}
          />
        )}
      </div>
      <div className="mt-3 grid gap-2 text-xs text-[var(--dash-text-soft)] md:grid-cols-3">
        <InfoLine icon={<CalendarClock className="h-3.5 w-3.5" />} label="">
          {commandDateLabel(item.dueAt, item.dateKind, locale)}
        </InfoLine>
        <InfoLine icon={<Sparkles className="h-3.5 w-3.5" />} label={t.role}>
          {managerQueueCopy[locale].roles[item.assignedRole]}
        </InfoLine>
        <InfoLine icon={<LockKeyhole className="h-3.5 w-3.5" />} label={t.requiredPermission}>
          {item.requiredPermission}
        </InfoLine>
      </div>
      {item.redactions.length || item.blockers.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {item.blockers.map((blocker) => (
            <Badge
              key={blocker.id}
              variant="outline"
              className={cn("border", dashboardToneClass("danger"))}
            >
              {blocker.title}
            </Badge>
          ))}
          {item.redactions.map((redaction) => (
            <Badge
              key={redaction.id}
              variant="outline"
              className={cn("border", dashboardToneClass("gold"))}
            >
              <EyeOff className="mr-1 h-3 w-3" aria-hidden="true" />
              {redaction.field}
            </Badge>
          ))}
        </div>
      ) : null}
    </article>
  );
}

function managerActionCopy(
  item: ManagerActionCenterData["actionItems"][number],
  locale: "en" | "fr",
) {
  if (item.origin !== "SOURCE_COMMAND") {
    return { title: item.title, nextStep: item.nextStep };
  }

  const t = copy[locale];
  return {
    title: t.reconciliationTitle,
    nextStep:
      item.kind === "PAYMENT_RECONCILIATION_SIGN_OFF"
        ? t.reconciliationDetail
        : t.reconciliationReadOnly,
  };
}

function toPriorityAction(
  item: ManagerActionCenterData["actionItems"][number],
  formatterLocale: string,
  locale: "en" | "fr",
  freshness: ManagerActionCenterData["commandBrief"]["freshness"],
): BIActionPriorityItem {
  const display = managerActionCopy(item, locale);
  return {
    id: item.id,
    title: display.title,
    nextStep: display.nextStep,
    severity: item.severity,
    state: item.state,
    actionLink: item.actionLink,
    evidenceGrade: item.evidenceGrade,
    trustState: item.trustState,
    freshness,
    dueLabel: commandDateLabel(item.dueAt, item.dateKind, locale),
    ownerLabel: managerQueueCopy[locale].roles[item.assignedRole],
    blockers: item.blockers,
    redactions: item.redactions,
  };
}

function InfoLine({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-start gap-2">
      <span className="mt-0.5 shrink-0 text-[var(--dash-text-faint)]">{icon}</span>
      <p className="min-w-0">
        {label ? <span className="font-medium text-[var(--dash-text)]">{label}: </span> : null}
        <span className="break-words">{children}</span>
      </p>
    </div>
  );
}

function formatDateTime(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { timeZone: "UTC",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function ManagerActionCenterDashboard(props: ManagerActionCenterDashboardProps) {
  return <CommandCenterRecovery snapshot={props.data} locale={props.locale}><ManagerActionCenterDashboardContent {...props} />{props.followUpEnabled ? <div className="dashboard-landing-theme dark px-4 py-4"><div className="dashboard-landing-content mx-auto max-w-[1920px]"><FollowUpPanel key={`${props.data.organizationId}:${props.data.generatedAt}`} center="manager" periodStart={props.data.periodStart} periodEnd={props.data.periodEnd} locale={props.locale} /></div></div> : null}</CommandCenterRecovery>
}
