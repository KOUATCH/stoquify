jest.mock("server-only", () => ({}))

jest.mock("@/prisma/db", () => ({
  db: {
    workflowAssuranceCheckDefinition: {
      upsert: jest.fn(),
      findMany: jest.fn(),
    },
    workflowAssuranceCheckRun: {
      create: jest.fn(),
    },
    salesOrder: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    pOSOfflineEvent: {
      count: jest.fn(),
    },
    pOSOfflineSyncConflict: {
      count: jest.fn(),
    },
    paymentException: {
      count: jest.fn(),
    },
    payment: {
      count: jest.fn(),
    },
    suspenseItem: {
      count: jest.fn(),
    },
    providerEvent: {
      count: jest.fn(),
    },
    reconciliationRun: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    purchaseOrder: {
      count: jest.fn(),
    },
    goodsReceipt: {
      findMany: jest.fn(),
    },
    supplierInvoice: {
      count: jest.fn(),
    },
    supplierPayment: {
      count: jest.fn(),
    },
    stockAdjustment: {
      findMany: jest.fn(),
    },
    inventoryTransaction: {
      count: jest.fn(),
    },
    payrollPaymentBatch: {
      count: jest.fn(),
    },
    payrollDeclaration: {
      count: jest.fn(),
    },
    complianceSubmission: {
      count: jest.fn(),
    },
    closePackExport: {
      count: jest.fn(),
    },
    journalEntry: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    ledgerPostingBatch: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    fiscalDocument: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    accountingPeriod: {
      findMany: jest.fn(),
    },
    businessEvent: {
      count: jest.fn(),
    },
    businessEventOutbox: {
      count: jest.fn(),
    },
    workflowAssuranceIncident: {
      findFirst: jest.fn(),
    },
  },
}))

jest.mock("../assurance-incident.service", () => ({
  upsertWorkflowAssuranceIncidentFromResult: jest.fn(async ({ result }) =>
    result.status === "passed" || result.status === "skipped" ? null : { id: `incident-${result.checkKey}` },
  ),
}))

import { createHash } from "node:crypto"

import { db } from "@/prisma/db"

import { INITIAL_WORKFLOW_ASSURANCE_CHECK_DEFINITIONS } from "../assurance-registry-contracts"
import { upsertWorkflowAssuranceIncidentFromResult } from "../assurance-incident.service"
import {
  ensureWorkflowAssuranceCheckDefinitions,
  runWorkflowAssuranceRegistry,
} from "../assurance-registry.service"

const mockUpsertIncident = upsertWorkflowAssuranceIncidentFromResult as jest.Mock
const mockDb = db as unknown as {
  workflowAssuranceCheckDefinition: {
    upsert: jest.Mock
    findMany: jest.Mock
  }
  workflowAssuranceCheckRun: {
    create: jest.Mock
  }
  salesOrder: {
    count: jest.Mock
    findMany: jest.Mock
  }
  pOSOfflineEvent: {
    count: jest.Mock
  }
  pOSOfflineSyncConflict: {
    count: jest.Mock
  }
  paymentException: {
    count: jest.Mock
  }
  payment: {
    count: jest.Mock
  }
  suspenseItem: {
    count: jest.Mock
  }
  providerEvent: {
    count: jest.Mock
  }
  reconciliationRun: {
    count: jest.Mock
    findMany: jest.Mock
  }
  purchaseOrder: {
    count: jest.Mock
  }
  goodsReceipt: {
    findMany: jest.Mock
  }
  supplierInvoice: {
    count: jest.Mock
  }
  supplierPayment: {
    count: jest.Mock
  }
  stockAdjustment: {
    findMany: jest.Mock
  }
  inventoryTransaction: {
    count: jest.Mock
  }
  payrollPaymentBatch: {
    count: jest.Mock
  }
  payrollDeclaration: {
    count: jest.Mock
  }
  complianceSubmission: {
    count: jest.Mock
  }
  closePackExport: {
    count: jest.Mock
  }
  journalEntry: {
    count: jest.Mock
    findMany: jest.Mock
  }
  ledgerPostingBatch: {
    count: jest.Mock
    findMany: jest.Mock
  }
  fiscalDocument: {
    count: jest.Mock
    findMany: jest.Mock
  }
  accountingPeriod: {
    findMany: jest.Mock
  }
  businessEvent: {
    count: jest.Mock
  }
  businessEventOutbox: {
    count: jest.Mock
  }
  workflowAssuranceIncident: {
    findFirst: jest.Mock
  }
}

describe("workflow assurance registry service", () => {
  beforeEach(() => {
    jest.resetAllMocks()
    mockUpsertIncident.mockImplementation(async ({ result }) =>
      result.status === "passed" || result.status === "skipped" ? null : { id: `incident-${result.checkKey}` },
    )
  })

  it("upserts code-owned check definitions with complete registry metadata", async () => {
    mockDb.workflowAssuranceCheckDefinition.upsert.mockImplementation(async ({ create }) => ({
      id: `definition-${create.checkKey}`,
      ...create,
      createdAt: new Date("2026-06-21T08:00:00.000Z"),
      updatedAt: new Date("2026-06-21T08:00:00.000Z"),
    }))

    const definitions = await ensureWorkflowAssuranceCheckDefinitions()

    expect(definitions).toHaveLength(INITIAL_WORKFLOW_ASSURANCE_CHECK_DEFINITIONS.length)
    expect(mockDb.workflowAssuranceCheckDefinition.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          checkKey_version: {
            checkKey: "ledger.posted_source_link.required",
            version: 1,
          },
        },
        create: expect.objectContaining({
          workflow: "LEDGER",
          executionMode: "SCHEDULED_SCAN",
          defaultSeverity: "BLOCKING",
          enforceMode: false,
          requiredPermission: "accounting.audit.read",
        }),
        update: expect.objectContaining({
          sourceTables: expect.arrayContaining(["journal_entries", "accounting_source_links"]),
        }),
      }),
    )
  })

  it("persists one check run per enabled definition with normalized outcomes", async () => {
    mockDefinitions()
    mockDb.workflowAssuranceCheckDefinition.findMany.mockResolvedValue([
      definitionRecord("ledger.posted_source_link.required", {
        workflow: "LEDGER",
        moduleSlug: "accounting",
        defaultSeverity: "BLOCKING",
        requiredPermission: "accounting.audit.read",
        sourceTables: ["journal_entries", "accounting_source_links", "ledger_posting_batches"],
      }),
      definitionRecord("business_event.applied_or_visible", {
        workflow: "BUSINESS_EVENT",
        moduleSlug: "business-events",
        defaultSeverity: "HIGH",
        requiredPermission: "controls.audit.read",
        sourceTables: ["business_events"],
        metadata: { staleAfterMinutes: 15 },
      }),
      definitionRecord("business_event.outbox.stuck_sla", {
        workflow: "BUSINESS_EVENT",
        moduleSlug: "business-events",
        defaultSeverity: "HIGH",
        requiredPermission: "controls.audit.read",
        sourceTables: ["business_event_outbox"],
        metadata: { staleAfterMinutes: 15 },
      }),
    ])
    mockDb.journalEntry.count.mockResolvedValueOnce(4).mockResolvedValueOnce(1)
    mockDb.businessEvent.count.mockResolvedValueOnce(10).mockResolvedValueOnce(0).mockResolvedValueOnce(1)
    mockDb.businessEventOutbox.count.mockResolvedValueOnce(5).mockResolvedValueOnce(2).mockResolvedValueOnce(0)
    let runIndex = 0
    mockDb.workflowAssuranceCheckRun.create.mockImplementation(async ({ data }) => ({
      id: `run-${++runIndex}`,
      ...data,
    }))

    const result = await runWorkflowAssuranceRegistry({
      organizationId: "org-1",
      actorId: "user-1",
      actorPermissions: [
        "accounting.audit.read",
        "accounting.close.read",
        "controls.audit.read",
        "compliance.documents.read",
        "inventory.adjust.approve",
        "payments.reconciliation.read",
        "payroll.payments.release",
        "pos.transactions.read",
        "purchases.orders.read",
        "purchasing.ap.invoice.view",
        "purchasing.ap.match.review",
        "purchasing.ap.payment.release",
        "purchasing.supplier.bank.approve",
      ],
      runType: "manual",
    })

    expect(result.summary).toEqual({
      total: 3,
      passed: 1,
      warning: 1,
      failed: 1,
      blocked: 0,
      skipped: 0,
      error: 0,
      observeMode: true,
    })
    expect(mockUpsertIncident).toHaveBeenCalledTimes(3)
    expect(result.runs.map((run) => run.incidentId).filter(Boolean)).toEqual([
      "incident-ledger.posted_source_link.required",
      "incident-business_event.outbox.stuck_sla",
    ])
    expect(mockDb.workflowAssuranceCheckRun.create).toHaveBeenCalledTimes(3)
    expect(mockDb.workflowAssuranceCheckRun.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org-1",
          checkKey: "ledger.posted_source_link.required",
          runType: "MANUAL",
          runStatus: "COMPLETED_WITH_WARNINGS",
          resultStatus: "FAILED",
          severity: "BLOCKING",
          scannedCount: 4,
          failedCount: 1,
          sourceHash: expect.stringMatching(/^[a-f0-9]{64}$/),
          fingerprint: expect.stringMatching(/^[a-f0-9]{64}$/),
        }),
      }),
    )
  })

  it("skips evidence-bearing checks when the actor lacks the check-specific permission", async () => {
    mockDefinitions()
    mockDb.workflowAssuranceCheckDefinition.findMany.mockResolvedValue([
      definitionRecord("ledger.posted_source_link.required", {
        workflow: "LEDGER",
        defaultSeverity: "BLOCKING",
        requiredPermission: "accounting.audit.read",
        sourceTables: ["journal_entries", "accounting_source_links"],
      }),
    ])
    mockDb.workflowAssuranceCheckRun.create.mockImplementation(async ({ data }) => ({
      id: "run-skipped",
      ...data,
    }))

    const result = await runWorkflowAssuranceRegistry({
      organizationId: "org-1",
      actorId: "user-1",
      actorPermissions: ["dashboard.read"],
      runType: "manual",
    })

    expect(mockDb.journalEntry.count).not.toHaveBeenCalled()
    expect(result.summary.skipped).toBe(1)
    expect(mockDb.workflowAssuranceCheckRun.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          resultStatus: "SKIPPED",
          sourceType: "permission",
          sourceId: "accounting.audit.read",
          skippedCount: 1,
        }),
      }),
    )
  })

  it("flags posted ledger batches that do not have posted journal entries", async () => {
    mockSingleDefinition("ledger.posted_batch_journal.required")
    mockDb.ledgerPostingBatch.count.mockResolvedValueOnce(5).mockResolvedValueOnce(2)

    const result = await runRegistryForCheck()

    expect(result.runs[0]).toMatchObject({
      checkKey: "ledger.posted_batch_journal.required",
      resultStatus: "failed",
      severity: "blocking",
      sourceHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      counts: expect.objectContaining({
        scanned: 5,
        passed: 3,
        failed: 2,
      }),
    })
    expect(mockDb.workflowAssuranceCheckRun.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sourceType: "ledger_posting_batches",
          sourceId: "posted_batches_missing_journal",
          resultStatus: "FAILED",
        }),
      }),
    )
  })

  it("flags unbalanced posted or reversed journal entries", async () => {
    mockSingleDefinition("ledger.journal_entry.balanced")
    mockDb.journalEntry.findMany.mockResolvedValue([
      {
        id: "journal-balanced",
        entryNumber: "JE-001",
        currency: "XAF",
        lines: [
          { debit: 100, credit: 0 },
          { debit: 0, credit: 100 },
        ],
      },
      {
        id: "journal-unbalanced",
        entryNumber: "JE-002",
        currency: "XAF",
        lines: [
          { debit: 120, credit: 0 },
          { debit: 0, credit: 100 },
        ],
      },
    ])

    const result = await runRegistryForCheck()

    expect(result.runs[0]).toMatchObject({
      checkKey: "ledger.journal_entry.balanced",
      resultStatus: "failed",
      counts: expect.objectContaining({
        scanned: 2,
        passed: 1,
        failed: 1,
      }),
    })
    expect(mockDb.workflowAssuranceCheckRun.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sourceType: "journal_entries",
          sourceId: "unbalanced_posted_entries",
          resultSummary: expect.objectContaining({
            metadata: expect.objectContaining({
              unbalancedEntryCount: 1,
            }),
          }),
        }),
      }),
    )
  })

  it("flags final fiscal documents that are missing hash evidence", async () => {
    mockSingleDefinition("compliance.final_document_hash.required")
    mockDb.fiscalDocument.count.mockResolvedValueOnce(4).mockResolvedValueOnce(2)
    mockDb.fiscalDocument.findMany.mockResolvedValue([
      {
        id: "fiscal-doc-1",
        status: "CERTIFIED",
        sourceType: "SALES_INVOICE",
        sourceId: "invoice-1",
      },
    ])

    const result = await runRegistryForCheck()

    expect(result.runs[0]).toMatchObject({
      checkKey: "compliance.final_document_hash.required",
      resultStatus: "failed",
      severity: "compliance_critical",
      counts: expect.objectContaining({
        scanned: 4,
        passed: 3,
        failed: 1,
      }),
    })
    expect(mockDb.workflowAssuranceCheckRun.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          severity: "COMPLIANCE_CRITICAL",
          sourceType: "fiscal_documents",
          sourceId: "final_documents_missing_hash",
        }),
      }),
    )
  })

  it("flags posted activity added after an accounting period was locked or closed", async () => {
    mockSingleDefinition("ledger.closed_period.posting_blocked")
    mockDb.accountingPeriod.findMany.mockResolvedValue([
      {
        id: "period-closed",
        name: "June 2026",
        status: "CLOSED",
        lockedAt: new Date("2026-06-20T10:00:00.000Z"),
        closedAt: new Date("2026-06-20T12:00:00.000Z"),
      },
    ])
    mockDb.journalEntry.count.mockResolvedValueOnce(1)
    mockDb.ledgerPostingBatch.count.mockResolvedValueOnce(1)

    const result = await runRegistryForCheck()

    expect(result.runs[0]).toMatchObject({
      checkKey: "ledger.closed_period.posting_blocked",
      resultStatus: "failed",
      counts: expect.objectContaining({
        scanned: 1,
        failed: 1,
        blocked: 2,
      }),
    })
    expect(mockDb.workflowAssuranceCheckRun.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sourceType: "accounting_periods",
          sourceId: "closed_period_late_postings",
        }),
      }),
    )
  })

  it("creates visibility for failed posting batches when no active incident exists", async () => {
    mockSingleDefinition("ledger.failed_posting_batch.visible")
    mockDb.ledgerPostingBatch.count.mockResolvedValueOnce(2)
    mockDb.ledgerPostingBatch.findMany.mockResolvedValue([
      {
        id: "batch-1",
        sourceType: "SALES_INVOICE",
        sourceId: "invoice-1",
        errorMessage: "Missing posting rule",
        updatedAt: new Date("2026-06-21T09:00:00.000Z"),
      },
      {
        id: "batch-2",
        sourceType: "PAYMENT_RECEIPT",
        sourceId: "payment-1",
        errorMessage: "Account inactive",
        updatedAt: new Date("2026-06-21T09:05:00.000Z"),
      },
    ])
    mockDb.workflowAssuranceIncident.findFirst.mockResolvedValue(null)

    const result = await runRegistryForCheck()

    expect(result.runs[0]).toMatchObject({
      checkKey: "ledger.failed_posting_batch.visible",
      resultStatus: "failed",
      severity: "high",
      counts: expect.objectContaining({
        scanned: 2,
        failed: 2,
      }),
      incidentId: "incident-ledger.failed_posting_batch.visible",
    })
    expect(mockDb.workflowAssuranceIncident.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          sourceType: "ledger_posting_batches",
          sourceId: "failed_posting_batches",
          status: { in: ["OPEN", "ACKNOWLEDGED", "ASSIGNED", "IN_PROGRESS", "REOPENED"] },
        }),
      }),
    )
  })

  it("passes failed posting batch visibility once an active incident exists", async () => {
    mockSingleDefinition("ledger.failed_posting_batch.visible")
    mockDb.ledgerPostingBatch.count.mockResolvedValueOnce(1)
    mockDb.ledgerPostingBatch.findMany.mockResolvedValue([
      {
        id: "batch-visible",
        sourceType: "SALES_INVOICE",
        sourceId: "invoice-2",
        errorMessage: "Posting failed",
        updatedAt: new Date("2026-06-21T09:00:00.000Z"),
      },
    ])
    mockDb.workflowAssuranceIncident.findFirst.mockResolvedValue({
      id: "incident-visible",
      status: "OPEN",
      lastDetectedAt: new Date("2026-06-21T09:05:00.000Z"),
    })

    const result = await runRegistryForCheck()

    expect(result.runs[0]).toMatchObject({
      checkKey: "ledger.failed_posting_batch.visible",
      resultStatus: "passed",
      severity: "info",
      incidentId: undefined,
      counts: expect.objectContaining({
        scanned: 1,
        passed: 1,
        failed: 0,
      }),
    })
  })

  it("flags completed POS sales that are missing payment evidence", async () => {
    mockSingleDefinition("pos.completed_sale_payment.required")
    mockDb.salesOrder.count.mockResolvedValueOnce(3).mockResolvedValueOnce(1)

    const result = await runRegistryForCheck()

    expect(result.runs[0]).toMatchObject({
      checkKey: "pos.completed_sale_payment.required",
      resultStatus: "failed",
      severity: "high",
      counts: expect.objectContaining({
        scanned: 3,
        passed: 2,
        failed: 1,
      }),
      incidentId: "incident-pos.completed_sale_payment.required",
    })
  })

  it("flags completed POS sales that are missing visible receipt proof", async () => {
    mockSingleDefinition("pos.completed_sale_receipt.required")
    mockDb.salesOrder.findMany.mockResolvedValue([
      finalPosSaleFixture("sale-with-receipt", "POS-001"),
      finalPosSaleFixture("sale-missing-receipt", "POS-002"),
    ])
    mockDb.fiscalDocument.findMany.mockResolvedValue([
      {
        id: "receipt-1",
        sourceId: "sale-with-receipt",
        status: "CERTIFIED",
        canonicalPayloadHash: "sha256:receipt",
        legalNumber: "R-001",
        certifiedAt: new Date("2026-06-21T09:00:00.000Z"),
      },
    ])

    const result = await runRegistryForCheck()

    expect(result.runs[0]).toMatchObject({
      checkKey: "pos.completed_sale_receipt.required",
      resultStatus: "failed",
      severity: "high",
      counts: expect.objectContaining({
        scanned: 2,
        passed: 1,
        failed: 1,
      }),
      incidentId: "incident-pos.completed_sale_receipt.required",
    })
    expect(mockDb.workflowAssuranceCheckRun.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sourceType: "sales_orders",
          sourceId: "completed_pos_sales_missing_receipt",
        }),
      }),
    )
  })

  it("flags completed POS sales with tracked items that are missing stock movement proof", async () => {
    mockSingleDefinition("pos.completed_sale_stock_movement.required")
    mockDb.salesOrder.findMany.mockResolvedValue([
      finalPosSaleFixture("sale-with-stock", "POS-003"),
      finalPosSaleFixture("sale-missing-stock", "POS-004"),
      finalPosSaleFixture("sale-service-only", "POS-005", false),
    ])
    mockDb.inventoryTransaction.count.mockImplementation(async ({ where }) =>
      where.referenceId === "sale-with-stock" ? 1 : 0,
    )

    const result = await runRegistryForCheck()

    expect(result.runs[0]).toMatchObject({
      checkKey: "pos.completed_sale_stock_movement.required",
      resultStatus: "failed",
      severity: "high",
      counts: expect.objectContaining({
        scanned: 2,
        passed: 1,
        failed: 1,
      }),
      incidentId: "incident-pos.completed_sale_stock_movement.required",
    })
  })

  it("flags completed POS sales that are missing ledger source-link proof", async () => {
    mockSingleDefinition("pos.completed_sale_ledger_source_link.required")
    mockDb.salesOrder.findMany.mockResolvedValue([
      finalPosSaleFixture("sale-with-ledger", "POS-006"),
      finalPosSaleFixture("sale-missing-ledger", "POS-007"),
    ])
    mockDb.ledgerPostingBatch.count.mockImplementation(async ({ where }) =>
      where.sourceId === "sale-with-ledger" ? 1 : 0,
    )

    const result = await runRegistryForCheck()

    expect(result.runs[0]).toMatchObject({
      checkKey: "pos.completed_sale_ledger_source_link.required",
      resultStatus: "failed",
      severity: "blocking",
      counts: expect.objectContaining({
        scanned: 2,
        passed: 1,
        failed: 1,
      }),
      incidentId: "incident-pos.completed_sale_ledger_source_link.required",
    })
  })

  it("flags network POS tenders that are missing idempotency or payload hash evidence", async () => {
    mockSingleDefinition("pos.network_tender_idempotency_hash.required")
    mockDb.payment.count.mockResolvedValueOnce(4).mockResolvedValueOnce(2)

    const result = await runRegistryForCheck()

    expect(result.runs[0]).toMatchObject({
      checkKey: "pos.network_tender_idempotency_hash.required",
      resultStatus: "warning",
      severity: "high",
      counts: expect.objectContaining({
        scanned: 4,
        passed: 2,
        warning: 2,
      }),
      incidentId: "incident-pos.network_tender_idempotency_hash.required",
    })
  })

  it("does not flag offline POS replay while events remain inside SLA", async () => {
    mockSingleDefinition("offline_pos.replay_sla.visible")
    mockDb.pOSOfflineEvent.count.mockResolvedValueOnce(4).mockResolvedValueOnce(0)
    mockDb.pOSOfflineSyncConflict.count.mockResolvedValueOnce(0)

    const result = await runRegistryForCheck()

    expect(result.runs[0]).toMatchObject({
      checkKey: "offline_pos.replay_sla.visible",
      resultStatus: "passed",
      severity: "info",
      incidentId: undefined,
      counts: expect.objectContaining({
        scanned: 4,
        passed: 4,
        warning: 0,
      }),
    })
  })

  it("flags stale offline POS replay and serious open conflicts", async () => {
    mockSingleDefinition("offline_pos.replay_sla.visible")
    mockDb.pOSOfflineEvent.count.mockResolvedValueOnce(6).mockResolvedValueOnce(2)
    mockDb.pOSOfflineSyncConflict.count.mockResolvedValueOnce(1)

    const result = await runRegistryForCheck()

    expect(result.runs[0]).toMatchObject({
      checkKey: "offline_pos.replay_sla.visible",
      resultStatus: "warning",
      severity: "high",
      counts: expect.objectContaining({
        scanned: 6,
        warning: 3,
      }),
    })
  })

  it("flags accepted offline POS events that are missing business-event proof", async () => {
    mockSingleDefinition("offline_pos.accepted_event_business_event.required")
    mockDb.pOSOfflineEvent.count.mockResolvedValueOnce(5).mockResolvedValueOnce(1)

    const result = await runRegistryForCheck()

    expect(result.runs[0]).toMatchObject({
      checkKey: "offline_pos.accepted_event_business_event.required",
      resultStatus: "failed",
      severity: "high",
      counts: expect.objectContaining({
        scanned: 5,
        passed: 4,
        failed: 1,
      }),
      incidentId: "incident-offline_pos.accepted_event_business_event.required",
    })
    expect(mockDb.workflowAssuranceCheckRun.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sourceType: "pos_offline_events",
          sourceId: "accepted_events_missing_business_event",
        }),
      }),
    )
  })

  it("warns when sequence, hash-chain, signature, or idempotency conflicts need review", async () => {
    mockSingleDefinition("offline_pos.sequence_hash_conflict.visible")
    mockDb.pOSOfflineSyncConflict.count.mockResolvedValueOnce(4).mockResolvedValueOnce(2)

    const result = await runRegistryForCheck()

    expect(result.runs[0]).toMatchObject({
      checkKey: "offline_pos.sequence_hash_conflict.visible",
      resultStatus: "warning",
      severity: "high",
      counts: expect.objectContaining({
        scanned: 4,
        passed: 2,
        warning: 2,
      }),
      incidentId: "incident-offline_pos.sequence_hash_conflict.visible",
    })
  })

  it("flags blocked or quarantined offline events missing blocker or conflict evidence", async () => {
    mockSingleDefinition("offline_pos.quarantined_event_conflict.required")
    mockDb.pOSOfflineEvent.count.mockResolvedValueOnce(3).mockResolvedValueOnce(1)

    const result = await runRegistryForCheck()

    expect(result.runs[0]).toMatchObject({
      checkKey: "offline_pos.quarantined_event_conflict.required",
      resultStatus: "failed",
      severity: "blocking",
      counts: expect.objectContaining({
        scanned: 3,
        passed: 2,
        failed: 1,
      }),
      incidentId: "incident-offline_pos.quarantined_event_conflict.required",
    })
  })

  it("flags replayed offline events missing sale posting or document-hash proof", async () => {
    mockSingleDefinition("offline_pos.replayed_event_proof.required")
    mockDb.pOSOfflineEvent.count.mockResolvedValueOnce(4).mockResolvedValueOnce(1)

    const result = await runRegistryForCheck()

    expect(result.runs[0]).toMatchObject({
      checkKey: "offline_pos.replayed_event_proof.required",
      resultStatus: "failed",
      severity: "blocking",
      counts: expect.objectContaining({
        scanned: 4,
        passed: 3,
        failed: 1,
      }),
      incidentId: "incident-offline_pos.replayed_event_proof.required",
    })
  })

  it("flags overdue high and critical payment reconciliation exceptions", async () => {
    mockSingleDefinition("payment_reconciliation.exception_sla.visible")
    mockDb.paymentException.count.mockResolvedValueOnce(5).mockResolvedValueOnce(2)

    const result = await runRegistryForCheck()

    expect(result.runs[0]).toMatchObject({
      checkKey: "payment_reconciliation.exception_sla.visible",
      resultStatus: "warning",
      severity: "high",
      counts: expect.objectContaining({
        scanned: 5,
        passed: 3,
        warning: 2,
      }),
    })
  })

  it("flags aged suspense items that do not have an owner", async () => {
    mockSingleDefinition("payment_reconciliation.suspense_owner.required")
    mockDb.suspenseItem.count.mockResolvedValueOnce(4).mockResolvedValueOnce(1)

    const result = await runRegistryForCheck()

    expect(result.runs[0]).toMatchObject({
      checkKey: "payment_reconciliation.suspense_owner.required",
      resultStatus: "warning",
      severity: "high",
      counts: expect.objectContaining({
        scanned: 4,
        passed: 3,
        warning: 1,
      }),
    })
  })

  it("flags stale provider events that are neither matched nor excepted", async () => {
    mockSingleDefinition("payment_reconciliation.unmatched_provider_event.visible")
    mockDb.providerEvent.count.mockResolvedValueOnce(7).mockResolvedValueOnce(3)

    const result = await runRegistryForCheck()

    expect(result.runs[0]).toMatchObject({
      checkKey: "payment_reconciliation.unmatched_provider_event.visible",
      resultStatus: "warning",
      severity: "high",
      counts: expect.objectContaining({
        scanned: 7,
        passed: 4,
        warning: 3,
      }),
    })
    expect(mockDb.workflowAssuranceCheckRun.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sourceType: "provider_events",
          sourceId: "stale_unmatched_provider_events",
          sourceHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        }),
      }),
    )
  })

  it("flags ready reconciliation runs that age without signature proof", async () => {
    mockSingleDefinition("payment_reconciliation.unsigned_run_sla.visible")
    mockDb.reconciliationRun.count.mockResolvedValueOnce(3).mockResolvedValueOnce(1)

    const result = await runRegistryForCheck()

    expect(result.runs[0]).toMatchObject({
      checkKey: "payment_reconciliation.unsigned_run_sla.visible",
      resultStatus: "warning",
      severity: "high",
      counts: expect.objectContaining({
        scanned: 3,
        passed: 2,
        warning: 1,
      }),
    })
    expect(mockDb.workflowAssuranceCheckRun.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sourceType: "reconciliation_runs",
          sourceId: "unsigned_ready_runs",
        }),
      }),
    )
  })

  it("flags signed reconciliation certificates whose persisted payload hash is stale", async () => {
    mockSingleDefinition("payment_reconciliation.certificate_source_hash.current")
    const cleanPayload = { runId: "run-clean", signedAt: "2026-06-21T10:00:00.000Z" }
    mockDb.reconciliationRun.findMany.mockResolvedValue([
      {
        id: "run-clean",
        certificateHash: stableTestCertificateHash(cleanPayload),
        certificatePayload: cleanPayload,
      },
      {
        id: "run-drifted",
        certificateHash: "not-the-current-hash",
        certificatePayload: { runId: "run-drifted", signedAt: "2026-06-21T10:15:00.000Z" },
      },
      {
        id: "run-missing",
        certificateHash: null,
        certificatePayload: null,
      },
    ])

    const result = await runRegistryForCheck()

    expect(result.runs[0]).toMatchObject({
      checkKey: "payment_reconciliation.certificate_source_hash.current",
      resultStatus: "failed",
      severity: "high",
      counts: expect.objectContaining({
        scanned: 3,
        passed: 1,
        failed: 2,
      }),
    })
    expect(mockDb.workflowAssuranceCheckRun.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sourceType: "reconciliation_runs",
          sourceId: "signed_runs_stale_certificate_hash",
          resultStatus: "FAILED",
        }),
      }),
    )
  })

  it("flags controlled purchase orders missing approval or receipt trace evidence", async () => {
    mockSingleDefinition("purchasing_ap.po_approval_receipt_trace.required")
    mockDb.purchaseOrder.count
      .mockResolvedValueOnce(6)
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(2)

    const result = await runRegistryForCheck()

    expect(result.runs[0]).toMatchObject({
      checkKey: "purchasing_ap.po_approval_receipt_trace.required",
      resultStatus: "warning",
      severity: "high",
      counts: expect.objectContaining({
        scanned: 6,
        passed: 3,
        warning: 3,
      }),
      incidentId: "incident-purchasing_ap.po_approval_receipt_trace.required",
    })
  })

  it("flags received goods missing stock movement proof", async () => {
    mockSingleDefinition("purchasing_ap.goods_receipt_stock_movement.required")
    mockDb.goodsReceipt.findMany.mockResolvedValue([
      {
        id: "gr-clean",
        receiptNumber: "GR-001",
        status: "RECEIVED",
        purchaseOrderId: "po-1",
      },
      {
        id: "gr-missing-stock",
        receiptNumber: "GR-002",
        status: "COMPLETED",
        purchaseOrderId: "po-2",
      },
    ])
    mockDb.inventoryTransaction.count.mockImplementation(async ({ where }) =>
      where.referenceId === "gr-clean" ? 1 : 0,
    )

    const result = await runRegistryForCheck()

    expect(result.runs[0]).toMatchObject({
      checkKey: "purchasing_ap.goods_receipt_stock_movement.required",
      resultStatus: "failed",
      severity: "high",
      counts: expect.objectContaining({
        scanned: 2,
        passed: 1,
        failed: 1,
      }),
      incidentId: "incident-purchasing_ap.goods_receipt_stock_movement.required",
    })
  })

  it("flags supplier invoices tied to purchase orders missing accepted 3-way match evidence", async () => {
    mockSingleDefinition("purchasing_ap.supplier_invoice_three_way_match.required")
    mockDb.supplierInvoice.count.mockResolvedValueOnce(4).mockResolvedValueOnce(2)

    const result = await runRegistryForCheck()

    expect(result.runs[0]).toMatchObject({
      checkKey: "purchasing_ap.supplier_invoice_three_way_match.required",
      resultStatus: "warning",
      severity: "high",
      counts: expect.objectContaining({
        scanned: 4,
        passed: 2,
        warning: 2,
      }),
      incidentId: "incident-purchasing_ap.supplier_invoice_three_way_match.required",
    })
  })

  it("flags posted supplier invoices missing AP ledger proof", async () => {
    mockSingleDefinition("purchasing_ap.supplier_invoice_posting_proof.required")
    mockDb.supplierInvoice.count.mockResolvedValueOnce(3).mockResolvedValueOnce(1)

    const result = await runRegistryForCheck()

    expect(result.runs[0]).toMatchObject({
      checkKey: "purchasing_ap.supplier_invoice_posting_proof.required",
      resultStatus: "failed",
      severity: "blocking",
      counts: expect.objectContaining({
        scanned: 3,
        passed: 2,
        failed: 1,
      }),
      incidentId: "incident-purchasing_ap.supplier_invoice_posting_proof.required",
    })
  })

  it("flags released supplier payments missing AP release evidence", async () => {
    mockSingleDefinition("purchasing_ap.released_payment_evidence.required")
    mockDb.supplierPayment.count.mockResolvedValueOnce(3).mockResolvedValueOnce(1)

    const result = await runRegistryForCheck()

    expect(result.runs[0]).toMatchObject({
      checkKey: "purchasing_ap.released_payment_evidence.required",
      resultStatus: "failed",
      severity: "blocking",
      counts: expect.objectContaining({
        scanned: 3,
        passed: 2,
        failed: 1,
      }),
    })
  })

  it("flags supplier payment releases while bank changes are pending", async () => {
    mockSingleDefinition("purchasing_ap.supplier_bank_pending_release.blocked")
    mockDb.supplierPayment.count.mockResolvedValueOnce(2).mockResolvedValueOnce(1)

    const result = await runRegistryForCheck()

    expect(result.runs[0]).toMatchObject({
      checkKey: "purchasing_ap.supplier_bank_pending_release.blocked",
      resultStatus: "failed",
      severity: "blocking",
      counts: expect.objectContaining({
        scanned: 2,
        passed: 1,
        failed: 1,
      }),
    })
  })

  it("flags completed inventory adjustments missing approval, evidence, posting, or projection movement", async () => {
    mockSingleDefinition("inventory.completed_adjustment_evidence.required")
    mockDb.stockAdjustment.findMany.mockResolvedValue([
      {
        id: "adjustment-clean",
        adjustmentNumber: "ADJ-001",
        status: "COMPLETED",
        approvedAt: new Date("2026-06-21T08:00:00.000Z"),
        approvedById: "manager-1",
        evidenceHash: "sha256:evidence",
        documentHash: "sha256:document",
        postedBusinessEventId: "event-1",
        ledgerPostingBatchId: "batch-1",
      },
      {
        id: "adjustment-broken",
        adjustmentNumber: "ADJ-002",
        status: "COMPLETED",
        approvedAt: null,
        approvedById: null,
        evidenceHash: null,
        documentHash: null,
        postedBusinessEventId: null,
        ledgerPostingBatchId: null,
      },
    ])
    mockDb.inventoryTransaction.count.mockImplementation(async ({ where }) =>
      where.referenceId === "adjustment-clean" ? 1 : 0,
    )

    const result = await runRegistryForCheck()

    expect(result.runs[0]).toMatchObject({
      checkKey: "inventory.completed_adjustment_evidence.required",
      resultStatus: "warning",
      severity: "high",
      counts: expect.objectContaining({
        scanned: 2,
        passed: 1,
        warning: 1,
      }),
    })
  })

  it("flags released payroll payment batches missing release evidence", async () => {
    mockSingleDefinition("payroll.released_payment_evidence.required")
    mockDb.payrollPaymentBatch.count.mockResolvedValueOnce(2).mockResolvedValueOnce(1)

    const result = await runRegistryForCheck()

    expect(result.runs[0]).toMatchObject({
      checkKey: "payroll.released_payment_evidence.required",
      resultStatus: "failed",
      severity: "blocking",
      counts: expect.objectContaining({
        scanned: 2,
        passed: 1,
        failed: 1,
      }),
    })
  })

  it("flags payroll payment reconciliation exceptions for operations triage", async () => {
    mockSingleDefinition("payroll.payment_reconciliation_exception.visible")
    mockDb.payrollPaymentBatch.count.mockResolvedValueOnce(5).mockResolvedValueOnce(2)

    const result = await runRegistryForCheck()

    expect(result.runs[0]).toMatchObject({
      checkKey: "payroll.payment_reconciliation_exception.visible",
      resultStatus: "warning",
      severity: "high",
      actionRoute: "/dashboard/payroll",
      counts: expect.objectContaining({
        scanned: 5,
        passed: 3,
        warning: 2,
      }),
    })
    expect(mockUpsertIncident).toHaveBeenCalledWith(
      expect.objectContaining({
        result: expect.objectContaining({
          metadata: expect.objectContaining({ redactionPolicy: "kontava-payroll-person-redaction-policy" }),
        }),
      }),
    )
  })

  it("flags payroll declaration lifecycle exceptions without authority payload exposure", async () => {
    mockSingleDefinition("payroll.declaration_lifecycle_exception.visible")
    mockDb.payrollDeclaration.count.mockResolvedValueOnce(4).mockResolvedValueOnce(1)

    const result = await runRegistryForCheck()

    expect(result.runs[0]).toMatchObject({
      checkKey: "payroll.declaration_lifecycle_exception.visible",
      resultStatus: "warning",
      severity: "high",
      actionRoute: "/dashboard/payroll",
      counts: expect.objectContaining({
        scanned: 4,
        passed: 3,
        warning: 1,
      }),
    })
    expect(result.runs[0].evidenceLinks[0].metadata).toEqual(
      expect.objectContaining({
        monitoredDeclarationCount: 4,
        exceptionDeclarationCount: 1,
      }),
    )
    expect(JSON.stringify(result.runs[0].evidenceLinks[0].metadata).toLowerCase()).not.toMatch(/salary|bank|payload/)
  })

  it("flags certified close packs with unresolved payroll findings", async () => {
    mockSingleDefinition("payroll.close_evidence.stale.visible")
    mockDb.closePackExport.count.mockResolvedValueOnce(3).mockResolvedValueOnce(1)

    const result = await runRegistryForCheck()

    expect(result.runs[0]).toMatchObject({
      checkKey: "payroll.close_evidence.stale.visible",
      resultStatus: "failed",
      severity: "blocking",
      actionRoute: "/dashboard/accounting/close",
      counts: expect.objectContaining({
        scanned: 3,
        passed: 2,
        failed: 1,
      }),
    })
  })
  it("does not flag compliance submissions that are still inside SLA", async () => {
    mockSingleDefinition("compliance.submission_sla.visible")
    mockDb.complianceSubmission.count.mockResolvedValueOnce(3).mockResolvedValueOnce(0).mockResolvedValueOnce(0)

    const result = await runRegistryForCheck()

    expect(result.runs[0]).toMatchObject({
      checkKey: "compliance.submission_sla.visible",
      resultStatus: "passed",
      severity: "info",
      incidentId: undefined,
      counts: expect.objectContaining({
        scanned: 3,
        passed: 3,
        warning: 0,
      }),
    })
  })

  it("flags stale or failed compliance submissions", async () => {
    mockSingleDefinition("compliance.submission_sla.visible")
    mockDb.complianceSubmission.count.mockResolvedValueOnce(4).mockResolvedValueOnce(1).mockResolvedValueOnce(2)

    const result = await runRegistryForCheck()

    expect(result.runs[0]).toMatchObject({
      checkKey: "compliance.submission_sla.visible",
      resultStatus: "warning",
      severity: "high",
      counts: expect.objectContaining({
        scanned: 6,
        passed: 3,
        warning: 3,
      }),
    })
  })

  it("flags certified close packs with unresolved high or critical findings", async () => {
    mockSingleDefinition("close.certified_pack_evidence.current")
    mockDb.closePackExport.count.mockResolvedValueOnce(2).mockResolvedValueOnce(1)

    const result = await runRegistryForCheck()

    expect(result.runs[0]).toMatchObject({
      checkKey: "close.certified_pack_evidence.current",
      resultStatus: "failed",
      severity: "blocking",
      counts: expect.objectContaining({
        scanned: 2,
        passed: 1,
        failed: 1,
      }),
    })
  })
})

function mockDefinitions() {
  mockDb.workflowAssuranceCheckDefinition.upsert.mockImplementation(async ({ create }) => ({
    id: `definition-${create.checkKey}`,
    ...create,
    createdAt: new Date("2026-06-21T08:00:00.000Z"),
    updatedAt: new Date("2026-06-21T08:00:00.000Z"),
  }))
}

function mockSingleDefinition(checkKey: string, overrides: Record<string, unknown> = {}) {
  mockDefinitions()
  mockDb.workflowAssuranceCheckDefinition.findMany.mockResolvedValue([definitionRecord(checkKey, overrides)])
  mockDb.workflowAssuranceCheckRun.create.mockImplementation(async ({ data }) => ({
    id: `run-${data.checkKey}`,
    ...data,
  }))
}

function runRegistryForCheck() {
  return runWorkflowAssuranceRegistry({
    organizationId: "org-1",
    actorId: "user-1",
    actorPermissions: [
      "accounting.audit.read",
      "accounting.close.read",
      "controls.audit.read",
      "compliance.documents.read",
      "inventory.adjust.approve",
      "payments.reconciliation.read",
      "payroll.payments.release",
      "payroll.payments.reconcile",
      "payroll.declarations.manage",
      "pos.transactions.read",
      "purchases.orders.read",
      "purchasing.ap.invoice.view",
      "purchasing.ap.match.review",
      "purchasing.ap.payment.release",
      "purchasing.supplier.bank.approve",
    ],
    runType: "manual",
  })
}

function finalPosSaleFixture(id: string, orderNumber: string, trackInventory = true) {
  return {
    id,
    orderNumber,
    paymentStatus: "PAID",
    lines: [
      {
        id: `${id}-line-1`,
        itemId: `${id}-item-1`,
        item: {
          trackInventory,
        },
      },
    ],
  }
}

function stableTestCertificateHash(value: unknown) {
  return createHash("sha256").update(stableTestCertificateStringify(value)).digest("hex")
}

function stableTestCertificateStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stableTestCertificateStringify).join(",")}]`

  return `{${Object.keys(value as Record<string, unknown>)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableTestCertificateStringify((value as Record<string, unknown>)[key])}`)
    .join(",")}}`
}

function definitionRecord(checkKey: string, overrides: Record<string, unknown> = {}) {
  const base = INITIAL_WORKFLOW_ASSURANCE_CHECK_DEFINITIONS.find((definition) => definition.checkKey === checkKey)
  if (!base) throw new Error(`Unknown definition ${checkKey}`)

  return {
    id: `definition-${checkKey}`,
    checkKey,
    version: base.version,
    workflow: toPrismaEnum(base.workflow),
    moduleSlug: base.moduleSlug,
    invariantName: base.invariantName,
    executionMode: toPrismaEnum(base.executionMode),
    defaultSeverity: toPrismaEnum(base.defaultSeverity),
    requiredPermission: base.requiredPermission,
    ownerRole: base.ownerRole,
    enabled: true,
    enforceMode: false,
    sourceTables: base.sourceTables,
    actionRoute: base.actionRoute,
    metadata: base.metadata,
    createdAt: new Date("2026-06-21T08:00:00.000Z"),
    updatedAt: new Date("2026-06-21T08:00:00.000Z"),
    ...overrides,
  }
}

function toPrismaEnum(value: string) {
  return value.toUpperCase()
}
