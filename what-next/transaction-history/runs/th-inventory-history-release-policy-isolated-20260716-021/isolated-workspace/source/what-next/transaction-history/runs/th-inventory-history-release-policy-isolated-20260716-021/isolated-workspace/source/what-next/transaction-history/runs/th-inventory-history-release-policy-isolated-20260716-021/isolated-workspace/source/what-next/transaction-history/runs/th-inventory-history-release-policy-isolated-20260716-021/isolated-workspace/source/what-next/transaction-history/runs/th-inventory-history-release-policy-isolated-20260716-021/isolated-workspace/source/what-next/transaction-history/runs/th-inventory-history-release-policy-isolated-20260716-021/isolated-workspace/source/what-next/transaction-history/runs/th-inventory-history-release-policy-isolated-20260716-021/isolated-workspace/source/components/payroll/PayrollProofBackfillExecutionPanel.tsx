"use client";

import type { FormEvent } from "react";
import { useState, useTransition } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  PlayCircle,
  ShieldCheck,
} from "lucide-react";

import {
  preparePayrollProofBackfillExecutionAction,
  type PayrollProofBackfillExecutionCertificate,
} from "@/actions/payroll/payroll-setup.actions";

type SetupInput = {
  countryCode?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  payDate?: string | null;
  employeeSourceMode?: string | null;
  maxRows?: number | null;
};

type Props = {
  setupInput: SetupInput;
  defaultDryRunEvidenceHash?: string | null;
};

type ExecutionMode = "validate" | "execute";

type Notice =
  | {
      kind: "success";
      title: string;
      certificate: PayrollProofBackfillExecutionCertificate;
    }
  | { kind: "error"; title: string; detail: string };

function defaultIdempotencyKey(input: SetupInput) {
  const period = [input.periodStart, input.periodEnd]
    .filter(Boolean)
    .join(":");
  return `payroll-proof-backfill:${period || "current-period"}`;
}

function inputClass() {
  return "mt-1 min-h-10 w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none ring-cyan-300/0 transition focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-300/20";
}

function labelClass() {
  return "text-xs font-semibold uppercase tracking-normal text-slate-400";
}

function compactCertificateLine(certificate: PayrollProofBackfillExecutionCertificate) {
  const attempted = certificate.mutationAttempted ? "mutation attempted" : "no mutation";
  const gaps = certificate.proofBackfill.totalBlockingGaps;
  return `${certificate.status}; ${attempted}; ${gaps} gap${gaps === 1 ? "" : "s"}`;
}

export default function PayrollProofBackfillExecutionPanel({
  setupInput,
  defaultDryRunEvidenceHash,
}: Props) {
  const [dryRunEvidenceHash, setDryRunEvidenceHash] = useState(
    defaultDryRunEvidenceHash ?? "",
  );
  const [adapterChaosReleaseGateHash, setAdapterChaosReleaseGateHash] =
    useState("");
  const [approvalTokenHash, setApprovalTokenHash] = useState("");
  const [payrollAdminApprovedById, setPayrollAdminApprovedById] = useState("");
  const [accountingControllerApprovedById, setAccountingControllerApprovedById] =
    useState("");
  const [securityPrivacyApprovedById, setSecurityPrivacyApprovedById] =
    useState("");
  const [operationsOwnerApprovedById, setOperationsOwnerApprovedById] =
    useState("");
  const [approvedAt, setApprovedAt] = useState("");
  const [approvalNotes, setApprovalNotes] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState(() =>
    defaultIdempotencyKey(setupInput),
  );
  const [persistCertificate, setPersistCertificate] = useState(true);
  const [executionApproved, setExecutionApproved] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(mode: ExecutionMode) {
    setNotice(null);
    startTransition(() => {
      void preparePayrollProofBackfillExecutionAction({
        countryCode: setupInput.countryCode ?? undefined,
        periodStart: setupInput.periodStart ?? undefined,
        periodEnd: setupInput.periodEnd ?? undefined,
        payDate: setupInput.payDate ?? undefined,
        employeeSourceMode: setupInput.employeeSourceMode ?? undefined,
        maxRows: setupInput.maxRows ?? undefined,
        executionMode: mode,
        executionMutationApproved: mode === "execute" ? executionApproved : false,
        expectedDryRunEvidenceHash: dryRunEvidenceHash,
        adapterChaosReleaseGateHash,
        idempotencyKey,
        persistCertificate,
        signoffBundle: {
          dryRunEvidenceHash,
          approvalTokenHash,
          payrollAdminApprovedById,
          accountingControllerApprovedById,
          securityPrivacyApprovedById,
          operationsOwnerApprovedById,
          approvedAt,
          approvalNotes,
        },
      }).then((result) => {
        if (result.success) {
          setNotice({
            kind: "success",
            title: result.data.status,
            certificate: result.data,
          });
          return;
        }

        setNotice({
          kind: "error",
          title: result.code,
          detail: result.error,
        });
      });
    });
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submit("validate");
  }

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.05]">
      <div className="flex flex-col gap-3 border-b border-white/10 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-white">Proof execution</h2>
          <p className="mt-1 text-xs text-slate-400">
            {setupInput.periodStart ?? "period-start"} to {setupInput.periodEnd ?? "period-end"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex min-h-7 items-center gap-1 rounded-md border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-1 text-xs font-semibold text-cyan-100">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Write gate
          </span>
          <span className="inline-flex min-h-7 items-center gap-1 rounded-md border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-xs font-semibold text-emerald-100">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Fresh auth
          </span>
        </div>
      </div>

      <form onSubmit={onSubmit} className="grid gap-4 p-4">
        <div className="grid gap-3 lg:grid-cols-3">
          <label className={labelClass()}>
            Dry-run hash
            <input
              className={inputClass()}
              value={dryRunEvidenceHash}
              onChange={(event) => setDryRunEvidenceHash(event.target.value)}
            />
          </label>
          <label className={labelClass()}>
            Adapter chaos hash
            <input
              className={inputClass()}
              value={adapterChaosReleaseGateHash}
              onChange={(event) =>
                setAdapterChaosReleaseGateHash(event.target.value)
              }
            />
          </label>
          <label className={labelClass()}>
            Idempotency key
            <input
              className={inputClass()}
              value={idempotencyKey}
              onChange={(event) => setIdempotencyKey(event.target.value)}
            />
          </label>
        </div>

        <div className="grid gap-3 lg:grid-cols-4">
          <label className={labelClass()}>
            Approval token hash
            <input
              className={inputClass()}
              value={approvalTokenHash}
              onChange={(event) => setApprovalTokenHash(event.target.value)}
            />
          </label>
          <label className={labelClass()}>
            Payroll admin
            <input
              className={inputClass()}
              value={payrollAdminApprovedById}
              onChange={(event) =>
                setPayrollAdminApprovedById(event.target.value)
              }
            />
          </label>
          <label className={labelClass()}>
            Accounting controller
            <input
              className={inputClass()}
              value={accountingControllerApprovedById}
              onChange={(event) =>
                setAccountingControllerApprovedById(event.target.value)
              }
            />
          </label>
          <label className={labelClass()}>
            Security/privacy
            <input
              className={inputClass()}
              value={securityPrivacyApprovedById}
              onChange={(event) =>
                setSecurityPrivacyApprovedById(event.target.value)
              }
            />
          </label>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)]">
          <label className={labelClass()}>
            Operations owner
            <input
              className={inputClass()}
              value={operationsOwnerApprovedById}
              onChange={(event) =>
                setOperationsOwnerApprovedById(event.target.value)
              }
            />
          </label>
          <label className={labelClass()}>
            Approved at
            <input
              className={inputClass()}
              value={approvedAt}
              onChange={(event) => setApprovedAt(event.target.value)}
            />
          </label>
          <label className={labelClass()}>
            Approval notes
            <input
              className={inputClass()}
              value={approvalNotes}
              onChange={(event) => setApprovalNotes(event.target.value)}
            />
          </label>
        </div>

        <div className="flex flex-col gap-3 rounded-lg border border-white/10 bg-black/10 p-3 text-sm text-slate-200 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-4">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={persistCertificate}
                onChange={(event) =>
                  setPersistCertificate(event.target.checked)
                }
                className="h-4 w-4 rounded border-white/20 bg-black/20"
              />
              Persist certificate
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={executionApproved}
                onChange={(event) => setExecutionApproved(event.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-black/20"
              />
              Approve execution
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex min-h-10 items-center gap-2 rounded-md border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              )}
              Validate proof
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => submit("execute")}
              className="inline-flex min-h-10 items-center gap-2 rounded-md border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm font-semibold text-emerald-50 transition hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <PlayCircle className="h-4 w-4" aria-hidden="true" />
              )}
              Execute backfill
            </button>
          </div>
        </div>

        {notice ? (
          <div
            className={`rounded-lg border p-3 text-sm ${
              notice.kind === "success"
                ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-50"
                : "border-rose-400/30 bg-rose-400/10 text-rose-50"
            }`}
            role="status"
          >
            <div className="flex items-start gap-2">
              {notice.kind === "success" ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              ) : (
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              )}
              <div className="min-w-0">
                <p className="font-semibold">{notice.title}</p>
                <p className="mt-1 break-words text-xs">
                  {notice.kind === "success"
                    ? compactCertificateLine(notice.certificate)
                    : notice.detail}
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </form>
    </section>
  );
}