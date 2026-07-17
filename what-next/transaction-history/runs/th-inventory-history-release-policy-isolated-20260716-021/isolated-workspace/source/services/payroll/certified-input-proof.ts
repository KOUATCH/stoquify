import { BusinessRuleError } from "@/services/_shared/action-errors";

export type PayrollCertifiedInputProof = {
  hrisPayrollReadinessHash: string;
  payrollInputReadinessHash: string;
  payrollEngineInputHashes: string[];
  payrollEngineInputSnapshotHash: string;
};

function metadataRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function nonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function nonEmptyStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value.map(nonEmptyString).filter((item): item is string => item !== null),
    ),
  ).sort();
}

export function payrollCertifiedInputProofFromMetadata(
  metadata: unknown,
): PayrollCertifiedInputProof | null {
  const record = metadataRecord(metadata);
  const hrisPayrollReadinessHash = nonEmptyString(
    record.hrisPayrollReadinessHash,
  );
  const payrollInputReadinessHash = nonEmptyString(
    record.payrollInputReadinessHash,
  );
  const payrollEngineInputHashes = nonEmptyStringArray(
    record.payrollEngineInputHashes,
  );
  const payrollEngineInputSnapshotHash = nonEmptyString(
    record.payrollEngineInputSnapshotHash,
  );

  if (
    !hrisPayrollReadinessHash ||
    !payrollInputReadinessHash ||
    payrollEngineInputHashes.length === 0 ||
    !payrollEngineInputSnapshotHash
  ) {
    return null;
  }

  return {
    hrisPayrollReadinessHash,
    payrollInputReadinessHash,
    payrollEngineInputHashes,
    payrollEngineInputSnapshotHash,
  };
}

export function assertPayrollCertifiedInputProofMetadata(
  metadata: unknown,
): PayrollCertifiedInputProof {
  const proof = payrollCertifiedInputProofFromMetadata(metadata);
  if (!proof) {
    throw new BusinessRuleError(
      "Payroll run is missing explicit certified HRIS input readiness or payroll engine input proof and cannot proceed.",
    );
  }
  return proof;
}
