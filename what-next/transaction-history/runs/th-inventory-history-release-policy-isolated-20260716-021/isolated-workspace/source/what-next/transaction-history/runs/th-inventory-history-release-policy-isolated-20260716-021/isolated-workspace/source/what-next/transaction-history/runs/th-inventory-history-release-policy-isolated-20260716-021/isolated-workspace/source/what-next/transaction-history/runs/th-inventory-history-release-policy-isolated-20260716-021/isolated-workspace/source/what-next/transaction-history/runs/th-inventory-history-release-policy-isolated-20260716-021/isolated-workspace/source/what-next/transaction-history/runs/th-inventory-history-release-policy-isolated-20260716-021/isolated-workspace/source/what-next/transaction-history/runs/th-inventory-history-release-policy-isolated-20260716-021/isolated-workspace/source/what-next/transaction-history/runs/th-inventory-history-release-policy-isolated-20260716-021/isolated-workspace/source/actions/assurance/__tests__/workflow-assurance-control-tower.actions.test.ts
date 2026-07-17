jest.mock("@/services/_shared/protect", () => ({
  protect: jest.fn((options, handler) => {
    const store = globalThis as typeof globalThis & {
      __workflowAssuranceControlTowerProtectOptions?: Array<Record<string, unknown>>
    }
    store.__workflowAssuranceControlTowerProtectOptions = store.__workflowAssuranceControlTowerProtectOptions ?? []
    store.__workflowAssuranceControlTowerProtectOptions.push(options)

    return async (input: unknown) => {
      const data = await handler(input, {
        orgId: "org-session",
        userId: "user-session",
        permissions: ["controls.audit.read", "accounting.audit.read"],
        isSuperUser: false,
      })

      return { success: true, data, error: null, status: 200 }
    }
  }),
}))

jest.mock("@/services/assurance/assurance-control-tower.service", () => ({
  getAssuranceControlTowerData: jest.fn(),
  getAssuranceIncidentDetailData: jest.fn(),
}))

import {
  getAssuranceControlTowerData,
  getAssuranceIncidentDetailData,
} from "@/services/assurance/assurance-control-tower.service"

import {
  getWorkflowAssuranceControlTowerAction,
  getWorkflowAssuranceIncidentDetailAction,
} from "../workflow-assurance-control-tower.actions"

const mockGetControlTower = getAssuranceControlTowerData as jest.Mock
const mockGetIncidentDetail = getAssuranceIncidentDetailData as jest.Mock

describe("workflow assurance control tower actions", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetControlTower.mockResolvedValue({ organizationId: "org-session", incidents: [] })
    mockGetIncidentDetail.mockResolvedValue({ organizationId: "org-session", incident: { id: "incident-1" } })
  })

  it("derives tenant and actor permissions for the control tower read model", async () => {
    const result = await getWorkflowAssuranceControlTowerAction({ organizationId: "attacker-org", limit: 20 })

    expect(result.success).toBe(true)
    expect(mockGetControlTower).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-session",
        actorPermissions: ["controls.audit.read", "accounting.audit.read"],
        limit: 20,
      }),
    )
    expect(mockGetControlTower.mock.calls[0][0]).not.toHaveProperty("organizationId", "attacker-org")
  })

  it("protects incident detail behind controls.audit.read", async () => {
    await getWorkflowAssuranceIncidentDetailAction({ incidentId: "incident-1" })

    expect(mockGetIncidentDetail).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-session",
        incidentId: "incident-1",
        actorPermissions: ["controls.audit.read", "accounting.audit.read"],
      }),
    )
    const store = globalThis as typeof globalThis & {
      __workflowAssuranceControlTowerProtectOptions?: Array<Record<string, unknown>>
    }
    expect(store.__workflowAssuranceControlTowerProtectOptions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          permission: "controls.audit.read",
          auditResource: "WorkflowAssuranceControlTower",
          auditAllowed: true,
          tenantGuard: "handler-derived",
        }),
        expect.objectContaining({
          permission: "controls.audit.read",
          auditResource: "WorkflowAssuranceIncident",
          auditAllowed: true,
          tenantGuard: "handler-derived",
        }),
      ]),
    )
  })
})
