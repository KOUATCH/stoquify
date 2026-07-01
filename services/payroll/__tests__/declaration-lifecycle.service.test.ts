jest.mock("server-only", () => ({}));

jest.mock("@/prisma/db", () => ({
  db: {
    $transaction: jest.fn(),
    payrollDeclaration: {
      findMany: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    payrollDeclarationEvidence: {
      count: jest.fn(),
    },
  },
}));

jest.mock("@/services/accounting/close-assurance-pack.service", () => ({
  recordCloseCertificationInvalidationsForSourceInTx: jest.fn(),
}));

jest.mock("@/services/controls/sensitive-action.service", () => ({
  auditSensitiveActionDecision: jest.fn(),
  assertSensitiveActionAllowed: jest.fn(),
  evaluateSensitiveAction: jest.fn(),
}));

jest.mock("@/services/events/business-event.service", () => {
  const actual = jest.requireActual("@/services/events/business-event.service");
  return {
    ...actual,
    recordBusinessEventInTx: jest.fn(),
    markBusinessEventAppliedInTx: jest.fn(),
  };
});

import {
  PayrollDeclarationEvidenceTransition,
  PayrollDeclarationStatus,
  Prisma,
} from "@prisma/client";

import { db } from "@/prisma/db";
import { BusinessRuleError } from "@/services/_shared/action-errors";
import { recordCloseCertificationInvalidationsForSourceInTx } from "@/services/accounting/close-assurance-pack.service";
import {
  assertSensitiveActionAllowed,
  auditSensitiveActionDecision,
  evaluateSensitiveAction,
} from "@/services/controls/sensitive-action.service";
import {
  markBusinessEventAppliedInTx,
  recordBusinessEventInTx,
} from "@/services/events/business-event.service";

import {
  getPayrollDeclarationWorkbenchData,
  recordPayrollDeclarationEvidence,
} from "../declaration-lifecycle.service";

const mockDb = db as unknown as {
  $transaction: jest.Mock;
  payrollDeclaration: {
    findMany: jest.Mock;
    count: jest.Mock;
    aggregate: jest.Mock;
  };
  payrollDeclarationEvidence: {
    count: jest.Mock;
  };
};
const mockRecordCloseInvalidation =
  recordCloseCertificationInvalidationsForSourceInTx as jest.Mock;
const mockEvaluateSensitiveAction = evaluateSensitiveAction as jest.Mock;
const mockAuditSensitiveActionDecision =
  auditSensitiveActionDecision as jest.Mock;
const mockAssertSensitiveActionAllowed =
  assertSensitiveActionAllowed as jest.Mock;
const mockRecordBusinessEventInTx = recordBusinessEventInTx as jest.Mock;
const mockMarkBusinessEventAppliedInTx =
  markBusinessEventAppliedInTx as jest.Mock;

const authorityCertificationProofEnvelope = {
  authorityStatusCodeMapHash: "sha256:authority-status-code-map",
  rejectionMappingHash: "sha256:rejection-mapping",
  amendmentMappingHash: "sha256:amendment-mapping",
  paymentDueMappingHash: "sha256:payment-due-mapping",
  credentialRotationProofHash: "sha256:credential-rotation",
  credentialScopeProofHash: "sha256:credential-scope",
  idempotencyReplayFixtureHash: "sha256:idempotency-replay",
  duplicateResponseFixtureHash: "sha256:duplicate-response",
  duplicateTerminalResponseReplayFixtureHash:
    "sha256:duplicate-terminal-response-replay",
  outageRunbookHash: "sha256:outage-runbook",
  retryPolicyFixtureHash: "sha256:retry-policy",
  deadLetterTriageRunbookHash: "sha256:dead-letter-runbook",
  auditTrailFixtureHash: "sha256:audit-trail",
  redactionFixtureHash: "sha256:redaction-fixture",
  closeImpactRuleHash: "sha256:close-impact",
  legalReviewHash: "sha256:legal-review",
};

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
  };
}

function buildTx(status = PayrollDeclarationStatus.PREPARED) {
  const declaration = declarationFixture(status);
  return {
    payrollDeclaration: {
      findFirst: jest.fn().mockResolvedValue(declaration),
      update: jest
        .fn()
        .mockImplementation(({ data }) =>
          Promise.resolve({ ...declaration, ...data }),
        ),
    },
    payrollDeclarationEvidence: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest
        .fn()
        .mockImplementation(({ data }) =>
          Promise.resolve({ id: "evidence-1", ...data }),
        ),
    },
    auditLog: {
      create: jest.fn().mockResolvedValue({ id: "audit-1" }),
    },
  };
}

describe("payroll declaration lifecycle service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.$transaction.mockImplementation((callback) => callback(buildTx()));
    mockEvaluateSensitiveAction.mockReturnValue({
      allowed: true,
      reasonCode: "ALLOWED",
      policy: { auditAction: "PAYROLL_DECLARATION_LIFECYCLE_CONTROL" },
      detectorInputs: {},
      input: {},
    });
    mockAuditSensitiveActionDecision.mockResolvedValue({
      id: "control-audit-1",
    });
    mockAssertSensitiveActionAllowed.mockImplementation((decision) => decision);
    mockRecordBusinessEventInTx.mockResolvedValue({
      event: { id: "event-1" },
      created: true,
    });
    mockMarkBusinessEventAppliedInTx.mockResolvedValue({ id: "event-1" });
    mockRecordCloseInvalidation.mockResolvedValue([]);
  });

  it("builds a proof-backed declaration workbench read model", async () => {
    const periodStart = new Date("2026-06-01T00:00:00.000Z");
    const periodEnd = new Date("2026-06-30T23:59:59.999Z");
    const payDate = new Date("2026-07-05T00:00:00.000Z");

    mockDb.payrollDeclaration.findMany.mockResolvedValue([
      {
        id: "declaration-1",
        organizationId: "org-1",
        payrollRunId: "run-1",
        authority: "CM_CNPS",
        declarationType: "CNPS_EMPLOYER_SOCIAL_CONTRIBUTION",
        status: PayrollDeclarationStatus.PREPARED,
        periodStart,
        periodEnd,
        dueDate: new Date("2026-07-15T00:00:00.000Z"),
        countryCode: "CM",
        countryPackVersion: "CM-2026.1",
        countryPackSchemaVersion: "country-pack.v1",
        countryPackResolutionHash: "sha256:country-pack",
        amount: new Prisma.Decimal("17150.00"),
        currency: "XAF",
        payloadHash: "sha256:payload",
        payrollRun: {
          id: "run-1",
          runNumber: "RUN-2026-06",
          runType: "ORDINARY",
          status: "POSTED",
          currency: "XAF",
          netPayableAmount: new Prisma.Decimal("100000.00"),
          grossAmount: new Prisma.Decimal("120000.00"),
          ledgerPostingBatchId: "ledger-1",
          journalEntryId: "journal-1",
          accountingSourceLinkId: "source-link-1",
          evidenceHash: "sha256:run-evidence",
          documentHash: "sha256:run-doc",
          payrollPeriod: {
            id: "period-1",
            name: "June 2026",
            periodStart,
            periodEnd,
            payDate,
            status: "OPEN",
          },
        },
        evidenceItems: [
          {
            id: "evidence-1",
            transition: PayrollDeclarationEvidenceTransition.SUBMIT,
            previousStatus: PayrollDeclarationStatus.PREPARED,
            nextStatus: PayrollDeclarationStatus.SUBMITTED,
            authorityChannel: "CNPS_MANUAL_PORTAL",
            authorityEnvironment: "MANUAL_PORTAL",
            authorityReference: "CNPS-REF-1",
            authorityStatus: "SUBMITTED",
            evidenceHash: "sha256:evidence",
            submittedPayloadHash: "sha256:submitted",
            authorityResponseHash: null,
            portalReceiptHash: "sha256:receipt",
            supportingFileHash: null,
            sourceRegisterHash: "sha256:register",
            countryPackResolutionHash: "sha256:country-pack",
            automationCapabilityStatus: "AUTOMATION_BLOCKED",
            productionSubmissionSupported: false,
            createdAt: new Date("2026-06-30T10:00:00.000Z"),
          },
        ],
      },
    ]);
    mockDb.payrollDeclaration.count
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0);
    mockDb.payrollDeclarationEvidence.count
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0);
    mockDb.payrollDeclaration.aggregate.mockResolvedValue({
      _sum: { amount: new Prisma.Decimal("17150.00") },
    });

    const result = await getPayrollDeclarationWorkbenchData({
      organizationId: "org-1",
      actorPermissions: ["accounting.close.read"],
      now: "2026-06-30T10:00:00.000Z",
    });

    expect(result.redaction.proofIdentifiers).toEqual(
      expect.objectContaining({
        allowed: true,
        mode: "allow",
        reasonCode: "ALLOWED",
        policy: "kontava-proof-hidden-identifier-policy",
      }),
    );
    expect(result.summary).toEqual(
      expect.objectContaining({
        totalDeclarations: 1,
        activeDeclarations: 1,
        rejectedDeclarations: 0,
        missingRegisterProofCount: 0,
        amountInScope: "17150.00",
        coverageComplete: true,
      }),
    );
    expect(result.declarations[0]).toEqual(
      expect.objectContaining({
        authority: "CM_CNPS",
        declarationType: "CNPS_EMPLOYER_SOCIAL_CONTRIBUTION",
        proof: expect.objectContaining({
          payloadHash: "sha256:payload",
          sourceRegisterHash: "sha256:register",
          sourceRegisterProofPresent: true,
          portalReceiptHash: "sha256:receipt",
        }),
        automation: expect.objectContaining({
          automationCapabilityStatus: "AUTOMATION_BLOCKED",
          manualAuthorityWorkflowOnly: true,
        }),
      }),
    );
    expect(
      result.declarations[0].nextActions.map((action) => action.id),
    ).toContain("submit");
    expect(
      result.declarations[0].blockers.map((blocker) => blocker.id),
    ).toEqual(["PAYROLL_DECLARATION_AUTOMATION_NOT_CERTIFIED"]);
    expect(mockDb.payrollDeclaration.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: "org-1" },
        include: expect.objectContaining({
          evidenceItems: expect.any(Object),
          payrollRun: expect.any(Object),
        }),
      }),
    );
  });
  it("redacts declaration proof identifiers without proof permissions while preserving proof state", async () => {
    mockDb.payrollDeclaration.findMany.mockResolvedValue([
      {
        id: "declaration-1",
        organizationId: "org-1",
        payrollRunId: "run-1",
        authority: "CM_CNPS",
        declarationType: "CNPS_EMPLOYER_SOCIAL_CONTRIBUTION",
        status: PayrollDeclarationStatus.PREPARED,
        amount: new Prisma.Decimal("17150.00"),
        currency: "XAF",
        periodStart: new Date("2026-06-01T00:00:00.000Z"),
        periodEnd: new Date("2026-06-30T23:59:59.999Z"),
        dueDate: new Date("2026-07-15T00:00:00.000Z"),
        countryCode: "CM",
        countryPackVersion: "CM-2026.1",
        countryPackSchemaVersion: "country-pack.v1",
        countryPackResolutionHash: "sha256:country-pack",
        payloadHash: "sha256:payload",
        payrollRun: {
          id: "run-1",
          runNumber: "RUN-2026-06",
          runType: "ORDINARY",
          status: "POSTED",
          grossAmount: new Prisma.Decimal("100000.00"),
          netPayableAmount: new Prisma.Decimal("90000.00"),
          currency: "XAF",
          ledgerPostingBatchId: "ledger-1",
          journalEntryId: "journal-1",
          accountingSourceLinkId: "source-link-1",
          evidenceHash: "sha256:run-evidence",
          documentHash: "sha256:run-doc",
          payrollPeriod: {
            id: "period-1",
            name: "June 2026",
            periodStart: new Date("2026-06-01T00:00:00.000Z"),
            periodEnd: new Date("2026-06-30T23:59:59.999Z"),
            payDate: new Date("2026-07-05T00:00:00.000Z"),
            status: "OPEN",
          },
        },
        evidenceItems: [
          {
            id: "evidence-1",
            transition: PayrollDeclarationEvidenceTransition.SUBMIT,
            previousStatus: PayrollDeclarationStatus.PREPARED,
            nextStatus: PayrollDeclarationStatus.SUBMITTED,
            authorityChannel: "CNPS_MANUAL_PORTAL",
            authorityEnvironment: "MANUAL_PORTAL",
            authorityReference: "CNPS-REF-1",
            authorityStatus: "SUBMITTED",
            evidenceHash: "sha256:evidence",
            submittedPayloadHash: "sha256:submitted",
            authorityResponseHash: null,
            portalReceiptHash: "sha256:receipt",
            supportingFileHash: null,
            sourceRegisterHash: "sha256:register",
            countryPackResolutionHash: "sha256:country-pack",
            automationCapabilityStatus: "AUTOMATION_BLOCKED",
            productionSubmissionSupported: false,
            createdAt: new Date("2026-06-30T10:00:00.000Z"),
          },
        ],
      },
    ]);
    mockDb.payrollDeclaration.count
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0);
    mockDb.payrollDeclarationEvidence.count
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0);
    mockDb.payrollDeclaration.aggregate.mockResolvedValue({
      _sum: { amount: new Prisma.Decimal("17150.00") },
    });

    const result = await getPayrollDeclarationWorkbenchData({
      organizationId: "org-1",
      actorPermissions: ["payroll.command.read"],
      now: "2026-06-30T10:00:00.000Z",
    });

    expect(result.redaction.proofIdentifiers).toEqual(
      expect.objectContaining({
        allowed: false,
        mode: "redact",
        reasonCode: "MISSING_PERMISSION",
        policy: "kontava-proof-hidden-identifier-policy",
      }),
    );
    expect(result.summary.missingRegisterProofCount).toBe(0);
    expect(result.declarations[0].proof).toEqual(
      expect.objectContaining({
        payloadHash: "[REDACTED:IDENTIFIER]",
        latestEvidenceHash: "[REDACTED:IDENTIFIER]",
        latestAuthorityReference: "[REDACTED:IDENTIFIER]",
        sourceRegisterHash: "[REDACTED:IDENTIFIER]",
        sourceRegisterProofPresent: true,
        portalReceiptHash: "[REDACTED:IDENTIFIER]",
      }),
    );
    expect(result.declarations[0].payrollRun).toEqual(
      expect.objectContaining({
        evidenceHash: "[REDACTED:IDENTIFIER]",
        documentHash: "[REDACTED:IDENTIFIER]",
      }),
    );
    expect(JSON.stringify(result.declarations[0])).not.toContain(
      "sha256:register",
    );
    expect(JSON.stringify(result.declarations[0])).not.toContain(
      "sha256:receipt",
    );
  });

  it("records manual submission evidence, updates status, and stales close evidence", async () => {
    const tx = buildTx();
    mockDb.$transaction.mockImplementation((callback) => callback(tx));

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
      sourceRegisterHash: "sha256:register",
      approvedById: "approver-1",
      idempotencyKey: "submit-key-1",
    });

    expect(result.automationCapabilityStatus).toBe("AUTOMATION_BLOCKED");
    expect(result.productionSubmissionSupported).toBe(false);
    expect(tx.payrollDeclarationEvidence.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          transition: PayrollDeclarationEvidenceTransition.SUBMIT,
          previousStatus: PayrollDeclarationStatus.PREPARED,
          nextStatus: PayrollDeclarationStatus.SUBMITTED,
          evidenceHash: expect.stringMatching(/^sha256:/),
          sourceRegisterHash: "sha256:register",
          automationCapabilityStatus: "AUTOMATION_BLOCKED",
          productionSubmissionSupported: false,
          metadata: expect.objectContaining({
            authorityAdapterKey: "CNPS_MANUAL_PORTAL:MANUAL_CAPTURE",
            authorityAdapterReadiness: "MANUAL_EVIDENCE",
            authorityAdapterProofHash: expect.stringMatching(/^sha256:/),
            authorityAdapterRegistryVersion: 1,
            authorityAdapterContractHash: expect.stringMatching(/^sha256:/),
            authorityLifecycleContractHash: expect.stringMatching(/^sha256:/),
            authorityLifecycleStatus: "SUBMISSION_EVIDENCE_RECORDED",
            authorityLifecycleCloseImpact: "CLOSE_EVIDENCE_STALE_ON_CHANGE",
            authorityLifecycleContract: expect.objectContaining({
              transition: "SUBMIT",
              previousStatus: PayrollDeclarationStatus.PREPARED,
              nextStatus: PayrollDeclarationStatus.SUBMITTED,
              sourceRegisterHash: "sha256:register",
            }),
            evidence: expect.objectContaining({
              authorityLifecycleContractHash: expect.stringMatching(/^sha256:/),
              authorityLifecycleStatus: "SUBMISSION_EVIDENCE_RECORDED",
              authorityLifecycleCloseImpact: "CLOSE_EVIDENCE_STALE_ON_CHANGE",
            }),
            authorityAdapterProof: expect.objectContaining({
              manualAuthorityWorkflowOnly: true,
              productionSubmissionSupported: false,
            }),
          }),
        }),
      }),
    );
    expect(tx.payrollDeclaration.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: PayrollDeclarationStatus.SUBMITTED,
          metadata: expect.objectContaining({
            latestAuthorityAdapterProofHash: expect.stringMatching(/^sha256:/),
            latestAuthorityAdapterKey: "CNPS_MANUAL_PORTAL:MANUAL_CAPTURE",
            latestAuthorityAdapterReadiness: "MANUAL_EVIDENCE",
            latestAuthorityAdapterContractHash:
              expect.stringMatching(/^sha256:/),
            latestAuthorityLifecycleContractHash:
              expect.stringMatching(/^sha256:/),
            latestAuthorityLifecycleStatus: "SUBMISSION_EVIDENCE_RECORDED",
            latestAuthorityLifecycleCloseImpact:
              "CLOSE_EVIDENCE_STALE_ON_CHANGE",
          }),
        }),
      }),
    );
    expect(mockRecordBusinessEventInTx).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        eventType: "payroll.declaration.submitted",
        sourceType: "PAYROLL_DECLARATION",
        documentHash: expect.stringMatching(/^sha256:/),
        payload: expect.objectContaining({
          authorityAdapterKey: "CNPS_MANUAL_PORTAL:MANUAL_CAPTURE",
          authorityAdapterReadiness: "MANUAL_EVIDENCE",
          authorityAdapterProofHash: expect.stringMatching(/^sha256:/),
          authorityAdapterRegistryVersion: 1,
          authorityAdapterContractHash: expect.stringMatching(/^sha256:/),
          authorityLifecycleContractHash: expect.stringMatching(/^sha256:/),
          authorityLifecycleStatus: "SUBMISSION_EVIDENCE_RECORDED",
          authorityLifecycleCloseImpact: "CLOSE_EVIDENCE_STALE_ON_CHANGE",
        }),
        metadata: expect.objectContaining({
          authorityAdapterProofHash: expect.stringMatching(/^sha256:/),
          authorityAdapterRegistryVersion: 1,
          authorityAdapterContractHash: expect.stringMatching(/^sha256:/),
          authorityLifecycleContractHash: expect.stringMatching(/^sha256:/),
          authorityLifecycleStatus: "SUBMISSION_EVIDENCE_RECORDED",
          authorityLifecycleCloseImpact: "CLOSE_EVIDENCE_STALE_ON_CHANGE",
        }),
      }),
    );
    expect(mockRecordCloseInvalidation).toHaveBeenCalledWith(
      tx,
      "org-1",
      expect.objectContaining({
        sourceCode: "PAYROLL_DECLARATION_SUBMITTED",
        sourceId: "declaration-1",
        newEvidenceHash: expect.stringMatching(/^sha256:/),
      }),
      expect.objectContaining({ actorId: "payroll-controller-1" }),
    );
  });

  it("records rejected authority evidence as close-blocking lifecycle proof", async () => {
    const tx = buildTx(PayrollDeclarationStatus.SUBMITTED);
    mockDb.$transaction.mockImplementation((callback) => callback(tx));

    await recordPayrollDeclarationEvidence({
      organizationId: "org-1",
      declarationId: "declaration-1",
      transition: "reject",
      actorId: "payroll-controller-1",
      actorPermissions: ["payroll.declarations.manage"],
      lastAuthAt: "2026-06-30T10:00:00.000Z",
      now: "2026-06-30T10:01:00.000Z",
      authorityChannel: "CNPS_MANUAL_PORTAL",
      authorityEnvironment: "MANUAL_PORTAL",
      authorityStatus: "REJECTED_BY_AUTHORITY",
      authorityResponseHash: "sha256:authority-response",
      sourceRegisterHash: "sha256:register",
      idempotencyKey: "reject-key-1",
    });

    expect(tx.payrollDeclarationEvidence.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          transition: PayrollDeclarationEvidenceTransition.REJECT,
          previousStatus: PayrollDeclarationStatus.SUBMITTED,
          nextStatus: PayrollDeclarationStatus.REJECTED,
          metadata: expect.objectContaining({
            authorityLifecycleContractHash: expect.stringMatching(/^sha256:/),
            authorityLifecycleStatus: "REJECTED_REQUIRES_CORRECTION",
            authorityLifecycleCloseImpact: "BLOCK_CLOSE_UNTIL_CORRECTED",
            authorityLifecycleContract: expect.objectContaining({
              transition: "REJECT",
              previousStatus: PayrollDeclarationStatus.SUBMITTED,
              nextStatus: PayrollDeclarationStatus.REJECTED,
              authorityStatus: "REJECTED_BY_AUTHORITY",
            }),
          }),
        }),
      }),
    );
    expect(mockRecordBusinessEventInTx).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        eventType: "payroll.declaration.rejected",
        payload: expect.objectContaining({
          authorityLifecycleStatus: "REJECTED_REQUIRES_CORRECTION",
          authorityLifecycleCloseImpact: "BLOCK_CLOSE_UNTIL_CORRECTED",
        }),
      }),
    );
  });

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
        sourceRegisterHash: "sha256:register",
        approvedById: "approver-1",
        idempotencyKey: "submit-key-1",
      }),
    ).rejects.toThrow("reviewed authority adapter proof");
  });

  it("blocks certified production adapter evidence when adapter chaos release gate proof is missing", async () => {
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
        authorityAdapterKey: "CM_CNPS_PRODUCTION_API",
        authorityAdapterReadiness: "SUPPORTED_CERTIFIED",
        authorityStatus: "SUBMITTED",
        authorityReference: "CNPS-API-REF-1",
        submittedPayloadHash: "sha256:submitted-payload",
        authorityResponseHash: "sha256:authority-response",
        sourceRegisterHash: "sha256:register",
        approvedById: "approver-1",
        payloadMappingHash: "sha256:payload-mapping",
        responseMappingHash: "sha256:response-mapping",
        ...authorityCertificationProofEnvelope,
        credentialProofHash: "sha256:credential-proof",
        adapterRequestHash: "sha256:adapter-request",
        adapterResponseReceiptHash: "sha256:adapter-response-receipt",
        adapterIdempotencyKey: "cnps-submit-run-1",
        adapterAttempt: 2,
        authorityCertificationHarnessHash: "sha256:authority-harness",
        idempotencyKey: "submit-certified-key-1",
      }),
    ).rejects.toThrow("adapter chaos release gate proof");
  });

  it("records certified production adapter evidence when reviewed proof is complete", async () => {
    const tx = buildTx();
    mockDb.$transaction.mockImplementation((callback) => callback(tx));

    const result = await recordPayrollDeclarationEvidence({
      organizationId: "org-1",
      declarationId: "declaration-1",
      transition: "submit",
      actorId: "payroll-controller-1",
      actorPermissions: ["payroll.declarations.manage"],
      lastAuthAt: "2026-06-30T10:00:00.000Z",
      now: "2026-06-30T10:01:00.000Z",
      authorityChannel: "CNPS_API",
      authorityEnvironment: "PRODUCTION_API",
      authorityAdapterKey: "CM_CNPS_PRODUCTION_API",
      authorityAdapterReadiness: "SUPPORTED_CERTIFIED",
      authorityStatus: "SUBMITTED",
      authorityReference: "CNPS-API-REF-1",
      submittedPayloadHash: "sha256:submitted-payload",
      authorityResponseHash: "sha256:authority-response",
      sourceRegisterHash: "sha256:register",
      approvedById: "approver-1",
      payloadMappingHash: "sha256:payload-mapping",
      responseMappingHash: "sha256:response-mapping",
      ...authorityCertificationProofEnvelope,
      credentialProofHash: "sha256:credential-proof",
      adapterRequestHash: "sha256:adapter-request",
      adapterResponseReceiptHash: "sha256:adapter-response-receipt",
      adapterIdempotencyKey: "cnps-submit-run-1",
      adapterAttempt: 2,
      authorityCertificationHarnessHash: "sha256:authority-harness",
      adapterChaosReleaseGateHash: "sha256:adapter-chaos-gate",
      idempotencyKey: "submit-certified-key-1",
    });

    expect(result.automationCapabilityStatus).toBe("PRODUCTION_ADAPTER_READY");
    expect(result.productionSubmissionSupported).toBe(true);
    expect(tx.payrollDeclarationEvidence.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          automationCapabilityStatus: "PRODUCTION_ADAPTER_READY",
          productionSubmissionSupported: true,
          metadata: expect.objectContaining({
            manualAuthorityWorkflowOnly: false,
            productionAdapterBlockedReason: null,
            authorityAdapterCertificationProofComplete: true,
            authorityAdapterCertificationBlockers: [],
            authorityAdapterProof: expect.objectContaining({
              manualAuthorityWorkflowOnly: false,
              productionSubmissionSupported: true,
              authorityAdapterCertificationProofComplete: true,
              authorityAdapterCertificationBlockers: [],
              adapterChaosReleaseGateHash: "sha256:adapter-chaos-gate",
              legalReviewHash: "sha256:legal-review",
            }),
          }),
        }),
      }),
    );
    expect(mockRecordBusinessEventInTx).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        payload: expect.objectContaining({
          automationCapabilityStatus: "PRODUCTION_ADAPTER_READY",
          productionSubmissionSupported: true,
          authorityAdapterCertificationProofComplete: true,
          authorityAdapterCertificationBlockers: [],
          adapterChaosReleaseGateHash: "sha256:adapter-chaos-gate",
        }),
        metadata: expect.objectContaining({
          manualAuthorityWorkflowOnly: false,
          productionAdapterBlockedReason: null,
          authorityAdapterCertificationProofComplete: true,
          authorityAdapterCertificationBlockers: [],
        }),
      }),
    );
  });
  it("requires source register proof for declaration lifecycle evidence", async () => {
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
    ).rejects.toThrow("source payroll register hash");
  });

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
        sourceRegisterHash: "sha256:register",
        approvedById: "payroll-controller-1",
        idempotencyKey: "submit-key-1",
      }),
    ).rejects.toThrow("separate approver");
  });

  it("rejects unsafe transition order", async () => {
    mockDb.$transaction.mockImplementation((callback) =>
      callback(buildTx(PayrollDeclarationStatus.ACCEPTED)),
    );

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
        sourceRegisterHash: "sha256:register",
        approvedById: "approver-1",
        idempotencyKey: "submit-key-1",
      }),
    ).rejects.toThrow("cannot transition from ACCEPTED");
  });

  it("returns an idempotent replay for the same evidence hash", async () => {
    const tx = buildTx();
    mockDb.$transaction.mockImplementation((callback) => callback(tx));

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
      sourceRegisterHash: "sha256:register",
      approvedById: "approver-1",
      idempotencyKey: "submit-key-1",
    });

    tx.payrollDeclarationEvidence.findFirst.mockResolvedValue({
      id: "evidence-1",
      evidenceHash: first.evidence.evidenceHash,
    });

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
      sourceRegisterHash: "sha256:register",
      approvedById: "approver-1",
      idempotencyKey: "submit-key-1",
    });

    expect(second.idempotent).toBe(true);
    expect(tx.payrollDeclarationEvidence.create).toHaveBeenCalledTimes(1);
  });
});
