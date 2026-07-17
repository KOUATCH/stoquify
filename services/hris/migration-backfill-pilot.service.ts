import { createHash } from "crypto";
import {
  PayrollAttendanceSnapshotStatus,
  PayrollContractStatus,
  PayrollEmployeeStatus,
  PayrollPaymentDestinationChangeStatus,
  PayrollRubriqueAssignmentStatus,
  PayrollRunStatus,
} from "@prisma/client";
import { z } from "zod";

import { db } from "../../prisma/db";
import { BusinessRuleError, NotFoundError } from "../_shared/action-errors";

type HrisMigrationClient = Pick<
  typeof db,
  | "organization"
  | "payrollEmployee"
  | "user"
  | "location"
  | "payrollContract"
  | "payrollEmployeeRubriqueAssignment"
  | "payrollPaymentDestinationChangeRequest"
  | "payrollAttendanceSnapshot"
  | "payrollRun"
  | "payrollRunLine"
  | "payrollPayslip"
  | "payrollDeclarationEvidence"
  | "payrollPaymentBatch"
  | "businessEvent"
  | "auditLog"
>;

const inputSchema = z.object({
  organizationId: z.string().trim().min(1),
  dryRun: z.boolean().default(true),
  maxEmployees: z.number().int().positive().max(10_000).default(2_000),
});

export type HrisMigrationBackfillPilotInput = z.input<typeof inputSchema>;

type GapSeverity = "BLOCKER" | "WARNING";

const GAP_CATALOG = {
  PILOT_SCAN_LIMIT_EXCEEDED: {
    severity: "BLOCKER",
    reason:
      "The tenant employee population exceeds the reviewed pilot scan limit.",
    correction:
      "Increase the reviewed batch plan or split the tenant into deterministic, non-overlapping batches before another dry run.",
  },
  EMPLOYEE_SOURCE_PROOF_MISSING: {
    severity: "BLOCKER",
    reason:
      "A compatibility employee row has no complete HRIS source-system, source-record, and source-hash proof.",
    correction:
      "Append reviewed HRIS source proof or classify the row as legacy-unverified; never invent historical identity facts.",
  },
  EMPLOYEE_DATE_RANGE_INVALID: {
    severity: "BLOCKER",
    reason: "An employee termination date precedes the hire date.",
    correction:
      "Create an approved employment-date correction with source evidence and retain the original audit history.",
  },
  EMPLOYEE_USER_UNMAPPED: {
    severity: "WARNING",
    reason: "An employee is not linked to a self-service user.",
    correction:
      "Link only after tenant membership and identity ownership are verified; an employee record may remain valid without self-service access.",
  },
  EMPLOYEE_USER_ORPHANED: {
    severity: "BLOCKER",
    reason: "An employee references a user record that does not exist.",
    correction:
      "Clear or replace the user link through an audited HRIS identity correction after ownership review.",
  },
  EMPLOYEE_USER_CROSS_TENANT: {
    severity: "BLOCKER",
    reason: "An employee references a user owned by another tenant.",
    correction:
      "Remove the cross-tenant link and create a tenant-owned identity mapping through the approved correction workflow.",
  },
  EMPLOYEE_LOCATION_ORPHANED: {
    severity: "BLOCKER",
    reason: "An employee references a location that does not exist.",
    correction:
      "Replace the location link with a reviewed tenant location assignment and preserve the prior value in redacted audit evidence.",
  },
  EMPLOYEE_LOCATION_CROSS_TENANT: {
    severity: "BLOCKER",
    reason: "An employee references a location owned by another tenant.",
    correction:
      "Remove the cross-tenant assignment and append an approved tenant-scoped location correction.",
  },
  CONTRACT_CROSS_TENANT: {
    severity: "BLOCKER",
    reason:
      "A contract linked to a pilot employee carries a different tenant identifier.",
    correction:
      "Quarantine the row and repair ownership through a reviewed correction; do not rewrite payroll history.",
  },
  CONTRACT_DATE_RANGE_INVALID: {
    severity: "BLOCKER",
    reason: "A contract effective end date precedes its effective start date.",
    correction:
      "Append an approved contract-date correction backed by signed source evidence.",
  },
  ACTIVE_CONTRACT_OVERLAP: {
    severity: "BLOCKER",
    reason: "An employee has overlapping active contract ranges.",
    correction:
      "Resolve the ranges through contract supersession or an approved effective-date correction before adoption.",
  },
  ACTIVE_EMPLOYEE_CONTRACT_MISSING: {
    severity: "BLOCKER",
    reason: "An active employee has no active contract.",
    correction:
      "Create or activate a reviewed contract with maker-checker and signed-document proof; do not infer salary terms.",
  },
  ACTIVE_CONTRACT_DOCUMENT_PROOF_MISSING: {
    severity: "BLOCKER",
    reason: "An active contract lacks governed signed-document evidence.",
    correction:
      "Capture and approve signed-document evidence under retention, malware-scan, and legal-hold controls.",
  },
  ACTIVE_CONTRACT_APPROVAL_PROOF_MISSING: {
    severity: "BLOCKER",
    reason: "An active contract lacks HRIS maker-checker activation proof.",
    correction:
      "Re-review the legacy activation and append approval and activation business-event evidence without rewriting the contract.",
  },
  ACTIVE_COMPENSATION_MISSING: {
    severity: "BLOCKER",
    reason: "An active employee has no active compensation assignment.",
    correction:
      "Create an approved compensation assignment from reviewed source evidence; never derive salary from a payslip or run line.",
  },
  ACTIVE_COMPENSATION_EVIDENCE_MISSING: {
    severity: "BLOCKER",
    reason:
      "An active compensation assignment has no source evidence document hash.",
    correction:
      "Append reviewed compensation evidence before the assignment can become HRIS-owned truth.",
  },
  ACTIVE_COMPENSATION_APPROVAL_PROOF_MISSING: {
    severity: "BLOCKER",
    reason:
      "An active compensation assignment lacks maker-checker approval proof.",
    correction:
      "Re-review the legacy assignment and append approval evidence and a business event; do not edit historical payroll outputs.",
  },
  COMPENSATION_CROSS_TENANT: {
    severity: "BLOCKER",
    reason:
      "A compensation assignment linked to a pilot employee carries a different tenant identifier.",
    correction:
      "Quarantine the assignment and append a tenant-ownership correction backed by source evidence.",
  },
  PAYMENT_DESTINATION_MISSING: {
    severity: "BLOCKER",
    reason: "An active employee has no payment-destination proof hash.",
    correction:
      "Use the sensitive payment-destination approval workflow; never backfill raw bank or mobile-money values from free text.",
  },
  PAYMENT_DESTINATION_APPLIED_PROOF_MISSING: {
    severity: "BLOCKER",
    reason:
      "The current payment destination is not tied to a complete applied approval record.",
    correction:
      "Reconcile the destination hash to an applied request with document, approval, and business-event proof.",
  },
  PAYMENT_DESTINATION_SOD_INVALID: {
    severity: "BLOCKER",
    reason:
      "Payment-destination requester, approver, or applier separation is invalid.",
    correction:
      "Re-review under an approved maker-checker-applier matrix and append correction evidence; do not erase the legacy request.",
  },
  PAYMENT_DESTINATION_CROSS_TENANT: {
    severity: "BLOCKER",
    reason:
      "A payment-destination request linked to a pilot employee carries a different tenant identifier.",
    correction:
      "Quarantine the request and reconcile only through the tenant-scoped sensitive-data workflow.",
  },
  ATTENDANCE_CROSS_TENANT: {
    severity: "BLOCKER",
    reason:
      "An attendance snapshot linked to a pilot employee carries a different tenant identifier.",
    correction:
      "Quarantine the snapshot and append a tenant-scoped correction with explicit source lineage.",
  },
  FROZEN_ATTENDANCE_DUPLICATE: {
    severity: "BLOCKER",
    reason:
      "More than one frozen attendance snapshot exists for an employee and effective period.",
    correction:
      "Supersede by correction with explicit lineage and preserve every prior snapshot.",
  },
  ACTIVE_PAYROLL_RUN_DUPLICATE: {
    severity: "BLOCKER",
    reason:
      "More than one non-terminal payroll run exists for the same period and run type.",
    correction:
      "Cancel or supersede the duplicate through the payroll correction workflow before HRIS cutover.",
  },
  IMMUTABLE_EVIDENCE_CHANGED_DURING_DRY_RUN: {
    severity: "BLOCKER",
    reason:
      "Immutable payroll or audit evidence counts changed while the read-only pilot was running.",
    correction:
      "Repeat the pilot from a stable tenant snapshot and reconcile the concurrent change before signoff.",
  },
} as const satisfies Record<
  string,
  { severity: GapSeverity; reason: string; correction: string }
>;

export type HrisMigrationGapCode = keyof typeof GAP_CATALOG;

export type HrisMigrationGap = {
  code: HrisMigrationGapCode;
  severity: GapSeverity;
  count: number;
  reason: string;
};

export type HrisMigrationCorrectionStep = {
  code: HrisMigrationGapCode;
  operation: "APPEND_CORRECTION" | "REVIEW_ONLY";
  count: number;
  idempotencyKey: string;
  instruction: string;
};

export type HrisMigrationBackfillPilotPlan = {
  generatedAt: string;
  dryRunOnly: true;
  mutationModeAvailable: false;
  status: "BLOCKED" | "READY_FOR_OWNER_SIGNOFF";
  organizationRef: string;
  compatibilityStorage: "PayrollEmployee_and_related_payroll_source_tables";
  targetOwnership: "HRIS_PEOPLE_CORE";
  scan: {
    requestedMaxEmployees: number;
    scannedEmployees: number;
    truncated: boolean;
    sourceCounts: {
      employees: number;
      contracts: number;
      compensationAssignments: number;
      paymentDestinationRequests: number;
      attendanceSnapshots: number;
      payrollRuns: number;
    };
    projectionCounts: {
      adoptable: number;
      legacyUnverified: number;
    };
  };
  gaps: HrisMigrationGap[];
  blockerCount: number;
  warningCount: number;
  correctionPlan: HrisMigrationCorrectionStep[];
  evidence: {
    sourceProjectionHash: string;
    correctionPlanHash: string;
    immutableEvidenceHashBefore: string;
    immutableEvidenceHashAfter: string;
    reconciliationHash: string;
    planHash: string;
  };
  rollbackSimulation: {
    strategy: "CORRECTION_ONLY";
    mutationCount: 0;
    destructiveOperations: 0;
    immutableEvidencePreserved: boolean;
    result: "NO_OP_DRY_RUN" | "BLOCKED_BY_CONCURRENT_CHANGE";
  };
  closePack: {
    status: "BLOCKED" | "PENDING_OWNER_SIGNOFF";
    requiredSignoffs: Array<{
      role:
        | "hr-owner"
        | "payroll-owner"
        | "accounting-controller"
        | "security-privacy"
        | "operations-owner";
      status: "PENDING";
    }>;
  };
  redaction: {
    rawPersonDataIncluded: false;
    rawSalaryIncluded: false;
    rawPaymentDestinationIncluded: false;
    rawDocumentContentIncluded: false;
    rawProofHashesIncluded: false;
  };
};

type GapCounts = Map<HrisMigrationGapCode, number>;

const NON_TERMINAL_RUN_STATUSES = new Set<PayrollRunStatus>([
  PayrollRunStatus.DRAFT,
  PayrollRunStatus.CALCULATED,
  PayrollRunStatus.REVIEWED,
  PayrollRunStatus.APPROVED,
  PayrollRunStatus.EMITTED,
]);

function metadataRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, canonicalize(child)]),
  );
}

function digest(value: unknown) {
  return `sha256:${createHash("sha256")
    .update(JSON.stringify(canonicalize(value)))
    .digest("hex")}`;
}

function redactedRef(kind: string, id: string) {
  return `${kind}:${createHash("sha256").update(id).digest("hex").slice(0, 16)}`;
}

function increment(gaps: GapCounts, code: HrisMigrationGapCode, count = 1) {
  gaps.set(code, (gaps.get(code) ?? 0) + count);
}

function hasEmployeeSourceProof(metadata: unknown) {
  const source = metadataRecord(metadataRecord(metadata).hrSourceData);
  return [source.sourceSystem, source.sourceRecordId, source.sourceHash].every(
    (value) => typeof value === "string" && value.trim().length > 0,
  );
}

function hasApprovedContractDocument(
  metadata: unknown,
  signedDocumentHash: string | null,
) {
  if (!signedDocumentHash) return false;
  const current = metadataRecord(
    metadataRecord(metadataRecord(metadata).hrisDocumentEvidence).current,
  );
  return (
    current.status === "APPROVED" &&
    current.artifactHash === signedDocumentHash &&
    typeof current.approvalBusinessEventId === "string" &&
    current.approvalBusinessEventId.length > 0
  );
}

function hasApprovedContractActivation(
  metadata: unknown,
  activatedBusinessEventId: string | null,
) {
  const latest = metadataRecord(
    metadataRecord(metadataRecord(metadata).hrisContractApproval).latest,
  );
  return latest.status === "APPROVED" && Boolean(activatedBusinessEventId);
}

function hasApprovedCompensation(
  metadata: unknown,
  approvalBusinessEventId: string | null,
) {
  const latest = metadataRecord(
    metadataRecord(metadataRecord(metadata).hrisCompensationApproval).latest,
  );
  return latest.status === "APPROVED" && Boolean(approvalBusinessEventId);
}

function rangesOverlap(
  left: { effectiveFrom: Date; effectiveTo: Date | null },
  right: { effectiveFrom: Date; effectiveTo: Date | null },
) {
  const leftEnd = left.effectiveTo?.getTime() ?? Number.POSITIVE_INFINITY;
  const rightEnd = right.effectiveTo?.getTime() ?? Number.POSITIVE_INFINITY;
  return (
    left.effectiveFrom.getTime() <= rightEnd &&
    right.effectiveFrom.getTime() <= leftEnd
  );
}

async function immutableEvidenceCounts(
  client: HrisMigrationClient,
  organizationId: string,
) {
  const [
    runLines,
    payslips,
    declarationEvidence,
    paymentBatches,
    businessEvents,
    auditLogs,
  ] = await Promise.all([
    client.payrollRunLine.count({ where: { organizationId } }),
    client.payrollPayslip.count({ where: { organizationId } }),
    client.payrollDeclarationEvidence.count({ where: { organizationId } }),
    client.payrollPaymentBatch.count({ where: { organizationId } }),
    client.businessEvent.count({ where: { organizationId } }),
    client.auditLog.count({ where: { organizationId } }),
  ]);
  return {
    runLines,
    payslips,
    declarationEvidence,
    paymentBatches,
    businessEvents,
    auditLogs,
  };
}

function toGapList(gaps: GapCounts): HrisMigrationGap[] {
  return Array.from(gaps.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([code, count]) => ({
      code,
      severity: GAP_CATALOG[code].severity,
      count,
      reason: GAP_CATALOG[code].reason,
    }));
}

function toCorrectionPlan(organizationRef: string, gaps: HrisMigrationGap[]) {
  return gaps.map(
    (gap): HrisMigrationCorrectionStep => ({
      code: gap.code,
      operation:
        gap.severity === "BLOCKER" ? "APPEND_CORRECTION" : "REVIEW_ONLY",
      count: gap.count,
      idempotencyKey: redactedRef(
        "hris-migration-correction",
        `${organizationRef}:${gap.code}:${gap.count}`,
      ),
      instruction: GAP_CATALOG[gap.code].correction,
    }),
  );
}

export async function generateHrisMigrationBackfillPilotPlan(
  input: HrisMigrationBackfillPilotInput,
  client: HrisMigrationClient = db,
): Promise<HrisMigrationBackfillPilotPlan> {
  const parsed = inputSchema.parse(input);
  if (!parsed.dryRun) {
    throw new BusinessRuleError(
      "HRIS migration mutation mode is intentionally unavailable until dry-run, reconciliation, correction, and owner signoff are complete.",
    );
  }

  const organization = await client.organization.findUnique({
    where: { id: parsed.organizationId },
    select: { id: true },
  });
  if (!organization)
    throw new NotFoundError("HRIS migration pilot tenant was not found.");

  const organizationRef = redactedRef("organization", organization.id);
  const immutableBefore = await immutableEvidenceCounts(
    client,
    parsed.organizationId,
  );
  const employeesWithOverflow = await client.payrollEmployee.findMany({
    where: { organizationId: parsed.organizationId },
    orderBy: { id: "asc" },
    take: parsed.maxEmployees + 1,
    select: {
      id: true,
      userId: true,
      status: true,
      hireDate: true,
      terminationDate: true,
      locationId: true,
      paymentDestinationHash: true,
      metadata: true,
    },
  });
  const truncated = employeesWithOverflow.length > parsed.maxEmployees;
  const employees = employeesWithOverflow.slice(0, parsed.maxEmployees);
  const employeeIds = employees.map((employee) => employee.id);
  const userIds = employees.flatMap((employee) =>
    employee.userId ? [employee.userId] : [],
  );
  const locationIds = employees.flatMap((employee) =>
    employee.locationId ? [employee.locationId] : [],
  );

  const [
    users,
    locations,
    contracts,
    assignments,
    paymentRequests,
    attendanceSnapshots,
    payrollRuns,
  ] = await Promise.all([
    client.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, organizationId: true, isActive: true },
    }),
    client.location.findMany({
      where: { id: { in: locationIds } },
      select: { id: true, organizationId: true, isActive: true },
    }),
    client.payrollContract.findMany({
      where: { employeeId: { in: employeeIds }, deletedAt: null },
      orderBy: [{ employeeId: "asc" }, { effectiveFrom: "asc" }, { id: "asc" }],
      select: {
        id: true,
        organizationId: true,
        employeeId: true,
        status: true,
        effectiveFrom: true,
        effectiveTo: true,
        signedDocumentHash: true,
        activatedBusinessEventId: true,
        metadata: true,
      },
    }),
    client.payrollEmployeeRubriqueAssignment.findMany({
      where: { employeeId: { in: employeeIds }, deletedAt: null },
      orderBy: [{ employeeId: "asc" }, { effectiveFrom: "asc" }, { id: "asc" }],
      select: {
        id: true,
        organizationId: true,
        employeeId: true,
        status: true,
        effectiveFrom: true,
        effectiveTo: true,
        evidenceDocumentHash: true,
        approvalBusinessEventId: true,
        metadata: true,
      },
    }),
    client.payrollPaymentDestinationChangeRequest.findMany({
      where: { employeeId: { in: employeeIds }, deletedAt: null },
      orderBy: [{ employeeId: "asc" }, { requestedAt: "desc" }, { id: "asc" }],
      select: {
        id: true,
        organizationId: true,
        employeeId: true,
        status: true,
        paymentDestinationHash: true,
        requestedById: true,
        approvedById: true,
        appliedById: true,
        evidenceDocumentHash: true,
        approvalEvidenceHash: true,
        appliedBusinessEventId: true,
      },
    }),
    client.payrollAttendanceSnapshot.findMany({
      where: { employeeId: { in: employeeIds } },
      orderBy: [{ employeeId: "asc" }, { periodStart: "asc" }, { id: "asc" }],
      select: {
        id: true,
        organizationId: true,
        employeeId: true,
        status: true,
        periodStart: true,
        periodEnd: true,
      },
    }),
    client.payrollRun.findMany({
      where: { organizationId: parsed.organizationId, deletedAt: null },
      orderBy: [{ payrollPeriodId: "asc" }, { runType: "asc" }, { id: "asc" }],
      select: {
        id: true,
        payrollPeriodId: true,
        runType: true,
        status: true,
      },
    }),
  ]);

  const gaps: GapCounts = new Map();
  if (truncated) increment(gaps, "PILOT_SCAN_LIMIT_EXCEEDED");

  const usersById = new Map(users.map((user) => [user.id, user]));
  const locationsById = new Map(
    locations.map((location) => [location.id, location]),
  );
  const contractsByEmployee = new Map<string, typeof contracts>();
  const assignmentsByEmployee = new Map<string, typeof assignments>();
  const requestsByEmployee = new Map<string, typeof paymentRequests>();
  for (const contract of contracts) {
    const items = contractsByEmployee.get(contract.employeeId) ?? [];
    items.push(contract);
    contractsByEmployee.set(contract.employeeId, items);
  }
  for (const assignment of assignments) {
    const items = assignmentsByEmployee.get(assignment.employeeId) ?? [];
    items.push(assignment);
    assignmentsByEmployee.set(assignment.employeeId, items);
  }
  for (const request of paymentRequests) {
    const items = requestsByEmployee.get(request.employeeId) ?? [];
    items.push(request);
    requestsByEmployee.set(request.employeeId, items);
  }

  const canonicalEmployees = employees.map((employee) => {
    let legacyUnverified = false;
    const flag = (code: HrisMigrationGapCode) => {
      increment(gaps, code);
      if (GAP_CATALOG[code].severity === "BLOCKER") legacyUnverified = true;
    };

    if (!hasEmployeeSourceProof(employee.metadata))
      flag("EMPLOYEE_SOURCE_PROOF_MISSING");
    if (
      employee.terminationDate &&
      employee.terminationDate < employee.hireDate
    ) {
      flag("EMPLOYEE_DATE_RANGE_INVALID");
    }

    if (!employee.userId) {
      flag("EMPLOYEE_USER_UNMAPPED");
    } else {
      const user = usersById.get(employee.userId);
      if (!user) flag("EMPLOYEE_USER_ORPHANED");
      else if (user.organizationId !== parsed.organizationId)
        flag("EMPLOYEE_USER_CROSS_TENANT");
    }

    if (employee.locationId) {
      const location = locationsById.get(employee.locationId);
      if (!location) flag("EMPLOYEE_LOCATION_ORPHANED");
      else if (location.organizationId !== parsed.organizationId)
        flag("EMPLOYEE_LOCATION_CROSS_TENANT");
    }

    const employeeContracts = contractsByEmployee.get(employee.id) ?? [];
    const activeContracts = employeeContracts.filter(
      (contract) => contract.status === PayrollContractStatus.ACTIVE,
    );
    for (const contract of employeeContracts) {
      if (contract.organizationId !== parsed.organizationId)
        flag("CONTRACT_CROSS_TENANT");
      if (
        contract.effectiveTo &&
        contract.effectiveTo < contract.effectiveFrom
      ) {
        flag("CONTRACT_DATE_RANGE_INVALID");
      }
    }
    for (let index = 0; index < activeContracts.length; index += 1) {
      for (let other = index + 1; other < activeContracts.length; other += 1) {
        if (rangesOverlap(activeContracts[index], activeContracts[other])) {
          flag("ACTIVE_CONTRACT_OVERLAP");
        }
      }
    }
    if (
      employee.status === PayrollEmployeeStatus.ACTIVE &&
      activeContracts.length === 0
    ) {
      flag("ACTIVE_EMPLOYEE_CONTRACT_MISSING");
    }
    for (const contract of activeContracts) {
      if (
        !hasApprovedContractDocument(
          contract.metadata,
          contract.signedDocumentHash,
        )
      ) {
        flag("ACTIVE_CONTRACT_DOCUMENT_PROOF_MISSING");
      }
      if (
        !hasApprovedContractActivation(
          contract.metadata,
          contract.activatedBusinessEventId,
        )
      ) {
        flag("ACTIVE_CONTRACT_APPROVAL_PROOF_MISSING");
      }
    }

    const activeAssignments = (
      assignmentsByEmployee.get(employee.id) ?? []
    ).filter(
      (assignment) =>
        assignment.status === PayrollRubriqueAssignmentStatus.ACTIVE,
    );
    for (const assignment of assignmentsByEmployee.get(employee.id) ?? []) {
      if (assignment.organizationId !== parsed.organizationId) {
        flag("COMPENSATION_CROSS_TENANT");
      }
    }
    if (
      employee.status === PayrollEmployeeStatus.ACTIVE &&
      activeAssignments.length === 0
    ) {
      flag("ACTIVE_COMPENSATION_MISSING");
    }
    for (const assignment of activeAssignments) {
      if (!assignment.evidenceDocumentHash)
        flag("ACTIVE_COMPENSATION_EVIDENCE_MISSING");
      if (
        !hasApprovedCompensation(
          assignment.metadata,
          assignment.approvalBusinessEventId,
        )
      ) {
        flag("ACTIVE_COMPENSATION_APPROVAL_PROOF_MISSING");
      }
    }

    if (
      employee.status === PayrollEmployeeStatus.ACTIVE &&
      !employee.paymentDestinationHash
    ) {
      flag("PAYMENT_DESTINATION_MISSING");
    }
    if (employee.paymentDestinationHash) {
      for (const request of requestsByEmployee.get(employee.id) ?? []) {
        if (request.organizationId !== parsed.organizationId) {
          flag("PAYMENT_DESTINATION_CROSS_TENANT");
        }
      }
      const applied = (requestsByEmployee.get(employee.id) ?? []).find(
        (request) =>
          request.organizationId === parsed.organizationId &&
          request.status === PayrollPaymentDestinationChangeStatus.APPLIED &&
          request.paymentDestinationHash === employee.paymentDestinationHash,
      );
      if (
        !applied ||
        !applied.evidenceDocumentHash ||
        !applied.approvalEvidenceHash ||
        !applied.appliedBusinessEventId
      ) {
        flag("PAYMENT_DESTINATION_APPLIED_PROOF_MISSING");
      } else if (
        applied.requestedById === applied.approvedById ||
        applied.requestedById === applied.appliedById ||
        applied.approvedById === applied.appliedById
      ) {
        flag("PAYMENT_DESTINATION_SOD_INVALID");
      }
    }

    return {
      employeeRef: redactedRef("employee", employee.id),
      status: employee.status,
      sourceProof: hasEmployeeSourceProof(employee.metadata)
        ? "VERIFIED"
        : "LEGACY_UNVERIFIED",
      userMapping: !employee.userId
        ? "UNMAPPED"
        : usersById.get(employee.userId)?.organizationId ===
            parsed.organizationId
          ? "TENANT_LINKED"
          : "INVALID",
      locationMapping: !employee.locationId
        ? "UNASSIGNED"
        : locationsById.get(employee.locationId)?.organizationId ===
            parsed.organizationId
          ? "TENANT_LINKED"
          : "INVALID",
      activeContractCount: activeContracts.length,
      activeCompensationCount: activeAssignments.length,
      paymentDestinationProofPresent: Boolean(employee.paymentDestinationHash),
      adoption: legacyUnverified ? "LEGACY_UNVERIFIED" : "ADOPTABLE",
    };
  });

  const frozenGroups = new Map<string, number>();
  for (const snapshot of attendanceSnapshots) {
    if (snapshot.organizationId !== parsed.organizationId) {
      increment(gaps, "ATTENDANCE_CROSS_TENANT");
      continue;
    }
    if (snapshot.status !== PayrollAttendanceSnapshotStatus.FROZEN) continue;
    const key = [
      snapshot.employeeId,
      snapshot.periodStart.toISOString(),
      snapshot.periodEnd.toISOString(),
    ].join(":");
    frozenGroups.set(key, (frozenGroups.get(key) ?? 0) + 1);
  }
  for (const count of frozenGroups.values()) {
    if (count > 1) increment(gaps, "FROZEN_ATTENDANCE_DUPLICATE", count - 1);
  }

  const activeRunGroups = new Map<string, number>();
  for (const run of payrollRuns) {
    if (!NON_TERMINAL_RUN_STATUSES.has(run.status)) continue;
    const key = `${run.payrollPeriodId}:${run.runType}`;
    activeRunGroups.set(key, (activeRunGroups.get(key) ?? 0) + 1);
  }
  for (const count of activeRunGroups.values()) {
    if (count > 1) increment(gaps, "ACTIVE_PAYROLL_RUN_DUPLICATE", count - 1);
  }

  const immutableAfter = await immutableEvidenceCounts(
    client,
    parsed.organizationId,
  );
  const immutableEvidencePreserved =
    digest(immutableBefore) === digest(immutableAfter);
  if (!immutableEvidencePreserved)
    increment(gaps, "IMMUTABLE_EVIDENCE_CHANGED_DURING_DRY_RUN");

  const gapList = toGapList(gaps);
  const correctionPlan = toCorrectionPlan(organizationRef, gapList);
  const blockerCount = gapList
    .filter((gap) => gap.severity === "BLOCKER")
    .reduce((total, gap) => total + gap.count, 0);
  const warningCount = gapList
    .filter((gap) => gap.severity === "WARNING")
    .reduce((total, gap) => total + gap.count, 0);
  const sourceProjection = canonicalEmployees.sort((left, right) =>
    left.employeeRef.localeCompare(right.employeeRef),
  );
  const sourceProjectionHash = digest(sourceProjection);
  const correctionPlanHash = digest(correctionPlan);
  const immutableEvidenceHashBefore = digest(immutableBefore);
  const immutableEvidenceHashAfter = digest(immutableAfter);
  const reconciliationHash = digest({
    sourceProjectionHash,
    correctionPlanHash,
    immutableEvidenceHashBefore,
    immutableEvidenceHashAfter,
    sourceCounts: {
      employees: employees.length,
      contracts: contracts.length,
      compensationAssignments: assignments.length,
      paymentDestinationRequests: paymentRequests.length,
      attendanceSnapshots: attendanceSnapshots.length,
      payrollRuns: payrollRuns.length,
    },
  });
  const planHash = digest({
    organizationRef,
    targetOwnership: "HRIS_PEOPLE_CORE",
    sourceProjectionHash,
    correctionPlanHash,
    reconciliationHash,
    gaps: gapList,
  });

  return {
    generatedAt: new Date().toISOString(),
    dryRunOnly: true,
    mutationModeAvailable: false,
    status: blockerCount > 0 ? "BLOCKED" : "READY_FOR_OWNER_SIGNOFF",
    organizationRef,
    compatibilityStorage: "PayrollEmployee_and_related_payroll_source_tables",
    targetOwnership: "HRIS_PEOPLE_CORE",
    scan: {
      requestedMaxEmployees: parsed.maxEmployees,
      scannedEmployees: employees.length,
      truncated,
      sourceCounts: {
        employees: employees.length,
        contracts: contracts.length,
        compensationAssignments: assignments.length,
        paymentDestinationRequests: paymentRequests.length,
        attendanceSnapshots: attendanceSnapshots.length,
        payrollRuns: payrollRuns.length,
      },
      projectionCounts: {
        adoptable: sourceProjection.filter(
          (employee) => employee.adoption === "ADOPTABLE",
        ).length,
        legacyUnverified: sourceProjection.filter(
          (employee) => employee.adoption === "LEGACY_UNVERIFIED",
        ).length,
      },
    },
    gaps: gapList,
    blockerCount,
    warningCount,
    correctionPlan,
    evidence: {
      sourceProjectionHash,
      correctionPlanHash,
      immutableEvidenceHashBefore,
      immutableEvidenceHashAfter,
      reconciliationHash,
      planHash,
    },
    rollbackSimulation: {
      strategy: "CORRECTION_ONLY",
      mutationCount: 0,
      destructiveOperations: 0,
      immutableEvidencePreserved,
      result: immutableEvidencePreserved
        ? "NO_OP_DRY_RUN"
        : "BLOCKED_BY_CONCURRENT_CHANGE",
    },
    closePack: {
      status: blockerCount > 0 ? "BLOCKED" : "PENDING_OWNER_SIGNOFF",
      requiredSignoffs: [
        { role: "hr-owner", status: "PENDING" },
        { role: "payroll-owner", status: "PENDING" },
        { role: "accounting-controller", status: "PENDING" },
        { role: "security-privacy", status: "PENDING" },
        { role: "operations-owner", status: "PENDING" },
      ],
    },
    redaction: {
      rawPersonDataIncluded: false,
      rawSalaryIncluded: false,
      rawPaymentDestinationIncluded: false,
      rawDocumentContentIncluded: false,
      rawProofHashesIncluded: false,
    },
  };
}

export function formatHrisMigrationBackfillPilotReport(
  plan: HrisMigrationBackfillPilotPlan,
) {
  const gaps = plan.gaps.length
    ? plan.gaps
        .map(
          (gap) =>
            `| ${gap.code} | ${gap.severity} | ${gap.count} | ${gap.reason} |`,
        )
        .join("\n")
    : "| None | - | 0 | No data-quality gaps detected. |";
  const corrections = plan.correctionPlan.length
    ? plan.correctionPlan
        .map(
          (step) =>
            `| ${step.code} | ${step.operation} | ${step.count} | ${step.idempotencyKey} | ${step.instruction} |`,
        )
        .join("\n")
    : "| None | REVIEW_ONLY | 0 | none | No correction steps required. |";
  const signoffs = plan.closePack.requiredSignoffs
    .map((signoff) => `- ${signoff.role}: ${signoff.status}`)
    .join("\n");

  return `# Stoquify HRIS Migration/Backfill Pilot Dry Run

Generated: ${plan.generatedAt}
Status: ${plan.status}
Dry-run only: yes
Mutation mode available: no

## Scope

- Organization: ${plan.organizationRef}
- Compatibility storage: ${plan.compatibilityStorage}
- Target ownership: ${plan.targetOwnership}
- Employee scan limit: ${plan.scan.requestedMaxEmployees}
- Employees scanned: ${plan.scan.scannedEmployees}
- Scan truncated: ${plan.scan.truncated}

## Reconciliation

- Employees: ${plan.scan.sourceCounts.employees}
- Contracts: ${plan.scan.sourceCounts.contracts}
- Compensation assignments: ${plan.scan.sourceCounts.compensationAssignments}
- Payment-destination requests: ${plan.scan.sourceCounts.paymentDestinationRequests}
- Attendance snapshots: ${plan.scan.sourceCounts.attendanceSnapshots}
- Payroll runs: ${plan.scan.sourceCounts.payrollRuns}
- Adoptable projections: ${plan.scan.projectionCounts.adoptable}
- Legacy-unverified projections: ${plan.scan.projectionCounts.legacyUnverified}
- Blockers: ${plan.blockerCount}
- Warnings: ${plan.warningCount}

## Data-Quality Gaps

| Code | Severity | Count | Reason |
| --- | --- | ---: | --- |
${gaps}

## Correction-Only Plan

| Gap | Operation | Count | Idempotency key | Instruction |
| --- | --- | ---: | --- | --- |
${corrections}

## Evidence

- Source projection hash: ${plan.evidence.sourceProjectionHash}
- Correction plan hash: ${plan.evidence.correctionPlanHash}
- Immutable evidence hash before: ${plan.evidence.immutableEvidenceHashBefore}
- Immutable evidence hash after: ${plan.evidence.immutableEvidenceHashAfter}
- Reconciliation hash: ${plan.evidence.reconciliationHash}
- Plan hash: ${plan.evidence.planHash}

## Rollback Simulation

- Strategy: ${plan.rollbackSimulation.strategy}
- Mutation count: ${plan.rollbackSimulation.mutationCount}
- Destructive operations: ${plan.rollbackSimulation.destructiveOperations}
- Immutable evidence preserved: ${plan.rollbackSimulation.immutableEvidencePreserved}
- Result: ${plan.rollbackSimulation.result}

## Pilot Close Pack

- Status: ${plan.closePack.status}
${signoffs}

## Redaction

- Raw person data included: ${plan.redaction.rawPersonDataIncluded}
- Raw salary included: ${plan.redaction.rawSalaryIncluded}
- Raw payment destination included: ${plan.redaction.rawPaymentDestinationIncluded}
- Raw document content included: ${plan.redaction.rawDocumentContentIncluded}
- Raw proof hashes included: ${plan.redaction.rawProofHashesIncluded}
`;
}
