jest.mock("@/services/_shared/protect", () => ({
  protect: jest.fn((options, handler) => {
    const store = globalThis as typeof globalThis & {
      __workflowAssuranceIncidentProtectOptions?: Array<Record<string, unknown>>
    }
    store.__workflowAssuranceIncidentProtectOptions = store.__workflowAssuranceIncidentProtectOptions ?? []
    store.__workflowAssuranceIncidentProtectOptions.push(options)

    return async (input: unknown) => {
      const data = await handler(input, {
        orgId: "org-session",
        userId: "user-session",
        permissions: ["controls.manage", "controls.audit.read"],
        isSuperUser: false,
      })

      return { success: true, data, error: null, status: 200 }
    }
  }),
}))

jest.mock("@/services/assurance/assurance-incident.service", () => ({
  acknowledgeWorkflowAssuranceIncident: jest.fn(),
  approveWorkflowAssuranceWaiver: jest.fn(),
  assignWorkflowAssuranceIncident: jest.fn(),
  reopenWorkflowAssuranceIncident: jest.fn(),
  requestWorkflowAssuranceWaiver: jest.fn(),
  resolveWorkflowAssuranceIncident: jest.fn(),
  suppressWorkflowAssuranceIncident: jest.fn(),
}))

import {
  acknowledgeWorkflowAssuranceIncident,
  approveWorkflowAssuranceWaiver,
  assignWorkflowAssuranceIncident,
  reopenWorkflowAssuranceIncident,
  requestWorkflowAssuranceWaiver,
  resolveWorkflowAssuranceIncident,
  suppressWorkflowAssuranceIncident,
} from "@/services/assurance/assurance-incident.service"

import {
  acknowledgeWorkflowAssuranceIncidentAction,
  approveWorkflowAssuranceWaiverAction,
  assignWorkflowAssuranceIncidentAction,
  reopenWorkflowAssuranceIncidentAction,
  requestWorkflowAssuranceWaiverAction,
  resolveWorkflowAssuranceIncidentAction,
  suppressWorkflowAssuranceIncidentAction,
} from "../workflow-assurance-incident.actions"

const mockAcknowledge = acknowledgeWorkflowAssuranceIncident as jest.Mock
const mockAssign = assignWorkflowAssuranceIncident as jest.Mock
const mockReopen = reopenWorkflowAssuranceIncident as jest.Mock
const mockResolve = resolveWorkflowAssuranceIncident as jest.Mock
const mockSuppress = suppressWorkflowAssuranceIncident as jest.Mock
const mockRequestWaiver = requestWorkflowAssuranceWaiver as jest.Mock
const mockApproveWaiver = approveWorkflowAssuranceWaiver as jest.Mock

describe("workflow assurance incident actions", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAcknowledge.mockResolvedValue({ id: "incident-1", status: "acknowledged" })
    mockAssign.mockResolvedValue({ id: "incident-1", status: "assigned" })
    mockReopen.mockResolvedValue({ id: "incident-1", status: "reopened" })
    mockResolve.mockResolvedValue({ id: "incident-1", status: "resolved" })
    mockSuppress.mockResolvedValue({ id: "incident-1", status: "suppressed" })
    mockRequestWaiver.mockResolvedValue({ id: "waiver-1", status: "requested" })
    mockApproveWaiver.mockResolvedValue({ id: "waiver-1", status: "approved" })
  })

  it("derives tenant and actor context for incident transitions", async () => {
    const result = await assignWorkflowAssuranceIncidentAction({
      organizationId: "attacker-org",
      incidentId: "incident-1",
      ownerId: "owner-1",
      assignedRole: "accountant",
      dueAt: "2026-07-01T00:00:00.000Z",
    } as never)

    expect(result.success).toBe(true)
    expect(mockAssign).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-session",
        actorId: "user-session",
        incidentId: "incident-1",
        ownerId: "owner-1",
        assignedRole: "accountant",
        dueAt: new Date("2026-07-01T00:00:00.000Z"),
      }),
    )
    expect(mockAssign.mock.calls[0][0]).not.toHaveProperty("organizationId", "attacker-org")
  })

  it("registers write and fresh-auth controls for risky incident actions", async () => {
    await acknowledgeWorkflowAssuranceIncidentAction({ incidentId: "incident-1" })
    await resolveWorkflowAssuranceIncidentAction({ incidentId: "incident-1", note: "Fixed source evidence." })
    await suppressWorkflowAssuranceIncidentAction({
      incidentId: "incident-1",
      reason: "Accepted during provider outage.",
    })
    await requestWorkflowAssuranceWaiverAction({
      incidentId: "incident-1",
      reason: "External accountant supplied evidence.",
      evidenceHash: "sha256-waiver-proof",
      expiresAt: "2026-07-01T00:00:00.000Z",
    })
    await approveWorkflowAssuranceWaiverAction({ waiverId: "waiver-1", note: "Approved by finance lead." })
    await reopenWorkflowAssuranceIncidentAction({ incidentId: "incident-1", note: "Reopened after new source evidence." })

    const store = globalThis as typeof globalThis & {
      __workflowAssuranceIncidentProtectOptions?: Array<Record<string, unknown>>
    }
    expect(store.__workflowAssuranceIncidentProtectOptions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          permission: "controls.audit.read",
          auditResource: "WorkflowAssuranceIncident",
          tenantGuard: "handler-derived",
        }),
        expect.objectContaining({
          permission: "controls.manage",
          auditResource: "WorkflowAssuranceIncident",
          freshAuth: { maxAgeSeconds: 300 },
          tenantGuard: "handler-derived",
        }),
        expect.objectContaining({
          permission: "controls.manage",
          auditResource: "WorkflowAssuranceWaiver",
          freshAuth: { maxAgeSeconds: 300 },
          tenantGuard: "handler-derived",
        }),
      ]),
    )
  })
})
