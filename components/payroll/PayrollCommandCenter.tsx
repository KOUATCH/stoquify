"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
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
import type { Locale } from "@/types/bilingual"

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

function stateTone(value: string | null | undefined) {
  const normalized = (value ?? "").toUpperCase()
  if (["READY", "POSTED", "PAID", "SETTLED", "ACCEPTED", "RELEASED", "FRESH", "CERTIFIED"].includes(normalized)) {
    return "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
  }
  if (["BLOCKED", "FAILED", "REJECTED", "CANCELLED", "CRITICAL", "STALE", "REDACT"].includes(normalized)) {
    return "border-rose-400/30 bg-rose-400/10 text-rose-100"
  }
  if (["ACTION_REQUIRED", "PREPARED", "CALCULATED", "REVIEWED", "DRAFT", "UNKNOWN", "MASK"].includes(normalized)) {
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

function routeForAction(source: string) {
  if (source === "payroll.payment_reconciliation") return "/dashboard/finance/reconciliation"
  if (source === "payroll.payments") return "/dashboard/finance/payments"
  if (source === "accounting.close_assurance") return "/dashboard/accounting/close"
  return null
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
          const route = routeForAction(action.source)
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
              {route ? (
                <Link
                  href={localizePath(route, locale)}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-white/12 bg-white/10 px-3 text-sm font-semibold text-white transition hover:bg-white/15"
                >
                  Open
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              ) : (
                <span className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 text-sm font-semibold text-amber-100">
                  <LockKeyhole className="h-4 w-4" aria-hidden="true" />
                  Blocked
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
        <Metric label="Proof subjects" value={proofSubjects.length} icon={ShieldCheck} tone="bg-teal-400/12 text-teal-200" />
      </section>

      <ReadinessRail data={data} />

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <BlockerFlow data={data} />
        <ActionBoard data={data} locale={locale} />
      </section>

      <ReviewShell data={data} proofSubjects={proofSubjects} onProof={setSelectedProof} />
      <FinanceState data={data} proofSubjects={proofSubjects} onProof={setSelectedProof} />
      <FreshnessPanel data={data} />

      <ProofDrawer subject={selectedProof} open={Boolean(selectedProof)} onOpenChange={(open) => { if (!open) setSelectedProof(null) }} />
    </main>
  )
}
