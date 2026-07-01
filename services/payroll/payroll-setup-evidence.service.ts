import { Prisma } from "@prisma/client";

import { db } from "../../prisma/db";
import {
  type PayrollProofBackfillGapCounts,
  type PayrollSeedBackfillDryRunInput,
} from "./payroll-seed-backfill-plan.service";
import { redactPayrollSetupRef } from "./payroll-setup-readiness.service";

type DbClient = typeof db | Prisma.TransactionClient;

type AuditLogRow = {
  id: string;
  entityId: string;
  entityType: string;
  action: string;
  changes: Prisma.JsonValue | null;
  createdAt: Date;
};

export type PayrollSetupEvidenceStatus =
  | "NO_EVIDENCE"
  | "EXECUTION_SIGNOFF_REQUIRED"
  | "AWAITING_RECONCILIATION_CERTIFICATE"
  | "READY_FOR_CLOSE_RECHECK"
  | "PROOF_GAPS_REMAIN"
  | "BLOCKED_BY_SETUP"
  | "BLOCKED_BY_SOURCE_CERTIFICATE";

export type PayrollSetupCertificateSummary = {
  kind: "execution" | "reconciliation";
  auditLogRef: string;
  ledgerKey: string | null;
  recordedAt: string;
  status: string | null;
  certificateHash: string | null;
  dryRunEvidenceHash: string | null;
  approvalBundleHashPresent: boolean | null;
  missingSignoffCount: number | null;
  executionEnabled: boolean | null;
  mutationAttempted: boolean | null;
  totalBlockingGaps: number | null;
  gapCounts: Partial<PayrollProofBackfillGapCounts>;
  dataTrustProofGateStatus: "READY" | "BLOCKED" | null;
  dataTrustBlockerIds: string[];
  sourceCertificateValid: boolean | null;
  postMigrationProofGapsCleared: boolean | null;
};

export type PayrollSetupEvidenceReadModel = {
  generatedAt: string;
  organizationRef: string;
  actorRef: string | null;
  evidenceSource: "audit_logs";
  status: PayrollSetupEvidenceStatus;
  latestExecutionCertificate: PayrollSetupCertificateSummary | null;
  latestReconciliationCertificate: PayrollSetupCertificateSummary | null;
  executionCertificates: PayrollSetupCertificateSummary[];
  reconciliationCertificates: PayrollSetupCertificateSummary[];
  totals: {
    executionCertificateCount: number;
    reconciliationCertificateCount: number;
  };
  redaction: {
    policy: "payroll-setup-evidence-read-model-redaction";
    rawAuditLogIdsIncluded: false;
    rawPersonDataIncluded: false;
    rawPaymentDestinationIncluded: false;
    rawSalaryIncluded: false;
    rawProviderPayloadIncluded: false;
  };
};

const EXECUTION_ENTITY_TYPE = "PayrollProofBackfillExecutionCertificate";
const EXECUTION_AUDIT_ACTION =
  "PAYROLL_PROOF_BACKFILL_EXECUTION_CERTIFICATE_RECORDED";
const RECONCILIATION_ENTITY_TYPE =
  "PayrollProofBackfillReconciliationCertificate";
const RECONCILIATION_AUDIT_ACTION =
  "PAYROLL_PROOF_BACKFILL_RECONCILIATION_CERTIFICATE_RECORDED";

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

function booleanOrNull(value: unknown) {
  return typeof value === "boolean" ? value : null;
}

function clampLimit(value: number | null | undefined) {
  if (!value || !Number.isFinite(value)) return 5;
  return Math.min(Math.max(Math.floor(value), 1), 20);
}

function afterPayload(row: AuditLogRow) {
  return asRecord(asRecord(row.changes).after);
}

function gapCounts(value: unknown): Partial<PayrollProofBackfillGapCounts> {
  const raw = asRecord(value);
  return Object.fromEntries(
    Object.entries(raw).filter(([, entry]) => typeof entry === "number"),
  ) as Partial<PayrollProofBackfillGapCounts>;
}

function executionSummary(row: AuditLogRow): PayrollSetupCertificateSummary {
  const after = afterPayload(row);
  const proofBackfill = asRecord(after.proofBackfill);
  const ledger = asRecord(after.idempotencyLedger);
  const missingSignoffs = stringArray(after.missingSignoffs);

  return {
    kind: "execution",
    auditLogRef: redactPayrollSetupRef(row.id) ?? "redacted:unknown",
    ledgerKey: stringOrNull(ledger.ledgerKey) ?? row.entityId,
    recordedAt: row.createdAt.toISOString(),
    status: stringOrNull(after.status),
    certificateHash: stringOrNull(after.certificateHash),
    dryRunEvidenceHash: stringOrNull(after.dryRunEvidenceHash),
    approvalBundleHashPresent: Boolean(stringOrNull(after.approvalBundleHash)),
    missingSignoffCount: missingSignoffs.length,
    executionEnabled: booleanOrNull(after.executionEnabled),
    mutationAttempted: booleanOrNull(after.mutationAttempted),
    totalBlockingGaps: numberOrNull(proofBackfill.totalBlockingGaps),
    gapCounts: gapCounts(proofBackfill.gapCounts),
    dataTrustProofGateStatus: null,
    dataTrustBlockerIds: [],
    sourceCertificateValid: null,
    postMigrationProofGapsCleared: null,
  };
}

function reconciliationSummary(
  row: AuditLogRow,
): PayrollSetupCertificateSummary {
  const after = afterPayload(row);
  const sourceCertificate = asRecord(after.sourceCertificate);
  const currentProofBackfill = asRecord(after.currentProofBackfill);
  const dataTrustProofGate = asRecord(after.dataTrustProofGate);
  const status = stringOrNull(dataTrustProofGate.status);

  return {
    kind: "reconciliation",
    auditLogRef: redactPayrollSetupRef(row.id) ?? "redacted:unknown",
    ledgerKey: stringOrNull(sourceCertificate.ledgerKey) ?? row.entityId,
    recordedAt: row.createdAt.toISOString(),
    status: stringOrNull(after.status),
    certificateHash: stringOrNull(after.certificateHash),
    dryRunEvidenceHash: stringOrNull(sourceCertificate.dryRunEvidenceHash),
    approvalBundleHashPresent: booleanOrNull(
      sourceCertificate.approvalBundleHashPresent,
    ),
    missingSignoffCount: stringArray(sourceCertificate.missingSignoffs).length,
    executionEnabled: booleanOrNull(sourceCertificate.executionEnabled),
    mutationAttempted: booleanOrNull(sourceCertificate.mutationAttempted),
    totalBlockingGaps: numberOrNull(currentProofBackfill.totalBlockingGaps),
    gapCounts: gapCounts(currentProofBackfill.gapCounts),
    dataTrustProofGateStatus:
      status === "READY" || status === "BLOCKED" ? status : null,
    dataTrustBlockerIds: stringArray(dataTrustProofGate.blockerIds),
    sourceCertificateValid: booleanOrNull(sourceCertificate.validated),
    postMigrationProofGapsCleared: booleanOrNull(
      currentProofBackfill.postMigrationProofGapsCleared,
    ),
  };
}

function statusFor(input: {
  latestExecution: PayrollSetupCertificateSummary | null;
  latestReconciliation: PayrollSetupCertificateSummary | null;
}): PayrollSetupEvidenceStatus {
  if (!input.latestExecution) return "NO_EVIDENCE";
  if (
    input.latestExecution.status === "SIGNOFF_REQUIRED" ||
    (input.latestExecution.missingSignoffCount ?? 0) > 0
  ) {
    return "EXECUTION_SIGNOFF_REQUIRED";
  }
  if (!input.latestReconciliation) return "AWAITING_RECONCILIATION_CERTIFICATE";
  if (input.latestReconciliation.status === "READY_FOR_CLOSE_RECHECK") {
    return "READY_FOR_CLOSE_RECHECK";
  }
  if (input.latestReconciliation.status === "PROOF_GAPS_REMAIN") {
    return "PROOF_GAPS_REMAIN";
  }
  if (input.latestReconciliation.status === "BLOCKED_BY_SETUP") {
    return "BLOCKED_BY_SETUP";
  }
  if (input.latestReconciliation.status === "BLOCKED_BY_SOURCE_CERTIFICATE") {
    return "BLOCKED_BY_SOURCE_CERTIFICATE";
  }
  return "AWAITING_RECONCILIATION_CERTIFICATE";
}

export async function getPayrollSetupEvidenceReadModel(
  input: PayrollSeedBackfillDryRunInput,
  client: DbClient = db,
): Promise<PayrollSetupEvidenceReadModel> {
  const take = clampLimit(input.maxRows);
  const [executionRows, reconciliationRows] = await Promise.all([
    client.auditLog.findMany({
      where: {
        organizationId: input.organizationId,
        entityType: EXECUTION_ENTITY_TYPE,
        action: EXECUTION_AUDIT_ACTION,
      },
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true,
        entityId: true,
        entityType: true,
        action: true,
        changes: true,
        createdAt: true,
      },
    }),
    client.auditLog.findMany({
      where: {
        organizationId: input.organizationId,
        entityType: RECONCILIATION_ENTITY_TYPE,
        action: RECONCILIATION_AUDIT_ACTION,
      },
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true,
        entityId: true,
        entityType: true,
        action: true,
        changes: true,
        createdAt: true,
      },
    }),
  ]);

  const executionCertificates = (executionRows as AuditLogRow[]).map(
    executionSummary,
  );
  const reconciliationCertificates = (reconciliationRows as AuditLogRow[]).map(
    reconciliationSummary,
  );
  const latestExecutionCertificate = executionCertificates[0] ?? null;
  const latestReconciliationCertificate = reconciliationCertificates[0] ?? null;

  return {
    generatedAt: new Date().toISOString(),
    organizationRef:
      redactPayrollSetupRef(input.organizationId) ?? "redacted:none",
    actorRef: redactPayrollSetupRef(input.actorId),
    evidenceSource: "audit_logs",
    status: statusFor({
      latestExecution: latestExecutionCertificate,
      latestReconciliation: latestReconciliationCertificate,
    }),
    latestExecutionCertificate,
    latestReconciliationCertificate,
    executionCertificates,
    reconciliationCertificates,
    totals: {
      executionCertificateCount: executionCertificates.length,
      reconciliationCertificateCount: reconciliationCertificates.length,
    },
    redaction: {
      policy: "payroll-setup-evidence-read-model-redaction",
      rawAuditLogIdsIncluded: false,
      rawPersonDataIncluded: false,
      rawPaymentDestinationIncluded: false,
      rawSalaryIncluded: false,
      rawProviderPayloadIncluded: false,
    },
  };
}
