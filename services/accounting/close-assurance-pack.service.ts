import "server-only";

import {
  CloseChecklistStatus,
  CloseEvidenceType,
  CloseFindingSeverity,
  CloseFindingStatus,
  CloseRunStatus,
  Prisma,
} from "@prisma/client";
import { createHash, randomUUID } from "node:crypto";

import { hasRbacPermission } from "@/lib/security/rbac-permissions";
import { db } from "@/prisma/db";
import {
  BusinessRuleError,
  NotFoundError,
} from "@/services/_shared/action-errors";
import { recordBusinessEventInTx } from "@/services/events/business-event.service";
import {
  reconcileInventoryClass3,
  type InventoryClass3ReconciliationResult,
} from "@/services/inventory/inventory-valuation.service";
import type { ExportClosePackInput } from "./close-assurance.schemas";

export type ClosePackExportMode = "DRAFT_NOT_CERTIFIED" | "CERTIFIED";

const PILOT_ENTITY_TYPE = "PayrollPilotCycleCertification";
const PILOT_AUDIT_ACTION = "PAYROLL_PILOT_CYCLE_CERTIFICATION_EVALUATED";
const PILOT_CERTIFIED_STATUS = "CERTIFIED_FOR_PRODUCTION_RELEASE_REVIEW";

export type ExportClosePackControl = {
  actorId?: string | null;
  actorPermissions?: readonly string[];
  lastAuthAt?: Date | number | string | null;
  now?: Date | number | string | null;
};

export type ClosePackExportResult = {
  exportId: string;
  closeRunId: string;
  periodId: string;
  fileName: string;
  mimeType: "application/json";
  content: string;
  contentHash: string;
  watermarkId: string;
  mode: ClosePackExportMode;
  isCertified: boolean;
  rowCount: number;
  generatedAt: string;
  correlationId: string;
  redactionNote: string;
  certificationLimitations: string[];
};

export type CloseCertificationInvalidationSourceCode =
  | "INVENTORY_VALUATION_ANNEX"
  | "INVENTORY_VALUATION_WRITE"
  | "LEDGER_JOURNAL_POSTED"
  | "LEDGER_JOURNAL_REVERSED"
  | "PAYROLL_RUN_POSTED"
  | "PAYROLL_PAYMENT_RELEASED"
  | "PAYROLL_PAYMENT_RECONCILED"
  | "PAYROLL_EMPLOYEE_BALANCE_OPENED"
  | "PAYROLL_EMPLOYEE_BALANCE_SETTLED"
  | "PAYROLL_DECLARATION_PREPARED"
  | "PAYROLL_DECLARATION_SUBMITTED"
  | "PAYROLL_DECLARATION_ACCEPTED"
  | "PAYROLL_DECLARATION_REJECTED"
  | "PAYROLL_DECLARATION_PAYMENT_DUE"
  | "PAYROLL_DECLARATION_PAID"
  | "PAYROLL_DECLARATION_RECONCILED"
  | "PAYROLL_DECLARATION_AMENDED"
  | "PAYMENT_PROVIDER_EVENT_CAPTURED"
  | "PAYMENT_STATEMENT_IMPORT"
  | "PAYMENT_RECONCILIATION_SIGNED"
  | "PAYMENT_RECONCILIATION_CERTIFICATE_EXPORTED"
  | "PAYMENT_RECONCILIATION_CERTIFICATE_HASH_DRIFT"
  | "PAYMENT_SUSPENSE_POSTING"
  | "CUSTOM";

export type CloseCertificationInvalidationSourceMetadata = {
  sourceCode: CloseCertificationInvalidationSourceCode;
  ring: "FIRST_RING" | "DOMAIN_RECHECK" | "CUSTOM";
  domain: "inventory" | "ledger" | "payments" | "payroll" | "custom";
  sourceModel: string;
  sourceTable: string | null;
  sourceEventName: string;
  closeImpact: "CERTIFIED_CLOSE_EVIDENCE_STALE";
};

export const CLOSE_CERTIFICATION_INVALIDATION_SOURCES = {
  INVENTORY_VALUATION_ANNEX: {
    sourceCode: "INVENTORY_VALUATION_ANNEX",
    ring: "DOMAIN_RECHECK",
    domain: "inventory",
    sourceModel: "InventoryValuationAnnex",
    sourceTable: null,
    sourceEventName: "inventory.valuation.annex.checked",
    closeImpact: "CERTIFIED_CLOSE_EVIDENCE_STALE",
  },
  INVENTORY_VALUATION_WRITE: {
    sourceCode: "INVENTORY_VALUATION_WRITE",
    ring: "DOMAIN_RECHECK",
    domain: "inventory",
    sourceModel: "InventoryTransaction",
    sourceTable: "inventory_transactions",
    sourceEventName: "inventory.valuation.write",
    closeImpact: "CERTIFIED_CLOSE_EVIDENCE_STALE",
  },
  LEDGER_JOURNAL_POSTED: {
    sourceCode: "LEDGER_JOURNAL_POSTED",
    ring: "FIRST_RING",
    domain: "ledger",
    sourceModel: "JournalEntry",
    sourceTable: "journal_entries",
    sourceEventName: "ledger.journal.posted",
    closeImpact: "CERTIFIED_CLOSE_EVIDENCE_STALE",
  },
  LEDGER_JOURNAL_REVERSED: {
    sourceCode: "LEDGER_JOURNAL_REVERSED",
    ring: "FIRST_RING",
    domain: "ledger",
    sourceModel: "JournalEntry",
    sourceTable: "journal_entries",
    sourceEventName: "ledger.journal.reversed",
    closeImpact: "CERTIFIED_CLOSE_EVIDENCE_STALE",
  },
  PAYROLL_RUN_POSTED: {
    sourceCode: "PAYROLL_RUN_POSTED",
    ring: "FIRST_RING",
    domain: "payroll",
    sourceModel: "PayrollRun",
    sourceTable: "payroll_runs",
    sourceEventName: "payroll.run.posted",
    closeImpact: "CERTIFIED_CLOSE_EVIDENCE_STALE",
  },
  PAYROLL_PAYMENT_RELEASED: {
    sourceCode: "PAYROLL_PAYMENT_RELEASED",
    ring: "FIRST_RING",
    domain: "payroll",
    sourceModel: "PayrollPaymentBatch",
    sourceTable: "payroll_payment_batches",
    sourceEventName: "payroll.payment_batch.released",
    closeImpact: "CERTIFIED_CLOSE_EVIDENCE_STALE",
  },
  PAYROLL_PAYMENT_RECONCILED: {
    sourceCode: "PAYROLL_PAYMENT_RECONCILED",
    ring: "FIRST_RING",
    domain: "payroll",
    sourceModel: "PayrollPaymentBatch",
    sourceTable: "payroll_payment_batches",
    sourceEventName: "payroll.payment_batch.reconciled",
    closeImpact: "CERTIFIED_CLOSE_EVIDENCE_STALE",
  },
  PAYROLL_EMPLOYEE_BALANCE_OPENED: {
    sourceCode: "PAYROLL_EMPLOYEE_BALANCE_OPENED",
    ring: "FIRST_RING",
    domain: "payroll",
    sourceModel: "PayrollEmployeeBalanceCase",
    sourceTable: "payroll_employee_balance_cases",
    sourceEventName: "payroll.employee_balance.opened",
    closeImpact: "CERTIFIED_CLOSE_EVIDENCE_STALE",
  },
  PAYROLL_EMPLOYEE_BALANCE_SETTLED: {
    sourceCode: "PAYROLL_EMPLOYEE_BALANCE_SETTLED",
    ring: "FIRST_RING",
    domain: "payroll",
    sourceModel: "PayrollEmployeeBalanceEvent",
    sourceTable: "payroll_employee_balance_events",
    sourceEventName: "payroll.employee_balance.settled",
    closeImpact: "CERTIFIED_CLOSE_EVIDENCE_STALE",
  },
  PAYROLL_DECLARATION_PREPARED: {
    sourceCode: "PAYROLL_DECLARATION_PREPARED",
    ring: "FIRST_RING",
    domain: "payroll",
    sourceModel: "PayrollRun",
    sourceTable: "payroll_declarations",
    sourceEventName: "payroll.declaration.prepared",
    closeImpact: "CERTIFIED_CLOSE_EVIDENCE_STALE",
  },
  PAYROLL_DECLARATION_SUBMITTED: {
    sourceCode: "PAYROLL_DECLARATION_SUBMITTED",
    ring: "FIRST_RING",
    domain: "payroll",
    sourceModel: "PayrollDeclaration",
    sourceTable: "payroll_declarations",
    sourceEventName: "payroll.declaration.submitted",
    closeImpact: "CERTIFIED_CLOSE_EVIDENCE_STALE",
  },
  PAYROLL_DECLARATION_ACCEPTED: {
    sourceCode: "PAYROLL_DECLARATION_ACCEPTED",
    ring: "FIRST_RING",
    domain: "payroll",
    sourceModel: "PayrollDeclaration",
    sourceTable: "payroll_declarations",
    sourceEventName: "payroll.declaration.accepted",
    closeImpact: "CERTIFIED_CLOSE_EVIDENCE_STALE",
  },
  PAYROLL_DECLARATION_REJECTED: {
    sourceCode: "PAYROLL_DECLARATION_REJECTED",
    ring: "FIRST_RING",
    domain: "payroll",
    sourceModel: "PayrollDeclaration",
    sourceTable: "payroll_declarations",
    sourceEventName: "payroll.declaration.rejected",
    closeImpact: "CERTIFIED_CLOSE_EVIDENCE_STALE",
  },
  PAYROLL_DECLARATION_PAYMENT_DUE: {
    sourceCode: "PAYROLL_DECLARATION_PAYMENT_DUE",
    ring: "FIRST_RING",
    domain: "payroll",
    sourceModel: "PayrollDeclaration",
    sourceTable: "payroll_declarations",
    sourceEventName: "payroll.declaration.payment_due",
    closeImpact: "CERTIFIED_CLOSE_EVIDENCE_STALE",
  },
  PAYROLL_DECLARATION_PAID: {
    sourceCode: "PAYROLL_DECLARATION_PAID",
    ring: "FIRST_RING",
    domain: "payroll",
    sourceModel: "PayrollDeclaration",
    sourceTable: "payroll_declarations",
    sourceEventName: "payroll.declaration.paid",
    closeImpact: "CERTIFIED_CLOSE_EVIDENCE_STALE",
  },
  PAYROLL_DECLARATION_RECONCILED: {
    sourceCode: "PAYROLL_DECLARATION_RECONCILED",
    ring: "FIRST_RING",
    domain: "payroll",
    sourceModel: "PayrollDeclaration",
    sourceTable: "payroll_declarations",
    sourceEventName: "payroll.declaration.reconciled",
    closeImpact: "CERTIFIED_CLOSE_EVIDENCE_STALE",
  },
  PAYROLL_DECLARATION_AMENDED: {
    sourceCode: "PAYROLL_DECLARATION_AMENDED",
    ring: "FIRST_RING",
    domain: "payroll",
    sourceModel: "PayrollDeclarationEvidence",
    sourceTable: "payroll_declaration_evidence",
    sourceEventName: "payroll.declaration.amended",
    closeImpact: "CERTIFIED_CLOSE_EVIDENCE_STALE",
  },
  PAYMENT_PROVIDER_EVENT_CAPTURED: {
    sourceCode: "PAYMENT_PROVIDER_EVENT_CAPTURED",
    ring: "FIRST_RING",
    domain: "payments",
    sourceModel: "ProviderEvent",
    sourceTable: "provider_events",
    sourceEventName: "payment.provider_event.captured",
    closeImpact: "CERTIFIED_CLOSE_EVIDENCE_STALE",
  },
  PAYMENT_STATEMENT_IMPORT: {
    sourceCode: "PAYMENT_STATEMENT_IMPORT",
    ring: "FIRST_RING",
    domain: "payments",
    sourceModel: "StatementFile",
    sourceTable: "statement_files",
    sourceEventName: "payment.statement.imported",
    closeImpact: "CERTIFIED_CLOSE_EVIDENCE_STALE",
  },
  PAYMENT_RECONCILIATION_SIGNED: {
    sourceCode: "PAYMENT_RECONCILIATION_SIGNED",
    ring: "FIRST_RING",
    domain: "payments",
    sourceModel: "ReconciliationRun",
    sourceTable: "reconciliation_runs",
    sourceEventName: "payment.reconciliation.signed",
    closeImpact: "CERTIFIED_CLOSE_EVIDENCE_STALE",
  },
  PAYMENT_RECONCILIATION_CERTIFICATE_EXPORTED: {
    sourceCode: "PAYMENT_RECONCILIATION_CERTIFICATE_EXPORTED",
    ring: "FIRST_RING",
    domain: "payments",
    sourceModel: "ReconciliationRun",
    sourceTable: "reconciliation_runs",
    sourceEventName: "payment.reconciliation.certificate.exported",
    closeImpact: "CERTIFIED_CLOSE_EVIDENCE_STALE",
  },
  PAYMENT_RECONCILIATION_CERTIFICATE_HASH_DRIFT: {
    sourceCode: "PAYMENT_RECONCILIATION_CERTIFICATE_HASH_DRIFT",
    ring: "FIRST_RING",
    domain: "payments",
    sourceModel: "ReconciliationRun",
    sourceTable: "reconciliation_runs",
    sourceEventName: "payment.reconciliation.certificate.hash_drift_detected",
    closeImpact: "CERTIFIED_CLOSE_EVIDENCE_STALE",
  },
  PAYMENT_SUSPENSE_POSTING: {
    sourceCode: "PAYMENT_SUSPENSE_POSTING",
    ring: "FIRST_RING",
    domain: "payments",
    sourceModel: "SuspenseItem",
    sourceTable: "suspense_items",
    sourceEventName: "payment.reconciliation.suspense.posted",
    closeImpact: "CERTIFIED_CLOSE_EVIDENCE_STALE",
  },
} as const satisfies Record<
  Exclude<CloseCertificationInvalidationSourceCode, "CUSTOM">,
  CloseCertificationInvalidationSourceMetadata
>;
export type CloseCertificationInvalidationInput = {
  closeRunId: string;
  closePackExportId?: string | null;
  sourceCode?: CloseCertificationInvalidationSourceCode;
  sourceModel: string;
  sourceId?: string | null;
  sourceEventName: string;
  staleReason: string;
  previousEvidenceHash?: string | null;
  newEvidenceHash?: string | null;
  correlationId?: string | null;
};

export type CloseCertificationInvalidationResult = {
  closeRunId: string;
  closePackExportId: string | null;
  businessEventId: string;
  staleReason: string;
};

export type RecordCloseCertificationInvalidationsForSourceInput = {
  sourceCode: Exclude<CloseCertificationInvalidationSourceCode, "CUSTOM">;
  sourceId?: string | null;
  closeRunId?: string | null;
  closePackExportId?: string | null;
  periodId?: string | null;
  periodStart?: Date | string | null;
  periodEnd?: Date | string | null;
  staleReason: string;
  previousEvidenceHash?: string | null;
  newEvidenceHash?: string | null;
  correlationId?: string | null;
};

export type RecordCloseCertificationInvalidationsForSourceResult = {
  invalidatedCount: number;
  results: CloseCertificationInvalidationResult[];
};
type InventoryAnnexFreshness = {
  status: "FRESH" | "MISSING" | "STALE" | "BLOCKED" | "UNAVAILABLE";
  sourceModel: "InventoryValuationAnnex";
  sourceId: string;
  sourceEventName: "inventory.valuation.annex.checked";
  staleReason: string | null;
  previousEvidenceHash: string | null;
  newEvidenceHash: string | null;
  savedAnnex: Record<string, unknown> | null;
  currentAnnex: Record<string, unknown> | null;
  certificationBlocker: string | null;
  detectedAt: string;
};

type PilotCertificationAnnex = {
  status: string | null;
  auditLogRef: string | null;
  payrollRunRef: string | null;
  certificateHash: string | null;
  generatedAt: string | null;
  blockerCount: number;
  blockerCodes: string[];
  missingSignoffRoles: string[];
  expectedAdapterChaosReleaseGateHash: string | null;
  proofBackfillAdapterChaosMatchesExpected: boolean | null;
  closePeriodPayrollRunCount: number;
};

type PilotCertificationEvidence = {
  annex: PilotCertificationAnnex;
  certificationBlockers: string[];
};

type PilotAuditRow = {
  id: string;
  entityId: string;
  changes: Prisma.JsonValue | null;
  createdAt: Date;
};

const OPEN_FINDING_STATUSES = [
  CloseFindingStatus.OPEN,
  CloseFindingStatus.ASSIGNED,
  CloseFindingStatus.IN_REVIEW,
  CloseFindingStatus.REOPENED,
] as const;

const HIGH_RISK_CHECKLIST_STATUSES = [
  CloseChecklistStatus.FAILED,
  CloseChecklistStatus.UNAVAILABLE,
] as const;

const CRITICAL_EVIDENCE_TYPES: readonly CloseEvidenceType[] = [
  CloseEvidenceType.REPORT_EXPORT,
  CloseEvidenceType.RECONCILIATION_CERTIFICATE,
  CloseEvidenceType.DATA_TRUST_CERTIFICATE,
];

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;

  return `{${Object.keys(value as Record<string, unknown>)
    .sort()
    .map(
      (key) =>
        `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`,
    )
    .join(",")}}`;
}

function sha256(value: string) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function jsonObject(value: Record<string, unknown>): Prisma.InputJsonObject {
  return value as Prisma.InputJsonObject;
}

function iso(value: Date | string | null | undefined) {
  return value ? new Date(value).toISOString() : null;
}

function decimalNumber(
  value: Prisma.Decimal | number | string | null | undefined,
) {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  return Number(value);
}

function metadataRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function stringOrNull(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
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

function redactClosePackEvidenceRef(value?: string | null) {
  if (!value) return null;
  return `redacted:${createHash("sha256").update(value).digest("hex").slice(0, 12)}`;
}

function auditPayloadAfter(row: PilotAuditRow | null) {
  const changes = metadataRecord(row?.changes);
  const after = metadataRecord(changes.after);
  return Object.keys(after).length > 0 ? after : changes;
}

function dateOrNull(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function sourceMetadataForInput(
  input: CloseCertificationInvalidationInput,
): CloseCertificationInvalidationSourceMetadata {
  if (input.sourceCode && input.sourceCode !== "CUSTOM")
    return CLOSE_CERTIFICATION_INVALIDATION_SOURCES[input.sourceCode];

  const matchedSource = Object.values(
    CLOSE_CERTIFICATION_INVALIDATION_SOURCES,
  ).find(
    (source) =>
      source.sourceModel === input.sourceModel &&
      source.sourceEventName === input.sourceEventName,
  );
  if (matchedSource) return matchedSource;

  return {
    sourceCode: input.sourceCode ?? "CUSTOM",
    ring: "CUSTOM",
    domain: "custom",
    sourceModel: input.sourceModel,
    sourceTable: null,
    sourceEventName: input.sourceEventName,
    closeImpact: "CERTIFIED_CLOSE_EVIDENCE_STALE",
  };
}

function sourcePayload(source: CloseCertificationInvalidationSourceMetadata) {
  return {
    sourceCode: source.sourceCode,
    ring: source.ring,
    domain: source.domain,
    sourceModel: source.sourceModel,
    sourceTable: source.sourceTable,
    sourceEventName: source.sourceEventName,
    closeImpact: source.closeImpact,
  };
}

function stringField(value: Record<string, unknown> | null, key: string) {
  const raw = value?.[key];
  return typeof raw === "string" && raw.trim() ? raw : null;
}

function statutoryCertificationBlockerMetadata() {
  return {
    systemEvidenceStatus: "SYSTEM_EVIDENCE_ONLY",
    statutoryReadinessStatus: "STATUTORY_BLOCKED",
    statutoryAuthorityStatus: "AUTHORITY_NOT_CONFIGURED",
    blockers: [
      "AUTHORITY_NOT_CONFIGURED",
      "REQUIRES_EXPERT_REVIEW",
      "COUNTRY_PACK_UNVERIFIED",
      "ADAPTER_SANDBOX_ONLY",
    ],
  };
}

function inventoryAnnexFromResult(
  run: NonNullable<Awaited<ReturnType<typeof loadCloseRunForPack>>>,
  result: InventoryClass3ReconciliationResult,
  asOf: string,
) {
  return {
    organizationId: run.organizationId,
    accountingPeriodId: run.periodId,
    asOf,
    valuationMethod: "WEIGHTED_AVERAGE",
    sourceCounts: result.sourceCounts,
    class3LedgerBalanceTotal: result.ledgerClass3Value,
    inventorySubledgerValueTotal: result.inventoryValue,
    mismatchAmount: result.driftAmount,
    sourceHash: result.reportHash,
    blockerStatus:
      result.status === "PASSED" ? "PASSED" : "INVENTORY_VALUATION_MISMATCH",
    failures: result.failures.map((failure) => ({
      type: failure.type,
      severity: failure.severity,
      message: failure.message,
      metadata: failure.metadata,
    })),
  };
}

function savedInventoryAnnex(
  run: NonNullable<Awaited<ReturnType<typeof loadCloseRunForPack>>>,
) {
  const raw = metadataRecord(run.metadata).inventoryValuationAnnex;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return raw as Record<string, unknown>;
}

function savedInventoryEvidence(
  run: NonNullable<Awaited<ReturnType<typeof loadCloseRunForPack>>>,
) {
  return (
    run.evidenceItems.find(
      (item) => item.sourceType === "InventoryValuationAnnex",
    ) ?? null
  );
}

function savedPayrollFinanceForecastProof(
  run: NonNullable<Awaited<ReturnType<typeof loadCloseRunForPack>>>,
) {
  const raw = metadataRecord(run.metadata).payrollFinanceForecastProof;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }

  const evidenceMetadata = run.evidenceItems.find(
    (item) => item.sourceType === "PayrollFinanceForecastProof",
  )?.metadata;
  if (evidenceMetadata && typeof evidenceMetadata === "object" && !Array.isArray(evidenceMetadata)) {
    return evidenceMetadata as Record<string, unknown>;
  }

  return null;
}

function pilotCertificationEvidenceFromAudit(
  row: PilotAuditRow | null,
  closePeriodPayrollRunCount: number,
): PilotCertificationEvidence {
  const payload = auditPayloadAfter(row);
  const proofContinuity = metadataRecord(payload.proofContinuity);
  const signoff = metadataRecord(payload.signoff);
  const blockers = Array.isArray(payload.blockers) ? payload.blockers : [];
  const blockerCodes = blockers
    .map((blocker) => stringOrNull(metadataRecord(blocker).code))
    .filter((code): code is string => Boolean(code));
  const missingSignoffRoles = stringArray(signoff.missingRoles);
  const annex: PilotCertificationAnnex = {
    status: stringOrNull(payload.status),
    auditLogRef: redactClosePackEvidenceRef(row?.id),
    payrollRunRef: redactClosePackEvidenceRef(row?.entityId),
    certificateHash: stringOrNull(payload.certificateHash),
    generatedAt: stringOrNull(payload.generatedAt),
    blockerCount: blockers.length,
    blockerCodes,
    missingSignoffRoles,
    expectedAdapterChaosReleaseGateHash: stringOrNull(
      proofContinuity.expectedAdapterChaosReleaseGateHash,
    ),
    proofBackfillAdapterChaosMatchesExpected: booleanOrNull(
      proofContinuity.proofBackfillAdapterChaosMatchesExpected,
    ),
    closePeriodPayrollRunCount,
  };
  const certificationBlockers: string[] = [];

  if (closePeriodPayrollRunCount === 0) {
    certificationBlockers.push(
      "No payroll run belongs to this close period for pilot-cycle certification.",
    );
  } else if (!row) {
    certificationBlockers.push(
      "Persisted payroll pilot-cycle certification evidence is missing for this close period.",
    );
  }

  if (row) {
    if (annex.status !== PILOT_CERTIFIED_STATUS) {
      certificationBlockers.push(
        "Persisted payroll pilot-cycle certification is not certified for production release review.",
      );
    }
    if (!annex.certificateHash) {
      certificationBlockers.push(
        "Persisted payroll pilot-cycle certification is missing a certificate hash.",
      );
    }
    if (annex.blockerCount > 0) {
      certificationBlockers.push(
        `${annex.blockerCount} payroll pilot-cycle certification blocker(s) remain open.`,
      );
    }
    if (annex.missingSignoffRoles.length > 0) {
      certificationBlockers.push(
        `Payroll pilot-cycle certification is missing signoff from ${annex.missingSignoffRoles.join(", ")}.`,
      );
    }
    if (!annex.expectedAdapterChaosReleaseGateHash) {
      certificationBlockers.push(
        "Payroll pilot-cycle certification is missing adapter chaos release-gate proof.",
      );
    }
    if (annex.proofBackfillAdapterChaosMatchesExpected !== true) {
      certificationBlockers.push(
        "Payroll pilot-cycle proof-backfill adapter chaos continuity is not proven.",
      );
    }
  }

  return { annex, certificationBlockers };
}

async function loadPilotCertificationEvidenceForCloseRun(
  run: NonNullable<Awaited<ReturnType<typeof loadCloseRunForPack>>>,
  tx: Prisma.TransactionClient | typeof db,
): Promise<PilotCertificationEvidence> {
  const payrollRuns = await tx.payrollRun.findMany({
    where: {
      organizationId: run.organizationId,
      deletedAt: null,
      payrollPeriod: {
        accountingPeriodId: run.periodId,
      },
    },
    select: { id: true },
  });
  const payrollRunIds = payrollRuns.map((payrollRun) => payrollRun.id);
  const latestPilotAudit = payrollRunIds.length
    ? await tx.auditLog.findFirst({
        where: {
          organizationId: run.organizationId,
          entityType: PILOT_ENTITY_TYPE,
          action: PILOT_AUDIT_ACTION,
          entityId: { in: payrollRunIds },
        },
        orderBy: { createdAt: "desc" },
        select: { id: true, entityId: true, changes: true, createdAt: true },
      })
    : null;

  return pilotCertificationEvidenceFromAudit(
    latestPilotAudit as PilotAuditRow | null,
    payrollRunIds.length,
  );
}

async function evaluateInventoryAnnexFreshness(
  run: NonNullable<Awaited<ReturnType<typeof loadCloseRunForPack>>>,
  tx: Prisma.TransactionClient | typeof db,
  detectedAt: string,
): Promise<InventoryAnnexFreshness> {
  const savedAnnex = savedInventoryAnnex(run);
  const inventoryEvidence = savedInventoryEvidence(run);
  const previousEvidenceHash =
    stringField(savedAnnex, "sourceHash") ??
    inventoryEvidence?.sourceHash ??
    null;
  const sourceId = run.periodId;

  if (!savedAnnex || !inventoryEvidence || !previousEvidenceHash) {
    return {
      status: "MISSING",
      sourceModel: "InventoryValuationAnnex",
      sourceId,
      sourceEventName: "inventory.valuation.annex.checked",
      staleReason:
        "Inventory valuation annex evidence is missing from the persisted close run.",
      previousEvidenceHash,
      newEvidenceHash: null,
      savedAnnex,
      currentAnnex: null,
      certificationBlocker: "Inventory valuation annex evidence is missing.",
      detectedAt,
    };
  }

  if (stringField(savedAnnex, "blockerStatus") !== "PASSED") {
    return {
      status: "BLOCKED",
      sourceModel: "InventoryValuationAnnex",
      sourceId,
      sourceEventName: "inventory.valuation.annex.checked",
      staleReason: `Saved inventory valuation annex status is ${stringField(savedAnnex, "blockerStatus") ?? "unknown"}.`,
      previousEvidenceHash,
      newEvidenceHash: previousEvidenceHash,
      savedAnnex,
      currentAnnex: null,
      certificationBlocker: "Inventory valuation annex is blocked.",
      detectedAt,
    };
  }

  let current: InventoryClass3ReconciliationResult;
  try {
    current = await reconcileInventoryClass3(
      {
        organizationId: run.organizationId,
        periodId: run.periodId,
        currency: run.organization.currency ?? "XAF",
      },
      tx,
    );
  } catch (error) {
    const message =
      error instanceof Error && error.message.trim()
        ? error.message
        : "Inventory valuation annex could not be refreshed.";
    return {
      status: "UNAVAILABLE",
      sourceModel: "InventoryValuationAnnex",
      sourceId,
      sourceEventName: "inventory.valuation.annex.checked",
      staleReason: message,
      previousEvidenceHash,
      newEvidenceHash: null,
      savedAnnex,
      currentAnnex: null,
      certificationBlocker:
        "Inventory valuation annex freshness could not be verified.",
      detectedAt,
    };
  }

  const currentAnnex = inventoryAnnexFromResult(run, current, detectedAt);
  if (current.status !== "PASSED") {
    return {
      status: "BLOCKED",
      sourceModel: "InventoryValuationAnnex",
      sourceId,
      sourceEventName: "inventory.valuation.annex.checked",
      staleReason:
        current.failures[0]?.message ??
        "Current inventory valuation reconciliation is blocked.",
      previousEvidenceHash,
      newEvidenceHash: current.reportHash,
      savedAnnex,
      currentAnnex,
      certificationBlocker:
        "Current inventory valuation reconciliation is blocked.",
      detectedAt,
    };
  }

  if (
    previousEvidenceHash !== current.reportHash ||
    inventoryEvidence.sourceHash !== current.reportHash
  ) {
    return {
      status: "STALE",
      sourceModel: "InventoryValuationAnnex",
      sourceId,
      sourceEventName: "inventory.valuation.annex.checked",
      staleReason:
        "Inventory valuation annex hash changed after close readiness was captured.",
      previousEvidenceHash,
      newEvidenceHash: current.reportHash,
      savedAnnex,
      currentAnnex,
      certificationBlocker: "Inventory valuation annex evidence is stale.",
      detectedAt,
    };
  }

  return {
    status: "FRESH",
    sourceModel: "InventoryValuationAnnex",
    sourceId,
    sourceEventName: "inventory.valuation.annex.checked",
    staleReason: null,
    previousEvidenceHash,
    newEvidenceHash: current.reportHash,
    savedAnnex,
    currentAnnex,
    certificationBlocker: null,
    detectedAt,
  };
}

function requireFreshControl(control: ExportClosePackControl, now: Date) {
  const lastAuthAt = control.lastAuthAt
    ? new Date(control.lastAuthAt).getTime()
    : 0;
  if (!lastAuthAt || now.getTime() - lastAuthAt > 5 * 60 * 1000) {
    throw new BusinessRuleError(
      "Fresh authentication is required to certify a close pack.",
      "FRESH_AUTH_REQUIRED",
    );
  }
}

function assertExportPermission(
  mode: ClosePackExportMode,
  control: ExportClosePackControl,
) {
  const permission =
    mode === "CERTIFIED"
      ? "accounting.close.certify"
      : "accounting.close.export";
  if (!hasRbacPermission(control.actorPermissions ?? [], permission)) {
    throw new BusinessRuleError(`Missing ${permission} permission.`);
  }
}

function exportMode(input: ExportClosePackInput): ClosePackExportMode {
  return input.mode ?? "DRAFT_NOT_CERTIFIED";
}

function certificationLimitations(mode: ClosePackExportMode) {
  return mode === "CERTIFIED"
    ? [
        "System-certified close pack only; statutory filings still require qualified expert validation.",
        "Automatic recertification triggers are limited to the captured close-run snapshot in this slice.",
      ]
    : [
        "Draft close pack is not certified and may include unresolved blockers.",
        "System evidence pack only; statutory filings still require qualified expert validation.",
      ];
}

function certificationBlockers(
  run: Awaited<ReturnType<typeof loadCloseRunForPack>>,
  inventoryFreshness?: InventoryAnnexFreshness,
  pilotCertification?: PilotCertificationEvidence,
) {
  if (!run) return ["Close run not found."];

  const blockers: string[] = [];
  const openHighRiskFindings = run.findings.filter(
    (finding) =>
      OPEN_FINDING_STATUSES.includes(
        finding.status as (typeof OPEN_FINDING_STATUSES)[number],
      ) &&
      (finding.severity === CloseFindingSeverity.CRITICAL ||
        finding.severity === CloseFindingSeverity.HIGH),
  );
  const failedHighRiskChecklist = run.checklistItems.filter(
    (item) =>
      HIGH_RISK_CHECKLIST_STATUSES.includes(
        item.status as (typeof HIGH_RISK_CHECKLIST_STATUSES)[number],
      ) &&
      (item.severity === CloseFindingSeverity.CRITICAL ||
        item.severity === CloseFindingSeverity.HIGH),
  );
  const availableEvidence = run.evidenceItems.filter((item) => item.available);
  const unsignedReconciliationEvidence = run.evidenceItems.filter(
    (item) =>
      item.evidenceType === CloseEvidenceType.RECONCILIATION_CERTIFICATE &&
      (!item.sourceHash || item.provenance !== "POSTED"),
  );
  const unavailableCriticalEvidence = run.evidenceItems.filter(
    (item) =>
      !item.available && CRITICAL_EVIDENCE_TYPES.includes(item.evidenceType),
  );

  if (run.status !== CloseRunStatus.READY)
    blockers.push(`Close run status is ${run.status}, not READY.`);
  if (run.criticalBlockerCount > 0)
    blockers.push(
      `${run.criticalBlockerCount} critical blocker(s) remain open.`,
    );
  if (run.highBlockerCount > 0)
    blockers.push(
      `${run.highBlockerCount} high-severity blocker(s) remain open.`,
    );
  if (openHighRiskFindings.length > 0)
    blockers.push(
      `${openHighRiskFindings.length} open high-risk finding(s) block certification.`,
    );
  if (failedHighRiskChecklist.length > 0)
    blockers.push(
      `${failedHighRiskChecklist.length} high-risk checklist gate(s) failed or unavailable.`,
    );
  if (availableEvidence.length === 0)
    blockers.push(
      "No available evidence items were captured for this close run.",
    );
  if (unsignedReconciliationEvidence.length > 0)
    blockers.push(
      `${unsignedReconciliationEvidence.length} reconciliation certificate reference(s) are unsigned or missing hashes.`,
    );
  if (unavailableCriticalEvidence.length > 0)
    blockers.push(
      `${unavailableCriticalEvidence.length} critical evidence reference(s) are unavailable.`,
    );
  if (inventoryFreshness?.certificationBlocker)
    blockers.push(inventoryFreshness.certificationBlocker);
  if (pilotCertification?.certificationBlockers.length)
    blockers.push(...pilotCertification.certificationBlockers);

  return blockers;
}

async function loadCloseRunForPack(
  organizationId: string,
  closeRunId: string,
  tx: Prisma.TransactionClient | typeof db = db,
) {
  return tx.closeRun.findFirst({
    where: { id: closeRunId, organizationId },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          country: true,
          currency: true,
          timezone: true,
          defaultLocale: true,
        },
      },
      period: {
        select: {
          id: true,
          name: true,
          status: true,
          startDate: true,
          endDate: true,
        },
      },
      checklistItems: { orderBy: [{ domain: "asc" }, { key: "asc" }] },
      findings: { orderBy: [{ severity: "desc" }, { createdAt: "asc" }] },
      evidenceItems: {
        orderBy: [{ evidenceType: "asc" }, { createdAt: "asc" }],
      },
      comments: { orderBy: { createdAt: "asc" } },
      reviews: { orderBy: { createdAt: "asc" } },
    },
  });
}

function buildClosePackPayload(
  run: NonNullable<Awaited<ReturnType<typeof loadCloseRunForPack>>>,
  params: {
    exportId: string;
    mode: ClosePackExportMode;
    generatedAt: string;
    generatedById: string | null;
    watermarkId: string;
    correlationId: string;
    redactionNote: string;
    certificationLimitations: string[];
    certificationBlockers: string[];
    inventoryFreshness: InventoryAnnexFreshness;
    pilotCertification: PilotCertificationEvidence;
  },
) {
  return {
    kind: "AQSTOQFLOW_CLOSE_ASSURANCE_PACK",
    version: 1,
    export: {
      exportId: params.exportId,
      mode: params.mode,
      generatedAt: params.generatedAt,
      generatedById: params.generatedById,
      watermarkId: params.watermarkId,
      fileType: "json",
      correlationId: params.correlationId,
      redaction: params.redactionNote,
      certificationLimitations: params.certificationLimitations,
      certificationBlockers: params.certificationBlockers,
    },
    certificationScope: statutoryCertificationBlockerMetadata(),
    organization: run.organization,
    period: {
      id: run.period.id,
      name: run.period.name,
      status: run.period.status,
      startDate: run.period.startDate.toISOString(),
      endDate: run.period.endDate.toISOString(),
    },
    closeRun: {
      id: run.id,
      status: run.status,
      readinessScore: run.readinessScore,
      criticalBlockerCount: run.criticalBlockerCount,
      highBlockerCount: run.highBlockerCount,
      evidenceCoveragePct: decimalNumber(run.evidenceCoveragePct),
      asOf: run.asOf.toISOString(),
      startedAt: iso(run.startedAt),
      completedAt: iso(run.completedAt),
      runById: run.runById,
      correlationId: run.correlationId,
      summary: run.summary,
      provenance: run.provenance,
      metadata: run.metadata,
    },
    annexes: {
      inventoryValuation: {
        saved: params.inventoryFreshness.savedAnnex,
        current: params.inventoryFreshness.currentAnnex,
        freshness: {
          status: params.inventoryFreshness.status,
          detectedAt: params.inventoryFreshness.detectedAt,
          staleReason: params.inventoryFreshness.staleReason,
          previousEvidenceHash: params.inventoryFreshness.previousEvidenceHash,
          newEvidenceHash: params.inventoryFreshness.newEvidenceHash,
        },
      },
      payrollFinanceForecast: {
        saved: savedPayrollFinanceForecastProof(run),
        redaction: "Aggregate close-pack payroll forecast proof only; person-level payroll amounts are redacted.",
      },
      pilotCycleCertification: {
        saved: params.pilotCertification.annex,
        redaction: "Persisted pilot-cycle certificate summary only; raw salary, person, provider, authority, and audit payloads are excluded.",
      },
    },
    checklist: run.checklistItems.map((item) => ({
      id: item.id,
      key: item.key,
      domain: item.domain,
      status: item.status,
      severity: item.severity,
      label: item.label,
      detail: item.detail,
      sourceService: item.sourceService,
      evidenceCount: item.evidenceCount,
      blockerReason: item.blockerReason,
      nextActionHref: item.nextActionHref,
      ownerId: item.ownerId,
      dueAt: iso(item.dueAt),
    })),
    findings: run.findings.map((finding) => ({
      id: finding.id,
      checklistItemId: finding.checklistItemId,
      domain: finding.domain,
      severity: finding.severity,
      status: finding.status,
      title: finding.title,
      detail: finding.detail,
      sourceService: finding.sourceService,
      sourceType: finding.sourceType,
      sourceId: finding.sourceId,
      ownerId: finding.ownerId,
      assignedById: finding.assignedById,
      assignedAt: iso(finding.assignedAt),
      dueAt: iso(finding.dueAt),
      resolutionNotes: finding.resolutionNotes,
      resolvedAt: iso(finding.resolvedAt),
      resolvedById: finding.resolvedById,
      waiverRequestedById: finding.waiverRequestedById,
      waiverRequestedAt: iso(finding.waiverRequestedAt),
      waiverApprovedById: finding.waiverApprovedById,
      waiverApprovedAt: iso(finding.waiverApprovedAt),
      correlationId: finding.correlationId,
    })),
    evidenceItems: run.evidenceItems.map((item) => ({
      id: item.id,
      checklistItemId: item.checklistItemId,
      findingId: item.findingId,
      evidenceType: item.evidenceType,
      sourceTable: item.sourceTable,
      sourceType: item.sourceType,
      sourceId: item.sourceId,
      sourceLabel: item.sourceLabel,
      sourceDate: iso(item.sourceDate),
      sourceHash: item.sourceHash,
      provenance: item.provenance,
      available: item.available,
      unavailableReason: item.unavailableReason,
      metadata: item.metadata,
      correlationId: item.correlationId,
    })),
    reviews: run.reviews.map((review) => ({
      id: review.id,
      status: review.status,
      reviewerId: review.reviewerId,
      openedById: review.openedById,
      reviewedAt: iso(review.reviewedAt),
      decisionNotes: review.decisionNotes,
      correlationId: review.correlationId,
      createdAt: review.createdAt.toISOString(),
    })),
    comments: run.comments.map((comment) => ({
      id: comment.id,
      findingId: comment.findingId,
      evidenceItemId: comment.evidenceItemId,
      reviewId: comment.reviewId,
      authorId: comment.authorId,
      visibility: comment.visibility,
      body: comment.body,
      correlationId: comment.correlationId,
      createdAt: comment.createdAt.toISOString(),
    })),
    summaries: {
      rowCount:
        run.checklistItems.length +
        run.findings.length +
        run.evidenceItems.length +
        run.reviews.length +
        run.comments.length,
      availableEvidenceCount: run.evidenceItems.filter((item) => item.available)
        .length,
      openFindingCount: run.findings.filter((finding) =>
        OPEN_FINDING_STATUSES.includes(
          finding.status as (typeof OPEN_FINDING_STATUSES)[number],
        ),
      ).length,
      signedReconciliationEvidenceCount: run.evidenceItems.filter(
        (item) =>
          item.evidenceType === CloseEvidenceType.RECONCILIATION_CERTIFICATE &&
          item.sourceHash &&
          item.provenance === "POSTED",
      ).length,
      suspenseEvidenceCount: run.evidenceItems.filter(
        (item) => item.evidenceType === CloseEvidenceType.SUSPENSE_ITEM,
      ).length,
    },
  };
}

async function recordInvalidationEvidenceInTx(
  tx: Prisma.TransactionClient,
  run: NonNullable<Awaited<ReturnType<typeof loadCloseRunForPack>>>,
  input: CloseCertificationInvalidationInput,
  control: ExportClosePackControl,
) {
  const detectedAt = (
    control.now ? new Date(control.now) : new Date()
  ).toISOString();
  const sourceMetadata = sourceMetadataForInput(input);
  const source = sourcePayload(sourceMetadata);
  const payload = {
    closeRunId: run.id,
    closePackExportId: input.closePackExportId ?? null,
    sourceCode: source.sourceCode,
    sourceRing: source.ring,
    sourceDomain: source.domain,
    sourceTable: source.sourceTable,
    sourceModel: source.sourceModel,
    sourceId: input.sourceId ?? null,
    sourceEventName: source.sourceEventName,
    invalidationSource: source,
    staleReason: input.staleReason,
    detectedAt,
    actorId: control.actorId ?? null,
    previousEvidenceHash: input.previousEvidenceHash ?? null,
    newEvidenceHash: input.newEvidenceHash ?? null,
    correlationId: input.correlationId ?? null,
  };
  const eventHashPart = sha256(
    stableStringify({
      closeRunId: run.id,
      closePackExportId: input.closePackExportId ?? null,
      sourceCode: source.sourceCode,
      sourceModel: source.sourceModel,
      sourceId: input.sourceId ?? null,
      sourceEventName: source.sourceEventName,
      previousEvidenceHash: input.previousEvidenceHash ?? null,
      newEvidenceHash: input.newEvidenceHash ?? null,
    }),
  ).slice(7, 23);
  const eventResult = await recordBusinessEventInTx(
    tx as Parameters<typeof recordBusinessEventInTx>[0],
    {
      organizationId: run.organizationId,
      eventType: "close.certification.invalidated",
      eventSource: "SYSTEM",
      idempotencyKey: `close-certification-invalidated:${run.id}:${input.closePackExportId ?? "run"}:${eventHashPart}`,
      payload,
      actorId: control.actorId ?? undefined,
      sourceType: "MANUAL",
      sourceId: run.id,
      documentHash:
        input.newEvidenceHash ?? input.previousEvidenceHash ?? undefined,
      metadata: {
        closeRunId: run.id,
        closePackExportId: input.closePackExportId ?? null,
        sourceCode: source.sourceCode,
        sourceRing: source.ring,
        sourceDomain: source.domain,
        sourceTable: source.sourceTable,
        staleReason: input.staleReason,
        invalidationSource: source,
        correlationId: input.correlationId ?? null,
      },
      outboxMessages: [
        {
          channel: "REPORT_EXPORT",
          eventName: "close.certification.invalidated",
          idempotencyKey: `close-certification-invalidated:${run.id}:${input.closePackExportId ?? "run"}:${eventHashPart}:report-export`,
          payload,
          metadata: {
            sourceCode: source.sourceCode,
            sourceRing: source.ring,
            sourceDomain: source.domain,
            sourceModel: source.sourceModel,
            sourceEventName: source.sourceEventName,
          },
        },
      ],
    },
  );

  await tx.ledgerAuditEvent.create({
    data: {
      organizationId: run.organizationId,
      actorId: control.actorId ?? null,
      action: "CLOSE_CERTIFICATION_EVIDENCE_STALE",
      resourceType: input.closePackExportId ? "ClosePackExport" : "CloseRun",
      resourceId: input.closePackExportId ?? run.id,
      message: input.staleReason,
      metadata: jsonObject({
        ...payload,
        businessEventId: eventResult.event.id,
      }),
    },
  });

  return eventResult.event.id;
}

async function recordCloseCertificationInvalidationInTx(
  tx: Prisma.TransactionClient,
  organizationId: string,
  input: CloseCertificationInvalidationInput,
  control: ExportClosePackControl = {},
): Promise<CloseCertificationInvalidationResult> {
  const run = await loadCloseRunForPack(organizationId, input.closeRunId, tx);
  if (!run) throw new NotFoundError("Close run not found");

  const closePackExport = input.closePackExportId
    ? await tx.closePackExport.findFirst({
        where: {
          id: input.closePackExportId,
          organizationId,
          closeRunId: run.id,
        },
      })
    : null;

  const source = sourcePayload(sourceMetadataForInput(input));
  const businessEventId = await recordInvalidationEvidenceInTx(
    tx,
    run,
    input,
    control,
  );
  const staleState = {
    status: "EVIDENCE_STALE",
    sourceCode: source.sourceCode,
    sourceRing: source.ring,
    sourceDomain: source.domain,
    sourceTable: source.sourceTable,
    sourceModel: source.sourceModel,
    sourceId: input.sourceId ?? null,
    sourceEventName: source.sourceEventName,
    invalidationSource: source,
    staleReason: input.staleReason,
    detectedAt: (control.now
      ? new Date(control.now)
      : new Date()
    ).toISOString(),
    actorId: control.actorId ?? null,
    previousEvidenceHash: input.previousEvidenceHash ?? null,
    newEvidenceHash: input.newEvidenceHash ?? null,
    businessEventId,
    correlationId: input.correlationId ?? null,
  };

  if (closePackExport) {
    await tx.closePackExport.update({
      where: { id: closePackExport.id },
      data: {
        metadata: jsonObject({
          ...metadataRecord(closePackExport.metadata),
          staleState,
          statutoryCertification: statutoryCertificationBlockerMetadata(),
        }),
      },
    });
  }

  await tx.closeRun.update({
    where: { id: run.id },
    data: {
      status:
        run.status === CloseRunStatus.CERTIFIED
          ? CloseRunStatus.BLOCKED
          : run.status,
      metadata: jsonObject({
        ...metadataRecord(run.metadata),
        staleState,
        statutoryCertification: statutoryCertificationBlockerMetadata(),
      }),
    },
  });

  return {
    closeRunId: run.id,
    closePackExportId: closePackExport?.id ?? null,
    businessEventId,
    staleReason: input.staleReason,
  };
}

export async function recordCloseCertificationInvalidation(
  organizationId: string,
  input: CloseCertificationInvalidationInput,
  control: ExportClosePackControl = {},
): Promise<CloseCertificationInvalidationResult> {
  return db.$transaction((tx) =>
    recordCloseCertificationInvalidationInTx(
      tx,
      organizationId,
      input,
      control,
    ),
  );
}

type CloseInvalidationTarget = {
  closeRunId: string;
  closePackExportId: string | null;
};

async function closeInvalidationTargetsInTx(
  tx: Prisma.TransactionClient,
  organizationId: string,
  input: RecordCloseCertificationInvalidationsForSourceInput,
): Promise<CloseInvalidationTarget[]> {
  if (input.closeRunId) {
    return [
      {
        closeRunId: input.closeRunId,
        closePackExportId: input.closePackExportId ?? null,
      },
    ];
  }

  const periodStart = dateOrNull(input.periodStart);
  const periodEnd = dateOrNull(input.periodEnd);
  const periodFilters: Prisma.CloseRunWhereInput[] = [];

  if (input.periodId) periodFilters.push({ periodId: input.periodId });
  if (periodStart && periodEnd) {
    periodFilters.push({
      period: {
        startDate: { lte: periodEnd },
        endDate: { gte: periodStart },
      },
    });
  } else if (periodStart) {
    periodFilters.push({ period: { endDate: { gte: periodStart } } });
  } else if (periodEnd) {
    periodFilters.push({ period: { startDate: { lte: periodEnd } } });
  }

  if (periodFilters.length === 0) return [];

  const runs = await tx.closeRun.findMany({
    where: {
      organizationId,
      AND: [
        { OR: periodFilters },
        {
          OR: [
            { status: CloseRunStatus.CERTIFIED },
            { packExports: { some: { isCertified: true } } },
          ],
        },
      ],
    },
    select: {
      id: true,
      packExports: {
        where: { isCertified: true },
        orderBy: { exportedAt: "desc" },
        take: 1,
        select: { id: true },
      },
    },
  });

  return runs.map((run) => ({
    closeRunId: run.id,
    closePackExportId:
      input.closePackExportId ?? run.packExports[0]?.id ?? null,
  }));
}

export async function recordCloseCertificationInvalidationsForSourceInTx(
  tx: Prisma.TransactionClient,
  organizationId: string,
  input: RecordCloseCertificationInvalidationsForSourceInput,
  control: ExportClosePackControl = {},
): Promise<RecordCloseCertificationInvalidationsForSourceResult> {
  const source = CLOSE_CERTIFICATION_INVALIDATION_SOURCES[input.sourceCode];
  const targets = await closeInvalidationTargetsInTx(tx, organizationId, input);
  const results: CloseCertificationInvalidationResult[] = [];

  for (const target of targets) {
    results.push(
      await recordCloseCertificationInvalidationInTx(
        tx,
        organizationId,
        {
          closeRunId: target.closeRunId,
          closePackExportId: target.closePackExportId,
          sourceCode: source.sourceCode,
          sourceModel: source.sourceModel,
          sourceId: input.sourceId ?? null,
          sourceEventName: source.sourceEventName,
          staleReason: input.staleReason,
          previousEvidenceHash: input.previousEvidenceHash ?? null,
          newEvidenceHash: input.newEvidenceHash ?? null,
          correlationId: input.correlationId ?? null,
        },
        control,
      ),
    );
  }

  return {
    invalidatedCount: results.length,
    results,
  };
}

export async function recordCloseCertificationInvalidationsForSource(
  organizationId: string,
  input: RecordCloseCertificationInvalidationsForSourceInput,
  control: ExportClosePackControl = {},
): Promise<RecordCloseCertificationInvalidationsForSourceResult> {
  return db.$transaction((tx) =>
    recordCloseCertificationInvalidationsForSourceInTx(
      tx,
      organizationId,
      input,
      control,
    ),
  );
}

export async function exportClosePack(
  organizationId: string,
  input: ExportClosePackInput,
  control: ExportClosePackControl = {},
): Promise<ClosePackExportResult> {
  const now = control.now ? new Date(control.now) : new Date();
  const mode = exportMode(input);
  const correlationId = input.correlationId ?? randomUUID();
  const exportId = randomUUID();

  assertExportPermission(mode, control);
  if (mode === "CERTIFIED") requireFreshControl(control, now);

  return db.$transaction(async (tx) => {
    const run = await loadCloseRunForPack(organizationId, input.closeRunId, tx);
    if (!run) throw new NotFoundError("Close run not found");

    if (
      mode === "CERTIFIED" &&
      control.actorId &&
      run.runById === control.actorId
    ) {
      throw new BusinessRuleError(
        "The close runner cannot certify the same close pack.",
      );
    }

    const generatedAt = now.toISOString();
    const inventoryFreshness = await evaluateInventoryAnnexFreshness(
      run,
      tx,
      generatedAt,
    );
    const pilotCertification = await loadPilotCertificationEvidenceForCloseRun(
      run,
      tx,
    );
    const blockers = certificationBlockers(
      run,
      inventoryFreshness,
      pilotCertification,
    );
    if (mode === "CERTIFIED" && blockers.length > 0) {
      if (inventoryFreshness.status !== "FRESH") {
        await recordInvalidationEvidenceInTx(
          tx,
          run,
          {
            closeRunId: run.id,
            sourceModel: inventoryFreshness.sourceModel,
            sourceId: inventoryFreshness.sourceId,
            sourceEventName: inventoryFreshness.sourceEventName,
            staleReason:
              inventoryFreshness.staleReason ??
              inventoryFreshness.certificationBlocker ??
              "Close certification evidence is stale.",
            previousEvidenceHash: inventoryFreshness.previousEvidenceHash,
            newEvidenceHash: inventoryFreshness.newEvidenceHash,
            correlationId,
          },
          control,
        );
      }
      throw new BusinessRuleError(
        `Certified close pack is blocked: ${blockers[0]}`,
      );
    }

    const rowCount =
      run.checklistItems.length +
      run.findings.length +
      run.evidenceItems.length +
      run.reviews.length +
      run.comments.length;
    const watermarkId = `close-pack-${mode.toLowerCase().replaceAll("_", "-")}-${run.id}-${exportId.slice(0, 12)}`;
    const redactionNote =
      "Secrets, raw provider payloads, credentials, and tenant internals are excluded from this close pack.";
    const payload = buildClosePackPayload(run, {
      exportId,
      mode,
      generatedAt,
      generatedById: control.actorId ?? null,
      watermarkId,
      correlationId,
      redactionNote,
      certificationLimitations: certificationLimitations(mode),
      certificationBlockers: blockers,
      inventoryFreshness,
      pilotCertification,
    });
    const contentHash = sha256(stableStringify(payload));
    const content = JSON.stringify(
      { ...payload, export: { ...payload.export, contentHash } },
      null,
      2,
    );
    const fileName = `${watermarkId}.json`;
    const isCertified = mode === "CERTIFIED";

    const closePackExport = await tx.closePackExport.create({
      data: {
        organizationId,
        periodId: run.periodId,
        closeRunId: run.id,
        fileType: "json",
        watermarkId,
        contentHash,
        rowCount,
        isCertified,
        exportedById: control.actorId ?? null,
        exportedAt: now,
        correlationId,
        metadata: jsonObject({
          mode,
          trustLevel:
            typeof run.metadata === "object" &&
            run.metadata &&
            !Array.isArray(run.metadata)
              ? (run.metadata as Record<string, unknown>).trustLevel
              : null,
          certificationBlockers: blockers,
          inventoryValuationAnnex: inventoryFreshness.savedAnnex,
          inventoryAnnexFreshness: {
            status: inventoryFreshness.status,
            staleReason: inventoryFreshness.staleReason,
            previousEvidenceHash: inventoryFreshness.previousEvidenceHash,
            newEvidenceHash: inventoryFreshness.newEvidenceHash,
            detectedAt: inventoryFreshness.detectedAt,
          },
          pilotCycleCertification: pilotCertification.annex,
          statutoryCertification: statutoryCertificationBlockerMetadata(),
          redactionNote,
        }),
      },
    });

    if (inventoryFreshness.status !== "FRESH") {
      await recordInvalidationEvidenceInTx(
        tx,
        run,
        {
          closeRunId: run.id,
          closePackExportId: closePackExport.id,
          sourceModel: inventoryFreshness.sourceModel,
          sourceId: inventoryFreshness.sourceId,
          sourceEventName: inventoryFreshness.sourceEventName,
          staleReason:
            inventoryFreshness.staleReason ??
            inventoryFreshness.certificationBlocker ??
            "Close certification evidence is stale.",
          previousEvidenceHash: inventoryFreshness.previousEvidenceHash,
          newEvidenceHash: inventoryFreshness.newEvidenceHash,
          correlationId,
        },
        control,
      );
    }

    if (isCertified) {
      const existingMetadata = metadataRecord(run.metadata);
      await tx.closeRun.update({
        where: { id: run.id },
        data: {
          status: CloseRunStatus.CERTIFIED,
          metadata: jsonObject({
            ...existingMetadata,
            previousMetadata: run.metadata,
            certifiedExportId: closePackExport.id,
            certifiedContentHash: contentHash,
            certifiedAt: generatedAt,
            certifiedById: control.actorId ?? null,
            certificationLimitations: certificationLimitations(mode),
            inventoryAnnexFreshness: {
              status: inventoryFreshness.status,
              detectedAt: inventoryFreshness.detectedAt,
              previousEvidenceHash: inventoryFreshness.previousEvidenceHash,
              newEvidenceHash: inventoryFreshness.newEvidenceHash,
            },
            pilotCycleCertification: pilotCertification.annex,
            statutoryCertification: statutoryCertificationBlockerMetadata(),
          }),
        },
      });
    }

    await tx.ledgerAuditEvent.create({
      data: {
        organizationId,
        actorId: control.actorId ?? null,
        action: isCertified
          ? "CLOSE_PACK_CERTIFIED_EXPORT"
          : "CLOSE_PACK_DRAFT_EXPORT",
        resourceType: "ClosePackExport",
        resourceId: closePackExport.id,
        message: `Close pack ${watermarkId} exported`,
        metadata: jsonObject({
          closeRunId: run.id,
          periodId: run.periodId,
          mode,
          contentHash,
          watermarkId,
          rowCount,
          correlationId,
          certificationBlockers: blockers,
          inventoryAnnexFreshness: {
            status: inventoryFreshness.status,
            staleReason: inventoryFreshness.staleReason,
            previousEvidenceHash: inventoryFreshness.previousEvidenceHash,
            newEvidenceHash: inventoryFreshness.newEvidenceHash,
            detectedAt: inventoryFreshness.detectedAt,
          },
          pilotCycleCertification: pilotCertification.annex,
          statutoryCertification: statutoryCertificationBlockerMetadata(),
        }),
      },
    });

    return {
      exportId: closePackExport.id,
      closeRunId: run.id,
      periodId: run.periodId,
      fileName,
      mimeType: "application/json",
      content,
      contentHash,
      watermarkId,
      mode,
      isCertified,
      rowCount,
      generatedAt,
      correlationId,
      redactionNote,
      certificationLimitations: certificationLimitations(mode),
    };
  });
}
