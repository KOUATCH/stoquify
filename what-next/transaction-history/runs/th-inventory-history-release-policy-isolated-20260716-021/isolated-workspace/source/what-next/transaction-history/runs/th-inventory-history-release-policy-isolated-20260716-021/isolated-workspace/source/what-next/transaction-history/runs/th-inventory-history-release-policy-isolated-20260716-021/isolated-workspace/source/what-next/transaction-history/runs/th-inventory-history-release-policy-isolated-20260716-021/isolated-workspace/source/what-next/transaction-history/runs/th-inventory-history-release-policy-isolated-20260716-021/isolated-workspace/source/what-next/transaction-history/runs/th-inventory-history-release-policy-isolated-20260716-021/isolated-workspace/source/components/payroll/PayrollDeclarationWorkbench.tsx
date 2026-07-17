import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  BadgeCheck,
  FileText,
  Fingerprint,
  Landmark,
  ReceiptText,
  ShieldCheck,
} from "lucide-react";

import type { PayrollDeclarationWorkbenchResult } from "@/actions/payroll/payroll-control.actions";
import { localizePath } from "@/i18n/routing";
import type { Locale } from "@/types/bilingual";
import PayrollDeclarationAuthorityExecutionPanel from "./PayrollDeclarationAuthorityExecutionPanel";
import PayrollProofDrawerButton, {
  type PayrollProofDrawerSubject,
} from "./PayrollProofDrawerButton";

type Props = {
  data: PayrollDeclarationWorkbenchResult | null;
  error?: string | null;
  locale: Locale;
};

type DeclarationRow = PayrollDeclarationWorkbenchResult["declarations"][number];
type WorkbenchRedaction = PayrollDeclarationWorkbenchResult["redaction"];

function statusTone(value: string | null | undefined) {
  const normalized = (value ?? "").toUpperCase();
  if (
    [
      "ACCEPTED",
      "PAID",
      "RECONCILED",
      "ARCHIVED",
      "READY",
      "SUPPORTED_CERTIFIED",
    ].includes(normalized)
  ) {
    return "border-emerald-400/30 bg-emerald-400/10 text-emerald-100";
  }
  if (
    [
      "PREPARED",
      "SUBMITTED",
      "PAYMENT_DUE",
      "AUTOMATION_BLOCKED",
      "EVIDENCE_PENDING",
    ].includes(normalized)
  ) {
    return "border-amber-400/30 bg-amber-400/10 text-amber-100";
  }
  if (["REJECTED", "BLOCKED", "CRITICAL"].includes(normalized)) {
    return "border-rose-400/30 bg-rose-400/10 text-rose-100";
  }
  return "border-slate-400/30 bg-slate-400/10 text-slate-100";
}

function Badge({ value }: { value: string | null | undefined }) {
  return (
    <span
      className={`inline-flex min-h-7 max-w-full items-center rounded-md border px-2.5 py-1 text-xs font-semibold ${statusTone(value)}`}
    >
      <span className="truncate">{value ?? "Pending"}</span>
    </span>
  );
}

function dateLabel(value: string | null | undefined) {
  if (!value) return "Open";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

function Metric({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone: string;
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
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tone}`}
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
          <h1 className="text-base font-semibold">
            Payroll declarations unavailable
          </h1>
          <p className="mt-1 break-words text-sm text-rose-100">{message}</p>
        </div>
      </div>
    </section>
  );
}

function EmptyState() {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.05] p-5 text-slate-200">
      <h1 className="text-base font-semibold text-white">
        Payroll declarations
      </h1>
      <p className="mt-1 text-sm text-slate-400">
        No payroll declarations are available for the selected scope.
      </p>
    </section>
  );
}

function ProofList({ declaration }: { declaration: DeclarationRow }) {
  const rows = [
    ["Payload", declaration.proof.payloadHash],
    ["Country pack", declaration.proof.countryPackResolutionHash],
    ["Latest evidence", declaration.proof.latestEvidenceHash],
    ["Register", declaration.proof.sourceRegisterHash],
    ["Receipt", declaration.proof.portalReceiptHash],
    ["Authority response", declaration.proof.authorityResponseHash],
  ];

  return (
    <div className="grid gap-2">
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="grid gap-1 rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 sm:grid-cols-[120px_minmax(0,1fr)]"
        >
          <span className="text-xs font-semibold uppercase tracking-normal text-slate-500">
            {label}
          </span>
          <span className="min-w-0 break-all text-xs text-slate-200">
            {value || "Pending"}
          </span>
        </div>
      ))}
      {declaration.proof.latestTransition ? (
        <div className="rounded-md border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-xs text-cyan-100">
          {declaration.proof.latestTransition} /{" "}
          {declaration.proof.latestAuthorityStatus ?? "status pending"} /{" "}
          {dateLabel(declaration.proof.latestEvidenceCapturedAt)}
        </div>
      ) : null}
    </div>
  );
}

function declarationProofSubject(
  declaration: DeclarationRow,
  locale: Locale,
  redaction: WorkbenchRedaction,
): PayrollProofDrawerSubject {
  const historyRows = declaration.proof.history.flatMap((entry, index) => [
    {
      label: `History ${index + 1}`,
      value: `${entry.previousStatus} -> ${entry.nextStatus}`,
    },
    { label: `History ${index + 1} evidence`, value: entry.evidenceHash },
    { label: `History ${index + 1} register`, value: entry.sourceRegisterHash },
  ]);
  const actionRows = declaration.nextActions.flatMap((action, index) => [
    { label: `Action ${index + 1}`, value: action.label },
    {
      label: `Action ${index + 1} permission`,
      value: action.requiredPermission,
    },
    {
      label: `Action ${index + 1} fresh auth`,
      value: action.requiresFreshAuth,
    },
    {
      label: `Action ${index + 1} maker-checker`,
      value: action.requiresSeparateApprover,
    },
    { label: `Action ${index + 1} next status`, value: action.nextStatus },
  ]);
  const proofIdentifiersRedacted = !redaction.proofIdentifiers.allowed;

  return {
    id: `payroll-declaration:${declaration.id}`,
    label: `${declaration.authority} ${declaration.declarationType}`,
    status: declaration.status,
    source: "services/payroll/declaration-lifecycle.service.ts",
    href: localizePath("/dashboard/payroll/declarations", locale),
    blockers: declaration.blockers,
    redactions: [
      {
        field: "declaration.authorityPayload",
        reason:
          "Declaration proof drawer shows hashes and statuses only; authority payload bodies stay in declaration evidence storage.",
        policy: "kontava-payroll-declaration-evidence-redaction-policy",
      },
      ...(proofIdentifiersRedacted
        ? [
            {
              field: "declaration.proofIdentifiers",
              reason:
                "Declaration proof identifiers are service-redacted until accounting, payment reconciliation, or close proof permissions allow access.",
              policy: redaction.proofIdentifiers.policy,
            },
          ]
        : []),
    ],
    rows: [
      { label: "Authority", value: declaration.authority },
      { label: "Declaration type", value: declaration.declarationType },
      {
        label: "Amount",
        value: `${declaration.amount} ${declaration.currency}`,
      },
      { label: "Period start", value: declaration.periodStart },
      { label: "Period end", value: declaration.periodEnd },
      { label: "Due date", value: declaration.dueDate },
      { label: "Run", value: declaration.payrollRun.runNumber },
      { label: "Run status", value: declaration.payrollRun.status },
      { label: "Run evidence", value: declaration.payrollRun.evidenceHash },
      { label: "Run document", value: declaration.payrollRun.documentHash },
      {
        label: "Ledger batch",
        value: declaration.payrollRun.ledgerPostingBatchId,
      },
      { label: "Journal", value: declaration.payrollRun.journalEntryId },
      {
        label: "Source link",
        value: declaration.payrollRun.accountingSourceLinkId,
      },
      { label: "Country", value: declaration.country.countryCode },
      { label: "Country pack", value: declaration.country.countryPackVersion },
      {
        label: "Country pack hash",
        value: declaration.country.countryPackResolutionHash,
      },
      { label: "Payload hash", value: declaration.proof.payloadHash },
      {
        label: "Submitted payload",
        value: declaration.proof.submittedPayloadHash,
      },
      { label: "Latest evidence", value: declaration.proof.latestEvidenceHash },
      { label: "Source register", value: declaration.proof.sourceRegisterHash },
      {
        label: "Register proof present",
        value: declaration.proof.sourceRegisterProofPresent,
      },
      { label: "Receipt", value: declaration.proof.portalReceiptHash },
      {
        label: "Authority response",
        value: declaration.proof.authorityResponseHash,
      },
      {
        label: "Authority reference",
        value: declaration.proof.latestAuthorityReference,
      },
      {
        label: "Authority channel",
        value: declaration.proof.latestAuthorityChannel,
      },
      {
        label: "Authority environment",
        value: declaration.proof.latestAuthorityEnvironment,
      },
      {
        label: "Automation status",
        value: declaration.automation.automationCapabilityStatus,
      },
      {
        label: "Production adapter",
        value: declaration.automation.productionSubmissionSupported,
      },
      {
        label: "Manual workflow",
        value: declaration.automation.manualAuthorityWorkflowOnly,
      },
      {
        label: "Adapter enqueue gate",
        value: declaration.adapterExecution.canEnqueue ? "READY" : "BLOCKED",
      },
      {
        label: "Adapter enqueue status",
        value: declaration.adapterExecution.status,
      },
      {
        label: "Adapter enqueue evidence",
        value: declaration.adapterExecution.queuedEvidenceId,
      },
      {
        label: "Adapter enqueue correlation",
        value: declaration.adapterExecution.correlationId,
      },
      ...historyRows,
      ...actionRows,
    ],
  };
}
function Blockers({ declaration }: { declaration: DeclarationRow }) {
  if (!declaration.blockers.length) {
    return (
      <p className="text-xs text-emerald-100">
        No declaration blocker is visible.
      </p>
    );
  }

  return (
    <div className="grid gap-2">
      {declaration.blockers.map((blocker) => (
        <div
          key={blocker.id}
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

function NextActions({ declaration }: { declaration: DeclarationRow }) {
  const manualActions = declaration.nextActions.length ? (
    <div className="flex flex-col gap-2">
      {declaration.nextActions.map((action) => (
        <div
          key={action.id}
          className="rounded-md border border-white/10 bg-white/[0.04] p-3"
        >
          <p className="text-xs font-semibold text-white">{action.label}</p>
          <p className="mt-1 text-xs text-slate-400">
            {action.requiredPermission}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {action.requiresFreshAuth ? <Badge value="Fresh auth" /> : null}
            {action.requiresSeparateApprover ? (
              <Badge value="Maker-checker" />
            ) : null}
            {action.nextStatus ? <Badge value={action.nextStatus} /> : null}
          </div>
        </div>
      ))}
    </div>
  ) : (
    <Badge value="No manual action" />
  );

  return (
    <div className="flex flex-col gap-2">
      {manualActions}
      <PayrollDeclarationAuthorityExecutionPanel declaration={declaration} />
    </div>
  );
}

export default function PayrollDeclarationWorkbench({
  data,
  error,
  locale,
}: Props) {
  if (error) return <ErrorPanel message={error} />;
  if (!data) return <EmptyState />;

  return (
    <main className="flex min-w-0 flex-col gap-4 text-slate-100">
      <section className="flex flex-col gap-3 border-b border-white/10 pb-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-normal text-cyan-200">
            Payroll declarations
          </p>
          <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
            Declaration evidence workbench
          </h1>
          <p className="mt-2 max-w-4xl text-sm text-slate-300">
            Manual authority lifecycle, source register proof, adapter
            readiness, and close-impact blockers as of {dateLabel(data.asOf)}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge
            value={
              data.summary.blockedDeclarations > 0 ? "ACTION_REQUIRED" : "READY"
            }
          />
          <Badge
            value={
              data.summary.productionSupportedEvidenceCount > 0
                ? "ADAPTER_SUPPORTED"
                : "MANUAL_EVIDENCE"
            }
          />
          <Link
            href={localizePath("/dashboard/payroll/register", locale)}
            className="inline-flex min-h-9 items-center justify-center rounded-lg border border-white/12 bg-white/10 px-3 text-sm font-semibold text-white transition hover:bg-white/15"
          >
            Register
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
          label="Declarations"
          value={data.summary.totalDeclarations}
          icon={FileText}
          tone="bg-cyan-400/12 text-cyan-200"
        />
        <Metric
          label="Active"
          value={data.summary.activeDeclarations}
          icon={ReceiptText}
          tone="bg-amber-400/12 text-amber-200"
        />
        <Metric
          label="Rejected"
          value={data.summary.rejectedDeclarations}
          icon={AlertTriangle}
          tone="bg-rose-400/12 text-rose-200"
        />
        <Metric
          label="Missing register"
          value={data.summary.missingRegisterProofCount}
          icon={Fingerprint}
          tone="bg-violet-400/12 text-violet-200"
        />
        <Metric
          label="Evidence"
          value={data.summary.evidenceCount}
          icon={ShieldCheck}
          tone="bg-emerald-400/12 text-emerald-200"
        />
        <Metric
          label="Amount"
          value={data.summary.amountInScope}
          icon={Landmark}
          tone="bg-sky-400/12 text-sky-200"
        />
      </section>

      <section className="rounded-lg border border-white/10 bg-white/[0.05]">
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
          <BadgeCheck className="h-4 w-4 text-cyan-200" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-white">
            Declaration lifecycle
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[1440px] w-full table-fixed border-collapse text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase tracking-normal text-slate-400">
              <tr>
                <th className="w-[230px] px-4 py-3 font-semibold">
                  Declaration
                </th>
                <th className="w-[210px] px-4 py-3 font-semibold">Run</th>
                <th className="w-[160px] px-4 py-3 font-semibold">Status</th>
                <th className="w-[300px] px-4 py-3 font-semibold">Proof</th>
                <th className="w-[260px] px-4 py-3 font-semibold">Blockers</th>
                <th className="w-[260px] px-4 py-3 font-semibold">
                  Next action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {data.declarations.length ? (
                data.declarations.map((declaration) => (
                  <tr key={declaration.id} className="align-top">
                    <td className="px-4 py-3">
                      <p className="break-words font-semibold text-white">
                        {declaration.authority}
                      </p>
                      <p className="mt-1 break-words text-xs text-slate-400">
                        {declaration.declarationType}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-white">
                        {declaration.amount} {declaration.currency}
                      </p>
                      <p className="mt-2 text-xs text-slate-500">
                        Due {dateLabel(declaration.dueDate)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="break-words font-semibold text-white">
                        {declaration.payrollRun.runNumber}
                      </p>
                      <p className="mt-1 break-words text-xs text-slate-400">
                        {declaration.payrollRun.period.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {dateLabel(declaration.payrollRun.period.periodStart)}{" "}
                        to {dateLabel(declaration.payrollRun.period.periodEnd)}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge value={declaration.payrollRun.status} />
                        <Badge
                          value={
                            declaration.payrollRun.ledgerPostingBatchId
                              ? "LEDGER_PROOF"
                              : "LEDGER_PENDING"
                          }
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-2">
                        <Badge value={declaration.status} />
                        <Badge
                          value={
                            declaration.automation.automationCapabilityStatus
                          }
                        />
                        <Badge
                          value={
                            declaration.automation.productionSubmissionSupported
                              ? "PRODUCTION_ADAPTER"
                              : "MANUAL_ONLY"
                          }
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <ProofList declaration={declaration} />
                      <div className="mt-3">
                        <PayrollProofDrawerButton
                          subject={declarationProofSubject(
                            declaration,
                            locale,
                            data.redaction,
                          )}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Blockers declaration={declaration} />
                    </td>
                    <td className="px-4 py-3">
                      <NextActions declaration={declaration} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-6 text-sm text-slate-400" colSpan={6}>
                    No payroll declarations match this scope.
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
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
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
