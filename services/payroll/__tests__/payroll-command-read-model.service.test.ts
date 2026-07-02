import {
  CloseRunStatus,
  PayrollDeclarationStatus,
  PayrollPaymentBatchStatus,
  PayrollPeriodStatus,
  PayrollRunStatus,
  Prisma,
} from "@prisma/client"

import { ForbiddenError } from "@/services/_shared/action-errors"
import { getPayrollAdapterOperationsReadModel } from "../adapter-operations-read-model.service"
import { getPayrollEmployeeSourceData } from "../employee.service"
import { getPaymentEvidenceReadiness } from "../payment-evidence.service"
import { getPayrollEmployeeBalanceWorkbenchData } from "../payroll-employee-balance.service"
import { getPayrollWorkbenchData } from "../payroll-control.service"
import { buildPayrollFinalReleaseReadinessPack } from "../payroll-final-release-readiness.service"
import { getPayrollCommandReadModel } from "../command-read-model.service"

jest.mock("../adapter-operations-read-model.service", () => ({
  getPayrollAdapterOperationsReadModel: jest.fn(),
}))

jest.mock("../employee.service", () => ({
  getPayrollEmployeeSourceData: jest.fn(),
}))

jest.mock("../payment-evidence.service", () => ({
  getPaymentEvidenceReadiness: jest.fn(),
}))

jest.mock("../payroll-control.service", () => ({
  getPayrollWorkbenchData: jest.fn(),
}))

jest.mock("../payroll-employee-balance.service", () => ({
  getPayrollEmployeeBalanceWorkbenchData: jest.fn(),
}))

jest.mock("../payroll-final-release-readiness.service", () => ({
  buildPayrollFinalReleaseReadinessPack: jest.fn(),
}))

const mockGetPayrollAdapterOperationsReadModel = getPayrollAdapterOperationsReadModel as jest.Mock
const mockGetPayrollEmployeeSourceData = getPayrollEmployeeSourceData as jest.Mock
const mockGetPaymentEvidenceReadiness = getPaymentEvidenceReadiness as jest.Mock
const mockGetPayrollEmployeeBalanceWorkbenchData = getPayrollEmployeeBalanceWorkbenchData as jest.Mock
const mockGetPayrollWorkbenchData = getPayrollWorkbenchData as jest.Mock
const mockBuildPayrollFinalReleaseReadinessPack = buildPayrollFinalReleaseReadinessPack as jest.Mock

const asOf = new Date("2026-06-26T08:00:00.000Z")
const periodStart = new Date("2026-06-01T00:00:00.000Z")
const periodEnd = new Date("2026-06-30T23:59:59.000Z")
const updatedAt = new Date("2026-06-26T07:00:00.000Z")

function workbenchData() {
  return {
    organizationId: "org-1",
    asOf: "2026-06-26T07:30:00.000Z",
    counts: {
      openPeriods: 1,
      calculatedRuns: 1,
      postedRuns: 0,
      releasedPaymentBatches: 0,
      openDeclarations: 1,
      ledgerBlockers: 2,
      reconciliationExceptions: 1,
    },
    queues: {
      recentRuns: [],
      paymentBatches: [],
      declarations: [],
      ledgerBlockers: [],
    },
  }
}

function adapterOperationsData() {
  return {
    organizationId: "org-1",
    asOf: "2026-06-26T07:28:00.000Z",
    summary: {
      providerAccounts: 1,
      providerReady: 0,
      providerActionRequired: 0,
      providerBlocked: 1,
      staleStatementProviders: 1,
      laggingCallbackProviders: 1,
      deadLetterInboxItems: 1,
      failedInboxItems: 1,
        processingInboxItems: 1,
        retryDueInboxItems: 1,
        staleProcessingInboxItems: 1,
      settlementWorkerLeasedItems: 1,
      settlementWorkerRetryScheduledItems: 1,
      settlementWorkerDeadLetteredItems: 1,
      settlementWorkerCompletedItems: 0,
      settlementWorkerUnknownItems: 0,
      openPaymentExceptions: 1,
      replayOrTamperEvents: 1,
      authorityExecutions: 1,
      authorityDeadLetter: 1,
      authorityRetryScheduled: 0,
      authorityHarnessGaps: 1,
      paymentAdapterGaps: 1,
      adapterChaosGateBlockers: 2,
      authorityChaosGateMissing: 1,
      providerChaosGateMissing: 1,
    },
    providerHealth: [
      {
        providerAccountId: "provider-1",
        state: "BLOCKED",
        settlementWorker: {
          leasedCount: 1,
          retryScheduledCount: 1,
          deadLetteredCount: 1,
          completedCount: 0,
          unknownCount: 0,
          latestAction: "RETRY_SCHEDULED",
          latestActionSource: "WORKER_METADATA",
          latestActionAt: "2026-06-26T07:20:00.000Z",
          nextRetryAt: "2026-06-26T07:45:00.000Z",
          lastErrorCode: "PROVIDER_TIMEOUT",
          evidenceRefs: [],
        },
      },
    ],
    authorityExecutions: [{ declarationId: "decl-1", executionStatus: "DEAD_LETTER", adapterChaosReleaseGateHash: null }],
    paymentAdapterGaps: [{ payrollPaymentBatchId: "batch-1", adapterChaosReleaseGateHash: null }],
    adapterChaosGate: {
      state: "ACTION_REQUIRED",
      authorityAutomationClaims: 1,
      providerAutomationClaims: 1,
      authorityProofCount: 0,
      providerProofCount: 0,
      missingAuthorityProofCount: 1,
      missingProviderProofCount: 1,
      latestAuthorityProofHash: null,
      latestProviderProofHash: null,
      blockerCodes: ["AUTHORITY_CHAOS_GATE_PROOF_MISSING", "PROVIDER_CHAOS_GATE_PROOF_MISSING"],
      nextAction: "Run and persist the certified authority adapter chaos release gate before automated filing readiness can be claimed.",
    },
    redaction: {
      policy: "payroll-adapter-operations-redacted",
      rawPayloadsIncluded: false,
      credentialSecretsIncluded: false,
      salaryOrEmployeeIdentityIncluded: false,
    },
    sourceScope: {
      sourceService: "services/payroll/adapter-operations-read-model.service.ts",
    },
  }
}

function employeeBalanceWorkbenchData() {
  return {
    organizationId: "org-1",
    asOf: "2026-06-26T07:27:00.000Z",
    statusFilter: ["OPEN", "PARTIALLY_SETTLED"],
    redaction: {
      payrollAmounts: {
        allowed: false,
        mode: "redact",
        reasonCode: "MISSING_PERMISSION",
        policy: "kontava-payroll-person-redaction-policy",
        replacement: "[redacted]",
        requiredPermissions: ["payroll.amounts.read"],
      },
    },
    summary: {
      totalCases: 1,
      filteredCases: 1,
      returnedCases: 1,
      openCases: 1,
      partiallySettledCases: 0,
      settledCases: 0,
      activeCases: 1,
      activeAmount: "[redacted]",
      activeSettledAmount: "[redacted]",
      activeOutstandingAmount: "[redacted]",
      coverageComplete: true,
    },
    cases: [{ id: "balance-case-1" }],
    sourceScope: {
      limit: 25,
      returned: 1,
      coverageComplete: true,
      sourceService: "services/payroll/payroll-employee-balance.service.ts",
    },
  }
}

function finalReleasePack(overrides: Record<string, unknown> = {}) {
  return {
    kind: "AQSTOQFLOW_PAYROLL_FINAL_RELEASE_READINESS_PACK",
    version: 1,
    decision: "NOT_READY",
    generatedAt: "2026-06-26T07:58:00.000Z",
    organizationRef: "redacted:org",
    actorRef: "redacted:actor",
    payrollRunRef: "redacted:run",
    gates: [
      {
        key: "statutory_setup",
        label: "Statutory setup and country-pack readiness",
        status: "BLOCKED",
        blockerCodes: ["FINAL_STATUTORY_SCENARIO_COVERAGE_NOT_READY"],
        evidenceHash: "sha256:statutory-scenario-coverage",
        source: "PayrollProofBackfillReconciliationCertificate.setupGate.statutoryScenarioCoverage",
        summary: {
          setupGateStatus: "READY",
          statutoryScenarioCoverageStatus: "BLOCKED",
          statutoryScenarioCoverageHashPresent: true,
          statutoryScenarioFamilies: "8/9",
          statutoryScenarioBlockerCount: 1,
          missingReviewEvidenceCount: 1,
          sourceEvidenceHashCount: 1,
          requiredReviewTopicCount: 2,
          requiredReviewTopics: "taxableSalaryBase, bracketsAndRates",
        },
      },
      {
        key: "country_pack_review_intake",
        label: "Country-pack legal-owner review approval",
        status: "PASS",
        blockerCodes: [],
        evidenceHash: "sha256:country-pack-review-approval",
        source: "PayrollCountryPackReviewIntakeApproval",
        summary: {
          status: "APPROVED",
          approvalHashPresent: true,
          certificateHashPresent: true,
          proposedPackVersion: "CM-2026.2",
          targetFamilyCount: 1,
          targetFamilies: "IRPP_PERIOD",
          freshAuthSatisfied: true,
          approvalEvidenceHashPresent: true,
        },
      },
      {
        key: "policy_runtime",
        label: "Policy and payroll immutability runtime",
        status: "PASS",
        blockerCodes: [],
        evidenceHash: "sha256:policy-runtime",
        source: "what-next/payroll/payroll-immutability-runtime-check.json",
        summary: {},
      },
    ],
    blockers: [
      {
        code: "FINAL_STATUTORY_SCENARIO_COVERAGE_NOT_READY",
        severity: "critical",
        gate: "statutory_setup",
        message: "Statutory scenario coverage is not ready.",
      },
    ],
    evidence: {
      countryPackReviewIntake: {
        auditLogRef: "redacted:country-pack-review-audit",
        status: "APPROVED",
        approvalHash: "sha256:country-pack-review-approval",
        approvedAt: "2026-06-26T07:57:00.000Z",
        certificateHash: "sha256:country-pack-review-certificate",
        proposedPackVersion: "CM-2026.2",
        targetFamilyCount: 1,
        targetFamilies: ["IRPP_PERIOD"],
        freshAuthSatisfied: true,
        approvalEvidenceHashPresent: true,
      },
    },
    releaseGateRequirements: [
      {
        gate: "policy-gates",
        command: "npm run policy:gates",
        status: "REQUIRED_EXTERNAL_GATE",
      },
    ],
    packHash: "sha256:final-release-pack",
    redaction: {
      policy: "payroll-final-release-readiness-pack-redaction",
      rawPersonDataIncluded: false,
      rawSalaryIncluded: false,
      rawPaymentDestinationIncluded: false,
      rawProviderPayloadIncluded: false,
      rawAuthorityPayloadIncluded: false,
      rawAuditLogIdsIncluded: false,
    },
    persistence: {
      requested: false,
      persisted: false,
      auditLogId: null,
      entityType: "PayrollFinalReleaseReadinessPack",
      auditAction: null,
    },
    ...overrides,
  } as never
}
function buildClient(
  pilotCertificationAudit: unknown = null,
  proofBackfillAudit: unknown = null,
) {
  return {
    payrollPeriod: {
      findFirst: jest.fn().mockResolvedValue({
        id: "period-1",
        organizationId: "org-1",
        accountingPeriodId: "acct-period-1",
        name: "June 2026",
        status: PayrollPeriodStatus.INPUTS_LOCKED,
        periodStart,
        periodEnd,
        payDate: new Date("2026-06-30T00:00:00.000Z"),
        inputLockedAt: new Date("2026-06-25T12:00:00.000Z"),
        countryCode: "CM",
        countryPackVersion: "cm-payroll-2026.1",
        countryPackResolutionHash: "sha256:country-pack",
        countryPackCapabilityStatus: "EXPERT_REVIEW_REQUIRED",
        updatedAt,
      }),
    },
    payrollEmployee: {
      count: jest.fn().mockResolvedValueOnce(2).mockResolvedValueOnce(1),
    },
    payrollContract: { count: jest.fn().mockResolvedValue(1) },
    payrollEmployeeRubriqueAssignment: { count: jest.fn().mockResolvedValue(3) },
    payrollSalaryChangeRequest: {
      count: jest.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(1),
    },
    payrollPaymentDestinationChangeRequest: { count: jest.fn().mockResolvedValue(1) },
    payrollRun: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: "run-1",
          runNumber: "PR-2026-06",
          status: PayrollRunStatus.CALCULATED,
          documentHash: "sha256:run-doc",
          evidenceHash: "sha256:run-evidence",
          calculationHash: "sha256:calc",
          attendanceSnapshotHash: "sha256:attendance",
          countryPackResolutionHash: "sha256:country-pack",
          ledgerPostingBatchId: null,
          postedBusinessEventId: null,
          updatedAt,
          _count: { lines: 2, payslips: 2, paymentBatches: 1, declarations: 1 },
        },
      ]),
    },
    payrollPaymentBatch: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: "batch-1",
          batchNumber: "PB-2026-06",
          status: PayrollPaymentBatchStatus.DRAFT,
          documentHash: "sha256:batch-doc",
          evidenceHash: null,
          bankFileHash: null,
          ledgerPostingBatchId: null,
          postedBusinessEventId: null,
          reconciliationStatus: null,
          updatedAt,
        },
      ]),
    },
    payrollDeclaration: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: "decl-1",
          authority: "CNPS",
          declarationType: "SOCIAL_SECURITY",
          status: PayrollDeclarationStatus.REJECTED,
          payloadHash: "sha256:decl-payload",
          countryPackResolutionHash: "sha256:country-pack",
          metadata: {
            countryPackRegisterProofHash: "sha256:country-pack-register-proof",
            countryPackRegisterProofStatus: "MATCHED",
            countryPackRegisterProofLineCount: 2,
            countryPackRegisterProofMissingLineCount: 0,
            countryPackRegisterProofMismatchedLineCount: 0,
            countryPackLineProofHashes: ["sha256:line-proof-1", "sha256:line-proof-2"],
            statutoryScenarioCoverageHash: "sha256:statutory-scenario-coverage",
            countryPackReviewEvidenceSourceHashes: ["sha256:review-source-1"],
            countryPackLegalRefs: ["CNPS-2026"],
          },
          dueDate: new Date("2026-07-10T00:00:00.000Z"),
          updatedAt,
        },
      ]),
    },
    closeRun: {
      findFirst: jest.fn().mockResolvedValue({
        id: "close-1",
        status: CloseRunStatus.READY_TO_CLOSE,
        readinessScore: 72,
        criticalBlockerCount: 1,
        highBlockerCount: 2,
        evidenceCoveragePct: new Prisma.Decimal("87.50"),
        asOf: updatedAt,
      }),
    },
    payrollAttendanceSnapshot: { count: jest.fn().mockResolvedValue(1) },
    auditLog: {
      findFirst: jest.fn((query) => {
        if (query.where?.entityType === "PayrollPilotCycleCertification") {
          return Promise.resolve(pilotCertificationAudit)
        }
        if (
          query.where?.entityType ===
          "PayrollProofBackfillReconciliationCertificate"
        ) {
          return Promise.resolve(proofBackfillAudit)
        }
        return Promise.resolve(null)
      }),
      create: jest.fn().mockResolvedValue({ id: "audit-1" }),
    },
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockGetPayrollWorkbenchData.mockResolvedValue(workbenchData())
  mockGetPayrollEmployeeBalanceWorkbenchData.mockResolvedValue(employeeBalanceWorkbenchData())
  mockGetPayrollAdapterOperationsReadModel.mockResolvedValue(adapterOperationsData())
  mockBuildPayrollFinalReleaseReadinessPack.mockResolvedValue(finalReleasePack())
  mockGetPayrollEmployeeSourceData.mockResolvedValue({
    organizationId: "org-1",
    asOf: "2026-06-26T07:20:00.000Z",
    employees: [{ id: "employee-1" }, { id: "employee-2" }],
    summary: {},
    redaction: { salaryDecision: { allowed: false, mode: "redact", reasonCode: "MISSING_PERMISSION", policy: "kontava-payroll-person-redaction-policy" } },
  })
  mockGetPaymentEvidenceReadiness.mockResolvedValue({
    organizationId: "org-1",
    asOf: "2026-06-26T07:25:00.000Z",
    employees: [{ id: "employee-1" }, { id: "employee-2" }],
    summary: {
      employeeCount: 2,
      approvedPaymentDestinationCount: 1,
      pendingPaymentDestinationCount: 1,
      missingPaymentDestinationCount: 0,
      attendanceReadyCount: 1,
      attendanceDriftCount: 1,
      blockerCount: 2,
    },
  })
})

describe("payroll command read model service", () => {
  it("composes trusted command data with blockers, role scope, redaction, evidence, and audit", async () => {
    const client = buildClient()

    const result = await getPayrollCommandReadModel({
      organizationId: "org-1",
      actorId: "command-reader-1",
      actorPermissions: ["payroll.command.read"],
      limit: 25,
      asOf,
    }, client as never)

    expect(mockGetPayrollWorkbenchData).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1",
      actorId: "command-reader-1",
      actorPermissions: ["payroll.command.read"],
    }), client)
    expect(mockGetPayrollEmployeeSourceData).toHaveBeenCalledWith(expect.objectContaining({
      actorPermissions: ["payroll.command.read"],
    }), client)
    expect(mockGetPaymentEvidenceReadiness).toHaveBeenCalledWith(expect.objectContaining({
      periodStart,
      periodEnd,
      actorPermissions: ["payroll.command.read"],
    }), client)
    expect(mockGetPayrollEmployeeBalanceWorkbenchData).toHaveBeenCalledWith(expect.objectContaining({
      actorId: "command-reader-1",
      actorPermissions: ["payroll.command.read"],
      asOf,
      limit: 25,
    }), client)
    expect(mockBuildPayrollFinalReleaseReadinessPack).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1",
      payrollRunId: "run-1",
      actorId: "command-reader-1",
      actorPermissions: ["payroll.command.read"],
      now: asOf,
      persistPack: false,
    }), client)
    expect(mockGetPayrollAdapterOperationsReadModel).toHaveBeenCalledWith(expect.objectContaining({
      actorId: "command-reader-1",
      actorPermissions: ["payroll.command.read"],
      asOf,
      limit: 25,
    }), client)
    expect(result.currentPeriod?.selection).toBe("calendar-match")
    expect(result.roleScope.canReadCommand).toBe(true)
    expect(result.roleScope.canReadSalaryAmounts).toBe(false)
    expect(result.redaction.payrollAmounts.mode).toBe("redact")
    expect(result.trustedCounts).toEqual(expect.objectContaining({
      activeEmployees: 2,
      linkedEmployees: 1,
      activeContracts: 1,
      frozenAttendanceSnapshots: 1,
      ledgerBlockers: 2,
      reconciliationExceptions: 1,
      activeEmployeeBalanceCases: 1,
      openEmployeeBalanceCases: 1,
      partiallySettledEmployeeBalanceCases: 0,
    }))
    expect(result.blockers.map((blocker) => blocker.code)).toEqual(expect.arrayContaining([
      "PAYROLL_EMPLOYEE_USER_MAPPING_GAP",
      "PAYROLL_ACTIVE_CONTRACT_GAP",
      "PAYROLL_PAYMENT_DESTINATION_EVIDENCE_GAP",
      "PAYROLL_LEDGER_POSTING_BLOCKERS_OPEN",
      "PAYROLL_EMPLOYEE_BALANCE_CASES_OPEN",
      "PAYROLL_DECLARATION_ACTION_REQUIRED",
      "PAYROLL_CLOSE_CRITICAL_BLOCKERS_OPEN",
      "PAYROLL_PROVIDER_OPERATIONS_BLOCKED",
      "PAYROLL_AUTHORITY_ADAPTER_DEAD_LETTER",
      "PAYROLL_ADAPTER_CERTIFICATION_GAPS",
      "PAYROLL_PILOT_CYCLE_CERTIFICATE_MISSING",
      "PAYROLL_FINAL_RELEASE_READINESS_BLOCKED",
    ]))
    expect(result.nextActions.map((action) => action.id)).toEqual(expect.arrayContaining([
      "map-payroll-employees",
      "clear-payment-destination-evidence",
      "clear-payroll-ledger-blockers",
      "settle-employee-balance-cases",
      "review-payroll-adapter-operations",
    ]))
    expect(result.nextActions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "map-payroll-employees", href: "/dashboard/payroll/employees", allowed: false }),
      expect.objectContaining({ id: "activate-payroll-contracts", href: "/dashboard/payroll/contracts", allowed: false }),
      expect.objectContaining({ id: "clear-salary-change-queue", href: "/dashboard/payroll/compensation", allowed: false }),
      expect.objectContaining({ id: "freeze-attendance-snapshots", href: "/dashboard/payroll/attendance", allowed: false }),
      expect.objectContaining({ id: "clear-payment-destination-evidence", href: "/dashboard/payroll/attendance", allowed: false }),
      expect.objectContaining({ id: "clear-payroll-ledger-blockers", href: "/dashboard/accounting/control-center", allowed: false }),
      expect.objectContaining({ id: "resolve-payroll-payment-exceptions", href: "/dashboard/finance/reconciliation", allowed: false }),
      expect.objectContaining({ id: "settle-employee-balance-cases", href: "/dashboard/payroll/payments", allowed: false }),
      expect.objectContaining({ id: "review-payroll-adapter-operations", href: "/dashboard/payroll/payments", allowed: false }),
    ]))
    expect(result.readiness.employeeBalances).toEqual(expect.objectContaining({
      state: "ACTION_REQUIRED",
      source: "payroll.employee_balance",
      blockerCodes: ["PAYROLL_EMPLOYEE_BALANCE_CASES_OPEN"],
    }))
    expect(result.readiness.adapterOperations).toEqual(expect.objectContaining({
      state: "BLOCKED",
      source: "payroll.adapter_operations",
      blockerCodes: expect.arrayContaining([
        "PAYROLL_PROVIDER_OPERATIONS_BLOCKED",
        "PAYROLL_AUTHORITY_ADAPTER_DEAD_LETTER",
        "PAYROLL_ADAPTER_CERTIFICATION_GAPS",
        "PAYROLL_ADAPTER_CHAOS_GATE_MISSING",
      ]),
    }))
    expect(result.readiness.pilotCertification).toEqual(expect.objectContaining({
      state: "ACTION_REQUIRED",
      source: "payroll.pilot_cycle_certification",
      blockerCodes: ["PAYROLL_PILOT_CYCLE_CERTIFICATE_MISSING"],
    }))
    expect(result.evidence.pilotCertification).toEqual(expect.objectContaining({
      status: "NOT_EVALUATED",
      auditLogId: null,
      certificateHash: null,
    }))
    expect(result.evidence.pilotCertificationInput).toEqual(expect.objectContaining({
      payrollRunId: "run-1",
      runNumber: "PR-2026-06",
      expectedSourceRegisterHash: "sha256:run-evidence",
      expectedProofBackfillCertificateHash: null,
      inputComplete: false,
      missingInputs: expect.arrayContaining([
        "expectedProofBackfillCertificateHash",
      ]),
    }))
    expect(result.readiness.finalRelease).toEqual(expect.objectContaining({
      state: "BLOCKED",
      source: "payroll.final_release_readiness",
      blockerCodes: ["FINAL_STATUTORY_SCENARIO_COVERAGE_NOT_READY"],
    }))
    expect(result.evidence.finalRelease).toEqual(expect.objectContaining({
      decision: "NOT_READY",
      packHash: "sha256:final-release-pack",
      blockerCount: 1,
      criticalBlockerCount: 1,
      statutorySetup: expect.objectContaining({
        status: "BLOCKED",
        evidenceHash: "sha256:statutory-scenario-coverage",
        families: "8/9",
        missingReviewEvidenceCount: 1,
        sourceEvidenceHashCount: 1,
        requiredReviewTopicCount: 2,
        requiredReviewTopics: "taxableSalaryBase, bracketsAndRates",
      }),
      countryPackReviewIntake: expect.objectContaining({
        status: "APPROVED",
        evidenceHash: "sha256:country-pack-review-approval",
        approvalHash: "sha256:country-pack-review-approval",
        certificateHash: "sha256:country-pack-review-certificate",
        proposedPackVersion: "CM-2026.2",
        targetFamilyCount: 1,
        targetFamilies: ["IRPP_PERIOD"],
        freshAuthSatisfied: true,
        approvalEvidenceHashPresent: true,
      }),
    }))
    expect(result.adapterOperations.summary).toEqual(expect.objectContaining({
      providerBlocked: 1,
      authorityDeadLetter: 1,
      paymentAdapterGaps: 1,
      adapterChaosGateBlockers: 2,
    }))
    expect(result.adapterOperations.redaction.rawPayloadsIncluded).toBe(false)
    expect(result.sourceScope).toEqual(expect.objectContaining({
      employeeBalanceReturned: 1,
      employeeBalanceCoverageComplete: true,
      sourceServices: expect.arrayContaining(["services/payroll/adapter-operations-read-model.service.ts", "services/payroll/payroll-pilot-cycle-certification.service.ts", "services/payroll/payroll-final-release-readiness.service.ts"]),
    }))
    expect(result.freshness).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: "payroll.employee_balance" }),
      expect.objectContaining({ source: "payroll.pilot_cycle_certification" }),
      expect.objectContaining({ source: "payroll.final_release_readiness" }),
    ]))
    expect(result.evidence.latestRun).toEqual(expect.objectContaining({
      id: "run-1",
      documentHash: "sha256:run-doc",
      lineCount: 2,
    }))
    expect(result.evidence.latestDeclaration).toEqual(expect.objectContaining({
      id: "decl-1",
      countryPackRegisterProofHash: "sha256:country-pack-register-proof",
      countryPackRegisterProofStatus: "MATCHED",
      countryPackRegisterProofPresent: true,
      countryPackRegisterProofLineCount: 2,
      countryPackRegisterProofMissingLineCount: 0,
      countryPackRegisterProofMismatchedLineCount: 0,
      countryPackLineProofHashes: ["sha256:line-proof-1", "sha256:line-proof-2"],
      statutoryScenarioCoverageHash: "sha256:statutory-scenario-coverage",
      countryPackReviewEvidenceSourceHashes: ["sha256:review-source-1"],
      countryPackLegalRefs: ["CNPS-2026"],
    }))
    expect(result.blockers.map((blocker) => blocker.code)).not.toContain("PAYROLL_DECLARATION_COUNTRY_PACK_REGISTER_PROOF_MISSING")
    expect(client.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        entityType: "PayrollCommandReadModel",
        action: "PAYROLL_COMMAND_READ_MODEL_READ",
        userId: "command-reader-1",
      }),
    }))
    expect(JSON.stringify(result)).not.toContain("bankAccountNumber")
  })

  it("routes declaration country-pack proof gaps to the declaration workbench", async () => {
    const client = buildClient()
    client.payrollDeclaration.findMany.mockResolvedValueOnce([
      {
        id: "decl-1",
        authority: "CNPS",
        declarationType: "SOCIAL_SECURITY",
        status: PayrollDeclarationStatus.ACCEPTED,
        payloadHash: "sha256:decl-payload",
        countryPackResolutionHash: "sha256:country-pack",
        metadata: {
          countryPackRegisterProofStatus: "MISSING",
        },
        dueDate: new Date("2026-07-10T00:00:00.000Z"),
        updatedAt,
      },
    ])

    const result = await getPayrollCommandReadModel({
      organizationId: "org-1",
      actorId: "declaration-manager-1",
      actorPermissions: ["payroll.command.read", "payroll.declarations.manage"],
      limit: 25,
      asOf,
    }, client as never)

    expect(result.blockers).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: "PAYROLL_DECLARATION_COUNTRY_PACK_REGISTER_PROOF_MISSING",
        domain: "declaration",
        severity: "high",
      }),
    ]))
    expect(result.readiness.declarations.blockerCodes).toEqual(expect.arrayContaining([
      "PAYROLL_DECLARATION_COUNTRY_PACK_REGISTER_PROOF_MISSING",
    ]))
    expect(result.nextActions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: "review-declaration-country-pack-register-proof",
        href: "/dashboard/payroll/declarations",
        allowed: true,
        requiredPermission: "payroll.declarations.manage",
      }),
    ]))
    expect(result.evidence.latestDeclaration).toEqual(expect.objectContaining({
      countryPackRegisterProofHash: null,
      countryPackRegisterProofStatus: "MISSING",
      countryPackRegisterProofPresent: false,
    }))
  })

  it("surfaces a persisted certified pilot-cycle certificate as release-review ready", async () => {
    mockBuildPayrollFinalReleaseReadinessPack.mockResolvedValueOnce(finalReleasePack({
      decision: "READY_FOR_FULL_PRODUCTION_APPROVAL",
      gates: finalReleasePack().gates.map((gate) => ({
        ...gate,
        status: "PASS",
        blockerCodes: [],
      })),
      blockers: [],
    }))
    const client = buildClient(
      {
        id: "pilot-audit-1",
        createdAt: new Date("2026-06-26T07:55:00.000Z"),
        changes: {
          status: "CERTIFIED_FOR_PRODUCTION_RELEASE_REVIEW",
          certificateHash: "sha256:pilot-certificate",
          generatedAt: "2026-06-26T07:50:00.000Z",
          blockers: [],
          releaseGateRequirements: [{ gate: "policy-and-immutability" }, { gate: "accounting-data-trust" }],
          signoff: { missingRoles: [] },
          redaction: { policy: "payroll-controlled-pilot-cycle-certificate-redaction" },
        },
      },
      {
        id: "proof-backfill-audit-1",
        createdAt: new Date("2026-06-26T07:54:00.000Z"),
        changes: {
          before: null,
          after: {
            status: "READY_FOR_CLOSE_RECHECK",
            certificateHash: "sha256:proof-backfill-certificate",
            sourceCertificate: {
              adapterChaosReleaseGateHash: "sha256:adapter-chaos-gate",
            },
          },
        },
      },
    )

    const result = await getPayrollCommandReadModel({
      organizationId: "org-1",
      actorId: "command-reader-1",
      actorPermissions: ["payroll.command.read"],
      limit: 25,
      asOf,
    }, client as never)

    expect(result.readiness.pilotCertification).toEqual(expect.objectContaining({
      state: "READY",
      blockerCodes: [],
    }))
    expect(result.evidence.pilotCertification).toEqual(expect.objectContaining({
      status: "CERTIFIED_FOR_PRODUCTION_RELEASE_REVIEW",
      auditLogId: "pilot-audit-1",
      certificateHash: "sha256:pilot-certificate",
      releaseGateCount: 2,
      redactionPolicy: "payroll-controlled-pilot-cycle-certificate-redaction",
    }))
    expect(result.evidence.pilotCertificationInput).toEqual(expect.objectContaining({
      payrollRunId: "run-1",
      runNumber: "PR-2026-06",
      expectedSourceRegisterHash: "sha256:run-evidence",
      expectedAdapterChaosReleaseGateHash: "sha256:adapter-chaos-gate",
      expectedProofBackfillCertificateHash: "sha256:proof-backfill-certificate",
      proofBackfillStatus: "READY_FOR_CLOSE_RECHECK",
      proofBackfillAuditLogId: "proof-backfill-audit-1",
      inputComplete: true,
      missingInputs: [],
    }))
    expect(result.readiness.finalRelease).toEqual(expect.objectContaining({
      state: "READY",
      blockerCodes: [],
    }))
    expect(result.evidence.finalRelease).toEqual(expect.objectContaining({
      decision: "READY_FOR_FULL_PRODUCTION_APPROVAL",
      blockerCount: 0,
      criticalBlockerCount: 0,
    }))
    expect(result.blockers.map((blocker) => blocker.code)).not.toContain("PAYROLL_PILOT_CYCLE_CERTIFICATE_MISSING")
    expect(result.blockers.map((blocker) => blocker.code)).not.toContain("PAYROLL_FINAL_RELEASE_READINESS_BLOCKED")
  })

  it("marks next-action availability from actor permissions", async () => {
    const result = await getPayrollCommandReadModel({
      organizationId: "org-1",
      actorId: "payroll-manager-1",
      actorPermissions: [
        "payroll.command.read",
        "payroll.contracts.manage",
        "payroll.salary_changes.approve",
        "payments.reconciliation.exception.resolve",
        "payroll.payments.reconcile",
      ],
      asOf,
    }, buildClient() as never)

    expect(result.nextActions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "activate-payroll-contracts", href: "/dashboard/payroll/contracts", allowed: true }),
      expect.objectContaining({ id: "clear-salary-change-queue", href: "/dashboard/payroll/compensation", allowed: true }),
      expect.objectContaining({ id: "resolve-payroll-payment-exceptions", href: "/dashboard/finance/reconciliation", allowed: true }),
      expect.objectContaining({ id: "settle-employee-balance-cases", href: "/dashboard/payroll/payments", allowed: true }),
      expect.objectContaining({ id: "review-payroll-adapter-operations", href: "/dashboard/payroll/payments", allowed: true }),
      expect.objectContaining({ id: "freeze-attendance-snapshots", href: "/dashboard/payroll/attendance", allowed: false }),
    ]))
  })

  it("blocks command reads without explicit command permission", async () => {
    await expect(getPayrollCommandReadModel({
      organizationId: "org-1",
      actorId: "viewer-1",
      actorPermissions: ["payroll.read"],
      asOf,
    }, buildClient() as never)).rejects.toBeInstanceOf(ForbiddenError)
  })
})