import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import {
  createCustomerStatementAction,
  queueCustomerStatementDeliveryAction,
} from "@/actions/accounting/customer-statement.actions"
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"
import { CustomerStatementWorkflow } from "../CustomerStatementWorkflow"

jest.mock("@/i18n/routing", () => ({
  localizePath: (path: string, locale: string) => `/${locale}${path}`,
}))

jest.mock("@/actions/accounting/customer-statement.actions", () => ({
  createCustomerStatementAction: jest.fn(),
  queueCustomerStatementDeliveryAction: jest.fn(),
}))

jest.mock("@/actions/security/step-up-auth.actions", () => ({
  stepUpWithPasswordAction: jest.fn(),
}))

const mockStepUp = stepUpWithPasswordAction as jest.Mock
const mockCreate = createCustomerStatementAction as jest.Mock
const mockQueue = queueCustomerStatementDeliveryAction as jest.Mock

const snapshot = {
  statementId: "statement-1",
  statementNumber: "STM-2026-001",
  version: 1,
  contentHash: "a".repeat(64),
  businessEventId: "event-1",
  periodStart: "2026-07-01T00:00:00.000Z",
  periodEnd: "2026-07-31T23:59:59.999Z",
  asOf: "2026-07-31T23:59:59.999Z",
  recordedThrough: "2026-08-09T16:00:00.000Z",
  currency: "XAF",
  openingBalance: "40.00",
  periodDebits: "100.00",
  periodCredits: "65.00",
  closingBalance: "75.00",
  overdueBalance: "25.00",
  itemCount: 1,
  movementCount: 1,
  truncated: false,
  replayed: false,
  payload: {},
}

describe("CustomerStatementWorkflow", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: {
        randomUUID: jest.fn(() => "00000000-0000-4000-8000-000000000001"),
        subtle: {
          digest: jest.fn(async () => new Uint8Array(32).fill(7).buffer),
        },
      },
    })
    mockStepUp.mockResolvedValue({
      success: true,
      data: {
        verifiedAt: "2026-08-09T16:00:00.000Z",
        method: "password",
        assuranceLevel: 1,
      },
      error: null,
      code: null,
      retryAfterSeconds: null,
    })
    mockCreate.mockResolvedValue({
      success: true,
      data: snapshot,
      error: null,
      status: 200,
    })
    mockQueue.mockResolvedValue({
      success: true,
      data: {
        deliveryId: "delivery-1",
        statementSnapshotId: "statement-1",
        tokenId: "token-1",
        attributionId: "attribution-1",
        referralCode: "referral-code-123",
        channel: "EMAIL",
        status: "QUEUED",
        redactedDestination: "c***@example.test",
        destinationHash: `sha256:${"b".repeat(64)}`,
        outboxId: "outbox-1",
        expiresAt: "2026-09-08T16:00:00.000Z",
        replayed: false,
      },
      error: null,
      status: 200,
    })
  })

  it("creates an immutable snapshot and queues a consent-hashed delivery", async () => {
    render(
      <CustomerStatementWorkflow
        customer={{
          id: "customer-1",
          name: "Ada Retail",
          code: "C-001",
          email: "customer@example.test",
        }}
        locale="en"
      />,
    )

    fireEvent.change(
      screen.getByLabelText("Confirm your current password"),
      { target: { value: "Admin@2026" } },
    )
    fireEvent.click(
      screen.getByRole("button", {
        name: "Generate immutable statement",
      }),
    )
    expect(await screen.findByText("STM-2026-001")).toBeInTheDocument()
    expect(mockStepUp).toHaveBeenNthCalledWith(1, { password: "Admin@2026" })
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: "customer-1",
        currency: "XAF",
        idempotencyKey: expect.stringMatching(/^customer-statement:/),
      }),
    )
    expect(mockCreate.mock.calls[0][0]).not.toHaveProperty("password")
    expect(new Date(mockCreate.mock.calls[0][0].periodEnd).getTime()).toBeLessThanOrEqual(
      Date.now(),
    )

    fireEvent.click(
      screen.getByLabelText(
        /I confirm the customer explicitly requested or approved delivery/i,
      ),
    )
    fireEvent.change(
      screen.getAllByLabelText("Confirm your current password")[1],
      { target: { value: "Admin@2026" } },
    )
    fireEvent.click(
      screen.getByRole("button", { name: "Queue secure delivery" }),
    )

    expect(
      await screen.findByText("Secure statement delivery queued."),
    ).toBeInTheDocument()
    await waitFor(() => expect(mockQueue).toHaveBeenCalledTimes(1))
    expect(mockQueue).toHaveBeenCalledWith(
      expect.objectContaining({
        statementSnapshotId: "statement-1",
        channel: "EMAIL",
        destination: "customer@example.test",
        consentBasis: "EXPLICIT",
        consentEvidenceHash: expect.stringMatching(/^sha256:[0-9a-f]{64}$/),
        allowDispute: true,
        allowPromiseToPay: true,
        locale: "EN",
      }),
    )
    expect(mockStepUp).toHaveBeenNthCalledWith(2, { password: "Admin@2026" })
    expect(mockQueue.mock.calls[0][0]).not.toHaveProperty("password")
    expect(screen.getByText(/Referral code: referral-code-123/)).toBeInTheDocument()
  })

  it("does not call the statement service when password step-up fails", async () => {
    mockStepUp.mockResolvedValueOnce({
      success: false,
      data: null,
      error: "Authentication could not be verified",
      code: "INVALID_CREDENTIALS",
      retryAfterSeconds: null,
    })
    render(
      <CustomerStatementWorkflow
        customer={{
          id: "customer-1",
          name: "Ada Retail",
          code: "C-001",
          email: "customer@example.test",
        }}
        locale="en"
      />,
    )

    fireEvent.change(
      screen.getByLabelText("Confirm your current password"),
      { target: { value: "wrong-password" } },
    )
    fireEvent.click(
      screen.getByRole("button", { name: "Generate immutable statement" }),
    )

    expect(
      await screen.findByText("Authentication could not be verified"),
    ).toBeInTheDocument()
    expect(mockCreate).not.toHaveBeenCalled()
  })
})
