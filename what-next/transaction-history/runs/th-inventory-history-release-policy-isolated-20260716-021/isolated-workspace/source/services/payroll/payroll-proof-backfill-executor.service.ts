import { createHash } from "crypto";
import {
  PaymentMethod,
  PayrollDeclarationEvidenceTransition,
  PayrollDeclarationStatus,
  PayrollPaymentBatchStatus,
  PayrollRunStatus,
  Prisma,
} from "@prisma/client";

import { db } from "../../prisma/db";
import { BusinessRuleError } from "../_shared/action-errors";
import { hashBusinessPayload } from "../events/business-event.service";
import { getCountryPack } from "../regulatory/country-packs/registry";
import {
  resolvePayrollPaymentProviderAdapterContract,
  resolvePayrollPaymentSettlementLifecycleContract,
} from "./payroll-adapter-registry.service";
import {
  recordPayrollDeclarationEvidence,
} from "./declaration-lifecycle.service";
import {
  generatePayrollSeedBackfillDryRunPlan,
  type PayrollDryRunPlannedWrite,
  type PayrollSeedBackfillDryRunInput,
  type PayrollSeedBackfillDryRunPlan,
} from "./payroll-seed-backfill-plan.service";
import { redactPayrollSetupRef } from "./payroll-setup-readiness.service";
import {
  buildPayrollStatutoryScenarioCoverageSummary,
  type PayrollStatutoryScenarioReviewEvidenceSummary,
} from "./payroll-statutory-scenario-coverage.service";

type DbClient = typeof db | Prisma.TransactionClient;

export type PayrollProofBackfillExecutionMode = "validate" | "execute";
export type PayrollProofBackfillExecutionStatus =
  | "NO_BACKFILL_REQUIRED"
  | "BLOCKED_BY_SETUP"
  | "SIGNOFF_REQUIRED"
  | "EXECUTION_DISABLED"
  | "EXECUTION_COMPLETED";

export type PayrollProofBackfillSignoffBundle = {
  dryRunEvidenceHash?: string | null;
  approvalTokenHash?: string | null;
  payrollAdminApprovedById?: string | null;
  accountingControllerApprovedById?: string | null;
  securityPrivacyApprovedById?: string | null;
  operationsOwnerApprovedById?: string | null;
  approvedAt?: Date | string | null;
  approvalNotes?: string | null;
};

export type PreparePayrollProofBackfillExecutionInput =
  PayrollSeedBackfillDryRunInput & {
    executionMode?: PayrollProofBackfillExecutionMode;
    executionMutationApproved?: boolean | null;
    lastAuthAt?: Date | string | null;
    expectedDryRunEvidenceHash?: string | null;
    adapterChaosReleaseGateHash?: string | null;
    idempotencyKey?: string | null;
    now?: Date | string | null;
    persistCertificate?: boolean | null;
    signoffBundle?: PayrollProofBackfillSignoffBundle | null;
  };

export type PayrollProofBackfillCorrectionIntent = {
  kind: "PAYROLL_PROOF_BACKFILL_CORRECTION_INTENT";
  target: string;
  count: number;
  idempotencyKey: string;
  correlationId: string;
  mutationAllowed: false;
  reason: string;
};

export type PayrollProofBackfillExecutionResult = {
  kind: "PAYROLL_PROOF_BACKFILL_EXECUTION_RESULT";
  target:
    | "PayrollRunStatutoryScenarioCoverageBackfill"
    | "PayrollDeclarationEvidenceRegisterProofBackfill"
    | "PayrollDeclarationEvidenceAuthorityAdapterProofBackfill"
    | "PayrollDeclarationEvidenceAuthorityLifecycleProofBackfill"
    | "PayrollPaymentBatchProviderAdapterProofBackfill"
    | "PayrollPaymentSettlementRegisterProofBackfill"
    | "PayrollPaymentSettlementLifecycleProofBackfill";
  attemptedCount: number;
  updatedCount: number;
  skippedCount: number;
  metadataOnly: true;
  coverageHashes: string[];
  blockerCodes: string[];
};

export type PayrollProofBackfillCertificatePersistence = {
  requested: boolean;
  persisted: boolean;
  auditLogId: string | null;
  entityType: "PayrollProofBackfillExecutionCertificate";
  auditAction: "PAYROLL_PROOF_BACKFILL_EXECUTION_CERTIFICATE_RECORDED" | null;
};

export type PayrollProofBackfillExecutionCertificate = {
  kind: "AQSTOQFLOW_PAYROLL_PROOF_BACKFILL_EXECUTION_CERTIFICATE";
  version: 1;
  status: PayrollProofBackfillExecutionStatus;
  executionMode: PayrollProofBackfillExecutionMode;
  executionEnabled: boolean;
  mutationAttempted: boolean;
  generatedAt: string;
  organizationRef: string;
  actorRef: string | null;
  dryRunEvidenceHash: string;
  expectedDryRunEvidenceHash: string | null;
  dryRunEvidenceMatches: boolean;
  approvalBundleHash: string | null;
  missingSignoffs: string[];
  adapterChaosReleaseGateHash: string | null;
  idempotencyLedger: {
    status: "planned-not-written" | "written";
    idempotencyKey: string;
    ledgerKey: string;
    replayProtection: "dry-run-hash-and-signoff-bundle";
  };
  proofBackfill: PayrollSeedBackfillDryRunPlan["proofBackfill"];
  correctionIntents: PayrollProofBackfillCorrectionIntent[];
  executedBackfills: PayrollProofBackfillExecutionResult[];
  postRunReconciliationCertificate: {
    status: "planned";
    expectedGapCountsAfterRun: Record<
      keyof PayrollSeedBackfillDryRunPlan["proofBackfill"]["gapCounts"],
      0
    >;
    requiredChecks: string[];
  };
  blockers: string[];
  redaction: {
    policy: "payroll-proof-backfill-execution-redaction";
    rawPersonDataIncluded: false;
    rawPaymentDestinationIncluded: false;
    rawSalaryIncluded: false;
    rawProviderPayloadIncluded: false;
  };
  certificateHash: string;
  persistence: PayrollProofBackfillCertificatePersistence;
};

type PayrollProofBackfillExecutionCertificateCore = Omit<
  PayrollProofBackfillExecutionCertificate,
  "persistence"
>;

function stablePayload(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stablePayload);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, entry]) => [key, stablePayload(entry)]),
    );
  }
  return value;
}

function hashPayload(value: unknown) {
  return `sha256:${createHash("sha256")
    .update(JSON.stringify(stablePayload(value)))
    .digest("hex")}`;
}

function safeJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
}

const PAYROLL_REGISTER_PROOF_RUN_STATUSES = [
  PayrollRunStatus.POSTED,
  PayrollRunStatus.PAID,
  PayrollRunStatus.ARCHIVED,
] as const;

const CLOSE_IMPACTING_DECLARATION_TRANSITIONS = [
  PayrollDeclarationEvidenceTransition.SUBMIT,
  PayrollDeclarationEvidenceTransition.ACCEPT,
  PayrollDeclarationEvidenceTransition.REJECT,
  PayrollDeclarationEvidenceTransition.MARK_PAYMENT_DUE,
  PayrollDeclarationEvidenceTransition.MARK_PAID,
  PayrollDeclarationEvidenceTransition.RECONCILE,
  PayrollDeclarationEvidenceTransition.AMEND,
] as const;

const DECLARATION_BACKFILL_AMENDABLE_STATUSES: readonly PayrollDeclarationStatus[] = [
  PayrollDeclarationStatus.SUBMITTED,
  PayrollDeclarationStatus.ACCEPTED,
  PayrollDeclarationStatus.REJECTED,
  PayrollDeclarationStatus.PAYMENT_DUE,
  PayrollDeclarationStatus.PAID,
  PayrollDeclarationStatus.RECONCILED,
  PayrollDeclarationStatus.ARCHIVED,
] as const;

const PAYMENT_ADAPTER_PROOF_STATUSES = [
  PayrollPaymentBatchStatus.RELEASED,
  PayrollPaymentBatchStatus.PARTIALLY_SETTLED,
  PayrollPaymentBatchStatus.SETTLED,
] as const;

const PAYMENT_SETTLEMENT_PROOF_STATUSES = [
  PayrollPaymentBatchStatus.PARTIALLY_SETTLED,
  PayrollPaymentBatchStatus.SETTLED,
] as const;

type PayrollStatutoryScenarioCoverageSnapshot = {
  status: "READY" | "BLOCKED" | "UNAVAILABLE";
  countryCode: string;
  packVersion: string;
  coverageHash: string;
  executableScenarioCount: number;
  readyFamilyCount: number;
  requiredFamilyCount: number;
  blockerCodes: string[];
  reviewEvidence: PayrollStatutoryScenarioReviewEvidenceSummary;
};

type PreparedPayrollRunStatutoryCoverageBackfill = {
  runId: string;
  runRef: string;
  coverageHash: string;
  metadata: Prisma.InputJsonValue;
};

type PreparedDeclarationRegisterProofBackfill = {
  declarationId: string;
  coveredEvidenceIds: string[];
  sourceRegisterHash: string;
  idempotencyKey: string;
  metadata: Record<string, unknown>;
};

type DeclarationRegisterProofBackfillRow = {
  id: string;
  declarationId: string;
  createdAt: Date;
  declaration: {
    id: string;
    payrollRun: {
      id: string;
      runNumber: string;
      documentHash: string | null;
      evidenceHash: string | null;
    };
  };
};

type PreparedDeclarationAuthorityProofBackfill = {
  declarationId: string;
  coveredAdapterEvidenceIds: string[];
  coveredLifecycleEvidenceIds: string[];
  sourceRegisterHash: string;
  authorityChannel: string;
  authorityEnvironment: string;
  authorityStatus: string;
  authorityAdapterKey: string | null;
  authorityResponseHash: string | null;
  portalReceiptHash: string | null;
  supportingFileHash: string | null;
  idempotencyKey: string;
  metadata: Record<string, unknown>;
  coversAuthorityAdapterProof: boolean;
  coversAuthorityLifecycleProof: boolean;
};

type DeclarationAuthorityProofBackfillRow = {
  id: string;
  declarationId: string;
  sourceRegisterHash: string | null;
  authorityChannel: string;
  authorityEnvironment: string;
  authorityStatus: string;
  authorityResponseHash: string | null;
  portalReceiptHash: string | null;
  supportingFileHash: string | null;
  metadata: Prisma.JsonValue | null;
  createdAt: Date;
  declaration: {
    id: string;
    status: PayrollDeclarationStatus;
    payrollRun: {
      id: string;
      runNumber: string;
      documentHash: string | null;
      evidenceHash: string | null;
    };
  };
};

type PreparedPaymentBatchProofBackfill = {
  batchId: string;
  batchRef: string;
  coversProviderAdapterProof: boolean;
  coversSettlementRegisterProof: boolean;
  coversSettlementLifecycleProof: boolean;
  paymentAdapterProofHash: string | null;
  settlementSourceRegisterHash: string | null;
  settlementLifecycleContractHash: string | null;
  metadata: Prisma.InputJsonValue;
};

type PaymentBatchProofBackfillRow = {
  id: string;
  batchNumber: string;
  status: PayrollPaymentBatchStatus;
  method: PaymentMethod;
  bankFileHash: string | null;
  documentHash: string | null;
  evidenceHash: string | null;
  metadata: Prisma.JsonValue | null;
  createdAt: Date;
  payrollRun: {
    id: string;
    runNumber: string;
    documentHash: string | null;
    evidenceHash: string | null;
  };
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function metadataString(value: unknown, key: string) {
  const entry = asRecord(value)[key];
  return typeof entry === "string" && entry.trim().length > 0
    ? entry.trim()
    : null;
}

function prefixedHash(value: unknown) {
  return `sha256:${hashBusinessPayload(value)}`;
}

function emptyStatutoryScenarioReviewEvidence(): PayrollStatutoryScenarioReviewEvidenceSummary {
  return {
    presentCount: 0,
    missingCount: 0,
    reviewedBy: [],
    reviewedOn: [],
    legalRefs: [],
    sourceEvidenceHashes: [],
  };
}

function statutoryScenarioCoverageSnapshot(
  countryCode: string,
  countryPackVersion: string,
): PayrollStatutoryScenarioCoverageSnapshot {
  const unavailablePayload = {
    status: "UNAVAILABLE" as const,
    countryCode,
    packVersion: countryPackVersion,
    executableScenarioCount: 0,
    readyFamilyCount: 0,
    requiredFamilyCount: 0,
    blockerCodes: ["PAYROLL_STATUTORY_SCENARIO_COUNTRY_PACK_UNAVAILABLE"],
    reviewEvidence: emptyStatutoryScenarioReviewEvidence(),
  };
  const pack = getCountryPack(countryCode, countryPackVersion);

  if (!pack) {
    return {
      ...unavailablePayload,
      coverageHash: prefixedHash(unavailablePayload),
    };
  }

  const summary = buildPayrollStatutoryScenarioCoverageSummary(pack);
  const payload = {
    status: summary.status,
    countryCode: summary.countryCode,
    packVersion: summary.packVersion,
    executableScenarioCount: summary.executableScenarioCount,
    readyFamilyCount: summary.readyFamilyCount,
    requiredFamilyCount: summary.requiredFamilyCount,
    blockerCodes: summary.blockers.map((blocker) => blocker.code).sort(),
    reviewEvidence: summary.reviewEvidence,
  };

  return {
    ...payload,
    coverageHash: prefixedHash(payload),
  };
}

function statutoryCoverageBackfillBlocker(
  snapshot: PayrollStatutoryScenarioCoverageSnapshot,
) {
  if (snapshot.status !== "READY") {
    return "PAYROLL_STATUTORY_COVERAGE_BACKFILL_SOURCE_BLOCKED";
  }
  if (snapshot.reviewEvidence.missingCount > 0) {
    return "PAYROLL_STATUTORY_COVERAGE_BACKFILL_REVIEW_EVIDENCE_MISSING";
  }
  if (snapshot.reviewEvidence.sourceEvidenceHashes.length === 0) {
    return "PAYROLL_STATUTORY_COVERAGE_BACKFILL_SOURCE_HASH_MISSING";
  }
  return null;
}

function payrollRunMissingStatutoryScenarioCoverageWhere(organizationId: string) {
  return {
    organizationId,
    status: { in: [...PAYROLL_REGISTER_PROOF_RUN_STATUSES] },
    deletedAt: null,
    OR: [
      { metadata: { equals: Prisma.AnyNull } },
      {
        metadata: {
          path: ["statutoryScenarioCoverageHash"],
          equals: Prisma.AnyNull,
        },
      },
      { metadata: { path: ["statutoryScenarioCoverageHash"], equals: "" } },
      {
        metadata: {
          path: ["statutoryScenarioCoverage", "status"],
          equals: Prisma.AnyNull,
        },
      },
      { metadata: { path: ["statutoryScenarioCoverage", "status"], equals: "" } },
      {
        metadata: {
          path: [
            "statutoryScenarioCoverage",
            "reviewEvidence",
            "sourceEvidenceHashes",
          ],
          equals: Prisma.AnyNull,
        },
      },
    ],
  };
}

async function preparePayrollRunStatutoryCoverageBackfills(
  input: PreparePayrollProofBackfillExecutionInput,
  execution: {
    ledgerKey: string;
    dryRunEvidenceHash: string;
    approvalBundleHash: string | null;
    adapterChaosReleaseGateHash: string | null;
    executedAt: string;
  },
  client: DbClient,
) {
  const runs = await client.payrollRun.findMany({
    where: payrollRunMissingStatutoryScenarioCoverageWhere(input.organizationId),
    select: {
      id: true,
      runNumber: true,
      countryCode: true,
      countryPackVersion: true,
      metadata: true,
      createdAt: true,
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  const prepared: PreparedPayrollRunStatutoryCoverageBackfill[] = [];
  const blockerCodes = new Set<string>();

  for (const run of runs) {
    const snapshot = statutoryScenarioCoverageSnapshot(
      run.countryCode,
      run.countryPackVersion,
    );
    const blocker = statutoryCoverageBackfillBlocker(snapshot);
    if (blocker) {
      blockerCodes.add(blocker);
      continue;
    }

    const metadata = asRecord(run.metadata);
    const previousCoverage = asRecord(metadata.statutoryScenarioCoverage);
    const previousCoverageHash =
      metadataString(metadata, "statutoryScenarioCoverageHash") ??
      metadataString(previousCoverage, "coverageHash");

    prepared.push({
      runId: run.id,
      runRef: redactPayrollSetupRef(run.id) ?? "redacted:run",
      coverageHash: snapshot.coverageHash,
      metadata: safeJson({
        ...metadata,
        statutoryScenarioCoverage: snapshot,
        statutoryScenarioCoverageHash: snapshot.coverageHash,
        statutoryScenarioCoverageBackfill: {
          kind: "PAYROLL_RUN_STATUTORY_SCENARIO_COVERAGE_BACKFILL",
          metadataOnly: true,
          source: "payroll-proof-backfill-executor",
          executedAt: execution.executedAt,
          ledgerKey: execution.ledgerKey,
          dryRunEvidenceHash: execution.dryRunEvidenceHash,
          approvalBundleHash: execution.approvalBundleHash,
          adapterChaosReleaseGateHash: execution.adapterChaosReleaseGateHash,
          previousCoverageHash,
        },
      }),
    });
  }

  return {
    runCount: runs.length,
    prepared,
    blockerCodes: [...blockerCodes].sort(),
  };
}

function declarationRegisterProofBackfillCoverageWhere(organizationId: string) {
  return {
    organizationId,
    transition: PayrollDeclarationEvidenceTransition.AMEND,
    sourceRegisterHash: { not: null },
    metadata: {
      path: ["proofBackfill", "coversDeclarationRegisterProof"],
      equals: true,
    },
  };
}

function declarationAuthorityAdapterProofBackfillCoverageWhere(
  organizationId: string,
) {
  return {
    organizationId,
    transition: PayrollDeclarationEvidenceTransition.AMEND,
    metadata: {
      path: ["proofBackfill", "coversDeclarationAuthorityAdapterProof"],
      equals: true,
    },
  };
}

function declarationAuthorityLifecycleProofBackfillCoverageWhere(
  organizationId: string,
) {
  return {
    organizationId,
    transition: PayrollDeclarationEvidenceTransition.AMEND,
    metadata: {
      path: ["proofBackfill", "coversDeclarationAuthorityLifecycleProof"],
      equals: true,
    },
  };
}

function declarationEvidenceMissingSourceRegisterHashWhere(
  organizationId: string,
) {
  return {
    organizationId,
    transition: { in: [...CLOSE_IMPACTING_DECLARATION_TRANSITIONS] },
    OR: [{ sourceRegisterHash: null }, { sourceRegisterHash: "" }],
    declaration: {
      evidenceItems: {
        none: declarationRegisterProofBackfillCoverageWhere(organizationId),
      },
    },
  };
}

function declarationEvidenceMissingAuthorityAdapterProofWhere(
  organizationId: string,
) {
  return {
    organizationId,
    transition: { in: [...CLOSE_IMPACTING_DECLARATION_TRANSITIONS] },
    OR: [
      { metadata: { equals: Prisma.AnyNull } },
      {
        metadata: {
          path: ["authorityAdapterProofHash"],
          equals: Prisma.AnyNull,
        },
      },
      { metadata: { path: ["authorityAdapterProofHash"], equals: "" } },
      {
        metadata: {
          path: ["authorityAdapterContractHash"],
          equals: Prisma.AnyNull,
        },
      },
      { metadata: { path: ["authorityAdapterContractHash"], equals: "" } },
    ],
    declaration: {
      evidenceItems: {
        none: declarationAuthorityAdapterProofBackfillCoverageWhere(
          organizationId,
        ),
      },
    },
  };
}

function declarationEvidenceMissingAuthorityLifecycleProofWhere(
  organizationId: string,
) {
  return {
    organizationId,
    transition: { in: [...CLOSE_IMPACTING_DECLARATION_TRANSITIONS] },
    OR: [
      { metadata: { equals: Prisma.AnyNull } },
      {
        metadata: {
          path: ["authorityLifecycleContractHash"],
          equals: Prisma.AnyNull,
        },
      },
      {
        metadata: { path: ["authorityLifecycleContractHash"], equals: "" },
      },
      {
        metadata: {
          path: ["authorityLifecycleStatus"],
          equals: Prisma.AnyNull,
        },
      },
      { metadata: { path: ["authorityLifecycleStatus"], equals: "" } },
      {
        metadata: {
          path: ["authorityLifecycleCloseImpact"],
          equals: Prisma.AnyNull,
        },
      },
      { metadata: { path: ["authorityLifecycleCloseImpact"], equals: "" } },
    ],
    declaration: {
      evidenceItems: {
        none: declarationAuthorityLifecycleProofBackfillCoverageWhere(
          organizationId,
        ),
      },
    },
  };
}
function paymentProviderAdapterProofBackfillCoverageWhere() {
  return {
    metadata: {
      path: ["proofBackfill", "coversPaymentProviderAdapterProof"],
      equals: true,
    },
  };
}

function paymentSettlementRegisterProofBackfillCoverageWhere() {
  return {
    metadata: {
      path: ["proofBackfill", "coversPaymentSettlementRegisterProof"],
      equals: true,
    },
  };
}

function paymentSettlementLifecycleProofBackfillCoverageWhere() {
  return {
    metadata: {
      path: ["proofBackfill", "coversPaymentSettlementLifecycleProof"],
      equals: true,
    },
  };
}

function paymentBatchMissingProviderAdapterProofWhere(organizationId: string) {
  return {
    organizationId,
    status: { in: [...PAYMENT_ADAPTER_PROOF_STATUSES] },
    OR: [
      { metadata: { equals: Prisma.AnyNull } },
      {
        metadata: {
          path: ["paymentAdapterProofHash"],
          equals: Prisma.AnyNull,
        },
      },
      { metadata: { path: ["paymentAdapterProofHash"], equals: "" } },
      {
        metadata: {
          path: ["paymentProviderAdapterContractHash"],
          equals: Prisma.AnyNull,
        },
      },
      {
        metadata: {
          path: ["paymentProviderAdapterContractHash"],
          equals: "",
        },
      },
    ],
    NOT: paymentProviderAdapterProofBackfillCoverageWhere(),
  };
}

function paymentBatchMissingSettlementRegisterProofWhere(
  organizationId: string,
) {
  return {
    organizationId,
    status: { in: [...PAYMENT_SETTLEMENT_PROOF_STATUSES] },
    OR: [
      { metadata: { equals: Prisma.AnyNull } },
      {
        metadata: {
          path: ["latestSettlementSourceRegisterHash"],
          equals: Prisma.AnyNull,
        },
      },
      {
        metadata: {
          path: ["latestSettlementSourceRegisterHash"],
          equals: "",
        },
      },
    ],
    NOT: paymentSettlementRegisterProofBackfillCoverageWhere(),
  };
}

function paymentBatchMissingSettlementLifecycleProofWhere(
  organizationId: string) {
  return {
    organizationId,
    status: { in: [...PAYMENT_SETTLEMENT_PROOF_STATUSES] },
    OR: [
      { metadata: { equals: Prisma.AnyNull } },
      {
        metadata: {
          path: ["latestSettlementLifecycleContractHash"],
          equals: Prisma.AnyNull,
        },
      },
      {
        metadata: {
          path: ["latestSettlementLifecycleContractHash"],
          equals: "",
        },
      },
      {
        metadata: {
          path: ["latestSettlementLifecycleStatus"],
          equals: Prisma.AnyNull,
        },
      },
      {
        metadata: { path: ["latestSettlementLifecycleStatus"], equals: "" },
      },
    ],
    NOT: paymentSettlementLifecycleProofBackfillCoverageWhere(),
  };
}
function declarationBackfillApprovedBy(input: PreparePayrollProofBackfillExecutionInput) {
  const approver = input.signoffBundle?.accountingControllerApprovedById ?? null;
  return approver && approver !== input.actorId ? approver : null;
}

function declarationRegisterBackfillPreflightBlockers(
  input: PreparePayrollProofBackfillExecutionInput,
  declarationGapCount: number,
) {
  if (declarationGapCount <= 0) return [];
  const blockers: string[] = [];
  if (!input.actorId) blockers.push("MISSING_DECLARATION_BACKFILL_ACTOR");
  if (!input.lastAuthAt) blockers.push("MISSING_FRESH_AUTH_EVIDENCE");
  if (!(input.actorPermissions ?? []).includes("payroll.declarations.manage")) {
    blockers.push("MISSING_PAYROLL_DECLARATIONS_MANAGE_PERMISSION");
  }
  if (!declarationBackfillApprovedBy(input)) {
    blockers.push("MISSING_INDEPENDENT_DECLARATION_BACKFILL_APPROVER");
  }
  return blockers;
}

function paymentBackfillApprovedBy(input: PreparePayrollProofBackfillExecutionInput) {
  const approver = input.signoffBundle?.accountingControllerApprovedById ?? null;
  return approver && approver !== input.actorId ? approver : null;
}

function paymentBackfillPreflightBlockers(
  input: PreparePayrollProofBackfillExecutionInput,
  paymentGapCount: number,
) {
  if (paymentGapCount <= 0) return [];
  const blockers: string[] = [];
  if (!input.actorId) blockers.push("MISSING_PAYMENT_BACKFILL_ACTOR");
  if (!input.lastAuthAt) blockers.push("MISSING_FRESH_AUTH_EVIDENCE");
  if (!(input.actorPermissions ?? []).includes("payroll.payments.reconcile")) {
    blockers.push("MISSING_PAYROLL_PAYMENTS_RECONCILE_PERMISSION");
  }
  if (!paymentBackfillApprovedBy(input)) {
    blockers.push("MISSING_INDEPENDENT_PAYMENT_BACKFILL_APPROVER");
  }
  return blockers;
}
async function prepareDeclarationRegisterProofBackfills(
  input: PreparePayrollProofBackfillExecutionInput,
  execution: {
    ledgerKey: string;
    dryRunEvidenceHash: string;
    approvalBundleHash: string | null;
    adapterChaosReleaseGateHash: string | null;
    executedAt: string;
  },
  client: DbClient,
) {
  const rows = (await client.payrollDeclarationEvidence.findMany({
    where: declarationEvidenceMissingSourceRegisterHashWhere(input.organizationId),
    select: {
      id: true,
      declarationId: true,
      declaration: {
        select: {
          id: true,
          payrollRun: {
            select: {
              id: true,
              runNumber: true,
              documentHash: true,
              evidenceHash: true,
            },
          },
        },
      },
      createdAt: true,
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  })) as unknown as DeclarationRegisterProofBackfillRow[];
  const byDeclaration = new Map<string, typeof rows>();
  const blockerCodes = new Set<string>();

  for (const row of rows) {
    const existing = byDeclaration.get(row.declarationId) ?? [];
    existing.push(row);
    byDeclaration.set(row.declarationId, existing);
  }

  const prepared: PreparedDeclarationRegisterProofBackfill[] = [];
  for (const [declarationId, declarationRows] of byDeclaration.entries()) {
    const declaration = declarationRows[0]?.declaration;
    const sourceRegisterHash =
      declaration?.payrollRun.documentHash ?? declaration?.payrollRun.evidenceHash ?? null;
    if (!sourceRegisterHash) {
      blockerCodes.add("PAYROLL_DECLARATION_REGISTER_BACKFILL_SOURCE_HASH_MISSING");
      continue;
    }

    const coveredEvidenceIds = declarationRows.map((row) => row.id).sort();
    prepared.push({
      declarationId,
      coveredEvidenceIds,
      sourceRegisterHash,
      idempotencyKey: `payroll-declaration-register-proof-backfill:${declarationId}:${execution.ledgerKey.slice(7, 23)}`,
      metadata: {
        proofBackfill: {
          kind: "PAYROLL_DECLARATION_REGISTER_PROOF_BACKFILL",
          metadataOnly: false,
          appendOnlyEvidence: true,
          coversDeclarationRegisterProof: true,
          coveredEvidenceIds: coveredEvidenceIds.map(
            (id) => redactPayrollSetupRef(id) ?? "redacted:evidence",
          ),
          coveredEvidenceCount: coveredEvidenceIds.length,
          source: "payroll-proof-backfill-executor",
          executedAt: execution.executedAt,
          ledgerKey: execution.ledgerKey,
          dryRunEvidenceHash: execution.dryRunEvidenceHash,
          approvalBundleHash: execution.approvalBundleHash,
          adapterChaosReleaseGateHash: execution.adapterChaosReleaseGateHash,
          sourceRegisterHash,
        },
      },
    });
  }

  return {
    evidenceGapCount: rows.length,
    prepared,
    blockerCodes: [...blockerCodes].sort(),
  };
}

async function executeDeclarationRegisterProofBackfill(
  input: PreparePayrollProofBackfillExecutionInput,
  preparedBackfills: Awaited<
    ReturnType<typeof prepareDeclarationRegisterProofBackfills>
  >,
  client: DbClient,
): Promise<PayrollProofBackfillExecutionResult> {
  if (preparedBackfills.blockerCodes.length > 0) {
    return {
      kind: "PAYROLL_PROOF_BACKFILL_EXECUTION_RESULT",
      target: "PayrollDeclarationEvidenceRegisterProofBackfill",
      attemptedCount: preparedBackfills.evidenceGapCount,
      updatedCount: 0,
      skippedCount: preparedBackfills.evidenceGapCount,
      metadataOnly: true,
      coverageHashes: [],
      blockerCodes: preparedBackfills.blockerCodes,
    };
  }

  const evidenceHashes: string[] = [];
  const approvedById = declarationBackfillApprovedBy(input);
  if (!approvedById) {
    return {
      kind: "PAYROLL_PROOF_BACKFILL_EXECUTION_RESULT",
      target: "PayrollDeclarationEvidenceRegisterProofBackfill",
      attemptedCount: preparedBackfills.evidenceGapCount,
      updatedCount: 0,
      skippedCount: preparedBackfills.evidenceGapCount,
      metadataOnly: true,
      coverageHashes: [],
      blockerCodes: ["MISSING_INDEPENDENT_DECLARATION_BACKFILL_APPROVER"],
    };
  }

  const actorId = input.actorId ?? "";
  const actorPermissions = [...(input.actorPermissions ?? [])];

  for (const prepared of preparedBackfills.prepared) {
    const result = await recordPayrollDeclarationEvidence({
      organizationId: input.organizationId,
      declarationId: prepared.declarationId,
      transition: "amend",
      actorId,
      actorPermissions,
      lastAuthAt: input.lastAuthAt ?? undefined,
      now: input.now ?? undefined,
      authorityChannel: "PAYROLL_PROOF_BACKFILL",
      authorityEnvironment: "INTERNAL_CONTROL",
      authorityStatus: "REGISTER_PROOF_BACKFILLED",
      supportingFileHash: input.expectedDryRunEvidenceHash ?? input.signoffBundle?.dryRunEvidenceHash ?? undefined,
      sourceRegisterHash: prepared.sourceRegisterHash,
      approvedById,
      idempotencyKey: prepared.idempotencyKey,
      metadata: prepared.metadata,
    }, client);
    const evidenceHash = metadataString(result.evidence, "evidenceHash");
    if (evidenceHash) evidenceHashes.push(evidenceHash);
  }

  return {
    kind: "PAYROLL_PROOF_BACKFILL_EXECUTION_RESULT",
    target: "PayrollDeclarationEvidenceRegisterProofBackfill",
    attemptedCount: preparedBackfills.evidenceGapCount,
    updatedCount: preparedBackfills.prepared.length,
    skippedCount:
      preparedBackfills.evidenceGapCount - preparedBackfills.prepared.length,
    metadataOnly: true,
    coverageHashes: [...new Set(evidenceHashes)].sort(),
    blockerCodes: [],
  };
}

function declarationAuthorityProofSelect() {
  return {
    id: true,
    declarationId: true,
    sourceRegisterHash: true,
    authorityChannel: true,
    authorityEnvironment: true,
    authorityStatus: true,
    authorityResponseHash: true,
    portalReceiptHash: true,
    supportingFileHash: true,
    metadata: true,
    createdAt: true,
    declaration: {
      select: {
        id: true,
        status: true,
        payrollRun: {
          select: {
            id: true,
            runNumber: true,
            documentHash: true,
            evidenceHash: true,
          },
        },
      },
    },
  };
}

async function prepareDeclarationAuthorityProofBackfills(
  input: PreparePayrollProofBackfillExecutionInput,
  execution: {
    ledgerKey: string;
    dryRunEvidenceHash: string;
    approvalBundleHash: string | null;
    adapterChaosReleaseGateHash: string | null;
    executedAt: string;
  },
  client: DbClient,
) {
  const select = declarationAuthorityProofSelect();
  const [adapterRows, lifecycleRows] = (await Promise.all([
    client.payrollDeclarationEvidence.findMany({
      where: declarationEvidenceMissingAuthorityAdapterProofWhere(
        input.organizationId,
      ),
      select,
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    }),
    client.payrollDeclarationEvidence.findMany({
      where: declarationEvidenceMissingAuthorityLifecycleProofWhere(
        input.organizationId,
      ),
      select,
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    }),
  ])) as unknown as [
    DeclarationAuthorityProofBackfillRow[],
    DeclarationAuthorityProofBackfillRow[],
  ];
  const byDeclaration = new Map<
    string,
    {
      adapterRows: DeclarationAuthorityProofBackfillRow[];
      lifecycleRows: DeclarationAuthorityProofBackfillRow[];
    }
  >();
  const addRows = (
    rows: DeclarationAuthorityProofBackfillRow[],
    key: "adapterRows" | "lifecycleRows",
  ) => {
    for (const row of rows) {
      const existing = byDeclaration.get(row.declarationId) ?? {
        adapterRows: [],
        lifecycleRows: [],
      };
      existing[key].push(row);
      byDeclaration.set(row.declarationId, existing);
    }
  };
  addRows(adapterRows, "adapterRows");
  addRows(lifecycleRows, "lifecycleRows");

  const prepared: PreparedDeclarationAuthorityProofBackfill[] = [];
  const blockerCodes = new Set<string>();

  for (const [declarationId, groupedRows] of byDeclaration.entries()) {
    const rowsById = new Map<string, DeclarationAuthorityProofBackfillRow>();
    for (const row of [...groupedRows.adapterRows, ...groupedRows.lifecycleRows]) {
      rowsById.set(row.id, row);
    }
    const rows = [...rowsById.values()].sort((a, b) => {
      const byDate = a.createdAt.getTime() - b.createdAt.getTime();
      return byDate || a.id.localeCompare(b.id);
    });
    const anchor = rows[0];
    if (!anchor) continue;

    if (
      !DECLARATION_BACKFILL_AMENDABLE_STATUSES.includes(
        anchor.declaration.status,
      )
    ) {
      blockerCodes.add("PAYROLL_DECLARATION_AUTHORITY_BACKFILL_STATUS_NOT_AMENDABLE");
      continue;
    }

    const sourceRegisterHash =
      anchor.sourceRegisterHash ??
      anchor.declaration.payrollRun.documentHash ??
      anchor.declaration.payrollRun.evidenceHash ??
      null;
    if (!sourceRegisterHash) {
      blockerCodes.add("PAYROLL_DECLARATION_AUTHORITY_BACKFILL_SOURCE_HASH_MISSING");
      continue;
    }

    const coveredAdapterEvidenceIds = groupedRows.adapterRows
      .map((row) => row.id)
      .sort();
    const coveredLifecycleEvidenceIds = groupedRows.lifecycleRows
      .map((row) => row.id)
      .sort();
    const allCoveredEvidenceIds = [...new Set([
      ...coveredAdapterEvidenceIds,
      ...coveredLifecycleEvidenceIds,
    ])].sort();
    const anchorMetadata = asRecord(anchor.metadata);
    const authorityAdapterKey = metadataString(
      anchorMetadata,
      "authorityAdapterKey",
    );

    prepared.push({
      declarationId,
      coveredAdapterEvidenceIds,
      coveredLifecycleEvidenceIds,
      sourceRegisterHash,
      authorityChannel: anchor.authorityChannel || "PAYROLL_PROOF_BACKFILL",
      authorityEnvironment: anchor.authorityEnvironment || "MANUAL_EVIDENCE",
      authorityStatus: anchor.authorityStatus || "AUTHORITY_PROOF_BACKFILLED",
      authorityAdapterKey,
      authorityResponseHash: anchor.authorityResponseHash,
      portalReceiptHash: anchor.portalReceiptHash,
      supportingFileHash: anchor.supportingFileHash,
      idempotencyKey: `payroll-declaration-authority-proof-backfill:${declarationId}:${execution.ledgerKey.slice(7, 23)}`,
      coversAuthorityAdapterProof: coveredAdapterEvidenceIds.length > 0,
      coversAuthorityLifecycleProof: coveredLifecycleEvidenceIds.length > 0,
      metadata: {
        proofBackfill: {
          kind: "PAYROLL_DECLARATION_AUTHORITY_PROOF_BACKFILL",
          metadataOnly: false,
          appendOnlyEvidence: true,
          coversDeclarationAuthorityAdapterProof:
            coveredAdapterEvidenceIds.length > 0,
          coversDeclarationAuthorityLifecycleProof:
            coveredLifecycleEvidenceIds.length > 0,
          coveredAdapterEvidenceIds: coveredAdapterEvidenceIds.map(
            (id) => redactPayrollSetupRef(id) ?? "redacted:evidence",
          ),
          coveredLifecycleEvidenceIds: coveredLifecycleEvidenceIds.map(
            (id) => redactPayrollSetupRef(id) ?? "redacted:evidence",
          ),
          coveredEvidenceIds: allCoveredEvidenceIds.map(
            (id) => redactPayrollSetupRef(id) ?? "redacted:evidence",
          ),
          coveredAdapterEvidenceCount: coveredAdapterEvidenceIds.length,
          coveredLifecycleEvidenceCount: coveredLifecycleEvidenceIds.length,
          coveredEvidenceCount: allCoveredEvidenceIds.length,
          source: "payroll-proof-backfill-executor",
          executedAt: execution.executedAt,
          ledgerKey: execution.ledgerKey,
          dryRunEvidenceHash: execution.dryRunEvidenceHash,
          approvalBundleHash: execution.approvalBundleHash,
          adapterChaosReleaseGateHash: execution.adapterChaosReleaseGateHash,
          sourceRegisterHash,
          authorityChannel: anchor.authorityChannel,
          authorityEnvironment: anchor.authorityEnvironment,
        },
      },
    });
  }

  return {
    adapterEvidenceGapCount: adapterRows.length,
    lifecycleEvidenceGapCount: lifecycleRows.length,
    prepared,
    blockerCodes: [...blockerCodes].sort(),
  };
}

async function executeDeclarationAuthorityProofBackfill(
  input: PreparePayrollProofBackfillExecutionInput,
  preparedBackfills: Awaited<
    ReturnType<typeof prepareDeclarationAuthorityProofBackfills>
  >,
  client: DbClient,
): Promise<PayrollProofBackfillExecutionResult[]> {
  const blockedResult = (
    target:
      | "PayrollDeclarationEvidenceAuthorityAdapterProofBackfill"
      | "PayrollDeclarationEvidenceAuthorityLifecycleProofBackfill",
    attemptedCount: number,
    blockerCodes: string[],
  ): PayrollProofBackfillExecutionResult => ({
    kind: "PAYROLL_PROOF_BACKFILL_EXECUTION_RESULT",
    target,
    attemptedCount,
    updatedCount: 0,
    skippedCount: attemptedCount,
    metadataOnly: true,
    coverageHashes: [],
    blockerCodes,
  });

  if (preparedBackfills.blockerCodes.length > 0) {
    return [
      preparedBackfills.adapterEvidenceGapCount > 0
        ? blockedResult(
            "PayrollDeclarationEvidenceAuthorityAdapterProofBackfill",
            preparedBackfills.adapterEvidenceGapCount,
            preparedBackfills.blockerCodes,
          )
        : null,
      preparedBackfills.lifecycleEvidenceGapCount > 0
        ? blockedResult(
            "PayrollDeclarationEvidenceAuthorityLifecycleProofBackfill",
            preparedBackfills.lifecycleEvidenceGapCount,
            preparedBackfills.blockerCodes,
          )
        : null,
    ].filter(Boolean) as PayrollProofBackfillExecutionResult[];
  }

  const approvedById = declarationBackfillApprovedBy(input);
  if (!approvedById) {
    return [
      preparedBackfills.adapterEvidenceGapCount > 0
        ? blockedResult(
            "PayrollDeclarationEvidenceAuthorityAdapterProofBackfill",
            preparedBackfills.adapterEvidenceGapCount,
            ["MISSING_INDEPENDENT_DECLARATION_BACKFILL_APPROVER"],
          )
        : null,
      preparedBackfills.lifecycleEvidenceGapCount > 0
        ? blockedResult(
            "PayrollDeclarationEvidenceAuthorityLifecycleProofBackfill",
            preparedBackfills.lifecycleEvidenceGapCount,
            ["MISSING_INDEPENDENT_DECLARATION_BACKFILL_APPROVER"],
          )
        : null,
    ].filter(Boolean) as PayrollProofBackfillExecutionResult[];
  }

  const evidenceHashes: string[] = [];
  const actorId = input.actorId ?? "";
  const actorPermissions = [...(input.actorPermissions ?? [])];

  for (const prepared of preparedBackfills.prepared) {
    const result = await recordPayrollDeclarationEvidence({
      organizationId: input.organizationId,
      declarationId: prepared.declarationId,
      transition: "amend",
      actorId,
      actorPermissions,
      lastAuthAt: input.lastAuthAt ?? undefined,
      now: input.now ?? undefined,
      authorityChannel: prepared.authorityChannel,
      authorityEnvironment: prepared.authorityEnvironment,
      authorityStatus: prepared.authorityStatus,
      authorityAdapterKey: prepared.authorityAdapterKey ?? undefined,
      authorityResponseHash: prepared.authorityResponseHash ?? undefined,
      portalReceiptHash: prepared.portalReceiptHash ?? undefined,
      supportingFileHash:
        prepared.supportingFileHash ??
        input.expectedDryRunEvidenceHash ??
        input.signoffBundle?.dryRunEvidenceHash ??
        undefined,
      sourceRegisterHash: prepared.sourceRegisterHash,
      approvedById,
      adapterChaosReleaseGateHash: input.adapterChaosReleaseGateHash ?? undefined,
      idempotencyKey: prepared.idempotencyKey,
      metadata: prepared.metadata,
    }, client);
    const evidenceHash = metadataString(result.evidence, "evidenceHash");
    if (evidenceHash) evidenceHashes.push(evidenceHash);
  }

  const coverageHashes = [...new Set(evidenceHashes)].sort();
  const adapterUpdatedCount = preparedBackfills.prepared.filter(
    (backfill) => backfill.coversAuthorityAdapterProof,
  ).length;
  const lifecycleUpdatedCount = preparedBackfills.prepared.filter(
    (backfill) => backfill.coversAuthorityLifecycleProof,
  ).length;

  return [
    preparedBackfills.adapterEvidenceGapCount > 0
      ? {
          kind: "PAYROLL_PROOF_BACKFILL_EXECUTION_RESULT" as const,
          target: "PayrollDeclarationEvidenceAuthorityAdapterProofBackfill" as const,
          attemptedCount: preparedBackfills.adapterEvidenceGapCount,
          updatedCount: adapterUpdatedCount,
          skippedCount:
            preparedBackfills.adapterEvidenceGapCount - adapterUpdatedCount,
          metadataOnly: true,
          coverageHashes,
          blockerCodes: [],
        }
      : null,
    preparedBackfills.lifecycleEvidenceGapCount > 0
      ? {
          kind: "PAYROLL_PROOF_BACKFILL_EXECUTION_RESULT" as const,
          target: "PayrollDeclarationEvidenceAuthorityLifecycleProofBackfill" as const,
          attemptedCount: preparedBackfills.lifecycleEvidenceGapCount,
          updatedCount: lifecycleUpdatedCount,
          skippedCount:
            preparedBackfills.lifecycleEvidenceGapCount - lifecycleUpdatedCount,
          metadataOnly: true,
          coverageHashes,
          blockerCodes: [],
        }
      : null,
  ].filter(Boolean) as PayrollProofBackfillExecutionResult[];
}
function paymentBatchProofSelect() {
  return {
    id: true,
    batchNumber: true,
    status: true,
    method: true,
    bankFileHash: true,
    documentHash: true,
    evidenceHash: true,
    metadata: true,
    createdAt: true,
    payrollRun: {
      select: {
        id: true,
        runNumber: true,
        documentHash: true,
        evidenceHash: true,
      },
    },
  };
}

function paymentProviderAdapterProofMetadata(input: {
  batch: PaymentBatchProofBackfillRow;
  metadata: Record<string, unknown>;
  adapterChaosReleaseGateHash: string | null;
}) {
  const requestedMetadata: Record<string, unknown> = {
    ...input.metadata,
    adapterChaosReleaseGateHash:
      metadataString(input.metadata, "adapterChaosReleaseGateHash") ??
      input.adapterChaosReleaseGateHash,
  };
  const adapterContract = resolvePayrollPaymentProviderAdapterContract({
    method: input.batch.method,
    bankFileHash: input.batch.bankFileHash,
    requestedAdapterKey: metadataString(
      requestedMetadata,
      "paymentProviderAdapterKey",
    ),
    requestedStatus:
      metadataString(requestedMetadata, "requestedPaymentAdapterStatus") ??
      metadataString(requestedMetadata, "paymentAdapterStatus"),
    providerCredentialProofHash: metadataString(
      requestedMetadata,
      "providerCredentialProofHash",
    ),
    providerPayloadMappingHash: metadataString(
      requestedMetadata,
      "providerPayloadMappingHash",
    ),
    providerResponseMappingHash: metadataString(
      requestedMetadata,
      "providerResponseMappingHash",
    ),
    providerAdapterRequestHash: metadataString(
      requestedMetadata,
      "providerAdapterRequestHash",
    ),
    providerAdapterResponseHash: metadataString(
      requestedMetadata,
      "providerAdapterResponseHash",
    ),
    providerSettlementReceiptHash: metadataString(
      requestedMetadata,
      "providerSettlementReceiptHash",
    ),
    providerCertificationHarnessHash: metadataString(
      requestedMetadata,
      "providerCertificationHarnessHash",
    ),
    providerIdempotencyKey: metadataString(
      requestedMetadata,
      "providerIdempotencyKey",
    ),
    providerAttempt:
      typeof requestedMetadata.providerAttempt === "number"
        ? requestedMetadata.providerAttempt
        : null,
  });
  const adapterChaosReleaseGateHash = metadataString(
    requestedMetadata,
    "adapterChaosReleaseGateHash",
  );
  const proof = {
    kind: "AQSTOQFLOW_PAYROLL_PAYMENT_PROVIDER_ADAPTER_PROOF",
    version: 1,
    method: input.batch.method,
    paymentProviderAdapterKey: adapterContract.paymentProviderAdapterKey,
    paymentAdapterStatus: adapterContract.paymentAdapterStatus,
    paymentAdapterRegistryVersion: adapterContract.paymentAdapterRegistryVersion,
    paymentProviderAdapterContractHash:
      adapterContract.paymentProviderAdapterContractHash,
    disbursementFileRequired: adapterContract.disbursementFileRequired,
    paymentDisbursementFileHash: adapterContract.paymentDisbursementFileHash,
    providerCredentialProofHash: adapterContract.providerCredentialProofHash,
    providerPayloadMappingHash: adapterContract.providerPayloadMappingHash,
    providerResponseMappingHash: adapterContract.providerResponseMappingHash,
    providerAdapterRequestHash: adapterContract.providerAdapterRequestHash,
    providerAdapterResponseHash: adapterContract.providerAdapterResponseHash,
    providerSettlementReceiptHash: adapterContract.providerSettlementReceiptHash,
    providerCertificationHarnessHash:
      adapterContract.providerCertificationHarnessHash,
    providerIdempotencyKey: adapterContract.providerIdempotencyKey,
    providerAttempt: adapterContract.providerAttempt,
    providerSettlementProofRequired:
      adapterContract.providerSettlementProofRequired,
    productionPaymentAutomationSupported:
      adapterContract.productionPaymentAutomationSupported,
    paymentAdapterRegistryDecision: adapterContract.registryDecision,
    paymentAdapterCertificationBlockers: adapterContract.certificationBlockers,
    paymentAdapterCertificationProofComplete:
      adapterContract.certificationProofComplete,
    adapterChaosReleaseGateHash: adapterChaosReleaseGateHash ?? null,
    acceptedSettlementEvidence: adapterContract.acceptedSettlementEvidence,
    paymentProviderAdapterContract: adapterContract.contract,
  };

  return {
    ...adapterContract,
    adapterChaosReleaseGateHash: adapterChaosReleaseGateHash ?? null,
    paymentAdapterProofHash: prefixedHash(proof),
    paymentAdapterProof: proof,
  };
}

function paymentProviderEvidence(metadata: Record<string, unknown>) {
  return {
    providerAccountId: metadataString(metadata, "providerAccountId"),
    providerTransactionId: metadataString(metadata, "providerTransactionId"),
    providerReference: metadataString(metadata, "providerReference"),
    providerEventId: metadataString(metadata, "providerEventId"),
    statementLineId: metadataString(metadata, "statementLineId"),
    statementFileHash: metadataString(metadata, "statementFileHash"),
    matchRecordId: metadataString(metadata, "matchRecordId"),
    reconciliationRunId: metadataString(metadata, "reconciliationRunId"),
  };
}

async function preparePaymentBatchProofBackfills(
  input: PreparePayrollProofBackfillExecutionInput,
  execution: {
    ledgerKey: string;
    dryRunEvidenceHash: string;
    approvalBundleHash: string | null;
    adapterChaosReleaseGateHash: string | null;
    executedAt: string;
  },
  client: DbClient,
) {
  const select = paymentBatchProofSelect();
  const [providerRows, settlementRegisterRows, settlementLifecycleRows] =
    (await Promise.all([
      client.payrollPaymentBatch.findMany({
        where: paymentBatchMissingProviderAdapterProofWhere(
          input.organizationId,
        ),
        select,
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      }),
      client.payrollPaymentBatch.findMany({
        where: paymentBatchMissingSettlementRegisterProofWhere(
          input.organizationId,
        ),
        select,
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      }),
      client.payrollPaymentBatch.findMany({
        where: paymentBatchMissingSettlementLifecycleProofWhere(
          input.organizationId,
        ),
        select,
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      }),
    ])) as unknown as [
      PaymentBatchProofBackfillRow[],
      PaymentBatchProofBackfillRow[],
      PaymentBatchProofBackfillRow[],
    ];

  const byBatch = new Map<
    string,
    {
      provider: PaymentBatchProofBackfillRow | null;
      settlementRegister: PaymentBatchProofBackfillRow | null;
      settlementLifecycle: PaymentBatchProofBackfillRow | null;
    }
  >();
  const addRows = (
    rows: PaymentBatchProofBackfillRow[],
    key: "provider" | "settlementRegister" | "settlementLifecycle",
  ) => {
    for (const row of rows) {
      const existing = byBatch.get(row.id) ?? {
        provider: null,
        settlementRegister: null,
        settlementLifecycle: null,
      };
      existing[key] = row;
      byBatch.set(row.id, existing);
    }
  };
  addRows(providerRows, "provider");
  addRows(settlementRegisterRows, "settlementRegister");
  addRows(settlementLifecycleRows, "settlementLifecycle");

  const prepared: PreparedPaymentBatchProofBackfill[] = [];
  const blockerCodes = new Set<string>();

  for (const [batchId, groupedRows] of byBatch.entries()) {
    const batch =
      groupedRows.provider ??
      groupedRows.settlementRegister ??
      groupedRows.settlementLifecycle;
    if (!batch) continue;
    const metadata = asRecord(batch.metadata);
    const existingProofBackfill = asRecord(metadata.proofBackfill);
    const coversProviderAdapterProof = Boolean(groupedRows.provider);
    const coversSettlementRegisterProof = Boolean(groupedRows.settlementRegister);
    const coversSettlementLifecycleProof = Boolean(groupedRows.settlementLifecycle);

    let providerMetadata: Record<string, unknown> = {};
    let paymentAdapterProofHash = metadataString(
      metadata,
      "paymentAdapterProofHash",
    );
    let paymentProviderAdapterContractHash = metadataString(
      metadata,
      "paymentProviderAdapterContractHash",
    );
    let paymentProviderAdapterKey = metadataString(
      metadata,
      "paymentProviderAdapterKey",
    );

    if (coversProviderAdapterProof || !paymentAdapterProofHash) {
      const adapterMetadata = paymentProviderAdapterProofMetadata({
        batch,
        metadata,
        adapterChaosReleaseGateHash: execution.adapterChaosReleaseGateHash,
      });
      if (adapterMetadata.disbursementFileRequired && !batch.bankFileHash) {
        blockerCodes.add("PAYROLL_PAYMENT_PROVIDER_BACKFILL_DISBURSEMENT_FILE_HASH_MISSING");
        continue;
      }
      paymentAdapterProofHash = adapterMetadata.paymentAdapterProofHash;
      paymentProviderAdapterContractHash =
        adapterMetadata.paymentProviderAdapterContractHash;
      paymentProviderAdapterKey = adapterMetadata.paymentProviderAdapterKey;
      providerMetadata = {
        paymentAdapterProofHash,
        paymentAdapterProof: adapterMetadata.paymentAdapterProof,
        paymentAdapterRegistryVersion:
          adapterMetadata.paymentAdapterRegistryVersion,
        paymentProviderAdapterContractHash,
        paymentProviderAdapterContract: adapterMetadata.contract,
        paymentAdapterStatus: adapterMetadata.paymentAdapterStatus,
        paymentProviderAdapterKey,
        paymentDisbursementFileHash:
          adapterMetadata.paymentDisbursementFileHash,
        providerCredentialProofHash:
          adapterMetadata.providerCredentialProofHash,
        providerPayloadMappingHash:
          adapterMetadata.providerPayloadMappingHash,
        providerResponseMappingHash:
          adapterMetadata.providerResponseMappingHash,
        providerAdapterRequestHash:
          adapterMetadata.providerAdapterRequestHash,
        providerAdapterResponseHash:
          adapterMetadata.providerAdapterResponseHash,
        providerSettlementReceiptHash:
          adapterMetadata.providerSettlementReceiptHash,
        providerCertificationHarnessHash:
          adapterMetadata.providerCertificationHarnessHash,
        providerIdempotencyKey: adapterMetadata.providerIdempotencyKey,
        providerAttempt: adapterMetadata.providerAttempt,
        providerSettlementProofRequired:
          adapterMetadata.providerSettlementProofRequired,
        productionPaymentAutomationSupported:
          adapterMetadata.productionPaymentAutomationSupported,
        disbursementFileRequired: adapterMetadata.disbursementFileRequired,
        acceptedSettlementEvidence:
          adapterMetadata.acceptedSettlementEvidence,
        paymentAdapterRegistryDecision: adapterMetadata.registryDecision,
        paymentAdapterCertificationBlockers:
          adapterMetadata.certificationBlockers,
        paymentAdapterCertificationProofComplete:
          adapterMetadata.certificationProofComplete,
        adapterChaosReleaseGateHash:
          adapterMetadata.adapterChaosReleaseGateHash,
      };
    }

    const settlementSourceRegisterHash =
      metadataString(metadata, "latestSettlementSourceRegisterHash") ??
      metadataString(metadata, "sourceRegisterHash") ??
      batch.documentHash ??
      batch.evidenceHash ??
      batch.payrollRun.documentHash ??
      batch.payrollRun.evidenceHash ??
      null;
    if (
      (coversSettlementRegisterProof || coversSettlementLifecycleProof) &&
      !settlementSourceRegisterHash
    ) {
      blockerCodes.add("PAYROLL_PAYMENT_SETTLEMENT_BACKFILL_SOURCE_HASH_MISSING");
      continue;
    }
    if (
      coversSettlementLifecycleProof &&
      (!paymentAdapterProofHash ||
        !paymentProviderAdapterContractHash ||
        !paymentProviderAdapterKey)
    ) {
      blockerCodes.add("PAYROLL_PAYMENT_SETTLEMENT_BACKFILL_PROVIDER_PROOF_MISSING");
      continue;
    }

    const inputEvidenceHash =
      metadataString(metadata, "latestSettlementEvidenceHash") ??
      batch.evidenceHash ??
      batch.documentHash ??
      execution.dryRunEvidenceHash;
    const settlementLifecycle = coversSettlementLifecycleProof
      ? resolvePayrollPaymentSettlementLifecycleContract({
          settlementStatus:
            batch.status === PayrollPaymentBatchStatus.SETTLED
              ? "settled"
              : "partially_settled",
          sourceRegisterHash: settlementSourceRegisterHash,
          inputEvidenceHash,
          paymentAdapterProofHash: paymentAdapterProofHash as string,
          paymentProviderAdapterContractHash:
            paymentProviderAdapterContractHash as string,
          paymentProviderAdapterKey: paymentProviderAdapterKey as string,
          providerEvidence: paymentProviderEvidence(metadata),
        })
      : null;

    prepared.push({
      batchId,
      batchRef: redactPayrollSetupRef(batchId) ?? "redacted:payment-batch",
      coversProviderAdapterProof,
      coversSettlementRegisterProof,
      coversSettlementLifecycleProof,
      paymentAdapterProofHash,
      settlementSourceRegisterHash,
      settlementLifecycleContractHash:
        settlementLifecycle?.providerSettlementLifecycleContractHash ?? null,
      metadata: safeJson({
        ...metadata,
        ...providerMetadata,
        ...(coversSettlementRegisterProof && settlementSourceRegisterHash
          ? { latestSettlementSourceRegisterHash: settlementSourceRegisterHash }
          : {}),
        ...(settlementLifecycle
          ? {
              latestSettlementLifecycleContractHash:
                settlementLifecycle.providerSettlementLifecycleContractHash,
              latestSettlementLifecycleStatus:
                settlementLifecycle.providerSettlementLifecycleStatus,
              latestSettlementLifecycleCloseImpact:
                settlementLifecycle.providerSettlementLifecycleCloseImpact,
              latestSettlementLifecycleNextAction:
                settlementLifecycle.providerSettlementLifecycleNextAction,
              latestSettlementLifecycleContract:
                settlementLifecycle.providerSettlementLifecycleContract,
            }
          : {}),
        proofBackfill: {
          ...existingProofBackfill,
          kind: "PAYROLL_PAYMENT_BATCH_PROOF_BACKFILL",
          metadataOnly: true,
          coversPaymentProviderAdapterProof:
            Boolean(existingProofBackfill.coversPaymentProviderAdapterProof) ||
            coversProviderAdapterProof,
          coversPaymentSettlementRegisterProof:
            Boolean(existingProofBackfill.coversPaymentSettlementRegisterProof) ||
            coversSettlementRegisterProof,
          coversPaymentSettlementLifecycleProof:
            Boolean(existingProofBackfill.coversPaymentSettlementLifecycleProof) ||
            coversSettlementLifecycleProof,
          source: "payroll-proof-backfill-executor",
          executedAt: execution.executedAt,
          ledgerKey: execution.ledgerKey,
          dryRunEvidenceHash: execution.dryRunEvidenceHash,
          approvalBundleHash: execution.approvalBundleHash,
          adapterChaosReleaseGateHash: execution.adapterChaosReleaseGateHash,
          previousPaymentAdapterProofHash: metadataString(
            metadata,
            "paymentAdapterProofHash",
          ),
          previousSettlementSourceRegisterHash: metadataString(
            metadata,
            "latestSettlementSourceRegisterHash",
          ),
          previousSettlementLifecycleContractHash: metadataString(
            metadata,
            "latestSettlementLifecycleContractHash",
          ),
          paymentAdapterProofHash,
          settlementSourceRegisterHash,
          settlementLifecycleContractHash:
            settlementLifecycle?.providerSettlementLifecycleContractHash ?? null,
        },
      }),
    });
  }

  return {
    providerGapCount: providerRows.length,
    settlementRegisterGapCount: settlementRegisterRows.length,
    settlementLifecycleGapCount: settlementLifecycleRows.length,
    prepared,
    blockerCodes: [...blockerCodes].sort(),
  };
}

async function executePaymentBatchProofBackfill(
  preparedBackfills: Awaited<ReturnType<typeof preparePaymentBatchProofBackfills>>,
  client: DbClient,
): Promise<PayrollProofBackfillExecutionResult[]> {
  const blockedResult = (
    target:
      | "PayrollPaymentBatchProviderAdapterProofBackfill"
      | "PayrollPaymentSettlementRegisterProofBackfill"
      | "PayrollPaymentSettlementLifecycleProofBackfill",
    attemptedCount: number,
    blockerCodes: string[],
  ): PayrollProofBackfillExecutionResult => ({
    kind: "PAYROLL_PROOF_BACKFILL_EXECUTION_RESULT",
    target,
    attemptedCount,
    updatedCount: 0,
    skippedCount: attemptedCount,
    metadataOnly: true,
    coverageHashes: [],
    blockerCodes,
  });

  if (preparedBackfills.blockerCodes.length > 0) {
    return [
      preparedBackfills.providerGapCount > 0
        ? blockedResult(
            "PayrollPaymentBatchProviderAdapterProofBackfill",
            preparedBackfills.providerGapCount,
            preparedBackfills.blockerCodes,
          )
        : null,
      preparedBackfills.settlementRegisterGapCount > 0
        ? blockedResult(
            "PayrollPaymentSettlementRegisterProofBackfill",
            preparedBackfills.settlementRegisterGapCount,
            preparedBackfills.blockerCodes,
          )
        : null,
      preparedBackfills.settlementLifecycleGapCount > 0
        ? blockedResult(
            "PayrollPaymentSettlementLifecycleProofBackfill",
            preparedBackfills.settlementLifecycleGapCount,
            preparedBackfills.blockerCodes,
          )
        : null,
    ].filter(Boolean) as PayrollProofBackfillExecutionResult[];
  }

  for (const prepared of preparedBackfills.prepared) {
    await client.payrollPaymentBatch.update({
      where: { id: prepared.batchId },
      data: { metadata: prepared.metadata },
    });
  }

  const coverageHashes = [
    ...new Set(
      preparedBackfills.prepared.flatMap((backfill) =>
        [
          backfill.paymentAdapterProofHash,
          backfill.settlementSourceRegisterHash,
          backfill.settlementLifecycleContractHash,
        ].filter((hash): hash is string => Boolean(hash)),
      ),
    ),
  ].sort();
  const providerUpdatedCount = preparedBackfills.prepared.filter(
    (backfill) => backfill.coversProviderAdapterProof,
  ).length;
  const settlementRegisterUpdatedCount = preparedBackfills.prepared.filter(
    (backfill) => backfill.coversSettlementRegisterProof,
  ).length;
  const settlementLifecycleUpdatedCount = preparedBackfills.prepared.filter(
    (backfill) => backfill.coversSettlementLifecycleProof,
  ).length;

  return [
    preparedBackfills.providerGapCount > 0
      ? {
          kind: "PAYROLL_PROOF_BACKFILL_EXECUTION_RESULT" as const,
          target: "PayrollPaymentBatchProviderAdapterProofBackfill" as const,
          attemptedCount: preparedBackfills.providerGapCount,
          updatedCount: providerUpdatedCount,
          skippedCount: preparedBackfills.providerGapCount - providerUpdatedCount,
          metadataOnly: true,
          coverageHashes,
          blockerCodes: [],
        }
      : null,
    preparedBackfills.settlementRegisterGapCount > 0
      ? {
          kind: "PAYROLL_PROOF_BACKFILL_EXECUTION_RESULT" as const,
          target: "PayrollPaymentSettlementRegisterProofBackfill" as const,
          attemptedCount: preparedBackfills.settlementRegisterGapCount,
          updatedCount: settlementRegisterUpdatedCount,
          skippedCount:
            preparedBackfills.settlementRegisterGapCount -
            settlementRegisterUpdatedCount,
          metadataOnly: true,
          coverageHashes,
          blockerCodes: [],
        }
      : null,
    preparedBackfills.settlementLifecycleGapCount > 0
      ? {
          kind: "PAYROLL_PROOF_BACKFILL_EXECUTION_RESULT" as const,
          target: "PayrollPaymentSettlementLifecycleProofBackfill" as const,
          attemptedCount: preparedBackfills.settlementLifecycleGapCount,
          updatedCount: settlementLifecycleUpdatedCount,
          skippedCount:
            preparedBackfills.settlementLifecycleGapCount -
            settlementLifecycleUpdatedCount,
          metadataOnly: true,
          coverageHashes,
          blockerCodes: [],
        }
      : null,
  ].filter(Boolean) as PayrollProofBackfillExecutionResult[];
}
async function executePayrollRunStatutoryCoverageBackfill(
  preparedBackfills: Awaited<
    ReturnType<typeof preparePayrollRunStatutoryCoverageBackfills>
  >,
  client: DbClient,
): Promise<PayrollProofBackfillExecutionResult> {
  if (preparedBackfills.blockerCodes.length > 0) {
    return {
      kind: "PAYROLL_PROOF_BACKFILL_EXECUTION_RESULT",
      target: "PayrollRunStatutoryScenarioCoverageBackfill",
      attemptedCount: preparedBackfills.runCount,
      updatedCount: 0,
      skippedCount: preparedBackfills.runCount,
      metadataOnly: true,
      coverageHashes: [],
      blockerCodes: preparedBackfills.blockerCodes,
    };
  }

  for (const prepared of preparedBackfills.prepared) {
    await client.payrollRun.update({
      where: { id: prepared.runId },
      data: { metadata: prepared.metadata },
    });
  }

  return {
    kind: "PAYROLL_PROOF_BACKFILL_EXECUTION_RESULT",
    target: "PayrollRunStatutoryScenarioCoverageBackfill",
    attemptedCount: preparedBackfills.runCount,
    updatedCount: preparedBackfills.prepared.length,
    skippedCount: preparedBackfills.runCount - preparedBackfills.prepared.length,
    metadataOnly: true,
    coverageHashes: [
      ...new Set(preparedBackfills.prepared.map((item) => item.coverageHash)),
    ].sort(),
    blockerCodes: [],
  };
}

function normalizeDate(
  value: Date | string | null | undefined,
  fallback: Date,
) {
  if (!value) return fallback;
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new BusinessRuleError(
      "Payroll proof backfill execution received an invalid date.",
    );
  }
  return parsed;
}

function requireApprovedExecutionMode(
  input: PreparePayrollProofBackfillExecutionInput,
) {
  if (
    input.executionMode === "execute" &&
    input.executionMutationApproved !== true
  ) {
    throw new BusinessRuleError(
      "Payroll proof backfill execution is disabled by default; run validate mode with reviewed dry-run evidence and signoff.",
    );
  }
}

function dryRunEvidencePayload(plan: PayrollSeedBackfillDryRunPlan) {
  return {
    organizationRef: plan.organizationRef,
    input: plan.input,
    proofBackfill: {
      evidenceRef: plan.proofBackfill.evidenceRef,
      totalBlockingGaps: plan.proofBackfill.totalBlockingGaps,
      gapCounts: plan.proofBackfill.gapCounts,
      plannedJobs: plan.proofBackfill.plannedJobs.map((job) => ({
        target: job.target,
        operation: job.operation,
        count: job.count,
        idempotencyKey: job.idempotencyKey,
      })),
      requiredSignoffs: plan.proofBackfill.requiredSignoffs,
    },
    redactionPolicy: plan.redaction.policy,
  };
}

function signoffPayload(bundle: PayrollProofBackfillSignoffBundle) {
  return {
    dryRunEvidenceHash: bundle.dryRunEvidenceHash ?? null,
    approvalTokenHash: bundle.approvalTokenHash ?? null,
    payrollAdminApprovedByRef: redactPayrollSetupRef(
      bundle.payrollAdminApprovedById,
    ),
    accountingControllerApprovedByRef: redactPayrollSetupRef(
      bundle.accountingControllerApprovedById,
    ),
    securityPrivacyApprovedByRef: redactPayrollSetupRef(
      bundle.securityPrivacyApprovedById,
    ),
    operationsOwnerApprovedByRef: redactPayrollSetupRef(
      bundle.operationsOwnerApprovedById,
    ),
    approvedAt: bundle.approvedAt
      ? normalizeDate(bundle.approvedAt, new Date()).toISOString()
      : null,
    approvalNotesPresent: Boolean(bundle.approvalNotes?.trim()),
  };
}

function missingSignoffs(
  bundle: PayrollProofBackfillSignoffBundle | null | undefined,
  expectedDryRunEvidenceHash: string | null,
  actualDryRunEvidenceHash: string,
  adapterChaosReleaseGateHash: string | null,
) {
  const missing: string[] = [];
  if (!expectedDryRunEvidenceHash) missing.push("dry-run-evidence-hash");
  if (
    expectedDryRunEvidenceHash &&
    expectedDryRunEvidenceHash !== actualDryRunEvidenceHash
  ) {
    missing.push("dry-run-evidence-hash-match");
  }
  if (!bundle?.approvalTokenHash) missing.push("approval-token-hash");
  if (!bundle?.payrollAdminApprovedById) missing.push("payroll-admin-signoff");
  if (!bundle?.accountingControllerApprovedById)
    missing.push("accounting-controller-signoff");
  if (!bundle?.securityPrivacyApprovedById)
    missing.push("security-privacy-signoff");
  if (!bundle?.operationsOwnerApprovedById)
    missing.push("operations-owner-signoff");
  if (!bundle?.approvedAt) missing.push("approved-at");
  if (!adapterChaosReleaseGateHash)
    missing.push("adapter-chaos-release-gate-hash");
  return missing;
}

function correctionIntents(
  plannedJobs: PayrollDryRunPlannedWrite[],
  correlationId: string,
): PayrollProofBackfillCorrectionIntent[] {
  return plannedJobs
    .filter((job) => job.count > 0)
    .map((job) => ({
      kind: "PAYROLL_PROOF_BACKFILL_CORRECTION_INTENT" as const,
      target: job.target,
      count: job.count,
      idempotencyKey: job.idempotencyKey,
      correlationId,
      mutationAllowed: false as const,
      reason: job.reason,
    }));
}

function zeroGapCounts(plan: PayrollSeedBackfillDryRunPlan) {
  return Object.fromEntries(
    Object.keys(plan.proofBackfill.gapCounts).map((key) => [key, 0]),
  ) as Record<
    keyof PayrollSeedBackfillDryRunPlan["proofBackfill"]["gapCounts"],
    0
  >;
}

function statusFor(input: {
  plan: PayrollSeedBackfillDryRunPlan;
  missingSignoffs: string[];
}): PayrollProofBackfillExecutionStatus {
  if (input.plan.proofBackfill.totalBlockingGaps === 0)
    return "NO_BACKFILL_REQUIRED";
  if (
    input.plan.readiness.status === "BLOCKED" &&
    input.plan.readiness.blockers.length > 0
  )
    return "BLOCKED_BY_SETUP";
  if (input.missingSignoffs.length > 0) return "SIGNOFF_REQUIRED";
  return "EXECUTION_DISABLED";
}

function certificateAuditPayload(
  certificate: PayrollProofBackfillExecutionCertificateCore,
) {
  return {
    before: null,
    after: {
      kind: certificate.kind,
      version: certificate.version,
      status: certificate.status,
      executionMode: certificate.executionMode,
      executionEnabled: certificate.executionEnabled,
      mutationAttempted: certificate.mutationAttempted,
      generatedAt: certificate.generatedAt,
      organizationRef: certificate.organizationRef,
      actorRef: certificate.actorRef,
      certificateHash: certificate.certificateHash,
      dryRunEvidenceHash: certificate.dryRunEvidenceHash,
      expectedDryRunEvidenceHash: certificate.expectedDryRunEvidenceHash,
      dryRunEvidenceMatches: certificate.dryRunEvidenceMatches,
      approvalBundleHash: certificate.approvalBundleHash,
      missingSignoffs: certificate.missingSignoffs,
      adapterChaosReleaseGateHash: certificate.adapterChaosReleaseGateHash,
      idempotencyLedger: certificate.idempotencyLedger,
      proofBackfill: {
        evidenceRef: certificate.proofBackfill.evidenceRef,
        totalBlockingGaps: certificate.proofBackfill.totalBlockingGaps,
        gapCounts: certificate.proofBackfill.gapCounts,
        plannedJobCount: certificate.proofBackfill.plannedJobs.length,
        requiredSignoffs: certificate.proofBackfill.requiredSignoffs,
      },
      correctionIntentCount: certificate.correctionIntents.length,
      correctionIntents: certificate.correctionIntents,
      executedBackfillCount: certificate.executedBackfills.length,
      executedBackfills: certificate.executedBackfills,
      postRunReconciliationCertificate:
        certificate.postRunReconciliationCertificate,
      blockers: certificate.blockers,
      redaction: certificate.redaction,
    },
  };
}

async function persistPayrollProofBackfillExecutionCertificate(
  certificate: PayrollProofBackfillExecutionCertificateCore,
  input: PreparePayrollProofBackfillExecutionInput,
  client: DbClient,
): Promise<PayrollProofBackfillExecutionCertificate> {
  const audit = await client.auditLog.create({
    data: {
      entityType: "PayrollProofBackfillExecutionCertificate",
      entityId: certificate.idempotencyLedger.ledgerKey,
      action: "PAYROLL_PROOF_BACKFILL_EXECUTION_CERTIFICATE_RECORDED",
      userId: input.actorId ?? null,
      organizationId: input.organizationId,
      changes: safeJson(certificateAuditPayload(certificate)),
    },
  });

  return {
    ...certificate,
    persistence: {
      requested: true,
      persisted: true,
      auditLogId: audit.id,
      entityType: "PayrollProofBackfillExecutionCertificate",
      auditAction: "PAYROLL_PROOF_BACKFILL_EXECUTION_CERTIFICATE_RECORDED",
    },
  };
}

export async function preparePayrollProofBackfillExecution(
  input: PreparePayrollProofBackfillExecutionInput,
  client: DbClient = db,
): Promise<PayrollProofBackfillExecutionCertificate> {
  requireApprovedExecutionMode(input);
  const now = normalizeDate(input.now, new Date());
  const generatedAt = now.toISOString();
  const executionMode = input.executionMode ?? "validate";
  const plan = await generatePayrollSeedBackfillDryRunPlan(
    { ...input, dryRun: true },
    client,
  );
  const dryRunEvidenceHash = hashPayload(dryRunEvidencePayload(plan));
  const expectedDryRunEvidenceHash =
    input.expectedDryRunEvidenceHash ??
    input.signoffBundle?.dryRunEvidenceHash ??
    null;
  const adapterChaosReleaseGateHash =
    input.adapterChaosReleaseGateHash?.trim() || null;
  const dryRunEvidenceMatches =
    expectedDryRunEvidenceHash === dryRunEvidenceHash;
  const missing = missingSignoffs(
    input.signoffBundle,
    expectedDryRunEvidenceHash,
    dryRunEvidenceHash,
    adapterChaosReleaseGateHash,
  );

  if (executionMode === "execute" && !input.persistCertificate) {
    missing.push("execution-certificate-persistence");
  }

  const approvalBundleHash = input.signoffBundle
    ? hashPayload(signoffPayload(input.signoffBundle))
    : null;
  const idempotencyKey =
    input.idempotencyKey?.trim() ||
    hashPayload({
      dryRunEvidenceHash,
      organizationRef: plan.organizationRef,
    }).slice(0, 32);
  const ledgerKey = hashPayload({
    kind: "payroll-proof-backfill-ledger",
    organizationRef: plan.organizationRef,
    dryRunEvidenceHash,
    idempotencyKey,
  });
  const correlationId = hashPayload({
    kind: "payroll-proof-backfill-correlation",
    ledgerKey,
    generatedAt,
  }).slice(0, 32);
  const intents = correctionIntents(
    plan.proofBackfill.plannedJobs,
    correlationId,
  );

  const unsupportedExecutionTargets = (
    Object.entries(plan.proofBackfill.gapCounts) as Array<
      [keyof PayrollSeedBackfillDryRunPlan["proofBackfill"]["gapCounts"], number]
    >
  )
    .filter(
      ([key, count]) =>
        ![
          "payrollRunMissingStatutoryScenarioCoverage",
          "declarationEvidenceMissingSourceRegisterHash",
          "declarationEvidenceMissingAuthorityAdapterProof",
          "declarationEvidenceMissingAuthorityLifecycleProof",
          "paymentBatchMissingProviderAdapterProof",
          "paymentBatchMissingSettlementRegisterProof",
          "paymentBatchMissingSettlementLifecycleProof",
        ].includes(key) && count > 0,
    )
    .map(
      ([key]) =>
        `UNSUPPORTED_PROOF_BACKFILL_TARGET_${key
          .replace(/([a-z])([A-Z])/g, "$1_$2")
          .toUpperCase()}`,
    );
  const executionBlockers = [...unsupportedExecutionTargets];
  const executedBackfills: PayrollProofBackfillExecutionResult[] = [];
  let executionEnabled = false;
  let mutationAttempted = false;
  let idempotencyLedgerStatus: "planned-not-written" | "written" =
    "planned-not-written";
  let executionStatus: PayrollProofBackfillExecutionStatus | null = null;

  const declarationProofGapCount =
    plan.proofBackfill.gapCounts.declarationEvidenceMissingSourceRegisterHash +
    plan.proofBackfill.gapCounts.declarationEvidenceMissingAuthorityAdapterProof +
    plan.proofBackfill.gapCounts.declarationEvidenceMissingAuthorityLifecycleProof;

  executionBlockers.push(
    ...declarationRegisterBackfillPreflightBlockers(
      input,
      declarationProofGapCount,
    ),
  );

  const paymentProofGapCount =
    plan.proofBackfill.gapCounts.paymentBatchMissingProviderAdapterProof +
    plan.proofBackfill.gapCounts.paymentBatchMissingSettlementRegisterProof +
    plan.proofBackfill.gapCounts.paymentBatchMissingSettlementLifecycleProof;

  executionBlockers.push(
    ...paymentBackfillPreflightBlockers(input, paymentProofGapCount),
  );

  const executableProofBackfillGapCount =
    plan.proofBackfill.gapCounts.payrollRunMissingStatutoryScenarioCoverage +
    declarationProofGapCount +
    paymentProofGapCount;
  if (
    executionMode === "execute" &&
    missing.length === 0 &&
    plan.readiness.blockers.length === 0 &&
    unsupportedExecutionTargets.length === 0 &&
    executionBlockers.length === 0 &&
    executableProofBackfillGapCount > 0

  ) {
    let preparedStatutoryBackfills: Awaited<
      ReturnType<typeof preparePayrollRunStatutoryCoverageBackfills>
    > | null = null;
    let preparedDeclarationBackfills: Awaited<
      ReturnType<typeof prepareDeclarationRegisterProofBackfills>
    > | null = null;
    let preparedDeclarationAuthorityBackfills: Awaited<
      ReturnType<typeof prepareDeclarationAuthorityProofBackfills>
    > | null = null;
    let preparedPaymentBackfills: Awaited<
      ReturnType<typeof preparePaymentBatchProofBackfills>
    > | null = null;

    if (
      plan.proofBackfill.gapCounts.payrollRunMissingStatutoryScenarioCoverage > 0
    ) {
      preparedStatutoryBackfills = await preparePayrollRunStatutoryCoverageBackfills(
        input,
        {
          ledgerKey,
          dryRunEvidenceHash,
          approvalBundleHash,
          adapterChaosReleaseGateHash,
          executedAt: generatedAt,
        },
        client,
      );
      const expectedCount =
        plan.proofBackfill.gapCounts.payrollRunMissingStatutoryScenarioCoverage;

      if (preparedStatutoryBackfills.runCount !== expectedCount) {
        executionBlockers.push(
          "PAYROLL_STATUTORY_COVERAGE_BACKFILL_COUNT_MISMATCH",
        );
      }
      executionBlockers.push(...preparedStatutoryBackfills.blockerCodes);
    }

    if (
      plan.proofBackfill.gapCounts.declarationEvidenceMissingSourceRegisterHash > 0
    ) {
      preparedDeclarationBackfills = await prepareDeclarationRegisterProofBackfills(
        input,
        {
          ledgerKey,
          dryRunEvidenceHash,
          approvalBundleHash,
          adapterChaosReleaseGateHash,
          executedAt: generatedAt,
        },
        client,
      );
      const expectedCount =
        plan.proofBackfill.gapCounts.declarationEvidenceMissingSourceRegisterHash;

      if (preparedDeclarationBackfills.evidenceGapCount !== expectedCount) {
        executionBlockers.push(
          "PAYROLL_DECLARATION_REGISTER_BACKFILL_COUNT_MISMATCH",
        );
      }
      executionBlockers.push(...preparedDeclarationBackfills.blockerCodes);
    }

    if (
      plan.proofBackfill.gapCounts.declarationEvidenceMissingAuthorityAdapterProof > 0 ||
      plan.proofBackfill.gapCounts.declarationEvidenceMissingAuthorityLifecycleProof > 0
    ) {
      preparedDeclarationAuthorityBackfills = await prepareDeclarationAuthorityProofBackfills(
        input,
        {
          ledgerKey,
          dryRunEvidenceHash,
          approvalBundleHash,
          adapterChaosReleaseGateHash,
          executedAt: generatedAt,
        },
        client,
      );

      if (
        preparedDeclarationAuthorityBackfills.adapterEvidenceGapCount !==
        plan.proofBackfill.gapCounts.declarationEvidenceMissingAuthorityAdapterProof
      ) {
        executionBlockers.push(
          "PAYROLL_DECLARATION_AUTHORITY_ADAPTER_BACKFILL_COUNT_MISMATCH",
        );
      }
      if (
        preparedDeclarationAuthorityBackfills.lifecycleEvidenceGapCount !==
        plan.proofBackfill.gapCounts.declarationEvidenceMissingAuthorityLifecycleProof
      ) {
        executionBlockers.push(
          "PAYROLL_DECLARATION_AUTHORITY_LIFECYCLE_BACKFILL_COUNT_MISMATCH",
        );
      }
      executionBlockers.push(
        ...preparedDeclarationAuthorityBackfills.blockerCodes,
      );
    }
    if (paymentProofGapCount > 0) {
      preparedPaymentBackfills = await preparePaymentBatchProofBackfills(
        input,
        {
          ledgerKey,
          dryRunEvidenceHash,
          approvalBundleHash,
          adapterChaosReleaseGateHash,
          executedAt: generatedAt,
        },
        client,
      );

      if (
        preparedPaymentBackfills.providerGapCount !==
        plan.proofBackfill.gapCounts.paymentBatchMissingProviderAdapterProof
      ) {
        executionBlockers.push(
          "PAYROLL_PAYMENT_PROVIDER_BACKFILL_COUNT_MISMATCH",
        );
      }
      if (
        preparedPaymentBackfills.settlementRegisterGapCount !==
        plan.proofBackfill.gapCounts.paymentBatchMissingSettlementRegisterProof
      ) {
        executionBlockers.push(
          "PAYROLL_PAYMENT_SETTLEMENT_REGISTER_BACKFILL_COUNT_MISMATCH",
        );
      }
      if (
        preparedPaymentBackfills.settlementLifecycleGapCount !==
        plan.proofBackfill.gapCounts.paymentBatchMissingSettlementLifecycleProof
      ) {
        executionBlockers.push(
          "PAYROLL_PAYMENT_SETTLEMENT_LIFECYCLE_BACKFILL_COUNT_MISMATCH",
        );
      }
      executionBlockers.push(...preparedPaymentBackfills.blockerCodes);
    }
    if (executionBlockers.length === 0) {
      if (preparedStatutoryBackfills) {
        executedBackfills.push(
          await executePayrollRunStatutoryCoverageBackfill(
            preparedStatutoryBackfills,
            client,
          ),
        );
      }
      if (preparedDeclarationBackfills) {
        executedBackfills.push(
          await executeDeclarationRegisterProofBackfill(
            input,
            preparedDeclarationBackfills,
            client,
          ),
        );
      }
      if (preparedDeclarationAuthorityBackfills) {
        executedBackfills.push(
          ...(await executeDeclarationAuthorityProofBackfill(
            input,
            preparedDeclarationAuthorityBackfills,
            client,
          )),
        );
      }
      if (preparedPaymentBackfills) {
        executedBackfills.push(
          ...(await executePaymentBatchProofBackfill(
            preparedPaymentBackfills,
            client,
          )),
        );
      }
      executionEnabled = executedBackfills.length > 0;
      mutationAttempted = executedBackfills.length > 0;
      idempotencyLedgerStatus = executedBackfills.length > 0 ? "written" : "planned-not-written";
      executionStatus = executedBackfills.length > 0 ? "EXECUTION_COMPLETED" : null;
    }
  }

  const missingBlockers = missing.map(
    (item) => `MISSING_${item.toUpperCase().replace(/-/g, "_")}`,
  );
  const planBlockers =
    executionMode === "execute"
      ? plan.readiness.blockers.map((blocker) => blocker.code)
      : plan.blockers.map((blocker) => blocker.code);
  const blockers = [...planBlockers, ...missingBlockers, ...executionBlockers];

  const certificateWithoutHash = {
    kind: "AQSTOQFLOW_PAYROLL_PROOF_BACKFILL_EXECUTION_CERTIFICATE" as const,
    version: 1 as const,
    status:
      executionStatus ?? statusFor({ plan, missingSignoffs: missing }),
    executionMode,
    executionEnabled,
    mutationAttempted,
    generatedAt,
    organizationRef: plan.organizationRef,
    actorRef: redactPayrollSetupRef(input.actorId),
    dryRunEvidenceHash,
    expectedDryRunEvidenceHash,
    dryRunEvidenceMatches,
    approvalBundleHash,
    missingSignoffs: missing,
    adapterChaosReleaseGateHash,
    idempotencyLedger: {
      status: idempotencyLedgerStatus,
      idempotencyKey,
      ledgerKey,
      replayProtection: "dry-run-hash-and-signoff-bundle" as const,
    },
    proofBackfill: plan.proofBackfill,
    correctionIntents: intents,
    executedBackfills,
    postRunReconciliationCertificate: {
      status: "planned" as const,
      expectedGapCountsAfterRun: zeroGapCounts(plan),
      requiredChecks: [
        "Rerun payroll proof backfill dry-run and confirm total blocking proof gaps are zero.",
        "Rerun data-trust and confirm declaration/payment proof gap facts are zero for the tenant.",
        "Rerun payroll immutability runtime checks and confirm finalized evidence remains append-only.",
        "Reconcile declaration statuses, payment batch statuses, ledger source links, and close blockers before certification.",
      ],
    },
    blockers,
    redaction: {
      policy: "payroll-proof-backfill-execution-redaction" as const,
      rawPersonDataIncluded: false as const,
      rawPaymentDestinationIncluded: false as const,
      rawSalaryIncluded: false as const,
      rawProviderPayloadIncluded: false as const,
    },
  };

  const certificate: PayrollProofBackfillExecutionCertificateCore = {
    ...certificateWithoutHash,
    certificateHash: hashPayload(certificateWithoutHash),
  };

  if (input.persistCertificate) {
    return persistPayrollProofBackfillExecutionCertificate(
      certificate,
      input,
      client,
    );
  }

  return {
    ...certificate,
    persistence: {
      requested: false,
      persisted: false,
      auditLogId: null,
      entityType: "PayrollProofBackfillExecutionCertificate",
      auditAction: null,
    },
  };
}
export function formatPayrollProofBackfillExecutionCertificate(
  certificate: PayrollProofBackfillExecutionCertificate,
) {
  const correctionIntents = certificate.correctionIntents.length
    ? certificate.correctionIntents
        .map(
          (intent) =>
            `| ${intent.target} | ${intent.count} | ${intent.idempotencyKey} | ${intent.correlationId} | ${intent.reason} |`,
        )
        .join("\n")
    : "| None | 0 | n/a | n/a | No correction intent is required. |";
  const signoffs = certificate.missingSignoffs.length
    ? certificate.missingSignoffs.map((item) => `- ${item}`).join("\n")
    : "- None.";
  const checks = certificate.postRunReconciliationCertificate.requiredChecks
    .map((item) => `- ${item}`)
    .join("\n");
  const executedBackfills = certificate.executedBackfills.length
    ? certificate.executedBackfills
        .map(
          (item) =>
            `| ${item.target} | ${item.attemptedCount} | ${item.updatedCount} | ${item.skippedCount} | ${item.coverageHashes.join(", ") || "none"} | ${item.blockerCodes.join(", ") || "none"} |`,
        )
        .join("\n")
    : "| None | 0 | 0 | 0 | none | none |";

  return `# Payroll Proof Backfill Execution Certificate

Generated: ${certificate.generatedAt}
Status: ${certificate.status}
Execution mode: ${certificate.executionMode}
Execution enabled: ${certificate.executionEnabled ? "yes" : "no"}
Mutation attempted: ${certificate.mutationAttempted ? "yes" : "no"}
Certificate hash: ${certificate.certificateHash}
Dry-run evidence hash: ${certificate.dryRunEvidenceHash}
Dry-run evidence matches approval: ${certificate.dryRunEvidenceMatches}
Adapter chaos release gate hash: ${certificate.adapterChaosReleaseGateHash ?? "missing"}
Audit persistence: ${certificate.persistence.persisted ? `yes (${certificate.persistence.auditLogId})` : "no"}

## Idempotency Ledger

- Status: ${certificate.idempotencyLedger.status}
- Idempotency key: ${certificate.idempotencyLedger.idempotencyKey}
- Ledger key: ${certificate.idempotencyLedger.ledgerKey}
- Replay protection: ${certificate.idempotencyLedger.replayProtection}

## Missing Signoffs

${signoffs}

## Correction Event Intents

| Target | Count | Idempotency key | Correlation id | Reason |
| --- | ---: | --- | --- | --- |
${correctionIntents}

## Executed Metadata Backfills

| Target | Attempted | Updated | Skipped | Coverage hashes | Blockers |
| --- | ---: | ---: | ---: | --- | --- |
${executedBackfills}

## Post-Run Reconciliation Certificate

${checks}

## Redaction

- Raw person data included: ${certificate.redaction.rawPersonDataIncluded}
- Raw salary included: ${certificate.redaction.rawSalaryIncluded}
- Raw payment destination included: ${certificate.redaction.rawPaymentDestinationIncluded}
- Raw provider payload included: ${certificate.redaction.rawProviderPayloadIncluded}
`;
}
