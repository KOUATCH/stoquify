jest.mock("@/services/_shared/protect", () => ({
  protect: jest.fn((options, handler) => {
    const store = globalThis as typeof globalThis & {
      __copilotProposalProtectOptions?: Array<Record<string, unknown>>
    }
    store.__copilotProposalProtectOptions =
      store.__copilotProposalProtectOptions ?? []
    store.__copilotProposalProtectOptions.push(options)
    return async (input: unknown) => ({
      success: true as const,
      data: await handler(input, {
        orgId: "org-session",
        userId: "user-session",
        permissions: ["dashboard.read"],
        roles: [{ code: "finance_manager" }],
      }),
      error: null,
      status: 200 as const,
    })
  }),
}))

jest.mock("@/services/ai/copilot-proposal-release.service", () => ({
  authorizeCopilotProposalRelease: jest.fn(),
}))

jest.mock("@/services/ai/copilot-proposal.service", () => ({
  createCopilotProposal: jest.fn(),
  decideCopilotProposal: jest.fn(),
  listCopilotProposals: jest.fn(),
}))

import {
  createCopilotProposal,
  decideCopilotProposal,
} from "@/services/ai/copilot-proposal.service"
import { authorizeCopilotProposalRelease } from "@/services/ai/copilot-proposal-release.service"

import {
  createCopilotProposalAction,
  decideCopilotProposalAction,
} from "../copilot-proposal.actions"

const mockCreate = createCopilotProposal as jest.Mock
const mockDecide = decideCopilotProposal as jest.Mock
const mockAuthorizeRelease = authorizeCopilotProposalRelease as jest.Mock

describe("copilot proposal actions", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAuthorizeRelease.mockResolvedValue({
      packageId: "proposal-release-1",
      executionAuthority: "NONE",
    })
  })

  it("requires fresh authentication and derives tenant scope from the session", async () => {
    const store = globalThis as typeof globalThis & {
      __copilotProposalProtectOptions?: Array<Record<string, unknown>>
    }
    expect(store.__copilotProposalProtectOptions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          permission: "dashboard.read",
          freshAuth: { maxAgeSeconds: 600 },
          tenantGuard: "handler-derived",
        }),
      ]),
    )

    mockCreate.mockResolvedValue({ id: "proposal-1" })
    const result = await createCopilotProposalAction({
      runId: "cm00000000000000000000001",
      proposalType: "NAVIGATE_TO_WORKFLOW",
      targetRoute: "/dashboard/manager-action-center",
      requiredPermission: "dashboard.read",
      title: "Review exception",
      detail: "Review cited exception evidence.",
      evidence: [
        {
          id: "evidence-1",
          subjectType: "daily-habit.digest",
          subjectId: "org-session:digest:period",
          sourceModule: "dashboard",
          sourceHash: "sha256:source",
          evidenceGrade: "operational",
          freshness: "fresh",
          available: true,
        },
      ],
      periodStart: "2026-07-27T00:00:00.000Z",
      periodEnd: "2026-07-27T23:59:59.999Z",
      asOf: "2026-07-27T12:00:00.000Z",
      expiresAt: "2026-07-28T12:00:00.000Z",
      idempotencyKey: "proposal:run-1:risk-1",
    })

    expect(mockCreate).toHaveBeenCalledWith(
      "org-session",
      "user-session",
      ["dashboard.read"],
      expect.objectContaining({ targetRoute: "/dashboard/manager-action-center" }),
    )
    expect(mockAuthorizeRelease).toHaveBeenCalledWith({
      organizationId: "org-session",
      roleCodes: ["finance_manager"],
    })
    expect(result).toMatchObject({
      success: true,
      ok: true,
      data: { id: "proposal-1" },
    })
  })

  it("derives the decision actor and tenant instead of trusting input scope", async () => {
    mockDecide.mockResolvedValue({ id: "proposal-1", status: "REJECTED" })

    const result = await decideCopilotProposalAction({
      proposalId: "cm00000000000000000000002",
      decision: "REJECTED",
      reason: "Rejected after human review.",
    })

    expect(mockDecide).toHaveBeenCalledWith(
      "org-session",
      "user-session",
      ["dashboard.read"],
      expect.objectContaining({
        proposalId: "cm00000000000000000000002",
        decision: "REJECTED",
      }),
    )
    expect(result).toMatchObject({
      success: true,
      ok: true,
      data: { id: "proposal-1", status: "REJECTED" },
    })
  })

  it("fails closed before persistence without a governed Phase 3 release", async () => {
    mockAuthorizeRelease.mockRejectedValueOnce(
      new Error("governed Phase 3 release is unavailable"),
    )

    await expect(
      createCopilotProposalAction({
        runId: "cm00000000000000000000001",
      }),
    ).rejects.toThrow("governed Phase 3 release")

    expect(mockCreate).not.toHaveBeenCalled()
  })
})
