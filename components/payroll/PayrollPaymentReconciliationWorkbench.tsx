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
import PayrollPaymentSettlementForm from "./PayrollPaymentSettlementForm";
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

type ProofRow = [label: string, value: string | null | undefined];

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
  if (!value) return "Pending";
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
            Payroll payment reconciliation unavailable
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
        Payroll payment reconciliation
      </h1>
      <p className="mt-1 text-sm text-slate-400">
        No payroll payment batches are available for reconciliation.
      </p>
    </section>
  );
}

function ProofGrid({ rows }: { rows: ProofRow[] }) {
  return (
    <div className="grid gap-2">
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="grid gap-1 rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 sm:grid-cols-[132px_minmax(0,1fr)]"
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

function proofRows(batch: Batch): ProofRow[] {
  return [
    ["Batch evidence", batch.evidenceHash],
    ["Batch document", batch.documentHash],
    ["Bank file", batch.bankFileHash],
    ["Ledger batch", batch.ledgerPostingBatchId],
    ["Posted event", batch.postedBusinessEventId],
    ["Payment tx", batch.paymentTransactionId],
    ["Close impact", batch.proof.closeImpactSourceCode],
  ];
}

function paymentProofSubject(
  batch: Batch,
  locale: Locale,
  redaction: WorkbenchRedaction,
): PayrollProofDrawerSubject {
  const sourceLinkRows = batch.proof.sourceLinks.flatMap((link, index) => [
    { label: `Source link ${index + 1}`, value: `${link.type}:${link.id}` },
    {
      label: `Source link ${index + 1} hash`,
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
    rows: [
      { label: "Run", value: batch.runNumber },
      { label: "Period", value: batch.periodName },
      { label: "Status", value: batch.status },
      { label: "Reconciliation", value: batch.reconciliationStatus },
      { label: "Amount", value: `${batch.amount} ${batch.currency}` },
      { label: "Method", value: batch.method },
      { label: "Payment date", value: batch.paymentDate },
      { label: "Batch evidence", value: batch.evidenceHash },
      { label: "Batch document", value: batch.documentHash },
      { label: "Bank file", value: batch.bankFileHash },
      { label: "Ledger batch", value: batch.ledgerPostingBatchId },
      { label: "Posted event", value: batch.postedBusinessEventId },
      { label: "Payment transaction", value: batch.paymentTransactionId },
      {
        label: "Provider account",
        value: batch.paymentTransaction?.providerAccountName ?? null,
      },
      {
        label: "Provider reference",
        value: batch.paymentTransaction?.providerReference ?? null,
      },
      {
        label: "Provider transaction",
        value: batch.paymentTransaction?.providerTransactionId ?? null,
      },
      {
        label: "Payload hash",
        value: batch.paymentTransaction?.payloadHash ?? null,
      },
      {
        label: "Provider occurred",
        value: batch.paymentTransaction?.occurredAt ?? null,
      },
      {
        label: "Provider confirmed",
        value: batch.paymentTransaction?.confirmedAt ?? null,
      },
      { label: "Register source", value: batch.proof.payrollRegisterSource },
      {
        label: "Provider evidence required",
        value: batch.proof.providerEvidenceRequired,
      },
      { label: "Close impact", value: batch.proof.closeImpactSourceCode },
      { label: "Matches", value: batch.matches.length },
      { label: "Exceptions", value: batch.exceptions.length },
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
  return (
    batch.derivedState === "READY_TO_SETTLE" ||
    batch.derivedState === "PARTIALLY_SETTLED"
  );
}

function firstMatchedProviderEvent(batch: Batch) {
  return (
    batch.matches.find(
      (match) => match.providerEventId || match.statementLineId,
    ) ?? null
  );
}

function SourceLinks({ batch }: { batch: Batch }) {
  const links = batch.proof.sourceLinks.slice(0, 6);
  if (!links.length)
    return <p className="text-xs text-slate-500">No source links returned.</p>;

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

function BatchSettlementControl({ batch }: { batch: Batch }) {
  const match = firstMatchedProviderEvent(batch);

  if (!settlementAllowed(batch)) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
        <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">
          Next action
        </p>
        <p className="mt-2 break-words text-sm text-slate-200">
          {batch.nextAction}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-3 text-xs text-emerald-100">
        Provider evidence is matched. Record settlement proof with source
        register evidence and fresh authentication.
      </div>
      <PayrollPaymentSettlementForm
        payrollPaymentBatchId={batch.id}
        batchNumber={batch.batchNumber}
        amount={batch.amount}
        currency={batch.currency}
        defaultMatchRecordId={match?.id ?? null}
        defaultProviderAccountId={
          batch.paymentTransaction?.providerAccountId ?? null
        }
        defaultProviderTransactionId={
          batch.paymentTransaction?.providerTransactionId ?? null
        }
        defaultProviderReference={
          batch.paymentTransaction?.providerReference ?? null
        }
        defaultProviderEventId={match?.providerEventId ?? null}
        defaultStatementLineId={match?.statementLineId ?? null}
        defaultStatementFileHash={match?.statementFileHash ?? null}
      />
    </div>
  );
}

export default function PayrollPaymentReconciliationWorkbench({
  data,
  error,
  locale,
}: Props) {
  if (error) return <ErrorPanel message={error} />;
  if (!data) return <EmptyState />;

  return (
    <section className="flex min-w-0 flex-col gap-4 text-slate-100">
      <div className="flex flex-col gap-3 border-b border-white/10 pb-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-normal text-cyan-200">
            Payroll payments
          </p>
          <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
            Payment reconciliation
          </h1>
          <p className="mt-2 max-w-4xl text-sm text-slate-300">
            Released payment batches, provider and statement proof, ledger
            tie-out, settlement actions, and close-impact evidence as of{" "}
            {dateLabel(data.asOf)}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge
            value={
              data.summary.exceptionOpen > 0
                ? "EXCEPTION_OPEN"
                : data.summary.readyToSettle > 0
                  ? "READY_TO_SETTLE"
                  : "READY"
            }
          />
          <Badge value={data.redaction.amounts.mode} />
          <Badge value={data.redaction.providerReferences.mode} />
          <Link
            href={localizePath("/dashboard/finance/reconciliation", locale)}
            className="inline-flex min-h-9 items-center justify-center rounded-lg border border-white/12 bg-white/10 px-3 text-sm font-semibold text-white transition hover:bg-white/15"
          >
            Finance recon
          </Link>
          <Link
            href={localizePath("/dashboard/payroll/register", locale)}
            className="inline-flex min-h-9 items-center justify-center rounded-lg border border-white/12 bg-white/10 px-3 text-sm font-semibold text-white transition hover:bg-white/15"
          >
            Register
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Metric
          label="Batches"
          value={data.summary.batchCount}
          icon={WalletCards}
          tone="bg-sky-400/12 text-sky-200"
        />
        <Metric
          label="Awaiting proof"
          value={data.summary.awaitingProviderEvidence}
          icon={ReceiptText}
          tone="bg-amber-400/12 text-amber-200"
        />
        <Metric
          label="Exceptions"
          value={data.summary.exceptionOpen}
          icon={AlertTriangle}
          tone="bg-rose-400/12 text-rose-200"
        />
        <Metric
          label="Ready"
          value={data.summary.readyToSettle}
          icon={BadgeCheck}
          tone="bg-emerald-400/12 text-emerald-200"
        />
        <Metric
          label="Partial"
          value={data.summary.partiallySettled}
          icon={Banknote}
          tone="bg-cyan-400/12 text-cyan-200"
        />
        <Metric
          label="Settled"
          value={data.summary.settled}
          icon={ShieldCheck}
          tone="bg-violet-400/12 text-violet-200"
        />
      </div>

      <div className="rounded-lg border border-white/10 bg-white/[0.05]">
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
          <FileText className="h-4 w-4 text-cyan-200" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-white">Payment batches</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[1440px] w-full table-fixed border-collapse text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase tracking-normal text-slate-400">
              <tr>
                <th className="w-[220px] px-4 py-3 font-semibold">Batch</th>
                <th className="w-[220px] px-4 py-3 font-semibold">
                  Amount and method
                </th>
                <th className="w-[260px] px-4 py-3 font-semibold">
                  Payment transaction
                </th>
                <th className="w-[320px] px-4 py-3 font-semibold">Proof</th>
                <th className="w-[280px] px-4 py-3 font-semibold">
                  Matches and exceptions
                </th>
                <th className="w-[320px] px-4 py-3 font-semibold">
                  Settlement
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {data.batches.length ? (
                data.batches.map((batch) => (
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
                        Pay date {dateLabel(batch.paymentDate)}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge value={batch.status} />
                        <Badge value={batch.derivedState} />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-slate-500">Amount</p>
                      <p className="break-words font-semibold text-white">
                        {batch.amount} {batch.currency}
                      </p>
                      <p className="mt-2 text-xs text-slate-500">Method</p>
                      <p className="break-words text-sm text-slate-200">
                        {batch.method}
                      </p>
                      <p className="mt-2 text-xs text-slate-500">
                        Reconciliation
                      </p>
                      <p className="break-words text-sm text-slate-200">
                        {batch.reconciliationStatus ?? "Pending"}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {batch.paymentTransaction ? (
                        <div className="grid gap-2">
                          <div className="flex flex-wrap gap-2">
                            <Badge value={batch.paymentTransaction.state} />
                            <Badge
                              value={
                                batch.paymentTransaction.providerAccountName ??
                                "No provider"
                              }
                            />
                          </div>
                          <ProofGrid
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
                          No payment transaction is linked.
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <ProofGrid rows={proofRows(batch)} />
                      <div className="mt-3 rounded-md border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-xs text-cyan-100">
                        Register source: {batch.proof.payrollRegisterSource}
                      </div>
                      <div className="mt-3">
                        <PayrollProofDrawerButton
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
                            Matches
                          </p>
                          {batch.matches.length ? (
                            <div className="grid gap-2">
                              {batch.matches.map((match) => (
                                <div
                                  key={match.id}
                                  className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2"
                                >
                                  <div className="flex flex-wrap gap-2">
                                    <Badge value={match.status} />
                                    <Badge value={match.rule} />
                                  </div>
                                  <p className="mt-2 break-all text-xs text-slate-300">
                                    {match.id}
                                  </p>
                                  <p className="mt-1 text-xs text-slate-500">
                                    {match.amountMatched ?? "No amount"} at{" "}
                                    {match.confidence}%
                                  </p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-500">
                              No matches returned.
                            </p>
                          )}
                        </div>
                        <div>
                          <p className="mb-2 text-xs font-semibold uppercase tracking-normal text-slate-500">
                            Exceptions
                          </p>
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
                              No open exceptions returned.
                            </p>
                          )}
                        </div>
                        <SourceLinks batch={batch} />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <BatchSettlementControl batch={batch} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-6 text-sm text-slate-400" colSpan={6}>
                    No payroll payment batches match this scope.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-lg border border-white/10 bg-white/[0.05] p-4">
        <div className="flex items-center gap-2">
          <Fingerprint className="h-4 w-4 text-cyan-200" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-white">Evidence policy</h2>
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          <div className="rounded-md border border-white/10 bg-white/[0.04] p-3">
            <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">
              Amounts
            </p>
            <p className="mt-1 text-sm text-slate-100">
              {data.redaction.amounts.policy}
            </p>
          </div>
          <div className="rounded-md border border-white/10 bg-white/[0.04] p-3">
            <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">
              Provider refs
            </p>
            <p className="mt-1 text-sm text-slate-100">
              {data.redaction.providerReferences.policy}
            </p>
          </div>
          <div className="rounded-md border border-white/10 bg-white/[0.04] p-3">
            <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">
              Close impact
            </p>
            <p className="mt-1 text-sm text-slate-100">
              PAYROLL_PAYMENT_RECONCILED
            </p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
          <Landmark className="h-3.5 w-3.5" aria-hidden="true" />
          <span>
            Settlement changes stale close evidence until accounting
            re-certifies the updated proof.
          </span>
        </div>
      </div>
    </section>
  );
}
