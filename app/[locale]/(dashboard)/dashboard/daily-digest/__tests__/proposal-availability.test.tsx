jest.mock("@/components/daily-habit/DailyHabitDigestDashboard", () => ({ DailyHabitDigestDashboard: () => null }))
jest.mock("@/services/daily-habit/daily-habit-digest.service", () => ({ getDailyHabitDigestData: jest.fn().mockResolvedValue({}) }))
jest.mock("@/services/agents/agent-rollout.service", () => ({ resolveCommandAgentRollout: jest.fn() }))
jest.mock("@/services/ai/copilot-proposal-release.service", () => ({ isCopilotProposalReleaseAvailable: jest.fn() }))
jest.mock("../daily-digest-route-access", () => ({
  routeByKey: () => ({}),
  withDailyDigestSurfaceAccess: ({ onAllowed }: { onAllowed: (context: unknown, locale: string) => unknown }) => onAllowed({
    orgId: "org-session", userId: "user-session", permissions: ["dashboard.read"], roles: [{ code: "finance_manager" }],
  }, "fr"),
}))

import { resolveCommandAgentRollout } from "@/services/agents/agent-rollout.service"
import { getDailyHabitDigestData } from "@/services/daily-habit/daily-habit-digest.service"
import { isCopilotProposalReleaseAvailable } from "@/services/ai/copilot-proposal-release.service"
import Page from "../page"
import type { ReactElement } from "react"

describe("daily digest proposal availability", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(resolveCommandAgentRollout as jest.Mock).mockReturnValue({ canRun: true, canRender: true })
  })
  it.each([true, false])("passes current server-governed availability (%s)", async (available) => {
    ;(isCopilotProposalReleaseAvailable as jest.Mock).mockResolvedValue(available)
    const node = await Page({ params: Promise.resolve({ locale: "fr" }) })
    expect(getDailyHabitDigestData).toHaveBeenCalledWith(expect.objectContaining({ operatingAccessContext: expect.objectContaining({ orgId: "org-session", userId: "user-session", permissions: ["dashboard.read"], roles: [{ code: "finance_manager" }] }) }))
    expect(isCopilotProposalReleaseAvailable).toHaveBeenCalledWith({ organizationId: "org-session", roleCodes: ["finance_manager"] })
    expect((node as ReactElement).props).toMatchObject({ locale: "fr", proposalDraftsEnabled: available })
  })
  it("does not check or expose proposals when command output is hidden", async () => {
    ;(resolveCommandAgentRollout as jest.Mock).mockReturnValue({ canRun: true, canRender: false })
    const node = await Page({ params: Promise.resolve({ locale: "en" }) })
    expect((node as ReactElement<{ proposalDraftsEnabled: boolean }>).props.proposalDraftsEnabled).toBe(false)
    expect(isCopilotProposalReleaseAvailable).not.toHaveBeenCalled()
  })
  it("does not turn a failed availability query into a successful denial result", async () => {
    ;(isCopilotProposalReleaseAvailable as jest.Mock).mockRejectedValueOnce(new Error("availability query failed"))
    await expect(Page({ params: Promise.resolve({ locale: "en" }) })).rejects.toThrow("availability query failed")
  })
})
