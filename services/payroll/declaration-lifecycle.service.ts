import "server-only";

import {
  PayrollDeclarationEvidenceTransition,
  PayrollDeclarationStatus,
  Prisma,
} from "@prisma/client";
import { z } from "zod";

import { db } from "@/prisma/db";
import {
  BusinessRuleError,
  ConflictError,
  NotFoundError,
} from "@/services/_shared/action-errors";
import {
  recordCloseCertificationInvalidationsForSourceInTx,
  type CloseCertificationInvalidationSourceCode,
} from "@/services/accounting/close-assurance-pack.service";
import {
  assertSensitiveActionAllowed,
  auditSensitiveActionDecision,
  evaluateSensitiveAction,
} from "@/services/controls/sensitive-action.service";
import {
  hashBusinessPayload,
  markBusinessEventAppliedInTx,
  recordBusinessEventInTx,
} from "@/services/events/business-event.service";
import type { ModuleEntitlementDecision } from "@/services/modules/module-control-contracts";
import {
  evaluateRedaction,
  type RedactionDecision,
} from "@/services/security/redaction-policy.service";
import {
  PAYROLL_ADAPTER_REGISTRY_VERSION,
  resolvePayrollAuthorityAdapterContract,
  resolvePayrollAuthorityLifecycleContract,
} from "./payroll-adapter-registry.service";

type DbClient = typeof db | Prisma.TransactionClient;
type BusinessEventTx = Parameters<typeof recordBusinessEventInTx>[0];
type CloseSourceCode = Exclude<
  CloseCertificationInvalidationSourceCode,
  "CUSTOM"
>;

const idSchema = z.string().trim().min(1);
const hashSchema = z.string().trim().min(1);
const dateInputSchema = z.union([
  z.date(),
  z.string().trim().min(1),
  z.number(),
]);
const adapterReadinessSchema = z.enum([
  "MANUAL_EVIDENCE",
  "REQUIRES_EXPERT_REVIEW",
  "SUPPORTED",
  "SUPPORTED_CERTIFIED",
]);

export const payrollDeclarationLifecycleTransitionSchema = z.enum([
  "submit",
  "accept",
  "reject",
  "mark_payment_due",
  "mark_paid",
  "reconcile",
  "archive",
  "amend",
]);

export const recordPayrollDeclarationEvidenceInputSchema = z.object({
  organizationId: idSchema,
  declarationId: idSchema,
  transition: payrollDeclarationLifecycleTransitionSchema,
  actorId: idSchema,
  actorPermissions: z.array(z.string().trim().min(1)).default([]),
  lastAuthAt: dateInputSchema.optional(),
  now: dateInputSchema.optional(),
  authorityChannel: z.string().trim().min(1).default("MANUAL_PORTAL"),
  authorityEnvironment: z.string().trim().min(1).default("MANUAL_PORTAL"),
  authorityReference: z.string().trim().min(1).optional(),
  authorityStatus: z.string().trim().min(1),
  submittedAt: dateInputSchema.optional(),
  submittedById: idSchema.optional(),
  approvedById: idSchema.optional(),
  submittedPayloadHash: hashSchema.optional(),
  authorityResponseHash: hashSchema.optional(),
  portalReceiptHash: hashSchema.optional(),
  supportingFileHash: hashSchema.optional(),
  authorityAdapterKey: z.string().trim().min(1).max(160).optional(),
  authorityAdapterReadiness: adapterReadinessSchema.optional(),
  payloadMappingHash: hashSchema.optional(),
  responseMappingHash: hashSchema.optional(),
  authorityStatusCodeMapHash: hashSchema.optional(),
  rejectionMappingHash: hashSchema.optional(),
  amendmentMappingHash: hashSchema.optional(),
  paymentDueMappingHash: hashSchema.optional(),
  credentialProofHash: hashSchema.optional(),
  credentialRotationProofHash: hashSchema.optional(),
  credentialScopeProofHash: hashSchema.optional(),
  adapterRequestHash: hashSchema.optional(),
  adapterResponseReceiptHash: hashSchema.optional(),
  adapterIdempotencyKey: idSchema.optional(),
  adapterAttempt: z.number().int().positive().max(100).optional(),
  idempotencyReplayFixtureHash: hashSchema.optional(),
  duplicateResponseFixtureHash: hashSchema.optional(),
  duplicateTerminalResponseReplayFixtureHash: hashSchema.optional(),
  outageRunbookHash: hashSchema.optional(),
  retryPolicyFixtureHash: hashSchema.optional(),
  deadLetterTriageRunbookHash: hashSchema.optional(),
  auditTrailFixtureHash: hashSchema.optional(),
  redactionFixtureHash: hashSchema.optional(),
  closeImpactRuleHash: hashSchema.optional(),
  legalReviewHash: hashSchema.optional(),
  authorityCertificationHarnessHash: hashSchema.optional(),
  adapterChaosReleaseGateHash: hashSchema.optional(),
  sourceRegisterHash: hashSchema.optional(),
  notes: z.string().trim().max(2000).optional(),
  idempotencyKey: idSchema,
  metadata: z.unknown().optional(),
});

export type PayrollDeclarationLifecycleTransition = z.infer<
  typeof payrollDeclarationLifecycleTransitionSchema
>;
export type RecordPayrollDeclarationEvidenceInput = z.input<
  typeof recordPayrollDeclarationEvidenceInputSchema
>;

const TRANSITION_CONFIG = {
  submit: {
    transition: PayrollDeclarationEvidenceTransition.SUBMIT,
    allowedFrom: [PayrollDeclarationStatus.PREPARED],
    nextStatus: PayrollDeclarationStatus.SUBMITTED,
    eventType: "payroll.declaration.submitted",
    auditAction: "PAYROLL_DECLARATION_SUBMITTED_EVIDENCE_RECORDED",
    sourceCode: "PAYROLL_DECLARATION_SUBMITTED" as CloseSourceCode,
    staleReason:
      "Payroll declaration manual submission evidence changed certified close evidence.",
    requireMakerChecker: true,
    requireSubmittedPayloadHash: true,
    requireAuthorityReference: false,
  },
  accept: {
    transition: PayrollDeclarationEvidenceTransition.ACCEPT,
    allowedFrom: [PayrollDeclarationStatus.SUBMITTED],
    nextStatus: PayrollDeclarationStatus.ACCEPTED,
    eventType: "payroll.declaration.accepted",
    auditAction: "PAYROLL_DECLARATION_ACCEPTED_EVIDENCE_RECORDED",
    sourceCode: "PAYROLL_DECLARATION_ACCEPTED" as CloseSourceCode,
    staleReason:
      "Payroll declaration authority acceptance evidence changed certified close evidence.",
    requireMakerChecker: false,
    requireSubmittedPayloadHash: false,
    requireAuthorityReference: true,
  },
  reject: {
    transition: PayrollDeclarationEvidenceTransition.REJECT,
    allowedFrom: [PayrollDeclarationStatus.SUBMITTED],
    nextStatus: PayrollDeclarationStatus.REJECTED,
    eventType: "payroll.declaration.rejected",
    auditAction: "PAYROLL_DECLARATION_REJECTED_EVIDENCE_RECORDED",
    sourceCode: "PAYROLL_DECLARATION_REJECTED" as CloseSourceCode,
    staleReason:
      "Payroll declaration authority rejection evidence changed certified close evidence.",
    requireMakerChecker: false,
    requireSubmittedPayloadHash: false,
    requireAuthorityReference: false,
  },
  mark_payment_due: {
    transition: PayrollDeclarationEvidenceTransition.MARK_PAYMENT_DUE,
    allowedFrom: [PayrollDeclarationStatus.ACCEPTED],
    nextStatus: PayrollDeclarationStatus.PAYMENT_DUE,
    eventType: "payroll.declaration.payment_due",
    auditAction: "PAYROLL_DECLARATION_PAYMENT_DUE_EVIDENCE_RECORDED",
    sourceCode: "PAYROLL_DECLARATION_PAYMENT_DUE" as CloseSourceCode,
    staleReason:
      "Payroll declaration payment due evidence changed certified close evidence.",
    requireMakerChecker: false,
    requireSubmittedPayloadHash: false,
    requireAuthorityReference: true,
  },
  mark_paid: {
    transition: PayrollDeclarationEvidenceTransition.MARK_PAID,
    allowedFrom: [PayrollDeclarationStatus.PAYMENT_DUE],
    nextStatus: PayrollDeclarationStatus.PAID,
    eventType: "payroll.declaration.paid",
    auditAction: "PAYROLL_DECLARATION_PAID_EVIDENCE_RECORDED",
    sourceCode: "PAYROLL_DECLARATION_PAID" as CloseSourceCode,
    staleReason:
      "Payroll declaration payment evidence changed certified close evidence.",
    requireMakerChecker: false,
    requireSubmittedPayloadHash: false,
    requireAuthorityReference: false,
  },
  reconcile: {
    transition: PayrollDeclarationEvidenceTransition.RECONCILE,
    allowedFrom: [PayrollDeclarationStatus.PAID],
    nextStatus: PayrollDeclarationStatus.RECONCILED,
    eventType: "payroll.declaration.reconciled",
    auditAction: "PAYROLL_DECLARATION_RECONCILED_EVIDENCE_RECORDED",
    sourceCode: "PAYROLL_DECLARATION_RECONCILED" as CloseSourceCode,
    staleReason:
      "Payroll declaration reconciliation evidence changed certified close evidence.",
    requireMakerChecker: false,
    requireSubmittedPayloadHash: false,
    requireAuthorityReference: false,
  },
  archive: {
    transition: PayrollDeclarationEvidenceTransition.ARCHIVE,
    allowedFrom: [
      PayrollDeclarationStatus.ACCEPTED,
      PayrollDeclarationStatus.RECONCILED,
    ],
    nextStatus: PayrollDeclarationStatus.ARCHIVED,
    eventType: "payroll.declaration.archived",
    auditAction: "PAYROLL_DECLARATION_ARCHIVED_EVIDENCE_RECORDED",
    sourceCode: null,
    staleReason: null,
    requireMakerChecker: false,
    requireSubmittedPayloadHash: false,
    requireAuthorityReference: false,
  },
  amend: {
    transition: PayrollDeclarationEvidenceTransition.AMEND,
    allowedFrom: [
      PayrollDeclarationStatus.SUBMITTED,
      PayrollDeclarationStatus.ACCEPTED,
      PayrollDeclarationStatus.REJECTED,
      PayrollDeclarationStatus.PAYMENT_DUE,
      PayrollDeclarationStatus.PAID,
      PayrollDeclarationStatus.RECONCILED,
      PayrollDeclarationStatus.ARCHIVED,
    ],
    nextStatus: null,
    eventType: "payroll.declaration.amended",
    auditAction: "PAYROLL_DECLARATION_AMENDMENT_EVIDENCE_RECORDED",
    sourceCode: "PAYROLL_DECLARATION_AMENDED" as CloseSourceCode,
    staleReason:
      "Payroll declaration amendment evidence changed certified close evidence.",
    requireMakerChecker: true,
    requireSubmittedPayloadHash: false,
    requireAuthorityReference: false,
  },
} satisfies Record<
  PayrollDeclarationLifecycleTransition,
  {
    transition: PayrollDeclarationEvidenceTransition;
    allowedFrom: PayrollDeclarationStatus[];
    nextStatus: PayrollDeclarationStatus | null;
    eventType: string;
    auditAction: string;
    sourceCode: CloseSourceCode | null;
    staleReason: string | null;
    requireMakerChecker: boolean;
    requireSubmittedPayloadHash: boolean;
    requireAuthorityReference: boolean;
  }
>;

function hasTransaction(client: DbClient): client is typeof db {
  return typeof (client as typeof db).$transaction === "function";
}

async function inTransaction<T>(
  client: DbClient,
  work: (tx: Prisma.TransactionClient) => Promise<T>,
) {
  if (hasTransaction(client)) return client.$transaction((tx) => work(tx));
  return work(client as Prisma.TransactionClient);
}

function safeJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
}

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

function parseDate(value: Date | string | number | undefined, fallback: Date) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return fallback;
}

function prefixedHash(value: unknown) {
  return `sha256:${hashBusinessPayload(value)}`;
}

function authorityAdapterProofForEvidence(
  parsed: z.output<typeof recordPayrollDeclarationEvidenceInputSchema>,
) {
  const adapterContract = resolvePayrollAuthorityAdapterContract({
    authorityChannel: parsed.authorityChannel,
    authorityEnvironment: parsed.authorityEnvironment,
    requestedAdapterKey: parsed.authorityAdapterKey,
    requestedReadiness: parsed.authorityAdapterReadiness,
    payloadMappingHash: parsed.payloadMappingHash,
    responseMappingHash: parsed.responseMappingHash,
    authorityStatusCodeMapHash: parsed.authorityStatusCodeMapHash,
    rejectionMappingHash: parsed.rejectionMappingHash,
    amendmentMappingHash: parsed.amendmentMappingHash,
    paymentDueMappingHash: parsed.paymentDueMappingHash,
    credentialProofHash: parsed.credentialProofHash,
    credentialRotationProofHash: parsed.credentialRotationProofHash,
    credentialScopeProofHash: parsed.credentialScopeProofHash,
    adapterRequestHash: parsed.adapterRequestHash,
    adapterResponseReceiptHash: parsed.adapterResponseReceiptHash,
    adapterIdempotencyKey: parsed.adapterIdempotencyKey,
    adapterAttempt: parsed.adapterAttempt,
    idempotencyReplayFixtureHash: parsed.idempotencyReplayFixtureHash,
    duplicateResponseFixtureHash: parsed.duplicateResponseFixtureHash,
    duplicateTerminalResponseReplayFixtureHash:
      parsed.duplicateTerminalResponseReplayFixtureHash,
    outageRunbookHash: parsed.outageRunbookHash,
    retryPolicyFixtureHash: parsed.retryPolicyFixtureHash,
    deadLetterTriageRunbookHash: parsed.deadLetterTriageRunbookHash,
    auditTrailFixtureHash: parsed.auditTrailFixtureHash,
    redactionFixtureHash: parsed.redactionFixtureHash,
    closeImpactRuleHash: parsed.closeImpactRuleHash,
    legalReviewHash: parsed.legalReviewHash,
    certificationHarnessHash: parsed.authorityCertificationHarnessHash,
  });

  const requestedMetadata = asRecord(parsed.metadata);
  const adapterChaosReleaseGateHash =
    parsed.adapterChaosReleaseGateHash ??
    metadataString(requestedMetadata, "adapterChaosReleaseGateHash");

  if (
    !adapterContract.manualAuthorityWorkflowOnly &&
    !adapterContract.productionSubmissionSupported
  ) {
    const missingProof = adapterContract.requiredForCertification.length
      ? ` Missing proof: ${adapterContract.requiredForCertification.join(", ")}.`
      : "";
    throw new BusinessRuleError(
      `Payroll declaration production adapters require reviewed authority adapter proof before non-manual evidence can be captured.${missingProof}`,
    );
  }

  if (
    adapterContract.productionSubmissionSupported &&
    !adapterChaosReleaseGateHash
  ) {
    throw new BusinessRuleError(
      "Payroll declaration production adapters require certified adapter chaos release gate proof before automated filing evidence can be captured.",
    );
  }

  const proof = {
    kind: "AQSTOQFLOW_PAYROLL_DECLARATION_AUTHORITY_ADAPTER_PROOF",
    version: 1,
    authorityChannel: parsed.authorityChannel,
    authorityEnvironment: adapterContract.contract.authorityEnvironment,
    authorityAdapterKey: adapterContract.authorityAdapterKey,
    authorityAdapterReadiness: adapterContract.authorityAdapterReadiness,
    authorityAdapterRegistryVersion: PAYROLL_ADAPTER_REGISTRY_VERSION,
    authorityAdapterContractHash: adapterContract.authorityAdapterContractHash,
    authorityAdapterRegistryDecision: adapterContract.registryDecision,
    authorityAdapterRequiredForCertification:
      adapterContract.requiredForCertification,
    authorityAdapterCertificationBlockers:
      adapterContract.certificationBlockers,
    authorityAdapterCertificationProofComplete:
      adapterContract.certificationProofComplete,
    manualAuthorityWorkflowOnly: adapterContract.manualAuthorityWorkflowOnly,
    productionSubmissionSupported:
      adapterContract.productionSubmissionSupported,
    payloadMappingHash: parsed.payloadMappingHash ?? null,
    responseMappingHash: parsed.responseMappingHash ?? null,
    authorityStatusCodeMapHash: parsed.authorityStatusCodeMapHash ?? null,
    rejectionMappingHash: parsed.rejectionMappingHash ?? null,
    amendmentMappingHash: parsed.amendmentMappingHash ?? null,
    paymentDueMappingHash: parsed.paymentDueMappingHash ?? null,
    credentialProofHash: parsed.credentialProofHash ?? null,
    credentialRotationProofHash: parsed.credentialRotationProofHash ?? null,
    credentialScopeProofHash: parsed.credentialScopeProofHash ?? null,
    adapterRequestHash: parsed.adapterRequestHash ?? null,
    adapterResponseReceiptHash: parsed.adapterResponseReceiptHash ?? null,
    adapterIdempotencyKey: parsed.adapterIdempotencyKey ?? null,
    adapterAttempt: parsed.adapterAttempt ?? 1,
    idempotencyReplayFixtureHash: parsed.idempotencyReplayFixtureHash ?? null,
    duplicateResponseFixtureHash: parsed.duplicateResponseFixtureHash ?? null,
    duplicateTerminalResponseReplayFixtureHash:
      parsed.duplicateTerminalResponseReplayFixtureHash ?? null,
    outageRunbookHash: parsed.outageRunbookHash ?? null,
    retryPolicyFixtureHash: parsed.retryPolicyFixtureHash ?? null,
    deadLetterTriageRunbookHash: parsed.deadLetterTriageRunbookHash ?? null,
    auditTrailFixtureHash: parsed.auditTrailFixtureHash ?? null,
    redactionFixtureHash: parsed.redactionFixtureHash ?? null,
    closeImpactRuleHash: parsed.closeImpactRuleHash ?? null,
    legalReviewHash: parsed.legalReviewHash ?? null,
    authorityCertificationHarnessHash:
      parsed.authorityCertificationHarnessHash ?? null,
    adapterChaosReleaseGateHash: adapterChaosReleaseGateHash ?? null,
    authorityAdapterContract: adapterContract.contract,
  };

  return {
    ...adapterContract,
    authorityAdapterProofHash: prefixedHash(proof),
    proof,
  };
}

function authorityAdapterRegistryMetadata(
  proof: ReturnType<typeof authorityAdapterProofForEvidence>,
) {
  return {
    authorityAdapterRegistryVersion: PAYROLL_ADAPTER_REGISTRY_VERSION,
    authorityAdapterContractHash: proof.authorityAdapterContractHash,
    authorityAdapterRegistryDecision: proof.registryDecision,
    authorityAdapterRequiredForCertification: proof.requiredForCertification,
    authorityAdapterCertificationBlockers: proof.certificationBlockers,
    authorityAdapterCertificationProofComplete:
      proof.certificationProofComplete,
    adapterChaosReleaseGateHash:
      proof.proof.adapterChaosReleaseGateHash ?? null,
  };
}

function authorityLifecycleMetadata(input: {
  parsed: z.output<typeof recordPayrollDeclarationEvidenceInputSchema>;
  previousStatus: PayrollDeclarationStatus;
  nextStatus: PayrollDeclarationStatus;
  authorityAdapterProof: ReturnType<typeof authorityAdapterProofForEvidence>;
}) {
  const lifecycle = resolvePayrollAuthorityLifecycleContract({
    transition: input.parsed.transition,
    previousStatus: input.previousStatus,
    nextStatus: input.nextStatus,
    authorityStatus: input.parsed.authorityStatus,
    sourceRegisterHash: input.parsed.sourceRegisterHash ?? null,
    authorityAdapterProofHash:
      input.authorityAdapterProof.authorityAdapterProofHash,
    authorityAdapterContractHash:
      input.authorityAdapterProof.authorityAdapterContractHash,
    authorityAdapterRegistryDecision:
      input.authorityAdapterProof.registryDecision,
  });

  return {
    authorityLifecycleContractHash: lifecycle.authorityLifecycleContractHash,
    authorityLifecycleStatus: lifecycle.authorityLifecycleStatus,
    authorityLifecycleCloseImpact: lifecycle.authorityLifecycleCloseImpact,
    authorityLifecycleNextAction: lifecycle.authorityLifecycleNextAction,
    authorityLifecycleContract: lifecycle.authorityLifecycleContract,
  };
}

function assertEvidenceRequirements(
  parsed: z.output<typeof recordPayrollDeclarationEvidenceInputSchema>,
  config: (typeof TRANSITION_CONFIG)[PayrollDeclarationLifecycleTransition],
) {
  if (config.requireSubmittedPayloadHash && !parsed.submittedPayloadHash) {
    throw new BusinessRuleError(
      "Manual declaration submission evidence requires the submitted payload hash.",
    );
  }
  if (config.requireAuthorityReference && !parsed.authorityReference) {
    throw new BusinessRuleError(
      "Authority reference is required for this declaration transition.",
    );
  }
  if (!parsed.sourceRegisterHash) {
    throw new BusinessRuleError(
      "Payroll declaration lifecycle evidence requires the source payroll register hash.",
    );
  }
  if (config.requireMakerChecker) {
    if (!parsed.approvedById) {
      throw new BusinessRuleError(
        "This payroll declaration transition requires independent approval evidence.",
      );
    }
    if (parsed.approvedById === parsed.actorId) {
      throw new BusinessRuleError(
        "This payroll declaration transition requires a separate approver.",
      );
    }
  }
  const hasEvidenceHash = Boolean(
    parsed.submittedPayloadHash ||
    parsed.authorityResponseHash ||
    parsed.portalReceiptHash ||
    parsed.supportingFileHash,
  );
  if (!hasEvidenceHash) {
    throw new BusinessRuleError(
      "Payroll declaration lifecycle evidence requires at least one immutable evidence hash.",
    );
  }
}

function assertAllowedTransition(
  currentStatus: PayrollDeclarationStatus,
  config: (typeof TRANSITION_CONFIG)[PayrollDeclarationLifecycleTransition],
) {
  const allowedFrom: readonly PayrollDeclarationStatus[] = config.allowedFrom;
  if (!allowedFrom.includes(currentStatus)) {
    throw new BusinessRuleError(
      `Payroll declaration cannot transition from ${currentStatus} with this manual evidence action.`,
    );
  }
}

function evidencePayload(input: {
  parsed: z.output<typeof recordPayrollDeclarationEvidenceInputSchema>;
  declaration: {
    id: string;
    payrollRunId: string;
    authority: string;
    declarationType: string;
    status: PayrollDeclarationStatus;
    amount: Prisma.Decimal;
    currency: string;
    payloadHash: string | null;
    countryPackResolutionHash: string;
  };
  nextStatus: PayrollDeclarationStatus;
  transition: PayrollDeclarationEvidenceTransition;
  capturedAt: Date;
  authorityAdapterProof: ReturnType<typeof authorityAdapterProofForEvidence>;
  authorityLifecycle: ReturnType<typeof authorityLifecycleMetadata>;
}) {
  return {
    kind: "AQSTOQFLOW_PAYROLL_DECLARATION_MANUAL_EVIDENCE",
    version: 1,
    declarationId: input.declaration.id,
    payrollRunId: input.declaration.payrollRunId,
    transition: input.transition,
    previousStatus: input.declaration.status,
    nextStatus: input.nextStatus,
    authority: input.declaration.authority,
    declarationType: input.declaration.declarationType,
    amount: input.declaration.amount.toFixed(2),
    currency: input.declaration.currency,
    declarationPayloadHash: input.declaration.payloadHash,
    countryPackResolutionHash: input.declaration.countryPackResolutionHash,
    authorityChannel: input.parsed.authorityChannel,
    authorityEnvironment: input.parsed.authorityEnvironment,
    authorityReference: input.parsed.authorityReference ?? null,
    authorityStatus: input.parsed.authorityStatus,
    submittedAt: input.parsed.submittedAt
      ? parseDate(input.parsed.submittedAt, input.capturedAt).toISOString()
      : null,
    submittedById: input.parsed.submittedById ?? null,
    approvedById: input.parsed.approvedById ?? null,
    evidenceCapturedById: input.parsed.actorId,
    submittedPayloadHash: input.parsed.submittedPayloadHash ?? null,
    authorityResponseHash: input.parsed.authorityResponseHash ?? null,
    portalReceiptHash: input.parsed.portalReceiptHash ?? null,
    supportingFileHash: input.parsed.supportingFileHash ?? null,
    sourceRegisterHash: input.parsed.sourceRegisterHash ?? null,
    authorityAdapterKey: input.authorityAdapterProof.authorityAdapterKey,
    authorityAdapterReadiness:
      input.authorityAdapterProof.authorityAdapterReadiness,
    authorityAdapterProofHash:
      input.authorityAdapterProof.authorityAdapterProofHash,
    ...authorityAdapterRegistryMetadata(input.authorityAdapterProof),
    ...input.authorityLifecycle,
    payloadMappingHash: input.parsed.payloadMappingHash ?? null,
    responseMappingHash: input.parsed.responseMappingHash ?? null,
    authorityStatusCodeMapHash: input.parsed.authorityStatusCodeMapHash ?? null,
    rejectionMappingHash: input.parsed.rejectionMappingHash ?? null,
    amendmentMappingHash: input.parsed.amendmentMappingHash ?? null,
    paymentDueMappingHash: input.parsed.paymentDueMappingHash ?? null,
    credentialProofHash: input.parsed.credentialProofHash ?? null,
    credentialRotationProofHash:
      input.parsed.credentialRotationProofHash ?? null,
    credentialScopeProofHash: input.parsed.credentialScopeProofHash ?? null,
    adapterRequestHash: input.parsed.adapterRequestHash ?? null,
    adapterResponseReceiptHash: input.parsed.adapterResponseReceiptHash ?? null,
    adapterIdempotencyKey: input.parsed.adapterIdempotencyKey ?? null,
    adapterAttempt: input.parsed.adapterAttempt ?? 1,
    idempotencyReplayFixtureHash:
      input.parsed.idempotencyReplayFixtureHash ?? null,
    duplicateResponseFixtureHash:
      input.parsed.duplicateResponseFixtureHash ?? null,
    duplicateTerminalResponseReplayFixtureHash:
      input.parsed.duplicateTerminalResponseReplayFixtureHash ?? null,
    outageRunbookHash: input.parsed.outageRunbookHash ?? null,
    retryPolicyFixtureHash: input.parsed.retryPolicyFixtureHash ?? null,
    deadLetterTriageRunbookHash:
      input.parsed.deadLetterTriageRunbookHash ?? null,
    auditTrailFixtureHash: input.parsed.auditTrailFixtureHash ?? null,
    redactionFixtureHash: input.parsed.redactionFixtureHash ?? null,
    closeImpactRuleHash: input.parsed.closeImpactRuleHash ?? null,
    legalReviewHash: input.parsed.legalReviewHash ?? null,
    authorityCertificationHarnessHash:
      input.parsed.authorityCertificationHarnessHash ?? null,
    adapterChaosReleaseGateHash:
      input.authorityAdapterProof.proof.adapterChaosReleaseGateHash ?? null,
    automationCapabilityStatus:
      input.authorityAdapterProof.automationCapabilityStatus,
    productionSubmissionSupported:
      input.authorityAdapterProof.productionSubmissionSupported,
    capturedAt: input.capturedAt.toISOString(),
  };
}

export const payrollDeclarationWorkbenchInputSchema = z.object({
  organizationId: idSchema,
  status: z.nativeEnum(PayrollDeclarationStatus).optional(),
  limit: z.number().int().positive().max(250).default(80),
  now: dateInputSchema.optional(),
  actorId: idSchema.optional().nullable(),
  actorPermissions: z.array(z.string().trim().min(1)).default([]),
  moduleDecision: z.custom<ModuleEntitlementDecision>().optional().nullable(),
});

export type PayrollDeclarationWorkbenchInput = z.input<
  typeof payrollDeclarationWorkbenchInputSchema
>;

function decimalNumber(
  value: Prisma.Decimal | number | string | null | undefined,
) {
  if (value == null) return 0;
  const parsed = Number(value.toString());
  return Number.isFinite(parsed) ? parsed : 0;
}

function decimalText(
  value: Prisma.Decimal | number | string | null | undefined,
) {
  return decimalNumber(value).toFixed(2);
}

function dateIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

type PayrollDeclarationWorkbenchRedaction = {
  allowed: boolean;
  mode: RedactionDecision["mode"];
  reasonCode: RedactionDecision["reasonCode"];
  policy: string;
  replacement: string;
  requiredPermissions: string[];
};

function redactionSummary(
  decision: RedactionDecision,
): PayrollDeclarationWorkbenchRedaction {
  return {
    allowed: decision.allowed,
    mode: decision.mode,
    reasonCode: decision.reasonCode,
    policy: decision.policy,
    replacement: decision.replacement,
    requiredPermissions: decision.requiredPermissions,
  };
}

function proofIdentifier(
  decision: RedactionDecision,
  value: string | null | undefined,
) {
  if (!value) return null;
  return decision.allowed ? value : decision.replacement;
}

const ACTIVE_DECLARATION_STATUSES = [
  PayrollDeclarationStatus.PREPARED,
  PayrollDeclarationStatus.SUBMITTED,
  PayrollDeclarationStatus.ACCEPTED,
  PayrollDeclarationStatus.REJECTED,
  PayrollDeclarationStatus.PAYMENT_DUE,
  PayrollDeclarationStatus.PAID,
];

function allowedDeclarationTransitions(status: PayrollDeclarationStatus) {
  return Object.entries(TRANSITION_CONFIG)
    .filter(([, config]) =>
      (config.allowedFrom as readonly PayrollDeclarationStatus[]).includes(
        status,
      ),
    )
    .map(([id, config]) => ({
      id: id as PayrollDeclarationLifecycleTransition,
      transition: config.transition,
      label: declarationTransitionLabel(
        id as PayrollDeclarationLifecycleTransition,
      ),
      requiredPermission: "payroll.declarations.manage",
      requiresFreshAuth: true,
      requiresSeparateApprover: config.requireMakerChecker,
      requiresSubmittedPayloadHash: config.requireSubmittedPayloadHash,
      requiresAuthorityReference: config.requireAuthorityReference,
      nextStatus: config.nextStatus,
    }));
}

function declarationTransitionLabel(
  transition: PayrollDeclarationLifecycleTransition,
) {
  switch (transition) {
    case "submit":
      return "Record submission evidence";
    case "accept":
      return "Record authority acceptance";
    case "reject":
      return "Record authority rejection";
    case "mark_payment_due":
      return "Mark payment due";
    case "mark_paid":
      return "Record statutory payment";
    case "reconcile":
      return "Reconcile declaration";
    case "archive":
      return "Archive declaration";
    case "amend":
      return "Record amendment";
  }
}

function declarationBlockers(input: {
  status: PayrollDeclarationStatus;
  payloadHash: string | null;
  latestEvidence: {
    sourceRegisterHash: string | null;
    productionSubmissionSupported: boolean;
    automationCapabilityStatus: string;
  } | null;
}) {
  const blockers: Array<{
    id: string;
    severity: "info" | "medium" | "high" | "critical";
    title: string;
    detail: string;
    nextAction: string;
  }> = [];

  if (!input.payloadHash) {
    blockers.push({
      id: "PAYROLL_DECLARATION_PAYLOAD_PROOF_MISSING",
      severity: "high",
      title: "Declaration payload proof is missing",
      detail:
        "The declaration cannot be trusted until the prepared payload hash is present.",
      nextAction:
        "Prepare declarations from the payroll register again or repair the payload proof.",
    });
  }

  if (!input.latestEvidence?.sourceRegisterHash) {
    blockers.push({
      id: "PAYROLL_DECLARATION_REGISTER_PROOF_MISSING",
      severity: "high",
      title: "Source register proof is missing",
      detail:
        "Lifecycle evidence must include the source payroll register hash before close certification can trust this declaration.",
      nextAction:
        "Record declaration lifecycle evidence with the source payroll register hash.",
    });
  }

  if (input.status === PayrollDeclarationStatus.REJECTED) {
    blockers.push({
      id: "PAYROLL_DECLARATION_REJECTED_BY_AUTHORITY",
      severity: "critical",
      title: "Authority rejected this declaration",
      detail:
        "Rejected authority evidence blocks certification until correction or amendment evidence is captured.",
      nextAction:
        "Record an amendment or prepare a corrected declaration from payroll register proof.",
    });
  }

  if (
    input.latestEvidence &&
    !input.latestEvidence.productionSubmissionSupported
  ) {
    blockers.push({
      id: "PAYROLL_DECLARATION_AUTOMATION_NOT_CERTIFIED",
      severity: "medium",
      title: "Automation is not certified",
      detail: `Latest evidence is ${input.latestEvidence.automationCapabilityStatus}; manual authority evidence remains required.`,
      nextAction:
        "Keep filing manual until reviewed authority adapter mappings and credentials are certified.",
    });
  }

  return blockers;
}

export async function getPayrollDeclarationWorkbenchData(
  input: PayrollDeclarationWorkbenchInput,
  client: Pick<
    DbClient,
    "payrollDeclaration" | "payrollDeclarationEvidence"
  > = db,
) {
  const parsed = payrollDeclarationWorkbenchInputSchema.parse(input);
  const now = parseDate(parsed.now, new Date());
  const proofIdentifierPolicyDecision = evaluateRedaction({
    field: "PayrollDeclarationWorkbench.proofIdentifiers",
    category: "proof_hidden_identifier",
    actorPermissions: parsed.actorPermissions,
    moduleDecision: parsed.moduleDecision ?? null,
  });
  const proofIdentifierDecision: RedactionDecision = parsed.moduleDecision
    ?.wouldBlock
    ? {
        ...proofIdentifierPolicyDecision,
        allowed: false,
        mode: "redact",
        reasonCode: "MODULE_NOT_ENTITLED",
      }
    : proofIdentifierPolicyDecision;
  const where = {
    organizationId: parsed.organizationId,
    ...(parsed.status ? { status: parsed.status } : {}),
  };

  const [
    declarations,
    totalDeclarations,
    activeDeclarations,
    rejectedDeclarations,
    evidenceCount,
    automationBlockedEvidenceCount,
    productionSupportedEvidenceCount,
    amountInScope,
  ] = await Promise.all([
    client.payrollDeclaration.findMany({
      where,
      orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }],
      take: parsed.limit,
      include: {
        payrollRun: {
          select: {
            id: true,
            runNumber: true,
            runType: true,
            status: true,
            currency: true,
            netPayableAmount: true,
            grossAmount: true,
            ledgerPostingBatchId: true,
            journalEntryId: true,
            accountingSourceLinkId: true,
            evidenceHash: true,
            documentHash: true,
            payrollPeriod: {
              select: {
                id: true,
                name: true,
                periodStart: true,
                periodEnd: true,
                payDate: true,
                status: true,
              },
            },
          },
        },
        evidenceItems: {
          orderBy: { createdAt: "desc" },
          take: 3,
          select: {
            id: true,
            transition: true,
            previousStatus: true,
            nextStatus: true,
            authorityChannel: true,
            authorityEnvironment: true,
            authorityReference: true,
            authorityStatus: true,
            evidenceHash: true,
            submittedPayloadHash: true,
            authorityResponseHash: true,
            portalReceiptHash: true,
            supportingFileHash: true,
            sourceRegisterHash: true,
            countryPackResolutionHash: true,
            automationCapabilityStatus: true,
            productionSubmissionSupported: true,
            createdAt: true,
          },
        },
      },
    }),
    client.payrollDeclaration.count({ where }),
    client.payrollDeclaration.count({
      where: { ...where, status: { in: ACTIVE_DECLARATION_STATUSES } },
    }),
    client.payrollDeclaration.count({
      where: { ...where, status: PayrollDeclarationStatus.REJECTED },
    }),
    client.payrollDeclarationEvidence.count({
      where: { organizationId: parsed.organizationId },
    }),
    client.payrollDeclarationEvidence.count({
      where: {
        organizationId: parsed.organizationId,
        automationCapabilityStatus: "AUTOMATION_BLOCKED",
      },
    }),
    client.payrollDeclarationEvidence.count({
      where: {
        organizationId: parsed.organizationId,
        productionSubmissionSupported: true,
      },
    }),
    client.payrollDeclaration.aggregate({
      where,
      _sum: { amount: true },
    }),
  ]);

  const rows = declarations.map((declaration) => {
    const latestEvidence = declaration.evidenceItems[0] ?? null;
    const blockers = declarationBlockers({
      status: declaration.status,
      payloadHash: declaration.payloadHash,
      latestEvidence,
    });

    return {
      id: declaration.id,
      authority: declaration.authority,
      declarationType: declaration.declarationType,
      status: declaration.status,
      amount: decimalText(declaration.amount),
      currency: declaration.currency,
      periodStart: dateIso(declaration.periodStart),
      periodEnd: dateIso(declaration.periodEnd),
      dueDate: dateIso(declaration.dueDate),
      country: {
        countryCode: declaration.countryCode,
        countryPackVersion: declaration.countryPackVersion,
        countryPackSchemaVersion: declaration.countryPackSchemaVersion,
        countryPackResolutionHash: proofIdentifier(
          proofIdentifierDecision,
          declaration.countryPackResolutionHash,
        ),
      },
      payrollRun: {
        id: declaration.payrollRun.id,
        runNumber: declaration.payrollRun.runNumber,
        runType: declaration.payrollRun.runType,
        status: declaration.payrollRun.status,
        netPayableAmount: decimalText(declaration.payrollRun.netPayableAmount),
        grossAmount: decimalText(declaration.payrollRun.grossAmount),
        currency: declaration.payrollRun.currency,
        ledgerPostingBatchId: declaration.payrollRun.ledgerPostingBatchId,
        journalEntryId: declaration.payrollRun.journalEntryId,
        accountingSourceLinkId: declaration.payrollRun.accountingSourceLinkId,
        evidenceHash: proofIdentifier(
          proofIdentifierDecision,
          declaration.payrollRun.evidenceHash,
        ),
        documentHash: proofIdentifier(
          proofIdentifierDecision,
          declaration.payrollRun.documentHash,
        ),
        period: {
          id: declaration.payrollRun.payrollPeriod.id,
          name: declaration.payrollRun.payrollPeriod.name,
          status: declaration.payrollRun.payrollPeriod.status,
          periodStart: dateIso(
            declaration.payrollRun.payrollPeriod.periodStart,
          ),
          periodEnd: dateIso(declaration.payrollRun.payrollPeriod.periodEnd),
          payDate: dateIso(declaration.payrollRun.payrollPeriod.payDate),
        },
      },
      proof: {
        payloadHash: proofIdentifier(
          proofIdentifierDecision,
          declaration.payloadHash,
        ),
        countryPackResolutionHash: proofIdentifier(
          proofIdentifierDecision,
          declaration.countryPackResolutionHash,
        ),
        latestEvidenceId: proofIdentifier(
          proofIdentifierDecision,
          latestEvidence?.id ?? null,
        ),
        latestEvidenceHash: proofIdentifier(
          proofIdentifierDecision,
          latestEvidence?.evidenceHash ?? null,
        ),
        latestTransition: latestEvidence?.transition ?? null,
        latestAuthorityStatus: latestEvidence?.authorityStatus ?? null,
        latestAuthorityReference: proofIdentifier(
          proofIdentifierDecision,
          latestEvidence?.authorityReference ?? null,
        ),
        latestAuthorityChannel: latestEvidence?.authorityChannel ?? null,
        latestAuthorityEnvironment:
          latestEvidence?.authorityEnvironment ?? null,
        latestEvidenceCapturedAt: dateIso(latestEvidence?.createdAt),
        submittedPayloadHash: proofIdentifier(
          proofIdentifierDecision,
          latestEvidence?.submittedPayloadHash ?? null,
        ),
        authorityResponseHash: proofIdentifier(
          proofIdentifierDecision,
          latestEvidence?.authorityResponseHash ?? null,
        ),
        portalReceiptHash: proofIdentifier(
          proofIdentifierDecision,
          latestEvidence?.portalReceiptHash ?? null,
        ),
        supportingFileHash: proofIdentifier(
          proofIdentifierDecision,
          latestEvidence?.supportingFileHash ?? null,
        ),
        sourceRegisterHash: proofIdentifier(
          proofIdentifierDecision,
          latestEvidence?.sourceRegisterHash ?? null,
        ),
        sourceRegisterProofPresent: Boolean(latestEvidence?.sourceRegisterHash),
        evidenceCount: declaration.evidenceItems.length,
        history: declaration.evidenceItems.map((item) => ({
          id: item.id,
          transition: item.transition,
          previousStatus: item.previousStatus,
          nextStatus: item.nextStatus,
          authorityStatus: item.authorityStatus,
          evidenceHash: proofIdentifier(
            proofIdentifierDecision,
            item.evidenceHash,
          ),
          sourceRegisterHash: proofIdentifier(
            proofIdentifierDecision,
            item.sourceRegisterHash,
          ),
          createdAt: dateIso(item.createdAt),
        })),
      },
      automation: {
        automationCapabilityStatus:
          latestEvidence?.automationCapabilityStatus ?? "EVIDENCE_PENDING",
        productionSubmissionSupported:
          latestEvidence?.productionSubmissionSupported ?? false,
        manualAuthorityWorkflowOnly: !(
          latestEvidence?.productionSubmissionSupported ?? false
        ),
      },
      nextActions: allowedDeclarationTransitions(declaration.status),
      blockers,
    };
  });

  const missingRegisterProofCount = rows.filter(
    (row) => !row.proof.sourceRegisterProofPresent,
  ).length;
  const blockedRows = rows.filter((row) =>
    row.blockers.some(
      (blocker) =>
        blocker.severity === "high" || blocker.severity === "critical",
    ),
  );

  return {
    organizationId: parsed.organizationId,
    asOf: now.toISOString(),
    statusFilter: parsed.status ?? null,
    redaction: {
      proofIdentifiers: redactionSummary(proofIdentifierDecision),
    },
    summary: {
      totalDeclarations,
      activeDeclarations,
      rejectedDeclarations,
      returnedDeclarations: rows.length,
      blockedDeclarations: blockedRows.length,
      evidenceCount,
      automationBlockedEvidenceCount,
      productionSupportedEvidenceCount,
      missingRegisterProofCount,
      amountInScope: decimalText(amountInScope._sum.amount),
      coverageComplete: rows.length >= totalDeclarations,
    },
    declarations: rows,
    sourceScope: {
      limit: parsed.limit,
      returned: rows.length,
      coverageComplete: rows.length >= totalDeclarations,
      sourceService: "services/payroll/declaration-lifecycle.service.ts",
    },
  };
}
export async function recordPayrollDeclarationEvidence(
  input: RecordPayrollDeclarationEvidenceInput,
  client: DbClient = db,
) {
  const parsed = recordPayrollDeclarationEvidenceInputSchema.parse(input);
  const config = TRANSITION_CONFIG[parsed.transition];
  const authorityAdapterProof = authorityAdapterProofForEvidence(parsed);
  assertEvidenceRequirements(parsed, config);
  const now = parseDate(parsed.now, new Date());

  return inTransaction(client, async (tx) => {
    const declaration = await tx.payrollDeclaration.findFirst({
      where: {
        id: parsed.declarationId,
        organizationId: parsed.organizationId,
      },
      include: { payrollRun: { include: { payrollPeriod: true } } },
    });
    if (!declaration) throw new NotFoundError("Payroll declaration not found");

    const nextStatus = config.nextStatus ?? declaration.status;
    assertAllowedTransition(declaration.status, config);
    const authorityLifecycle = authorityLifecycleMetadata({
      parsed,
      previousStatus: declaration.status,
      nextStatus,
      authorityAdapterProof,
    });

    const evidence = evidencePayload({
      parsed,
      declaration,
      nextStatus,
      transition: config.transition,
      capturedAt: now,
      authorityAdapterProof,
      authorityLifecycle,
    });
    const evidenceHash = prefixedHash(evidence);

    const existingEvidence = await tx.payrollDeclarationEvidence.findFirst({
      where: {
        organizationId: parsed.organizationId,
        declarationId: declaration.id,
        transition: config.transition,
        idempotencyKey: parsed.idempotencyKey,
      },
    });
    if (existingEvidence) {
      if (existingEvidence.evidenceHash !== evidenceHash) {
        throw new ConflictError(
          "Payroll declaration evidence idempotency key was reused with a different payload.",
        );
      }
      return {
        declaration,
        evidence: existingEvidence,
        businessEventId: null,
        idempotent: true,
        automationCapabilityStatus:
          authorityAdapterProof.automationCapabilityStatus,
        productionSubmissionSupported:
          authorityAdapterProof.productionSubmissionSupported,
      };
    }

    const controlDecision = evaluateSensitiveAction({
      action: "payroll.declaration.lifecycle",
      actorId: parsed.actorId,
      organizationId: parsed.organizationId,
      actorPermissions: parsed.actorPermissions,
      subjectActorId: config.requireMakerChecker
        ? (parsed.approvedById ?? null)
        : null,
      lastAuthAt: parsed.lastAuthAt,
      now,
      resourceType: "PayrollDeclaration",
      resourceId: declaration.id,
      amount: declaration.amount,
      currency: declaration.currency,
      metadata: {
        transition: parsed.transition,
        authority: declaration.authority,
        declarationType: declaration.declarationType,
        sourceRegisterHash: parsed.sourceRegisterHash,
        automationCapabilityStatus:
          authorityAdapterProof.automationCapabilityStatus,
        authorityAdapterKey: authorityAdapterProof.authorityAdapterKey,
        authorityAdapterReadiness:
          authorityAdapterProof.authorityAdapterReadiness,
        authorityAdapterProofHash:
          authorityAdapterProof.authorityAdapterProofHash,
        ...authorityAdapterRegistryMetadata(authorityAdapterProof),
        ...authorityLifecycle,
      },
    });
    await auditSensitiveActionDecision(tx, controlDecision);
    assertSensitiveActionAllowed(controlDecision);

    const createdEvidence = await tx.payrollDeclarationEvidence.create({
      data: {
        organizationId: parsed.organizationId,
        declarationId: declaration.id,
        transition: config.transition,
        previousStatus: declaration.status,
        nextStatus,
        authority: declaration.authority,
        declarationType: declaration.declarationType,
        authorityChannel: parsed.authorityChannel,
        authorityEnvironment: parsed.authorityEnvironment,
        authorityReference: parsed.authorityReference ?? null,
        authorityStatus: parsed.authorityStatus,
        submittedAt: parsed.submittedAt
          ? parseDate(parsed.submittedAt, now)
          : null,
        submittedById: parsed.submittedById ?? null,
        approvedById: parsed.approvedById ?? null,
        evidenceCapturedById: parsed.actorId,
        evidenceHash,
        submittedPayloadHash: parsed.submittedPayloadHash ?? null,
        authorityResponseHash: parsed.authorityResponseHash ?? null,
        portalReceiptHash: parsed.portalReceiptHash ?? null,
        supportingFileHash: parsed.supportingFileHash ?? null,
        sourceRegisterHash: parsed.sourceRegisterHash ?? null,
        countryPackResolutionHash: declaration.countryPackResolutionHash,
        automationCapabilityStatus:
          authorityAdapterProof.automationCapabilityStatus,
        productionSubmissionSupported:
          authorityAdapterProof.productionSubmissionSupported,
        notes: parsed.notes ?? null,
        idempotencyKey: parsed.idempotencyKey,
        metadata: safeJson({
          ...asRecord(parsed.metadata),
          evidence,
          authorityAdapterProof: authorityAdapterProof.proof,
          authorityAdapterProofHash:
            authorityAdapterProof.authorityAdapterProofHash,
          ...authorityAdapterRegistryMetadata(authorityAdapterProof),
          ...authorityLifecycle,
          authorityAdapterKey: authorityAdapterProof.authorityAdapterKey,
          authorityAdapterReadiness:
            authorityAdapterProof.authorityAdapterReadiness,
          manualAuthorityWorkflowOnly:
            authorityAdapterProof.manualAuthorityWorkflowOnly,
          productionAdapterBlockedReason:
            authorityAdapterProof.productionSubmissionSupported
              ? null
              : "EXPERT_REVIEWED_PRODUCTION_SUBMISSION_MAPPING_MISSING",
        }),
      },
    });

    const updatedDeclaration = config.nextStatus
      ? await tx.payrollDeclaration.update({
          where: { id: declaration.id },
          data: {
            status: config.nextStatus,
            metadata: safeJson({
              ...asRecord(declaration.metadata),
              latestManualEvidenceHash: evidenceHash,
              latestManualEvidenceId: createdEvidence.id,
              latestManualTransition: parsed.transition,
              latestManualTransitionAt: now.toISOString(),
              automationCapabilityStatus:
                authorityAdapterProof.automationCapabilityStatus,
              productionSubmissionSupported:
                authorityAdapterProof.productionSubmissionSupported,
              latestAuthorityAdapterProofHash:
                authorityAdapterProof.authorityAdapterProofHash,
              latestAdapterChaosReleaseGateHash:
                authorityAdapterProof.proof.adapterChaosReleaseGateHash ?? null,
              ...authorityAdapterRegistryMetadata(authorityAdapterProof),
              latestAuthorityAdapterKey:
                authorityAdapterProof.authorityAdapterKey,
              latestAuthorityAdapterReadiness:
                authorityAdapterProof.authorityAdapterReadiness,
              latestAuthorityAdapterContractHash:
                authorityAdapterProof.authorityAdapterContractHash,
              latestAuthorityAdapterRegistryDecision:
                authorityAdapterProof.registryDecision,
              latestAuthorityLifecycleContractHash:
                authorityLifecycle.authorityLifecycleContractHash,
              latestAuthorityLifecycleStatus:
                authorityLifecycle.authorityLifecycleStatus,
              latestAuthorityLifecycleCloseImpact:
                authorityLifecycle.authorityLifecycleCloseImpact,
              latestAuthorityLifecycleNextAction:
                authorityLifecycle.authorityLifecycleNextAction,
            }),
          },
          include: { payrollRun: { include: { payrollPeriod: true } } },
        })
      : declaration;

    const eventResult = await recordBusinessEventInTx(
      tx as unknown as BusinessEventTx,
      {
        organizationId: parsed.organizationId,
        eventType: config.eventType,
        eventSource: "INTERNAL",
        schemaVersion: 1,
        idempotencyKey: `payroll-declaration:${declaration.id}:${config.transition}:${parsed.idempotencyKey}`,
        payload: {
          declarationId: declaration.id,
          payrollRunId: declaration.payrollRunId,
          transition: config.transition,
          previousStatus: declaration.status,
          nextStatus,
          evidenceId: createdEvidence.id,
          evidenceHash,
          sourceRegisterHash: parsed.sourceRegisterHash,
          authority: declaration.authority,
          declarationType: declaration.declarationType,
          authorityChannel: parsed.authorityChannel,
          authorityEnvironment: parsed.authorityEnvironment,
          authorityStatus: parsed.authorityStatus,
          automationCapabilityStatus:
            authorityAdapterProof.automationCapabilityStatus,
          productionSubmissionSupported:
            authorityAdapterProof.productionSubmissionSupported,
          authorityAdapterKey: authorityAdapterProof.authorityAdapterKey,
          authorityAdapterReadiness:
            authorityAdapterProof.authorityAdapterReadiness,
          authorityAdapterProofHash:
            authorityAdapterProof.authorityAdapterProofHash,
          ...authorityAdapterRegistryMetadata(authorityAdapterProof),
          ...authorityLifecycle,
        },
        occurredAt: now,
        actorId: parsed.actorId,
        sourceType: "PAYROLL_DECLARATION",
        sourceId: declaration.id,
        documentHash: evidenceHash,
        metadata: {
          manualAuthorityWorkflowOnly:
            authorityAdapterProof.manualAuthorityWorkflowOnly,
          productionAdapterBlockedReason:
            authorityAdapterProof.productionSubmissionSupported
              ? null
              : "EXPERT_REVIEWED_PRODUCTION_SUBMISSION_MAPPING_MISSING",
          authorityAdapterKey: authorityAdapterProof.authorityAdapterKey,
          authorityAdapterReadiness:
            authorityAdapterProof.authorityAdapterReadiness,
          authorityAdapterProofHash:
            authorityAdapterProof.authorityAdapterProofHash,
          ...authorityAdapterRegistryMetadata(authorityAdapterProof),
          ...authorityLifecycle,
        },
        outboxMessages: [
          {
            channel: "NOTIFICATION",
            eventName: config.eventType.replace(/\./g, "_"),
            destination: "payroll",
            payload: {
              severity:
                parsed.transition === "reject" || parsed.transition === "amend"
                  ? "warning"
                  : "info",
              declarationId: declaration.id,
              payrollRunId: declaration.payrollRunId,
              transition: config.transition,
              nextStatus,
              automationCapabilityStatus:
                authorityAdapterProof.automationCapabilityStatus,
              authorityAdapterProofHash:
                authorityAdapterProof.authorityAdapterProofHash,
              ...authorityAdapterRegistryMetadata(authorityAdapterProof),
              authorityLifecycleContractHash:
                authorityLifecycle.authorityLifecycleContractHash,
              authorityLifecycleStatus:
                authorityLifecycle.authorityLifecycleStatus,
            },
          },
        ],
      },
    );
    await markBusinessEventAppliedInTx(
      tx as unknown as BusinessEventTx,
      parsed.organizationId,
      eventResult.event.id,
    );

    if (config.sourceCode && config.staleReason) {
      await recordCloseCertificationInvalidationsForSourceInTx(
        tx,
        parsed.organizationId,
        {
          sourceCode: config.sourceCode,
          sourceId: declaration.id,
          periodStart: declaration.periodStart,
          periodEnd: declaration.periodEnd,
          staleReason: config.staleReason,
          newEvidenceHash: evidenceHash,
          correlationId: eventResult.event.id,
        },
        {
          actorId: parsed.actorId,
          now,
        },
      );
    }

    await tx.auditLog.create({
      data: {
        entityType: "PayrollDeclaration",
        entityId: declaration.id,
        action: config.auditAction,
        userId: parsed.actorId,
        organizationId: parsed.organizationId,
        changes: safeJson({
          before: { status: declaration.status },
          after: {
            status: nextStatus,
            evidenceId: createdEvidence.id,
            evidenceHash,
            sourceRegisterHash: parsed.sourceRegisterHash,
            businessEventId: eventResult.event.id,
            automationCapabilityStatus:
              authorityAdapterProof.automationCapabilityStatus,
            productionSubmissionSupported:
              authorityAdapterProof.productionSubmissionSupported,
            authorityAdapterKey: authorityAdapterProof.authorityAdapterKey,
            authorityAdapterReadiness:
              authorityAdapterProof.authorityAdapterReadiness,
            authorityAdapterProofHash:
              authorityAdapterProof.authorityAdapterProofHash,
            ...authorityAdapterRegistryMetadata(authorityAdapterProof),
            ...authorityLifecycle,
          },
        }),
      },
    });

    return {
      declaration: updatedDeclaration,
      evidence: createdEvidence,
      businessEventId: eventResult.event.id,
      idempotent: false,
      automationCapabilityStatus:
        authorityAdapterProof.automationCapabilityStatus,
      productionSubmissionSupported:
        authorityAdapterProof.productionSubmissionSupported,
    };
  });
}
