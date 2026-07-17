import {
  AlertTriangle,
  Banknote,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Landmark,
  LockKeyhole,
  ShieldCheck,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

import type {
  PayrollSeedBackfillDryRunPlan,
  PayrollSetupEvidenceReadModel,
  PayrollSetupReadinessResult,
} from "@/actions/payroll/payroll-setup.actions";

import PayrollProofBackfillExecutionPanel from "./PayrollProofBackfillExecutionPanel";

type Props = {
  readiness: PayrollSetupReadinessResult | null;
  readinessError?: string | null;
  plan: PayrollSeedBackfillDryRunPlan | null;
  planError?: string | null;
  evidence: PayrollSetupEvidenceReadModel | null;
  evidenceError?: string | null;
};

type SetupCheck = {
  label: string;
  value: string;
  state: "READY" | "BLOCKED" | "CHECKED";
  detail: string;
  icon: LucideIcon;
};

type ProofGapKey =
  keyof PayrollSeedBackfillDryRunPlan["proofBackfill"]["gapCounts"];

type ProofGapCopy = {
  label: string;
  detail: string;
};

const PROOF_GAP_COPY: Partial<Record<ProofGapKey, ProofGapCopy>> = {
  payrollRunMissingStatutoryScenarioCoverage: {
    label: "Register statutory review evidence",
    detail:
      "Locked payroll runs are missing statutory scenario coverage status, hash, or reviewed source evidence.",
  },
  declarationEvidenceMissingSourceRegisterHash: {
    label: "Declaration source register hash",
    detail: "Declaration evidence is missing source payroll register proof.",
  },
  declarationEvidenceMissingAuthorityAdapterProof: {
    label: "Authority adapter proof",
    detail: "Declaration evidence is missing authority payload or response proof.",
  },
  declarationEvidenceMissingAuthorityLifecycleProof: {
    label: "Authority lifecycle proof",
    detail:
      "Declaration evidence is missing submission, rejection, amendment, or receipt lifecycle proof.",
  },
  paymentBatchMissingProviderAdapterProof: {
    label: "Payment provider adapter proof",
    detail: "Payment batches are missing provider request or response proof.",
  },
  paymentBatchMissingSettlementRegisterProof: {
    label: "Settlement register proof",
    detail: "Payment batches are missing payroll register settlement proof.",
  },
  paymentBatchMissingSettlementLifecycleProof: {
    label: "Settlement lifecycle proof",
    detail:
      "Payment batches are missing settlement status or reconciliation lifecycle proof.",
  },
};

function proofGapCopy(key: string): ProofGapCopy {
  return (
    PROOF_GAP_COPY[key as ProofGapKey] ?? {
      label: key,
      detail: "Server-provided proof gap count.",
    }
  );
}

function list(values: readonly string[], fallback = "None") {
  return values.length ? values.join(", ") : fallback;
}

function yesNo(value: boolean) {
  return value ? "Ready" : "Blocked";
}

function tone(value: string | null | undefined) {
  const normalized = (value ?? "").toUpperCase();
  if (
    [
      "READY",
      "SUPPORTED",
      "SUPPORTED_CERTIFIED",
      "CREATE",
      "UPSERT",
      "REUSE",
    ].includes(normalized)
  ) {
    return "border-emerald-400/30 bg-emerald-400/10 text-emerald-100";
  }
  if (
    normalized.includes("BLOCKED") ||
    [
      "COUNTRY_PACK_UNAVAILABLE",
      "FAILED",
      "MISSING",
      "NO",
      "NO_EXECUTABLE_SCENARIOS",
      "FALSE",
    ].includes(normalized)
  ) {
    return "border-rose-400/30 bg-rose-400/10 text-rose-100";
  }
  return "border-amber-400/30 bg-amber-400/10 text-amber-100";
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

function ErrorPanel({ title, message }: { title: string; message: string }) {
  return (
    <section className="rounded-lg border border-rose-400/30 bg-rose-950/30 p-5 text-rose-50">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <div className="min-w-0">
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="mt-1 break-words text-sm text-rose-100">{message}</p>
        </div>
      </div>
    </section>
  );
}

function checkRows(readiness: PayrollSetupReadinessResult): SetupCheck[] {
  const accounting = readiness.checks.accounting;
  const tenant = readiness.checks.tenant;
  const countryPack = readiness.checks.countryPack;
  const calculationFixtures = countryPack.calculationFixtures;
  const scenarioCoverage = calculationFixtures.scenarioCoverage;
  const calculationFixturesBlocked =
    calculationFixtures.status.includes("BLOCKED") ||
    [
      "COUNTRY_PACK_UNAVAILABLE",
      "FAILED",
      "NO_EXECUTABLE_SCENARIOS",
    ].includes(calculationFixtures.status);
  const employeeMapping = readiness.checks.employeeUserMapping;

  return [
    {
      label: "Payroll module entitlement",
      value: yesNo(tenant.payrollModuleEntitled),
      state: tenant.payrollModuleEntitled ? "READY" : "BLOCKED",
      detail: tenant.missingModuleDependencies.length
        ? `Missing dependencies: ${list(tenant.missingModuleDependencies)}`
        : "Tenant module access was evaluated by the entitlement service.",
      icon: ShieldCheck,
    },
    {
      label: "Accounting dependency",
      value: yesNo(tenant.accountingDependencyPresent),
      state: tenant.accountingDependencyPresent ? "READY" : "BLOCKED",
      detail: `Accounting setup status: ${accounting.settingsStatus ?? "missing"}.`,
      icon: Landmark,
    },
    {
      label: "Payroll account mappings",
      value: `${accounting.payrollMappingCount}/${accounting.requiredPayrollMappingKeys.length}`,
      state: "CHECKED",
      detail: list(accounting.requiredPayrollMappingKeys),
      icon: ClipboardList,
    },
    {
      label: "Payroll journal",
      value: yesNo(accounting.payrollJournalReady),
      state: accounting.payrollJournalReady ? "READY" : "BLOCKED",
      detail: "Readiness uses the accounting-owned default PAYROLL journal.",
      icon: Landmark,
    },
    {
      label: "Payroll posting rules",
      value: list(accounting.payrollPostingRuleCodes, "No active rules"),
      state: "CHECKED",
      detail:
        "Posting setup remains accounting-owned and balanced by posting-rule templates.",
      icon: Banknote,
    },
    {
      label: "Open accounting period",
      value: accounting.openAccountingPeriodId ? "Covered" : "Missing",
      state: accounting.openAccountingPeriodId ? "READY" : "BLOCKED",
      detail: "Coverage is evaluated against the payroll pay date.",
      icon: CalendarClock,
    },
    {
      label: "Country-pack capability",
      value: list(countryPack.capabilityStatuses, "Not checked"),
      state: countryPack.capabilityStatuses.length ? "CHECKED" : "BLOCKED",
      detail: `Country: ${countryPack.countryCode ?? "missing"}; versions: ${list(countryPack.packVersions, "none")}.`,
      icon: ShieldCheck,
    },
    {
      label: "Calculation fixtures",
      value: calculationFixtures.executableScenarioCount
        ? `${calculationFixtures.passedScenarioCount}/${calculationFixtures.executableScenarioCount} passed`
        : "0 executable",
      state:
        calculationFixtures.status === "READY"
          ? "READY"
          : calculationFixturesBlocked
            ? "BLOCKED"
            : "CHECKED",
      detail: `Status: ${calculationFixtures.status}; pack: ${calculationFixtures.packVersion ?? "none"}; issues: ${list(calculationFixtures.issueCodes)}.`,
      icon: ClipboardList,
    },
    {
      label: "Full-production coverage",
      value: scenarioCoverage
        ? `${scenarioCoverage.readyFamilyCount}/${scenarioCoverage.requiredFamilyCount} families`
        : "Not checked",
      state:
        scenarioCoverage?.status === "READY"
          ? "READY"
          : scenarioCoverage
            ? "BLOCKED"
            : "CHECKED",
      detail: scenarioCoverage
        ? `Status: ${scenarioCoverage.status}; blocked: ${list(scenarioCoverage.blockers.map((item) => item.family))}.`
        : "Scenario family coverage awaits country-pack fixture evidence.",
      icon: ClipboardList,
    },
    {
      label: "Employee-user mapping",
      value: `${employeeMapping.mappedPayrollEmployeeCount} mapped`,
      state:
        employeeMapping.missingUserReferenceCount > 0 ? "BLOCKED" : "CHECKED",
      detail: `${employeeMapping.activeUserCount} active users scanned; ${employeeMapping.plannedEmployeeCreateCount} employee shell(s) would be proposed.`,
      icon: UsersRound,
    },
  ];
}

function CheckGrid({ readiness }: { readiness: PayrollSetupReadinessResult }) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {checkRows(readiness).map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.label}
            className="min-h-[138px] rounded-lg border border-white/10 bg-white/[0.05] p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">{item.label}</p>
                <p className="mt-2 break-words text-lg font-bold text-slate-100">
                  {item.value}
                </p>
              </div>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-100">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge value={item.state} />
            </div>
            <p className="mt-3 break-words text-xs text-slate-400">
              {item.detail}
            </p>
          </div>
        );
      })}
    </section>
  );
}

function IssueList({
  title,
  issues,
  empty,
}: {
  title: string;
  issues: PayrollSetupReadinessResult["blockers"];
  empty: string;
}) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.05]">
      <div className="border-b border-white/10 px-4 py-3">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
      </div>
      {issues.length ? (
        <div className="divide-y divide-white/10">
          {issues.map((issue) => (
            <div
              key={`${issue.severity}-${issue.code}`}
              className="grid gap-3 px-4 py-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start"
            >
              <div className="min-w-0">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <p className="break-words text-sm font-semibold text-white">
                    {issue.code}
                  </p>
                  <Badge value={issue.severity} />
                </div>
                <p className="mt-1 break-words text-xs text-slate-300">
                  {issue.message}
                </p>
                {issue.evidence ? (
                  <p className="mt-2 break-words text-xs text-slate-500">
                    {Object.entries(issue.evidence)
                      .map(([key, value]) => `${key}: ${value}`)
                      .join(" / ")}
                  </p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-4 py-5 text-sm text-slate-400">{empty}</div>
      )}
    </section>
  );
}

function ProofBackfillDryRun({
  plan,
}: {
  plan: PayrollSeedBackfillDryRunPlan;
}) {
  const proofGaps = Object.entries(plan.proofBackfill.gapCounts).map(
    ([key, value]) => ({
      key,
      value,
      ...proofGapCopy(key),
    }),
  );

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.05]">
      <div className="flex flex-col gap-3 border-b border-white/10 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-white">
            Historical proof backfill
          </h2>
          <p className="mt-1 break-all text-xs text-slate-400">
            {plan.proofBackfill.evidenceRef}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge value={plan.proofBackfill.status} />
          <Badge
            value={`${plan.proofBackfill.totalBlockingGaps} proof gap${plan.proofBackfill.totalBlockingGaps === 1 ? "" : "s"}`}
          />
        </div>
      </div>
      <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_minmax(280px,420px)]">
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase tracking-normal text-slate-400">
              <tr>
                <th className="px-4 py-3 font-semibold">Proof gap</th>
                <th className="px-4 py-3 font-semibold">Count</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {proofGaps.map((item) => (
                <tr key={item.key}>
                  <td className="max-w-[360px] break-words px-4 py-3 font-semibold text-white">
                    <p>{item.label}</p>
                    <p className="mt-1 text-xs font-normal text-slate-400">
                      {item.detail}
                    </p>
                    <p className="mt-1 break-all text-[11px] font-normal text-slate-500">
                      {item.key}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-slate-100">{item.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="grid gap-3">
          <div className="rounded-lg border border-white/10 bg-black/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-normal text-slate-400">
              Required signoffs
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {plan.proofBackfill.requiredSignoffs.map((item) => (
                <Badge key={item} value={item} />
              ))}
            </div>
          </div>
          <details className="rounded-lg border border-white/10 bg-black/10 p-4">
            <summary className="cursor-pointer text-sm font-semibold text-white">
              Correction strategy
            </summary>
            <ul className="mt-3 space-y-2 text-xs text-slate-300">
              {plan.proofBackfill.rollbackStrategy.map((item) => (
                <li key={item} className="break-words">
                  {item}
                </li>
              ))}
            </ul>
          </details>
          <details className="rounded-lg border border-white/10 bg-black/10 p-4">
            <summary className="cursor-pointer text-sm font-semibold text-white">
              Reconciliation checks
            </summary>
            <ul className="mt-3 space-y-2 text-xs text-slate-300">
              {plan.proofBackfill.postMigrationReconciliation.map((item) => (
                <li key={item} className="break-words">
                  {item}
                </li>
              ))}
            </ul>
          </details>
        </div>
      </div>
    </section>
  );
}

function PlannedWrites({ plan }: { plan: PayrollSeedBackfillDryRunPlan }) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.05]">
      <div className="flex flex-col gap-3 border-b border-white/10 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-white">
            Seed/backfill dry-run plan
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Generated {plan.generatedAt}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge value={plan.dryRunOnly ? "DRY_RUN_ONLY" : "WRITE_MODE"} />
          <Badge
            value={
              plan.mutationModeAvailable
                ? "MUTATION_AVAILABLE"
                : "MUTATION_BLOCKED"
            }
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-white/10 text-xs uppercase tracking-normal text-slate-400">
            <tr>
              <th className="px-4 py-3 font-semibold">Target</th>
              <th className="px-4 py-3 font-semibold">Operation</th>
              <th className="px-4 py-3 font-semibold">Count</th>
              <th className="px-4 py-3 font-semibold">Idempotency key</th>
              <th className="px-4 py-3 font-semibold">Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {plan.plannedWrites.map((item) => (
              <tr key={`${item.target}-${item.operation}`}>
                <td className="px-4 py-3 font-semibold text-white">
                  {item.target}
                </td>
                <td className="px-4 py-3">
                  <Badge value={item.operation} />
                </td>
                <td className="px-4 py-3 text-slate-100">{item.count}</td>
                <td className="max-w-[240px] break-all px-4 py-3 text-xs text-slate-400">
                  {item.idempotencyKey}
                </td>
                <td className="min-w-[280px] break-words px-4 py-3 text-slate-300">
                  {item.reason}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function CertificateTrail({
  evidence,
}: {
  evidence: PayrollSetupEvidenceReadModel;
}) {
  const certificates = [
    ...evidence.executionCertificates,
    ...evidence.reconciliationCertificates,
  ];

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.05]">
      <div className="flex flex-col gap-3 border-b border-white/10 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-white">
            Proof certificate trail
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Generated {evidence.generatedAt}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge value={evidence.status} />
          <Badge
            value={`${evidence.totals.executionCertificateCount} execution`}
          />
          <Badge
            value={`${evidence.totals.reconciliationCertificateCount} reconciliation`}
          />
        </div>
      </div>

      <div className="grid gap-3 p-4 lg:grid-cols-3">
        <div className="min-h-[104px] rounded-lg border border-white/10 bg-black/10 p-4">
          <p className="text-xs font-semibold uppercase tracking-normal text-slate-400">
            Evidence source
          </p>
          <p className="mt-2 break-words text-lg font-bold text-white">
            {evidence.evidenceSource}
          </p>
          <p className="mt-2 break-all text-xs text-slate-400">
            {evidence.organizationRef}
          </p>
        </div>
        <div className="min-h-[104px] rounded-lg border border-white/10 bg-black/10 p-4">
          <p className="text-xs font-semibold uppercase tracking-normal text-slate-400">
            Latest execution
          </p>
          <p className="mt-2 break-words text-lg font-bold text-white">
            {evidence.latestExecutionCertificate?.status ?? "None"}
          </p>
          <p className="mt-2 break-all text-xs text-slate-400">
            {evidence.latestExecutionCertificate?.certificateHash ??
              "No certificate hash"}
          </p>
        </div>
        <div className="min-h-[104px] rounded-lg border border-white/10 bg-black/10 p-4">
          <p className="text-xs font-semibold uppercase tracking-normal text-slate-400">
            Latest reconciliation
          </p>
          <p className="mt-2 break-words text-lg font-bold text-white">
            {evidence.latestReconciliationCertificate?.status ?? "None"}
          </p>
          <p className="mt-2 break-all text-xs text-slate-400">
            {evidence.latestReconciliationCertificate?.certificateHash ??
              "No certificate hash"}
          </p>
        </div>
      </div>

      {certificates.length ? (
        <div className="divide-y divide-white/10 border-t border-white/10">
          {certificates.map((certificate) => (
            <details
              key={`${certificate.kind}-${certificate.auditLogRef}-${certificate.certificateHash ?? certificate.recordedAt}`}
              className="px-4 py-3"
            >
              <summary className="cursor-pointer list-none">
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-white">
                        {certificate.kind === "execution"
                          ? "Execution certificate"
                          : "Reconciliation certificate"}
                      </p>
                      <Badge value={certificate.status} />
                      {certificate.dataTrustProofGateStatus ? (
                        <Badge value={certificate.dataTrustProofGateStatus} />
                      ) : null}
                    </div>
                    <p className="mt-1 break-all text-xs text-slate-400">
                      {certificate.auditLogRef}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <Badge
                      value={`${certificate.totalBlockingGaps ?? 0} proof gap${certificate.totalBlockingGaps === 1 ? "" : "s"}`}
                    />
                    {certificate.postMigrationProofGapsCleared !== null ? (
                      <Badge
                        value={
                          certificate.postMigrationProofGapsCleared
                            ? "PROOF_CLEARED"
                            : "PROOF_BLOCKED"
                        }
                      />
                    ) : null}
                  </div>
                </div>
              </summary>
              <div className="mt-4 grid gap-3 text-xs text-slate-300 lg:grid-cols-2">
                <div className="rounded-lg border border-white/10 bg-black/10 p-3">
                  <p className="font-semibold text-slate-100">Hashes</p>
                  <p className="mt-2 break-all">
                    Certificate: {certificate.certificateHash ?? "missing"}
                  </p>
                  <p className="mt-1 break-all">
                    Dry-run: {certificate.dryRunEvidenceHash ?? "missing"}
                  </p>
                  <p className="mt-1 break-all">
                    Ledger: {certificate.ledgerKey ?? "missing"}
                  </p>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/10 p-3">
                  <p className="font-semibold text-slate-100">Controls</p>
                  <p className="mt-2">
                    Approval bundle present:{" "}
                    {String(certificate.approvalBundleHashPresent)}
                  </p>
                  <p className="mt-1">
                    Missing signoffs: {certificate.missingSignoffCount ?? 0}
                  </p>
                  <p className="mt-1">
                    Execution enabled: {String(certificate.executionEnabled)}
                  </p>
                  <p className="mt-1">
                    Mutation attempted: {String(certificate.mutationAttempted)}
                  </p>
                  {certificate.sourceCertificateValid !== null ? (
                    <p className="mt-1">
                      Source certificate valid:{" "}
                      {String(certificate.sourceCertificateValid)}
                    </p>
                  ) : null}
                </div>
                <div className="rounded-lg border border-white/10 bg-black/10 p-3 lg:col-span-2">
                  <p className="font-semibold text-slate-100">
                    Data-trust blockers
                  </p>
                  <p className="mt-2 break-words">
                    {certificate.dataTrustBlockerIds.length
                      ? certificate.dataTrustBlockerIds.join(", ")
                      : "None"}
                  </p>
                </div>
              </div>
            </details>
          ))}
        </div>
      ) : (
        <div className="border-t border-white/10 px-4 py-5 text-sm text-slate-400">
          No persisted proof-backfill certificates were returned.
        </div>
      )}
    </section>
  );
}

export default function PayrollSetupControlPlane({
  readiness,
  readinessError,
  plan,
  planError,
  evidence,
  evidenceError,
}: Props) {
  if (!readiness && readinessError) {
    return (
      <ErrorPanel
        title="Payroll setup readiness unavailable"
        message={readinessError}
      />
    );
  }

  if (!readiness) {
    return (
      <ErrorPanel
        title="Payroll setup readiness unavailable"
        message="No setup readiness data is available."
      />
    );
  }

  return (
    <main className="flex min-w-0 flex-col gap-4 text-slate-100">
      <section className="flex flex-col gap-3 border-b border-white/10 pb-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-normal text-cyan-200">
            Payroll setup
          </p>
          <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
            Setup readiness and dry-run control plane
          </h1>
          <p className="mt-2 max-w-4xl text-sm text-slate-300">
            Service-owned setup state for module access, accounting
            dependencies, posting readiness, country-pack capability, employee
            mapping, and seed/backfill dry-run boundaries.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge value={readiness.status} />
          <Badge value={readiness.dryRunOnly ? "DRY_RUN_ONLY" : "WRITE_MODE"} />
          <Badge
            value={
              readiness.checks.tenant.actorCanRunSetupReadiness
                ? "SETUP_ROLE_READY"
                : "SETUP_ROLE_BLOCKED"
            }
          />
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="min-h-[104px] rounded-lg border border-white/10 bg-white/[0.05] p-4">
          <p className="text-xs font-semibold uppercase tracking-normal text-slate-400">
            Organization
          </p>
          <p className="mt-2 break-all text-lg font-bold text-white">
            {readiness.organizationRef}
          </p>
        </div>
        <div className="min-h-[104px] rounded-lg border border-white/10 bg-white/[0.05] p-4">
          <p className="text-xs font-semibold uppercase tracking-normal text-slate-400">
            Country
          </p>
          <p className="mt-2 break-words text-lg font-bold text-white">
            {readiness.input.countryCode ?? "Pending"}
          </p>
        </div>
        <div className="min-h-[104px] rounded-lg border border-white/10 bg-white/[0.05] p-4">
          <p className="text-xs font-semibold uppercase tracking-normal text-slate-400">
            Period
          </p>
          <p className="mt-2 break-words text-lg font-bold text-white">
            {readiness.input.periodStart} to {readiness.input.periodEnd}
          </p>
        </div>
        <div className="min-h-[104px] rounded-lg border border-white/10 bg-white/[0.05] p-4">
          <p className="text-xs font-semibold uppercase tracking-normal text-slate-400">
            Pay date
          </p>
          <p className="mt-2 break-words text-lg font-bold text-white">
            {readiness.input.payDate}
          </p>
        </div>
      </section>

      <CheckGrid readiness={readiness} />

      <section className="grid gap-4 xl:grid-cols-2">
        <IssueList
          title="Readiness blockers"
          issues={readiness.blockers}
          empty="No setup blockers were returned by the service."
        />
        <IssueList
          title="Setup warnings"
          issues={readiness.warnings}
          empty="No setup warnings were returned by the service."
        />
      </section>

      {plan ? <ProofBackfillDryRun plan={plan} /> : null}
      {plan && readiness ? (
        <PayrollProofBackfillExecutionPanel
          setupInput={readiness.input}
          defaultDryRunEvidenceHash={
            evidence?.latestExecutionCertificate?.dryRunEvidenceHash
          }
        />
      ) : null}
      {plan ? <PlannedWrites plan={plan} /> : null}
      {planError ? (
        <ErrorPanel
          title="Seed/backfill dry-run unavailable"
          message={planError}
        />
      ) : null}
      {evidence ? <CertificateTrail evidence={evidence} /> : null}
      {evidenceError ? (
        <ErrorPanel
          title="Proof certificate trail unavailable"
          message={evidenceError}
        />
      ) : null}

      {plan ? (
        <section className="grid gap-3 sm:grid-cols-3">
          <div className="min-h-[96px] rounded-lg border border-white/10 bg-white/[0.05] p-4">
            <div className="flex items-center gap-2 text-emerald-100">
              <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
              <p className="text-sm font-semibold">Person data redacted</p>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Raw person data included:{" "}
              {String(plan.redaction.rawPersonDataIncluded)}
            </p>
          </div>
          <div className="min-h-[96px] rounded-lg border border-white/10 bg-white/[0.05] p-4">
            <div className="flex items-center gap-2 text-emerald-100">
              <LockKeyhole className="h-5 w-5" aria-hidden="true" />
              <p className="text-sm font-semibold">Salary data redacted</p>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Raw salary included: {String(plan.redaction.rawSalaryIncluded)}
            </p>
          </div>
          <div className="min-h-[96px] rounded-lg border border-white/10 bg-white/[0.05] p-4">
            <div className="flex items-center gap-2 text-emerald-100">
              <LockKeyhole className="h-5 w-5" aria-hidden="true" />
              <p className="text-sm font-semibold">Payment data redacted</p>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Raw payment destination included:{" "}
              {String(plan.redaction.rawPaymentDestinationIncluded)}
            </p>
          </div>
        </section>
      ) : null}
    </main>
  );
}
