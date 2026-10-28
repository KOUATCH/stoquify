"use client";

import { Landmark } from "lucide-react";

import { localizePath } from "@/i18n/routing";
import type { Locale } from "@/types/bilingual";
import PayrollProofDrawerButton, {
  type PayrollProofDrawerState,
  type PayrollProofDrawerSubject,
} from "./PayrollProofDrawerButton";

export type PayrollAuditorProof = {
  available: boolean;
  status: string;
  generatedAt: string | null;
  scopeHash: string | null;
  periodId: string | null;
  trustLevel: string | null;
  verdict: string | null;
  exportable: boolean;
  blockerCount: number;
  criticalBlockerCount: number;
  highBlockerCount: number;
  proofGateCount: number;
  blockedProofGateCount: number;
  reviewProofGateCount: number;
  sourceLinkCount: number;
  sourceTableCount: number;
  redactionMode: string;
  redactionExcluded: string[];
  sourceTables: string[];
  aggregateEvidence: Record<string, number>;
  proofGates: Array<{
    gate: string;
    status: string;
    blockerCount: number;
    blockerIds: string[];
    evidence: string[];
  }>;
  blockers: Array<{
    id: string;
    severity: string;
    gate: string;
    title: string;
  }>;
  latestSourceLinks: Array<{
    sourceLinkHash: string;
    sourceType: string;
    sourceNumber: string | null;
    sourceRefHash: string;
    journalEntryNumber: string | null;
    postingBatchId: string;
    postingStatus: string;
    createdAt: string;
  }>;
};

export type PayrollAuditorProofSourceScope = {
  returnedAccountingPeriodIds: string[];
  accountingAuditProofCoverageComplete: boolean;
};

function statusTone(value: string | null | undefined) {
  const normalized = (value ?? "").toUpperCase();
  if (["PASS", "READY", "CERTIFIED", "T2", "T3"].includes(normalized)) {
    return "border-emerald-400/30 bg-emerald-400/10 text-emerald-100";
  }
  if (["BLOCKED", "FAILED", "REJECTED", "CRITICAL"].includes(normalized)) {
    return "border-rose-400/30 bg-rose-400/10 text-rose-100";
  }
  return "border-amber-400/30 bg-amber-400/10 text-amber-100";
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

function proofList(values: string[]) {
  return values.length ? values.join(", ") : null;
}

function aggregateGapSummary(aggregateEvidence: Record<string, number>) {
  const gaps = Object.entries(aggregateEvidence)
    .filter(([, value]) => value > 0)
    .map(([key, value]) => `${key}:${value}`);

  return gaps.length ? gaps.join(", ") : "0";
}

function auditorProofState(
  proof: PayrollAuditorProof,
  sourceScope: PayrollAuditorProofSourceScope,
): PayrollProofDrawerState {
  if (proof.available) {
    return proof.redactionMode === "UNAVAILABLE" ? "ready" : "redacted";
  }
  return sourceScope.returnedAccountingPeriodIds.length ? "error" : "empty";
}

function auditorProofStateDescription(
  proof: PayrollAuditorProof,
  sourceScope: PayrollAuditorProofSourceScope,
) {
  if (proof.available) {
    return "Accounting service returned redacted payroll auditor proof facts for this workflow.";
  }
  if (sourceScope.returnedAccountingPeriodIds.length) {
    return "An accounting period is linked, but no payroll auditor proof pack facts are available yet.";
  }
  return "No payroll accounting period is available for this workflow yet.";
}

function proofSubject(input: {
  id: string;
  label: string;
  proof: PayrollAuditorProof;
  sourceScope: PayrollAuditorProofSourceScope;
  locale: Locale;
}): PayrollProofDrawerSubject {
  const { id, label, proof, sourceScope, locale } = input;

  return {
    id,
    label,
    status: proof.status,
    source: "services/accounting/data-trust.service.ts",
    href: localizePath("/dashboard/accounting/accountant-portal", locale),
    state: auditorProofState(proof, sourceScope),
    stateDescription: auditorProofStateDescription(proof, sourceScope),
    blockers: proof.blockers.map((blocker) => ({
      id: blocker.id,
      severity: blocker.severity,
      title: blocker.title,
      detail: `Gate: ${blocker.gate}`,
      nextAction: "Resolve the payroll auditor proof gate in the accountant portal.",
    })),
    redactions:
      proof.redactionMode === "UNAVAILABLE"
        ? []
        : [
            {
              field: "payroll.auditorProofPack",
              reason:
                "Auditor proof exposes hashes, source links, and aggregate evidence only.",
              policy: proof.redactionMode,
            },
          ],
    rows: [
      { label: "Available", value: proof.available },
      { label: "Generated", value: proof.generatedAt },
      { label: "Accounting period", value: proof.periodId },
      { label: "Scope hash", value: proof.scopeHash },
      {
        label: "Period coverage",
        value: sourceScope.accountingAuditProofCoverageComplete
          ? "Complete"
          : "Latest returned period only",
      },
      {
        label: "Returned accounting periods",
        value: proofList(sourceScope.returnedAccountingPeriodIds),
      },
      { label: "Trust level", value: proof.trustLevel },
      { label: "Verdict", value: proof.verdict },
      { label: "Exportable", value: proof.exportable },
      { label: "Blockers", value: proof.blockerCount },
      { label: "Critical blockers", value: proof.criticalBlockerCount },
      { label: "High blockers", value: proof.highBlockerCount },
      { label: "Proof gates", value: proof.proofGateCount },
      { label: "Blocked gates", value: proof.blockedProofGateCount },
      { label: "Review gates", value: proof.reviewProofGateCount },
      { label: "Source links", value: proof.sourceLinkCount },
      { label: "Source tables", value: proofList(proof.sourceTables) },
      { label: "Redaction mode", value: proof.redactionMode },
      {
        label: "Redaction excludes",
        value: proofList(proof.redactionExcluded),
      },
      {
        label: "Gate details",
        value: proofList(
          proof.proofGates.map((gate) => `${gate.gate}:${gate.status}`),
        ),
      },
      {
        label: "Gate blockers",
        value: proofList(proof.proofGates.flatMap((gate) => gate.blockerIds)),
      },
      {
        label: "Source link hashes",
        value: proofList(
          proof.latestSourceLinks.map((link) => link.sourceLinkHash),
        ),
      },
      {
        label: "Source link states",
        value: proofList(
          proof.latestSourceLinks.map(
            (link) => `${link.sourceType}:${link.postingStatus}`,
          ),
        ),
      },
      {
        label: "Aggregate gaps",
        value: aggregateGapSummary(proof.aggregateEvidence),
      },
    ],
  };
}

export default function PayrollAuditorProofPanel({
  proof,
  sourceScope,
  locale,
  subjectId,
  label,
}: {
  proof: PayrollAuditorProof;
  sourceScope: PayrollAuditorProofSourceScope;
  locale: Locale;
  subjectId: string;
  label: string;
}) {
  const coverage = sourceScope.accountingAuditProofCoverageComplete
    ? "Complete"
    : "Latest period only";

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.05] p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Landmark className="h-4 w-4 text-cyan-200" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-white">Auditor proof</h2>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge value={proof.status} />
            <Badge value={proof.trustLevel ?? "PENDING"} />
            <Badge value={proof.redactionMode} />
          </div>
        </div>
        <PayrollProofDrawerButton
          subject={proofSubject({
            id: subjectId,
            label,
            proof,
            sourceScope,
            locale,
          })}
          buttonLabel="Auditor proof drawer"
        />
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-md border border-white/10 bg-white/[0.04] p-3">
          <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">
            Period
          </p>
          <p className="mt-1 break-all text-sm text-slate-100">
            {proof.periodId ?? "Pending"}
          </p>
        </div>
        <div className="rounded-md border border-white/10 bg-white/[0.04] p-3">
          <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">
            Gates
          </p>
          <p className="mt-1 text-sm text-slate-100">
            {proof.blockedProofGateCount} blocked / {proof.reviewProofGateCount} review / {proof.proofGateCount} total
          </p>
        </div>
        <div className="rounded-md border border-white/10 bg-white/[0.04] p-3">
          <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">
            Source links
          </p>
          <p className="mt-1 text-sm text-slate-100">
            {proof.sourceLinkCount}
          </p>
        </div>
        <div className="rounded-md border border-white/10 bg-white/[0.04] p-3">
          <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">
            Coverage
          </p>
          <p className="mt-1 text-sm text-slate-100">{coverage}</p>
        </div>
      </div>
    </section>
  );
}
