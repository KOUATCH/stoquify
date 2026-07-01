#!/usr/bin/env node

const { createHash } = require("crypto")
const { existsSync, readFileSync } = require("fs")
const { resolve } = require("path")
const argon2 = require("argon2")
const {
  AccountingPostingPurpose,
  AccountingSetupStatus,
  AccountingSourceType,
  LedgerPostingBatchStatus,
  Locale,
  MatchRule,
  MatchStatus,
  PaymentDirection,
  PaymentMethod,
  PaymentRailType,
  PaymentTransactionState,
  ProviderAccountStatus,
  ProviderEventStatus,
  ReconciliationRunStatus,
  StatementFileStatus,
  StatementLineDirection,
  StatementLineStatus,
  PayrollAttendanceSnapshotStatus,
  PayrollContractStatus,
  PayrollContractType,
  PayrollDeclarationStatus,
  PayrollEmployeeBalanceCaseStatus,
  PayrollEmployeeBalanceCaseType,
  PayrollEmployeeBalanceEventType,
  PayrollEmployeeStatus,
  PayrollFrequency,
  PayrollPaymentBatchStatus,
  PayrollPaymentDestinationChangeStatus,
  PayrollPayslipLineCategory,
  PayrollPayslipStatus,
  PayrollPeriodStatus,
  PayrollRubriqueAssignmentStatus,
  PayrollRubriqueKind,
  PayrollRubriqueStatus,
  PayrollRubriqueValueType,
  PayrollRunStatus,
  PayrollRunType,
  PrismaClient,
} = require("@prisma/client")

function loadLocalEnv() {
  for (const envPath of [resolve(process.cwd(), ".env.local"), resolve(process.cwd(), ".env")]) {
    if (!existsSync(envPath)) continue

    for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) continue

      const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
      if (!match || process.env[match[1]] !== undefined) continue

      let value = match[2].trim()
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      process.env[match[1]] = value
        .replace(/\${([A-Za-z_][A-Za-z0-9_]*)}/g, (_, key) => process.env[key] || "")
        .replace(/\\n/g, "\n")
    }
  }
}

loadLocalEnv()

const prisma = new PrismaClient()

const DEMO_ONLY_NOTICE =
  "Demo-only payroll browser fixture. This is not production payroll backfill and must not be used for statutory truth."
const ORGANIZATION_ID = process.env.AQSTOQFLOW_E2E_ORG_ID || "org_payroll_e2e_local"
const ORGANIZATION_SLUG = process.env.AQSTOQFLOW_E2E_ORG_SLUG || "aqstoqflow-payroll-e2e-local"
const ROLE_CODE = "PAYROLL_E2E"
const REQUESTER_ROLE_CODE = "PAYROLL_E2E_REQUESTER"
const DEFAULT_USER_ID = "usr_payroll_e2e_local"
const DEFAULT_REQUESTER_USER_ID = "usr_payroll_e2e_requester_local"
const EMAIL = (process.env.AQSTOQFLOW_E2E_EMAIL || "hr.manager@stockflow.test").trim().toLowerCase()
const REQUESTER_EMAIL = (process.env.AQSTOQFLOW_E2E_REQUESTER_EMAIL || "payroll.requester@stockflow.test").trim().toLowerCase()
const PASSWORD = process.env.AQSTOQFLOW_E2E_PASSWORD || "HrManager@2026"
const REQUESTER_PASSWORD = process.env.AQSTOQFLOW_E2E_REQUESTER_PASSWORD || PASSWORD
const REQUESTED_MODULES = ["payroll", "accounting"]
const DEMO_MOBILE_MONEY_PROVIDER = process.env.AQSTOQFLOW_E2E_MOBILE_MONEY_PROVIDER || ["MTN", "MOMO"].join("_")
const PAYROLL_SMOKE_PERMISSIONS = [
  "dashboard.read",
  "payments.reconciliation.read",
  "payments.reconciliation.match",
  "payments.reconciliation.exception.resolve",
  "payroll.read",
  "payroll.command.read",
  "payroll.payment_destination.read",
  "payroll.attendance.readiness.read",
  "payroll.compensation.read",
  "payroll.contracts.read",
  "payroll.employees.read",
  "payroll.payslips.read",
  "payroll.payslips.self.read",
  "payroll.reports.read",
  "payroll.runs.calculate",
  "payroll.payments.release",
  "payroll.payments.reconcile",
  "PAYROLL_READ",
  "PAYROLL_REPORTS_READ",
  "PAYROLL_ANALYTICS_READ",
  "PAYROLL_PROCESS",
  "EMPLOYEE_SALARY_READ",
]
const PAYROLL_REQUESTER_PERMISSIONS = [
  "dashboard.read",
  "payroll.read",
  "payroll.command.read",
  "payroll.payments.request",
  "payroll.reports.read",
]

const PERIOD_START = new Date("2026-06-01T00:00:00.000Z")
const PERIOD_END = new Date("2026-06-30T23:59:59.999Z")
const PAY_DATE = new Date("2026-06-30T12:00:00.000Z")
const FIXTURE_PREFIX = "payroll_e2e_browser_2026_06"
const EMPLOYEE_NUMBER = "PAY-BROWSER-001"
const RUN_NUMBER = "PAY-BROWSER-RUN-2026-06"
const PAYSLIP_NUMBER = "PAYSLIP-DEMO-2026-06-001"
const PAYMENT_BATCH_NUMBER = "PAY-BROWSER-PAY-2026-06"
const PAYMENT_RECON_BATCH_NUMBER = "PAY-BROWSER-RECON-PAY-2026-06"
const UNPAID_PERIOD_START = new Date("2026-07-01T00:00:00.000Z")
const UNPAID_PERIOD_END = new Date("2026-07-31T23:59:59.999Z")
const UNPAID_PAY_DATE = new Date("2026-07-31T12:00:00.000Z")
const UNPAID_RUN_NUMBER = "PAY-BROWSER-UNPAID-RUN-2026-07"
const UNPAID_PAYSLIP_NUMBER = "PAYSLIP-DEMO-2026-07-001"
const COUNTRY_PACK = {
  countryCode: "CM",
  version: "CM-DEMO-PAYROLL-BROWSER-2026.06",
  schemaVersion: "demo.payroll-browser.v1",
  capabilityStatus: "DEMO_ONLY_NOT_STATUTORY_TRUTH",
  resolutionHash: sha256("demo-only-payroll-browser-country-pack-2026-06"),
}

function assertLocalSeedAllowed() {
  const productionMarkers = [process.env.NODE_ENV, process.env.AQSTOQFLOW_ENV, process.env.VERCEL_ENV]
    .map((value) => (value || "").toLowerCase())

  if (productionMarkers.includes("production")) {
    throw new Error(`${DEMO_ONLY_NOTICE} Refusing to run while an environment marker is production.`)
  }
}

async function hashPassword(password) {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  })
}

function sha256(value) {
  return `sha256:${createHash("sha256").update(String(value)).digest("hex")}`
}

function demoMetadata(extra = {}) {
  return {
    demoOnly: true,
    productionBackfill: false,
    fixtureSource: "scripts/seed-payroll-e2e-user.js",
    fixturePurpose: "authenticated payroll browser smoke",
    warning: DEMO_ONLY_NOTICE,
    ...extra,
  }
}

function updateData(data) {
  const copy = { ...data }
  delete copy.id
  return copy
}

async function upsertFirst(tx, delegateName, where, create, update = updateData(create)) {
  const delegate = tx[delegateName]
  const existing = await delegate.findFirst({ where, select: { id: true } })
  if (existing) return delegate.update({ where: { id: existing.id }, data: update })
  return delegate.create({ data: create })
}

async function findOrCreateFirst(tx, delegateName, where, create) {
  const delegate = tx[delegateName]
  const existing = await delegate.findFirst({ where })
  if (existing) return existing
  return delegate.create({ data: create })
}

async function upsertDemoOrganization(tx, now) {
  const existing = await tx.organization.findFirst({
    where: { OR: [{ id: ORGANIZATION_ID }, { slug: ORGANIZATION_SLUG }] },
  })

  const update = {
    name: "AqStoqFlow Payroll Browser Demo",
    industry: "Local browser validation",
    country: "Cameroon",
    countryCode: "CM",
    currency: "XAF",
    timezone: "Africa/Douala",
    defaultLocale: Locale.EN,
    requestedModules: { set: REQUESTED_MODULES },
    onboardingSource: "local-playwright-payroll-browser-demo",
    onboardingCompletedAt: now,
    isActive: true,
    deletedAt: null,
    updatedAt: now,
  }

  if (existing) return tx.organization.update({ where: { id: existing.id }, data: update })

  return tx.organization.create({
    data: {
      id: ORGANIZATION_ID,
      slug: ORGANIZATION_SLUG,
      ...update,
    },
  })
}

async function upsertAccountingSettings(tx, organizationId, now) {
  const settingsId = `acct_settings_${organizationId.replace(/[^A-Za-z0-9_]/g, "_")}`
  await tx.$executeRawUnsafe(
    `INSERT INTO "organization_accounting_settings"
      ("id", "organizationId", "accountingEnabled", "setupStatus", "countryPack", "baseCurrency", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4::"AccountingSetupStatus", $5, $6, $7, $8)
     ON CONFLICT ("organizationId") DO UPDATE SET
       "accountingEnabled" = EXCLUDED."accountingEnabled",
       "setupStatus" = EXCLUDED."setupStatus",
       "countryPack" = EXCLUDED."countryPack",
       "baseCurrency" = EXCLUDED."baseCurrency",
       "updatedAt" = EXCLUDED."updatedAt"`,
    settingsId,
    organizationId,
    true,
    AccountingSetupStatus.READY,
    COUNTRY_PACK.version,
    "XAF",
    now,
    now,
  )
}

async function seedPayrollFixtures(tx, organizationId, userId, requesterUserId, now) {
  const employee = await upsertFirst(
    tx,
    "payrollEmployee",
    {
      organizationId,
      OR: [{ id: `${FIXTURE_PREFIX}_employee` }, { userId }, { employeeNumber: EMPLOYEE_NUMBER }],
    },
    {
      id: `${FIXTURE_PREFIX}_employee`,
      organizationId,
      userId,
      employeeNumber: EMPLOYEE_NUMBER,
      displayName: "HR Manager Payroll Demo",
      legalName: "HR Manager Payroll Demo",
      status: PayrollEmployeeStatus.ACTIVE,
      hireDate: new Date("2026-01-01T00:00:00.000Z"),
      countryCode: COUNTRY_PACK.countryCode,
      department: "People Operations",
      jobTitle: "Payroll Browser Demo Manager",
      costCenter: "PAYROLL-DEMO",
      taxIdentifierMasked: "M********001",
      taxIdentifierHash: sha256("payroll-browser-demo-tax-id"),
      socialIdentifierMasked: "CNPS********001",
      socialIdentifierHash: sha256("payroll-browser-demo-social-id"),
      paymentMethod: PaymentMethod.MOBILE_MONEY,
      mobileMoneyProvider: DEMO_MOBILE_MONEY_PROVIDER,
      mobileMoneyPhoneMasked: "+237 6** *** 001",
      mobileMoneyPhoneHash: sha256("payroll-browser-demo-mobile-money-phone"),
      paymentDestinationHash: sha256("payroll-browser-demo-payment-destination"),
      metadata: demoMetadata({ fixtureModel: "PayrollEmployee" }),
      deletedAt: null,
    },
  )

  const contract = await upsertFirst(
    tx,
    "payrollContract",
    {
      organizationId,
      OR: [{ id: `${FIXTURE_PREFIX}_contract` }, { contractNumber: "PAY-BROWSER-CDI-001" }],
    },
    {
      id: `${FIXTURE_PREFIX}_contract`,
      organizationId,
      employeeId: employee.id,
      contractNumber: "PAY-BROWSER-CDI-001",
      type: PayrollContractType.CDI,
      status: PayrollContractStatus.ACTIVE,
      effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
      baseSalary: "350000.00",
      currency: "XAF",
      workingHoursPerMonth: "173.33",
      classification: "Demo payroll browser validation",
      signedDocumentHash: sha256("payroll-browser-demo-contract-signed"),
      metadata: demoMetadata({ fixtureModel: "PayrollContract" }),
      deletedAt: null,
    },
  )

  const rubrique = await upsertFirst(
    tx,
    "payrollRubrique",
    {
      organizationId,
      OR: [{ id: `${FIXTURE_PREFIX}_rubrique_base` }, { code: "DEMO_BASE_PAY" }],
    },
    {
      id: `${FIXTURE_PREFIX}_rubrique_base`,
      organizationId,
      code: "DEMO_BASE_PAY",
      label: "Demo base salary",
      description: DEMO_ONLY_NOTICE,
      kind: PayrollRubriqueKind.EARNING,
      valueType: PayrollRubriqueValueType.FIXED_AMOUNT,
      status: PayrollRubriqueStatus.ACTIVE,
      taxableBase: true,
      socialBase: true,
      employerCharge: false,
      payslipLabel: "Base salary",
      countryCode: COUNTRY_PACK.countryCode,
      countryPackVersion: COUNTRY_PACK.version,
      countryPackSchemaVersion: COUNTRY_PACK.schemaVersion,
      countryPackResolutionHash: COUNTRY_PACK.resolutionHash,
      countryPackCapabilityStatus: COUNTRY_PACK.capabilityStatus,
      metadata: demoMetadata({ fixtureModel: "PayrollRubrique" }),
      deletedAt: null,
    },
  )

  await upsertFirst(
    tx,
    "payrollEmployeeRubriqueAssignment",
    { organizationId, id: `${FIXTURE_PREFIX}_assignment_base` },
    {
      id: `${FIXTURE_PREFIX}_assignment_base`,
      organizationId,
      employeeId: employee.id,
      rubriqueId: rubrique.id,
      status: PayrollRubriqueAssignmentStatus.ACTIVE,
      amount: "350000.00",
      currency: "XAF",
      effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
      evidenceDocumentHash: sha256("payroll-browser-demo-rubrique-assignment"),
      metadata: demoMetadata({ fixtureModel: "PayrollEmployeeRubriqueAssignment" }),
      deletedAt: null,
    },
  )

  await upsertFirst(
    tx,
    "payrollPaymentDestinationChangeRequest",
    { organizationId, id: `${FIXTURE_PREFIX}_payment_destination` },
    {
      id: `${FIXTURE_PREFIX}_payment_destination`,
      organizationId,
      employeeId: employee.id,
      status: PayrollPaymentDestinationChangeStatus.APPLIED,
      paymentMethod: PaymentMethod.MOBILE_MONEY,
      mobileMoneyProvider: DEMO_MOBILE_MONEY_PROVIDER,
      mobileMoneyPhoneMasked: "+237 6** *** 001",
      mobileMoneyPhoneHash: sha256("payroll-browser-demo-mobile-money-phone"),
      paymentDestinationHash: sha256("payroll-browser-demo-payment-destination"),
      requestedById: userId,
      approvedById: userId,
      appliedById: userId,
      requestedAt: now,
      approvedAt: now,
      appliedAt: now,
      requestReason: "Demo-only payroll browser smoke fixture.",
      decisionReason: "Approved only for local browser validation.",
      evidenceDocumentHash: sha256("payroll-browser-demo-payment-destination-evidence"),
      approvalEvidenceHash: sha256("payroll-browser-demo-payment-destination-approval"),
      metadata: demoMetadata({ fixtureModel: "PayrollPaymentDestinationChangeRequest" }),
      deletedAt: null,
    },
  )

  const period = await upsertFirst(
    tx,
    "payrollPeriod",
    {
      organizationId,
      OR: [{ id: `${FIXTURE_PREFIX}_period` }, { periodStart: PERIOD_START, periodEnd: PERIOD_END }],
    },
    {
      id: `${FIXTURE_PREFIX}_period`,
      organizationId,
      name: "June 2026 demo payroll browser period",
      frequency: PayrollFrequency.MONTHLY,
      periodStart: PERIOD_START,
      periodEnd: PERIOD_END,
      payDate: PAY_DATE,
      status: PayrollPeriodStatus.POSTED,
      countryCode: COUNTRY_PACK.countryCode,
      countryPackVersion: COUNTRY_PACK.version,
      countryPackSchemaVersion: COUNTRY_PACK.schemaVersion,
      countryPackResolutionHash: COUNTRY_PACK.resolutionHash,
      countryPackCapabilityStatus: COUNTRY_PACK.capabilityStatus,
      inputLockedAt: now,
      inputLockedById: userId,
      approvedAt: now,
      approvedById: userId,
      metadata: demoMetadata({ fixtureModel: "PayrollPeriod" }),
    },
  )

  const attendance = await upsertFirst(
    tx,
    "payrollAttendanceSnapshot",
    { organizationId, id: `${FIXTURE_PREFIX}_attendance` },
    {
      id: `${FIXTURE_PREFIX}_attendance`,
      organizationId,
      payrollPeriodId: period.id,
      employeeId: employee.id,
      status: PayrollAttendanceSnapshotStatus.FROZEN,
      periodStart: PERIOD_START,
      periodEnd: PERIOD_END,
      scheduledMinutes: 10400,
      workedMinutes: 10400,
      overtimeMinutes: 0,
      absenceMinutes: 0,
      leaveMinutes: 0,
      sourceHash: sha256("payroll-browser-demo-attendance-source"),
      frozenById: userId,
      frozenAt: now,
      metadata: demoMetadata({ fixtureModel: "PayrollAttendanceSnapshot" }),
    },
  )

  const calculationSnapshot = {
    grossAmount: "350000.00",
    taxableBaseAmount: "350000.00",
    socialBaseAmount: "350000.00",
    employeePensionContributionAmount: "15000.00",
    employerPensionContributionAmount: "18000.00",
    familyAllowanceContributionAmount: "5000.00",
    occupationalRiskContributionAmount: "2000.00",
    incomeTaxWithholdingAmount: null,
    incomeTaxCalculationStatus: "NOT_APPLIED_DEMO_ONLY",
    incomeTaxApplied: false,
    employeeDeductionAmount: "15000.00",
    employerChargeAmount: "25000.00",
    netPayableAmount: "335000.00",
    currency: "XAF",
    demoOnly: true,
    productionBackfill: false,
  }

  const run = await findOrCreateFirst(
    tx,
    "payrollRun",
    {
      organizationId,
      OR: [
        { id: `${FIXTURE_PREFIX}_run` },
        { runNumber: RUN_NUMBER },
        { idempotencyKey: "payroll-browser-demo-run-2026-06" },
      ],
    },
    {
      id: `${FIXTURE_PREFIX}_run`,
      organizationId,
      payrollPeriodId: period.id,
      runNumber: RUN_NUMBER,
      runType: PayrollRunType.ORDINARY,
      status: PayrollRunStatus.DRAFT,
      version: 1,
      countryCode: COUNTRY_PACK.countryCode,
      countryPackVersion: COUNTRY_PACK.version,
      countryPackSchemaVersion: COUNTRY_PACK.schemaVersion,
      countryPackResolutionHash: COUNTRY_PACK.resolutionHash,
      countryPackCapabilityStatus: COUNTRY_PACK.capabilityStatus,
      ruleSetHash: sha256("payroll-browser-demo-rule-set"),
      calculationHash: sha256(JSON.stringify(calculationSnapshot)),
      attendanceSnapshotHash: attendance.sourceHash,
      grossAmount: "350000.00",
      employeeDeductionAmount: "15000.00",
      employerChargeAmount: "25000.00",
      netPayableAmount: "335000.00",
      currency: "XAF",
      idempotencyKey: "payroll-browser-demo-run-2026-06",
      documentHash: sha256("payroll-browser-demo-run-document"),
      evidenceHash: sha256("payroll-browser-demo-run-evidence"),
      preparedById: userId,
      reviewedById: userId,
      approvedById: userId,
      emittedById: userId,
      postedById: userId,
      approvedAt: now,
      emittedAt: now,
      postedAt: now,
      metadata: demoMetadata({ fixtureModel: "PayrollRun" }),
      deletedAt: null,
    },
  )

  const runLine = await findOrCreateFirst(
    tx,
    "payrollRunLine",
    {
      organizationId,
      OR: [{ id: `${FIXTURE_PREFIX}_run_line` }, { payrollRunId: run.id, employeeId: employee.id }],
    },
    {
      id: `${FIXTURE_PREFIX}_run_line`,
      organizationId,
      payrollRunId: run.id,
      employeeId: employee.id,
      contractId: contract.id,
      attendanceSnapshotId: attendance.id,
      grossAmount: "350000.00",
      taxableBaseAmount: "350000.00",
      socialBaseAmount: "350000.00",
      employeeDeductionAmount: "15000.00",
      employerChargeAmount: "25000.00",
      netPayableAmount: "335000.00",
      currency: "XAF",
      calculationSnapshot,
      ruleProvenance: demoMetadata({ fixtureModel: "PayrollRunLine", countryPack: COUNTRY_PACK, legalClaim: "none" }),
      documentHash: sha256("payroll-browser-demo-run-line-document"),
      metadata: demoMetadata({ fixtureModel: "PayrollRunLine" }),
    },
  )

  const payslip = await findOrCreateFirst(
    tx,
    "payrollPayslip",
    {
      organizationId,
      OR: [{ id: `${FIXTURE_PREFIX}_payslip` }, { payslipNumber: PAYSLIP_NUMBER }, { runLineId: runLine.id }],
    },
    {
      id: `${FIXTURE_PREFIX}_payslip`,
      organizationId,
      payrollRunId: run.id,
      runLineId: runLine.id,
      employeeId: employee.id,
      payslipNumber: PAYSLIP_NUMBER,
      status: PayrollPayslipStatus.DRAFT,
      issuedAt: now,
      countryCode: COUNTRY_PACK.countryCode,
      countryPackVersion: COUNTRY_PACK.version,
      countryPackSchemaVersion: COUNTRY_PACK.schemaVersion,
      countryPackResolutionHash: COUNTRY_PACK.resolutionHash,
      ruleSetHash: sha256("payroll-browser-demo-rule-set"),
      grossAmount: "350000.00",
      employeeDeductionAmount: "15000.00",
      employerChargeAmount: "25000.00",
      netPayableAmount: "335000.00",
      currency: "XAF",
      documentHash: sha256("payroll-browser-demo-payslip-document"),
      archiveUri: null,
      metadata: demoMetadata({ fixtureModel: "PayrollPayslip" }),
    },
  )

  const payslipLines = [
    {
      id: `${FIXTURE_PREFIX}_payslip_line_1`,
      lineNumber: 1,
      code: "DEMO_BASE_PAY",
      label: "Base salary",
      category: PayrollPayslipLineCategory.EARNING,
      baseAmount: "350000.00",
      amount: "350000.00",
    },
    {
      id: `${FIXTURE_PREFIX}_payslip_line_2`,
      lineNumber: 2,
      code: "DEMO_EMPLOYEE_PENSION",
      label: "Employee pension demo deduction",
      category: PayrollPayslipLineCategory.EMPLOYEE_DEDUCTION,
      baseAmount: "350000.00",
      amount: "15000.00",
    },
    {
      id: `${FIXTURE_PREFIX}_payslip_line_3`,
      lineNumber: 3,
      code: "DEMO_EMPLOYER_CHARGE",
      label: "Employer charge demo information",
      category: PayrollPayslipLineCategory.EMPLOYER_CHARGE,
      baseAmount: "350000.00",
      amount: "25000.00",
    },
  ]

  for (const line of payslipLines) {
    await findOrCreateFirst(
      tx,
      "payrollPayslipLine",
      {
        organizationId,
        OR: [{ id: line.id }, { payslipId: payslip.id, lineNumber: line.lineNumber }],
      },
      {
        id: line.id,
        organizationId,
        payslipId: payslip.id,
        lineNumber: line.lineNumber,
        code: line.code,
        label: line.label,
        category: line.category,
        baseAmount: line.baseAmount,
        amount: line.amount,
        currency: "XAF",
        sourceType: "PayrollRunLine",
        sourceId: runLine.id,
        metadata: demoMetadata({ fixtureModel: "PayrollPayslipLine" }),
      },
    )
  }

  if (payslip.status !== PayrollPayslipStatus.EMITTED) {
    await tx.payrollPayslip.update({ where: { id: payslip.id }, data: { status: PayrollPayslipStatus.EMITTED, issuedAt: now } })
  }

  const declaration = await findOrCreateFirst(
    tx,
    "payrollDeclaration",
    {
      organizationId,
      OR: [
        { id: `${FIXTURE_PREFIX}_declaration` },
        { payrollRunId: run.id, authority: "CNPS", declarationType: "DEMO_MONTHLY_SOCIAL" },
      ],
    },
    {
      id: `${FIXTURE_PREFIX}_declaration`,
      organizationId,
      payrollRunId: run.id,
      authority: "CNPS",
      declarationType: "DEMO_MONTHLY_SOCIAL",
      status: PayrollDeclarationStatus.PREPARED,
      periodStart: PERIOD_START,
      periodEnd: PERIOD_END,
      dueDate: new Date("2026-07-15T00:00:00.000Z"),
      countryCode: COUNTRY_PACK.countryCode,
      countryPackVersion: COUNTRY_PACK.version,
      countryPackSchemaVersion: COUNTRY_PACK.schemaVersion,
      countryPackResolutionHash: COUNTRY_PACK.resolutionHash,
      amount: "40000.00",
      currency: "XAF",
      payloadHash: sha256("payroll-browser-demo-declaration-payload"),
      metadata: demoMetadata({ fixtureModel: "PayrollDeclaration", productionSubmissionSupported: false }),
    },
  )

  const paymentBatch = await findOrCreateFirst(
    tx,
    "payrollPaymentBatch",
    {
      organizationId,
      OR: [
        { id: `${FIXTURE_PREFIX}_payment_recon_batch` },
        { batchNumber: PAYMENT_RECON_BATCH_NUMBER },
        { idempotencyKey: "payroll-browser-demo-payment-recon-2026-06" },
      ],
    },
    {
      id: `${FIXTURE_PREFIX}_payment_recon_batch`,
      organizationId,
      payrollRunId: run.id,
      batchNumber: PAYMENT_RECON_BATCH_NUMBER,
      status: PayrollPaymentBatchStatus.DRAFT,
      method: PaymentMethod.MOBILE_MONEY,
      amount: "335000.00",
      currency: "XAF",
      paymentDate: PAY_DATE,
      idempotencyKey: "payroll-browser-demo-payment-recon-2026-06",
      documentHash: sha256("payroll-browser-demo-payment-recon-document"),
      evidenceHash: sha256("payroll-browser-demo-payment-recon-evidence"),
      requestedById: requesterUserId,
      approvedById: userId,
      releasedById: userId,
      approvedAt: now,
      releasedAt: now,
      reconciliationStatus: "DEMO_RELEASED_NOT_BANK_RECONCILED",
      notes: DEMO_ONLY_NOTICE,
      metadata: demoMetadata({ fixtureModel: "PayrollPaymentBatch" }),
    },
  )

  await findOrCreateFirst(
    tx,
    "payrollPaymentAllocation",
    {
      organizationId,
      OR: [{ id: `${FIXTURE_PREFIX}_payment_recon_allocation` }, { payrollPaymentBatchId: paymentBatch.id, payslipId: payslip.id }],
    },
    {
      id: `${FIXTURE_PREFIX}_payment_recon_allocation`,
      organizationId,
      payrollPaymentBatchId: paymentBatch.id,
      employeeId: employee.id,
      payslipId: payslip.id,
      amount: "335000.00",
      currency: "XAF",
      metadata: demoMetadata({ fixtureModel: "PayrollPaymentAllocation" }),
    },
  )

  const paymentProofMetadata = {
    componentRegisterProofHash: sha256("payroll-browser-demo-component-register-proof"),
    componentRegisterProofStatus: "MATCHED",
    payrollComponentMappingHash: sha256("payroll-browser-demo-component-mapping-proof"),
    payrollComponentMappingStatus: "BLOCKED_REQUIRES_EXPERT_REVIEW",
    paymentAdapterProofHash: sha256("payroll-browser-demo-payment-adapter-proof"),
    paymentAdapterRegistryVersion: 1,
    paymentProviderAdapterContractHash: sha256("payroll-browser-demo-payment-adapter-contract"),
    paymentAdapterStatus: "MANUAL_PROVIDER_SETTLEMENT_REQUIRED",
    paymentProviderAdapterKey: "MOBILE_MONEY:MANUAL_DISBURSEMENT_FILE",
    providerSettlementProofRequired: true,
    productionPaymentAutomationSupported: false,
  }

  const paymentRail = await upsertFirst(
    tx,
    "paymentRail",
    {
      organizationId,
      OR: [{ id: `${FIXTURE_PREFIX}_payment_rail` }, { code: "PAYROLL_BROWSER_MOMO" }],
    },
    {
      id: `${FIXTURE_PREFIX}_payment_rail`,
      organizationId,
      type: PaymentRailType.MOBILE_MONEY,
      code: "PAYROLL_BROWSER_MOMO",
      name: "Payroll browser mobile money rail",
      countryCode: COUNTRY_PACK.countryCode,
      currencyCode: "XAF",
      adapterKey: paymentProofMetadata.paymentProviderAdapterKey,
      isActive: true,
      metadata: demoMetadata({ fixtureModel: "PaymentRail", payrollPaymentBatchId: paymentBatch.id }),
    },
  )

  const providerAccount = await upsertFirst(
    tx,
    "providerAccount",
    {
      organizationId,
      OR: [{ id: `${FIXTURE_PREFIX}_provider_account` }, { providerCode: "PAYROLL_BROWSER_MOMO" }],
    },
    {
      id: `${FIXTURE_PREFIX}_provider_account`,
      organizationId,
      paymentRailId: paymentRail.id,
      providerCode: "PAYROLL_BROWSER_MOMO",
      displayName: "Payroll browser mobile money settlement",
      status: ProviderAccountStatus.ACTIVE,
      countryCode: COUNTRY_PACK.countryCode,
      currencyCode: "XAF",
      externalAccountMasked: "PAYROLL****2026",
      externalAccountHash: sha256("payroll-browser-demo-provider-account"),
      statementSource: "demo-mobile-money-statement",
      metadata: demoMetadata({ fixtureModel: "ProviderAccount", payrollPaymentBatchId: paymentBatch.id }),
    },
  )

  await upsertFirst(
    tx,
    "ledgerPostingBatch",
    {
      organizationId,
      OR: [
        { id: `${FIXTURE_PREFIX}_ledger_payment_batch` },
        { idempotencyKey: "payroll-browser-demo-payment-ledger-batch-2026-06" },
        {
          sourceType: AccountingSourceType.PAYROLL_PAYMENT,
          sourceId: paymentBatch.id,
          postingPurpose: AccountingPostingPurpose.PAYROLL_PAYMENT,
        },
      ],
    },
    {
      id: `${FIXTURE_PREFIX}_ledger_payment_batch`,
      organizationId,
      sourceType: AccountingSourceType.PAYROLL_PAYMENT,
      sourceId: paymentBatch.id,
      postingPurpose: AccountingPostingPurpose.PAYROLL_PAYMENT,
      idempotencyKey: "payroll-browser-demo-payment-ledger-batch-2026-06",
      sourceVersion: 1,
      status: LedgerPostingBatchStatus.POSTED,
      errorMessage: null,
      metadata: demoMetadata({ fixtureModel: "LedgerPostingBatch", payrollPaymentBatchId: paymentBatch.id }),
      postedAt: now,
      reversedAt: null,
    },
  )
  const paymentTransaction = await upsertFirst(
    tx,
    "paymentTransaction",
    {
      organizationId,
      OR: [
        { id: `${FIXTURE_PREFIX}_payment_transaction` },
        { idempotencyKey: "payroll-browser-demo-payment-transaction-2026-06" },
        { providerAccountId: providerAccount.id, providerTransactionId: "MOMO-PAYROLL-2026-06-001" },
      ],
    },
    {
      id: `${FIXTURE_PREFIX}_payment_transaction`,
      organizationId,
      providerAccountId: providerAccount.id,
      ledgerPostingBatchId: `${FIXTURE_PREFIX}_ledger_payment_batch`,
      direction: PaymentDirection.OUTBOUND,
      state: PaymentTransactionState.CONFIRMED,
      amount: "335000.00",
      currencyCode: "XAF",
      providerTransactionId: "MOMO-PAYROLL-2026-06-001",
      providerReference: paymentBatch.batchNumber,
      idempotencyKey: "payroll-browser-demo-payment-transaction-2026-06",
      sourceType: "PAYROLL_PAYMENT",
      sourceId: paymentBatch.id,
      payloadHash: sha256("payroll-browser-demo-payment-transaction-payload"),
      occurredAt: PAY_DATE,
      confirmedAt: now,
      metadata: demoMetadata({ fixtureModel: "PaymentTransaction", payrollPaymentBatchId: paymentBatch.id }),
    },
  )

  const providerEvent = await upsertFirst(
    tx,
    "providerEvent",
    {
      organizationId,
      OR: [
        { id: `${FIXTURE_PREFIX}_provider_event` },
        { providerAccountId: providerAccount.id, providerEventId: "payroll-browser-provider-event-2026-06" },
      ],
    },
    {
      id: `${FIXTURE_PREFIX}_provider_event`,
      organizationId,
      providerAccountId: providerAccount.id,
      providerEventId: "payroll-browser-provider-event-2026-06",
      providerTransactionId: "MOMO-PAYROLL-2026-06-001",
      providerReference: paymentBatch.batchNumber,
      eventType: "SETTLEMENT_CONFIRMED",
      status: ProviderEventStatus.VERIFIED,
      direction: PaymentDirection.OUTBOUND,
      amount: "335000.00",
      currencyCode: "XAF",
      occurredAt: PAY_DATE,
      processedAt: now,
      idempotencyKey: "payroll-browser-provider-event-2026-06",
      rawPayload: {
        batchNumber: PAYMENT_RECON_BATCH_NUMBER,
        providerTransactionId: "MOMO-PAYROLL-2026-06-001",
        amount: "335000.00",
        currency: "XAF",
      },
      redactedPayload: {
        batchNumber: PAYMENT_RECON_BATCH_NUMBER,
        providerTransactionId: "MOMO-PAYROLL-2026-06-001",
      },
      rawPayloadHash: sha256("payroll-browser-demo-provider-event-payload"),
      signatureHash: sha256("payroll-browser-demo-provider-event-signature"),
      signatureValid: true,

    },
  )

  const statementFile = await upsertFirst(
    tx,
    "statementFile",
    {
      organizationId,
      OR: [
        { id: `${FIXTURE_PREFIX}_statement_file` },
        { providerAccountId: providerAccount.id, fileHash: sha256("payroll-browser-demo-statement-file") },
      ],
    },
    {
      id: `${FIXTURE_PREFIX}_statement_file`,
      organizationId,
      providerAccountId: providerAccount.id,
      sourceType: "DEMO_MOBILE_MONEY_CSV",
      fileName: "payroll-browser-demo-statement-2026-06.csv",
      fileHash: sha256("payroll-browser-demo-statement-file"),
      periodStart: PERIOD_START,
      periodEnd: PERIOD_END,
      status: StatementFileStatus.PROCESSED,
      importedById: userId,
      importedAt: now,
      correlationId: paymentTransaction.id,
      metadata: demoMetadata({ fixtureModel: "StatementFile", payrollPaymentBatchId: paymentBatch.id }),
    },
  )

  const statementLine = await upsertFirst(
    tx,
    "statementLine",
    {
      organizationId,
      OR: [
        { id: `${FIXTURE_PREFIX}_statement_line` },
        { providerAccountId: providerAccount.id, fingerprint: sha256("payroll-browser-demo-statement-line") },
      ],
    },
    {
      id: `${FIXTURE_PREFIX}_statement_line`,
      organizationId,
      statementFileId: statementFile.id,
      providerAccountId: providerAccount.id,
      fingerprint: sha256("payroll-browser-demo-statement-line"),
      lineNumber: 1,
      providerTransactionId: "MOMO-PAYROLL-2026-06-001",
      providerReference: paymentBatch.batchNumber,
      direction: StatementLineDirection.DEBIT,
      status: StatementLineStatus.MATCHED,
      amount: "335000.00",
      currencyCode: "XAF",
      occurredAt: PAY_DATE,
      postedAt: now,
      description: "Demo payroll mobile money settlement",
      rawLineHash: sha256("payroll-browser-demo-statement-line-raw"),
      metadata: demoMetadata({ fixtureModel: "StatementLine", payrollPaymentBatchId: paymentBatch.id }),
    },
  )

  const reconciliationRun = await upsertFirst(
    tx,
    "reconciliationRun",
    {
      organizationId,
      OR: [{ id: `${FIXTURE_PREFIX}_reconciliation_run` }, { providerAccountId: providerAccount.id, businessDate: PAY_DATE }],
    },
    {
      id: `${FIXTURE_PREFIX}_reconciliation_run`,
      organizationId,
      paymentRailId: paymentRail.id,
      providerAccountId: providerAccount.id,
      businessDate: PAY_DATE,
      periodStart: PERIOD_START,
      periodEnd: PERIOD_END,
      status: ReconciliationRunStatus.READY_FOR_SIGNOFF,
      totalInternalAmount: "335000.00",
      totalExternalAmount: "335000.00",
      matchedAmount: "335000.00",
      suspenseAmount: "0.00",
      exceptionCount: 0,
      matchCount: 1,
      runById: userId,
      correlationId: paymentTransaction.id,
      metadata: demoMetadata({ fixtureModel: "ReconciliationRun", payrollPaymentBatchId: paymentBatch.id }),
    },
  )

  await upsertFirst(
    tx,
    "matchRecord",
    {
      organizationId,
      OR: [
        { id: `${FIXTURE_PREFIX}_match_record` },
        {
          paymentTransactionId: paymentTransaction.id,
          providerEventId: providerEvent.id,
          statementLineId: statementLine.id,
          rule: MatchRule.EXACT_PROVIDER_REFERENCE,
        },
      ],
    },
    {
      id: `${FIXTURE_PREFIX}_match_record`,
      organizationId,
      providerAccountId: providerAccount.id,
      paymentTransactionId: paymentTransaction.id,
      providerEventId: providerEvent.id,
      statementLineId: statementLine.id,
      reconciliationRunId: reconciliationRun.id,
      ledgerPostingBatchId: `${FIXTURE_PREFIX}_ledger_payment_batch`,
      rule: MatchRule.EXACT_PROVIDER_REFERENCE,
      status: MatchStatus.APPROVED,
      confidence: "100.00",
      amountMatched: "335000.00",
      currencyCode: "XAF",
      matchedById: userId,
      matchedAt: now,
      correlationId: paymentTransaction.id,
      metadata: demoMetadata({ fixtureModel: "MatchRecord", payrollPaymentBatchId: paymentBatch.id }),
    },
  )

  const paymentBatchNeedsProofUpdate =
    paymentBatch.status !== PayrollPaymentBatchStatus.RELEASED ||
    paymentBatch.ledgerPostingBatchId !== `${FIXTURE_PREFIX}_ledger_payment_batch` ||
    paymentBatch.paymentTransactionId !== paymentTransaction.id ||
    paymentBatch.reconciliationStatus !== "READY_TO_SETTLE"

  if (paymentBatchNeedsProofUpdate) {
    await tx.payrollPaymentBatch.update({
      where: { id: paymentBatch.id },
      data: {
        status: PayrollPaymentBatchStatus.RELEASED,
        requestedById: requesterUserId,
        approvedById: userId,
        releasedById: userId,
        approvedAt: now,
        releasedAt: now,
        ledgerPostingBatchId: `${FIXTURE_PREFIX}_ledger_payment_batch`,
        postedBusinessEventId: `${FIXTURE_PREFIX}_payment_release_event`,
        paymentTransactionId: paymentTransaction.id,
        paymentExceptionId: null,
        reconciliationStatus: "READY_TO_SETTLE",
        bankFileHash: sha256("payroll-browser-demo-payment-bank-file"),
        metadata: demoMetadata({
          fixtureModel: "PayrollPaymentBatch",
          ledgerStatus: "POSTED",
          ...paymentProofMetadata,
        }),
      },
    })
  }

  if (run.status !== PayrollRunStatus.POSTED) {
    await tx.payrollRun.update({
      where: { id: run.id },
      data: {
        status: PayrollRunStatus.POSTED,
        preparedById: userId,
        reviewedById: userId,
        approvedById: userId,
        emittedById: userId,
        postedById: userId,
        approvedAt: now,
        emittedAt: now,
        postedAt: now,
      },
    })
  }

  const unpaidPeriod = await upsertFirst(
    tx,
    "payrollPeriod",
    {
      organizationId,
      OR: [{ id: `${FIXTURE_PREFIX}_unpaid_period` }, { periodStart: UNPAID_PERIOD_START, periodEnd: UNPAID_PERIOD_END }],
    },
    {
      id: `${FIXTURE_PREFIX}_unpaid_period`,
      organizationId,
      name: "July 2026 unpaid release drawer browser period",
      frequency: PayrollFrequency.MONTHLY,
      periodStart: UNPAID_PERIOD_START,
      periodEnd: UNPAID_PERIOD_END,
      payDate: UNPAID_PAY_DATE,
      status: PayrollPeriodStatus.POSTED,
      countryCode: COUNTRY_PACK.countryCode,
      countryPackVersion: COUNTRY_PACK.version,
      countryPackSchemaVersion: COUNTRY_PACK.schemaVersion,
      countryPackResolutionHash: COUNTRY_PACK.resolutionHash,
      countryPackCapabilityStatus: COUNTRY_PACK.capabilityStatus,
      inputLockedAt: now,
      inputLockedById: userId,
      approvedAt: now,
      approvedById: userId,
      metadata: demoMetadata({ fixtureModel: "PayrollPeriod", fixtureScenario: "unpaid-release-drawer" }),
    },
  )

  const unpaidAttendance = await upsertFirst(
    tx,
    "payrollAttendanceSnapshot",
    { organizationId, id: `${FIXTURE_PREFIX}_unpaid_attendance` },
    {
      id: `${FIXTURE_PREFIX}_unpaid_attendance`,
      organizationId,
      payrollPeriodId: unpaidPeriod.id,
      employeeId: employee.id,
      status: PayrollAttendanceSnapshotStatus.FROZEN,
      periodStart: UNPAID_PERIOD_START,
      periodEnd: UNPAID_PERIOD_END,
      scheduledMinutes: 10400,
      workedMinutes: 10400,
      overtimeMinutes: 0,
      absenceMinutes: 0,
      leaveMinutes: 0,
      sourceHash: sha256("payroll-browser-demo-unpaid-attendance-source"),
      frozenById: userId,
      frozenAt: now,
      metadata: demoMetadata({ fixtureModel: "PayrollAttendanceSnapshot", fixtureScenario: "unpaid-release-drawer" }),
    },
  )

  const unpaidCalculationSnapshot = {
    ...calculationSnapshot,
    fixtureScenario: "unpaid-release-drawer",
  }

  const unpaidRun = await findOrCreateFirst(
    tx,
    "payrollRun",
    {
      organizationId,
      OR: [
        { id: `${FIXTURE_PREFIX}_unpaid_run` },
        { runNumber: UNPAID_RUN_NUMBER },
        { idempotencyKey: "payroll-browser-demo-unpaid-run-2026-07" },
      ],
    },
    {
      id: `${FIXTURE_PREFIX}_unpaid_run`,
      organizationId,
      payrollPeriodId: unpaidPeriod.id,
      runNumber: UNPAID_RUN_NUMBER,
      runType: PayrollRunType.ORDINARY,
      status: PayrollRunStatus.DRAFT,
      version: 1,
      countryCode: COUNTRY_PACK.countryCode,
      countryPackVersion: COUNTRY_PACK.version,
      countryPackSchemaVersion: COUNTRY_PACK.schemaVersion,
      countryPackResolutionHash: COUNTRY_PACK.resolutionHash,
      countryPackCapabilityStatus: COUNTRY_PACK.capabilityStatus,
      ruleSetHash: sha256("payroll-browser-demo-unpaid-rule-set"),
      calculationHash: sha256(JSON.stringify(unpaidCalculationSnapshot)),
      attendanceSnapshotHash: unpaidAttendance.sourceHash,
      grossAmount: "350000.00",
      employeeDeductionAmount: "15000.00",
      employerChargeAmount: "25000.00",
      netPayableAmount: "335000.00",
      currency: "XAF",
      idempotencyKey: "payroll-browser-demo-unpaid-run-2026-07",
      documentHash: sha256("payroll-browser-demo-unpaid-run-document"),
      evidenceHash: sha256("payroll-browser-demo-unpaid-run-evidence"),
      preparedById: userId,
      reviewedById: requesterUserId,
      approvedById: userId,
      emittedById: userId,
      postedById: userId,
      approvedAt: now,
      emittedAt: now,
      postedAt: now,
      metadata: demoMetadata({ fixtureModel: "PayrollRun", fixtureScenario: "unpaid-release-drawer" }),
      deletedAt: null,
    },
  )

  const unpaidRunLine = await findOrCreateFirst(
    tx,
    "payrollRunLine",
    {
      organizationId,
      OR: [{ id: `${FIXTURE_PREFIX}_unpaid_run_line` }, { payrollRunId: unpaidRun.id, employeeId: employee.id }],
    },
    {
      id: `${FIXTURE_PREFIX}_unpaid_run_line`,
      organizationId,
      payrollRunId: unpaidRun.id,
      employeeId: employee.id,
      contractId: contract.id,
      attendanceSnapshotId: unpaidAttendance.id,
      grossAmount: "350000.00",
      taxableBaseAmount: "350000.00",
      socialBaseAmount: "350000.00",
      employeeDeductionAmount: "15000.00",
      employerChargeAmount: "25000.00",
      netPayableAmount: "335000.00",
      currency: "XAF",
      calculationSnapshot: unpaidCalculationSnapshot,
      ruleProvenance: demoMetadata({ fixtureModel: "PayrollRunLine", fixtureScenario: "unpaid-release-drawer", countryPack: COUNTRY_PACK, legalClaim: "none" }),
      documentHash: sha256("payroll-browser-demo-unpaid-run-line-document"),
      metadata: demoMetadata({ fixtureModel: "PayrollRunLine", fixtureScenario: "unpaid-release-drawer" }),
    },
  )

  const unpaidPayslip = await findOrCreateFirst(
    tx,
    "payrollPayslip",
    {
      organizationId,
      OR: [{ id: `${FIXTURE_PREFIX}_unpaid_payslip` }, { payslipNumber: UNPAID_PAYSLIP_NUMBER }, { runLineId: unpaidRunLine.id }],
    },
    {
      id: `${FIXTURE_PREFIX}_unpaid_payslip`,
      organizationId,
      payrollRunId: unpaidRun.id,
      runLineId: unpaidRunLine.id,
      employeeId: employee.id,
      payslipNumber: UNPAID_PAYSLIP_NUMBER,
      status: PayrollPayslipStatus.DRAFT,
      issuedAt: now,
      countryCode: COUNTRY_PACK.countryCode,
      countryPackVersion: COUNTRY_PACK.version,
      countryPackSchemaVersion: COUNTRY_PACK.schemaVersion,
      countryPackResolutionHash: COUNTRY_PACK.resolutionHash,
      ruleSetHash: sha256("payroll-browser-demo-unpaid-rule-set"),
      grossAmount: "350000.00",
      employeeDeductionAmount: "15000.00",
      employerChargeAmount: "25000.00",
      netPayableAmount: "335000.00",
      currency: "XAF",
      documentHash: sha256("payroll-browser-demo-unpaid-payslip-document"),
      archiveUri: null,
      metadata: demoMetadata({ fixtureModel: "PayrollPayslip", fixtureScenario: "unpaid-release-drawer" }),
    },
  )

  for (const line of payslipLines) {
    const unpaidPayslipLineId = `${FIXTURE_PREFIX}_unpaid_payslip_line_${line.lineNumber}`

    await findOrCreateFirst(
      tx,
      "payrollPayslipLine",
      {
        organizationId,
        OR: [{ id: unpaidPayslipLineId }, { payslipId: unpaidPayslip.id, lineNumber: line.lineNumber }],
      },
      {
        id: unpaidPayslipLineId,
        organizationId,
        payslipId: unpaidPayslip.id,
        lineNumber: line.lineNumber,
        code: line.code,
        label: line.label,
        category: line.category,
        baseAmount: line.baseAmount,
        amount: line.amount,
        currency: "XAF",
        sourceType: "PayrollRunLine",
        sourceId: unpaidRunLine.id,
        metadata: demoMetadata({ fixtureModel: "PayrollPayslipLine", fixtureScenario: "unpaid-release-drawer" }),
      },
    )
  }

  if (unpaidPayslip.status !== PayrollPayslipStatus.EMITTED) {
    await tx.payrollPayslip.update({ where: { id: unpaidPayslip.id }, data: { status: PayrollPayslipStatus.EMITTED, issuedAt: now } })
  }

  if (unpaidRun.status !== PayrollRunStatus.POSTED) {
    await tx.payrollRun.update({
      where: { id: unpaidRun.id },
      data: {
        status: PayrollRunStatus.POSTED,
        preparedById: userId,
        reviewedById: requesterUserId,
        approvedById: userId,
        emittedById: userId,
        postedById: userId,
        approvedAt: now,
        emittedAt: now,
        postedAt: now,
      },
    })
  }

  const balanceCase = await upsertFirst(
    tx,
    "payrollEmployeeBalanceCase",
    {
      organizationId,
      OR: [
        { id: `${FIXTURE_PREFIX}_employee_balance_case` },
        { caseNumber: "PAYBAL-DEMO-2026-07-001" },
        { idempotencyKey: "payroll-browser-demo-balance-case-2026-07" },
      ],
    },
    {
      id: `${FIXTURE_PREFIX}_employee_balance_case`,
      organizationId,
      employeeId: employee.id,
      payrollRunId: unpaidRun.id,
      payslipId: unpaidPayslip.id,
      caseNumber: "PAYBAL-DEMO-2026-07-001",
      caseType: PayrollEmployeeBalanceCaseType.RECEIVABLE,
      status: PayrollEmployeeBalanceCaseStatus.OPEN,
      amount: "9580.00",
      settledAmount: "0.00",
      outstandingAmount: "9580.00",
      sourceNetPayableAmount: "-9580.00",
      currency: "XAF",
      reason: "Demo-only open employee receivable for authenticated payroll payments browser smoke.",
      openedAt: now,
      openedById: userId,
      settledAt: null,
      settledById: null,
      documentHash: sha256("payroll-browser-demo-balance-case-document"),
      evidenceHash: sha256("payroll-browser-demo-balance-case-evidence"),
      ledgerPostingBatchId: "demo-payroll-balance-ledger-batch",
      journalEntryId: "demo-payroll-balance-journal-entry",
      accountingSourceLinkId: "demo-payroll-balance-source-link",
      openedBusinessEventId: "demo-payroll-balance-opened-event",
      idempotencyKey: "payroll-browser-demo-balance-case-2026-07",
      metadata: demoMetadata({ fixtureModel: "PayrollEmployeeBalanceCase", fixtureScenario: "payments-browser-smoke" }),
    },
  )

  await findOrCreateFirst(
    tx,
    "payrollEmployeeBalanceEvent",
    {
      organizationId,
      OR: [
        { id: `${FIXTURE_PREFIX}_employee_balance_event_open` },
        { idempotencyKey: "payroll-browser-demo-balance-case-open-2026-07" },
      ],
    },
    {
      id: `${FIXTURE_PREFIX}_employee_balance_event_open`,
      organizationId,
      balanceCaseId: balanceCase.id,
      eventType: PayrollEmployeeBalanceEventType.OPEN,
      amount: "9580.00",
      currency: "XAF",
      eventDate: now,
      actorId: userId,
      method: null,
      documentHash: sha256("payroll-browser-demo-balance-event-document"),
      evidenceHash: sha256("payroll-browser-demo-balance-event-evidence"),
      ledgerPostingBatchId: "demo-payroll-balance-ledger-batch",
      journalEntryId: "demo-payroll-balance-journal-entry",
      accountingSourceLinkId: "demo-payroll-balance-source-link",
      businessEventId: "demo-payroll-balance-opened-event",
      idempotencyKey: "payroll-browser-demo-balance-case-open-2026-07",
      metadata: demoMetadata({ fixtureModel: "PayrollEmployeeBalanceEvent", fixtureScenario: "payments-browser-smoke" }),
    },
  )
  return {
    employeeId: employee.id,
    contractId: contract.id,
    periodId: period.id,
    attendanceSnapshotId: attendance.id,
    payrollRunId: run.id,
    payrollRunLineId: runLine.id,
    payslipId: payslip.id,
    declarationId: declaration.id,
    paymentBatchId: paymentBatch.id,
    unpaidPeriodId: unpaidPeriod.id,
    unpaidPayrollRunId: unpaidRun.id,
    unpaidPayrollRunLineId: unpaidRunLine.id,
    unpaidPayslipId: unpaidPayslip.id,
    employeeBalanceCaseId: balanceCase.id,
  }
}

async function main() {
  assertLocalSeedAllowed()

  if (!EMAIL || !PASSWORD || !REQUESTER_EMAIL || !REQUESTER_PASSWORD) {
    throw new Error("AQSTOQFLOW_E2E_EMAIL, AQSTOQFLOW_E2E_PASSWORD, AQSTOQFLOW_E2E_REQUESTER_EMAIL, and AQSTOQFLOW_E2E_REQUESTER_PASSWORD must be non-empty.")
  }
  if (EMAIL === REQUESTER_EMAIL) {
    throw new Error("Payroll browser smoke requester and releaser emails must be different for maker-checker evidence.")
  }

  const passwordHash = await hashPassword(PASSWORD)
  const requesterPasswordHash = REQUESTER_PASSWORD === PASSWORD ? passwordHash : await hashPassword(REQUESTER_PASSWORD)
  const now = new Date()

  const result = await prisma.$transaction(async (tx) => {
    const organization = await upsertDemoOrganization(tx, now)

    const role = await tx.role.upsert({
      where: { organizationId_code: { organizationId: organization.id, code: ROLE_CODE } },
      update: {
        nameEn: "Payroll E2E Smoke",
        nameFr: "Paie E2E Smoke",
        description: DEMO_ONLY_NOTICE,
        permissions: { set: PAYROLL_SMOKE_PERMISSIONS },
        updatedAt: now,
      },
      create: {
        id: `${organization.id}_role_${ROLE_CODE.toLowerCase()}`,
        code: ROLE_CODE,
        nameEn: "Payroll E2E Smoke",
        nameFr: "Paie E2E Smoke",
        description: DEMO_ONLY_NOTICE,
        permissions: PAYROLL_SMOKE_PERMISSIONS,
        organizationId: organization.id,
        updatedAt: now,
      },
    })

    const requesterRole = await tx.role.upsert({
      where: { organizationId_code: { organizationId: organization.id, code: REQUESTER_ROLE_CODE } },
      update: {
        nameEn: "Payroll E2E Requester",
        nameFr: "Demandeur paie E2E",
        description: DEMO_ONLY_NOTICE,
        permissions: { set: PAYROLL_REQUESTER_PERMISSIONS },
        updatedAt: now,
      },
      create: {
        id: `${organization.id}_role_${REQUESTER_ROLE_CODE.toLowerCase()}`,
        code: REQUESTER_ROLE_CODE,
        nameEn: "Payroll E2E Requester",
        nameFr: "Demandeur paie E2E",
        description: DEMO_ONLY_NOTICE,
        permissions: PAYROLL_REQUESTER_PERMISSIONS,
        organizationId: organization.id,
        updatedAt: now,
      },
    })

    const existingUser = await tx.user.findUnique({ where: { email: EMAIL }, select: { id: true, organizationId: true } })
    if (existingUser && existingUser.organizationId !== organization.id) {
      throw new Error(`Refusing to move existing user ${EMAIL} from ${existingUser.organizationId} to ${organization.id}. Use a different AQSTOQFLOW_E2E_EMAIL.`)
    }

    const user = existingUser
      ? await tx.user.update({
          where: { id: existingUser.id },
          data: {
            firstName: "HR",
            lastName: "Manager",
            name: "HR Manager",
            jobTitle: "Payroll E2E Smoke User",
            password: passwordHash,
            emailVerified: true,
            isVerified: true,
            isActive: true,
            isLocked: false,
            lockedUntil: null,
            failedLoginAttempts: 0,
            lastFailedLogin: null,
            preferredLocale: Locale.EN,
            roles: { set: [{ id: role.id }] },
            updatedAt: now,
          },
        })
      : await tx.user.create({
          data: {
            id: process.env.AQSTOQFLOW_E2E_USER_ID || DEFAULT_USER_ID,
            email: EMAIL,
            firstName: "HR",
            lastName: "Manager",
            name: "HR Manager",
            jobTitle: "Payroll E2E Smoke User",
            password: passwordHash,
            emailVerified: true,
            isVerified: true,
            isActive: true,
            isLocked: false,
            lockedUntil: null,
            failedLoginAttempts: 0,
            lastFailedLogin: null,
            preferredLocale: Locale.EN,
            organizationId: organization.id,
            roles: { connect: { id: role.id } },
            updatedAt: now,
          },
        })

    await tx.account.upsert({
      where: { providerId_accountId: { providerId: "credential", accountId: user.id } },
      update: { userId: user.id, password: passwordHash, scope: "profile email", updatedAt: now },
      create: { accountId: user.id, providerId: "credential", userId: user.id, password: passwordHash, scope: "profile email", updatedAt: now },
    })

    const existingRequesterUser = await tx.user.findUnique({ where: { email: REQUESTER_EMAIL }, select: { id: true, organizationId: true } })
    if (existingRequesterUser && existingRequesterUser.organizationId !== organization.id) {
      throw new Error(`Refusing to move existing requester user ${REQUESTER_EMAIL} from ${existingRequesterUser.organizationId} to ${organization.id}. Use a different AQSTOQFLOW_E2E_REQUESTER_EMAIL.`)
    }

    const requesterUser = existingRequesterUser
      ? await tx.user.update({
          where: { id: existingRequesterUser.id },
          data: {
            firstName: "Payroll",
            lastName: "Requester",
            name: "Payroll Requester",
            jobTitle: "Payroll E2E Request Maker",
            password: requesterPasswordHash,
            emailVerified: true,
            isVerified: true,
            isActive: true,
            isLocked: false,
            lockedUntil: null,
            failedLoginAttempts: 0,
            lastFailedLogin: null,
            preferredLocale: Locale.EN,
            roles: { set: [{ id: requesterRole.id }] },
            updatedAt: now,
          },
        })
      : await tx.user.create({
          data: {
            id: process.env.AQSTOQFLOW_E2E_REQUESTER_USER_ID || DEFAULT_REQUESTER_USER_ID,
            email: REQUESTER_EMAIL,
            firstName: "Payroll",
            lastName: "Requester",
            name: "Payroll Requester",
            jobTitle: "Payroll E2E Request Maker",
            password: requesterPasswordHash,
            emailVerified: true,
            isVerified: true,
            isActive: true,
            isLocked: false,
            lockedUntil: null,
            failedLoginAttempts: 0,
            lastFailedLogin: null,
            preferredLocale: Locale.EN,
            organizationId: organization.id,
            roles: { connect: { id: requesterRole.id } },
            updatedAt: now,
          },
        })

    await tx.account.upsert({
      where: { providerId_accountId: { providerId: "credential", accountId: requesterUser.id } },
      update: { userId: requesterUser.id, password: requesterPasswordHash, scope: "profile email", updatedAt: now },
      create: { accountId: requesterUser.id, providerId: "credential", userId: requesterUser.id, password: requesterPasswordHash, scope: "profile email", updatedAt: now },
    })

    const revokedSessionResult = await tx.session.deleteMany({
      where: { userId: { in: [user.id, requesterUser.id] } },
    })

    await upsertAccountingSettings(tx, organization.id, now)
    const fixtures = await seedPayrollFixtures(tx, organization.id, user.id, requesterUser.id, now)

    return {
      organizationId: organization.id,
      userId: user.id,
      email: user.email,
      roleCode: role.code,
      requesterUserId: requesterUser.id,
      requesterEmail: requesterUser.email,
      requesterRoleCode: requesterRole.code,
      requestedModules: organization.requestedModules,
      permissions: role.permissions,
      requesterPermissions: requesterRole.permissions,
      revokedSessionCount: revokedSessionResult.count,
      fixtures,
      warning: DEMO_ONLY_NOTICE,
    }
  })

  console.log(JSON.stringify(result, null, 2))
  console.log(DEMO_ONLY_NOTICE)
  console.log("Provisioned local payroll browser smoke data. Auth state remains local at playwright/.auth/payroll.json.")
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
