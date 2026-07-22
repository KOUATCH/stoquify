import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import { CloseAssuranceCenter } from "@/components/accounting/CloseAssuranceCenter"
import type { CloseAssuranceDashboardData } from "@/actions/accounting/close-assurance.actions"
import {
  useAssignCloseFinding,
  useCloseAssurance,
  useCloseEvidenceGraph,
  useCloseWaiver,
  useCommentOnCloseFinding,
  useExportClosePack,
  useRunCloseAssurance,
  useUpdateAccountantReview,
} from "@/hooks/accounting/useCloseAssurance"

jest.mock("lucide-react", () => {
  const React = require("react")
  const makeIcon = (name: string) => {
    const MockIcon = (props: React.SVGProps<SVGSVGElement>) =>
      React.createElement("svg", { "data-testid": `icon-${name}`, ...props })
    MockIcon.displayName = `Mock${name}Icon`
    return MockIcon
  }

  return new Proxy(
    { __esModule: true },
    {
      get(target, prop) {
        if (prop in target) return target[prop as keyof typeof target]
        return makeIcon(String(prop))
      },
    },
  )
})

jest.mock("@/hooks/accounting/useCloseAssurance", () => ({
  useAssignCloseFinding: jest.fn(),
  useCloseAssurance: jest.fn(),
  useCloseEvidenceGraph: jest.fn(),
  useCloseWaiver: jest.fn(),
  useCommentOnCloseFinding: jest.fn(),
  useExportClosePack: jest.fn(),
  useRunCloseAssurance: jest.fn(),
  useUpdateAccountantReview: jest.fn(),
}))

const mockUseCloseAssurance = useCloseAssurance as jest.Mock
const mockUseCloseEvidenceGraph = useCloseEvidenceGraph as jest.Mock
const mockUseRunCloseAssurance = useRunCloseAssurance as jest.Mock
const mockUseAssignCloseFinding = useAssignCloseFinding as jest.Mock
const mockUseCommentOnCloseFinding = useCommentOnCloseFinding as jest.Mock
const mockUseCloseWaiver = useCloseWaiver as jest.Mock
const mockUseExportClosePack = useExportClosePack as jest.Mock
const mockUseUpdateAccountantReview = useUpdateAccountantReview as jest.Mock

function dashboardData(): CloseAssuranceDashboardData {
  const period = {
    id: "period-2026-06",
    name: "June 2026",
    status: "OPEN",
    startDate: "2026-06-01T00:00:00.000Z",
    endDate: "2026-06-30T00:00:00.000Z",
  }

  return {
    organizationId: "org-1",
    periods: {
      currentOpenPeriod: period,
      recentPeriods: [period],
    },
    period,
    run: {
      id: "close-run-1",
      status: "BLOCKED",
      readinessScore: 72,
      evidenceCoveragePct: 80,
      criticalBlockerCount: 1,
      highBlockerCount: 2,
      correlationId: "corr-1",
      runById: "user-runner",
      startedAt: "2026-06-24T09:55:00.000Z",
      completedAt: "2026-06-24T10:00:00.000Z",
      createdAt: "2026-06-24T09:55:00.000Z",
    },
    source: {
      mode: "CLOSE_ASSURANCE_CENTER",
      organizationScoped: true,
      persisted: true,
      trustLevel: "T3",
      provenance: "POSTED",
      asOf: "2026-06-24T10:00:00.000Z",
      sourceTables: ["close_runs", "journal_entries", "payment_reconciliation_runs"],
    },
    summary: {
      passedCount: 4,
      checklistCount: 8,
      failedCount: 1,
      warningCount: 1,
      unavailableCount: 0,
      evidenceCount: 12,
      openFindingCount: 1,
      findingCount: 2,
      commentCount: 0,
    },
    checklist: Array.from({ length: 6 }, (_, index) => ({
      id: `check-${index + 1}`,
      key: `check-${index + 1}`,
      label: `Close gate ${index + 1}`,
      domain: index % 2 === 0 ? "ledger" : "reconciliation",
      status: index === 0 ? "FAILED" : "PASSED",
      severity: index === 0 ? "CRITICAL" : "LOW",
      detail: "Evidence-backed close gate with source service detail.",
      evidenceCount: index + 1,
      sourceService: "close-assurance.service",
      blockerReason: index === 0 ? "Critical evidence gap blocks certification." : null,
      nextActionHref: null,
      ownerId: null,
      dueAt: null,
    })),
    findings: [],
    evidenceItems: [],
    provenance: [],
    comments: [],
    reviews: [],
    controls: {
      assignmentRequiresPermission: "accounting.close.finding.assign",
      waiverApprovalRequiresFreshAuth: true,
      certificationAvailable: false,
      certificationDisabledReason: "Open high or critical findings block certification.",
      packExportAvailable: true,
      packExportDisabledReason: "Draft close pack export is available.",
    },
  } as unknown as CloseAssuranceDashboardData
}

function setDashboardData(data: CloseAssuranceDashboardData) {
  mockUseCloseAssurance.mockReturnValue({
    data,
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: jest.fn(),
  })
}

describe("CloseAssuranceCenter", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    setDashboardData(dashboardData())
    mockUseCloseEvidenceGraph.mockReturnValue({ data: null, isFetching: false })
    mockUseRunCloseAssurance.mockReturnValue({ isPending: false, mutateAsync: jest.fn() })
    mockUseAssignCloseFinding.mockReturnValue({ isPending: false, mutateAsync: jest.fn() })
    mockUseCommentOnCloseFinding.mockReturnValue({ isPending: false, mutateAsync: jest.fn() })
    mockUseCloseWaiver.mockReturnValue({ request: { isPending: false, mutateAsync: jest.fn() } })
    mockUseExportClosePack.mockReturnValue({
      draft: { isPending: false, mutateAsync: jest.fn() },
      certified: { isPending: false, mutateAsync: jest.fn() },
    })
    mockUseUpdateAccountantReview.mockReturnValue({ isPending: false, mutateAsync: jest.fn() })
  })

  it("keeps the checklist full width and pairs certification, review, and export", () => {
    const data = dashboardData()

    render(<CloseAssuranceCenter initialData={data} locale="en" />)

    expect(screen.getByTestId("close-readiness-workspace")).toHaveClass("grid", "gap-5")
    expect(screen.getByTestId("close-readiness-checklist")).toHaveClass(
      "divide-y",
      "divide-[var(--dash-border-subtle)]",
    )
    expect(screen.getByTestId("close-certification-row")).toHaveClass("xl:grid-cols-3")
    expect(screen.getByText("Close readiness checklist")).toBeInTheDocument()
    expect(screen.getByText("Certification controls")).toBeInTheDocument()
    expect(screen.getByText("Accountant review")).toBeInTheDocument()
    expect(screen.getByText("Close pack export")).toBeInTheDocument()
  })

  it("surfaces partial data when close evidence domains are unavailable", () => {
    const data = dashboardData()
    data.source.provenance = "MIXED"
    data.summary.unavailableCount = 2
    data.provenance = [
      {
        label: "Payment reconciliation",
        provenance: "UNAVAILABLE",
        asOf: "2026-06-24T10:00:00.000Z",
        periodStatus: "OPEN",
        sourceTables: ["payment_reconciliation_runs"],
        reason: "Payment reconciliation dashboard data is unavailable.",
      },
    ]
    data.evidenceItems = [
      {
        id: "evidence-1",
        checklistItemId: "check-1",
        findingId: null,
        evidenceType: "PAYMENT_RECONCILIATION_CERTIFICATE",
        sourceTable: "payment_reconciliation_runs",
        sourceType: "PaymentReconciliationRun",
        sourceId: null,
        sourceLabel: "Payment reconciliation evidence unavailable",
        sourceDate: "2026-06-24T10:00:00.000Z",
        sourceHash: null,
        provenance: "UNAVAILABLE",
        available: false,
        unavailableReason: "Payment reconciliation dashboard data is unavailable.",
        correlationId: "corr-1",
      },
    ]
    setDashboardData(data)

    render(<CloseAssuranceCenter initialData={data} locale="en" />)

    expect(screen.getByTestId("close-partial-data-state")).toBeInTheDocument()
    expect(screen.getByText("Partial data")).toBeInTheDocument()
    expect(screen.getByText("2 unavailable checklist gates")).toBeInTheDocument()
    expect(screen.getAllByText("Payment reconciliation").length).toBeGreaterThan(0)
  })

  it("keeps the no-period state visible and disables review writes without a close run", () => {
    const data = dashboardData()
    data.period = null
    data.periods.currentOpenPeriod = null
    data.periods.recentPeriods = []
    data.run.id = null
    setDashboardData(data)

    render(<CloseAssuranceCenter initialData={data} locale="en" />)

    expect(screen.getByText("No accounting period")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Run assessment" })).toBeDisabled()
    expect(screen.getAllByText("Run close readiness before recording an accountant review.").length).toBeGreaterThan(0)
  })

  it("records accountant review decisions through the close assurance hook", async () => {
    const updateReview = jest.fn().mockResolvedValue({ id: "review-1" })
    mockUseUpdateAccountantReview.mockReturnValue({ isPending: false, mutateAsync: updateReview })

    render(<CloseAssuranceCenter initialData={dashboardData()} locale="en" />)

    fireEvent.change(screen.getByPlaceholderText("Document reviewer decision, requested changes, or close-readiness rationale."), {
      target: { value: "Ready after reviewing source-linked evidence." },
    })
    fireEvent.click(screen.getByRole("button", { name: "Save review" }))

    await waitFor(() => {
      expect(updateReview).toHaveBeenCalledWith({
        closeRunId: "close-run-1",
        status: "READY_TO_CLOSE",
        decisionNotes: "Ready after reviewing source-linked evidence.",
      })
    })
  })

  it("shows action errors inline when a protected close action rejects", async () => {
    const updateReview = jest.fn().mockRejectedValue(new Error("Review service unavailable"))
    mockUseUpdateAccountantReview.mockReturnValue({ isPending: false, mutateAsync: updateReview })

    render(<CloseAssuranceCenter initialData={dashboardData()} locale="en" />)

    fireEvent.click(screen.getByRole("button", { name: "Save review" }))

    await waitFor(() => {
      expect(screen.getByText("Close action needs attention")).toBeInTheDocument()
      expect(screen.getByText("Review service unavailable")).toBeInTheDocument()
    })
  })

  it("uses the safe fallback for raw protected action errors", async () => {
    const updateReview = jest
      .fn()
      .mockRejectedValue(new Error("Prisma raw provider payload secret token leaked"))
    mockUseUpdateAccountantReview.mockReturnValue({ isPending: false, mutateAsync: updateReview })

    render(<CloseAssuranceCenter initialData={dashboardData()} locale="en" />)

    fireEvent.click(screen.getByRole("button", { name: "Save review" }))

    await waitFor(() => {
      expect(screen.getAllByText("Close action needs attention").length).toBeGreaterThan(0)
      expect(screen.queryByText(/secret token leaked/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/raw provider payload/i)).not.toBeInTheDocument()
    })
  })
})
