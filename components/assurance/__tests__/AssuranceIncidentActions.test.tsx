import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"

jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: jest.fn() }),
}))

const mockNotifications = {
  success: jest.fn(),
  error: jest.fn(),
}

jest.mock("lucide-react", () => ({
  CheckCircle2: () => <span aria-hidden="true" />,
  Clock3: () => <span aria-hidden="true" />,
  FileCheck2: () => <span aria-hidden="true" />,
  RotateCcw: () => <span aria-hidden="true" />,
  ShieldAlert: () => <span aria-hidden="true" />,
  UserRoundCheck: () => <span aria-hidden="true" />,
}))

jest.mock("@/components/notifications/NotificationProvider", () => ({
  useNotifications: () => mockNotifications,
}))

jest.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}))

jest.mock("@/actions/assurance/workflow-assurance-incident.actions", () => ({
  acknowledgeWorkflowAssuranceIncidentAction: jest.fn(),
  approveWorkflowAssuranceWaiverAction: jest.fn(),
  assignWorkflowAssuranceIncidentAction: jest.fn(),
  reopenWorkflowAssuranceIncidentAction: jest.fn(),
  requestWorkflowAssuranceWaiverAction: jest.fn(),
  resolveWorkflowAssuranceIncidentAction: jest.fn(),
  suppressWorkflowAssuranceIncidentAction: jest.fn(),
}))

jest.mock("@/actions/assurance/pos-cash-shortage-resolution.actions", () => ({
  resolvePosCashShortageIncidentAction: jest.fn(),
}))

import { resolvePosCashShortageIncidentAction } from "@/actions/assurance/pos-cash-shortage-resolution.actions"
import { assignWorkflowAssuranceIncidentAction, resolveWorkflowAssuranceIncidentAction } from "@/actions/assurance/workflow-assurance-incident.actions"

import { AssuranceIncidentActions } from "../AssuranceIncidentActions"

const mockResolveGeneric = resolveWorkflowAssuranceIncidentAction as jest.Mock
const mockResolvePosCashShortage = resolvePosCashShortageIncidentAction as jest.Mock

describe("AssuranceIncidentActions", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockResolveGeneric.mockResolvedValue({ success: true, data: { id: "incident-1" }, error: null, status: 200 })
    mockResolvePosCashShortage.mockResolvedValue({ success: true, data: { id: "incident-1" }, error: null, status: 200 })
  })

  it("routes POS cash-shortage resolution through the protected POS-specific action", async () => {
    render(<AssuranceIncidentActions incident={incident()} waivers={[]} locale="en" />)

    fireEvent.click(screen.getByRole("button", { name: "Resolve" }))
    fireEvent.click(screen.getByRole("button", { name: "Apply action" }))

    await waitFor(() => {
      expect(mockResolvePosCashShortage).toHaveBeenCalledWith({
        incidentId: "incident-1",
        currentSourceHash: "source-hash-current",
        resolutionNote: "Resolved from Workflow Assurance Control Tower.",
        resolutionEvidenceHash: "source-hash-current",
      })
    })
    expect(mockResolveGeneric).not.toHaveBeenCalled()
  })

  it("keeps generic incidents on the generic Workflow Assurance resolve action", async () => {
    render(
      <AssuranceIncidentActions
        incident={incident({ checkKey: "ledger.close_exception.review", workflow: "ledger" })}
        waivers={[]}
        locale="en"
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: "Resolve" }))
    fireEvent.click(screen.getByRole("button", { name: "Apply action" }))

    await waitFor(() => {
      expect(mockResolveGeneric).toHaveBeenCalledWith({
        incidentId: "incident-1",
        note: "Resolved from Workflow Assurance Control Tower.",
        currentSourceHash: "source-hash-current",
      })
    })
    expect(mockResolvePosCashShortage).not.toHaveBeenCalled()
  })
})

function incident(overrides: Record<string, unknown> = {}) {
  return {
    id: "incident-1",
    assignmentRevision: "a".repeat(64),
    checkKey: "pos.closed_shift_cash_shortage.review",
    workflow: "pos",
    moduleSlug: "pos",
    sourceType: "POSSession",
    sourceId: "session-1",
    sourceHash: "source-hash-current",
    sourceLabel: "POS cash drawer close event",
    sourceRoute: "/dashboard/pos",
    detailRoute: "/dashboard/assurance/incidents/incident-1",
    title: "Cash shortage requiring review",
    detail: "Cash shortage meets the approved threshold.",
    status: "open",
    severity: "high",
    evidenceGrade: "blocked",
    actionRoute: "/dashboard/manager-action-center",
    ownerId: null,
    ownerRole: "branch_manager",
    assignedRole: "branch_manager",
    dueAt: null,
    canManage: true,
    redactions: [],
    blockers: [],
    moduleSlugNormalized: "pos",
    requiredPermission: "pos.transactions.read",
    actionLabel: "Review",
    ...overrides,
  } as never
}


describe("Phase 5 assignment recovery", () => {
  const assign = jest.mocked(assignWorkflowAssuranceIncidentAction)
  beforeEach(() => {
    jest.clearAllMocks()
    Object.defineProperty(crypto, "randomUUID", {configurable: true, value: jest.fn(() => "11111111-1111-4111-8111-111111111111")})
  })
  it.each(["en", "fr"] as const)("retains the same request after an uncertain failure and does not claim completion (%s)", async locale => {
    assign.mockRejectedValueOnce(new Error("private transport details")).mockResolvedValueOnce({success: true, data: {id: "incident-1"}, error: null, status: 200} as never)
    render(<AssuranceIncidentActions incident={incident()} waivers={[]} locale={locale} />)
    fireEvent.click(screen.getByRole("button", {name: locale === "en" ? "Assign" : "Assigner", exact: true}))
    fireEvent.change(screen.getByLabelText(locale === "en" ? "Owner user ID" : "ID utilisateur responsable"), {target: {value: "owner-1"}})
    const submit = screen.getByRole("button", {name: locale === "en" ? "Apply action" : "Appliquer"})
    fireEvent.click(submit)
    expect(await screen.findByRole("alert")).not.toHaveTextContent("private transport details")
    expect(screen.getByRole("button", {name: locale === "en" ? "Refresh source" : "Actualiser la source"})).toBeVisible()
    expect(screen.getByLabelText(locale === "en" ? "Owner user ID" : "ID utilisateur responsable")).toBeDisabled()
    fireEvent.click(submit)
    await waitFor(() => expect(assign).toHaveBeenCalledTimes(2))
    expect(assign.mock.calls[0][0]).toEqual(assign.mock.calls[1][0])
    expect(assign.mock.calls[0][0]).toMatchObject({expectedRevision: "a".repeat(64), requestId: expect.any(String), ownerId: "owner-1"})
    expect(assign.mock.calls[0][0]).not.toHaveProperty("assignedRole")
    await waitFor(() => expect(mockNotifications.success).toHaveBeenCalledWith(expect.any(String), expect.stringMatching(locale === "en" ? /business work remains/ : /travail métier reste/), expect.anything()))
  })
  it.each([401,403,409])("requires source refresh after refusal %i and retains source context", async status => {
    assign.mockResolvedValueOnce({success:false,status,error:"private details"} as never)
    render(<AssuranceIncidentActions incident={incident()} waivers={[]} locale="en" />)
    fireEvent.click(screen.getByRole("button", {name: "Assign", exact:true}))
    fireEvent.change(screen.getByLabelText("Owner user ID"), {target: {value: "owner-1"}})
    fireEvent.click(screen.getByRole("button", {name:"Apply action"}))
    await screen.findByRole("alert")
    expect(screen.getByRole("button", {name:"Apply action"})).toBeDisabled()
    expect(screen.getByLabelText("Owner user ID")).toHaveValue("owner-1")
    expect(mockNotifications.success).not.toHaveBeenCalled()
  })
  it("disables stale payloads without an assignment revision", () => {
    render(<AssuranceIncidentActions incident={incident({assignmentRevision: undefined})} waivers={[]} locale="en" />)
    expect(screen.getByRole("button", {name:"Assign",exact:true})).toBeDisabled()
    expect(screen.getByRole("status")).toHaveTextContent("Refresh this source view")
  })
  it("clears pending form state on revoked/replaced authority and ignores its late response", async () => {
    let finish!: (value: any) => void
    assign.mockImplementationOnce(() => new Promise(resolve => {finish=resolve}))
    const view=render(<AssuranceIncidentActions incident={incident()} waivers={[]} locale="en" />)
    fireEvent.click(screen.getByRole("button", {name:"Assign",exact:true}))
    fireEvent.change(screen.getByLabelText("Owner user ID"),{target:{value:"owner-1"}})
    fireEvent.click(screen.getByRole("button",{name:"Apply action"}))
    fireEvent.click(screen.getByRole("button",{name:"Apply action"}))
    expect(assign).toHaveBeenCalledTimes(1)
    view.rerender(<AssuranceIncidentActions incident={incident({canManage:false,assignmentRevision:"b".repeat(64)})} waivers={[]} locale="en" />)
    expect(screen.queryByLabelText("Owner user ID")).not.toBeInTheDocument()
    await act(async()=>finish({success:true,data:{id:"incident-1"},error:null,status:200}))
    expect(mockNotifications.success).not.toHaveBeenCalled()
  })
})
