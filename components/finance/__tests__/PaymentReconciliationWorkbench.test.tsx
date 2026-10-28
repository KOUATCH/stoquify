import { fireEvent, render as renderWithTestingLibrary, screen, waitFor, within } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
const render = (ui: React.ReactNode) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return renderWithTestingLibrary(ui, { wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider> })
}
import { usePermissions } from "@/hooks/usePermissions"
import { useLocale } from "next-intl"
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"

jest.mock("next-intl/routing", () => ({ defineRouting: (config: unknown) => config }))
jest.mock("@/hooks/usePermissions", () => ({ usePermissions: jest.fn(() => ({ organizationId: "org-1", permissionState: "ready", refreshPermissions: jest.fn(), hasPermission: () => true, user: { id: "checker-1" } })) }))
jest.mock("@/actions/security/step-up-auth.actions", () => ({ stepUpWithPasswordAction: jest.fn() }))
jest.mock("@/actions/payments/alert-scan-recovery.actions", () => ({ readAlertScanRecoveryAction: jest.fn().mockResolvedValue({ ok: false, code: "UNAVAILABLE" }), recoverAlertScanPageAction: jest.fn() }))

jest.mock("lucide-react", () => {
  const React = require("react")
  const createIcon = (name: string) => {
    const Icon = (props: Record<string, unknown>) =>
      React.createElement("svg", { "data-testid": `icon-${name}`, ...props })
    Icon.displayName = name
    return Icon
  }

  return new Proxy(
    { __esModule: true },
    {
      get(target, prop: string) {
        if (prop in target) return target[prop as keyof typeof target]
        return createIcon(prop)
      },
    },
  )
})

jest.mock("next-intl", () => ({
  useLocale: jest.fn(() => "en-US"),
  useTranslations: () => (key: string, values?: Record<string, string | number>) => {
    if (/^(certification\.(providerStatuses|runStatuses)\.|statementImport\.statuses\.|rails\.|filters\.)/.test(key)) {
      const locale = require("next-intl").useLocale()
      const copy = require(locale === "fr" ? "@/messages/fr.json" : "@/messages/en.json").paymentReconciliationWorkbench
      const value = key.split(".").reduce((item: any, part: string) => item?.[part], copy)
      if (typeof value !== "string") throw new Error(`Missing reconciliation translation: ${locale}/${key}`)
      return value
    }
    const messages: Record<string, string> = {
      title: "Payment reconciliation workbench",
      subtitle: "Rail-level payment assurance, duplicate provider-reference alerts, and suspense-ready exception queues.",
      updated: "Updated {time}",
      "common.notAvailable": "Not available",
      "trustBanner.title": "Payment trust banner",
      "trustBanner.description": "Close-payment truth signals from durable reconciliation evidence and close blockers.",
      "trustBanner.providerEvidence": "Provider evidence",
      "trustBanner.statementEvidence": "Statement evidence",
      "trustBanner.signedRuns": "Signed runs",
      "trustBanner.openSuspense": "Open suspense",
      "trustBanner.criticalExceptions": "Critical exceptions",
      "trustBanner.closeBlockers": "Close blockers",
      "trustBanner.freshness": "Freshness",
      "trustBanner.available": "Available",
      "trustBanner.missing": "Missing",
      "trustBanner.suspenseAmount": "Exposure {amount}",
      "statementImport.title": "Provider statement intake",
      "statementImport.description": "Import statement evidence.",
      "statementImport.noActiveAccount": "Configure an active provider account.",
      "statementImport.accountLabel": "Provider account",
      "statementImport.accountPlaceholder": "Select a provider account",
      "statementImport.fileLabel": "Statement file",
      "statementImport.fileNameLabel": "Statement file name",
      "statementImport.fileNamePlaceholder": "Statement file name",
      "statementImport.contentLabel": "Statement content",
      "statementImport.contentPlaceholder": "Upload or paste statement content.",
      "statementImport.formatHint": "Required columns: amount and date.",
      "statementImport.action": "Import statement",
      "statementImport.historyTitle": "Recent statement evidence",
      "statementImport.emptyHistory": "No statement file has been imported yet.",
      "statementImport.unnamedFile": "Unnamed statement",
      "statementImport.lineCount": "{count} line(s)",
      "statementImport.statuses.IMPORTED": "Imported",
      "statementImport.notifications.completedTitle": "Statement intake complete",
      "statementImport.notifications.completedMessage": "{status}: {count} line(s) imported.",
      "statementImport.notifications.failedTitle": "Statement import failed",
      "statementImport.notifications.failedMessage": "The statement could not be imported safely.",
      "statementImport.notifications.readFailedTitle": "File could not be read",
      "statementImport.notifications.readFailedMessage": "Choose a readable statement file.",
      "manualMatch.title": "Manual match review",
      "manualMatch.description": "Compare evidence and require an independent approver.",
      "manualMatch.emptyCandidates": "No evidence pair currently requires a manual match proposal.",
      "manualMatch.internalEvidence": "Internal {reference} / {amount}",
      "manualMatch.externalEvidence": "External {reference} / {amount}",
      "manualMatch.amountLabel": "Amount to match",
      "manualMatch.internalRemaining": "Internal remaining {amount}",
      "manualMatch.externalRemaining": "External remaining {amount}",
      "manualMatch.availableAmount": "Available to match {amount}",
      "manualMatch.amountLimit": "Enter a positive amount up to {amount}",
      "manualMatch.approvalTitle": "Independent approval queue",
      "manualMatch.emptyApprovals": "No manual match proposal is waiting for approval.",
      "manualMatch.proposalFacts": "{id} / {amount} / {time}",
      "manualMatch.actions.propose": "Propose match",
      "manualMatch.actions.approve": "Approve match",
      "manualMatch.notifications.proposedTitle": "Manual match proposed",
      "manualMatch.notifications.proposedMessage": "Waiting for an independent reviewer.",
      "manualMatch.notifications.approvedTitle": "Manual match approved",
      "manualMatch.notifications.approvedMessage": "The approval record was created.",
      "certification.statuses.NEEDS_REVIEW": "Needs review",
      "certification.statuses.READY_FOR_SIGNOFF": "Ready for sign-off",
      "certification.signoffQueue": "Sign-off queue",
      "certification.emptyRuns": "No durable reconciliation runs have been created yet.",
      "certification.runFacts": "{matches} match(es), {exceptions} exception(s), suspense {suspense}",
      "certification.actions.inspect": "Proof",
      "certification.actions.sign": "Sign",
      "certification.detail.title": "Selected run proof",
      "certification.detail.description": "{matches} match(es), {exceptions} unresolved exception(s), {suspense} unresolved suspense item(s), {subjects} proof subject(s)",
      "certification.detail.eligible": "Eligible",
      "certification.detail.blocked": "Blocked",
      "certification.detail.error": "Run proof unavailable.",
      "certification.detail.unavailable": "Select a run to inspect proof.",
      "certification.detail.matches": "Matches",
      "certification.detail.exceptions": "Exceptions",
      "certification.detail.suspense": "Suspense",
      "certification.detail.proofSubjects": "Proof subjects",
      "certification.detail.blockers": "Blockers",
      "certification.detail.matchedEvidence": "Matched evidence",
      "certification.detail.unresolvedExceptions": "Unresolved exceptions",
      "certification.detail.suspenseLinks": "Suspense links",
      "certification.detail.subjectCount": "{count} proof subject(s)",
      "certification.detail.emptyRows": "None",
      "certification.detail.noBlockers": "No certification blocker",
      "filters.location": "Location",
      "filters.allLocations": "All locations",
      "filters.period": "Period",
      "periods.mtd": "Month to date",
      "actions.refresh": "Refresh",
      "source.captureReadModel": "Capture read model",
      "source.providerPersistencePending": "Provider persistence pending",
      "sections.suspense": "Suspense-ready failures",
      "sections.suspenseDescription": "Rows that need payment transaction proof.",
      "proof.open": "Open proof",
      "proof.loading": "Loading proof",
      "proof.unavailable": "No supported proof trail is linked to this row.",
      "proof.error": "Payment transaction proof could not be loaded safely.",
      "table.failure": "Failure",
      "table.rail": "Rail",
      "table.reference": "Reference",
      "table.counterparty": "Counterparty",
      "table.amount": "Amount",
      "table.suspenseType": "Suspense type",
      "table.time": "Time",
      "table.proof": "Proof",
      "severity.critical": "Critical",
      "failureTypes.AMOUNT_MISMATCH": "Amount mismatch",
      "rails.MOBILE_MONEY": "Mobile money",
      "suspenseTypes.amount_mismatch": "Amount mismatch",
      "metrics.activeRails": "Active rails",
      "metrics.cleanRuns": "Clean runs",
      "metrics.criticalFailures": "Critical failures",
      "metrics.duplicates": "Duplicates",
      "metrics.suspenseExposure": "Suspense exposure",
      "details.activeRails": "{count} rails",
      "details.attentionRuns": "{count} attention",
      "details.failures": "{count} failures",
      "details.coverage": "{value} coverage",
      "details.suspense": "{count} suspense",
      "sections.runs": "Runs",
      "sections.runsDescription": "Run rows",
      "sections.assurance": "Assurance",
      "sections.assuranceDescription": "Assurance summary",
      "sections.failureGroups": "Failure groups",
      "sections.failureGroupsDescription": "Failure groups summary",
      "sections.duplicates": "Duplicates",
      "sections.duplicatesDescription": "Duplicate provider references",
      "empty.failureGroups": "No reconciliation failure groups were found for this scope.",
      "empty.duplicates": "No duplicate provider references were found.",
      "summary.totalPayments": "Total payments",
      "summary.totalAmount": "Total amount",
      "summary.matchedAmount": "Matched amount",
      "summary.providerReferenceCoverage": "Provider reference coverage",
    }

    return Object.entries(values ?? {}).reduce(
      (message, [name, value]) => message.replace(`{${name}}`, String(value)),
      messages[key] ?? key,
    )
  },
}))

jest.mock("@/actions/evidence/proof-trail.actions", () => ({
  getProofTrailAction: jest.fn(),
}))

jest.mock("@/components/notifications/NotificationProvider", () => ({
  useNotifications: () => ({
    info: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
  }),
}))

jest.mock("@/hooks/payments/usePaymentReconciliationWorkbench", () => ({
  usePaymentReconciliationWorkbench: jest.fn(),
}))

jest.mock("@/hooks/payments/usePaymentReconciliationDashboard", () => ({
  useExportReconciliationCertificate: jest.fn(),
  useImportProviderStatement: jest.fn(),
  useManualMatchWorkflow: jest.fn(),
  usePaymentReconciliationDashboard: jest.fn(),
  useReconciliationRunDetail: jest.fn(),
  useResolveSuspenseItem: jest.fn(),
  useRunPaymentReconciliation: jest.fn(),
  useSignReconciliationRun: jest.fn(),
}))

import { getProofTrailAction } from "@/actions/evidence/proof-trail.actions"
import { usePaymentReconciliationWorkbench } from "@/hooks/payments/usePaymentReconciliationWorkbench"
import {
  useExportReconciliationCertificate,
  useImportProviderStatement,
  useManualMatchWorkflow,
  usePaymentReconciliationDashboard,
  useReconciliationRunDetail,
  useResolveSuspenseItem,
  useRunPaymentReconciliation,
  useSignReconciliationRun,
} from "@/hooks/payments/usePaymentReconciliationDashboard"
import type { PaymentReconciliationDashboardData, ReconciliationRunDetail } from "@/actions/payments/reconciliation.actions"
import type { ProofTrailResult } from "@/services/evidence/evidence-contracts"
import PaymentReconciliationWorkbench, { PaymentTrustBanner } from "../PaymentReconciliationWorkbench"

const mockGetProofTrailAction = getProofTrailAction as jest.Mock
const mockUsePaymentReconciliationWorkbench = usePaymentReconciliationWorkbench as jest.Mock
const mockUsePaymentReconciliationDashboard = usePaymentReconciliationDashboard as jest.Mock
const mockUseReconciliationRunDetail = useReconciliationRunDetail as jest.Mock
const mockUseRunPaymentReconciliation = useRunPaymentReconciliation as jest.Mock
const mockUseSignReconciliationRun = useSignReconciliationRun as jest.Mock
const mockUseExportReconciliationCertificate = useExportReconciliationCertificate as jest.Mock
const mockUseImportProviderStatement = useImportProviderStatement as jest.Mock
const mockUseManualMatchWorkflow = useManualMatchWorkflow as jest.Mock
const mockUseResolveSuspenseItem = useResolveSuspenseItem as jest.Mock

const dashboard: PaymentReconciliationDashboardData = {
  scope: { organizationId: "org-1", actorId: "checker-1" },
  source: {
    mode: "DURABLE_EVIDENCE_KERNEL",
    certificationStatus: "NEEDS_REVIEW",
    asOf: "2026-06-23T09:45:00.000Z",
    organizationScoped: true,
    providerEvidenceAvailable: true,
    statementEvidenceAvailable: true,
  },
  summary: {
    providerAccountCount: 3,
    activeProviderAccountCount: 2,
    recentRunCount: 5,
    readyForSignoffCount: 1,
    signedRunCount: 2,
    openExceptionCount: 6,
    criticalExceptionCount: 1,
    openSuspenseCount: 3,
    openSuspenseByCurrency: [{ currencyCode: "XAF", amount: "12000.25", count: 3 }],
    pendingRunCount: 1,
    closeBlockerCount: 4,
  },
  providerAccounts: [],
  statementFiles: [],
  manualMatchCandidates: [],
  manualMatchPreparation: { writeAllowed: true, checkedAt: "2026-09-06T03:00:00Z", hasMore: false, limit: 12 },
  manualMatchProposals: [],
  recentRuns: [],
  suspenseQueue: [],
  notificationQueue: [],
  exceptionGroups: [],
  controls: {
    certifiedModeEnabled: true,
    providerIngestionKillSwitch: false,
    signoffRequiresFreshAuth: true,
    manualMatchMakerChecker: true,
    suspensePostingGatewayOnly: true,
  },
} as const

function dashboardWithRuns(overrides: Partial<PaymentReconciliationDashboardData> = {}): PaymentReconciliationDashboardData {
  return {
    ...dashboard,
    recentRuns: [
      {
        id: "run-1",
        providerAccountId: "provider-account-1",
        businessDate: "2026-06-23T00:00:00.000Z",
        status: "READY_FOR_SIGNOFF",
        matchCount: 1,
        exceptionCount: 1,
        suspenseAmount: 5000,
        signedAt: null,
        certificateHash: null,
      },
    ],
    ...overrides,
  }
}

function mutationMock() {
  return { isPending: false, mutateAsync: jest.fn() }
}

function suspenseFailure(overrides: Record<string, unknown> = {}) {
  return {
    id: "failure-1",
    rail: "MOBILE_MONEY",
    type: "AMOUNT_MISMATCH",
    severity: "critical",
    message: "Provider amount does not match the captured payment.",
    amount: 15000,
    currency: "XAF",
    providerReference: "MOMO-123",
    paymentId: "payment-1",
    paymentTransactionId: "pt-1",
    paymentNumber: "PAY-1",
    counterparty: "Customer One",
    occurredAt: "2026-06-23T09:45:00.000Z",
    suspenseType: "amount_mismatch",
    suspenseAccountHint: "47x",
    readiness: "ready_for_suspense",
    ...overrides,
  }
}

function workbenchData(overrides: Record<string, unknown> = {}) {
  return {
    generatedAt: "2026-06-23T09:45:00.000Z",
    organization: { id: "org-1", name: "Demo Org", currency: "XAF" },
    filters: {
      locationId: null,
      period: "mtd",
      startDate: "2026-06-01T00:00:00.000Z",
      endDate: "2026-06-23T23:59:59.000Z",
    },
    source: {
      mode: "PAYMENT_CAPTURE_READ_MODEL",
      persistentRunsAvailable: false,
    },
    locations: [],
    summary: {
      railCount: 1,
      activeRailCount: 1,
      cleanRunCount: 0,
      attentionRunCount: 1,
      criticalRunCount: 1,
      totalPayments: 1,
      totalAmount: 15000,
      matchedAmount: 0,
      failureCount: 1,
      criticalFailureCount: 1,
      duplicateProviderReferenceCount: 0,
      suspenseItemCount: 1,
      suspenseExposure: 15000,
      providerReferenceCoverage: 90,
    },
    runSummaries: [],
    failureGroupsByRail: [],
    duplicateProviderReferenceAlerts: [],
    suspenseReadyFailures: [suspenseFailure()],
    ...overrides,
  }
}

function runDetail(overrides: Partial<ReconciliationRunDetail> = {}): ReconciliationRunDetail {
  return {
    source: {
      mode: "DURABLE_EVIDENCE_KERNEL",
      asOf: "2026-06-23T09:45:00.000Z",
      organizationScoped: true,
      certificationStatus: "READY_FOR_SIGNOFF",
    },
    run: {
      id: "run-1",
      providerAccountId: "provider-account-1",
      paymentRailId: "rail-1",
      businessDate: "2026-06-23T00:00:00.000Z",
      periodStart: "2026-06-23T00:00:00.000Z",
      periodEnd: "2026-06-24T00:00:00.000Z",
      status: "READY_FOR_SIGNOFF",
      runById: "runner-1",
      signedById: null,
      signedAt: null,
      certificateHash: null,
      totals: {
        internalAmount: "5000.00",
        externalAmount: "5000.00",
        matchedAmount: "5000.00",
        suspenseAmount: "0.00",
        matchCount: 1,
        exceptionCount: 1,
      },
    },
    providerAccount: {
      id: "provider-account-1",
      displayName: "MTN settlement",
      providerCode: "MTN",
      currencyCode: "XAF",
      railName: "Mobile money",
      railType: "MOBILE_MONEY",
    },
    evidence: {
      providerEventCount: 1,
      statementLineCount: 1,
      matchRecordCount: 1,
      openExceptionCount: 1,
      openSuspenseCount: 1,
    },
    certification: {
      signoffEligible: false,
      periodStatus: "OPEN",
      blockers: [
        {
          code: "OPEN_EXCEPTIONS",
          severity: "HIGH",
          message: "Open reconciliation exceptions must be resolved before sign-off.",
          count: 1,
          evidenceSubjects: [
            { type: "PAYMENT_EXCEPTION", id: "exception-1" },
            { type: "PAYMENT_TRANSACTION", id: "payment-1" },
          ],
        },
      ],
    },
    matchRecords: [
      {
        id: "match-1",
        status: "AUTO_MATCHED",
        rule: "EXACT_PROVIDER_REFERENCE",
        confidence: "99.50",
        amountMatched: "5000.00",
        currencyCode: "XAF",
        paymentTransactionId: "payment-1",
        providerEventId: "provider-event-1",
        statementLineId: "statement-line-1",
        ledgerPostingBatchId: "ledger-batch-1",
        evidenceSubjects: [
          { type: "PAYMENT_TRANSACTION", id: "payment-1" },
          { type: "PROVIDER_EVENT", id: "provider-event-1" },
          { type: "STATEMENT_LINE", id: "statement-line-1" },
          { type: "LEDGER_POSTING_BATCH", id: "ledger-batch-1" },
        ],
      },
    ],
    exceptions: [
      {
        id: "exception-1",
        type: "AMOUNT_MISMATCH",
        severity: "CRITICAL",
        status: "OPEN",
        sourceType: "PROVIDER_EVENT",
        sourceId: "provider-event-1",
        paymentTransactionId: "payment-1",
        providerEventId: "provider-event-1",
        statementLineId: null,
        suspenseItemId: "suspense-1",
        unresolved: true,
        evidenceSubjects: [
          { type: "PAYMENT_EXCEPTION", id: "exception-1" },
          { type: "PAYMENT_TRANSACTION", id: "payment-1" },
        ],
      },
    ],
    suspenseItems: [
      {
        id: "suspense-1",
        type: "AMOUNT_MISMATCH",
        status: "POSTED_TO_SUSPENSE",
        severity: "HIGH",
        amount: "5000.00",
        currencyCode: "XAF",
        paymentTransactionId: "payment-1",
        ledgerPostingBatchId: null,
        unresolved: true,
        evidenceSubjects: [
          { type: "SUSPENSE_ITEM", id: "suspense-1" },
          { type: "PAYMENT_TRANSACTION", id: "payment-1" },
        ],
      },
    ],
    ...overrides,
  }
}

function proofTrail(overrides: Partial<ProofTrailResult> = {}): ProofTrailResult {
  return {
    organizationId: "org-1",
    subjectType: "payment.transaction",
    subjectId: "pt-1",
    moduleSlug: "payments",
    evidenceGrade: "reconciled",
    reason: "Payment transaction proof is reconciled.",
    freshness: "fresh",
    generatedAt: "2026-06-23T09:46:00.000Z",
    sourceModules: ["payments", "finance"],
    nodes: [
      {
        id: "payment-transaction",
        nodeType: "payment.transaction",
        nodeId: "pt-1",
        label: "Payment transaction pt-1",
        moduleSlug: "payments",
        evidenceGrade: "reconciled",
        sourceTable: "payment_transactions",
        available: true,
        redacted: false,
        metadata: {},
      },
      {
        id: "provider-reference",
        nodeType: "payment.provider_reference",
        nodeId: "redacted",
        label: "Provider reference",
        moduleSlug: "payments",
        evidenceGrade: "operational",
        sourceTable: "payment_transactions",
        available: true,
        redacted: true,
        metadata: {},
      },
    ],
    edges: [],
    blockers: [],
    redactions: [
      {
        id: "payment-provider-reference",
        field: "nodes.provider-reference",
        reason: "Provider references are protected by payment provider reference redaction policy.",
        policy: "kontava-payment-provider-reference-mask-policy",
      },
    ],
    nextActions: [],
    audit: { sensitiveAccess: true, accessLogged: true },
    ...overrides,
  }
}

function setupWorkbench(
  data = workbenchData(),
  durableDashboard: PaymentReconciliationDashboardData | undefined = undefined,
  detail: ReconciliationRunDetail | undefined = undefined,
) {
  const importStatement = mutationMock()
  const manualMatch = { propose: mutationMock(), approve: mutationMock() }
  manualMatch.propose.mutateAsync.mockResolvedValue({ matchId: "saved-proposal", alreadyApplied: false })
  manualMatch.approve.mutateAsync.mockResolvedValue({ matchId: "saved-approval", alreadyApplied: false })
  mockUsePaymentReconciliationWorkbench.mockReturnValue({
    data,
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: jest.fn(),
  })
  mockUsePaymentReconciliationDashboard.mockReturnValue({ data: durableDashboard, isLoading: false, error: null, refetch: jest.fn() })
  mockUseReconciliationRunDetail.mockReturnValue({ data: detail, isLoading: false, isFetching: false, error: null })
  mockUseImportProviderStatement.mockReturnValue(importStatement)
  mockUseManualMatchWorkflow.mockReturnValue(manualMatch)
  mockUseRunPaymentReconciliation.mockReturnValue(mutationMock())
  mockUseSignReconciliationRun.mockReturnValue(mutationMock())
  mockUseExportReconciliationCertificate.mockReturnValue(mutationMock())
  mockUseResolveSuspenseItem.mockReturnValue({
    assign: mutationMock(),
    propose: mutationMock(),
    approve: mutationMock(),
  })

  return { ...render(<PaymentReconciliationWorkbench />), importStatement, manualMatch }
}

function rowForPayment(paymentNumber: string) {
  const row = screen.getByText(paymentNumber).closest("tr")
  if (!row) throw new Error(`Row not found for ${paymentNumber}`)
  return row
}

describe("reconciliation read recovery", () => {
  it.each(["en", "fr"])("names filters and translates recorded status codes without changing allowed actions in %s", locale => {
    jest.mocked(useLocale).mockReturnValue(locale)
    setupWorkbench(workbenchData(), {
      ...dashboard,
      providerAccounts: [{ id: "account-1", displayName: "Provider name", providerCode: "CODE-1", status: "DRAFT", currencyCode: "XAF", railName: "Mobile money", railType: "MOBILE_MONEY" }],
      statementFiles: [{ id: "file-1", providerAccountId: "account-1", providerAccountName: "Provider name", fileName: "statement.csv", sourceType: "CSV", status: "IMPORTED", periodStart: "2026-06-01", periodEnd: "2026-06-30", importedAt: "2026-06-23", lineCount: 1 }],
      recentRuns: [{ id: "run-1", providerAccountId: "account-1", businessDate: "2026-06-23", status: "BLOCKED", matchCount: 0, exceptionCount: 1, suspenseAmount: 10, signedAt: null, certificateHash: null }],
    })
    expect(screen.getByRole("combobox", { name: locale === "fr" ? "Lieu" : "Location" })).toBeInTheDocument()
    expect(screen.getByRole("combobox", { name: locale === "fr" ? "Période" : "Period" })).toBeInTheDocument()
    expect(screen.getByText(locale === "fr" ? "Brouillon" : "Draft")).toBeInTheDocument()
    expect(screen.getByText(locale === "fr" ? "Bloqué" : "Blocked")).toBeInTheDocument()
    expect(screen.getByText(locale === "fr" ? "Importé" : "Imported")).toBeInTheDocument()
    expect(within(screen.getByText("CODE-1 / XAF").parentElement!).getByText("Mobile money")).toBeInTheDocument()
    for (const code of ["DRAFT", "BLOCKED", "IMPORTED", "MOBILE_MONEY"]) expect(screen.queryByText(code, { exact: true })).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "certification.actions.run" })).toBeDisabled()
    expect(screen.queryByRole("button", { name: "signReview.open" })).not.toBeInTheDocument()
  })

  it("keeps an unknown provider status inspectable without treating it as active", () => {
    setupWorkbench(workbenchData(), { ...dashboard, providerAccounts: [{ id: "account-unknown", displayName: "Provider name", providerCode: "CODE-1", status: "NEW_PROVIDER_STATE", currencyCode: "XAF", railName: "New rail", railType: "NEW_RAIL" }] })
    expect(screen.getByText("NEW_PROVIDER_STATE")).toBeInTheDocument()
    expect(screen.getByText("NEW_RAIL")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "certification.actions.run" })).toBeDisabled()
  })

  it.each(["en", "fr"])("preserves the shell main landmark across result, loading, denial and failure states in %s", locale => {
    jest.mocked(useLocale).mockReturnValue(locale)
    const log = jest.spyOn(console, "error").mockImplementation(() => {})
    try {
      const page = setupWorkbench()
      page.rerender(<main aria-label="Dashboard workspace"><PaymentReconciliationWorkbench /></main>)
      const main = screen.getByRole("main", { name: "Dashboard workspace" })
      expect(screen.getAllByRole("main")).toHaveLength(1)
      expect(within(main).getByRole("heading", { name: "Payment reconciliation workbench" })).toBeInTheDocument()
      for (const state of [
        { isLoading: true, error: null },
        { isLoading: false, error: Object.assign(new Error("PRIVATE_DIAGNOSTIC"), { code: "FORBIDDEN" }) },
        { isLoading: false, error: new Error("PRIVATE_DIAGNOSTIC") },
      ]) {
        mockUsePaymentReconciliationWorkbench.mockReturnValue({ data: undefined, refetch: jest.fn(), ...state })
        page.rerender(<main aria-label="Dashboard workspace"><PaymentReconciliationWorkbench /></main>)
        expect(screen.getAllByRole("main")).toEqual([main])
        expect(within(main).getByRole("heading", { level: 1 })).toBeInTheDocument()
        expect(screen.queryByText("PRIVATE_DIAGNOSTIC")).not.toBeInTheDocument()
        expect(screen.queryByRole("table")).not.toBeInTheDocument()
      }
      expect(page.importStatement.mutateAsync).not.toHaveBeenCalled()
      expect(page.manualMatch.approve.mutateAsync).not.toHaveBeenCalled()
    } finally { log.mockRestore() }
  })

  afterEach(() => {
    jest.mocked(useLocale).mockReturnValue("en-US")
    ;(usePermissions as jest.Mock).mockReturnValue({ organizationId: "org-1", permissionState: "ready", refreshPermissions: jest.fn(), hasPermission: () => true, user: { id: "checker-1" } })
  })

  it.each(["en", "fr"])("announces pending reads and keeps a safe exit without duplicating main in %s", locale => {
    jest.mocked(useLocale).mockReturnValue(locale)
    const page = setupWorkbench()
    mockUsePaymentReconciliationWorkbench.mockReturnValue({ data: undefined, isLoading: true, error: null, refetch: jest.fn() })
    page.rerender(<main><PaymentReconciliationWorkbench /></main>)
    expect(screen.getAllByRole("main")).toHaveLength(1)
    expect(screen.getByRole("status")).toHaveTextContent(locale === "fr" ? "Chargement du rapprochement" : "Loading reconciliation")
    expect(screen.getByRole("status")).toHaveTextContent(locale === "fr" ? "Aucun résultat n’est encore disponible" : "Results are not available yet")
    expect(screen.getByRole("link", { name: locale === "fr" ? "Retour au tableau de bord" : "Back to dashboard" })).toHaveAttribute("href", `/${locale}/dashboard`)
    expect(screen.queryByRole("table")).not.toBeInTheDocument()
    expect(page.importStatement.mutateAsync).not.toHaveBeenCalled()
    expect(page.manualMatch.approve.mutateAsync).not.toHaveBeenCalled()
  })

  it.each(["en", "fr"])("offers a scoped access review and permission refresh in %s", locale => {
    jest.mocked(useLocale).mockReturnValue(locale)
    const refreshPermissions = jest.fn()
    ;(usePermissions as jest.Mock).mockReturnValue({ permissionState: "ready", refreshPermissions, hasPermission: () => false, user: { id: "checker-1" } })
    const page = setupWorkbench()
    const readAgain = jest.fn()
    mockUsePaymentReconciliationWorkbench.mockReturnValue({ data: undefined, isLoading: false, error: Object.assign(new Error("PRIVATE_DIAGNOSTIC"), { code: "FORBIDDEN" }), refetch: readAgain })
    page.rerender(<PaymentReconciliationWorkbench />)
    expect(screen.getByRole("heading", { name: locale === "fr" ? "L’accès au rapprochement doit être vérifié" : "Reconciliation access needs review" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: locale === "fr" ? "Vérifier mes autorisations" : "Review my access" })).toHaveAttribute("href", `/${locale}/dashboard/access-requests`)
    fireEvent.click(screen.getByRole("button", { name: locale === "fr" ? "Actualiser les autorisations" : "Refresh access check" }))
    expect(refreshPermissions).toHaveBeenCalledTimes(1)
    expect(readAgain).not.toHaveBeenCalled()
    expect(screen.queryByText("PRIVATE_DIAGNOSTIC")).not.toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "Payment reconciliation workbench" })).not.toBeInTheDocument()
    expect(page.container.querySelector("main")).toBeNull()
  })

  it("retries the read for a service failure without misclassifying it as denied access", () => {
    const log = jest.spyOn(console, "error").mockImplementation(() => {})
    try {
      const page = setupWorkbench()
      const readAgain = jest.fn()
      mockUsePaymentReconciliationWorkbench.mockReturnValue({ data: undefined, isLoading: false, error: new Error("PRIVATE_DIAGNOSTIC"), refetch: readAgain })
      page.rerender(<PaymentReconciliationWorkbench />)
      expect(screen.queryByRole("link", { name: "Review my access" })).not.toBeInTheDocument()
      fireEvent.click(screen.getByRole("button"))
      expect(readAgain).toHaveBeenCalledTimes(1)
      expect(screen.queryByText("PRIVATE_DIAGNOSTIC")).not.toBeInTheDocument()
    } finally { log.mockRestore() }
  })
})

describe("PaymentTrustBanner", () => {
  it.each(["REQUESTED", "RUNNING", "FAILED", "COMPLETE"] as const)("shows authoritative %s scan progress without treating it as issue resolution", async state => {
    setupWorkbench(workbenchData(), { ...dashboard, alertScan: { kind: "RECONCILIATION_ALERT_SCAN_V1", scanId: "c781b497-8491-46b9-bc94-e626b2c28816", workerId: "worker-1", startedAt: "2026-09-09T10:00:00Z", updatedAt: "2026-09-09T10:01:00Z", completedAt: null, state, phase: "SUSPENSE", cursor: null, version: 1, examined: 100, created: 90, errorCode: state === "FAILED" ? "ALERT_SCAN_PAGE_FAILED" : null } })
    const inbox = within(screen.getByRole("region", { name: "inbox.title" }))
    expect(inbox.getByRole("status")).toHaveTextContent(`inbox.scan.states.${state}`)
    expect(inbox.getByRole("status")).toHaveTextContent("inbox.scan.description")
    await waitFor(() => expect(screen.getByRole("button", { name: "Check recovery status" })).toBeEnabled())
  })
  it("shows all returned observations with exact recorded currency and honest status", () => {
    setupWorkbench(workbenchData(), { ...dashboard, notificationQueue: Array.from({ length: 25 }, (_, i) => ({ id: `notice-${i}`, type: "payment-reconciliation.exception.created", severity: "HIGH", ownerId: null, dueAt: null, amount: i === 0 ? "9007199254740993.25" : i === 1 ? "5.50" : "1.00", currency: i === 0 ? "XAF" : i === 1 ? "USD" : null, status: "UNREAD", source: "RECONCILIATION_RUN", createdAt: "2026-09-09T10:00:00Z", evidenceRef: {} })) })
    const inbox = within(screen.getByRole("region", { name: "inbox.title" }))
    expect(inbox.getByText("9,007,199,254,740,993.25 XAF")).toBeVisible()
    expect(inbox.getByText("5.50 USD")).toBeVisible()
    expect(inbox.getAllByText("inbox.recorded")).toHaveLength(25)
    expect(inbox.getAllByText("inbox.amountUnavailable")).toHaveLength(23)
    expect(inbox.queryByText("UNREAD")).not.toBeInTheDocument()
    expect(inbox.getAllByText("inbox.severities.HIGH")).toHaveLength(25)
  })
  it("shows provider evidence, statement evidence, signed runs, suspense, exceptions, blockers, and freshness", () => {
    render(
      <PaymentTrustBanner
        dashboard={dashboard}
        number={(value) => String(value ?? 0)}
        money={(value) => `XAF ${value ?? 0}`}
        formatDateTime={() => "Jun 23, 09:45"}
      />,
    )

    expect(screen.getByRole("region", { name: "Payment trust banner" })).toBeInTheDocument()
    expect(screen.getByText("Needs review")).toBeInTheDocument()

    expect(within(screen.getByText("Provider evidence").parentElement!.parentElement!).getByText("Available")).toBeInTheDocument()
    expect(within(screen.getByText("Statement evidence").parentElement!.parentElement!).getByText("Available")).toBeInTheDocument()
    expect(within(screen.getByText("Signed runs").parentElement!.parentElement!).getByText("2")).toBeInTheDocument()
    expect(within(screen.getByText("Open suspense").parentElement!.parentElement!).getByText("3")).toBeInTheDocument()
    expect(screen.getByText("12,000.25 XAF")).toBeInTheDocument()
    expect(within(screen.getByText("Critical exceptions").parentElement!.parentElement!).getByText("1")).toBeInTheDocument()
    expect(within(screen.getByText("Close blockers").parentElement!.parentElement!).getByText("4")).toBeInTheDocument()
    expect(within(screen.getByText("Freshness").parentElement!.parentElement!).getByText("Jun 23, 09:45")).toBeInTheDocument()
  })
})

describe("PaymentReconciliationWorkbench run detail proof summary", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders the selected run blocker and proof subject summary from the read detail", () => {
    setupWorkbench(workbenchData(), dashboardWithRuns(), runDetail())

    expect(mockUseReconciliationRunDetail).toHaveBeenCalledWith("run-1")
    expect(screen.getByText("Selected run proof")).toBeInTheDocument()
    expect(screen.getByText("1 match(es), 1 unresolved exception(s), 1 unresolved suspense item(s), 8 proof subject(s)")).toBeInTheDocument()
    expect(screen.getByText("OPEN_EXCEPTIONS / 1")).toBeInTheDocument()
    expect(screen.getByText("EXACT_PROVIDER_REFERENCE")).toBeInTheDocument()
    expect(screen.getAllByText("AMOUNT_MISMATCH")).toHaveLength(2)
    expect(screen.getByText("POSTED_TO_SUSPENSE")).toBeInTheDocument()
  })

  it("opens proof from a selected run matched evidence subject", async () => {
    mockGetProofTrailAction.mockResolvedValue({ success: true, data: proofTrail(), error: null, status: 200 })

    setupWorkbench(workbenchData(), dashboardWithRuns(), runDetail())

    const matchedEvidence = screen.getByText("Matched evidence").parentElement
    if (!matchedEvidence) throw new Error("Matched evidence section not found")

    fireEvent.click(within(matchedEvidence).getByRole("button", { name: "Open proof" }))

    await waitFor(() => {
      expect(mockGetProofTrailAction).toHaveBeenCalledWith({
        subjectType: "payment.transaction",
        subjectId: "payment-1",
      })
    })
    expect(await screen.findByText("Payment transaction pt-1")).toBeInTheDocument()
  })

  it("opens provider event proof from a selected run provider-only exception", async () => {
    mockGetProofTrailAction.mockResolvedValue({
      success: true,
      data: proofTrail({
        subjectType: "provider.event",
        subjectId: "provider-event-1",
        nodes: [
          {
            id: "provider-event",
            nodeType: "provider.event",
            nodeId: "provider-event-1",
            label: "Provider event callback",
            moduleSlug: "payments",
            evidenceGrade: "reconciled",
            sourceTable: "provider_events",
            available: true,
            redacted: false,
          },
        ],
      }),
      error: null,
      status: 200,
    })

    setupWorkbench(
      workbenchData(),
      dashboardWithRuns(),
      runDetail({
        exceptions: [
          {
            id: "exception-provider-event",
            type: "MISSING_INTERNAL_PAYMENT",
            severity: "HIGH",
            status: "OPEN",
            sourceType: "PROVIDER_EVENT",
            sourceId: "provider-event-1",
            paymentTransactionId: null,
            providerEventId: "provider-event-1",
            statementLineId: null,
            suspenseItemId: null,
            unresolved: true,
            evidenceSubjects: [
              { type: "PAYMENT_EXCEPTION", id: "exception-provider-event" },
              { type: "PROVIDER_EVENT", id: "provider-event-1" },
            ],
          },
        ],
        suspenseItems: [],
      }),
    )

    const exceptionEvidence = screen.getByText("Unresolved exceptions").parentElement
    if (!exceptionEvidence) throw new Error("Unresolved exceptions section not found")

    fireEvent.click(within(exceptionEvidence).getByRole("button", { name: "Open proof" }))

    await waitFor(() => {
      expect(mockGetProofTrailAction).toHaveBeenCalledWith({
        subjectType: "provider.event",
        subjectId: "provider-event-1",
      })
    })
    expect(await screen.findByText("Provider event callback")).toBeInTheDocument()
  })
})

describe("PaymentReconciliationWorkbench proof launcher", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(usePermissions as jest.Mock).mockReturnValue({ permissionState: "ready", refreshPermissions: jest.fn(), hasPermission: () => true, user: { id: "checker-1" } })
  })

  it("paginates and searches suspense rows beyond the former 25-row cutoff", () => {
    setupWorkbench(workbenchData({ suspenseReadyFailures: Array.from({ length: 31 }, (_, index) => suspenseFailure({ id: `failure-${index}`, paymentNumber: `PAY-PAGE-${index}`, paymentTransactionId: `pt-${index}` })) }))
    const suspenseTable = () => within(screen.getByRole("table", { name: "Suspense-ready failures" }))
    expect(suspenseTable().getByText("PAY-PAGE-0")).toBeInTheDocument()
    expect(suspenseTable().queryByText("PAY-PAGE-30")).not.toBeInTheDocument()
    const pagination = within(screen.getByRole("navigation", { name: "Suspense-ready failures pagination" }))
    fireEvent.click(pagination.getByRole("button", { name: "Go to last page" }))
    expect(suspenseTable().getByText("PAY-PAGE-30")).toBeInTheDocument()
    fireEvent.change(screen.getByRole("searchbox", { name: "Search: Suspense-ready failures" }), { target: { value: "PAY-PAGE-0" } })
    expect(suspenseTable().getByText("PAY-PAGE-0")).toBeInTheDocument()
    expect(pagination.getByText("Page 1 of 1")).toBeInTheDocument()
    expect(within(rowForPayment("PAY-PAGE-0")).getByRole("button", { name: "Open proof" })).toBeInTheDocument()
  })

  it("opens payment transaction proof from a suspense transaction row and preserves redactions", async () => {
    mockGetProofTrailAction.mockResolvedValue({ success: true, data: proofTrail(), error: null, status: 200 })

    setupWorkbench()

    fireEvent.click(within(rowForPayment("PAY-1")).getByRole("button", { name: "Open proof" }))

    await waitFor(() => {
      expect(mockGetProofTrailAction).toHaveBeenCalledWith({
        subjectType: "payment.transaction",
        subjectId: "pt-1",
      })
    })
    expect(await screen.findByText("Payment transaction pt-1")).toBeInTheDocument()
    expect(screen.getByText("Provider references are protected by payment provider reference redaction policy.")).toBeInTheDocument()
  })

  it("renders unavailable proof state for rows without a payment transaction subject", () => {
    setupWorkbench(
      workbenchData({
        suspenseReadyFailures: [
          suspenseFailure({
            id: "failure-2",
            paymentId: "payment-2",
            paymentTransactionId: null,
            paymentNumber: "PAY-2",
          }),
        ],
      }),
    )

    const button = within(rowForPayment("PAY-2")).getByRole("button", { name: "Open proof" })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute("title", "No supported proof trail is linked to this row.")
    expect(mockGetProofTrailAction).not.toHaveBeenCalled()
  })

  it("shows permission denial returned by the protected proof action", async () => {
    mockGetProofTrailAction.mockResolvedValue({ success: false, data: null, error: "Permission denied", status: 403 })

    setupWorkbench()

    fireEvent.click(within(rowForPayment("PAY-1")).getByRole("button", { name: "Open proof" }))

    expect(await screen.findByText("Permission denied")).toBeInTheDocument()
  })

  it("keeps the drawer in a loading state while payment proof is pending", async () => {
    let resolveProof!: (value: unknown) => void
    mockGetProofTrailAction.mockImplementation(
      () => new Promise((resolve) => {
        resolveProof = resolve
      }),
    )

    setupWorkbench()

    fireEvent.click(within(rowForPayment("PAY-1")).getByRole("button", { name: "Open proof" }))

    expect(await screen.findByRole("button", { name: "Loading proof", hidden: true })).toBeDisabled()
    expect(screen.getByText("Loading proof trail.")).toBeInTheDocument()

    resolveProof({ success: true, data: proofTrail(), error: null, status: 200 })
    expect(await screen.findByText("Payment transaction pt-1")).toBeInTheDocument()
  })

  it("shows a safe drawer error when proof loading throws", async () => {
    mockGetProofTrailAction.mockRejectedValue(new Error("Proof service unavailable"))

    setupWorkbench()

    fireEvent.click(within(rowForPayment("PAY-1")).getByRole("button", { name: "Open proof" }))

    expect(await screen.findByText("Proof service unavailable")).toBeInTheDocument()
  })
})

describe("PaymentReconciliationWorkbench evidence operations", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(usePermissions as jest.Mock).mockReturnValue({ permissionState: "ready", refreshPermissions: jest.fn(), hasPermission: () => true, user: { id: "checker-1" } })
  })

  it("imports statement content through the protected provider account workflow", async () => {
    const rendered = setupWorkbench(workbenchData(), {
      ...dashboard,
      providerAccounts: [{
        id: "provider-account-1",
        displayName: "MTN MoMo",
        providerCode: "MTN",
        status: "ACTIVE",
        currencyCode: "XAF",
        railName: "Mobile money",
        railType: "MOBILE_MONEY",
      }],
    })
    rendered.importStatement.mutateAsync.mockResolvedValue({ status: "IMPORTED", importedLineCount: 1 })

    fireEvent.change(screen.getByLabelText("Statement content"), {
      target: { value: "amount,date,reference\n1000,2026-08-14,REF-1" },
    })
    fireEvent.change(screen.getByLabelText("Statement file name"), { target: { value: "momo-2026-08-14.csv" } })
    fireEvent.click(screen.getByRole("button", { name: "Import statement" }))

    await waitFor(() => {
      expect(rendered.importStatement.mutateAsync).toHaveBeenCalledWith({
        providerAccountId: "provider-account-1",
        providerCode: "MTN",
        rawContent: "amount,date,reference\n1000,2026-08-14,REF-1",
        fileName: "momo-2026-08-14.csv",
      })
    })
  })

  it("proposes and approves manual matches with bounded evidence identifiers", async () => {
    const rendered = setupWorkbench(workbenchData(), {
      ...dashboard,
      manualMatchCandidates: [{
        exceptionId: "exception-1",
        providerAccountId: "provider-account-1",
        providerAccountName: "MTN MoMo",
        paymentTransactionId: "payment-transaction-1",
        providerEventId: null,
        statementLineId: "statement-line-1",
        exceptionType: "AMOUNT_MISMATCH",
        severity: "HIGH",
        internalReference: "RE****01",
        externalReference: "RE****02",
        internalAmount: "1000.00",
        externalAmount: "900.00",
        internalRemaining: "1000.00", externalRemaining: "900.00", availableAmount: "900.00", eligibility: "READY", externalCurrencyCode: "XAF",
        currencyCode: "XAF",
        occurredAt: "2026-08-14T08:00:00.000Z",
      }],
      manualMatchProposals: [{
        evidenceRevision: `sha256:${"a".repeat(64)}`,
        evidenceSummary: { internalAmount: "1000.00", externalAmount: "900.00", direction: "INBOUND", externalSource: "STATEMENT_LINE" },
        id: "proposed-match-1",
        providerAccountId: "provider-account-1",
        providerAccountName: "MTN MoMo",
        paymentTransactionId: "payment-transaction-1",
        providerEventId: null,
        statementLineId: "statement-line-1",
        amountMatched: "900.00",
        currencyCode: "XAF",
        matchedById: "maker-1",
        createdAt: "2026-08-14T08:30:00.000Z",
      }],
    })

    fireEvent.click(screen.getByRole("button", { name: "Propose match" }))
    fireEvent.click(screen.getByRole("button", { name: "Approve match" }))

    await waitFor(() => {
      expect(rendered.manualMatch.propose.mutateAsync).toHaveBeenCalledWith({
        providerAccountId: "provider-account-1",
        paymentTransactionId: "payment-transaction-1",
        providerEventId: undefined,
        statementLineId: "statement-line-1",
        amountMatched: "900.00",
        currencyCode: "XAF",
      })
      expect(rendered.manualMatch.approve.mutateAsync).toHaveBeenCalledWith({ proposedMatchId: "proposed-match-1", expectedEvidenceRevision: `sha256:${"a".repeat(64)}` })
    })
  })

  const proposal = {
    id: "proposal-review-1", providerAccountId: "provider-account-1", providerAccountName: "Review rail",
    paymentTransactionId: "payment-transaction-1", providerEventId: "event-1", statementLineId: null,
    amountMatched: "60.00", currencyCode: "XAF", matchedById: "maker-1", createdAt: "2026-09-05T20:00:00Z",
    evidenceRevision: `sha256:${"b".repeat(64)}`,
    evidenceSummary: { internalAmount: "100.00", externalAmount: "100.00", direction: "INBOUND", externalSource: "PROVIDER_EVENT" },
  }

  const residualCandidate: PaymentReconciliationDashboardData["manualMatchCandidates"][number] = {
    exceptionId: "residual-exception", providerAccountId: "provider-account-1", providerAccountName: "Residual rail",
    paymentTransactionId: "payment-transaction-1", providerEventId: "event-1", statementLineId: null,
    exceptionType: "AMOUNT_MISMATCH", severity: "HIGH", internalReference: "IN****01", externalReference: "EX****01",
    internalAmount: "100.00", externalAmount: "90.00", currencyCode: "XAF", externalCurrencyCode: "XAF",
    internalRemaining: "13.25", externalRemaining: "3.25", availableAmount: "3.25", eligibility: "READY", occurredAt: "2026-09-06T03:00:00Z",
  }

  it("defaults to the exact remaining allocation and accepts a comma without changing its value", async () => {
    const rendered = setupWorkbench(workbenchData(), { ...dashboard, manualMatchCandidates: [residualCandidate] })
    const input = screen.getByLabelText("Amount to match")
    expect(input).toHaveValue("3.25")
    expect(screen.getByText("Internal remaining 13.25 XAF")).toBeInTheDocument()
    expect(screen.getByText("External remaining 3.25 XAF")).toBeInTheDocument()
    fireEvent.change(input, { target: { value: "3,25" } })
    fireEvent.click(screen.getByRole("button", { name: "Propose match" }))
    await waitFor(() => expect(rendered.manualMatch.propose.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ amountMatched: "3.25" })))
  })

  it.each(["90", "0", "-1", "3.251", "3,26", "invalid"])("prevents an invalid residual amount %s and explains the limit", amount => {
    const rendered = setupWorkbench(workbenchData(), { ...dashboard, manualMatchCandidates: [residualCandidate] })
    const input = screen.getByLabelText("Amount to match")
    fireEvent.change(input, { target: { value: amount } })
    expect(input).toHaveAttribute("aria-invalid", "true")
    expect(input).toHaveAccessibleDescription("Enter a positive amount up to 3.25 XAF")
    const button = screen.getByRole("button", { name: "Propose match" })
    expect(button).toBeDisabled()
    fireEvent.click(button)
    expect(rendered.manualMatch.propose.mutateAsync).not.toHaveBeenCalled()
  })

  it("preserves the edited amount across a failed refresh and revalidates the refreshed residual", () => {
    const data = { ...dashboard, manualMatchCandidates: [residualCandidate] }
    const rendered = setupWorkbench(workbenchData(), data)
    fireEvent.change(screen.getByLabelText("Amount to match"), { target: { value: "2.75" } })
    mockUsePaymentReconciliationDashboard.mockReturnValue({ data, isLoading: false, error: new Error("Evidence temporarily unavailable") })
    rendered.rerender(<PaymentReconciliationWorkbench />)
    expect(screen.getByText("notifications.failedMessage")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Propose match" })).not.toBeInTheDocument()
    expect(screen.queryByText("No evidence pair currently requires a manual match proposal.")).not.toBeInTheDocument()
    mockUsePaymentReconciliationDashboard.mockReturnValue({ data: { ...data, manualMatchCandidates: [{ ...residualCandidate, availableAmount: "2.00" }] }, isLoading: false, error: null })
    rendered.rerender(<PaymentReconciliationWorkbench />)
    expect(screen.getByLabelText("Amount to match")).toHaveValue("2.75")
    expect(screen.getByRole("button", { name: "Propose match" })).toBeDisabled()
    expect(screen.getByText("Enter a positive amount up to 2.00 XAF")).toBeInTheDocument()
  })

  it.each(["loading", "error", "signed_out"])("preserves entered amounts and blocks changes during access %s", state => {
    const rendered = setupWorkbench(workbenchData(), { ...dashboard, manualMatchCandidates: [residualCandidate], manualMatchProposals: [proposal] })
    fireEvent.change(screen.getByLabelText("Amount to match"), { target: { value: "2.75" } })
    const retry = jest.fn()
    ;(usePermissions as jest.Mock).mockReturnValue({ permissionState: state, refreshPermissions: retry, hasPermission: () => true, user: { id: "checker-1" } })
    rendered.rerender(<PaymentReconciliationWorkbench />)
    expect(screen.getByLabelText("Amount to match")).toHaveValue("2.75")
    expect(screen.getByRole("button", { name: "Propose match" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Approve match" })).toBeDisabled()
    expect(screen.queryByText("manualMatch.recovery.proposeDenied")).not.toBeInTheDocument()
    if (state === "error") {
      expect(screen.getByRole("alert")).toHaveTextContent("manualMatch.recovery.accessFailed")
      fireEvent.click(screen.getByRole("button", { name: "manualMatch.recovery.retryAccess" }))
      expect(retry).toHaveBeenCalledTimes(1)
    } else if (state === "signed_out") {
      expect(screen.getByRole("alert")).toHaveTextContent("manualMatch.recovery.sessionUnavailable")
      expect(screen.getByRole("link", { name: "manualMatch.recovery.signIn" })).toHaveAttribute("href", "/en/login-v2")
      expect(screen.queryByRole("button", { name: "manualMatch.recovery.retryAccess" })).not.toBeInTheDocument()
    } else expect(screen.getByText("manualMatch.recovery.accessLoading", { selector: '[role="status"]' })).toHaveAttribute("role", "status")
    expect(rendered.manualMatch.propose.mutateAsync).not.toHaveBeenCalled()
    expect(rendered.manualMatch.approve.mutateAsync).not.toHaveBeenCalled()
    ;(usePermissions as jest.Mock).mockReturnValue({ permissionState: "ready", refreshPermissions: retry, hasPermission: () => true, user: { id: "checker-1" } })
    rendered.rerender(<PaymentReconciliationWorkbench />)
    expect(screen.getByRole("button", { name: "Propose match" })).toBeEnabled()
    expect(screen.getByLabelText("Amount to match")).toHaveValue("2.75")
  })
  it("retains the amount after a rejected proposal and permits correcting it", async () => {
    const rendered = setupWorkbench(workbenchData(), { ...dashboard, manualMatchCandidates: [residualCandidate] })
    rendered.manualMatch.propose.mutateAsync.mockRejectedValueOnce(new Error("Evidence changed; refresh and review"))
    fireEvent.change(screen.getByLabelText("Amount to match"), { target: { value: "2.75" } })
    fireEvent.click(screen.getByRole("button", { name: "Propose match" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("Evidence changed; refresh and review")
    expect(screen.getByLabelText("Amount to match")).toHaveValue("2.75")
    fireEvent.change(screen.getByLabelText("Amount to match"), { target: { value: "2.00" } })
    fireEvent.click(screen.getByRole("button", { name: "Propose match" }))
    await waitFor(() => expect(rendered.manualMatch.propose.mutateAsync).toHaveBeenLastCalledWith(expect.objectContaining({ amountMatched: "2.00" })))
  })

  it("refreshes both reconciliation views and requests rejection on fetch failures", async () => {
    setupWorkbench(workbenchData(), { ...dashboard, manualMatchCandidates: [residualCandidate] })
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }))
    await waitFor(() => expect(mockUsePaymentReconciliationDashboard().refetch).toHaveBeenCalledWith({ throwOnError: true }))
    expect(mockUsePaymentReconciliationWorkbench().refetch).toHaveBeenCalledWith({ throwOnError: true })
  })

  it("keeps read-only preparation visible and disables both financial submissions", () => {
    setupWorkbench(workbenchData(), { ...dashboard, manualMatchCandidates: [residualCandidate], manualMatchProposals: [proposal], manualMatchPreparation: { ...dashboard.manualMatchPreparation, writeAllowed: false } })
    expect(screen.getByLabelText("Amount to match")).toBeDisabled()
    expect(screen.getByRole("button", { name: "Propose match" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Approve match" })).toBeDisabled()
    expect(screen.getAllByText("manualMatch.moduleUnavailable")).toHaveLength(2)
    expect(screen.getByText("External remaining 3.25 XAF")).toBeInTheDocument()
  })

  it.each(["FULLY_ALLOCATED", "PROVIDER_EVIDENCE_INVALID", "EVIDENCE_SELECTION_REQUIRED"] as const)("explains %s without enabling a proposal", eligibility => {
    setupWorkbench(workbenchData(), { ...dashboard, manualMatchCandidates: [{ ...residualCandidate, eligibility, availableAmount: eligibility === "FULLY_ALLOCATED" ? "0.00" : null }] })
    expect(screen.getByLabelText("Amount to match")).toBeDisabled()
    expect(screen.getByLabelText("Amount to match")).toHaveAccessibleDescription(`manualMatch.eligibility.${eligibility}`)
    expect(screen.getByRole("button", { name: "Propose match" })).toBeDisabled()
  })

  it("displays each evidence currency and never substitutes zero for missing amounts", () => {
    setupWorkbench(workbenchData(), { ...dashboard, manualMatchCandidates: [{ ...residualCandidate, externalCurrencyCode: "EUR", externalAmount: "90.00", externalRemaining: null, internalRemaining: null, availableAmount: null, eligibility: "CURRENCY_MISMATCH" }] })
    expect(screen.getByText("External EX****01 / 90.00 EUR")).toBeInTheDocument()
    expect(screen.getByText("Internal remaining Not available")).toBeInTheDocument()
    expect(screen.getByText("External remaining Not available")).toBeInTheDocument()
    expect(screen.getByLabelText("Amount to match")).toHaveValue("")
  })

  it("keeps large record amounts exact and discloses the bounded queue", () => {
    setupWorkbench(workbenchData(), { ...dashboard, manualMatchCandidates: [{ ...residualCandidate, internalAmount: "9999999999999999.99" }], manualMatchPreparation: { ...dashboard.manualMatchPreparation, hasMore: true } })
    expect(screen.getByText("Internal IN****01 / 9,999,999,999,999,999.99 XAF")).toBeInTheDocument()
    expect(screen.getByText("manualMatch.moreCandidates")).toBeInTheDocument()
  })

  it.each(["XAF", "EUR"])("shows the exact manual approval amount in the record currency %s", currencyCode => {
    setupWorkbench(workbenchData(), { ...dashboard, manualMatchProposals: [{ ...proposal, currencyCode, amountMatched: "0.50" }] })
    const card = screen.getByText("Review rail").closest("[data-manual-proposal]") as HTMLElement
    expect(card).toHaveTextContent(`0.50 ${currencyCode}`)
  })

  it.each(["denied", "maker", "legacy"])("explains unavailable %s approval without submitting", reason => {
    ;(usePermissions as jest.Mock).mockReturnValue({ permissionState: "ready", refreshPermissions: jest.fn(), hasPermission: () => reason !== "denied", user: { id: reason === "maker" ? "maker-1" : "checker-1" } })
    const rendered = setupWorkbench(workbenchData(), { ...dashboard, manualMatchProposals: [{ ...proposal, evidenceRevision: reason === "legacy" ? null : proposal.evidenceRevision }] })
    const button = screen.getByRole("button", { name: "Approve match" })
    expect(button).toBeDisabled()
    expect(screen.getByText(`manualMatch.recovery.${reason === "denied" ? "approveDenied" : reason === "maker" ? "independent" : "legacy"}`)).toBeInTheDocument()
    fireEvent.click(button); expect(rendered.manualMatch.approve.mutateAsync).not.toHaveBeenCalled()
  })

  it("confirms identity and retries the same reviewed proposal without retaining the password", async () => {
    const rendered = setupWorkbench(workbenchData(), { ...dashboard, manualMatchProposals: [proposal] })
    rendered.manualMatch.approve.mutateAsync.mockRejectedValueOnce(Object.assign(new Error("Confirm identity"), { code: "FRESH_AUTH_REQUIRED" })).mockResolvedValueOnce({ matchId: "approved-saved", alreadyApplied: true })
    ;(stepUpWithPasswordAction as jest.Mock).mockResolvedValue({ success: true, data: {} })
    fireEvent.click(screen.getByRole("button", { name: "Approve match" }))
    const password = await screen.findByLabelText("manualMatch.passwordLabel")
    fireEvent.change(password, { target: { value: "synthetic-test-password" } })
    fireEvent.submit(password.closest("form")!)
    await waitFor(() => expect(rendered.manualMatch.approve.mutateAsync).toHaveBeenCalledTimes(2))
    expect(stepUpWithPasswordAction).toHaveBeenCalledWith({ password: "synthetic-test-password" })
    expect(rendered.manualMatch.approve.mutateAsync.mock.calls[0]).toEqual(rendered.manualMatch.approve.mutateAsync.mock.calls[1])
    expect(await screen.findByText("manualMatch.notifications.alreadyRecorded")).toHaveAttribute("role", "status")
    expect(screen.queryByLabelText("manualMatch.passwordLabel")).not.toBeInTheDocument()
  })

  it("opens the existing scoped proof drawer for a manual proposal", async () => {
    mockGetProofTrailAction.mockResolvedValue({ success: true, data: proofTrail(), error: null, status: 200 })
    setupWorkbench(workbenchData(), { ...dashboard, manualMatchProposals: [proposal] })
    const card = screen.getByText("Review rail").parentElement!
    fireEvent.click(within(card).getByRole("button", { name: "Open proof" }))
    await waitFor(() => expect(mockGetProofTrailAction).toHaveBeenCalledWith({ subjectType: "payment.transaction", subjectId: "payment-transaction-1" }))
  })
  it("lets the original preparer replace stale evidence without approving it", async () => {
    ;(usePermissions as jest.Mock).mockReturnValue({ permissionState: "ready", refreshPermissions: jest.fn(), hasPermission: () => true, user: { id: "maker-1" } })
    const rendered = setupWorkbench(workbenchData(), { ...dashboard, manualMatchProposals: [proposal] })
    fireEvent.click(screen.getByRole("button", { name: "manualMatch.actions.renew" }))
    await waitFor(() => expect(rendered.manualMatch.propose.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ supersedesProposalId: proposal.id, paymentTransactionId: proposal.paymentTransactionId, providerEventId: proposal.providerEventId, amountMatched: "60.00" })))
    expect(rendered.manualMatch.approve.mutateAsync).not.toHaveBeenCalled()
  })
})
jest.mock("@/actions/payments/reconciliation.actions", () => ({ getPaymentSuspenseRecordsAction: jest.fn() }))

jest.mock("@/actions/payments/reconciliation-preparation.actions", () => ({}))
jest.mock("@/actions/payments/suspense-resolution.actions", () => ({}))
jest.mock("@/actions/payments/exception-link.actions", () => ({}))
jest.mock("@/actions/payments/exception-closure.actions", () => ({}))

jest.mock("@/actions/payments/reconciliation-sign-review.actions", () => ({}))
