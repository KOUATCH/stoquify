import "server-only";

import { BusinessRuleError } from "@/services/_shared/action-errors";
import { hashBusinessPayload } from "@/services/events/business-event.service";

export const HRIS_PAYROLL_READINESS_EXPORT_KIND =
  "STOQUIFY_HRIS_PAYROLL_READINESS_EXPORT" as const;

export type HrisPayrollReadinessBlockerCode =
  | "HRIS_PAYROLL_IDENTITY_SOURCE_PROOF_MISSING"
  | "HRIS_PAYROLL_CONTRACT_APPROVAL_PROOF_MISSING"
  | "HRIS_PAYROLL_CONTRACT_DOCUMENT_PROOF_MISSING"
  | "HRIS_PAYROLL_COMPENSATION_APPROVAL_PROOF_MISSING"
  | "HRIS_PAYROLL_PAYMENT_DESTINATION_PROOF_MISSING"
  | "HRIS_PAYROLL_ATTENDANCE_CERTIFICATION_PROOF_MISSING";

export type HrisPayrollReadinessBlocker = {
  code: HrisPayrollReadinessBlockerCode;
  message: string;
  employeeId: string;
  employeeDisplayName: string;
  sourceId?: string | null;
};

export type HrisPayrollReadinessEmployeeSource = {
  employeeId: string;
  employeeDisplayName: string;
  employeeMetadata: unknown;
  contract: {
    id: string;
    baseSalary: string;
    currency: string;
    effectiveFrom: string;
    effectiveTo: string | null;
    signedDocumentHash: string | null;
    activatedBusinessEventId: string | null;
    metadata: unknown;
  } | null;
  compensationAssignments: Array<{
    id: string;
    rubriqueId: string;
    amount: string | null;
    rateBps: number | null;
    quantity: string | null;
    currency: string;
    effectiveFrom: string;
    effectiveTo: string | null;
    evidenceDocumentHash: string | null;
    approvalBusinessEventId: string | null;
    metadata: unknown;
  }>;
  paymentDestinationHash: string | null;
  paymentDestinationRequest: {
    id: string;
    status: string;
    paymentDestinationHash: string;
    evidenceDocumentHash: string;
    approvalEvidenceHash: string | null;
    requestBusinessEventId: string | null;
    approvalBusinessEventId: string | null;
    appliedBusinessEventId: string | null;
    requestedById: string;
    approvedById: string | null;
    appliedById: string | null;
    appliedAt: string | null;
  } | null;
  attendance: {
    snapshotId: string | null;
    sourceHash: string | null;
    certificationHash: string | null;
  };
};

export type HrisPayrollReadinessEmployeeProof = {
  employeeId: string;
  identitySourceHash: string | null;
  contractId: string | null;
  contractSourceHash: string | null;
  contractDocumentHash: string | null;
  contractActivationBusinessEventId: string | null;
  compensationAssignmentIds: string[];
  compensationSourceHashes: string[];
  paymentDestinationHash: string | null;
  paymentDestinationEvidenceHash: string | null;
  attendanceSnapshotId: string | null;
  attendanceSourceHash: string | null;
  attendanceCertificationHash: string | null;
  sourceSnapshotHash: string;
  proofHash: string;
};

export type HrisPayrollReadinessExport = {
  kind: typeof HRIS_PAYROLL_READINESS_EXPORT_KIND;
  version: 1;
  status: "READY" | "BLOCKED";
  organizationId: string;
  payrollPeriodId: string;
  periodStart: string;
  periodEnd: string;
  countryCode: string;
  employeeCount: number;
  blockerCount: number;
  blockerCodes: HrisPayrollReadinessBlockerCode[];
  blockers: HrisPayrollReadinessBlocker[];
  employeeProofs: HrisPayrollReadinessEmployeeProof[];
  sourceSetHash: string;
  exportHash: string;
};

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function proofHash(value: unknown) {
  return `sha256:${hashBusinessPayload(value)}`;
}

export type HrisContractReadinessProofSource = Pick<
  NonNullable<HrisPayrollReadinessEmployeeSource["contract"]>,
  "id" | "signedDocumentHash" | "activatedBusinessEventId" | "metadata"
>;

export function evaluateHrisContractReadinessProof(
  contract: HrisContractReadinessProofSource | null,
) {
  const contractMetadata = record(contract?.metadata);
  const approval = record(
    record(contractMetadata.hrisContractApproval).latest,
  );
  const documentEvidence = record(
    record(contractMetadata.hrisDocumentEvidence).current,
  );
  const approvalValid = Boolean(
    contract &&
    approval.status === "APPROVED" &&
    stringValue(approval.requestId) &&
    stringValue(approval.requestEvidenceHash) &&
    stringValue(approval.approvalEvidenceHash) &&
    stringValue(approval.activationBusinessEventId) ===
      contract.activatedBusinessEventId,
  );
  const documentValid = Boolean(
    contract &&
    contract.signedDocumentHash &&
    documentEvidence.status === "APPROVED" &&
    stringValue(documentEvidence.artifactHash) ===
      contract.signedDocumentHash &&
    stringValue(documentEvidence.malwareScanEvidenceHash) &&
    stringValue(documentEvidence.approvalEvidenceHash) &&
    stringValue(documentEvidence.approvalBusinessEventId),
  );
  return { approval, documentEvidence, approvalValid, documentValid };
}

function employeeProof(source: HrisPayrollReadinessEmployeeSource) {
  const blockers: HrisPayrollReadinessBlocker[] = [];
  const addBlocker = (
    code: HrisPayrollReadinessBlockerCode,
    message: string,
    sourceId?: string | null,
  ) => {
    blockers.push({
      code,
      message,
      employeeId: source.employeeId,
      employeeDisplayName: source.employeeDisplayName,
      sourceId,
    });
  };

  const employeeMetadata = record(source.employeeMetadata);
  const identity = record(employeeMetadata.hrSourceData);
  const identitySourceHash = stringValue(identity.sourceHash);
  if (
    !stringValue(identity.sourceSystem) ||
    !stringValue(identity.sourceRecordId) ||
    !identitySourceHash ||
    !stringValue(identity.updatedAt)
  ) {
    addBlocker(
      "HRIS_PAYROLL_IDENTITY_SOURCE_PROOF_MISSING",
      `Employee ${source.employeeDisplayName} has no complete HRIS identity source proof.`,
      source.employeeId,
    );
  }

  const contract = source.contract;
  const contractProof = evaluateHrisContractReadinessProof(contract);
  const contractApproval = contractProof.approval;
  const documentEvidence = contractProof.documentEvidence;
  const contractApprovalValid = contractProof.approvalValid;
  if (contract && !contractApprovalValid) {
    addBlocker(
      "HRIS_PAYROLL_CONTRACT_APPROVAL_PROOF_MISSING",
      `Employee ${source.employeeDisplayName} has no approved HRIS contract activation proof.`,
      contract.id,
    );
  }
  const contractDocumentValid = contractProof.documentValid;
  if (contract && !contractDocumentValid) {
    addBlocker(
      "HRIS_PAYROLL_CONTRACT_DOCUMENT_PROOF_MISSING",
      `Employee ${source.employeeDisplayName} has no approved, scanned contract document proof.`,
      contract.id,
    );
  }

  const contractSourcePayload = contract
    ? {
        id: contract.id,
        baseSalary: contract.baseSalary,
        currency: contract.currency,
        effectiveFrom: contract.effectiveFrom,
        effectiveTo: contract.effectiveTo,
        signedDocumentHash: contract.signedDocumentHash,
        activatedBusinessEventId: contract.activatedBusinessEventId,
        approval: contractApproval,
        documentEvidence,
      }
    : null;
  const contractSourceHash = contractSourcePayload
    ? proofHash(contractSourcePayload)
    : null;

  const compensationSourceHashes = source.compensationAssignments
    .map((assignment) => {
      const approval = record(
        record(assignment.metadata).hrisCompensationApproval,
      );
      const valid = Boolean(
        approval.status === "APPROVED" &&
        assignment.evidenceDocumentHash &&
        assignment.approvalBusinessEventId &&
        stringValue(approval.requestBusinessEventId) &&
        stringValue(approval.approvalEvidenceHash) &&
        stringValue(approval.approvalBusinessEventId) ===
          assignment.approvalBusinessEventId &&
        stringValue(approval.activeContractId) === contract?.id,
      );
      if (!valid) {
        addBlocker(
          "HRIS_PAYROLL_COMPENSATION_APPROVAL_PROOF_MISSING",
          `Employee ${source.employeeDisplayName} has an active compensation assignment without complete maker-checker proof.`,
          assignment.id,
        );
      }
      return proofHash({
        id: assignment.id,
        rubriqueId: assignment.rubriqueId,
        amount: assignment.amount,
        rateBps: assignment.rateBps,
        quantity: assignment.quantity,
        currency: assignment.currency,
        effectiveFrom: assignment.effectiveFrom,
        effectiveTo: assignment.effectiveTo,
        evidenceDocumentHash: assignment.evidenceDocumentHash,
        approvalBusinessEventId: assignment.approvalBusinessEventId,
        approval,
      });
    })
    .sort();

  const destinationEvidence = record(
    employeeMetadata.approvedPaymentDestinationEvidence,
  );
  const destinationRequest = source.paymentDestinationRequest;
  const requester = stringValue(destinationRequest?.requestedById);
  const approver = stringValue(destinationRequest?.approvedById);
  const applier = stringValue(destinationRequest?.appliedById);
  const destinationProofValid = Boolean(
    source.paymentDestinationHash &&
    destinationRequest &&
    destinationRequest.status === "APPLIED" &&
    destinationRequest.paymentDestinationHash ===
      source.paymentDestinationHash &&
    stringValue(destinationEvidence.requestId) === destinationRequest.id &&
    stringValue(destinationEvidence.paymentDestinationHash) ===
      source.paymentDestinationHash &&
    stringValue(destinationEvidence.evidenceDocumentHash) ===
      destinationRequest.evidenceDocumentHash &&
    stringValue(destinationEvidence.approvalEvidenceHash) ===
      destinationRequest.approvalEvidenceHash &&
    stringValue(destinationEvidence.requestBusinessEventId) ===
      destinationRequest.requestBusinessEventId &&
    stringValue(destinationEvidence.approvalBusinessEventId) ===
      destinationRequest.approvalBusinessEventId &&
    stringValue(destinationEvidence.appliedBusinessEventId) ===
      destinationRequest.appliedBusinessEventId &&
    requester &&
    approver &&
    applier &&
    requester !== approver &&
    requester !== applier &&
    approver !== applier &&
    stringValue(destinationRequest.appliedAt),
  );
  if (!destinationProofValid) {
    addBlocker(
      "HRIS_PAYROLL_PAYMENT_DESTINATION_PROOF_MISSING",
      `Employee ${source.employeeDisplayName} has no reconciled applied payment-destination proof.`,
      destinationRequest?.id ?? source.employeeId,
    );
  }
  const paymentDestinationEvidenceHash = destinationProofValid
    ? proofHash({
        destinationHash: source.paymentDestinationHash,
        metadata: destinationEvidence,
        request: destinationRequest,
      })
    : null;

  if (
    !source.attendance.snapshotId ||
    !source.attendance.sourceHash ||
    !source.attendance.certificationHash
  ) {
    addBlocker(
      "HRIS_PAYROLL_ATTENDANCE_CERTIFICATION_PROOF_MISSING",
      `Employee ${source.employeeDisplayName} has no complete certified attendance proof.`,
      source.attendance.snapshotId ?? source.employeeId,
    );
  }

  const sourceSnapshotPayload = {
    employeeId: source.employeeId,
    identity: {
      sourceSystem: stringValue(identity.sourceSystem),
      sourceRecordId: stringValue(identity.sourceRecordId),
      sourceHash: identitySourceHash,
      updatedAt: stringValue(identity.updatedAt),
    },
    contract: contractSourcePayload,
    compensationAssignments: [...source.compensationAssignments]
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((assignment) => ({
        id: assignment.id,
        sourceHash: compensationSourceHashes.find(
          (hash) =>
            hash ===
            proofHash({
              id: assignment.id,
              rubriqueId: assignment.rubriqueId,
              amount: assignment.amount,
              rateBps: assignment.rateBps,
              quantity: assignment.quantity,
              currency: assignment.currency,
              effectiveFrom: assignment.effectiveFrom,
              effectiveTo: assignment.effectiveTo,
              evidenceDocumentHash: assignment.evidenceDocumentHash,
              approvalBusinessEventId: assignment.approvalBusinessEventId,
              approval: record(
                record(assignment.metadata).hrisCompensationApproval,
              ),
            }),
        ),
      })),
    paymentDestinationHash: source.paymentDestinationHash,
    paymentDestinationEvidenceHash,
    attendance: source.attendance,
  };
  const sourceSnapshotHash = proofHash(sourceSnapshotPayload);
  const payload = {
    employeeId: source.employeeId,
    identitySourceHash,
    contractId: contract?.id ?? null,
    contractSourceHash,
    contractDocumentHash: contract?.signedDocumentHash ?? null,
    contractActivationBusinessEventId:
      contract?.activatedBusinessEventId ?? null,
    compensationAssignmentIds: source.compensationAssignments
      .map((assignment) => assignment.id)
      .sort(),
    compensationSourceHashes,
    paymentDestinationHash: source.paymentDestinationHash,
    paymentDestinationEvidenceHash,
    attendanceSnapshotId: source.attendance.snapshotId,
    attendanceSourceHash: source.attendance.sourceHash,
    attendanceCertificationHash: source.attendance.certificationHash,
    sourceSnapshotHash,
  };

  return {
    blockers,
    proof: {
      ...payload,
      proofHash: proofHash(payload),
    } satisfies HrisPayrollReadinessEmployeeProof,
  };
}

export function buildHrisPayrollReadinessExport(input: {
  organizationId: string;
  payrollPeriodId: string;
  periodStart: string;
  periodEnd: string;
  countryCode: string;
  employees: HrisPayrollReadinessEmployeeSource[];
}): HrisPayrollReadinessExport {
  const results = [...input.employees]
    .sort((left, right) => left.employeeId.localeCompare(right.employeeId))
    .map(employeeProof);
  const blockers = results
    .flatMap((result) => result.blockers)
    .sort((left, right) =>
      `${left.employeeId}:${left.code}:${left.sourceId ?? ""}`.localeCompare(
        `${right.employeeId}:${right.code}:${right.sourceId ?? ""}`,
      ),
    );
  const employeeProofs = results.map((result) => result.proof);
  const blockerCodes = Array.from(
    new Set(blockers.map((blocker) => blocker.code)),
  ).sort();
  const sourceSetHash = proofHash(
    employeeProofs.map((proof) => proof.sourceSnapshotHash),
  );
  const payload = {
    kind: HRIS_PAYROLL_READINESS_EXPORT_KIND,
    version: 1 as const,
    status: blockers.length > 0 ? ("BLOCKED" as const) : ("READY" as const),
    organizationId: input.organizationId,
    payrollPeriodId: input.payrollPeriodId,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    countryCode: input.countryCode,
    employeeCount: employeeProofs.length,
    blockerCount: blockers.length,
    blockerCodes,
    blockers,
    employeeProofs,
    sourceSetHash,
  };
  return { ...payload, exportHash: proofHash(payload) };
}

export function assertHrisPayrollReadinessExport(
  readinessExport: HrisPayrollReadinessExport,
) {
  const { exportHash, ...payload } = readinessExport;
  if (proofHash(payload) !== exportHash) {
    throw new BusinessRuleError(
      "HRIS payroll readiness export is stale or has been tampered with.",
    );
  }
  if (readinessExport.status !== "READY") {
    throw new BusinessRuleError(
      `HRIS payroll readiness is blocked (${readinessExport.blockerCodes.join(", ")}).`,
    );
  }
}

export function assertHrisPayrollEmployeeSourceCurrent(
  readinessExport: HrisPayrollReadinessExport,
  source: HrisPayrollReadinessEmployeeSource,
) {
  assertHrisPayrollReadinessExport(readinessExport);
  const current = employeeProof(source);
  if (current.blockers.length > 0) {
    throw new BusinessRuleError(
      `HRIS payroll source proof is no longer ready (${current.blockers
        .map((blocker) => blocker.code)
        .join(", ")}).`,
    );
  }
  const certified = readinessExport.employeeProofs.find(
    (proof) => proof.employeeId === source.employeeId,
  );
  if (!certified || certified.proofHash !== current.proof.proofHash) {
    throw new BusinessRuleError(
      `HRIS payroll source proof is stale for employee ${source.employeeId}.`,
    );
  }
  return certified;
}
