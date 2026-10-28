"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Ban,
  Bot,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Loader2,
  RefreshCw,
  ShieldCheck,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";

import {
  runCommandAgentAction,
  submitCommandAgentFeedbackAction,
} from "@/actions/agents/command-agent.actions";
import { CopilotProposalControls } from "@/components/copilot/CopilotProposalControls";
import { EvidenceGradeBadge } from "@/components/evidence/EvidenceGradeBadge";
import { Button } from "@/components/ui/button";
import {
  dashboardMutedTextClass,
  dashboardPanelClass,
  dashboardRowClass,
  dashboardToneClass,
} from "@/components/finance/finance-dashboard-theme";
import { cn } from "@/lib/utils";
import type {
  CommandAgentFeedbackKind,
  CommandAgentRunResult,
  CommandAgentSurfaceAccess,
} from "@/services/agents/command-agent-contracts";

type AgentCommandPanelProps = {
  access: CommandAgentSurfaceAccess;
  digestId: string;
  periodStart: string;
  periodEnd: string;
  locale: "en" | "fr";
  proposalDraftsEnabled?: boolean;
};

const copy = {
  en: {
    title: "Command Agent",
    subtitle: "Evidence-backed daily priorities",
    trust:
      "Read-only. No posting, approval, payment, filing, payroll, stock, cash, or permission authority.",
    generate: "Generate brief",
    retry: "Retry",
    disabled: "Command Agent is disabled for this organization.",
    shadow: "Command Agent is running in non-visible evaluation mode.",
    unavailable: "Command Agent is not available for this role.",
    loading: "Building the evidence-backed brief...",
    empty: "No permitted priority is due for this digest.",
    failed: "The brief could not be generated safely.",
    limitations: "Limitations",
    evidence: "Evidence",
    sources: "sources",
    feedback: "Was this brief useful?",
    feedbackSaved: "Feedback recorded",
    helpful: "Helpful",
    notHelpful: "Not helpful",
    stale: "Stale",
    wrong: "Wrong",
    unsafe: "Unsafe",
    open: "Open source",
    replayed: "Existing run receipt returned",
  },
  fr: {
    title: "Agent de commande",
    subtitle: "Priorites quotidiennes fondees sur les preuves",
    trust:
      "Lecture seule. Aucun pouvoir de comptabilisation, approbation, paiement, depot, paie, stock, caisse ou permission.",
    generate: "Generer le brief",
    retry: "Reessayer",
    disabled: "L'agent de commande est desactive pour cette organisation.",
    shadow: "L'agent de commande fonctionne en mode d'evaluation non visible.",
    unavailable: "L'agent de commande n'est pas disponible pour ce role.",
    loading: "Creation du brief fonde sur les preuves...",
    empty: "Aucune priorite autorisee n'est due pour ce digest.",
    failed: "Le brief n'a pas pu etre genere en toute securite.",
    limitations: "Limites",
    evidence: "Preuves",
    sources: "sources",
    feedback: "Ce brief est-il utile ?",
    feedbackSaved: "Avis enregistre",
    helpful: "Utile",
    notHelpful: "Peu utile",
    stale: "Obsolete",
    wrong: "Incorrect",
    unsafe: "Dangereux",
    open: "Ouvrir la source",
    replayed: "Recu d'execution existant retourne",
  },
} as const;

export function AgentCommandPanel({
  access,
  digestId,
  periodStart,
  periodEnd,
  locale,
  proposalDraftsEnabled = false,
}: AgentCommandPanelProps) {
  const t = copy[locale];
  const [result, setResult] = useState<CommandAgentRunResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<CommandAgentFeedbackKind | null>(
    null,
  );
  const [feedbackPending, setFeedbackPending] = useState(false);
  const brief = result?.brief ?? null;

  async function generate() {
    setLoading(true);
    setError(null);
    setFeedback(null);
    try {
      const response = await runCommandAgentAction({
        requestId: crypto.randomUUID(),
        digestId,
        periodStart,
        periodEnd,
      });
      if (!response.success) {
        setResult(null);
        setError(response.error || t.failed);
        return;
      }
      setResult(response.data);
      if (
        response.data.receipt.status === "failed" ||
        response.data.receipt.status === "blocked"
      ) {
        setError(response.data.receipt.safeSummary || t.failed);
      }
    } catch {
      setResult(null);
      setError(t.failed);
    } finally {
      setLoading(false);
    }
  }

  async function submitFeedback(kind: CommandAgentFeedbackKind) {
    if (!result?.receipt.runId || feedbackPending) return;
    setFeedbackPending(true);
    try {
      const response = await submitCommandAgentFeedbackAction({
        runId: result.receipt.runId,
        kind,
      });
      if (response.success) setFeedback(kind);
    } finally {
      setFeedbackPending(false);
    }
  }

  return (
    <section
      className={cn(dashboardPanelClass, "p-4 md:p-5")}
      aria-labelledby="command-agent-title"
      data-testid="command-agent-panel"
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Bot
              className="h-5 w-5 text-[var(--dash-brand)]"
              aria-hidden="true"
            />
            <div>
              <h2
                id="command-agent-title"
                className="text-base font-semibold text-[var(--dash-text)]"
              >
                {t.title}
              </h2>
              <p className={cn("text-sm", dashboardMutedTextClass)}>
                {t.subtitle}
              </p>
            </div>
          </div>
          <div
            className={cn(
              dashboardRowClass,
              "mt-3 flex max-w-4xl items-start gap-2 p-3 text-sm",
            )}
          >
            <ShieldCheck
              className="mt-0.5 h-4 w-4 shrink-0 text-[var(--dash-success)]"
              aria-hidden="true"
            />
            <p className="text-[var(--dash-text-soft)]">{t.trust}</p>
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={generate}
          disabled={!access.canRun || !access.canRender || loading}
          className="dashboard-button-primary h-9 shrink-0 rounded-lg"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : result ? (
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Bot className="h-4 w-4" aria-hidden="true" />
          )}
          {result ? t.retry : t.generate}
        </Button>
      </div>

      {!access.canRender ? (
        <UnavailableState access={access} labels={t} />
      ) : null}
      {loading ? (
        <div
          className={cn(
            dashboardRowClass,
            "mt-4 flex items-center gap-2 p-4 text-sm",
          )}
          role="status"
        >
          <Loader2
            className="h-4 w-4 animate-spin text-[var(--dash-brand)]"
            aria-hidden="true"
          />
          <span className="text-[var(--dash-text-soft)]">{t.loading}</span>
        </div>
      ) : null}
      {error ? (
        <div
          className={cn(
            dashboardRowClass,
            "mt-4 flex items-start gap-2 border-[var(--dash-danger)] p-4 text-sm",
          )}
          role="alert"
        >
          <AlertTriangle
            className="mt-0.5 h-4 w-4 shrink-0 text-[var(--dash-danger)]"
            aria-hidden="true"
          />
          <span className="text-[var(--dash-text)]">{error}</span>
        </div>
      ) : null}
      {result?.receipt.status === "running" ? (
        <div
          className={cn(
            dashboardRowClass,
            "mt-4 flex items-center gap-2 p-4 text-sm",
          )}
          role="status"
        >
          <Clock3
            className="h-4 w-4 text-[var(--dash-info)]"
            aria-hidden="true"
          />
          <span className="text-[var(--dash-text-soft)]">
            {result.receipt.safeSummary}
          </span>
        </div>
      ) : null}
      {result && !brief && result.receipt.status === "completed" ? (
        <div
          className={cn(
            dashboardRowClass,
            "mt-4 flex items-center gap-2 p-4 text-sm",
          )}
          role="status"
        >
          <CheckCircle2
            className="h-4 w-4 text-[var(--dash-success)]"
            aria-hidden="true"
          />
          <span className="text-[var(--dash-text-soft)]">
            {t.replayed}: {result.receipt.safeSummary}
          </span>
        </div>
      ) : null}
      {brief ? (
        <div className="mt-4 space-y-4" data-testid="command-agent-brief">
          <div className="flex flex-wrap items-center gap-2">
            <EvidenceGradeBadge grade={brief.evidenceGrade} />
            <span
              className={cn(
                "rounded-md border px-2 py-1 text-xs",
                dashboardToneClass(
                  brief.freshness === "fresh"
                    ? "success"
                    : brief.freshness === "stale"
                      ? "gold"
                      : "info",
                ),
              )}
            >
              {brief.freshness}
            </span>
            <span className="rounded-md border border-[var(--dash-border-subtle)] px-2 py-1 text-xs text-[var(--dash-text-soft)]">
              {brief.evidence.length} {t.sources}
            </span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[var(--dash-text)]">
              {brief.title}
            </h3>
            <p
              className={cn("mt-1 text-sm leading-6", dashboardMutedTextClass)}
            >
              {brief.conclusion}
            </p>
          </div>
          {brief.priorities.length ? (
            <ol className="divide-y divide-[var(--dash-border-subtle)] border-y border-[var(--dash-border-subtle)]">
              {brief.priorities.map((priority, index) => (
                <li
                  key={priority.id}
                  className="grid gap-3 py-3 md:grid-cols-[32px_minmax(0,1fr)_auto] md:items-start"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--dash-border-subtle)] text-xs font-semibold text-[var(--dash-text)]">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-[var(--dash-text)]">
                        {priority.title}
                      </p>
                      <span
                        className={cn(
                          "rounded-md border px-2 py-0.5 text-xs",
                          priority.severity === "critical" ||
                            priority.severity === "high"
                            ? dashboardToneClass("danger")
                            : dashboardToneClass("gold"),
                        )}
                      >
                        {priority.severity}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-[var(--dash-text-soft)]">
                      {priority.detail}
                    </p>
                    <p className="mt-1 text-xs text-[var(--dash-text-soft)]">
                      {priority.evidenceIds.length} {t.evidence.toLowerCase()}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="h-8 rounded-lg border-[var(--dash-border-subtle)] text-[var(--dash-text)]"
                    >
                      <a href={priority.href}>
                        <ExternalLink className="h-4 w-4" aria-hidden="true" />
                        {t.open}
                      </a>
                    </Button>
                    {proposalDraftsEnabled && brief.runId ? (
                      <CopilotProposalControls
                        runId={brief.runId}
                        priority={priority}
                        evidence={brief.evidence}
                        periodStart={brief.provenance.periodStart}
                        periodEnd={brief.provenance.periodEnd}
                        asOf={brief.provenance.asOf}
                        locale={locale}
                      />
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p
              className={cn(
                dashboardRowClass,
                "p-4 text-sm text-[var(--dash-text-soft)]",
              )}
            >
              {t.empty}
            </p>
          )}
          {brief.limitations.length || brief.redactionNotices.length ? (
            <div className={cn(dashboardRowClass, "p-3")}>
              <p className="text-sm font-medium text-[var(--dash-text)]">
                {t.limitations}
              </p>
              <ul className="mt-2 space-y-1 text-sm text-[var(--dash-text-soft)]">
                {[...brief.limitations, ...brief.redactionNotices].map(
                  (item, index) => (
                    <li key={`${item}-${index}`}>{item}</li>
                  ),
                )}
              </ul>
            </div>
          ) : null}
          <div className="flex flex-col gap-3 border-t border-[var(--dash-border-subtle)] pt-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[var(--dash-text-soft)]">
              {feedback ? t.feedbackSaved : t.feedback}
            </p>
            <div className="flex flex-wrap gap-2">
              <FeedbackButton
                icon={ThumbsUp}
                label={t.helpful}
                active={feedback === "helpful"}
                disabled={feedbackPending}
                onClick={() => submitFeedback("helpful")}
              />
              <FeedbackButton
                icon={ThumbsDown}
                label={t.notHelpful}
                active={feedback === "not_helpful"}
                disabled={feedbackPending}
                onClick={() => submitFeedback("not_helpful")}
              />
              <FeedbackButton
                icon={Clock3}
                label={t.stale}
                active={feedback === "stale"}
                disabled={feedbackPending}
                onClick={() => submitFeedback("stale")}
              />
              <FeedbackButton
                icon={AlertTriangle}
                label={t.wrong}
                active={feedback === "wrong"}
                disabled={feedbackPending}
                onClick={() => submitFeedback("wrong")}
              />
              <FeedbackButton
                icon={Ban}
                label={t.unsafe}
                active={feedback === "unsafe"}
                disabled={feedbackPending}
                onClick={() => submitFeedback("unsafe")}
              />
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function UnavailableState({
  access,
  labels,
}: {
  access: CommandAgentSurfaceAccess;
  labels: typeof copy.en | typeof copy.fr;
}) {
  const message =
    access.reason === "shadow"
      ? labels.shadow
      : access.reason === "disabled" || access.reason === "kill_switch"
        ? labels.disabled
        : labels.unavailable;
  return (
    <div
      className={cn(
        dashboardRowClass,
        "mt-4 flex items-start gap-2 p-4 text-sm",
      )}
      role="status"
    >
      <Ban
        className="mt-0.5 h-4 w-4 shrink-0 text-[var(--dash-gold)]"
        aria-hidden="true"
      />
      <span className="text-[var(--dash-text-soft)]">{message}</span>
    </div>
  );
}

function FeedbackButton({
  icon: Icon,
  label,
  active,
  disabled,
  onClick,
}: {
  icon: typeof ThumbsUp;
  label: string;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      size="icon"
      variant={active ? "default" : "outline"}
      disabled={disabled}
      onClick={onClick}
      className="h-8 w-8 rounded-lg border-[var(--dash-border-subtle)]"
      title={label}
      aria-label={label}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </Button>
  );
}
