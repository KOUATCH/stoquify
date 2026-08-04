import type { SVGProps } from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"

jest.mock("lucide-react", () => {
  const createIcon = (name: string) => {
    const Icon = (props: SVGProps<SVGSVGElement>) => (
      <svg data-testid={`icon-${name}`} {...props} />
    )
    return Icon
  }
  return new Proxy(
    { __esModule: true },
    {
      get(target, prop: string) {
        if (prop in target) return target[prop as keyof typeof target]
        return createIcon(prop)
      },
    },
  )
})

jest.mock("@/actions/ai/copilot-proposal.actions", () => ({
  createCopilotProposalAction: jest.fn(),
  decideCopilotProposalAction: jest.fn(),
}))

import {
  createCopilotProposalAction,
  decideCopilotProposalAction,
} from "@/actions/ai/copilot-proposal.actions"

import { CopilotProposalControls } from "../CopilotProposalControls"

const mockCreate = createCopilotProposalAction as jest.Mock
const mockDecide = decideCopilotProposalAction as jest.Mock

const proposal = {
  id: "cm00000000000000000000002",
  runId: "cm00000000000000000000001",
  proposalType: "NAVIGATE_TO_WORKFLOW",
  targetRoute: "/dashboard/manager-action-center",
  requiredPermission: "dashboard.read",
  title: "Review exception",
  detail: "Review cited evidence.",
  evidenceRefs: [],
  sourceHash: "a".repeat(64),
  status: "DRAFT",
  periodStart: "2026-07-27T00:00:00.000Z",
  periodEnd: "2026-07-27T23:59:59.999Z",
  asOf: "2026-07-27T12:00:00.000Z",
  expiresAt: "2026-07-28T12:00:00.000Z",
  decidedAt: null,
  decisionReason: null,
  createdAt: "2026-07-27T12:00:00.000Z",
  executionAuthority: "NONE",
}

describe("CopilotProposalControls", () => {
  beforeEach(() => jest.clearAllMocks())

  it("creates an evidence-bound proposal and explains that acceptance does not execute", async () => {
    mockCreate.mockResolvedValue({ success: true, data: proposal })

    renderControls()
    fireEvent.click(
      screen.getByRole("button", {
        name: "Prepare proposal: Review exception",
      }),
    )

    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          proposalType: "NAVIGATE_TO_WORKFLOW",
          targetRoute: "/dashboard/manager-action-center",
          evidence: [expect.objectContaining({ id: "evidence-1" })],
        }),
      ),
    )
    expect(
      await screen.findByText(/cannot execute the workflow/i),
    ).toBeInTheDocument()
  })

  it("requires an explicit human decision before recording acceptance", async () => {
    mockCreate.mockResolvedValue({ success: true, data: proposal })
    mockDecide.mockResolvedValue({
      success: true,
      data: { ...proposal, status: "ACCEPTED" },
    })

    renderControls()
    fireEvent.click(
      screen.getByRole("button", {
        name: "Prepare proposal: Review exception",
      }),
    )
    fireEvent.click(await screen.findByRole("button", { name: "Accept proposal" }))

    await waitFor(() =>
      expect(mockDecide).toHaveBeenCalledWith({
        proposalId: proposal.id,
        decision: "ACCEPTED",
        reason: "Accepted after human review.",
      }),
    )
    expect(await screen.findByText("Proposal accepted")).toBeInTheDocument()
  })
})

function renderControls() {
  return render(
    <CopilotProposalControls
      runId="cm00000000000000000000001"
      priority={{
        id: "risk-1",
        title: "Review exception",
        detail: "Review cited evidence.",
        severity: "high",
        href: "/dashboard/manager-action-center",
        requiredPermission: "dashboard.read",
        evidenceIds: ["evidence-1"],
      }}
      evidence={[
        {
          id: "evidence-1",
          subjectType: "daily-habit.digest",
          subjectId: "org-1:digest:period",
          sourceModule: "dashboard",
          sourceHash: "sha256:source",
          evidenceGrade: "operational",
          freshness: "fresh",
          available: true,
          blockerCount: 0,
          redactionCount: 0,
        },
      ]}
      periodStart="2026-07-27T00:00:00.000Z"
      periodEnd="2026-07-27T23:59:59.999Z"
      asOf="2026-07-27T12:00:00.000Z"
      locale="en"
    />,
  )
}
