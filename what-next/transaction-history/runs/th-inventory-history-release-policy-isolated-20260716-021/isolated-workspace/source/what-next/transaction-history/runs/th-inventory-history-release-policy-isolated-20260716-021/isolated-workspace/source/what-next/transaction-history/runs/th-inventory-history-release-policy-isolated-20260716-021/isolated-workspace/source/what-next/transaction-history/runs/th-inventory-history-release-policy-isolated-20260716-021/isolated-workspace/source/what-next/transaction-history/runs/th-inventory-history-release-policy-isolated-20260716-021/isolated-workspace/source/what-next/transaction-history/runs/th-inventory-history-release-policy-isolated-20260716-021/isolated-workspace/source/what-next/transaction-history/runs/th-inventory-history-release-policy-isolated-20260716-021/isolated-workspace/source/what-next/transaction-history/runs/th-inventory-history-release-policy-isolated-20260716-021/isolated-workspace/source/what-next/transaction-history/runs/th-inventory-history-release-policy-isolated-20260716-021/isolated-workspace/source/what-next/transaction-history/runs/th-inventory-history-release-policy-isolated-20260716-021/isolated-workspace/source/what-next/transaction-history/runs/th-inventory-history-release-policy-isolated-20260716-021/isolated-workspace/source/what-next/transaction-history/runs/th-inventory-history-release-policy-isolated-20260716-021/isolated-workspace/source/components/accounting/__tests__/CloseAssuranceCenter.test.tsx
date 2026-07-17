import { render, screen } from "@testing-library/react"

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
}))

const mockUseCloseAssurance = useCloseAssurance as jest.Mock
const mockUseCloseEvidenceGraph = useCloseEvidenceGraph as jest.Mock
const mockUseRunCloseAssurance = useRunCloseAssurance as jest.Mock
const mockUseAssignCloseFinding = useAssignCloseFinding as jest.Mock
const mockUseCommentOnCloseFinding = useCommentOnCloseFinding as jest.Mock
const mockUseCloseWaiver = useCloseWaiver as jest.Mock
const mockUseExportClosePack = useExportClosePack as jest.Mock

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
    },
    source: {
      persisted: true,
      trustLevel: "T3",
      asOf: "2026-06-24T10:00:00.000Z",
      sourceTables: ["close_runs", "journal_entries", "payment_reconciliation_runs"],
    },
    summary: {
      passedCount: 4,
      checklistCount: 8,
      evidenceCount: 12,
      openFindingCount: 1,
      findingCount: 2,
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
      exportNotice: "Draft close pack export is available; certified export still enforces readiness gates.",
    },
  } as unknown as CloseAssuranceDashboardData
}

describe("CloseAssuranceCenter", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseCloseAssurance.mockReturnValue({
      data: dashboardData(),
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: jest.fn(),
    })
    mockUseCloseEvidenceGraph.mockReturnValue({ data: null, isFetching: false })
    mockUseRunCloseAssurance.mockReturnValue({ isPending: false, mutateAsync: jest.fn() })
    mockUseAssignCloseFinding.mockReturnValue({ isPending: false, mutateAsync: jest.fn() })
    mockUseCommentOnCloseFinding.mockReturnValue({ isPending: false, mutateAsync: jest.fn() })
    mockUseCloseWaiver.mockReturnValue({ request: { isPending: false, mutateAsync: jest.fn() } })
    mockUseExportClosePack.mockReturnValue({
      draft: { isPending: false, mutateAsync: jest.fn() },
      certified: { isPending: false, mutateAsync: jest.fn() },
    })
  })

  it("keeps the checklist full width and pairs certification with export", () => {
    const data = dashboardData()

    render(<CloseAssuranceCenter initialData={data} locale="en" />)

    expect(screen.getByTestId("close-readiness-workspace")).toHaveClass("grid", "gap-5")
    expect(screen.getByTestId("close-readiness-checklist")).toHaveClass(
      "divide-y",
      "divide-[var(--dash-border-subtle)]",
    )
    expect(screen.getByTestId("close-certification-row")).toHaveClass("xl:grid-cols-2")
    expect(screen.getByText("Close readiness checklist")).toBeInTheDocument()
    expect(screen.getByText("Certification controls")).toBeInTheDocument()
    expect(screen.getByText("Close pack export")).toBeInTheDocument()
  })
})