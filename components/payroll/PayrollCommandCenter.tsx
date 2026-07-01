"use client"

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
  value: string | null
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

function dateLabel(value: string | null | undefined) {
  if (!value) return "Pending"
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value))
}

function dateTimeLabel(value: string | null | undefined) {
  if (!value) return "Pending"
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
}

function money(amount: string, currency: string) {
  return amount.includes("[REDACTED") ? amount : `${amount} ${currency}`
}

function displayValue(value: string | number | boolean | null | undefined) {
  if (value === true) return "Yes"
  if (value === false) return "No"
  if (value === null || value === undefined || value === "") return "Pending"
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

function pilotStatusLabel(value: string) {
  if (value === "CERTIFIED_FOR_PRODUCTION_RELEASE_REVIEW") return "Certified"
  if (value === "READY_FOR_SIGNOFF") return "Signoff"
  if (value === "BLOCKED") return "Blocked"
  return "Not evaluated"
}

function stateTone(value: string | null | undefined) {
  const normalized = (value ?? "").toUpperCase()
  if (["READY", "POSTED", "PAID", "SETTLED", "ACCEPTED", "RELEASED", "FRESH", "CERTIFIED", "CERTIFIED_FOR_PRODUCTION_RELEASE_REVIEW", "READY_FOR_FULL_PRODUCTION_APPROVAL", "PASS"].includes(normalized)) {
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

function Badge({ value }: { value: string | null | undefined }) {
  return (
    <span className={`inline-flex min-h-7 max-w-full items-center rounded-md border px-2.5 py-1 text-xs font-semibold ${stateTone(value)}`}>
      <span className="truncate">{value ?? "Pending"}</span>
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
        { label: "Period start", value: data.currentPeriod.periodStart },
        { label: "Period end", value: data.currentPeriod.periodEnd },
        { label: "Pay date", value: data.currentPeriod.payDate },
        { label: "Country pack", value: data.currentPeriod.countryPackVersion },
        { label: "Country pack hash", value: data.currentPeriod.countryPackResolutionHash },
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
        { label: "Document hash", value: data.evidence.latestRun.documentHash },
        { label: "Evidence hash", value: data.evidence.latestRun.evidenceHash },
        { label: "Calculation hash", value: data.evidence.latestRun.calculationHash },
        { label: "Attendance hash", value: data.evidence.latestRun.attendanceSnapshotHash },
        { label: "Country pack hash", value: data.evidence.latestRun.countryPackResolutionHash },
        { label: "Ledger batch", value: data.evidence.latestRun.ledgerPostingBatchId },
        { label: "Posted event", value: data.evidence.latestRun.postedBusinessEventId },
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
        { label: "Document hash", value: data.evidence.latestPaymentBatch.documentHash },
        { label: "Evidence hash", value: data.evidence.latestPaymentBatch.evidenceHash },
        { label: "Bank file hash", value: data.evidence.latestPaymentBatch.bankFileHash },
        { label: "Ledger batch", value: data.evidence.latestPaymentBatch.ledgerPostingBatchId },
        { label: "Posted event", value: data.evidence.latestPaymentBatch.postedBusinessEventId },
        { label: "Reconciliation", value: data.evidence.latestPaymentBatch.reconciliationStatus },
      ],
    })
  }

  if (data.evidence.latestDeclaration) {
    subjects.push({
      id: "latest-declaration",
      label: `${data.evidence.latestDeclaration.authority} ${data.evidence.latestDeclaration.declarationType}`,
      status: data.evidence.latestDeclaration.status,
      source: "payroll.declaration",
      rows: [
        { label: "Payload hash", value: data.evidence.latestDeclaration.payloadHash },
        { label: "Country pack hash", value: data.evidence.latestDeclaration.countryPackResolutionHash },
        { label: "Due date", value: data.evidence.latestDeclaration.dueDate },
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
        { label: "As of", value: data.evidence.closeRun.asOf },
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
      { label: "Blockers", value: String(data.evidence.pilotCertification.blockerCount) },
      { label: "Blocker codes", value: data.evidence.pilotCertification.blockerCodes.join(", ") || null },
      { label: "Missing signoffs", value: data.evidence.pilotCertification.missingSignoffRoles.join(", ") || null },
      { label: "Release gates", value: String(data.evidence.pilotCertification.releaseGateCount) },
      { label: "Redaction policy", value: data.evidence.pilotCertification.redactionPolicy },
    ],
  })
  subjects.push({
    id: "final-release",
    label: "Final release readiness",
    status: data.evidence.finalRelease.decision,
    source: "payroll.final_release_readiness",
    rows: [
      { label: "Pack hash", value: data.evidence.finalRelease.packHash },
      { label: "Generated", value: data.evidence.finalRelease.generatedAt },
      { label: "Blockers", value: String(data.evidence.finalRelease.blockerCount) },
      { label: "Critical blockers", value: String(data.evidence.finalRelease.criticalBlockerCount) },
      { label: "High blockers", value: String(data.evidence.finalRelease.highBlockerCount) },
      { label: "Gate count", value: String(data.evidence.finalRelease.gateCount) },
      { label: "Passing gates", value: String(data.evidence.finalRelease.passGateCount) },
      { label: "Action-required gates", value: String(data.evidence.finalRelease.actionRequiredGateCount) },
      { label: "Blocked gates", value: String(data.evidence.finalRelease.blockedGateCount) },
      { label: "Statutory coverage", value: data.evidence.finalRelease.statutorySetup?.status ?? null },
      { label: "Statutory coverage hash", value: data.evidence.finalRelease.statutorySetup?.evidenceHash ?? null },
      { label: "Statutory families", value: displayValue(data.evidence.finalRelease.statutorySetup?.families) },
      { label: "Missing review evidence", value: displayValue(data.evidence.finalRelease.statutorySetup?.missingReviewEvidenceCount) },
      { label: "Source evidence hashes", value: displayValue(data.evidence.finalRelease.statutorySetup?.sourceEvidenceHashCount) },
      { label: "Required review topics", value: displayValue(data.evidence.finalRelease.statutorySetup?.requiredReviewTopics) },
      { label: "Required review topic count", value: displayValue(data.evidence.finalRelease.statutorySetup?.requiredReviewTopicCount) },
      { label: "Country-pack review status", value: data.evidence.finalRelease.countryPackReviewIntake?.status ?? null },
      { label: "Country-pack approval hash", value: data.evidence.finalRelease.countryPackReviewIntake?.approvalHash ?? null },
      { label: "Country-pack certificate hash", value: data.evidence.finalRelease.countryPackReviewIntake?.certificateHash ?? null },
      { label: "Country-pack proposed version", value: data.evidence.finalRelease.countryPackReviewIntake?.proposedPackVersion ?? null },
      { label: "Country-pack target families", value: data.evidence.finalRelease.countryPackReviewIntake?.targetFamilies.join(", ") || null },
      { label: "Country-pack fresh auth", value: displayValue(data.evidence.finalRelease.countryPackReviewIntake?.freshAuthSatisfied) },
      { label: "Country-pack approval evidence", value: displayValue(data.evidence.finalRelease.countryPackReviewIntake?.approvalEvidenceHashPresent) },
      { label: "Blocker codes", value: data.evidence.finalRelease.blockerCodes.join(", ") || null },
      { label: "Release gate requirements", value: String(data.evidence.finalRelease.releaseGateRequirementCount) },
      { label: "Redaction policy", value: data.evidence.finalRelease.redactionPolicy },
    ],
  })

  subjects.push({
    id: "adapter-operations",
    label: "Adapter operations",
    status: data.readiness.adapterOperations.state,
    source: "payroll.adapter_operations",
    href: localizePath("/dashboard/payroll/payments", locale),
    rows: [
      { label: "Redaction policy", value: data.adapterOperations.redaction.policy },
      { label: "Raw payloads included", value: displayValue(data.adapterOperations.redaction.rawPayloadsIncluded) },
      { label: "Credential secrets included", value: displayValue(data.adapterOperations.redaction.credentialSecretsIncluded) },
      { label: "Salary or identity included", value: displayValue(data.adapterOperations.redaction.salaryOrEmployeeIdentityIncluded) },
      { label: "Provider accounts", value: String(data.adapterOperations.summary.providerAccounts) },
      { label: "Provider blocked", value: String(data.adapterOperations.summary.providerBlocked) },
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
      { label: "Authority dead-letter", value: String(data.adapterOperations.summary.authorityDeadLetter) },
      { label: "Authority harness gaps", value: String(data.adapterOperations.summary.authorityHarnessGaps) },
      { label: "Payment adapter gaps", value: String(data.adapterOperations.summary.paymentAdapterGaps) },
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

function ProofButton({ subject, onClick }: { subject: ProofSubject | null; onClick: (subject: ProofSubject) => void }) {
  if (!subject) {
    return (
      <span className="inline-flex min-h-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] px-3 text-xs font-semibold text-slate-500">
        Pending
      </span>
    )
  }

  return (
    <button
      type="button"
      onClick={() => onClick(subject)}
      title="Open proof"
      className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-white/12 bg-white/10 px-3 text-xs font-semibold text-white transition hover:bg-white/15"
    >
      <Eye className="h-4 w-4" aria-hidden="true" />
      Proof
    </button>
  )
}

function ProofDrawer({ subject, open, onOpenChange }: { subject: ProofSubject | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto border-white/10 bg-[#101820] text-slate-100 sm:max-w-2xl">
        <SheetHeader className="pr-8">
          <SheetTitle className="text-white">{subject?.label ?? "Proof"}</SheetTitle>
          <SheetDescription className="text-slate-400">{subject?.source ?? "payroll.command_read_model"}</SheetDescription>
        </SheetHeader>

        {subject ? (
          <div className="mt-6 flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] p-4">
              <Badge value={subject.status} />
              {subject.href ? (
                <Link href={subject.href} className="inline-flex min-h-8 items-center gap-2 rounded-md border border-white/12 px-2.5 text-xs font-semibold text-white hover:bg-white/10">
                  Open
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              ) : null}
            </div>
            <div className="divide-y divide-white/10 rounded-lg border border-white/10 bg-white/[0.04]">
              {subject.rows.map((row) => (
                <div key={row.label} className="grid gap-2 px-4 py-3 sm:grid-cols-[160px_minmax(0,1fr)]">
                  <dt className="text-xs font-semibold uppercase tracking-normal text-slate-400">{row.label}</dt>
                  <dd className="min-w-0 break-all text-sm text-slate-100">{row.value || "Pending"}</dd>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

function DetailRow({ label, value }: { label: string; value: string | number | boolean | null | undefined }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[140px_minmax(0,1fr)]">
      <dt className="text-xs font-semibold uppercase tracking-normal text-slate-500">{label}</dt>
      <dd className="min-w-0 break-words text-xs text-slate-200">{displayValue(value)}</dd>
    </div>
  )
}

function AdapterOperationsPanel({ data, proofSubjects, onProof }: { data: PayrollCommandReadModel; proofSubjects: ProofSubject[]; onProof: (subject: ProofSubject) => void }) {
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
            <h2 className="text-sm font-semibold text-white">Adapter operations</h2>
            <Badge value={data.readiness.adapterOperations.state} />
          </div>
          <p className="mt-1 line-clamp-2 text-xs text-slate-400">{data.readiness.adapterOperations.message}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-xs font-semibold text-slate-200">
            <EyeOff className="h-4 w-4 text-emerald-200" aria-hidden="true" />
            {data.adapterOperations.redaction.policy}
          </span>
          <ProofButton subject={adapterProof} onClick={onProof} />
        </div>
      </div>

      <div className="grid gap-3 border-b border-white/10 p-4 sm:grid-cols-2 xl:grid-cols-6">
        <Metric label="Provider blocked" value={summary.providerBlocked} icon={AlertTriangle} tone="bg-rose-400/12 text-rose-200" />
        <Metric label="Callback lag" value={summary.laggingCallbackProviders} icon={CalendarClock} tone="bg-amber-400/12 text-amber-200" />
        <Metric label="Inbox stale" value={summary.staleProcessingInboxItems} icon={CalendarClock} tone="bg-rose-400/12 text-rose-200" />
        <Metric label="Authority dead-letter" value={summary.authorityDeadLetter} icon={FileText} tone="bg-rose-400/12 text-rose-200" />
        <Metric label="Certification gaps" value={certificationGapCount} icon={ShieldCheck} tone="bg-cyan-400/12 text-cyan-200" />
        <Metric label="Chaos gate" value={summary.adapterChaosGateBlockers} icon={ShieldCheck} tone="bg-amber-400/12 text-amber-200" />
      </div>

      <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
        <div className="min-w-0 rounded-lg border border-white/10 bg-white/[0.04]">
          <div className="border-b border-white/10 px-4 py-3">
            <h3 className="text-sm font-semibold text-white">Provider health</h3>
          </div>
          <div className="divide-y divide-white/10">
            {data.adapterOperations.providerHealth.length ? (
              data.adapterOperations.providerHealth.map((provider) => (
                <div key={provider.providerAccountId} className="space-y-3 px-4 py-3">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <p className="min-w-0 truncate text-sm font-semibold text-white">{provider.displayName}</p>
                    <Badge value={provider.state} />
                    <Badge value={provider.status} />
                  </div>
                  <dl className="grid gap-2 md:grid-cols-2">
                    <DetailRow label="Provider" value={provider.providerCode} />
                    <DetailRow label="Currency" value={provider.currencyCode} />
                    <DetailRow label="Statement" value={dateTimeLabel(provider.latestStatementImportedAt)} />
                    <DetailRow label="Statement hash" value={provider.latestStatementFileHash} />
                    <DetailRow label="Latest event" value={dateTimeLabel(provider.latestProviderEventReceivedAt)} />
                    <DetailRow label="Reconciliation" value={provider.latestReconciliationStatus} />
                    <DetailRow label="Run guard" value={provider.latestReconciliationGuard} />
                    <DetailRow label="Run dedupe key" value={provider.latestReconciliationRunDedupeKey} />
                    <DetailRow label="Dead letters" value={provider.deadLetterInboxCount} />
                    <DetailRow label="Failed inbox" value={provider.failedInboxCount} />
                    <DetailRow label="Processing inbox" value={provider.processingInboxCount} />
                    <DetailRow label="Retry due" value={provider.retryDueInboxCount} />
                    <DetailRow label="Stale processing" value={provider.staleProcessingInboxCount} />
                    <DetailRow label="Replay/tamper" value={provider.replayOrTamperEventCount} />
                    <DetailRow label="Exceptions" value={provider.openExceptionCount} />
                    <DetailRow label="Duplicate risk" value={provider.duplicateRiskCount} />
                    <DetailRow label="Settlement worker" value={provider.settlementWorker.latestAction} />
                    <DetailRow label="Worker source" value={provider.settlementWorker.latestActionSource} />
                    <DetailRow label="Worker action at" value={dateTimeLabel(provider.settlementWorker.latestActionAt)} />
                    <DetailRow label="Worker next retry" value={dateTimeLabel(provider.settlementWorker.nextRetryAt)} />
                    <DetailRow label="Worker error" value={provider.settlementWorker.lastErrorCode} />
                    <DetailRow label="Worker evidence" value={provider.settlementWorker.evidenceRefs.map((ref) => ref.payloadHash).join(", ") || null} />
                  </dl>
                  <div className="flex flex-wrap gap-2">
                    {provider.blockers.length ? provider.blockers.map((blocker) => <Badge key={blocker} value={blocker} />) : <Badge value="READY" />}
                  </div>
                  <p className="break-words text-xs text-slate-300">{provider.nextAction}</p>
                </div>
              ))
            ) : (
              <div className="px-4 py-6 text-sm text-slate-400">No provider accounts returned.</div>
            )}
          </div>
        </div>

        <div className="grid min-w-0 gap-4">
          <div className="rounded-lg border border-white/10 bg-white/[0.04]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
              <h3 className="text-sm font-semibold text-white">Chaos release gate</h3>
              <Badge value={chaosGate.state} />
            </div>
            <div className="space-y-3 px-4 py-3">
              <dl className="grid gap-2">
                <DetailRow label="Authority claims" value={chaosGate.authorityAutomationClaims} />
                <DetailRow label="Provider claims" value={chaosGate.providerAutomationClaims} />
                <DetailRow label="Authority missing" value={chaosGate.missingAuthorityProofCount} />
                <DetailRow label="Provider missing" value={chaosGate.missingProviderProofCount} />
                <DetailRow label="Authority proof" value={chaosGate.latestAuthorityProofHash} />
                <DetailRow label="Provider proof" value={chaosGate.latestProviderProofHash} />
              </dl>
              <div className="flex flex-wrap gap-2">
                {chaosGate.blockerCodes.length ? chaosGate.blockerCodes.map((blocker) => <Badge key={blocker} value={blocker} />) : <Badge value="READY" />}
              </div>
              <p className="break-words text-xs text-slate-300">{chaosGate.nextAction}</p>
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.04]">
            <div className="border-b border-white/10 px-4 py-3">
              <h3 className="text-sm font-semibold text-white">Authority executions</h3>
            </div>
            <div className="divide-y divide-white/10">
              {data.adapterOperations.authorityExecutions.length ? (
                data.adapterOperations.authorityExecutions.map((execution) => (
                  <div key={`${execution.declarationId}-${execution.declarationEvidenceId ?? "pending"}`} className="space-y-3 px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="min-w-0 truncate text-sm font-semibold text-white">{execution.authority} {execution.declarationType}</p>
                      <Badge value={execution.executionStatus ?? execution.status} />
                    </div>
                    <dl className="grid gap-2">
                      <DetailRow label="Adapter" value={execution.authorityAdapterKey} />
                      <DetailRow label="Harness hash" value={execution.authorityCertificationHarnessHash} />
                      <DetailRow label="Proof hash" value={execution.authorityAdapterProofHash} />
                      <DetailRow label="Chaos hash" value={execution.adapterChaosReleaseGateHash} />
                      <DetailRow label="Attempts" value={execution.attempts} />
                      <DetailRow label="Next attempt" value={dateTimeLabel(execution.nextAttemptAt)} />
                      <DetailRow label="Error code" value={execution.errorCode} />
                    </dl>
                    <div className="flex flex-wrap gap-2">
                      {execution.blockers.length ? execution.blockers.map((blocker) => <Badge key={blocker} value={blocker} />) : <Badge value="READY" />}
                    </div>
                    <p className="break-words text-xs text-slate-300">{execution.nextAction}</p>
                  </div>
                ))
              ) : (
                <div className="px-4 py-6 text-sm text-slate-400">No authority executions returned.</div>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.04]">
            <div className="border-b border-white/10 px-4 py-3">
              <h3 className="text-sm font-semibold text-white">Payment adapter gaps</h3>
            </div>
            <div className="divide-y divide-white/10">
              {data.adapterOperations.paymentAdapterGaps.length ? (
                data.adapterOperations.paymentAdapterGaps.map((gap) => (
                  <div key={gap.payrollPaymentBatchId} className="space-y-3 px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="min-w-0 truncate text-sm font-semibold text-white">{gap.batchNumber}</p>
                      <Badge value={gap.status} />
                      <Badge value={gap.paymentAdapterStatus} />
                    </div>
                    <dl className="grid gap-2">
                      <DetailRow label="Method" value={gap.method} />
                      <DetailRow label="Harness hash" value={gap.providerCertificationHarnessHash} />
                      <DetailRow label="Proof hash" value={gap.paymentAdapterProofHash} />
                      <DetailRow label="Chaos hash" value={gap.adapterChaosReleaseGateHash} />
                      <DetailRow label="Contract hash" value={gap.paymentProviderAdapterContractHash} />
                      <DetailRow label="Exception" value={gap.paymentExceptionId} />
                    </dl>
                    <div className="flex flex-wrap gap-2">
                      {gap.blockers.map((blocker) => <Badge key={blocker} value={blocker} />)}
                    </div>
                    <p className="break-words text-xs text-slate-300">{gap.nextAction}</p>
                  </div>
                ))
              ) : (
                <div className="px-4 py-6 text-sm text-slate-400">No payment adapter gaps returned.</div>
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
    return <EmptyState title="Action board" body="No command actions are queued." />
  }

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.05]">
      <div className="border-b border-white/10 px-4 py-3">
        <h2 className="text-sm font-semibold text-white">Action board</h2>
      </div>
      <div className="divide-y divide-white/10">
        {data.nextActions.map((action) => {
          const route = action.href
          return (
            <div key={action.id} className="grid gap-3 px-4 py-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <div className="min-w-0">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-semibold text-white">{action.label}</p>
                  <Badge value={action.priority} />
                </div>
                <p className="mt-1 break-words text-xs text-slate-400">{action.source} / {action.requiredPermission}</p>
                {action.blockedBy.length ? (
                  <p className="mt-2 break-words text-xs text-amber-100">{action.blockedBy.join(", ")}</p>
                ) : null}
              </div>
              {route && action.allowed ? (
                <Link
                  href={localizePath(route, locale)}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-white/12 bg-white/10 px-3 text-sm font-semibold text-white transition hover:bg-white/15"
                >
                  Open
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              ) : route ? (
                <span className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-rose-400/20 bg-rose-400/10 px-3 text-sm font-semibold text-rose-100">
                  <LockKeyhole className="h-4 w-4" aria-hidden="true" />
                  Need access
                </span>
              ) : (
                <span className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 text-sm font-semibold text-amber-100">
                  <LockKeyhole className="h-4 w-4" aria-hidden="true" />
                  Pending route
                </span>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

function BlockerFlow({ data }: { data: PayrollCommandReadModel }) {
  if (!data.blockers.length) {
    return <EmptyState title="Blocker flow" body="No command blockers are queued." />
  }

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.05]">
      <div className="border-b border-white/10 px-4 py-3">
        <h2 className="text-sm font-semibold text-white">Blocker flow</h2>
      </div>
      <div className="divide-y divide-white/10">
        {data.blockers.map((blocker) => (
          <div key={`${blocker.domain}-${blocker.code}`} className="grid gap-3 px-4 py-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <p className="truncate text-sm font-semibold text-white">{blocker.code}</p>
                <Badge value={blocker.severity} />
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

function ReadinessRail({ data }: { data: PayrollCommandReadModel }) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {Object.entries(data.readiness).map(([key, item]) => (
        <div key={key} className="min-h-[118px] rounded-lg border border-white/10 bg-white/[0.05] p-4">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{key}</p>
              <p className="mt-2 line-clamp-2 text-xs text-slate-400">{item.message}</p>
            </div>
            <Badge value={item.state} />
          </div>
        </div>
      ))}
    </section>
  )
}

function ReviewShell({ data, proofSubjects, onProof }: { data: PayrollCommandReadModel; proofSubjects: ProofSubject[]; onProof: (subject: ProofSubject) => void }) {
  const latestRunProof = proofSubjects.find((subject) => subject.id === "latest-run") ?? null

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.05]">
      <div className="border-b border-white/10 px-4 py-3">
        <h2 className="text-sm font-semibold text-white">Run review</h2>
      </div>
      <div className="divide-y divide-white/10">
        {data.workbench.queues.recentRuns.length ? (
          data.workbench.queues.recentRuns.map((run) => (
            <div key={run.id} className="grid gap-3 px-4 py-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)_auto] xl:items-center">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{run.runNumber}</p>
                <p className="mt-1 truncate text-xs text-slate-400">{run.periodName} / {dateLabel(run.payDate)}</p>
              </div>
              <div className="flex min-w-0 flex-wrap gap-2">
                <Badge value={run.status} />
                <Badge value={run.ledgerPostingBatchId ? "LEDGER_EVIDENCE" : "LEDGER_PENDING"} />
                <Badge value={run.postedBusinessEventId ? "EVENT_POSTED" : "EVENT_PENDING"} />
              </div>
              <div className="flex min-w-0 items-center justify-between gap-3 xl:justify-end">
                <div className="min-w-0 text-sm font-semibold text-white">{money(run.netPayableAmount, run.currency)}</div>
                <ProofButton subject={run.id === data.evidence.latestRun?.id ? latestRunProof : null} onClick={onProof} />
              </div>
            </div>
          ))
        ) : (
          <div className="px-4 py-6 text-sm text-slate-400">No payroll runs found.</div>
        )}
      </div>
    </section>
  )
}

function FinanceState({ data, proofSubjects, onProof }: { data: PayrollCommandReadModel; proofSubjects: ProofSubject[]; onProof: (subject: ProofSubject) => void }) {
  const paymentProof = proofSubjects.find((subject) => subject.id === "latest-payment-batch") ?? null
  const declarationProof = proofSubjects.find((subject) => subject.id === "latest-declaration") ?? null
  const closeProof = proofSubjects.find((subject) => subject.id === "close-run") ?? null

  return (
    <section className="grid gap-4 xl:grid-cols-3">
      <div className="rounded-lg border border-white/10 bg-white/[0.05]">
        <div className="border-b border-white/10 px-4 py-3">
          <h2 className="text-sm font-semibold text-white">Payment state</h2>
        </div>
        <div className="space-y-3 p-4">
          <div className="flex flex-wrap gap-2">
            <Badge value={data.evidence.latestPaymentBatch?.status ?? "PENDING"} />
            <Badge value={data.trustedCounts.reconciliationExceptions > 0 ? "ACTION_REQUIRED" : "READY"} />
          </div>
          <p className="text-sm text-slate-300">{data.trustedCounts.currentPeriodPaymentBatches} current-period batch(es)</p>
          <ProofButton subject={paymentProof} onClick={onProof} />
        </div>
      </div>

      <div className="rounded-lg border border-white/10 bg-white/[0.05]">
        <div className="border-b border-white/10 px-4 py-3">
          <h2 className="text-sm font-semibold text-white">Declaration state</h2>
        </div>
        <div className="space-y-3 p-4">
          <div className="flex flex-wrap gap-2">
            <Badge value={data.evidence.latestDeclaration?.status ?? "PENDING"} />
            <Badge value={data.trustedCounts.openDeclarations > 0 ? "ACTION_REQUIRED" : "READY"} />
          </div>
          <p className="text-sm text-slate-300">{data.trustedCounts.currentPeriodDeclarations} current-period declaration(s)</p>
          <ProofButton subject={declarationProof} onClick={onProof} />
        </div>
      </div>

      <div className="rounded-lg border border-white/10 bg-white/[0.05]">
        <div className="border-b border-white/10 px-4 py-3">
          <h2 className="text-sm font-semibold text-white">Close state</h2>
        </div>
        <div className="space-y-3 p-4">
          <div className="flex flex-wrap gap-2">
            <Badge value={data.evidence.closeRun?.status ?? "PENDING"} />
            <Badge value={data.readiness.close.state} />
          </div>
          <p className="text-sm text-slate-300">{data.evidence.closeRun?.readinessScore ?? "n/a"} readiness score</p>
          <ProofButton subject={closeProof} onClick={onProof} />
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

function CountryPackReviewIntakePanel({ data }: { data: PayrollCommandReadModel }) {
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
            <h2 className="text-sm font-semibold text-white">Country-pack review intake</h2>
            <Badge value={existingApproval?.status ?? "MISSING"} />
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
            Proposed country-pack JSON
            <textarea
              aria-label="Proposed country-pack JSON"
              value={proposedPackJson}
              onChange={(event) => setProposedPackJson(event.target.value)}
              className={textareaClass()}
              disabled={isPending}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <label className="text-xs font-semibold text-slate-400">
              Country code
              <input
                aria-label="Country code"
                value={countryCode}
                onChange={(event) => setCountryCode(event.target.value)}
                className={fieldClass()}
                disabled={isPending}
              />
            </label>
            <label className="text-xs font-semibold text-slate-400">
              Base pack version
              <input
                aria-label="Base pack version"
                value={basePackVersion}
                onChange={(event) => setBasePackVersion(event.target.value)}
                className={fieldClass()}
                disabled={isPending}
              />
            </label>
          </div>
        </div>

        <div className="grid gap-3 rounded-lg border border-white/10 bg-black/10 p-3">
          <p className="text-xs font-semibold uppercase tracking-normal text-slate-400">Target families</p>
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
          <p className="text-xs font-semibold uppercase tracking-normal text-slate-400">Review topic evidence</p>
          <div className="grid gap-3">
            {reviewEvidence.map((entry, index) => (
              <div key={entry.topic} className="grid gap-2 rounded-md border border-white/10 bg-white/[0.04] p-3 xl:grid-cols-[minmax(160px,0.8fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,0.8fr)]">
                <label className="text-xs font-semibold text-slate-400">
                  Topic
                  <input
                    aria-label={`Review topic ${index + 1}`}
                    value={entry.topic}
                    onChange={(event) => updateEvidence(index, "topic", event.target.value)}
                    className={fieldClass()}
                    disabled={isPending}
                  />
                </label>
                <label className="text-xs font-semibold text-slate-400">
                  Legal reference
                  <input
                    aria-label={`Legal reference ${index + 1}`}
                    value={entry.legalRef}
                    onChange={(event) => updateEvidence(index, "legalRef", event.target.value)}
                    className={fieldClass()}
                    disabled={isPending}
                  />
                </label>
                <label className="text-xs font-semibold text-slate-400">
                  Evidence hash
                  <input
                    aria-label={`Evidence hash ${index + 1}`}
                    value={entry.sourceEvidenceHash}
                    onChange={(event) => updateEvidence(index, "sourceEvidenceHash", event.target.value)}
                    className={fieldClass()}
                    disabled={isPending}
                  />
                </label>
                <label className="text-xs font-semibold text-slate-400">
                  Reviewer
                  <input
                    aria-label={`Reviewer ${index + 1}`}
                    value={entry.reviewedBy}
                    onChange={(event) => updateEvidence(index, "reviewedBy", event.target.value)}
                    className={fieldClass()}
                    disabled={isPending}
                  />
                </label>
                <label className="text-xs font-semibold text-slate-400">
                  Reviewed on
                  <input
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
            Review certificate hash
            <input
              aria-label="Review certificate hash"
              value={certificateHash}
              onChange={(event) => setCertificateHash(event.target.value)}
              className={fieldClass()}
              disabled={isPending}
            />
          </label>
          <label className="text-xs font-semibold text-slate-400">
            Approval evidence hash
            <input
              aria-label="Approval evidence hash"
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
              Evaluate pack
            </button>
            <button
              type="button"
              disabled={isPending || !proposedPackJson.trim()}
              onClick={recordIntake}
              className="inline-flex min-h-10 items-center gap-2 rounded-md border border-teal-400/30 bg-teal-400/10 px-3 py-2 text-sm font-semibold text-teal-50 transition hover:bg-teal-400/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ShieldCheck className="h-4 w-4" aria-hidden="true" />}
              Record certificate
            </button>
            <button
              type="button"
              disabled={isPending || !certificateHash.trim() || !approvalEvidenceHash.trim()}
              onClick={approveIntake}
              className="inline-flex min-h-10 items-center gap-2 rounded-md border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm font-semibold text-emerald-50 transition hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <LockKeyhole className="h-4 w-4" aria-hidden="true" />}
              Approve certificate
            </button>
          </div>
        </div>

        <CountryPackReviewNoticePanel notice={notice} />
      </div>
    </section>
  )
}

function FinalReleasePanel({ data, proofSubjects, onProof }: { data: PayrollCommandReadModel; proofSubjects: ProofSubject[]; onProof: (subject: ProofSubject) => void }) {
  const finalRelease = data.evidence.finalRelease
  const finalReleaseProof = proofSubjects.find((subject) => subject.id === "final-release") ?? null

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.05]">
      <div className="flex flex-col gap-3 border-b border-white/10 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-teal-200" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-white">Final release readiness</h2>
            <Badge value={finalRelease.decision} />
          </div>
          <p className="mt-1 break-words text-xs text-slate-400">{finalRelease.packHash}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-xs font-semibold text-slate-200">
            <EyeOff className="h-4 w-4 text-emerald-200" aria-hidden="true" />
            {finalRelease.redactionPolicy}
          </span>
          <ProofButton subject={finalReleaseProof} onClick={onProof} />
        </div>
      </div>

      <div className="grid gap-3 border-b border-white/10 p-4 sm:grid-cols-2 xl:grid-cols-7">
        <Metric label="Passing gates" value={`${finalRelease.passGateCount}/${finalRelease.gateCount}`} icon={ShieldCheck} tone="bg-emerald-400/12 text-emerald-200" />
        <Metric label="Blockers" value={finalRelease.blockerCount} icon={AlertTriangle} tone="bg-rose-400/12 text-rose-200" />
        <Metric label="Critical" value={finalRelease.criticalBlockerCount} icon={LockKeyhole} tone="bg-rose-400/12 text-rose-200" />
        <Metric label="Statutory families" value={displayValue(finalRelease.statutorySetup?.families)} icon={FileText} tone="bg-cyan-400/12 text-cyan-200" />
        <Metric label="Review hashes" value={displayValue(finalRelease.statutorySetup?.sourceEvidenceHashCount)} icon={CheckCircle2} tone="bg-teal-400/12 text-teal-200" />
        <Metric label="Review topics" value={displayValue(finalRelease.statutorySetup?.requiredReviewTopicCount)} icon={ClipboardList} tone="bg-sky-400/12 text-sky-200" />
        <Metric label="Pack approval" value={finalRelease.countryPackReviewIntake?.status ?? "Missing"} icon={ShieldCheck} tone="bg-violet-400/12 text-violet-100" />
      </div>

      <div className="divide-y divide-white/10">
        {finalRelease.gates.map((gate) => (
          <div key={gate.key} className="grid gap-3 px-4 py-3 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)_auto] xl:items-center">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{gate.label}</p>
              <p className="mt-1 break-words text-xs text-slate-500">{gate.source}</p>
            </div>
            <div className="min-w-0 break-all text-xs text-slate-300">{gate.evidenceHash ?? "Pending"}</div>
            <div className="flex min-w-0 flex-wrap justify-start gap-2 xl:justify-end">
              <Badge value={gate.status} />
              {gate.blockerCodes.length ? <Badge value={`${gate.blockerCodes.length} blockers`} /> : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
function FreshnessPanel({ data }: { data: PayrollCommandReadModel }) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.05]">
      <div className="border-b border-white/10 px-4 py-3">
        <h2 className="text-sm font-semibold text-white">Freshness</h2>
      </div>
      <div className="grid gap-2 p-4 sm:grid-cols-2 xl:grid-cols-4">
        {data.freshness.map((item) => (
          <div key={item.source} className="min-h-[86px] rounded-lg border border-white/10 bg-white/[0.04] p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="min-w-0 truncate text-xs font-semibold text-white">{item.source}</p>
              <Badge value={item.status} />
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
            <h1 className="text-base font-semibold">Payroll command unavailable</h1>
            <p className="mt-1 break-words text-sm text-rose-100">{error}</p>
          </div>
        </div>
      </section>
    )
  }

  if (!data) {
    return <EmptyState title="Payroll command" body="No payroll command data is available." />
  }

  return (
    <main className="flex min-w-0 flex-col gap-4 text-slate-100">
      <section className="flex flex-col gap-3 border-b border-white/10 pb-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-normal text-cyan-200">Payroll command center</p>
          <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">HR, payroll, evidence, and close control</h1>
          <p className="mt-2 max-w-4xl text-sm text-slate-300">
            As of {dateTimeLabel(data.asOf)}. Current period: {data.currentPeriod?.name ?? "Pending"}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge value={data.redaction.payrollAmounts.mode} />
          <Badge value={data.evidence.pilotCertification.status} />
          <ProofButton subject={pilotProof} onClick={setSelectedProof} />
          <ProofButton subject={periodProof} onClick={setSelectedProof} />
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Active employees" value={data.trustedCounts.activeEmployees} icon={UsersRound} tone="bg-sky-400/12 text-sky-200" />
        <Metric label="Attendance ready" value={data.trustedCounts.attendanceReadyEmployees} icon={CalendarClock} tone="bg-cyan-400/12 text-cyan-200" />
        <Metric label="Payment approved" value={data.trustedCounts.approvedPaymentDestinations} icon={Banknote} tone="bg-emerald-400/12 text-emerald-200" />
        <Metric label="Ledger blockers" value={data.trustedCounts.ledgerBlockers} icon={LockKeyhole} tone="bg-rose-400/12 text-rose-200" />
        <Metric label="Current runs" value={data.trustedCounts.currentPeriodRuns} icon={ReceiptText} tone="bg-violet-400/12 text-violet-200" />
        <Metric label="Open declarations" value={data.trustedCounts.openDeclarations} icon={FileText} tone="bg-amber-400/12 text-amber-200" />
        <Metric label="Next actions" value={data.nextActions.length} icon={ClipboardList} tone="bg-slate-400/12 text-slate-200" />
        <Metric label="Pilot cert" value={pilotStatusLabel(data.evidence.pilotCertification.status)} icon={ShieldCheck} tone="bg-teal-400/12 text-teal-200" />
        <Metric label="Final release" value={data.evidence.finalRelease.decision === "READY_FOR_FULL_PRODUCTION_APPROVAL" ? "Ready" : "Not ready"} icon={ShieldCheck} tone="bg-cyan-400/12 text-cyan-200" />
        <Metric label="Proof subjects" value={proofSubjects.length} icon={ShieldCheck} tone="bg-slate-400/12 text-slate-200" />
      </section>

      <ReadinessRail data={data} />
      <PayrollPilotCertificationPanel data={data} />

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <BlockerFlow data={data} />
        <ActionBoard data={data} locale={locale} />
      </section>

      <ReviewShell data={data} proofSubjects={proofSubjects} onProof={setSelectedProof} />
      <FinanceState data={data} proofSubjects={proofSubjects} onProof={setSelectedProof} />
      <FinalReleasePanel data={data} proofSubjects={proofSubjects} onProof={setSelectedProof} />
      <CountryPackReviewIntakePanel data={data} />
      <AdapterOperationsPanel data={data} proofSubjects={proofSubjects} onProof={setSelectedProof} />
      <FreshnessPanel data={data} />

      <ProofDrawer subject={selectedProof} open={Boolean(selectedProof)} onOpenChange={(open) => { if (!open) setSelectedProof(null) }} />
    </main>
  )
}
