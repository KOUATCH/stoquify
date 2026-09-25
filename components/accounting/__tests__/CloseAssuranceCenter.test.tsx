import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import { CloseAssuranceCenter } from "@/components/accounting/CloseAssuranceCenter"
import { CloseReadinessJourneyPanel } from "@/components/accounting/CloseReadinessJourneyPanel"
import type { CloseAssuranceDashboardData } from "@/actions/accounting/close-assurance.actions"
import { usePermissions } from "@/hooks/usePermissions"
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

jest.mock("@/hooks/usePermissions", () => ({ usePermissions: jest.fn() }))

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
    ;(usePermissions as jest.Mock).mockReturnValue({
      permissionState: "ready",
      hasPermission: () => true,
      refreshPermissions: jest.fn(),
    })
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

  it("keeps the checklist full width and groups certification, review, and export on wide screens", () => {
    const data = dashboardData()

    render(<CloseAssuranceCenter initialData={data} locale="en" />)

    expect(screen.getByTestId("close-readiness-workspace")).toHaveClass("grid", "gap-5")
    expect(screen.getByTestId("close-readiness-checklist")).toHaveClass(
      "divide-y",
      "divide-[var(--dash-border-subtle)]",
    )
    expect(screen.getByTestId("close-certification-row")).toHaveClass("2xl:grid-cols-3")
    expect(screen.getByRole("heading", { name: "Close readiness checklist" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Certification controls" })).toBeInTheDocument()
    expect(screen.getByText("Accountant review")).toBeInTheDocument()
    expect(screen.getByText("Close pack export")).toBeInTheDocument()
    const sectionLinks = screen.getByRole("navigation", { name: "Page sections" }).querySelectorAll("a")
    const sections = Array.from(sectionLinks).map((link) => document.querySelector(link.getAttribute("href")!))
    expect(sections.every(Boolean)).toBe(true)
    sections.slice(1).forEach((section, index) => {
      expect(sections[index]!.compareDocumentPosition(section!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    })
  })

  it.each(["ready", "loading", "error"])("prevents all writes with unverified or read-only permissions (%s)", (permissionState) => {
    const data = dashboardData()
    data.controls.certificationAvailable = true
    data.findings = [{
      id: "finding-1", checklistItemId: "check-1", domain: "LEDGER", severity: "HIGH", status: "OPEN",
      title: "Missing source evidence", detail: "Evidence must be reviewed.", sourceService: "close-assurance.service",
      sourceType: null, sourceId: null, ownerId: null, assignedById: null, assignedAt: null, dueAt: null,
      waiverRequestedById: null, waiverApprovedById: null, correlationId: null,
    }]
    setDashboardData(data)
    ;(usePermissions as jest.Mock).mockReturnValue({
      permissionState,
      // Cached grants must not authorize an operation while current permissions are unverified.
      hasPermission: () => permissionState !== "ready",
      refreshPermissions: jest.fn(),
    })
    render(<CloseAssuranceCenter initialData={data} locale="en" />)
    fireEvent.change(screen.getByPlaceholderText("Add source-linked review notes for this finding."), { target: { value: "Review notes" } })
    fireEvent.change(screen.getByPlaceholderText("Document the compensating control or management-approved reason for this waiver request."), { target: { value: "A documented compensating control" } })
    for (const name of ["Run assessment", "Assign to me", "Add comment", "Request waiver", "Export draft JSON", "Export certified JSON", "Save review"]) {
      const button = screen.getByRole("button", { name, exact: true })
      expect(button).toBeDisabled()
      fireEvent.click(button)
    }
    for (const hook of [mockUseRunCloseAssurance, mockUseAssignCloseFinding, mockUseCommentOnCloseFinding, mockUseUpdateAccountantReview]) {
      expect(hook.mock.results[0].value.mutateAsync).not.toHaveBeenCalled()
    }
    expect(mockUseCloseWaiver.mock.results[0].value.request.mutateAsync).not.toHaveBeenCalled()
    expect(mockUseExportClosePack.mock.results[0].value.draft.mutateAsync).not.toHaveBeenCalled()
    expect(mockUseExportClosePack.mock.results[0].value.certified.mutateAsync).not.toHaveBeenCalled()
    const guidance = permissionState === "ready" ? "Some actions are unavailable with your current permissions. An administrator can review your access."
      : permissionState === "loading" ? "Checking your permissions…" : "Your permissions could not be verified. Refresh the page to retry."
    expect(screen.getByText(guidance)).toHaveAttribute("role", "status")
  })

  it("keeps assessment authority separate from exports and review", () => {
    ;(usePermissions as jest.Mock).mockReturnValue({
      permissionState: "ready", hasPermission: (permission: string) => permission === "accounting.close.run", refreshPermissions: jest.fn(),
    })
    render(<CloseAssuranceCenter initialData={dashboardData()} locale="en" />)
    expect(screen.getByRole("button", { name: "Run assessment" })).toBeEnabled()
    expect(screen.getByRole("button", { name: "Export draft JSON" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Save review" })).toBeDisabled()
  })

  it.each([
    ["BLOCKED", 0, "danger"],
    ["RUNNING", 0, "info"],
    ["READY", 0, "success"],
    ["READY", 1, "danger"],
  ] as const)("presents close status %s with %i critical blockers honestly", (status, criticalBlockerCount, tone) => {
    const data = dashboardData()
    data.run.status = status
    data.run.criticalBlockerCount = criticalBlockerCount
    render(<CloseReadinessJourneyPanel data={data} locale="en" />)
    expect(screen.getAllByText(status, { exact: true })[0]).toHaveClass(`text-[var(--dash-${tone})]`)
  })

  it("refreshes both evidence and permissions without discarding review notes", () => {
    const refreshPermissions = jest.fn()
    ;(usePermissions as jest.Mock).mockReturnValue({ permissionState: "error", hasPermission: () => false, refreshPermissions })
    render(<CloseAssuranceCenter initialData={dashboardData()} locale="fr" />)
    const notes = screen.getByRole("textbox", { name: "Notes de decision" })
    fireEvent.change(notes, { target: { value: "Notes à conserver" } })
    fireEvent.click(screen.getByRole("button", { name: "Actualiser", exact: true }))
    expect(refreshPermissions).toHaveBeenCalledTimes(1)
    expect(mockUseCloseAssurance.mock.results[0].value.refetch).toHaveBeenCalledTimes(1)
    expect(notes).toHaveValue("Notes à conserver")
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
    expect(screen.getByRole("table", { name: "Evidence coverage" })).toBeInTheDocument()
    expect(screen.getByText("Evidence ID")).toBeInTheDocument()
    expect(screen.getByText("Unavailable")).toBeInTheDocument()
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
