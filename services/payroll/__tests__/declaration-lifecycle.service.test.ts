jest.mock("server-only", () => ({}))

jest.mock("@/prisma/db", () => ({
  db: {
    $transaction: jest.fn(),
  },
}))

jest.mock("@/services/accounting/close-assurance-pack.service", () => ({
  recordCloseCertificationInvalidationsForSourceInTx: jest.fn(),
}))

jest.mock("@/services/controls/sensitive-action.service", () => ({
  auditSensitiveActionDecision: jest.fn(),
  assertSensitiveActionAllowed: jest.fn(),
  evaluateSensitiveAction: jest.fn(),
}))

jest.mock("@/services/events/business-event.service", () => {
  const actual = jest.requireActual("@/services/events/business-event.service")
  return {
    ...actual,
    recordBusinessEventInTx: jest.fn(),
    markBusinessEventAppliedInTx: jest.fn(),
  }
})

import {
  PayrollDeclarationEvidenceTransition,
  PayrollDeclarationStatus,
  Prisma,
} from "@prisma/client"

import { db } from "@/prisma/db"
import { BusinessRuleError } from "@/services/_shared/action-errors"
import { recordCloseCertificationInvalidationsForSourceInTx } from "@/services/accounting/close-assurance-pack.service"
import {
  assertSensitiveActionAllowed,
  auditSensitiveActionDecision,
  evaluateSensitiveAction,
} from "@/services/controls/sensitive-action.service"
import {
  markBusinessEventAppliedInTx,
  recordBusinessEventInTx,
} from "@/services/events/business-event.service"

import { recordPayrollDeclarationEvidence } from "../declaration-lifecycle.service"

const mockDb = db as unknown as { $transaction: jest.Mock }
const mockRecordCloseInvalidation = recordCloseCertificationInvalidationsForSourceInTx as jest.Mock
const mockEvaluateSensitiveAction = evaluateSensitiveAction as jest.Mock
const mockAuditSensitiveActionDecision = auditSensitiveActionDecision as jest.Mock
const mockAssertSensitiveActionAllowed = assertSensitiveActionAllowed as jest.Mock
const mockRecordBusinessEventInTx = recordBusinessEventInTx as jest.Mock
const mockMarkBusinessEventAppliedInTx = markBusinessEventAppliedInTx as jest.Mock

function declarationFixture(status = PayrollDeclarationStatus.PREPARED) {
  return {
    id: "declaration-1",
    organizationId: "org-1",
    payrollRunId: "run-1",
    authority: "CM_CNPS",
    declarationType: "CNPS_EMPLOYER_SOCIAL_CONTRIBUTION",
    status,
    periodStart: new Date("2026-06-01T00:00:00.000Z"),
    periodEnd: new Date("2026-06-30T23:59:59.999Z"),
    dueDate: null,
    countryCode: "CM",
    countryPackVersion: "CM-2026.1",
    countryPackSchemaVersion: "country-pack.v1",
    countryPackResolutionHash: "sha256:country-pack",
    amount: new Prisma.Decimal("17150.00"),
    currency: "XAF",
    payloadHash: "sha256:declaration-payload",
    metadata: { existing: true },
    payrollRun: {
      id: "run-1",
      payrollPeriod: {
        id: "period-1",
        periodStart: new Date("2026-06-01T00:00:00.000Z"),
        periodEnd: new Date("2026-06-30T23:59:59.999Z"),
      },
    },
  }
}

function buildTx(status = PayrollDeclarationStatus.PREPARED) {
  const declaration = declarationFixture(status)
  return {
    payrollDeclaration: {
      findFirst: jest.fn().mockResolvedValue(declaration),
      update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...declaration, ...data })),
    },
    payrollDeclarationEvidence: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: "evidence-1", ...data })),
    },
    auditLog: {
      create: jest.fn().mockResolvedValue({ id: "audit-1" }),
    },
  }
}

describe("payroll declaration lifecycle service", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockDb.$transaction.mockImplementation((callback) => callback(buildTx()))
    mockEvaluateSensitiveAction.mockReturnValue({
      allowed: true,
      reasonCode: "ALLOWED",
      policy: { auditAction: "PAYROLL_DECLARATION_LIFECYCLE_CONTROL" },
      detectorInputs: {},
      input: {},
    })
    mockAuditSensitiveActionDecision.mockResolvedValue({ id: "control-audit-1" })
    mockAssertSensitiveActionAllowed.mockImplementation((decision) => decision)
    mockRecordBusinessEventInTx.mockResolvedValue({ event: { id: "event-1" }, created: true })
    mockMarkBusinessEventAppliedInTx.mockResolvedValue({ id: "event-1" })
    mockRecordCloseInvalidation.mockResolvedValue([])
  })

  it("records manual submission evidence, updates status, and stales close evidence", async () => {
    const tx = buildTx()
    mockDb.$transaction.mockImplementation((callback) => callback(tx))

    const result = await recordPayrollDeclarationEvidence({
      organizationId: "org-1",
      declarationId: "declaration-1",
      transition: "submit",
      actorId: "payroll-controller-1",
      actorPermissions: ["payroll.declarations.manage"],
      lastAuthAt: "2026-06-30T10:00:00.000Z",
      now: "2026-06-30T10:01:00.000Z",
      authorityChannel: "CNPS_MANUAL_PORTAL",
      authorityEnvironment: "MANUAL_PORTAL",
      authorityStatus: "SUBMITTED",
      submittedPayloadHash: "sha256:submitted-payload",
      portalReceiptHash: "sha256:portal-receipt",
      approvedById: "approver-1",
      idempotencyKey: "submit-key-1",
    })

    expect(result.automationCapabilityStatus).toBe("AUTOMATION_BLOCKED")
    expect(result.productionSubmissionSupported).toBe(false)
    expect(tx.payrollDeclarationEvidence.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          transition: PayrollDeclarationEvidenceTransition.SUBMIT,
          previousStatus: PayrollDeclarationStatus.PREPARED,
          nextStatus: PayrollDeclarationStatus.SUBMITTED,
          evidenceHash: expect.stringMatching(/^sha256:/),
          productionSubmissionSupported: false,
        }),
      }),
    )
    expect(tx.payrollDeclaration.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: PayrollDeclarationStatus.SUBMITTED,
        }),
      }),
    )
    expect(mockRecordBusinessEventInTx).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        eventType: "payroll.declaration.submitted",
        sourceType: "PAYROLL_DECLARATION",
        documentHash: expect.stringMatching(/^sha256:/),
      }),
    )
    expect(mockRecordCloseInvalidation).toHaveBeenCalledWith(
      tx,
      "org-1",
      expect.objectContaining({
        sourceCode: "PAYROLL_DECLARATION_SUBMITTED",
        sourceId: "declaration-1",
        newEvidenceHash: expect.stringMatching(/^sha256:/),
      }),
      expect.objectContaining({ actorId: "payroll-controller-1" }),
    )
  })

  it("blocks non-manual production adapter evidence", async () => {
    await expect(
      recordPayrollDeclarationEvidence({
        organizationId: "org-1",
        declarationId: "declaration-1",
        transition: "submit",
        actorId: "payroll-controller-1",
        actorPermissions: ["payroll.declarations.manage"],
        lastAuthAt: "2026-06-30T10:00:00.000Z",
        now: "2026-06-30T10:01:00.000Z",
        authorityChannel: "CNPS_API",
        authorityEnvironment: "PRODUCTION_API",
        authorityStatus: "SUBMITTED",
        submittedPayloadHash: "sha256:submitted-payload",
        portalReceiptHash: "sha256:portal-receipt",
        approvedById: "approver-1",
        idempotencyKey: "submit-key-1",
      }),
    ).rejects.toThrow("manual authority workflow")
  })

  it("requires separate approval for submission evidence", async () => {
    await expect(
      recordPayrollDeclarationEvidence({
        organizationId: "org-1",
        declarationId: "declaration-1",
        transition: "submit",
        actorId: "payroll-controller-1",
        actorPermissions: ["payroll.declarations.manage"],
        lastAuthAt: "2026-06-30T10:00:00.000Z",
        now: "2026-06-30T10:01:00.000Z",
        authorityChannel: "CNPS_MANUAL_PORTAL",
        authorityEnvironment: "MANUAL_PORTAL",
        authorityStatus: "SUBMITTED",
        submittedPayloadHash: "sha256:submitted-payload",
        portalReceiptHash: "sha256:portal-receipt",
        approvedById: "payroll-controller-1",
        idempotencyKey: "submit-key-1",
      }),
    ).rejects.toThrow("separate approver")
  })

  it("rejects unsafe transition order", async () => {
    mockDb.$transaction.mockImplementation((callback) => callback(buildTx(PayrollDeclarationStatus.ACCEPTED)))

    await expect(
      recordPayrollDeclarationEvidence({
        organizationId: "org-1",
        declarationId: "declaration-1",
        transition: "submit",
        actorId: "payroll-controller-1",
        actorPermissions: ["payroll.declarations.manage"],
        lastAuthAt: "2026-06-30T10:00:00.000Z",
        now: "2026-06-30T10:01:00.000Z",
        authorityChannel: "CNPS_MANUAL_PORTAL",
        authorityEnvironment: "MANUAL_PORTAL",
        authorityStatus: "SUBMITTED",
        submittedPayloadHash: "sha256:submitted-payload",
        portalReceiptHash: "sha256:portal-receipt",
        approvedById: "approver-1",
        idempotencyKey: "submit-key-1",
      }),
    ).rejects.toThrow("cannot transition from ACCEPTED")
  })

  it("returns an idempotent replay for the same evidence hash", async () => {
    const tx = buildTx()
    mockDb.$transaction.mockImplementation((callback) => callback(tx))

    const first = await recordPayrollDeclarationEvidence({
      organizationId: "org-1",
      declarationId: "declaration-1",
      transition: "submit",
      actorId: "payroll-controller-1",
      actorPermissions: ["payroll.declarations.manage"],
      lastAuthAt: "2026-06-30T10:00:00.000Z",
      now: "2026-06-30T10:01:00.000Z",
      authorityChannel: "CNPS_MANUAL_PORTAL",
      authorityEnvironment: "MANUAL_PORTAL",
      authorityStatus: "SUBMITTED",
      submittedPayloadHash: "sha256:submitted-payload",
      portalReceiptHash: "sha256:portal-receipt",
      approvedById: "approver-1",
      idempotencyKey: "submit-key-1",
    })

    tx.payrollDeclarationEvidence.findFirst.mockResolvedValue({
      id: "evidence-1",
      evidenceHash: first.evidence.evidenceHash,
    })

    const second = await recordPayrollDeclarationEvidence({
      organizationId: "org-1",
      declarationId: "declaration-1",
      transition: "submit",
      actorId: "payroll-controller-1",
      actorPermissions: ["payroll.declarations.manage"],
      lastAuthAt: "2026-06-30T10:00:00.000Z",
      now: "2026-06-30T10:01:00.000Z",
      authorityChannel: "CNPS_MANUAL_PORTAL",
      authorityEnvironment: "MANUAL_PORTAL",
      authorityStatus: "SUBMITTED",
      submittedPayloadHash: "sha256:submitted-payload",
      portalReceiptHash: "sha256:portal-receipt",
      approvedById: "approver-1",
      idempotencyKey: "submit-key-1",
    })

    expect(second.idempotent).toBe(true)
    expect(tx.payrollDeclarationEvidence.create).toHaveBeenCalledTimes(1)
  })
})