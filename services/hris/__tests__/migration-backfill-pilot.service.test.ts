import {
  PayrollAttendanceSnapshotStatus,
  PayrollContractStatus,
  PayrollEmployeeStatus,
  PayrollPaymentDestinationChangeStatus,
  PayrollRubriqueAssignmentStatus,
  PayrollRunStatus,
  PayrollRunType,
} from "@prisma/client";

jest.mock("../../../prisma/db", () => ({ db: {} }));

import {
  formatHrisMigrationBackfillPilotReport,
  generateHrisMigrationBackfillPilotPlan,
} from "../migration-backfill-pilot.service";

const SOURCE_DATE = new Date("2026-01-01T00:00:00.000Z");
const PERIOD_END = new Date("2026-01-31T00:00:00.000Z");

function cleanEmployee() {
  return {
    id: "employee-private-1",
    userId: "user-private-1",
    status: PayrollEmployeeStatus.ACTIVE,
    hireDate: SOURCE_DATE,
    terminationDate: null,
    locationId: null,
    paymentDestinationHash: "sha256:private-payment-destination",
    metadata: {
      hrSourceData: {
        sourceSystem: "reviewed-legacy-hr",
        sourceRecordId: "private-source-record",
        sourceHash: "sha256:private-source-proof",
      },
    },
  };
}

function cleanContract() {
  return {
    id: "contract-private-1",
    organizationId: "org-1",
    employeeId: "employee-private-1",
    status: PayrollContractStatus.ACTIVE,
    effectiveFrom: SOURCE_DATE,
    effectiveTo: null,
    signedDocumentHash: "sha256:private-contract-document",
    activatedBusinessEventId: "event-contract-approved",
    metadata: {
      hrisDocumentEvidence: {
        current: {
          status: "APPROVED",
          artifactHash: "sha256:private-contract-document",
          approvalBusinessEventId: "event-document-approved",
        },
      },
      hrisContractApproval: { latest: { status: "APPROVED" } },
    },
  };
}

function cleanAssignment() {
  return {
    id: "assignment-private-1",
    organizationId: "org-1",
    employeeId: "employee-private-1",
    status: PayrollRubriqueAssignmentStatus.ACTIVE,
    effectiveFrom: SOURCE_DATE,
    effectiveTo: null,
    evidenceDocumentHash: "sha256:private-compensation-document",
    approvalBusinessEventId: "event-compensation-approved",
    metadata: {
      hrisCompensationApproval: { latest: { status: "APPROVED" } },
    },
  };
}

function cleanPaymentRequest() {
  return {
    id: "payment-request-private-1",
    organizationId: "org-1",
    employeeId: "employee-private-1",
    status: PayrollPaymentDestinationChangeStatus.APPLIED,
    paymentDestinationHash: "sha256:private-payment-destination",
    requestedById: "requester-1",
    approvedById: "approver-1",
    appliedById: "applier-1",
    evidenceDocumentHash: "sha256:private-payment-document",
    approvalEvidenceHash: "sha256:private-payment-approval",
    appliedBusinessEventId: "event-payment-applied",
  };
}

function buildClient() {
  const count = () => jest.fn().mockResolvedValue(1);
  return {
    organization: {
      findUnique: jest.fn().mockResolvedValue({ id: "org-1" }),
    },
    payrollEmployee: {
      findMany: jest.fn().mockResolvedValue([cleanEmployee()]),
    },
    user: {
      findMany: jest
        .fn()
        .mockResolvedValue([
          { id: "user-private-1", organizationId: "org-1", isActive: true },
        ]),
    },
    location: { findMany: jest.fn().mockResolvedValue([]) },
    payrollContract: {
      findMany: jest.fn().mockResolvedValue([cleanContract()]),
    },
    payrollEmployeeRubriqueAssignment: {
      findMany: jest.fn().mockResolvedValue([cleanAssignment()]),
    },
    payrollPaymentDestinationChangeRequest: {
      findMany: jest.fn().mockResolvedValue([cleanPaymentRequest()]),
    },
    payrollAttendanceSnapshot: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: "attendance-private-1",
          organizationId: "org-1",
          employeeId: "employee-private-1",
          status: PayrollAttendanceSnapshotStatus.FROZEN,
          periodStart: SOURCE_DATE,
          periodEnd: PERIOD_END,
        },
      ]),
    },
    payrollRun: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: "run-private-1",
          payrollPeriodId: "period-private-1",
          runType: PayrollRunType.ORDINARY,
          status: PayrollRunStatus.POSTED,
        },
      ]),
    },
    payrollRunLine: { count: count() },
    payrollPayslip: { count: count() },
    payrollDeclarationEvidence: { count: count() },
    payrollPaymentBatch: { count: count() },
    businessEvent: { count: count() },
    auditLog: { count: count() },
  };
}

describe("HRIS migration/backfill pilot service", () => {
  it("refuses mutation mode before reading tenant data", async () => {
    const client = buildClient();

    await expect(
      generateHrisMigrationBackfillPilotPlan(
        { organizationId: "org-1", dryRun: false },
        client as any,
      ),
    ).rejects.toThrow("mutation mode is intentionally unavailable");

    expect(client.organization.findUnique).not.toHaveBeenCalled();
    expect(client.payrollEmployee.findMany).not.toHaveBeenCalled();
  });

  it("produces a stable, redacted, correction-only close pack for clean tenant data", async () => {
    const client = buildClient();

    const first = await generateHrisMigrationBackfillPilotPlan(
      { organizationId: "org-1" },
      client as any,
    );
    const second = await generateHrisMigrationBackfillPilotPlan(
      { organizationId: "org-1" },
      client as any,
    );
    const report = formatHrisMigrationBackfillPilotReport(first);

    expect(first).toMatchObject({
      dryRunOnly: true,
      mutationModeAvailable: false,
      status: "READY_FOR_OWNER_SIGNOFF",
      blockerCount: 0,
      rollbackSimulation: {
        strategy: "CORRECTION_ONLY",
        mutationCount: 0,
        destructiveOperations: 0,
        immutableEvidencePreserved: true,
        result: "NO_OP_DRY_RUN",
      },
      scan: {
        scannedEmployees: 1,
        truncated: false,
        projectionCounts: { adoptable: 1, legacyUnverified: 0 },
      },
      closePack: { status: "PENDING_OWNER_SIGNOFF" },
    });
    expect(first.evidence.planHash).toBe(second.evidence.planHash);
    expect(first.evidence.reconciliationHash).toBe(
      second.evidence.reconciliationHash,
    );
    expect(first.evidence.correctionPlanHash).toBe(
      second.evidence.correctionPlanHash,
    );
    expect(client.payrollEmployee.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: "org-1" },
      }),
    );
    expect(client.payrollRunLine.count).toHaveBeenCalledWith({
      where: { organizationId: "org-1" },
    });
    expect(report).not.toContain("org-1");
    expect(report).not.toContain("employee-private-1");
    expect(report).not.toContain("private-source-record");
    expect(report).not.toContain("private-payment-destination");
    expect(report).not.toContain("private-contract-document");
  });

  it("blocks ambiguous and cross-tenant legacy rows with deterministic correction steps", async () => {
    const client = buildClient();
    client.payrollEmployee.findMany.mockResolvedValue([
      {
        ...cleanEmployee(),
        userId: "user-cross-tenant",
        locationId: "location-cross-tenant",
        hireDate: new Date("2026-02-01T00:00:00.000Z"),
        terminationDate: SOURCE_DATE,
        metadata: {},
      },
    ]);
    client.user.findMany.mockResolvedValue([
      { id: "user-cross-tenant", organizationId: "org-2", isActive: true },
    ]);
    client.location.findMany.mockResolvedValue([
      { id: "location-cross-tenant", organizationId: "org-2", isActive: true },
    ]);
    client.payrollContract.findMany.mockResolvedValue([
      {
        ...cleanContract(),
        organizationId: "org-2",
        signedDocumentHash: null,
        activatedBusinessEventId: null,
        metadata: {},
      },
      {
        ...cleanContract(),
        id: "contract-private-2",
        effectiveFrom: new Date("2026-01-15T00:00:00.000Z"),
        signedDocumentHash: null,
        activatedBusinessEventId: null,
        metadata: {},
      },
    ]);
    client.payrollEmployeeRubriqueAssignment.findMany.mockResolvedValue([
      {
        ...cleanAssignment(),
        organizationId: "org-2",
        evidenceDocumentHash: null,
        approvalBusinessEventId: null,
        metadata: {},
      },
    ]);
    client.payrollPaymentDestinationChangeRequest.findMany.mockResolvedValue([
      { ...cleanPaymentRequest(), organizationId: "org-2" },
      {
        ...cleanPaymentRequest(),
        id: "payment-request-private-2",
        requestedById: "same-actor",
        approvedById: "same-actor",
        appliedById: "same-actor",
      },
    ]);
    client.payrollAttendanceSnapshot.findMany.mockResolvedValue([
      {
        id: "attendance-cross-tenant",
        organizationId: "org-2",
        employeeId: "employee-private-1",
        status: PayrollAttendanceSnapshotStatus.FROZEN,
        periodStart: SOURCE_DATE,
        periodEnd: PERIOD_END,
      },
      {
        id: "attendance-private-1",
        organizationId: "org-1",
        employeeId: "employee-private-1",
        status: PayrollAttendanceSnapshotStatus.FROZEN,
        periodStart: SOURCE_DATE,
        periodEnd: PERIOD_END,
      },
      {
        id: "attendance-private-2",
        organizationId: "org-1",
        employeeId: "employee-private-1",
        status: PayrollAttendanceSnapshotStatus.FROZEN,
        periodStart: SOURCE_DATE,
        periodEnd: PERIOD_END,
      },
    ]);
    client.payrollRun.findMany.mockResolvedValue([
      {
        id: "run-private-1",
        payrollPeriodId: "period-private-1",
        runType: PayrollRunType.ORDINARY,
        status: PayrollRunStatus.DRAFT,
      },
      {
        id: "run-private-2",
        payrollPeriodId: "period-private-1",
        runType: PayrollRunType.ORDINARY,
        status: PayrollRunStatus.CALCULATED,
      },
    ]);

    const plan = await generateHrisMigrationBackfillPilotPlan(
      { organizationId: "org-1" },
      client as any,
    );
    const report = formatHrisMigrationBackfillPilotReport(plan);
    const codes = plan.gaps.map((gap) => gap.code);

    expect(plan.status).toBe("BLOCKED");
    expect(plan.scan.projectionCounts).toEqual({
      adoptable: 0,
      legacyUnverified: 1,
    });
    expect(codes).toEqual(
      expect.arrayContaining([
        "EMPLOYEE_SOURCE_PROOF_MISSING",
        "EMPLOYEE_DATE_RANGE_INVALID",
        "EMPLOYEE_USER_CROSS_TENANT",
        "EMPLOYEE_LOCATION_CROSS_TENANT",
        "CONTRACT_CROSS_TENANT",
        "ACTIVE_CONTRACT_OVERLAP",
        "ACTIVE_CONTRACT_DOCUMENT_PROOF_MISSING",
        "ACTIVE_CONTRACT_APPROVAL_PROOF_MISSING",
        "COMPENSATION_CROSS_TENANT",
        "ACTIVE_COMPENSATION_EVIDENCE_MISSING",
        "ACTIVE_COMPENSATION_APPROVAL_PROOF_MISSING",
        "PAYMENT_DESTINATION_CROSS_TENANT",
        "PAYMENT_DESTINATION_SOD_INVALID",
        "ATTENDANCE_CROSS_TENANT",
        "FROZEN_ATTENDANCE_DUPLICATE",
        "ACTIVE_PAYROLL_RUN_DUPLICATE",
      ]),
    );
    expect(plan.correctionPlan).toHaveLength(plan.gaps.length);
    expect(
      plan.correctionPlan.every((step) =>
        step.idempotencyKey.startsWith("hris-migration-correction:"),
      ),
    ).toBe(true);
    expect(plan.rollbackSimulation).toMatchObject({
      mutationCount: 0,
      destructiveOperations: 0,
      immutableEvidencePreserved: true,
    });
    expect(report).not.toContain("org-1");
    expect(report).not.toContain("employee-private-1");
    expect(report).not.toContain("private-payment-destination");
  });

  it("blocks close signoff when immutable evidence changes during the dry run", async () => {
    const client = buildClient();
    client.payrollRunLine.count
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(2);

    const plan = await generateHrisMigrationBackfillPilotPlan(
      { organizationId: "org-1" },
      client as any,
    );

    expect(plan.status).toBe("BLOCKED");
    expect(plan.gaps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "IMMUTABLE_EVIDENCE_CHANGED_DURING_DRY_RUN",
          severity: "BLOCKER",
        }),
      ]),
    );
    expect(plan.rollbackSimulation).toEqual({
      strategy: "CORRECTION_ONLY",
      mutationCount: 0,
      destructiveOperations: 0,
      immutableEvidencePreserved: false,
      result: "BLOCKED_BY_CONCURRENT_CHANGE",
    });
  });
});
