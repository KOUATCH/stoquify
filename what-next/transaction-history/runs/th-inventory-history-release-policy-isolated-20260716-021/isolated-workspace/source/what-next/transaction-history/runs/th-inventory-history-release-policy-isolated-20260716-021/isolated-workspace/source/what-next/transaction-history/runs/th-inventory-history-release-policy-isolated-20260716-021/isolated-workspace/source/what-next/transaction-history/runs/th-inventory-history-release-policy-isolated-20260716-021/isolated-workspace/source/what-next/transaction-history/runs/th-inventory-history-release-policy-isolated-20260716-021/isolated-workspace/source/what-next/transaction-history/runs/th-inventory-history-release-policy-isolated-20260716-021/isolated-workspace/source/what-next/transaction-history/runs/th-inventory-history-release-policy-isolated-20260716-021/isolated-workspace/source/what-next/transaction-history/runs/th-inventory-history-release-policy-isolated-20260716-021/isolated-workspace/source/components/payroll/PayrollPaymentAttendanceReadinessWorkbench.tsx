import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  BadgeCheck,
  Banknote,
  CalendarCheck2,
  ClipboardCheck,
  FileLock2,
  Fingerprint,
  ShieldCheck,
} from "lucide-react";

import type { PaymentEvidenceReadinessResult } from "@/actions/payroll/payroll-payment-evidence.actions";
import { localizePath } from "@/i18n/routing";
import type { Locale } from "@/types/bilingual";
import PayrollProofDrawerButton, {
  type PayrollProofDrawerSubject,
} from "./PayrollProofDrawerButton";

type Props = {
  data: PaymentEvidenceReadinessResult | null;
  error?: string | null;
  locale: Locale;
};

function statusTone(value: string | null | undefined) {
  const normalized = (value ?? "").toUpperCase();
  if (
    ["ACTIVE", "APPROVED", "APPLIED", "READY", "FROZEN"].includes(normalized)
  ) {
    return "border-emerald-400/30 bg-emerald-400/10 text-emerald-100";
  }
  if (
    [
      "REJECTED",
      "DRIFT_DETECTED",
      "MISSING_EVIDENCE",
      "MISSING_SNAPSHOT",
      "SOURCE_HASH_MISSING",
    ].includes(normalized)
  ) {
    return "border-rose-400/30 bg-rose-400/10 text-rose-100";
  }
  return "border-amber-400/30 bg-amber-400/10 text-amber-100";
}

type ReadinessEmployee = PaymentEvidenceReadinessResult["employees"][number];

function joinValues(values: string[]) {
  return values.length ? values.join(", ") : "Pending";
}

function blockerDetail(code: string) {
  if (code === "EMPLOYEE_NOT_ACTIVE")
    return "Employee is not active for payroll processing.";
  if (code === "APPROVED_PAYMENT_DESTINATION_EVIDENCE_MISSING")
    return "No applied maker-checker payment destination evidence is available.";
  if (code === "ATTENDANCE_FREEZE_MISSING")
    return "No attendance snapshot exists for the selected payroll period.";
  if (code === "ATTENDANCE_NOT_FROZEN")
    return "Attendance exists but is not frozen for payroll use.";
  if (code === "ATTENDANCE_SOURCE_HASH_MISSING")
    return "The frozen attendance snapshot is missing source hash proof.";
  if (code === "ATTENDANCE_SOURCE_DRIFT_DETECTED")
    return "The frozen attendance source hash no longer matches the expected source hash.";
  return "Review this readiness blocker before payroll payment release.";
}

function blockerSeverity(code: string) {
  return code.includes("ATTENDANCE") || code.includes("PAYMENT")
    ? "high"
    : "medium";
}

function readinessProofSubject(
  employee: ReadinessEmployee,
  locale: Locale,
): PayrollProofDrawerSubject {
  const latestChange = employee.paymentDestination.latestChange;
  const attendance = employee.attendanceReadiness;

  return {
    id: `payroll-payment-attendance:${employee.id}`,
    label: `${employee.employeeNumber} / ${employee.displayName}`,
    status: employee.blockers.length ? "ACTION_REQUIRED" : "READY",
    source: "services/payroll/payment-evidence.service.ts",
    href: localizePath("/dashboard/payroll/attendance", locale),
    rows: [
      { label: "Employee", value: employee.employeeNumber },
      { label: "Employee status", value: employee.status },
      {
        label: "Payment destination state",
        value: employee.paymentDestination.state,
      },
      { label: "Payment method", value: employee.paymentDestination.method },
      {
        label: "Masked destination",
        value: employee.paymentDestination.maskedDestination,
      },
      {
        label: "Approved evidence hash present",
        value: employee.paymentDestination.approvedEvidenceHashPresent,
      },
      {
        label: "Destination hash recorded",
        value: employee.paymentDestination.paymentDestinationHashPresent,
      },
      { label: "Latest change", value: latestChange?.id },
      { label: "Latest change status", value: latestChange?.status },
      { label: "Latest change method", value: latestChange?.paymentMethod },
      {
        label: "Latest change masked destination",
        value: latestChange?.maskedDestination,
      },
      { label: "Requested at", value: dateLabel(latestChange?.requestedAt) },
      { label: "Requested by", value: latestChange?.requestedById },
      { label: "Approved by", value: latestChange?.approvedById },
      { label: "Applied by", value: latestChange?.appliedById },
      {
        label: "Request evidence hash",
        value: latestChange?.evidenceDocumentHash,
      },
      {
        label: "Approval evidence hash present",
        value: latestChange?.approvalEvidenceHashPresent,
      },
      {
        label: "Change destination hash present",
        value: latestChange?.paymentDestinationHashPresent,
      },
      {
        label: "Change redactions",
        value: joinValues(latestChange?.redactions ?? []),
      },
      { label: "Attendance status", value: attendance.status },
      { label: "Attendance snapshot", value: attendance.snapshotId },
      { label: "Snapshot status", value: attendance.snapshotStatus },
      { label: "Period start", value: dateLabel(attendance.periodStart) },
      { label: "Period end", value: dateLabel(attendance.periodEnd) },
      { label: "Frozen at", value: dateLabel(attendance.frozenAt) },
      { label: "Source hash present", value: attendance.sourceHashPresent },
      {
        label: "Expected source hash present",
        value: attendance.expectedSourceHashPresent,
      },
      { label: "Drift detected", value: attendance.driftDetected },
      {
        label: "Contract evidence",
        value: joinValues(employee.evidence.contractEvidenceHashes),
      },
      {
        label: "Salary evidence",
        value: joinValues(employee.evidence.salaryChangeEvidenceHashes),
      },
      {
        label: "Identifier hash types",
        value: joinValues(employee.evidence.identifierHashTypes),
      },
      {
        label: "Payment evidence",
        value: joinValues(employee.evidence.paymentEvidenceHashes),
      },
      {
        label: "Total proof references",
        value: employee.evidence.totalReferenceCount,
      },
      { label: "Readiness blockers", value: joinValues(employee.blockers) },
    ],
    blockers: employee.blockers.map((code) => ({
      id: code,
      severity: blockerSeverity(code),
      title: code,
      detail: blockerDetail(code),
      nextAction:
        "Resolve the readiness blocker before payroll payment release or close certification.",
    })),
    redactions: [
      {
        field: "payroll.paymentDestination.rawDetails",
        reason:
          "Raw bank and mobile-money destination details stay outside the readiness drawer; only masked values and hash-presence proof are shown.",
        policy: "kontava-payment-destination-redaction-policy",
      },
      {
        field: "payroll.employeeIdentifiers.rawValues",
        reason:
          "Tax and social identifiers are represented by identifier hash types only.",
        policy: "kontava-payroll-person-redaction-policy",
      },
    ],
  };
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

function boolLabel(value: boolean) {
  return value ? "yes" : "no";
}

function countLabel(count: number, singular: string) {
  return `${count} ${singular}${count === 1 ? "" : "s"}`;
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
            Payroll payment and attendance readiness unavailable
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
        Payroll payment and attendance readiness
      </h1>
      <p className="mt-1 text-sm text-slate-400">
        No payment destination or attendance readiness records are available.
      </p>
    </section>
  );
}

export default function PayrollPaymentAttendanceReadinessWorkbench({
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
            Payroll evidence readiness
          </p>
          <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
            Payment and attendance readiness
          </h1>
          <p className="mt-2 max-w-4xl text-sm text-slate-300">
            Approved payment destination evidence, HR proof references, and
            frozen attendance status as of {dateLabel(data.asOf)}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge
            value={
              data.summary.blockerCount > 0
                ? "BLOCKERS PRESENT"
                : "READY REVIEW"
            }
          />
          <Link
            href={localizePath("/dashboard/payroll/compensation", locale)}
            className="inline-flex min-h-9 items-center justify-center rounded-lg border border-white/12 bg-white/10 px-3 text-sm font-semibold text-white transition hover:bg-white/15"
          >
            Compensation
          </Link>
          <Link
            href={localizePath("/dashboard/payroll/setup", locale)}
            className="inline-flex min-h-9 items-center justify-center rounded-lg border border-white/12 bg-white/10 px-3 text-sm font-semibold text-white transition hover:bg-white/15"
          >
            Setup
          </Link>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Metric
          label="Employees"
          value={data.summary.employeeCount}
          icon={ClipboardCheck}
          tone="bg-sky-400/12 text-sky-200"
        />
        <Metric
          label="Approved destinations"
          value={data.summary.approvedPaymentDestinationCount}
          icon={BadgeCheck}
          tone="bg-emerald-400/12 text-emerald-200"
        />
        <Metric
          label="Pending destinations"
          value={data.summary.pendingPaymentDestinationCount}
          icon={Banknote}
          tone="bg-amber-400/12 text-amber-200"
        />
        <Metric
          label="Missing destinations"
          value={data.summary.missingPaymentDestinationCount}
          icon={FileLock2}
          tone="bg-rose-400/12 text-rose-200"
        />
        <Metric
          label="Attendance ready"
          value={data.summary.attendanceReadyCount}
          icon={CalendarCheck2}
          tone="bg-teal-400/12 text-teal-200"
        />
        <Metric
          label="Blockers"
          value={data.summary.blockerCount}
          icon={AlertTriangle}
          tone="bg-violet-400/12 text-violet-200"
        />
      </section>

      <section className="rounded-lg border border-white/10 bg-white/[0.05]">
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
          <ShieldCheck className="h-4 w-4 text-cyan-200" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-white">
            Employee readiness queue
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[1320px] w-full table-fixed border-collapse text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase tracking-normal text-slate-400">
              <tr>
                <th className="w-[180px] px-4 py-3 font-semibold">Employee</th>
                <th className="w-[220px] px-4 py-3 font-semibold">
                  Payment destination
                </th>
                <th className="w-[240px] px-4 py-3 font-semibold">
                  Latest approval change
                </th>
                <th className="w-[240px] px-4 py-3 font-semibold">
                  HR evidence
                </th>
                <th className="w-[260px] px-4 py-3 font-semibold">
                  Attendance freeze
                </th>
                <th className="w-[180px] px-4 py-3 font-semibold">Blockers</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {data.employees.length ? (
                data.employees.map((employee) => {
                  const latestChange = employee.paymentDestination.latestChange;
                  const attendance = employee.attendanceReadiness;

                  return (
                    <tr key={employee.id} className="align-top">
                      <td className="px-4 py-3">
                        <p className="break-words font-semibold text-white">
                          {employee.employeeNumber}
                        </p>
                        <p className="mt-1 break-words text-xs text-slate-400">
                          {employee.displayName}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <Badge value={employee.status} />
                          <PayrollProofDrawerButton
                            subject={readinessProofSubject(employee, locale)}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-2">
                          <Badge value={employee.paymentDestination.state} />
                          <p className="break-words text-xs text-slate-300">
                            {employee.paymentDestination.method ?? "No method"}{" "}
                            /{" "}
                            {employee.paymentDestination.maskedDestination ??
                              "No approved destination"}
                          </p>
                          <p className="text-xs text-slate-500">
                            Approval evidence:{" "}
                            {boolLabel(
                              employee.paymentDestination
                                .approvedEvidenceHashPresent,
                            )}
                          </p>
                          <p className="text-xs text-slate-500">
                            Destination hash recorded:{" "}
                            {boolLabel(
                              employee.paymentDestination
                                .paymentDestinationHashPresent,
                            )}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {latestChange ? (
                          <div className="flex flex-col gap-2">
                            <Badge value={latestChange.status} />
                            <p className="break-words text-xs text-slate-300">
                              {latestChange.paymentMethod} /{" "}
                              {latestChange.maskedDestination ?? "masked"}
                            </p>
                            <p className="break-words text-xs text-slate-500">
                              Requested {dateLabel(latestChange.requestedAt)} by{" "}
                              {latestChange.requestedById}
                            </p>
                            <p className="break-words text-xs text-slate-500">
                              Approved by{" "}
                              {latestChange.approvedById ?? "pending"} / applied
                              by {latestChange.appliedById ?? "pending"}
                            </p>
                            <p className="text-xs text-slate-500">
                              Approval evidence:{" "}
                              {boolLabel(
                                latestChange.approvalEvidenceHashPresent,
                              )}
                            </p>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500">
                            No destination change request.
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-2">
                          <p className="text-xs text-slate-300">
                            Contracts:{" "}
                            {countLabel(
                              employee.evidence.contractEvidenceHashes.length,
                              "reference",
                            )}
                          </p>
                          <p className="text-xs text-slate-300">
                            Salary changes:{" "}
                            {countLabel(
                              employee.evidence.salaryChangeEvidenceHashes
                                .length,
                              "reference",
                            )}
                          </p>
                          <p className="break-words text-xs text-slate-300">
                            Identifiers:{" "}
                            {employee.evidence.identifierHashTypes.length
                              ? employee.evidence.identifierHashTypes.join(", ")
                              : "none"}
                          </p>
                          <p className="text-xs text-slate-300">
                            Payment evidence:{" "}
                            {countLabel(
                              employee.evidence.paymentEvidenceHashes.length,
                              "reference",
                            )}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Fingerprint
                              className="h-3.5 w-3.5 shrink-0"
                              aria-hidden="true"
                            />
                            <span>
                              {countLabel(
                                employee.evidence.totalReferenceCount,
                                "proof reference",
                              )}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-2">
                          <Badge value={attendance.status} />
                          <p className="break-words text-xs text-slate-300">
                            {dateLabel(attendance.periodStart)} to{" "}
                            {dateLabel(attendance.periodEnd)}
                          </p>
                          <p className="text-xs text-slate-500">
                            Snapshot: {attendance.snapshotStatus ?? "missing"}
                          </p>
                          <p className="text-xs text-slate-500">
                            Frozen at: {dateLabel(attendance.frozenAt)}
                          </p>
                          <p className="text-xs text-slate-500">
                            Source hash present:{" "}
                            {boolLabel(attendance.sourceHashPresent)}
                          </p>
                          <p className="text-xs text-slate-500">
                            Drift detected:{" "}
                            {boolLabel(attendance.driftDetected)}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {employee.blockers.length ? (
                          <div className="flex flex-col gap-2">
                            {employee.blockers.map((blocker) => (
                              <Badge key={blocker} value={blocker} />
                            ))}
                          </div>
                        ) : (
                          <Badge value="READY" />
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="px-4 py-6 text-sm text-slate-400" colSpan={6}>
                    No employee payment and attendance readiness records are
                    available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
