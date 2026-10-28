import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  BadgeCheck,
  Banknote,
  Calculator,
  FileCheck2,
  FileText,
  Fingerprint,
  Landmark,
  ReceiptText,
  RotateCcw,
} from "lucide-react";

import type { PayrollRunWorkbenchResult } from "@/actions/payroll/payroll-control.actions";
import { localizePath } from "@/i18n/routing";
import type { Locale } from "@/types/bilingual";
import PayrollProofDrawerButton, {
  type PayrollProofDrawerSubject,
} from "./PayrollProofDrawerButton";
import PayrollRunActionPanel from "./PayrollRunActionPanel";

type Props = {
  data: PayrollRunWorkbenchResult | null;
  error?: string | null;
  locale: Locale;
};

type RunRow = PayrollRunWorkbenchResult["runs"][number];
type WorkbenchRedaction = PayrollRunWorkbenchResult["redaction"];

function tone(value: string | null | undefined) {
  const normalized = (value ?? "").toUpperCase();
  if (
    ["POSTED", "PAID", "ARCHIVED", "SETTLED", "RECONCILED", "READY"].includes(
      normalized,
    )
  ) {
    return "border-emerald-400/30 bg-emerald-400/10 text-emerald-100";
  }
  if (
    [
      "DRAFT",
      "CALCULATED",
      "REVIEWED",
      "APPROVED",
      "EMITTED",
      "PREPARED",
      "RELEASED",
      "MEDIUM",
    ].includes(normalized)
  ) {
    return "border-amber-400/30 bg-amber-400/10 text-amber-100";
  }
  if (
    ["FAILED", "REJECTED", "CANCELLED", "CRITICAL", "HIGH", "BLOCKED"].includes(
      normalized,
    )
  ) {
    return "border-rose-400/30 bg-rose-400/10 text-rose-100";
  }
  return "border-slate-400/30 bg-slate-400/10 text-slate-100";
}

function Badge({ value }: { value: string | null | undefined }) {
  return (
    <span
      className={`inline-flex min-h-7 max-w-full items-center rounded-md border px-2.5 py-1 text-xs font-semibold ${tone(value)}`}
    >
      <span className="truncate">{value ?? "Pending"}</span>
    </span>
  );
}

function dateLabel(value: string | null | undefined) {
  if (!value) return "Pending";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

function Metric({
  label,
  value,
  icon: Icon,
  toneClass,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  toneClass: string;
}) {
  return (
    <div className="min-h-[104px] rounded-lg border border-white/10 bg-white/[0.05] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-normal text-slate-400">
            {label}
          </p>
          <p className="mt-2 break-words text-2xl font-bold text-white">
            {value}
          </p>
        </div>
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${toneClass}`}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
    </div>
  );
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <section className="rounded-lg border border-rose-400/30 bg-rose-950/30 p-5 text-rose-50">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <div className="min-w-0">
          <h1 className="text-base font-semibold">Payroll runs unavailable</h1>
          <p className="mt-1 break-words text-sm text-rose-100">{message}</p>
        </div>
      </div>
    </section>
  );
}

function EmptyState() {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.05] p-5 text-slate-200">
      <h1 className="text-base font-semibold text-white">Payroll runs</h1>
      <p className="mt-1 text-sm text-slate-400">
        No payroll runs are available for the selected scope.
      </p>
    </section>
  );
}

function ProofList({ run }: { run: RunRow }) {
  const rows = [
    ["Calculation", run.proof.calculationHash],
    ["Attendance", run.proof.attendanceSnapshotHash],
    ["Document", run.proof.documentHash],
    ["Evidence", run.proof.evidenceHash],
    ...(run.correction.correctionRun
      ? [
          ["Original document", run.correction.originalRunDocumentHash],
          ["Original evidence", run.correction.originalRunEvidenceHash],
          ["Original calculation", run.correction.originalCalculationHash],
          ["Correction evidence", run.correction.correctionEvidenceHash],
        ]
      : []),
    ["Component register", run.proof.componentRegisterProofHash],
    ["Component mapping", run.proof.payrollComponentMappingHash],
    ["Ledger batch", run.accounting.ledgerPostingBatchId],
    ["Journal", run.accounting.journalEntryId],
    ["Source link", run.accounting.accountingSourceLinkId],
  ];

  return (
    <div className="grid gap-2">
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="grid gap-1 rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 sm:grid-cols-[135px_minmax(0,1fr)]"
        >
          <span className="text-xs font-semibold uppercase tracking-normal text-slate-500">
            {label}
          </span>
          <span className="min-w-0 break-all text-xs text-slate-200">
            {value || "Pending"}
          </span>
        </div>
      ))}
    </div>
  );
}

function runProofSubject(
  run: RunRow,
  locale: Locale,
  redaction: WorkbenchRedaction,
): PayrollProofDrawerSubject {
  const amountRedacted = Object.values(run.amounts).some((value) =>
    String(value).includes("[REDACTED"),
  );
  const correctionProofRedacted =
    run.correction.correctionRun && !redaction.correctionProofIdentifiers.allowed;

  return {
    id: `payroll-run:${run.id}`,
    label: run.runNumber,
    status: run.status,
    source: "services/payroll/payroll-control.service.ts",
    href: localizePath("/dashboard/payroll/register", locale),
    blockers: run.blockers,
    redactions: [
      ...(amountRedacted
        ? [
            {
              field: "payroll.personLevelAmounts",
              reason:
                "Run proof drawer uses service-redacted aggregate amounts only.",
              policy: redaction.payrollAmounts.policy,
            },
          ]
        : []),
      ...(correctionProofRedacted
        ? [
            {
              field: "payroll.correctionProofIdentifiers",
              reason:
                "Correction proof identifiers are service-redacted until salary or payroll evidence permissions allow access.",
              policy: redaction.correctionProofIdentifiers.policy,
            },
          ]
        : []),
    ],
    rows: [
      { label: "Run type", value: run.runType },
      { label: "Version", value: `v${run.version}` },
      { label: "Period", value: run.period.name },
      { label: "Period status", value: run.period.status },
      { label: "Pay date", value: run.period.payDate },
      {
        label: "Gross amount",
        value: `${run.amounts.grossAmount} ${run.amounts.currency}`,
      },
      {
        label: "Net payable",
        value: `${run.amounts.netPayableAmount} ${run.amounts.currency}`,
      },
      {
        label: "Employer charge",
        value: `${run.amounts.employerChargeAmount} ${run.amounts.currency}`,
      },
      { label: "Calculation hash", value: run.proof.calculationHash },
      { label: "Attendance hash", value: run.proof.attendanceSnapshotHash },
      { label: "Document hash", value: run.proof.documentHash },
      { label: "Evidence hash", value: run.proof.evidenceHash },
      ...(run.correction.correctionRun
        ? [
            {
              label: "Original run",
              value:
                run.correction.originalRunNumber ?? run.correction.originalRunId,
            },
            {
              label: "Original document hash",
              value: run.correction.originalRunDocumentHash,
            },
            {
              label: "Original evidence hash",
              value: run.correction.originalRunEvidenceHash,
            },
            {
              label: "Original calculation hash",
              value: run.correction.originalCalculationHash,
            },
            {
              label: "Correction evidence hash",
              value: run.correction.correctionEvidenceHash,
            },
          ]
        : []),
      {
        label: "Component register hash",
        value: run.proof.componentRegisterProofHash,
      },
      {
        label: "Component mapping hash",
        value: run.proof.payrollComponentMappingHash,
      },
      {
        label: "Country pack hash",
        value: run.country.countryPackResolutionHash,
      },
      { label: "Rule set hash", value: run.country.ruleSetHash },
      { label: "Ledger batch", value: run.accounting.ledgerPostingBatchId },
      { label: "Journal entry", value: run.accounting.journalEntryId },
      { label: "Source link", value: run.accounting.accountingSourceLinkId },
      { label: "Posted event", value: run.accounting.postedBusinessEventId },
      { label: "Register lines", value: run.counts.lines },
      { label: "Payslips", value: run.counts.payslips },
      { label: "Declarations", value: run.counts.declarations },
      { label: "Payment batches", value: run.counts.paymentBatches },
      { label: "Approved at", value: run.proof.approvedAt },
      { label: "Posted at", value: run.proof.postedAt },
    ],
  };
}
function LinkedFacts({ run, locale }: { run: RunRow; locale: Locale }) {
  return (
    <div className="grid gap-2 text-xs text-slate-200">
      <div className="rounded-md border border-white/10 bg-white/[0.04] p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge value={`${run.counts.payslips} payslips`} />
          <Badge value={`${run.counts.declarations} declarations`} />
          <Badge value={`${run.counts.paymentBatches} payments`} />
          <Badge value={`${run.counts.employeeBalanceCases} balance cases`} />
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Link
          href={localizePath("/dashboard/payroll/register", locale)}
          className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 font-semibold text-white hover:bg-white/10"
        >
          Register
        </Link>
        <Link
          href={localizePath("/dashboard/payroll/declarations", locale)}
          className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 font-semibold text-white hover:bg-white/10"
        >
          Declarations
        </Link>
        <Link
          href={localizePath("/dashboard/payroll/payments", locale)}
          className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 font-semibold text-white hover:bg-white/10"
        >
          Payments
        </Link>
        <Link
          href={localizePath("/dashboard/accounting/close", locale)}
          className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 font-semibold text-white hover:bg-white/10"
        >
          Close
        </Link>
      </div>
    </div>
  );
}

function Blockers({ run }: { run: RunRow }) {
  if (!run.blockers.length) {
    return (
      <p className="text-xs text-emerald-100">No run blocker is visible.</p>
    );
  }

  return (
    <div className="grid gap-2">
      {run.blockers.map((blocker) => (
        <div
          key={`${run.id}-${blocker.id}`}
          className="rounded-md border border-amber-400/20 bg-amber-400/10 p-3 text-xs text-amber-50"
        >
          <div className="flex flex-wrap items-center gap-2">
            <Badge value={blocker.severity} />
            <p className="font-semibold text-white">{blocker.title}</p>
          </div>
          <p className="mt-2 text-amber-100">{blocker.detail}</p>
          <p className="mt-2 text-amber-200">{blocker.nextAction}</p>
        </div>
      ))}
    </div>
  );
}

function NextActions({
  run,
  locale,
  paymentRequesterCandidates,
}: {
  run: RunRow;
  locale: Locale;
  paymentRequesterCandidates: PayrollRunWorkbenchResult["paymentRequesterCandidates"];
}) {
  if (!run.nextActions.length) return <Badge value="No manual action" />;

  return (
    <div className="grid gap-2">
      {run.nextActions.map((action) => (
        <div
          key={action.id}
          className="rounded-md border border-white/10 bg-white/[0.04] p-3 text-xs"
        >
          <p className="font-semibold text-white">{action.label}</p>
          <p className="mt-1 text-slate-400">{action.requiredPermission}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {action.requiresFreshAuth ? <Badge value="Fresh auth" /> : null}
            {action.requiresSeparateApprover ? (
              <Badge value="Maker-checker" />
            ) : null}
            {action.href ? (
              <Link
                href={localizePath(action.href, locale)}
                className="inline-flex min-h-7 items-center rounded-md border border-white/12 px-2 text-xs font-semibold text-white hover:bg-white/10"
              >
                Open
              </Link>
            ) : null}
          </div>
          <PayrollRunActionPanel
            run={run}
            action={action}
            paymentRequesterCandidates={paymentRequesterCandidates}
          />
        </div>
      ))}
    </div>
  );
}

function RelatedItems({ run }: { run: RunRow }) {
  const declarations = run.declarations.slice(0, 2);
  const payments = run.paymentBatches.slice(0, 2);

  return (
    <div className="grid gap-2">
      {declarations.map((declaration) => (
        <div
          key={declaration.id}
          className="rounded-md border border-white/10 bg-white/[0.04] p-3 text-xs"
        >
          <div className="flex flex-wrap items-center gap-2">
            <Badge value={declaration.status} />
            <span className="font-semibold text-white">
              {declaration.authority}
            </span>
          </div>
          <p className="mt-2 break-words text-slate-300">
            {declaration.declarationType}
          </p>
          <p className="mt-1 break-all text-slate-500">
            {declaration.sourceRegisterHash ||
              declaration.payloadHash ||
              "Declaration proof pending"}
          </p>
        </div>
      ))}
      {payments.map((batch) => (
        <div
          key={batch.id}
          className="rounded-md border border-white/10 bg-white/[0.04] p-3 text-xs"
        >
          <div className="flex flex-wrap items-center gap-2">
            <Badge value={batch.status} />
            <span className="font-semibold text-white">
              {batch.batchNumber}
            </span>
          </div>
          <p className="mt-2 text-slate-300">
            {batch.amount} {batch.currency}
          </p>
          <p className="mt-1 break-all text-slate-500">
            {batch.latestSettlementSourceRegisterHash ||
              batch.evidenceHash ||
              "Payment proof pending"}
          </p>
        </div>
      ))}
      {!declarations.length && !payments.length ? (
        <p className="text-xs text-slate-500">
          No related declaration or payment rows are attached yet.
        </p>
      ) : null}
    </div>
  );
}

export default function PayrollRunWorkbench({ data, error, locale }: Props) {
  if (error) return <ErrorPanel message={error} />;
  if (!data) return <EmptyState />;

  return (
    <main className="flex min-w-0 flex-col gap-4 text-slate-100">
      <section className="flex flex-col gap-3 border-b border-white/10 pb-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-normal text-cyan-200">
            Payroll runs
          </p>
          <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
            Run lifecycle workbench
          </h1>
          <p className="mt-2 max-w-4xl text-sm text-slate-300">
            Calculation state, locked register proof, correction history,
            accounting posting proof, payments, declarations, and close blockers
            as of {dateLabel(data.asOf)}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge
            value={data.summary.blockedRuns > 0 ? "ACTION_REQUIRED" : "READY"}
          />
          <Badge value={data.redaction.payrollAmounts.mode} />
          <Link
            href={localizePath("/dashboard/payroll/register", locale)}
            className="inline-flex min-h-9 items-center justify-center rounded-lg border border-white/12 bg-white/10 px-3 text-sm font-semibold text-white transition hover:bg-white/15"
          >
            Register
          </Link>
          <Link
            href={localizePath("/dashboard/payroll/declarations", locale)}
            className="inline-flex min-h-9 items-center justify-center rounded-lg border border-white/12 bg-white/10 px-3 text-sm font-semibold text-white transition hover:bg-white/15"
          >
            Declarations
          </Link>
          <Link
            href={localizePath("/dashboard/payroll/payments", locale)}
            className="inline-flex min-h-9 items-center justify-center rounded-lg border border-white/12 bg-white/10 px-3 text-sm font-semibold text-white transition hover:bg-white/15"
          >
            Payments
          </Link>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Metric
          label="Runs"
          value={data.summary.totalRuns}
          icon={Calculator}
          toneClass="bg-cyan-400/12 text-cyan-200"
        />
        <Metric
          label="Active"
          value={data.summary.activeRuns}
          icon={ReceiptText}
          toneClass="bg-amber-400/12 text-amber-200"
        />
        <Metric
          label="Posted"
          value={data.summary.postedRuns}
          icon={FileCheck2}
          toneClass="bg-emerald-400/12 text-emerald-200"
        />
        <Metric
          label="Corrections"
          value={data.summary.correctionRuns}
          icon={RotateCcw}
          toneClass="bg-violet-400/12 text-violet-200"
        />
        <Metric
          label="Blocked"
          value={data.summary.blockedRuns}
          icon={AlertTriangle}
          toneClass="bg-rose-400/12 text-rose-200"
        />
        <Metric
          label="Net payable"
          value={data.summary.netPayableInScope}
          icon={Banknote}
          toneClass="bg-sky-400/12 text-sky-200"
        />
      </section>

      <section className="rounded-lg border border-white/10 bg-white/[0.05]">
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
          <BadgeCheck className="h-4 w-4 text-cyan-200" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-white">Run lifecycle</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[1680px] w-full table-fixed border-collapse text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase tracking-normal text-slate-400">
              <tr>
                <th className="w-[230px] px-4 py-3 font-semibold">Run</th>
                <th className="w-[210px] px-4 py-3 font-semibold">Period</th>
                <th className="w-[180px] px-4 py-3 font-semibold">Amounts</th>
                <th className="w-[320px] px-4 py-3 font-semibold">Proof</th>
                <th className="w-[250px] px-4 py-3 font-semibold">
                  Linked facts
                </th>
                <th className="w-[280px] px-4 py-3 font-semibold">
                  Related evidence
                </th>
                <th className="w-[260px] px-4 py-3 font-semibold">Blockers</th>
                <th className="w-[240px] px-4 py-3 font-semibold">
                  Next action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {data.runs.length ? (
                data.runs.map((run) => (
                  <tr key={run.id} className="align-top">
                    <td className="px-4 py-3">
                      <p className="break-words font-semibold text-white">
                        {run.runNumber}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge value={run.status} />
                        <Badge value={run.runType} />
                        <Badge value={`v${run.version}`} />
                      </div>
                      {run.correction.correctionRun ? (
                        <p className="mt-2 break-words text-xs text-slate-400">
                          Correction of{" "}
                          {run.correction.originalRunNumber ??
                            run.correction.originalRunId ??
                            "pending original run"}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <p className="break-words font-semibold text-white">
                        {run.period.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {dateLabel(run.period.periodStart)} to{" "}
                        {dateLabel(run.period.periodEnd)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Pay {dateLabel(run.period.payDate)}
                      </p>
                      <div className="mt-2">
                        <Badge value={run.period.status} />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-white">
                        {run.amounts.netPayableAmount} {run.amounts.currency}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        Gross {run.amounts.grossAmount}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        Employer {run.amounts.employerChargeAmount}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <ProofList run={run} />
                      <div className="mt-3">
                        <PayrollProofDrawerButton
                          subject={runProofSubject(
                            run,
                            locale,
                            data.redaction,
                          )}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <LinkedFacts run={run} locale={locale} />
                    </td>
                    <td className="px-4 py-3">
                      <RelatedItems run={run} />
                    </td>
                    <td className="px-4 py-3">
                      <Blockers run={run} />
                    </td>
                    <td className="px-4 py-3">
                      <NextActions
                        run={run}
                        locale={locale}
                        paymentRequesterCandidates={
                          data.paymentRequesterCandidates
                        }
                      />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-6 text-sm text-slate-400" colSpan={8}>
                    No payroll runs match this scope.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border border-white/10 bg-white/[0.05] p-4">
        <div className="flex items-center gap-2">
          <Fingerprint className="h-4 w-4 text-cyan-200" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-white">Source scope</h2>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-4">
          <div className="rounded-md border border-white/10 bg-white/[0.04] p-3">
            <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">
              Limit
            </p>
            <p className="mt-1 text-sm text-slate-100">
              {data.sourceScope.limit}
            </p>
          </div>
          <div className="rounded-md border border-white/10 bg-white/[0.04] p-3">
            <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">
              Returned
            </p>
            <p className="mt-1 text-sm text-slate-100">
              {data.sourceScope.returned}
            </p>
          </div>
          <div className="rounded-md border border-white/10 bg-white/[0.04] p-3">
            <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">
              Coverage
            </p>
            <p className="mt-1 text-sm text-slate-100">
              {data.sourceScope.coverageComplete ? "Complete" : "Limited"}
            </p>
          </div>
          <div className="rounded-md border border-white/10 bg-white/[0.04] p-3">
            <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">
              Service
            </p>
            <p className="mt-1 break-all text-sm text-slate-100">
              {data.sourceScope.sourceService}
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
