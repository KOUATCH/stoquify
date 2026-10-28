jest.mock("../balance-sheet-close.service", () => ({ readBalanceSheetClose: jest.fn() }));
import { readBalanceSheetClose } from "../balance-sheet-close.service";
jest.mock("@/services/reconciliation/bank-balance-close.service", () => ({ readBankBalanceClose: jest.fn() }));
import { readBankBalanceClose } from "@/services/reconciliation/bank-balance-close.service";
jest.mock("../close-payable-balances.service", () => ({ ...jest.requireActual("../close-payable-balances.service"), readClosePayableBalances: jest.fn() }));
import { readClosePayableBalances } from "../close-payable-balances.service";
jest.mock("@/services/reconciliation/account-close-coverage.service", () => ({ readAccountCloseCoverage: jest.fn().mockResolvedValue({ version: 1, accounts: [], requiredAccountCount: 0, coveredAccountCount: 0, blockedAccountCount: 0 }) }));
import { readAccountCloseCoverage } from "@/services/reconciliation/account-close-coverage.service";
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
    businessEvent: { count: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    providerAccount: { count: jest.fn(), findMany: jest.fn() },
    statementFile: { count: jest.fn() },
    statementLine: { count: jest.fn() },
    reconciliationRun: { count: jest.fn() },
    paymentException: { count: jest.fn() },
    payrollRun: { count: jest.fn(), findMany: jest.fn() },
    payrollRunLine: { count: jest.fn(), findMany: jest.fn() },
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
  };
  dbMock.$transaction = jest.fn((callback) => callback(dbMock));
  return { db: dbMock };
});

jest.mock("@/services/purchasing/payment-reconciliation-proof-summary", () => ({ readSupplierPaymentReconciliationProofsInTx: jest.fn() }));
import { readSupplierPaymentReconciliationProofsInTx } from "@/services/purchasing/payment-reconciliation-proof-summary";

import {
  AccountingPeriodStatus,
  AccountingSourceType,
  LedgerPostingBatchStatus,
  Prisma,
} from "@prisma/client";

import { db } from "@/prisma/db";
import {
  exportAccountantTrustPack,
  getAccountantPortalData,
} from "../data-trust.service";

const mockDb = db as unknown as {
  $transaction: jest.Mock;
  organizationAccountingSettings: { findUnique: jest.Mock };
  accountingPeriod: { findFirst: jest.Mock };
  journalEntryLine: {
    aggregate: jest.Mock;
    findMany: jest.Mock;
  };
  journalEntry: { count: jest.Mock };
  accountingSourceLink: {
    count: jest.Mock;
    findMany: jest.Mock;
  };
  ledgerPostingBatch: { count: jest.Mock };
  businessEvent: { count: jest.Mock; findUnique: jest.Mock; create: jest.Mock; update: jest.Mock };
  providerAccount: { count: jest.Mock; findMany: jest.Mock };
  statementFile: { count: jest.Mock };
  statementLine: { count: jest.Mock };
  reconciliationRun: { count: jest.Mock };
  paymentException: { count: jest.Mock };
  payrollRun: { count: jest.Mock; findMany: jest.Mock };
  payrollRunLine: { count: jest.Mock; findMany: jest.Mock };
  payrollPayslip: { count: jest.Mock };
  payrollDeclaration: { count: jest.Mock };
  payrollDeclarationEvidence: { count: jest.Mock };
  payrollPaymentBatch: { count: jest.Mock };
  supplierInvoice: { count: jest.Mock };
  supplierPayment: { count: jest.Mock };
  fiscalDocument: { count: jest.Mock };
  pOSOfflineEvent: { count: jest.Mock };
  pOSOfflineSyncConflict: { count: jest.Mock };
  pOSOfflineSyncCertificate: { count: jest.Mock };
  ledgerAuditEvent: {
    count: jest.Mock;
    findMany: jest.Mock;
    create: jest.Mock;
  };
  auditLog: {
    count: jest.Mock;
    findMany: jest.Mock;
    create: jest.Mock;
  };
};

const now = new Date("2026-06-15T12:00:00.000Z");

function seedCleanTrustData() {
  jest.clearAllMocks();
  jest.mocked(readBankBalanceClose).mockResolvedValue({ version: 1, scopeHash: "scope", accounts: [], requiredAccountCount: 0, blockedAccountCount: 0, reconciledAccountCount: 0 });
  jest.mocked(readBalanceSheetClose).mockResolvedValue({ version: 1, scopeHash: "scope", accounts: [], requiredAccountCount: 0, blockedAccountCount: 0, reconciledAccountCount: 0 });
  jest.mocked(readClosePayableBalances).mockResolvedValue({ version: 1, organizationId: "org-1", economicThrough: now.toISOString(), recordedThrough: now.toISOString(), evidenceHash: "payable-hash", normalUnpaidCount: 0, settledCount: 0, exceptionCount: 0, balances: [], currencies: [] });
  (readAccountCloseCoverage as jest.Mock).mockResolvedValue({ version: 1, accounts: [], requiredAccountCount: 0, coveredAccountCount: 0, blockedAccountCount: 0 });
  mockDb.$transaction.mockImplementation((callback) => callback(mockDb));
  mockDb.organizationAccountingSettings.findUnique.mockResolvedValue({
    accountingEnabled: true,
    setupStatus: "READY",
    baseCurrency: "XAF",
  });
  mockDb.accountingPeriod.findFirst.mockResolvedValue({
    id: "period-1",
    name: "June 2026",
    status: AccountingPeriodStatus.OPEN,
    startDate: new Date("2026-06-01T00:00:00.000Z"),
    endDate: new Date("2026-06-30T23:59:59.999Z"),
  });
  mockDb.journalEntryLine.aggregate.mockResolvedValue({
    _sum: {
      debit: new Prisma.Decimal(120000),
      credit: new Prisma.Decimal(120000),
    },
    _count: { _all: 4 },
  });
  mockDb.journalEntry.count
    .mockResolvedValueOnce(2)
    .mockResolvedValueOnce(0)
    .mockResolvedValueOnce(0);
  mockDb.accountingSourceLink.count.mockResolvedValue(2);
  mockDb.ledgerPostingBatch.count
    .mockResolvedValue(0)
    .mockResolvedValueOnce(0)
    .mockResolvedValueOnce(0)
    .mockResolvedValueOnce(0);
  mockDb.businessEvent.count.mockResolvedValue(0);
  mockDb.businessEvent.findUnique.mockResolvedValue(null);
  mockDb.businessEvent.create.mockImplementation(({ data }) => ({ id: "event-export-1", ...data, outboxMessages: [] }));
  mockDb.paymentException.count
    .mockResolvedValueOnce(0)
    .mockResolvedValueOnce(0);
  mockDb.providerAccount.count.mockResolvedValue(0);
  mockDb.providerAccount.findMany.mockResolvedValue([]);
  mockDb.statementFile.count.mockResolvedValue(0);
  mockDb.statementLine.count.mockResolvedValue(0);
  mockDb.reconciliationRun.count.mockResolvedValue(0);
  mockDb.payrollDeclaration.count.mockResolvedValue(0);
  mockDb.payrollDeclarationEvidence.count.mockResolvedValue(0);
  mockDb.payrollPaymentBatch.count.mockResolvedValue(0);
  mockDb.payrollRun.count.mockResolvedValue(0);
  mockDb.payrollRun.findMany.mockResolvedValue([]);
  mockDb.payrollRunLine.count.mockResolvedValue(0);
  mockDb.payrollRunLine.findMany.mockResolvedValue([]);
  mockDb.payrollPayslip.count.mockResolvedValue(0);
  mockDb.supplierInvoice.count.mockResolvedValue(0);
  mockDb.supplierPayment.count.mockResolvedValue(0);
  mockDb.fiscalDocument.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
  mockDb.pOSOfflineEvent.count.mockResolvedValue(0);
  mockDb.pOSOfflineSyncConflict.count.mockResolvedValue(0);
  mockDb.pOSOfflineSyncCertificate.count.mockResolvedValue(0);
  mockDb.ledgerAuditEvent.count.mockResolvedValue(3);
  mockDb.auditLog.count.mockResolvedValue(2);
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
  ]);
  mockDb.ledgerAuditEvent.findMany.mockResolvedValue([
    {
      id: "ledger-audit-1",
      action: "POSTING_BATCH_POSTED",
      actorId: "accountant-1",
      resourceType: "LedgerPostingBatch",
      resourceId: "batch-1",
      createdAt: new Date("2026-06-15T10:01:00.000Z"),
    },
  ]);
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
  ]);
  mockDb.ledgerAuditEvent.create.mockResolvedValue({ id: "export-audit-1" });
  mockDb.auditLog.create.mockResolvedValue({ id: "control-audit-created" });
  mockDb.journalEntryLine.findMany.mockResolvedValue([]);
}

describe("accountant data trust service", () => {
  beforeEach(() => {
    seedCleanTrustData();
    jest.mocked(readSupplierPaymentReconciliationProofsInTx).mockResolvedValue([]);
  });

  it("refuses certification when a resolved supplier payment has unverifiable source proof", async () => {
    jest.mocked(readSupplierPaymentReconciliationProofsInTx).mockRejectedValue(new Error("original receipt changed"));
    await expect(getAccountantPortalData({ organizationId: "org-1" }, db, now)).rejects.toThrow("original receipt changed");
  });

  it("resolves period dates before queries and keeps late-arriving evidence inside the cutoff", async () => {
    const cutoff = new Date("2026-07-05T12:00:00Z");
    const result = await getAccountantPortalData({ organizationId: "org-1", periodId: "period-1" }, db, cutoff);
    expect(result.source.closeScope).toMatchObject({ periodId: "period-1", recordedThrough: cutoff.toISOString() });
    expect(result.source.scopeHash).toBe(result.source.closeScope?.scopeHash);
    expect(mockDb.statementLine.count).toHaveBeenCalledWith({ where: expect.objectContaining({
      organizationId: "org-1", occurredAt: { gte: new Date("2026-06-01"), lte: new Date("2026-06-30T23:59:59.999Z") }, createdAt: { lte: cutoff },
    }) });
    expect(mockDb.ledgerPostingBatch.count.mock.calls[0][0].where.createdAt).toEqual({ lte: cutoff });
    expect(mockDb.payrollRun.count.mock.calls[0][0].where.AND[0].payrollPeriod.organizationId).toBe("org-1");
    expect(readClosePayableBalances).toHaveBeenCalledWith(db, { organizationId: "org-1", economicThrough: new Date("2026-06-30T23:59:59.999Z"), recordedThrough: cutoff });
  });

  it("rejects foreign periods and conflicting dates before financial queries", async () => {
    mockDb.accountingPeriod.findFirst.mockResolvedValueOnce(null);
    await expect(getAccountantPortalData({ organizationId: "org-1", periodId: "foreign" }, db, now)).rejects.toThrow("not found");
    expect(mockDb.journalEntryLine.aggregate).not.toHaveBeenCalled();
    await expect(getAccountantPortalData({ organizationId: "org-1", periodId: "period-1", startDate: "2026-07-01" }, db, now)).rejects.toThrow("conflict");
    expect(mockDb.journalEntryLine.aggregate).not.toHaveBeenCalled();
  });

  it("labels organization-wide controls separately", async () => {
    mockDb.organizationAccountingSettings.findUnique.mockResolvedValue({ accountingEnabled: false, setupStatus: "NOT_STARTED" });
    const result = await getAccountantPortalData({ organizationId: "org-1", periodId: "period-1" }, db, now);
    expect(result.blockers.find(row => row.id === "accounting-setup-not-locked")?.scope).toBe("ORGANIZATION");
  });

  it("certifies clean ledger-backed evidence at T4", async () => {
    const result = await getAccountantPortalData(
      { organizationId: "org-1" },
      db,
      now,
    );

    expect(result.certificate.level).toBe("T4");
    expect(result.certificate.verdict).toBe("CERTIFIED");
    expect(result.exportReadiness.canExportCertifiedPack).toBe(true);
    expect(result.summary.sourceLinkCoveragePct).toBe(100);
    expect(result.payrollAuditProofPack).toEqual(
      expect.objectContaining({
        kind: "AQSTOQFLOW_PAYROLL_AUDITOR_PROOF_PACK_READ_MODEL",
        organizationScoped: true,
        redaction: expect.objectContaining({
          mode: "HASHES_AND_AGGREGATES_ONLY",
        }),
        certification: expect.objectContaining({
          trustLevel: "T4",
          verdict: "CERTIFIED",
          exportable: true,
          blockerCount: 0,
        }),
        sourceTables: expect.arrayContaining([
          "payroll_runs",
          "payroll_run_lines",
          "payroll_payment_batches",
          "payroll_declaration_evidence",
          "accounting_source_links",
        ]),
        proofGates: expect.arrayContaining([
          expect.objectContaining({
            gate: "payroll.accounting.component-proof",
            status: "PASS",
            blockerCount: 0,
          }),
          expect.objectContaining({
            gate: "payroll.payment.proof",
            status: "PASS",
            blockerCount: 0,
          }),
          expect.objectContaining({
            gate: "payroll.declarations.proof",
            status: "PASS",
            blockerCount: 0,
          }),
        ]),
      }),
    );
    expect(result.figures.activityDebit).toMatchObject({
      available: true,
      amount: "120000.00",
      provenance: "POSTED",
    });
  });

  it("blocks bank balance gaps even when transaction matching coverage is complete", async () => {
    jest.mocked(readBankBalanceClose).mockResolvedValue({ version: 1, scopeHash: "scope", requiredAccountCount: 1, reconciledAccountCount: 0, blockedAccountCount: 1,
      accounts: [{ providerAccountId: "bank", accountName: "Bank", currency: "XAF", status: "BLOCKED", reason: "Bank balance evidence is missing.", evidenceId: null, evidenceHash: null, approvedById: null, approvedAt: null, snapshot: null }] });
    const result = await getAccountantPortalData({ organizationId: "org-1", periodId: "period-1" }, db, now);
    expect(result.exportReadiness.canExportCertifiedPack).toBe(false);
    expect(result.blockers).toContainEqual(expect.objectContaining({ id: "bank-balance:bank", severity: "high" }));
    expect(result.moduleEvidence.find(row => row.module === "payments")?.status).toBe("blocked");
  });

  it("blocks balance-sheet gaps despite a balanced trial balance and retains separate currency evidence", async () => {
    jest.mocked(readBalanceSheetClose).mockResolvedValue({ version: 1, scopeHash: "scope", requiredAccountCount: 1, reconciledAccountCount: 0, blockedAccountCount: 1,
      accounts: [{ ledgerAccountId: "ap", accountCode: "401", accountName: "Payables", currency: "XAF", status: "BLOCKED", reason: "Supporting schedule is missing.", evidenceId: null, evidenceHash: null, approvedById: null, approvedAt: null, snapshot: null }] });
    const result = await getAccountantPortalData({ organizationId: "org-1", periodId: "period-1" }, db, now);
    expect(result.exportReadiness.canExportCertifiedPack).toBe(false);
    expect(result.blockers).toContainEqual(expect.objectContaining({ id: "balance-sheet:ap:XAF", severity: "high" }));
    expect(result.moduleEvidence.find(row => row.module === "ledger")?.status).toBe("blocked");
    expect(result.balanceSheetReconciliation?.blockedAccountCount).toBe(1);
  });

  it("keeps normal unpaid AP visible without reducing trust or blocking certification", async () => {
    const empty = await jest.mocked(readClosePayableBalances)({} as never, {} as never);
    jest.mocked(readClosePayableBalances).mockResolvedValue({ ...empty, normalUnpaidCount: 1,
      balances: [{ invoiceId: "invoice-1", currency: "XAF", classification: "NORMAL_UNPAID", outstanding: "125.50", maturity: "OVERDUE", reasons: [] }],
      currencies: [{ currency: "XAF", normalUnpaid: "125.50", overdue: "125.50", exceptionCount: 0 }],
    });
    const result = await getAccountantPortalData({ organizationId: "org-1" }, db, now);
    expect(result.certificate.level).toBe("T4");
    expect(result.exportReadiness.canExportCertifiedPack).toBe(true);
    expect(result.blockers).toEqual([]);
    expect(result.moduleEvidence.find(row => row.module === "purchasing")?.status).toBe("ready");
    expect(result.payableBalances?.normalUnpaidCount).toBe(1);
  });

  it("blocks AP exceptions independently of normal unpaid amounts", async () => {
    const empty = await jest.mocked(readClosePayableBalances)({} as never, {} as never);
    jest.mocked(readClosePayableBalances).mockResolvedValue({ ...empty, exceptionCount: 1,
      balances: [{ invoiceId: "disputed", currency: "XAF", classification: "EXCEPTION", outstanding: null, maturity: "NOT_DUE", reasons: ["DISPUTED_INVOICE"] }],
    });
    const result = await getAccountantPortalData({ organizationId: "org-1" }, db, now);
    expect(result.exportReadiness.canExportCertifiedPack).toBe(false);
    expect(result.moduleEvidence.find(row => row.module === "purchasing")?.status).toBe("blocked");
    expect(result.blockers).toContainEqual(expect.objectContaining({ id: "supplier-invoice-exception:disputed", severity: "high" }));
  });

  it.each(["NOT_STARTED", "IN_PROGRESS", null])("blocks enabled accounting with incomplete setup %s", async (setupStatus) => {
    mockDb.organizationAccountingSettings.findUnique.mockResolvedValue({ accountingEnabled: true, setupStatus });
    const result = await getAccountantPortalData({ organizationId: "org-1" }, db, now);
    expect(result.certificate.level).toBe("T2");
    expect(result.exportReadiness.canExportCertifiedPack).toBe(false);
    expect(result.blockers).toEqual(expect.arrayContaining([expect.objectContaining({ gate: "accounting.setup.ready", severity: "high" })]));
    expect(result.moduleEvidence.find(row => row.module === "ledger")?.status).toBe("blocked");
  });

  it.each(["READY", "LOCKED"])("accepts completed and enabled setup %s", async (setupStatus) => {
    mockDb.organizationAccountingSettings.findUnique.mockResolvedValue({ accountingEnabled: true, setupStatus });
    const result = await getAccountantPortalData({ organizationId: "org-1" }, db, now);
    expect(result.certificate.level).toBe("T4");
    expect(result.exportReadiness.canExportCertifiedPack).toBe(true);
    expect(result.blockers.some(row => row.gate === "accounting.setup.ready")).toBe(false);
  });

  it("blocks disabled accounting even with retained completed setup", async () => {
    mockDb.organizationAccountingSettings.findUnique.mockResolvedValue({ accountingEnabled: false, setupStatus: "READY" });
    const result = await getAccountantPortalData({ organizationId: "org-1" }, db, now);
    expect(result.certificate.level).toBe("T2");
    expect(result.exportReadiness.canExportCertifiedPack).toBe(false);
  });

  it("blocks emitted-unposted and missing post-cutover transition proof while disclosing legacy evidence", async () => {
    const runtimeTransition = (toStatus: string, fromVersion: number) => ({
      toStatus,
      fromVersion,
      toVersion: fromVersion + 1,
      actorId: "payroll-actor",
      transitionedAt: now,
      businessEventId: "event-" + toStatus,
      origin: "RUNTIME",
      evidenceStatus: "VERIFIED",
    });
    const reviewed = runtimeTransition("REVIEWED", 1);
    const approved = runtimeTransition("APPROVED", 2);
    const emitted = runtimeTransition("EMITTED", 3);

    mockDb.payrollRun.findMany.mockResolvedValue([
      { status: "EMITTED", transitions: [reviewed, approved, emitted] },
      { status: "POSTED", transitions: [reviewed, approved, emitted] },
      {
        status: "POSTED",
        transitions: [
          {
            toStatus: "POSTED",
            fromVersion: null,
            toVersion: null,
            actorId: null,
            transitionedAt: null,
            businessEventId: null,
            origin: "LEGACY_BACKFILL",
            evidenceStatus: "LEGACY_PARTIAL_EVIDENCE",
          },
        ],
      },
    ]);

    const result = await getAccountantPortalData(
      { organizationId: "org-1" },
      db,
      now,
    );

    expect(mockDb.payrollRun.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-1",
          deletedAt: null,
        }),
        select: expect.objectContaining({
          transitions: expect.objectContaining({
            select: expect.objectContaining({ businessEventId: true }),
          }),
        }),
      }),
    );
    expect(result.certificate.level).toBe("T0");
    expect(result.exportReadiness.canExportCertifiedPack).toBe(false);
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "payroll-emitted-runs-unposted",
          severity: "critical",
          gate: "payroll.lifecycle.posting",
        }),
        expect.objectContaining({
          id: "payroll-transition-proof-missing",
          severity: "critical",
          gate: "payroll.lifecycle.transition-proof",
        }),
        expect.objectContaining({
          id: "payroll-transition-proof-legacy-partial",
          severity: "medium",
          gate: "payroll.lifecycle.legacy-disclosure",
        }),
      ]),
    );
    expect(result.moduleEvidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          module: "payroll",
          status: "blocked",
          facts: expect.arrayContaining([
            { label: "Emitted runs awaiting posting", value: 1 },
            { label: "Post-cutover transition proof gaps", value: 1 },
            { label: "Legacy partial transition disclosures", value: 1 },
          ]),
        }),
      ]),
    );
  });

  it("marks critical source-link failures as T0 and suppresses financial figures", async () => {
    seedCleanTrustData();
    mockDb.journalEntry.count
      .mockReset()
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0);

    const result = await getAccountantPortalData(
      { organizationId: "org-1" },
      db,
      now,
    );

    expect(result.certificate.level).toBe("T0");
    expect(result.certificate.verdict).toBe("NON_COMPLIANT");
    expect(result.exportReadiness.canExportCertifiedPack).toBe(false);
    expect(result.figures.activityDebit).toMatchObject({
      available: false,
      provenance: "UNAVAILABLE",
    });
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "posted-journals-without-source-link",
          severity: "critical",
        }),
      ]),
    );
  });

  it("exports a certified trust pack with sensitive-action audit and ledger audit evidence", async () => {
    const result = await exportAccountantTrustPack({
      organizationId: "org-1",
      exportedById: "accountant-1",
      actorPermissions: ["accounting.exports.create"],
      lastAuthAt: now,
      now,
      includeLedgerRows: true,
    });

    expect(result.verdict).toBe("CERTIFIED");
    expect(result.contentHash).toMatch(/^sha256:/);
    expect(result.content).toContain("AQSTOQFLOW_ACCOUNTANT_TRUST_PACK");
    expect(JSON.parse(result.content).payableBalances).toMatchObject({ version: 1, organizationId: "org-1", evidenceHash: "payable-hash" });
    const payload = JSON.parse(result.content);
    expect(payload.payrollAuditProofPack).toEqual(
      expect.objectContaining({
        kind: "AQSTOQFLOW_PAYROLL_AUDITOR_PROOF_PACK_READ_MODEL",
        redaction: expect.objectContaining({
          mode: "HASHES_AND_AGGREGATES_ONLY",
        }),
      }),
    );
    expect(result.content).not.toContain("employeeNumber");
    expect(result.content).not.toContain("bankAccount");
    expect(result.content).not.toContain("mobileMoney");
    expect(mockDb.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "ACCOUNTING_EXPORT_CONTROL",
          entityType: "AccountantTrustPack",
        }),
      }),
    );
    expect(mockDb.ledgerAuditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "ACCOUNTANT_TRUST_PACK_EXPORT",
          resourceType: "AccountantTrustPack",
        }),
      }),
    );
  });

  it("blocks trust-pack export when certification gates fail", async () => {
    seedCleanTrustData();
    mockDb.journalEntry.count
      .mockReset()
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0);

    await expect(
      exportAccountantTrustPack({
        organizationId: "org-1",
        exportedById: "accountant-1",
        actorPermissions: ["accounting.exports.create"],
        lastAuthAt: now,
        now,
      }),
    ).rejects.toThrow(/requires T4/i);
  });

  it("blocks certified trust packs when active provider accounts lack statement evidence", async () => {
    seedCleanTrustData();
    mockDb.providerAccount.count.mockResolvedValue(1);
    mockDb.statementFile.count.mockResolvedValue(0);
    mockDb.statementLine.count.mockResolvedValue(0);
    mockDb.reconciliationRun.count.mockResolvedValue(0);

    const result = await getAccountantPortalData(
      { organizationId: "org-1" },
      db,
      now,
    );

    expect(result.certificate.level).toBe("T2");
    expect(result.exportReadiness.canExportCertifiedPack).toBe(false);
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "provider-statement-evidence-missing",
          severity: "high",
          gate: "payments.provider-statement-evidence",
        }),
      ]),
    );
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
    );
  });

  it("blocks certified trust packs when payroll posting and source-link evidence is incomplete", async () => {
    seedCleanTrustData();
    mockDb.payrollRun.count
      .mockReset()
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    mockDb.payrollPaymentBatch.count
      .mockReset()
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(1);
    mockDb.ledgerPostingBatch.count
      .mockReset()
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(1);

    const result = await getAccountantPortalData(
      { organizationId: "org-1" },
      db,
      now,
    );

    expect(result.certificate.level).toBe("T0");
    expect(result.exportReadiness.canExportCertifiedPack).toBe(false);
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
          id: "payroll-posted-runs-component-proof-missing",
          severity: "critical",
          gate: "payroll.accounting.component-proof",
        }),
        expect.objectContaining({
          id: "payroll-posted-runs-composite-proof-missing",
          severity: "critical",
          gate: "payroll.accounting.composite-proof",
        }),
        expect.objectContaining({
          id: "payroll-ledger-source-link-missing",
          severity: "critical",
          gate: "payroll.accounting.source-link",
        }),
      ]),
    );
    expect(result.moduleEvidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          module: "payroll",
          status: "blocked",
          facts: expect.arrayContaining([
            { label: "Runs missing ledger", value: 1 },
            { label: "Posted run component proof gaps", value: 1 },
            { label: "Payments missing ledger", value: 1 },
            { label: "Payroll batches missing source links", value: 1 },
          ]),
        }),
      ]),
    );
  });

  it("blocks certified trust packs when payroll effective component proof is missing from run lines", async () => {
    seedCleanTrustData();
    mockDb.payrollRunLine.findMany.mockResolvedValue([
      {
        calculationSnapshot: {
          payrollRubriqueGrossAmount: "25000.00",
        },
      },
    ]);

    const result = await getAccountantPortalData(
      { organizationId: "org-1" },
      db,
      now,
    );

    expect(result.certificate.level).toBe("T0");
    expect(result.exportReadiness.canExportCertifiedPack).toBe(false);
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "payroll-effective-component-proof-missing",
          severity: "critical",
          gate: "payroll.accounting.effective-component-proof",
        }),
      ]),
    );
    expect(result.moduleEvidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          module: "payroll",
          status: "blocked",
          facts: expect.arrayContaining([
            { label: "Effective component proof gaps", value: 1 },
          ]),
        }),
      ]),
    );
  });
  it("blocks certified trust packs when deduction recovery ledger mapping proof is missing", async () => {
    seedCleanTrustData();
    mockDb.payrollRunLine.findMany
      .mockReset()
      .mockResolvedValueOnce([
        {
          payrollRunId: "run-1",
          calculationSnapshot: {
            deductionRecoveryAmount: "5000.00",
            deductionRecoveryProofHash: "sha256:deduction-recovery-line-proof",
          },
          payrollRun: {
            metadata: {
              componentRegisterProofHash: "sha256:component-register-proof",
              componentRegisterProofStatus: "MATCHED",
              compositeRegisterProofHash: "sha256:composite-register-proof",
              compositeRegisterProofStatus: "MATCHED",
              deductionRecoveryAmount: "5000.00",
              deductionRecoveryProofHash: "sha256:deduction-recovery-run-proof",
            },
          },
        },
      ])
      .mockResolvedValueOnce([]);

    const result = await getAccountantPortalData(
      { organizationId: "org-1" },
      db,
      now,
    );

    expect(result.certificate.level).toBe("T0");
    expect(result.exportReadiness.canExportCertifiedPack).toBe(false);
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "payroll-deduction-recovery-ledger-mapping-missing",
          severity: "critical",
          gate: "payroll.accounting.deduction-recovery-ledger-mapping",
        }),
      ]),
    );
    expect(result.moduleEvidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          module: "payroll",
          status: "blocked",
          facts: expect.arrayContaining([
            { label: "Deduction/recovery ledger mapping gaps", value: 1 },
          ]),
        }),
      ]),
    );
    expect(result.payrollAuditProofPack.certification).toEqual(
      expect.objectContaining({
        trustLevel: "T0",
        exportable: false,
        criticalBlockerCount: 1,
      }),
    );
    expect(result.payrollAuditProofPack.proofGates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          gate: "payroll.accounting.component-proof",
          status: "BLOCKED",
          blockerIds: expect.arrayContaining([
            "payroll-deduction-recovery-ledger-mapping-missing",
          ]),
        }),
      ]),
    );
    expect(result.payrollAuditProofPack.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "payroll-deduction-recovery-ledger-mapping-missing",
          gate: "payroll.accounting.deduction-recovery-ledger-mapping",
        }),
      ]),
    );
  });

  it("blocks certified trust packs when declaration country-pack register proof is missing", async () => {
    seedCleanTrustData();
    mockDb.payrollDeclarationEvidence.count
      .mockReset()
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);

    const result = await getAccountantPortalData(
      { organizationId: "org-1" },
      db,
      now,
    );

    expect(result.certificate.level).toBe("T2");
    expect(result.exportReadiness.canExportCertifiedPack).toBe(false);
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "payroll-declaration-country-pack-register-proof-missing",
          severity: "high",
          gate: "payroll.declarations.country-pack-register-proof",
        }),
      ]),
    );
    expect(result.moduleEvidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          module: "payroll",
          status: "blocked",
          facts: expect.arrayContaining([
            { label: "Declaration country-pack register proof gaps", value: 1 },
          ]),
        }),
      ]),
    );
  });

  it("expands payroll close data-trust gates to register, declaration, payslip, and payment evidence", async () => {
    seedCleanTrustData();
    mockDb.payrollDeclaration.count
      .mockReset()
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1);
    mockDb.payrollDeclarationEvidence.count.mockResolvedValue(1);
    mockDb.payrollPaymentBatch.count
      .mockReset()
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0);
    mockDb.payrollRun.count
      .mockReset()
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1);
    mockDb.payrollRunLine.count.mockResolvedValue(2);
    mockDb.payrollPayslip.count.mockResolvedValue(1);

    const result = await getAccountantPortalData(
      { organizationId: "org-1" },
      db,
      now,
    );

    expect(result.certificate.level).toBe("T0");
    expect(result.exportReadiness.canExportCertifiedPack).toBe(false);
    expect(mockDb.payrollRun.count).toHaveBeenNthCalledWith(
      4,
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-1",
          OR: expect.arrayContaining([
            expect.objectContaining({
              metadata: expect.objectContaining({
                path: ["hrisPayrollReadinessHash"],
              }),
            }),
          ]),
        }),
      }),
    );
    expect(result.source.sourceTables).toEqual(
      expect.arrayContaining([
        "payroll_run_lines",
        "payroll_payslips",
        "payroll_declaration_evidence",
        "payroll_payment_allocations",
      ]),
    );
    expect(result.certificate.evidence).toEqual(
      expect.arrayContaining([
        "payroll register tie-out, payslip proof, payment settlement register/component/composite/provider-adapter/provider-receipt proof, declaration lifecycle register/country-pack/composite/lifecycle-contract proof, and authority-adapter proof scan",
      ]),
    );
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "payroll-declaration-lifecycle-evidence-missing",
          severity: "high",
        }),
        expect.objectContaining({
          id: "payroll-declaration-register-proof-missing",
          severity: "high",
        }),
        expect.objectContaining({
          id: "payroll-declaration-country-pack-register-proof-missing",
          severity: "high",
        }),
        expect.objectContaining({
          id: "payroll-declaration-composite-register-proof-missing",
          severity: "high",
        }),
        expect.objectContaining({
          id: "payroll-declaration-authority-adapter-proof-missing",
          severity: "high",
        }),
        expect.objectContaining({
          id: "payroll-declaration-authority-lifecycle-proof-missing",
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
          id: "payroll-payment-settlement-register-proof-missing",
          severity: "high",
        }),
        expect.objectContaining({
          id: "payroll-payment-settlement-component-proof-missing",
          severity: "high",
        }),
        expect.objectContaining({
          id: "payroll-payment-settlement-composite-proof-missing",
          severity: "high",
        }),
        expect.objectContaining({
          id: "payroll-payment-provider-adapter-proof-missing",
          severity: "high",
        }),
        expect.objectContaining({
          id: "payroll-payment-provider-receipt-proof-missing",
          severity: "high",
        }),
        expect.objectContaining({
          id: "payroll-payment-allocations-missing",
          severity: "high",
        }),
        expect.objectContaining({
          id: "payroll-posted-runs-component-proof-missing",
          severity: "critical",
        }),
        expect.objectContaining({
          id: "payroll-posted-runs-composite-proof-missing",
          severity: "critical",
        }),
        expect.objectContaining({
          id: "payroll-posted-runs-certified-input-proof-missing",
          severity: "critical",
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
    );
    expect(result.moduleEvidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          module: "payroll",
          status: "blocked",
          facts: expect.arrayContaining([
            { label: "In-progress declarations", value: 1 },
            { label: "Declaration evidence gaps", value: 1 },
            { label: "Declaration register proof gaps", value: 1 },
            { label: "Declaration country-pack register proof gaps", value: 1 },
            { label: "Declaration composite register proof gaps", value: 1 },
            { label: "Declaration adapter proof gaps", value: 1 },
            { label: "Declaration lifecycle proof gaps", value: 1 },
            { label: "Declaration amendments", value: 1 },
            { label: "Payment reconciliation evidence gaps", value: 1 },
            { label: "Payment register proof gaps", value: 1 },
            { label: "Payment component proof gaps", value: 1 },
            { label: "Payment composite proof gaps", value: 1 },
            { label: "Payment adapter proof gaps", value: 1 },
            { label: "Payment provider receipt proof gaps", value: 1 },
            { label: "Payment allocation gaps", value: 1 },
            { label: "Posted run component proof gaps", value: 1 },
            { label: "Posted run composite proof gaps", value: 1 },
            { label: "Posted run certified input proof gaps", value: 1 },
            { label: "Run lines missing payslips", value: 2 },
            { label: "Payslips missing proof hashes", value: 1 },
            { label: "Paid runs missing settled payments", value: 1 },
          ]),
        }),
      ]),
    );
  });

  it("blocks certified trust packs when provider statement cadence is stale", async () => {
    seedCleanTrustData();
    mockDb.providerAccount.count.mockResolvedValue(1);
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
    ]);
    mockDb.statementFile.count.mockResolvedValue(1);
    mockDb.statementLine.count.mockResolvedValue(4);
    mockDb.reconciliationRun.count.mockResolvedValue(1);

    const result = await getAccountantPortalData(
      { organizationId: "org-1" },
      db,
      now,
    );

    expect(result.certificate.level).toBe("T2");
    expect(result.exportReadiness.canExportCertifiedPack).toBe(false);
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "provider-statement-cadence-stale",
          severity: "high",
          gate: "payments.provider-statement-cadence",
        }),
      ]),
    );
    expect(result.blockers).toEqual(
      expect.not.arrayContaining([
        expect.objectContaining({ id: "provider-statement-evidence-missing" }),
        expect.objectContaining({
          id: "provider-reconciliation-signoff-missing",
        }),
      ]),
    );
    expect(result.moduleEvidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          module: "payments",
          status: "blocked",
          facts: expect.arrayContaining([
            { label: "Stale statement accounts", value: 1 },
          ]),
        }),
      ]),
    );
  });

  it("clears payment trust-pack blockers when statement evidence and signed reconciliation are current", async () => {
    seedCleanTrustData();
    mockDb.providerAccount.count.mockResolvedValue(1);
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
    ]);
    mockDb.statementFile.count.mockResolvedValue(1);
    mockDb.statementLine.count.mockResolvedValue(4);
    mockDb.reconciliationRun.count.mockResolvedValue(1);

    const result = await getAccountantPortalData(
      { organizationId: "org-1" },
      db,
      now,
    );

    expect(result.certificate.level).toBe("T4");
    expect(result.exportReadiness.canExportCertifiedPack).toBe(true);
    expect(result.blockers).toEqual(
      expect.not.arrayContaining([
        expect.objectContaining({ id: "provider-statement-evidence-missing" }),
        expect.objectContaining({ id: "provider-statement-cadence-stale" }),
        expect.objectContaining({
          id: "provider-reconciliation-signoff-missing",
        }),
      ]),
    );
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
    );
  });

  it("blocks per-account coverage even when aggregate statement and signature counts are positive", async () => {
    seedCleanTrustData();
    const coverage = { version: 1, requiredAccountCount: 2, coveredAccountCount: 1, blockedAccountCount: 1, accounts: [{ providerAccountId: "missing-bank", accountName: "Bank B", currencyCode: "XAF", status: "BLOCKED", startDate: "2026-06-01", endDate: "2026-06-30", reasons: ["NO_ACTIVITY_EVIDENCE_REQUIRED"] }] };
    (readAccountCloseCoverage as jest.Mock).mockResolvedValue(coverage);
    const result = await getAccountantPortalData({ organizationId: "org-1", periodId: "period-1" }, db, now);
    expect(result.accountReconciliationCoverage).toEqual(coverage);
    expect(result.blockers).toEqual(expect.arrayContaining([expect.objectContaining({ id: "provider-account-coverage:missing-bank", severity: "high" })]));
    expect(result.moduleEvidence).toEqual(expect.arrayContaining([expect.objectContaining({ module: "payments", status: "blocked" })]));
    expect(result.exportReadiness.canExportCertifiedPack).toBe(false);
  });

  it("surfaces offline POS sync blockers in accountant trust evidence", async () => {
    seedCleanTrustData();
    mockDb.pOSOfflineEvent.count.mockResolvedValue(2);
    mockDb.pOSOfflineSyncConflict.count.mockResolvedValue(1);
    mockDb.pOSOfflineSyncCertificate.count.mockResolvedValue(1);

    const result = await getAccountantPortalData(
      { organizationId: "org-1" },
      db,
      now,
    );

    expect(result.exportReadiness.canExportCertifiedPack).toBe(false);
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
    );
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
    );
  });
});
