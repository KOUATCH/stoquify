import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import {
  decideOperationalTimeRequestAction,
  requestOperationalTimeAction,
} from "@/actions/hris/operational-time.actions"

import { HrisOperationalTimeApprovalPanel } from "../HrisOperationalTimeApprovalPanel"
import { HrisOperationalTimeRequestPanel } from "../HrisOperationalTimeRequestPanel"

jest.mock("@/actions/hris/operational-time.actions", () => ({
  requestOperationalTimeAction: jest.fn(),
  decideOperationalTimeRequestAction: jest.fn(),
}))

const mockRequest = requestOperationalTimeAction as jest.Mock
const mockDecision = decideOperationalTimeRequestAction as jest.Mock

beforeAll(() => {
  Object.defineProperty(globalThis, "crypto", {
    value: {
      subtle: {
        digest: jest.fn().mockResolvedValue(new Uint8Array(32).buffer),
      },
    },
    configurable: true,
  })
})

describe("HRIS operational time self-service panels", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequest.mockResolvedValue({ success: true, data: {} })
    mockDecision.mockResolvedValue({ success: true, data: {} })
  })

  it("submits an employee leave request to the server-owned workflow", async () => {
    render(
      <HrisOperationalTimeRequestPanel
        enabled
        balances={[{ leavePolicyId: "policy-1", availableMinutes: 2400 }]}
        requests={[]}
      />,
    )

    fireEvent.change(screen.getByLabelText("Minutes"), {
      target: { value: "480" },
    })
    fireEvent.change(screen.getByLabelText("Start"), {
      target: { value: "2026-08-03" },
    })
    fireEvent.change(screen.getByLabelText("End"), {
      target: { value: "2026-08-03" },
    })
    fireEvent.change(screen.getByLabelText("Reason"), {
      target: { value: "Annual leave request" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Submit request" }))

    await waitFor(() => expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "LEAVE",
        leavePolicyId: "policy-1",
        requestedMinutes: 480,
      }),
    ))
    expect(await screen.findByRole("status")).toHaveTextContent(
      "independent manager review",
    )
  })

  it("lets only eligible managers approve a pending request", async () => {
    render(
      <HrisOperationalTimeApprovalPanel
        requests={[{
          id: "request-1",
          type: "OVERTIME",
          employeeId: "employee-1",
          employee: { displayName: "Alice Ngono" },
          periodStart: "2026-08-03T00:00:00.000Z",
          periodEnd: "2026-08-03T00:00:00.000Z",
          requestedMinutes: 120,
          requestedAt: "2026-07-26T00:00:00.000Z",
          canDecide: true,
        }]}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: "Approve" }))

    await waitFor(() => expect(mockDecision).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: "request-1",
        employeeId: "employee-1",
        decision: "APPROVE",
      }),
    ))
  })
})
