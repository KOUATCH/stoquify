jest.mock("server-only", () => ({}))

jest.mock("@/prisma/db", () => {
  const dbMock = {
    $transaction: jest.fn(),
    user: {
      findFirst: jest.fn(),
    },
    accountingPeriod: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    closeRun: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    closeChecklistItem: {
      create: jest.fn(),
    },
    closeAssuranceFinding: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    closeEvidenceItem: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    accountantReview: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    accountantComment: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    ledgerAuditEvent: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
  }
  dbMock.$transaction = jest.fn((callback) => callback(dbMock))
  return { db: dbMock }
})

jest.mock("../periods.service", () => ({
  getPeriodClosePreflight: jest.fn(),
  getPeriodClosePreflightFailures: jest.fn(),
}))

jest.mock("../reconciliations.service", () => ({
  reconcileLedger: jest.fn(),
}))

jest.mock("../data-trust.service", () => ({
  getAccountantPortalData: jest.fn(),
}))

jest.mock("../accountant-access.service", () => ({
  resolveAccountantClientAccess: jest.fn(),
}))

jest.mock(
  "@/services/reconciliation/payment-reconciliation-dashboard.service",
  () => ({
    getPaymentReconciliationDashboardData: jest.fn(),
  }),
)

jest.mock("@/services/inventory/inventory-valuation.service", () => ({
  reconcileInventoryClass3: jest.fn(),
}))

jest.mock("@/services/snapshots/tenant-operating-snapshot.service", () => ({
  getTenantOperatingSnapshot: jest.fn(),
}))

jest.mock("@/services/events/business-event.service", () => ({
  recordBusinessEventInTx: jest.fn(),
}))

import { db } from "@/prisma/db"
import { ForbiddenError } from "@/services/_shared/action-errors"
import { resolveAccountantClientAccess } from "../accountant-access.service"
import { getAccountantPortalData } from "../data-trust.service"
import { reconcileInventoryClass3 } from "@/services/inventory/inventory-valuation.service"
import { getTenantOperatingSnapshot } from "@/services/snapshots/tenant-operating-snapshot.service"
import { recordBusinessEventInTx } from "@/services/events/business-event.service"
import {
  getPeriodClosePreflight,
  getPeriodClosePreflightFailures,
} from "../periods.service"
import { reconcileLedger } from "../reconciliations.service"
import { getPaymentReconciliationDashboardData } from "@/services/reconciliation/payment-reconciliation-dashboard.service"
import {
  acceptMissingCloseEvidenceResponse,
  approveCloseWaiver,
  assignCloseFinding,
  requestMissingCloseEvidence,
  respondToMissingCloseEvidence,
  commentOnCloseFinding,
  getCloseAssuranceDashboard,
  getCloseEvidenceGraph,
  requestCloseWaiver,
  runCloseAssurance,
} from "../close-assurance.service"

const mockDb = db as unknown as {
  $transaction: jest.Mock
  user: {
    findFirst: jest.Mock
  }
  accountingPeriod: {
    findFirst: jest.Mock
    findMany: jest.Mock
  }
  closeRun: {
    create: jest.Mock
    findFirst: jest.Mock
  }
  closeChecklistItem: {
    create: jest.Mock
  }
  closeAssuranceFinding: {
    create: jest.Mock
    findFirst: jest.Mock
    update: jest.Mock
    updateMany: jest.Mock
  }
  closeEvidenceItem: {
    create: jest.Mock
    findFirst: jest.Mock
  }
  accountantReview: {
    create: jest.Mock
    findFirst: jest.Mock
  }
  accountantComment: {
    findFirst: jest.Mock
    create: jest.Mock
  }
  ledgerAuditEvent: {
    create: jest.Mock
  }
}

const mockGetPeriodClosePreflight = getPeriodClosePreflight as jest.Mock
const mockGetPeriodClosePreflightFailures =
  getPeriodClosePreflightFailures as jest.Mock
const mockReconcileLedger = reconcileLedger as jest.Mock
const mockGetAccountantPortalData = getAccountantPortalData as jest.Mock
const mockResolveAccountantClientAccess =
  resolveAccountantClientAccess as jest.Mock
const mockGetPaymentReconciliationDashboardData =
  getPaymentReconciliationDashboardData as jest.Mock
const mockReconcileInventoryClass3 = reconcileInventoryClass3 as jest.Mock
const mockGetTenantOperatingSnapshot = getTenantOperatingSnapshot as jest.Mock
const mockRecordBusinessEventInTx = recordBusinessEventInTx as jest.Mock

const period = {
  id: "period-1",
  name: "June 2026",
  status: "OPEN",
  startDate: new Date("2026-06-01T00:00:00.000Z"),
  endDate: new Date("2026-06-30T23:59:59.999Z"),
}

function cleanPreflight() {
  return {
    draftEntryCount: 0,
    unresolvedPostingBatchCount: 0,
    unlinkedPostedEntryCount: 0,
    openReconciliationExceptionCount: 0,
    openReconciliationSuspenseCount: 0,
    unsignedReconciliationRunCount: 0,
    trialBalanceIssues: [],
  }
}

function cleanLedger() {
  return {
    organizationId: "org-1",
    periodId: period.id,
    isClean: true,
    totalsByCurrency: [
      {
        currency: "XAF",
        debit: "120000.00",
        credit: "120000.00",
        difference: "0.00",
      },
    ],
    failures: [],
  }
}

function cleanPaymentDashboard() {
  return {
    source: {
      mode: "DURABLE_EVIDENCE_KERNEL",
      certificationStatus: "SIGNED",
      asOf: "2026-06-15T12:00:00.000Z",
      organizationScoped: true,
      providerEvidenceAvailable: true,
      statementEvidenceAvailable: true,
    },
    summary: {
      providerAccountCount: 1,
      activeProviderAccountCount: 1,
      recentRunCount: 1,
      readyForSignoffCount: 0,
      signedRunCount: 1,
      openExceptionCount: 0,
      criticalExceptionCount: 0,
      openSuspenseCount: 0,
      openSuspenseAmount: 0,
      closeBlockerCount: 0,
    },
    providerAccounts: [],
    recentRuns: [
      {
        id: "recon-run-1",
        providerAccountId: "provider-1",
        businessDate: "2026-06-15T00:00:00.000Z",
        status: "SIGNED",
        matchCount: 8,
        exceptionCount: 0,
        suspenseAmount: 0,
        signedAt: "2026-06-15T10:00:00.000Z",
        certificateHash: "sha256:recon",
      },
    ],
    suspenseQueue: [],
    exceptionGroups: [],
    controls: {},
  }
}

function cleanDataTrust() {
  return {
    source: {
      mode: "LEDGER_BACKED_DATA_TRUST",
      asOf: "2026-06-15T12:00:00.000Z",
      organizationScoped: true,
      trustLevel: "T4",
      certificationStatus: "CERTIFIED",
      scopeHash: "sha256:scope",
      sourceTables: [
        "journal_entries",
        "accounting_source_links",
        "ledger_audit_events",
      ],
    },
    scope: {
      organizationId: "org-1",
      periodId: period.id,
      periodName: period.name,
      periodStatus: "OPEN",
      startDate: period.startDate.toISOString(),
      endDate: period.endDate.toISOString(),
    },
    certificate: {
      surface: "dashboard/accounting/accountant-portal",
      level: "T4",
      verdict: "CERTIFIED",
      generatedAt: "2026-06-15T12:00:00.000Z",
      evidence: [],
      requiredForNextLevel: [],
    },
    summary: {
      postedJournalEntries: 2,
      journalLines: 4,
      sourceLinks: 2,
      linkedPostedEntries: 2,
      sourceLinkCoveragePct: 100,
      ledgerBalanced: true,
      blockerCount: 0,
      criticalBlockers: 0,
      highBlockers: 0,
    },
    figures: {},
    moduleEvidence: [
      {
        module: "ledger",
        status: "ready",
        label: "Ledger",
        detail: "Balanced",
        facts: [],
      },
      {
        module: "payments",
        status: "ready",
        label: "Payments",
        detail: "Signed",
        facts: [],
      },
      {
        module: "purchasing",
        status: "ready",
        label: "Purchasing",
        detail: "Ready",
        facts: [],
      },
      {
        module: "payroll",
        status: "ready",
        label: "Payroll",
        detail: "Ready",
        facts: [],
      },
      {
        module: "compliance",
        status: "ready",
        label: "Compliance",
        detail: "Ready",
        facts: [],
      },
    ],
    blockers: [],
    latestSourceLinks: [
      {
        id: "source-link-1",
        sourceType: "POS_SALE",
        sourceId: "sale-1",
        sourceNumber: "POS-1",
        journalEntryNumber: "JE-1",
        postingBatchId: "batch-1",
        postingStatus: "POSTED",
        createdAt: "2026-06-15T10:00:00.000Z",
      },
    ],
    latestAuditEvents: [
      {
        id: "ledger-audit-1",
        source: "ledger",
        action: "POSTING_BATCH_POSTED",
        status: "allowed",
        resourceType: "LedgerPostingBatch",
        resourceId: "batch-1",
        actorId: "accountant-1",
        createdAt: "2026-06-15T10:01:00.000Z",
      },
    ],
    exportReadiness: {},
  }
}

function cleanInventoryValuation() {
  return {
    organizationId: "org-1",
    periodId: period.id,
    currency: "XAF",
    status: "PASSED",
    inventoryValue: "700.00",
    ledgerClass3Value: "700.00",
    driftAmount: "0.00",
    reportHash: "sha256:inventory-valuation",
    sourceCounts: {
      inventoryLevelCount: 1,
      inventoryTransactionCount: 2,
      stockAdjustmentCount: 0,
      stockWriteOffCount: 0,
      stockCountVarianceCount: 0,
      purchaseReceiptCount: 1,
      posMovementCount: 1,
      openingStockCount: 0,
      class3JournalLineCount: 1,
      stockBusinessEventCount: 2,
    },
    failures: [],
  }
}

function payrollForecastMetrics(overrides: Record<string, unknown> = {}) {
  return {
    status: "AUTHORITATIVE",
    authoritative: true,
    reasonCode: "PAYROLL_FORECAST_SOURCE_LINKED",
    message:
      "Upcoming payroll net-pay and statutory-liability forecasts are sourced from posted payroll evidence.",
    horizonStart: "2026-06-15T00:00:00.000Z",
    horizonEnd: "2026-06-30T23:59:59.999Z",
    upcomingNetPayAmount: 125000,
    upcomingStatutoryLiabilityAmount: 45000,
    totalUpcomingAmount: 170000,
    payrollPeriodCount: 1,
    payrollRunCount: 1,
    paymentBatchCount: 1,
    declarationCount: 1,
    sourceLinkCount: 2,
    evidenceHashCount: 4,
    certifiedInputRunCount: 1,
    certifiedInputProofHashCount: 4,
    registerToLedgerRunCount: 1,
    nextPayDate: "2026-06-25T00:00:00.000Z",
    nextDeclarationDueDate: "2026-06-28T00:00:00.000Z",
    personLevelAmountsRedacted: true,
    blockerCodes: [],
    ...overrides,
  }
}

function tenantOperatingSnapshot(overrides: Record<string, unknown> = {}) {
  return {
    kind: "tenant.operating",
    organizationId: "org-1",
    locationId: null,
    periodStart: period.startDate.toISOString(),
    periodEnd: period.endDate.toISOString(),
    status: "fresh",
    uiState: "fresh",
    evidenceGrade: "posted",
    freshness: {
      generatedAt: "2026-06-15T12:00:00.000Z",
      sourceMaxUpdatedAt: "2026-06-15T11:00:00.000Z",
      maxAgeMinutes: 1440,
      stale: false,
      staleReason: null,
    },
    sourceHash: "sha256:tenant-operating-payroll-forecast",
    generatedAt: "2026-06-15T12:00:00.000Z",
    sourceModules: ["hris", "payroll", "payments", "accounting", "close"],
    metrics: {
      payrollFinanceForecast: payrollForecastMetrics(),
    },
    blockers: [],
    redactions: [],
    ...overrides,
  }
}

function persistedRun(overrides: Record<string, unknown> = {}) {
  return {
    id: "close-run-1",
    organizationId: "org-1",
    periodId: period.id,
    status: "READY",
    readinessScore: 88,
    criticalBlockerCount: 0,
    highBlockerCount: 0,
    evidenceCoveragePct: "80",
    asOf: new Date("2026-06-15T12:00:00.000Z"),
    startedAt: new Date("2026-06-15T12:00:00.000Z"),
    completedAt: new Date("2026-06-15T12:01:00.000Z"),
    runById: "user-1",
    correlationId: "corr-1",
    summary: {},
    provenance: {
      items: [
        {
          label: "Ledger and period close",
          provenance: "POSTED",
          asOf: "2026-06-15T12:00:00.000Z",
          periodStatus: "OPEN",
          sourceTables: ["accounting_periods", "journal_entries"],
        },
      ],
    },
    metadata: { trustLevel: "T4" },
    createdAt: new Date("2026-06-15T12:00:00.000Z"),
    checklistItems: [
      {
        id: "check-1",
        key: "period-state",
        domain: "LEDGER",
        status: "PASSED",
        severity: "INFO",
        label: "Period state",
        detail: "Period is open.",
        sourceService: "services/accounting/periods.service.ts",
        evidenceCount: 1,
        blockerReason: null,
        nextActionHref: null,
        ownerId: null,
        dueAt: null,
      },
    ],
    findings: [],
    evidenceItems: [
      {
        id: "evidence-1",
        checklistItemId: "check-1",
        findingId: null,
        evidenceType: "REPORT_EXPORT",
        sourceTable: "journal_entry_lines",
        sourceType: "TrialBalanceCurrency",
        sourceId: "XAF",
        sourceLabel: "Trial balance XAF",
        sourceDate: new Date("2026-06-15T12:00:00.000Z"),
        sourceHash: null,
        provenance: "POSTED",
        available: true,
        unavailableReason: null,
        correlationId: "corr-1",
      },
    ],
    comments: [],
    reviews: [],
    ...overrides,
  }
}

function missingEvidenceFinding(overrides: Record<string, unknown> = {}) {
  return {
    id: "finding-1",
    organizationId: "client-org",
    periodId: period.id,
    closeRunId: "close-run-1",
    status: "OPEN",
    severity: "HIGH",
    checklistItem: { status: "UNAVAILABLE", evidenceCount: 0 },
    evidenceItems: [],
    ...overrides,
  }
}

function missingEvidenceComment(overrides: Record<string, unknown> = {}) {
  return {
    id: "request-1",
    organizationId: "client-org",
    periodId: period.id,
    closeRunId: "close-run-1",
    findingId: "finding-1",
    authorId: "accountant-1",
    body: "Please attach the missing signed bank statement.",
    visibility: "CLIENT_ACTION_REQUIRED",
    correlationId: "missing-proof-corr-1",
    metadata: {
      requestType: "MISSING_CLOSE_EVIDENCE",
      requestedById: "accountant-1",
      requestedFromId: "client-user-1",
      dueAt: "2026-08-05T12:00:00.000Z",
      correlationId: "missing-proof-corr-1",
    },
    createdAt: new Date("2026-08-02T10:00:00.000Z"),
    ...overrides,
  }
}

function missingEvidenceResponse(overrides: Record<string, unknown> = {}) {
  return {
    id: "response-1",
    organizationId: "client-org",
    periodId: period.id,
    closeRunId: "close-run-1",
    findingId: "finding-1",
    authorId: "client-user-1",
    body: "The signed bank statement has been delivered for review.",
    visibility: "CLIENT_RESPONSE_SUBMITTED",
    correlationId: "missing-proof-response-corr-1",
    metadata: {
      responseType: "MISSING_CLOSE_EVIDENCE_RESPONSE",
      requestId: "request-1",
      requestCorrelationId: "missing-proof-corr-1",
      requestedById: "accountant-1",
      requestedFromId: "client-user-1",
      respondedById: "client-user-1",
      correlationId: "missing-proof-response-corr-1",
    },
    createdAt: new Date("2026-08-02T10:30:00.000Z"),
    ...overrides,
  }
}

function missingEvidenceAcceptance(overrides: Record<string, unknown> = {}) {
  return {
    id: "acceptance-1",
    organizationId: "client-org",
    periodId: period.id,
    closeRunId: "close-run-1",
    findingId: "finding-1",
    authorId: "accountant-1",
    body: "Response evidence reviewed and accepted for this finding.",
    visibility: "ACCOUNTANT_RESPONSE_ACCEPTED",
    correlationId: "missing-proof-acceptance-corr-1",
    metadata: {
      acceptanceType: "MISSING_CLOSE_EVIDENCE_RESPONSE_ACCEPTANCE",
      requestId: "request-1",
      responseId: "response-1",
      requestCorrelationId: "missing-proof-corr-1",
      responseCorrelationId: "missing-proof-response-corr-1",
      findingId: "finding-1",
      periodId: period.id,
      closeRunId: "close-run-1",
      respondedById: "client-user-1",
      acceptedById: "accountant-1",
      decision: "ACCEPTED",
      findingStatus: "RESOLVED",
      resolvedAt: "2026-08-02T11:00:00.000Z",
      correlationId: "missing-proof-acceptance-corr-1",
    },
    createdAt: new Date("2026-08-02T11:00:00.000Z"),
    ...overrides,
  }
}

function missingEvidenceAcceptanceControl(
  overrides: Record<string, unknown> = {},
) {
  return {
    actorId: "accountant-1",
    actorPermissions: ["accounting.close.accountant.review"],
    freshAuth: {
      actorId: "accountant-1",
      organizationId: "accounting-firm",
      lastAuthAt: new Date("2026-08-02T10:58:00.000Z"),
    },
    ...overrides,
  }
}

function acceptanceInput(overrides: Record<string, unknown> = {}) {
  return {
    clientOrganizationId: "client-org",
    requestId: "request-1",
    responseId: "response-1",
    resolutionNotes: "Response evidence reviewed and accepted for this finding.",
    correlationId: "missing-proof-acceptance-corr-1",
    ...overrides,
  }
}

function seedCleanSources() {
  mockDb.$transaction.mockImplementation((callback) => callback(mockDb))
  mockDb.accountingPeriod.findFirst.mockResolvedValue(period)
  mockDb.accountingPeriod.findMany.mockResolvedValue([period])
  mockDb.closeRun.findFirst.mockResolvedValue(null)
  mockDb.closeRun.create.mockImplementation(({ data }) =>
    Promise.resolve({
      id: "close-run-1",
      periodId: data.periodId,
      status: data.status,
      readinessScore: data.readinessScore,
      criticalBlockerCount: data.criticalBlockerCount,
      highBlockerCount: data.highBlockerCount,
    }),
  )
  mockDb.closeChecklistItem.create.mockImplementation(({ data }) =>
    Promise.resolve({
      id: `check-${data.key}`,
      ...data,
    }),
  )
  mockDb.closeAssuranceFinding.create.mockImplementation(({ data }) =>
    Promise.resolve({
      id: `finding-${data.title}`,
      createdAt: new Date("2026-06-15T12:00:00.000Z"),
      ...data,
    }),
  )
  mockDb.closeEvidenceItem.create.mockResolvedValue({ id: "evidence-created" })
  mockDb.closeAssuranceFinding.updateMany.mockResolvedValue({ count: 1 })
  mockDb.accountantComment.findFirst.mockResolvedValue(null)
  mockDb.user.findFirst.mockResolvedValue({ id: "client-user-1" })
  mockResolveAccountantClientAccess.mockResolvedValue({
    organizationId: "client-org",
    mode: "DELEGATED_ACCOUNTANT",
    grant: { id: "grant-1", role: "REVIEWER" },
  })
  mockDb.ledgerAuditEvent.create.mockResolvedValue({
    id: "ledger-audit-created",
  })
  mockRecordBusinessEventInTx.mockResolvedValue({
    event: { id: "business-event-1" },
    created: true,
  })
  mockGetPeriodClosePreflight.mockResolvedValue(cleanPreflight())
  mockGetPeriodClosePreflightFailures.mockReturnValue([])
  mockReconcileLedger.mockResolvedValue(cleanLedger())
  mockGetPaymentReconciliationDashboardData.mockResolvedValue(
    cleanPaymentDashboard(),
  )
  mockGetAccountantPortalData.mockResolvedValue(cleanDataTrust())
  mockReconcileInventoryClass3.mockResolvedValue(cleanInventoryValuation())
  mockGetTenantOperatingSnapshot.mockResolvedValue(tenantOperatingSnapshot())
}

describe("close assurance service", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    seedCleanSources()
  })

  afterEach(() => {
    jest.useRealTimers()
    mockDb.accountantComment.findFirst.mockReset()
    mockDb.closeAssuranceFinding.updateMany.mockReset()
  })

  it("builds a live close readiness dashboard from close, reconciliation, suspense, and data-trust services", async () => {
    const result = await getCloseAssuranceDashboard("org-1", period.id)

    expect(result.source.persisted).toBe(false)
    expect(result.source.trustLevel).toBe("T4")
    expect(result.period?.id).toBe(period.id)
    expect(result.run.status).toBe("READY")
    expect(result.evidenceItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          evidenceType: "REPORT_EXPORT",
          sourceTable: "journal_entry_lines",
        }),
        expect.objectContaining({
          evidenceType: "RECONCILIATION_CERTIFICATE",
          sourceId: "recon-run-1",
        }),
        expect.objectContaining({
          evidenceType: "DATA_TRUST_CERTIFICATE",
          sourceHash: "sha256:scope",
        }),
        expect.objectContaining({
          sourceType: "InventoryValuationAnnex",
          sourceHash: "sha256:inventory-valuation",
        }),
        expect.objectContaining({
          sourceType: "PayrollFinanceForecastProof",
          sourceHash: "sha256:tenant-operating-payroll-forecast",
          available: true,
          metadata: expect.objectContaining({
            personLevelAmounts: "redacted",
            certifiedInputRunCount: 1,
            certifiedInputProofHashCount: 4,
            registerToLedgerRunCount: 1,
            redactions: expect.arrayContaining([
              expect.objectContaining({ field: "payroll.personLevelAmounts" }),
            ]),
          }),
        }),
      ]),
    )
    expect(result.checklist).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "inventory-valuation",
          status: "PASSED",
        }),
        expect.objectContaining({
          key: "payroll-finance-forecast-proof",
          status: "PASSED",
        }),
      ]),
    )
  })

  it("blocks close readiness when payroll finance forecast proof is incomplete", async () => {
    mockGetTenantOperatingSnapshot.mockResolvedValue(
      tenantOperatingSnapshot({
        status: "blocked",
        uiState: "blocked",
        evidenceGrade: "blocked",
        metrics: {
          payrollFinanceForecast: payrollForecastMetrics({
            status: "NON_AUTHORITATIVE",
            authoritative: false,
            reasonCode: "PAYROLL_FORECAST_PROOF_INCOMPLETE",
            message:
              "Upcoming payroll finance forecasts are withheld because declaration proof is incomplete.",
            upcomingNetPayAmount: 0,
            upcomingStatutoryLiabilityAmount: 0,
            totalUpcomingAmount: 0,
            blockerCodes: ["PAYROLL_FORECAST_DECLARATION_PROOF_MISSING"],
          }),
        },
        blockers: [
          {
            id: "tenant-payroll-finance-forecast-payroll-forecast-declaration-proof-missing",
            severity: "high",
            gate: "payroll_finance_forecast",
            title: "Payroll declaration proof is missing",
            detail:
              "Upcoming statutory liability is withheld until declaration evidence is complete.",
            sourceTables: [
              "payroll_declarations",
              "payroll_declaration_evidence",
            ],
            nextAction:
              "Open payroll declarations and attach source-register-backed declaration evidence.",
          },
        ],
      }),
    )

    const result = await getCloseAssuranceDashboard("org-1", period.id)

    expect(result.run.status).toBe("BLOCKED")
    expect(result.checklist).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "payroll-finance-forecast-proof",
          status: "FAILED",
          nextActionHref: "/dashboard/payroll/declarations",
        }),
      ]),
    )
    expect(result.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          domain: "PAYROLL",
          severity: "HIGH",
          sourceType: "payroll_finance_forecast",
          title: "Payroll declaration proof is missing",
        }),
      ]),
    )
    expect(result.evidenceItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceType: "PayrollFinanceForecastProof",
          available: false,
          provenance: "UNAVAILABLE",
          metadata: expect.objectContaining({
            personLevelAmounts: "redacted",
            blockerCodes: ["PAYROLL_FORECAST_DECLARATION_PROOF_MISSING"],
          }),
        }),
      ]),
    )
  })

  it("classifies inventory valuation mismatches as close blockers", async () => {
    mockReconcileInventoryClass3.mockResolvedValue({
      ...cleanInventoryValuation(),
      status: "BLOCKED",
      inventoryValue: "700.00",
      ledgerClass3Value: "600.00",
      driftAmount: "100.00",
      reportHash: "sha256:inventory-mismatch",
      failures: [
        {
          type: "CLASS3_RECONCILIATION_DRIFT",
          severity: "critical",
          message:
            "Inventory subledger value 700.00 does not reconcile to class 3 ledger value 600.00 XAF.",
          metadata: {
            inventoryValue: "700.00",
            ledgerClass3Value: "600.00",
            driftAmount: "100.00",
            currency: "XAF",
          },
        },
      ],
    })

    const result = await getCloseAssuranceDashboard("org-1", period.id)

    expect(result.run.status).toBe("BLOCKED")
    expect(result.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          domain: "INVENTORY_VALUATION",
          severity: "CRITICAL",
          sourceType: "CLASS3_RECONCILIATION_DRIFT",
        }),
      ]),
    )
    expect(result.checklist).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "inventory-valuation",
          status: "FAILED",
        }),
      ]),
    )
  })

  it("classifies open suspense and unsigned reconciliations as close blockers", async () => {
    mockGetPeriodClosePreflight.mockResolvedValue({
      ...cleanPreflight(),
      openReconciliationSuspenseCount: 2,
      unsignedReconciliationRunCount: 1,
    })

    const result = await getCloseAssuranceDashboard("org-1", period.id)

    expect(result.run.status).toBe("BLOCKED")
    expect(result.run.criticalBlockerCount).toBeGreaterThanOrEqual(1)
    expect(result.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ domain: "SUSPENSE", severity: "CRITICAL" }),
        expect.objectContaining({
          domain: "PAYMENT_RECONCILIATION",
          severity: "HIGH",
        }),
      ]),
    )
  })

  it("persists close runs with checklist evidence and ledger audit evidence", async () => {
    mockDb.closeRun.findFirst.mockResolvedValue(persistedRun())

    const result = await runCloseAssurance(
      "org-1",
      { periodId: period.id, correlationId: "corr-1" },
      {
        actorId: "user-1",
        actorPermissions: ["accounting.close.run"],
        now: "2026-06-15T12:00:00.000Z",
      },
    )

    expect(result.source.persisted).toBe(true)
    expect(mockDb.closeRun.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org-1",
          periodId: period.id,
          runById: "user-1",
          correlationId: "corr-1",
        }),
      }),
    )
    expect(mockDb.closeChecklistItem.create).toHaveBeenCalled()
    expect(mockDb.closeEvidenceItem.create).toHaveBeenCalled()
    expect(mockDb.ledgerAuditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "CLOSE_ASSURANCE_RUN_COMPLETED",
          resourceType: "CloseRun",
        }),
      }),
    )
  })

  it("defaults finding assignment to the current actor and audits the action", async () => {
    mockDb.closeAssuranceFinding.findFirst.mockResolvedValue({
      id: "finding-1",
      organizationId: "org-1",
      periodId: period.id,
      closeRunId: "close-run-1",
      status: "OPEN",
      closeRun: { id: "close-run-1" },
    })
    mockDb.closeAssuranceFinding.update.mockResolvedValue({
      id: "finding-1",
      checklistItemId: "check-1",
      domain: "LEDGER",
      severity: "HIGH",
      status: "ASSIGNED",
      title: "Draft entries remain open",
      detail: "1 blocker detected.",
      sourceService: "services/accounting/periods.service.ts",
      sourceType: "AccountingPeriodClosePreflight",
      sourceId: null,
      ownerId: "user-1",
      assignedById: "user-1",
      assignedAt: new Date("2026-06-15T12:00:00.000Z"),
      dueAt: null,
      waiverRequestedById: null,
      waiverApprovedById: null,
      correlationId: "corr-assign",
    })

    const result = await assignCloseFinding(
      "org-1",
      { findingId: "finding-1", correlationId: "corr-assign" },
      { actorId: "user-1" },
    )

    expect(result.ownerId).toBe("user-1")
    expect(mockDb.closeAssuranceFinding.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ownerId: "user-1",
          status: "ASSIGNED",
        }),
      }),
    )
    expect(mockDb.ledgerAuditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "CLOSE_FINDING_ASSIGNED",
          resourceId: "finding-1",
        }),
      }),
    )
  })

  it("adds source-linked accountant comments to persisted close findings", async () => {
    mockDb.closeAssuranceFinding.findFirst.mockResolvedValue({
      id: "finding-1",
      organizationId: "org-1",
      periodId: period.id,
      closeRunId: "close-run-1",
      status: "OPEN",
      closeRun: { id: "close-run-1" },
    })
    mockDb.accountantComment.create.mockResolvedValue({
      id: "comment-1",
      findingId: "finding-1",
      evidenceItemId: null,
      reviewId: null,
      authorId: "accountant-1",
      body: "Reviewed suspense evidence and assigned to finance.",
      visibility: "INTERNAL",
      createdAt: new Date("2026-06-15T12:10:00.000Z"),
    })

    const result = await commentOnCloseFinding(
      "org-1",
      {
        findingId: "finding-1",
        body: "Reviewed suspense evidence and assigned to finance.",
      },
      { actorId: "accountant-1" },
    )

    expect(result.findingId).toBe("finding-1")
    expect(result.authorId).toBe("accountant-1")
    expect(mockDb.ledgerAuditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "CLOSE_ACCOUNTANT_COMMENT_ADDED",
        }),
      }),
    )
  })

  it("creates an atomic delegated missing-proof request with audit and notification evidence", async () => {
    const now = new Date("2026-08-02T09:00:00.000Z")
    const dueAt = new Date("2026-08-05T12:00:00.000Z")
    jest.useFakeTimers().setSystemTime(now)
    mockDb.closeAssuranceFinding.findFirst.mockResolvedValue(
      missingEvidenceFinding(),
    )
    mockDb.accountantComment.create.mockResolvedValue(
      missingEvidenceComment(),
    )

    const result = await requestMissingCloseEvidence(
      "firm-org",
      {
        clientOrganizationId: "client-org",
        findingId: "finding-1",
        requestedFromId: "client-user-1",
        requestText: "Please attach the missing signed bank statement.",
        dueAt,
        correlationId: "missing-proof-corr-1",
      },
      {
        actorId: "accountant-1",
        actorPermissions: ["accounting.close.evidence.request"],
      },
    )

    expect(result).toMatchObject({
      id: "request-1",
      organizationId: "client-org",
      findingId: "finding-1",
      requestedById: "accountant-1",
      requestedFromId: "client-user-1",
      dueAt: dueAt.toISOString(),
      status: "OPEN",
      correlationId: "missing-proof-corr-1",
    })
    expect(mockDb.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      { isolationLevel: "Serializable" },
    )
    expect(mockResolveAccountantClientAccess).toHaveBeenCalledWith({
      homeOrganizationId: "firm-org",
      clientOrganizationId: "client-org",
      accountantUserId: "accountant-1",
      capability: "REVIEW",
      now,
      client: mockDb,
    })
    expect(mockDb.closeAssuranceFinding.findFirst).toHaveBeenCalledWith({
      where: { id: "finding-1", organizationId: "client-org" },
      include: {
        checklistItem: {
          select: { status: true, evidenceCount: true },
        },
        evidenceItems: {
          where: { available: false },
          select: { id: true },
          take: 1,
        },
      },
    })
    expect(mockDb.user.findFirst).toHaveBeenCalledWith({
      where: {
        id: "client-user-1",
        organizationId: "client-org",
        isActive: true,
      },
      select: { id: true },
    })
    expect(mockDb.closeAssuranceFinding.update).toHaveBeenCalledWith({
      where: { id: "finding-1" },
      data: {
        ownerId: "client-user-1",
        assignedById: "accountant-1",
        assignedAt: now,
        dueAt,
        status: "ASSIGNED",
        correlationId: "missing-proof-corr-1",
      },
    })
    expect(mockDb.accountantComment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: "client-org",
        findingId: "finding-1",
        authorId: "accountant-1",
        body: "Please attach the missing signed bank statement.",
        visibility: "CLIENT_ACTION_REQUIRED",
        correlationId: "missing-proof-corr-1",
        metadata: expect.objectContaining({
          requestType: "MISSING_CLOSE_EVIDENCE",
          requestedFromId: "client-user-1",
          dueAt: dueAt.toISOString(),
        }),
      }),
    })
    expect(mockDb.ledgerAuditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "CLOSE_MISSING_EVIDENCE_REQUESTED",
          actorId: "accountant-1",
          resourceType: "AccountantComment",
          resourceId: "request-1",
        }),
      }),
    )
    expect(mockRecordBusinessEventInTx).toHaveBeenCalledWith(
      mockDb,
      expect.objectContaining({
        organizationId: "client-org",
        eventType: "close.assurance.missing_evidence.requested",
        payload: expect.objectContaining({
          requestId: "request-1",
          requestedFromId: "client-user-1",
          ownerId: "client-user-1",
          dueAt: dueAt.toISOString(),
        }),
      }),
    )
  })

  it.each([
    ["missing actor", {}, new Date("2026-08-05T12:00:00.000Z")],
    [
      "non-future due date",
      { actorId: "accountant-1" },
      new Date("2026-08-02T09:00:00.000Z"),
    ],
  ])("rejects missing-proof request %s before access or transaction work", async (
    _name,
    control,
    dueAt,
  ) => {
    jest.useFakeTimers().setSystemTime(new Date("2026-08-02T09:00:00.000Z"))

    await expect(
      requestMissingCloseEvidence(
        "firm-org",
        {
          clientOrganizationId: "client-org",
          findingId: "finding-1",
          requestedFromId: "client-user-1",
          requestText: "Please attach the missing signed bank statement.",
          dueAt,
          correlationId: "missing-proof-corr-1",
        },
        control,
      ),
    ).rejects.toBeInstanceOf(Error)

    expect(mockResolveAccountantClientAccess).not.toHaveBeenCalled()
    expect(mockDb.$transaction).not.toHaveBeenCalled()
  })

  it("rejects cross-tenant or inactive missing-proof recipients before mutation", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-08-02T09:00:00.000Z"))
    mockDb.closeAssuranceFinding.findFirst.mockResolvedValue(
      missingEvidenceFinding(),
    )
    mockDb.user.findFirst.mockResolvedValue(null)

    await expect(
      requestMissingCloseEvidence(
        "firm-org",
        {
          clientOrganizationId: "client-org",
          findingId: "finding-1",
          requestedFromId: "other-org-user",
          requestText: "Please attach the missing signed bank statement.",
          dueAt: new Date("2026-08-05T12:00:00.000Z"),
          correlationId: "missing-proof-corr-1",
        },
        { actorId: "accountant-1" },
      ),
    ).rejects.toThrow(/active user of the client organization/i)

    expect(mockDb.user.findFirst).toHaveBeenCalledWith({
      where: {
        id: "other-org-user",
        organizationId: "client-org",
        isActive: true,
      },
      select: { id: true },
    })
    expect(mockDb.closeAssuranceFinding.update).not.toHaveBeenCalled()
    expect(mockDb.accountantComment.create).not.toHaveBeenCalled()
    expect(mockDb.ledgerAuditEvent.create).not.toHaveBeenCalled()
    expect(mockRecordBusinessEventInTx).not.toHaveBeenCalled()
  })

  it.each([
    [
      "resolved finding",
      missingEvidenceFinding({ status: "RESOLVED" }),
      /cannot receive missing-proof requests/i,
    ],
    [
      "finding without missing evidence",
      missingEvidenceFinding({
        checklistItem: { status: "PASSED", evidenceCount: 1 },
        evidenceItems: [],
      }),
      /no verified missing-evidence condition/i,
    ],
  ])("rejects %s before missing-proof mutation", async (
    _name,
    finding,
    expectedMessage,
  ) => {
    jest.useFakeTimers().setSystemTime(new Date("2026-08-02T09:00:00.000Z"))
    mockDb.closeAssuranceFinding.findFirst.mockResolvedValue(finding)

    await expect(
      requestMissingCloseEvidence(
        "firm-org",
        {
          clientOrganizationId: "client-org",
          findingId: "finding-1",
          requestedFromId: "client-user-1",
          requestText: "Please attach the missing signed bank statement.",
          dueAt: new Date("2026-08-05T12:00:00.000Z"),
          correlationId: "missing-proof-corr-1",
        },
        { actorId: "accountant-1" },
      ),
    ).rejects.toThrow(expectedMessage)

    expect(mockDb.closeAssuranceFinding.update).not.toHaveBeenCalled()
    expect(mockDb.accountantComment.create).not.toHaveBeenCalled()
    expect(mockDb.ledgerAuditEvent.create).not.toHaveBeenCalled()
    expect(mockRecordBusinessEventInTx).not.toHaveBeenCalled()
  })

  it("returns an exact correlation replay without duplicate side effects", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-08-02T09:00:00.000Z"))
    mockDb.accountantComment.findFirst.mockResolvedValue(
      missingEvidenceComment(),
    )

    const result = await requestMissingCloseEvidence(
      "firm-org",
      {
        clientOrganizationId: "client-org",
        findingId: "finding-1",
        requestedFromId: "client-user-1",
        requestText: "Please attach the missing signed bank statement.",
        dueAt: new Date("2026-08-05T12:00:00.000Z"),
        correlationId: "missing-proof-corr-1",
      },
      { actorId: "accountant-1" },
    )

    expect(result).toMatchObject({
      id: "request-1",
      requestedFromId: "client-user-1",
      status: "OPEN",
    })
    expect(mockDb.accountantComment.findFirst).toHaveBeenCalledWith({
      where: {
        organizationId: "client-org",
        findingId: "finding-1",
        correlationId: "missing-proof-corr-1",
        visibility: "CLIENT_ACTION_REQUIRED",
      },
    })
    expect(mockDb.closeAssuranceFinding.findFirst).not.toHaveBeenCalled()
    expect(mockDb.user.findFirst).not.toHaveBeenCalled()
    expect(mockDb.closeAssuranceFinding.update).not.toHaveBeenCalled()
    expect(mockDb.accountantComment.create).not.toHaveBeenCalled()
    expect(mockDb.ledgerAuditEvent.create).not.toHaveBeenCalled()
    expect(mockRecordBusinessEventInTx).not.toHaveBeenCalled()
  })

  it("rejects correlation reuse for a different missing-proof request", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-08-02T09:00:00.000Z"))
    mockDb.accountantComment.findFirst.mockResolvedValue(
      missingEvidenceComment(),
    )

    await expect(
      requestMissingCloseEvidence(
        "firm-org",
        {
          clientOrganizationId: "client-org",
          findingId: "finding-1",
          requestedFromId: "client-user-1",
          requestText: "Please attach a different proof document.",
          dueAt: new Date("2026-08-05T12:00:00.000Z"),
          correlationId: "missing-proof-corr-1",
        },
        { actorId: "accountant-1" },
      ),
    ).rejects.toThrow(/different missing-proof request/i)

    expect(mockDb.closeAssuranceFinding.update).not.toHaveBeenCalled()
    expect(mockDb.accountantComment.create).not.toHaveBeenCalled()
    expect(mockRecordBusinessEventInTx).not.toHaveBeenCalled()
  })

  it.each(["P2034", "P2002"])(
    "retries serializable missing-proof transaction after %s",
    async (code) => {
      jest.useFakeTimers().setSystemTime(
        new Date("2026-08-02T09:00:00.000Z"),
      )
      mockDb.$transaction
        .mockRejectedValueOnce(Object.assign(new Error("retry"), { code }))
        .mockImplementationOnce((callback) => callback(mockDb))
      mockDb.closeAssuranceFinding.findFirst.mockResolvedValue(
        missingEvidenceFinding(),
      )
      mockDb.accountantComment.create.mockResolvedValue(
        missingEvidenceComment(),
      )

      await expect(
        requestMissingCloseEvidence(
          "firm-org",
          {
            clientOrganizationId: "client-org",
            findingId: "finding-1",
            requestedFromId: "client-user-1",
            requestText: "Please attach the missing signed bank statement.",
            dueAt: new Date("2026-08-05T12:00:00.000Z"),
            correlationId: "missing-proof-corr-1",
          },
          { actorId: "accountant-1" },
        ),
      ).resolves.toMatchObject({ id: "request-1", status: "OPEN" })

      expect(mockDb.$transaction).toHaveBeenCalledTimes(2)
      expect(mockDb.accountantComment.create).toHaveBeenCalledTimes(1)
      expect(mockRecordBusinessEventInTx).toHaveBeenCalledTimes(1)
    },
  )

  it("normalizes an unexpected missing-proof transaction failure without retrying", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-08-02T09:00:00.000Z"))
    mockDb.$transaction.mockRejectedValueOnce(
      new Error("database transport leaked detail"),
    )

    await expect(
      requestMissingCloseEvidence(
        "firm-org",
        {
          clientOrganizationId: "client-org",
          findingId: "finding-1",
          requestedFromId: "client-user-1",
          requestText: "Please attach the missing signed bank statement.",
          dueAt: new Date("2026-08-05T12:00:00.000Z"),
          correlationId: "missing-proof-corr-1",
        },
        { actorId: "accountant-1" },
      ),
    ).rejects.toMatchObject({
      name: "ApplicationError",
      code: "INTERNAL_ERROR",
      status: 500,
      expose: false,
      message: "Missing-proof workflow transaction failed.",
    })

    expect(mockDb.$transaction).toHaveBeenCalledTimes(1)
    expect(mockDb.accountantComment.create).not.toHaveBeenCalled()
    expect(mockRecordBusinessEventInTx).not.toHaveBeenCalled()
  })

  it("submits an atomic recipient-owned missing-proof response with minimized evidence", async () => {
    const responseText =
      "The signed bank statement has been delivered for review."
    mockDb.accountantComment.findFirst
      .mockResolvedValueOnce(missingEvidenceComment())
      .mockResolvedValueOnce(null)
    mockDb.closeAssuranceFinding.findFirst.mockResolvedValue(
      missingEvidenceFinding({
        status: "ASSIGNED",
        ownerId: "client-user-1",
      }),
    )
    mockDb.accountantComment.create.mockResolvedValue(
      missingEvidenceResponse({ body: responseText }),
    )

    const result = await respondToMissingCloseEvidence(
      "client-org",
      {
        requestId: "request-1",
        responseText,
        correlationId: "missing-proof-response-corr-1",
      },
      {
        actorId: "client-user-1",
        actorPermissions: ["accounting.close.finding.comment"],
      },
    )

    expect(result).toMatchObject({
      id: "response-1",
      requestId: "request-1",
      organizationId: "client-org",
      periodId: period.id,
      closeRunId: "close-run-1",
      findingId: "finding-1",
      requestedById: "accountant-1",
      requestedFromId: "client-user-1",
      respondedById: "client-user-1",
      responseText,
      requestCorrelationId: "missing-proof-corr-1",
      status: "SUBMITTED",
      correlationId: "missing-proof-response-corr-1",
    })
    expect(mockDb.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: "Serializable",
    })
    expect(mockDb.user.findFirst).toHaveBeenCalledWith({
      where: {
        id: "client-user-1",
        organizationId: "client-org",
        isActive: true,
      },
      select: { id: true },
    })
    expect(mockDb.accountantComment.findFirst).toHaveBeenNthCalledWith(1, {
      where: {
        id: "request-1",
        organizationId: "client-org",
        visibility: "CLIENT_ACTION_REQUIRED",
        metadata: {
          path: ["requestType"],
          equals: "MISSING_CLOSE_EVIDENCE",
        },
      },
    })
    expect(mockDb.accountantComment.findFirst).toHaveBeenNthCalledWith(2, {
      where: {
        organizationId: "client-org",
        correlationId: "missing-proof-response-corr-1",
        visibility: "CLIENT_RESPONSE_SUBMITTED",
      },
    })
    expect(mockDb.closeAssuranceFinding.findFirst).toHaveBeenCalledWith({
      where: { id: "finding-1", organizationId: "client-org" },
      select: {
        id: true,
        periodId: true,
        closeRunId: true,
        ownerId: true,
        status: true,
        severity: true,
      },
    })
    expect(mockDb.closeAssuranceFinding.update).toHaveBeenCalledWith({
      where: { id: "finding-1" },
      data: {
        status: "IN_REVIEW",
        correlationId: "missing-proof-response-corr-1",
      },
    })
    expect(mockDb.accountantComment.create).toHaveBeenCalledWith({
      data: {
        organizationId: "client-org",
        periodId: period.id,
        closeRunId: "close-run-1",
        findingId: "finding-1",
        authorId: "client-user-1",
        body: responseText,
        visibility: "CLIENT_RESPONSE_SUBMITTED",
        correlationId: "missing-proof-response-corr-1",
        metadata: {
          responseType: "MISSING_CLOSE_EVIDENCE_RESPONSE",
          requestId: "request-1",
          requestCorrelationId: "missing-proof-corr-1",
          requestedById: "accountant-1",
          requestedFromId: "client-user-1",
          respondedById: "client-user-1",
          correlationId: "missing-proof-response-corr-1",
        },
      },
    })
    expect(mockDb.ledgerAuditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "CLOSE_MISSING_EVIDENCE_RESPONSE_SUBMITTED",
          actorId: "client-user-1",
          resourceType: "AccountantComment",
          resourceId: "response-1",
          metadata: expect.objectContaining({
            requestId: "request-1",
            findingId: "finding-1",
            respondedById: "client-user-1",
            status: "SUBMITTED",
          }),
        }),
      }),
    )
    const auditInput = mockDb.ledgerAuditEvent.create.mock.calls.at(-1)?.[0]
    expect(JSON.stringify(auditInput)).not.toContain(responseText)
    expect(mockRecordBusinessEventInTx).toHaveBeenCalledWith(
      mockDb,
      expect.objectContaining({
        organizationId: "client-org",
        eventType: "close.assurance.missing_evidence.response_submitted",
        actorId: "client-user-1",
        sourceId: "finding-1",
        payload: expect.objectContaining({
          requestId: "request-1",
          responseId: "response-1",
          responseType: "MISSING_CLOSE_EVIDENCE_RESPONSE",
          requestedById: "accountant-1",
          requestedFromId: "client-user-1",
          respondedById: "client-user-1",
          status: "SUBMITTED",
        }),
      }),
    )
    const eventInput = mockRecordBusinessEventInTx.mock.calls.at(-1)?.[1]
    expect(JSON.stringify(eventInput)).not.toContain(responseText)
  })

  it("rejects a missing-proof response without an authenticated actor before transaction work", async () => {
    await expect(
      respondToMissingCloseEvidence(
        "client-org",
        {
          requestId: "request-1",
          responseText:
            "The signed bank statement has been delivered for review.",
          correlationId: "missing-proof-response-corr-1",
        },
        {},
      ),
    ).rejects.toThrow(/authenticated client recipient/i)

    expect(mockDb.$transaction).not.toHaveBeenCalled()
    expect(mockDb.user.findFirst).not.toHaveBeenCalled()
  })

  it("rejects an inactive or cross-tenant response actor before request lookup", async () => {
    mockDb.user.findFirst.mockResolvedValue(null)

    await expect(
      respondToMissingCloseEvidence(
        "client-org",
        {
          requestId: "request-1",
          responseText:
            "The signed bank statement has been delivered for review.",
          correlationId: "missing-proof-response-corr-1",
        },
        { actorId: "other-org-user" },
      ),
    ).rejects.toThrow(/active user of the client organization/i)

    expect(mockDb.user.findFirst).toHaveBeenCalledWith({
      where: {
        id: "other-org-user",
        organizationId: "client-org",
        isActive: true,
      },
      select: { id: true },
    })
    expect(mockDb.accountantComment.findFirst).not.toHaveBeenCalled()
    expect(mockDb.closeAssuranceFinding.update).not.toHaveBeenCalled()
  })

  it.each([
    ["unknown or cross-tenant request", null, /request not found/i],
    [
      "malformed typed request evidence",
      missingEvidenceComment({
        metadata: {
          requestType: "MISSING_CLOSE_EVIDENCE",
          requestedFromId: "client-user-1",
          dueAt: "2026-08-05T12:00:00.000Z",
          correlationId: "missing-proof-corr-1",
        },
      }),
      /request evidence is incomplete/i,
    ],
  ])("rejects %s before response mutation", async (_name, request, error) => {
    mockDb.accountantComment.findFirst.mockResolvedValueOnce(request)

    await expect(
      respondToMissingCloseEvidence(
        "client-org",
        {
          requestId: "request-1",
          responseText:
            "The signed bank statement has been delivered for review.",
          correlationId: "missing-proof-response-corr-1",
        },
        { actorId: "client-user-1" },
      ),
    ).rejects.toThrow(error)

    expect(mockDb.closeAssuranceFinding.findFirst).not.toHaveBeenCalled()
    expect(mockDb.closeAssuranceFinding.update).not.toHaveBeenCalled()
    expect(mockDb.accountantComment.create).not.toHaveBeenCalled()
  })

  it("rejects a tenant actor who is not the typed request recipient", async () => {
    mockDb.accountantComment.findFirst.mockResolvedValueOnce(
      missingEvidenceComment({
        metadata: {
          ...missingEvidenceComment().metadata,
          requestedFromId: "another-client-user",
        },
      }),
    )

    await expect(
      respondToMissingCloseEvidence(
        "client-org",
        {
          requestId: "request-1",
          responseText:
            "The signed bank statement has been delivered for review.",
          correlationId: "missing-proof-response-corr-1",
        },
        { actorId: "client-user-1" },
      ),
    ).rejects.toThrow(/requested client recipient/i)

    expect(mockDb.accountantComment.findFirst).toHaveBeenCalledTimes(1)
    expect(mockDb.closeAssuranceFinding.findFirst).not.toHaveBeenCalled()
    expect(mockDb.accountantComment.create).not.toHaveBeenCalled()
  })

  it.each([
    [
      "request/finding period mismatch",
      missingEvidenceFinding({
        status: "ASSIGNED",
        ownerId: "client-user-1",
        periodId: "other-period",
      }),
      /does not match its finding/i,
    ],
    [
      "finding already in review",
      missingEvidenceFinding({
        status: "IN_REVIEW",
        ownerId: "client-user-1",
      }),
      /not awaiting a missing-proof response/i,
    ],
    [
      "resolved finding",
      missingEvidenceFinding({
        status: "RESOLVED",
        ownerId: "client-user-1",
      }),
      /not awaiting a missing-proof response/i,
    ],
    [
      "waived finding",
      missingEvidenceFinding({
        status: "WAIVED_WITH_APPROVAL",
        ownerId: "client-user-1",
      }),
      /not awaiting a missing-proof response/i,
    ],
    [
      "different finding owner",
      missingEvidenceFinding({
        status: "ASSIGNED",
        ownerId: "another-client-user",
      }),
      /assigned finding owner/i,
    ],
  ])("rejects %s before response mutation", async (_name, finding, error) => {
    mockDb.accountantComment.findFirst
      .mockResolvedValueOnce(missingEvidenceComment())
      .mockResolvedValueOnce(null)
    mockDb.closeAssuranceFinding.findFirst.mockResolvedValue(finding)

    await expect(
      respondToMissingCloseEvidence(
        "client-org",
        {
          requestId: "request-1",
          responseText:
            "The signed bank statement has been delivered for review.",
          correlationId: "missing-proof-response-corr-1",
        },
        { actorId: "client-user-1" },
      ),
    ).rejects.toThrow(error)

    expect(mockDb.closeAssuranceFinding.update).not.toHaveBeenCalled()
    expect(mockDb.accountantComment.create).not.toHaveBeenCalled()
    expect(mockDb.ledgerAuditEvent.create).not.toHaveBeenCalled()
    expect(mockRecordBusinessEventInTx).not.toHaveBeenCalled()
  })

  it("returns an exact missing-proof response replay without duplicate side effects", async () => {
    mockDb.accountantComment.findFirst
      .mockResolvedValueOnce(missingEvidenceComment())
      .mockResolvedValueOnce(missingEvidenceResponse())

    const result = await respondToMissingCloseEvidence(
      "client-org",
      {
        requestId: "request-1",
        responseText:
          "The signed bank statement has been delivered for review.",
        correlationId: "missing-proof-response-corr-1",
      },
      { actorId: "client-user-1" },
    )

    expect(result).toMatchObject({
      id: "response-1",
      requestId: "request-1",
      status: "SUBMITTED",
    })
    expect(mockDb.closeAssuranceFinding.findFirst).not.toHaveBeenCalled()
    expect(mockDb.closeAssuranceFinding.update).not.toHaveBeenCalled()
    expect(mockDb.accountantComment.create).not.toHaveBeenCalled()
    expect(mockDb.ledgerAuditEvent.create).not.toHaveBeenCalled()
    expect(mockRecordBusinessEventInTx).not.toHaveBeenCalled()
  })

  it("rejects correlation reuse for a different missing-proof response", async () => {
    mockDb.accountantComment.findFirst
      .mockResolvedValueOnce(missingEvidenceComment())
      .mockResolvedValueOnce(
        missingEvidenceResponse({
          body: "A different response was already recorded.",
        }),
      )

    await expect(
      respondToMissingCloseEvidence(
        "client-org",
        {
          requestId: "request-1",
          responseText:
            "The signed bank statement has been delivered for review.",
          correlationId: "missing-proof-response-corr-1",
        },
        { actorId: "client-user-1" },
      ),
    ).rejects.toThrow(/different missing-proof response/i)

    expect(mockDb.closeAssuranceFinding.update).not.toHaveBeenCalled()
    expect(mockDb.accountantComment.create).not.toHaveBeenCalled()
    expect(mockRecordBusinessEventInTx).not.toHaveBeenCalled()
  })

  it.each(["P2034", "P2002"])(
    "retries a serializable missing-proof response after %s",
    async (code) => {
      mockDb.$transaction
        .mockRejectedValueOnce(Object.assign(new Error("retry"), { code }))
        .mockImplementationOnce((callback) => callback(mockDb))
      mockDb.accountantComment.findFirst
        .mockResolvedValueOnce(missingEvidenceComment())
        .mockResolvedValueOnce(null)
      mockDb.closeAssuranceFinding.findFirst.mockResolvedValue(
        missingEvidenceFinding({
          status: "ASSIGNED",
          ownerId: "client-user-1",
        }),
      )
      mockDb.accountantComment.create.mockResolvedValue(
        missingEvidenceResponse(),
      )

      await expect(
        respondToMissingCloseEvidence(
          "client-org",
          {
            requestId: "request-1",
            responseText:
              "The signed bank statement has been delivered for review.",
            correlationId: "missing-proof-response-corr-1",
          },
          { actorId: "client-user-1" },
        ),
      ).resolves.toMatchObject({ id: "response-1", status: "SUBMITTED" })

      expect(mockDb.$transaction).toHaveBeenCalledTimes(2)
      expect(mockDb.accountantComment.create).toHaveBeenCalledTimes(1)
      expect(mockRecordBusinessEventInTx).toHaveBeenCalledTimes(1)
    },
  )

  it("atomically accepts a validated response and resolves its finding with minimized evidence", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-08-02T11:00:00.000Z"))
    const requestText = "Please attach the missing signed bank statement."
    const responseText =
      "The signed bank statement has been delivered for review."
    const resolutionNotes =
      "Response evidence reviewed and accepted for this finding."
    mockDb.accountantComment.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(missingEvidenceComment({ body: requestText }))
      .mockResolvedValueOnce(missingEvidenceResponse({ body: responseText }))
    mockDb.closeAssuranceFinding.findFirst.mockResolvedValue(
      missingEvidenceFinding({
        status: "IN_REVIEW",
        ownerId: "client-user-1",
      }),
    )
    mockDb.accountantComment.create.mockResolvedValue(
      missingEvidenceAcceptance({ body: resolutionNotes }),
    )

    const result = await acceptMissingCloseEvidenceResponse(
      "accounting-firm",
      acceptanceInput({ resolutionNotes }),
      missingEvidenceAcceptanceControl(),
    )

    expect(result).toMatchObject({
      kind: "ACCOUNTANT_MISSING_CLOSE_EVIDENCE_RESPONSE_ACCEPTANCE",
      version: 1,
      id: "acceptance-1",
      organizationId: "client-org",
      periodId: period.id,
      closeRunId: "close-run-1",
      findingId: "finding-1",
      requestId: "request-1",
      responseId: "response-1",
      respondedById: "client-user-1",
      acceptedById: "accountant-1",
      decision: "ACCEPTED",
      findingStatus: "RESOLVED",
      resolutionNotes,
      resolvedAt: "2026-08-02T11:00:00.000Z",
      correlationId: "missing-proof-acceptance-corr-1",
      controls: {
        serviceClockOwned: true,
        freshAuthRequired: true,
        delegatedReviewRequired: true,
        segregationOfDutiesRequired: true,
        compareAndSetResolution: true,
        rawMetadataExposed: false,
        closeCertificationAuthorized: false,
      },
    })
    expect(mockDb.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: "Serializable",
    })
    expect(mockDb.user.findFirst).toHaveBeenCalledWith({
      where: {
        id: "accountant-1",
        organizationId: "accounting-firm",
        isActive: true,
      },
      select: { id: true },
    })
    expect(mockResolveAccountantClientAccess).toHaveBeenCalledWith({
      homeOrganizationId: "accounting-firm",
      clientOrganizationId: "client-org",
      accountantUserId: "accountant-1",
      capability: "REVIEW",
      now: new Date("2026-08-02T11:00:00.000Z"),
      client: mockDb,
    })
    expect(mockDb.closeAssuranceFinding.updateMany).toHaveBeenCalledWith({
      where: {
        id: "finding-1",
        organizationId: "client-org",
        status: "IN_REVIEW",
        ownerId: "client-user-1",
      },
      data: {
        status: "RESOLVED",
        resolutionNotes,
        resolvedAt: new Date("2026-08-02T11:00:00.000Z"),
        resolvedById: "accountant-1",
        correlationId: "missing-proof-acceptance-corr-1",
      },
    })
    expect(mockDb.accountantComment.create).toHaveBeenCalledWith({
      data: {
        organizationId: "client-org",
        periodId: period.id,
        closeRunId: "close-run-1",
        findingId: "finding-1",
        authorId: "accountant-1",
        body: resolutionNotes,
        visibility: "ACCOUNTANT_RESPONSE_ACCEPTED",
        correlationId: "missing-proof-acceptance-corr-1",
        metadata: {
          acceptanceType: "MISSING_CLOSE_EVIDENCE_RESPONSE_ACCEPTANCE",
          requestId: "request-1",
          responseId: "response-1",
          requestCorrelationId: "missing-proof-corr-1",
          responseCorrelationId: "missing-proof-response-corr-1",
          findingId: "finding-1",
          periodId: period.id,
          closeRunId: "close-run-1",
          respondedById: "client-user-1",
          acceptedById: "accountant-1",
          decision: "ACCEPTED",
          findingStatus: "RESOLVED",
          resolvedAt: "2026-08-02T11:00:00.000Z",
          correlationId: "missing-proof-acceptance-corr-1",
        },
      },
    })
    expect(mockDb.ledgerAuditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "CLOSE_MISSING_EVIDENCE_RESPONSE_ACCEPTED",
          actorId: "accountant-1",
          resourceType: "AccountantComment",
          resourceId: "acceptance-1",
          metadata: expect.objectContaining({
            requestId: "request-1",
            responseId: "response-1",
            findingId: "finding-1",
            acceptedById: "accountant-1",
            status: "RESOLVED",
          }),
        }),
      }),
    )
    expect(mockRecordBusinessEventInTx).toHaveBeenCalledWith(
      mockDb,
      expect.objectContaining({
        organizationId: "client-org",
        eventType: "close.assurance.missing_evidence.response_accepted",
        actorId: "accountant-1",
        sourceId: "finding-1",
        payload: expect.objectContaining({
          acceptanceId: "acceptance-1",
          requestId: "request-1",
          responseId: "response-1",
          respondedById: "client-user-1",
          acceptedById: "accountant-1",
          decision: "ACCEPTED",
          findingStatus: "RESOLVED",
          ownerId: "client-user-1",
        }),
      }),
    )
    const auditInput = mockDb.ledgerAuditEvent.create.mock.calls.at(-1)?.[0]
    const eventInput = mockRecordBusinessEventInTx.mock.calls.at(-1)?.[1]
    for (const evidence of [auditInput, eventInput]) {
      const serialized = JSON.stringify(evidence)
      expect(serialized).not.toContain(requestText)
      expect(serialized).not.toContain(responseText)
      expect(serialized).not.toContain(resolutionNotes)
    }
  })

  it("rejects acceptance without service-level review permission before database work", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-08-02T11:00:00.000Z"))

    await expect(
      acceptMissingCloseEvidenceResponse(
        "accounting-firm",
        acceptanceInput(),
        missingEvidenceAcceptanceControl({ actorPermissions: [] }),
      ),
    ).rejects.toThrow(/accountant review permission/i)

    expect(mockDb.$transaction).not.toHaveBeenCalled()
    expect(mockDb.user.findFirst).not.toHaveBeenCalled()
  })

  it.each([
    ["missing", null],
    [
      "actor-mismatched",
      {
        actorId: "another-accountant",
        organizationId: "accounting-firm",
        lastAuthAt: new Date("2026-08-02T10:58:00.000Z"),
      },
    ],
    [
      "tenant-mismatched",
      {
        actorId: "accountant-1",
        organizationId: "other-firm",
        lastAuthAt: new Date("2026-08-02T10:58:00.000Z"),
      },
    ],
    [
      "future",
      {
        actorId: "accountant-1",
        organizationId: "accounting-firm",
        lastAuthAt: new Date("2026-08-02T11:00:00.001Z"),
      },
    ],
    [
      "stale",
      {
        actorId: "accountant-1",
        organizationId: "accounting-firm",
        lastAuthAt: new Date("2026-08-02T10:54:59.999Z"),
      },
    ],
  ])("rejects %s fresh-auth evidence before database work", async (
    _name,
    freshAuth,
  ) => {
    jest.useFakeTimers().setSystemTime(new Date("2026-08-02T11:00:00.000Z"))

    await expect(
      acceptMissingCloseEvidenceResponse(
        "accounting-firm",
        acceptanceInput(),
        missingEvidenceAcceptanceControl({ freshAuth }),
      ),
    ).rejects.toThrow(/fresh authentication/i)

    expect(mockDb.$transaction).not.toHaveBeenCalled()
  })

  it("rejects an inactive home-tenant accountant before delegated access or client reads", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-08-02T11:00:00.000Z"))
    mockDb.user.findFirst.mockResolvedValue(null)

    await expect(
      acceptMissingCloseEvidenceResponse(
        "accounting-firm",
        acceptanceInput(),
        missingEvidenceAcceptanceControl(),
      ),
    ).rejects.toThrow(/active home-tenant accountant/i)

    expect(mockResolveAccountantClientAccess).not.toHaveBeenCalled()
    expect(mockDb.accountantComment.findFirst).not.toHaveBeenCalled()
  })

  it("fails closed when delegated REVIEW access is denied", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-08-02T11:00:00.000Z"))
    mockResolveAccountantClientAccess.mockRejectedValue(
      new ForbiddenError("Read-only grant cannot request client work"),
    )

    await expect(
      acceptMissingCloseEvidenceResponse(
        "accounting-firm",
        acceptanceInput(),
        missingEvidenceAcceptanceControl(),
      ),
    ).rejects.toThrow(/read-only grant/i)

    expect(mockResolveAccountantClientAccess).toHaveBeenCalledWith(
      expect.objectContaining({ capability: "REVIEW" }),
    )
    expect(mockDb.accountantComment.findFirst).not.toHaveBeenCalled()
  })

  it.each([
    ["missing request", null, missingEvidenceResponse(), /request not found/i],
    [
      "request-response mismatch",
      missingEvidenceComment(),
      missingEvidenceResponse({
        metadata: {
          ...missingEvidenceResponse().metadata,
          requestId: "other-request",
        },
      }),
      /do not match/i,
    ],
    [
      "response author corruption",
      missingEvidenceComment(),
      missingEvidenceResponse({ authorId: "other-client-user" }),
      /response evidence is incomplete/i,
    ],
  ])("rejects %s before finding resolution", async (
    _name,
    request,
    response,
    error,
  ) => {
    jest.useFakeTimers().setSystemTime(new Date("2026-08-02T11:00:00.000Z"))
    mockDb.accountantComment.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(request)
      .mockResolvedValueOnce(response)

    await expect(
      acceptMissingCloseEvidenceResponse(
        "accounting-firm",
        acceptanceInput(),
        missingEvidenceAcceptanceControl(),
      ),
    ).rejects.toThrow(error)

    expect(mockDb.closeAssuranceFinding.updateMany).not.toHaveBeenCalled()
    expect(mockDb.accountantComment.create).not.toHaveBeenCalled()
  })

  it("enforces segregation of duties against respondent self-acceptance", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-08-02T11:00:00.000Z"))
    mockResolveAccountantClientAccess.mockResolvedValue({
      organizationId: "client-org",
      mode: "TENANT_MEMBER",
      grant: null,
    })
    mockDb.accountantComment.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(missingEvidenceComment())
      .mockResolvedValueOnce(missingEvidenceResponse())

    await expect(
      acceptMissingCloseEvidenceResponse(
        "client-org",
        acceptanceInput({ clientOrganizationId: undefined }),
        missingEvidenceAcceptanceControl({
          actorId: "client-user-1",
          freshAuth: {
            actorId: "client-user-1",
            organizationId: "client-org",
            lastAuthAt: new Date("2026-08-02T10:58:00.000Z"),
          },
        }),
      ),
    ).rejects.toThrow(/cannot accept their own/i)

    expect(mockDb.closeAssuranceFinding.findFirst).not.toHaveBeenCalled()
    expect(mockDb.closeAssuranceFinding.updateMany).not.toHaveBeenCalled()
  })

  it.each([
    [
      "request/finding period mismatch",
      missingEvidenceFinding({
        status: "IN_REVIEW",
        ownerId: "client-user-1",
        periodId: "other-period",
      }),
      /does not match its finding/i,
    ],
    [
      "non-review finding",
      missingEvidenceFinding({ status: "ASSIGNED", ownerId: "client-user-1" }),
      /only an in-review/i,
    ],
    [
      "respondent ownership mismatch",
      missingEvidenceFinding({ status: "IN_REVIEW", ownerId: "other-user" }),
      /owner does not match/i,
    ],
  ])("rejects %s before compare-and-set resolution", async (
    _name,
    finding,
    error,
  ) => {
    jest.useFakeTimers().setSystemTime(new Date("2026-08-02T11:00:00.000Z"))
    mockDb.accountantComment.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(missingEvidenceComment())
      .mockResolvedValueOnce(missingEvidenceResponse())
    mockDb.closeAssuranceFinding.findFirst.mockResolvedValue(finding)

    await expect(
      acceptMissingCloseEvidenceResponse(
        "accounting-firm",
        acceptanceInput(),
        missingEvidenceAcceptanceControl(),
      ),
    ).rejects.toThrow(error)

    expect(mockDb.closeAssuranceFinding.updateMany).not.toHaveBeenCalled()
    expect(mockDb.accountantComment.create).not.toHaveBeenCalled()
    expect(mockRecordBusinessEventInTx).not.toHaveBeenCalled()
  })

  it("returns an exact acceptance replay without duplicate resolution or evidence", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-08-02T11:00:00.000Z"))
    mockDb.accountantComment.findFirst.mockResolvedValueOnce(
      missingEvidenceAcceptance(),
    )

    const result = await acceptMissingCloseEvidenceResponse(
      "accounting-firm",
      acceptanceInput(),
      missingEvidenceAcceptanceControl(),
    )

    expect(result).toMatchObject({ id: "acceptance-1", decision: "ACCEPTED" })
    expect(mockDb.closeAssuranceFinding.findFirst).not.toHaveBeenCalled()
    expect(mockDb.closeAssuranceFinding.updateMany).not.toHaveBeenCalled()
    expect(mockDb.accountantComment.create).not.toHaveBeenCalled()
    expect(mockDb.ledgerAuditEvent.create).not.toHaveBeenCalled()
    expect(mockRecordBusinessEventInTx).not.toHaveBeenCalled()
  })

  it("rejects acceptance correlation reuse with different decision evidence", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-08-02T11:00:00.000Z"))
    mockDb.accountantComment.findFirst.mockResolvedValueOnce(
      missingEvidenceAcceptance({ responseId: "other-response" }),
    )

    await expect(
      acceptMissingCloseEvidenceResponse(
        "accounting-firm",
        acceptanceInput({
          resolutionNotes: "Different acceptance notes for the same correlation.",
        }),
        missingEvidenceAcceptanceControl(),
      ),
    ).rejects.toThrow(/different missing-proof response acceptance/i)

    expect(mockDb.closeAssuranceFinding.updateMany).not.toHaveBeenCalled()
    expect(mockDb.accountantComment.create).not.toHaveBeenCalled()
  })

  it("fails closed when compare-and-set resolution loses a concurrent race", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-08-02T11:00:00.000Z"))
    mockDb.accountantComment.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(missingEvidenceComment())
      .mockResolvedValueOnce(missingEvidenceResponse())
    mockDb.closeAssuranceFinding.findFirst.mockResolvedValue(
      missingEvidenceFinding({ status: "IN_REVIEW", ownerId: "client-user-1" }),
    )
    mockDb.closeAssuranceFinding.updateMany.mockResolvedValue({ count: 0 })

    await expect(
      acceptMissingCloseEvidenceResponse(
        "accounting-firm",
        acceptanceInput(),
        missingEvidenceAcceptanceControl(),
      ),
    ).rejects.toThrow(/changed before acceptance/i)

    expect(mockDb.accountantComment.create).not.toHaveBeenCalled()
    expect(mockDb.ledgerAuditEvent.create).not.toHaveBeenCalled()
    expect(mockRecordBusinessEventInTx).not.toHaveBeenCalled()
  })

  it("retries acceptance after a serializable transaction conflict", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-08-02T11:00:00.000Z"))
    mockDb.$transaction
      .mockRejectedValueOnce(Object.assign(new Error("retry"), { code: "P2034" }))
      .mockImplementationOnce((callback) => callback(mockDb))
    mockDb.accountantComment.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(missingEvidenceComment())
      .mockResolvedValueOnce(missingEvidenceResponse())
    mockDb.closeAssuranceFinding.findFirst.mockResolvedValue(
      missingEvidenceFinding({ status: "IN_REVIEW", ownerId: "client-user-1" }),
    )
    mockDb.accountantComment.create.mockResolvedValue(
      missingEvidenceAcceptance(),
    )

    await expect(
      acceptMissingCloseEvidenceResponse(
        "accounting-firm",
        acceptanceInput(),
        missingEvidenceAcceptanceControl(),
      ),
    ).resolves.toMatchObject({ id: "acceptance-1", decision: "ACCEPTED" })

    expect(mockDb.$transaction).toHaveBeenCalledTimes(2)
    expect(mockDb.closeAssuranceFinding.updateMany).toHaveBeenCalledTimes(1)
    expect(mockDb.accountantComment.create).toHaveBeenCalledTimes(1)
    expect(mockRecordBusinessEventInTx).toHaveBeenCalledTimes(1)
  })

  it.each([
    ["missing evidence", { actorId: "user-2" }],
    [
      "missing actor",
      {
        freshAuth: {
          actorId: "user-2",
          organizationId: "org-1",
          lastAuthAt: "2026-06-15T12:00:00.000Z",
        },
      },
    ],
    [
      "invalid evidence",
      {
        actorId: "user-2",
        freshAuth: {
          actorId: "user-2",
          organizationId: "org-1",
          lastAuthAt: "not-a-date",
        },
      },
    ],
    [
      "nonpositive evidence",
      {
        actorId: "user-2",
        freshAuth: {
          actorId: "user-2",
          organizationId: "org-1",
          lastAuthAt: 0,
        },
      },
    ],
    [
      "future evidence",
      {
        actorId: "user-2",
        freshAuth: {
          actorId: "user-2",
          organizationId: "org-1",
          lastAuthAt: "2026-06-15T12:05:00.001Z",
        },
      },
    ],
    [
      "stale evidence",
      {
        actorId: "user-2",
        freshAuth: {
          actorId: "user-2",
          organizationId: "org-1",
          lastAuthAt: "2026-06-15T11:59:59.999Z",
        },
      },
    ],
    [
      "actor mismatch",
      {
        actorId: "user-2",
        freshAuth: {
          actorId: "user-other",
          organizationId: "org-1",
          lastAuthAt: "2026-06-15T12:00:00.000Z",
        },
      },
    ],
    [
      "organization mismatch",
      {
        actorId: "user-2",
        freshAuth: {
          actorId: "user-2",
          organizationId: "org-other",
          lastAuthAt: "2026-06-15T12:00:00.000Z",
        },
      },
    ],
  ])("rejects close waiver approval for %s before database work", async (
    _name,
    control,
  ) => {
    jest.useFakeTimers().setSystemTime(new Date("2026-06-15T12:05:00.000Z"))

    await expect(
      approveCloseWaiver("org-1", { findingId: "finding-1" }, control),
    ).rejects.toThrow("Fresh authentication is required to approve a close waiver.")

    expect(mockDb.$transaction).not.toHaveBeenCalled()
    expect(mockDb.closeAssuranceFinding.findFirst).not.toHaveBeenCalled()
    expect(mockDb.closeAssuranceFinding.update).not.toHaveBeenCalled()
  })

  it("accepts exact five-minute waiver evidence and persists the service clock", async () => {
    const approvalTime = new Date("2026-06-15T12:05:00.000Z")
    mockDb.closeAssuranceFinding.findFirst.mockResolvedValue({
      id: "finding-1",
      organizationId: "org-1",
      periodId: period.id,
      closeRunId: "close-run-1",
      status: "IN_REVIEW",
      severity: "HIGH",
      ownerId: "controller-1",
      dueAt: null,
      waiverRequestedById: "user-1",
      waiverRequestedAt: new Date("2026-06-15T11:00:00.000Z"),
      closeRun: { id: "close-run-1" },
    })
    mockDb.closeAssuranceFinding.update.mockResolvedValue({
      id: "finding-1",
      checklistItemId: "check-1",
      domain: "LEDGER",
      severity: "HIGH",
      status: "WAIVED_WITH_APPROVAL",
      title: "Draft entries remain open",
      detail: "Approved timing exception.",
      sourceService: "services/accounting/periods.service.ts",
      sourceType: "AccountingPeriodClosePreflight",
      sourceId: null,
      ownerId: "controller-1",
      assignedById: null,
      assignedAt: null,
      dueAt: null,
      waiverRequestedById: "user-1",
      waiverApprovedById: "user-2",
      correlationId: "corr-waiver-approve",
    })

    jest.useFakeTimers().setSystemTime(approvalTime)

    const result = await approveCloseWaiver(
      "org-1",
      {
        findingId: "finding-1",
        correlationId: "corr-waiver-approve",
      },
      {
        actorId: "user-2",
        freshAuth: {
          actorId: "user-2",
          organizationId: "org-1",
          lastAuthAt: "2026-06-15T12:00:00.000Z",
        },
      },
    )

    expect(result.status).toBe("WAIVED_WITH_APPROVAL")
    expect(mockDb.closeAssuranceFinding.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          waiverApprovedById: "user-2",
          waiverApprovedAt: approvalTime,
        }),
      }),
    )
    expect(mockRecordBusinessEventInTx).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        eventType: "close.assurance.waiver.approved",
      }),
    )
  })

  it("blocks same-actor close waiver approval for segregation of duties", async () => {
    mockDb.closeAssuranceFinding.findFirst.mockResolvedValue({
      id: "finding-1",
      organizationId: "org-1",
      periodId: period.id,
      closeRunId: "close-run-1",
      status: "IN_REVIEW",
      waiverRequestedById: "user-1",
      waiverRequestedAt: new Date("2026-06-15T12:00:00.000Z"),
      closeRun: { id: "close-run-1" },
    })

    jest.useFakeTimers().setSystemTime(new Date("2026-06-15T12:04:00.000Z"))

    await expect(
      approveCloseWaiver(
        "org-1",
        { findingId: "finding-1" },
        {
          actorId: "user-1",
          freshAuth: {
            actorId: "user-1",
            organizationId: "org-1",
            lastAuthAt: "2026-06-15T12:00:00.000Z",
          },
        },
      ),
    ).rejects.toThrow(/requester cannot approve/i)
  })
  it("blocks draft journals and failed posting batches from period preflight", async () => {
    mockGetPeriodClosePreflight.mockResolvedValue({
      ...cleanPreflight(),
      draftEntryCount: 1,
      unresolvedPostingBatchCount: 1,
    })
    mockGetPeriodClosePreflightFailures.mockReturnValue([
      "1 draft journal entry must be posted or voided",
      "1 pending or failed posting batch must be resolved",
    ])

    const result = await getCloseAssuranceDashboard("org-1", period.id)

    expect(result.run.status).toBe("BLOCKED")
    expect(result.checklist).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "period-close-preflight",
          status: "FAILED",
          severity: "CRITICAL",
        }),
      ]),
    )
    expect(result.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "Draft journal entries remain open",
          severity: "HIGH",
        }),
        expect.objectContaining({
          title: "Pending or failed posting batches remain unresolved",
          severity: "CRITICAL",
        }),
      ]),
    )
  })

  it("blocks unbalanced ledger reconciliation as a critical close finding", async () => {
    mockReconcileLedger.mockResolvedValue({
      ...cleanLedger(),
      isClean: false,
      totalsByCurrency: [
        {
          currency: "XAF",
          debit: "120000.00",
          credit: "119000.00",
          difference: "1000.00",
        },
      ],
      failures: [
        {
          type: "TRIAL_BALANCE_OUT_OF_BALANCE",
          severity: "critical",
          message:
            "Trial balance is not balanced for XAF: debit 120000.00 credit 119000.00",
          metadata: { currency: "XAF" },
        },
      ],
    })

    const result = await getCloseAssuranceDashboard("org-1", period.id)

    expect(result.run.status).toBe("BLOCKED")
    expect(result.checklist).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "ledger-reconciliation",
          status: "FAILED",
          severity: "CRITICAL",
        }),
      ]),
    )
    expect(result.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceType: "TRIAL_BALANCE_OUT_OF_BALANCE",
          severity: "CRITICAL",
        }),
      ]),
    )
  })

  it("marks missing domain evidence unavailable without leaking dependency internals", async () => {
    mockReconcileLedger.mockRejectedValue(new Error("database://ledger-secret host failed"))
    mockGetPaymentReconciliationDashboardData.mockRejectedValue(
      new Error("redis://payment-secret timeout"),
    )
    mockGetAccountantPortalData.mockRejectedValue(new Error("sql://trust-secret failed"))
    mockReconcileInventoryClass3.mockRejectedValue(new Error("inventory-secret failed"))
    mockGetTenantOperatingSnapshot.mockRejectedValue(new Error("payroll-secret failed"))

    const result = await getCloseAssuranceDashboard("org-1", period.id)
    const serialized = JSON.stringify(result)

    expect(result.run.status).toBe("BLOCKED")
    expect(result.checklist).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "ledger-reconciliation", status: "UNAVAILABLE" }),
        expect.objectContaining({ key: "payment-reconciliation", status: "UNAVAILABLE" }),
        expect.objectContaining({ key: "data-trust-provenance", status: "UNAVAILABLE" }),
        expect.objectContaining({ key: "inventory-valuation", status: "UNAVAILABLE" }),
        expect.objectContaining({ key: "payroll-finance-forecast-proof", status: "UNAVAILABLE" }),
      ]),
    )
    expect(result.evidenceItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sourceType: "LedgerReconciliation", available: false }),
        expect.objectContaining({ sourceType: "PaymentReconciliationDashboard", available: false }),
        expect.objectContaining({ sourceType: "AccountantPortalDataTrust", available: false }),
      ]),
    )
    expect(serialized).toContain("Ledger reconciliation evidence could not be loaded.")
    expect(serialized).not.toContain("ledger-secret")
    expect(serialized).not.toContain("payment-secret")
    expect(serialized).not.toContain("trust-secret")
    expect(serialized).not.toContain("inventory-secret")
    expect(serialized).not.toContain("payroll-secret")
  })

  it("denies cross-tenant period access by resolving periods inside organization scope", async () => {
    mockDb.accountingPeriod.findFirst.mockResolvedValueOnce(null)

    await expect(
      getCloseAssuranceDashboard("org-1", "period-from-other-org"),
    ).rejects.toThrow(/Accounting period not found/i)
  })

  it("emits durable notification events for blocked close runs and critical findings", async () => {
    mockGetPeriodClosePreflight.mockResolvedValue({
      ...cleanPreflight(),
      unresolvedPostingBatchCount: 1,
    })
    mockGetPeriodClosePreflightFailures.mockReturnValue([
      "1 pending or failed posting batch must be resolved",
    ])
    mockDb.closeRun.findFirst.mockResolvedValue(
      persistedRun({
        status: "BLOCKED",
        criticalBlockerCount: 1,
        highBlockerCount: 0,
      }),
    )

    await runCloseAssurance(
      "org-1",
      { periodId: period.id, correlationId: "corr-blocked" },
      { actorId: "controller-1" },
    )

    expect(mockRecordBusinessEventInTx).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        eventType: "close.assurance.run.completed",
        idempotencyKey: "close-assurance-run:close-run-1:completed",
        sourceType: "MANUAL",
        sourceId: "close-run-1",
        metadata: expect.objectContaining({
          sourceType: "CloseRun",
          sourceId: "close-run-1",
        }),
        outboxMessages: expect.arrayContaining([
          expect.objectContaining({ channel: "NOTIFICATION" }),
        ]),
      }),
    )
    expect(mockRecordBusinessEventInTx).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        eventType: "close.assurance.blocked",
      }),
    )
    expect(mockRecordBusinessEventInTx).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        eventType: "close.assurance.critical_finding.created",
        sourceType: "MANUAL",
        metadata: expect.objectContaining({
          sourceType: "CloseAssuranceFinding",
        }),
      }),
    )
  })

  it("emits assignment and due-soon notifications for close findings", async () => {
    const dueAt = new Date(Date.now() + 60 * 60 * 1000)
    mockDb.closeAssuranceFinding.findFirst.mockResolvedValue({
      id: "finding-1",
      organizationId: "org-1",
      periodId: period.id,
      closeRunId: "close-run-1",
      status: "OPEN",
      closeRun: { id: "close-run-1" },
    })
    mockDb.closeAssuranceFinding.update.mockResolvedValue({
      id: "finding-1",
      checklistItemId: "check-1",
      domain: "LEDGER",
      severity: "HIGH",
      status: "ASSIGNED",
      title: "Draft entries remain open",
      detail: "1 blocker detected.",
      sourceService: "services/accounting/periods.service.ts",
      sourceType: "AccountingPeriodClosePreflight",
      sourceId: null,
      ownerId: "user-2",
      assignedById: "user-1",
      assignedAt: new Date("2026-06-15T12:00:00.000Z"),
      dueAt,
      waiverRequestedById: null,
      waiverApprovedById: null,
      correlationId: "corr-assign",
    })

    await assignCloseFinding(
      "org-1",
      { findingId: "finding-1", assignedToId: "user-2", correlationId: "corr-assign" },
      { actorId: "user-1" },
    )

    expect(mockRecordBusinessEventInTx).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ eventType: "close.assurance.finding.assigned" }),
    )
    expect(mockRecordBusinessEventInTx).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ eventType: "close.assurance.finding.due_soon" }),
    )
  })

  it("emits waiver request notifications with reason evidence", async () => {
    mockDb.closeAssuranceFinding.findFirst.mockResolvedValue({
      id: "finding-1",
      organizationId: "org-1",
      periodId: period.id,
      closeRunId: "close-run-1",
      status: "OPEN",
      severity: "HIGH",
      ownerId: "controller-1",
      dueAt: null,
      closeRun: { id: "close-run-1" },
    })
    mockDb.closeAssuranceFinding.update.mockResolvedValue({
      id: "finding-1",
      checklistItemId: "check-1",
      domain: "LEDGER",
      severity: "HIGH",
      status: "IN_REVIEW",
      title: "Draft entries remain open",
      detail: "Waiver requested.",
      sourceService: "services/accounting/periods.service.ts",
      sourceType: "AccountingPeriodClosePreflight",
      sourceId: null,
      ownerId: "controller-1",
      assignedById: null,
      assignedAt: null,
      dueAt: null,
      waiverRequestedById: "user-1",
      waiverApprovedById: null,
      correlationId: "corr-waiver",
    })

    await requestCloseWaiver(
      "org-1",
      {
        findingId: "finding-1",
        reason: "Documented management approval for a timing-only close exception.",
        correlationId: "corr-waiver",
      },
      { actorId: "user-1" },
    )

    expect(mockRecordBusinessEventInTx).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        eventType: "close.assurance.waiver.requested",
        payload: expect.objectContaining({
          reason: "Documented management approval for a timing-only close exception.",
        }),
      }),
    )
  })

  it("maps source-link evidence into posting batch and journal entry graph nodes", async () => {
    const graph = await getCloseEvidenceGraph("org-1", { periodId: period.id })

    expect(graph.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "posting-batch:batch-1" }),
        expect.objectContaining({ id: "journal-entry:JE-1" }),
      ]),
    )
    expect(graph.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          from: "posting-batch:batch-1",
          to: "journal-entry:JE-1",
          label: "produces",
        }),
      ]),
    )
  })
})
