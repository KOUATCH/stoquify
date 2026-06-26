jest.mock("@/prisma/db", () => {
  const dbMock = {
    $transaction: jest.fn(),
    organizationAccountingSettings: { findUnique: jest.fn() },
    accountingPeriod: { findFirst: jest.fn() },
    journalEntryLine: {
      aggregate: jest.fn(),
      findMany: jest.fn(),
    },
    journalEntry: { count: jest.fn() },
    accountingSourceLink: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    ledgerPostingBatch: { count: jest.fn() },
    businessEvent: { count: jest.fn() },
    providerAccount: { count: jest.fn(), findMany: jest.fn() },
    statementFile: { count: jest.fn() },
    statementLine: { count: jest.fn() },
    reconciliationRun: { count: jest.fn() },
    paymentException: { count: jest.fn() },
    payrollRun: { count: jest.fn() },
    payrollRunLine: { count: jest.fn() },
    payrollPayslip: { count: jest.fn() },
    payrollDeclaration: { count: jest.fn() },
    payrollDeclarationEvidence: { count: jest.fn() },
    payrollPaymentBatch: { count: jest.fn() },
    supplierInvoice: { count: jest.fn() },
    supplierPayment: { count: jest.fn() },
    fiscalDocument: { count: jest.fn() },
    pOSOfflineEvent: { count: jest.fn() },
    pOSOfflineSyncConflict: { count: jest.fn() },
    pOSOfflineSyncCertificate: { count: jest.fn() },
    ledgerAuditEvent: {
      count: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    auditLog: {
      count: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
  }
  dbMock.$transaction = jest.fn((callback) => callback(dbMock))
  return { db: dbMock }
})

import { AccountingPeriodStatus, AccountingSourceType, LedgerPostingBatchStatus, Prisma } from "@prisma/client"

import { db } from "@/prisma/db"
import { exportAccountantTrustPack, getAccountantPortalData } from "../data-trust.service"

const mockDb = db as unknown as {
  $transaction: jest.Mock
  organizationAccountingSettings: { findUnique: jest.Mock }
  accountingPeriod: { findFirst: jest.Mock }
  journalEntryLine: {
    aggregate: jest.Mock
    findMany: jest.Mock
  }
  journalEntry: { count: jest.Mock }
  accountingSourceLink: {
    count: jest.Mock
    findMany: jest.Mock
  }
  ledgerPostingBatch: { count: jest.Mock }
  businessEvent: { count: jest.Mock }
  providerAccount: { count: jest.Mock; findMany: jest.Mock }
  statementFile: { count: jest.Mock }
  statementLine: { count: jest.Mock }
  reconciliationRun: { count: jest.Mock }
  paymentException: { count: jest.Mock }
  payrollRun: { count: jest.Mock }
  payrollRunLine: { count: jest.Mock }
  payrollPayslip: { count: jest.Mock }
  payrollDeclaration: { count: jest.Mock }
  payrollDeclarationEvidence: { count: jest.Mock }
  payrollPaymentBatch: { count: jest.Mock }
  supplierInvoice: { count: jest.Mock }
  supplierPayment: { count: jest.Mock }
  fiscalDocument: { count: jest.Mock }
  pOSOfflineEvent: { count: jest.Mock }
  pOSOfflineSyncConflict: { count: jest.Mock }
  pOSOfflineSyncCertificate: { count: jest.Mock }
  ledgerAuditEvent: {
    count: jest.Mock
    findMany: jest.Mock
    create: jest.Mock
  }
  auditLog: {
    count: jest.Mock
    findMany: jest.Mock
    create: jest.Mock
  }
}

const now = new Date("2026-06-15T12:00:00.000Z")

function seedCleanTrustData() {
  jest.clearAllMocks()
  mockDb.$transaction.mockImplementation((callback) => callback(mockDb))
  mockDb.organizationAccountingSettings.findUnique.mockResolvedValue({
    accountingEnabled: true,
    setupStatus: "READY",
    baseCurrency: "XAF",
  })
  mockDb.accountingPeriod.findFirst.mockResolvedValue({
    id: "period-1",
    name: "June 2026",
    status: AccountingPeriodStatus.OPEN,
    startDate: new Date("2026-06-01T00:00:00.000Z"),
    endDate: new Date("2026-06-30T23:59:59.999Z"),
  })
  mockDb.journalEntryLine.aggregate.mockResolvedValue({
    _sum: {
      debit: new Prisma.Decimal(120000),
      credit: new Prisma.Decimal(120000),
    },
    _count: { _all: 4 },
  })
  mockDb.journalEntry.count.mockResolvedValueOnce(2).mockResolvedValueOnce(0).mockResolvedValueOnce(0)
  mockDb.accountingSourceLink.count.mockResolvedValue(2)
  mockDb.ledgerPostingBatch.count.mockResolvedValue(0).mockResolvedValueOnce(0).mockResolvedValueOnce(0).mockResolvedValueOnce(0)
  mockDb.businessEvent.count.mockResolvedValue(0)
  mockDb.paymentException.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0)
  mockDb.providerAccount.count.mockResolvedValue(0)
  mockDb.providerAccount.findMany.mockResolvedValue([])
  mockDb.statementFile.count.mockResolvedValue(0)
  mockDb.statementLine.count.mockResolvedValue(0)
  mockDb.reconciliationRun.count.mockResolvedValue(0)
  mockDb.payrollDeclaration.count.mockResolvedValue(0)
  mockDb.payrollDeclarationEvidence.count.mockResolvedValue(0)
  mockDb.payrollPaymentBatch.count.mockResolvedValue(0)
  mockDb.payrollRun.count.mockResolvedValue(0)
  mockDb.payrollRunLine.count.mockResolvedValue(0)
  mockDb.payrollPayslip.count.mockResolvedValue(0)
  mockDb.supplierInvoice.count.mockResolvedValue(0)
  mockDb.supplierPayment.count.mockResolvedValue(0)
  mockDb.fiscalDocument.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0)
  mockDb.pOSOfflineEvent.count.mockResolvedValue(0)
  mockDb.pOSOfflineSyncConflict.count.mockResolvedValue(0)
  mockDb.pOSOfflineSyncCertificate.count.mockResolvedValue(0)
  mockDb.ledgerAuditEvent.count.mockResolvedValue(3)
  mockDb.auditLog.count.mockResolvedValue(2)
  mockDb.accountingSourceLink.findMany.mockResolvedValue([
    {
      id: "source-link-1",
      sourceType: AccountingSourceType.POS_SALE,
      sourceId: "sale-1",
      sourceNumber: "POS-1",
      postingBatchId: "batch-1",
      postingBatch: { id: "batch-1", status: LedgerPostingBatchStatus.POSTED },
      journalEntry: { entryNumber: "JE-1" },
      createdAt: new Date("2026-06-15T10:00:00.000Z"),
    },
  ])
  mockDb.ledgerAuditEvent.findMany.mockResolvedValue([
    {
      id: "ledger-audit-1",
      action: "POSTING_BATCH_POSTED",
      actorId: "accountant-1",
      resourceType: "LedgerPostingBatch",
      resourceId: "batch-1",
      createdAt: new Date("2026-06-15T10:01:00.000Z"),
    },
  ])
  mockDb.auditLog.findMany.mockResolvedValue([
    {
      id: "control-audit-1",
      action: "ACCOUNTING_EXPORT_CONTROL",
      entityType: "AccountingExport",
      entityId: "export-1",
      userId: "accountant-1",
      changes: { allowed: true },
      createdAt: new Date("2026-06-15T10:02:00.000Z"),
    },
  ])
  mockDb.ledgerAuditEvent.create.mockResolvedValue({ id: "export-audit-1" })
  mockDb.auditLog.create.mockResolvedValue({ id: "control-audit-created" })
  mockDb.journalEntryLine.findMany.mockResolvedValue([])
}

describe("accountant data trust service", () => {
  beforeEach(() => {
    seedCleanTrustData()
  })

  it("certifies clean ledger-backed evidence at T4", async () => {
    const result = await getAccountantPortalData({ organizationId: "org-1" }, db, now)

    expect(result.certificate.level).toBe("T4")
    expect(result.certificate.verdict).toBe("CERTIFIED")
    expect(result.exportReadiness.canExportCertifiedPack).toBe(true)
    expect(result.summary.sourceLinkCoveragePct).toBe(100)
    expect(result.figures.activityDebit).toMatchObject({
      available: true,
      amount: "120000.00",
      provenance: "POSTED",
    })
  })

  it("marks critical source-link failures as T0 and suppresses financial figures", async () => {
    seedCleanTrustData()
    mockDb.journalEntry.count.mockReset().mockResolvedValueOnce(2).mockResolvedValueOnce(1).mockResolvedValueOnce(0)

    const result = await getAccountantPortalData({ organizationId: "org-1" }, db, now)

    expect(result.certificate.level).toBe("T0")
    expect(result.certificate.verdict).toBe("NON_COMPLIANT")
    expect(result.exportReadiness.canExportCertifiedPack).toBe(false)
    expect(result.figures.activityDebit).toMatchObject({
      available: false,
      provenance: "UNAVAILABLE",
    })
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "posted-journals-without-source-link",
          severity: "critical",
        }),
      ]),
    )
  })

  it("exports a certified trust pack with sensitive-action audit and ledger audit evidence", async () => {
    const result = await exportAccountantTrustPack({
      organizationId: "org-1",
      exportedById: "accountant-1",
      actorPermissions: ["accounting.exports.create"],
      lastAuthAt: now,
      now,
      includeLedgerRows: true,
    })

    expect(result.verdict).toBe("CERTIFIED")
    expect(result.contentHash).toMatch(/^sha256:/)
    expect(result.content).toContain("AQSTOQFLOW_ACCOUNTANT_TRUST_PACK")
    expect(mockDb.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "ACCOUNTING_EXPORT_CONTROL",
          entityType: "AccountantTrustPack",
        }),
      }),
    )
    expect(mockDb.ledgerAuditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "ACCOUNTANT_TRUST_PACK_EXPORT",
          resourceType: "AccountantTrustPack",
        }),
      }),
    )
  })

  it("blocks trust-pack export when certification gates fail", async () => {
    seedCleanTrustData()
    mockDb.journalEntry.count.mockReset().mockResolvedValueOnce(2).mockResolvedValueOnce(1).mockResolvedValueOnce(0)

    await expect(
      exportAccountantTrustPack({
        organizationId: "org-1",
        exportedById: "accountant-1",
        actorPermissions: ["accounting.exports.create"],
        lastAuthAt: now,
        now,
      }),
    ).rejects.toThrow(/requires T4/i)
  })

  it("blocks certified trust packs when active provider accounts lack statement evidence", async () => {
    seedCleanTrustData()
    mockDb.providerAccount.count.mockResolvedValue(1)
    mockDb.statementFile.count.mockResolvedValue(0)
    mockDb.statementLine.count.mockResolvedValue(0)
    mockDb.reconciliationRun.count.mockResolvedValue(0)

    const result = await getAccountantPortalData({ organizationId: "org-1" }, db, now)

    expect(result.certificate.level).toBe("T2")
    expect(result.exportReadiness.canExportCertifiedPack).toBe(false)
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "provider-statement-evidence-missing",
          severity: "high",
          gate: "payments.provider-statement-evidence",
        }),
      ]),
    )
    expect(result.moduleEvidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          module: "payments",
          status: "blocked",
          facts: expect.arrayContaining([
            { label: "Active provider accounts", value: 1 },
            { label: "Statement files", value: 0 },
            { label: "Statement lines", value: 0 },
            { label: "Signed reconciliation runs", value: 0 },
          ]),
        }),
      ]),
    )
  })

  it("blocks certified trust packs when payroll posting and source-link evidence is incomplete", async () => {
    seedCleanTrustData()
    mockDb.payrollRun.count.mockReset().mockResolvedValueOnce(1).mockResolvedValueOnce(0)
    mockDb.payrollPaymentBatch.count
      .mockReset()
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(1)
    mockDb.ledgerPostingBatch.count.mockReset().mockResolvedValueOnce(0).mockResolvedValueOnce(0).mockResolvedValueOnce(1)

    const result = await getAccountantPortalData({ organizationId: "org-1" }, db, now)

    expect(result.certificate.level).toBe("T0")
    expect(result.exportReadiness.canExportCertifiedPack).toBe(false)
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "payroll-runs-without-ledger",
          severity: "critical",
          gate: "payroll.accounting.posting",
        }),
        expect.objectContaining({
          id: "payroll-payments-without-ledger",
          severity: "critical",
          gate: "payroll.payment.posting",
        }),
        expect.objectContaining({
          id: "payroll-ledger-source-link-missing",
          severity: "critical",
          gate: "payroll.accounting.source-link",
        }),
      ]),
    )
    expect(result.moduleEvidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          module: "payroll",
          status: "blocked",
          facts: expect.arrayContaining([
            { label: "Runs missing ledger", value: 1 },
            { label: "Payments missing ledger", value: 1 },
            { label: "Payroll batches missing source links", value: 1 },
          ]),
        }),
      ]),
    )
  })

  it("expands payroll close data-trust gates to register, declaration, payslip, and payment evidence", async () => {
    seedCleanTrustData()
    mockDb.payrollDeclaration.count
      .mockReset()
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
    mockDb.payrollDeclarationEvidence.count.mockResolvedValue(1)
    mockDb.payrollPaymentBatch.count
      .mockReset()
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0)
    mockDb.payrollRun.count.mockReset().mockResolvedValueOnce(0).mockResolvedValueOnce(1)
    mockDb.payrollRunLine.count.mockResolvedValue(2)
    mockDb.payrollPayslip.count.mockResolvedValue(1)

    const result = await getAccountantPortalData({ organizationId: "org-1" }, db, now)

    expect(result.certificate.level).toBe("T0")
    expect(result.exportReadiness.canExportCertifiedPack).toBe(false)
    expect(result.source.sourceTables).toEqual(
      expect.arrayContaining(["payroll_run_lines", "payroll_payslips", "payroll_declaration_evidence", "payroll_payment_allocations"]),
    )
    expect(result.certificate.evidence).toEqual(
      expect.arrayContaining(["payroll register tie-out, payslip proof, payment settlement, and declaration lifecycle evidence scan"]),
    )
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "payroll-declaration-lifecycle-evidence-missing",
          severity: "high",
        }),
        expect.objectContaining({
          id: "payroll-declarations-in-progress",
          severity: "medium",
        }),
        expect.objectContaining({
          id: "payroll-payments-unsettled",
          severity: "high",
        }),
        expect.objectContaining({
          id: "payroll-payments-without-reconciliation-evidence",
          severity: "high",
        }),
        expect.objectContaining({
          id: "payroll-payment-allocations-missing",
          severity: "high",
        }),
        expect.objectContaining({
          id: "payroll-run-lines-without-payslips",
          severity: "critical",
        }),
        expect.objectContaining({
          id: "payroll-payslips-without-proof-hash",
          severity: "high",
        }),
        expect.objectContaining({
          id: "payroll-paid-runs-without-settled-payments",
          severity: "high",
        }),
      ]),
    )
    expect(result.moduleEvidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          module: "payroll",
          status: "blocked",
          facts: expect.arrayContaining([
            { label: "In-progress declarations", value: 1 },
            { label: "Declaration evidence gaps", value: 1 },
            { label: "Declaration amendments", value: 1 },
            { label: "Payment reconciliation evidence gaps", value: 1 },
            { label: "Payment allocation gaps", value: 1 },
            { label: "Run lines missing payslips", value: 2 },
            { label: "Payslips missing proof hashes", value: 1 },
            { label: "Paid runs missing settled payments", value: 1 },
          ]),
        }),
      ]),
    )
  })

  it("blocks certified trust packs when provider statement cadence is stale", async () => {
    seedCleanTrustData()
    mockDb.providerAccount.count.mockResolvedValue(1)
    mockDb.providerAccount.findMany.mockResolvedValue([
      {
        id: "provider-account-1",
        displayName: "MTN settlement",
        providerCode: "MTN_MOMO",
        settlementLagDays: 0,
        metadata: { statementCadenceDays: 1 },
        statementFiles: [
          {
            id: "statement-file-old",
            periodEnd: new Date("2026-06-10T23:59:59.999Z"),
          },
        ],
      },
    ])
    mockDb.statementFile.count.mockResolvedValue(1)
    mockDb.statementLine.count.mockResolvedValue(4)
    mockDb.reconciliationRun.count.mockResolvedValue(1)

    const result = await getAccountantPortalData({ organizationId: "org-1" }, db, now)

    expect(result.certificate.level).toBe("T2")
    expect(result.exportReadiness.canExportCertifiedPack).toBe(false)
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "provider-statement-cadence-stale",
          severity: "high",
          gate: "payments.provider-statement-cadence",
        }),
      ]),
    )
    expect(result.blockers).toEqual(
      expect.not.arrayContaining([
        expect.objectContaining({ id: "provider-statement-evidence-missing" }),
        expect.objectContaining({
          id: "provider-reconciliation-signoff-missing",
        }),
      ]),
    )
    expect(result.moduleEvidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          module: "payments",
          status: "blocked",
          facts: expect.arrayContaining([{ label: "Stale statement accounts", value: 1 }]),
        }),
      ]),
    )
  })

  it("clears payment trust-pack blockers when statement evidence and signed reconciliation are current", async () => {
    seedCleanTrustData()
    mockDb.providerAccount.count.mockResolvedValue(1)
    mockDb.providerAccount.findMany.mockResolvedValue([
      {
        id: "provider-account-1",
        displayName: "MTN settlement",
        providerCode: "MTN_MOMO",
        settlementLagDays: 0,
        metadata: { statementCadenceDays: 1 },
        statementFiles: [
          {
            id: "statement-file-current",
            periodEnd: new Date("2026-06-14T23:59:59.999Z"),
          },
        ],
      },
    ])
    mockDb.statementFile.count.mockResolvedValue(1)
    mockDb.statementLine.count.mockResolvedValue(4)
    mockDb.reconciliationRun.count.mockResolvedValue(1)

    const result = await getAccountantPortalData({ organizationId: "org-1" }, db, now)

    expect(result.certificate.level).toBe("T4")
    expect(result.exportReadiness.canExportCertifiedPack).toBe(true)
    expect(result.blockers).toEqual(
      expect.not.arrayContaining([
        expect.objectContaining({ id: "provider-statement-evidence-missing" }),
        expect.objectContaining({ id: "provider-statement-cadence-stale" }),
        expect.objectContaining({
          id: "provider-reconciliation-signoff-missing",
        }),
      ]),
    )
    expect(result.moduleEvidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          module: "payments",
          status: "ready",
          facts: expect.arrayContaining([
            { label: "Statement files", value: 1 },
            { label: "Statement lines", value: 4 },
            { label: "Stale statement accounts", value: 0 },
            { label: "Signed reconciliation runs", value: 1 },
          ]),
        }),
      ]),
    )
  })

  it("surfaces offline POS sync blockers in accountant trust evidence", async () => {
    seedCleanTrustData()
    mockDb.pOSOfflineEvent.count.mockResolvedValue(2)
    mockDb.pOSOfflineSyncConflict.count.mockResolvedValue(1)
    mockDb.pOSOfflineSyncCertificate.count.mockResolvedValue(1)

    const result = await getAccountantPortalData({ organizationId: "org-1" }, db, now)

    expect(result.exportReadiness.canExportCertifiedPack).toBe(false)
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "offline-pos-sync-conflicts",
          severity: "high",
        }),
        expect.objectContaining({
          id: "offline-pos-close-blockers",
          severity: "high",
        }),
        expect.objectContaining({
          id: "offline-pos-events-pending-replay",
          severity: "medium",
        }),
      ]),
    )
    expect(result.moduleEvidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          module: "offline_pos",
          facts: expect.arrayContaining([
            { label: "Pending replay", value: 2 },
            { label: "Open conflicts", value: 1 },
            { label: "Close blockers", value: 1 },
          ]),
        }),
      ]),
    )
  })
})
