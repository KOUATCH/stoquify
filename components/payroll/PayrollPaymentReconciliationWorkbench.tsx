"use client";

import { payrollUiText, payrollStatusText } from "./payroll-ui-copy"

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  BadgeCheck,
  Banknote,
  FileText,
  Fingerprint,
  Landmark,
  Link2,
  ReceiptText,
  ShieldCheck,
  WalletCards,
} from "lucide-react";

import type { PayrollPaymentReconciliationReadModel } from "@/actions/payroll/payroll-payment-reconciliation.actions";
import { localizePath } from "@/i18n/routing";
import type { Locale } from "@/types/bilingual";
import PayrollAuditorProofPanel from "./PayrollAuditorProofPanel";
import {
  HrPayrollTableControls,
  HrPayrollTablePagination,
  useHrPayrollTable,
} from "@/components/hr-payroll/HrPayrollTableControls";
import PayrollPaymentSettlementForm from "./PayrollPaymentSettlementForm";
import { payrollSettlementCopy } from "./payroll-settlement-copy";
import PayrollProofDrawerButton, {
  type PayrollProofDrawerSubject,
} from "./PayrollProofDrawerButton";

type Props = {
  data: PayrollPaymentReconciliationReadModel | null;
  error?: string | null;
  locale: Locale;
};

type Batch = PayrollPaymentReconciliationReadModel["batches"][number];
type WorkbenchRedaction = PayrollPaymentReconciliationReadModel["redaction"];

type ProofRow = [label: string, value: string | number | null | undefined];

function statusTone(value: string | null | undefined) {
  const normalized = (value ?? "").toUpperCase();
  if (
    [
      "READY_TO_SETTLE",
      "SETTLED",
      "APPROVED",
      "AUTO_MATCHED",
      "RELEASED",
      "CONFIRMED",
    ].includes(normalized)
  ) {
    return "border-emerald-400/30 bg-emerald-400/10 text-emerald-100";
  }
  if (
    [
      "AWAITING_PROVIDER_EVIDENCE",
      "PARTIALLY_SETTLED",
      "NEEDS_REVIEW",
      "PENDING",
      "PROPOSED",
    ].includes(normalized)
  ) {
    return "border-amber-400/30 bg-amber-400/10 text-amber-100";
  }
  if (
    [
      "EXCEPTION_OPEN",
      "LEDGER_BLOCKED",
      "FAILED",
      "REJECTED",
      "SUSPENSE",
      "CANCELLED",
    ].includes(normalized)
  ) {
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
  if (!value) return payrollUiText("Pending", locale);
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
             {payrollUiText("Payroll payment reconciliation unavailable", locale)} </h1>
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
         {payrollUiText("Payroll payment reconciliation", locale)} </h1>
      <p className="mt-1 text-sm text-slate-400">
         {payrollUiText("No payroll payment batches are available for reconciliation.", locale)} </p>
    </section>
  );
}

function ProofGrid({ locale = "en", rows }: { rows: ProofRow[] } & { locale?: Locale }) {
  return (
    <div className="grid gap-2">
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="grid gap-1 rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 sm:grid-cols-[132px_minmax(0,1fr)]"
        >
          <span className="text-xs font-semibold uppercase tracking-normal text-slate-500">
            {payrollUiText(label, locale)}
          </span>
          <span className="min-w-0 break-all text-xs text-slate-200">
            {value || payrollUiText("Pending", locale)}
          </span>
        </div>
      ))}
    </div>
  );
}

function proofRows(batch: Batch): ProofRow[] {
  return [
    ["Batch evidence", batch.evidenceHash],
    ["Batch document", batch.documentHash],
    ["Bank file", batch.bankFileHash],
    ["Ledger batch", batch.ledgerPostingBatchId],
    ["Posted event", batch.postedBusinessEventId],
    ["Payment tx", batch.paymentTransactionId],
    ["Component proof", batch.proof.componentRegisterProofHash],
    ["Component status", batch.proof.componentRegisterProofStatus],
    ["Provider proof", batch.proof.paymentAdapterProofHash],
    ["Adapter contract", batch.proof.paymentProviderAdapterContractHash],
    ["Receipt proof", batch.proof.latestSettlementProviderReceiptProofHash],
    ["Receipt source", batch.proof.latestSettlementProviderReceiptProofSource],
    ["Lifecycle proof", batch.proof.latestSettlementLifecycleContractHash],
    ["Lifecycle status", batch.proof.latestSettlementLifecycleStatus],
    ["Close impact", batch.proof.closeImpactSourceCode],
  ];
}

function paymentProofSubject(
  batch: Batch,
  locale: Locale,
  redaction: WorkbenchRedaction,
): PayrollProofDrawerSubject {
  const sourceLinkRows = batch.proof.sourceLinks.flatMap((link, index) => [
    { label: `${payrollUiText("Source link", locale)} ${index + 1}`, value: `${link.type}:${link.id}` },
    {
      label: `${payrollUiText("Source link", locale)} ${index + 1} ${locale === "fr" ? "— empreinte" : "hash"}`,
      value: link.documentHash ?? link.evidenceHash ?? link.payloadHash ?? null,
    },
  ]);
  const proofIdentifiersRedacted = !redaction.proofIdentifiers.allowed;

  return {
    id: `payroll-payment:${batch.id}`,
    label: batch.batchNumber,
    status: batch.derivedState,
    source: "services/payroll/payment-reconciliation.service.ts",
    href: localizePath("/dashboard/finance/reconciliation", locale),
    requiresFreshAuth: settlementAllowed(batch),
    stateDescription: settlementAllowed(batch)
      ? "Payment proof facts are service-owned; settlement evidence writes require fresh authentication."
      : undefined,
    rows: [
      { label: payrollUiText("Run", locale), value: batch.runNumber },
      { label: payrollUiText("Period", locale), value: batch.periodName },
      { label: payrollUiText("Status", locale), value: batch.status },
      { label: payrollUiText("Reconciliation", locale), value: batch.reconciliationStatus },
      { label: payrollUiText("Amount", locale), value: `${batch.amount} ${batch.currency}` },
      { label: payrollUiText("Method", locale), value: batch.method },
      { label: payrollUiText("Payment date", locale), value: batch.paymentDate },
      { label: payrollUiText("Batch evidence", locale), value: batch.evidenceHash },
      { label: payrollUiText("Batch document", locale), value: batch.documentHash },
      { label: payrollUiText("Bank file", locale), value: batch.bankFileHash },
      { label: payrollUiText("Ledger batch", locale), value: batch.ledgerPostingBatchId },
      { label: payrollUiText("Posted event", locale), value: batch.postedBusinessEventId },
      { label: payrollUiText("Payment transaction", locale), value: batch.paymentTransactionId },
      {
        label: payrollUiText("Provider account", locale),
        value: batch.paymentTransaction?.providerAccountName ?? null,
      },
      {
        label: payrollUiText("Provider reference", locale),
        value: batch.paymentTransaction?.providerReference ?? null,
      },
      {
        label: payrollUiText("Provider transaction", locale),
        value: batch.paymentTransaction?.providerTransactionId ?? null,
      },
      {
        label: payrollUiText("Payload hash", locale),
        value: batch.paymentTransaction?.payloadHash ?? null,
      },
      {
        label: payrollUiText("Provider occurred", locale),
        value: batch.paymentTransaction?.occurredAt ?? null,
      },
      {
        label: payrollUiText("Provider confirmed", locale),
        value: batch.paymentTransaction?.confirmedAt ?? null,
      },
      { label: payrollUiText("Register source", locale), value: batch.proof.payrollRegisterSource },
      {
        label: payrollUiText("Provider evidence required", locale),
        value: batch.proof.providerEvidenceRequired,
      },
      {
        label: payrollUiText("Component register proof", locale),
        value: batch.proof.componentRegisterProofHash,
      },
      {
        label: payrollUiText("Component register status", locale),
        value: batch.proof.componentRegisterProofStatus,
      },
      {
        label: payrollUiText("Component mapping proof", locale),
        value: batch.proof.payrollComponentMappingHash,
      },
      {
        label: payrollUiText("Component mapping status", locale),
        value: batch.proof.payrollComponentMappingStatus,
      },
      {
        label: payrollUiText("YTD policy proof", locale),
        value: batch.proof.yearToDatePolicyHash,
      },
      {
        label: payrollUiText("YTD accumulator proofs", locale),
        value: batch.proof.yearToDateAccumulatorHashes.join(", ") || null,
      },
      {
        label: payrollUiText("Provider adapter proof", locale),
        value: batch.proof.paymentAdapterProofHash,
      },
      {
        label: payrollUiText("Provider adapter contract", locale),
        value: batch.proof.paymentProviderAdapterContractHash,
      },
      {
        label: payrollUiText("Provider adapter status", locale),
        value: batch.proof.paymentAdapterStatus,
      },
      {
        label: payrollUiText("Provider adapter key", locale),
        value: batch.proof.paymentProviderAdapterKey,
      },
      {
        label: payrollUiText("Adapter chaos proof", locale),
        value: batch.proof.adapterChaosReleaseGateHash,
      },
      {
        label: payrollUiText("Production automation", locale),
        value: batch.proof.productionPaymentAutomationSupported,
      },
      {
        label: payrollUiText("Latest settlement proof", locale),
        value: batch.proof.latestSettlementEvidenceHash,
      },
      {
        label: payrollUiText("Latest register proof", locale),
        value: batch.proof.latestSettlementSourceRegisterHash,
      },
      {
        label: payrollUiText("Provider receipt proof", locale),
        value: batch.proof.latestSettlementProviderReceiptProofHash,
      },
      {
        label: payrollUiText("Provider receipt source", locale),
        value: batch.proof.latestSettlementProviderReceiptProofSource,
      },
      {
        label: payrollUiText("Provider receipt payload hash", locale),
        value: batch.proof.latestSettlementProviderReceiptProviderPayloadHash,
      },
      {
        label: payrollUiText("Provider receipt statement line hash", locale),
        value: batch.proof.latestSettlementProviderReceiptStatementLineHash,
      },
      {
        label: payrollUiText("Provider receipt statement file hash", locale),
        value: batch.proof.latestSettlementProviderReceiptStatementFileHash,
      },
      {
        label: payrollUiText("Settlement lifecycle proof", locale),
        value: batch.proof.latestSettlementLifecycleContractHash,
      },
      {
        label: payrollUiText("Settlement lifecycle status", locale),
        value: batch.proof.latestSettlementLifecycleStatus,
      },
      {
        label: payrollUiText("Settlement lifecycle close impact", locale),
        value: batch.proof.latestSettlementLifecycleCloseImpact,
      },
      {
        label: payrollUiText("Settlement business event", locale),
        value: batch.proof.latestSettlementBusinessEventId,
      },
      {
        label: payrollUiText("Settlement updated", locale),
        value: batch.proof.latestSettlementAt,
      },
      { label: payrollUiText("Close impact", locale), value: batch.proof.closeImpactSourceCode },
      { label: payrollUiText("Matches", locale), value: batch.matches.length },
      { label: payrollUiText("Exceptions", locale), value: batch.exceptions.length },
      ...sourceLinkRows,
    ],
    blockers: batch.exceptions.map((exception) => ({
      id: exception.id,
      severity: "high",
      title: exception.type,
      detail: exception.status,
      nextAction: batch.nextAction,
    })),
    redactions: [
      {
        field: "payment.providerReference",
        reason:
          "Provider references are displayed only as returned by the payroll payment reconciliation service redaction policy.",
        policy: "kontava-payment-provider-reference-mask-policy",
      },
      ...(proofIdentifiersRedacted
        ? [
            {
              field: "payment.proofIdentifiers",
              reason:
                "Payment proof identifiers are service-redacted until accounting, payment reconciliation, or close proof permissions allow access.",
              policy: redaction.proofIdentifiers.policy,
            },
          ]
        : []),
    ],
  };
}
function settlementAllowed(batch: Batch) {
  return batch.settlement.canRecord && (
    batch.derivedState === "READY_TO_SETTLE" ||
    batch.derivedState === "PARTIALLY_SETTLED"
  );
}


function SourceLinks({ locale = "en", batch }: { batch: Batch } & { locale?: Locale }) {
  const links = batch.proof.sourceLinks.slice(0, 6);
  if (!links.length)
    return <p className="text-xs text-slate-500">{payrollUiText("No source links returned.", locale)}</p>;

  return (
    <div className="grid gap-2">
      {links.map((link) => (
        <div
          key={`${link.type}:${link.id}`}
          className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2"
        >
          <div className="flex items-center gap-2">
            <Link2
              className="h-3.5 w-3.5 shrink-0 text-cyan-200"
              aria-hidden="true"
            />
            <p className="min-w-0 break-all text-xs font-semibold text-white">
              {link.type}: {link.id}
            </p>
          </div>
          <p className="mt-1 break-all text-[11px] text-slate-500">
            {link.documentHash ??
              link.evidenceHash ??
              link.payloadHash ??
              "No hash"}
          </p>
        </div>
      ))}
    </div>
  );
}

function BatchSettlementControl({ batch, locale }: { batch: Batch; locale: Locale }) {
  const copy = payrollSettlementCopy(locale);

  if (!settlementAllowed(batch)) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
        <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">
          {copy.next}
        </p>
        <p className="mt-2 break-words text-sm text-slate-200">
          {batch.settlement.availability === "unavailable" ? copy.unavailable : !batch.settlement.canRecord && batch.settlement.remainingAmount !== "0.00" ? copy.restricted : batch.nextAction}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="rounded-lg border border-[var(--dash-info)] bg-[var(--dash-info-soft)] p-3 text-xs text-[var(--dash-text)]">
        {copy.ready}
      </div>
      <PayrollPaymentSettlementForm
        payrollPaymentBatchId={batch.id}
        batchNumber={batch.batchNumber}
        amount={batch.settlement.remainingAmount!}
        balanceRevision={batch.settlement.revision}
        locale={locale}
        currency={batch.currency}
        proofOptions={batch.proofOptions}
      />
    </div>
  );
}

export default function PayrollPaymentReconciliationWorkbench({
  data,
  error,
  locale,
}: Props) {
  const batchTable = useHrPayrollTable({
    rows: data?.batches ?? [],
    searchText: (batch) => JSON.stringify(batch),
    dateValue: (batch) => batch.paymentDate,
    sortOptions: [
      { key: "batch", label: payrollUiText("Batch", locale), value: (batch) => batch.batchNumber },
      { key: "payment-date", label: payrollUiText("Payment date", locale), value: (batch) => batch.paymentDate },
      { key: "amount", label: payrollUiText("Amount", locale), value: (batch) => Number(batch.amount) },
      { key: "status", label: payrollUiText("Status", locale), value: (batch) => batch.derivedState },
      { key: "exceptions", label: payrollUiText("Exceptions", locale), value: (batch) => batch.exceptions.length },
    ],
  });

  if (error) return <ErrorPanel locale={locale} message={error} />;
  if (!data) return <EmptyState locale={locale} />;

  return (
    <section className="flex min-w-0 flex-col gap-4 text-slate-100">
      <div className="flex flex-col gap-3 border-b border-white/10 pb-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-normal text-cyan-200">
             {payrollUiText("Payroll payments", locale)} </p>
          <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
             {payrollUiText("Payment reconciliation", locale)} </h1>
          <p className="mt-2 max-w-4xl text-sm text-slate-300">
             {payrollUiText("Released payment batches, provider and statement proof, ledger tie-out, settlement actions, and close-impact evidence as of", locale)}{" "}
            {dateLabel(data.asOf, locale)}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge locale={locale}
            value={
              data.summary.exceptionOpen > 0
                ? "EXCEPTION_OPEN"
                : data.summary.readyToSettle > 0
                  ? "READY_TO_SETTLE"
                  : "READY"
            }
          />
          <Badge locale={locale} value={data.redaction.amounts.mode} />
          <Badge locale={locale} value={data.redaction.providerReferences.mode} />
          <Link
            href={localizePath("/dashboard/finance/reconciliation", locale)}
            className="inline-flex min-h-9 items-center justify-center rounded-lg border border-white/12 bg-white/10 px-3 text-sm font-semibold text-white transition hover:bg-white/15"
          >
             {payrollUiText("Finance recon", locale)} </Link>
          <Link
            href={localizePath("/dashboard/payroll/register", locale)}
            className="inline-flex min-h-9 items-center justify-center rounded-lg border border-white/12 bg-white/10 px-3 text-sm font-semibold text-white transition hover:bg-white/15"
          >
             {payrollUiText("Register", locale)} </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Metric
          label={payrollUiText("Batches", locale)}
          value={data.summary.batchCount}
          icon={WalletCards}
          tone="bg-sky-400/12 text-sky-200"
        />
        <Metric
          label={payrollUiText("Awaiting proof", locale)}
          value={data.summary.awaitingProviderEvidence}
          icon={ReceiptText}
          tone="bg-amber-400/12 text-amber-200"
        />
        <Metric
          label={payrollUiText("Exceptions", locale)}
          value={data.summary.exceptionOpen}
          icon={AlertTriangle}
          tone="bg-rose-400/12 text-rose-200"
        />
        <Metric
          label={payrollUiText("Ready", locale)}
          value={data.summary.readyToSettle}
          icon={BadgeCheck}
          tone="bg-emerald-400/12 text-emerald-200"
        />
        <Metric
          label={payrollUiText("Partial", locale)}
          value={data.summary.partiallySettled}
          icon={Banknote}
          tone="bg-cyan-400/12 text-cyan-200"
        />
        <Metric
          label={payrollUiText("Settled", locale)}
          value={data.summary.settled}
          icon={ShieldCheck}
          tone="bg-violet-400/12 text-violet-200"
        />
      </div>

      <PayrollAuditorProofPanel
        proof={data.accountingAuditProof}
        sourceScope={data.sourceScope}
        locale={locale}
        subjectId="payroll-payment-reconciliation:accounting-audit-proof"
        label="Payroll payment auditor proof pack"
      />

      <div className="rounded-lg border border-white/10 bg-white/[0.05]">
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
          <FileText className="h-4 w-4 text-cyan-200" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-white">{payrollUiText("Payment batches", locale)}</h2>
        </div>
        <HrPayrollTableControls table={batchTable} locale={locale} tableLabel={payrollUiText("payment batches", locale)} />
        <div className="dashboard-data-table dashboard-table-shell overflow-x-auto">
          <table className="min-w-[1440px] w-full table-fixed border-collapse text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase tracking-normal text-slate-400">
              <tr>
                <th className="w-[220px] px-4 py-3 font-semibold">{payrollUiText("Batch", locale)}</th>
                <th className="w-[220px] px-4 py-3 font-semibold">
                   {payrollUiText("Amount and method", locale)} </th>
                <th className="w-[260px] px-4 py-3 font-semibold">
                   {payrollUiText("Payment transaction", locale)} </th>
                <th className="w-[320px] px-4 py-3 font-semibold">{payrollUiText("Proof", locale)}</th>
                <th className="w-[280px] px-4 py-3 font-semibold">
                   {payrollUiText("Matches and exceptions", locale)} </th>
                <th className="w-[320px] px-4 py-3 font-semibold">
                   {payrollUiText("Settlement", locale)} </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {batchTable.rows.length ? (
                batchTable.rows.map((batch) => (
                  <tr key={batch.id} className="align-top">
                    <td className="px-4 py-3">
                      <p className="break-words font-semibold text-white">
                        {batch.batchNumber}
                      </p>
                      <p className="mt-1 break-words text-xs text-slate-400">
                        {batch.runNumber}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {batch.periodName}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                         {payrollUiText("Pay date", locale)} {dateLabel(batch.paymentDate, locale)}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge locale={locale} value={batch.status} />
                        <Badge locale={locale} value={batch.derivedState} />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-slate-500">{payrollUiText("Amount", locale)}</p>
                      <p className="break-words font-semibold text-white">
                        {batch.amount} {batch.currency}
                      </p>
                      <p className="mt-2 text-xs text-slate-500">{payrollUiText("Method", locale)}</p>
                      <p className="break-words text-sm text-slate-200">
                        {batch.method}
                      </p>
                      <p className="mt-2 text-xs text-slate-500">
                         {payrollUiText("Reconciliation", locale)} </p>
                      <p className="break-words text-sm text-slate-200">
                        {batch.reconciliationStatus ?? payrollUiText("Pending", locale)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {batch.paymentTransaction ? (
                        <div className="grid gap-2">
                          <div className="flex flex-wrap gap-2">
                            <Badge locale={locale} value={batch.paymentTransaction.state} />
                            <Badge locale={locale}
                              value={
                                batch.paymentTransaction.providerAccountName ??
                                "No provider"
                              }
                            />
                          </div>
                          <ProofGrid locale={locale}
                            rows={[
                              [
                                "Provider ref",
                                batch.paymentTransaction.providerReference,
                              ],
                              [
                                "Provider tx",
                                batch.paymentTransaction.providerTransactionId,
                              ],
                              [
                                "Payload hash",
                                batch.paymentTransaction.payloadHash,
                              ],
                              ["Occurred", batch.paymentTransaction.occurredAt],
                              [
                                "Confirmed",
                                batch.paymentTransaction.confirmedAt,
                              ],
                            ]}
                          />
                        </div>
                      ) : (
                        <p className="rounded-md border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-xs text-rose-100">
                           {payrollUiText("No payment transaction is linked.", locale)} </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <ProofGrid locale={locale} rows={proofRows(batch)} />
                      <div className="mt-3 rounded-md border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-xs text-cyan-100">
                         {payrollUiText("Register source:", locale)} {batch.proof.payrollRegisterSource}
                      </div>
                      <div className="mt-3">
                        <PayrollProofDrawerButton locale={locale}
                          subject={paymentProofSubject(
                            batch,
                            locale,
                            data.redaction,
                          )}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="grid gap-3">
                        <div>
                          <p className="mb-2 text-xs font-semibold uppercase tracking-normal text-slate-500">
                             {payrollUiText("Matches", locale)} </p>
                          {batch.matches.length ? (
                            <div className="grid gap-2">
                              {batch.matches.map((match) => (
                                <div
                                  key={match.id}
                                  className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2"
                                >
                                  <div className="flex flex-wrap gap-2">
                                    <Badge locale={locale} value={match.status} />
                                    <Badge locale={locale} value={match.rule} />
                                  </div>
                                  <p className="mt-2 break-all text-xs text-slate-300">
                                    {match.id}
                                  </p>
                                  <p className="mt-1 text-xs text-slate-500">
                                    {match.amountMatched ?? "No amount"}  {payrollUiText("at", locale)}{" "}
                                    {match.confidence}%
                                  </p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-500">
                               {payrollUiText("No matches returned.", locale)} </p>
                          )}
                        </div>
                        <div>
                          <p className="mb-2 text-xs font-semibold uppercase tracking-normal text-slate-500">
                             {payrollUiText("Exceptions", locale)} </p>
                          {batch.exceptions.length ? (
                            <div className="grid gap-2">
                              {batch.exceptions.map((exception) => (
                                <div
                                  key={exception.id}
                                  className="rounded-md border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-xs text-rose-100"
                                >
                                  {exception.type} / {exception.status}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-500">
                               {payrollUiText("No open exceptions returned.", locale)} </p>
                          )}
                        </div>
                        <SourceLinks locale={locale} batch={batch} />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <BatchSettlementControl batch={batch} locale={locale} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-6 text-sm text-slate-400" colSpan={6}>
                     {payrollUiText("No payroll payment batches match this scope.", locale)} </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <HrPayrollTablePagination table={batchTable} locale={locale} />
      </div>

      <div className="rounded-lg border border-white/10 bg-white/[0.05] p-4">
        <div className="flex items-center gap-2">
          <Fingerprint className="h-4 w-4 text-cyan-200" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-white">{payrollUiText("Evidence policy", locale)}</h2>
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          <div className="rounded-md border border-white/10 bg-white/[0.04] p-3">
            <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">
               {payrollUiText("Amounts", locale)} </p>
            <p className="mt-1 text-sm text-slate-100">
              {data.redaction.amounts.policy}
            </p>
          </div>
          <div className="rounded-md border border-white/10 bg-white/[0.04] p-3">
            <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">
               {payrollUiText("Provider refs", locale)} </p>
            <p className="mt-1 text-sm text-slate-100">
              {data.redaction.providerReferences.policy}
            </p>
          </div>
          <div className="rounded-md border border-white/10 bg-white/[0.04] p-3">
            <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">
               {payrollUiText("Close impact", locale)} </p>
            <p className="mt-1 text-sm text-slate-100">
              PAYROLL_PAYMENT_RECONCILED
            </p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
          <Landmark className="h-3.5 w-3.5" aria-hidden="true" />
          <span>
             {payrollUiText("Settlement changes stale close evidence until accounting re-certifies the updated proof.", locale)} </span>
        </div>
      </div>
    </section>
  );
}
