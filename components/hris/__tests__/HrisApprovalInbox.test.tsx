import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"

import { decideHrisApprovalInboxItemAction } from "@/actions/hris/approval-inbox.actions"

import { HrisApprovalInboxView } from "../HrisApprovalInbox"

const mockRefresh = jest.fn()

jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}))

jest.mock("@/actions/hris/approval-inbox.actions", () => ({
  decideHrisApprovalInboxItemAction: jest.fn(),
}))

jest.mock("@/i18n/routing", () => ({
  localizePath: (href: string, locale: string) => `/${locale}${href}`,
}))

jest.mock("lucide-react", () => {
  const React = require("react")
  const createIcon = (name: string) => {
    const Icon = (props: Record<string, unknown>) =>
      React.createElement("svg", { "data-testid": `icon-${name}`, ...props })
    Icon.displayName = name
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

const mockDecide = decideHrisApprovalInboxItemAction as jest.Mock

function inbox(eligible = true) {
  return {
    organizationId: "org-1",
    asOf: "2026-07-15T00:00:00.000Z",
    items: [
      {
        id: "SALARY_CHANGE:salary-1",
        domain: "SALARY_CHANGE",
        stage: "REVIEW",
        sourceId: "salary-1",
        employee: { id: "emp-1", displayName: "Ada Payroll" },
        title: "Salary change",
        subject: "Effective 2026-08-01",
        requestedAt: "2026-07-14T00:00:00.000Z",
        effectiveAt: "2026-08-01T00:00:00.000Z",
        potentialActions: ["APPROVE", "REJECT"],
        decision: {
          eligible,
          reasonCode: eligible ? "ACTION_ALLOWED" : "REQUESTER_CANNOT_REVIEW",
        },
        evidence: {
          requestEvidencePresent: true,
          approvalEvidencePresent: false,
          rawDetailsIncluded: false,
        },
        readiness: {
          status: "BLOCKED",
          blockerCode: "COMPENSATION_CHANGE_PENDING",
          impact: "PAYROLL_INPUT",
        },
        reviewHref: "/dashboard/people/emp-1",
      },
    ],
    summary: {
      visiblePending: 1,
      returned: 1,
      review: 1,
      apply: 0,
      actionable: eligible ? 1 : 0,
      selfApprovalBlocked: eligible ? 0 : 1,
      byDomain: {
        LIFECYCLE: 0,
        CONTRACT_ACTIVATION: 0,
        CONTRACT_DOCUMENT: 0,
        COMPENSATION_ASSIGNMENT: 0,
        SALARY_CHANGE: 1,
        PAYMENT_DESTINATION: 0,
      },
    },
    readiness: {
      status: "BLOCKED",
      blockerCount: 1,
      blockerCodes: ["COMPENSATION_CHANGE_PENDING"],
    },
    accessScope: {
      organizationId: "org-1",
      authority: { label: "Managed-location responsibility" },
      managedLocationCount: 1,
    },
    redaction: {},
    dataOwnership: {},
  } as any
}

describe("HrisApprovalInboxView", () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  function submitApproval(locale: "en" | "fr" = "en") {
    render(<HrisApprovalInboxView inbox={inbox(true)} locale={locale} />)
    fireEvent.click(screen.getByRole("button", { name: "Approve" }))
    const dialog = screen.getByRole("dialog")
    fireEvent.change(within(dialog).getByLabelText("Decision reason"), {
      target: { value: "Evidence reviewed" },
    })
    fireEvent.change(within(dialog).getByLabelText("Approval evidence hash"), {
      target: { value: "sha256:approval-evidence" },
    })
    fireEvent.click(within(dialog).getByRole("button", { name: "Approve" }))
    return dialog
  }

  it.each([
    ["FRESH_AUTH_REQUIRED", "Sign in again before completing this decision."],
    ["AUTH_REQUIRED", "Sign in again before completing this decision."],
    ["FORBIDDEN", "You no longer have permission to complete this decision. Contact your administrator."],
    ["CONFLICT", "The request has changed. Refresh the approval queue and review it again before deciding."],
    ["NOT_FOUND", "The request has changed. Refresh the approval queue and review it again before deciding."],
    ["INTERNAL_ERROR", "Decision could not be completed. Refresh and verify that the request is still pending."],
  ])("preserves the decision draft when the action returns %s", async (code, message) => {
    mockDecide.mockResolvedValue({ success: false, data: null, code, error: "sensitive internal details" })
    const dialog = submitApproval()

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(message))
    expect(screen.getByRole("dialog")).toBe(dialog)
    expect(within(dialog).getByLabelText("Decision reason")).toHaveValue("Evidence reviewed")
    expect(within(dialog).getByLabelText("Approval evidence hash")).toHaveValue("sha256:approval-evidence")
    expect(within(dialog).getByRole("button", { name: "Approve" })).toBeEnabled()
    expect(document.body.textContent).not.toContain("sensitive internal details")
    expect(mockRefresh).not.toHaveBeenCalled()
  })

  it("explains rejected decisions in French on the French route", async () => {
    mockDecide.mockResolvedValue({ success: false, data: null, code: "FRESH_AUTH_REQUIRED" })
    submitApproval("fr")
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(
      "Reconnectez-vous avant de terminer cette décision.",
    ))
    expect(mockRefresh).not.toHaveBeenCalled()
  })

  it.each([undefined, null, { success: false }, { success: true, data: null }])(
    "does not treat an incomplete action response as success: %p",
    async response => {
      mockDecide.mockResolvedValue(response)
      submitApproval()
      await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument())
      expect(screen.getByRole("dialog")).toBeInTheDocument()
      expect(mockRefresh).not.toHaveBeenCalled()
    },
  )

  it("closes and refreshes only after a confirmed successful decision", async () => {
    mockDecide.mockResolvedValue({ success: true, data: { status: "COMPLETED" } })
    submitApproval()
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    expect(mockRefresh).toHaveBeenCalledTimes(1)
  })

  it("prevents another submission while a decision is pending", async () => {
    let complete!: (value: unknown) => void
    mockDecide.mockImplementation(() => new Promise(resolve => { complete = resolve }))
    const dialog = submitApproval()
    await waitFor(() => expect(within(dialog).getByRole("button", { name: "Approve" })).toBeDisabled())
    fireEvent.click(within(dialog).getByRole("button", { name: "Approve" }))
    expect(mockDecide).toHaveBeenCalledTimes(1)
    complete({ success: false, data: null, code: "CONFLICT" })
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument())
  })

  it("renders self-approval as a disabled action state", () => {
    render(<HrisApprovalInboxView inbox={inbox(false)} locale="en" />)

    expect(screen.getByText("Requester cannot review")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Approve" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Reject" })).toBeDisabled()
  })

  it("keeps stale decision errors generic and preserves the pending dialog", async () => {
    mockDecide.mockRejectedValue(new Error("sensitive internal conflict"))
    render(<HrisApprovalInboxView inbox={inbox(true)} locale="en" />)

    fireEvent.click(screen.getByRole("button", { name: "Approve" }))
    const dialog = screen.getByRole("dialog")
    fireEvent.change(within(dialog).getByLabelText("Decision reason"), {
      target: { value: "Evidence reviewed" },
    })
    fireEvent.change(within(dialog).getByLabelText("Approval evidence hash"), {
      target: { value: "sha256:approval-evidence" },
    })
    fireEvent.click(within(dialog).getByRole("button", { name: "Approve" }))

    await waitFor(() => expect(within(dialog).getByRole("alert")).toHaveTextContent(
      "Decision could not be completed. Refresh and verify that the request is still pending.",
    ))
    expect(document.body.textContent).not.toContain("sensitive internal conflict")
    expect(mockRefresh).not.toHaveBeenCalled()
  })
})
