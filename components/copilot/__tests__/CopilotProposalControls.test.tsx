import type { SVGProps } from "react"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"

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

  it.each(["en", "fr"] as const)("preserves the draft and rejection after evidence changes (%s)", async (locale) => {
    mockCreate.mockResolvedValue({ success: true, data: proposal })
    mockDecide.mockResolvedValue({ success: false, code: "BUSINESS_RULE_VIOLATION", error: "Internal English detail" })
    renderControls(locale)
    fireEvent.click(screen.getByRole("button", { name: /proposal:|proposition:/i }))
    const accept = await screen.findByRole("button", { name: locale === "en" ? "Accept proposal" : "Accepter la proposition" })
    fireEvent.click(accept)
    expect(await screen.findByRole("alert")).toHaveTextContent(locale === "en" ? "Refresh the analysis" : "Actualisez l’analyse")
    expect(screen.queryByText("Internal English detail")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: locale === "en" ? "Reject proposal" : "Rejeter la proposition" })).toBeEnabled()
    expect(screen.queryByText(locale === "en" ? "Proposal accepted" : "Proposition acceptee")).not.toBeInTheDocument()
  })

  it("retries exactly the same preparation after a transport failure", async () => {
    const clock = jest.spyOn(Date, "now").mockReturnValue(1000)
    try {
      mockCreate.mockRejectedValueOnce(new Error("Lost response")).mockResolvedValueOnce({ success: true, data: proposal })
      renderControls()
      fireEvent.click(screen.getByRole("button", { name: "Prepare proposal: Review exception" }))
      await screen.findByRole("alert")
      const first = JSON.stringify(mockCreate.mock.calls[0][0])
      clock.mockReturnValue(5000)
      fireEvent.click(screen.getByRole("button", { name: "Prepare proposal: Review exception" }))
      await screen.findByRole("button", { name: "Accept proposal" })
      expect(JSON.stringify(mockCreate.mock.calls[1][0])).toBe(first)
    } finally { clock.mockRestore() }
  })

  it("prevents duplicate submission while preparation is pending", async () => {
    let resolve!: (value: unknown) => void
    mockCreate.mockReturnValueOnce(new Promise((done) => { resolve = done }))
    renderControls()
    const button = screen.getByRole("button", { name: "Prepare proposal: Review exception" })
    fireEvent.click(button)
    fireEvent.click(button)
    expect(mockCreate).toHaveBeenCalledTimes(1)
    await act(async () => resolve({ success: true, data: proposal }))
  })

  it("isolates a new run from an earlier proposal and pending response", async () => {
    let resolve!: (value: unknown) => void
    mockCreate.mockReturnValueOnce(new Promise((done) => { resolve = done }))
    const view = renderControls()
    fireEvent.click(screen.getByRole("button", { name: "Prepare proposal: Review exception" }))
    view.rerender(controls("en", "cm00000000000000000000009"))
    await act(async () => resolve({ success: true, data: proposal }))
    expect(screen.queryByRole("button", { name: "Accept proposal" })).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Prepare proposal: Review exception" })).toBeEnabled()
  })

  it.each([
    ["EXPIRED", "Proposal expired"], ["CANCELLED", "Proposal cancelled"],
  ])("does not mislabel %s as a rejection", async (status, label) => {
    mockCreate.mockResolvedValueOnce({ success: true, data: { ...proposal, status } })
    renderControls()
    fireEvent.click(screen.getByRole("button", { name: "Prepare proposal: Review exception" }))
    expect(await screen.findByRole("status")).toHaveTextContent(label)
    expect(screen.queryByText("Proposal rejected")).not.toBeInTheDocument()
  })
})

function renderControls(locale: "en" | "fr" = "en") {
  return render(controls(locale))
}

function controls(locale: "en" | "fr" = "en", runId = "cm00000000000000000000001") {
  return (
    <CopilotProposalControls
      runId={runId}
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
      locale={locale}
    />
  )
}
