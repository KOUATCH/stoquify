import type { SVGProps } from "react"
import { fireEvent, render, screen } from "@testing-library/react"

jest.mock("lucide-react", () => {
  const createIcon = (name: string) => {
    const Icon = (props: SVGProps<SVGSVGElement>) => <svg data-testid={`icon-${name}`} {...props} />
    return Icon
  }
  return new Proxy({ __esModule: true }, {
    get(target, prop: string) {
      if (prop in target) return target[prop as keyof typeof target]
      return createIcon(prop)
    },
  })
})

jest.mock("@/actions/agents/command-agent.actions", () => ({
  runCommandAgentAction: jest.fn(),
  submitCommandAgentFeedbackAction: jest.fn(),
}))

jest.mock("@/actions/ai/copilot-proposal.actions", () => ({
  createCopilotProposalAction: jest.fn(),
  decideCopilotProposalAction: jest.fn(),
}))

import { AgentCommandPanel } from "../AgentCommandPanel"

const actions = jest.requireMock("@/actions/agents/command-agent.actions") as {
  runCommandAgentAction: jest.Mock
  submitCommandAgentFeedbackAction: jest.Mock
}

describe("AgentCommandPanel", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    Object.defineProperty(globalThis.crypto, "randomUUID", {
      configurable: true,
      value: () => "00000000-0000-4000-8000-000000000001",
    })
  })

  it("renders the fail-closed disabled state without invoking an action", () => {
    render(
      <AgentCommandPanel
        access={{ mode: "off", canRun: false, canRender: false, reason: "disabled" }}
        digestId="manager-run-sheet"
        periodStart="2026-07-22T00:00:00.000Z"
        periodEnd="2026-07-22T23:59:59.999Z"
        locale="en"
      />,
    )

    expect(screen.getByText("Command Agent is disabled for this organization.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Generate brief" })).toBeDisabled()
    expect(actions.runCommandAgentAction).not.toHaveBeenCalled()
  })

  it("renders evidence-cited priorities and bounded feedback controls", async () => {
    actions.runCommandAgentAction.mockResolvedValue({
      success: true,
      data: {
        access: { mode: "internal", canRun: true, canRender: true, reason: "available" },
        receipt: {
          runId: "cm00000000000000000000001",
          correlationId: "00000000-0000-4000-8000-000000000001",
          status: "completed",
          completedStepCount: 2,
          evidenceLinkCount: 1,
          safeSummary: "One priority is ready.",
          failureCode: null,
        },
        skill: { key: "role-daily-brief", version: 1, promptHash: "sha256:test" },
        brief: {
          kind: "stoquify.command-agent.daily-brief.v1",
          digestId: "manager-run-sheet",
          audienceRole: "manager",
          title: "Manager run sheet",
          summary: "Trusted priorities.",
          conclusion: "One item needs review.",
          generatedAt: "2026-07-22T12:00:00.000Z",
          periodStart: "2026-07-22T00:00:00.000Z",
          periodEnd: "2026-07-22T23:59:59.999Z",
          state: "ready",
          evidenceGrade: "operational",
          freshness: "fresh",
          priorities: [{
            id: "risk-1",
            title: "Review receiving queue",
            detail: "One permitted item needs review.",
            severity: "high",
            href: "/dashboard/manager-action-center",
            requiredPermission: "dashboard.read",
            evidenceIds: ["evidence-1"],
          }],
          evidence: [{
            id: "evidence-1",
            subjectType: "daily-habit.digest",
            subjectId: "org-1:manager-run-sheet",
            sourceModule: "dashboard",
            sourceHash: null,
            evidenceGrade: "operational",
            freshness: "fresh",
            available: true,
            blockerCount: 0,
            redactionCount: 1,
          }],
          limitations: [],
          redactionNotices: [],
          provenance: {
            tenantId: "org-1",
            tenantName: "Tenant One",
            periodStart: "2026-07-22T00:00:00.000Z",
            periodEnd: "2026-07-22T23:59:59.999Z",
            asOf: "2026-07-22T12:00:00.000Z",
            sourceCount: 1,
          },
          runId: "cm00000000000000000000001",
        },
      },
    })
    actions.submitCommandAgentFeedbackAction.mockResolvedValue({
      success: true,
      data: { feedbackId: "feedback-1", recordedAt: "2026-07-22T12:01:00.000Z" },
    })

    render(
      <AgentCommandPanel
        access={{ mode: "internal", canRun: true, canRender: true, reason: "available" }}
        digestId="manager-run-sheet"
        periodStart="2026-07-22T00:00:00.000Z"
        periodEnd="2026-07-22T23:59:59.999Z"
        locale="en"
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: "Generate brief" }))
    expect(await screen.findByRole("heading", { name: "Manager run sheet" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Open source" })).toHaveAttribute(
      "href",
      "/dashboard/manager-action-center",
    )
    expect(
      screen.queryByRole("button", { name: /prepare proposal/i }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Unsafe" })).toBeInTheDocument()
    expect(actions.runCommandAgentAction).toHaveBeenCalledWith(expect.objectContaining({
      digestId: "manager-run-sheet",
      requestId: "00000000-0000-4000-8000-000000000001",
    }))
  })
  it("makes stale, unavailable, limited, and redacted evidence visible", async () => {
    actions.runCommandAgentAction.mockResolvedValue({
      success: true,
      data: {
        access: { mode: "internal", canRun: true, canRender: true, reason: "available" },
        receipt: {
          runId: "cm00000000000000000000001",
          correlationId: "00000000-0000-4000-8000-000000000001",
          status: "completed",
          completedStepCount: 2,
          evidenceLinkCount: 1,
          safeSummary: "The available evidence is incomplete.",
          failureCode: null,
        },
        skill: { key: "role-daily-brief", version: 1, promptHash: "sha256:test" },
        brief: {
          kind: "stoquify.command-agent.daily-brief.v1",
          digestId: "manager-run-sheet",
          audienceRole: "manager",
          title: "Evidence is incomplete",
          summary: "Some sources could not be trusted.",
          conclusion: "Review the limitations before acting.",
          generatedAt: "2026-07-22T12:00:00.000Z",
          periodStart: "2026-07-22T00:00:00.000Z",
          periodEnd: "2026-07-22T23:59:59.999Z",
          state: "partial",
          evidenceGrade: "blocked",
          freshness: "stale",
          priorities: [],
          evidence: [{
            id: "evidence-1",
            subjectType: "payment.truth",
            subjectId: "org-1:payment-truth",
            sourceModule: "payments",
            sourceHash: null,
            evidenceGrade: "blocked",
            freshness: "stale",
            available: false,
            blockerCount: 1,
            redactionCount: 1,
          }],
          limitations: ["Payment truth is stale."],
          redactionNotices: ["Person-level values were redacted."],
          provenance: {
            tenantId: "org-1",
            tenantName: "Tenant One",
            periodStart: "2026-07-22T00:00:00.000Z",
            periodEnd: "2026-07-22T23:59:59.999Z",
            asOf: "2026-07-22T12:00:00.000Z",
            sourceCount: 1,
          },
          runId: "cm00000000000000000000001",
        },
      },
    })

    render(
      <AgentCommandPanel
        access={{ mode: "internal", canRun: true, canRender: true, reason: "available" }}
        digestId="manager-run-sheet"
        periodStart="2026-07-22T00:00:00.000Z"
        periodEnd="2026-07-22T23:59:59.999Z"
        locale="en"
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: "Generate brief" }))

    expect(await screen.findByRole("heading", { name: "Evidence is incomplete" })).toBeInTheDocument()
    expect(screen.getByText("stale")).toBeInTheDocument()
    expect(screen.getByText("Payment truth is stale.")).toBeInTheDocument()
    expect(screen.getByText("Person-level values were redacted.")).toBeInTheDocument()
    expect(screen.getByText("No permitted priority is due for this digest.")).toBeInTheDocument()
  })
})
