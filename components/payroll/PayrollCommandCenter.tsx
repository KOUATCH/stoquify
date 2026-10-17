"use client"


import { payrollUiText, payrollStatusText } from "./payroll-ui-copy"

import Link from "next/link"
import { useMemo, useState, useTransition } from "react"
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Eye,
  EyeOff,
  FileText,
  Landmark,
  Loader2,
  LockKeyhole,
  ReceiptText,
  ShieldCheck,
  UsersRound,
} from "lucide-react"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { localizePath } from "@/i18n/routing"
import type { PayrollCommandReadModel } from "@/actions/payroll/payroll-command-read-model.actions"
import {
  approvePayrollCountryPackReviewIntakeAction,
  evaluatePayrollCountryPackReviewIntakeAction,
  recordPayrollCountryPackReviewIntakeAction,
  type PayrollCountryPackReviewIntakeApproval,
  type PayrollCountryPackReviewIntakeCertificate,
  type PayrollCountryPackReviewIntakeRecordedCertificate,
} from "@/actions/payroll/payroll-country-pack-review-intake.actions"
import type { Locale } from "@/types/bilingual"
import PayrollPilotCertificationPanel from "./PayrollPilotCertificationPanel"

type Props = {
  data: PayrollCommandReadModel | null
  error?: string | null
  locale: Locale
}

type ProofRow = {
  label: string
  value: string | number | boolean | null
}

type ProofSubject = {
  id: string
  label: string
  status: string
  source: string
  href?: string
  rows: ProofRow[]
}

type ReviewTopicEvidenceRow = {
  topic: string
  legalRef: string
  sourceEvidenceHash: string
  reviewedBy: string
  reviewedOn: string
}

type CountryPackReviewNotice =
  | { kind: "success"; title: string; detail: string; blockers?: string[] }
  | { kind: "error" | "fresh-auth"; title: string; detail: string; correlationId?: string }

type CountryPackReviewActionFailure = {
  success: false
  error?: string | null
  code?: string
  correlationId?: string
}

const countryPackTargetFamilies = [
  { value: "IRPP_PERIOD", label: "IRPP period" },
  { value: "IRPP_YTD", label: "IRPP YTD" },
  { value: "IRPP_ADJUSTMENTS", label: "IRPP adjustments" },
  { value: "IRPP_CORRECTIONS", label: "IRPP corrections" },
  { value: "CNPS_PENSION", label: "CNPS pension" },
  { value: "CNPS_FAMILY_ALLOWANCE", label: "Family allowance" },
  { value: "CNPS_OCCUPATIONAL_RISK", label: "Occupational risk" },
  { value: "ALLOWANCES_BENEFITS", label: "Benefits" },
  { value: "LEAVE_OVERTIME", label: "Leave and overtime" },
] as const

const countryPackReviewTopics = [
  "taxableSalaryBase",
  "bracketsAndRates",
  "deductibleEmployeeContributions",
  "familyQuotientOrDependentTreatment",
  "monthlyAndAnnualRegularization",
  "withholdingRounding",
] as const

function dateLabel(value: string | null | undefined, locale: Locale = "en") {
  if (!value) return payrollUiText("Pending", locale)
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(value))
}

function dateTimeLabel(value: string | null | undefined, locale: Locale = "en") {
  if (!value) return payrollUiText("Pending", locale)
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
}

function money(amount: string, currency: string) {
  return amount.includes("[REDACTED") ? amount : `${amount} ${currency}`
}

function displayValue(value: string | number | boolean | null | undefined, locale: Locale = "en") {
  if (value === true) return payrollUiText("Yes", locale)
  if (value === false) return payrollUiText("No", locale)
  if (value === null || value === undefined || value === "") return payrollUiText("Pending", locale)
  return String(value)
}

function fieldClass() {
  return "mt-1 min-h-10 w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none ring-teal-300/0 transition focus:border-teal-300/50 focus:ring-2 focus:ring-teal-300/20 disabled:opacity-60"
}

function textareaClass() {
  return "mt-1 min-h-28 w-full resize-y rounded-md border border-white/10 bg-black/20 px-3 py-2 font-mono text-xs text-white outline-none ring-teal-300/0 transition focus:border-teal-300/50 focus:ring-2 focus:ring-teal-300/20 disabled:opacity-60"
}

function defaultReviewEvidenceRows(): ReviewTopicEvidenceRow[] {
  return countryPackReviewTopics.map((topic) => ({
    topic,
    legalRef: "",
    sourceEvidenceHash: "",
    reviewedBy: "",
    reviewedOn: "",
  }))
}

function defaultTargetFamilies(data: PayrollCommandReadModel) {
  const existing = data.evidence.finalRelease.countryPackReviewIntake?.targetFamilies ?? []
  return existing.length ? existing : ["IRPP_PERIOD"]
}

function countryPackReviewErrorNotice(result: CountryPackReviewActionFailure): CountryPackReviewNotice {
  return {
    kind: result.code === "FRESH_AUTH_REQUIRED" ? "fresh-auth" : "error",
    title: result.code ?? "PAYROLL_COUNTRY_PACK_REVIEW_INTAKE_FAILED",
    detail: result.error || "Country-pack review intake action could not be completed.",
    correlationId: result.correlationId,
  }
}

function certificateNotice(
  title: string,
  certificate: PayrollCountryPackReviewIntakeCertificate | PayrollCountryPackReviewIntakeRecordedCertificate,
): CountryPackReviewNotice {
  return {
    kind: "success",
    title,
    detail: `${certificate.certificateHash}; blockers ${certificate.blockers.length}`,
    blockers: certificate.blockers.map((blocker) => blocker.code),
  }
}

function approvalNotice(approval: PayrollCountryPackReviewIntakeApproval): CountryPackReviewNotice {
  return {
    kind: "success",
    title: approval.status,
    detail: `${approval.approvalHash}; audit ${approval.persistence.auditLogId}`,
  }
}

function pilotStatusLabel(value: string, locale: Locale = "en") {
  if (value === "CERTIFIED_FOR_PRODUCTION_RELEASE_REVIEW") return payrollUiText("Certified", locale)
  if (value === "READY_FOR_SIGNOFF") return payrollUiText("Signoff", locale)
  if (value === "BLOCKED") return payrollUiText("Blocked", locale)
  return payrollUiText("Not evaluated", locale)
}

function stateTone(value: string | null | undefined) {
  const normalized = (value ?? "").toUpperCase()
  if (["READY", "POSTED", "PAID", "SETTLED", "ACCEPTED", "RELEASED", "RECONCILED", "FRESH", "CERTIFIED", "CERTIFIED_FOR_PRODUCTION_RELEASE_REVIEW", "READY_FOR_FULL_PRODUCTION_APPROVAL", "PASS", "MATCHED"].includes(normalized)) {
    return "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
  }
  if (["BLOCKED", "FAILED", "REJECTED", "CANCELLED", "CRITICAL", "STALE", "REDACT"].includes(normalized)) {
    return "border-rose-400/30 bg-rose-400/10 text-rose-100"
  }
  if (["ACTION_REQUIRED", "PREPARED", "CALCULATED", "REVIEWED", "DRAFT", "UNKNOWN", "MASK", "READY_FOR_SIGNOFF", "NOT_EVALUATED", "NOT_READY", "MISSING"].includes(normalized)) {
    return "border-amber-400/30 bg-amber-400/10 text-amber-100"
  }
  return "border-white/12 bg-white/8 text-slate-200"
}

function Badge({ locale = "en", value }: { value: string | null | undefined } & { locale?: Locale }) {
  return (
    <span className={`inline-flex min-h-7 max-w-full items-center rounded-md border px-2.5 py-1 text-xs font-semibold ${stateTone(value)}`}>
      <span className="truncate">{payrollStatusText(value, locale)}</span>
    </span>
  )
}

function Metric({ label, value, tone, icon: Icon }: { label: string; value: number | string; tone: string; icon: typeof UsersRound }) {
  return (
    <div className="min-h-[104px] rounded-lg border border-white/10 bg-white/[0.06] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.18)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-normal text-slate-400">{label}</p>
          <p className="mt-2 break-words text-2xl font-bold text-white">{value}</p>
        </div>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tone}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
    </div>
  )
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.05] p-5 text-slate-200">
      <h2 className="text-base font-semibold text-white">{title}</h2>
      <p className="mt-1 text-sm text-slate-400">{body}</p>
    </div>
  )
}

function buildProofSubjects(data: PayrollCommandReadModel, locale: Locale): ProofSubject[] {
  const subjects: ProofSubject[] = []

  if (data.currentPeriod) {
    subjects.push({
      id: "current-period",
      label: data.currentPeriod.name,
      status: data.currentPeriod.status,
      source: "payroll.period",
      rows: [
        { label: payrollUiText("Period start", locale), value: data.currentPeriod.periodStart },
        { label: payrollUiText("Period end", locale), value: data.currentPeriod.periodEnd },
        { label: payrollUiText("Pay date", locale), value: data.currentPeriod.payDate },
        { label: payrollUiText("Country pack", locale), value: data.currentPeriod.countryPackVersion },
        { label: payrollUiText("Country pack hash", locale), value: data.currentPeriod.countryPackResolutionHash },
        { label: "Capability", value: data.currentPeriod.countryPackCapabilityStatus },
        { label: "Accounting period", value: data.currentPeriod.accountingPeriodId },
      ],
    })
  }

  if (data.evidence.latestRun) {
    subjects.push({
      id: "latest-run",
      label: data.evidence.latestRun.runNumber,
      status: data.evidence.latestRun.status,
      source: "payroll.run",
      rows: [
        { label: payrollUiText("Document hash", locale), value: data.evidence.latestRun.documentHash },
        { label: payrollUiText("Evidence hash", locale), value: data.evidence.latestRun.evidenceHash },
        { label: "Calculation hash", value: data.evidence.latestRun.calculationHash },
        { label: "Attendance hash", value: data.evidence.latestRun.attendanceSnapshotHash },
        { label: payrollUiText("Country pack hash", locale), value: data.evidence.latestRun.countryPackResolutionHash },
        { label: payrollUiText("Ledger batch", locale), value: data.evidence.latestRun.ledgerPostingBatchId },
        { label: payrollUiText("Posted event", locale), value: data.evidence.latestRun.postedBusinessEventId },
        { label: "Run version", value: String(data.evidence.latestRun.lifecycle.version) },
        { label: "Transition proof", value: data.evidence.latestRun.lifecycle.transitionEvidence },
        { label: "Trust Spine writes", value: data.evidence.latestRun.lifecycle.writeEnabled ? "Enabled" : "Disabled" },
        ...data.evidence.latestRun.lifecycle.stages.flatMap((stage) => [
          { label: stage.stage + " event", value: stage.businessEventId },
          { label: stage.stage + " at", value: stage.transitionedAt },
          { label: stage.stage + " evidence", value: stage.evidenceStatus },
          { label: stage.stage + " actor", value: stage.actorPresent ? "Present" : null },
        ]),
      ],
    })
  }

  if (data.evidence.latestPaymentBatch) {
    subjects.push({
      id: "latest-payment-batch",
      label: data.evidence.latestPaymentBatch.batchNumber,
      status: data.evidence.latestPaymentBatch.status,
      source: "payroll.payment_batch",
      href: localizePath("/dashboard/finance/payments", locale),
      rows: [
        { label: payrollUiText("Document hash", locale), value: data.evidence.latestPaymentBatch.documentHash },
        { label: payrollUiText("Evidence hash", locale), value: data.evidence.latestPaymentBatch.evidenceHash },
        { label: "Bank file hash", value: data.evidence.latestPaymentBatch.bankFileHash },
        { label: payrollUiText("Ledger batch", locale), value: data.evidence.latestPaymentBatch.ledgerPostingBatchId },
        { label: payrollUiText("Posted event", locale), value: data.evidence.latestPaymentBatch.postedBusinessEventId },
        { label: payrollUiText("Reconciliation", locale), value: data.evidence.latestPaymentBatch.reconciliationStatus },
      ],
    })
  }

  if (data.evidence.latestDeclaration) {
    subjects.push({
      id: "latest-declaration",
      label: `${data.evidence.latestDeclaration.authority} ${data.evidence.latestDeclaration.declarationType}`,
      status: data.evidence.latestDeclaration.status,
      source: "payroll.declaration",
      href: localizePath("/dashboard/payroll/declarations", locale),
      rows: [
        { label: payrollUiText("Payload hash", locale), value: data.evidence.latestDeclaration.payloadHash },
        { label: payrollUiText("Country pack hash", locale), value: data.evidence.latestDeclaration.countryPackResolutionHash },
        { label: "Country-pack register proof", value: data.evidence.latestDeclaration.countryPackRegisterProofHash },
        { label: "Country-pack proof status", value: data.evidence.latestDeclaration.countryPackRegisterProofStatus },
        { label: "Country-pack proof present", value: data.evidence.latestDeclaration.countryPackRegisterProofPresent },
        { label: "Country-pack proof lines", value: data.evidence.latestDeclaration.countryPackRegisterProofLineCount },
        { label: "Missing country-pack lines", value: data.evidence.latestDeclaration.countryPackRegisterProofMissingLineCount },
        { label: "Mismatched country-pack lines", value: data.evidence.latestDeclaration.countryPackRegisterProofMismatchedLineCount },
        { label: "Line proof hashes", value: data.evidence.latestDeclaration.countryPackLineProofHashes.join(", ") || null },
        { label: "Statutory coverage hash", value: data.evidence.latestDeclaration.statutoryScenarioCoverageHash },
        { label: "Review evidence hashes", value: data.evidence.latestDeclaration.countryPackReviewEvidenceSourceHashes.join(", ") || null },
        { label: "Legal refs", value: data.evidence.latestDeclaration.countryPackLegalRefs.join(", ") || null },
        { label: payrollUiText("Due date", locale), value: data.evidence.latestDeclaration.dueDate },
        { label: "Updated", value: data.evidence.latestDeclaration.updatedAt },
      ],
    })
  }

  if (data.evidence.closeRun) {
    subjects.push({
      id: "close-run",
      label: "Close assurance",
      status: data.evidence.closeRun.status,
      source: "accounting.close_assurance",
      href: localizePath("/dashboard/accounting/close", locale),
      rows: [
        { label: "Readiness score", value: String(data.evidence.closeRun.readinessScore) },
        { label: "Critical blockers", value: String(data.evidence.closeRun.criticalBlockerCount) },
        { label: "High blockers", value: String(data.evidence.closeRun.highBlockerCount) },
        { label: "Evidence coverage", value: data.evidence.closeRun.evidenceCoveragePct },
        { label: payrollUiText("As of", locale), value: data.evidence.closeRun.asOf },
      ],
    })
  }

  subjects.push({
    id: "pilot-certification",
    label: "Pilot certification",
    status: data.evidence.pilotCertification.status,
    source: "payroll.pilot_cycle_certification",
    rows: [
      { label: "Audit log", value: data.evidence.pilotCertification.auditLogId },
      { label: "Certificate hash", value: data.evidence.pilotCertification.certificateHash },
      { label: "Generated", value: data.evidence.pilotCertification.generatedAt },
      { label: "Evaluated", value: data.evidence.pilotCertification.evaluatedAt },
      { label: payrollUiText("Blockers", locale), value: String(data.evidence.pilotCertification.blockerCount) },
      { label: "Blocker codes", value: data.evidence.pilotCertification.blockerCodes.join(", ") || null },
      { label: "Missing signoffs", value: data.evidence.pilotCertification.missingSignoffRoles.join(", ") || null },
      { label: "Release gates", value: String(data.evidence.pilotCertification.releaseGateCount) },
      { label: "Redaction policy", value: data.evidence.pilotCertification.redactionPolicy },
    ],
  })
  subjects.push({
    id: "final-release",
    label: payrollUiText("Final release readiness", locale),
    status: data.evidence.finalRelease.decision,
    source: "payroll.final_release_readiness",
    rows: [
      { label: "Pack hash", value: data.evidence.finalRelease.packHash },
      { label: "Generated", value: data.evidence.finalRelease.generatedAt },
      { label: payrollUiText("Blockers", locale), value: String(data.evidence.finalRelease.blockerCount) },
      { label: "Critical blockers", value: String(data.evidence.finalRelease.criticalBlockerCount) },
      { label: "High blockers", value: String(data.evidence.finalRelease.highBlockerCount) },
      { label: "Gate count", value: String(data.evidence.finalRelease.gateCount) },
      { label: payrollUiText("Passing gates", locale), value: String(data.evidence.finalRelease.passGateCount) },
      { label: "Action-required gates", value: String(data.evidence.finalRelease.actionRequiredGateCount) },
      { label: "Blocked gates", value: String(data.evidence.finalRelease.blockedGateCount) },
      { label: "Statutory coverage", value: data.evidence.finalRelease.statutorySetup?.status ?? null },
      { label: "Statutory coverage hash", value: data.evidence.finalRelease.statutorySetup?.evidenceHash ?? null },
      { label: payrollUiText("Statutory families", locale), value: displayValue(data.evidence.finalRelease.statutorySetup?.families, locale) },
      { label: "Missing review evidence", value: displayValue(data.evidence.finalRelease.statutorySetup?.missingReviewEvidenceCount, locale) },
      { label: "Source evidence hashes", value: displayValue(data.evidence.finalRelease.statutorySetup?.sourceEvidenceHashCount, locale) },
      { label: "Required review topics", value: displayValue(data.evidence.finalRelease.statutorySetup?.requiredReviewTopics, locale) },
      { label: "Required review topic count", value: displayValue(data.evidence.finalRelease.statutorySetup?.requiredReviewTopicCount, locale) },
      { label: "Country-pack review status", value: data.evidence.finalRelease.countryPackReviewIntake?.status ?? null },
      { label: "Country-pack approval hash", value: data.evidence.finalRelease.countryPackReviewIntake?.approvalHash ?? null },
      { label: "Country-pack certificate hash", value: data.evidence.finalRelease.countryPackReviewIntake?.certificateHash ?? null },
      { label: "Country-pack proposed version", value: data.evidence.finalRelease.countryPackReviewIntake?.proposedPackVersion ?? null },
      { label: "Country-pack target families", value: data.evidence.finalRelease.countryPackReviewIntake?.targetFamilies.join(", ") || null },
      { label: "Country-pack fresh auth", value: displayValue(data.evidence.finalRelease.countryPackReviewIntake?.freshAuthSatisfied, locale) },
      { label: "Country-pack approval evidence", value: displayValue(data.evidence.finalRelease.countryPackReviewIntake?.approvalEvidenceHashPresent, locale) },
      { label: "Blocker codes", value: data.evidence.finalRelease.blockerCodes.join(", ") || null },
      { label: "Release gate requirements", value: String(data.evidence.finalRelease.releaseGateRequirementCount) },
      { label: "Redaction policy", value: data.evidence.finalRelease.redactionPolicy },
    ],
  })

  subjects.push({
    id: "adapter-operations",
    label: payrollUiText("Adapter operations", locale),
    status: data.readiness.adapterOperations.state,
    source: "payroll.adapter_operations",
    href: localizePath("/dashboard/payroll/payments", locale),
    rows: [
      { label: "Redaction policy", value: data.adapterOperations.redaction.policy },
      { label: "Raw payloads included", value: displayValue(data.adapterOperations.redaction.rawPayloadsIncluded, locale) },
      { label: "Credential secrets included", value: displayValue(data.adapterOperations.redaction.credentialSecretsIncluded, locale) },
      { label: "Salary or identity included", value: displayValue(data.adapterOperations.redaction.salaryOrEmployeeIdentityIncluded, locale) },
      { label: "Provider accounts", value: String(data.adapterOperations.summary.providerAccounts) },
      { label: payrollUiText("Provider blocked", locale), value: String(data.adapterOperations.summary.providerBlocked) },
      { label: "Provider action required", value: String(data.adapterOperations.summary.providerActionRequired) },
      { label: "Dead-letter inbox items", value: String(data.adapterOperations.summary.deadLetterInboxItems) },
      { label: "Failed inbox items", value: String(data.adapterOperations.summary.failedInboxItems) },
      { label: "Processing inbox items", value: String(data.adapterOperations.summary.processingInboxItems) },
      { label: "Retry-due inbox items", value: String(data.adapterOperations.summary.retryDueInboxItems) },
      { label: "Stale processing leases", value: String(data.adapterOperations.summary.staleProcessingInboxItems) },
      { label: "Worker leased items", value: String(data.adapterOperations.summary.settlementWorkerLeasedItems) },
      { label: "Worker retry scheduled", value: String(data.adapterOperations.summary.settlementWorkerRetryScheduledItems) },
      { label: "Worker dead-lettered", value: String(data.adapterOperations.summary.settlementWorkerDeadLetteredItems) },
      { label: "Worker completed", value: String(data.adapterOperations.summary.settlementWorkerCompletedItems) },
      { label: "Worker unknown", value: String(data.adapterOperations.summary.settlementWorkerUnknownItems) },
      { label: "Replay or tamper events", value: String(data.adapterOperations.summary.replayOrTamperEvents) },
      { label: payrollUiText("Authority dead-letter", locale), value: String(data.adapterOperations.summary.authorityDeadLetter) },
      { label: "Authority harness gaps", value: String(data.adapterOperations.summary.authorityHarnessGaps) },
      { label: payrollUiText("Payment adapter gaps", locale), value: String(data.adapterOperations.summary.paymentAdapterGaps) },
      { label: "Chaos gate state", value: data.adapterOperations.adapterChaosGate.state },
      { label: "Chaos gate blockers", value: data.adapterOperations.adapterChaosGate.blockerCodes.join(", ") || null },
      { label: "Authority chaos missing", value: String(data.adapterOperations.summary.authorityChaosGateMissing) },
      { label: "Provider chaos missing", value: String(data.adapterOperations.summary.providerChaosGateMissing) },
      { label: "Latest authority chaos proof", value: data.adapterOperations.adapterChaosGate.latestAuthorityProofHash },
      { label: "Latest provider chaos proof", value: data.adapterOperations.adapterChaosGate.latestProviderProofHash },
      ...data.adapterOperations.providerHealth.flatMap((provider) => [
        { label: `${provider.providerCode} worker action`, value: provider.settlementWorker.latestAction },
        { label: `${provider.providerCode} worker action source`, value: provider.settlementWorker.latestActionSource },
        { label: `${provider.providerCode} worker action at`, value: provider.settlementWorker.latestActionAt },
        { label: `${provider.providerCode} worker next retry`, value: provider.settlementWorker.nextRetryAt },
        { label: `${provider.providerCode} worker error`, value: provider.settlementWorker.lastErrorCode },
        {
          label: `${provider.providerCode} worker evidence hashes`,
          value: provider.settlementWorker.evidenceRefs.map((ref) => ref.payloadHash).join(", ") || null,
        },
      ]),
    ],
  })

  return subjects
}

function ProofButton({ locale = "en", subject, onClick }: { subject: ProofSubject | null; onClick: (subject: ProofSubject) => void } & { locale?: Locale }) {
  if (!subject) {
    return (
      <span className="inline-flex min-h-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] px-3 text-xs font-semibold text-slate-500">
         {payrollUiText("Pending", locale)} </span>
    )
  }

  return (
    <button
      type="button"
      onClick={() => onClick(subject)}
      title={payrollUiText("Open proof", locale)}
      className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-white/12 bg-white/10 px-3 text-xs font-semibold text-white transition hover:bg-white/15"
    >
      <Eye className="h-4 w-4" aria-hidden="true" />
       {payrollUiText("Proof", locale)} </button>
  )
}

function ProofDrawer({ locale = "en", subject, open, onOpenChange }: { subject: ProofSubject | null; open: boolean; onOpenChange: (open: boolean) => void } & { locale?: Locale }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto border-white/10 bg-[#101820] text-slate-100 sm:max-w-2xl">
        <SheetHeader className="pr-8">
          <SheetTitle className="text-white">{subject?.label ?? payrollUiText("Proof", locale)}</SheetTitle>
          <SheetDescription className="text-slate-400">{subject?.source ?? "payroll.command_read_model"}</SheetDescription>
        </SheetHeader>

        {subject ? (
          <div className="mt-6 flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] p-4">
              <Badge locale={locale} value={subject.status} />
              {subject.href ? (
                <Link href={subject.href} className="inline-flex min-h-8 items-center gap-2 rounded-md border border-white/12 px-2.5 text-xs font-semibold text-white hover:bg-white/10">
                   {payrollUiText("Open", locale)} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              ) : null}
            </div>
            <div className="divide-y divide-white/10 rounded-lg border border-white/10 bg-white/[0.04]">
              {subject.rows.map((row) => (
                <div key={row.label} className="grid gap-2 px-4 py-3 sm:grid-cols-[160px_minmax(0,1fr)]">
                  <dt className="text-xs font-semibold uppercase tracking-normal text-slate-400">{row.label}</dt>
                  <dd className="min-w-0 break-all text-sm text-slate-100">{row.value || payrollUiText("Pending", locale)}</dd>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

function DetailRow({ locale = "en", label, value }: { label: string; value: string | number | boolean | null | undefined } & { locale?: Locale }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[140px_minmax(0,1fr)]">
      <dt className="text-xs font-semibold uppercase tracking-normal text-slate-500">{label}</dt>
      <dd className="min-w-0 break-words text-xs text-slate-200">{displayValue(value, locale)}</dd>
    </div>
  )
}

function AdapterOperationsPanel({ locale = "en", data, proofSubjects, onProof }: { data: PayrollCommandReadModel; proofSubjects: ProofSubject[]; onProof: (subject: ProofSubject) => void } & { locale?: Locale }) {
  const adapterProof = proofSubjects.find((subject) => subject.id === "adapter-operations") ?? null
  const summary = data.adapterOperations.summary
  const chaosGate = data.adapterOperations.adapterChaosGate
  const certificationGapCount = summary.authorityHarnessGaps + summary.paymentAdapterGaps

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.05]">
      <div className="flex flex-col gap-3 border-b border-white/10 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Landmark className="h-4 w-4 text-cyan-200" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-white">{payrollUiText("Adapter operations", locale)}</h2>
            <Badge locale={locale} value={data.readiness.adapterOperations.state} />
          </div>
          <p className="mt-1 line-clamp-2 text-xs text-slate-400">{data.readiness.adapterOperations.message}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-xs font-semibold text-slate-200">
            <EyeOff className="h-4 w-4 text-emerald-200" aria-hidden="true" />
            {data.adapterOperations.redaction.policy}
          </span>
          <ProofButton locale={locale} subject={adapterProof} onClick={onProof} />
        </div>
      </div>

      <div className="grid gap-3 border-b border-white/10 p-4 sm:grid-cols-2 xl:grid-cols-6">
        <Metric label={payrollUiText("Provider blocked", locale)} value={summary.providerBlocked} icon={AlertTriangle} tone="bg-rose-400/12 text-rose-200" />
        <Metric label={payrollUiText("Callback lag", locale)} value={summary.laggingCallbackProviders} icon={CalendarClock} tone="bg-amber-400/12 text-amber-200" />
        <Metric label={payrollUiText("Inbox stale", locale)} value={summary.staleProcessingInboxItems} icon={CalendarClock} tone="bg-rose-400/12 text-rose-200" />
        <Metric label={payrollUiText("Authority dead-letter", locale)} value={summary.authorityDeadLetter} icon={FileText} tone="bg-rose-400/12 text-rose-200" />
        <Metric label={payrollUiText("Certification gaps", locale)} value={certificationGapCount} icon={ShieldCheck} tone="bg-cyan-400/12 text-cyan-200" />
        <Metric label={payrollUiText("Chaos gate", locale)} value={summary.adapterChaosGateBlockers} icon={ShieldCheck} tone="bg-amber-400/12 text-amber-200" />
      </div>

      <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
        <div className="min-w-0 rounded-lg border border-white/10 bg-white/[0.04]">
          <div className="border-b border-white/10 px-4 py-3">
            <h3 className="text-sm font-semibold text-white">{payrollUiText("Provider health", locale)}</h3>
          </div>
          <div className="divide-y divide-white/10">
            {data.adapterOperations.providerHealth.length ? (
              data.adapterOperations.providerHealth.map((provider) => (
                <div key={provider.providerAccountId} className="space-y-3 px-4 py-3">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <p className="min-w-0 truncate text-sm font-semibold text-white">{provider.displayName}</p>
                    <Badge locale={locale} value={provider.state} />
                    <Badge locale={locale} value={provider.status} />
                  </div>
                  <dl className="grid gap-2 md:grid-cols-2">
                    <DetailRow locale={locale} label={payrollUiText("Provider", locale)} value={provider.providerCode} />
                    <DetailRow locale={locale} label={payrollUiText("Currency", locale)} value={provider.currencyCode} />
                    <DetailRow locale={locale} label={payrollUiText("Statement", locale)} value={dateTimeLabel(provider.latestStatementImportedAt, locale)} />
                    <DetailRow locale={locale} label={payrollUiText("Statement hash", locale)} value={provider.latestStatementFileHash} />
                    <DetailRow locale={locale} label={payrollUiText("Latest event", locale)} value={dateTimeLabel(provider.latestProviderEventReceivedAt, locale)} />
                    <DetailRow locale={locale} label={payrollUiText("Reconciliation", locale)} value={provider.latestReconciliationStatus} />
                    <DetailRow locale={locale} label={payrollUiText("Run guard", locale)} value={provider.latestReconciliationGuard} />
                    <DetailRow locale={locale} label={payrollUiText("Run dedupe key", locale)} value={provider.latestReconciliationRunDedupeKey} />
                    <DetailRow locale={locale} label={payrollUiText("Dead letters", locale)} value={provider.deadLetterInboxCount} />
                    <DetailRow locale={locale} label={payrollUiText("Failed inbox", locale)} value={provider.failedInboxCount} />
                    <DetailRow locale={locale} label={payrollUiText("Processing inbox", locale)} value={provider.processingInboxCount} />
                    <DetailRow locale={locale} label={payrollUiText("Retry due", locale)} value={provider.retryDueInboxCount} />
                    <DetailRow locale={locale} label={payrollUiText("Stale processing", locale)} value={provider.staleProcessingInboxCount} />
                    <DetailRow locale={locale} label={payrollUiText("Replay/tamper", locale)} value={provider.replayOrTamperEventCount} />
                    <DetailRow locale={locale} label={payrollUiText("Exceptions", locale)} value={provider.openExceptionCount} />
                    <DetailRow locale={locale} label={payrollUiText("Duplicate risk", locale)} value={provider.duplicateRiskCount} />
                    <DetailRow locale={locale} label={payrollUiText("Settlement worker", locale)} value={provider.settlementWorker.latestAction} />
                    <DetailRow locale={locale} label={payrollUiText("Worker source", locale)} value={provider.settlementWorker.latestActionSource} />
                    <DetailRow locale={locale} label={payrollUiText("Worker action at", locale)} value={dateTimeLabel(provider.settlementWorker.latestActionAt, locale)} />
                    <DetailRow locale={locale} label={payrollUiText("Worker next retry", locale)} value={dateTimeLabel(provider.settlementWorker.nextRetryAt, locale)} />
                    <DetailRow locale={locale} label={payrollUiText("Worker error", locale)} value={provider.settlementWorker.lastErrorCode} />
                    <DetailRow locale={locale} label={payrollUiText("Worker evidence", locale)} value={provider.settlementWorker.evidenceRefs.map((ref) => ref.payloadHash).join(", ") || null} />
                  </dl>
                  <div className="flex flex-wrap gap-2">
                    {provider.blockers.length ? provider.blockers.map((blocker) => <Badge locale={locale} key={blocker} value={blocker} />) : <Badge locale={locale} value="READY" />}
                  </div>
                  <p className="break-words text-xs text-slate-300">{provider.nextAction}</p>
                </div>
              ))
            ) : (
              <div className="px-4 py-6 text-sm text-slate-400">{payrollUiText("No provider accounts returned.", locale)}</div>
            )}
          </div>
        </div>

        <div className="grid min-w-0 gap-4">
          <div className="rounded-lg border border-white/10 bg-white/[0.04]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
              <h3 className="text-sm font-semibold text-white">{payrollUiText("Chaos release gate", locale)}</h3>
              <Badge locale={locale} value={chaosGate.state} />
            </div>
            <div className="space-y-3 px-4 py-3">
              <dl className="grid gap-2">
                <DetailRow locale={locale} label={payrollUiText("Authority claims", locale)} value={chaosGate.authorityAutomationClaims} />
                <DetailRow locale={locale} label={payrollUiText("Provider claims", locale)} value={chaosGate.providerAutomationClaims} />
                <DetailRow locale={locale} label={payrollUiText("Authority missing", locale)} value={chaosGate.missingAuthorityProofCount} />
                <DetailRow locale={locale} label={payrollUiText("Provider missing", locale)} value={chaosGate.missingProviderProofCount} />
                <DetailRow locale={locale} label={payrollUiText("Authority proof", locale)} value={chaosGate.latestAuthorityProofHash} />
                <DetailRow locale={locale} label={payrollUiText("Provider proof", locale)} value={chaosGate.latestProviderProofHash} />
              </dl>
              <div className="flex flex-wrap gap-2">
                {chaosGate.blockerCodes.length ? chaosGate.blockerCodes.map((blocker) => <Badge locale={locale} key={blocker} value={blocker} />) : <Badge locale={locale} value="READY" />}
              </div>
              <p className="break-words text-xs text-slate-300">{chaosGate.nextAction}</p>
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.04]">
            <div className="border-b border-white/10 px-4 py-3">
              <h3 className="text-sm font-semibold text-white">{payrollUiText("Authority executions", locale)}</h3>
            </div>
            <div className="divide-y divide-white/10">
              {data.adapterOperations.authorityExecutions.length ? (
                data.adapterOperations.authorityExecutions.map((execution) => (
                  <div key={`${execution.declarationId}-${execution.declarationEvidenceId ?? "pending"}`} className="space-y-3 px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="min-w-0 truncate text-sm font-semibold text-white">{execution.authority} {execution.declarationType}</p>
                      <Badge locale={locale} value={execution.executionStatus ?? execution.status} />
                    </div>
                    <dl className="grid gap-2">
                      <DetailRow locale={locale} label={payrollUiText("Adapter", locale)} value={execution.authorityAdapterKey} />
                      <DetailRow locale={locale} label={payrollUiText("Harness hash", locale)} value={execution.authorityCertificationHarnessHash} />
                      <DetailRow locale={locale} label={payrollUiText("Proof hash", locale)} value={execution.authorityAdapterProofHash} />
                      <DetailRow locale={locale} label={payrollUiText("Chaos hash", locale)} value={execution.adapterChaosReleaseGateHash} />
                      <DetailRow locale={locale} label={payrollUiText("Attempts", locale)} value={execution.attempts} />
                      <DetailRow locale={locale} label={payrollUiText("Next attempt", locale)} value={dateTimeLabel(execution.nextAttemptAt, locale)} />
                      <DetailRow locale={locale} label={payrollUiText("Error code", locale)} value={execution.errorCode} />
                    </dl>
                    <div className="flex flex-wrap gap-2">
                      {execution.blockers.length ? execution.blockers.map((blocker) => <Badge locale={locale} key={blocker} value={blocker} />) : <Badge locale={locale} value="READY" />}
                    </div>
                    <p className="break-words text-xs text-slate-300">{execution.nextAction}</p>
                  </div>
                ))
              ) : (
                <div className="px-4 py-6 text-sm text-slate-400">{payrollUiText("No authority executions returned.", locale)}</div>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.04]">
            <div className="border-b border-white/10 px-4 py-3">
              <h3 className="text-sm font-semibold text-white">{payrollUiText("Payment adapter gaps", locale)}</h3>
            </div>
            <div className="divide-y divide-white/10">
              {data.adapterOperations.paymentAdapterGaps.length ? (
                data.adapterOperations.paymentAdapterGaps.map((gap) => (
                  <div key={gap.payrollPaymentBatchId} className="space-y-3 px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="min-w-0 truncate text-sm font-semibold text-white">{gap.batchNumber}</p>
                      <Badge locale={locale} value={gap.status} />
                      <Badge locale={locale} value={gap.paymentAdapterStatus} />
                    </div>
                    <dl className="grid gap-2">
                      <DetailRow locale={locale} label={payrollUiText("Method", locale)} value={gap.method} />
                      <DetailRow locale={locale} label={payrollUiText("Harness hash", locale)} value={gap.providerCertificationHarnessHash} />
                      <DetailRow locale={locale} label={payrollUiText("Proof hash", locale)} value={gap.paymentAdapterProofHash} />
                      <DetailRow locale={locale} label={payrollUiText("Chaos hash", locale)} value={gap.adapterChaosReleaseGateHash} />
                      <DetailRow locale={locale} label={payrollUiText("Contract hash", locale)} value={gap.paymentProviderAdapterContractHash} />
                      <DetailRow locale={locale} label={payrollUiText("Exception", locale)} value={gap.paymentExceptionId} />
                    </dl>
                    <div className="flex flex-wrap gap-2">
                      {gap.blockers.map((blocker) => <Badge locale={locale} key={blocker} value={blocker} />)}
                    </div>
                    <p className="break-words text-xs text-slate-300">{gap.nextAction}</p>
                  </div>
                ))
              ) : (
                <div className="px-4 py-6 text-sm text-slate-400">{payrollUiText("No payment adapter gaps returned.", locale)}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function ActionBoard({ data, locale }: { data: PayrollCommandReadModel; locale: Locale }) {
  if (!data.nextActions.length) {
    return <EmptyState title={payrollUiText("Action board", locale)} body={payrollUiText("No command actions are queued.", locale)} />
  }

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.05]">
      <div className="border-b border-white/10 px-4 py-3">
        <h2 className="text-sm font-semibold text-white">{payrollUiText("Action board", locale)}</h2>
      </div>
      <div className="divide-y divide-white/10">
        {data.nextActions.map((action) => {
          const route = action.href
          return (
            <div key={action.id} className="grid gap-3 px-4 py-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <div className="min-w-0">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-semibold text-white">{payrollUiText(action.label, locale)}</p>
                  <Badge locale={locale} value={action.priority} />
                  {action.requiresFreshAuth ? <Badge locale={locale} value="Fresh auth" /> : null}
                  {action.requiresSeparateApprover ? <Badge locale={locale} value="Maker-checker" /> : null}
                </div>
                <p className="mt-1 break-words text-xs text-slate-400">{action.source} / {action.requiredPermission}</p>
                {action.blockedBy.length ? (
                  <p className="mt-2 break-words text-xs text-amber-100">{action.blockedBy.join(", ")}</p>
                ) : null}
              </div>
              {route && !action.allowed && action.source === "payroll.run_lifecycle" && action.blockedBy.length ? (
                <span className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 text-sm font-semibold text-amber-100">
                  <LockKeyhole className="h-4 w-4" aria-hidden="true" />
                   {payrollUiText("Blocked", locale)} </span>
              ) : route && action.allowed ? (
                <Link
                  href={localizePath(route, locale)}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-white/12 bg-white/10 px-3 text-sm font-semibold text-white transition hover:bg-white/15"
                >
                   {payrollUiText("Open", locale)} <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              ) : route ? (
                <span className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-rose-400/20 bg-rose-400/10 px-3 text-sm font-semibold text-rose-100">
                  <LockKeyhole className="h-4 w-4" aria-hidden="true" />
                   {payrollUiText("Need access", locale)} </span>
              ) : (
                <span className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 text-sm font-semibold text-amber-100">
                  <LockKeyhole className="h-4 w-4" aria-hidden="true" />
                   {payrollUiText("Pending route", locale)} </span>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

function BlockerFlow({ locale = "en", data }: { data: PayrollCommandReadModel } & { locale?: Locale }) {
  if (!data.blockers.length) {
    return <EmptyState title={payrollUiText("Blocker flow", locale)} body={payrollUiText("No command blockers are queued.", locale)} />
  }

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.05]">
      <div className="border-b border-white/10 px-4 py-3">
        <h2 className="text-sm font-semibold text-white">{payrollUiText("Blocker flow", locale)}</h2>
      </div>
      <div className="divide-y divide-white/10">
        {data.blockers.map((blocker) => (
          <div key={`${blocker.domain}-${blocker.code}`} className="grid gap-3 px-4 py-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <p className="truncate text-sm font-semibold text-white">{blocker.code}</p>
                <Badge locale={locale} value={blocker.severity} />
              </div>
              <p className="mt-1 break-words text-xs text-slate-300">{blocker.message}</p>
              <p className="mt-2 break-words text-xs text-slate-500">{blocker.source}</p>
            </div>
            <span className="inline-flex min-h-8 items-center justify-center rounded-md border border-white/12 bg-white/[0.06] px-2.5 text-xs font-semibold text-slate-200">
              {blocker.count ?? blocker.domain}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}

function ReadinessRail({ locale = "en", data }: { data: PayrollCommandReadModel } & { locale?: Locale }) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {Object.entries(data.readiness).map(([key, item]) => (
        <div key={key} className="min-h-[118px] rounded-lg border border-white/10 bg-white/[0.05] p-4">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{payrollUiText(key, locale)}</p>
              <p className="mt-2 line-clamp-2 text-xs text-slate-400">{payrollUiText(item.message, locale)}</p>
            </div>
            <Badge locale={locale} value={item.state} />
          </div>
        </div>
      ))}
    </section>
  )
}

function ReviewShell({ locale = "en", data, proofSubjects, onProof }: { data: PayrollCommandReadModel; proofSubjects: ProofSubject[]; onProof: (subject: ProofSubject) => void } & { locale?: Locale }) {
  const latestRunProof = proofSubjects.find((subject) => subject.id === "latest-run") ?? null

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.05]">
      <div className="border-b border-white/10 px-4 py-3">
        <h2 className="text-sm font-semibold text-white">{payrollUiText("Run review", locale)}</h2>
      </div>
      <div className="divide-y divide-white/10">
        {data.workbench.queues.recentRuns.length ? (
          data.workbench.queues.recentRuns.map((run) => (
            <div key={run.id} className="grid gap-3 px-4 py-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)_auto] xl:items-center">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{run.runNumber}</p>
                <p className="mt-1 truncate text-xs text-slate-400">{run.periodName} / {dateLabel(run.payDate, locale)}</p>
              </div>
              <div className="flex min-w-0 flex-wrap gap-2">
                <Badge locale={locale} value={run.status} />
                <Badge locale={locale} value={run.ledgerPostingBatchId ? "LEDGER_EVIDENCE" : "LEDGER_PENDING"} />
                <Badge locale={locale} value={run.postedBusinessEventId ? "EVENT_POSTED" : "EVENT_PENDING"} />
                {run.id === data.evidence.latestRun?.id ? <Badge locale={locale} value={data.evidence.latestRun.lifecycle.transitionEvidence} /> : null}
              </div>
              <div className="flex min-w-0 items-center justify-between gap-3 xl:justify-end">
                <div className="min-w-0 text-sm font-semibold text-white">{money(run.netPayableAmount, run.currency)}</div>
                <ProofButton locale={locale} subject={run.id === data.evidence.latestRun?.id ? latestRunProof : null} onClick={onProof} />
              </div>
            </div>
          ))
        ) : (
          <div className="px-4 py-6 text-sm text-slate-400">{payrollUiText("No payroll runs found.", locale)}</div>
        )}
      </div>
    </section>
  )
}

function FinanceState({ locale = "en", data, proofSubjects, onProof }: { data: PayrollCommandReadModel; proofSubjects: ProofSubject[]; onProof: (subject: ProofSubject) => void } & { locale?: Locale }) {
  const paymentProof = proofSubjects.find((subject) => subject.id === "latest-payment-batch") ?? null
  const declarationProof = proofSubjects.find((subject) => subject.id === "latest-declaration") ?? null
  const closeProof = proofSubjects.find((subject) => subject.id === "close-run") ?? null

  return (
    <section className="grid gap-4 xl:grid-cols-3">
      <div className="rounded-lg border border-white/10 bg-white/[0.05]">
        <div className="border-b border-white/10 px-4 py-3">
          <h2 className="text-sm font-semibold text-white">{payrollUiText("Payment state", locale)}</h2>
        </div>
        <div className="space-y-3 p-4">
          <div className="flex flex-wrap gap-2">
            <Badge locale={locale} value={data.evidence.latestPaymentBatch?.status ?? "PENDING"} />
            <Badge locale={locale} value={data.trustedCounts.reconciliationExceptions > 0 ? "ACTION_REQUIRED" : "READY"} />
          </div>
          <p className="text-sm text-slate-300">{data.trustedCounts.currentPeriodPaymentBatches}  {payrollUiText("current-period batch(es)", locale)}</p>
          <ProofButton locale={locale} subject={paymentProof} onClick={onProof} />
        </div>
      </div>

      <div className="rounded-lg border border-white/10 bg-white/[0.05]">
        <div className="border-b border-white/10 px-4 py-3">
          <h2 className="text-sm font-semibold text-white">{payrollUiText("Declaration state", locale)}</h2>
        </div>
        <div className="space-y-3 p-4">
          <div className="flex flex-wrap gap-2">
            <Badge locale={locale} value={data.evidence.latestDeclaration?.status ?? "PENDING"} />
            <Badge locale={locale} value={data.trustedCounts.openDeclarations > 0 ? "ACTION_REQUIRED" : "READY"} />
          </div>
          <p className="text-sm text-slate-300">{data.trustedCounts.currentPeriodDeclarations}  {payrollUiText("current-period declaration(s)", locale)}</p>
          <ProofButton locale={locale} subject={declarationProof} onClick={onProof} />
        </div>
      </div>

      <div className="rounded-lg border border-white/10 bg-white/[0.05]">
        <div className="border-b border-white/10 px-4 py-3">
          <h2 className="text-sm font-semibold text-white">{payrollUiText("Close state", locale)}</h2>
        </div>
        <div className="space-y-3 p-4">
          <div className="flex flex-wrap gap-2">
            <Badge locale={locale} value={data.evidence.closeRun?.status ?? "PENDING"} />
            <Badge locale={locale} value={data.readiness.close.state} />
          </div>
          <p className="text-sm text-slate-300">{data.evidence.closeRun?.readinessScore ?? "n/a"}  {payrollUiText("readiness score", locale)}</p>
          <ProofButton locale={locale} subject={closeProof} onClick={onProof} />
        </div>
      </div>
    </section>
  )
}

function CountryPackReviewNoticePanel({ notice }: { notice: CountryPackReviewNotice | null }) {
  if (!notice) return null

  const isSuccess = notice.kind === "success"
  return (
    <div
      role="status"
      className={`rounded-lg border p-3 text-sm ${isSuccess ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-50" : "border-amber-400/30 bg-amber-400/10 text-amber-50"}`}
    >
      <div className="flex items-start gap-2">
        {isSuccess ? (
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        ) : (
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        )}
        <div className="min-w-0">
          <p className="break-words font-semibold">{notice.title}</p>
          <p className="mt-1 break-words text-xs">{notice.detail}</p>
          {notice.kind === "success" && notice.blockers?.length ? (
            <p className="mt-1 break-words text-xs">{notice.blockers.join(", ")}</p>
          ) : null}
          {notice.kind !== "success" && notice.correlationId ? (
            <p className="mt-1 break-all text-xs text-slate-300">{notice.correlationId}</p>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function CountryPackReviewIntakePanel({ locale = "en", data }: { data: PayrollCommandReadModel } & { locale?: Locale }) {
  const existingApproval = data.evidence.finalRelease.countryPackReviewIntake
  const [proposedPackJson, setProposedPackJson] = useState("")
  const [basePackVersion, setBasePackVersion] = useState(data.currentPeriod?.countryPackVersion ?? "")
  const [countryCode, setCountryCode] = useState(data.currentPeriod?.countryCode ?? "")
  const [targetFamilies, setTargetFamilies] = useState<string[]>(() => defaultTargetFamilies(data))
  const [reviewEvidence, setReviewEvidence] = useState<ReviewTopicEvidenceRow[]>(() => defaultReviewEvidenceRows())
  const [certificateHash, setCertificateHash] = useState(existingApproval?.certificateHash ?? "")
  const [approvalEvidenceHash, setApprovalEvidenceHash] = useState("")
  const [generatedAt] = useState(() => new Date().toISOString())
  const [notice, setNotice] = useState<CountryPackReviewNotice | null>(null)
  const [isPending, startTransition] = useTransition()

  function toggleTargetFamily(value: string) {
    setTargetFamilies((current) =>
      current.includes(value)
        ? current.filter((entry) => entry !== value)
        : [...current, value],
    )
  }

  function updateEvidence(index: number, field: keyof ReviewTopicEvidenceRow, value: string) {
    setReviewEvidence((current) =>
      current.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, [field]: value } : entry,
      ),
    )
  }

  function actionInput() {
    let proposedPack: unknown
    try {
      proposedPack = JSON.parse(proposedPackJson)
    } catch {
      setNotice({
        kind: "error",
        title: "INVALID_COUNTRY_PACK_JSON",
        detail: "Proposed country-pack JSON could not be parsed.",
      })
      return null
    }

    return {
      proposedPack,
      basePackVersion: basePackVersion.trim(),
      countryCode: countryCode.trim(),
      targetFamilies,
      reviewTopicEvidence: reviewEvidence
        .map((entry) => ({
          topic: entry.topic.trim(),
          legalRef: entry.legalRef.trim(),
          sourceEvidenceHash: entry.sourceEvidenceHash.trim(),
          reviewedBy: entry.reviewedBy.trim(),
          reviewedOn: entry.reviewedOn.trim(),
        }))
        .filter((entry) => entry.topic.length > 0),
      generatedAt,
    }
  }

  function evaluateIntake() {
    const input = actionInput()
    if (!input) return
    setNotice(null)
    startTransition(() => {
      void evaluatePayrollCountryPackReviewIntakeAction(input).then((result) => {
        if (result.success) {
          setCertificateHash(result.data.certificateHash)
          setNotice(certificateNotice("Evaluated", result.data))
          return
        }
        setNotice(countryPackReviewErrorNotice(result as CountryPackReviewActionFailure))
      })
    })
  }

  function recordIntake() {
    const input = actionInput()
    if (!input) return
    setNotice(null)
    startTransition(() => {
      void recordPayrollCountryPackReviewIntakeAction(input).then((result) => {
        if (result.success) {
          setCertificateHash(result.data.certificateHash)
          setNotice({
            ...certificateNotice("Recorded", result.data),
            detail: `${result.data.certificateHash}; audit ${result.data.persistence.auditLogId}; blockers ${result.data.blockers.length}`,
          })
          return
        }
        setNotice(countryPackReviewErrorNotice(result as CountryPackReviewActionFailure))
      })
    })
  }

  function approveIntake() {
    const expectedCertificateHash = certificateHash.trim()
    const approvalHash = approvalEvidenceHash.trim()
    if (!expectedCertificateHash || !approvalHash) {
      setNotice({
        kind: "error",
        title: "PAYROLL_COUNTRY_PACK_APPROVAL_INPUT_MISSING",
        detail: "Certificate hash and approval evidence hash are required.",
      })
      return
    }

    setNotice(null)
    startTransition(() => {
      void approvePayrollCountryPackReviewIntakeAction({
        expectedCertificateHash,
        approvalEvidenceHash: approvalHash,
      }).then((result) => {
        if (result.success) {
          setNotice(approvalNotice(result.data))
          return
        }
        setNotice(countryPackReviewErrorNotice(result as CountryPackReviewActionFailure))
      })
    })
  }

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.05]">
      <div className="flex flex-col gap-3 border-b border-white/10 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-teal-200" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-white">{payrollUiText("Country-pack review intake", locale)}</h2>
            <Badge locale={locale} value={existingApproval?.status ?? "MISSING"} />
          </div>
          <p className="mt-1 break-words text-xs text-slate-400">{existingApproval?.approvalHash ?? data.evidence.finalRelease.packHash}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1 text-slate-200">
            {data.currentPeriod?.countryPackVersion ?? "No current pack"}
          </span>
          <span className="rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1 text-slate-200">
            {existingApproval?.freshAuthSatisfied ? "FRESH_AUTH_OK" : "FRESH_AUTH_PENDING"}
          </span>
        </div>
      </div>

      <div className="grid gap-4 p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.7fr)]">
          <label className="text-xs font-semibold text-slate-400">
             {payrollUiText("Proposed country-pack JSON", locale)} <textarea
              aria-label={payrollUiText("Proposed country-pack JSON", locale)}
              value={proposedPackJson}
              onChange={(event) => setProposedPackJson(event.target.value)}
              className={textareaClass()}
              disabled={isPending}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <label className="text-xs font-semibold text-slate-400">
               {payrollUiText("Country code", locale)} <input
                aria-label={payrollUiText("Country code", locale)}
                value={countryCode}
                onChange={(event) => setCountryCode(event.target.value)}
                className={fieldClass()}
                disabled={isPending}
              />
            </label>
            <label className="text-xs font-semibold text-slate-400">
               {payrollUiText("Base pack version", locale)} <input
                aria-label={payrollUiText("Base pack version", locale)}
                value={basePackVersion}
                onChange={(event) => setBasePackVersion(event.target.value)}
                className={fieldClass()}
                disabled={isPending}
              />
            </label>
          </div>
        </div>

        <div className="grid gap-3 rounded-lg border border-white/10 bg-black/10 p-3">
          <p className="text-xs font-semibold uppercase tracking-normal text-slate-400">{payrollUiText("Target families", locale)}</p>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {countryPackTargetFamilies.map((option) => (
              <label key={option.value} className="flex min-h-10 items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-3 text-xs font-semibold text-slate-200">
                <input
                  type="checkbox"
                  checked={targetFamilies.includes(option.value)}
                  onChange={() => toggleTargetFamily(option.value)}
                  disabled={isPending}
                  className="h-4 w-4 accent-cyan-300"
                />
                <span className="min-w-0 truncate">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="grid gap-3 rounded-lg border border-white/10 bg-black/10 p-3">
          <p className="text-xs font-semibold uppercase tracking-normal text-slate-400">{payrollUiText("Review topic evidence", locale)}</p>
          <div className="grid gap-3">
            {reviewEvidence.map((entry, index) => (
              <div key={entry.topic} className="grid gap-2 rounded-md border border-white/10 bg-white/[0.04] p-3 xl:grid-cols-[minmax(160px,0.8fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,0.8fr)]">
                <label className="text-xs font-semibold text-slate-400">
                   {payrollUiText("Topic", locale)} <input
                    aria-label={`Review topic ${index + 1}`}
                    value={entry.topic}
                    onChange={(event) => updateEvidence(index, "topic", event.target.value)}
                    className={fieldClass()}
                    disabled={isPending}
                  />
                </label>
                <label className="text-xs font-semibold text-slate-400">
                   {payrollUiText("Legal reference", locale)} <input
                    aria-label={`Legal reference ${index + 1}`}
                    value={entry.legalRef}
                    onChange={(event) => updateEvidence(index, "legalRef", event.target.value)}
                    className={fieldClass()}
                    disabled={isPending}
                  />
                </label>
                <label className="text-xs font-semibold text-slate-400">
                   {payrollUiText("Evidence hash", locale)} <input
                    aria-label={`Evidence hash ${index + 1}`}
                    value={entry.sourceEvidenceHash}
                    onChange={(event) => updateEvidence(index, "sourceEvidenceHash", event.target.value)}
                    className={fieldClass()}
                    disabled={isPending}
                  />
                </label>
                <label className="text-xs font-semibold text-slate-400">
                   {payrollUiText("Reviewer", locale)} <input
                    aria-label={`Reviewer ${index + 1}`}
                    value={entry.reviewedBy}
                    onChange={(event) => updateEvidence(index, "reviewedBy", event.target.value)}
                    className={fieldClass()}
                    disabled={isPending}
                  />
                </label>
                <label className="text-xs font-semibold text-slate-400">
                   {payrollUiText("Reviewed on", locale)} <input
                    aria-label={`Reviewed on ${index + 1}`}
                    value={entry.reviewedOn}
                    onChange={(event) => updateEvidence(index, "reviewedOn", event.target.value)}
                    className={fieldClass()}
                    disabled={isPending}
                  />
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-3 rounded-lg border border-white/10 bg-black/10 p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
          <label className="text-xs font-semibold text-slate-400">
             {payrollUiText("Review certificate hash", locale)} <input
              aria-label={payrollUiText("Review certificate hash", locale)}
              value={certificateHash}
              onChange={(event) => setCertificateHash(event.target.value)}
              className={fieldClass()}
              disabled={isPending}
            />
          </label>
          <label className="text-xs font-semibold text-slate-400">
             {payrollUiText("Approval evidence hash", locale)} <input
              aria-label={payrollUiText("Approval evidence hash", locale)}
              value={approvalEvidenceHash}
              onChange={(event) => setApprovalEvidenceHash(event.target.value)}
              className={fieldClass()}
              disabled={isPending}
            />
          </label>
          <div className="flex flex-wrap gap-2 md:justify-end">
            <button
              type="button"
              disabled={isPending || !proposedPackJson.trim()}
              onClick={evaluateIntake}
              className="inline-flex min-h-10 items-center gap-2 rounded-md border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
               {payrollUiText("Evaluate pack", locale)} </button>
            <button
              type="button"
              disabled={isPending || !proposedPackJson.trim()}
              onClick={recordIntake}
              className="inline-flex min-h-10 items-center gap-2 rounded-md border border-teal-400/30 bg-teal-400/10 px-3 py-2 text-sm font-semibold text-teal-50 transition hover:bg-teal-400/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ShieldCheck className="h-4 w-4" aria-hidden="true" />}
               {payrollUiText("Record certificate", locale)} </button>
            <button
              type="button"
              disabled={isPending || !certificateHash.trim() || !approvalEvidenceHash.trim()}
              onClick={approveIntake}
              className="inline-flex min-h-10 items-center gap-2 rounded-md border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm font-semibold text-emerald-50 transition hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <LockKeyhole className="h-4 w-4" aria-hidden="true" />}
               {payrollUiText("Approve certificate", locale)} </button>
          </div>
        </div>

        <CountryPackReviewNoticePanel notice={notice} />
      </div>
    </section>
  )
}

function FinalReleasePanel({ locale = "en", data, proofSubjects, onProof }: { data: PayrollCommandReadModel; proofSubjects: ProofSubject[]; onProof: (subject: ProofSubject) => void } & { locale?: Locale }) {
  const finalRelease = data.evidence.finalRelease
  const finalReleaseProof = proofSubjects.find((subject) => subject.id === "final-release") ?? null

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.05]">
      <div className="flex flex-col gap-3 border-b border-white/10 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-teal-200" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-white">{payrollUiText("Final release readiness", locale)}</h2>
            <Badge locale={locale} value={finalRelease.decision} />
          </div>
          <p className="mt-1 break-words text-xs text-slate-400">{finalRelease.packHash}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-xs font-semibold text-slate-200">
            <EyeOff className="h-4 w-4 text-emerald-200" aria-hidden="true" />
            {finalRelease.redactionPolicy}
          </span>
          <ProofButton locale={locale} subject={finalReleaseProof} onClick={onProof} />
        </div>
      </div>

      <div className="grid gap-3 border-b border-white/10 p-4 sm:grid-cols-2 xl:grid-cols-7">
        <Metric label={payrollUiText("Passing gates", locale)} value={`${finalRelease.passGateCount}/${finalRelease.gateCount}`} icon={ShieldCheck} tone="bg-emerald-400/12 text-emerald-200" />
        <Metric label={payrollUiText("Blockers", locale)} value={finalRelease.blockerCount} icon={AlertTriangle} tone="bg-rose-400/12 text-rose-200" />
        <Metric label={payrollUiText("Critical", locale)} value={finalRelease.criticalBlockerCount} icon={LockKeyhole} tone="bg-rose-400/12 text-rose-200" />
        <Metric label={payrollUiText("Statutory families", locale)} value={displayValue(finalRelease.statutorySetup?.families, locale)} icon={FileText} tone="bg-cyan-400/12 text-cyan-200" />
        <Metric label={payrollUiText("Review hashes", locale)} value={displayValue(finalRelease.statutorySetup?.sourceEvidenceHashCount, locale)} icon={CheckCircle2} tone="bg-teal-400/12 text-teal-200" />
        <Metric label={payrollUiText("Review topics", locale)} value={displayValue(finalRelease.statutorySetup?.requiredReviewTopicCount, locale)} icon={ClipboardList} tone="bg-sky-400/12 text-sky-200" />
        <Metric label={payrollUiText("Pack approval", locale)} value={finalRelease.countryPackReviewIntake?.status ?? payrollUiText("Missing", locale)} icon={ShieldCheck} tone="bg-violet-400/12 text-violet-100" />
      </div>

      <div className="divide-y divide-white/10">
        {finalRelease.gates.map((gate) => (
          <div key={gate.key} className="grid gap-3 px-4 py-3 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)_auto] xl:items-center">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{gate.label}</p>
              <p className="mt-1 break-words text-xs text-slate-500">{gate.source}</p>
            </div>
            <div className="min-w-0 break-all text-xs text-slate-300">{gate.evidenceHash ?? payrollUiText("Pending", locale)}</div>
            <div className="flex min-w-0 flex-wrap justify-start gap-2 xl:justify-end">
              <Badge locale={locale} value={gate.status} />
              {gate.blockerCodes.length ? <Badge locale={locale} value={`${gate.blockerCodes.length} blockers`} /> : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
function FreshnessPanel({ locale = "en", data }: { data: PayrollCommandReadModel } & { locale?: Locale }) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.05]">
      <div className="border-b border-white/10 px-4 py-3">
        <h2 className="text-sm font-semibold text-white">{payrollUiText("Freshness", locale)}</h2>
      </div>
      <div className="grid gap-2 p-4 sm:grid-cols-2 xl:grid-cols-4">
        {data.freshness.map((item) => (
          <div key={item.source} className="min-h-[86px] rounded-lg border border-white/10 bg-white/[0.04] p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="min-w-0 truncate text-xs font-semibold text-white">{item.source}</p>
              <Badge locale={locale} value={item.status} />
            </div>
            <p className="mt-2 text-xs text-slate-400">{item.ageHours === null ? "n/a" : `${item.ageHours}h`}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

export default function PayrollCommandCenter({ data, error, locale }: Props) {
  const [selectedProof, setSelectedProof] = useState<ProofSubject | null>(null)
  const proofSubjects = useMemo(() => (data ? buildProofSubjects(data, locale) : []), [data, locale])
  const periodProof = proofSubjects.find((subject) => subject.id === "current-period") ?? null
  const pilotProof = proofSubjects.find((subject) => subject.id === "pilot-certification") ?? null

  if (error) {
    return (
      <section className="rounded-lg border border-rose-400/30 bg-rose-950/30 p-5 text-rose-50">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <h1 className="text-base font-semibold">{payrollUiText("Payroll command unavailable", locale)}</h1>
            <p className="mt-1 break-words text-sm text-rose-100">{error}</p>
          </div>
        </div>
      </section>
    )
  }

  if (!data) {
    return <EmptyState title={payrollUiText("Payroll command", locale)} body={payrollUiText("No payroll command data is available.", locale)} />
  }

  return (
    <main className="flex min-w-0 flex-col gap-4 text-slate-100">
      <section className="flex flex-col gap-3 border-b border-white/10 pb-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-normal text-cyan-200">{payrollUiText("Payroll command center", locale)}</p>
          <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">{payrollUiText("HR, payroll, evidence, and close control", locale)}</h1>
          <p className="mt-2 max-w-4xl text-sm text-slate-300">
             {payrollUiText("As of", locale)} {dateTimeLabel(data.asOf, locale)}{payrollUiText(". Current period:", locale)} {data.currentPeriod?.name ?? payrollUiText("Pending", locale)}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge locale={locale} value={data.redaction.payrollAmounts.mode} />
          <Badge locale={locale} value={data.evidence.latestRun?.lifecycle.transitionEvidence ?? "NO_RUN"} />
          <Badge locale={locale} value={data.evidence.pilotCertification.status} />
          <ProofButton locale={locale} subject={pilotProof} onClick={setSelectedProof} />
          <ProofButton locale={locale} subject={periodProof} onClick={setSelectedProof} />
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label={payrollUiText("Active employees", locale)} value={data.trustedCounts.activeEmployees} icon={UsersRound} tone="bg-sky-400/12 text-sky-200" />
        <Metric label={payrollUiText("Attendance ready", locale)} value={data.trustedCounts.attendanceReadyEmployees} icon={CalendarClock} tone="bg-cyan-400/12 text-cyan-200" />
        <Metric label={payrollUiText("Payment approved", locale)} value={data.trustedCounts.approvedPaymentDestinations} icon={Banknote} tone="bg-emerald-400/12 text-emerald-200" />
        <Metric label={payrollUiText("Ledger blockers", locale)} value={data.trustedCounts.ledgerBlockers} icon={LockKeyhole} tone="bg-rose-400/12 text-rose-200" />
        <Metric label={payrollUiText("Current runs", locale)} value={data.trustedCounts.currentPeriodRuns} icon={ReceiptText} tone="bg-violet-400/12 text-violet-200" />
        <Metric label={payrollUiText("Open declarations", locale)} value={data.trustedCounts.openDeclarations} icon={FileText} tone="bg-amber-400/12 text-amber-200" />
        <Metric label={payrollUiText("Next actions", locale)} value={data.nextActions.length} icon={ClipboardList} tone="bg-slate-400/12 text-slate-200" />
        <Metric label={payrollUiText("Pilot cert", locale)} value={pilotStatusLabel(data.evidence.pilotCertification.status, locale)} icon={ShieldCheck} tone="bg-teal-400/12 text-teal-200" />
        <Metric label={payrollUiText("Final release", locale)} value={data.evidence.finalRelease.decision === "READY_FOR_FULL_PRODUCTION_APPROVAL" ? payrollUiText("Ready", locale) : payrollUiText("Not ready", locale)} icon={ShieldCheck} tone="bg-cyan-400/12 text-cyan-200" />
        <Metric label={payrollUiText("Proof subjects", locale)} value={proofSubjects.length} icon={ShieldCheck} tone="bg-slate-400/12 text-slate-200" />
      </section>

      <ReadinessRail locale={locale} data={data} />
      <PayrollPilotCertificationPanel locale={locale} data={data} />

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <BlockerFlow locale={locale} data={data} />
        <ActionBoard data={data} locale={locale} />
      </section>

      <ReviewShell locale={locale} data={data} proofSubjects={proofSubjects} onProof={setSelectedProof} />
      <FinanceState locale={locale} data={data} proofSubjects={proofSubjects} onProof={setSelectedProof} />
      <FinalReleasePanel locale={locale} data={data} proofSubjects={proofSubjects} onProof={setSelectedProof} />
      <CountryPackReviewIntakePanel locale={locale} data={data} />
      <AdapterOperationsPanel locale={locale} data={data} proofSubjects={proofSubjects} onProof={setSelectedProof} />
      <FreshnessPanel locale={locale} data={data} />

      <ProofDrawer locale={locale} subject={selectedProof} open={Boolean(selectedProof)} onOpenChange={(open) => { if (!open) setSelectedProof(null) }} />
    </main>
  )
}
