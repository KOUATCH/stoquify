import {
  PayrollDeclarationStatus,
  PayrollPayslipLineCategory,
  PayrollPayslipStatus,
  PayrollPaymentBatchStatus,
  PayrollRunStatus,
  Prisma,
} from "@prisma/client"

import { BusinessRuleError, NotFoundError } from "@/services/_shared/action-errors"

import {
  getPayrollPayslipSelfService,
  preparePayrollPayslipExport,
} from "../payslip-self-service.service"

function employeeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "emp-1",
    organizationId: "org-1",
    userId: "employee-user-1",
    employeeNumber: "EMP-001",
    displayName: "Alice Ngono",
    status: "ACTIVE",
    countryCode: "CM",
    department: "Operations",
    jobTitle: "Store Manager",
    costCenter: "OPS",
    paymentDestinationHash: "sha256:payment-destination",
    ...overrides,
  }
}

function payslipRow(overrides: Record<string, unknown> = {}) {
  return {
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
    createdAt: new Date("2026-06-30T00:00:00.000Z"),
    updatedAt: new Date("2026-06-30T00:00:00.000Z"),
    employee: employeeRow(),
    payrollRun: {
      id: "run-1",
      runNumber: "PAY-2026-06",
      status: PayrollRunStatus.POSTED,
      countryPackCapabilityStatus: "SUPPORTED",
      calculationHash: "sha256:calculation",
      documentHash: "sha256:run-doc",
      evidenceHash: "sha256:run-evidence",
      ledgerPostingBatchId: "ledger-batch-1",
      postedBusinessEventId: "event-posted-1",
      payrollPeriod: {
        id: "period-1",
        name: "June 2026",
        periodStart: new Date("2026-06-01T00:00:00.000Z"),
        periodEnd: new Date("2026-06-30T00:00:00.000Z"),
        payDate: new Date("2026-06-30T00:00:00.000Z"),
      },
      declarations: [
        {
          id: "declaration-1",
          authority: "CNPS",
          declarationType: "SOCIAL_CONTRIBUTION",
          status: PayrollDeclarationStatus.PREPARED,
          payloadHash: "sha256:declaration-payload",
          countryPackResolutionHash: "sha256:country-pack",
        },
      ],
    },
    runLine: {
      id: "run-line-1",
      documentHash: "sha256:run-line-doc",
    },
    lines: [
      {
        id: "payslip-line-1",
        organizationId: "org-1",
        payslipId: "payslip-1",
        lineNumber: 1,
        code: "GROSS",
        label: "Gross pay",
        category: PayrollPayslipLineCategory.EARNING,
        baseAmount: null,
        rateBps: null,
        amount: new Prisma.Decimal("150000.00"),
        currency: "XAF",
        sourceType: "PayrollRunLine",
        sourceId: "run-line-1",
        metadata: null,
        createdAt: new Date("2026-06-30T00:00:00.000Z"),
      },
      {
        id: "payslip-line-2",
        organizationId: "org-1",
        payslipId: "payslip-1",
        lineNumber: 2,
        code: "NET_PAYABLE",
        label: "Net payable",
        category: PayrollPayslipLineCategory.INFORMATION,
        baseAmount: null,
        rateBps: null,
        amount: new Prisma.Decimal("143700.00"),
        currency: "XAF",
        sourceType: "PayrollRunLine",
        sourceId: "run-line-1",
        metadata: null,
        createdAt: new Date("2026-06-30T00:00:00.000Z"),
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
          ledgerPostingBatchId: "payment-ledger-1",
          postedBusinessEventId: "payment-event-1",
          reconciliationStatus: "MATCHED",
        },
      },
    ],
    ...overrides,
  }
}

function buildClient(rows: unknown[] = [payslipRow()]) {
  return {
    payrollEmployee: {
      findMany: jest.fn().mockResolvedValue([employeeRow()]),
    },
    payrollPayslip: {
      findMany: jest.fn().mockResolvedValue(rows),
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

describe("payroll payslip self-service service", () => {
  it("returns only the authenticated employee's immutable payslips and audits salary access", async () => {
    const client = buildClient()

    const result = await getPayrollPayslipSelfService(
      {
        organizationId: "org-1",
        actorId: "employee-user-1",
        actorPermissions: ["payroll.payslips.self.read"],
      },
      client as any,
    )

    expect(client.payrollEmployee.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-1",
          userId: "employee-user-1",
          deletedAt: null,
        }),
        take: 2,
      }),
    )
    expect(client.payrollPayslip.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-1",
          employeeId: "emp-1",
          status: PayrollPayslipStatus.EMITTED,
        }),
      }),
    )
    expect(result.payslips[0].amounts.netPayableAmount).toBe("143700.00")
    expect(result.payslips[0].proof.archiveManifestHash).toMatch(/^sha256:/)
    expect(result.payslips[0].tieOut).toMatchObject({
      payrollRunId: "run-1",
      ledgerPostingBatchId: "ledger-batch-1",
      paymentStatus: "SETTLED_OR_RELEASED",
    })
    expect(JSON.stringify(result)).not.toContain("bankAccount")
    expect(JSON.stringify(result)).not.toContain("taxIdentifier")
    expect(client.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "PAYROLL_PAYSLIP_SELF_SERVICE_READ",
          userId: "employee-user-1",
          organizationId: "org-1",
        }),
      }),
    )
  })

  it("does not return a payslip outside the authenticated employee scope", async () => {
    const client = buildClient([])

    await expect(
      getPayrollPayslipSelfService(
        {
          organizationId: "org-1",
          actorId: "employee-user-1",
          actorPermissions: ["payroll.payslips.self.read"],
          payslipId: "other-employee-payslip",
        },
        client as any,
      ),
    ).rejects.toBeInstanceOf(NotFoundError)

    expect(client.payrollPayslip.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          employeeId: "emp-1",
          id: "other-employee-payslip",
        }),
      }),
    )
  })

  it("audits and blocks payslip export when fresh auth evidence is stale", async () => {
    const client = buildClient()

    await expect(
      preparePayrollPayslipExport(
        {
          organizationId: "org-1",
          actorId: "employee-user-1",
          actorPermissions: ["payroll.payslips.self.read", "payroll.payslips.self.export"],
          payslipId: "payslip-1",
          lastAuthAt: "2026-06-30T11:50:00.000Z",
          now: "2026-06-30T12:00:00.000Z",
        },
        client as any,
      ),
    ).rejects.toBeInstanceOf(BusinessRuleError)

    expect(client.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "CONTROLLED_EXPORT_DENIED",
          entityType: "PayrollPayslip",
          entityId: "payslip-1",
          changes: expect.objectContaining({
            reasonCode: "FRESH_AUTH_REQUIRED",
          }),
        }),
      }),
    )
    expect(client.businessEvent.create).not.toHaveBeenCalled()
  })

  it("exports a watermarked immutable archive manifest and records a business event", async () => {
    const client = buildClient()

    const result = await preparePayrollPayslipExport(
      {
        organizationId: "org-1",
        actorId: "employee-user-1",
        actorPermissions: ["payroll.payslips.self.read", "payroll.payslips.self.export"],
        payslipId: "payslip-1",
        lastAuthAt: "2026-06-30T11:59:00.000Z",
        now: "2026-06-30T12:00:00.000Z",
      },
      client as any,
    )

    expect(result).toEqual(expect.objectContaining({
      payslipId: "payslip-1",
      mimeType: "application/json",
      contentHash: expect.stringMatching(/^sha256:/),
      archiveManifestHash: expect.stringMatching(/^sha256:/),
      watermarkId: expect.stringMatching(/^wm_[a-f0-9]{24}$/),
      businessEventId: "business-event-1",
    }))
    expect(result.content).toContain("AQSTOQFLOW_PAYSLIP_SELF_SERVICE_ARCHIVE_EXPORT")
    expect(result.content).toContain("NOT_GENERATED_NO_APPROVED_PAYROLL_PDF_RENDERER")
    expect(client.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "CONTROLLED_EXPORT_ALLOWED",
          entityType: "PayrollPayslip",
          entityId: "payslip-1",
        }),
      }),
    )
    expect(client.businessEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: "payroll.payslip.exported",
          sourceType: "PAYROLL_PAYSLIP",
          sourceId: "payslip-1",
          documentHash: result.contentHash,
        }),
      }),
    )
  })
})
