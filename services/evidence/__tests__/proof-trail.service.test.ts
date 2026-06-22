import {
  BusinessEventStatus,
  CloseRunStatus,
  CloseChecklistStatus,
  CloseFindingStatus,
  JournalEntryStatus,
  LedgerPostingBatchStatus,
  PaymentExceptionStatus,
  ReconciliationRunStatus,
  SuspenseStatus,
  Prisma,
} from "@prisma/client"

jest.mock("@/prisma/db", () => ({
  db: {
    journalEntry: { findFirst: jest.fn() },
    businessEvent: { findMany: jest.fn() },
    reconciliationRun: { findFirst: jest.fn() },
    closeRun: { findFirst: jest.fn() },
    auditLog: { create: jest.fn() },
  },
}))

import { db } from "@/prisma/db"

import { getProofTrail } from "../proof-trail.service"

const mockDb = db as unknown as {
  journalEntry: { findFirst: jest.Mock }
  businessEvent: { findMany: jest.Mock }
  reconciliationRun: { findFirst: jest.Mock }
  closeRun: { findFirst: jest.Mock }
  auditLog: { create: jest.Mock }
}

function amount(value: number | string) {
  return new Prisma.Decimal(value)
}

function postedJournalEntry(overrides: Record<string, unknown> = {}) {
  return {
    id: "je-1",
    organizationId: "org-1",
    entryNumber: "JE-1",
    entryDate: new Date("2026-06-15T00:00:00.000Z"),
    status: JournalEntryStatus.POSTED,
    sourceType: "POS_SALE",
    sourceId: "sale-1",
    journal: { id: "journal-1", code: "SALES", nameEn: "Sales", nameFr: null },
    period: { id: "period-1", name: "June 2026", status: "OPEN" },
    postingBatch: {
      id: "batch-1",
      sourceType: "POS_SALE",
      sourceId: "sale-1",
      postingPurpose: "SALE_COMPLETION",
      status: LedgerPostingBatchStatus.POSTED,
      errorMessage: null,
      postedAt: new Date("2026-06-15T01:00:00.000Z"),
    },
    sourceLinks: [
      {
        id: "source-link-1",
        sourceType: "POS_SALE",
        sourceId: "sale-1",
        sourceNumber: "SALE-1",
        sourceDate: new Date("2026-06-15T00:00:00.000Z"),
        postingBatch: {
          id: "batch-1",
          status: LedgerPostingBatchStatus.POSTED,
          sourceType: "POS_SALE",
          sourceId: "sale-1",
          postingPurpose: "SALE_COMPLETION",
        },
      },
    ],
    auditEvents: [],
    ...overrides,
  }
}

function signedReconciliationRun(overrides: Record<string, unknown> = {}) {
  return {
    id: "recon-1",
    status: ReconciliationRunStatus.SIGNED,
    businessDate: new Date("2026-06-15T00:00:00.000Z"),
    matchCount: 2,
    exceptionCount: 0,
    suspenseAmount: amount(0),
    signedAt: new Date("2026-06-15T08:00:00.000Z"),
    certificateHash: "sha256:recon",
    providerAccount: {
      id: "provider-account-1",
      displayName: "Provider Main",
      providerCode: "MOMO",
      status: "ACTIVE",
    },
    paymentRail: { id: "rail-1", code: "MOMO", name: "Mobile Money" },
    matchRecords: [],
    suspenseItems: [],
    paymentExceptions: [],
    ...overrides,
  }
}

function certifiedCloseRun(overrides: Record<string, unknown> = {}) {
  return {
    id: "close-1",
    periodId: "period-1",
    status: CloseRunStatus.CERTIFIED,
    readinessScore: 98,
    criticalBlockerCount: 0,
    highBlockerCount: 0,
    period: {
      id: "period-1",
      name: "June 2026",
      status: "OPEN",
      startDate: new Date("2026-06-01T00:00:00.000Z"),
      endDate: new Date("2026-06-30T23:59:59.999Z"),
    },
    checklistItems: [
      {
        id: "check-1",
        key: "ledger-balanced",
        domain: "LEDGER",
        status: CloseChecklistStatus.PASSED,
        severity: "INFO",
        label: "Ledger balanced",
        evidenceCount: 1,
        blockerReason: null,
      },
    ],
    findings: [],
    evidenceItems: [
      {
        id: "evidence-1",
        evidenceType: "JOURNAL_ENTRY",
        sourceTable: "journal_entries",
        sourceType: "journal.entry",
        sourceId: "je-1",
        sourceLabel: "Journal JE-1",
        provenance: "POSTED",
        available: true,
        unavailableReason: null,
      },
    ],
    packExports: [
      {
        id: "pack-1",
        fileType: "json",
        watermarkId: "watermark-1",
        isCertified: true,
        exportedAt: new Date("2026-06-15T11:00:00.000Z"),
      },
    ],
    ...overrides,
  }
}

describe("proof trail service", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockDb.businessEvent.findMany.mockResolvedValue([])
    mockDb.auditLog.create.mockResolvedValue({ id: "audit-1" })
  })

  it("returns a posted journal proof trail using tenant-scoped source links", async () => {
    mockDb.journalEntry.findFirst.mockResolvedValue(postedJournalEntry())

    const result = await getProofTrail({
      organizationId: "org-1",
      subjectType: "journal.entry",
      subjectId: "je-1",
    })

    expect(mockDb.journalEntry.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "je-1", organizationId: "org-1" },
      }),
    )
    expect(result.evidenceGrade).toBe("posted")
    expect(result.nodes.some((entry) => entry.nodeType === "accounting.source_link")).toBe(true)
    expect(result.blockers).toHaveLength(0)
  })

  it("blocks posted journal proof when source-link evidence is missing", async () => {
    mockDb.journalEntry.findFirst.mockResolvedValue(
      postedJournalEntry({
        sourceLinks: [],
      }),
    )

    const result = await getProofTrail({
      organizationId: "org-1",
      subjectType: "journal.entry",
      subjectId: "je-1",
    })

    expect(result.evidenceGrade).toBe("blocked")
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "journal-entry-source-link-missing" }),
      ]),
    )
  })

  it("blocks journal proof when a linked business event failed", async () => {
    mockDb.journalEntry.findFirst.mockResolvedValue(postedJournalEntry())
    mockDb.businessEvent.findMany.mockResolvedValue([
      {
        id: "event-1",
        status: BusinessEventStatus.FAILED,
        eventType: "pos.sale.completed",
        failureMessage: "Posting failed.",
      },
    ])

    const result = await getProofTrail({
      organizationId: "org-1",
      subjectType: "journal.entry",
      subjectId: "je-1",
    })

    expect(result.evidenceGrade).toBe("blocked")
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "business-event-event-1" }),
      ]),
    )
  })

  it("returns certified reconciliation proof and audits sensitive access", async () => {
    mockDb.reconciliationRun.findFirst.mockResolvedValue(signedReconciliationRun())

    const result = await getProofTrail({
      organizationId: "org-1",
      subjectType: "reconciliation.run",
      subjectId: "recon-1",
      actorId: "user-1",
    })

    expect(result.evidenceGrade).toBe("certified")
    expect(result.redactions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "provider-account-internal-id" }),
      ]),
    )
    expect(result.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "provider-account", nodeId: "redacted", redacted: true }),
      ]),
    )
    expect(mockDb.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "EVIDENCE_PROOF_TRAIL_VIEWED",
          organizationId: "org-1",
          userId: "user-1",
        }),
      }),
    )
  })

  it("blocks reconciliation proof when open exceptions or suspense remain", async () => {
    mockDb.reconciliationRun.findFirst.mockResolvedValue(
      signedReconciliationRun({
        certificateHash: null,
        paymentExceptions: [
          {
            id: "exception-1",
            status: PaymentExceptionStatus.OPEN,
            severity: "HIGH",
            type: "AMOUNT_MISMATCH",
            resolutionNotes: null,
          },
        ],
        suspenseItems: [
          {
            id: "suspense-1",
            status: SuspenseStatus.OPEN,
            severity: "MEDIUM",
            amount: amount(5000),
            currencyCode: "XAF",
          },
        ],
      }),
    )

    const result = await getProofTrail({
      organizationId: "org-1",
      subjectType: "reconciliation.run",
      subjectId: "recon-1",
    })

    expect(result.evidenceGrade).toBe("blocked")
    expect(result.blockers.map((entry) => entry.id)).toEqual(
      expect.arrayContaining(["reconciliation-open-exceptions", "reconciliation-open-suspense"]),
    )
  })

  it("returns certified close proof with redacted close-pack export internals", async () => {
    mockDb.closeRun.findFirst.mockResolvedValue(certifiedCloseRun())

    const result = await getProofTrail({
      organizationId: "org-1",
      subjectType: "close.run",
      subjectId: "close-1",
      actorId: "user-1",
    })

    expect(result.evidenceGrade).toBe("certified")
    expect(result.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "close-pack-export-1", nodeId: "redacted", label: "Redacted evidence" }),
      ]),
    )
    expect(result.audit.accessLogged).toBe(true)
  })

  it("blocks close proof when unresolved findings remain", async () => {
    mockDb.closeRun.findFirst.mockResolvedValue(
      certifiedCloseRun({
        status: CloseRunStatus.READY,
        packExports: [],
        findings: [
          {
            id: "finding-1",
            status: CloseFindingStatus.OPEN,
            severity: "HIGH",
            title: "Open high-risk finding",
            domain: "PAYMENT_RECONCILIATION",
            detail: "Payment reconciliation is not signed.",
          },
        ],
      }),
    )

    const result = await getProofTrail({
      organizationId: "org-1",
      subjectType: "close.run",
      subjectId: "close-1",
    })

    expect(result.evidenceGrade).toBe("blocked")
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "close-open-findings" }),
      ]),
    )
  })
})

