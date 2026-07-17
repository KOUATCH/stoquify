import Link from "next/link";
import {
  Banknote,
  CalendarDays,
  FileCheck2,
  FileText,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";

import { localizePath } from "@/i18n/routing";
import type { Locale } from "@/types/bilingual";
import type { PayrollPayslipSelfServiceReadModel } from "@/actions/payroll/payroll-payslip-self-service.actions";
import PayrollProofDrawerButton, {
  type PayrollProofDrawerSubject,
} from "./PayrollProofDrawerButton";

type Props = {
  data: PayrollPayslipSelfServiceReadModel | null;
  error?: string | null;
  locale: Locale;
};

function dateLabel(value: string | null | undefined) {
  if (!value) return "Pending";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

function money(amount: string, currency: string) {
  return amount.includes("[REDACTED") ? amount : `${amount} ${currency}`;
}

function statusTone(value: string) {
  const normalized = value.toUpperCase();
  if (
    ["EMITTED", "READY", "SETTLED_OR_RELEASED", "POSTED", "SUPPORTED"].includes(
      normalized,
    )
  ) {
    return "border-emerald-400/30 bg-emerald-400/10 text-emerald-100";
  }
  if (
    [
      "UNPAID",
      "IN_PROGRESS",
      "PARTIALLY_SUPPORTED",
      "NOT_SUPPORTED",
      "NOT_YET_SUPPORTED",
    ].includes(normalized)
  ) {
    return "border-amber-400/30 bg-amber-400/10 text-amber-100";
  }
  return "border-white/12 bg-white/8 text-slate-200";
}

type PayslipRecord = PayrollPayslipSelfServiceReadModel["payslips"][number];

function joinValues(values: string[]) {
  return values.length ? values.join(", ") : "Pending";
}

function sourceLinkLabel(link: PayslipRecord["proof"]["sourceLinks"][number]) {
  const hash = link.documentHash ?? link.evidenceHash;
  return hash ? `${link.type}:${link.id} / ${hash}` : `${link.type}:${link.id}`;
}

function payslipProofSubject(
  payslip: PayslipRecord,
  redactionPolicy: string,
): PayrollProofDrawerSubject {
  const blockers: PayrollProofDrawerSubject["blockers"] = [];

  if (payslip.tieOut.paymentStatus !== "SETTLED_OR_RELEASED") {
    blockers.push({
      id: "PAYSLIP_PAYMENT_EVIDENCE_PENDING",
      severity: "medium",
      title: "Payment evidence is not fully settled",
      detail: `Current payment status is ${payslip.tieOut.paymentStatus}.`,
      nextAction:
        "Payroll/payment operators must complete settlement proof; employee self-service remains read-only.",
    });
  }

  if (
    !payslip.tieOut.ledgerPostingBatchId ||
    !payslip.tieOut.postedBusinessEventId
  ) {
    blockers.push({
      id: "PAYSLIP_LEDGER_TIE_OUT_PENDING",
      severity: "high",
      title: "Ledger tie-out is incomplete",
      detail:
        "This payslip is missing a posted ledger batch or posted business event reference.",
      nextAction:
        "Payroll/accounting operators must complete posting proof before close certification.",
    });
  }

  return {
    id: `payroll-payslip:${payslip.id}`,
    label: payslip.payslipNumber,
    status: payslip.status,
    source: "services/payroll/payslip-self-service.service.ts",
    rows: [
      { label: "Period", value: payslip.period.name },
      { label: "Period start", value: dateLabel(payslip.period.periodStart) },
      { label: "Period end", value: dateLabel(payslip.period.periodEnd) },
      { label: "Pay date", value: dateLabel(payslip.period.payDate) },
      { label: "Issued at", value: dateLabel(payslip.issuedAt) },
      {
        label: "Gross",
        value: money(payslip.amounts.grossAmount, payslip.amounts.currency),
      },
      {
        label: "Employee deductions",
        value: money(
          payslip.amounts.employeeDeductionAmount,
          payslip.amounts.currency,
        ),
      },
      {
        label: "Employer charges",
        value: money(
          payslip.amounts.employerChargeAmount,
          payslip.amounts.currency,
        ),
      },
      {
        label: "Net payable",
        value: money(
          payslip.amounts.netPayableAmount,
          payslip.amounts.currency,
        ),
      },
      { label: "Currency", value: payslip.amounts.currency },
      { label: "Immutable status", value: payslip.proof.immutableStatus },
      { label: "Document hash", value: payslip.proof.documentHash },
      { label: "Archive URI", value: payslip.proof.archiveUri },
      { label: "Archive manifest", value: payslip.proof.archiveManifestHash },
      { label: "Country", value: payslip.countryPack.countryCode },
      { label: "Country pack version", value: payslip.countryPack.version },
      {
        label: "Country pack schema",
        value: payslip.countryPack.schemaVersion,
      },
      {
        label: "Country pack resolution",
        value: payslip.countryPack.resolutionHash,
      },
      {
        label: "Country capability",
        value: payslip.countryPack.capabilityStatus,
      },
      {
        label: "Unsupported claims",
        value: joinValues(payslip.countryPack.unsupportedClaims),
      },
      {
        label: "Payroll run",
        value: `${payslip.tieOut.runNumber} / ${payslip.tieOut.payrollRunId}`,
      },
      { label: "Run status", value: payslip.tieOut.runStatus },
      { label: "Run line", value: payslip.tieOut.runLineId },
      {
        label: "Run line document hash",
        value: payslip.tieOut.payrollRunLineDocumentHash,
      },
      { label: "Calculation hash", value: payslip.tieOut.calculationHash },
      { label: "Ledger batch", value: payslip.tieOut.ledgerPostingBatchId },
      {
        label: "Posted business event",
        value: payslip.tieOut.postedBusinessEventId,
      },
      { label: "Payment status", value: payslip.tieOut.paymentStatus },
      {
        label: "Payment evidence",
        value: joinValues(payslip.tieOut.paymentEvidenceHashes),
      },
      {
        label: "Declaration evidence",
        value: joinValues(payslip.tieOut.declarationEvidenceHashes),
      },
      { label: "Line count", value: payslip.lines.length },
      ...payslip.proof.sourceLinks.map((link, index) => ({
        label: `Source link ${index + 1}`,
        value: sourceLinkLabel(link),
      })),
    ],
    blockers,
    redactions: [
      {
        field: "payroll.otherEmployeePayslips",
        reason:
          "The drawer is scoped to the authenticated employee; other employee payslips are never loaded into this read model.",
        policy: redactionPolicy,
      },
      {
        field: "payroll.personLevelAmounts",
        reason:
          "Payslip self-service exposes only service-scoped employee values and uses the payroll amount redaction policy when access is restricted.",
        policy: redactionPolicy,
      },
    ],
  };
}

function Badge({ value }: { value: string }) {
  return (
    <span
      className={`inline-flex min-h-7 max-w-full items-center rounded-md border px-2.5 py-1 text-xs font-semibold ${statusTone(value)}`}
    >
      <span className="truncate">{value}</span>
    </span>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: typeof FileText;
}) {
  return (
    <div className="min-h-[94px] rounded-lg border border-white/10 bg-white/[0.05] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-normal text-slate-400">
            {label}
          </p>
          <p className="mt-2 break-words text-xl font-bold text-white">
            {value}
          </p>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-400/12 text-cyan-200">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.05] p-5 text-slate-200">
      <h2 className="text-base font-semibold text-white">{title}</h2>
      <p className="mt-1 text-sm text-slate-400">{body}</p>
    </section>
  );
}

export default function PayrollPayslipSelfService({
  data,
  error,
  locale,
}: Props) {
  if (error) {
    return (
      <section className="rounded-lg border border-rose-400/30 bg-rose-950/30 p-5 text-rose-50">
        <div className="flex items-start gap-3">
          <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <h1 className="text-base font-semibold">Payslips unavailable</h1>
            <p className="mt-1 break-words text-sm text-rose-100">{error}</p>
          </div>
        </div>
      </section>
    );
  }

  if (!data) {
    return <EmptyState title="Payslips" body="No payslip data is available." />;
  }

  return (
    <main className="flex min-w-0 flex-col gap-4 text-slate-100">
      <section className="flex flex-col gap-3 border-b border-white/10 pb-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-normal text-cyan-200">
            Employee self-service
          </p>
          <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
            My payslips
          </h1>
          <p className="mt-2 max-w-4xl text-sm text-slate-300">
            {data.employee.displayName} / {data.employee.employeeNumber}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge value={data.redaction.payrollAmounts.mode} />
          <Link
            href={localizePath("/dashboard/payroll", locale)}
            className="inline-flex min-h-9 items-center justify-center rounded-lg border border-white/12 bg-white/10 px-3 text-sm font-semibold text-white transition hover:bg-white/15"
          >
            Payroll
          </Link>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Payslips"
          value={data.summary.payslipCount}
          icon={FileText}
        />
        <Metric
          label="Latest issue"
          value={dateLabel(data.summary.latestIssuedAt)}
          icon={CalendarDays}
        />
        <Metric
          label="Payment evidence"
          value={
            data.employee.paymentDestinationApproved ? "Approved" : "Pending"
          }
          icon={Banknote}
        />
        <Metric label="Proof state" value="Immutable" icon={ShieldCheck} />
      </section>

      {data.payslips.length ? (
        <section className="flex flex-col gap-4">
          {data.payslips.map((payslip) => (
            <article
              key={payslip.id}
              className="rounded-lg border border-white/10 bg-white/[0.05]"
            >
              <div className="grid gap-3 border-b border-white/10 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <h2 className="truncate text-base font-semibold text-white">
                      {payslip.payslipNumber}
                    </h2>
                    <Badge value={payslip.status} />
                    <Badge value={payslip.tieOut.paymentStatus} />
                  </div>
                  <p className="mt-1 truncate text-sm text-slate-400">
                    {payslip.period.name} / {dateLabel(payslip.period.payDate)}
                  </p>
                </div>
                <div className="min-w-0 text-right">
                  <p className="text-xs font-semibold uppercase tracking-normal text-slate-400">
                    Net payable
                  </p>
                  <p className="mt-1 break-words text-xl font-bold text-white">
                    {money(
                      payslip.amounts.netPayableAmount,
                      payslip.amounts.currency,
                    )}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                <div className="min-w-0 rounded-lg border border-white/10 bg-white/[0.04]">
                  <div className="border-b border-white/10 px-4 py-3">
                    <h3 className="text-sm font-semibold text-white">Lines</h3>
                  </div>
                  <div className="divide-y divide-white/10">
                    {payslip.lines.map((line) => (
                      <div
                        key={line.id}
                        className="grid gap-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto]"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">
                            {line.label}
                          </p>
                          <p className="mt-1 truncate text-xs text-slate-500">
                            {line.code} / {line.category}
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-slate-100">
                          {money(line.amount, line.currency)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="min-w-0 rounded-lg border border-white/10 bg-white/[0.04]">
                  <div className="border-b border-white/10 px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-white">
                        Proof
                      </h3>
                      <PayrollProofDrawerButton
                        subject={payslipProofSubject(
                          payslip,
                          data.redaction.payrollAmounts.policy,
                        )}
                      />
                    </div>
                  </div>
                  <dl className="divide-y divide-white/10">
                    <div className="grid gap-2 px-4 py-3 sm:grid-cols-[170px_minmax(0,1fr)]">
                      <dt className="text-xs font-semibold uppercase tracking-normal text-slate-400">
                        Document hash
                      </dt>
                      <dd className="min-w-0 break-all text-sm text-slate-100">
                        {payslip.proof.documentHash}
                      </dd>
                    </div>
                    <div className="grid gap-2 px-4 py-3 sm:grid-cols-[170px_minmax(0,1fr)]">
                      <dt className="text-xs font-semibold uppercase tracking-normal text-slate-400">
                        Archive hash
                      </dt>
                      <dd className="min-w-0 break-all text-sm text-slate-100">
                        {payslip.proof.archiveManifestHash}
                      </dd>
                    </div>
                    <div className="grid gap-2 px-4 py-3 sm:grid-cols-[170px_minmax(0,1fr)]">
                      <dt className="text-xs font-semibold uppercase tracking-normal text-slate-400">
                        Ledger batch
                      </dt>
                      <dd className="min-w-0 break-all text-sm text-slate-100">
                        {payslip.tieOut.ledgerPostingBatchId ?? "Pending"}
                      </dd>
                    </div>
                    <div className="grid gap-2 px-4 py-3 sm:grid-cols-[170px_minmax(0,1fr)]">
                      <dt className="text-xs font-semibold uppercase tracking-normal text-slate-400">
                        Country scope
                      </dt>
                      <dd className="min-w-0 text-sm text-slate-100">
                        <div className="flex flex-wrap gap-2">
                          <Badge value={payslip.countryPack.countryCode} />
                          <Badge value={payslip.countryPack.capabilityStatus} />
                        </div>
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>

              <div className="border-t border-white/10 px-4 py-3">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  <FileCheck2
                    className="h-4 w-4 text-cyan-200"
                    aria-hidden="true"
                  />
                  {payslip.countryPack.supportedScope.map((item) => (
                    <span key={item} className="max-w-full break-words">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <EmptyState
          title="Payslips"
          body="No emitted payslips were found for this employee profile."
        />
      )}
    </main>
  );
}
