import "server-only";

import { PaymentMethod } from "@prisma/client";

import { hashBusinessPayload } from "@/services/events/business-event.service";

export const PAYROLL_ADAPTER_REGISTRY_VERSION = 1;

export type PayrollAuthorityAdapterReadiness =
  | "MANUAL_EVIDENCE"
  | "REQUIRES_EXPERT_REVIEW"
  | "SUPPORTED"
  | "SUPPORTED_CERTIFIED";

export type PayrollPaymentAdapterStatus =
  | "MANUAL_PROVIDER_SETTLEMENT_REQUIRED"
  | "REQUIRES_EXPERT_REVIEW"
  | "SUPPORTED"
  | "SUPPORTED_CERTIFIED";

type AuthorityAdapterContractInput = {
  authorityChannel: string;
  authorityEnvironment: string;
  requestedAdapterKey?: string | null;
  requestedReadiness?: PayrollAuthorityAdapterReadiness | null;
  payloadMappingHash?: string | null;
  responseMappingHash?: string | null;
  authorityStatusCodeMapHash?: string | null;
  rejectionMappingHash?: string | null;
  amendmentMappingHash?: string | null;
  paymentDueMappingHash?: string | null;
  credentialProofHash?: string | null;
  credentialRotationProofHash?: string | null;
  credentialScopeProofHash?: string | null;
  idempotencyReplayFixtureHash?: string | null;
  duplicateResponseFixtureHash?: string | null;
  duplicateTerminalResponseReplayFixtureHash?: string | null;
  outageRunbookHash?: string | null;
  retryPolicyFixtureHash?: string | null;
  deadLetterTriageRunbookHash?: string | null;
  auditTrailFixtureHash?: string | null;
  redactionFixtureHash?: string | null;
  closeImpactRuleHash?: string | null;
  legalReviewHash?: string | null;
  adapterRequestHash?: string | null;
  adapterResponseReceiptHash?: string | null;
  adapterIdempotencyKey?: string | null;
  adapterAttempt?: number | null;
  certificationHarnessHash?: string | null;
};

type PaymentProviderAdapterContractInput = {
  method: PaymentMethod;
  bankFileHash?: string | null;
  requestedAdapterKey?: string | null;
  requestedStatus?: PayrollPaymentAdapterStatus | string | null;
  providerCredentialProofHash?: string | null;
  providerPayloadMappingHash?: string | null;
  providerResponseMappingHash?: string | null;
  providerAdapterRequestHash?: string | null;
  providerAdapterResponseHash?: string | null;
  providerSettlementReceiptHash?: string | null;
  providerIdempotencyKey?: string | null;
  providerAttempt?: number | null;
  providerCertificationHarnessHash?: string | null;
};

const MANUAL_AUTHORITY_ENVIRONMENTS = new Set([
  "MANUAL_PORTAL",
  "MANUAL_EVIDENCE",
  "AUTHORITY_PORTAL",
]);

const FILE_BACKED_PAYMENT_METHODS = new Set<PaymentMethod>([
  PaymentMethod.BANK_TRANSFER,
  PaymentMethod.MOBILE_MONEY,
]);

const PAYMENT_METHOD_ADAPTER_SUFFIX: Partial<Record<PaymentMethod, string>> = {
  [PaymentMethod.BANK_TRANSFER]: "MANUAL_DISBURSEMENT_FILE",
  [PaymentMethod.MOBILE_MONEY]: "MANUAL_DISBURSEMENT_FILE",
  [PaymentMethod.CHEQUE]: "MANUAL_CHEQUE_REGISTER",
  [PaymentMethod.CASH]: "MANUAL_CASH_DISBURSEMENT",
};

type AdapterCertificationRequirement = {
  code: string;
  label: string;
  present: boolean;
};

const PAYMENT_ADAPTER_STATUSES = new Set<PayrollPaymentAdapterStatus>([
  "MANUAL_PROVIDER_SETTLEMENT_REQUIRED",
  "REQUIRES_EXPERT_REVIEW",
  "SUPPORTED",
  "SUPPORTED_CERTIFIED",
]);

function hasProof(value: string | null | undefined) {
  return typeof value === "string" && value.trim().length > 0;
}

function missingRequirementLabels(requirements: AdapterCertificationRequirement[]) {
  return requirements
    .filter((requirement) => !requirement.present)
    .map((requirement) => requirement.label);
}

function missingRequirementCodes(requirements: AdapterCertificationRequirement[]) {
  return requirements
    .filter((requirement) => !requirement.present)
    .map((requirement) => requirement.code);
}

function authorityCertificationRequirements(
  input: AuthorityAdapterContractInput,
): AdapterCertificationRequirement[] {
  return [
    {
      code: "AUTHORITY_PAYLOAD_MAPPING_REVIEWED",
      label: "reviewed authority payload mapping",
      present: hasProof(input.payloadMappingHash),
    },
    {
      code: "AUTHORITY_RESPONSE_MAPPING_REVIEWED",
      label: "reviewed authority response mapping",
      present: hasProof(input.responseMappingHash),
    },
    {
      code: "AUTHORITY_STATUS_CODE_MAP_REVIEWED",
      label: "reviewed authority status code map",
      present: hasProof(input.authorityStatusCodeMapHash),
    },
    {
      code: "AUTHORITY_REJECTION_MAPPING_REVIEWED",
      label: "reviewed authority rejection mapping",
      present: hasProof(input.rejectionMappingHash),
    },
    {
      code: "AUTHORITY_AMENDMENT_MAPPING_REVIEWED",
      label: "reviewed authority amendment mapping",
      present: hasProof(input.amendmentMappingHash),
    },
    {
      code: "AUTHORITY_PAYMENT_DUE_MAPPING_REVIEWED",
      label: "reviewed authority payment-due mapping",
      present: hasProof(input.paymentDueMappingHash),
    },
    {
      code: "AUTHORITY_CREDENTIAL_PROOF_PRESENT",
      label: "credential proof reference",
      present: hasProof(input.credentialProofHash),
    },
    {
      code: "AUTHORITY_CREDENTIAL_ROTATION_REVIEWED",
      label: "credential rotation proof",
      present: hasProof(input.credentialRotationProofHash),
    },
    {
      code: "AUTHORITY_CREDENTIAL_SCOPE_REVIEWED",
      label: "least privilege credential scope proof",
      present: hasProof(input.credentialScopeProofHash),
    },
    {
      code: "AUTHORITY_REQUEST_HASH_PRESENT",
      label: "sandbox or live adapter request hash",
      present: hasProof(input.adapterRequestHash),
    },
    {
      code: "AUTHORITY_RESPONSE_RECEIPT_PRESENT",
      label: "authority response or receipt hash",
      present: hasProof(input.adapterResponseReceiptHash),
    },
    {
      code: "AUTHORITY_IDEMPOTENCY_KEY_PRESENT",
      label: "adapter idempotency key",
      present: hasProof(input.adapterIdempotencyKey),
    },
    {
      code: "AUTHORITY_IDEMPOTENCY_REPLAY_REVIEWED",
      label: "idempotent replay fixture",
      present: hasProof(input.idempotencyReplayFixtureHash),
    },
    {
      code: "AUTHORITY_DUPLICATE_RESPONSE_REVIEWED",
      label: "duplicate authority response fixture",
      present: hasProof(input.duplicateResponseFixtureHash),
    },
    {
      code: "AUTHORITY_DUPLICATE_TERMINAL_RESPONSE_REPLAY_REVIEWED",
      label: "duplicate terminal authority response replay fixture",
      present: hasProof(input.duplicateTerminalResponseReplayFixtureHash),
    },
    {
      code: "AUTHORITY_OUTAGE_RUNBOOK_PRESENT",
      label: "authority outage runbook",
      present: hasProof(input.outageRunbookHash),
    },
    {
      code: "AUTHORITY_RETRY_POLICY_REVIEWED",
      label: "retry policy fixture",
      present: hasProof(input.retryPolicyFixtureHash),
    },
    {
      code: "AUTHORITY_DEAD_LETTER_TRIAGE_REVIEWED",
      label: "dead-letter triage runbook",
      present: hasProof(input.deadLetterTriageRunbookHash),
    },
    {
      code: "AUTHORITY_AUDIT_TRAIL_REVIEWED",
      label: "audit trail fixture",
      present: hasProof(input.auditTrailFixtureHash),
    },
    {
      code: "AUTHORITY_REDACTION_REVIEWED",
      label: "redaction fixture",
      present: hasProof(input.redactionFixtureHash),
    },
    {
      code: "AUTHORITY_CLOSE_IMPACT_REVIEWED",
      label: "close impact rule proof",
      present: hasProof(input.closeImpactRuleHash),
    },
    {
      code: "AUTHORITY_LEGAL_REVIEW_PRESENT",
      label: "legal or regulator review proof",
      present: hasProof(input.legalReviewHash),
    },
    {
      code: "AUTHORITY_CERTIFICATION_HARNESS_COMPLETE",
      label: "adapter certification harness certificate",
      present: hasProof(input.certificationHarnessHash),
    },
  ];
}

function normalizePaymentAdapterStatus(
  value: PaymentProviderAdapterContractInput["requestedStatus"],
): PayrollPaymentAdapterStatus {
  if (typeof value === "string") {
    const normalized = value.trim().toUpperCase();
    if (PAYMENT_ADAPTER_STATUSES.has(normalized as PayrollPaymentAdapterStatus)) {
      return normalized as PayrollPaymentAdapterStatus;
    }
  }
  return "MANUAL_PROVIDER_SETTLEMENT_REQUIRED";
}

function paymentCertificationRequirements(
  input: PaymentProviderAdapterContractInput,
  disbursementFileRequired: boolean,
): AdapterCertificationRequirement[] {
  return [
    {
      code: "PAYMENT_DISBURSEMENT_FILE_PRESENT",
      label: "payment disbursement file hash",
      present: !disbursementFileRequired || hasProof(input.bankFileHash),
    },
    {
      code: "PROVIDER_CREDENTIAL_PROOF_PRESENT",
      label: "provider credential proof reference",
      present: hasProof(input.providerCredentialProofHash),
    },
    {
      code: "PROVIDER_PAYLOAD_MAPPING_REVIEWED",
      label: "reviewed provider payload mapping",
      present: hasProof(input.providerPayloadMappingHash),
    },
    {
      code: "PROVIDER_RESPONSE_MAPPING_REVIEWED",
      label: "reviewed provider response or settlement mapping",
      present: hasProof(input.providerResponseMappingHash),
    },
    {
      code: "PROVIDER_REQUEST_HASH_PRESENT",
      label: "provider request hash",
      present: hasProof(input.providerAdapterRequestHash),
    },
    {
      code: "PROVIDER_RESPONSE_HASH_PRESENT",
      label: "provider response hash",
      present: hasProof(input.providerAdapterResponseHash),
    },
    {
      code: "PROVIDER_SETTLEMENT_RECEIPT_PRESENT",
      label: "provider settlement receipt hash",
      present: hasProof(input.providerSettlementReceiptHash),
    },
    {
      code: "PROVIDER_IDEMPOTENCY_KEY_PRESENT",
      label: "provider idempotency key",
      present: hasProof(input.providerIdempotencyKey),
    },
    {
      code: "PROVIDER_CERTIFICATION_HARNESS_COMPLETE",
      label: "provider certification harness certificate",
      present: hasProof(input.providerCertificationHarnessHash),
    },
  ];
}

function prefixedHash(value: unknown) {
  return `sha256:${hashBusinessPayload(value)}`;
}

export function normalizePayrollAdapterKey(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_.:-]+/g, "_");
}

function defaultPaymentProviderAdapterKey(method: PaymentMethod) {
  return normalizePayrollAdapterKey(
    `${method}:${PAYMENT_METHOD_ADAPTER_SUFFIX[method] ?? "MANUAL_PROVIDER_EVIDENCE"}`,
  );
}

export function resolvePayrollAuthorityAdapterContract(
  input: AuthorityAdapterContractInput,
) {
  const authorityEnvironment = input.authorityEnvironment.trim().toUpperCase();
  const manualAuthorityWorkflowOnly =
    MANUAL_AUTHORITY_ENVIRONMENTS.has(authorityEnvironment);
  const authorityAdapterReadiness =
    input.requestedReadiness ??
    (manualAuthorityWorkflowOnly
      ? "MANUAL_EVIDENCE"
      : "REQUIRES_EXPERT_REVIEW");
  const authorityAdapterKey = normalizePayrollAdapterKey(
    input.requestedAdapterKey ?? `${input.authorityChannel}:MANUAL_CAPTURE`,
  );
  const certificationRequirements = authorityCertificationRequirements(input);
  const certificationBlockers = missingRequirementCodes(certificationRequirements);
  const certificationProofComplete = certificationBlockers.length === 0;
  const productionSubmissionSupported =
    authorityAdapterReadiness === "SUPPORTED_CERTIFIED" &&
    !manualAuthorityWorkflowOnly &&
    certificationProofComplete;
  const registryDecision = productionSubmissionSupported
    ? "READY_REQUIRES_LIVE_ADAPTER_EXECUTION"
    : manualAuthorityWorkflowOnly
      ? "MANUAL_CAPTURE_ONLY"
      : authorityAdapterReadiness === "SUPPORTED_CERTIFIED"
        ? "BLOCKED_CERTIFICATION_PROOF_INCOMPLETE"
        : authorityAdapterReadiness === "SUPPORTED"
          ? "SUPPORTED_REQUIRES_CERTIFICATION_SIGNOFF"
          : "BLOCKED_REQUIRES_REVIEWED_AUTHORITY_ADAPTER";
  const requiredForCertification = productionSubmissionSupported
    ? []
    : missingRequirementLabels(certificationRequirements);

  const contract = {
    kind: "AQSTOQFLOW_PAYROLL_AUTHORITY_ADAPTER_CONTRACT",
    version: PAYROLL_ADAPTER_REGISTRY_VERSION,
    authorityChannel: input.authorityChannel,
    authorityEnvironment,
    authorityAdapterKey,
    authorityAdapterReadiness,
    manualAuthorityWorkflowOnly,
    productionSubmissionSupported,
    registryDecision,
    certificationProofComplete,
    certificationBlockers,
    certificationRequirements: certificationRequirements.map(
      ({ code, label, present }) => ({ code, label, present }),
    ),
    payloadMappingHash: input.payloadMappingHash ?? null,
    responseMappingHash: input.responseMappingHash ?? null,
    authorityStatusCodeMapHash: input.authorityStatusCodeMapHash ?? null,
    rejectionMappingHash: input.rejectionMappingHash ?? null,
    amendmentMappingHash: input.amendmentMappingHash ?? null,
    paymentDueMappingHash: input.paymentDueMappingHash ?? null,
    credentialProofHash: input.credentialProofHash ?? null,
    credentialRotationProofHash: input.credentialRotationProofHash ?? null,
    credentialScopeProofHash: input.credentialScopeProofHash ?? null,
    adapterRequestHash: input.adapterRequestHash ?? null,
    adapterResponseReceiptHash: input.adapterResponseReceiptHash ?? null,
    adapterIdempotencyKey: input.adapterIdempotencyKey ?? null,
    adapterAttempt: input.adapterAttempt ?? 1,
    idempotencyReplayFixtureHash: input.idempotencyReplayFixtureHash ?? null,
    duplicateResponseFixtureHash: input.duplicateResponseFixtureHash ?? null,
    duplicateTerminalResponseReplayFixtureHash:
      input.duplicateTerminalResponseReplayFixtureHash ?? null,
    outageRunbookHash: input.outageRunbookHash ?? null,
    retryPolicyFixtureHash: input.retryPolicyFixtureHash ?? null,
    deadLetterTriageRunbookHash: input.deadLetterTriageRunbookHash ?? null,
    auditTrailFixtureHash: input.auditTrailFixtureHash ?? null,
    redactionFixtureHash: input.redactionFixtureHash ?? null,
    closeImpactRuleHash: input.closeImpactRuleHash ?? null,
    legalReviewHash: input.legalReviewHash ?? null,
    certificationHarnessHash: input.certificationHarnessHash ?? null,
    retryPolicy: {
      automatedRetriesEnabled: productionSubmissionSupported,
      idempotencyRequired: true,
      maxAttempts: productionSubmissionSupported ? 5 : 1,
      duplicateAuthorityResponseAction: "reuse-existing-declaration-evidence",
    },
    requiredForCertification,
    redactionPolicy:
      "No raw salary, employee identity, credential secret, or authority payload is logged by the adapter registry proof.",
  };
  const authorityAdapterContractHash = prefixedHash(contract);

  return {
    authorityAdapterKey,
    authorityAdapterReadiness,
    authorityAdapterContractHash,
    certificationHarnessHash: input.certificationHarnessHash ?? null,
    automationCapabilityStatus: productionSubmissionSupported
      ? "PRODUCTION_ADAPTER_READY"
      : "AUTOMATION_BLOCKED",
    productionSubmissionSupported,
    manualAuthorityWorkflowOnly,
    registryDecision,
    certificationProofComplete,
    certificationBlockers,
    requiredForCertification,
    contract,
  };
}
export function resolvePayrollPaymentProviderAdapterContract(
  input: PaymentProviderAdapterContractInput,
) {
  const disbursementFileRequired = FILE_BACKED_PAYMENT_METHODS.has(
    input.method,
  );
  const paymentProviderAdapterKey = normalizePayrollAdapterKey(
    input.requestedAdapterKey ?? defaultPaymentProviderAdapterKey(input.method),
  );
  const requestedStatus = normalizePaymentAdapterStatus(input.requestedStatus);
  const certificationRequirements = paymentCertificationRequirements(
    input,
    disbursementFileRequired,
  );
  const certificationBlockers = missingRequirementCodes(certificationRequirements);
  const certificationProofComplete = certificationBlockers.length === 0;
  const productionPaymentAutomationSupported =
    requestedStatus === "SUPPORTED_CERTIFIED" && certificationProofComplete;
  const paymentAdapterStatus: PayrollPaymentAdapterStatus =
    productionPaymentAutomationSupported
      ? "SUPPORTED_CERTIFIED"
      : requestedStatus === "SUPPORTED_CERTIFIED"
        ? "REQUIRES_EXPERT_REVIEW"
        : requestedStatus;
  const providerSettlementProofRequired = true;
  const acceptedSettlementEvidence = [
    "provider event id",
    "statement line id",
    "statement file hash",
    "approved match record",
    "provider settlement receipt hash",
  ];
  const registryDecision = productionPaymentAutomationSupported
    ? "PRODUCTION_PROVIDER_ADAPTER_READY"
    : requestedStatus === "SUPPORTED_CERTIFIED"
      ? "BLOCKED_PROVIDER_ADAPTER_CERTIFICATION_INCOMPLETE"
      : requestedStatus === "SUPPORTED"
        ? "SUPPORTED_REQUIRES_PROVIDER_CERTIFICATION_SIGNOFF"
        : "MANUAL_PROVIDER_SETTLEMENT_REQUIRED";
  const requiredForCertification = productionPaymentAutomationSupported
    ? []
    : missingRequirementLabels(certificationRequirements);

  const contract = {
    kind: "AQSTOQFLOW_PAYROLL_PAYMENT_PROVIDER_ADAPTER_CONTRACT",
    version: PAYROLL_ADAPTER_REGISTRY_VERSION,
    method: input.method,
    paymentProviderAdapterKey,
    paymentAdapterStatus,
    productionPaymentAutomationSupported,
    registryDecision,
    certificationProofComplete,
    certificationBlockers,
    certificationRequirements: certificationRequirements.map(
      ({ code, label, present }) => ({ code, label, present }),
    ),
    disbursementFileRequired,
    paymentDisbursementFileHash: input.bankFileHash ?? null,
    providerCredentialProofHash: input.providerCredentialProofHash ?? null,
    providerPayloadMappingHash: input.providerPayloadMappingHash ?? null,
    providerResponseMappingHash: input.providerResponseMappingHash ?? null,
    providerAdapterRequestHash: input.providerAdapterRequestHash ?? null,
    providerAdapterResponseHash: input.providerAdapterResponseHash ?? null,
    providerSettlementReceiptHash: input.providerSettlementReceiptHash ?? null,
    providerIdempotencyKey: input.providerIdempotencyKey ?? null,
    providerAttempt: input.providerAttempt ?? 1,
    providerCertificationHarnessHash:
      input.providerCertificationHarnessHash ?? null,
    providerSettlementProofRequired,
    acceptedSettlementEvidence,
    retryPolicy: {
      automatedRetriesEnabled: productionPaymentAutomationSupported,
      manualReplayRequiresIdempotency: true,
      idempotencyRequired: true,
      maxAttempts: productionPaymentAutomationSupported ? 5 : 1,
      duplicateProviderResponseAction: "reuse-existing-payment-transaction",
    },
    redactionPolicy:
      "No raw employee payment destination, salary detail, credential secret, or provider payload is logged by the adapter registry proof.",
    requiredForCertification,
  };
  const paymentProviderAdapterContractHash = prefixedHash(contract);

  return {
    paymentAdapterRegistryVersion: PAYROLL_ADAPTER_REGISTRY_VERSION,
    paymentProviderAdapterContractHash,
    paymentAdapterStatus,
    providerCertificationHarnessHash:
      input.providerCertificationHarnessHash ?? null,
    paymentProviderAdapterKey,
    paymentDisbursementFileHash: input.bankFileHash ?? null,
    providerCredentialProofHash: input.providerCredentialProofHash ?? null,
    providerPayloadMappingHash: input.providerPayloadMappingHash ?? null,
    providerResponseMappingHash: input.providerResponseMappingHash ?? null,
    providerAdapterRequestHash: input.providerAdapterRequestHash ?? null,
    providerAdapterResponseHash: input.providerAdapterResponseHash ?? null,
    providerSettlementReceiptHash: input.providerSettlementReceiptHash ?? null,
    providerIdempotencyKey: input.providerIdempotencyKey ?? null,
    providerAttempt: input.providerAttempt ?? 1,
    providerSettlementProofRequired,
    productionPaymentAutomationSupported,
    disbursementFileRequired,
    acceptedSettlementEvidence,
    registryDecision,
    certificationProofComplete,
    certificationBlockers,
    requiredForCertification,
    contract,
  };
}
export function resolvePayrollAuthorityLifecycleContract(input: {
  transition: string;
  previousStatus: string;
  nextStatus: string | null;
  authorityStatus: string;
  sourceRegisterHash?: string | null;
  authorityAdapterProofHash: string;
  authorityAdapterContractHash: string;
  authorityAdapterRegistryDecision: string;
}) {
  const normalizedTransition = input.transition.toString().toUpperCase();
  const normalizedAuthorityStatus = input.authorityStatus.trim().toUpperCase();
  const lifecycleStatus =
    normalizedTransition === "REJECT" ||
    normalizedAuthorityStatus.includes("REJECT")
      ? "REJECTED_REQUIRES_CORRECTION"
      : normalizedTransition === "AMEND"
        ? "AMENDMENT_EVIDENCE_RECORDED"
        : normalizedTransition === "RECONCILE"
          ? "RECONCILED_WITH_AUTHORITY_EVIDENCE"
          : normalizedTransition === "MARK_PAID"
            ? "STATUTORY_PAYMENT_EVIDENCE_RECORDED"
            : normalizedTransition === "MARK_PAYMENT_DUE"
              ? "PAYMENT_DUE_CONFIRMED"
              : normalizedTransition === "ACCEPT"
                ? "ACCEPTED_BY_AUTHORITY"
                : "SUBMISSION_EVIDENCE_RECORDED";
  const closeImpact =
    lifecycleStatus === "REJECTED_REQUIRES_CORRECTION"
      ? "BLOCK_CLOSE_UNTIL_CORRECTED"
      : input.sourceRegisterHash
        ? "CLOSE_EVIDENCE_STALE_ON_CHANGE"
        : "BLOCK_CLOSE_UNTIL_REGISTER_PROOF";
  const nextAction =
    lifecycleStatus === "REJECTED_REQUIRES_CORRECTION"
      ? "Record correction or amendment evidence before certification."
      : lifecycleStatus === "ACCEPTED_BY_AUTHORITY"
        ? "Record statutory payment due and payment evidence."
        : lifecycleStatus === "PAYMENT_DUE_CONFIRMED"
          ? "Record payment evidence with source register proof."
          : lifecycleStatus === "STATUTORY_PAYMENT_EVIDENCE_RECORDED"
            ? "Reconcile authority payment evidence."
            : lifecycleStatus === "RECONCILED_WITH_AUTHORITY_EVIDENCE"
              ? "Archive declaration evidence when close certification is ready."
              : "Keep manual authority evidence attached until a certified adapter exists.";

  const contract = {
    kind: "AQSTOQFLOW_PAYROLL_AUTHORITY_LIFECYCLE_CONTRACT",
    version: PAYROLL_ADAPTER_REGISTRY_VERSION,
    transition: normalizedTransition,
    previousStatus: input.previousStatus,
    nextStatus: input.nextStatus,
    authorityStatus: normalizedAuthorityStatus,
    lifecycleStatus,
    closeImpact,
    nextAction,
    sourceRegisterHash: input.sourceRegisterHash ?? null,
    authorityAdapterProofHash: input.authorityAdapterProofHash,
    authorityAdapterContractHash: input.authorityAdapterContractHash,
    authorityAdapterRegistryDecision: input.authorityAdapterRegistryDecision,
    redactionPolicy:
      "Authority lifecycle proof excludes raw salary, employee identity, credentials, and raw authority payloads.",
  };

  return {
    authorityLifecycleContractHash: prefixedHash(contract),
    authorityLifecycleStatus: lifecycleStatus,
    authorityLifecycleCloseImpact: closeImpact,
    authorityLifecycleNextAction: nextAction,
    authorityLifecycleContract: contract,
  };
}

export function resolvePayrollPaymentSettlementLifecycleContract(input: {
  settlementStatus: "settled" | "partially_settled";
  sourceRegisterHash?: string | null;
  inputEvidenceHash: string;
  paymentAdapterProofHash: string;
  paymentProviderAdapterContractHash: string;
  paymentProviderAdapterKey: string;
  providerEvidence: {
    providerAccountId?: string | null;
    providerTransactionId?: string | null;
    providerReference?: string | null;
    providerEventId?: string | null;
    statementLineId?: string | null;
    statementFileHash?: string | null;
    matchRecordId?: string | null;
    reconciliationRunId?: string | null;
  };
}) {
  const hasProviderEvidence = Boolean(
    input.providerEvidence.providerEventId ||
    input.providerEvidence.statementLineId ||
    input.providerEvidence.statementFileHash ||
    input.providerEvidence.matchRecordId,
  );
  const lifecycleStatus =
    input.settlementStatus === "settled"
      ? "SETTLED_WITH_PROVIDER_EVIDENCE"
      : "PARTIALLY_SETTLED_REQUIRES_FOLLOW_UP";
  const closeImpact = input.sourceRegisterHash
    ? "CLOSE_EVIDENCE_STALE_ON_CHANGE"
    : "BLOCK_CLOSE_UNTIL_REGISTER_PROOF";
  const nextAction =
    input.settlementStatus === "settled"
      ? "No settlement action required unless provider evidence is corrected."
      : "Investigate residual amount and attach follow-up provider settlement evidence.";

  const contract = {
    kind: "AQSTOQFLOW_PAYROLL_PAYMENT_SETTLEMENT_LIFECYCLE_CONTRACT",
    version: PAYROLL_ADAPTER_REGISTRY_VERSION,
    settlementStatus: input.settlementStatus,
    lifecycleStatus,
    closeImpact,
    nextAction,
    sourceRegisterHash: input.sourceRegisterHash ?? null,
    inputEvidenceHash: input.inputEvidenceHash,
    paymentAdapterProofHash: input.paymentAdapterProofHash,
    paymentProviderAdapterContractHash:
      input.paymentProviderAdapterContractHash,
    paymentProviderAdapterKey: input.paymentProviderAdapterKey,
    providerEvidencePresent: hasProviderEvidence,
    providerEvidence: {
      providerAccountId: input.providerEvidence.providerAccountId ?? null,
      providerTransactionId:
        input.providerEvidence.providerTransactionId ?? null,
      providerReference: input.providerEvidence.providerReference ?? null,
      providerEventId: input.providerEvidence.providerEventId ?? null,
      statementLineId: input.providerEvidence.statementLineId ?? null,
      statementFileHash: input.providerEvidence.statementFileHash ?? null,
      matchRecordId: input.providerEvidence.matchRecordId ?? null,
      reconciliationRunId: input.providerEvidence.reconciliationRunId ?? null,
    },
    redactionPolicy:
      "Provider lifecycle proof excludes raw salary, employee payment destination details, credentials, and raw provider payloads.",
  };

  return {
    providerSettlementLifecycleContractHash: prefixedHash(contract),
    providerSettlementLifecycleStatus: lifecycleStatus,
    providerSettlementLifecycleCloseImpact: closeImpact,
    providerSettlementLifecycleNextAction: nextAction,
    providerSettlementLifecycleContract: contract,
  };
}
