jest.mock("server-only", () => ({}))

jest.mock("@/prisma/db", () => {
  const dbMock = {
    $transaction: jest.fn(),
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
      create: jest.fn(),
    },
    ledgerAuditEvent: {
      create: jest.fn(),
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

jest.mock("@/services/reconciliation/payment-reconciliation-dashboard.service", () => ({
  getPaymentReconciliationDashboardData: jest.fn(),
}))

jest.mock("@/services/inventory/inventory-valuation.service", () => ({
  reconcileInventoryClass3: jest.fn(),
}))

import { db } from "@/prisma/db"
import { getAccountantPortalData } from "../data-trust.service"
import { reconcileInventoryClass3 } from "@/services/inventory/inventory-valuation.service"
import {
  getPeriodClosePreflight,
  getPeriodClosePreflightFailures,
} from "../periods.service"
import { reconcileLedger } from "../reconciliations.service"
import { getPaymentReconciliationDashboardData } from "@/services/reconciliation/payment-reconciliation-dashboard.service"
import {
  approveCloseWaiver,
  assignCloseFinding,
  commentOnCloseFinding,
  getCloseAssuranceDashboard,
  runCloseAssurance,
} from "../close-assurance.service"

const mockDb = db as unknown as {
  $transaction: jest.Mock
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
    create: jest.Mock
  }
  ledgerAuditEvent: {
    create: jest.Mock
  }
}

const mockGetPeriodClosePreflight = getPeriodClosePreflight as jest.Mock
const mockGetPeriodClosePreflightFailures = getPeriodClosePreflightFailures as jest.Mock
const mockReconcileLedger = reconcileLedger as jest.Mock
const mockGetAccountantPortalData = getAccountantPortalData as jest.Mock
const mockGetPaymentReconciliationDashboardData = getPaymentReconciliationDashboardData as jest.Mock
const mockReconcileInventoryClass3 = reconcileInventoryClass3 as jest.Mock

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
      sourceTables: ["journal_entries", "accounting_source_links", "ledger_audit_events"],
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
      { module: "ledger", status: "ready", label: "Ledger", detail: "Balanced", facts: [] },
      { module: "payments", status: "ready", label: "Payments", detail: "Signed", facts: [] },
      { module: "purchasing", status: "ready", label: "Purchasing", detail: "Ready", facts: [] },
      { module: "payroll", status: "ready", label: "Payroll", detail: "Ready", facts: [] },
      { module: "compliance", status: "ready", label: "Compliance", detail: "Ready", facts: [] },
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

function seedCleanSources() {
  mockDb.$transaction.mockImplementation((callback) => callback(mockDb))
  mockDb.accountingPeriod.findFirst.mockResolvedValue(period)
  mockDb.accountingPeriod.findMany.mockResolvedValue([period])
  mockDb.closeRun.findFirst.mockResolvedValue(null)
  mockDb.closeRun.create.mockResolvedValue({
    id: "close-run-1",
    periodId: period.id,
    status: "READY",
    readinessScore: 88,
    criticalBlockerCount: 0,
    highBlockerCount: 0,
  })
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
  mockDb.ledgerAuditEvent.create.mockResolvedValue({ id: "ledger-audit-created" })
  mockGetPeriodClosePreflight.mockResolvedValue(cleanPreflight())
  mockGetPeriodClosePreflightFailures.mockReturnValue([])
  mockReconcileLedger.mockResolvedValue(cleanLedger())
  mockGetPaymentReconciliationDashboardData.mockResolvedValue(cleanPaymentDashboard())
  mockGetAccountantPortalData.mockResolvedValue(cleanDataTrust())
  mockReconcileInventoryClass3.mockResolvedValue(cleanInventoryValuation())
}

describe("close assurance service", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    seedCleanSources()
  })

  it("builds a live close readiness dashboard from close, reconciliation, suspense, and data-trust services", async () => {
    const result = await getCloseAssuranceDashboard("org-1", period.id)

    expect(result.source.persisted).toBe(false)
    expect(result.source.trustLevel).toBe("T4")
    expect(result.period?.id).toBe(period.id)
    expect(result.run.status).toBe("READY")
    expect(result.evidenceItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ evidenceType: "REPORT_EXPORT", sourceTable: "journal_entry_lines" }),
        expect.objectContaining({ evidenceType: "RECONCILIATION_CERTIFICATE", sourceId: "recon-run-1" }),
        expect.objectContaining({ evidenceType: "DATA_TRUST_CERTIFICATE", sourceHash: "sha256:scope" }),
        expect.objectContaining({ sourceType: "InventoryValuationAnnex", sourceHash: "sha256:inventory-valuation" }),
      ]),
    )
    expect(result.checklist).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "inventory-valuation", status: "PASSED" }),
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
          message: "Inventory subledger value 700.00 does not reconcile to class 3 ledger value 600.00 XAF.",
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
        expect.objectContaining({ key: "inventory-valuation", status: "FAILED" }),
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
        expect.objectContaining({ domain: "PAYMENT_RECONCILIATION", severity: "HIGH" }),
      ]),
    )
  })

  it("persists close runs with checklist evidence and ledger audit evidence", async () => {
    mockDb.closeRun.findFirst.mockResolvedValue(persistedRun())

    const result = await runCloseAssurance(
      "org-1",
      { periodId: period.id, correlationId: "corr-1" },
      { actorId: "user-1", actorPermissions: ["accounting.close.run"], now: "2026-06-15T12:00:00.000Z" },
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
      { findingId: "finding-1", body: "Reviewed suspense evidence and assigned to finance." },
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

    await expect(
      approveCloseWaiver("org-1", { findingId: "finding-1" }, { actorId: "user-1" }),
    ).rejects.toThrow(/requester cannot approve/i)
  })
})
