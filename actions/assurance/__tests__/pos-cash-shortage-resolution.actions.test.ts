import fs from "fs"
import path from "path"

jest.mock("@/services/_shared/protect", () => ({
  protect: jest.fn((options, handler) => {
    const store = globalThis as typeof globalThis & {
      __posCashShortageResolutionProtectOptions?: Array<Record<string, unknown>>
    }
    store.__posCashShortageResolutionProtectOptions =
      store.__posCashShortageResolutionProtectOptions ?? []
    store.__posCashShortageResolutionProtectOptions.push(options)

    return async (input: unknown) => {
      const data = await handler(input, {
        orgId: "org-session",
        userId: "manager-session",
        permissions: ["controls.manage", "pos.transactions.read"],
        isSuperUser: false,
      })

      return { success: true, data, error: null, status: 200 }
    }
  }),
}))

jest.mock("@/services/assurance/assurance-control-tower.service", () => ({
  getAssuranceIncidentDetailData: jest.fn(),
}))

jest.mock("@/services/leakage/pos-cash-shortage-resolution-source-loader", () => ({
  loadPosCashShortageResolutionSourceForIncident: jest.fn(),
}))

jest.mock("@/services/leakage/pos-cash-shortage-resolution-command", () => ({
  executePosCashShortageResolutionCommand: jest.fn(),
}))

import { getAssuranceIncidentDetailData } from "@/services/assurance/assurance-control-tower.service"
import { executePosCashShortageResolutionCommand } from "@/services/leakage/pos-cash-shortage-resolution-command"
import { loadPosCashShortageResolutionSourceForIncident } from "@/services/leakage/pos-cash-shortage-resolution-source-loader"

import { resolvePosCashShortageIncidentAction } from "../pos-cash-shortage-resolution.actions"

const ROOT = process.cwd()
const mockGetIncidentDetail = getAssuranceIncidentDetailData as jest.Mock
const mockLoadSource = loadPosCashShortageResolutionSourceForIncident as jest.Mock
const mockExecuteCommand = executePosCashShortageResolutionCommand as jest.Mock

describe("POS cash-shortage protected resolution action", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetIncidentDetail.mockResolvedValue({ incident: incident() })
    mockLoadSource.mockResolvedValue({ sourceRecheckInput: { serverOwned: true } })
    mockExecuteCommand.mockResolvedValue({
      status: "executed",
      productSurfaceActivationAuthorized: false,
      incident: incident({ status: "resolved" }),
    })
  })

  it("derives tenant, actor, permissions, incident, and source evidence server-side", async () => {
    const result = await resolvePosCashShortageIncidentAction({
      incidentId: "incident-1",
      currentSourceHash: "source-hash-current",
      resolutionNote: "Manager reviewed the shortage evidence.",
      resolutionEvidenceHash: "resolution-evidence-hash",
    })

    expect(result.success).toBe(true)
    expect(mockGetIncidentDetail).toHaveBeenCalledWith({
      organizationId: "org-session",
      actorPermissions: ["controls.manage", "pos.transactions.read"],
      incidentId: "incident-1",
    })
    expect(mockLoadSource).toHaveBeenCalledWith({
      incident: incident(),
      currentSourceHash: "source-hash-current",
    })
    expect(mockExecuteCommand).toHaveBeenCalledWith({
      incident: incident(),
      actorId: "manager-session",
      actorPermissions: ["controls.manage", "pos.transactions.read"],
      sourceRecheckInput: { serverOwned: true },
      resolutionNote: "Manager reviewed the shortage evidence.",
      resolutionEvidenceHash: "resolution-evidence-hash",
    })
    expect(mockExecuteCommand.mock.calls[0][0]).not.toHaveProperty("organizationId")
    expect(result.data.productSurfaceActivationAuthorized).toBe(false)
  })

  it("rejects client-supplied tenant, actor, permissions, and source evidence fields", async () => {
    await expect(
      resolvePosCashShortageIncidentAction({
        organizationId: "attacker-org",
        actorId: "attacker-user",
        actorPermissions: ["*"],
        sourceRecheckInput: { clientOwned: true },
        incidentId: "incident-1",
        currentSourceHash: "source-hash-current",
        resolutionNote: "Manager reviewed the shortage evidence.",
        resolutionEvidenceHash: "resolution-evidence-hash",
      } as never),
    ).rejects.toThrow()

    expect(mockGetIncidentDetail).not.toHaveBeenCalled()
    expect(mockLoadSource).not.toHaveBeenCalled()
    expect(mockExecuteCommand).not.toHaveBeenCalled()
  })
  it("registers controls.manage, fresh-auth, audit, and handler-derived tenant protection", async () => {
    await resolvePosCashShortageIncidentAction({
      incidentId: "incident-1",
      currentSourceHash: "source-hash-current",
      resolutionNote: "Manager reviewed the shortage evidence.",
      resolutionEvidenceHash: "resolution-evidence-hash",
    })

    const store = globalThis as typeof globalThis & {
      __posCashShortageResolutionProtectOptions?: Array<Record<string, unknown>>
    }
    expect(store.__posCashShortageResolutionProtectOptions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
        permission: "controls.manage",
        auditResource: "WorkflowAssuranceIncident",
        auditAllowed: true,
        freshAuth: { maxAgeSeconds: 300 },
        tenantGuard: "handler-derived",
        }),
      ]),
    )
  })

  it("does not load source evidence or execute the command when incident detail is unavailable", async () => {
    mockGetIncidentDetail.mockResolvedValue(null)

    await expect(
      resolvePosCashShortageIncidentAction({
        incidentId: "incident-1",
        currentSourceHash: "source-hash-current",
        resolutionNote: "Manager reviewed the shortage evidence.",
        resolutionEvidenceHash: "resolution-evidence-hash",
      }),
    ).rejects.toThrow(/incident not found/i)

    expect(mockLoadSource).not.toHaveBeenCalled()
    expect(mockExecuteCommand).not.toHaveBeenCalled()
  })

  it("does not add UI callers, workers, schedulers, detector activation, AI, or WhatsApp authority", () => {
    const source = fs.readFileSync(
      path.join(ROOT, "actions/assurance/pos-cash-shortage-resolution.actions.ts"),
      "utf8",
    )

    expect(source).not.toMatch(/CHECK_RUNNERS|scheduleWorkflow|cron|router/i)
    expect(source).not.toMatch(/runDormantPosShiftCashShortage|loadPosShiftCashShortageBatch/i)
    expect(source).not.toMatch(/sendAlert|dispatchAlert|whatsApp|copilot/i)
  })
})

function incident(overrides: Record<string, unknown> = {}) {
  return {
    id: "incident-1",
    organizationId: "org-session",
    checkKey: "pos.closed_shift_cash_shortage.review",
    workflow: "pos",
    moduleSlug: "pos",
    sourceType: "POSSession",
    sourceId: "session-1",
    sourceHash: "source-hash-current",
    status: "open",
    ...overrides,
  }
}
