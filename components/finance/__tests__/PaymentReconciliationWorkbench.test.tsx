import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"

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
  useLocale: () => "en-US",
  useTranslations: () => (key: string, values?: Record<string, string | number>) => {
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
const mockUseResolveSuspenseItem = useResolveSuspenseItem as jest.Mock

const dashboard: PaymentReconciliationDashboardData = {
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
    openSuspenseAmount: 12000,
    closeBlockerCount: 4,
  },
  providerAccounts: [],
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
  mockUsePaymentReconciliationWorkbench.mockReturnValue({
    data,
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: jest.fn(),
  })
  mockUsePaymentReconciliationDashboard.mockReturnValue({ data: durableDashboard, isLoading: false, error: null })
  mockUseReconciliationRunDetail.mockReturnValue({ data: detail, isLoading: false, isFetching: false, error: null })
  mockUseRunPaymentReconciliation.mockReturnValue(mutationMock())
  mockUseSignReconciliationRun.mockReturnValue(mutationMock())
  mockUseExportReconciliationCertificate.mockReturnValue(mutationMock())
  mockUseResolveSuspenseItem.mockReturnValue({
    assign: mutationMock(),
    propose: mutationMock(),
    approve: mutationMock(),
  })

  return render(<PaymentReconciliationWorkbench />)
}

function rowForPayment(paymentNumber: string) {
  const row = screen.getByText(paymentNumber).closest("tr")
  if (!row) throw new Error(`Row not found for ${paymentNumber}`)
  return row
}

describe("PaymentTrustBanner", () => {
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
    expect(screen.getByText("Exposure XAF 12000")).toBeInTheDocument()
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