import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"
import { exportCertifiedClosePackAction } from "@/actions/accounting/close-assurance.actions"

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
jest.mock("@/components/accounting/CloseEvidenceWorkflowPanel", () => ({ CloseEvidenceWorkflowPanel: () => <section aria-label="Evidence recovery" /> }))
jest.mock("@/actions/security/step-up-auth.actions", () => ({ stepUpWithPasswordAction: jest.fn() }))
jest.mock("@/actions/accounting/close-assurance.actions", () => ({ exportCertifiedClosePackAction: jest.fn() }))
jest.mock("@/components/notifications/NotificationProvider", () => ({ useNotifications: () => ({ error: jest.fn(), success: jest.fn() }) }))

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
    currentProof: { checkedAt: "2026-06-24T10:01:00.000Z", grade: "blocked", blockers: [] },
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

  it.each([
    { locale: "en" as const, instant: "As of: Jun 24, 2026, 10:00 AM UTC", period: "June 2026 - Jun 1, 2026 to Jun 30, 2026" },
    { locale: "fr" as const, instant: "A la date: 24 juin 2026, 10:00 UTC", period: "June 2026 - 1 juin 2026 to 30 juin 2026" },
  ])("keeps $locale evidence timestamps and period dates stable outside the server timezone", ({ locale, instant, period }) => {
    const DateTimeFormat = Intl.DateTimeFormat
    const formatter = jest.spyOn(Intl, "DateTimeFormat").mockImplementation((language, options) =>
      new DateTimeFormat(language, { timeZone: "Pacific/Honolulu", ...options }))
    try {
      render(<CloseAssuranceCenter initialData={dashboardData()} locale={locale} />)
      expect(screen.getByText(instant)).toBeInTheDocument()
      expect(screen.getByText(period)).toBeInTheDocument()
    } finally {
      formatter.mockRestore()
    }
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
    ["blocked", "Review required", "danger"],
    ["raw", "Current certification is unverified", "warning"],
    ["operational", "Operational evidence", "warning"],
    ["certified", "Current certification evidence", "success"],
  ] as const)("presents current %s proof separately from the saved run status", (grade, label, tone) => {
    const data = dashboardData()
    data.run.status = "CERTIFIED"
    data.currentProof = { checkedAt: data.source.asOf, grade, blockers: [] }
    render(<CloseReadinessJourneyPanel data={data} locale="en" />)
    expect(screen.getByText(label, { exact: true })).toHaveClass(`text-[var(--dash-${tone})]`)
    expect(screen.getByText("Recorded status: CERTIFIED")).toBeInTheDocument()
  })

  it.each([
    ["en", "Current close evidence", "Close certification evidence is missing", "Recorded status: CERTIFIED", "Recorded readiness"],
    ["fr", "Preuves actuelles de clôture", "Les preuves de certification de clôture sont absentes", "Statut enregistré : CERTIFIED", "Préparation enregistrée"],
  ] as const)("explains missing retained proof in %s without rewriting certification history", (locale, region, title, recorded, readiness) => {
    const data = dashboardData()
    data.run = { ...data.run, status: "CERTIFIED", readinessScore: 100, criticalBlockerCount: 0, highBlockerCount: 0 }
    data.checklist = []
    data.currentProof = { checkedAt: data.source.asOf, grade: "blocked", blockers: [{
      id: "close-certified-export-missing", severity: "high", gate: "close_readiness", title: "Close certification evidence is missing",
      detail: "1 certified close run(s) lack a current certified export.", sourceTables: ["close_runs", "close_pack_exports"],
      nextAction: "Review and retain a current certified close pack before relying on certification.",
    }] }
    setDashboardData(data)
    render(<CloseAssuranceCenter initialData={data} locale={locale} />)
    expect(within(screen.getByRole("region", { name: region })).getByText(title)).toBeInTheDocument()
    expect(screen.getAllByText(recorded)).toHaveLength(2)
    expect(screen.getAllByText(readiness)).toHaveLength(2)
    expect(screen.getAllByText("100%").length).toBeGreaterThan(0)
    expect(screen.queryByText("No close blockers detected for this assessment.")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: locale === "fr" ? "Exporter JSON certifie" : "Export certified JSON" })).toBeDisabled()
  })

  it.each([
    ["en", "Current close evidence", "Close assessment is historical", "Open latest assessment"],
    ["fr", "Preuves actuelles de clôture", "L’évaluation de clôture est historique", "Ouvrir la dernière évaluation"],
  ] as const)("offers explicit %s recovery for an older assessment without certifying it", (locale, region, title, refresh) => {
    const data = dashboardData()
    data.run.status = "CERTIFIED"
    data.currentProof = { checkedAt: data.source.asOf, assessmentState: "HISTORICAL", grade: "blocked", blockers: [{
      id: "close-assessment-not-current", severity: "high", gate: "close_readiness", title: "Close assessment is historical",
      detail: "This assessment is not the latest assessment for its accounting period.", sourceTables: ["close_runs"],
      nextAction: "Open the latest close assessment before relying on certification.",
    }] }
    const refetch = jest.fn()
    mockUseCloseAssurance.mockReturnValue({ data, error: null, isLoading: false, isFetching: false, refetch })
    render(<CloseAssuranceCenter initialData={data} locale={locale} />)
    const proof = screen.getByRole("region", { name: region })
    expect(within(proof).getByText(title)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: locale === "fr" ? "Exporter JSON certifie" : "Export certified JSON" })).toBeDisabled()
    fireEvent.click(within(proof).getByRole("button", { name: refresh }))
    expect(refetch).toHaveBeenCalledTimes(1)
    expect(mockUseExportClosePack.mock.results[0].value.certified.mutateAsync).not.toHaveBeenCalled()
  })

  it.each([
    ["en", "Certification recorded", "Certification is already recorded for this assessment."],
    ["fr", "Certification enregistrée", "La certification est déjà enregistrée pour cette évaluation."],
  ] as const)("labels an already certified current assessment accurately in %s", (locale, label, explanation) => {
    const data = dashboardData()
    data.run.status = "CERTIFIED"
    data.currentProof = { checkedAt: data.source.asOf, assessmentState: "CURRENT", grade: "certified", blockers: [] }
    data.controls.certificationAvailable = false
    data.controls.certificationDisabledReason = "Close run is not READY."
    setDashboardData(data)
    render(<CloseAssuranceCenter initialData={data} locale={locale} />)
    expect(screen.getByText(label)).toBeInTheDocument()
    expect(screen.getByText(explanation)).toBeInTheDocument()
    expect(screen.queryByText("Close run is not READY.")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: locale === "fr" ? "Exporter JSON certifie" : "Export certified JSON" })).toBeDisabled()
  })

  it("does not show no journey blockers when current certified export proof is missing", () => {
    const data = dashboardData()
    data.run.status = "CERTIFIED"
    data.currentProof = { checkedAt: data.source.asOf, grade: "blocked", blockers: [{ id: "close-certified-export-missing", severity: "high", gate: "close_readiness", title: "Close certification evidence is missing", detail: "1 certified close run(s) lack a current certified export.", sourceTables: ["close_pack_exports"] }] }
    render(<CloseReadinessJourneyPanel data={data} locale="en" />)
    expect(screen.getByText("Close certification evidence is missing")).toBeInTheDocument()
    expect(screen.queryByText("No high-risk journey blockers are visible.")).not.toBeInTheDocument()
  })

  it("retains assessment history while a failed refresh is unavailable and retryable", () => {
    const data = dashboardData()
    data.run.status = "CERTIFIED"
    data.controls.certificationAvailable = true
    data.currentProof = { checkedAt: data.source.asOf, grade: "certified", blockers: [] }
    const retry = jest.fn()
    mockUseCloseAssurance.mockReturnValue({ data, error: new Error("database secret"), isLoading: false, isFetching: false, refetch: retry })
    render(<CloseAssuranceCenter initialData={data} locale="en" />)
    const region = screen.getByRole("region", { name: "Current close evidence" })
    expect(within(region).getByText("Unavailable")).toBeInTheDocument()
    expect(screen.getAllByText("Recorded status: CERTIFIED")).toHaveLength(2)
    expect(screen.queryByText("Current certification evidence")).not.toBeInTheDocument()
    expect(screen.queryByText("database secret")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Export certified JSON" })).toBeDisabled()
    fireEvent.click(within(region).getByRole("button", { name: "Refresh" }))
    expect(retry).toHaveBeenCalledTimes(1)
  })

  it("updates the journey and center together when the live proof response changes", () => {
    const initial = dashboardData()
    initial.run.status = "CERTIFIED"
    initial.currentProof = { checkedAt: initial.source.asOf, grade: "certified", blockers: [] }
    setDashboardData(initial)
    const view = render(<CloseAssuranceCenter initialData={initial} locale="en" />)
    expect(screen.getAllByText("Current certification evidence").length).toBeGreaterThan(1)
    const updated = { ...initial, currentProof: { ...initial.currentProof, grade: "blocked" as const, blockers: [{
      id: "close-evidence-stale", severity: "high" as const, gate: "close_readiness", title: "Close evidence has been invalidated",
      detail: "1 close run(s) require fresh evidence after a source change.", sourceTables: ["close_runs"],
    }] } }
    setDashboardData(updated)
    view.rerender(<CloseAssuranceCenter initialData={initial} locale="en" />)
    expect(screen.queryByText("Current certification evidence")).not.toBeInTheDocument()
    expect(screen.getAllByText("Close evidence has been invalidated")).toHaveLength(2)
    expect(screen.getAllByRole("heading", { name: "Close readiness journey" })).toHaveLength(1)
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

  it.each([
    ["en", "blocked"], ["fr", "blocked"], ["en", "unavailable"], ["fr", "unavailable"],
  ] as const)("retains all entered notes after certified export denial and %s %s evidence refresh", async (locale, refreshState) => {
    const data = dashboardData()
    data.run = { ...data.run, status: "READY", criticalBlockerCount: 0, highBlockerCount: 0 }
    data.currentProof = { checkedAt: data.source.asOf, grade: "operational", blockers: [] }
    data.controls.certificationAvailable = true
    data.findings = [{
      id: "finding-1", checklistItemId: "check-1", domain: "LEDGER", severity: "MEDIUM", status: "OPEN",
      title: "Review supporting notes", detail: "Retain the review notes.", sourceService: "close-assurance.service",
      sourceType: null, sourceId: null, ownerId: null, assignedById: null, assignedAt: null, dueAt: null,
      waiverRequestedById: null, waiverApprovedById: null, correlationId: null,
    }]
    setDashboardData(data)
    const message = locale === "fr"
      ? "La certification a été refusée. Consultez les preuves actuelles de clôture et résolvez les conditions signalées."
      : "Certification was refused. Review current close evidence and resolve the reported conditions."
    const certified = jest.fn().mockImplementation(async () => {
      if (refreshState === "unavailable") {
        mockUseCloseAssurance.mockReturnValue({ data, error: new Error("database secret"), isLoading: false, isFetching: false, refetch: jest.fn() })
      } else {
        setDashboardData({ ...data, currentProof: { checkedAt: data.source.asOf, grade: "blocked", blockers: [{
          id: "close-evidence-stale", severity: "high", gate: "close_readiness", title: "Close evidence has been invalidated",
          detail: "1 close run(s) require fresh evidence after a source change.", sourceTables: ["close_runs"],
        }] } })
      }
      throw new Error(message)
    })
    mockUseExportClosePack.mockReturnValue({ draft: { isPending: false, mutateAsync: jest.fn() }, certified: { isPending: false, mutateAsync: certified } })
    const download = jest.spyOn(HTMLAnchorElement.prototype, "click")
    try {
      render(<CloseAssuranceCenter initialData={data} locale={locale} />)
      const comment = screen.getByPlaceholderText(locale === "fr" ? "Ajouter des notes de revue liees a la source de ce constat." : "Add source-linked review notes for this finding.")
      const waiver = screen.getByPlaceholderText(locale === "fr" ? "Documenter le controle compensatoire ou la raison approuvee pour cette derogation." : "Document the compensating control or management-approved reason for this waiver request.")
      const review = screen.getByRole("textbox", { name: locale === "fr" ? "Notes de decision" : "Decision notes" })
      fireEvent.change(comment, { target: { value: "Unsubmitted finding notes" } })
      fireEvent.change(waiver, { target: { value: "Unsubmitted waiver rationale" } })
      fireEvent.change(review, { target: { value: "Unsubmitted review decision" } })
      const exportButton = screen.getByRole("button", { name: locale === "fr" ? "Exporter JSON certifie" : "Export certified JSON" })
      expect(exportButton).toBeEnabled()
      fireEvent.click(exportButton)
      await waitFor(() => expect(screen.getByText(message).closest('[role="alert"]')).toBeInTheDocument())
      expect(exportButton).toBeDisabled()
      expect(comment).toHaveValue("Unsubmitted finding notes")
      expect(waiver).toHaveValue("Unsubmitted waiver rationale")
      expect(review).toHaveValue("Unsubmitted review decision")
      expect(certified).toHaveBeenCalledTimes(1)
      expect(download).not.toHaveBeenCalled()
      expect(screen.queryByText(locale === "fr" ? "Dernier export" : "Last export")).not.toBeInTheDocument()
      expect(screen.queryByText("database secret")).not.toBeInTheDocument()
      if (refreshState === "unavailable") {
        const proof = screen.getByRole("region", { name: locale === "fr" ? "Preuves actuelles de clôture" : "Current close evidence" })
        expect(within(proof).getByText(locale === "fr" ? "Indisponible" : "Unavailable")).toBeInTheDocument()
        fireEvent.click(within(proof).getByRole("button", { name: locale === "fr" ? "Actualiser" : "Refresh" }))
        expect(mockUseCloseAssurance.mock.results.at(-1)!.value.refetch).toHaveBeenCalledTimes(1)
        expect(certified).toHaveBeenCalledTimes(1)
      }
    } finally {
      download.mockRestore()
    }
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

  it.each([
    ["en", "Save review", "Current password", "Verify identity", "Identity verified. Retry your selected action."],
    ["fr", "Enregistrer la revue", "Mot de passe actuel", "Vérifier l’identité", "Identité vérifiée. Réessayez l’action choisie."],
  ] as const)("recovers fresh authentication in %s without repeating the consequential action", async (locale, actionName, passwordLabel, verifyLabel, verified) => {
    const updateReview = jest.fn().mockRejectedValue(Object.assign(new Error("Fresh authentication required"), { code: "FRESH_AUTH_REQUIRED" }))
    mockUseUpdateAccountantReview.mockReturnValue({ isPending: false, mutateAsync: updateReview })
    ;(stepUpWithPasswordAction as jest.Mock).mockResolvedValue({ success: true })
    render(<CloseAssuranceCenter initialData={dashboardData()} locale={locale} />)
    const trigger = screen.getByRole("button", { name: actionName })
    const notes = screen.getByRole("textbox", { name: locale === "fr" ? "Notes de decision" : "Decision notes" })
    fireEvent.change(notes, { target: { value: "Retained review notes" } })
    trigger.focus()
    fireEvent.click(trigger)
    const password = await screen.findByLabelText(passwordLabel)
    expect(password).toHaveFocus()
    fireEvent.change(password, { target: { value: "synthetic-password" } })
    fireEvent.click(screen.getByRole("button", { name: verifyLabel }))
    expect(await screen.findByText(verified)).toHaveAttribute("role", "status")
    expect(stepUpWithPasswordAction).toHaveBeenCalledWith({ password: "synthetic-password" })
    expect(screen.queryByLabelText(passwordLabel)).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
    expect(notes).toHaveValue("Retained review notes")
    expect(updateReview).toHaveBeenCalledTimes(1)
    updateReview.mockResolvedValue({ id: "review-1" })
    fireEvent.click(trigger)
    await waitFor(() => expect(updateReview).toHaveBeenCalledTimes(2))
  })

  it.each(["INVALID_CREDENTIALS", "RATE_LIMITED", "NETWORK"])("clears the password and permits safe recovery after %s", async (code) => {
    const updateReview = jest.fn().mockRejectedValue(Object.assign(new Error("Fresh authentication required"), { code: "FRESH_AUTH_REQUIRED" }))
    mockUseUpdateAccountantReview.mockReturnValue({ isPending: false, mutateAsync: updateReview })
    if (code === "NETWORK") (stepUpWithPasswordAction as jest.Mock).mockRejectedValue(new Error("Connection lost"))
    else (stepUpWithPasswordAction as jest.Mock).mockResolvedValue({ success: false, code })
    render(<CloseAssuranceCenter initialData={dashboardData()} locale="en" />)
    fireEvent.click(screen.getByRole("button", { name: "Save review" }))
    const password = await screen.findByLabelText("Current password")
    fireEvent.change(password, { target: { value: "synthetic-password" } })
    fireEvent.click(screen.getByRole("button", { name: "Verify identity" }))
    await screen.findByText(code === "RATE_LIMITED" ? "Too many attempts. Wait before trying again." : "Identity could not be verified. Check your password and try again.")
    expect(password).toHaveValue("")
    expect(password).toHaveFocus()
    expect(updateReview).toHaveBeenCalledTimes(1)
  })

  it.each([
    ["en", "Export certified JSON", "Current password", "Verify identity", "Identity verified. Retry your selected action.", "Decision notes"],
    ["fr", "Exporter JSON certifie", "Mot de passe actuel", "Vérifier l’identité", "Identité vérifiée. Réessayez l’action choisie.", "Notes de decision"],
  ] as const)("returns %s certified-export focus once after permissions become ready without repeating the action", async (locale, actionName, passwordLabel, verifyLabel, verified, notesLabel) => {
    const data = dashboardData()
    data.run.status = "READY"
    data.currentProof = { checkedAt: data.source.asOf, grade: "operational", blockers: [] }
    data.controls.certificationAvailable = true
    setDashboardData(data)
    const exportPack = jest.fn().mockRejectedValue(Object.assign(new Error("Fresh authentication required"), { code: "FRESH_AUTH_REQUIRED" }))
    mockUseExportClosePack.mockReturnValue({ draft: { isPending: false, mutateAsync: jest.fn() }, certified: { isPending: false, mutateAsync: exportPack } })
    ;(stepUpWithPasswordAction as jest.Mock).mockResolvedValue({ success: true })
    const view = render(<CloseAssuranceCenter initialData={data} locale={locale} />)
    const trigger = screen.getByRole("button", { name: actionName })
    trigger.focus()
    fireEvent.click(trigger)
    const password = await screen.findByLabelText(passwordLabel)
    expect(password).toHaveFocus()
    ;(usePermissions as jest.Mock).mockReturnValue({ permissionState: "loading", hasPermission: () => false })
    view.rerender(<CloseAssuranceCenter initialData={data} locale={locale} />)
    fireEvent.change(password, { target: { value: "synthetic-password" } })
    fireEvent.click(screen.getByRole("button", { name: verifyLabel }))
    expect(await screen.findByText(verified)).toHaveAttribute("role", "status")
    expect(screen.queryByLabelText(passwordLabel)).not.toBeInTheDocument()
    expect(trigger).toBeDisabled()
    expect(trigger).not.toHaveFocus()
    expect(exportPack).toHaveBeenCalledTimes(1)
    ;(usePermissions as jest.Mock).mockReturnValue({ permissionState: "ready", hasPermission: () => true })
    view.rerender(<CloseAssuranceCenter initialData={data} locale={locale} />)
    await waitFor(() => expect(trigger).toHaveFocus())
    expect(trigger).toBeEnabled()
    const notes = screen.getByRole("textbox", { name: notesLabel })
    notes.focus()
    fireEvent.change(notes, { target: { value: "Preserved review draft" } })
    view.rerender(<CloseAssuranceCenter initialData={data} locale={locale} />)
    expect(notes).toHaveFocus()
    expect(notes).toHaveValue("Preserved review draft")
    expect(exportPack).toHaveBeenCalledTimes(1)
    exportPack.mockRejectedValue(new Error("Deliberate retry requires review"))
    trigger.focus()
    fireEvent.click(trigger)
    await waitFor(() => expect(exportPack).toHaveBeenCalledTimes(2))
  })

  it("does not steal an explicitly chosen focus while the authenticated action is still unavailable", async () => {
    const review = jest.fn().mockRejectedValue(Object.assign(new Error("Fresh authentication required"), { code: "FRESH_AUTH_REQUIRED" }))
    mockUseUpdateAccountantReview.mockReturnValue({ isPending: false, mutateAsync: review })
    ;(stepUpWithPasswordAction as jest.Mock).mockResolvedValue({ success: true })
    const data = dashboardData(), view = render(<CloseAssuranceCenter initialData={data} locale="en" />)
    const trigger = screen.getByRole("button", { name: "Save review" })
    trigger.focus()
    fireEvent.click(trigger)
    const password = await screen.findByLabelText("Current password")
    mockUseUpdateAccountantReview.mockReturnValue({ isPending: true, mutateAsync: review })
    view.rerender(<CloseAssuranceCenter initialData={data} locale="en" />)
    fireEvent.change(password, { target: { value: "synthetic-password" } })
    fireEvent.click(screen.getByRole("button", { name: "Verify identity" }))
    await screen.findByText("Identity verified. Retry your selected action.")
    expect(trigger).toBeDisabled()
    const other = screen.getByRole("button", { name: "Export draft JSON" })
    other.focus()
    mockUseUpdateAccountantReview.mockReturnValue({ isPending: false, mutateAsync: review })
    view.rerender(<CloseAssuranceCenter initialData={data} locale="en" />)
    expect(trigger).toBeEnabled()
    expect(other).toHaveFocus()
    expect(review).toHaveBeenCalledTimes(1)
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

  it.each([
    ["en", "Certification was refused. Review current close evidence and resolve the reported conditions. If evidence is missing, changed or unavailable, run a new assessment. Then a different authorized person can certify it."],
    ["fr", "Certification refusée. Examinez les preuves et corrigez les causes signalées. Si des preuves manquent, ont changé ou sont indisponibles, lancez une nouvelle évaluation. Une autre personne autorisée pourra certifier."],
  ] as const)("renders the actual %s export-hook guidance through the existing safe action banner", async (locale, expected) => {
    const actual = jest.requireActual<typeof import("@/hooks/accounting/useCloseAssurance")>("@/hooks/accounting/useCloseAssurance")
    mockUseExportClosePack.mockImplementation(actual.useExportClosePack)
    ;(exportCertifiedClosePackAction as jest.Mock).mockResolvedValue({
      success: false, data: null, code: "BUSINESS_RULE_VIOLATION",
      error: "Certified close pack is blocked: Inventory valuation annex evidence is stale.",
    })
    const data = dashboardData()
    data.run.status = "READY"
    data.currentProof = { checkedAt: data.source.asOf, grade: "operational", blockers: [] }
    data.controls.certificationAvailable = true
    setDashboardData(data)
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
    const view = render(<QueryClientProvider client={client}><CloseAssuranceCenter initialData={data} locale={locale} /></QueryClientProvider>)
    try {
      fireEvent.click(screen.getByRole("button", { name: locale === "fr" ? "Exporter JSON certifie" : "Export certified JSON" }))
      await waitFor(() => expect(screen.getByText(expected).closest('[role="alert"]')).toBeInTheDocument())
      expect(exportCertifiedClosePackAction).toHaveBeenCalledTimes(1)
      expect(screen.queryByText("Certified close pack is blocked: Inventory valuation annex evidence is stale.")).not.toBeInTheDocument()
    } finally {
      view.unmount()
      client.clear()
    }
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
