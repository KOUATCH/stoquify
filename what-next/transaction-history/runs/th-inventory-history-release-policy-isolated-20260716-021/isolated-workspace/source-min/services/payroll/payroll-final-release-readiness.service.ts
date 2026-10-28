import "server-only";

import { readFile } from "fs/promises";
import path from "path";

import { CloseRunStatus, Prisma } from "@prisma/client";
import { z } from "zod";

import { hasAnyRbacPermission } from "@/lib/security/rbac-permissions";
import { db } from "@/prisma/db";
import { ForbiddenError } from "@/services/_shared/action-errors";
import { hashBusinessPayload } from "@/services/events/business-event.service";
import type { ModuleEntitlementDecision } from "@/services/modules/module-control-contracts";
import {
  PAYROLL_COUNTRY_PACK_REVIEW_INTAKE_APPROVAL_AUDIT_ACTION,
  PAYROLL_COUNTRY_PACK_REVIEW_INTAKE_APPROVAL_ENTITY_TYPE,
} from "./payroll-country-pack-review-intake-persistence.service";
import { redactPayrollSetupRef } from "./payroll-setup-readiness.service";

type DbClient = typeof db | Prisma.TransactionClient;

const READ_PERMISSIONS = ["payroll.command.read"] as const;
const PILOT_ENTITY_TYPE = "PayrollPilotCycleCertification";
const PILOT_AUDIT_ACTION = "PAYROLL_PILOT_CYCLE_CERTIFICATION_EVALUATED";
const PROOF_BACKFILL_ENTITY_TYPE = "PayrollProofBackfillReconciliationCertificate";
const PROOF_BACKFILL_AUDIT_ACTION =
  "PAYROLL_PROOF_BACKFILL_RECONCILIATION_CERTIFICATE_RECORDED";
const FINAL_PACK_ENTITY_TYPE = "PayrollFinalReleaseReadinessPack";
const FINAL_PACK_AUDIT_ACTION =
  "PAYROLL_FINAL_RELEASE_READINESS_PACK_EVALUATED";

const payrollFinalReleaseReadinessInputSchema = z.object({
  organizationId: z.string().trim().min(1),
  payrollRunId: z.string().trim().min(1).optional().nullable(),
  actorId: z.string().trim().min(1).optional().nullable(),
  actorPermissions: z.array(z.string().trim().min(1)).default([]),
  moduleDecision: z.custom<ModuleEntitlementDecision>().optional().nullable(),
  now: z.union([z.date(), z.string().trim().min(1), z.number()]).optional(),
  evidenceRoot: z.string().trim().min(1).optional().nullable(),
  evidenceSnapshot: z
    .object({
      payrollImmutabilityRuntime: z.unknown().optional().nullable(),
      browserAccessibility: z.unknown().optional().nullable(),
      routeSmoke: z.unknown().optional().nullable(),
    })
    .optional()
    .nullable(),
  persistPack: z.boolean().optional().default(false),
});

export type PayrollFinalReleaseReadinessInput = z.input<
  typeof payrollFinalReleaseReadinessInputSchema
>;

export type PayrollFinalReleaseGateStatus =
  | "PASS"
  | "ACTION_REQUIRED"
  | "BLOCKED"
  | "MISSING";

export type PayrollFinalReleaseDecision =
  | "READY_FOR_FULL_PRODUCTION_APPROVAL"
  | "NOT_READY";

export type PayrollFinalReleaseGate = {
  key:
    | "statutory_setup"
    | "country_pack_review_intake"
    | "adapter_chaos"
    | "proof_backfill"
    | "pilot_cycle"
    | "close_data_trust"
    | "browser_validation"
    | "policy_runtime";
  label: string;
  status: PayrollFinalReleaseGateStatus;
  blockerCodes: string[];
  evidenceHash: string | null;
  summary: Record<string, string | number | boolean | null>;
  source: string;
};

export type PayrollFinalReleaseBlocker = {
  code: string;
  severity: "critical" | "high" | "medium";
  gate: PayrollFinalReleaseGate["key"];
  message: string;
};

export type PayrollFinalReleaseReadinessPack = {
  kind: "AQSTOQFLOW_PAYROLL_FINAL_RELEASE_READINESS_PACK";
  version: 1;
  decision: PayrollFinalReleaseDecision;
  generatedAt: string;
  organizationRef: string;
  actorRef: string | null;
  payrollRunRef: string | null;
  gates: PayrollFinalReleaseGate[];
  blockers: PayrollFinalReleaseBlocker[];
  evidence: {
    countryPackReviewIntake: {
      auditLogRef: string | null;
      status: string | null;
      approvalHash: string | null;
      approvedAt: string | null;
      certificateHash: string | null;
      proposedPackVersion: string | null;
      targetFamilyCount: number | null;
      targetFamilies: string[];
      freshAuthSatisfied: boolean | null;
      approvalEvidenceHashPresent: boolean;
      reviewEvidenceSourceHashCount: number;
      fixtureEvidenceHashCount: number;
      reviewEvidenceSourceHashes: string[];
      fixtureEvidenceHashes: string[];
      setupReadyFamilyCount: number;
      setupReadyFamiliesMissingApproval: string[];
    };
    pilotCycle: {
      auditLogRef: string | null;
      status: string | null;
      certificateHash: string | null;
      generatedAt: string | null;
      blockerCount: number;
      missingSignoffCount: number;
      expectedAdapterChaosReleaseGateHash: string | null;
      proofBackfillAdapterChaosMatchesExpected: boolean | null;
    };
    proofBackfill: {
      auditLogRef: string | null;
      status: string | null;
      certificateHash: string | null;
      dataTrustProofGateStatus: string | null;
      setupGateStatus: string | null;
      setupStatutoryScenarioCoverageStatus: string | null;
      setupStatutoryScenarioCoverageHash: string | null;
      setupStatutoryScenarioReadyFamilyCount: number | null;
      setupStatutoryScenarioRequiredFamilyCount: number | null;
      setupStatutoryScenarioBlockerCodes: string[];
      setupStatutoryScenarioMissingReviewEvidenceCount: number | null;
      setupStatutoryScenarioSourceEvidenceHashCount: number | null;
      setupStatutoryScenarioRequiredReviewTopicCount: number | null;
      setupStatutoryScenarioRequiredReviewTopics: string | null;
      setupStatutoryScenarioFamilies: string[];
      setupStatutoryScenarioReadyFamilies: string[];
      setupStatutoryScenarioMissingApprovedFamilies: string[];
      reviewedProofChainStatus: string | null;
      reviewedProofChainCoverageHash: string | null;
      reviewedProofChainBlockerCodes: string[];
      reviewedProofChainReviewEvidenceSourceHashes: string[];
      reviewedProofChainRegisterProofGapCount: number | null;
      reviewedProofChainDeclarationRegisterProofGapCount: number | null;
      reviewedProofChainPaymentSettlementRegisterProofGapCount: number | null;
      reviewedProofChainCorrectionIntentCount: number | null;
      sourceAdapterChaosReleaseGateHash: string | null;
      sourceAdapterChaosReleaseGateHashMatches: boolean | null;
      totalBlockingGaps: number | null;
    };
    closeRun: {
      idRef: string | null;
      status: CloseRunStatus | null;
      readinessScore: number | null;
      criticalBlockerCount: number | null;
      highBlockerCount: number | null;
      asOf: string | null;
    };
    browserValidation: {
      checkedAt: string | null;
      routeSmokeCheckedAt: string | null;
      routeSmokeOk: boolean | null;
      routeCount: number;
      checkCount: number;
      surfaceCount: number;
      safeErrorCount: number;
      seriousViolationCount: number;
      mobileOverflowCount: number;
    };
    policyRuntime: {
      generatedAt: string | null;
      status: string | null;
      blockerCount: number | null;
      requiredTriggers: number | null;
      presentTriggers: number | null;
      blockedMutations: number | null;
      expectedBlockedMutations: number | null;
    };
  };
  releaseGateRequirements: Array<{
    gate: string;
    command: string;
    status: "REQUIRED_EXTERNAL_GATE";
  }>;
  packHash: string;
  redaction: {
    policy: "payroll-final-release-readiness-pack-redaction";
    rawPersonDataIncluded: false;
    rawSalaryIncluded: false;
    rawPaymentDestinationIncluded: false;
    rawProviderPayloadIncluded: false;
    rawAuthorityPayloadIncluded: false;
    rawAuditLogIdsIncluded: false;
  };
  persistence: {
    requested: boolean;
    persisted: boolean;
    auditLogId: string | null;
    entityType: "PayrollFinalReleaseReadinessPack";
    auditAction: "PAYROLL_FINAL_RELEASE_READINESS_PACK_EVALUATED" | null;
  };
};

type AuditRow = {
  id: string;
  entityId: string;
  changes: Prisma.JsonValue | null;
  createdAt: Date;
};

function assertReadAllowed(
  input: z.output<typeof payrollFinalReleaseReadinessInputSchema>,
) {
  if (input.moduleDecision && !input.moduleDecision.allowed) {
    throw new ForbiddenError("Payroll module is not available for this tenant.");
  }
  if (!hasAnyRbacPermission(input.actorPermissions, READ_PERMISSIONS)) {
    throw new ForbiddenError(
      "Missing permission for payroll final release readiness.",
    );
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringOrNull(value: unknown) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function numberOrNull(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function booleanOrNull(value: unknown) {
  return typeof value === "boolean" ? value : null;
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value
        .filter((entry): entry is string => typeof entry === "string")
        .map((entry) => entry.trim())
        .filter(Boolean)
    : [];
}

function uniqueStringValues(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.filter((value): value is string => Boolean(value))),
  ).sort();
}

function normalizeDate(value: Date | string | number | undefined, fallback: Date) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return fallback;
}

function safeJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
}

function prefixedHash(value: unknown) {
  return `sha256:${hashBusinessPayload(value)}`;
}

function payloadAfter(row: AuditRow | null) {
  const changes = asRecord(row?.changes);
  return Object.keys(asRecord(changes.after)).length > 0
    ? asRecord(changes.after)
    : changes;
}

async function readJsonEvidence(
  evidenceRoot: string,
  relativePath: string,
  fallback: unknown,
) {
  if (fallback) return fallback;
  try {
    const raw = await readFile(path.join(evidenceRoot, relativePath), "utf8");
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function latestCountryPackReviewIntakeEvidence(row: AuditRow | null) {
  const payload = payloadAfter(row);
  const sourceCertificate = asRecord(payload.sourceCertificate);
  const approval = asRecord(payload.approval);
  const reviewEvidenceSourceHashes = uniqueStringValues(
    stringArray(sourceCertificate.reviewEvidenceSourceHashes),
  );
  const fixtureEvidenceHashes = uniqueStringValues(
    stringArray(sourceCertificate.fixtureEvidenceHashes),
  );

  return {
    auditLogRef: redactPayrollSetupRef(row?.id) ?? null,
    status: stringOrNull(payload.status),
    approvalHash: stringOrNull(payload.approvalHash),
    approvedAt: stringOrNull(payload.approvedAt),
    certificateHash: stringOrNull(sourceCertificate.certificateHash),
    proposedPackVersion: stringOrNull(sourceCertificate.proposedPackVersion),
    targetFamilies: stringArray(sourceCertificate.targetFamilies),
    freshAuthSatisfied: booleanOrNull(approval.freshAuthSatisfied),
    approvalEvidenceHashPresent: Boolean(
      stringOrNull(approval.approvalEvidenceHash),
    ),
    reviewEvidenceSourceHashes,
    fixtureEvidenceHashes,
    reviewEvidenceSourceHashCount: reviewEvidenceSourceHashes.length,
    fixtureEvidenceHashCount: fixtureEvidenceHashes.length,
  };
}
function latestPilotEvidence(row: AuditRow | null) {
  const payload = payloadAfter(row);
  const proofContinuity = asRecord(payload.proofContinuity);
  const signoff = asRecord(payload.signoff);
  const blockers = Array.isArray(payload.blockers) ? payload.blockers : [];
  return {
    auditLogRef: redactPayrollSetupRef(row?.id) ?? null,
    entityId: row?.entityId ?? null,
    status: stringOrNull(payload.status),
    certificateHash: stringOrNull(payload.certificateHash),
    generatedAt: stringOrNull(payload.generatedAt),
    blockerCount: blockers.length,
    blockerCodes: blockers
      .map((blocker) => stringOrNull(asRecord(blocker).code))
      .filter((code): code is string => Boolean(code)),
    missingSignoffRoles: stringArray(signoff.missingRoles),
    expectedAdapterChaosReleaseGateHash: stringOrNull(
      proofContinuity.expectedAdapterChaosReleaseGateHash,
    ),
    declarationAdapterChaosReleaseGateHashes: stringArray(
      proofContinuity.declarationAdapterChaosReleaseGateHashes,
    ),
    paymentAdapterChaosReleaseGateHashes: stringArray(
      proofContinuity.paymentAdapterChaosReleaseGateHashes,
    ),
    proofBackfillAdapterChaosReleaseGateHash: stringOrNull(
      proofContinuity.proofBackfillAdapterChaosReleaseGateHash,
    ),
    proofBackfillAdapterChaosMatchesExpected: booleanOrNull(
      proofContinuity.proofBackfillAdapterChaosMatchesExpected,
    ),
  };
}

function latestProofBackfillEvidence(row: AuditRow | null) {
  const payload = payloadAfter(row);
  const sourceCertificate = asRecord(payload.sourceCertificate);
  const currentProofBackfill = asRecord(payload.currentProofBackfill);
  const dataTrustProofGate = asRecord(payload.dataTrustProofGate);
  const setupGate = asRecord(payload.setupGate);
  const statutoryScenarioCoverage = asRecord(setupGate.statutoryScenarioCoverage);
  const statutoryReviewEvidence = asRecord(statutoryScenarioCoverage.reviewEvidence);
  const reviewedProofChain = asRecord(statutoryScenarioCoverage.reviewedProofChain);
  const statutorySourceEvidenceHashes = stringArray(
    statutoryReviewEvidence.sourceEvidenceHashes,
  );
  const statutoryRequiredReviewTopics = stringArray(
    statutoryScenarioCoverage.requiredReviewTopics,
  );
  const statutoryFamilies = Array.isArray(statutoryScenarioCoverage.families)
    ? statutoryScenarioCoverage.families.map((item) => asRecord(item))
    : [];
  const setupStatutoryScenarioFamilies = uniqueStringValues(
    statutoryFamilies.map((item) => stringOrNull(item.family)),
  );
  const setupStatutoryScenarioReadyFamilies = uniqueStringValues(
    statutoryFamilies
      .filter((item) => stringOrNull(item.status) === "READY")
      .map((item) => stringOrNull(item.family)),
  );
  return {
    auditLogRef: redactPayrollSetupRef(row?.id) ?? null,
    status: stringOrNull(payload.status),
    certificateHash: stringOrNull(payload.certificateHash),
    dataTrustProofGateStatus: stringOrNull(dataTrustProofGate.status),
    dataTrustBlockerIds: stringArray(dataTrustProofGate.blockerIds),
    setupGateStatus: stringOrNull(setupGate.status),
    setupGateBlockerCodes: stringArray(setupGate.blockerCodes),
    setupStatutoryScenarioCoverageStatus: stringOrNull(
      statutoryScenarioCoverage.status,
    ),
    setupStatutoryScenarioCoverageHash: stringOrNull(
      statutoryScenarioCoverage.coverageHash,
    ),
    setupStatutoryScenarioReadyFamilyCount: numberOrNull(
      statutoryScenarioCoverage.readyFamilyCount,
    ),
    setupStatutoryScenarioRequiredFamilyCount: numberOrNull(
      statutoryScenarioCoverage.requiredFamilyCount,
    ),
    setupStatutoryScenarioBlockerCodes: stringArray(
      statutoryScenarioCoverage.blockerCodes,
    ),
    setupStatutoryScenarioMissingReviewEvidenceCount: numberOrNull(
      statutoryReviewEvidence.missingCount,
    ),
    setupStatutoryScenarioSourceEvidenceHashCount:
      statutorySourceEvidenceHashes.length,
    setupStatutoryScenarioRequiredReviewTopicCount:
      statutoryRequiredReviewTopics.length,
    setupStatutoryScenarioRequiredReviewTopics:
      statutoryRequiredReviewTopics.join(", ") || null,
    setupStatutoryScenarioFamilies,
    setupStatutoryScenarioReadyFamilies,
    reviewedProofChainStatus: stringOrNull(reviewedProofChain.status),
    reviewedProofChainCoverageHash: stringOrNull(reviewedProofChain.coverageHash),
    reviewedProofChainBlockerCodes: stringArray(reviewedProofChain.blockerCodes),
    reviewedProofChainReviewEvidenceSourceHashes: stringArray(
      reviewedProofChain.reviewEvidenceSourceHashes,
    ),
    reviewedProofChainRegisterProofGapCount: numberOrNull(
      reviewedProofChain.registerProofGapCount,
    ),
    reviewedProofChainDeclarationRegisterProofGapCount: numberOrNull(
      reviewedProofChain.declarationRegisterProofGapCount,
    ),
    reviewedProofChainPaymentSettlementRegisterProofGapCount: numberOrNull(
      reviewedProofChain.paymentSettlementRegisterProofGapCount,
    ),
    reviewedProofChainCorrectionIntentCount:
      numberOrNull(reviewedProofChain.correctionIntentCount) ??
      numberOrNull(sourceCertificate.correctionIntentCount),
    sourceAdapterChaosReleaseGateHash: stringOrNull(
      sourceCertificate.adapterChaosReleaseGateHash,
    ),
    sourceAdapterChaosReleaseGateHashMatches: booleanOrNull(
      sourceCertificate.adapterChaosReleaseGateHashMatches,
    ),
    totalBlockingGaps: numberOrNull(currentProofBackfill.totalBlockingGaps),
    postMigrationProofGapsCleared: booleanOrNull(
      currentProofBackfill.postMigrationProofGapsCleared,
    ),
  };
}

function browserEvidence(
  accessibility: unknown,
  routeSmoke: unknown,
): PayrollFinalReleaseReadinessPack["evidence"]["browserValidation"] {
  const accessibilityRecord = asRecord(accessibility);
  const routeSmokeRecord = asRecord(routeSmoke);
  const results = Array.isArray(accessibilityRecord.results)
    ? accessibilityRecord.results
    : [];
  const safeErrorCount = results.filter(
    (item) => stringOrNull(asRecord(item).renderState) === "safe-error",
  ).length;
  const surfaceCount = results.filter(
    (item) => stringOrNull(asRecord(item).renderState) === "surface",
  ).length;
  const seriousViolationCount = results.reduce((total, item) => {
    return total + (numberOrNull(asRecord(item).seriousViolationCount) ?? 0);
  }, 0);
  const mobileOverflowCount = results.filter((item) => {
    const layout = asRecord(asRecord(item).mobileLayout);
    return layout.hasDocumentOverflow === true;
  }).length;

  return {
    checkedAt: stringOrNull(accessibilityRecord.checkedAt),
    routeSmokeCheckedAt: stringOrNull(routeSmokeRecord.checkedAt),
    routeSmokeOk: booleanOrNull(routeSmokeRecord.ok),
    routeCount: numberOrNull(routeSmokeRecord.routeCount) ?? 0,
    checkCount: results.length,
    surfaceCount,
    safeErrorCount,
    seriousViolationCount,
    mobileOverflowCount,
  };
}

function policyRuntimeEvidence(
  value: unknown,
): PayrollFinalReleaseReadinessPack["evidence"]["policyRuntime"] {
  const payload = asRecord(value);
  const summary = asRecord(payload.summary);
  return {
    generatedAt: stringOrNull(payload.generatedAt),
    status: stringOrNull(payload.status),
    blockerCount: numberOrNull(summary.blockerCount),
    requiredTriggers: numberOrNull(summary.requiredTriggers),
    presentTriggers: numberOrNull(summary.presentTriggers),
    blockedMutations: numberOrNull(summary.blockedMutations),
    expectedBlockedMutations: numberOrNull(summary.expectedBlockedMutations),
  };
}

function gate(
  input: Omit<PayrollFinalReleaseGate, "label"> & { label?: string },
): PayrollFinalReleaseGate {
  const labels: Record<PayrollFinalReleaseGate["key"], string> = {
    statutory_setup: "Statutory setup and country-pack readiness",
    country_pack_review_intake: "Country-pack legal-owner review approval",
    adapter_chaos: "Authority/provider adapter chaos proof",
    proof_backfill: "Production proof-backfill reconciliation",
    pilot_cycle: "Controlled pilot payroll cycle",
    close_data_trust: "Accounting close and data-trust readiness",
    browser_validation: "Authenticated browser and accessibility validation",
    policy_runtime: "Policy and payroll immutability runtime",
  };
  return { ...input, label: input.label ?? labels[input.key] };
}

function blocker(
  gateKey: PayrollFinalReleaseGate["key"],
  code: string,
  message: string,
  severity: PayrollFinalReleaseBlocker["severity"] = "high",
): PayrollFinalReleaseBlocker {
  return { code, severity, gate: gateKey, message };
}

function gateFromBlockers(
  key: PayrollFinalReleaseGate["key"],
  source: string,
  evidenceHash: string | null,
  summary: PayrollFinalReleaseGate["summary"],
  blockers: PayrollFinalReleaseBlocker[],
) {
  const gateBlockers = blockers.filter((item) => item.gate === key);
  return gate({
    key,
    source,
    evidenceHash,
    summary,
    status: gateBlockers.length === 0 ? "PASS" : gateBlockers.some((item) => item.severity === "critical") ? "BLOCKED" : "ACTION_REQUIRED",
    blockerCodes: gateBlockers.map((item) => item.code),
  });
}

function releaseGateRequirements() {
  return [
    {
      gate: "final-release-readiness-pack",
      command:
        "npm test -- --runTestsByPath services/payroll/__tests__/payroll-final-release-readiness.service.test.ts --runInBand",
      status: "REQUIRED_EXTERNAL_GATE" as const,
    },
    {
      gate: "pilot-cycle-certification",
      command:
        "npm test -- --runTestsByPath services/payroll/__tests__/payroll-pilot-cycle-certification.service.test.ts --runInBand",
      status: "REQUIRED_EXTERNAL_GATE" as const,
    },
    {
      gate: "policy-gates",
      command: "npm run policy:gates",
      status: "REQUIRED_EXTERNAL_GATE" as const,
    },
    {
      gate: "browser-validation",
      command: "npm run test:e2e:payroll",
      status: "REQUIRED_EXTERNAL_GATE" as const,
    },
  ];
}

function auditPayload(pack: PayrollFinalReleaseReadinessPack) {
  return {
    kind: pack.kind,
    version: pack.version,
    decision: pack.decision,
    generatedAt: pack.generatedAt,
    organizationRef: pack.organizationRef,
    actorRef: pack.actorRef,
    payrollRunRef: pack.payrollRunRef,
    gates: pack.gates,
    blockers: pack.blockers,
    evidence: pack.evidence,
    releaseGateRequirements: pack.releaseGateRequirements,
    packHash: pack.packHash,
    redaction: pack.redaction,
  };
}

async function persistPack(
  pack: PayrollFinalReleaseReadinessPack,
  input: z.output<typeof payrollFinalReleaseReadinessInputSchema>,
  rawEntityId: string,
  client: DbClient,
) {
  const audit = await client.auditLog.create({
    data: {
      entityType: FINAL_PACK_ENTITY_TYPE,
      entityId: rawEntityId,
      action: FINAL_PACK_AUDIT_ACTION,
      userId: input.actorId ?? null,
      organizationId: input.organizationId,
      changes: safeJson(auditPayload(pack)),
    },
  });

  return {
    ...pack,
    persistence: {
      requested: true,
      persisted: true,
      auditLogId: audit.id,
      entityType: FINAL_PACK_ENTITY_TYPE as "PayrollFinalReleaseReadinessPack",
      auditAction:
        FINAL_PACK_AUDIT_ACTION as "PAYROLL_FINAL_RELEASE_READINESS_PACK_EVALUATED",
    },
  };
}

export async function buildPayrollFinalReleaseReadinessPack(
  input: PayrollFinalReleaseReadinessInput,
  client: DbClient = db,
): Promise<PayrollFinalReleaseReadinessPack> {
  const parsed = payrollFinalReleaseReadinessInputSchema.parse(input);
  assertReadAllowed(parsed);

  const now = normalizeDate(parsed.now, new Date());
  const evidenceRoot = parsed.evidenceRoot ?? process.cwd();
  const [
    pilotAudit,
    proofBackfillAudit,
    countryPackReviewIntakeAudit,
    immutabilityJson,
    browserJson,
    routeSmokeJson,
  ] = await Promise.all([
      client.auditLog.findFirst({
        where: {
          organizationId: parsed.organizationId,
          entityType: PILOT_ENTITY_TYPE,
          action: PILOT_AUDIT_ACTION,
          ...(parsed.payrollRunId ? { entityId: parsed.payrollRunId } : {}),
        },
        orderBy: { createdAt: "desc" },
        select: { id: true, entityId: true, changes: true, createdAt: true },
      }),
      client.auditLog.findFirst({
        where: {
          organizationId: parsed.organizationId,
          entityType: PROOF_BACKFILL_ENTITY_TYPE,
          action: PROOF_BACKFILL_AUDIT_ACTION,
        },
        orderBy: { createdAt: "desc" },
        select: { id: true, entityId: true, changes: true, createdAt: true },
      }),
      client.auditLog.findFirst({
        where: {
          organizationId: parsed.organizationId,
          entityType: PAYROLL_COUNTRY_PACK_REVIEW_INTAKE_APPROVAL_ENTITY_TYPE,
          action: PAYROLL_COUNTRY_PACK_REVIEW_INTAKE_APPROVAL_AUDIT_ACTION,
        },
        orderBy: { createdAt: "desc" },
        select: { id: true, entityId: true, changes: true, createdAt: true },
      }),
      readJsonEvidence(
        evidenceRoot,
        "what-next/payroll/payroll-immutability-runtime-check.json",
        parsed.evidenceSnapshot?.payrollImmutabilityRuntime,
      ),
      readJsonEvidence(
        evidenceRoot,
        "what-next/payroll/AQSTOQFLOW_PAYROLL_AUTHENTICATED_ACCESSIBILITY_MOBILE_BROWSER.json",
        parsed.evidenceSnapshot?.browserAccessibility,
      ),
      readJsonEvidence(
        evidenceRoot,
        "what-next/payroll/AQSTOQFLOW_PAYROLL_UI_ROUTE_SMOKE_BROWSER.json",
        parsed.evidenceSnapshot?.routeSmoke,
      ),
    ]);

  const pilot = latestPilotEvidence(pilotAudit as AuditRow | null);
  const proofBackfill = latestProofBackfillEvidence(
    proofBackfillAudit as AuditRow | null,
  );
  const countryPackReviewIntake = latestCountryPackReviewIntakeEvidence(
    countryPackReviewIntakeAudit as AuditRow | null,
  );
  const rawPayrollRunId = parsed.payrollRunId ?? pilot.entityId;

  const payrollRun = rawPayrollRunId
    ? await client.payrollRun.findFirst({
        where: {
          organizationId: parsed.organizationId,
          id: rawPayrollRunId,
          deletedAt: null,
        },
        select: {
          id: true,
          payrollPeriod: {
            select: {
              accountingPeriodId: true,
            },
          },
        },
      })
    : null;

  const closeRun = payrollRun?.payrollPeriod.accountingPeriodId
    ? await client.closeRun.findFirst({
        where: {
          organizationId: parsed.organizationId,
          periodId: payrollRun.payrollPeriod.accountingPeriodId,
          voidedAt: null,
        },
        orderBy: { asOf: "desc" },
        select: {
          id: true,
          status: true,
          readinessScore: true,
          criticalBlockerCount: true,
          highBlockerCount: true,
          asOf: true,
        },
      })
    : null;

  const browser = browserEvidence(browserJson, routeSmokeJson);
  const policy = policyRuntimeEvidence(immutabilityJson);
  const blockers: PayrollFinalReleaseBlocker[] = [];
  const readyStatutoryScenarioFamilies = new Set(
    proofBackfill.setupStatutoryScenarioReadyFamilies,
  );
  const missingApprovedTargetFamilies = countryPackReviewIntake.targetFamilies
    .filter((family) => !readyStatutoryScenarioFamilies.has(family))
    .sort();
  const approvedTargetFamilies = new Set(countryPackReviewIntake.targetFamilies);
  const setupReadyFamiliesMissingApproval =
    proofBackfill.setupStatutoryScenarioReadyFamilies
      .filter((family) => !approvedTargetFamilies.has(family))
      .sort();

  if (proofBackfill.setupGateStatus !== "READY") {
    blockers.push(
      blocker(
        "statutory_setup",
        "FINAL_STATUTORY_SETUP_NOT_READY",
        "Latest proof-backfill setup gate is not ready; statutory/country-pack setup evidence is incomplete.",
        proofBackfill.setupGateStatus ? "high" : "critical",
      ),
    );
  }
  if (proofBackfill.setupStatutoryScenarioCoverageStatus !== "READY") {
    blockers.push(
      blocker(
        "statutory_setup",
        "FINAL_STATUTORY_SCENARIO_COVERAGE_NOT_READY",
        "Latest proof-backfill setup evidence does not prove reviewed statutory scenario coverage is ready.",
        proofBackfill.setupStatutoryScenarioCoverageStatus ? "high" : "critical",
      ),
    );
  }
  if (!proofBackfill.setupStatutoryScenarioCoverageHash) {
    blockers.push(
      blocker(
        "statutory_setup",
        "FINAL_STATUTORY_SCENARIO_COVERAGE_HASH_MISSING",
        "Latest proof-backfill setup evidence is missing the statutory scenario coverage hash.",
        "critical",
      ),
    );
  }
  if (
    proofBackfill.setupStatutoryScenarioMissingReviewEvidenceCount === null ||
    proofBackfill.setupStatutoryScenarioMissingReviewEvidenceCount > 0 ||
    proofBackfill.setupStatutoryScenarioSourceEvidenceHashCount === null ||
    proofBackfill.setupStatutoryScenarioSourceEvidenceHashCount === 0
  ) {
    blockers.push(
      blocker(
        "statutory_setup",
        "FINAL_STATUTORY_SCENARIO_REVIEW_EVIDENCE_MISSING",
        "Latest proof-backfill setup evidence lacks complete statutory scenario review evidence hashes.",
        "high",
      ),
    );
  }
  if (proofBackfill.reviewedProofChainStatus !== "READY") {
    blockers.push(
      blocker(
        "statutory_setup",
        "FINAL_STATUTORY_REVIEWED_PROOF_CHAIN_BLOCKED",
        "Final release requires statutory review evidence to tie to payroll register proof, correction/recalculation lifecycle evidence, and accounting tie-out blockers.",
        proofBackfill.reviewedProofChainStatus ? "high" : "critical",
      ),
    );
  }

  if (countryPackReviewIntake.status !== "APPROVED") {
    blockers.push(
      blocker(
        "country_pack_review_intake",
        "FINAL_COUNTRY_PACK_REVIEW_INTAKE_APPROVAL_MISSING",
        "Latest country-pack review intake evidence is not legally approved.",
        countryPackReviewIntake.status ? "high" : "critical",
      ),
    );
  }
  if (!countryPackReviewIntake.approvalHash) {
    blockers.push(
      blocker(
        "country_pack_review_intake",
        "FINAL_COUNTRY_PACK_REVIEW_INTAKE_APPROVAL_HASH_MISSING",
        "Country-pack review intake approval evidence is missing an approval hash.",
        "critical",
      ),
    );
  }
  if (!countryPackReviewIntake.certificateHash) {
    blockers.push(
      blocker(
        "country_pack_review_intake",
        "FINAL_COUNTRY_PACK_REVIEW_INTAKE_CERTIFICATE_HASH_MISSING",
        "Country-pack review intake approval does not reference a certificate hash.",
        "critical",
      ),
    );
  }
  if (countryPackReviewIntake.freshAuthSatisfied !== true) {
    blockers.push(
      blocker(
        "country_pack_review_intake",
        "FINAL_COUNTRY_PACK_REVIEW_INTAKE_FRESH_AUTH_MISSING",
        "Country-pack review intake legal-owner approval lacks fresh-auth proof.",
        "high",
      ),
    );
  }
  if (
    countryPackReviewIntake.status === "APPROVED" &&
    countryPackReviewIntake.targetFamilies.length === 0
  ) {
    blockers.push(
      blocker(
        "country_pack_review_intake",
        "FINAL_COUNTRY_PACK_REVIEW_INTAKE_TARGET_FAMILIES_MISSING",
        "Country-pack legal-owner approval must name the statutory families it certifies for production release.",
        "critical",
      ),
    );
  }
  if (
    countryPackReviewIntake.status === "APPROVED" &&
    (countryPackReviewIntake.reviewEvidenceSourceHashCount === 0 ||
      countryPackReviewIntake.fixtureEvidenceHashCount === 0)
  ) {
    blockers.push(
      blocker(
        "country_pack_review_intake",
        "FINAL_COUNTRY_PACK_REVIEW_INTAKE_FIXTURE_PROVENANCE_MISSING",
        "Country-pack legal-owner approval must carry legal review source hashes and executable fixture provenance hashes.",
        "critical",
      ),
    );
  }
  if (
    countryPackReviewIntake.status === "APPROVED" &&
    setupReadyFamiliesMissingApproval.length > 0
  ) {
    blockers.push(
      blocker(
        "country_pack_review_intake",
        "FINAL_COUNTRY_PACK_REVIEW_INTAKE_READY_FAMILY_COVERAGE_MISSING",
        "Country-pack legal-owner approval must certify every statutory family that setup proof marks READY before final release.",
        "critical",
      ),
    );
  }
  if (missingApprovedTargetFamilies.length > 0) {
    blockers.push(
      blocker(
        "statutory_setup",
        "FINAL_STATUTORY_APPROVED_TARGET_FAMILY_COVERAGE_MISMATCH",
        "Country-pack legal-owner approval targets statutory families that are not READY in setup statutory scenario coverage proof.",
        "critical",
      ),
    );
  }
  if (!pilot.expectedAdapterChaosReleaseGateHash) {
    blockers.push(
      blocker(
        "adapter_chaos",
        "FINAL_ADAPTER_CHAOS_HASH_MISSING",
        "Pilot evidence does not carry the expected adapter chaos release-gate hash.",
        "critical",
      ),
    );
  }
  if (
    pilot.proofBackfillAdapterChaosMatchesExpected !== true ||
    proofBackfill.sourceAdapterChaosReleaseGateHashMatches !== true
  ) {
    blockers.push(
      blocker(
        "adapter_chaos",
        "FINAL_ADAPTER_CHAOS_BACKFILL_MISMATCH",
        "Proof-backfill adapter chaos continuity does not match the pilot-cycle expectation.",
        "critical",
      ),
    );
  }

  if (proofBackfill.status !== "READY_FOR_CLOSE_RECHECK") {
    blockers.push(
      blocker(
        "proof_backfill",
        "FINAL_PROOF_BACKFILL_NOT_READY",
        "Latest proof-backfill reconciliation certificate is not ready for close recheck.",
        proofBackfill.status ? "high" : "critical",
      ),
    );
  }
  if (proofBackfill.dataTrustProofGateStatus !== "READY") {
    blockers.push(
      blocker(
        "proof_backfill",
        "FINAL_PROOF_BACKFILL_DATA_TRUST_BLOCKED",
        "Proof-backfill data-trust gate is not ready.",
      ),
    );
  }

  if (!pilot.certificateHash) {
    blockers.push(
      blocker(
        "pilot_cycle",
        "FINAL_PILOT_CERTIFICATE_HASH_MISSING",
        "Persisted controlled pilot-cycle certification evidence is missing its certificate hash.",
        "critical",
      ),
    );
  }
  if (pilot.blockerCount > 0) {
    blockers.push(
      blocker(
        "pilot_cycle",
        "FINAL_PILOT_CERTIFICATE_BLOCKERS_OPEN",
        "Persisted controlled pilot-cycle certification evidence still carries pilot blockers.",
        "high",
      ),
    );
  }
  if (pilot.status !== "CERTIFIED_FOR_PRODUCTION_RELEASE_REVIEW") {
    blockers.push(
      blocker(
        "pilot_cycle",
        "FINAL_PILOT_CYCLE_NOT_CERTIFIED",
        "Controlled pilot-cycle certificate is not certified for production release review.",
        pilot.status ? "high" : "critical",
      ),
    );
  }
  if (pilot.missingSignoffRoles.length > 0) {
    blockers.push(
      blocker(
        "pilot_cycle",
        "FINAL_PILOT_SIGNOFFS_MISSING",
        "Controlled pilot-cycle certificate still has missing signoffs.",
        "high",
      ),
    );
  }

  if (!closeRun) {
    blockers.push(
      blocker(
        "close_data_trust",
        "FINAL_CLOSE_RUN_MISSING",
        "No close assurance run was found for the pilot payroll run accounting period.",
        "critical",
      ),
    );
  } else if (
    closeRun.status !== CloseRunStatus.READY &&
    closeRun.status !== CloseRunStatus.CERTIFIED
  ) {
    blockers.push(
      blocker(
        "close_data_trust",
        "FINAL_CLOSE_RUN_NOT_READY",
        "Close assurance is not ready or certified for the pilot payroll period.",
        "critical",
      ),
    );
  } else if (closeRun.criticalBlockerCount > 0) {
    blockers.push(
      blocker(
        "close_data_trust",
        "FINAL_CLOSE_CRITICAL_BLOCKERS_OPEN",
        "Close assurance still has critical blockers.",
        "critical",
      ),
    );
  }

  if (browser.routeSmokeOk !== true || browser.checkCount === 0) {
    blockers.push(
      blocker(
        "browser_validation",
        "FINAL_BROWSER_EVIDENCE_MISSING",
        "Authenticated browser route-smoke or accessibility evidence is missing.",
        "critical",
      ),
    );
  }
  if (browser.seriousViolationCount > 0 || browser.mobileOverflowCount > 0) {
    blockers.push(
      blocker(
        "browser_validation",
        "FINAL_BROWSER_ACCESSIBILITY_OR_LAYOUT_BLOCKED",
        "Authenticated browser validation found serious accessibility or mobile overflow issues.",
        "critical",
      ),
    );
  }
  if (browser.safeErrorCount > 0) {
    blockers.push(
      blocker(
        "browser_validation",
        "FINAL_BROWSER_SAFE_ERROR_STATES_REMAIN",
        "Authenticated browser validation still contains safe-error rendered states.",
        "medium",
      ),
    );
  }

  if (
    policy.status !== "ready" ||
    policy.blockerCount !== 0 ||
    policy.requiredTriggers !== policy.presentTriggers ||
    policy.blockedMutations !== policy.expectedBlockedMutations
  ) {
    blockers.push(
      blocker(
        "policy_runtime",
        "FINAL_POLICY_RUNTIME_NOT_READY",
        "Payroll immutability runtime evidence is missing or not ready.",
        "critical",
      ),
    );
  }

  const gates = [
    gateFromBlockers(
      "statutory_setup",
      "PayrollProofBackfillReconciliationCertificate.setupGate.statutoryScenarioCoverage",
      proofBackfill.setupStatutoryScenarioCoverageHash,
      {
        setupGateStatus: proofBackfill.setupGateStatus,
        setupGateBlockerCount: proofBackfill.setupGateBlockerCodes.length,
        statutoryScenarioCoverageStatus:
          proofBackfill.setupStatutoryScenarioCoverageStatus,
        statutoryScenarioCoverageHashPresent:
          Boolean(proofBackfill.setupStatutoryScenarioCoverageHash),
        statutoryScenarioFamilies:
          `${proofBackfill.setupStatutoryScenarioReadyFamilyCount ?? "missing"}/${proofBackfill.setupStatutoryScenarioRequiredFamilyCount ?? "missing"}`,
        statutoryScenarioBlockerCount:
          proofBackfill.setupStatutoryScenarioBlockerCodes.length,
        missingReviewEvidenceCount:
          proofBackfill.setupStatutoryScenarioMissingReviewEvidenceCount,
        sourceEvidenceHashCount:
          proofBackfill.setupStatutoryScenarioSourceEvidenceHashCount,
        requiredReviewTopicCount:
          proofBackfill.setupStatutoryScenarioRequiredReviewTopicCount,
        requiredReviewTopics:
          proofBackfill.setupStatutoryScenarioRequiredReviewTopics,
        statutoryScenarioReadyFamilies:
          proofBackfill.setupStatutoryScenarioReadyFamilies.join(", ") || null,
        approvedTargetFamilies:
          countryPackReviewIntake.targetFamilies.join(", ") || null,
        approvedTargetFamiliesReadyInCoverage:
          countryPackReviewIntake.targetFamilies.length > 0 &&
          missingApprovedTargetFamilies.length === 0,
        missingApprovedTargetFamilies:
          missingApprovedTargetFamilies.join(", ") || null,
        readyFamiliesMissingCountryPackApproval:
          setupReadyFamiliesMissingApproval.join(", ") || null,
        reviewedProofChainStatus: proofBackfill.reviewedProofChainStatus,
        reviewedProofChainBlockerCount:
          proofBackfill.reviewedProofChainBlockerCodes.length,
        reviewedProofChainRegisterProofGapCount:
          proofBackfill.reviewedProofChainRegisterProofGapCount,
        reviewedProofChainCorrectionIntentCount:
          proofBackfill.reviewedProofChainCorrectionIntentCount,
      },
      blockers,
    ),
    gateFromBlockers(
      "country_pack_review_intake",
      "PayrollCountryPackReviewIntakeApproval",
      countryPackReviewIntake.approvalHash,
      {
        status: countryPackReviewIntake.status,
        approvalHashPresent: Boolean(countryPackReviewIntake.approvalHash),
        certificateHashPresent: Boolean(countryPackReviewIntake.certificateHash),
        proposedPackVersion: countryPackReviewIntake.proposedPackVersion,
        targetFamilyCount: countryPackReviewIntake.targetFamilies.length,
        targetFamilies: countryPackReviewIntake.targetFamilies.join(", ") || null,
        freshAuthSatisfied: countryPackReviewIntake.freshAuthSatisfied,
        approvalEvidenceHashPresent:
          countryPackReviewIntake.approvalEvidenceHashPresent,
        reviewEvidenceSourceHashCount:
          countryPackReviewIntake.reviewEvidenceSourceHashCount,
        fixtureEvidenceHashCount:
          countryPackReviewIntake.fixtureEvidenceHashCount,
        setupReadyFamilyCount:
          proofBackfill.setupStatutoryScenarioReadyFamilies.length,
        setupReadyFamiliesMissingApproval:
          setupReadyFamiliesMissingApproval.join(", ") || null,
      },
      blockers,
    ),
    gateFromBlockers(
      "adapter_chaos",
      "PayrollPilotCycleCertification.proofContinuity",
      pilot.expectedAdapterChaosReleaseGateHash,
      {
        expectedAdapterChaosReleaseGateHashPresent:
          Boolean(pilot.expectedAdapterChaosReleaseGateHash),
        declarationChaosHashCount:
          pilot.declarationAdapterChaosReleaseGateHashes.length,
        paymentChaosHashCount: pilot.paymentAdapterChaosReleaseGateHashes.length,
        proofBackfillAdapterChaosMatchesExpected:
          pilot.proofBackfillAdapterChaosMatchesExpected,
      },
      blockers,
    ),
    gateFromBlockers(
      "proof_backfill",
      "PayrollProofBackfillReconciliationCertificate",
      proofBackfill.certificateHash,
      {
        status: proofBackfill.status,
        dataTrustProofGateStatus: proofBackfill.dataTrustProofGateStatus,
        totalBlockingGaps: proofBackfill.totalBlockingGaps,
        postMigrationProofGapsCleared:
          proofBackfill.postMigrationProofGapsCleared,
      },
      blockers,
    ),
    gateFromBlockers(
      "pilot_cycle",
      "PayrollPilotCycleCertification",
      pilot.certificateHash,
      {
        status: pilot.status,
        blockerCount: pilot.blockerCount,
        missingSignoffCount: pilot.missingSignoffRoles.length,
      },
      blockers,
    ),
    gateFromBlockers(
      "close_data_trust",
      "CloseRun",
      proofBackfill.certificateHash,
      {
        closeRunStatus: closeRun?.status ?? null,
        criticalBlockerCount: closeRun?.criticalBlockerCount ?? null,
        highBlockerCount: closeRun?.highBlockerCount ?? null,
        dataTrustProofGateStatus: proofBackfill.dataTrustProofGateStatus,
      },
      blockers,
    ),
    gateFromBlockers(
      "browser_validation",
      "what-next/payroll/browser-validation-json",
      browser.checkedAt ? prefixedHash(browser) : null,
      {
        routeSmokeOk: browser.routeSmokeOk,
        checkCount: browser.checkCount,
        surfaceCount: browser.surfaceCount,
        safeErrorCount: browser.safeErrorCount,
        seriousViolationCount: browser.seriousViolationCount,
        mobileOverflowCount: browser.mobileOverflowCount,
      },
      blockers,
    ),
    gateFromBlockers(
      "policy_runtime",
      "what-next/payroll/payroll-immutability-runtime-check.json",
      policy.generatedAt ? prefixedHash(policy) : null,
      {
        status: policy.status,
        blockerCount: policy.blockerCount,
        triggers: `${policy.presentTriggers ?? "missing"}/${policy.requiredTriggers ?? "missing"}`,
        blockedMutations: `${policy.blockedMutations ?? "missing"}/${policy.expectedBlockedMutations ?? "missing"}`,
      },
      blockers,
    ),
  ];

  const packWithoutHash = {
    kind: "AQSTOQFLOW_PAYROLL_FINAL_RELEASE_READINESS_PACK" as const,
    version: 1 as const,
    decision: blockers.length === 0
      ? ("READY_FOR_FULL_PRODUCTION_APPROVAL" as const)
      : ("NOT_READY" as const),
    generatedAt: now.toISOString(),
    organizationRef: redactPayrollSetupRef(parsed.organizationId) ?? "redacted:unknown",
    actorRef: redactPayrollSetupRef(parsed.actorId),
    payrollRunRef: redactPayrollSetupRef(rawPayrollRunId),
    gates,
    blockers,
    evidence: {
      countryPackReviewIntake: {
        auditLogRef: countryPackReviewIntake.auditLogRef,
        status: countryPackReviewIntake.status,
        approvalHash: countryPackReviewIntake.approvalHash,
        approvedAt: countryPackReviewIntake.approvedAt,
        certificateHash: countryPackReviewIntake.certificateHash,
        proposedPackVersion: countryPackReviewIntake.proposedPackVersion,
        targetFamilyCount: countryPackReviewIntake.targetFamilies.length,
        targetFamilies: countryPackReviewIntake.targetFamilies,
        freshAuthSatisfied: countryPackReviewIntake.freshAuthSatisfied,
        approvalEvidenceHashPresent:
          countryPackReviewIntake.approvalEvidenceHashPresent,
        reviewEvidenceSourceHashCount:
          countryPackReviewIntake.reviewEvidenceSourceHashCount,
        fixtureEvidenceHashCount:
          countryPackReviewIntake.fixtureEvidenceHashCount,
        reviewEvidenceSourceHashes:
          countryPackReviewIntake.reviewEvidenceSourceHashes,
        fixtureEvidenceHashes: countryPackReviewIntake.fixtureEvidenceHashes,
        setupReadyFamilyCount:
          proofBackfill.setupStatutoryScenarioReadyFamilies.length,
        setupReadyFamiliesMissingApproval,
      },
      pilotCycle: {
        auditLogRef: pilot.auditLogRef,
        status: pilot.status,
        certificateHash: pilot.certificateHash,
        generatedAt: pilot.generatedAt,
        blockerCount: pilot.blockerCount,
        missingSignoffCount: pilot.missingSignoffRoles.length,
        expectedAdapterChaosReleaseGateHash:
          pilot.expectedAdapterChaosReleaseGateHash,
        proofBackfillAdapterChaosMatchesExpected:
          pilot.proofBackfillAdapterChaosMatchesExpected,
      },
      proofBackfill: {
        auditLogRef: proofBackfill.auditLogRef,
        status: proofBackfill.status,
        certificateHash: proofBackfill.certificateHash,
        dataTrustProofGateStatus: proofBackfill.dataTrustProofGateStatus,
        setupGateStatus: proofBackfill.setupGateStatus,
        setupStatutoryScenarioCoverageStatus:
          proofBackfill.setupStatutoryScenarioCoverageStatus,
        setupStatutoryScenarioCoverageHash:
          proofBackfill.setupStatutoryScenarioCoverageHash,
        setupStatutoryScenarioReadyFamilyCount:
          proofBackfill.setupStatutoryScenarioReadyFamilyCount,
        setupStatutoryScenarioRequiredFamilyCount:
          proofBackfill.setupStatutoryScenarioRequiredFamilyCount,
        setupStatutoryScenarioBlockerCodes:
          proofBackfill.setupStatutoryScenarioBlockerCodes,
        setupStatutoryScenarioMissingReviewEvidenceCount:
          proofBackfill.setupStatutoryScenarioMissingReviewEvidenceCount,
        setupStatutoryScenarioSourceEvidenceHashCount:
          proofBackfill.setupStatutoryScenarioSourceEvidenceHashCount,
        setupStatutoryScenarioRequiredReviewTopicCount:
          proofBackfill.setupStatutoryScenarioRequiredReviewTopicCount,
        setupStatutoryScenarioRequiredReviewTopics:
          proofBackfill.setupStatutoryScenarioRequiredReviewTopics,
        setupStatutoryScenarioFamilies:
          proofBackfill.setupStatutoryScenarioFamilies,
        setupStatutoryScenarioReadyFamilies:
          proofBackfill.setupStatutoryScenarioReadyFamilies,
        setupStatutoryScenarioMissingApprovedFamilies:
          missingApprovedTargetFamilies,
        reviewedProofChainStatus: proofBackfill.reviewedProofChainStatus,
        reviewedProofChainCoverageHash:
          proofBackfill.reviewedProofChainCoverageHash,
        reviewedProofChainBlockerCodes:
          proofBackfill.reviewedProofChainBlockerCodes,
        reviewedProofChainReviewEvidenceSourceHashes:
          proofBackfill.reviewedProofChainReviewEvidenceSourceHashes,
        reviewedProofChainRegisterProofGapCount:
          proofBackfill.reviewedProofChainRegisterProofGapCount,
        reviewedProofChainDeclarationRegisterProofGapCount:
          proofBackfill.reviewedProofChainDeclarationRegisterProofGapCount,
        reviewedProofChainPaymentSettlementRegisterProofGapCount:
          proofBackfill.reviewedProofChainPaymentSettlementRegisterProofGapCount,
        reviewedProofChainCorrectionIntentCount:
          proofBackfill.reviewedProofChainCorrectionIntentCount,
        sourceAdapterChaosReleaseGateHash:
          proofBackfill.sourceAdapterChaosReleaseGateHash,
        sourceAdapterChaosReleaseGateHashMatches:
          proofBackfill.sourceAdapterChaosReleaseGateHashMatches,
        totalBlockingGaps: proofBackfill.totalBlockingGaps,
      },
      closeRun: {
        idRef: redactPayrollSetupRef(closeRun?.id),
        status: closeRun?.status ?? null,
        readinessScore: closeRun?.readinessScore ?? null,
        criticalBlockerCount: closeRun?.criticalBlockerCount ?? null,
        highBlockerCount: closeRun?.highBlockerCount ?? null,
        asOf: closeRun?.asOf?.toISOString() ?? null,
      },
      browserValidation: browser,
      policyRuntime: policy,
    },
    releaseGateRequirements: releaseGateRequirements(),
    redaction: {
      policy: "payroll-final-release-readiness-pack-redaction" as const,
      rawPersonDataIncluded: false as const,
      rawSalaryIncluded: false as const,
      rawPaymentDestinationIncluded: false as const,
      rawProviderPayloadIncluded: false as const,
      rawAuthorityPayloadIncluded: false as const,
      rawAuditLogIdsIncluded: false as const,
    },
  };

  const pack: PayrollFinalReleaseReadinessPack = {
    ...packWithoutHash,
    packHash: prefixedHash(packWithoutHash),
    persistence: {
      requested: parsed.persistPack,
      persisted: false,
      auditLogId: null,
      entityType: FINAL_PACK_ENTITY_TYPE,
      auditAction: null,
    },
  };

  if (parsed.persistPack) {
    return persistPack(
      pack,
      parsed,
      rawPayrollRunId ?? parsed.organizationId,
      client,
    );
  }

  return pack;
}

export function formatPayrollFinalReleaseReadinessPack(
  pack: PayrollFinalReleaseReadinessPack,
) {
  const gateRows = pack.gates
    .map(
      (item) =>
        `| ${item.key} | ${item.status} | ${item.blockerCodes.join(", ") || "none"} |`,
    )
    .join("\n");
  const blockers = pack.blockers.length
    ? pack.blockers
        .map((item) => `- ${item.code}: ${item.message}`)
        .join("\n")
    : "- None.";
  const requirements = pack.releaseGateRequirements
    .map((item) => `- ${item.gate}: ${item.command}`)
    .join("\n");

  return `# Payroll Final Release Readiness Pack

Generated: ${pack.generatedAt}
Decision: ${pack.decision}
Pack hash: ${pack.packHash}
Payroll run: ${pack.payrollRunRef ?? "missing"}
Persisted: ${pack.persistence.persisted ? `yes (${pack.persistence.auditLogId})` : "no"}

## Gates

| Gate | Status | Blockers |
| --- | --- | --- |
${gateRows}

## Blockers

${blockers}

## Required Release Gates

${requirements}

## Redaction

- Raw person data included: ${pack.redaction.rawPersonDataIncluded}
- Raw salary included: ${pack.redaction.rawSalaryIncluded}
- Raw payment destination included: ${pack.redaction.rawPaymentDestinationIncluded}
- Raw provider payload included: ${pack.redaction.rawProviderPayloadIncluded}
- Raw authority payload included: ${pack.redaction.rawAuthorityPayloadIncluded}
- Raw audit log ids included: ${pack.redaction.rawAuditLogIdsIncluded}
`;
}
