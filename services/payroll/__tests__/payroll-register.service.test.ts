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
import { hashBusinessPayload } from "@/services/events/business-event.service"

import {
  getPayrollRegister,
  preparePayrollRegisterExport,
} from "../payroll-register.service"

function componentMappingFixture() {
  const payload = {
    kind: "AQSTOQFLOW_PAYROLL_COMPONENT_MAPPING" as const,
    version: 1 as const,
    payrollRunId: "run-1",
    runNumber: "PAY-2026-06",
    currency: "XAF",
    reviewStatus: "BLOCKED_REQUIRES_EXPERT_REVIEW",
    reviewDefault: "BLOCK_UNTIL_REVIEWED_FIXTURES" as const,
    taxableBaseAmount: "150000.00",
    incomeTaxWithholdingAmount: "0.00",
    statutoryPayableAmount: "24600.00",
    declarationLiabilityAmount: "26600.00",
    incomeTaxCalculationStatus: "BLOCKED_REQUIRES_EXPERT_REVIEW",
    incomeTaxApplied: false,
    incomeTaxWithholdingEnabled: false,
    blockedStatutoryComponentCount: 1,
    requiredLedgerMappingKeys: [
      "PAYROLL_GROSS_EXPENSE",
      "PAYROLL_EMPLOYER_CHARGE_EXPENSE",
      "EMPLOYEE_PAYABLES",
      "PAYROLL_WITHHOLDING_PAYABLE",
      "SOCIAL_CONTRIBUTIONS_PAYABLE",
    ],
  }

  return {
    ...payload,
    componentMappingHash: `sha256:${hashBusinessPayload(payload)}`,
  }
}

function statutoryScenarioCoverageFixture(overrides: Record<string, unknown> = {}) {
  return {
    status: "READY",
    countryCode: "CM",
    packVersion: "CM-2026.1",
    coverageHash: "sha256:statutory-scenario-coverage",
    executableScenarioCount: 12,
    readyFamilyCount: 9,
    requiredFamilyCount: 9,
    blockerCodes: [],
    reviewEvidence: {
      presentCount: 12,
      missingCount: 0,
      reviewedBy: ["Qualified Cameroon payroll tax reviewer"],
      reviewedOn: ["2026-06-28"],
      legalRefs: ["CM_DGI_CGI_2025"],
      sourceEvidenceHashes: ["sha256:cm-irpp-period-reviewed-review-evidence"],
    },
    ...overrides,
  }
}

function countryPackProvenanceFixture(overrides: Record<string, unknown> = {}) {
  const provenance = {
    kind: "AQSTOQFLOW_PAYROLL_LINE_COUNTRY_PACK_PROVENANCE",
    version: 1,
    countryCode: "CM",
    packVersion: "CM-2026.1",
    schemaVersion: "2026-06",
    capabilityStatus: "SUPPORTED",
    resolutionHash: "sha256:country-pack",
    statutoryScenarioCoverageHash: "sha256:statutory-scenario-coverage",
    statutoryScenarioCoverageStatus: "READY",
    reviewEvidenceSourceHashes: ["sha256:cm-irpp-period-reviewed-review-evidence"],
    legalRefs: ["CM_DGI_CGI_2025"],
    roundingPolicyHash: "sha256:rounding-policy",
    yearToDatePolicyHash: "sha256:ytd-policy",
    ...overrides,
  }

  return {
    provenance,
    provenanceHash: `sha256:${hashBusinessPayload(provenance)}`,
  }
}

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
    employerChargeAmount: new Prisma.Decimal("20300.00"),
    netPayableAmount: new Prisma.Decimal("143700.00"),
    currency: "XAF",
    documentHash: "sha256:run-doc",
    evidenceHash: "sha256:run-evidence",
    ledgerPostingBatchId: "ledger-run-1",
    postedBusinessEventId: "event-run-posted",
    journalEntryId: "journal-run-1",
    accountingSourceLinkId: "source-link-run-1",
    metadata: {
      statutoryScenarioCoverage: statutoryScenarioCoverageFixture(),
      statutoryScenarioCoverageHash: "sha256:statutory-scenario-coverage",
    },
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
        employerChargeAmount: new Prisma.Decimal("20300.00"),
        netPayableAmount: new Prisma.Decimal("143700.00"),
        currency: "XAF",
        calculationSnapshot: {
          baseSalary: "130000.00",
          baseGrossAmount: "117000.00",
          scheduledMinutes: 10000,
          workedMinutes: 8600,
          leaveMinutes: 1000,
          paidMinutes: 9000,
          overtimeMinutes: 500,
          overtimePremiumAmount: "5000.00",
          payrollRubriqueGrossAmount: "28000.00",
          payrollRubriqueTaxableBaseAmount: "28000.00",
          payrollRubriqueSocialBaseAmount: "28000.00",
          payrollRubriqueEmployeeDeductionAmount: "0.00",
          payrollRubriqueEmployerChargeAmount: "2000.00",
          payrollRubriqueComponents: [
            {
              assignmentId: "assign-transport",
              rubriqueId: "rubrique-transport",
              code: "TRANSPORT",
              label: "Transport allowance",
              kind: "EARNING",
              valueType: "FIXED_AMOUNT",
              amount: "28000.00",
              grossAmount: "28000.00",
              taxableBaseAmount: "28000.00",
              socialBaseAmount: "28000.00",
              employeeDeductionAmount: "0.00",
              employerChargeAmount: "0.00",
              netPayableImpactAmount: "28000.00",
              currency: "XAF",
              evidenceDocumentHashPresent: true,
              approvalBusinessEventId: "approval-transport",
            },
            {
              assignmentId: "assign-health",
              rubriqueId: "rubrique-health",
              code: "HEALTH",
              label: "Health benefit",
              kind: "EMPLOYER_CHARGE",
              valueType: "FORMULA_REFERENCE",
              amount: "2000.00",
              grossAmount: "0.00",
              taxableBaseAmount: "0.00",
              socialBaseAmount: "0.00",
              employeeDeductionAmount: "0.00",
              employerChargeAmount: "2000.00",
              netPayableImpactAmount: "0.00",
              currency: "XAF",
              evidenceDocumentHashPresent: true,
              approvalBusinessEventId: "approval-health",
              formulaTrace: {
                parameterPath: "payroll.compensation.benefits",
                calculationMode: "RATE_BPS",
                payrollEffect: "EMPLOYER_CHARGE",
                componentCode: "HEALTH",
              },
            },
          ],
          grossAmount: "150000.00",
          taxableBaseAmount: "150000.00",
          socialBaseAmount: "150000.00",
          employeePensionContributionAmount: "6300.00",
          employerPensionContributionAmount: "6300.00",
          familyAllowanceContributionAmount: "10500.00",
          occupationalRiskContributionAmount: "1500.00",
          incomeTaxWithholdingAmount: null,
          incomeTaxCalculationStatus: "BLOCKED_REQUIRES_EXPERT_REVIEW",
          incomeTaxApplied: false,
          employeeDeductionAmount: "6300.00",
          employerChargeAmount: "20300.00",
          netPayableAmount: "143700.00",
          currency: "XAF",
          countryCode: "CM",
          countryPackVersion: "CM-2026.1",
          countryPackSchemaVersion: "2026-06",
          countryPackResolutionHash: "sha256:country-pack",
          countryPackCapabilityStatus: "SUPPORTED",
          countryPackProvenance: countryPackProvenanceFixture().provenance,
          countryPackProvenanceHash: countryPackProvenanceFixture().provenanceHash,
          roundingPolicyHash: "sha256:rounding-policy",
          yearToDatePolicy: {
            kind: "AQSTOQFLOW_PAYROLL_YEAR_TO_DATE_POLICY",
            version: 1,
            basis: "TENANT_FISCAL_YEAR",
            yearStartMonth: 1,
            yearStartDay: 1,
            periodStart: "2026-01-01T00:00:00.000Z",
            periodEnd: "2026-06-30T00:00:00.000Z",
            source: "organization_accounting_settings",
            ytdPolicyHash: "sha256:ytd-policy",
          },
          yearToDatePolicyHash: "sha256:ytd-policy",
          yearToDateProof: {
            kind: "AQSTOQFLOW_PAYROLL_YEAR_TO_DATE_ACCUMULATOR_PROOF",
            version: 1,
            accumulatorBasis:
              "POSTED_PAID_PRIOR_LINES_PLUS_CURRENT_EFFECTIVE_LINE",
            employeeId: "emp-1",
            currency: "XAF",
            currentPeriodId: "period-1",
            currentPayDate: "2026-06-30T00:00:00.000Z",
            correctionRun: false,
            yearToDatePolicyHash: "sha256:ytd-policy",
            ytdAccumulatorHash: "sha256:ytd-accumulator",
            policy: {
              kind: "AQSTOQFLOW_PAYROLL_YEAR_TO_DATE_POLICY",
              version: 1,
              basis: "TENANT_FISCAL_YEAR",
              yearStartMonth: 1,
              yearStartDay: 1,
              periodStart: "2026-01-01T00:00:00.000Z",
              periodEnd: "2026-06-30T00:00:00.000Z",
              source: "organization_accounting_settings",
              ytdPolicyHash: "sha256:ytd-policy",
            },
            priorLineCount: 5,
            missingPriorCalculationSnapshotCount: 0,
            missingPriorLineDocumentHashCount: 0,
          },
          yearToDateAccumulatorHash: "sha256:ytd-accumulator",
        },
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
          employerChargeAmount: new Prisma.Decimal("20300.00"),
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
        amount: new Prisma.Decimal("26600.00"),
        currency: "XAF",
        payloadHash: "sha256:declaration-payload",
        metadata: {
          payrollComponentMappingHash: componentMappingFixture().componentMappingHash,
          payrollComponentMappingStatus: "BLOCKED_REQUIRES_EXPERT_REVIEW",
          payload: {
            taxableBaseAmount: "150000.00",
            incomeTaxWithholdingAmount: "0.00",
            statutoryPayableAmount: "24600.00",
            declarationLiabilityAmount: "26600.00",
            payrollComponentMappingHash: componentMappingFixture().componentMappingHash,
            payrollComponentMappingStatus: "BLOCKED_REQUIRES_EXPERT_REVIEW",
          },
        },
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

function journalEntryLines() {
  const mapping = componentMappingFixture()
  const line = (lineNumber: number, mappingKey: string, debit: string, credit: string, components: string[]) => ({
    id: `journal-line-${lineNumber}`,
    journalEntryId: "journal-run-1",
    lineNumber,
    debit: new Prisma.Decimal(debit),
    credit: new Prisma.Decimal(credit),
    metadata: {
      mappingKey,
      payrollComponentMappingHash: mapping.componentMappingHash,
      payrollComponentMappingStatus: mapping.reviewStatus,
      payrollComponentMappingComponents: components,
      incomeTaxCalculationStatus: mapping.incomeTaxCalculationStatus,
      incomeTaxWithholdingEnabled: mapping.incomeTaxWithholdingEnabled,
      taxableBaseAmount: mapping.taxableBaseAmount,
      incomeTaxWithholdingAmount: mapping.incomeTaxWithholdingAmount,
      statutoryPayableAmount: mapping.statutoryPayableAmount,
      declarationLiabilityAmount: mapping.declarationLiabilityAmount,
    },
    journalEntry: {
      postingBatchId: "ledger-run-1",
      sourceType: AccountingSourceType.PAYROLL_RUN,
      sourceId: "run-1",
      postingPurpose: "PAYROLL_RUN",
    },
  })

  return [
    line(1, "PAYROLL_GROSS_EXPENSE", "150000.00", "0.00", [
      "grossAmount",
      "taxableBaseAmount",
      "overtimePremiumAmount",
      "payrollRubriqueGrossAmount",
    ]),
    line(2, "PAYROLL_EMPLOYER_CHARGE_EXPENSE", "20300.00", "0.00", [
      "employerPensionContributionAmount",
      "familyAllowanceContributionAmount",
      "occupationalRiskContributionAmount",
      "payrollRubriqueEmployerChargeAmount",
    ]),
    line(3, "EMPLOYEE_PAYABLES", "0.00", "143700.00", ["netPayableAmount"]),
    line(4, "PAYROLL_WITHHOLDING_PAYABLE", "0.00", "6300.00", [
      "employeePensionContributionAmount",
      "incomeTaxWithholdingAmount",
      "taxableBaseAmount",
    ]),
    line(5, "SOCIAL_CONTRIBUTIONS_PAYABLE", "0.00", "20300.00", [
      "employerPensionContributionAmount",
      "familyAllowanceContributionAmount",
      "occupationalRiskContributionAmount",
      "payrollRubriqueEmployerChargeAmount",
    ]),
  ]
}

function buildClient(row = runRow(), links = sourceLinks(), journalLines = journalEntryLines()) {
  return {
    payrollRun: {
      findFirst: jest.fn().mockResolvedValue(row),
    },
    accountingSourceLink: {
      findMany: jest.fn().mockResolvedValue(links),
    },
    journalEntryLine: {
      findMany: jest.fn().mockResolvedValue(journalLines),
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
      declaredAmount: "26600.00",
      registerHash: expect.stringMatching(/^sha256:/),
      componentTotals: expect.objectContaining({
        grossAmount: "150000.00",
        taxableBaseAmount: "150000.00",
        socialBaseAmount: "150000.00",
        employeePensionContributionAmount: "6300.00",
        employerPensionContributionAmount: "6300.00",
        familyAllowanceContributionAmount: "10500.00",
        occupationalRiskContributionAmount: "1500.00",
        incomeTaxWithholdingAmount: "0.00",
        overtimePremiumAmount: "5000.00",
        payrollRubriqueGrossAmount: "28000.00",
        payrollRubriqueTaxableBaseAmount: "28000.00",
        payrollRubriqueSocialBaseAmount: "28000.00",
        payrollRubriqueEmployeeDeductionAmount: "0.00",
        payrollRubriqueEmployerChargeAmount: "2000.00",
        employeeDeductionAmount: "6300.00",
        employerChargeAmount: "20300.00",
        netPayableAmount: "143700.00",
        blockedStatutoryComponentCount: 1,
      }),
    }))
    expect(result.payrollRun.statutoryScenarioCoverage).toEqual(expect.objectContaining({
      status: "READY",
      coverageHash: "sha256:statutory-scenario-coverage",
      presentCount: 12,
      missingCount: 0,
      sourceEvidenceHashes: ["sha256:cm-irpp-period-reviewed-review-evidence"],
    }))
    expect(result.tieOut.runLines.status).toBe("MATCHED")
    expect(result.tieOut.payslips.status).toBe("MATCHED")
    expect(result.tieOut.payments.status).toBe("MATCHED")
    expect(result.tieOut.declarations.status).toBe("MATCHED")
    expect(result.tieOut.components).toEqual(expect.objectContaining({
      status: "MATCHED",
      checkedLineCount: 1,
      matchedLineCount: 1,
      blockedStatutoryComponentCount: 1,
    }))
    expect(result.tieOut.componentMapping).toEqual(expect.objectContaining({
      status: "MATCHED",
      taxableBaseAmount: "150000.00",
      incomeTaxWithholdingAmount: "0.00",
      statutoryPayableAmount: "24600.00",
      declarationLiabilityAmount: "26600.00",
      declarationLiabilityDeltaAmount: "0.00",
      ledgerPostingLineCount: 5,
      ledgerMappedLineCount: 5,
      missingLedgerMappingKeys: [],
      componentMappingHash: componentMappingFixture().componentMappingHash,
      declarationComponentMappingHashes: [componentMappingFixture().componentMappingHash],
      ledgerComponentMappingHashes: [componentMappingFixture().componentMappingHash],
      incomeTaxCalculationStatus: "BLOCKED_REQUIRES_EXPERT_REVIEW",
      incomeTaxWithholdingEnabled: false,
    }))
    expect(result.tieOut.ledger).toEqual(expect.objectContaining({
      status: "MATCHED",
      runSourceLinked: true,
      paymentSourceLinked: true,
      journalEntryLineCount: 5,
      expectedDebitAmount: "170300.00",
      actualDebitAmount: "170300.00",
      debitDeltaAmount: "0.00",
      expectedCreditAmount: "170300.00",
      actualCreditAmount: "170300.00",
      creditDeltaAmount: "0.00",
      balanceDeltaAmount: "0.00",
      missingMappingKeys: [],
      unmappedLineCount: 0,
      unhashedLineCount: 0,
      postingPurposeMatched: true,
      sourceMatched: true,
    }))
    expect(result.tieOut.close).toEqual(expect.objectContaining({
      status: "MATCHED",
      closeRunId: "close-run-1",
      evidenceCount: 3,
    }))
    expect(result.rows[0]).toEqual(expect.objectContaining({
      payslipId: "payslip-1",
      components: expect.objectContaining({
        employeePensionContributionAmount: "6300.00",
        employerPensionContributionAmount: "6300.00",
        familyAllowanceContributionAmount: "10500.00",
        occupationalRiskContributionAmount: "1500.00",
        overtimePremiumAmount: "5000.00",
        payrollRubriqueGrossAmount: "28000.00",
        payrollRubriqueEmployerChargeAmount: "2000.00",
        incomeTaxCalculationStatus: "BLOCKED_REQUIRES_EXPERT_REVIEW",
        incomeTaxApplied: false,
      }),
      tieOut: expect.objectContaining({ payslip: "MATCHED", payment: "MATCHED", ledger: "MATCHED", components: "MATCHED" }),
      proof: expect.objectContaining({
        countryPack: expect.objectContaining({
          status: "MATCHED",
          issues: [],
          countryCode: "CM",
          countryPackVersion: "CM-2026.1",
          countryPackSchemaVersion: "2026-06",
          countryPackCapabilityStatus: "SUPPORTED",
          countryPackResolutionHash: "sha256:country-pack",
          statutoryScenarioCoverageHash: "sha256:statutory-scenario-coverage",
          statutoryScenarioCoverageStatus: "READY",
          provenanceHash: expect.stringMatching(/^sha256:/),
          computedHash: expect.stringMatching(/^sha256:/),
        }),
        yearToDate: expect.objectContaining({
          status: "MATCHED",
          policyHash: "sha256:ytd-policy",
          accumulatorHash: "sha256:ytd-accumulator",
          periodStart: "2026-01-01T00:00:00.000Z",
          periodEnd: "2026-06-30T00:00:00.000Z",
          priorLineCount: 5,
          missingPriorCalculationSnapshotCount: 0,
          missingPriorLineDocumentHashCount: 0,
        }),
      }),
      componentProof: expect.objectContaining({
        status: "MATCHED",
        issues: [],
        componentEvidenceHash: expect.stringMatching(/^sha256:/),
        effectiveComponents: expect.arrayContaining([
          expect.objectContaining({ family: "TAXABLE_ALLOWANCE", status: "MATCHED", amount: "28000.00", componentCodes: ["TRANSPORT"] }),
          expect.objectContaining({ family: "BENEFIT_IN_KIND", status: "MATCHED", amount: "2000.00", employerChargeAmount: "2000.00", componentCodes: ["HEALTH"] }),
          expect.objectContaining({ family: "PAID_LEAVE", status: "MATCHED", amount: "5200.00", quantity: "400" }),
          expect.objectContaining({ family: "UNPAID_LEAVE", status: "MATCHED", amount: "7800.00", quantity: "600" }),
          expect.objectContaining({ family: "OVERTIME", status: "MATCHED", amount: "5000.00", quantity: "500" }),
        ]),
      }),
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

  it("blocks register readiness when effective-dated component detail is missing", async () => {
    const row = runRow() as any
    delete row.lines[0].calculationSnapshot.payrollRubriqueComponents
    const client = buildClient(row)

    const result = await getPayrollRegister(
      {
        organizationId: "org-1",
        actorId: "controller-1",
        actorPermissions: ["payroll.reports.read", "payroll.payslips.read"],
        payrollRunId: "run-1",
      },
      client as any,
    )

    expect(result.tieOut.components).toEqual(expect.objectContaining({
      status: "MISSING",
      missingLineCount: 1,
      matchedLineCount: 0,
    }))
    expect(result.rows[0].componentProof.issues).toEqual(expect.arrayContaining([
      "missing:payrollRubriqueComponents",
    ]))
    expect(result.blockers.map((blocker) => blocker.code)).toContain("PAYROLL_REGISTER_COMPONENT_PROOF_MISSING")
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
    expect(result.summary.componentTotals.employeePensionContributionAmount).toBe("[REDACTED:PAYROLL]")
    expect(result.rows[0].amounts.netPayableAmount).toBe("[REDACTED:PAYROLL]")
    expect(result.rows[0].components.employeePensionContributionAmount).toBe("[REDACTED:PAYROLL]")
    expect(result.rows[0].componentProof.effectiveComponents.find((component) => component.family === "TAXABLE_ALLOWANCE")?.amount).toBe("[REDACTED:PAYROLL]")
    expect(result.rows[0].componentProof.status).toBe("MATCHED")
    expect(result.rows[0].components.incomeTaxCalculationStatus).toBe("BLOCKED_REQUIRES_EXPERT_REVIEW")
    expect(result.tieOut.payments.status).toBe("MATCHED")
    expect(result.tieOut.components.status).toBe("MATCHED")
    expect(JSON.stringify(result)).not.toContain("bankAccount")
  })

  it("blocks register readiness when statutory component proof is missing", async () => {
    const row = runRow() as any
    row.lines[0].calculationSnapshot = {}
    const client = buildClient(row)

    const result = await getPayrollRegister(
      {
        organizationId: "org-1",
        actorId: "controller-1",
        actorPermissions: ["payroll.reports.read", "payroll.payslips.read"],
        payrollRunId: "run-1",
      },
      client as any,
    )

    expect(result.tieOut.components).toEqual(expect.objectContaining({
      status: "MISSING",
      missingLineCount: 1,
      matchedLineCount: 0,
    }))
    expect(result.rows[0].tieOut.components).toBe("MISSING")
    expect(result.rows[0].componentProof.issues).toEqual(expect.arrayContaining([
      "missing:grossAmount",
      "missing:employeePensionContributionAmount",
      "missing:incomeTaxCalculationStatus",
    ]))
    expect(result.blockers.map((blocker) => blocker.code)).toContain("PAYROLL_REGISTER_COMPONENT_PROOF_MISSING")
  })

  it("blocks register readiness when line country-pack provenance is missing", async () => {
    const row = runRow() as any
    delete row.lines[0].calculationSnapshot.countryPackProvenance
    delete row.lines[0].calculationSnapshot.countryPackProvenanceHash
    const client = buildClient(row)

    const result = await getPayrollRegister(
      {
        organizationId: "org-1",
        actorId: "controller-1",
        actorPermissions: ["payroll.reports.read", "payroll.payslips.read"],
        payrollRunId: "run-1",
      },
      client as any,
    )

    expect(result.rows[0].proof.countryPack).toEqual(expect.objectContaining({
      status: "MISSING",
      issues: expect.arrayContaining([
        "missing:countryPackProvenance",
        "missing:statutoryScenarioCoverageHash",
        "missing:countryPackProvenanceHash",
      ]),
    }))
    expect(result.rows[0].tieOut.components).toBe("MATCHED")
    expect(result.blockers.map((blocker) => blocker.code)).toContain("PAYROLL_REGISTER_COUNTRY_PACK_PROOF_MISSING")
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

  it("blocks register readiness when component mapping is missing from ledger posting lines", async () => {
    const client = buildClient(runRow(), sourceLinks(), [])

    const result = await getPayrollRegister(
      {
        organizationId: "org-1",
        actorId: "controller-1",
        actorPermissions: ["payroll.reports.read", "payroll.payslips.read"],
        payrollRunId: "run-1",
      },
      client as any,
    )

    expect(result.tieOut.componentMapping.status).toBe("MISSING")
    expect(result.tieOut.componentMapping.missingLedgerMappingKeys).toEqual([
      "PAYROLL_GROSS_EXPENSE",
      "PAYROLL_EMPLOYER_CHARGE_EXPENSE",
      "EMPLOYEE_PAYABLES",
      "PAYROLL_WITHHOLDING_PAYABLE",
      "SOCIAL_CONTRIBUTIONS_PAYABLE",
    ])
    expect(result.blockers.map((blocker) => blocker.code)).toContain("PAYROLL_REGISTER_COMPONENT_MAPPING_MISSING")
  })
  it("blocks register readiness when payroll ledger contains unmapped extra lines", async () => {
    const mappedLines = journalEntryLines()
    const extraLine = (id: string, lineNumber: number, debit: string, credit: string) => ({
      ...mappedLines[0],
      id,
      lineNumber,
      debit: new Prisma.Decimal(debit),
      credit: new Prisma.Decimal(credit),
      metadata: {},
    })
    const client = buildClient(runRow(), sourceLinks(), [
      ...mappedLines,
      extraLine("journal-line-extra-debit", 6, "100.00", "0.00"),
      extraLine("journal-line-extra-credit", 7, "0.00", "100.00"),
    ])

    const result = await getPayrollRegister(
      {
        organizationId: "org-1",
        actorId: "controller-1",
        actorPermissions: ["payroll.reports.read", "payroll.payslips.read"],
        payrollRunId: "run-1",
      },
      client as any,
    )

    expect(result.tieOut.componentMapping.status).toBe("MATCHED")
    expect(result.tieOut.ledger).toEqual(expect.objectContaining({
      status: "MISMATCH",
      journalEntryLineCount: 7,
      expectedDebitAmount: "170300.00",
      actualDebitAmount: "170400.00",
      debitDeltaAmount: "100.00",
      expectedCreditAmount: "170300.00",
      actualCreditAmount: "170400.00",
      creditDeltaAmount: "100.00",
      balanceDeltaAmount: "0.00",
      missingMappingKeys: [],
      unmappedLineCount: 2,
      unhashedLineCount: 2,
      postingPurposeMatched: true,
      sourceMatched: true,
    }))
    expect(result.blockers.map((blocker) => blocker.code)).toContain("PAYROLL_REGISTER_LEDGER_TIEOUT_MISMATCH")
  })

  it("blocks register readiness when statutory scenario review evidence is missing from run metadata", async () => {
    const client = buildClient(runRow({ metadata: {} }))

    const result = await getPayrollRegister(
      {
        organizationId: "org-1",
        actorId: "controller-1",
        actorPermissions: ["payroll.reports.read", "payroll.payslips.read"],
        payrollRunId: "run-1",
      },
      client as any,
    )

    expect(result.payrollRun.statutoryScenarioCoverage).toEqual(expect.objectContaining({
      status: null,
      coverageHash: null,
      presentCount: 0,
      missingCount: 0,
    }))
    expect(result.blockers.map((blocker) => blocker.code)).toContain(
      "PAYROLL_REGISTER_STATUTORY_REVIEW_EVIDENCE_MISSING",
    )
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
