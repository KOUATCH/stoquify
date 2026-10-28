import { createHash } from "crypto";
import { Prisma } from "@prisma/client";

import { db } from "../../prisma/db";
import { BusinessRuleError } from "../_shared/action-errors";
import {
  generatePayrollSeedBackfillDryRunPlan,
  type PayrollProofBackfillGapCounts,
  type PayrollSeedBackfillDryRunInput,
  type PayrollSeedBackfillDryRunPlan,
} from "./payroll-seed-backfill-plan.service";
import { redactPayrollSetupRef } from "./payroll-setup-readiness.service";
import {
  buildPayrollStatutoryReviewedProofChain,
  buildPayrollStatutoryScenarioCoverageHash,
  type PayrollStatutoryReviewedProofChain,
  type PayrollStatutoryScenarioCoverageSummary,
  type PayrollStatutoryScenarioReviewEvidenceSummary,
} from "./payroll-statutory-scenario-coverage.service";

type DbClient = typeof db | Prisma.TransactionClient;

type PersistedExecutionCertificate = Record<string, unknown>;

export type PayrollProofBackfillReconciliationStatus =
  | "READY_FOR_CLOSE_RECHECK"
  | "PROOF_GAPS_REMAIN"
  | "BLOCKED_BY_SETUP"
  | "BLOCKED_BY_SOURCE_CERTIFICATE";

export type PayrollProofBackfillReconciliationInput =
  PayrollSeedBackfillDryRunInput & {
    sourceCertificateAuditLogId?: string | null;
    sourceCertificateLedgerKey?: string | null;
    expectedSourceCertificateHash?: string | null;
    expectedSourceDryRunEvidenceHash?: string | null;
    expectedAdapterChaosReleaseGateHash?: string | null;
    now?: Date | string | null;
    persistCertificate?: boolean | null;
  };

export type PayrollProofBackfillStatutoryScenarioSetupGate = {
  status: PayrollStatutoryScenarioCoverageSummary["status"] | null;
  countryCode: string | null;
  packVersion: string | null;
  coverageHash: string | null;
  executableScenarioCount: number;
  readyFamilyCount: number;
  requiredFamilyCount: number;
  blockerCodes: string[];
  requiredReviewTopics: string[];
  reviewEvidence: PayrollStatutoryScenarioReviewEvidenceSummary;
  reviewedProofChain: PayrollStatutoryReviewedProofChain;
  families: Array<{
    family: string;
    status: string;
    capabilityStatus: string | null;
    executableScenarioCount: number;
    passedScenarioCount: number;
    failedScenarioCount: number;
    certificationStatus: string;
    reviewStatuses: string[];
    sourceEvidenceHashCount: number;
    requiredReviewTopics: string[];
    blockerCode: string | null;
  }>;
};

export type PayrollProofBackfillReconciliationCertificate = {
  kind: "AQSTOQFLOW_PAYROLL_PROOF_BACKFILL_RECONCILIATION_CERTIFICATE";
  version: 1;
  status: PayrollProofBackfillReconciliationStatus;
  generatedAt: string;
  organizationRef: string;
  actorRef: string | null;
  sourceCertificate: {
    auditLogRef: string;
    ledgerKey: string | null;
    certificateHash: string | null;
    dryRunEvidenceHash: string | null;
    adapterChaosReleaseGateHash: string | null;
    adapterChaosReleaseGateHashMatches: boolean;
    status: string | null;
    approvalBundleHashPresent: boolean;
    missingSignoffs: string[];
    dryRunEvidenceMatches: boolean;
    executionEnabled: boolean | null;
    mutationAttempted: boolean | null;
    correctionIntentCount: number | null;
    recordedAt: string | null;
    validated: boolean;
    validationBlockers: string[];
  };
  currentProofBackfill: {
    evidenceRef: string;
    status: PayrollSeedBackfillDryRunPlan["proofBackfill"]["status"];
    totalBlockingGaps: number;
    gapCounts: PayrollProofBackfillGapCounts;
    postMigrationProofGapsCleared: boolean;
  };
  dataTrustProofGate: {
    status: "READY" | "BLOCKED";
    blockerIds: string[];
    note: string;
  };
  setupGate: {
    status: PayrollSeedBackfillDryRunPlan["status"];
    blockerCodes: string[];
    statutoryScenarioCoverage: PayrollProofBackfillStatutoryScenarioSetupGate;
  };
  releaseGateRequirements: Array<{
    gate: string;
    command: string;
    status: "REQUIRED_EXTERNAL_GATE";
  }>;
  redaction: {
    policy: "payroll-proof-backfill-reconciliation-redaction";
    rawPersonDataIncluded: false;
    rawPaymentDestinationIncluded: false;
    rawSalaryIncluded: false;
    rawProviderPayloadIncluded: false;
  };
  certificateHash: string;
  persistence: {
    requested: boolean;
    persisted: boolean;
    auditLogId: string | null;
    entityType: "PayrollProofBackfillReconciliationCertificate";
    auditAction:
      | "PAYROLL_PROOF_BACKFILL_RECONCILIATION_CERTIFICATE_RECORDED"
      | null;
  };
};

type ReconciliationCertificateCore = Omit<
  PayrollProofBackfillReconciliationCertificate,
  "persistence"
>;

const SOURCE_ENTITY_TYPE = "PayrollProofBackfillExecutionCertificate";
const SOURCE_AUDIT_ACTION =
  "PAYROLL_PROOF_BACKFILL_EXECUTION_CERTIFICATE_RECORDED";
const RECONCILIATION_ENTITY_TYPE =
  "PayrollProofBackfillReconciliationCertificate";
const RECONCILIATION_AUDIT_ACTION =
  "PAYROLL_PROOF_BACKFILL_RECONCILIATION_CERTIFICATE_RECORDED";

const DATA_TRUST_BLOCKER_BY_GAP: Record<
  keyof PayrollProofBackfillGapCounts,
  string
> = {
  payrollRunMissingStatutoryScenarioCoverage:
    "payroll-register-statutory-review-evidence-missing",
  declarationEvidenceMissingSourceRegisterHash:
    "payroll-declaration-register-proof-missing",
  declarationEvidenceMissingAuthorityAdapterProof:
    "payroll-declaration-authority-adapter-proof-missing",
  declarationEvidenceMissingAuthorityLifecycleProof:
    "payroll-declaration-authority-lifecycle-proof-missing",
  paymentBatchMissingProviderAdapterProof:
    "payroll-payment-provider-adapter-proof-missing",
  paymentBatchMissingSettlementRegisterProof:
    "payroll-payment-settlement-register-proof-missing",
  paymentBatchMissingSettlementLifecycleProof:
    "payroll-payment-settlement-lifecycle-proof-missing",
};

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

function statutoryScenarioSetupGate(
  plan: PayrollSeedBackfillDryRunPlan,
  correctionIntentCount: number | null,
): PayrollProofBackfillStatutoryScenarioSetupGate {
  const coverage = plan.readiness.checks.countryPack.calculationFixtures.scenarioCoverage;
  if (!coverage) {
    const reviewEvidence = emptyStatutoryScenarioReviewEvidence();
    return {
      status: null,
      countryCode: plan.readiness.checks.countryPack.countryCode,
      packVersion: plan.readiness.checks.countryPack.calculationFixtures.packVersion,
      coverageHash: null,
      executableScenarioCount: 0,
      readyFamilyCount: 0,
      requiredFamilyCount: 0,
      blockerCodes: ["PAYROLL_STATUTORY_SCENARIO_COVERAGE_MISSING"],
      requiredReviewTopics: [],
      reviewEvidence,
      reviewedProofChain: buildPayrollStatutoryReviewedProofChain({
        status: null,
        coverageHash: null,
        reviewEvidence,
        readyFamilyCount: 0,
        requiredFamilyCount: 0,
        blockerCodes: ["PAYROLL_STATUTORY_SCENARIO_COVERAGE_MISSING"],
        registerProofGapCount:
          plan.proofBackfill.gapCounts.payrollRunMissingStatutoryScenarioCoverage,
        declarationRegisterProofGapCount:
          plan.proofBackfill.gapCounts.declarationEvidenceMissingSourceRegisterHash,
        paymentSettlementRegisterProofGapCount:
          plan.proofBackfill.gapCounts.paymentBatchMissingSettlementRegisterProof,
        correctionIntentCount,
        requireCorrectionLifecycleEvidence: true,
      }),
      families: [],
    };
  }

  const payloadWithoutHash = {
    status: coverage.status,
    countryCode: coverage.countryCode,
    packVersion: coverage.packVersion,
    executableScenarioCount: coverage.executableScenarioCount,
    readyFamilyCount: coverage.readyFamilyCount,
    requiredFamilyCount: coverage.requiredFamilyCount,
    blockerCodes: coverage.blockers.map((blocker) => blocker.code).sort(),
    requiredReviewTopics: [...coverage.requiredReviewTopics].sort(),
    reviewEvidence: coverage.reviewEvidence,
    families: coverage.families
      .map((family) => ({
        family: family.family,
        status: family.status,
        capabilityStatus: family.capabilityStatus,
        executableScenarioCount: family.executableScenarioCount,
        passedScenarioCount: family.passedScenarioCount,
        failedScenarioCount: family.failedScenarioCount,
        certificationStatus: family.certificationStatus,
        reviewStatuses: [...family.reviewStatuses].sort(),
        sourceEvidenceHashCount: family.reviewEvidence.sourceEvidenceHashes.length,
        requiredReviewTopics: [...family.requiredReviewTopics].sort(),
        blockerCode: family.blockerCode,
      }))
      .sort((left, right) => left.family.localeCompare(right.family)),
  };

  const coverageHash = buildPayrollStatutoryScenarioCoverageHash({
    status: coverage.status,
    countryCode: coverage.countryCode,
    packVersion: coverage.packVersion,
    executableScenarioCount: coverage.executableScenarioCount,
    readyFamilyCount: coverage.readyFamilyCount,
    requiredFamilyCount: coverage.requiredFamilyCount,
    blockerCodes: coverage.blockers.map((blocker) => blocker.code),
    reviewEvidence: coverage.reviewEvidence,
  });

  return {
    ...payloadWithoutHash,
    coverageHash,
    reviewedProofChain: buildPayrollStatutoryReviewedProofChain({
      status: coverage.status,
      coverageHash,
      reviewEvidence: coverage.reviewEvidence,
      readyFamilyCount: coverage.readyFamilyCount,
      requiredFamilyCount: coverage.requiredFamilyCount,
      blockerCodes: coverage.blockers.map((blocker) => blocker.code),
      registerProofGapCount:
        plan.proofBackfill.gapCounts.payrollRunMissingStatutoryScenarioCoverage,
      declarationRegisterProofGapCount:
        plan.proofBackfill.gapCounts.declarationEvidenceMissingSourceRegisterHash,
      paymentSettlementRegisterProofGapCount:
        plan.proofBackfill.gapCounts.paymentBatchMissingSettlementRegisterProof,
      correctionIntentCount,
      requireCorrectionLifecycleEvidence: true,
    }),
  };
}

function safeJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringOrNull(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function numberOrNull(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeDate(
  value: Date | string | null | undefined,
  fallback: Date,
) {
  if (!value) return fallback;
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new BusinessRuleError(
      "Payroll proof backfill reconciliation received an invalid date.",
    );
  }
  return parsed;
}

function requireSourceSelector(input: PayrollProofBackfillReconciliationInput) {
  if (
    !input.sourceCertificateAuditLogId?.trim() &&
    !input.sourceCertificateLedgerKey?.trim()
  ) {
    throw new BusinessRuleError(
      "Payroll proof backfill reconciliation requires a persisted execution certificate audit id or ledger key.",
    );
  }
}

async function loadSourceCertificateAuditLog(
  input: PayrollProofBackfillReconciliationInput,
  client: DbClient,
) {
  requireSourceSelector(input);

  const auditLog = await client.auditLog.findFirst({
    where: {
      id: input.sourceCertificateAuditLogId?.trim() || undefined,
      entityId: input.sourceCertificateLedgerKey?.trim() || undefined,
      entityType: SOURCE_ENTITY_TYPE,
      action: SOURCE_AUDIT_ACTION,
      organizationId: input.organizationId,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!auditLog) {
    throw new BusinessRuleError(
      "Persisted payroll proof backfill execution certificate was not found for this tenant.",
    );
  }

  return auditLog;
}

function sourceCertificateFromAuditLog(auditLog: {
  changes: Prisma.JsonValue | null;
}) {
  const changes = asRecord(auditLog.changes);
  return asRecord(changes.after) as PersistedExecutionCertificate;
}

function validateSourceCertificate(input: {
  source: PersistedExecutionCertificate;
  auditLogEntityId: string;
  expectedSourceCertificateHash?: string | null;
  expectedSourceDryRunEvidenceHash?: string | null;
  expectedAdapterChaosReleaseGateHash?: string | null;
}) {
  const blockers: string[] = [];
  const ledger = asRecord(input.source.idempotencyLedger);
  const ledgerKey = stringOrNull(ledger.ledgerKey);
  const certificateHash = stringOrNull(input.source.certificateHash);
  const dryRunEvidenceHash = stringOrNull(input.source.dryRunEvidenceHash);
  const adapterChaosReleaseGateHash = stringOrNull(
    input.source.adapterChaosReleaseGateHash,
  );
  const missingSignoffs = stringArray(input.source.missingSignoffs);
  const correctionIntentCount = numberOrNull(input.source.correctionIntentCount) ??
    (Array.isArray(input.source.correctionIntents)
      ? input.source.correctionIntents.length
      : null);

  if (
    input.source.kind !==
    "AQSTOQFLOW_PAYROLL_PROOF_BACKFILL_EXECUTION_CERTIFICATE"
  ) {
    blockers.push("SOURCE_CERTIFICATE_KIND_INVALID");
  }
  if (!certificateHash) blockers.push("SOURCE_CERTIFICATE_HASH_MISSING");
  if (
    input.expectedSourceCertificateHash &&
    certificateHash !== input.expectedSourceCertificateHash
  ) {
    blockers.push("SOURCE_CERTIFICATE_HASH_MISMATCH");
  }
  if (!dryRunEvidenceHash) blockers.push("SOURCE_DRY_RUN_HASH_MISSING");
  if (
    input.expectedSourceDryRunEvidenceHash &&
    dryRunEvidenceHash !== input.expectedSourceDryRunEvidenceHash
  ) {
    blockers.push("SOURCE_DRY_RUN_HASH_MISMATCH");
  }
  if (!adapterChaosReleaseGateHash) {
    blockers.push("SOURCE_ADAPTER_CHAOS_RELEASE_GATE_HASH_MISSING");
  }
  if (
    input.expectedAdapterChaosReleaseGateHash &&
    adapterChaosReleaseGateHash !== input.expectedAdapterChaosReleaseGateHash
  ) {
    blockers.push("SOURCE_ADAPTER_CHAOS_RELEASE_GATE_HASH_MISMATCH");
  }
  if (!ledgerKey) blockers.push("SOURCE_LEDGER_KEY_MISSING");
  if (ledgerKey && ledgerKey !== input.auditLogEntityId) {
    blockers.push("SOURCE_LEDGER_KEY_AUDIT_ENTITY_MISMATCH");
  }
  if (input.source.dryRunEvidenceMatches !== true) {
    blockers.push("SOURCE_DRY_RUN_EVIDENCE_NOT_APPROVED");
  }
  if (!stringOrNull(input.source.approvalBundleHash)) {
    blockers.push("SOURCE_APPROVAL_BUNDLE_HASH_MISSING");
  }
  if (missingSignoffs.length > 0) {
    blockers.push("SOURCE_SIGNOFFS_INCOMPLETE");
  }
  const sourceStatus = stringOrNull(input.source.status);
  const validateOnlyCertificate =
    input.source.executionEnabled === false &&
    input.source.mutationAttempted === false;
  const completedExecutionCertificate =
    sourceStatus === "EXECUTION_COMPLETED" &&
    input.source.executionEnabled === true &&
    input.source.mutationAttempted === true;

  if (!validateOnlyCertificate && !completedExecutionCertificate) {
    blockers.push("SOURCE_EXECUTION_STATE_INVALID");
  }

  return {
    ledgerKey,
    certificateHash,
    dryRunEvidenceHash,
    adapterChaosReleaseGateHash,
    adapterChaosReleaseGateHashMatches: input.expectedAdapterChaosReleaseGateHash
      ? adapterChaosReleaseGateHash === input.expectedAdapterChaosReleaseGateHash
      : Boolean(adapterChaosReleaseGateHash),
    missingSignoffs,
    dryRunEvidenceMatches: input.source.dryRunEvidenceMatches === true,
    approvalBundleHashPresent: Boolean(
      stringOrNull(input.source.approvalBundleHash),
    ),
    status: sourceStatus,
    executionEnabled:
      typeof input.source.executionEnabled === "boolean"
        ? input.source.executionEnabled
        : null,
    mutationAttempted:
      typeof input.source.mutationAttempted === "boolean"
        ? input.source.mutationAttempted
        : null,
    correctionIntentCount,
    validated: blockers.length === 0,
    blockers,
  };
}

function dataTrustProofBlockerIds(gapCounts: PayrollProofBackfillGapCounts) {
  return (
    Object.entries(gapCounts) as Array<
      [keyof PayrollProofBackfillGapCounts, number]
    >
  )
    .filter(([, count]) => count > 0)
    .map(([key]) => DATA_TRUST_BLOCKER_BY_GAP[key]);
}

function statusFor(input: {
  sourceValid: boolean;
  currentPlan: PayrollSeedBackfillDryRunPlan;
  currentProofGapBlockers: string[];
}): PayrollProofBackfillReconciliationStatus {
  if (!input.sourceValid) return "BLOCKED_BY_SOURCE_CERTIFICATE";
  if (input.currentProofGapBlockers.length > 0) return "PROOF_GAPS_REMAIN";
  if (input.currentPlan.status !== "READY") return "BLOCKED_BY_SETUP";
  return "READY_FOR_CLOSE_RECHECK";
}

function auditPayload(certificate: ReconciliationCertificateCore) {
  return {
    before: null,
    after: {
      kind: certificate.kind,
      version: certificate.version,
      status: certificate.status,
      generatedAt: certificate.generatedAt,
      organizationRef: certificate.organizationRef,
      actorRef: certificate.actorRef,
      sourceCertificate: certificate.sourceCertificate,
      currentProofBackfill: certificate.currentProofBackfill,
      dataTrustProofGate: certificate.dataTrustProofGate,
      setupGate: certificate.setupGate,
      releaseGateRequirements: certificate.releaseGateRequirements,
      redaction: certificate.redaction,
      certificateHash: certificate.certificateHash,
    },
  };
}

async function persistReconciliationCertificate(
  certificate: ReconciliationCertificateCore,
  input: PayrollProofBackfillReconciliationInput,
  client: DbClient,
): Promise<PayrollProofBackfillReconciliationCertificate> {
  const audit = await client.auditLog.create({
    data: {
      entityType: RECONCILIATION_ENTITY_TYPE,
      entityId:
        certificate.sourceCertificate.ledgerKey ?? certificate.certificateHash,
      action: RECONCILIATION_AUDIT_ACTION,
      userId: input.actorId ?? null,
      organizationId: input.organizationId,
      changes: safeJson(auditPayload(certificate)),
    },
  });

  return {
    ...certificate,
    persistence: {
      requested: true,
      persisted: true,
      auditLogId: audit.id,
      entityType: RECONCILIATION_ENTITY_TYPE,
      auditAction: RECONCILIATION_AUDIT_ACTION,
    },
  };
}

export async function reconcilePayrollProofBackfillCertificate(
  input: PayrollProofBackfillReconciliationInput,
  client: DbClient = db,
): Promise<PayrollProofBackfillReconciliationCertificate> {
  const now = normalizeDate(input.now, new Date());
  const sourceAudit = await loadSourceCertificateAuditLog(input, client);
  const source = sourceCertificateFromAuditLog(sourceAudit);
  const sourceValidation = validateSourceCertificate({
    source,
    auditLogEntityId: sourceAudit.entityId,
    expectedSourceCertificateHash: input.expectedSourceCertificateHash,
    expectedSourceDryRunEvidenceHash: input.expectedSourceDryRunEvidenceHash,
    expectedAdapterChaosReleaseGateHash:
      input.expectedAdapterChaosReleaseGateHash,
  });
  const currentPlan = await generatePayrollSeedBackfillDryRunPlan(
    { ...input, dryRun: true },
    client,
  );
  const proofGapBlockers = dataTrustProofBlockerIds(
    currentPlan.proofBackfill.gapCounts,
  );
  const status = statusFor({
    sourceValid: sourceValidation.validated,
    currentPlan,
    currentProofGapBlockers: proofGapBlockers,
  });

  const certificateWithoutHash = {
    kind: "AQSTOQFLOW_PAYROLL_PROOF_BACKFILL_RECONCILIATION_CERTIFICATE" as const,
    version: 1 as const,
    status,
    generatedAt: now.toISOString(),
    organizationRef: currentPlan.organizationRef,
    actorRef: redactPayrollSetupRef(input.actorId),
    sourceCertificate: {
      auditLogRef: redactPayrollSetupRef(sourceAudit.id) ?? "redacted:unknown",
      ledgerKey: sourceValidation.ledgerKey,
      certificateHash: sourceValidation.certificateHash,
      dryRunEvidenceHash: sourceValidation.dryRunEvidenceHash,
      adapterChaosReleaseGateHash:
        sourceValidation.adapterChaosReleaseGateHash,
      adapterChaosReleaseGateHashMatches:
        sourceValidation.adapterChaosReleaseGateHashMatches,
      status: sourceValidation.status,
      approvalBundleHashPresent: sourceValidation.approvalBundleHashPresent,
      missingSignoffs: sourceValidation.missingSignoffs,
      dryRunEvidenceMatches: sourceValidation.dryRunEvidenceMatches,
      executionEnabled: sourceValidation.executionEnabled,
      mutationAttempted: sourceValidation.mutationAttempted,
      correctionIntentCount: sourceValidation.correctionIntentCount,
      recordedAt: sourceAudit.createdAt
        ? normalizeDate(sourceAudit.createdAt, now).toISOString()
        : null,
      validated: sourceValidation.validated,
      validationBlockers: sourceValidation.blockers,
    },
    currentProofBackfill: {
      evidenceRef: currentPlan.proofBackfill.evidenceRef,
      status: currentPlan.proofBackfill.status,
      totalBlockingGaps: currentPlan.proofBackfill.totalBlockingGaps,
      gapCounts: currentPlan.proofBackfill.gapCounts,
      postMigrationProofGapsCleared:
        currentPlan.proofBackfill.totalBlockingGaps === 0,
    },
    dataTrustProofGate: {
      status:
        proofGapBlockers.length === 0
          ? ("READY" as const)
          : ("BLOCKED" as const),
      blockerIds: proofGapBlockers,
      note:
        proofGapBlockers.length === 0
          ? "The proof-backfill dry-run no longer finds declaration/payment proof gaps that feed data-trust blockers."
          : "The proof-backfill dry-run still finds declaration/payment proof gaps that must remain data-trust blockers.",
    },
    setupGate: {
      status: currentPlan.status,
      blockerCodes: currentPlan.blockers.map((blocker) => blocker.code),
      statutoryScenarioCoverage: statutoryScenarioSetupGate(
        currentPlan,
        sourceValidation.correctionIntentCount,
      ),
    },
    releaseGateRequirements: [
      {
        gate: "payroll-immutability-runtime",
        command: "npm run policy:gates",
        status: "REQUIRED_EXTERNAL_GATE" as const,
      },
      {
        gate: "accounting-data-trust-close-readiness",
        command:
          "npm test -- --runTestsByPath services/accounting/__tests__/data-trust.service.test.ts --runInBand",
        status: "REQUIRED_EXTERNAL_GATE" as const,
      },
      {
        gate: "payroll-adapter-chaos-proof-continuity",
        command:
          "npm test -- --runTestsByPath services/payroll/__tests__/payroll-proof-backfill-reconciliation.service.test.ts --runInBand",
        status: "REQUIRED_EXTERNAL_GATE" as const,
      },
    ],
    redaction: {
      policy: "payroll-proof-backfill-reconciliation-redaction" as const,
      rawPersonDataIncluded: false as const,
      rawPaymentDestinationIncluded: false as const,
      rawSalaryIncluded: false as const,
      rawProviderPayloadIncluded: false as const,
    },
  };

  const certificate: ReconciliationCertificateCore = {
    ...certificateWithoutHash,
    certificateHash: hashPayload(certificateWithoutHash),
  };

  if (input.persistCertificate) {
    return persistReconciliationCertificate(certificate, input, client);
  }

  return {
    ...certificate,
    persistence: {
      requested: false,
      persisted: false,
      auditLogId: null,
      entityType: RECONCILIATION_ENTITY_TYPE,
      auditAction: null,
    },
  };
}

export function formatPayrollProofBackfillReconciliationCertificate(
  certificate: PayrollProofBackfillReconciliationCertificate,
) {
  const gaps = Object.entries(certificate.currentProofBackfill.gapCounts)
    .map(([key, value]) => `| ${key} | ${value} |`)
    .join("\n");
  const blockers = certificate.dataTrustProofGate.blockerIds.length
    ? certificate.dataTrustProofGate.blockerIds
        .map((item) => `- ${item}`)
        .join("\n")
    : "- None.";
  const sourceBlockers = certificate.sourceCertificate.validationBlockers.length
    ? certificate.sourceCertificate.validationBlockers
        .map((item) => `- ${item}`)
        .join("\n")
    : "- None.";
  const setupBlockers = certificate.setupGate.blockerCodes.length
    ? certificate.setupGate.blockerCodes.map((item) => `- ${item}`).join("\n")
    : "- None.";
  const statutoryScenario = certificate.setupGate.statutoryScenarioCoverage;
  const gates = certificate.releaseGateRequirements
    .map((item) => `- ${item.gate}: ${item.command}`)
    .join("\n");

  return `# Payroll Proof Backfill Reconciliation Certificate

Generated: ${certificate.generatedAt}
Status: ${certificate.status}
Certificate hash: ${certificate.certificateHash}
Source certificate hash: ${certificate.sourceCertificate.certificateHash ?? "missing"}
Source adapter chaos gate hash: ${certificate.sourceCertificate.adapterChaosReleaseGateHash ?? "missing"}
Source adapter chaos gate matches expected: ${certificate.sourceCertificate.adapterChaosReleaseGateHashMatches}
Source certificate valid: ${certificate.sourceCertificate.validated}
Post-migration proof gaps cleared: ${certificate.currentProofBackfill.postMigrationProofGapsCleared}
Data-trust proof gate: ${certificate.dataTrustProofGate.status}
Audit persistence: ${certificate.persistence.persisted ? `yes (${certificate.persistence.auditLogId})` : "no"}

## Current Proof Gaps

| Gap | Count |
| --- | ---: |
${gaps}

## Data-Trust Proof Blockers

${blockers}

## Source Certificate Blockers

${sourceBlockers}

## Setup Blockers

${setupBlockers}

## Statutory Scenario Coverage

- Status: ${statutoryScenario.status ?? "missing"}
- Coverage hash: ${statutoryScenario.coverageHash ?? "missing"}
- Families ready: ${statutoryScenario.readyFamilyCount}/${statutoryScenario.requiredFamilyCount}
- Missing review evidence: ${statutoryScenario.reviewEvidence.missingCount}
- Source evidence hashes: ${statutoryScenario.reviewEvidence.sourceEvidenceHashes.length}
- Required legal review topics: ${statutoryScenario.requiredReviewTopics.length ? statutoryScenario.requiredReviewTopics.join(", ") : "None"}

## Required Release Gates

${gates}

## Redaction

- Raw person data included: ${certificate.redaction.rawPersonDataIncluded}
- Raw salary included: ${certificate.redaction.rawSalaryIncluded}
- Raw payment destination included: ${certificate.redaction.rawPaymentDestinationIncluded}
- Raw provider payload included: ${certificate.redaction.rawProviderPayloadIncluded}
`;
}
