"use client";

import { payrollUiText, payrollStatusText } from "./payroll-ui-copy"

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
import PayrollAuditorProofPanel from "./PayrollAuditorProofPanel";
import {
  HrPayrollTableControls,
  HrPayrollTablePagination,
  useHrPayrollTable,
} from "@/components/hr-payroll/HrPayrollTableControls";
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

function Badge({ locale = "en", value }: { value: string | null | undefined } & { locale?: Locale }) {
  return (
    <span
      className={`inline-flex min-h-7 max-w-full items-center rounded-md border px-2.5 py-1 text-xs font-semibold ${statusTone(value)}`}
    >
      <span className="truncate">{payrollStatusText(value, locale)}</span>
    </span>
  );
}

function dateLabel(value: string | null | undefined, locale: Locale = "en") {
  if (!value) return payrollUiText("Open", locale);
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
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

function ErrorPanel({ locale = "en", message }: { message: string } & { locale?: Locale }) {
  return (
    <section className="rounded-lg border border-rose-400/30 bg-rose-950/30 p-5 text-rose-50">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <div className="min-w-0">
          <h1 className="text-base font-semibold">
             {payrollUiText("Payroll declarations unavailable", locale)} </h1>
          <p className="mt-1 break-words text-sm text-rose-100">{message}</p>
        </div>
      </div>
    </section>
  );
}

function EmptyState({ locale = "en" }: { locale?: Locale }) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.05] p-5 text-slate-200">
      <h1 className="text-base font-semibold text-white">
         {payrollUiText("Payroll declarations", locale)} </h1>
      <p className="mt-1 text-sm text-slate-400">
         {payrollUiText("No payroll declarations are available for the selected scope.", locale)} </p>
    </section>
  );
}

function ProofList({ locale = "en", declaration }: { declaration: DeclarationRow } & { locale?: Locale }) {
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
            {value || payrollUiText("Pending", locale)}
          </span>
        </div>
      ))}
      {declaration.proof.latestTransition ? (
        <div className="rounded-md border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-xs text-cyan-100">
          {declaration.proof.latestTransition} /{" "}
          {declaration.proof.latestAuthorityStatus ?? "status pending"} /{" "}
          {dateLabel(declaration.proof.latestEvidenceCapturedAt, locale)}
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
    requiresFreshAuth: declaration.nextActions.some((action) => action.requiresFreshAuth),
    stateDescription: declaration.nextActions.some((action) => action.requiresFreshAuth)
      ? "Declaration proof facts are service-owned; authority workflow writes require fresh authentication."
      : undefined,
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
      { label: payrollUiText("Authority", locale), value: declaration.authority },
      { label: payrollUiText("Declaration type", locale), value: declaration.declarationType },
      {
        label: payrollUiText("Amount", locale),
        value: `${declaration.amount} ${declaration.currency}`,
      },
      { label: payrollUiText("Period start", locale), value: declaration.periodStart },
      { label: payrollUiText("Period end", locale), value: declaration.periodEnd },
      { label: payrollUiText("Due date", locale), value: declaration.dueDate },
      { label: payrollUiText("Run", locale), value: declaration.payrollRun.runNumber },
      { label: payrollUiText("Run status", locale), value: declaration.payrollRun.status },
      { label: payrollUiText("Run evidence", locale), value: declaration.payrollRun.evidenceHash },
      { label: payrollUiText("Run document", locale), value: declaration.payrollRun.documentHash },
      {
        label: payrollUiText("Ledger batch", locale),
        value: declaration.payrollRun.ledgerPostingBatchId,
      },
      { label: payrollUiText("Journal", locale), value: declaration.payrollRun.journalEntryId },
      {
        label: payrollUiText("Source link", locale),
        value: declaration.payrollRun.accountingSourceLinkId,
      },
      { label: payrollUiText("Country", locale), value: declaration.country.countryCode },
      { label: payrollUiText("Country pack", locale), value: declaration.country.countryPackVersion },
      {
        label: payrollUiText("Country pack hash", locale),
        value: declaration.country.countryPackResolutionHash,
      },
      { label: payrollUiText("Payload hash", locale), value: declaration.proof.payloadHash },
      {
        label: payrollUiText("Submitted payload", locale),
        value: declaration.proof.submittedPayloadHash,
      },
      { label: payrollUiText("Latest evidence", locale), value: declaration.proof.latestEvidenceHash },
      { label: payrollUiText("Source register", locale), value: declaration.proof.sourceRegisterHash },
      {
        label: payrollUiText("Register proof present", locale),
        value: declaration.proof.sourceRegisterProofPresent,
      },
      { label: payrollUiText("Receipt", locale), value: declaration.proof.portalReceiptHash },
      {
        label: payrollUiText("Authority response", locale),
        value: declaration.proof.authorityResponseHash,
      },
      {
        label: payrollUiText("Authority reference", locale),
        value: declaration.proof.latestAuthorityReference,
      },
      {
        label: payrollUiText("Authority channel", locale),
        value: declaration.proof.latestAuthorityChannel,
      },
      {
        label: payrollUiText("Authority environment", locale),
        value: declaration.proof.latestAuthorityEnvironment,
      },
      {
        label: payrollUiText("Automation status", locale),
        value: declaration.automation.automationCapabilityStatus,
      },
      {
        label: payrollUiText("Production adapter", locale),
        value: declaration.automation.productionSubmissionSupported,
      },
      {
        label: payrollUiText("Manual workflow", locale),
        value: declaration.automation.manualAuthorityWorkflowOnly,
      },
      {
        label: payrollUiText("Adapter enqueue gate", locale),
        value: declaration.adapterExecution.canEnqueue ? "READY" : "BLOCKED",
      },
      {
        label: payrollUiText("Adapter enqueue status", locale),
        value: declaration.adapterExecution.status,
      },
      {
        label: payrollUiText("Adapter enqueue evidence", locale),
        value: declaration.adapterExecution.queuedEvidenceId,
      },
      {
        label: payrollUiText("Adapter enqueue correlation", locale),
        value: declaration.adapterExecution.correlationId,
      },
      ...historyRows,
      ...actionRows,
    ],
  };
}
function Blockers({ locale = "en", declaration }: { declaration: DeclarationRow } & { locale?: Locale }) {
  if (!declaration.blockers.length) {
    return (
      <p className="text-xs text-emerald-100">
         {payrollUiText("No declaration blocker is visible.", locale)} </p>
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
            <Badge locale={locale} value={blocker.severity} />
            <p className="font-semibold text-white">{blocker.title}</p>
          </div>
          <p className="mt-2 text-amber-100">{blocker.detail}</p>
          <p className="mt-2 text-amber-200">{blocker.nextAction}</p>
        </div>
      ))}
    </div>
  );
}

function NextActions({ locale = "en", declaration }: { declaration: DeclarationRow } & { locale?: Locale }) {
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
            {action.requiresFreshAuth ? <Badge locale={locale} value="Fresh auth" /> : null}
            {action.requiresSeparateApprover ? (
              <Badge locale={locale} value="Maker-checker" />
            ) : null}
            {action.nextStatus ? <Badge locale={locale} value={action.nextStatus} /> : null}
          </div>
        </div>
      ))}
    </div>
  ) : (
    <Badge locale={locale} value="No manual action" />
  );

  return (
    <div className="flex flex-col gap-2">
      {manualActions}
      <PayrollDeclarationAuthorityExecutionPanel locale={locale} declaration={declaration} />
    </div>
  );
}

export default function PayrollDeclarationWorkbench({
  data,
  error,
  locale,
}: Props) {
  const declarationTable = useHrPayrollTable({
    rows: data?.declarations ?? [],
    searchText: (declaration) => JSON.stringify(declaration),
    dateValue: (declaration) => declaration.dueDate,
    sortOptions: [
      { key: "declaration", label: payrollUiText("Declaration", locale), value: (declaration) => declaration.authority },
      { key: "due-date", label: payrollUiText("Due date", locale), value: (declaration) => declaration.dueDate },
      { key: "run", label: payrollUiText("Payroll run", locale), value: (declaration) => declaration.payrollRun.runNumber },
      { key: "amount", label: payrollUiText("Amount", locale), value: (declaration) => Number(declaration.amount) },
      { key: "status", label: payrollUiText("Status", locale), value: (declaration) => declaration.status },
    ],
  });

  if (error) return <ErrorPanel locale={locale} message={error} />;
  if (!data) return <EmptyState locale={locale} />;

  return (
    <main className="flex min-w-0 flex-col gap-4 text-slate-100">
      <section className="flex flex-col gap-3 border-b border-white/10 pb-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-normal text-cyan-200">
             {payrollUiText("Payroll declarations", locale)} </p>
          <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
             {payrollUiText("Declaration evidence workbench", locale)} </h1>
          <p className="mt-2 max-w-4xl text-sm text-slate-300">
             {payrollUiText("Manual authority lifecycle, source register proof, adapter readiness, and close-impact blockers as of", locale)} {dateLabel(data.asOf, locale)}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge locale={locale}
            value={
              data.summary.blockedDeclarations > 0 ? "ACTION_REQUIRED" : "READY"
            }
          />
          <Badge locale={locale}
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
             {payrollUiText("Register", locale)} </Link>
          <Link
            href={localizePath("/dashboard/payroll/payments", locale)}
            className="inline-flex min-h-9 items-center justify-center rounded-lg border border-white/12 bg-white/10 px-3 text-sm font-semibold text-white transition hover:bg-white/15"
          >
             {payrollUiText("Payments", locale)} </Link>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Metric
          label={payrollUiText("Declarations", locale)}
          value={data.summary.totalDeclarations}
          icon={FileText}
          tone="bg-cyan-400/12 text-cyan-200"
        />
        <Metric
          label={payrollUiText("Active", locale)}
          value={data.summary.activeDeclarations}
          icon={ReceiptText}
          tone="bg-amber-400/12 text-amber-200"
        />
        <Metric
          label={payrollUiText("Rejected", locale)}
          value={data.summary.rejectedDeclarations}
          icon={AlertTriangle}
          tone="bg-rose-400/12 text-rose-200"
        />
        <Metric
          label={payrollUiText("Missing register", locale)}
          value={data.summary.missingRegisterProofCount}
          icon={Fingerprint}
          tone="bg-violet-400/12 text-violet-200"
        />
        <Metric
          label={payrollUiText("Evidence", locale)}
          value={data.summary.evidenceCount}
          icon={ShieldCheck}
          tone="bg-emerald-400/12 text-emerald-200"
        />
        <Metric
          label={payrollUiText("Amount", locale)}
          value={data.summary.amountInScope}
          icon={Landmark}
          tone="bg-sky-400/12 text-sky-200"
        />
      </section>

      <PayrollAuditorProofPanel
        proof={data.accountingAuditProof}
        sourceScope={data.sourceScope}
        locale={locale}
        subjectId="payroll-declarations:accounting-audit-proof"
        label="Payroll declaration auditor proof pack"
      />

      <section className="rounded-lg border border-white/10 bg-white/[0.05]">
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
          <BadgeCheck className="h-4 w-4 text-cyan-200" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-white">
             {payrollUiText("Declaration lifecycle", locale)} </h2>
        </div>
        <HrPayrollTableControls table={declarationTable} locale={locale} tableLabel={payrollUiText("payroll declarations", locale)} />
        <div className="dashboard-data-table dashboard-table-shell overflow-x-auto">
          <table className="min-w-[1440px] w-full table-fixed border-collapse text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase tracking-normal text-slate-400">
              <tr>
                <th className="w-[230px] px-4 py-3 font-semibold">
                   {payrollUiText("Declaration", locale)} </th>
                <th className="w-[210px] px-4 py-3 font-semibold">{payrollUiText("Run", locale)}</th>
                <th className="w-[160px] px-4 py-3 font-semibold">{payrollUiText("Status", locale)}</th>
                <th className="w-[300px] px-4 py-3 font-semibold">{payrollUiText("Proof", locale)}</th>
                <th className="w-[260px] px-4 py-3 font-semibold">{payrollUiText("Blockers", locale)}</th>
                <th className="w-[260px] px-4 py-3 font-semibold">
                   {payrollUiText("Next action", locale)} </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {declarationTable.rows.length ? (
                declarationTable.rows.map((declaration) => (
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
                         {payrollUiText("Due", locale)} {dateLabel(declaration.dueDate, locale)}
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
                        {dateLabel(declaration.payrollRun.period.periodStart, locale)}{" "}
                         {payrollUiText("to", locale)} {dateLabel(declaration.payrollRun.period.periodEnd, locale)}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge locale={locale} value={declaration.payrollRun.status} />
                        <Badge locale={locale}
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
                        <Badge locale={locale} value={declaration.status} />
                        <Badge locale={locale}
                          value={
                            declaration.automation.automationCapabilityStatus
                          }
                        />
                        <Badge locale={locale}
                          value={
                            declaration.automation.productionSubmissionSupported
                              ? "PRODUCTION_ADAPTER"
                              : "MANUAL_ONLY"
                          }
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <ProofList locale={locale} declaration={declaration} />
                      <div className="mt-3">
                        <PayrollProofDrawerButton locale={locale}
                          subject={declarationProofSubject(
                            declaration,
                            locale,
                            data.redaction,
                          )}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Blockers locale={locale} declaration={declaration} />
                    </td>
                    <td className="px-4 py-3">
                      <NextActions locale={locale} declaration={declaration} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-6 text-sm text-slate-400" colSpan={6}>
                     {payrollUiText("No payroll declarations match this scope.", locale)} </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <HrPayrollTablePagination table={declarationTable} locale={locale} />
      </section>

      <section className="rounded-lg border border-white/10 bg-white/[0.05] p-4">
        <div className="flex items-center gap-2">
          <Fingerprint className="h-4 w-4 text-cyan-200" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-white">{payrollUiText("Source scope", locale)}</h2>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <div className="rounded-md border border-white/10 bg-white/[0.04] p-3">
            <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">
               {payrollUiText("Limit", locale)} </p>
            <p className="mt-1 text-sm text-slate-100">
              {data.sourceScope.limit}
            </p>
          </div>
          <div className="rounded-md border border-white/10 bg-white/[0.04] p-3">
            <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">
               {payrollUiText("Returned", locale)} </p>
            <p className="mt-1 text-sm text-slate-100">
              {data.sourceScope.returned}
            </p>
          </div>
          <div className="rounded-md border border-white/10 bg-white/[0.04] p-3">
            <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">
               {payrollUiText("Service", locale)} </p>
            <p className="mt-1 break-all text-sm text-slate-100">
              {data.sourceScope.sourceService}
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
