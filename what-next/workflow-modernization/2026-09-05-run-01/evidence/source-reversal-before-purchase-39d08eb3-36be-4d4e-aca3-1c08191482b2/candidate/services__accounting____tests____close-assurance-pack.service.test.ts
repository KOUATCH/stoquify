import { CLOSE_CERTIFICATION_INVALIDATION_SOURCES } from "../close-assurance-pack.service"
jest.mock("server-only", () => ({}))

jest.mock("node:crypto", () => {
  const actual = jest.requireActual("node:crypto")
  return {
    ...actual,
    randomUUID: jest.fn(() => "00000000-0000-4000-8000-000000000001"),
  }
})

jest.mock("@/prisma/db", () => {
  const dbMock = {
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
    organizationAccountingSettings: { findUnique: jest.fn() },
    closeRun: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    closePackExport: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    ledgerAuditEvent: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    payrollPeriod: { findMany: jest.fn() },
    payrollRun: {
      findMany: jest.fn(),
    },
    businessEvent: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    auditLog: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
  }
  dbMock.$transaction = jest.fn((callback) => callback(dbMock))
  return { db: dbMock }
})

jest.mock("@/services/inventory/inventory-valuation.service", () => ({
  reconcileInventoryClass3: jest.fn(),
}))

import { db } from "@/prisma/db"
import { reconcileInventoryClass3 } from "@/services/inventory/inventory-valuation.service"
import {
  exportClosePack,
  recordCloseCertificationInvalidation,
  recordCloseCertificationInvalidationsForSource,
} from "../close-assurance-pack.service"

const mockDb = db as unknown as {
  organizationAccountingSettings: { findUnique: jest.Mock }
  $transaction: jest.Mock
  $queryRaw: jest.Mock
  closeRun: {
    findMany: jest.Mock
    findFirst: jest.Mock
    update: jest.Mock
  }
  closePackExport: {
    create: jest.Mock
    findFirst: jest.Mock
    update: jest.Mock
  }
  ledgerAuditEvent: {
    create: jest.Mock
    findMany: jest.Mock
  }
  payrollPeriod: { findMany: jest.Mock }
  payrollRun: {
    findMany: jest.Mock
  }
  businessEvent: {
    findUnique: jest.Mock
    create: jest.Mock
    update: jest.Mock
  }
  auditLog: {
    findMany: jest.Mock
    findFirst: jest.Mock
    create: jest.Mock
  }
}

const mockReconcileInventoryClass3 = reconcileInventoryClass3 as jest.Mock

function inventoryAnnex(sourceHash = "sha256:inventory-valuation") {
  return {
    organizationId: "org-1",
    accountingPeriodId: "period-1",
    asOf: "2026-06-15T12:00:00.000Z",
    valuationMethod: "WEIGHTED_AVERAGE",
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
    class3LedgerBalanceTotal: "700.00",
    inventorySubledgerValueTotal: "700.00",
    mismatchAmount: "0.00",
    sourceHash,
    evidenceHashVersion: 1,
    observationHash: "sha256:inventory-observation",
    recordedThrough: "2026-06-15T12:00:00.000Z",
    blockerStatus: "PASSED",
    failures: [],
  }
}

function payrollForecastProof() {
  return {
    status: "AUTHORITATIVE",
    authoritative: true,
    reasonCode: "PAYROLL_FORECAST_SOURCE_LINKED",
    message:
      "Upcoming payroll forecast is backed by payroll, payment, declaration, and ledger proof.",
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
    blockerCodes: [],
    blockers: [],
    redactions: [
      {
        id: "close-payroll-forecast-person-level-redacted",
        field: "payroll.personLevelAmounts",
        reason: "Close assurance exposes aggregate payroll obligations only.",
        policy: "KONTAVA_SENSITIVE_PAYROLL_EVIDENCE",
      },
    ],
    sourceHash: "sha256:tenant-operating-payroll-forecast",
    generatedAt: "2026-06-15T12:00:00.000Z",
    sourceModules: ["hris", "payroll", "payments", "accounting", "close"],
    hrisPayrollReadinessHash: "sha256:private-hris-readiness",
    payrollEngineInputHashes: ["sha256:private-engine-input"],
    employeeId: "private-employee-id",
    salaryAmount: "private-salary-amount",
    paymentDestination: "private-payment-destination",
    personLevelAmounts: "redacted",
    personLevelAmountsRedacted: true,
  }
}

function pilotCertificationAudit(overrides: Record<string, unknown> = {}) {
  return {
    id: "pilot-certification-audit-1",
    entityId: "payroll-run-1",
    createdAt: new Date("2026-06-15T12:05:00.000Z"),
    changes: {
      status: "CERTIFIED_FOR_PRODUCTION_RELEASE_REVIEW",
      generatedAt: "2026-06-15T12:04:00.000Z",
      certificateHash: "sha256:pilot-cycle-certificate",
      proofContinuity: {
        expectedAdapterChaosReleaseGateHash:
          "sha256:adapter-chaos-release-gate",
        proofBackfillAdapterChaosMatchesExpected: true,
      },
      signoff: { missingRoles: [] },
      blockers: [],
      ...overrides,
    },
  }
}

function cleanInventoryValuation(sourceHash = "sha256:inventory-valuation") {
  return {
    organizationId: "org-1",
    periodId: "period-1",
    currency: "XAF",
    status: "PASSED",
    inventoryValue: "700.00",
    ledgerClass3Value: "700.00",
    driftAmount: "0.00",
    reportHash: "sha256:inventory-observation",
    evidenceHash: sourceHash,
    evidenceHashVersion: 1,
    recordedThrough: "2026-06-15T12:00:00.000Z",
    sourceCounts: inventoryAnnex(sourceHash).sourceCounts,
    failures: [],
  }
}

function closeRun(overrides: Record<string, unknown> = {}) {
  const base = {
    id: "close-run-1",
    organizationId: "org-1",
    periodId: "period-1",
    status: "READY",
    createdAt: new Date("2026-06-15T12:00:00.000Z"),
    voidedAt: null,
    readinessScore: 96,
    criticalBlockerCount: 0,
    highBlockerCount: 0,
    evidenceCoveragePct: "100",
    asOf: new Date("2026-06-15T12:00:00.000Z"),
    startedAt: new Date("2026-06-15T11:59:00.000Z"),
    completedAt: new Date("2026-06-15T12:00:00.000Z"),
    runById: "runner-1",
    correlationId: "run-corr-1",
    summary: { checklistCount: 2 },
    provenance: { items: [] },
    metadata: {
      trustLevel: "T4",
      inventoryValuationAnnex: inventoryAnnex(),
      payrollFinanceForecastProof: payrollForecastProof(),
      statutoryCertification: {
        systemEvidenceStatus: "SYSTEM_EVIDENCE_ONLY",
        statutoryReadinessStatus: "STATUTORY_BLOCKED",
        statutoryAuthorityStatus: "AUTHORITY_NOT_CONFIGURED",
      },
    },
    organization: {
      id: "org-1",
      name: "Demo OHADA SMB",
      country: "CM",
      currency: "XAF",
      timezone: "Africa/Douala",
      defaultLocale: "EN",
    },
    period: {
      id: "period-1",
      name: "June 2026",
      status: "OPEN",
      startDate: new Date("2026-06-01T00:00:00.000Z"),
      endDate: new Date("2026-06-30T23:59:59.999Z"),
    },
    checklistItems: [
      {
        id: "check-ledger",
        key: "ledger-reconciliation",
        domain: "LEDGER",
        status: "PASSED",
        severity: "INFO",
        label: "Ledger balance and traceability",
        detail: "Ledger balances and is traceable.",
        sourceService: "services/accounting/reconciliations.service.ts",
        evidenceCount: 1,
        blockerReason: null,
        nextActionHref: "/dashboard/accounting/reports/trial-balance",
        ownerId: null,
        dueAt: null,
      },
      {
        id: "check-payment",
        key: "payment-reconciliation",
        domain: "PAYMENT_RECONCILIATION",
        status: "PASSED",
        severity: "INFO",
        label: "Payment reconciliation sign-off",
        detail: "Payment reconciliation is signed.",
        sourceService:
          "services/reconciliation/payment-reconciliation-dashboard.service.ts",
        evidenceCount: 1,
        blockerReason: null,
        nextActionHref: "/dashboard/finance/reconciliation",
        ownerId: null,
        dueAt: null,
      },
      {
        id: "check-inventory",
        key: "inventory-valuation",
        domain: "INVENTORY_VALUATION",
        status: "PASSED",
        severity: "INFO",
        label: "Inventory valuation readiness",
        detail: "Inventory subledger ties to class 3 ledger.",
        sourceService: "services/inventory/inventory-valuation.service.ts",
        evidenceCount: 1,
        blockerReason: null,
        nextActionHref: "/dashboard/inventory",
        ownerId: null,
        dueAt: null,
      },
      {
        id: "check-payroll-forecast",
        key: "payroll-finance-forecast-proof",
        domain: "PAYROLL",
        status: "PASSED",
        severity: "INFO",
        label: "Payroll finance forecast proof",
        detail: "Aggregate payroll forecast is authoritative.",
        sourceService:
          "services/snapshots/tenant-operating-snapshot.service.ts",
        evidenceCount: 1,
        blockerReason: null,
        nextActionHref: "/dashboard/payroll/runs",
        ownerId: null,
        dueAt: null,
      },
    ],
    findings: [],
    evidenceItems: [
      {
        id: "evidence-ledger",
        checklistItemId: "check-ledger",
        findingId: null,
        evidenceType: "REPORT_EXPORT",
        sourceTable: "journal_entry_lines",
        sourceType: "TrialBalanceCurrency",
        sourceId: "XAF",
        sourceLabel: "Trial balance XAF",
        sourceDate: new Date("2026-06-15T12:00:00.000Z"),
        sourceHash: "sha256:trial-balance",
        provenance: "POSTED",
        available: true,
        unavailableReason: null,
        correlationId: "run-corr-1",
      },
      {
        id: "evidence-recon",
        checklistItemId: "check-payment",
        findingId: null,
        evidenceType: "RECONCILIATION_CERTIFICATE",
        sourceTable: "reconciliation_runs",
        sourceType: "ReconciliationRun",
        sourceId: "recon-run-1",
        sourceLabel: "Reconciliation run signed",
        sourceDate: new Date("2026-06-15T10:00:00.000Z"),
        sourceHash: "sha256:recon-cert",
        provenance: "POSTED",
        available: true,
        unavailableReason: null,
        correlationId: "recon-corr-1",
      },
      {
        id: "evidence-inventory",
        checklistItemId: "check-inventory",
        findingId: null,
        evidenceType: "REPORT_EXPORT",
        sourceTable: "inventory_transactions",
        sourceType: "InventoryValuationAnnex",
        sourceId: "period-1",
        sourceLabel: "Inventory valuation annex PASSED",
        sourceDate: new Date("2026-06-15T12:00:00.000Z"),
        sourceHash: "sha256:inventory-valuation",
        provenance: "POSTED",
        available: true,
        unavailableReason: null,
        metadata: inventoryAnnex(),
        correlationId: "inventory-corr-1",
      },
      {
        id: "evidence-payroll-forecast",
        checklistItemId: "check-payroll-forecast",
        findingId: null,
        evidenceType: "REPORT_EXPORT",
        sourceTable: "payroll_runs",
        sourceType: "PayrollFinanceForecastProof",
        sourceId: "sha256:tenant-operating-payroll-forecast",
        sourceLabel:
          "Authoritative payroll forecast proof: total upcoming 170000",
        sourceDate: new Date("2026-06-15T12:00:00.000Z"),
        sourceHash: "sha256:tenant-operating-payroll-forecast",
        provenance: "POSTED",
        available: true,
        unavailableReason: null,
        metadata: payrollForecastProof(),
        correlationId: "payroll-forecast-corr-1",
      },
    ],
    reviews: [
      {
        id: "review-1",
        status: "READY_TO_CLOSE",
        reviewerId: "accountant-1",
        openedById: "runner-1",
        reviewedAt: new Date("2026-06-15T12:30:00.000Z"),
        decisionNotes: "Ready for certification.",
        correlationId: "review-corr-1",
        createdAt: new Date("2026-06-15T12:20:00.000Z"),
      },
    ],
    comments: [
      {
        id: "comment-1",
        findingId: null,
        evidenceItemId: "evidence-ledger",
        reviewId: "review-1",
        authorId: "accountant-1",
        visibility: "INTERNAL_AND_ACCOUNTANT",
        body: "Reviewed source-linked trial balance.",
        correlationId: "comment-corr-1",
        createdAt: new Date("2026-06-15T12:25:00.000Z"),
      },
    ],
  }

  return { ...base, ...overrides }
}

// Only callback completion commits this transaction double. A domain rejection
// inside the callback therefore cannot be mistaken for durable evidence writes.
function observeInvalidationTransactions(initialRun = closeRun()) {
  let committedRun = initialRun
  const committedEvents: unknown[] = []
  const committedAudits: unknown[] = []
  const committedExports: unknown[] = []
  const transactions = { committed: 0, rolledBack: 0 }
  const createEvent = mockDb.businessEvent.create.getMockImplementation()!
  const createAudit = mockDb.ledgerAuditEvent.create.getMockImplementation()!
  const updateExport = mockDb.closePackExport.update.getMockImplementation()!
  const updateRun = mockDb.closeRun.update.getMockImplementation()!
  mockDb.$transaction.mockImplementation(async callback => {
    let pendingRun = committedRun
    const events: unknown[] = [], audits: unknown[] = [], exports: unknown[] = []
    mockDb.closeRun.findFirst.mockImplementation(async () => pendingRun)
    mockDb.closeRun.update.mockImplementation(async args => {
      await updateRun(args)
      pendingRun = { ...pendingRun, ...args.data }
      return pendingRun
    })
    mockDb.businessEvent.create.mockImplementation(async args => {
      const result = await createEvent(args)
      events.push(args.data)
      return result
    })
    mockDb.ledgerAuditEvent.create.mockImplementation(async args => {
      const result = await createAudit(args)
      audits.push(args.data)
      return result
    })
    mockDb.closePackExport.update.mockImplementation(async args => {
      const result = await updateExport(args)
      exports.push(args)
      return result
    })
    try {
      const result = await callback(mockDb)
      committedRun = pendingRun
      committedEvents.push(...events)
      committedAudits.push(...audits)
      committedExports.push(...exports)
      transactions.committed++
      return result
    } catch (error) {
      transactions.rolledBack++
      throw error
    }
  })
  return { run: () => committedRun, committedEvents, committedAudits, committedExports, transactions }
}

describe("close assurance pack service", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockDb.$transaction.mockImplementation((callback) => callback(mockDb))
    mockDb.$queryRaw.mockResolvedValue([{ id: "close-run-1" }])
    mockDb.organizationAccountingSettings.findUnique.mockResolvedValue({ accountingEnabled: true, setupStatus: "READY" })
    mockDb.closeRun.findFirst.mockResolvedValue(closeRun())
    mockDb.closeRun.findMany.mockImplementation(async () => {
      const result = await mockDb.closeRun.findFirst.mock.results.at(-1)?.value
      return result ? [result] : []
    })
    mockDb.closePackExport.create.mockImplementation(({ data }) =>
      Promise.resolve({
        id: "close-pack-export-1",
        ...data,
      }),
    )
    mockDb.closeRun.update.mockResolvedValue({ id: "close-run-1" })
    mockDb.payrollPeriod.findMany.mockResolvedValue([{ id: "payroll-period-1", accountingPeriodId: "period-1" }])
    mockDb.payrollRun.findMany.mockResolvedValue([{ id: "payroll-run-1", payrollPeriodId: "payroll-period-1" }])
    mockDb.closePackExport.findFirst.mockImplementation(({ where }) => Promise.resolve(where.id ? {
      id: "close-pack-export-1",
      metadata: { mode: "CERTIFIED" },
    } : null))
    mockDb.closePackExport.update.mockResolvedValue({
      id: "close-pack-export-1",
    })
    mockDb.ledgerAuditEvent.create.mockResolvedValue({ id: "audit-1" })
    mockDb.ledgerAuditEvent.findMany.mockResolvedValue([
      {
        id: "ledger-audit-1",
        action: "CLOSE_ASSURANCE_RUN_COMPLETED",
        actorId: "controller-1",
        resourceType: "CloseRun",
        resourceId: "close-run-1",
        message: "Close run completed.",
        metadata: { correlationId: "run-corr-1" },
        createdAt: new Date("2026-06-15T12:35:00.000Z"),
      },
    ])
    mockDb.businessEvent.findUnique.mockResolvedValue(null)
    mockDb.businessEvent.create.mockImplementation(({ data }) =>
      Promise.resolve({
        id: "business-event-1",
        organizationId: data.organizationId,
        eventSource: data.eventSource,
        idempotencyKey: data.idempotencyKey,
        payloadHash: data.payloadHash,
      }),
    )
    mockDb.businessEvent.update.mockResolvedValue({ id: "business-event-1" })
    mockDb.auditLog.findMany.mockResolvedValue([pilotCertificationAudit()])
    mockDb.auditLog.create.mockResolvedValue({ id: "audit-log-1" })
    mockReconcileInventoryClass3.mockResolvedValue(cleanInventoryValuation())
  })

  it("allows draft exports with blockers and writes a watermarked audit record", async () => {
    mockDb.closeRun.findFirst.mockResolvedValue(
      closeRun({
        status: "BLOCKED",
        criticalBlockerCount: 1,
        findings: [
          {
            id: "finding-1",
            checklistItemId: "check-ledger",
            domain: "LEDGER",
            severity: "CRITICAL",
            status: "OPEN",
            title: "Draft journal entries remain open",
            detail: "Draft entries block close.",
            sourceService: "services/accounting/periods.service.ts",
            sourceType: "AccountingPeriodClosePreflight",
            sourceId: null,
            ownerId: null,
            assignedById: null,
            assignedAt: null,
            dueAt: null,
            resolutionNotes: null,
            resolvedAt: null,
            resolvedById: null,
            waiverRequestedById: null,
            waiverRequestedAt: null,
            waiverApprovedById: null,
            waiverApprovedAt: null,
            correlationId: "finding-corr-1",
          },
        ],
      }),
    )

    const result = await exportClosePack(
      "org-1",
      {
        closeRunId: "close-run-1",
        mode: "DRAFT_NOT_CERTIFIED",
        correlationId: "export-corr-1",
      },
      {
        actorId: "operator-1",
        actorPermissions: ["accounting.close.export"],
        now: "2026-06-15T13:00:00.000Z",
      },
    )

    expect(result.mode).toBe("DRAFT_NOT_CERTIFIED")
    expect(mockDb.$queryRaw).not.toHaveBeenCalled()
    expect(result.contentHash).toMatch(/^sha256:/)
    expect(result.watermarkId).toContain("draft-not-certified")
    expect(result.content).toContain("Draft close pack is not certified")
    const payload = JSON.parse(result.content)
    expect(payload.annexes.payrollFinanceForecast).toEqual(
      expect.objectContaining({
        saved: expect.objectContaining({
          sourceHash: "sha256:tenant-operating-payroll-forecast",
          personLevelAmounts: "redacted",
          totalUpcomingAmount: 170000,
          certifiedInputRunCount: 1,
          certifiedInputProofHashCount: 4,
          registerToLedgerRunCount: 1,
          proofDisclosure: "AGGREGATE_HASH_COUNTS_ONLY",
        }),
        redaction: expect.stringContaining(
          "person-level payroll amounts are redacted",
        ),
      }),
    )
    expect(result.content).not.toContain("sha256:private-hris-readiness")
    expect(result.content).not.toContain("sha256:private-engine-input")
    expect(result.content).not.toContain("private-employee-id")
    expect(result.content).not.toContain("private-salary-amount")
    expect(result.content).not.toContain("private-payment-destination")
    expect(payload.annexes.pilotCycleCertification).toEqual(
      expect.objectContaining({
        saved: expect.objectContaining({
          status: "CERTIFIED_FOR_PRODUCTION_RELEASE_REVIEW",
          certificateHash: "sha256:pilot-cycle-certificate",
          closePeriodPayrollRunCount: 1,
        }),
        redaction: expect.stringContaining("raw salary"),
      }),
    )
    expect(payload.evidenceItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sourceType: "PayrollFinanceForecastProof" }),
      ]),
    )
    const payrollEvidence = payload.evidenceItems.find(
      (item: { sourceType: string }) =>
        item.sourceType === "PayrollFinanceForecastProof",
    )
    expect(payrollEvidence.metadata).toMatchObject({
      certifiedInputRunCount: 1,
      certifiedInputProofHashCount: 4,
      registerToLedgerRunCount: 1,
      personLevelAmounts: "redacted",
      proofDisclosure: "AGGREGATE_HASH_COUNTS_ONLY",
    })
    expect(mockDb.closePackExport.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          isCertified: false,
          contentHash: result.contentHash,
          correlationId: "export-corr-1",
        }),
      }),
    )
    expect(mockDb.ledgerAuditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "CLOSE_PACK_DRAFT_EXPORT",
          resourceType: "ClosePackExport",
        }),
      }),
    )
    expect(mockDb.closeRun.update).not.toHaveBeenCalled()
  })

  it("requires fresh authentication before certified export", async () => {
    await expect(
      exportClosePack(
        "org-1",
        { closeRunId: "close-run-1", mode: "CERTIFIED" },
        {
          actorId: "certifier-1",
          actorPermissions: ["accounting.close.certify"],
          now: "2026-06-15T13:01:00.000Z",
        },
      ),
    ).rejects.toThrow(/Fresh authentication is required/i)

    expect(mockDb.closePackExport.create).not.toHaveBeenCalled()
  })

  it("blocks certified exports below T4 data trust", async () => {
    const run = closeRun()
    mockDb.closeRun.findFirst.mockResolvedValue({
      ...run,
      metadata: {
        ...(run.metadata as Record<string, unknown>),
        trustLevel: "T3",
      },
    })

    await expect(
      exportClosePack(
        "org-1",
        { closeRunId: "close-run-1", mode: "CERTIFIED" },
        {
          actorId: "certifier-1",
          actorPermissions: ["accounting.close.certify"],
          lastAuthAt: "2026-06-15T13:00:00.000Z",
          now: "2026-06-15T13:01:00.000Z",
        },
      ),
    ).rejects.toThrow(/requires at least T4 data trust/i)

    expect(mockDb.closePackExport.create).not.toHaveBeenCalled()
  })

  it("blocks certified exports when reconciliation certificates are unsigned", async () => {
    const run = closeRun()
    mockDb.closeRun.findFirst.mockResolvedValue({
      ...run,
      evidenceItems: run.evidenceItems.map((item) =>
        item.id === "evidence-recon"
          ? { ...item, sourceHash: null, provenance: "CAPTURED" }
          : item,
      ),
    })

    await expect(
      exportClosePack(
        "org-1",
        { closeRunId: "close-run-1", mode: "CERTIFIED" },
        {
          actorId: "certifier-1",
          actorPermissions: ["accounting.close.certify"],
          lastAuthAt: "2026-06-15T13:00:00.000Z",
          now: "2026-06-15T13:01:00.000Z",
        },
      ),
    ).rejects.toThrow(/reconciliation certificate reference/i)

    expect(mockDb.closePackExport.create).not.toHaveBeenCalled()
  })

  it("redacts raw provider payloads, secrets, and audit metadata from public pack content", async () => {
    const run = closeRun()
    mockDb.closeRun.findFirst.mockResolvedValue({
      ...run,
      metadata: {
        ...(run.metadata as Record<string, unknown>),
        rawProviderPayload: {
          merchantEmail: "merchant@example.test",
          token: "provider-token",
        },
        apiSecret: "super-secret-api-key",
      },
      evidenceItems: [
        ...run.evidenceItems,
        {
          id: "evidence-provider-event",
          checklistItemId: "check-payment",
          findingId: null,
          evidenceType: "PROVIDER_EVENT",
          sourceTable: "provider_events",
          sourceType: "ProviderSettlement",
          sourceId: "provider-event-1",
          sourceLabel: "Provider settlement",
          sourceDate: new Date("2026-06-15T10:05:00.000Z"),
          sourceHash: "sha256:provider-event",
          provenance: "POSTED",
          available: true,
          unavailableReason: null,
          metadata: {
            providerPayload: {
              customerPhone: "+237612345678",
              authorization: "Bearer raw-token",
            },
          },
          correlationId: "provider-corr-1",
        },
      ],
    })
    mockDb.ledgerAuditEvent.findMany.mockResolvedValue([
      {
        id: "ledger-audit-sensitive",
        action: "CLOSE_ASSURANCE_RUN_COMPLETED",
        actorId: "controller-1",
        resourceType: "CloseRun",
        resourceId: "close-run-1",
        message: "Close run completed.",
        metadata: {
          rawPayload: {
            customerEmail: "buyer@example.test",
            token: "audit-token",
          },
          requestSecret: "audit-secret",
        },
        createdAt: new Date("2026-06-15T12:35:00.000Z"),
      },
    ])

    const result = await exportClosePack(
      "org-1",
      {
        closeRunId: "close-run-1",
        mode: "DRAFT_NOT_CERTIFIED",
        correlationId: "redaction-corr-1",
      },
      {
        actorId: "operator-1",
        actorPermissions: ["accounting.close.export"],
        now: "2026-06-15T13:00:00.000Z",
      },
    )

    expect(result.content).not.toContain("merchant@example.test")
    expect(result.content).not.toContain("provider-token")
    expect(result.content).not.toContain("super-secret-api-key")
    expect(result.content).not.toContain("+237612345678")
    expect(result.content).not.toContain("Bearer raw-token")
    expect(result.content).not.toContain("buyer@example.test")
    expect(result.content).not.toContain("audit-secret")

    const payload = JSON.parse(result.content)
    expect(payload.closeRun.metadata.rawProviderPayload).toBe("redacted")
    expect(payload.closeRun.metadata.apiSecret).toMatch(/^redacted:/)
    const providerEvidence = payload.evidenceItems.find(
      (item: { id: string }) => item.id === "evidence-provider-event",
    )
    expect(providerEvidence.metadata.providerPayload).toBe("redacted")
    expect(
      payload.evidenceSummaries.auditLogExcerpt[0].metadata.rawPayload,
    ).toBe("redacted")
    expect(
      payload.evidenceSummaries.auditLogExcerpt[0].metadata.requestSecret,
    ).toMatch(/^redacted:/)
  })

  it("blocks certified exports when high-risk findings remain open", async () => {
    mockDb.closeRun.findFirst.mockResolvedValue(
      closeRun({
        findings: [
          {
            id: "finding-1",
            checklistItemId: "check-ledger",
            domain: "LEDGER",
            severity: "CRITICAL",
            status: "OPEN",
            title: "Trial balance is out of balance",
            detail: "Ledger is unbalanced.",
            sourceService: "services/accounting/reconciliations.service.ts",
            sourceType: "TrialBalance",
            sourceId: "XAF",
            ownerId: null,
            assignedById: null,
            assignedAt: null,
            dueAt: null,
            resolutionNotes: null,
            resolvedAt: null,
            resolvedById: null,
            waiverRequestedById: null,
            waiverRequestedAt: null,
            waiverApprovedById: null,
            waiverApprovedAt: null,
            correlationId: "finding-corr-1",
          },
        ],
      }),
    )

    await expect(
      exportClosePack(
        "org-1",
        { closeRunId: "close-run-1", mode: "CERTIFIED" },
        {
          actorId: "certifier-1",
          actorPermissions: ["accounting.close.certify"],
          lastAuthAt: "2026-06-15T13:00:00.000Z",
          now: "2026-06-15T13:01:00.000Z",
        },
      ),
    ).rejects.toThrow(/Certified close pack is blocked/i)
  })

  it("blocks certified exports when persisted pilot-cycle certification is missing", async () => {
    mockDb.auditLog.findMany.mockResolvedValue([])

    await expect(
      exportClosePack(
        "org-1",
        { closeRunId: "close-run-1", mode: "CERTIFIED" },
        {
          actorId: "certifier-1",
          actorPermissions: ["accounting.close.certify"],
          lastAuthAt: "2026-06-15T13:00:00.000Z",
          now: "2026-06-15T13:01:00.000Z",
        },
      ),
    ).rejects.toThrow(/pilot-cycle certification evidence is missing/i)

    expect(mockDb.closePackExport.create).not.toHaveBeenCalled()
  })

  it("records absent payroll periods without inventing payroll approval", async () => {
    mockDb.payrollPeriod.findMany.mockResolvedValue([])
    const result = await exportClosePack("org-1", { closeRunId: "close-run-1", mode: "CERTIFIED" }, {
      actorId: "certifier-1", actorPermissions: ["accounting.close.certify"],
      lastAuthAt: "2026-06-15T13:00:00.000Z", now: "2026-06-15T13:01:00.000Z",
    })
    const saved = JSON.parse(result.content).annexes.pilotCycleCertification.saved
    expect(saved).toEqual(expect.objectContaining({ status: "NOT_APPLICABLE", applicability: "NO_RECORDED_PAYROLL_PERIOD", certificateHash: null, closePeriodPayrollPeriodCount: 0, runCertificates: [] }))
    expect(mockDb.payrollRun.findMany).not.toHaveBeenCalled()
    expect(mockDb.auditLog.findMany).not.toHaveBeenCalled()
    expect(mockDb.payrollPeriod.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {
      organizationId: "org-1", OR: [
        { accountingPeriodId: "period-1" },
        { periodStart: { lte: expect.any(Date) }, periodEnd: { gte: expect.any(Date) } },
      ],
    } }))
  })

  it("does not turn an unavailable payroll scope into no payroll", async () => {
    mockDb.payrollPeriod.findMany.mockRejectedValue(new Error("scope unavailable"))
    await expect(exportClosePack("org-1", { closeRunId: "close-run-1", mode: "DRAFT_NOT_CERTIFIED" }, {
      actorId: "reader-1", actorPermissions: ["accounting.close.export"],
    })).rejects.toThrow("scope unavailable")
    expect(mockDb.closePackExport.create).not.toHaveBeenCalled()
  })

  it("blocks a retained period without a run and an unlinked overlapping period", async () => {
    mockDb.payrollPeriod.findMany.mockResolvedValue([{ id: "payroll-period-1", accountingPeriodId: null }])
    mockDb.payrollRun.findMany.mockResolvedValue([])
    const result = await exportClosePack("org-1", { closeRunId: "close-run-1", mode: "DRAFT_NOT_CERTIFIED" }, {
      actorId: "reader-1", actorPermissions: ["accounting.close.export"],
    })
    const blockers = JSON.parse(result.content).export.certificationBlockers
    expect(blockers).toEqual(expect.arrayContaining([
      expect.stringMatching(/no retained payroll run/), expect.stringMatching(/matching accounting-period link/),
    ]))
  })

  it("requires each payroll run's own certificate", async () => {
    mockDb.payrollRun.findMany.mockResolvedValue([
      { id: "payroll-run-1", payrollPeriodId: "payroll-period-1" },
      { id: "payroll-run-2", payrollPeriodId: "payroll-period-1" },
    ])
    await expect(exportClosePack("org-1", { closeRunId: "close-run-1", mode: "CERTIFIED" }, {
      actorId: "certifier-1", actorPermissions: ["accounting.close.certify"],
      lastAuthAt: "2026-06-15T13:00:00.000Z", now: "2026-06-15T13:01:00.000Z",
    })).rejects.toThrow(/Payroll run 2.*evidence is missing/)
    expect(mockDb.closePackExport.create).not.toHaveBeenCalled()
  })

  it("retains all matching certificates and rejects a later blocked evaluation", async () => {
    mockDb.payrollRun.findMany.mockResolvedValue([
      { id: "payroll-run-1", payrollPeriodId: "payroll-period-1" },
      { id: "payroll-run-2", payrollPeriodId: "payroll-period-1" },
    ])
    mockDb.auditLog.findMany.mockResolvedValue([
      pilotCertificationAudit(), { ...pilotCertificationAudit(), id: "audit-2", entityId: "payroll-run-2" },
    ])
    const control = { actorId: "certifier-1", actorPermissions: ["accounting.close.certify"], lastAuthAt: "2026-06-15T13:00:00.000Z", now: "2026-06-15T13:01:00.000Z" }
    const result = await exportClosePack("org-1", { closeRunId: "close-run-1", mode: "CERTIFIED" }, control)
    expect(JSON.parse(result.content).annexes.pilotCycleCertification.saved).toEqual(expect.objectContaining({ closePeriodPayrollRunCount: 2, runCertificates: [expect.objectContaining({ certificateHash: "sha256:pilot-cycle-certificate" }), expect.objectContaining({ certificateHash: "sha256:pilot-cycle-certificate" })] }))
    mockDb.auditLog.findMany.mockResolvedValue([pilotCertificationAudit({ status: "BLOCKED" }), pilotCertificationAudit(), { ...pilotCertificationAudit(), entityId: "payroll-run-2" }])
    await expect(exportClosePack("org-1", { closeRunId: "close-run-1", mode: "CERTIFIED" }, control)).rejects.toThrow(/not certified for production release/)
  })

  it.each([null, { accountingEnabled: true, setupStatus: "IN_PROGRESS" }, { accountingEnabled: false, setupStatus: "READY" }])("rejects a saved READY run when current accounting setup is incomplete: %j", async (settings) => {
    mockDb.organizationAccountingSettings.findUnique.mockResolvedValue(settings)
    await expect(exportClosePack("org-1", { closeRunId: "close-run-1", mode: "CERTIFIED" }, {
      actorId: "certifier-1", actorPermissions: ["accounting.close.certify"],
      lastAuthAt: "2026-06-15T13:00:00.000Z", now: "2026-06-15T13:01:00.000Z",
    })).rejects.toThrow(/Complete accounting setup/)
    expect(mockDb.organizationAccountingSettings.findUnique).toHaveBeenCalledWith({ where: { organizationId: "org-1" }, select: { accountingEnabled: true, setupStatus: true } })
    expect(mockDb.closePackExport.create).not.toHaveBeenCalled()
  })

  it("blocks same-actor certification for segregation of duties", async () => {
    await expect(
      exportClosePack(
        "org-1",
        { closeRunId: "close-run-1", mode: "CERTIFIED" },
        {
          actorId: "runner-1",
          actorPermissions: ["accounting.close.certify"],
          lastAuthAt: "2026-06-15T13:00:00.000Z",
          now: "2026-06-15T13:01:00.000Z",
        },
      ),
    ).rejects.toThrow(/cannot certify/i)
  })

  it("certifies a clean close pack and updates the close run", async () => {
    const result = await exportClosePack(
      "org-1",
      {
        closeRunId: "close-run-1",
        mode: "CERTIFIED",
        correlationId: "cert-corr-1",
      },
      {
        actorId: "certifier-1",
        actorPermissions: ["accounting.close.certify"],
        lastAuthAt: "2026-06-15T13:00:00.000Z",
        now: "2026-06-15T13:01:00.000Z",
      },
    )

    expect(result.isCertified).toBe(true)
    expect(result.content).toContain("CERTIFIED")
    expect(result.content).toContain("inventoryValuation")
    expect(result.content).toContain("STATUTORY_BLOCKED")
    expect(mockDb.closePackExport.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          isCertified: true,
          contentHash: result.contentHash,
          watermarkId: result.watermarkId,
          metadata: expect.objectContaining({
            inventoryAnnexFreshness: expect.objectContaining({
              status: "FRESH",
            }),
            pilotCycleCertification: expect.objectContaining({
              status: "CERTIFIED_FOR_PRODUCTION_RELEASE_REVIEW",
              certificateHash: "sha256:pilot-cycle-certificate",
            }),
            statutoryCertification: expect.objectContaining({
              statutoryAuthorityStatus: "AUTHORITY_NOT_CONFIGURED",
            }),
          }),
        }),
      }),
    )
    expect(mockDb.closeRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "CERTIFIED",
        }),
      }),
    )
    expect(mockDb.ledgerAuditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "CLOSE_PACK_CERTIFIED_EXPORT",
        }),
      }),
    )
  })

  it.each(["READY", "RUNNING", "BLOCKED", "VOIDED", "CERTIFIED"])("rejects an older READY certification when the newer assessment is %s", async status => {
    const retained = closeRun(), newer = closeRun({ id: "newer-private", status, createdAt: new Date("2026-06-15T12:01:00Z") })
    mockDb.closeRun.findMany.mockResolvedValue([newer, retained])
    await expect(exportClosePack("org-1", { closeRunId: retained.id, mode: "CERTIFIED" }, { actorId: "certifier-1", actorPermissions: ["accounting.close.certify"], now: "2026-06-15T13:00:00Z", lastAuthAt: "2026-06-15T13:00:00Z" })).rejects.toMatchObject({ code: "CONFLICT", message: expect.stringContaining("no longer current") })
    expect(mockDb.closeRun.findMany).toHaveBeenCalledWith({ where: { organizationId: "org-1", periodId: "period-1" }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 2, select: { id: true, createdAt: true, status: true, voidedAt: true } })
    expect(mockDb.closePackExport.create).not.toHaveBeenCalled()
    expect(mockDb.closeRun.update).not.toHaveBeenCalled()
    expect(mockDb.ledgerAuditEvent.create).not.toHaveBeenCalled()
    expect(mockReconcileInventoryClass3).not.toHaveBeenCalled()
    expect(mockDb.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "ReadCommitted" })
  })

  it.each(["close-run-1", "other-tied-run"])("denies either tied assessment without using IDs to establish currentness (%s)", async requested => {
    mockDb.closeRun.findFirst.mockResolvedValue(closeRun({ id: requested }))
    mockDb.closeRun.findMany.mockResolvedValue([closeRun({ id: "other-tied-run" }), closeRun()])
    await expect(exportClosePack("org-1", { closeRunId: requested, mode: "CERTIFIED" }, { actorId: "certifier-1", actorPermissions: ["accounting.close.certify"], now: "2026-06-15T13:00:00Z", lastAuthAt: "2026-06-15T13:00:00Z" })).rejects.toMatchObject({ code: "CONFLICT", message: expect.stringContaining("same creation time") })
    expect(mockDb.closePackExport.create).not.toHaveBeenCalled()
    expect(mockDb.closeRun.update).not.toHaveBeenCalled()
  })

  it("denies an independently voided newest READY assessment", async () => {
    mockDb.closeRun.findFirst.mockResolvedValue(closeRun({ voidedAt: new Date("2026-06-15T12:05:00Z") }))
    await expect(exportClosePack("org-1", { closeRunId: "close-run-1", mode: "CERTIFIED" }, { actorId: "certifier-1", actorPermissions: ["accounting.close.certify"], now: "2026-06-15T13:00:00Z", lastAuthAt: "2026-06-15T13:00:00Z" })).rejects.toMatchObject({ code: "INVALID_TRANSITION" })
    expect(mockDb.closePackExport.create).not.toHaveBeenCalled()
    expect(mockDb.ledgerAuditEvent.create).not.toHaveBeenCalled()
  })

  it("retains historical draft export without current-assessment locking or selection", async () => {
    mockDb.closeRun.findMany.mockRejectedValue(new Error("Draft must not select current assessment"))
    const result = await exportClosePack("org-1", { closeRunId: "close-run-1", mode: "DRAFT_NOT_CERTIFIED" }, { actorId: "reader", actorPermissions: ["accounting.close.export"] })
    expect(result.isCertified).toBe(false)
    expect(mockDb.closeRun.findMany).not.toHaveBeenCalled()
    expect(mockDb.$queryRaw).not.toHaveBeenCalled()
  })

  it("waits for period publication and rereads the newly current assessment before certification", async () => {
    let release!: () => void, entered!: () => void
    const waiting = new Promise<void>(resolve => { entered = resolve })
    const lock = new Promise(resolve => { release = () => resolve([]) })
    mockDb.$queryRaw.mockImplementationOnce(() => { entered(); return lock })
    const work = exportClosePack("org-1", { closeRunId: "close-run-1", mode: "CERTIFIED" }, { actorId: "certifier-1", actorPermissions: ["accounting.close.certify"], now: "2026-06-15T13:00:00Z", lastAuthAt: "2026-06-15T13:00:00Z" })
    await waiting
    expect(mockDb.closeRun.findFirst).toHaveBeenCalledTimes(1)
    expect(mockDb.closeRun.findFirst).toHaveBeenCalledWith({ where: { id: "close-run-1", organizationId: "org-1", period: { organizationId: "org-1" } }, select: { periodId: true } })
    expect(mockDb.closeRun.findMany).not.toHaveBeenCalled()
    expect(mockDb.closePackExport.create).not.toHaveBeenCalled()
    mockDb.closeRun.findMany.mockResolvedValue([closeRun({ id: "newly-published", status: "RUNNING", createdAt: new Date("2026-06-15T12:01:00Z") }), closeRun()])
    release()
    await expect(work).rejects.toMatchObject({ code: "CONFLICT" })
    expect(mockDb.$queryRaw.mock.calls[0][0].values).toEqual([JSON.stringify(["close-assessment-order", "org-1", "period-1"])])
    expect(mockDb.$queryRaw.mock.calls[1][0].text).toContain('FROM "close_runs"')
    expect(mockDb.closeRun.findFirst).toHaveBeenCalledTimes(2)
    expect(mockDb.closePackExport.create).not.toHaveBeenCalled()
  })

  it("rejects a cross-tenant or missing requested assessment before acquiring period locks", async () => {
    mockDb.closeRun.findFirst.mockResolvedValue(null)
    await expect(exportClosePack("org-1", { closeRunId: "foreign-run", mode: "CERTIFIED" }, { actorId: "certifier-1", actorPermissions: ["accounting.close.certify"], now: "2026-06-15T13:00:00Z", lastAuthAt: "2026-06-15T13:00:00Z" })).rejects.toMatchObject({ code: "NOT_FOUND" })
    expect(mockDb.closeRun.findFirst).toHaveBeenCalledWith({ where: { id: "foreign-run", organizationId: "org-1", period: { organizationId: "org-1" } }, select: { periodId: true } })
    expect(mockDb.$queryRaw).not.toHaveBeenCalled()
    expect(mockDb.closePackExport.create).not.toHaveBeenCalled()
  })
  it.each(["CERTIFIED", "DRAFT_NOT_CERTIFIED"] as const)("rejects a tenant-owned run with a foreign accounting period during %s export", async mode => {
    const corrupt = { ...closeRun(), period: { ...closeRun().period, organizationId: "foreign-org" } }
    mockDb.closeRun.findFirst.mockImplementation(async ({ where }) =>
      where.organizationId === corrupt.organizationId &&
      (!where.period?.organizationId || where.period.organizationId === corrupt.period.organizationId)
        ? corrupt : null,
    )
    await expect(exportClosePack("org-1", { closeRunId: corrupt.id, mode }, { actorId: "certifier-1", actorPermissions: ["accounting.close.certify", "accounting.close.export"], now: "2026-06-15T13:00:00Z", lastAuthAt: "2026-06-15T13:00:00Z" })).rejects.toMatchObject({ code: "NOT_FOUND" })
    expect(mockDb.closeRun.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: corrupt.id, organizationId: "org-1", period: { organizationId: "org-1" } } }))
    expect(mockDb.$queryRaw).not.toHaveBeenCalled()
    expect(mockDb.closePackExport.create).not.toHaveBeenCalled()
    expect(mockDb.closeRun.update).not.toHaveBeenCalled()
    expect(mockReconcileInventoryClass3).not.toHaveBeenCalled()
  })
  it("keeps recorded close invalidation effective even when inventory is fresh and status is READY", async () => {
    const value = closeRun()
    mockDb.closeRun.findFirst.mockResolvedValue({ ...value, metadata: { ...value.metadata, staleState: { status: "EVIDENCE_STALE" } } })
    await expect(exportClosePack("org-1", { closeRunId: "close-run-1", mode: "CERTIFIED" }, { actorId: "certifier-1", actorPermissions: ["accounting.close.certify"], now: "2026-06-15T13:00:00Z", lastAuthAt: "2026-06-15T13:00:00Z" })).rejects.toThrow("A recorded change invalidated close certification evidence.")
    expect(mockDb.closePackExport.create).not.toHaveBeenCalled()
  })

  it("waits for the run lock and rereads invalidation before certification", async () => {
    let unlock!: () => void, lockEntered!: () => void
    const pendingLock = new Promise<{ id: string }[]>(resolve => { unlock = () => resolve([{ id: "close-run-1" }]) })
    const entered = new Promise<void>(resolve => { lockEntered = resolve })
    mockDb.$queryRaw.mockResolvedValueOnce([]).mockImplementationOnce(() => { lockEntered(); return pendingLock })
    const exporting = exportClosePack("org-1", { closeRunId: "close-run-1", mode: "CERTIFIED" }, {
      actorId: "certifier-1", actorPermissions: ["accounting.close.certify"], now: "2026-06-15T13:00:00Z", lastAuthAt: "2026-06-15T13:00:00Z",
    })
    await entered
    const readsBeforeUnlock = mockDb.closeRun.findFirst.mock.calls.length
    const before = closeRun()
    mockDb.closeRun.findFirst.mockResolvedValue({ ...before, status: "BLOCKED", metadata: { ...before.metadata, staleState: { status: "EVIDENCE_STALE", sourceId: "concurrent-source" } } })
    unlock()
    await expect(exporting).rejects.toThrow("A recorded change invalidated close certification evidence.")
    expect(readsBeforeUnlock).toBe(1) // Tenant-scoped period discovery only.
    expect(mockDb.$queryRaw.mock.calls[0][0].text).toContain("pg_advisory_xact_lock")
    expect(mockDb.$queryRaw.mock.calls[1][0].text).toMatch(/FROM "close_runs"[\s\S]*FOR NO KEY UPDATE/)
    expect(mockDb.$queryRaw.mock.calls[1][0].values).toEqual(["org-1", "close-run-1"])
    expect(mockDb.closePackExport.create).not.toHaveBeenCalled()
    expect(mockDb.closeRun.update).not.toHaveBeenCalled()
  })

  it("invalidates the export committed while source invalidation waited for its run lock", async () => {
    let unlock!: () => void, lockEntered!: () => void
    const pendingLock = new Promise<{ id: string }[]>(resolve => { unlock = () => resolve([{ id: "close-run-1" }]) })
    const entered = new Promise<void>(resolve => { lockEntered = resolve })
    mockDb.$queryRaw.mockImplementationOnce(() => { lockEntered(); return pendingLock })
    mockDb.closeRun.findMany.mockResolvedValue([{ id: "close-run-1" }])
    const invalidating = recordCloseCertificationInvalidationsForSource("org-1", {
      sourceCode: "LEDGER_JOURNAL_POSTED", sourceId: "new-entry", periodId: "period-1",
      staleReason: "Source changed while certification completed", newEvidenceHash: "entry-new",
    }, { actorId: "poster", now: "2026-06-15T13:01:00Z" })
    await entered
    const readsBeforeUnlock = mockDb.closeRun.findFirst.mock.calls.length
    const exportReadsBeforeUnlock = mockDb.closePackExport.findFirst.mock.calls.length
    const before = closeRun()
    mockDb.closeRun.findFirst.mockResolvedValue({ ...before, status: "CERTIFIED", metadata: { ...before.metadata, certifiedExportId: "newly-certified-export" } })
    mockDb.closePackExport.findFirst.mockResolvedValue({ id: "newly-certified-export", contentHash: "retained-hash", isCertified: true, metadata: { mode: "CERTIFIED", certificationHistory: "retained" } })
    unlock()
    const result = await invalidating
    expect(readsBeforeUnlock).toBe(0)
    expect(exportReadsBeforeUnlock).toBe(0)
    expect(mockDb.closeRun.findMany).toHaveBeenCalledWith(expect.objectContaining({ select: { id: true }, orderBy: { id: "asc" } }))
    expect(mockDb.closePackExport.findFirst).toHaveBeenCalledWith({ where: { organizationId: "org-1", closeRunId: "close-run-1", isCertified: true }, orderBy: [{ exportedAt: "desc" }, { id: "desc" }] })
    expect(result.results[0].closePackExportId).toBe("newly-certified-export")
    expect(mockDb.closePackExport.update).toHaveBeenCalledWith({ where: { id: "newly-certified-export" }, data: { metadata: expect.objectContaining({ certificationHistory: "retained", staleState: expect.objectContaining({ status: "EVIDENCE_STALE", sourceId: "new-entry" }) }) } })
    expect(mockDb.closeRun.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "BLOCKED", metadata: expect.objectContaining({ certifiedExportId: "newly-certified-export", staleState: expect.objectContaining({ status: "EVIDENCE_STALE" }) }) }) }))
    expect(mockDb.businessEvent.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
      idempotencyKey: expect.stringContaining(":newly-certified-export:"),
      payload: expect.objectContaining({ closePackExportId: "newly-certified-export" }),
    }) }))
  })

  it.each(["certify", "invalidate"])("rejects a missing tenant-scoped lock target before %s evidence reads", async operation => {
    mockDb.$queryRaw.mockResolvedValue([])
    const result = operation === "certify"
      ? exportClosePack("org-1", { closeRunId: "foreign-close", mode: "CERTIFIED" }, { actorId: "certifier-1", actorPermissions: ["accounting.close.certify"], now: "2026-06-15T13:00:00Z", lastAuthAt: "2026-06-15T13:00:00Z" })
      : recordCloseCertificationInvalidation("org-1", { closeRunId: "foreign-close", sourceModel: "Ledger", sourceEventName: "ledger.journal.posted", staleReason: "Owned source changed" })
    await expect(result).rejects.toThrow("Close run not found")
    expect(mockDb.$queryRaw.mock.calls[operation === "certify" ? 1 : 0][0].values).toEqual(["org-1", "foreign-close"])
    expect(mockDb.closeRun.findFirst).toHaveBeenCalledTimes(operation === "certify" ? 1 : 0)
    expect(mockDb.closePackExport.findFirst).not.toHaveBeenCalled()
    expect(mockDb.closePackExport.create).not.toHaveBeenCalled()
    expect(mockDb.businessEvent.create).not.toHaveBeenCalled()
  })

  it("preserves direct run-only invalidation and explicit export bindings", async () => {
    await recordCloseCertificationInvalidation("org-1", { closeRunId: "close-run-1", sourceModel: "Ledger", sourceEventName: "ledger.journal.posted", staleReason: "Owned source changed" })
    expect(mockDb.closePackExport.findFirst).not.toHaveBeenCalled()
    expect(mockDb.closePackExport.update).not.toHaveBeenCalled()
    expect(mockDb.businessEvent.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ idempotencyKey: expect.stringContaining(":run:") }) }))
    jest.clearAllMocks()
    await recordCloseCertificationInvalidationsForSource("org-1", { closeRunId: "close-run-1", closePackExportId: "explicit-export", sourceCode: "LEDGER_JOURNAL_POSTED", sourceId: "new-entry", staleReason: "Owned source changed" })
    expect(mockDb.closePackExport.findFirst).toHaveBeenCalledWith({ where: { id: "explicit-export", organizationId: "org-1", closeRunId: "close-run-1" } })
    expect(mockDb.businessEvent.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ idempotencyKey: expect.stringContaining(":explicit-export:") }) }))
  })

  it.each(["RUNNING", "READY", "CERTIFIED", "EXPORTED"])("invalidates a %s assessment on a new source event even without an export", async (status) => {
    const value = { ...closeRun(), status }
    mockDb.closeRun.findFirst.mockResolvedValue(value)
    // Model the persisted run population. A query restricted to CERTIFIED
    // would miss the READY assessment even though period close can consume it.
    mockDb.closeRun.findMany.mockImplementation(async ({ where }) => {
      const statusCondition = where.AND[1].OR[0].status
      const included = typeof statusCondition === "string" ? statusCondition === status : statusCondition.in.includes(status)
      return included ? [{ id: value.id, packExports: [] }] : []
    })
    const result = await recordCloseCertificationInvalidationsForSource("org-1", {
      sourceCode: "LEDGER_JOURNAL_POSTED", sourceId: "new-entry", periodId: "period-1",
      staleReason: "Ledger activity changed after this assessment", newEvidenceHash: "entry-2",
    }, { actorId: "poster", now: "2026-06-15T13:01:00Z" })
    expect(result.invalidatedCount).toBe(1)
    expect(mockDb.closeRun.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId: "org-1", AND: expect.arrayContaining([{ OR: [{ periodId: "period-1" }] }]) }) }))
    expect(mockDb.closeRun.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: value.id }, data: expect.objectContaining({ status: "BLOCKED", metadata: expect.objectContaining({ staleState: expect.objectContaining({ status: "EVIDENCE_STALE", sourceId: "new-entry" }) }) }),
    }))
    expect(mockDb.closePackExport.update).not.toHaveBeenCalled()
  })

  it("discovers a tenant-scoped period union once with deterministic run ordering", async () => {
    mockDb.closeRun.findMany.mockResolvedValue([])
    const result = await recordCloseCertificationInvalidationsForSource("org-1", {
      sourceCode: "LEDGER_JOURNAL_REVERSED", sourceId: "original", periodIds: ["period-z", "period-a", "period-z"],
      staleReason: "Complete reversal period union", newEvidenceHash: "reversal",
    })
    expect(result.invalidatedCount).toBe(0)
    expect(mockDb.closeRun.findMany).toHaveBeenCalledTimes(1)
    expect(mockDb.closeRun.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ organizationId: "org-1", AND: expect.arrayContaining([{ OR: [{ periodId: { in: ["period-a", "period-z"] } }] }]) }),
      orderBy: { id: "asc" }, select: { id: true },
    }))
    expect(mockDb.businessEvent.create).not.toHaveBeenCalled()
  })

  it("accepts unchanged source evidence despite a different observation hash", async () => {
    mockReconcileInventoryClass3.mockResolvedValue({ ...cleanInventoryValuation(), reportHash: "sha256:new-observation", recordedThrough: "2026-06-15T13:00:00.000Z" })
    const result = await exportClosePack("org-1", { closeRunId: "close-run-1", mode: "DRAFT_NOT_CERTIFIED" }, { actorId: "operator-1", actorPermissions: ["accounting.close.export"] })
    expect(JSON.parse(result.content).annexes.inventoryValuation.freshness.status).toBe("FRESH")
  })

  it("requires a new assessment for legacy inventory annexes without the fingerprint version", async () => {
    const value = closeRun()
    const legacyAnnex: Record<string, unknown> = { ...inventoryAnnex() }
    delete legacyAnnex.evidenceHashVersion
    mockDb.closeRun.findFirst.mockResolvedValue({ ...value, metadata: { ...value.metadata, inventoryValuationAnnex: legacyAnnex } })
    const result = await exportClosePack("org-1", { closeRunId: "close-run-1", mode: "DRAFT_NOT_CERTIFIED" }, { actorId: "operator-1", actorPermissions: ["accounting.close.export"] })
    expect(JSON.parse(result.content).annexes.inventoryValuation.freshness.status).toBe("MISSING")
    expect(result.content).toContain("Run a new close assessment.")
    expect(mockReconcileInventoryClass3).not.toHaveBeenCalled()
  })

  it("uses a safe inventory-refresh limitation when draft pack evidence is unavailable", async () => {
    mockReconcileInventoryClass3.mockRejectedValue(
      new Error("provider secret token leaked from downstream adapter"),
    )

    const result = await exportClosePack(
      "org-1",
      {
        closeRunId: "close-run-1",
        mode: "DRAFT_NOT_CERTIFIED",
        correlationId: "inventory-unavailable-corr-1",
      },
      {
        actorId: "operator-1",
        actorPermissions: ["accounting.close.export"],
        now: "2026-06-15T13:00:00.000Z",
      },
    )

    expect(result.content).toContain(
      "Inventory valuation annex could not be refreshed.",
    )
    expect(result.content).not.toContain("provider secret token")
    expect(result.content).not.toContain("downstream adapter")
    const payload = JSON.parse(result.content)
    expect(payload.annexes.inventoryValuation.freshness.status).toBe(
      "UNAVAILABLE",
    )
    expect(payload.export.certificationBlockers).toEqual(
      expect.arrayContaining([
        "Inventory valuation annex freshness could not be verified.",
      ]),
    )
  })
  it("blocks certified exports and records invalidation when inventory annex evidence is stale", async () => {
    mockReconcileInventoryClass3.mockResolvedValue(
      cleanInventoryValuation("sha256:inventory-valuation-new"),
    )

    await expect(
      exportClosePack(
        "org-1",
        {
          closeRunId: "close-run-1",
          mode: "CERTIFIED",
          correlationId: "stale-corr-1",
        },
        {
          actorId: "certifier-1",
          actorPermissions: ["accounting.close.certify"],
          lastAuthAt: "2026-06-15T13:00:00.000Z",
          now: "2026-06-15T13:01:00.000Z",
        },
      ),
    ).rejects.toThrow(/inventory valuation annex evidence is stale/i)

    expect(mockDb.closePackExport.create).not.toHaveBeenCalled()
    expect(mockDb.businessEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: "close.certification.invalidated",
          eventSource: "SYSTEM",
          sourceType: "MANUAL",
          sourceId: "close-run-1",
        }),
      }),
    )
    expect(mockDb.ledgerAuditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "CLOSE_CERTIFICATION_EVIDENCE_STALE",
          resourceType: "CloseRun",
        }),
      }),
    )
  })

  it.each(["changed", "missing", "blocked", "unavailable"])("commits truthful %s inventory invalidation before denying certification", async condition => {
    if (condition === "unavailable") {
      mockReconcileInventoryClass3.mockRejectedValue(new Error("private database connection details"))
    } else if (condition !== "missing") {
      mockReconcileInventoryClass3.mockResolvedValue({ ...cleanInventoryValuation("sha256:changed"), ...(condition === "blocked" ? { status: "BLOCKED", failures: [{ message: "Inventory evidence requires correction" }] } : {}) })
    }
    const retained = condition === "missing" ? closeRun({ metadata: { ...closeRun().metadata, inventoryValuationAnnex: null } }) : closeRun()
    const state = observeInvalidationTransactions(retained)
    await expect(exportClosePack("org-1", { closeRunId: "close-run-1", mode: "CERTIFIED", correlationId: "detected-corr" }, {
      actorId: "certifier-1", actorPermissions: ["accounting.close.certify"],
      lastAuthAt: "2026-06-15T13:00:00Z", now: "2026-06-15T13:01:00Z",
    })).rejects.toThrow(/Certified close pack is blocked/)
    expect(state.transactions.committed).toBe(1)
    expect(mockDb.closePackExport.create).not.toHaveBeenCalled()
    expect(mockDb.closeRun.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "BLOCKED", metadata: expect.objectContaining({ staleState: expect.objectContaining({ status: "EVIDENCE_STALE" }) }) }) }))
    expect(state.run().status).toBe("BLOCKED")
    expect(state.committedEvents).toEqual([expect.objectContaining({ eventType: "close.certification.invalidated", outboxMessages: { create: [expect.objectContaining({ eventName: "close.certification.invalidated" })] } })])
    expect(state.committedAudits).toHaveLength(1)
    expect(JSON.stringify(state.committedEvents)).not.toContain("private database connection details")
  })

  it("retains the current certified artifact and avoids duplicate invalidation on a new denial request", async () => {
    mockReconcileInventoryClass3.mockResolvedValue(cleanInventoryValuation("sha256:changed"))
    mockDb.closePackExport.findFirst.mockResolvedValue({ id: "retained-export", contentHash: "original-content-hash", isCertified: true, metadata: { certificationHistory: "retained" } })
    const state = observeInvalidationTransactions()
    for (const [attempt, actor] of [[1, "certifier-1"], [2, "certifier-2"]] as const) {
      await expect(exportClosePack("org-1", { closeRunId: "close-run-1", mode: "CERTIFIED", correlationId: `denial-${attempt}` }, {
        actorId: actor, actorPermissions: ["accounting.close.certify"], lastAuthAt: `2026-06-15T13:0${attempt}:00Z`, now: `2026-06-15T13:0${attempt}:00Z`,
      })).rejects.toThrow(/Certified close pack is blocked/)
    }
    expect(state.transactions).toEqual({ committed: 1, rolledBack: 1 })
    expect(state.committedEvents).toHaveLength(1)
    expect(state.committedAudits).toHaveLength(1)
    expect(state.committedExports).toEqual([{ where: { id: "retained-export" }, data: { metadata: expect.objectContaining({ certificationHistory: "retained", staleState: expect.objectContaining({ actorId: "certifier-1", correlationId: "denial-1" }) }) } }])
    expect(mockDb.businessEvent.create).toHaveBeenCalledTimes(1)
    expect(mockDb.closeRun.update).toHaveBeenCalledTimes(1)
    expect(mockDb.closePackExport.create).not.toHaveBeenCalled()
  })

  it.each(["audit", "run", "export"])("rolls back detected invalidation if its %s write fails", async failingWrite => {
    mockReconcileInventoryClass3.mockResolvedValue(cleanInventoryValuation("sha256:changed"))
    const failure = new Error("invalidation persistence failed")
    if (failingWrite === "audit") mockDb.ledgerAuditEvent.create.mockRejectedValue(failure)
    if (failingWrite === "run") mockDb.closeRun.update.mockRejectedValue(failure)
    if (failingWrite === "export") {
      mockDb.closePackExport.findFirst.mockResolvedValue({ id: "retained-export", metadata: {} })
      mockDb.closePackExport.update.mockRejectedValue(failure)
    }
    const state = observeInvalidationTransactions()
    await expect(exportClosePack("org-1", { closeRunId: "close-run-1", mode: "CERTIFIED" }, {
      actorId: "certifier-1", actorPermissions: ["accounting.close.certify"], lastAuthAt: "2026-06-15T13:00:00Z", now: "2026-06-15T13:01:00Z",
    })).rejects.toBe(failure)
    expect(state.transactions).toEqual({ committed: 0, rolledBack: 1 })
    expect(state.run().status).toBe("READY")
    expect(state.committedEvents).toEqual([])
    expect(state.committedAudits).toEqual([])
    expect(state.committedExports).toEqual([])
    expect(mockDb.closePackExport.create).not.toHaveBeenCalled()
  })

  it.each(["permission", "fresh-auth", "maker-checker", "setup"])("does not persist stale-evidence writes for a %s denial", async denial => {
    mockReconcileInventoryClass3.mockResolvedValue(cleanInventoryValuation("sha256:changed"))
    if (denial === "setup") mockDb.organizationAccountingSettings.findUnique.mockResolvedValue({ accountingEnabled: false, setupStatus: "READY" })
    await expect(exportClosePack("org-1", { closeRunId: "close-run-1", mode: "CERTIFIED" }, {
      actorId: denial === "maker-checker" ? "runner-1" : "certifier-1",
      actorPermissions: denial === "permission" ? [] : ["accounting.close.certify"],
      lastAuthAt: denial === "fresh-auth" ? undefined : "2026-06-15T13:00:00Z", now: "2026-06-15T13:01:00Z",
    })).rejects.toThrow()
    expect(mockReconcileInventoryClass3).not.toHaveBeenCalled()
    expect(mockDb.closePackExport.create).not.toHaveBeenCalled()
    expect(mockDb.businessEvent.create).not.toHaveBeenCalled()
    expect(mockDb.ledgerAuditEvent.create).not.toHaveBeenCalled()
    expect(mockDb.closeRun.update).not.toHaveBeenCalled()
  })

  it("records stale evidence against an already certified run and export", async () => {
    mockDb.closeRun.findFirst.mockResolvedValue(
      closeRun({ status: "CERTIFIED" }),
    )

    const result = await recordCloseCertificationInvalidation(
      "org-1",
      {
        closeRunId: "close-run-1",
        closePackExportId: "close-pack-export-1",
        sourceModel: "InventoryValuationAnnex",
        sourceId: "period-1",
        sourceEventName: "inventory.valuation.annex.checked",
        staleReason:
          "Inventory valuation annex hash changed after certification.",
        previousEvidenceHash: "sha256:inventory-valuation",
        newEvidenceHash: "sha256:inventory-valuation-new",
        correlationId: "stale-run-corr-1",
      },
      {
        actorId: "controller-1",
        now: "2026-06-15T14:00:00.000Z",
      },
    )

    expect(result).toMatchObject({
      closeRunId: "close-run-1",
      closePackExportId: "close-pack-export-1",
      businessEventId: "business-event-1",
    })
    expect(mockDb.closePackExport.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          metadata: expect.objectContaining({
            staleState: expect.objectContaining({ status: "EVIDENCE_STALE" }),
          }),
        }),
      }),
    )
    expect(mockDb.closeRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "BLOCKED",
          metadata: expect.objectContaining({
            staleState: expect.objectContaining({
              sourceModel: "InventoryValuationAnnex",
              businessEventId: "business-event-1",
            }),
          }),
        }),
      }),
    )
  })

  it("produces deterministic hashes for the same canonical close snapshot", async () => {
    const first = await exportClosePack(
      "org-1",
      {
        closeRunId: "close-run-1",
        mode: "DRAFT_NOT_CERTIFIED",
        correlationId: "same-corr",
      },
      {
        actorId: "operator-1",
        actorPermissions: ["accounting.close.export"],
        now: "2026-06-15T13:00:00.000Z",
      },
    )
    const second = await exportClosePack(
      "org-1",
      {
        closeRunId: "close-run-1",
        mode: "DRAFT_NOT_CERTIFIED",
        correlationId: "same-corr",
      },
      {
        actorId: "operator-1",
        actorPermissions: ["accounting.close.export"],
        now: "2026-06-15T13:00:00.000Z",
      },
    )

    expect(second.contentHash).toBe(first.contentHash)
    expect(second.content).toBe(first.content)
  })
})

it("labels no-journal supplier credit reversals with their real source model and event", () => {
  expect(CLOSE_CERTIFICATION_INVALIDATION_SOURCES.SUPPLIER_CREDIT_NOTE_REVERSED).toMatchObject({
    sourceCode: "SUPPLIER_CREDIT_NOTE_REVERSED", sourceModel: "SupplierCreditNote", sourceTable: "supplier_credit_notes", sourceEventName: "purchase.supplier_credit.reversed", domain: "ledger",
  })
})
