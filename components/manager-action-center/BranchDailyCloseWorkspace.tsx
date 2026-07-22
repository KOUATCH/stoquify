import Link from "next/link"
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CircleDashed,
  Clock3,
  FileCheck2,
  LockKeyhole,
  MapPin,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from "lucide-react"
import { BranchDailyCloseReviewCommand } from "@/components/manager-action-center/BranchDailyCloseReviewCommand"
import { BranchDailyCloseSignOffCommand } from "@/components/manager-action-center/BranchDailyCloseSignOffCommand"

import {
  dashboardMutedTextClass,
  dashboardPanelClass,
  dashboardRowClass,
  dashboardToneClass,
} from "@/components/finance/finance-dashboard-theme"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type {
  BranchDailyCloseCompletionResult,
  BranchDailyCloseCompletionState,
} from "@/services/end-of-day-close/branch-daily-close-completion-contracts"
import type { EndOfDayCloseReadinessState } from "@/services/end-of-day-close/end-of-day-close-readiness-contracts"
import { cn } from "@/lib/utils"

type Locale = "en" | "fr"

export type BranchDailyCloseWorkspaceModel =
  | { kind: "ACCESS_DENIED" }
  | { kind: "SELECT_LOCATION" }
  | { kind: "SELECT_DATE"; locationId: string }
  | { kind: "INVALID_DATE"; locationId: string; businessDate: string }
  | {
      kind: "ERROR"
      errorKind: "ACCESS_OR_SCOPE" | "UNAVAILABLE"
      locationId: string
      businessDate: string
      message: string
    }
  | {
      kind: "READY"
      data: BranchDailyCloseCompletionResult
      canStartReview: boolean
      canSign: boolean
    }

type BranchDailyCloseWorkspaceProps = {
  locale: Locale
  model: BranchDailyCloseWorkspaceModel
  workspaceHref: string
  backHref: string
}

const copy = {
  en: {
    title: "Branch daily close",
    subtitle: "Versioned branch evidence for one explicitly selected business date.",
    readOnly: "Read-only",
    branchScoped: "Branch-scoped",
    evidenceBacked: "Evidence-backed",
    back: "Manager Action Center",
    selectLocationTitle: "Select a managed location",
    selectLocationDetail: "Open daily close from an authorized location in the Manager Action Center.",
    accessTitle: "Daily close is not available for this role",
    accessDetail: "Dashboard permission is required. No branch or close evidence has been shown.",
    selectDateTitle: "Select a business date",
    selectDateDetail: "No date is inferred from the browser or server timezone.",
    invalidDateTitle: "Enter a valid business date",
    invalidDateDetail: "Use a real calendar date in YYYY-MM-DD format.",
    accessErrorTitle: "Permission or operating scope is unavailable",
    accessErrorDetail: "No branch evidence is shown because access or managed-location scope could not be verified.",
    unavailableTitle: "Daily-close evidence is unavailable",
    unavailableDetail: "The evidence service failed safely. No replacement close state has been invented.",
    businessDate: "Business date",
    load: "Load close evidence",
    status: "Completion state",
    alignment: "Evidence alignment",
    readiness: "Readiness",
    contractVersion: "Contract version",
    generatedAt: "Generated",
    location: "Authorized location",
    coverage: "Evidence coverage",
    supported: "Supported checks",
    unsupported: "Unsupported checks",
    complete: "Coverage complete",
    checklist: "Close evidence checklist",
    blockers: "Readiness blockers",
    noBlockers: "No readiness blocker is reported for this branch and date.",
    nextAction: "Next safe action",
    signEvidence: "Sign-off evidence",
    activeSignOff: "Active sign-off",
    signedAt: "Signed at",
    signedBy: "Signed by",
    noSignOff: "No active sign-off evidence is present.",
    controlClaims: "Control claims",
    notClaimed: "Not claimed",
    paymentReconciliation: "Payment reconciliation",
    readinessPromotion: "Readiness promotion",
    finalClose: "Final accounting close",
    source: "Source",
    observed: "Observed",
    unavailable: "Unavailable",
    yes: "Yes",
    no: "No",
    stateNotice: {
      NOT_STARTED: "No durable review has started for this branch and date.",
      BLOCKED: "The review is blocked by current readiness evidence.",
      AWAITING_SIGN_OFF: "A review exists and is awaiting a separate authorized sign-off.",
      SIGNED: "An active sign-off is present and the signed evidence remains current.",
      EVIDENCE_DRIFTED: "The current readiness evidence differs from the signed review evidence.",
    },
  },
  fr: {
    title: "Cloture quotidienne du site",
    subtitle: "Preuves versionnees du site pour une date d'activite choisie explicitement.",
    readOnly: "Lecture seule",
    branchScoped: "Limite au site",
    evidenceBacked: "Fonde sur les preuves",
    back: "Centre d'actions manager",
    selectLocationTitle: "Selectionnez un site gere",
    selectLocationDetail: "Ouvrez la cloture depuis un site autorise dans le centre d'actions manager.",
    accessTitle: "La cloture quotidienne n'est pas disponible pour ce role",
    accessDetail: "La permission du tableau de bord est requise. Aucune preuve de site ou de cloture n'est affichee.",
    selectDateTitle: "Selectionnez une date d'activite",
    selectDateDetail: "Aucune date n'est deduite du fuseau du navigateur ou du serveur.",
    invalidDateTitle: "Saisissez une date d'activite valide",
    invalidDateDetail: "Utilisez une date civile reelle au format AAAA-MM-JJ.",
    accessErrorTitle: "La permission ou le perimetre operationnel est indisponible",
    accessErrorDetail: "Aucune preuve de site n'est affichee car l'acces ou le perimetre gere n'a pas pu etre verifie.",
    unavailableTitle: "Les preuves de cloture sont indisponibles",
    unavailableDetail: "Le service de preuves a echoue en securite. Aucun etat de cloture de remplacement n'a ete invente.",
    businessDate: "Date d'activite",
    load: "Charger les preuves de cloture",
    status: "Etat de realisation",
    alignment: "Alignement des preuves",
    readiness: "Preparation",
    contractVersion: "Version du contrat",
    generatedAt: "Genere",
    location: "Site autorise",
    coverage: "Couverture des preuves",
    supported: "Controles pris en charge",
    unsupported: "Controles non pris en charge",
    complete: "Couverture complete",
    checklist: "Liste des preuves de cloture",
    blockers: "Blocages de preparation",
    noBlockers: "Aucun blocage de preparation n'est signale pour ce site et cette date.",
    nextAction: "Prochaine action sure",
    signEvidence: "Preuve de validation",
    activeSignOff: "Validation active",
    signedAt: "Valide le",
    signedBy: "Valide par",
    noSignOff: "Aucune preuve de validation active n'est presente.",
    controlClaims: "Declarations de controle",
    notClaimed: "Non revendique",
    paymentReconciliation: "Rapprochement des paiements",
    readinessPromotion: "Promotion de la preparation",
    finalClose: "Cloture comptable finale",
    source: "Source",
    observed: "Observe",
    unavailable: "Indisponible",
    yes: "Oui",
    no: "Non",
    stateNotice: {
      NOT_STARTED: "Aucune revue durable n'a commence pour ce site et cette date.",
      BLOCKED: "La revue est bloquee par les preuves de preparation actuelles.",
      AWAITING_SIGN_OFF: "Une revue existe et attend une validation autorisee distincte.",
      SIGNED: "Une validation active existe et les preuves validees restent actuelles.",
      EVIDENCE_DRIFTED: "Les preuves de preparation actuelles different des preuves validees.",
    },
  },
} as const

const stateLabels: Record<Locale, Record<BranchDailyCloseCompletionState, string>> = {
  en: {
    NOT_STARTED: "Not started",
    BLOCKED: "Blocked",
    AWAITING_SIGN_OFF: "Awaiting sign-off",
    SIGNED: "Signed",
    EVIDENCE_DRIFTED: "Evidence drifted",
  },
  fr: {
    NOT_STARTED: "Non commence",
    BLOCKED: "Bloque",
    AWAITING_SIGN_OFF: "En attente de validation",
    SIGNED: "Valide",
    EVIDENCE_DRIFTED: "Preuves modifiees",
  },
}

const readinessLabels: Record<Locale, Record<EndOfDayCloseReadinessState, string>> = {
  en: {
    READY_FOR_REVIEW: "Ready for review",
    ACTION_REQUIRED: "Action required",
    NO_ACTIVITY: "No activity",
    UNAVAILABLE: "Unavailable",
  },
  fr: {
    READY_FOR_REVIEW: "Pret pour revue",
    ACTION_REQUIRED: "Action requise",
    NO_ACTIVITY: "Aucune activite",
    UNAVAILABLE: "Indisponible",
  },
}

export function BranchDailyCloseWorkspace({
  locale,
  model,
  workspaceHref,
  backHref,
}: BranchDailyCloseWorkspaceProps) {
  const t = copy[locale]
  const formatterLocale = locale === "fr" ? "fr-FR" : "en-US"
  const formState = getFormState(model)

  return (
    <main className="dashboard-landing-theme dark min-h-screen bg-[var(--dash-canvas)]">
      <div className="dashboard-landing-content mx-auto w-full max-w-[1920px] space-y-5 px-4 py-4 text-[var(--dash-text)] md:px-6 lg:px-8">
        <section className={cn(dashboardPanelClass, "p-4 md:p-5")}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 max-w-4xl">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={cn("border", dashboardToneClass("success"))}>{t.readOnly}</Badge>
                <Badge className={cn("border", dashboardToneClass("brand"))}>{t.branchScoped}</Badge>
                <Badge className={cn("border", dashboardToneClass("gold"))}>{t.evidenceBacked}</Badge>
              </div>
              <h1 className="mt-3 text-2xl font-semibold tracking-normal text-[var(--dash-text)] md:text-3xl">{t.title}</h1>
              <p className={cn("mt-2 text-sm leading-6", dashboardMutedTextClass)}>{t.subtitle}</p>
            </div>
            <Button asChild size="sm" variant="outline" className="w-fit rounded-lg border-[var(--dash-border-subtle)] text-[var(--dash-text)]">
              <Link href={backHref}>
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                {t.back}
              </Link>
            </Button>
          </div>
        </section>

        {formState ? (
          <section className={cn(dashboardPanelClass, "p-4 md:p-5")} aria-labelledby="daily-close-date-heading">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-[var(--dash-brand)]" aria-hidden="true" />
              <h2 id="daily-close-date-heading" className="text-base font-semibold text-[var(--dash-text)]">{t.selectDateTitle}</h2>
            </div>
            <p className={cn("mt-1 text-sm", dashboardMutedTextClass)}>{t.selectDateDetail}</p>
            <form method="get" action={workspaceHref} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
              <input type="hidden" name="locationId" value={formState.locationId} />
              <div className="w-full max-w-sm">
                <label htmlFor="businessDate" className="mb-1.5 block text-sm font-medium text-[var(--dash-text)]">{t.businessDate}</label>
                <input
                  id="businessDate"
                  name="businessDate"
                  type="date"
                  required
                  defaultValue={formState.businessDate}
                  className="h-10 w-full rounded-md border border-[var(--dash-border-subtle)] bg-[rgba(9,22,27,0.72)] px-3 text-sm text-[var(--dash-text)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--dash-brand)]"
                />
              </div>
              <Button type="submit" className="w-fit rounded-lg">
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                {t.load}
              </Button>
            </form>
          </section>
        ) : null}

        {model.kind === "ACCESS_DENIED" ? (
          <SafeState title={t.accessTitle} detail={t.accessDetail} tone="danger" />
        ) : model.kind === "SELECT_LOCATION" ? (
          <SafeState title={t.selectLocationTitle} detail={t.selectLocationDetail} tone="info" />
        ) : model.kind === "SELECT_DATE" ? (
          <SafeState title={t.selectDateTitle} detail={t.selectDateDetail} tone="info" />
        ) : model.kind === "INVALID_DATE" ? (
          <SafeState title={t.invalidDateTitle} detail={t.invalidDateDetail} tone="gold" />
        ) : model.kind === "ERROR" ? (
          <SafeState
            title={model.errorKind === "ACCESS_OR_SCOPE" ? t.accessErrorTitle : t.unavailableTitle}
            detail={model.errorKind === "ACCESS_OR_SCOPE" ? t.accessErrorDetail : t.unavailableDetail}
            tone="danger"
            error={model.message}
          />
        ) : (
          <CompletionView
            data={model.data}
            canStartReview={model.canStartReview}
            canSign={model.canSign}
            locale={locale}
            formatterLocale={formatterLocale}
          />
        )}
      </div>
    </main>
  )
}

function CompletionView({
  data,
  canStartReview,
  canSign,
  locale,
  formatterLocale,
}: {
  data: BranchDailyCloseCompletionResult
  canStartReview: boolean
  canSign: boolean
  locale: Locale
  formatterLocale: string
}) {
  const t = copy[locale]
  const readiness = data.preSignReadiness
  const stateTone = completionTone(data.state)

  return (
    <div className="space-y-5" data-close-state={data.state}>
      <section className={cn(dashboardPanelClass, "p-4 md:p-5")} aria-labelledby="daily-close-location">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={cn("border", dashboardToneClass(stateTone))}>{stateLabels[locale][data.state]}</Badge>
              <Badge variant="outline" className="border-[var(--dash-border-subtle)] text-[var(--dash-text-soft)]">v{data.contractVersion}</Badge>
            </div>
            <div className="mt-3 flex min-w-0 items-start gap-3">
              <MapPin className="mt-1 h-5 w-5 shrink-0 text-[var(--dash-brand)]" aria-hidden="true" />
              <div className="min-w-0">
                <h2 id="daily-close-location" className="break-words text-xl font-semibold text-[var(--dash-text)]">{data.location.name}</h2>
                <p className={cn("mt-1 break-words text-sm", dashboardMutedTextClass)}>{data.location.code} / {data.location.id}</p>
              </div>
            </div>
          </div>
          <dl className={cn(dashboardRowClass, "grid min-w-0 gap-2 p-3 text-xs lg:min-w-[360px]")}>
            <DetailLine label={t.businessDate}>{data.businessDate}</DetailLine>
            <DetailLine label={t.generatedAt}>{formatDateTime(data.generatedAt, formatterLocale)}</DetailLine>
            <DetailLine label={t.contractVersion}>{data.contractVersion}</DetailLine>
          </dl>
        </div>
      </section>

      <section className={cn("rounded-lg border p-4", dashboardToneClass(stateTone))} aria-live="polite">
        <div className="flex items-start gap-3">
          {completionIcon(data.state)}
          <div className="min-w-0">
            <h2 className="break-words text-sm font-semibold">{stateLabels[locale][data.state]}</h2>
            <p className="mt-1 break-words text-sm leading-6">{t.stateNotice[data.state]}</p>
          </div>
        </div>
      </section>

      {canStartReview && data.state === "NOT_STARTED" ? (
        <BranchDailyCloseReviewCommand
          locale={locale}
          locationId={data.location.id}
          locationName={data.location.name}
          businessDate={data.businessDate}
        />
      ) : null}

      {canSign && data.state === "AWAITING_SIGN_OFF" ? (
        <BranchDailyCloseSignOffCommand
          locale={locale}
          locationId={data.location.id}
          locationName={data.location.name}
          businessDate={data.businessDate}
        />
      ) : null}

      <section className="grid gap-4 lg:grid-cols-2" aria-label={t.status}>
        <div className={cn(dashboardPanelClass, "p-4")}>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[var(--dash-success)]" aria-hidden="true" />
            <h2 className="text-base font-semibold text-[var(--dash-text)]">{t.status}</h2>
          </div>
          <dl className="mt-4 grid gap-3 text-sm">
            <DetailLine label={t.status}>{stateLabels[locale][data.state]}</DetailLine>
            <DetailLine label={t.alignment}>{data.alignment.state}</DetailLine>
            <DetailLine label={t.readiness}>{readinessLabels[locale][readiness.readiness]}</DetailLine>
            <DetailLine label={t.location}>{data.location.name}</DetailLine>
          </dl>
        </div>

        <div className={cn(dashboardPanelClass, "p-4")}>
          <div className="flex items-center gap-2">
            <FileCheck2 className="h-4 w-4 text-[var(--dash-info)]" aria-hidden="true" />
            <h2 className="text-base font-semibold text-[var(--dash-text)]">{t.coverage}</h2>
          </div>
          <dl className="mt-4 grid gap-3 text-sm">
            <DetailLine label={t.coverage}>{readiness.evidenceCoverage.state}</DetailLine>
            <DetailLine label={t.supported}>{readiness.evidenceCoverage.supportedItemCount}</DetailLine>
            <DetailLine label={t.unsupported}>{readiness.evidenceCoverage.unsupportedItemCount}</DetailLine>
            <DetailLine label={t.complete}>{readiness.evidenceCoverage.complete ? t.yes : t.no}</DetailLine>
          </dl>
        </div>
      </section>

      <section aria-labelledby="daily-close-checklist">
        <SectionHeading id="daily-close-checklist" icon={<FileCheck2 className="h-4 w-4" />} title={t.checklist} />
        <div className="mt-3 grid gap-3 xl:grid-cols-2">
          {readiness.checklist.map((item) => (
            <article key={item.key} className={cn(dashboardRowClass, "min-w-0 p-4")}>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={cn("border", dashboardToneClass(checklistTone(item.status)))}>{item.status}</Badge>
                <Badge variant="outline" className="border-[var(--dash-border-subtle)] text-[var(--dash-text-soft)]">{item.evidence.evidenceGrade}</Badge>
              </div>
              <h3 className="mt-3 break-words text-sm font-semibold text-[var(--dash-text)]">{item.title}</h3>
              <p className={cn("mt-1 break-words text-sm leading-6", dashboardMutedTextClass)}>{item.detail}</p>
              <dl className="mt-3 grid gap-2 text-xs">
                <DetailLine label={t.source}>{item.evidence.sourceType}</DetailLine>
                <DetailLine label={t.observed}>{item.evidence.observedAt ? formatDateTime(item.evidence.observedAt, formatterLocale) : t.unavailable}</DetailLine>
              </dl>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="daily-close-blockers">
        <SectionHeading id="daily-close-blockers" icon={<AlertTriangle className="h-4 w-4" />} title={t.blockers} />
        {readiness.blockers.length ? (
          <div className="mt-3 grid gap-3 xl:grid-cols-2">
            {readiness.blockers.map((blocker) => (
              <article key={`${blocker.gate}:${blocker.code}`} className={cn(dashboardRowClass, "min-w-0 p-4")}>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={cn("border", dashboardToneClass(blocker.severity === "critical" ? "danger" : "gold"))}>{blocker.severity}</Badge>
                  <Badge variant="outline" className="border-[var(--dash-border-subtle)] text-[var(--dash-text-soft)]">{blocker.gate}</Badge>
                </div>
                <h3 className="mt-3 break-words text-sm font-semibold text-[var(--dash-text)]">{blocker.title}</h3>
                <p className={cn("mt-1 break-words text-sm leading-6", dashboardMutedTextClass)}>{blocker.detail}</p>
                {blocker.nextAction ? <p className="mt-3 break-words text-xs text-[var(--dash-text-soft)]"><span className="font-semibold text-[var(--dash-text)]">{t.nextAction}: </span>{blocker.nextAction}</p> : null}
              </article>
            ))}
          </div>
        ) : (
          <div className={cn(dashboardRowClass, "mt-3 flex min-h-16 items-center gap-3 p-4 text-sm text-[var(--dash-text-soft)]")}>
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--dash-success)]" aria-hidden="true" />
            <p>{t.noBlockers}</p>
          </div>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className={cn(dashboardPanelClass, "p-4")} aria-labelledby="daily-close-sign-evidence">
          <SectionHeading id="daily-close-sign-evidence" icon={<LockKeyhole className="h-4 w-4" />} title={t.signEvidence} />
          {data.completion.activeSignOffPresent ? (
            <dl className="mt-4 grid gap-3 text-sm">
              <DetailLine label={t.activeSignOff}>{t.yes}</DetailLine>
              <DetailLine label={t.signedAt}>{data.completion.signedOffAt ? formatDateTime(data.completion.signedOffAt, formatterLocale) : t.unavailable}</DetailLine>
              <DetailLine label={t.signedBy}>{data.completion.signedOffBy ?? t.unavailable}</DetailLine>
            </dl>
          ) : (
            <p className={cn("mt-4 text-sm leading-6", dashboardMutedTextClass)}>{t.noSignOff}</p>
          )}
        </div>

        <div className={cn(dashboardPanelClass, "p-4")} aria-labelledby="daily-close-control-claims">
          <SectionHeading id="daily-close-control-claims" icon={<ShieldCheck className="h-4 w-4" />} title={t.controlClaims} />
          <dl className="mt-4 grid gap-3 text-sm">
            <ClaimLine label={t.paymentReconciliation} claimed={data.controls.paymentReconciliationClaimed} notClaimed={t.notClaimed} />
            <ClaimLine label={t.readinessPromotion} claimed={data.controls.readinessPromoted} notClaimed={t.notClaimed} />
            <ClaimLine label={t.finalClose} claimed={data.controls.finalCloseClaimed} notClaimed={t.notClaimed} />
          </dl>
        </div>
      </section>
    </div>
  )
}

function SafeState({ title, detail, tone, error }: { title: string; detail: string; tone: "danger" | "gold" | "info"; error?: string }) {
  return (
    <section className={cn(dashboardPanelClass, "p-6 text-center")} aria-live="polite">
      <AlertTriangle className={cn("mx-auto h-6 w-6", tone === "danger" ? "text-[var(--dash-danger)]" : tone === "gold" ? "text-[var(--dash-gold)]" : "text-[var(--dash-info)]")} aria-hidden="true" />
      <h2 className="mt-3 text-base font-semibold text-[var(--dash-text)]">{title}</h2>
      <p className={cn("mx-auto mt-2 max-w-2xl text-sm leading-6", dashboardMutedTextClass)}>{detail}</p>
      {error ? <p className="mx-auto mt-2 max-w-2xl break-words text-xs text-[var(--dash-text-faint)]">{error}</p> : null}
    </section>
  )
}

function SectionHeading({ id, icon, title }: { id: string; icon: React.ReactNode; title: string }) {
  return <div className="flex items-center gap-2"><span className="text-[var(--dash-brand)]" aria-hidden="true">{icon}</span><h2 id={id} className="text-base font-semibold text-[var(--dash-text)]">{title}</h2></div>
}

function DetailLine({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="grid min-w-0 grid-cols-1 gap-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] sm:items-start sm:gap-3"><dt className="break-words text-[var(--dash-text-soft)]">{label}</dt><dd className="min-w-0 break-words font-medium text-[var(--dash-text)] sm:text-right">{children}</dd></div>
}

function ClaimLine({ label, claimed, notClaimed }: { label: string; claimed: false; notClaimed: string }) {
  return <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3"><dt className="break-words text-[var(--dash-text-soft)]">{label}</dt><dd><Badge variant="outline" className={cn("border", dashboardToneClass(claimed ? "success" : "gold"))}>{claimed ? "Claimed" : notClaimed}</Badge></dd></div>
}

function getFormState(model: BranchDailyCloseWorkspaceModel) {
  if (model.kind === "SELECT_DATE") return { locationId: model.locationId, businessDate: "" }
  if (model.kind === "INVALID_DATE" || model.kind === "ERROR") return { locationId: model.locationId, businessDate: model.businessDate }
  if (model.kind === "READY") return { locationId: model.data.location.id, businessDate: model.data.businessDate }
  return null
}

function completionTone(state: BranchDailyCloseCompletionState) {
  if (state === "SIGNED") return "success" as const
  if (state === "BLOCKED" || state === "EVIDENCE_DRIFTED") return "danger" as const
  if (state === "AWAITING_SIGN_OFF") return "gold" as const
  return "info" as const
}

function completionIcon(state: BranchDailyCloseCompletionState) {
  const className = "mt-0.5 h-5 w-5 shrink-0"
  if (state === "SIGNED") return <CheckCircle2 className={className} aria-hidden="true" />
  if (state === "BLOCKED" || state === "EVIDENCE_DRIFTED") return <XCircle className={className} aria-hidden="true" />
  if (state === "AWAITING_SIGN_OFF") return <Clock3 className={className} aria-hidden="true" />
  return <CircleDashed className={className} aria-hidden="true" />
}

function checklistTone(status: string) {
  if (status === "READY" || status === "NO_ACTIVITY") return "success" as const
  if (status === "ACTION_REQUIRED" || status === "STALE" || status === "UNSUPPORTED") return "gold" as const
  if (status === "BLOCKED" || status === "UNAVAILABLE") return "danger" as const
  return "info" as const
}

function formatDateTime(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
}
