import {
  AccountingSourceType,
  PayrollDeclarationStatus,
  PayrollPaymentBatchStatus,
  PayrollPayslipLineCategory,
  PayrollPayslipStatus,
  PayrollRunStatus,
  Prisma,
} from "@prisma/client"

import { BusinessRuleError } from "@/services/_shared/action-errors"

import {
  getPayrollRegister,
  preparePayrollRegisterExport,
} from "../payroll-register.service"

function runRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "run-1",
    organizationId: "org-1",
    payrollPeriodId: "period-1",
    originalRunId: null,
    runNumber: "PAY-2026-06",
    runType: "ORDINARY",
    status: PayrollRunStatus.POSTED,
    version: 1,
    countryCode: "CM",
    countryPackVersion: "CM-2026.1",
    countryPackSchemaVersion: "2026-06",
    countryPackResolutionHash: "sha256:country-pack",
    countryPackCapabilityStatus: "SUPPORTED",
    ruleSetHash: "sha256:rules",
    calculationHash: "sha256:calculation",
    attendanceSnapshotHash: "sha256:attendance",
    grossAmount: new Prisma.Decimal("150000.00"),
    employeeDeductionAmount: new Prisma.Decimal("6300.00"),
    employerChargeAmount: new Prisma.Decimal("18300.00"),
    netPayableAmount: new Prisma.Decimal("143700.00"),
    currency: "XAF",
    documentHash: "sha256:run-doc",
    evidenceHash: "sha256:run-evidence",
    ledgerPostingBatchId: "ledger-run-1",
    postedBusinessEventId: "event-run-posted",
    journalEntryId: "journal-run-1",
    accountingSourceLinkId: "source-link-run-1",
    payrollPeriod: {
      id: "period-1",
      name: "June 2026",
      periodStart: new Date("2026-06-01T00:00:00.000Z"),
      periodEnd: new Date("2026-06-30T00:00:00.000Z"),
      payDate: new Date("2026-06-30T00:00:00.000Z"),
      accountingPeriodId: "acct-period-1",
    },
    lines: [
      {
        id: "run-line-1",
        organizationId: "org-1",
        payrollRunId: "run-1",
        employeeId: "emp-1",
        contractId: "contract-1",
        attendanceSnapshotId: "attendance-1",
        grossAmount: new Prisma.Decimal("150000.00"),
        taxableBaseAmount: new Prisma.Decimal("150000.00"),
        socialBaseAmount: new Prisma.Decimal("150000.00"),
        employeeDeductionAmount: new Prisma.Decimal("6300.00"),
        employerChargeAmount: new Prisma.Decimal("18300.00"),
        netPayableAmount: new Prisma.Decimal("143700.00"),
        currency: "XAF",
        calculationSnapshot: {},
        ruleProvenance: {},
        anomalyFlags: null,
        documentHash: "sha256:run-line-doc",
        metadata: null,
        employee: {
          id: "emp-1",
          employeeNumber: "EMP-001",
          displayName: "Alice Ngono",
          department: "Operations",
          jobTitle: "Store Manager",
          costCenter: "OPS",
        },
        payslip: {
          id: "payslip-1",
          organizationId: "org-1",
          payrollRunId: "run-1",
          runLineId: "run-line-1",
          employeeId: "emp-1",
          payslipNumber: "PAY-2026-06-0001",
          status: PayrollPayslipStatus.EMITTED,
          issuedAt: new Date("2026-06-30T00:00:00.000Z"),
          voidedAt: null,
          countryCode: "CM",
          countryPackVersion: "CM-2026.1",
          countryPackSchemaVersion: "2026-06",
          countryPackResolutionHash: "sha256:country-pack",
          ruleSetHash: "sha256:rules",
          grossAmount: new Prisma.Decimal("150000.00"),
          employeeDeductionAmount: new Prisma.Decimal("6300.00"),
          employerChargeAmount: new Prisma.Decimal("18300.00"),
          netPayableAmount: new Prisma.Decimal("143700.00"),
          currency: "XAF",
          documentHash: "sha256:payslip-doc",
          archiveUri: null,
          metadata: null,
          lines: [
            {
              id: "payslip-line-1",
              lineNumber: 1,
              code: "GROSS",
              label: "Gross",
              category: PayrollPayslipLineCategory.EARNING,
              baseAmount: null,
              rateBps: null,
              amount: new Prisma.Decimal("150000.00"),
              currency: "XAF",
              sourceType: "PayrollRunLine",
              sourceId: "run-line-1",
              metadata: null,
            },
          ],
          paymentAllocations: [
            {
              id: "allocation-1",
              organizationId: "org-1",
              payrollPaymentBatchId: "payment-batch-1",
              employeeId: "emp-1",
              payslipId: "payslip-1",
              amount: new Prisma.Decimal("143700.00"),
              currency: "XAF",
              metadata: null,
              createdAt: new Date("2026-06-30T00:00:00.000Z"),
              payrollPaymentBatch: {
                id: "payment-batch-1",
                batchNumber: "PB-2026-06",
                status: PayrollPaymentBatchStatus.RELEASED,
                documentHash: "sha256:payment-doc",
                evidenceHash: "sha256:payment-evidence",
                bankFileHash: "sha256:bank-file",
                ledgerPostingBatchId: "ledger-payment-1",
                postedBusinessEventId: "event-payment-posted",
                reconciliationStatus: "MATCHED",
              },
            },
          ],
        },
      },
    ],
    declarations: [
      {
        id: "declaration-1",
        organizationId: "org-1",
        payrollRunId: "run-1",
        authority: "CNPS",
        declarationType: "SOCIAL_CONTRIBUTION",
        status: PayrollDeclarationStatus.PREPARED,
        periodStart: new Date("2026-06-01T00:00:00.000Z"),
        periodEnd: new Date("2026-06-30T00:00:00.000Z"),
        dueDate: new Date("2026-07-15T00:00:00.000Z"),
        countryCode: "CM",
        countryPackVersion: "CM-2026.1",
        countryPackSchemaVersion: "2026-06",
        countryPackResolutionHash: "sha256:country-pack",
        amount: new Prisma.Decimal("24600.00"),
        currency: "XAF",
        payloadHash: "sha256:declaration-payload",
        metadata: null,
      },
    ],
    paymentBatches: [
      {
        id: "payment-batch-1",
        organizationId: "org-1",
        payrollRunId: "run-1",
        batchNumber: "PB-2026-06",
        status: PayrollPaymentBatchStatus.RELEASED,
        method: "BANK_TRANSFER",
        amount: new Prisma.Decimal("143700.00"),
        currency: "XAF",
        paymentDate: new Date("2026-06-30T00:00:00.000Z"),
        bankFileHash: "sha256:bank-file",
        documentHash: "sha256:payment-doc",
        evidenceHash: "sha256:payment-evidence",
        ledgerPostingBatchId: "ledger-payment-1",
        postedBusinessEventId: "event-payment-posted",
        paymentTransactionId: null,
        paymentExceptionId: null,
        reconciliationStatus: "MATCHED",
        allocations: [
          {
            id: "allocation-1",
            organizationId: "org-1",
            payrollPaymentBatchId: "payment-batch-1",
            employeeId: "emp-1",
            payslipId: "payslip-1",
            amount: new Prisma.Decimal("143700.00"),
            currency: "XAF",
            metadata: null,
          },
        ],
      },
    ],
    _count: {
      lines: 1,
      payslips: 1,
      paymentBatches: 1,
      declarations: 1,
    },
    ...overrides,
  }
}

function sourceLinks() {
  return [
    {
      id: "source-link-run-1",
      postingBatchId: "ledger-run-1",
      journalEntryId: "journal-run-1",
      sourceType: AccountingSourceType.PAYROLL_RUN,
      sourceId: "run-1",
      sourceNumber: "PAY-2026-06",
      sourceDate: new Date("2026-06-30T00:00:00.000Z"),
    },
    {
      id: "source-link-payment-1",
      postingBatchId: "ledger-payment-1",
      journalEntryId: "journal-payment-1",
      sourceType: AccountingSourceType.PAYROLL_PAYMENT,
      sourceId: "payment-batch-1",
      sourceNumber: "PB-2026-06",
      sourceDate: new Date("2026-06-30T00:00:00.000Z"),
    },
  ]
}

function buildClient(row = runRow(), links = sourceLinks()) {
  return {
    payrollRun: {
      findFirst: jest.fn().mockResolvedValue(row),
    },
    accountingSourceLink: {
      findMany: jest.fn().mockResolvedValue(links),
    },
    closeRun: {
      findFirst: jest.fn().mockResolvedValue({ id: "close-run-1", status: "READY" }),
    },
    closeEvidenceItem: {
      count: jest.fn().mockResolvedValue(3),
    },
    closeAssuranceFinding: {
      count: jest.fn().mockResolvedValue(0),
    },
    auditLog: {
      create: jest.fn().mockResolvedValue({ id: "audit-1" }),
    },
    businessEvent: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
        id: "business-event-1",
        ...data,
      })),
      update: jest.fn(),
    },
  }
}

describe("payroll register service", () => {
  it("ties the register to payslips, payments, declarations, ledger links, and close evidence", async () => {
    const client = buildClient()

    const result = await getPayrollRegister(
      {
        organizationId: "org-1",
        actorId: "controller-1",
        actorPermissions: ["payroll.reports.read", "payroll.payslips.read"],
        payrollRunId: "run-1",
      },
      client as any,
    )

    expect(client.payrollRun.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ organizationId: "org-1", id: "run-1", deletedAt: null }),
    }))
    expect(result.summary).toEqual(expect.objectContaining({
      lineCount: 1,
      payslipCount: 1,
      paymentBatchCount: 1,
      declarationCount: 1,
      netPayableAmount: "143700.00",
      paidAmount: "143700.00",
      declaredAmount: "24600.00",
      registerHash: expect.stringMatching(/^sha256:/),
    }))
    expect(result.tieOut.runLines.status).toBe("MATCHED")
    expect(result.tieOut.payslips.status).toBe("MATCHED")
    expect(result.tieOut.payments.status).toBe("MATCHED")
    expect(result.tieOut.declarations.status).toBe("MATCHED")
    expect(result.tieOut.ledger).toEqual(expect.objectContaining({
      status: "MATCHED",
      runSourceLinked: true,
      paymentSourceLinked: true,
    }))
    expect(result.tieOut.close).toEqual(expect.objectContaining({
      status: "MATCHED",
      closeRunId: "close-run-1",
      evidenceCount: 3,
    }))
    expect(result.rows[0]).toEqual(expect.objectContaining({
      payslipId: "payslip-1",
      tieOut: { payslip: "MATCHED", payment: "MATCHED", ledger: "MATCHED" },
    }))
    expect(result.blockers).toEqual([])
    expect(client.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        action: "PAYROLL_REGISTER_READ",
        entityType: "PayrollRegister",
        entityId: "run-1",
      }),
    }))
  })

  it("redacts salary amounts while preserving server-owned tie-out status", async () => {
    const client = buildClient()

    const result = await getPayrollRegister(
      {
        organizationId: "org-1",
        actorId: "report-reader-1",
        actorPermissions: ["payroll.reports.read"],
        payrollRunId: "run-1",
      },
      client as any,
    )

    expect(result.redaction.payrollAmounts.allowed).toBe(false)
    expect(result.summary.netPayableAmount).toBe("[REDACTED:PAYROLL]")
    expect(result.rows[0].amounts.netPayableAmount).toBe("[REDACTED:PAYROLL]")
    expect(result.tieOut.payments.status).toBe("MATCHED")
    expect(JSON.stringify(result)).not.toContain("bankAccount")
  })

  it("surfaces blockers when source-link and payment evidence are incomplete", async () => {
    const row = runRow({
      ledgerPostingBatchId: null,
      postedBusinessEventId: null,
      paymentBatches: [],
      _count: { lines: 1, payslips: 1, paymentBatches: 0, declarations: 1 },
    }) as any
    row.lines[0].payslip.paymentAllocations = []
    const client = buildClient(row, [])

    const result = await getPayrollRegister(
      {
        organizationId: "org-1",
        actorId: "controller-1",
        actorPermissions: ["payroll.reports.read", "payroll.payslips.read"],
        payrollRunId: "run-1",
      },
      client as any,
    )

    expect(result.tieOut.ledger.status).toBe("MISSING")
    expect(result.rows[0].tieOut.payment).toBe("MISSING")
    expect(result.blockers.map((blocker) => blocker.code)).toEqual(expect.arrayContaining([
      "PAYROLL_REGISTER_LEDGER_SOURCE_LINK_MISSING",
      "PAYROLL_REGISTER_PAYMENT_TIEOUT_FAILED",
    ]))
  })

  it("exports a controlled watermarked register and records a business event", async () => {
    const client = buildClient()

    const result = await preparePayrollRegisterExport(
      {
        organizationId: "org-1",
        actorId: "controller-1",
        actorPermissions: ["payroll.reports.read", "payroll.payslips.read", "payroll.exports.create"],
        payrollRunId: "run-1",
        lastAuthAt: "2026-06-30T11:59:00.000Z",
        now: "2026-06-30T12:00:00.000Z",
      },
      client as any,
    )

    expect(result).toEqual(expect.objectContaining({
      payrollRunId: "run-1",
      mimeType: "application/json",
      contentHash: expect.stringMatching(/^sha256:/),
      registerHash: expect.stringMatching(/^sha256:/),
      watermarkId: expect.stringMatching(/^wm_[a-f0-9]{24}$/),
      businessEventId: "business-event-1",
    }))
    expect(result.content).toContain("AQSTOQFLOW_PAYROLL_REGISTER_TIE_OUT_EXPORT")
    expect(client.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        action: "CONTROLLED_EXPORT_ALLOWED",
        entityType: "PayrollRegister",
        entityId: "run-1",
      }),
    }))
    expect(client.businessEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        eventType: "payroll.register.exported",
        sourceType: "PAYROLL_REGISTER",
        sourceId: "run-1",
        documentHash: result.contentHash,
      }),
    }))
  })

  it("audits and blocks stale fresh-auth evidence for register export", async () => {
    const client = buildClient()

    await expect(
      preparePayrollRegisterExport(
        {
          organizationId: "org-1",
          actorId: "controller-1",
          actorPermissions: ["payroll.reports.read", "payroll.payslips.read", "payroll.exports.create"],
          payrollRunId: "run-1",
          lastAuthAt: "2026-06-30T11:50:00.000Z",
          now: "2026-06-30T12:00:00.000Z",
        },
        client as any,
      ),
    ).rejects.toBeInstanceOf(BusinessRuleError)

    expect(client.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        action: "CONTROLLED_EXPORT_DENIED",
        entityType: "PayrollRegister",
        entityId: "run-1",
        changes: expect.objectContaining({
          reasonCode: "FRESH_AUTH_REQUIRED",
        }),
      }),
    }))
    expect(client.businessEvent.create).not.toHaveBeenCalled()
  })
})
