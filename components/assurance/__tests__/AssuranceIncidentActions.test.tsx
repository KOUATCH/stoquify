import { fireEvent, render, screen, waitFor } from "@testing-library/react"

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
import { resolveWorkflowAssuranceIncidentAction } from "@/actions/assurance/workflow-assurance-incident.actions"

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
