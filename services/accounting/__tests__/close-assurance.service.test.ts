jest.mock("server-only", () => ({}))
jest.mock("../close-source-revision.service", () => ({ ...jest.requireActual("../close-source-revision.service"), lockCloseSourceRevisionInTx: jest.fn().mockResolvedValue({ version: 1, revision: "0" }), guardCloseAssessmentPublicationInTx: jest.fn().mockResolvedValue(true) }))
import { lockCloseSourceRevisionInTx, guardCloseAssessmentPublicationInTx } from "../close-source-revision.service"
let createdAssessment: any = null

jest.mock("@/prisma/db", () => {
  const dbMock = {
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
    user: {
      findFirst: jest.fn(),
    },
    accountingPeriod: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    closeRun: {
      create: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
      findFirst: jest.fn(),
    },
    closeChecklistItem: {
      create: jest.fn(),
      update: jest.fn(),
    },
    closeAssuranceFinding: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    closeEvidenceItem: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    accountantReview: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    accountantComment: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    ledgerAuditEvent: {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      findFirst: jest.fn(),
    },
  }
  dbMock.$transaction = jest.fn((callback) => callback(dbMock))
  return { db: dbMock }
})

jest.mock("../periods.service", () => ({
  getPeriodClosePreflight: jest.fn(),
  getPeriodClosePreflightFailures: jest.fn(),
}))

jest.mock("../reconciliations.service", () => ({
  reconcileLedger: jest.fn(),
}))

jest.mock("../data-trust.service", () => ({
  getAccountantPortalData: jest.fn(),
}))

jest.mock("../accountant-access.service", () => ({
  resolveAccountantClientAccess: jest.fn(),
}))

jest.mock("../close-evidence-acceptance-authority.service", () => ({
  lockCloseEvidenceAcceptanceAuthorityInTx: jest.fn(),
  lockCloseEvidenceWorkAuthorityInTx: jest.fn(async () => ({ revalidate: jest.fn() })),
  lockCloseEvidenceRecipientInTx: jest.fn(async () => ({ revalidate: jest.fn() })),
}))

jest.mock("../close-evidence-replacement.service", () => ({
  ...jest.requireActual("../close-evidence-replacement.service"),
  getCloseEvidenceReplacementInTx: jest.fn(),
}))

jest.mock(
  "@/services/reconciliation/payment-close-evidence.service",
  () => ({
    getPaymentCloseEvidence: jest.fn(),
  }),
)

jest.mock("@/services/inventory/inventory-valuation.service", () => ({
  reconcileInventoryClass3: jest.fn(),
}))

jest.mock("@/services/snapshots/tenant-operating-snapshot.service", () => ({
  getTenantOperatingSnapshot: jest.fn(),
}))

jest.mock("@/services/events/business-event.service", () => ({
  recordBusinessEventInTx: jest.fn(),
}))

import { db } from "@/prisma/db"
import { ForbiddenError } from "@/services/_shared/action-errors"
import { resolveAccountantClientAccess } from "../accountant-access.service"
import { lockCloseEvidenceAcceptanceAuthorityInTx, lockCloseEvidenceRecipientInTx, lockCloseEvidenceWorkAuthorityInTx } from "../close-evidence-acceptance-authority.service"
import { closeEvidenceReplacementSelection, getCloseEvidenceReplacementInTx, type CloseEvidenceReplacementBinding } from "../close-evidence-replacement.service"
import { verifyCloseEvidenceCollectionReceipt } from "../close-evidence-collection"
import { getAccountantPortalData } from "../data-trust.service"
import { reconcileInventoryClass3 } from "@/services/inventory/inventory-valuation.service"
import { getTenantOperatingSnapshot } from "@/services/snapshots/tenant-operating-snapshot.service"
import { recordBusinessEventInTx } from "@/services/events/business-event.service"
import {
  getPeriodClosePreflight,
  getPeriodClosePreflightFailures,
} from "../periods.service"
import { reconcileLedger } from "../reconciliations.service"
import { getPaymentCloseEvidence } from "@/services/reconciliation/payment-close-evidence.service"
import {
  acceptMissingCloseEvidenceResponse,
  approveCloseWaiver,
  assignCloseFinding,
  requestMissingCloseEvidence,
  replaceMissingCloseEvidenceRecipient,
  respondToMissingCloseEvidence,
  commentOnCloseFinding,
  getCloseAssuranceDashboard,
  getCloseEvidenceGraph,
  requestCloseWaiver,
  runCloseAssurance,
} from "../close-assurance.service"

const mockDb = db as unknown as {
  $transaction: jest.Mock
  $queryRaw: jest.Mock
  user: {
    findFirst: jest.Mock
  }
  accountingPeriod: {
    findFirst: jest.Mock
    findMany: jest.Mock
  }
  closeRun: {
    create: jest.Mock
    findMany: jest.Mock
    updateMany: jest.Mock
    findFirst: jest.Mock
  }
  closeChecklistItem: {
    create: jest.Mock
    update: jest.Mock
  }
  closeAssuranceFinding: {
    create: jest.Mock
    findFirst: jest.Mock
    update: jest.Mock
    updateMany: jest.Mock
  }
  closeEvidenceItem: {
    create: jest.Mock
    findFirst: jest.Mock
  }
  accountantReview: {
    create: jest.Mock
    findFirst: jest.Mock
  }
  accountantComment: {
    findMany: jest.Mock
    findFirst: jest.Mock
    create: jest.Mock
  }
  ledgerAuditEvent: {
    findFirst: jest.Mock
    findMany: jest.Mock
    create: jest.Mock
  }
}

const mockGetPeriodClosePreflight = getPeriodClosePreflight as jest.Mock
const mockGetPeriodClosePreflightFailures =
  getPeriodClosePreflightFailures as jest.Mock
const mockReconcileLedger = reconcileLedger as jest.Mock
const mockGetAccountantPortalData = getAccountantPortalData as jest.Mock
const mockResolveAccountantClientAccess =
  resolveAccountantClientAccess as jest.Mock
const mockGetPaymentCloseEvidence =
  getPaymentCloseEvidence as jest.Mock
const mockReconcileInventoryClass3 = reconcileInventoryClass3 as jest.Mock
const mockGetTenantOperatingSnapshot = getTenantOperatingSnapshot as jest.Mock
const mockRecordBusinessEventInTx = recordBusinessEventInTx as jest.Mock
const mockGetCloseEvidenceReplacementInTx = getCloseEvidenceReplacementInTx as jest.Mock
const mockLockCloseEvidenceAcceptanceAuthorityInTx = lockCloseEvidenceAcceptanceAuthorityInTx as jest.Mock
const mockRevalidateCloseEvidenceAcceptanceAuthority = jest.fn()

const period = {
  id: "period-1",
  name: "June 2026",
  status: "OPEN",
  startDate: new Date("2026-06-01T00:00:00.000Z"),
  endDate: new Date("2026-06-30T23:59:59.999Z"),
}

function cleanPreflight() {
  return {
    draftEntryCount: 0,
    unresolvedPostingBatchCount: 0,
    unlinkedPostedEntryCount: 0,
    openReconciliationExceptionCount: 0,
    openReconciliationSuspenseCount: 0,
    unsignedReconciliationRunCount: 0,
    trialBalanceIssues: [],
    missingFunctionalAmountCount: 0,
    functionalBalanceIssue: null,
  }
}

function cleanLedger() {
  return {
    organizationId: "org-1",
    periodId: period.id,
    isClean: true,
    totalsByCurrency: [
      {
        currency: "XAF",
        debit: "120000.00",
        credit: "120000.00",
        difference: "0.00",
      },
    ],
    failures: [],
  }
}

function cleanPaymentDashboard() {
  return {
    source: {
      mode: "DURABLE_EVIDENCE_KERNEL",
      certificationStatus: "SIGNED",
      asOf: "2026-06-15T12:00:00.000Z",
      organizationScoped: true,
      providerEvidenceAvailable: true,
      statementEvidenceAvailable: true,
    },
    summary: {
      pendingRunCount: 0,
      providerAccountCount: 1,
      activeProviderAccountCount: 1,
      recentRunCount: 1,
      readyForSignoffCount: 0,
      signedRunCount: 1,
      openExceptionCount: 0,
      criticalExceptionCount: 0,
      openSuspenseCount: 0,
      openSuspenseAmount: 0,
      closeBlockerCount: 0,
    },
    providerAccounts: [],
    recentRuns: [
      {
        id: "recon-run-1",
        providerAccountId: "provider-1",
        businessDate: "2026-06-15T00:00:00.000Z",
        status: "SIGNED",
        matchCount: 8,
        exceptionCount: 0,
        suspenseAmount: 0,
        signedAt: "2026-06-15T10:00:00.000Z",
        certificateHash: "sha256:recon",
      },
    ],
    suspenseQueue: [],
    exceptionGroups: [],
    controls: {},
  }
}

function cleanDataTrust() {
  return {
    source: {
      mode: "LEDGER_BACKED_DATA_TRUST",
      asOf: "2026-06-15T12:00:00.000Z",
      organizationScoped: true,
      trustLevel: "T4",
      certificationStatus: "CERTIFIED",
      scopeHash: "sha256:scope",
      sourceTables: [
        "journal_entries",
        "accounting_source_links",
        "ledger_audit_events",
      ],
    },
    scope: {
      organizationId: "org-1",
      periodId: period.id,
      periodName: period.name,
      periodStatus: "OPEN",
      startDate: period.startDate.toISOString(),
      endDate: period.endDate.toISOString(),
    },
    certificate: {
      surface: "dashboard/accounting/accountant-portal",
      level: "T4",
      verdict: "CERTIFIED",
      generatedAt: "2026-06-15T12:00:00.000Z",
      evidence: [],
      requiredForNextLevel: [],
    },
    summary: {
      postedJournalEntries: 2,
      journalLines: 4,
      sourceLinks: 2,
      linkedPostedEntries: 2,
      sourceLinkCoveragePct: 100,
      ledgerBalanced: true,
      blockerCount: 0,
      criticalBlockers: 0,
      highBlockers: 0,
    },
    figures: {},
    moduleEvidence: [
      {
        module: "ledger",
        status: "ready",
        label: "Ledger",
        detail: "Balanced",
        facts: [],
      },
      {
        module: "payments",
        status: "ready",
        label: "Payments",
        detail: "Signed",
        facts: [],
      },
      {
        module: "purchasing",
        status: "ready",
        label: "Purchasing",
        detail: "Ready",
        facts: [],
      },
      {
        module: "payroll",
        status: "ready",
        label: "Payroll",
        detail: "Ready",
        facts: [],
      },
      {
        module: "compliance",
        status: "ready",
        label: "Compliance",
        detail: "Ready",
        facts: [],
      },
    ],
    blockers: [],
    latestSourceLinks: [
      {
        id: "source-link-1",
        sourceType: "POS_SALE",
        sourceId: "sale-1",
        sourceNumber: "POS-1",
        journalEntryNumber: "JE-1",
        postingBatchId: "batch-1",
        postingStatus: "POSTED",
        createdAt: "2026-06-15T10:00:00.000Z",
      },
    ],
    latestAuditEvents: [
      {
        id: "ledger-audit-1",
        source: "ledger",
        action: "POSTING_BATCH_POSTED",
        status: "allowed",
        resourceType: "LedgerPostingBatch",
        resourceId: "batch-1",
        actorId: "accountant-1",
        createdAt: "2026-06-15T10:01:00.000Z",
      },
    ],
    exportReadiness: {},
  }
}

function cleanInventoryValuation() {
  return {
    organizationId: "org-1",
    periodId: period.id,
    currency: "XAF",
    status: "PASSED",
    inventoryValue: "700.00",
    ledgerClass3Value: "700.00",
    driftAmount: "0.00",
    reportHash: "sha256:inventory-observation",
    evidenceHash: "sha256:inventory-valuation",
    evidenceHashVersion: 1,
    recordedThrough: "2026-06-15T12:00:00.000Z",
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
    failures: [],
  }
}

function payrollForecastMetrics(overrides: Record<string, unknown> = {}) {
  return {
    status: "AUTHORITATIVE",
    authoritative: true,
    reasonCode: "PAYROLL_FORECAST_SOURCE_LINKED",
    message:
      "Upcoming payroll net-pay and statutory-liability forecasts are sourced from posted payroll evidence.",
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
    personLevelAmountsRedacted: true,
    blockerCodes: [],
    ...overrides,
  }
}

function tenantOperatingSnapshot(overrides: Record<string, unknown> = {}) {
  return {
    kind: "tenant.operating",
    organizationId: "org-1",
    locationId: null,
    periodStart: period.startDate.toISOString(),
    periodEnd: period.endDate.toISOString(),
    status: "fresh",
    uiState: "fresh",
    evidenceGrade: "posted",
    freshness: {
      generatedAt: "2026-06-15T12:00:00.000Z",
      sourceMaxUpdatedAt: "2026-06-15T11:00:00.000Z",
      maxAgeMinutes: 1440,
      stale: false,
      staleReason: null,
    },
    sourceHash: "sha256:tenant-operating-payroll-forecast",
    generatedAt: "2026-06-15T12:00:00.000Z",
    sourceModules: ["hris", "payroll", "payments", "accounting", "close"],
    metrics: {
      payrollFinanceForecast: payrollForecastMetrics(),
    },
    blockers: [],
    redactions: [],
    ...overrides,
  }
}

function persistedRun(overrides: Record<string, unknown> = {}) {
  return {
    packExports: [],
    id: "close-run-1",
    organizationId: "org-1",
    periodId: period.id,
    status: "READY",
    readinessScore: 88,
    criticalBlockerCount: 0,
    highBlockerCount: 0,
    evidenceCoveragePct: "80",
    asOf: new Date("2026-06-15T12:00:00.000Z"),
    startedAt: new Date("2026-06-15T12:00:00.000Z"),
    completedAt: new Date("2026-06-15T12:01:00.000Z"),
    runById: "user-1",
    correlationId: "corr-1",
    summary: {},
    provenance: {
      items: [
        {
          label: "Ledger and period close",
          provenance: "POSTED",
          asOf: "2026-06-15T12:00:00.000Z",
          periodStatus: "OPEN",
          sourceTables: ["accounting_periods", "journal_entries"],
        },
      ],
    },
    metadata: { trustLevel: "T4" },
    createdAt: new Date("2026-06-15T12:00:00.000Z"),
    checklistItems: [
      {
        id: "check-1",
        key: "period-state",
        domain: "LEDGER",
        status: "PASSED",
        severity: "INFO",
        label: "Period state",
        detail: "Period is open.",
        sourceService: "services/accounting/periods.service.ts",
        evidenceCount: 1,
        blockerReason: null,
        nextActionHref: null,
        ownerId: null,
        dueAt: null,
      },
    ],
    findings: [],
    evidenceItems: [
      {
        id: "evidence-1",
        checklistItemId: "check-1",
        findingId: null,
        evidenceType: "REPORT_EXPORT",
        sourceTable: "journal_entry_lines",
        sourceType: "TrialBalanceCurrency",
        sourceId: "XAF",
        sourceLabel: "Trial balance XAF",
        sourceDate: new Date("2026-06-15T12:00:00.000Z"),
        sourceHash: null,
        provenance: "POSTED",
        available: true,
        unavailableReason: null,
        correlationId: "corr-1",
      },
    ],
    comments: [],
    reviews: [],
    ...overrides,
  }
}

function missingEvidenceFinding(overrides: Record<string, unknown> = {}) {
  return {
    id: "finding-1",
    organizationId: "client-org",
    periodId: period.id,
    closeRunId: "close-run-1",
    status: "OPEN",
    severity: "HIGH",
    checklistItem: { status: "UNAVAILABLE", evidenceCount: 0 },
    evidenceItems: [],
    ...overrides,
  }
}

function missingEvidenceComment(overrides: Record<string, unknown> = {}) {
  return {
    id: "request-1",
    organizationId: "client-org",
    periodId: period.id,
    closeRunId: "close-run-1",
    findingId: "finding-1",
    authorId: "accountant-1",
    body: "Please attach the missing signed bank statement.",
    visibility: "CLIENT_ACTION_REQUIRED",
    correlationId: "missing-proof-corr-1",
    metadata: {
      requestType: "MISSING_CLOSE_EVIDENCE",
      requestedById: "accountant-1",
      requestedFromId: "client-user-1",
      dueAt: "2026-08-05T12:00:00.000Z",
      correlationId: "missing-proof-corr-1",
    },
    createdAt: new Date("2026-08-02T10:00:00.000Z"),
    ...overrides,
  }
}

function missingEvidenceResponse(overrides: Record<string, unknown> = {}) {
  return {
    id: "response-1",
    organizationId: "client-org",
    periodId: period.id,
    closeRunId: "close-run-1",
    findingId: "finding-1",
    authorId: "client-user-1",
    body: "The signed bank statement has been delivered for review.",
    visibility: "CLIENT_RESPONSE_SUBMITTED",
    correlationId: "missing-proof-response-corr-1",
    metadata: {
      responseType: "MISSING_CLOSE_EVIDENCE_RESPONSE",
      requestId: "request-1",
      requestCorrelationId: "missing-proof-corr-1",
      requestedById: "accountant-1",
      requestedFromId: "client-user-1",
      respondedById: "client-user-1",
      correlationId: "missing-proof-response-corr-1",
    },
    createdAt: new Date("2026-08-02T10:30:00.000Z"),
    ...overrides,
  }
}

function replacementBinding(): CloseEvidenceReplacementBinding {
  return {
    kind: "CLOSE_EVIDENCE_REPLACEMENT", version: 1, organizationId: "client-org", periodId: period.id,
    findingId: "finding-1", originalRunId: "close-run-1", originalChecklistId: "old-checklist-1",
    originalFindingHash: "a".repeat(64), originalChecklistHash: "b".repeat(64),
    originalEvidence: [{ id: "unavailable-evidence-1", hash: "c".repeat(64) }],
    replacementRunId: "new-run-1", replacementChecklistId: "new-checklist-1", replacementReceiptHash: "d".repeat(64),
  }
}

function missingEvidenceAcceptance(overrides: Record<string, unknown> = {}) {
  return {
    id: "acceptance-1",
    organizationId: "client-org",
    periodId: period.id,
    closeRunId: "close-run-1",
    findingId: "finding-1",
    authorId: "accountant-1",
    body: "Response evidence reviewed and accepted for this finding.",
    visibility: "ACCOUNTANT_RESPONSE_ACCEPTED",
    correlationId: "missing-proof-acceptance-corr-1",
    metadata: {
      acceptanceType: "MISSING_CLOSE_EVIDENCE_RESPONSE_ACCEPTANCE",
      replacementBinding: replacementBinding(),
      requestId: "request-1",
      responseId: "response-1",
      requestCorrelationId: "missing-proof-corr-1",
      responseCorrelationId: "missing-proof-response-corr-1",
      findingId: "finding-1",
      periodId: period.id,
      closeRunId: "close-run-1",
      respondedById: "client-user-1",
      acceptedById: "accountant-1",
      decision: "ACCEPTED",
      findingStatus: "RESOLVED",
      resolvedAt: "2026-08-02T11:00:00.000Z",
      correlationId: "missing-proof-acceptance-corr-1",
    },
    createdAt: new Date("2026-08-02T11:00:00.000Z"),
    ...overrides,
  }
}

function missingEvidenceAcceptanceControl(
  overrides: Record<string, unknown> = {},
) {
  mockDb.$queryRaw.mockResolvedValue([{ id: "finding-1", createdAt: new Date("2026-08-02T11:00:00.000Z") }])
  return {
    actorId: "accountant-1",
    actorPermissions: ["accounting.close.accountant.review"],
    session: { id: "accountant-session-1", token: "synthetic-service-session-token" },
    freshAuth: {
      actorId: "accountant-1",
      organizationId: "accounting-firm",
      lastAuthAt: new Date("2026-08-02T10:58:00.000Z"),
    },
    ...overrides,
  }
}

function acceptanceInput(overrides: Record<string, unknown> = {}) {
  return {
    clientOrganizationId: "client-org",
    requestId: "request-1",
    responseId: "response-1",
    resolutionNotes: "Response evidence reviewed and accepted for this finding.",
    correlationId: "missing-proof-acceptance-corr-1",
    replacement: closeEvidenceReplacementSelection(replacementBinding()),
    ...overrides,
  }
}

function seedCleanSources() {
  mockDb.accountantComment.findMany.mockReset().mockImplementation(async () => {
    const reads = await Promise.all(mockDb.accountantComment.findFirst.mock.results.map(result => result.value))
    return [...new Map(reads.filter(row => row && ["CLIENT_ACTION_REQUIRED", "CLIENT_RESPONSE_SUBMITTED", "ACCOUNTANT_RESPONSE_ACCEPTED"].includes(row.visibility)).map(row => [row.id, { id: row.id }])).values()]
  })
  mockDb.ledgerAuditEvent.findMany.mockReset().mockResolvedValue([])
  mockDb.ledgerAuditEvent.findFirst.mockReset().mockResolvedValue(null)
  mockRevalidateCloseEvidenceAcceptanceAuthority.mockReset().mockResolvedValue(undefined)
  mockLockCloseEvidenceAcceptanceAuthorityInTx.mockReset().mockResolvedValue({ revalidate: mockRevalidateCloseEvidenceAcceptanceAuthority })
  mockDb.$transaction.mockImplementation((callback) => callback(mockDb))
  createdAssessment = null
  jest.mocked(lockCloseSourceRevisionInTx).mockReset().mockResolvedValue({ version: 1, revision: "0" })
  jest.mocked(guardCloseAssessmentPublicationInTx).mockReset().mockResolvedValue(true)
  mockDb.$queryRaw.mockResolvedValue([{ createdAt: new Date("2026-06-15T14:00:00.000Z") }])
  mockDb.closeRun.findMany.mockImplementation(async () => {
    const result = await mockDb.closeRun.findFirst.mock.results.at(-1)?.value
    return result ? [result] : createdAssessment ? [createdAssessment] : []
  })
  mockDb.accountingPeriod.findFirst.mockResolvedValue(period)
  mockDb.accountingPeriod.findMany.mockResolvedValue([period])
  mockDb.closeRun.findFirst.mockResolvedValue(null)
  mockDb.closeRun.updateMany.mockResolvedValue({ count: 1 })
  mockDb.closeRun.create.mockImplementation(({ data }) =>
    Promise.resolve(createdAssessment = {
      ...data,
      id: "close-run-1",
      periodId: data.periodId,
      status: data.status,
      readinessScore: data.readinessScore,
      criticalBlockerCount: data.criticalBlockerCount,
      highBlockerCount: data.highBlockerCount,
    }),
  )
  mockDb.closeChecklistItem.create.mockImplementation(({ data }) =>
    Promise.resolve({
      id: `check-${data.key}`,
      metadata: null,
      createdAt: new Date("2026-06-15T14:00:00.000Z"),
      updatedAt: new Date("2026-06-15T14:00:00.000Z"),
      ...data,
    }),
  )
  mockDb.closeChecklistItem.update.mockImplementation(({ where, data }) => Promise.resolve({ ...where, ...data }))
  mockDb.closeAssuranceFinding.create.mockImplementation(({ data }) =>
    Promise.resolve({
      id: `finding-${data.title}`,
      createdAt: new Date("2026-06-15T12:00:00.000Z"),
      ...data,
    }),
  )
  let evidenceSequence = 0
  mockDb.closeEvidenceItem.create.mockImplementation(({ data }) => Promise.resolve({
    id: `evidence-created-${++evidenceSequence}`,
    createdAt: new Date("2026-06-15T14:00:00.000Z"),
    updatedAt: new Date("2026-06-15T14:00:00.000Z"),
    ...data,
    metadata: data.metadata ?? null,
  }))
  mockGetCloseEvidenceReplacementInTx.mockReset().mockResolvedValue({
    status: "AVAILABLE", reason: "VERIFIED_COLLECTION", binding: replacementBinding(),
    selection: closeEvidenceReplacementSelection(replacementBinding()), checklistKey: "ledger-reconciliation",
    domain: "LEDGER", observedAt: "2026-08-02T10:59:00.000Z", recoveredEvidenceCount: 1,
  })
  mockDb.closeAssuranceFinding.updateMany.mockResolvedValue({ count: 1 })
  mockDb.accountantComment.findFirst.mockResolvedValue(null)
  mockDb.user.findFirst.mockResolvedValue({ id: "client-user-1" })
  mockResolveAccountantClientAccess.mockResolvedValue({
    organizationId: "client-org",
    mode: "DELEGATED_ACCOUNTANT",
    grant: { id: "grant-1", role: "REVIEWER" },
  })
  mockDb.ledgerAuditEvent.create.mockResolvedValue({
    id: "ledger-audit-created",
  })
  mockRecordBusinessEventInTx.mockResolvedValue({
    event: { id: "business-event-1" },
    created: true,
  })
  mockGetPeriodClosePreflight.mockResolvedValue(cleanPreflight())
  mockGetPeriodClosePreflightFailures.mockReturnValue([])
  mockReconcileLedger.mockResolvedValue(cleanLedger())
  mockGetPaymentCloseEvidence.mockResolvedValue(
    cleanPaymentDashboard(),
  )
  mockGetAccountantPortalData.mockResolvedValue(cleanDataTrust())
  mockReconcileInventoryClass3.mockResolvedValue(cleanInventoryValuation())
  mockGetTenantOperatingSnapshot.mockResolvedValue(tenantOperatingSnapshot())
}

describe("close assurance service", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    seedCleanSources()
  })

  afterEach(() => {
    jest.useRealTimers()
    mockDb.accountantComment.findFirst.mockReset()
    mockDb.closeAssuranceFinding.updateMany.mockReset()
  })

  it("builds a live close readiness dashboard from close, reconciliation, suspense, and data-trust services", async () => {
    const result = await getCloseAssuranceDashboard("org-1", period.id)

    expect(result.source.persisted).toBe(false)
    expect(result.source.trustLevel).toBe("T4")
    expect(result.period?.id).toBe(period.id)
    expect(result.run.status).toBe("READY")
    expect(result.evidenceItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          evidenceType: "REPORT_EXPORT",
          sourceTable: "journal_entry_lines",
        }),
        expect.objectContaining({
          evidenceType: "RECONCILIATION_CERTIFICATE",
          sourceId: "recon-run-1",
        }),
        expect.objectContaining({
          evidenceType: "DATA_TRUST_CERTIFICATE",
          sourceHash: "sha256:scope",
        }),
        expect.objectContaining({
          sourceType: "InventoryValuationAnnex",
          sourceHash: "sha256:inventory-valuation",
        }),
        expect.objectContaining({
          sourceType: "PayrollFinanceForecastProof",
          sourceHash: "sha256:tenant-operating-payroll-forecast",
          available: true,
          metadata: expect.objectContaining({
            personLevelAmounts: "redacted",
            certifiedInputRunCount: 1,
            certifiedInputProofHashCount: 4,
            registerToLedgerRunCount: 1,
            redactions: expect.arrayContaining([
              expect.objectContaining({ field: "payroll.personLevelAmounts" }),
            ]),
          }),
        }),
      ]),
    )
    expect(result.checklist).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "inventory-valuation",
          status: "PASSED",
        }),
        expect.objectContaining({
          key: "payroll-finance-forecast-proof",
          status: "PASSED",
        }),
      ]),
    )
  })

  it("retains normal unpaid AP as classification evidence without creating a close finding", async () => {
    const payableBalances = { version: 1 as const, organizationId: "org-1", economicThrough: period.endDate.toISOString(), recordedThrough: new Date().toISOString(),
      evidenceHash: "ap-classification-hash", normalUnpaidCount: 1, exceptionCount: 0, settledCount: 0, balances: [], currencies: [] }
    jest.mocked(getAccountantPortalData).mockResolvedValue({ ...cleanDataTrust(), payableBalances })
    const result = await getCloseAssuranceDashboard("org-1", period.id)
    expect(result.run.status).toBe("READY")
    expect(result.findings.some(row => row.sourceType === "purchasing.ap.reconciliation")).toBe(false)
    expect(result.evidenceItems).toContainEqual(expect.objectContaining({ sourceType: "ClosePayableBalanceClassification", sourceHash: "ap-classification-hash", provenance: "OPERATIONAL" }))
    mockDb.closeRun.findFirst.mockResolvedValue(persistedRun())
    await runCloseAssurance("org-1", { periodId: period.id }, { actorId: "controller" })
    expect(mockDb.closeRun.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ metadata: expect.objectContaining({ payableBalances }) }) }))
  })

  it("fails payment readiness and retains bank balance evidence when bank approval is missing", async () => {
    const bankBalanceReconciliation = { version: 1 as const, scopeHash: "scope", requiredAccountCount: 1, reconciledAccountCount: 0, blockedAccountCount: 1,
      accounts: [{ providerAccountId: "bank", accountName: "Bank", currency: "XAF", status: "BLOCKED" as const, reason: "Bank balance evidence is missing.", evidenceId: null, evidenceHash: null, approvedById: null, approvedAt: null, snapshot: null }] }
    mockGetAccountantPortalData.mockResolvedValue({ ...cleanDataTrust(), bankBalanceReconciliation })
    const result = await getCloseAssuranceDashboard("org-1", period.id)
    expect(result.checklist.find(row => row.key === "payment-reconciliation")?.status).toBe("FAILED")
    expect(result.run.status).not.toBe("READY")
    expect(result.evidenceItems).toContainEqual(expect.objectContaining({ sourceType: "BankBalanceReconciliation", available: false }))
    mockDb.closeRun.findFirst.mockResolvedValue(persistedRun())
    await runCloseAssurance("org-1", { periodId: period.id }, { actorId: "controller" })
    expect(mockDb.closeRun.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ metadata: expect.objectContaining({ bankBalanceReconciliation }) }) }))
  })

  it("fails balance-sheet readiness and retains findings and metadata independently of portal blockers", async () => {
    const balanceSheetReconciliation = { version: 1 as const, scopeHash: "scope", requiredAccountCount: 1, reconciledAccountCount: 0, blockedAccountCount: 1,
      accounts: [{ ledgerAccountId: "ap", accountCode: "401", accountName: "Payables", currency: "XAF", status: "BLOCKED" as const, reason: "Supporting schedule is missing.", evidenceId: null, evidenceHash: null, approvedById: null, approvedAt: null, snapshot: null }] }
    mockGetAccountantPortalData.mockResolvedValue({ ...cleanDataTrust(), balanceSheetReconciliation })
    const result = await getCloseAssuranceDashboard("org-1", period.id)
    expect(result.checklist.find(row => row.key === "balance-sheet-reconciliation")?.status).toBe("FAILED")
    expect(result.run.status).not.toBe("READY")
    expect(result.findings).toContainEqual(expect.objectContaining({ sourceType: "BalanceSheetReconciliation", sourceId: "ap:XAF", severity: "HIGH" }))
    expect(result.evidenceItems).toContainEqual(expect.objectContaining({ sourceType: "BalanceSheetReconciliation", available: false }))
    mockDb.closeRun.findFirst.mockResolvedValue(persistedRun())
    await runCloseAssurance("org-1", { periodId: period.id }, { actorId: "controller" })
    expect(mockDb.closeRun.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ metadata: expect.objectContaining({ balanceSheetReconciliation }) }) }))
  })

  it("projects missing payroll transition proof as a critical close blocker", async () => {
    const dataTrust = cleanDataTrust()
    mockGetAccountantPortalData.mockResolvedValue({
      ...dataTrust,
      source: {
        ...dataTrust.source,
        trustLevel: "T0",
        certificationStatus: "NON_COMPLIANT",
      },
      certificate: {
        ...dataTrust.certificate,
        level: "T0",
        verdict: "NON_COMPLIANT",
      },
      summary: {
        ...dataTrust.summary,
        blockerCount: 1,
        criticalBlockers: 1,
      },
      moduleEvidence: dataTrust.moduleEvidence.map((module) =>
        module.module === "payroll"
          ? { ...module, status: "blocked" }
          : module,
      ),
      blockers: [
        {
          id: "payroll-transition-proof-missing",
          severity: "critical",
          gate: "payroll.lifecycle.transition-proof",
          title: "Payroll lifecycle transition proof is missing",
          detail:
            "One post-cutover payroll run lacks complete verified lifecycle proof.",
          sourceTables: ["payroll_runs", "payroll_run_transitions"],
        },
      ],
      exportReadiness: {
        ...dataTrust.exportReadiness,
        canExportCertifiedPack: false,
        disabledReason: "Critical payroll transition proof is missing.",
      },
    })

    const result = await getCloseAssuranceDashboard("org-1", period.id)

    expect(result.run.status).toBe("BLOCKED")
    expect(result.checklist).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "data-trust-provenance",
          status: "FAILED",
        }),
      ]),
    )
    expect(result.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          domain: "PAYROLL",
          severity: "CRITICAL",
          sourceType: "payroll.lifecycle.transition-proof",
          sourceId: "payroll-transition-proof-missing",
        }),
      ]),
    )
  })

  it("blocks close readiness when payroll finance forecast proof is incomplete", async () => {
    mockGetTenantOperatingSnapshot.mockResolvedValue(
      tenantOperatingSnapshot({
        status: "blocked",
        uiState: "blocked",
        evidenceGrade: "blocked",
        metrics: {
          payrollFinanceForecast: payrollForecastMetrics({
            status: "NON_AUTHORITATIVE",
            authoritative: false,
            reasonCode: "PAYROLL_FORECAST_PROOF_INCOMPLETE",
            message:
              "Upcoming payroll finance forecasts are withheld because declaration proof is incomplete.",
            upcomingNetPayAmount: 0,
            upcomingStatutoryLiabilityAmount: 0,
            totalUpcomingAmount: 0,
            blockerCodes: ["PAYROLL_FORECAST_DECLARATION_PROOF_MISSING"],
          }),
        },
        blockers: [
          {
            id: "tenant-payroll-finance-forecast-payroll-forecast-declaration-proof-missing",
            severity: "high",
            gate: "payroll_finance_forecast",
            title: "Payroll declaration proof is missing",
            detail:
              "Upcoming statutory liability is withheld until declaration evidence is complete.",
            sourceTables: [
              "payroll_declarations",
              "payroll_declaration_evidence",
            ],
            nextAction:
              "Open payroll declarations and attach source-register-backed declaration evidence.",
          },
        ],
      }),
    )

    const result = await getCloseAssuranceDashboard("org-1", period.id)

    expect(result.run.status).toBe("BLOCKED")
    expect(result.checklist).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "payroll-finance-forecast-proof",
          status: "FAILED",
          nextActionHref: "/dashboard/payroll/declarations",
        }),
      ]),
    )
    expect(result.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          domain: "PAYROLL",
          severity: "HIGH",
          sourceType: "payroll_finance_forecast",
          title: "Payroll declaration proof is missing",
        }),
      ]),
    )
    expect(result.evidenceItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceType: "PayrollFinanceForecastProof",
          available: false,
          provenance: "UNAVAILABLE",
          metadata: expect.objectContaining({
            personLevelAmounts: "redacted",
            blockerCodes: ["PAYROLL_FORECAST_DECLARATION_PROOF_MISSING"],
          }),
        }),
      ]),
    )
  })

  it("retains account coverage evidence and blocks missing accounts despite global signed evidence", async () => {
    const account = { providerAccountId: "bank-b", accountName: "Bank B", currencyCode: "XAF", status: "BLOCKED", reasons: ["MISSING_STATEMENT"], noActivityEvidence: null, scopeHash: "sha256:scope" };
    mockGetPaymentCloseEvidence.mockResolvedValue({ ...cleanPaymentDashboard(), accountCoverage: { version: 1, requiredAccountCount: 2, coveredAccountCount: 1, blockedAccountCount: 1, accounts: [account] } });
    const result = await getCloseAssuranceDashboard("org-1", period.id);
    expect(result.checklist).toEqual(expect.arrayContaining([expect.objectContaining({ key: "payment-reconciliation", status: "FAILED" })]));
    expect(result.findings).toEqual(expect.arrayContaining([expect.objectContaining({ sourceType: "ProviderAccountCloseCoverage", sourceId: "bank-b", severity: "HIGH" })]));
    expect(result.evidenceItems).toEqual(expect.arrayContaining([expect.objectContaining({ sourceType: "ProviderAccountCloseCoverage", evidenceType: "AUDIT_LOG", available: false, metadata: account })]));
  })

  it("uses the tenant currency consistently with close-pack inventory refresh", async () => {
    mockDb.accountingPeriod.findFirst.mockResolvedValue({ ...period, organization: { currency: "XOF" } })
    await getCloseAssuranceDashboard("org-1", period.id)
    expect(mockReconcileInventoryClass3).toHaveBeenCalledWith({ organizationId: "org-1", periodId: period.id, currency: "XOF", recordedThrough: expect.any(Date) })
  })

  it("does not let a zero live preflight count hide scoped suspense or unsigned evidence", async () => {
    mockGetPaymentCloseEvidence.mockResolvedValue({ ...cleanPaymentDashboard(), summary: {
      ...cleanPaymentDashboard().summary, openSuspenseCount: 1, pendingRunCount: 1,
    }, organizationControls: { unassignedSuspense: 1, unassignedExceptions: 0 } })
    const result = await getCloseAssuranceDashboard("org-1", period.id)
    expect(result.checklist.find(row => row.key === "suspense-exceptions")?.status).toBe("FAILED")
    expect(result.checklist.find(row => row.key === "payment-reconciliation")?.status).toBe("FAILED")
    expect(result.provenance.find(row => row.label === "Payment reconciliation")?.reason).toContain("organization-wide controls: 1 suspense")
  })

  it("classifies inventory valuation mismatches as close blockers", async () => {
    mockReconcileInventoryClass3.mockResolvedValue({
      ...cleanInventoryValuation(),
      status: "BLOCKED",
      inventoryValue: "700.00",
      ledgerClass3Value: "600.00",
      driftAmount: "100.00",
      reportHash: "sha256:inventory-mismatch",
      failures: [
        {
          type: "CLASS3_RECONCILIATION_DRIFT",
          severity: "critical",
          message:
            "Inventory subledger value 700.00 does not reconcile to class 3 ledger value 600.00 XAF.",
          metadata: {
            inventoryValue: "700.00",
            ledgerClass3Value: "600.00",
            driftAmount: "100.00",
            currency: "XAF",
          },
        },
      ],
    })

    const result = await getCloseAssuranceDashboard("org-1", period.id)

    expect(result.run.status).toBe("BLOCKED")
    expect(result.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          domain: "INVENTORY_VALUATION",
          severity: "CRITICAL",
          sourceType: "CLASS3_RECONCILIATION_DRIFT",
        }),
      ]),
    )
    expect(result.checklist).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "inventory-valuation",
          status: "FAILED",
        }),
      ]),
    )
  })

  it("classifies open suspense and unsigned reconciliations as close blockers", async () => {
    mockGetPeriodClosePreflight.mockResolvedValue({
      ...cleanPreflight(),
      openReconciliationSuspenseCount: 2,
      unsignedReconciliationRunCount: 1,
    })

    const result = await getCloseAssuranceDashboard("org-1", period.id)

    expect(result.run.status).toBe("BLOCKED")
    expect(result.run.criticalBlockerCount).toBeGreaterThanOrEqual(1)
    expect(result.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ domain: "SUSPENSE", severity: "CRITICAL" }),
        expect.objectContaining({
          domain: "PAYMENT_RECONCILIATION",
          severity: "HIGH",
        }),
      ]),
    )
  })

  it("keeps stored certification and readiness historical while reporting missing current proof", async () => {
    mockDb.closeRun.findFirst.mockResolvedValue(persistedRun({ status: "CERTIFIED", readinessScore: 100 }))
    const result = await getCloseAssuranceDashboard("org-1", period.id)
    expect(result.run).toMatchObject({ status: "CERTIFIED", readinessScore: 100 })
    expect(result.currentProof).toMatchObject({ grade: "blocked", blockers: [expect.objectContaining({ id: "close-certified-export-missing" })] })
    expect(result.controls).toMatchObject({ certificationAvailable: false, certificationDisabledReason: "Current close evidence requires review." })
    expect(mockDb.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "RepeatableRead" })
    expect(mockDb.closeRun.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { organizationId: "org-1", periodId: period.id },
      include: expect.objectContaining({
        checklistItems: expect.objectContaining({ where: { organizationId: "org-1" } }),
        findings: expect.objectContaining({ where: { organizationId: "org-1" } }),
        evidenceItems: expect.objectContaining({ where: { organizationId: "org-1" } }),
        packExports: { where: { organizationId: "org-1", isCertified: true }, select: { metadata: true } },
      }),
    }))
    expect(mockDb.closeRun.updateMany).not.toHaveBeenCalled()
    expect(mockDb.ledgerAuditEvent.create).not.toHaveBeenCalled()
  })

  it("retains the chosen run's current proof while withholding private invalidation details", async () => {
    mockDb.closeRun.findFirst.mockResolvedValue(persistedRun({ status: "EXPORTED", metadata: { staleState: { status: "EVIDENCE_STALE", sourceId: "private-source" } }, packExports: [{ metadata: null }] }))
    const result = await getCloseAssuranceDashboard("org-1", period.id, "close-run-1")
    expect(result.currentProof).toMatchObject({ grade: "blocked", blockers: [expect.objectContaining({ id: "close-evidence-stale" })] })
    expect(JSON.stringify(result.currentProof)).not.toContain("private-source")
    expect(mockDb.closeRun.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { organizationId: "org-1", periodId: period.id, id: "close-run-1" },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    }))
  })

  it.each([
    { status: "RUNNING", grade: "raw" },
    { status: "DRAFT", grade: "raw" },
    { status: "BLOCKED", grade: "blocked", metadata: { assessmentFailure: "ASSESSMENT_FAILED" } },
    { status: "VOIDED", grade: "blocked" },
    { status: "CERTIFIED", grade: "blocked", voidedAt: new Date("2026-06-15T13:00:00Z") },
  ])("keeps the latest $status assessment without falling back to earlier certification", async ({ grade, ...latest }) => {
    mockDb.closeRun.findFirst.mockResolvedValue(persistedRun({
      ...latest, id: "latest-assessment", packExports: [{ metadata: null }],
    }))
    const result = await getCloseAssuranceDashboard("org-1", period.id)
    expect(result.run).toMatchObject({ id: "latest-assessment", status: latest.status })
    expect(result.currentProof?.grade).toBe(grade)
    expect(mockDb.closeRun.findFirst).toHaveBeenCalledTimes(1)
    expect(mockDb.closeRun.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { organizationId: "org-1", periodId: period.id },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    }))
    expect(mockDb.accountingPeriod.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { organizationId: "org-1", id: period.id },
    }))
  })

  it("does not substitute a preview or successful zero when current proof cannot be read", async () => {
    mockDb.closeRun.findFirst.mockRejectedValue(new Error("owned current-proof read failed"))
    await expect(getCloseAssuranceDashboard("org-1", period.id)).rejects.toThrow("owned current-proof read failed")
    expect(mockGetPeriodClosePreflight).not.toHaveBeenCalled()
  })

  it.each(["READY", "CERTIFIED"])("keeps explicit %s history while a newer adverse assessment prevents certification", async status => {
    const retained = persistedRun({ status, packExports: [{ metadata: null }] })
    const newer = persistedRun({ id: "newer-private", status: "BLOCKED", createdAt: new Date("2026-06-15T15:00:00Z") })
    mockDb.closeRun.findFirst.mockResolvedValue(retained)
    mockDb.closeRun.findMany.mockResolvedValue([newer, retained])
    const before = JSON.stringify(retained)
    const result = await getCloseAssuranceDashboard("org-1", period.id, retained.id)
    expect(result.run).toMatchObject({ id: retained.id, status })
    expect(result.currentProof).toMatchObject({ grade: "blocked", assessmentState: "HISTORICAL", latestAssessmentCreatedAt: newer.createdAt.toISOString(), blockers: expect.arrayContaining([expect.objectContaining({ id: "close-assessment-not-current" })]) })
    expect(result.controls.certificationAvailable).toBe(false)
    expect(result.controls.packExportAvailable).toBe(true)
    expect(JSON.stringify(result.currentProof)).not.toContain("newer-private")
    expect(JSON.stringify(retained)).toBe(before)
    expect(mockDb.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "RepeatableRead" })
    expect(mockDb.closeRun.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: "org-1", periodId: period.id }, take: 2 }))
  })

  it.each([
    { state: "AMBIGUOUS", blocker: "close-assessment-order-ambiguous", voidedAt: null },
    { state: "VOIDED", blocker: "close-assessment-voided", voidedAt: new Date("2026-06-15T14:00:00Z") },
  ])("blocks $state current assessment in the dashboard without hiding retained data", async ({ state, blocker, voidedAt }) => {
    const retained = persistedRun({ status: "CERTIFIED", voidedAt, packExports: [{ metadata: null }] })
    mockDb.closeRun.findFirst.mockResolvedValue(retained)
    mockDb.closeRun.findMany.mockResolvedValue([retained, { ...retained, id: "tied-private" }])
    const result = await getCloseAssuranceDashboard("org-1", period.id, retained.id)
    expect(result.run.status).toBe("CERTIFIED")
    expect(result.currentProof).toMatchObject({ grade: "blocked", assessmentState: state, blockers: expect.arrayContaining([expect.objectContaining({ id: blocker })]) })
    expect(result.controls.certificationAvailable).toBe(false)
  })

  it("propagates same-snapshot order read failure without reporting current certification", async () => {
    mockDb.closeRun.findFirst.mockResolvedValue(persistedRun())
    mockDb.closeRun.findMany.mockRejectedValue(new Error("owned assessment-order failure"))
    await expect(getCloseAssuranceDashboard("org-1", period.id)).rejects.toThrow("owned assessment-order failure")
    expect(mockGetPeriodClosePreflight).not.toHaveBeenCalled()
    expect(mockDb.closeRun.updateMany).not.toHaveBeenCalled()
  })

  it("waits for publication locking and uses the post-lock database time independently of asOf", async () => {
    let release!: () => void, entered!: () => void
    const acquired = new Promise<void>(resolve => { entered = resolve })
    const wait = new Promise(resolve => { release = () => resolve([]) })
    mockDb.$queryRaw.mockImplementationOnce(() => { entered(); return wait })
    mockDb.closeRun.findFirst.mockResolvedValue(persistedRun())
    const work = runCloseAssurance("org-1", { periodId: period.id }, { actorId: "controller", now: "2025-01-01T00:00:00Z" })
    await acquired
    expect(mockDb.closeRun.create).not.toHaveBeenCalled()
    expect(mockReconcileLedger).not.toHaveBeenCalled()
    release()
    await work
    expect(mockDb.closeRun.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ createdAt: new Date("2026-06-15T14:00:00Z"), asOf: new Date("2025-01-01T00:00:00Z"), startedAt: new Date("2025-01-01T00:00:00Z") }) }))
    expect(mockDb.$transaction.mock.calls[0][1]).toEqual({ isolationLevel: "ReadCommitted" })
    expect(mockDb.accountingPeriod.findFirst).toHaveBeenCalledWith({ where: { id: period.id, organizationId: "org-1" }, select: { id: true } })
  })

  it.each(["2026-06-15T14:00:00Z", "2027-01-01T00:00:00Z"])("rejects publication before writes when latest timestamp %s is not earlier than database time", async latest => {
    mockDb.closeRun.findMany.mockResolvedValue([persistedRun({ createdAt: new Date(latest) })])
    await expect(runCloseAssurance("org-1", { periodId: period.id }, { actorId: "controller" })).rejects.toMatchObject({ code: "CONFLICT" })
    expect(mockDb.closeRun.create).not.toHaveBeenCalled()
    expect(mockDb.closeRun.updateMany).not.toHaveBeenCalled()
    expect(mockDb.ledgerAuditEvent.create).not.toHaveBeenCalled()
    expect(mockReconcileLedger).not.toHaveBeenCalled()
  })

  it("does not publish when the tenant-scoped period disappeared while waiting", async () => {
    mockDb.accountingPeriod.findFirst.mockResolvedValueOnce(period).mockResolvedValueOnce(null)
    await expect(runCloseAssurance("org-1", { periodId: period.id })).rejects.toMatchObject({ code: "NOT_FOUND" })
    expect(mockDb.closeRun.create).not.toHaveBeenCalled()
    expect(mockDb.closeRun.findMany).not.toHaveBeenCalled()
  })

  it("persists close runs with checklist evidence and ledger audit evidence", async () => {
    mockDb.closeRun.findFirst.mockResolvedValue(persistedRun())

    const result = await runCloseAssurance(
      "org-1",
      { periodId: period.id, correlationId: "corr-1" },
      {
        actorId: "user-1",
        actorPermissions: ["accounting.close.run"],
        now: "2026-06-15T12:00:00.000Z",
      },
    )

    expect(result.source.persisted).toBe(true)
    expect(mockDb.closeRun.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org-1",
          periodId: period.id,
          runById: "user-1",
          correlationId: "corr-1",
          status: "RUNNING",
        }),
      }),
    )
    expect(mockDb.closeChecklistItem.create).toHaveBeenCalled()
    for (const collector of [mockGetPeriodClosePreflight, mockReconcileLedger, mockGetPaymentCloseEvidence, mockGetAccountantPortalData, mockReconcileInventoryClass3, mockGetTenantOperatingSnapshot]) {
      expect(mockDb.closeRun.create.mock.invocationCallOrder[0]).toBeLessThan(collector.mock.invocationCallOrder[0])
    }
    expect(mockDb.closeRun.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "close-run-1", organizationId: "org-1", periodId: period.id, status: "RUNNING" },
      data: expect.objectContaining({ status: "READY" }),
    }))
    expect(mockDb.closeEvidenceItem.create).toHaveBeenCalled()
    const savedScope = mockDb.closeRun.updateMany.mock.calls[0][0].data.metadata.closeScope
    expect(savedScope).toMatchObject({ version: 1, organizationId: "org-1", periodId: period.id, scopeHash: expect.stringMatching(/^sha256:/) })
    expect(mockGetPaymentCloseEvidence).toHaveBeenCalledWith(savedScope)
    expect(mockGetAccountantPortalData).toHaveBeenCalledWith(
      { organizationId: "org-1", periodId: period.id, startDate: period.startDate, endDate: period.endDate, limit: 12 },
      db, new Date(savedScope.recordedThrough),
    )
    expect(mockReconcileLedger).toHaveBeenCalledWith("org-1", { periodId: period.id, recordedThrough: new Date(savedScope.recordedThrough) })
    expect(mockDb.ledgerAuditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "CLOSE_ASSURANCE_RUN_COMPLETED",
          resourceType: "CloseRun",
        }),
      }),
    )
  })

  it("does not publish evidence when the source or assessment publication guard rejects it", async () => {
    jest.mocked(guardCloseAssessmentPublicationInTx).mockResolvedValue(false)
    await runCloseAssurance("org-1", { periodId: period.id }, { actorId: "controller" })
    expect(guardCloseAssessmentPublicationInTx).toHaveBeenCalledWith(expect.anything(), { organizationId: "org-1", periodId: period.id, runId: "close-run-1", sourceRevision: { version: 1, revision: "0" } })
    expect(mockDb.closeEvidenceItem.create).not.toHaveBeenCalled()
    expect(mockDb.closeChecklistItem.create).not.toHaveBeenCalled()
    expect(mockDb.closeRun.updateMany).not.toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "READY" }) }))
  })

  it("persists verifiable collector receipts after evidence writes without inflating coverage", async () => {
    const baseline = await getCloseAssuranceDashboard("org-1", period.id)
    mockDb.closeRun.findFirst.mockResolvedValue(persistedRun())
    await runCloseAssurance("org-1", { periodId: period.id }, { actorId: "controller" })
    const rows = await Promise.all(mockDb.closeEvidenceItem.create.mock.results.map(result => result.value))
    const checklists = await Promise.all(mockDb.closeChecklistItem.create.mock.results.map(result => result.value))
    expect(mockDb.closeChecklistItem.update).toHaveBeenCalledTimes(8)
    for (const [update] of mockDb.closeChecklistItem.update.mock.calls) {
      const checklist = checklists.find(item => item.id === update.where.id)
      expect(checklist.key).not.toBe("period-state")
      expect(verifyCloseEvidenceCollectionReceipt(checklist, rows.filter(row => row.checklistItemId === checklist.id), update.data.metadata.collectionReceipt)).toBe(true)
    }
    expect(mockDb.closeEvidenceItem.create).toHaveBeenCalledTimes(baseline.evidenceItems.length)
    expect(rows.some(row => row.sourceType === "CloseCollectorSnapshot")).toBe(false)
    expect(mockDb.closeRun.updateMany.mock.calls[0][0].data.evidenceCoveragePct.toString()).toBe(String(baseline.run.evidenceCoveragePct))
    expect(mockDb.closeChecklistItem.update.mock.invocationCallOrder[0]).toBeGreaterThan(Math.max(...mockDb.closeEvidenceItem.create.mock.invocationCallOrder))
    expect(Math.max(...mockDb.closeChecklistItem.update.mock.invocationCallOrder)).toBeLessThan(mockDb.ledgerAuditEvent.create.mock.invocationCallOrder[0])
  })

  it("records a successful empty collector independently of unavailable evidence and source hashes", async () => {
    mockReconcileLedger.mockResolvedValue({ ...cleanLedger(), totalsByCurrency: [] })
    mockGetPaymentCloseEvidence.mockResolvedValue({
      ...cleanPaymentDashboard(), recentRuns: [], suspenseQueue: [],
      source: { ...cleanPaymentDashboard().source, providerEvidenceAvailable: false, statementEvidenceAvailable: false },
      summary: { ...cleanPaymentDashboard().summary, recentRunCount: 0, signedRunCount: 0 },
    })
    mockDb.closeRun.findFirst.mockResolvedValue(persistedRun())
    await runCloseAssurance("org-1", { periodId: period.id }, { actorId: "controller" })
    for (const key of ["ledger-reconciliation", "payment-reconciliation", "suspense-exceptions"]) {
      const update = mockDb.closeChecklistItem.update.mock.calls.map(call => call[0]).find(update => update.where.id === `check-${key}`)
      expect(update.data.metadata.collectionReceipt).toMatchObject({ version: 1, collectionSucceeded: true, hash: expect.stringMatching(/^[a-f0-9]{64}$/), evidence: [] })
      expect(mockDb.closeEvidenceItem.create.mock.calls.some(([input]) => input.data.checklistItemId === `check-${key}`)).toBe(false)
    }
  })

  it("retains cash review hashes as internal evidence without claiming provider signoff", async () => {
    const cashProof = { paymentRequestId: "cash-payment", exceptionId: "original-ap-exception", status: "CASH_REVIEWED", kind: "CASH_VOUCHER",
      decisionId: "cash-decision", decisionHash: "cash-decision-hash", proposalId: "cash-proposal", proposalHash: "proposal-hash", recordedAt: "2026-06-16T09:00:00.000Z" }
    mockGetAccountantPortalData.mockResolvedValue({ ...cleanDataTrust(), supplierPaymentReconciliationProofs: [cashProof] })
    mockGetPaymentCloseEvidence.mockResolvedValue({
      ...cleanPaymentDashboard(), recentRuns: [], suspenseQueue: [],
      source: { ...cleanPaymentDashboard().source, providerEvidenceAvailable: false, statementEvidenceAvailable: false },
      summary: { ...cleanPaymentDashboard().summary, recentRunCount: 0, signedRunCount: 0, readyForSignoffCount: 0 },
    })
    const result = await getCloseAssuranceDashboard("org-1", period.id)
    const checklist = result.checklist.find(row => row.key === "payment-reconciliation")
    expect(checklist).toMatchObject({ status: "PASSED", evidenceCount: 1 })
    expect(checklist?.detail).toContain("internal evidence")
    expect(result.evidenceItems).toContainEqual(expect.objectContaining({ evidenceType: "AUDIT_LOG", sourceType: "SupplierCashReceiptReview",
      sourceId: cashProof.decisionId, sourceHash: cashProof.decisionHash, sourceDate: cashProof.recordedAt, provenance: "OPERATIONAL" }))
    expect(result.evidenceItems.some(row => row.sourceType === "ReconciliationRun")).toBe(false)
  })

  it.each([
    ["ledger", () => mockReconcileLedger, ["ledger-reconciliation"]],
    ["payment", () => mockGetPaymentCloseEvidence, ["payment-reconciliation", "suspense-exceptions"]],
    ["data trust", () => mockGetAccountantPortalData, ["data-trust-provenance", "tax-payroll-ap-readiness"]],
    ["inventory", () => mockReconcileInventoryClass3, ["inventory-valuation"]],
    ["payroll", () => mockGetTenantOperatingSnapshot, ["payroll-finance-forecast-proof"]],
    ["preflight", () => mockGetPeriodClosePreflight, ["period-close-preflight"]],
  ] as const)("does not issue a collection receipt after the %s query fails", async (_name, getCollector, affectedKeys) => {
    getCollector().mockRejectedValue(new Error("owned collector failure"))
    mockDb.closeRun.findFirst.mockResolvedValue(persistedRun({ status: "BLOCKED" }))
    await runCloseAssurance("org-1", { periodId: period.id }, { actorId: "controller" })
    const updatedIds = mockDb.closeChecklistItem.update.mock.calls.map(([input]) => input.where.id)
    for (const key of affectedKeys) expect(updatedIds).not.toContain(`check-${key}`)
    expect(updatedIds.length).toBeGreaterThan(0)
    for (const key of affectedKeys) {
      const created = mockDb.closeChecklistItem.create.mock.calls.find(([input]) => input.data.key === key)
      expect(created?.[0].data.status).toBe("UNAVAILABLE")
    }
  })

  it("keeps a successfully observed failed control failed when recording its receipt", async () => {
    mockReconcileLedger.mockResolvedValue({ ...cleanLedger(), isClean: false, failures: [{ severity: "critical", type: "UNBALANCED", message: "Ledger does not balance." }] })
    mockDb.closeRun.findFirst.mockResolvedValue(persistedRun({ status: "BLOCKED" }))
    await runCloseAssurance("org-1", { periodId: period.id }, { actorId: "controller" })
    const control = mockDb.closeChecklistItem.create.mock.calls.find(([input]) => input.data.key === "ledger-reconciliation")?.[0].data
    expect(control.status).toBe("FAILED")
    expect(mockDb.closeChecklistItem.update.mock.calls.find(([input]) => input.where.id === "check-ledger-reconciliation")?.[0].data).toEqual({ metadata: { collectionReceipt: expect.objectContaining({ collectionSucceeded: true }) } })
    expect(mockDb.closeRun.updateMany.mock.calls[0][0].data.status).toBe("BLOCKED")
  })

  it("does not overwrite an in-flight source invalidation with an older READY assessment", async () => {
    let status = "RUNNING"
    mockDb.closeRun.findFirst.mockImplementation(async () => persistedRun({ status, metadata: { staleState: { status: "EVIDENCE_STALE", sourceId: "new-event" } } }))
    mockReconcileLedger.mockImplementationOnce(async () => {
      expect(mockDb.closeRun.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "RUNNING" }) }))
      status = "BLOCKED"
      return cleanLedger()
    })
    mockDb.closeRun.updateMany.mockImplementation(async ({ where, data }) => {
      if (status !== where.status) return { count: 0 }
      status = data.status
      return { count: 1 }
    })
    const result = await runCloseAssurance("org-1", { periodId: period.id }, { actorId: "controller" })
    expect(result.run.status).toBe("BLOCKED")
    expect(status).toBe("BLOCKED")
    expect(mockDb.closeChecklistItem.create).not.toHaveBeenCalled()
    expect(mockDb.closeEvidenceItem.create).not.toHaveBeenCalled()
    expect(mockDb.ledgerAuditEvent.create).not.toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "CLOSE_ASSURANCE_RUN_COMPLETED" }) }))
  })

  it("retains a blocked failure state when collection fails before finalization", async () => {
    mockDb.accountingPeriod.findFirst.mockResolvedValueOnce(period).mockResolvedValueOnce(period).mockRejectedValueOnce(new Error("assessment source unavailable"))
    await expect(runCloseAssurance("org-1", { periodId: period.id }, { actorId: "controller" })).rejects.toThrow("assessment source unavailable")
    expect(mockDb.closeRun.updateMany).toHaveBeenCalledWith({
      where: { id: "close-run-1", organizationId: "org-1", status: "RUNNING" },
      data: expect.objectContaining({ status: "BLOCKED", metadata: expect.objectContaining({ assessmentFailure: "ASSESSMENT_FAILED" }) }),
    })
    expect(mockDb.closeChecklistItem.create).not.toHaveBeenCalled()
  })

  it("retains a blocked failure state when assessment persistence rolls back", async () => {
    mockDb.$transaction.mockImplementationOnce(callback => callback(mockDb)).mockRejectedValueOnce(new Error("transaction rolled back"))
    await expect(runCloseAssurance("org-1", { periodId: period.id }, { actorId: "controller" })).rejects.toThrow("transaction rolled back")
    expect(mockDb.closeRun.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "close-run-1", organizationId: "org-1", status: "RUNNING" }, data: expect.objectContaining({ status: "BLOCKED" }),
    }))
  })

  it("defaults finding assignment to the current actor and audits the action", async () => {
    mockDb.closeAssuranceFinding.findFirst.mockResolvedValue({
      id: "finding-1",
      organizationId: "org-1",
      periodId: period.id,
      closeRunId: "close-run-1",
      status: "OPEN",
      closeRun: { id: "close-run-1" },
    })
    mockDb.closeAssuranceFinding.update.mockResolvedValue({
      id: "finding-1",
      checklistItemId: "check-1",
      domain: "LEDGER",
      severity: "HIGH",
      status: "ASSIGNED",
      title: "Draft entries remain open",
      detail: "1 blocker detected.",
      sourceService: "services/accounting/periods.service.ts",
      sourceType: "AccountingPeriodClosePreflight",
      sourceId: null,
      ownerId: "user-1",
      assignedById: "user-1",
      assignedAt: new Date("2026-06-15T12:00:00.000Z"),
      dueAt: null,
      waiverRequestedById: null,
      waiverApprovedById: null,
      correlationId: "corr-assign",
    })

    const result = await assignCloseFinding(
      "org-1",
      { findingId: "finding-1", correlationId: "corr-assign" },
      { actorId: "user-1" },
    )

    expect(result.ownerId).toBe("user-1")
    expect(mockDb.closeAssuranceFinding.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ownerId: "user-1",
          status: "ASSIGNED",
        }),
      }),
    )
    expect(mockDb.ledgerAuditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "CLOSE_FINDING_ASSIGNED",
          resourceId: "finding-1",
        }),
      }),
    )
  })

  it.each(["ASSIGNED", "IN_REVIEW", "REOPENED"])("preserves retained evidence requests when ordinary assignment targets a %s finding", async (status) => {
    mockDb.closeAssuranceFinding.findFirst.mockResolvedValue({ id: "finding-1", organizationId: "org-1", periodId: period.id, closeRunId: "close-run-1", status, ownerId: "recipient-1", closeRun: { id: "close-run-1" } })
    // Admission fails closed even if this old request's metadata is malformed.
    mockDb.accountantComment.findFirst.mockResolvedValue({ id: "retained-request" })
    await expect(assignCloseFinding("org-1", { findingId: "finding-1", assignedToId: "recipient-1" }, { actorId: "user-1" })).rejects.toMatchObject({ code: "CONFLICT" })
    expect(mockDb.accountantComment.findFirst).toHaveBeenCalledWith({ where: { organizationId: "org-1", findingId: "finding-1", visibility: "CLIENT_ACTION_REQUIRED" }, select: { id: true } })
    expect(mockDb.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "Serializable" })
    expect(mockDb.closeAssuranceFinding.update).not.toHaveBeenCalled()
    expect(mockDb.ledgerAuditEvent.create).not.toHaveBeenCalled()
    expect(mockRecordBusinessEventInTx).not.toHaveBeenCalled()
  })

  describe("controlled evidence recipient replacement", () => {
    const command = { requestId: "request-1", expectedRevision: "request-1", requestedFromId: "new-recipient", reason: "The original recipient has left the organization.", correlationId: "change-correlation" }
    const control = { actorId: "accountant-1", session: { id: "session", token: "local-test-token" } }
    beforeEach(() => {
      mockDb.accountantComment.findFirst.mockResolvedValue(missingEvidenceComment())
      mockDb.accountantComment.findMany.mockResolvedValue([{ id: "request-1" }])
      mockDb.closeAssuranceFinding.findFirst.mockResolvedValue(missingEvidenceFinding({ status: "ASSIGNED", ownerId: "client-user-1" }))
      mockDb.closeAssuranceFinding.update.mockResolvedValue({ dueAt: new Date("2026-08-05T12:00:00Z") })
      mockDb.$queryRaw.mockResolvedValue([{ createdAt: new Date("2026-08-03T12:00:00Z") }])
      mockDb.ledgerAuditEvent.create.mockImplementation(async ({ data }) => ({ id: "change-1", ...data }))
    })
    it("retains the original request and atomically records the replacement without resetting status", async () => {
      const result = await replaceMissingCloseEvidenceRecipient("client-org", command, control)
      expect(result).toMatchObject({ requestId: "request-1", revision: "change-1", recipientId: "new-recipient" })
      expect(lockCloseEvidenceWorkAuthorityInTx).toHaveBeenCalledWith(mockDb, expect.objectContaining({ operation: "request", requireFindingAssignment: true, session: control.session }))
      expect(lockCloseEvidenceRecipientInTx).toHaveBeenCalledWith(mockDb, { organizationId: "client-org", recipientId: "new-recipient" })
      expect(mockDb.closeAssuranceFinding.update).toHaveBeenCalledWith({ where: { id: "finding-1" }, data: { ownerId: "new-recipient", assignedById: "accountant-1", assignedAt: new Date("2026-08-03T12:00:00Z"), correlationId: "change-correlation" } })
      expect(mockDb.accountantComment.create).not.toHaveBeenCalled()
      expect(mockDb.ledgerAuditEvent.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "CLOSE_MISSING_EVIDENCE_RECIPIENT_REPLACED", resourceId: "request-1", metadata: expect.objectContaining({ originalRecipientId: "client-user-1", fromId: "client-user-1", toId: "new-recipient", previousRevision: "request-1", sequence: 1, reason: command.reason }) }) }))
      expect(mockRecordBusinessEventInTx).toHaveBeenCalledTimes(1)
    })
    it.each(["stale", "same-owner", "submitted", "response", "ambiguous", "clock"])("refuses %s replacement before any effects", async failure => {
      const input = { ...command }
      if (failure === "stale") input.expectedRevision = "obsolete"
      if (failure === "same-owner") input.requestedFromId = "client-user-1"
      if (failure === "submitted") mockDb.closeAssuranceFinding.findFirst.mockResolvedValue(missingEvidenceFinding({ status: "IN_REVIEW", ownerId: "client-user-1" }))
      if (failure === "response" || failure === "ambiguous") mockDb.accountantComment.findMany.mockResolvedValue([{ id: "request-1" }, { id: failure }])
      if (failure === "clock") mockDb.$queryRaw.mockResolvedValue([{ createdAt: missingEvidenceComment().createdAt }])
      await expect(replaceMissingCloseEvidenceRecipient("client-org", input, control)).rejects.toMatchObject({ code: "CONFLICT" })
      expect(mockDb.closeAssuranceFinding.update).not.toHaveBeenCalled()
      expect(mockDb.ledgerAuditEvent.create).not.toHaveBeenCalled()
      expect(mockRecordBusinessEventInTx).not.toHaveBeenCalled()
    })
    it("replays only an identical recorded command without changing current ownership", async () => {
      const prior = { id: "change-1", actorId: "accountant-1", createdAt: new Date("2026-08-03T12:00:00Z"), metadata: { version: 1, requestId: "request-1", findingId: "finding-1", periodId: period.id, closeRunId: "close-run-1", previousRevision: command.expectedRevision, toId: command.requestedFromId, reason: command.reason } }
      mockDb.ledgerAuditEvent.findFirst.mockResolvedValue(prior)
      expect((await replaceMissingCloseEvidenceRecipient("client-org", command, control)).revision).toBe("change-1")
      expect(mockDb.closeAssuranceFinding.update).not.toHaveBeenCalled()
      await expect(replaceMissingCloseEvidenceRecipient("client-org", { ...command, reason: "Different reason for the same retry." }, control)).rejects.toMatchObject({ code: "CONFLICT" })
    })
  })

  it("adds source-linked accountant comments to persisted close findings", async () => {
    mockDb.closeAssuranceFinding.findFirst.mockResolvedValue({
      id: "finding-1",
      organizationId: "org-1",
      periodId: period.id,
      closeRunId: "close-run-1",
      status: "OPEN",
      closeRun: { id: "close-run-1" },
    })
    mockDb.accountantComment.create.mockResolvedValue({
      id: "comment-1",
      findingId: "finding-1",
      evidenceItemId: null,
      reviewId: null,
      authorId: "accountant-1",
      body: "Reviewed suspense evidence and assigned to finance.",
      visibility: "INTERNAL",
      createdAt: new Date("2026-06-15T12:10:00.000Z"),
    })

    const result = await commentOnCloseFinding(
      "org-1",
      {
        findingId: "finding-1",
        body: "Reviewed suspense evidence and assigned to finance.",
      },
      { actorId: "accountant-1" },
    )

    expect(result.findingId).toBe("finding-1")
    expect(result.authorId).toBe("accountant-1")
    expect(mockDb.ledgerAuditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "CLOSE_ACCOUNTANT_COMMENT_ADDED",
        }),
      }),
    )
  })

  it("creates an atomic delegated missing-proof request with audit and notification evidence", async () => {
    const now = new Date("2026-08-02T09:00:00.000Z")
    const dueAt = new Date("2026-08-05T12:00:00.000Z")
    jest.useFakeTimers().setSystemTime(now)
    mockDb.closeAssuranceFinding.findFirst.mockResolvedValue(
      missingEvidenceFinding(),
    )
    mockDb.accountantComment.create.mockResolvedValue(
      missingEvidenceComment(),
    )

    const result = await requestMissingCloseEvidence(
      "firm-org",
      {
        clientOrganizationId: "client-org",
        findingId: "finding-1",
        requestedFromId: "client-user-1",
        requestText: "Please attach the missing signed bank statement.",
        dueAt,
        correlationId: "missing-proof-corr-1",
      },
      {
        actorId: "accountant-1",
        actorPermissions: ["accounting.close.evidence.request"],
      },
    )

    expect(result).toMatchObject({
      id: "request-1",
      organizationId: "client-org",
      findingId: "finding-1",
      requestedById: "accountant-1",
      requestedFromId: "client-user-1",
      dueAt: dueAt.toISOString(),
      status: "OPEN",
      correlationId: "missing-proof-corr-1",
    })
    expect(mockDb.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      { isolationLevel: "Serializable" },
    )
    expect(mockResolveAccountantClientAccess).toHaveBeenCalledWith({
      homeOrganizationId: "firm-org",
      clientOrganizationId: "client-org",
      accountantUserId: "accountant-1",
      capability: "REVIEW",
      now,
      client: mockDb,
    })
    expect(mockDb.closeAssuranceFinding.findFirst).toHaveBeenCalledWith({
      where: { id: "finding-1", organizationId: "client-org" },
      include: {
        checklistItem: {
          select: { status: true, evidenceCount: true },
        },
        evidenceItems: {
          where: { available: false },
          select: { id: true },
          take: 1,
        },
      },
    })
    expect(mockDb.user.findFirst).toHaveBeenCalledWith({
      where: {
        id: "client-user-1",
        organizationId: "client-org",
        isActive: true,
      },
      select: { id: true },
    })
    expect(mockDb.closeAssuranceFinding.update).toHaveBeenCalledWith({
      where: { id: "finding-1" },
      data: {
        ownerId: "client-user-1",
        assignedById: "accountant-1",
        assignedAt: now,
        dueAt,
        status: "ASSIGNED",
        correlationId: "missing-proof-corr-1",
      },
    })
    expect(mockDb.accountantComment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: "client-org",
        findingId: "finding-1",
        authorId: "accountant-1",
        body: "Please attach the missing signed bank statement.",
        visibility: "CLIENT_ACTION_REQUIRED",
        correlationId: "missing-proof-corr-1",
        metadata: expect.objectContaining({
          requestType: "MISSING_CLOSE_EVIDENCE",
          requestedFromId: "client-user-1",
          dueAt: dueAt.toISOString(),
        }),
      }),
    })
    expect(mockDb.ledgerAuditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "CLOSE_MISSING_EVIDENCE_REQUESTED",
          actorId: "accountant-1",
          resourceType: "AccountantComment",
          resourceId: "request-1",
        }),
      }),
    )
    expect(mockRecordBusinessEventInTx).toHaveBeenCalledWith(
      mockDb,
      expect.objectContaining({
        organizationId: "client-org",
        eventType: "close.assurance.missing_evidence.requested",
        payload: expect.objectContaining({
          requestId: "request-1",
          requestedFromId: "client-user-1",
          ownerId: "client-user-1",
          dueAt: dueAt.toISOString(),
        }),
      }),
    )
  })

  it.each([
    ["missing actor", {}, new Date("2026-08-05T12:00:00.000Z")],
    [
      "invalid due date",
      { actorId: "accountant-1" },
      new Date(NaN),
    ],
  ])("rejects missing-proof request %s before access or transaction work", async (
    _name,
    control,
    dueAt,
  ) => {
    jest.useFakeTimers().setSystemTime(new Date("2026-08-02T09:00:00.000Z"))

    await expect(
      requestMissingCloseEvidence(
        "firm-org",
        {
          clientOrganizationId: "client-org",
          findingId: "finding-1",
          requestedFromId: "client-user-1",
          requestText: "Please attach the missing signed bank statement.",
          dueAt,
          correlationId: "missing-proof-corr-1",
        },
        control,
      ),
    ).rejects.toBeInstanceOf(Error)

    expect(mockResolveAccountantClientAccess).not.toHaveBeenCalled()
    expect(mockDb.$transaction).not.toHaveBeenCalled()
  })

  it("rejects cross-tenant or inactive missing-proof recipients before mutation", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-08-02T09:00:00.000Z"))
    mockDb.closeAssuranceFinding.findFirst.mockResolvedValue(
      missingEvidenceFinding(),
    )
    mockDb.user.findFirst.mockResolvedValue(null)

    await expect(
      requestMissingCloseEvidence(
        "firm-org",
        {
          clientOrganizationId: "client-org",
          findingId: "finding-1",
          requestedFromId: "other-org-user",
          requestText: "Please attach the missing signed bank statement.",
          dueAt: new Date("2026-08-05T12:00:00.000Z"),
          correlationId: "missing-proof-corr-1",
        },
        { actorId: "accountant-1" },
      ),
    ).rejects.toThrow(/active user of the client organization/i)

    expect(mockDb.user.findFirst).toHaveBeenCalledWith({
      where: {
        id: "other-org-user",
        organizationId: "client-org",
        isActive: true,
      },
      select: { id: true },
    })
    expect(mockDb.closeAssuranceFinding.update).not.toHaveBeenCalled()
    expect(mockDb.accountantComment.create).not.toHaveBeenCalled()
    expect(mockDb.ledgerAuditEvent.create).not.toHaveBeenCalled()
    expect(mockRecordBusinessEventInTx).not.toHaveBeenCalled()
  })

  it.each([
    [
      "resolved finding",
      missingEvidenceFinding({ status: "RESOLVED" }),
      /cannot receive missing-proof requests/i,
    ],
    [
      "finding without missing evidence",
      missingEvidenceFinding({
        checklistItem: { status: "PASSED", evidenceCount: 1 },
        evidenceItems: [],
      }),
      /no verified missing-evidence condition/i,
    ],
  ])("rejects %s before missing-proof mutation", async (
    _name,
    finding,
    expectedMessage,
  ) => {
    jest.useFakeTimers().setSystemTime(new Date("2026-08-02T09:00:00.000Z"))
    mockDb.closeAssuranceFinding.findFirst.mockResolvedValue(finding)

    await expect(
      requestMissingCloseEvidence(
        "firm-org",
        {
          clientOrganizationId: "client-org",
          findingId: "finding-1",
          requestedFromId: "client-user-1",
          requestText: "Please attach the missing signed bank statement.",
          dueAt: new Date("2026-08-05T12:00:00.000Z"),
          correlationId: "missing-proof-corr-1",
        },
        { actorId: "accountant-1" },
      ),
    ).rejects.toThrow(expectedMessage)

    expect(mockDb.closeAssuranceFinding.update).not.toHaveBeenCalled()
    expect(mockDb.accountantComment.create).not.toHaveBeenCalled()
    expect(mockDb.ledgerAuditEvent.create).not.toHaveBeenCalled()
    expect(mockRecordBusinessEventInTx).not.toHaveBeenCalled()
  })

  it.each(["OPEN", "ASSIGNED", "IN_REVIEW", "REOPENED"])("rejects a second distinct missing-proof request for a %s finding without replacing its assignment", async status => {
    jest.useFakeTimers().setSystemTime(new Date("2026-08-02T09:00:00.000Z"))
    mockDb.accountantComment.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "original-request" })
    mockDb.closeAssuranceFinding.findFirst.mockResolvedValue(missingEvidenceFinding({ status }))
    mockDb.accountantComment.create.mockResolvedValue(missingEvidenceComment())
    await expect(requestMissingCloseEvidence("firm-org", {
      clientOrganizationId: "client-org", findingId: "finding-1", requestedFromId: "client-user-1",
      requestText: "Please attach the missing signed bank statement.", dueAt: new Date("2026-08-05T12:00:00.000Z"), correlationId: "different-request-key",
    }, { actorId: "accountant-1" })).rejects.toMatchObject({ code: "CONFLICT" })
    expect(mockDb.accountantComment.findFirst).toHaveBeenCalledWith({ where: { organizationId: "client-org", findingId: "finding-1", visibility: "CLIENT_ACTION_REQUIRED" }, select: { id: true } })
    expect(mockDb.closeAssuranceFinding.update).not.toHaveBeenCalled()
    expect(mockDb.accountantComment.create).not.toHaveBeenCalled()
    expect(mockDb.ledgerAuditEvent.create).not.toHaveBeenCalled()
    expect(mockRecordBusinessEventInTx).not.toHaveBeenCalled()
  })

  it.each(["2026-08-02T09:00:00.000Z", "2026-08-05T12:00:00.000Z", "2026-08-06T09:00:00.000Z"])("returns an exact correlation replay without duplicate side effects at %s", async (now) => {
    jest.useFakeTimers().setSystemTime(new Date(now))
    mockDb.accountantComment.findFirst.mockResolvedValue(
      missingEvidenceComment(),
    )

    const result = await requestMissingCloseEvidence(
      "firm-org",
      {
        clientOrganizationId: "client-org",
        findingId: "finding-1",
        requestedFromId: "client-user-1",
        requestText: "Please attach the missing signed bank statement.",
        dueAt: new Date("2026-08-05T12:00:00.000Z"),
        correlationId: "missing-proof-corr-1",
      },
      { actorId: "accountant-1" },
    )

    expect(result).toMatchObject({
      id: "request-1",
      requestedFromId: "client-user-1",
      status: "OPEN",
    })
    expect(mockDb.accountantComment.findFirst).toHaveBeenCalledWith({
      where: {
        organizationId: "client-org",
        findingId: "finding-1",
        correlationId: "missing-proof-corr-1",
        visibility: "CLIENT_ACTION_REQUIRED",
      },
    })
    expect(mockDb.closeAssuranceFinding.findFirst).not.toHaveBeenCalled()
    expect(mockDb.user.findFirst).not.toHaveBeenCalled()
    expect(lockCloseEvidenceRecipientInTx).not.toHaveBeenCalled()
    expect(mockDb.closeAssuranceFinding.update).not.toHaveBeenCalled()
    expect(mockDb.accountantComment.create).not.toHaveBeenCalled()
    expect(mockDb.ledgerAuditEvent.create).not.toHaveBeenCalled()
    expect(mockRecordBusinessEventInTx).not.toHaveBeenCalled()
  })

  it.each(["2026-08-05T12:00:00.000Z", "2026-08-06T09:00:00.000Z"])("rejects a new expired missing-proof request at %s without side effects", async (now) => {
    jest.useFakeTimers().setSystemTime(new Date(now))
    await expect(requestMissingCloseEvidence("firm-org", {
      clientOrganizationId: "client-org", findingId: "finding-1", requestedFromId: "client-user-1",
      requestText: "Please attach the missing signed bank statement.", dueAt: new Date("2026-08-05T12:00:00.000Z"), correlationId: "new-expired-request",
    }, { actorId: "accountant-1" })).rejects.toThrow(/due date must be in the future/i)
    expect(mockDb.closeAssuranceFinding.update).not.toHaveBeenCalled()
    expect(mockDb.accountantComment.create).not.toHaveBeenCalled()
    expect(mockDb.ledgerAuditEvent.create).not.toHaveBeenCalled()
    expect(mockRecordBusinessEventInTx).not.toHaveBeenCalled()
  })

  it.each(["2026-08-02T09:00:00.000Z", "2026-08-06T09:00:00.000Z"])("rejects correlation reuse for a different missing-proof request at %s", async (now) => {
    jest.useFakeTimers().setSystemTime(new Date(now))
    mockDb.accountantComment.findFirst.mockResolvedValue(
      missingEvidenceComment(),
    )

    await expect(
      requestMissingCloseEvidence(
        "firm-org",
        {
          clientOrganizationId: "client-org",
          findingId: "finding-1",
          requestedFromId: "client-user-1",
          requestText: "Please attach a different proof document.",
          dueAt: new Date("2026-08-05T12:00:00.000Z"),
          correlationId: "missing-proof-corr-1",
        },
        { actorId: "accountant-1" },
      ),
    ).rejects.toThrow(/different missing-proof request/i)

    expect(mockDb.closeAssuranceFinding.update).not.toHaveBeenCalled()
    expect(mockDb.accountantComment.create).not.toHaveBeenCalled()
    expect(mockRecordBusinessEventInTx).not.toHaveBeenCalled()
  })

  it.each([["P2034", undefined], ["P2002", undefined], ["P2010", "40001"], ["P2010", "40P01"]])(
    "retries serializable missing-proof transaction after %s",
    async (code, sqlState) => {
      jest.useFakeTimers().setSystemTime(
        new Date("2026-08-02T09:00:00.000Z"),
      )
      mockDb.$transaction
        .mockRejectedValueOnce(Object.assign(new Error("retry"), { code, meta: { code: sqlState } }))
        .mockImplementationOnce((callback) => callback(mockDb))
      mockDb.closeAssuranceFinding.findFirst.mockResolvedValue(
        missingEvidenceFinding(),
      )
      mockDb.accountantComment.create.mockResolvedValue(
        missingEvidenceComment(),
      )

      await expect(
        requestMissingCloseEvidence(
          "firm-org",
          {
            clientOrganizationId: "client-org",
            findingId: "finding-1",
            requestedFromId: "client-user-1",
            requestText: "Please attach the missing signed bank statement.",
            dueAt: new Date("2026-08-05T12:00:00.000Z"),
            correlationId: "missing-proof-corr-1",
          },
          { actorId: "accountant-1" },
        ),
      ).resolves.toMatchObject({ id: "request-1", status: "OPEN" })

      expect(mockDb.$transaction).toHaveBeenCalledTimes(2)
      expect(mockDb.accountantComment.create).toHaveBeenCalledTimes(1)
      expect(mockRecordBusinessEventInTx).toHaveBeenCalledTimes(1)
    },
  )

  it("normalizes an unexpected missing-proof transaction failure without retrying", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-08-02T09:00:00.000Z"))
    mockDb.$transaction.mockRejectedValueOnce(
      new Error("database transport leaked detail"),
    )

    await expect(
      requestMissingCloseEvidence(
        "firm-org",
        {
          clientOrganizationId: "client-org",
          findingId: "finding-1",
          requestedFromId: "client-user-1",
          requestText: "Please attach the missing signed bank statement.",
          dueAt: new Date("2026-08-05T12:00:00.000Z"),
          correlationId: "missing-proof-corr-1",
        },
        { actorId: "accountant-1" },
      ),
    ).rejects.toMatchObject({
      name: "ApplicationError",
      code: "INTERNAL_ERROR",
      status: 500,
      expose: false,
      message: "Missing-proof workflow transaction failed.",
    })

    expect(mockDb.$transaction).toHaveBeenCalledTimes(1)
    expect(mockDb.accountantComment.create).not.toHaveBeenCalled()
    expect(mockRecordBusinessEventInTx).not.toHaveBeenCalled()
  })

  it("submits an atomic recipient-owned missing-proof response with minimized evidence", async () => {
    const responseText =
      "The signed bank statement has been delivered for review."
    mockDb.accountantComment.findFirst
      .mockResolvedValueOnce(missingEvidenceComment())
      .mockResolvedValueOnce(null)
    mockDb.closeAssuranceFinding.findFirst.mockResolvedValue(
      missingEvidenceFinding({
        status: "ASSIGNED",
        ownerId: "client-user-1",
      }),
    )
    mockDb.accountantComment.create.mockResolvedValue(
      missingEvidenceResponse({ body: responseText }),
    )

    const result = await respondToMissingCloseEvidence(
      "client-org",
      {
        requestId: "request-1",
        responseText,
        correlationId: "missing-proof-response-corr-1",
      },
      {
        actorId: "client-user-1",
        actorPermissions: ["accounting.close.finding.comment"],
      },
    )

    expect(result).toMatchObject({
      id: "response-1",
      requestId: "request-1",
      organizationId: "client-org",
      periodId: period.id,
      closeRunId: "close-run-1",
      findingId: "finding-1",
      requestedById: "accountant-1",
      requestedFromId: "client-user-1",
      respondedById: "client-user-1",
      responseText,
      requestCorrelationId: "missing-proof-corr-1",
      status: "SUBMITTED",
      correlationId: "missing-proof-response-corr-1",
    })
    expect(mockDb.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: "Serializable",
    })
    expect(mockDb.user.findFirst).toHaveBeenCalledWith({
      where: {
        id: "client-user-1",
        organizationId: "client-org",
        isActive: true,
      },
      select: { id: true },
    })
    expect(mockDb.accountantComment.findFirst).toHaveBeenNthCalledWith(1, {
      where: {
        id: "request-1",
        organizationId: "client-org",
        visibility: "CLIENT_ACTION_REQUIRED",
        metadata: {
          path: ["requestType"],
          equals: "MISSING_CLOSE_EVIDENCE",
        },
      },
    })
    expect(mockDb.accountantComment.findFirst).toHaveBeenNthCalledWith(2, {
      where: {
        organizationId: "client-org",
        correlationId: "missing-proof-response-corr-1",
        visibility: "CLIENT_RESPONSE_SUBMITTED",
      },
    })
    expect(mockDb.closeAssuranceFinding.findFirst).toHaveBeenCalledWith({
      where: { id: "finding-1", organizationId: "client-org" },
      select: {
        id: true,
        periodId: true,
        closeRunId: true,
        ownerId: true,
        status: true,
        severity: true,
      },
    })
    expect(mockDb.closeAssuranceFinding.update).toHaveBeenCalledWith({
      where: { id: "finding-1" },
      data: {
        status: "IN_REVIEW",
        correlationId: "missing-proof-response-corr-1",
      },
    })
    expect(mockDb.accountantComment.create).toHaveBeenCalledWith({
      data: {
        organizationId: "client-org",
        periodId: period.id,
        closeRunId: "close-run-1",
        findingId: "finding-1",
        authorId: "client-user-1",
        body: responseText,
        visibility: "CLIENT_RESPONSE_SUBMITTED",
        correlationId: "missing-proof-response-corr-1",
        metadata: {
          responseType: "MISSING_CLOSE_EVIDENCE_RESPONSE",
          requestId: "request-1",
          requestCorrelationId: "missing-proof-corr-1",
          requestedById: "accountant-1",
          requestedFromId: "client-user-1",
          respondedById: "client-user-1",
          correlationId: "missing-proof-response-corr-1",
        },
      },
    })
    expect(mockDb.ledgerAuditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "CLOSE_MISSING_EVIDENCE_RESPONSE_SUBMITTED",
          actorId: "client-user-1",
          resourceType: "AccountantComment",
          resourceId: "response-1",
          metadata: expect.objectContaining({
            requestId: "request-1",
            findingId: "finding-1",
            respondedById: "client-user-1",
            status: "SUBMITTED",
          }),
        }),
      }),
    )
    const auditInput = mockDb.ledgerAuditEvent.create.mock.calls.at(-1)?.[0]
    expect(JSON.stringify(auditInput)).not.toContain(responseText)
    expect(mockRecordBusinessEventInTx).toHaveBeenCalledWith(
      mockDb,
      expect.objectContaining({
        organizationId: "client-org",
        eventType: "close.assurance.missing_evidence.response_submitted",
        actorId: "client-user-1",
        sourceId: "finding-1",
        payload: expect.objectContaining({
          requestId: "request-1",
          responseId: "response-1",
          responseType: "MISSING_CLOSE_EVIDENCE_RESPONSE",
          requestedById: "accountant-1",
          requestedFromId: "client-user-1",
          respondedById: "client-user-1",
          status: "SUBMITTED",
        }),
      }),
    )
    const eventInput = mockRecordBusinessEventInTx.mock.calls.at(-1)?.[1]
    expect(JSON.stringify(eventInput)).not.toContain(responseText)
  })

  it("rejects a missing-proof response without an authenticated actor before transaction work", async () => {
    await expect(
      respondToMissingCloseEvidence(
        "client-org",
        {
          requestId: "request-1",
          responseText:
            "The signed bank statement has been delivered for review.",
          correlationId: "missing-proof-response-corr-1",
        },
        {},
      ),
    ).rejects.toThrow(/authenticated client recipient/i)

    expect(mockDb.$transaction).not.toHaveBeenCalled()
    expect(mockDb.user.findFirst).not.toHaveBeenCalled()
  })

  it("rejects an inactive or cross-tenant response actor before request lookup", async () => {
    mockDb.user.findFirst.mockResolvedValue(null)

    await expect(
      respondToMissingCloseEvidence(
        "client-org",
        {
          requestId: "request-1",
          responseText:
            "The signed bank statement has been delivered for review.",
          correlationId: "missing-proof-response-corr-1",
        },
        { actorId: "other-org-user" },
      ),
    ).rejects.toThrow(/active user of the client organization/i)

    expect(mockDb.user.findFirst).toHaveBeenCalledWith({
      where: {
        id: "other-org-user",
        organizationId: "client-org",
        isActive: true,
      },
      select: { id: true },
    })
    expect(mockDb.accountantComment.findFirst).not.toHaveBeenCalled()
    expect(mockDb.closeAssuranceFinding.update).not.toHaveBeenCalled()
  })

  it.each([
    ["unknown or cross-tenant request", null, /request not found/i],
    [
      "malformed typed request evidence",
      missingEvidenceComment({
        metadata: {
          requestType: "MISSING_CLOSE_EVIDENCE",
          requestedFromId: "client-user-1",
          dueAt: "2026-08-05T12:00:00.000Z",
          correlationId: "missing-proof-corr-1",
        },
      }),
      /request evidence is incomplete/i,
    ],
  ])("rejects %s before response mutation", async (_name, request, error) => {
    mockDb.accountantComment.findFirst.mockResolvedValueOnce(request)

    await expect(
      respondToMissingCloseEvidence(
        "client-org",
        {
          requestId: "request-1",
          responseText:
            "The signed bank statement has been delivered for review.",
          correlationId: "missing-proof-response-corr-1",
        },
        { actorId: "client-user-1" },
      ),
    ).rejects.toThrow(error)

    expect(mockDb.closeAssuranceFinding.findFirst).not.toHaveBeenCalled()
    expect(mockDb.closeAssuranceFinding.update).not.toHaveBeenCalled()
    expect(mockDb.accountantComment.create).not.toHaveBeenCalled()
  })

  it("rejects a tenant actor who is not the typed request recipient", async () => {
    mockDb.accountantComment.findFirst.mockResolvedValueOnce(
      missingEvidenceComment({
        metadata: {
          ...missingEvidenceComment().metadata,
          requestedFromId: "another-client-user",
        },
      }),
    )

    await expect(
      respondToMissingCloseEvidence(
        "client-org",
        {
          requestId: "request-1",
          responseText:
            "The signed bank statement has been delivered for review.",
          correlationId: "missing-proof-response-corr-1",
        },
        { actorId: "client-user-1" },
      ),
    ).rejects.toThrow(/requested client recipient/i)

    expect(mockDb.accountantComment.findFirst).toHaveBeenCalledTimes(1)
    expect(mockDb.closeAssuranceFinding.findFirst).not.toHaveBeenCalled()
    expect(mockDb.accountantComment.create).not.toHaveBeenCalled()
  })

  it.each([
    [
      "request/finding period mismatch",
      missingEvidenceFinding({
        status: "ASSIGNED",
        ownerId: "client-user-1",
        periodId: "other-period",
      }),
      /does not match its finding/i,
    ],
    [
      "finding already in review",
      missingEvidenceFinding({
        status: "IN_REVIEW",
        ownerId: "client-user-1",
      }),
      /not awaiting a missing-proof response/i,
    ],
    [
      "resolved finding",
      missingEvidenceFinding({
        status: "RESOLVED",
        ownerId: "client-user-1",
      }),
      /not awaiting a missing-proof response/i,
    ],
    [
      "waived finding",
      missingEvidenceFinding({
        status: "WAIVED_WITH_APPROVAL",
        ownerId: "client-user-1",
      }),
      /not awaiting a missing-proof response/i,
    ],
    [
      "different finding owner",
      missingEvidenceFinding({
        status: "ASSIGNED",
        ownerId: "another-client-user",
      }),
      /assigned finding owner/i,
    ],
  ])("rejects %s before response mutation", async (_name, finding, error) => {
    mockDb.accountantComment.findFirst
      .mockResolvedValueOnce(missingEvidenceComment())
      .mockResolvedValueOnce(null)
    mockDb.closeAssuranceFinding.findFirst.mockResolvedValue(finding)

    await expect(
      respondToMissingCloseEvidence(
        "client-org",
        {
          requestId: "request-1",
          responseText:
            "The signed bank statement has been delivered for review.",
          correlationId: "missing-proof-response-corr-1",
        },
        { actorId: "client-user-1" },
      ),
    ).rejects.toThrow(error)

    expect(mockDb.closeAssuranceFinding.update).not.toHaveBeenCalled()
    expect(mockDb.accountantComment.create).not.toHaveBeenCalled()
    expect(mockDb.ledgerAuditEvent.create).not.toHaveBeenCalled()
    expect(mockRecordBusinessEventInTx).not.toHaveBeenCalled()
  })

  it("returns an exact missing-proof response replay without duplicate side effects", async () => {
    mockDb.accountantComment.findFirst
      .mockResolvedValueOnce(missingEvidenceComment())
      .mockResolvedValueOnce(missingEvidenceResponse())

    const result = await respondToMissingCloseEvidence(
      "client-org",
      {
        requestId: "request-1",
        responseText:
          "The signed bank statement has been delivered for review.",
        correlationId: "missing-proof-response-corr-1",
      },
      { actorId: "client-user-1" },
    )

    expect(result).toMatchObject({
      id: "response-1",
      requestId: "request-1",
      status: "SUBMITTED",
    })
    expect(mockDb.closeAssuranceFinding.findFirst).not.toHaveBeenCalled()
    expect(mockDb.closeAssuranceFinding.update).not.toHaveBeenCalled()
    expect(mockDb.accountantComment.create).not.toHaveBeenCalled()
    expect(mockDb.ledgerAuditEvent.create).not.toHaveBeenCalled()
    expect(mockRecordBusinessEventInTx).not.toHaveBeenCalled()
  })

  it("rejects correlation reuse for a different missing-proof response", async () => {
    mockDb.accountantComment.findFirst
      .mockResolvedValueOnce(missingEvidenceComment())
      .mockResolvedValueOnce(
        missingEvidenceResponse({
          body: "A different response was already recorded.",
        }),
      )

    await expect(
      respondToMissingCloseEvidence(
        "client-org",
        {
          requestId: "request-1",
          responseText:
            "The signed bank statement has been delivered for review.",
          correlationId: "missing-proof-response-corr-1",
        },
        { actorId: "client-user-1" },
      ),
    ).rejects.toThrow(/different missing-proof response/i)

    expect(mockDb.closeAssuranceFinding.update).not.toHaveBeenCalled()
    expect(mockDb.accountantComment.create).not.toHaveBeenCalled()
    expect(mockRecordBusinessEventInTx).not.toHaveBeenCalled()
  })

  it.each(["P2034", "P2002"])(
    "retries a serializable missing-proof response after %s",
    async (code) => {
      mockDb.$transaction
        .mockRejectedValueOnce(Object.assign(new Error("retry"), { code }))
        .mockImplementationOnce((callback) => callback(mockDb))
      mockDb.accountantComment.findFirst
        .mockResolvedValueOnce(missingEvidenceComment())
        .mockResolvedValueOnce(null)
      mockDb.closeAssuranceFinding.findFirst.mockResolvedValue(
        missingEvidenceFinding({
          status: "ASSIGNED",
          ownerId: "client-user-1",
        }),
      )
      mockDb.accountantComment.create.mockResolvedValue(
        missingEvidenceResponse(),
      )

      await expect(
        respondToMissingCloseEvidence(
          "client-org",
          {
            requestId: "request-1",
            responseText:
              "The signed bank statement has been delivered for review.",
            correlationId: "missing-proof-response-corr-1",
          },
          { actorId: "client-user-1" },
        ),
      ).resolves.toMatchObject({ id: "response-1", status: "SUBMITTED" })

      expect(mockDb.$transaction).toHaveBeenCalledTimes(2)
      expect(mockDb.accountantComment.create).toHaveBeenCalledTimes(1)
      expect(mockRecordBusinessEventInTx).toHaveBeenCalledTimes(1)
    },
  )

  it("atomically accepts a validated response and resolves its finding with minimized evidence", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-08-02T11:00:00.000Z"))
    const requestText = "Please attach the missing signed bank statement."
    const responseText =
      "The signed bank statement has been delivered for review."
    const resolutionNotes =
      "Response evidence reviewed and accepted for this finding."
    mockDb.accountantComment.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(missingEvidenceComment({ body: requestText }))
      .mockResolvedValueOnce(missingEvidenceResponse({ body: responseText }))
    mockDb.closeAssuranceFinding.findFirst.mockResolvedValue(
      missingEvidenceFinding({
        status: "IN_REVIEW",
        ownerId: "client-user-1",
      }),
    )
    mockDb.accountantComment.create.mockResolvedValue(
      missingEvidenceAcceptance({ body: resolutionNotes }),
    )

    const result = await acceptMissingCloseEvidenceResponse(
      "accounting-firm",
      acceptanceInput({ resolutionNotes }),
      missingEvidenceAcceptanceControl(),
    )

    expect(result).toMatchObject({
      kind: "ACCOUNTANT_MISSING_CLOSE_EVIDENCE_RESPONSE_ACCEPTANCE",
      version: 1,
      id: "acceptance-1",
      organizationId: "client-org",
      periodId: period.id,
      closeRunId: "close-run-1",
      findingId: "finding-1",
      requestId: "request-1",
      responseId: "response-1",
      respondedById: "client-user-1",
      acceptedById: "accountant-1",
      decision: "ACCEPTED",
      findingStatus: "RESOLVED",
      resolutionNotes,
      replacement: closeEvidenceReplacementSelection(replacementBinding()),
      resolvedAt: "2026-08-02T11:00:00.000Z",
      correlationId: "missing-proof-acceptance-corr-1",
      controls: {
        serviceClockOwned: true,
        freshAuthRequired: true,
        delegatedReviewRequired: true,
        segregationOfDutiesRequired: true,
        compareAndSetResolution: true,
        rawMetadataExposed: false,
        closeCertificationAuthorized: false,
      },
    })
    expect(mockDb.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: "ReadCommitted",
    })
    expect(mockLockCloseEvidenceAcceptanceAuthorityInTx).toHaveBeenCalledWith(mockDb, expect.objectContaining({
      homeOrganizationId: "accounting-firm",
      organizationId: "client-org",
      actorId: "accountant-1",
      session: { id: "accountant-session-1", token: "synthetic-service-session-token" },
    }))
    expect(mockRevalidateCloseEvidenceAcceptanceAuthority).toHaveBeenCalledTimes(2)
    expect(mockRevalidateCloseEvidenceAcceptanceAuthority).toHaveBeenLastCalledWith(new Date("2026-08-02T11:00:00.000Z"))
    expect(mockDb.closeAssuranceFinding.updateMany).toHaveBeenCalledWith({
      where: {
        id: "finding-1",
        organizationId: "client-org",
        status: "IN_REVIEW",
        ownerId: "client-user-1",
      },
      data: {
        status: "RESOLVED",
        resolutionNotes,
        resolvedAt: new Date("2026-08-02T11:00:00.000Z"),
        resolvedById: "accountant-1",
        correlationId: "missing-proof-acceptance-corr-1",
      },
    })
    expect(mockDb.accountantComment.create).toHaveBeenCalledWith({
      data: {
        organizationId: "client-org",
        periodId: period.id,
        closeRunId: "close-run-1",
        findingId: "finding-1",
        authorId: "accountant-1",
        body: resolutionNotes,
        visibility: "ACCOUNTANT_RESPONSE_ACCEPTED",
        correlationId: "missing-proof-acceptance-corr-1",
        createdAt: new Date("2026-08-02T11:00:00.000Z"),
        metadata: {
          acceptanceType: "MISSING_CLOSE_EVIDENCE_RESPONSE_ACCEPTANCE",
          replacementBinding: replacementBinding(),
          requestId: "request-1",
          responseId: "response-1",
          requestCorrelationId: "missing-proof-corr-1",
          responseCorrelationId: "missing-proof-response-corr-1",
          findingId: "finding-1",
          periodId: period.id,
          closeRunId: "close-run-1",
          respondedById: "client-user-1",
          acceptedById: "accountant-1",
          decision: "ACCEPTED",
          findingStatus: "RESOLVED",
          resolvedAt: "2026-08-02T11:00:00.000Z",
          correlationId: "missing-proof-acceptance-corr-1",
        },
      },
    })
    expect(mockDb.ledgerAuditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "CLOSE_MISSING_EVIDENCE_RESPONSE_ACCEPTED",
          actorId: "accountant-1",
          resourceType: "AccountantComment",
          resourceId: "acceptance-1",
          metadata: expect.objectContaining({
            replacement: closeEvidenceReplacementSelection(replacementBinding()),
            requestId: "request-1",
            responseId: "response-1",
            findingId: "finding-1",
            acceptedById: "accountant-1",
            status: "RESOLVED",
          }),
        }),
      }),
    )
    expect(mockRecordBusinessEventInTx).toHaveBeenCalledWith(
      mockDb,
      expect.objectContaining({
        organizationId: "client-org",
        eventType: "close.assurance.missing_evidence.response_accepted",
        actorId: "accountant-1",
        sourceId: "finding-1",
        payload: expect.objectContaining({
          acceptanceId: "acceptance-1",
          replacement: closeEvidenceReplacementSelection(replacementBinding()),
          requestId: "request-1",
          responseId: "response-1",
          respondedById: "client-user-1",
          acceptedById: "accountant-1",
          decision: "ACCEPTED",
          findingStatus: "RESOLVED",
          ownerId: "client-user-1",
        }),
      }),
    )
    const auditInput = mockDb.ledgerAuditEvent.create.mock.calls.at(-1)?.[0]
    const eventInput = mockRecordBusinessEventInTx.mock.calls.at(-1)?.[1]
    for (const evidence of [auditInput, eventInput]) {
      const serialized = JSON.stringify(evidence)
      expect(serialized).not.toContain(requestText)
      expect(serialized).not.toContain(responseText)
      expect(serialized).not.toContain(resolutionNotes)
      expect(serialized).not.toContain("synthetic-service-session-token")
    }
  })

  function seedNewAcceptance() {
    jest.useFakeTimers().setSystemTime(new Date("2026-08-02T11:00:00.000Z"))
    mockDb.accountantComment.findFirst.mockResolvedValueOnce(null)
      .mockResolvedValueOnce(missingEvidenceComment()).mockResolvedValueOnce(missingEvidenceResponse())
    mockDb.closeAssuranceFinding.findFirst.mockResolvedValue(missingEvidenceFinding({ status: "IN_REVIEW", ownerId: "client-user-1" }))
    mockDb.accountantComment.create.mockImplementation(({ data }) => Promise.resolve({ id: "acceptance-1", ...data }))
  }

  it.each(["duplicate request", "unexpected response", "existing acceptance"])("refuses missing-proof response with %s history", async kind => {
    mockDb.accountantComment.findFirst.mockResolvedValueOnce(missingEvidenceComment()).mockResolvedValueOnce(null)
    mockDb.closeAssuranceFinding.findFirst.mockResolvedValue(missingEvidenceFinding({ status: "ASSIGNED", ownerId: "client-user-1" }))
    mockDb.accountantComment.create.mockResolvedValue(missingEvidenceResponse())
    mockDb.accountantComment.findMany.mockResolvedValue([{ id: "request-1" }, { id: kind }])
    await expect(respondToMissingCloseEvidence("client-org", { requestId: "request-1", responseText: "Provide the retained source evidence", correlationId: "new-response" }, { actorId: "client-user-1" })).rejects.toMatchObject({ code: "REVIEW_REQUIRED" })
    expect(mockDb.closeAssuranceFinding.update).not.toHaveBeenCalled()
    expect(mockDb.accountantComment.create).not.toHaveBeenCalled()
    expect(mockDb.ledgerAuditEvent.create).not.toHaveBeenCalled()
    expect(mockRecordBusinessEventInTx).not.toHaveBeenCalled()
  })

  it.each(["duplicate request", "duplicate response", "existing acceptance"])("refuses missing-proof acceptance with %s history after locking the finding", async kind => {
    seedNewAcceptance()
    mockDb.accountantComment.findMany.mockResolvedValue([{ id: "request-1" }, { id: "response-1" }, { id: kind }])
    await expect(acceptMissingCloseEvidenceResponse("accounting-firm", acceptanceInput(), missingEvidenceAcceptanceControl())).rejects.toMatchObject({ code: "REVIEW_REQUIRED" })
    expectNoAcceptanceEffects()
  })

  function expectNoAcceptanceEffects() {
    expect(mockDb.closeAssuranceFinding.updateMany).not.toHaveBeenCalled()
    expect(mockDb.accountantComment.create).not.toHaveBeenCalled()
    expect(mockDb.ledgerAuditEvent.create).not.toHaveBeenCalled()
    expect(mockRecordBusinessEventInTx).not.toHaveBeenCalled()
    expect(mockDb.closeEvidenceItem.create).not.toHaveBeenCalled()
    expect(mockDb.closeChecklistItem.update).not.toHaveBeenCalled()
    expect(mockDb.closeRun.updateMany).not.toHaveBeenCalled()
  }

  it("reports a concurrently completed acceptance as stale state rather than ambiguous evidence", async () => {
    seedNewAcceptance()
    mockDb.closeAssuranceFinding.findFirst.mockResolvedValueOnce(missingEvidenceFinding({ status: "IN_REVIEW", ownerId: "client-user-1" }))
      .mockResolvedValueOnce(missingEvidenceFinding({ status: "RESOLVED", ownerId: "client-user-1" }))
    await expect(acceptMissingCloseEvidenceResponse("accounting-firm", acceptanceInput(), missingEvidenceAcceptanceControl())).rejects.toMatchObject({ code: "CONFLICT" })
    expect(mockDb.accountantComment.findMany).not.toHaveBeenCalled()
    expectNoAcceptanceEffects()
  })

  it("checks persisted authority before correlation locking and after all decision locks", async () => {
    seedNewAcceptance()
    const control = missingEvidenceAcceptanceControl({ requireWorkDeskAccess: true })
    await acceptMissingCloseEvidenceResponse("accounting-firm", acceptanceInput(), control)
    expect(mockLockCloseEvidenceAcceptanceAuthorityInTx).toHaveBeenCalledTimes(1)
    expect(mockLockCloseEvidenceAcceptanceAuthorityInTx).toHaveBeenCalledWith(mockDb, expect.objectContaining({ homeOrganizationId: "accounting-firm", organizationId: "client-org", actorId: "accountant-1", session: control.session, requireWorkDeskAccess: true }))
    const initial = mockLockCloseEvidenceAcceptanceAuthorityInTx.mock.invocationCallOrder[0]
    const [afterCorrelation, final] = mockRevalidateCloseEvidenceAcceptanceAuthority.mock.invocationCallOrder
    expect(mockRevalidateCloseEvidenceAcceptanceAuthority).toHaveBeenCalledTimes(2)
    expect(initial).toBeLessThan(mockDb.$queryRaw.mock.invocationCallOrder[0])
    expect(afterCorrelation).toBeGreaterThan(mockDb.$queryRaw.mock.invocationCallOrder[0])
    expect(afterCorrelation).toBeLessThan(mockDb.accountantComment.findFirst.mock.invocationCallOrder[0])
    expect(final).toBeGreaterThan(mockGetCloseEvidenceReplacementInTx.mock.invocationCallOrder[0])
    expect(final).toBeGreaterThan(mockDb.$queryRaw.mock.invocationCallOrder.at(-1)!)
    expect(final).toBeLessThan(mockDb.closeAssuranceFinding.updateMany.mock.invocationCallOrder[0])
    expect(mockDb.$queryRaw.mock.calls.some(([query]) => query.text.includes('FOR UPDATE'))).toBe(true)
    expect(mockRevalidateCloseEvidenceAcceptanceAuthority).toHaveBeenLastCalledWith(new Date("2026-08-02T11:00:00.000Z"))
  })

  it.each(["bound", "legacy"])("denies %s replay when authority is lost during correlation wait", async kind => {
    jest.useFakeTimers().setSystemTime(new Date("2026-08-02T11:00:00.000Z"))
    const control = missingEvidenceAcceptanceControl()
    const saved = missingEvidenceAcceptance()
    const { replacementBinding: _binding, ...legacyMetadata } = saved.metadata
    mockDb.accountantComment.findFirst.mockResolvedValueOnce(kind === "legacy" ? { ...saved, metadata: legacyMetadata } : saved)
    let release!: () => void, entered!: () => void
    const waiting = new Promise<void>(resolve => { entered = resolve })
    const lock = new Promise(resolve => { release = () => resolve([]) })
    mockDb.$queryRaw.mockImplementationOnce(() => { entered(); return lock })
    mockRevalidateCloseEvidenceAcceptanceAuthority.mockRejectedValueOnce(new ForbiddenError("Review authority was revoked while waiting."))
    const work = acceptMissingCloseEvidenceResponse("accounting-firm", acceptanceInput(kind === "legacy" ? { replacement: undefined } : {}), control)
    await waiting
    expect(mockLockCloseEvidenceAcceptanceAuthorityInTx).toHaveBeenCalledTimes(1)
    expect(mockRevalidateCloseEvidenceAcceptanceAuthority).not.toHaveBeenCalled()
    expect(mockDb.accountantComment.findFirst).not.toHaveBeenCalled()
    expectNoAcceptanceEffects()
    release()
    await expect(work).rejects.toMatchObject({ code: "FORBIDDEN" })
    expect(mockRevalidateCloseEvidenceAcceptanceAuthority).toHaveBeenCalledTimes(1)
    expect(mockDb.accountantComment.findFirst).not.toHaveBeenCalled()
    expect(mockGetCloseEvidenceReplacementInTx).not.toHaveBeenCalled()
    expectNoAcceptanceEffects()
  })

  it.each([
    ["authority revoked", new ForbiddenError("Review authority is no longer available.")],
    ["authority query failure", new Error("Authority storage unavailable")],
  ])("denies acceptance after replacement lock wait when final check reports %s", async (_label, failure) => {
    seedNewAcceptance()
    const control = missingEvidenceAcceptanceControl()
    let release!: () => void, entered!: () => void
    const waiting = new Promise<void>(resolve => { entered = resolve })
    const lockedReplacement = new Promise<void>(resolve => { release = resolve })
    mockGetCloseEvidenceReplacementInTx.mockImplementationOnce(async () => {
      entered(); await lockedReplacement
      return { status: "AVAILABLE", selection: closeEvidenceReplacementSelection(replacementBinding()), binding: replacementBinding(), observedAt: "2026-08-02T10:59:00.000Z" }
    })
    mockRevalidateCloseEvidenceAcceptanceAuthority.mockResolvedValueOnce(undefined).mockRejectedValueOnce(failure)
    const work = acceptMissingCloseEvidenceResponse("accounting-firm", acceptanceInput(), control)
    await waiting
    expect(mockRevalidateCloseEvidenceAcceptanceAuthority).toHaveBeenCalledTimes(1)
    expectNoAcceptanceEffects()
    release()
    if (failure instanceof ForbiddenError) await expect(work).rejects.toBe(failure)
    else await expect(work).rejects.toMatchObject({ code: "INTERNAL_ERROR", status: 500, expose: false, message: "Missing-proof workflow transaction failed." })
    expect(mockRevalidateCloseEvidenceAcceptanceAuthority).toHaveBeenCalledTimes(2)
    expect(mockRevalidateCloseEvidenceAcceptanceAuthority.mock.invocationCallOrder[1]).toBeGreaterThan(mockDb.$queryRaw.mock.invocationCallOrder.at(-1)!)
    expectNoAcceptanceEffects()
  })

  it("waits for final persisted authority validation before any acceptance effect", async () => {
    seedNewAcceptance()
    const control = missingEvidenceAcceptanceControl()
    let release!: () => void, entered!: () => void
    const waiting = new Promise<void>(resolve => { entered = resolve })
    const validation = new Promise<void>(resolve => { release = resolve })
    mockRevalidateCloseEvidenceAcceptanceAuthority.mockResolvedValueOnce(undefined).mockImplementationOnce(() => { entered(); return validation })
    const work = acceptMissingCloseEvidenceResponse("accounting-firm", acceptanceInput(), control)
    await waiting
    expect(mockGetCloseEvidenceReplacementInTx).toHaveBeenCalledWith(mockDb, "client-org", "finding-1", { lock: true })
    expectNoAcceptanceEffects()
    release()
    await expect(work).resolves.toMatchObject({ id: "acceptance-1", decision: "ACCEPTED" })
    expect(mockDb.closeAssuranceFinding.updateMany).toHaveBeenCalledTimes(1)
    expect(mockDb.accountantComment.create).toHaveBeenCalledTimes(1)
    expect(mockRecordBusinessEventInTx).toHaveBeenCalledTimes(1)
  })
  it.each([
    ["missing selection", undefined],
    ["changed checklist", { ...closeEvidenceReplacementSelection(replacementBinding()), checklistItemId: "other-checklist" }],
    ["changed digest", { ...closeEvidenceReplacementSelection(replacementBinding()), bindingHash: `sha256:${"f".repeat(64)}` }],
  ] as const)("rejects %s before resolution, audit or events", async (_label, replacement) => {
    seedNewAcceptance()
    await expect(acceptMissingCloseEvidenceResponse("accounting-firm", acceptanceInput({ replacement }), missingEvidenceAcceptanceControl())).rejects.toMatchObject({ code: "CONFLICT" })
    expect(mockGetCloseEvidenceReplacementInTx).toHaveBeenCalledWith(mockDb, "client-org", "finding-1", { lock: true })
    expect(mockDb.closeAssuranceFinding.updateMany).not.toHaveBeenCalled()
    expect(mockDb.accountantComment.create).not.toHaveBeenCalled()
    expect(mockDb.ledgerAuditEvent.create).not.toHaveBeenCalled()
    expect(mockRecordBusinessEventInTx).not.toHaveBeenCalled()
  })

  it("rejects an unavailable locked replacement even when the client retains a formerly valid selection", async () => {
    seedNewAcceptance()
    mockGetCloseEvidenceReplacementInTx.mockResolvedValue({ status: "UNAVAILABLE", reason: "ASSESSMENT_STALE" })
    await expect(acceptMissingCloseEvidenceResponse("accounting-firm", acceptanceInput(), missingEvidenceAcceptanceControl())).rejects.toMatchObject({ code: "CONFLICT" })
    expect(mockDb.closeAssuranceFinding.updateMany).not.toHaveBeenCalled()
    expect(mockDb.accountantComment.create).not.toHaveBeenCalled()
    expect(mockDb.ledgerAuditEvent.create).not.toHaveBeenCalled()
    expect(mockRecordBusinessEventInTx).not.toHaveBeenCalled()
  })

  it("records the database time after replacement locking and binds every durable acceptance effect", async () => {
    seedNewAcceptance()
    const control = missingEvidenceAcceptanceControl()
    const acceptedAt = new Date("2026-08-02T11:02:00.000Z")
    mockDb.$queryRaw.mockResolvedValue([{ id: "finding-1", createdAt: acceptedAt }])
    const result = await acceptMissingCloseEvidenceResponse("accounting-firm", acceptanceInput(), control)
    expect(result).toMatchObject({ replacement: closeEvidenceReplacementSelection(replacementBinding()), resolvedAt: acceptedAt.toISOString(), createdAt: acceptedAt.toISOString() })
    expect(mockDb.$queryRaw.mock.calls[0][0]).toMatchObject({ text: expect.stringContaining("pg_advisory_xact_lock"), values: [JSON.stringify(["close-evidence-acceptance", "client-org", "missing-proof-acceptance-corr-1"])] })
    expect(mockDb.$queryRaw.mock.invocationCallOrder.at(-1)).toBeGreaterThan(mockGetCloseEvidenceReplacementInTx.mock.invocationCallOrder[0])
    expect(mockDb.closeAssuranceFinding.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ resolvedAt: acceptedAt }) }))
    expect(mockDb.accountantComment.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ createdAt: acceptedAt, metadata: expect.objectContaining({ replacementBinding: replacementBinding(), resolvedAt: acceptedAt.toISOString() }) }) }))
    expect(mockDb.ledgerAuditEvent.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ metadata: expect.objectContaining({ replacement: result.replacement }) }) }))
    expect(mockRecordBusinessEventInTx).toHaveBeenCalledWith(mockDb, expect.objectContaining({ payload: expect.objectContaining({ replacement: result.replacement }) }))
    expect(mockDb.closeEvidenceItem.create).not.toHaveBeenCalled()
    expect(mockDb.closeChecklistItem.update).not.toHaveBeenCalled()
    expect(mockDb.closeRun.updateMany).not.toHaveBeenCalled()
  })

  it("rejects a database clock before the verified replacement observation", async () => {
    seedNewAcceptance()
    const control = missingEvidenceAcceptanceControl()
    mockDb.$queryRaw.mockResolvedValue([{ id: "finding-1", createdAt: new Date("2026-08-02T10:58:59.999Z") }])
    await expect(acceptMissingCloseEvidenceResponse("accounting-firm", acceptanceInput(), control)).rejects.toMatchObject({ code: "CONFLICT" })
    expect(mockDb.closeAssuranceFinding.updateMany).not.toHaveBeenCalled()
    expect(mockDb.accountantComment.create).not.toHaveBeenCalled()
    expect(mockDb.ledgerAuditEvent.create).not.toHaveBeenCalled()
  })

  it("revalidates fresh authentication after waiting for replacement locks", async () => {
    seedNewAcceptance()
    mockGetCloseEvidenceReplacementInTx.mockImplementationOnce(async () => {
      const afterWait = new Date("2026-08-02T11:04:00.000Z")
      jest.setSystemTime(afterWait)
      mockDb.$queryRaw.mockResolvedValue([{ id: "finding-1", createdAt: afterWait }])
      return { status: "AVAILABLE", selection: closeEvidenceReplacementSelection(replacementBinding()), binding: replacementBinding(), observedAt: "2026-08-02T10:59:00.000Z" }
    })
    await expect(acceptMissingCloseEvidenceResponse("accounting-firm", acceptanceInput(), missingEvidenceAcceptanceControl())).rejects.toMatchObject({ code: "FRESH_AUTH_REQUIRED", status: 403, message: expect.stringMatching(/fresh authentication/i) })
    expectNoAcceptanceEffects()
  })

  it.each([
    undefined,
    { ...closeEvidenceReplacementSelection(replacementBinding()), checklistItemId: "other-checklist" },
    { ...closeEvidenceReplacementSelection(replacementBinding()), bindingHash: `sha256:${"f".repeat(64)}` },
  ])("rejects reuse of a bound acceptance correlation with a different replacement %j", async replacement => {
    jest.useFakeTimers().setSystemTime(new Date("2026-08-02T11:00:00.000Z"))
    mockDb.accountantComment.findFirst.mockResolvedValueOnce(missingEvidenceAcceptance())
    await expect(acceptMissingCloseEvidenceResponse("accounting-firm", acceptanceInput({ replacement }), missingEvidenceAcceptanceControl())).rejects.toMatchObject({ code: "CONFLICT" })
    expect(mockGetCloseEvidenceReplacementInTx).not.toHaveBeenCalled()
    expect(mockDb.closeAssuranceFinding.updateMany).not.toHaveBeenCalled()
    expect(mockDb.accountantComment.create).not.toHaveBeenCalled()
  })

  it("replays a historical text-only acceptance as unbound history without manufacturing current replacement proof", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-08-02T11:00:00.000Z"))
    const existing = missingEvidenceAcceptance()
    const { replacementBinding: _binding, ...metadata } = existing.metadata
    mockDb.accountantComment.findFirst.mockResolvedValueOnce({ ...existing, metadata })
    await expect(acceptMissingCloseEvidenceResponse("accounting-firm", acceptanceInput({ replacement: undefined }), missingEvidenceAcceptanceControl())).resolves.toMatchObject({ id: "acceptance-1", replacement: null })
    expect(mockGetCloseEvidenceReplacementInTx).not.toHaveBeenCalled()
    expect(mockDb.closeAssuranceFinding.updateMany).not.toHaveBeenCalled()
    expect(mockDb.accountantComment.create).not.toHaveBeenCalled()
    expect(mockLockCloseEvidenceAcceptanceAuthorityInTx).toHaveBeenCalledTimes(1)
    expect(mockRevalidateCloseEvidenceAcceptanceAuthority).toHaveBeenCalledTimes(1)
  })

  it("rejects acceptance without service-level review permission before database work", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-08-02T11:00:00.000Z"))

    await expect(
      acceptMissingCloseEvidenceResponse(
        "accounting-firm",
        acceptanceInput(),
        missingEvidenceAcceptanceControl({ actorPermissions: [] }),
      ),
    ).rejects.toThrow(/accountant review permission/i)

    expect(mockDb.$transaction).not.toHaveBeenCalled()
    expect(mockDb.user.findFirst).not.toHaveBeenCalled()
  })

  it.each([
    ["missing", null],
    [
      "actor-mismatched",
      {
        actorId: "another-accountant",
        organizationId: "accounting-firm",
        lastAuthAt: new Date("2026-08-02T10:58:00.000Z"),
      },
    ],
    [
      "tenant-mismatched",
      {
        actorId: "accountant-1",
        organizationId: "other-firm",
        lastAuthAt: new Date("2026-08-02T10:58:00.000Z"),
      },
    ],
    [
      "future",
      {
        actorId: "accountant-1",
        organizationId: "accounting-firm",
        lastAuthAt: new Date("2026-08-02T11:00:00.001Z"),
      },
    ],
    [
      "stale",
      {
        actorId: "accountant-1",
        organizationId: "accounting-firm",
        lastAuthAt: new Date("2026-08-02T10:54:59.999Z"),
      },
    ],
  ])("rejects %s fresh-auth evidence before database work", async (
    _name,
    freshAuth,
  ) => {
    jest.useFakeTimers().setSystemTime(new Date("2026-08-02T11:00:00.000Z"))

    await expect(
      acceptMissingCloseEvidenceResponse(
        "accounting-firm",
        acceptanceInput(),
        missingEvidenceAcceptanceControl({ freshAuth }),
      ),
    ).rejects.toMatchObject({ code: "FRESH_AUTH_REQUIRED", status: 403, message: expect.stringMatching(/fresh authentication/i) })

    expect(mockDb.$transaction).not.toHaveBeenCalled()
  })

  it.each([
    ["inactive accountant", "Missing-proof response acceptance requires an active home-tenant accountant."],
    ["revoked review grant", "Read-only grant cannot request client work"],
  ])("propagates initial persisted authority refusal for %s before correlation or client reads", async (_label, message) => {
    jest.useFakeTimers().setSystemTime(new Date("2026-08-02T11:00:00.000Z"))
    mockLockCloseEvidenceAcceptanceAuthorityInTx.mockRejectedValue(new ForbiddenError(message))

    await expect(acceptMissingCloseEvidenceResponse("accounting-firm", acceptanceInput(), missingEvidenceAcceptanceControl())).rejects.toThrow(message)

    expect(mockLockCloseEvidenceAcceptanceAuthorityInTx).toHaveBeenCalledWith(mockDb, expect.objectContaining({ homeOrganizationId: "accounting-firm", organizationId: "client-org", actorId: "accountant-1" }))
    expect(mockRevalidateCloseEvidenceAcceptanceAuthority).not.toHaveBeenCalled()
    expect(mockDb.$queryRaw).not.toHaveBeenCalled()
    expect(mockDb.accountantComment.findFirst).not.toHaveBeenCalled()
    expect(mockGetCloseEvidenceReplacementInTx).not.toHaveBeenCalled()
    expect(mockDb.closeAssuranceFinding.updateMany).not.toHaveBeenCalled()
    expect(mockDb.accountantComment.create).not.toHaveBeenCalled()
    expect(mockDb.ledgerAuditEvent.create).not.toHaveBeenCalled()
    expect(mockRecordBusinessEventInTx).not.toHaveBeenCalled()
  })
  it.each([
    ["missing request", null, missingEvidenceResponse(), /request not found/i],
    [
      "request-response mismatch",
      missingEvidenceComment(),
      missingEvidenceResponse({
        metadata: {
          ...missingEvidenceResponse().metadata,
          requestId: "other-request",
        },
      }),
      /do not match/i,
    ],
    [
      "response author corruption",
      missingEvidenceComment(),
      missingEvidenceResponse({ authorId: "other-client-user" }),
      /response evidence is incomplete/i,
    ],
  ])("rejects %s before finding resolution", async (
    _name,
    request,
    response,
    error,
  ) => {
    jest.useFakeTimers().setSystemTime(new Date("2026-08-02T11:00:00.000Z"))
    mockDb.accountantComment.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(request)
      .mockResolvedValueOnce(response)

    await expect(
      acceptMissingCloseEvidenceResponse(
        "accounting-firm",
        acceptanceInput(),
        missingEvidenceAcceptanceControl(),
      ),
    ).rejects.toThrow(error)

    expect(mockDb.closeAssuranceFinding.updateMany).not.toHaveBeenCalled()
    expect(mockDb.accountantComment.create).not.toHaveBeenCalled()
  })

  it("enforces segregation of duties against respondent self-acceptance", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-08-02T11:00:00.000Z"))
    mockResolveAccountantClientAccess.mockResolvedValue({
      organizationId: "client-org",
      mode: "TENANT_MEMBER",
      grant: null,
    })
    mockDb.accountantComment.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(missingEvidenceComment())
      .mockResolvedValueOnce(missingEvidenceResponse())

    await expect(
      acceptMissingCloseEvidenceResponse(
        "client-org",
        acceptanceInput({ clientOrganizationId: undefined }),
        missingEvidenceAcceptanceControl({
          actorId: "client-user-1",
          freshAuth: {
            actorId: "client-user-1",
            organizationId: "client-org",
            lastAuthAt: new Date("2026-08-02T10:58:00.000Z"),
          },
        }),
      ),
    ).rejects.toThrow(/cannot accept their own/i)

    expect(mockDb.closeAssuranceFinding.findFirst).not.toHaveBeenCalled()
    expect(mockDb.closeAssuranceFinding.updateMany).not.toHaveBeenCalled()
  })

  it.each([
    [
      "request/finding period mismatch",
      missingEvidenceFinding({
        status: "IN_REVIEW",
        ownerId: "client-user-1",
        periodId: "other-period",
      }),
      /does not match its finding/i,
    ],
    [
      "non-review finding",
      missingEvidenceFinding({ status: "ASSIGNED", ownerId: "client-user-1" }),
      /only an in-review/i,
    ],
    [
      "respondent ownership mismatch",
      missingEvidenceFinding({ status: "IN_REVIEW", ownerId: "other-user" }),
      /owner does not match/i,
    ],
  ])("rejects %s before compare-and-set resolution", async (
    _name,
    finding,
    error,
  ) => {
    jest.useFakeTimers().setSystemTime(new Date("2026-08-02T11:00:00.000Z"))
    mockDb.accountantComment.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(missingEvidenceComment())
      .mockResolvedValueOnce(missingEvidenceResponse())
    mockDb.closeAssuranceFinding.findFirst.mockResolvedValue(finding)

    await expect(
      acceptMissingCloseEvidenceResponse(
        "accounting-firm",
        acceptanceInput(),
        missingEvidenceAcceptanceControl(),
      ),
    ).rejects.toThrow(error)

    expect(mockDb.closeAssuranceFinding.updateMany).not.toHaveBeenCalled()
    expect(mockDb.accountantComment.create).not.toHaveBeenCalled()
    expect(mockRecordBusinessEventInTx).not.toHaveBeenCalled()
  })

  it("returns an exact acceptance replay without duplicate resolution or evidence", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-08-02T11:00:00.000Z"))
    mockDb.accountantComment.findFirst.mockResolvedValueOnce(
      missingEvidenceAcceptance(),
    )

    const result = await acceptMissingCloseEvidenceResponse(
      "accounting-firm",
      acceptanceInput(),
      missingEvidenceAcceptanceControl(),
    )

    expect(result).toMatchObject({ id: "acceptance-1", decision: "ACCEPTED" })
    expect(mockDb.closeAssuranceFinding.findFirst).not.toHaveBeenCalled()
    expect(mockDb.closeAssuranceFinding.updateMany).not.toHaveBeenCalled()
    expect(mockDb.accountantComment.create).not.toHaveBeenCalled()
    expect(mockLockCloseEvidenceAcceptanceAuthorityInTx).toHaveBeenCalledTimes(1)
    expect(mockRevalidateCloseEvidenceAcceptanceAuthority).toHaveBeenCalledTimes(1)
    expect(mockDb.ledgerAuditEvent.create).not.toHaveBeenCalled()
    expect(mockRecordBusinessEventInTx).not.toHaveBeenCalled()
  })

  it("rejects acceptance correlation reuse with different decision evidence", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-08-02T11:00:00.000Z"))
    mockDb.accountantComment.findFirst.mockResolvedValueOnce(
      missingEvidenceAcceptance({ responseId: "other-response" }),
    )

    await expect(
      acceptMissingCloseEvidenceResponse(
        "accounting-firm",
        acceptanceInput({
          resolutionNotes: "Different acceptance notes for the same correlation.",
        }),
        missingEvidenceAcceptanceControl(),
      ),
    ).rejects.toThrow(/different missing-proof response acceptance/i)

    expect(mockDb.closeAssuranceFinding.updateMany).not.toHaveBeenCalled()
    expect(mockDb.accountantComment.create).not.toHaveBeenCalled()
  })

  it("fails closed when compare-and-set resolution loses a concurrent race", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-08-02T11:00:00.000Z"))
    mockDb.accountantComment.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(missingEvidenceComment())
      .mockResolvedValueOnce(missingEvidenceResponse())
    mockDb.closeAssuranceFinding.findFirst.mockResolvedValue(
      missingEvidenceFinding({ status: "IN_REVIEW", ownerId: "client-user-1" }),
    )
    mockDb.closeAssuranceFinding.updateMany.mockResolvedValue({ count: 0 })

    await expect(
      acceptMissingCloseEvidenceResponse(
        "accounting-firm",
        acceptanceInput(),
        missingEvidenceAcceptanceControl(),
      ),
    ).rejects.toThrow(/changed before acceptance/i)

    expect(mockDb.accountantComment.create).not.toHaveBeenCalled()
    expect(mockDb.ledgerAuditEvent.create).not.toHaveBeenCalled()
    expect(mockRecordBusinessEventInTx).not.toHaveBeenCalled()
  })

  it("retries acceptance after a retryable transaction conflict without duplicating effects", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-08-02T11:00:00.000Z"))
    mockDb.$transaction
      .mockRejectedValueOnce(Object.assign(new Error("retry"), { code: "P2034" }))
      .mockImplementationOnce((callback) => callback(mockDb))
    mockDb.accountantComment.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(missingEvidenceComment())
      .mockResolvedValueOnce(missingEvidenceResponse())
    mockDb.closeAssuranceFinding.findFirst.mockResolvedValue(
      missingEvidenceFinding({ status: "IN_REVIEW", ownerId: "client-user-1" }),
    )
    mockDb.accountantComment.create.mockResolvedValue(
      missingEvidenceAcceptance(),
    )

    await expect(
      acceptMissingCloseEvidenceResponse(
        "accounting-firm",
        acceptanceInput(),
        missingEvidenceAcceptanceControl(),
      ),
    ).resolves.toMatchObject({ id: "acceptance-1", decision: "ACCEPTED" })

    expect(mockDb.$transaction).toHaveBeenCalledTimes(2)
    expect(mockDb.closeAssuranceFinding.updateMany).toHaveBeenCalledTimes(1)
    expect(mockDb.accountantComment.create).toHaveBeenCalledTimes(1)
    expect(mockRecordBusinessEventInTx).toHaveBeenCalledTimes(1)
  })

  it.each([
    ["missing evidence", { actorId: "user-2" }],
    [
      "missing actor",
      {
        freshAuth: {
          actorId: "user-2",
          organizationId: "org-1",
          lastAuthAt: "2026-06-15T12:00:00.000Z",
        },
      },
    ],
    [
      "invalid evidence",
      {
        actorId: "user-2",
        freshAuth: {
          actorId: "user-2",
          organizationId: "org-1",
          lastAuthAt: "not-a-date",
        },
      },
    ],
    [
      "nonpositive evidence",
      {
        actorId: "user-2",
        freshAuth: {
          actorId: "user-2",
          organizationId: "org-1",
          lastAuthAt: 0,
        },
      },
    ],
    [
      "future evidence",
      {
        actorId: "user-2",
        freshAuth: {
          actorId: "user-2",
          organizationId: "org-1",
          lastAuthAt: "2026-06-15T12:05:00.001Z",
        },
      },
    ],
    [
      "stale evidence",
      {
        actorId: "user-2",
        freshAuth: {
          actorId: "user-2",
          organizationId: "org-1",
          lastAuthAt: "2026-06-15T11:59:59.999Z",
        },
      },
    ],
    [
      "actor mismatch",
      {
        actorId: "user-2",
        freshAuth: {
          actorId: "user-other",
          organizationId: "org-1",
          lastAuthAt: "2026-06-15T12:00:00.000Z",
        },
      },
    ],
    [
      "organization mismatch",
      {
        actorId: "user-2",
        freshAuth: {
          actorId: "user-2",
          organizationId: "org-other",
          lastAuthAt: "2026-06-15T12:00:00.000Z",
        },
      },
    ],
  ])("rejects close waiver approval for %s before database work", async (
    _name,
    control,
  ) => {
    jest.useFakeTimers().setSystemTime(new Date("2026-06-15T12:05:00.000Z"))

    await expect(
      approveCloseWaiver("org-1", { findingId: "finding-1" }, control),
    ).rejects.toThrow("Fresh authentication is required to approve a close waiver.")

    expect(mockDb.$transaction).not.toHaveBeenCalled()
    expect(mockDb.closeAssuranceFinding.findFirst).not.toHaveBeenCalled()
    expect(mockDb.closeAssuranceFinding.update).not.toHaveBeenCalled()
  })

  it("accepts exact five-minute waiver evidence and persists the service clock", async () => {
    const approvalTime = new Date("2026-06-15T12:05:00.000Z")
    mockDb.closeAssuranceFinding.findFirst.mockResolvedValue({
      id: "finding-1",
      organizationId: "org-1",
      periodId: period.id,
      closeRunId: "close-run-1",
      status: "IN_REVIEW",
      severity: "HIGH",
      ownerId: "controller-1",
      dueAt: null,
      waiverRequestedById: "user-1",
      waiverRequestedAt: new Date("2026-06-15T11:00:00.000Z"),
      closeRun: { id: "close-run-1" },
    })
    mockDb.closeAssuranceFinding.update.mockResolvedValue({
      id: "finding-1",
      checklistItemId: "check-1",
      domain: "LEDGER",
      severity: "HIGH",
      status: "WAIVED_WITH_APPROVAL",
      title: "Draft entries remain open",
      detail: "Approved timing exception.",
      sourceService: "services/accounting/periods.service.ts",
      sourceType: "AccountingPeriodClosePreflight",
      sourceId: null,
      ownerId: "controller-1",
      assignedById: null,
      assignedAt: null,
      dueAt: null,
      waiverRequestedById: "user-1",
      waiverApprovedById: "user-2",
      correlationId: "corr-waiver-approve",
    })

    jest.useFakeTimers().setSystemTime(approvalTime)

    const result = await approveCloseWaiver(
      "org-1",
      {
        findingId: "finding-1",
        correlationId: "corr-waiver-approve",
      },
      {
        actorId: "user-2",
        freshAuth: {
          actorId: "user-2",
          organizationId: "org-1",
          lastAuthAt: "2026-06-15T12:00:00.000Z",
        },
      },
    )

    expect(result.status).toBe("WAIVED_WITH_APPROVAL")
    expect(mockDb.closeAssuranceFinding.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          waiverApprovedById: "user-2",
          waiverApprovedAt: approvalTime,
        }),
      }),
    )
    expect(mockRecordBusinessEventInTx).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        eventType: "close.assurance.waiver.approved",
      }),
    )
  })

  it("blocks same-actor close waiver approval for segregation of duties", async () => {
    mockDb.closeAssuranceFinding.findFirst.mockResolvedValue({
      id: "finding-1",
      organizationId: "org-1",
      periodId: period.id,
      closeRunId: "close-run-1",
      status: "IN_REVIEW",
      waiverRequestedById: "user-1",
      waiverRequestedAt: new Date("2026-06-15T12:00:00.000Z"),
      closeRun: { id: "close-run-1" },
    })

    jest.useFakeTimers().setSystemTime(new Date("2026-06-15T12:04:00.000Z"))

    await expect(
      approveCloseWaiver(
        "org-1",
        { findingId: "finding-1" },
        {
          actorId: "user-1",
          freshAuth: {
            actorId: "user-1",
            organizationId: "org-1",
            lastAuthAt: "2026-06-15T12:00:00.000Z",
          },
        },
      ),
    ).rejects.toThrow(/requester cannot approve/i)
  })
  it("blocks draft journals and failed posting batches from period preflight", async () => {
    mockGetPeriodClosePreflight.mockResolvedValue({
      ...cleanPreflight(),
      draftEntryCount: 1,
      unresolvedPostingBatchCount: 1,
    })
    mockGetPeriodClosePreflightFailures.mockReturnValue([
      "1 draft journal entry must be posted or voided",
      "1 pending or failed posting batch must be resolved",
    ])

    const result = await getCloseAssuranceDashboard("org-1", period.id)

    expect(result.run.status).toBe("BLOCKED")
    expect(result.checklist).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "period-close-preflight",
          status: "FAILED",
          severity: "CRITICAL",
        }),
      ]),
    )
    expect(result.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "Draft journal entries remain open",
          severity: "HIGH",
        }),
        expect.objectContaining({
          title: "Pending or failed posting batches remain unresolved",
          severity: "CRITICAL",
        }),
      ]),
    )
  })

  it("blocks unbalanced ledger reconciliation as a critical close finding", async () => {
    mockReconcileLedger.mockResolvedValue({
      ...cleanLedger(),
      isClean: false,
      totalsByCurrency: [
        {
          currency: "XAF",
          debit: "120000.00",
          credit: "119000.00",
          difference: "1000.00",
        },
      ],
      failures: [
        {
          type: "TRIAL_BALANCE_OUT_OF_BALANCE",
          severity: "critical",
          message:
            "Trial balance is not balanced for XAF: debit 120000.00 credit 119000.00",
          metadata: { currency: "XAF" },
        },
      ],
    })

    const result = await getCloseAssuranceDashboard("org-1", period.id)

    expect(result.run.status).toBe("BLOCKED")
    expect(result.checklist).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "ledger-reconciliation",
          status: "FAILED",
          severity: "CRITICAL",
        }),
      ]),
    )
    expect(result.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceType: "TRIAL_BALANCE_OUT_OF_BALANCE",
          severity: "CRITICAL",
        }),
      ]),
    )
  })

  it("marks missing domain evidence unavailable without leaking dependency internals", async () => {
    mockReconcileLedger.mockRejectedValue(new Error("database://ledger-secret host failed"))
    mockGetPaymentCloseEvidence.mockRejectedValue(
      new Error("redis://payment-secret timeout"),
    )
    mockGetAccountantPortalData.mockRejectedValue(new Error("sql://trust-secret failed"))
    mockReconcileInventoryClass3.mockRejectedValue(new Error("inventory-secret failed"))
    mockGetTenantOperatingSnapshot.mockRejectedValue(new Error("payroll-secret failed"))

    const result = await getCloseAssuranceDashboard("org-1", period.id)
    const serialized = JSON.stringify(result)

    expect(result.run.status).toBe("BLOCKED")
    expect(result.checklist).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "ledger-reconciliation", status: "UNAVAILABLE" }),
        expect.objectContaining({ key: "payment-reconciliation", status: "UNAVAILABLE" }),
        expect.objectContaining({ key: "data-trust-provenance", status: "UNAVAILABLE" }),
        expect.objectContaining({ key: "inventory-valuation", status: "UNAVAILABLE" }),
        expect.objectContaining({ key: "payroll-finance-forecast-proof", status: "UNAVAILABLE" }),
      ]),
    )
    expect(result.evidenceItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sourceType: "LedgerReconciliation", available: false }),
        expect.objectContaining({ sourceType: "PaymentReconciliationDashboard", available: false }),
        expect.objectContaining({ sourceType: "AccountantPortalDataTrust", available: false }),
      ]),
    )
    expect(serialized).toContain("Ledger reconciliation evidence could not be loaded.")
    expect(serialized).not.toContain("ledger-secret")
    expect(serialized).not.toContain("payment-secret")
    expect(serialized).not.toContain("trust-secret")
    expect(serialized).not.toContain("inventory-secret")
    expect(serialized).not.toContain("payroll-secret")
  })

  it("denies cross-tenant period access by resolving periods inside organization scope", async () => {
    mockDb.accountingPeriod.findFirst.mockResolvedValueOnce(null)

    await expect(
      getCloseAssuranceDashboard("org-1", "period-from-other-org"),
    ).rejects.toThrow(/Accounting period not found/i)
  })

  it("emits durable notification events for blocked close runs and critical findings", async () => {
    mockGetPeriodClosePreflight.mockResolvedValue({
      ...cleanPreflight(),
      unresolvedPostingBatchCount: 1,
    })
    mockGetPeriodClosePreflightFailures.mockReturnValue([
      "1 pending or failed posting batch must be resolved",
    ])
    mockDb.closeRun.findFirst.mockResolvedValue(
      persistedRun({
        status: "BLOCKED",
        criticalBlockerCount: 1,
        highBlockerCount: 0,
      }),
    )

    await runCloseAssurance(
      "org-1",
      { periodId: period.id, correlationId: "corr-blocked" },
      { actorId: "controller-1" },
    )

    expect(mockRecordBusinessEventInTx).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        eventType: "close.assurance.run.completed",
        idempotencyKey: "close-assurance-run:close-run-1:completed",
        sourceType: "MANUAL",
        sourceId: "close-run-1",
        metadata: expect.objectContaining({
          sourceType: "CloseRun",
          sourceId: "close-run-1",
        }),
        outboxMessages: expect.arrayContaining([
          expect.objectContaining({ channel: "NOTIFICATION" }),
        ]),
      }),
    )
    expect(mockRecordBusinessEventInTx).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        eventType: "close.assurance.blocked",
      }),
    )
    expect(mockRecordBusinessEventInTx).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        eventType: "close.assurance.critical_finding.created",
        sourceType: "MANUAL",
        metadata: expect.objectContaining({
          sourceType: "CloseAssuranceFinding",
        }),
      }),
    )
  })

  it("emits assignment and due-soon notifications for close findings", async () => {
    const dueAt = new Date(Date.now() + 60 * 60 * 1000)
    mockDb.closeAssuranceFinding.findFirst.mockResolvedValue({
      id: "finding-1",
      organizationId: "org-1",
      periodId: period.id,
      closeRunId: "close-run-1",
      status: "OPEN",
      closeRun: { id: "close-run-1" },
    })
    mockDb.closeAssuranceFinding.update.mockResolvedValue({
      id: "finding-1",
      checklistItemId: "check-1",
      domain: "LEDGER",
      severity: "HIGH",
      status: "ASSIGNED",
      title: "Draft entries remain open",
      detail: "1 blocker detected.",
      sourceService: "services/accounting/periods.service.ts",
      sourceType: "AccountingPeriodClosePreflight",
      sourceId: null,
      ownerId: "user-2",
      assignedById: "user-1",
      assignedAt: new Date("2026-06-15T12:00:00.000Z"),
      dueAt,
      waiverRequestedById: null,
      waiverApprovedById: null,
      correlationId: "corr-assign",
    })

    await assignCloseFinding(
      "org-1",
      { findingId: "finding-1", assignedToId: "user-2", correlationId: "corr-assign" },
      { actorId: "user-1" },
    )

    expect(mockRecordBusinessEventInTx).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ eventType: "close.assurance.finding.assigned" }),
    )
    expect(mockRecordBusinessEventInTx).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ eventType: "close.assurance.finding.due_soon" }),
    )
  })

  it("emits waiver request notifications with reason evidence", async () => {
    mockDb.closeAssuranceFinding.findFirst.mockResolvedValue({
      id: "finding-1",
      organizationId: "org-1",
      periodId: period.id,
      closeRunId: "close-run-1",
      status: "OPEN",
      severity: "HIGH",
      ownerId: "controller-1",
      dueAt: null,
      closeRun: { id: "close-run-1" },
    })
    mockDb.closeAssuranceFinding.update.mockResolvedValue({
      id: "finding-1",
      checklistItemId: "check-1",
      domain: "LEDGER",
      severity: "HIGH",
      status: "IN_REVIEW",
      title: "Draft entries remain open",
      detail: "Waiver requested.",
      sourceService: "services/accounting/periods.service.ts",
      sourceType: "AccountingPeriodClosePreflight",
      sourceId: null,
      ownerId: "controller-1",
      assignedById: null,
      assignedAt: null,
      dueAt: null,
      waiverRequestedById: "user-1",
      waiverApprovedById: null,
      correlationId: "corr-waiver",
    })

    await requestCloseWaiver(
      "org-1",
      {
        findingId: "finding-1",
        reason: "Documented management approval for a timing-only close exception.",
        correlationId: "corr-waiver",
      },
      { actorId: "user-1" },
    )

    expect(mockRecordBusinessEventInTx).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        eventType: "close.assurance.waiver.requested",
        payload: expect.objectContaining({
          reason: "Documented management approval for a timing-only close exception.",
        }),
      }),
    )
  })

  it("maps source-link evidence into posting batch and journal entry graph nodes", async () => {
    const graph = await getCloseEvidenceGraph("org-1", { periodId: period.id })

    expect(graph.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "posting-batch:batch-1" }),
        expect.objectContaining({ id: "journal-entry:JE-1" }),
      ]),
    )
    expect(graph.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          from: "posting-batch:batch-1",
          to: "journal-entry:JE-1",
          label: "produces",
        }),
      ]),
    )
  })
})
