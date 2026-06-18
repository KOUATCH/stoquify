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
    closeRun: {
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
    },
    businessEvent: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    auditLog: {
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
} from "../close-assurance-pack.service"

const mockDb = db as unknown as {
  $transaction: jest.Mock
  closeRun: {
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
  }
  businessEvent: {
    findUnique: jest.Mock
    create: jest.Mock
    update: jest.Mock
  }
  auditLog: {
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
    blockerStatus: "PASSED",
    failures: [],
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
    reportHash: sourceHash,
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
        sourceService: "services/reconciliation/payment-reconciliation-dashboard.service.ts",
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

describe("close assurance pack service", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockDb.$transaction.mockImplementation((callback) => callback(mockDb))
    mockDb.closeRun.findFirst.mockResolvedValue(closeRun())
    mockDb.closePackExport.create.mockImplementation(({ data }) =>
      Promise.resolve({
        id: "close-pack-export-1",
        ...data,
      }),
    )
    mockDb.closeRun.update.mockResolvedValue({ id: "close-run-1" })
    mockDb.closePackExport.findFirst.mockResolvedValue({
      id: "close-pack-export-1",
      metadata: { mode: "CERTIFIED" },
    })
    mockDb.closePackExport.update.mockResolvedValue({ id: "close-pack-export-1" })
    mockDb.ledgerAuditEvent.create.mockResolvedValue({ id: "audit-1" })
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
      { closeRunId: "close-run-1", mode: "DRAFT_NOT_CERTIFIED", correlationId: "export-corr-1" },
      {
        actorId: "operator-1",
        actorPermissions: ["accounting.close.export"],
        now: "2026-06-15T13:00:00.000Z",
      },
    )

    expect(result.mode).toBe("DRAFT_NOT_CERTIFIED")
    expect(result.contentHash).toMatch(/^sha256:/)
    expect(result.watermarkId).toContain("draft-not-certified")
    expect(result.content).toContain("Draft close pack is not certified")
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
      { closeRunId: "close-run-1", mode: "CERTIFIED", correlationId: "cert-corr-1" },
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
            inventoryAnnexFreshness: expect.objectContaining({ status: "FRESH" }),
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

  it("blocks certified exports and records invalidation when inventory annex evidence is stale", async () => {
    mockReconcileInventoryClass3.mockResolvedValue(cleanInventoryValuation("sha256:inventory-valuation-new"))

    await expect(
      exportClosePack(
        "org-1",
        { closeRunId: "close-run-1", mode: "CERTIFIED", correlationId: "stale-corr-1" },
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

  it("records stale evidence against an already certified run and export", async () => {
    mockDb.closeRun.findFirst.mockResolvedValue(closeRun({ status: "CERTIFIED" }))

    const result = await recordCloseCertificationInvalidation(
      "org-1",
      {
        closeRunId: "close-run-1",
        closePackExportId: "close-pack-export-1",
        sourceModel: "InventoryValuationAnnex",
        sourceId: "period-1",
        sourceEventName: "inventory.valuation.annex.checked",
        staleReason: "Inventory valuation annex hash changed after certification.",
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
      { closeRunId: "close-run-1", mode: "DRAFT_NOT_CERTIFIED", correlationId: "same-corr" },
      {
        actorId: "operator-1",
        actorPermissions: ["accounting.close.export"],
        now: "2026-06-15T13:00:00.000Z",
      },
    )
    const second = await exportClosePack(
      "org-1",
      { closeRunId: "close-run-1", mode: "DRAFT_NOT_CERTIFIED", correlationId: "same-corr" },
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
