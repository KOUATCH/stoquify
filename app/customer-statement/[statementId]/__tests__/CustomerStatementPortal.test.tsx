import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import { CustomerStatementPortal } from "../CustomerStatementPortal"

const mockGet = jest.fn((key: string) =>
  key === "token" ? "signed-token" : null,
)

jest.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: mockGet }),
}))

const statement = {
  statementId: "statement-1",
  statementNumber: "STM-2026-001",
  version: 1,
  contentHash: "a".repeat(64),
  currency: "XAF",
  periodStart: "2026-07-01T00:00:00.000Z",
  periodEnd: "2026-07-31T23:59:59.999Z",
  expiresAt: "2026-12-31T23:59:59.000Z",
  permissions: ["view", "dispute", "promise_to_pay"],
  responseHash: "b".repeat(64),
  payload: {
    organization: {
      name: "Client SA",
      tradeName: null,
    },
    customer: {
      name: "Ada Retail",
      code: "C-001",
    },
    balances: {
      opening: "40.00",
      periodDebits: "100.00",
      periodCredits: "65.00",
      closing: "75.00",
      overdue: "25.00",
    },
    lines: [{
      customerReceivableDocumentId: "receivable-1",
      documentNumber: "INV-001",
      invoiceDate: "2026-07-10T00:00:00.000Z",
      dueDate: "2026-07-25T00:00:00.000Z",
      status: "partial",
      daysPastDue: 6,
      debitAmount: "100.00",
      periodCreditAmount: "25.00",
      closingBalance: "75.00",
    }],
  },
  branding: {
    poweredBy: "Stoquify",
    referralCode: "referral-code-123",
    referralUrl: "/api/referrals/referral-code-123",
  },
  controls: {
    redacted: true,
    rawTokenStored: false,
    requestMetadataHashed: true,
  },
}

describe("CustomerStatementPortal", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: statement }),
    }) as jest.Mock
  })

  it("renders the verified snapshot, receivable lines, and branded referral CTA", async () => {
    render(<CustomerStatementPortal statementId="statement-1" />)

    expect(await screen.findByText("Client SA")).toBeInTheDocument()
    expect(screen.getByText("INV-001")).toBeInTheDocument()
    expect(screen.getByText(/STM-2026-001/)).toBeInTheDocument()
    expect(
      screen.getByRole("link", { name: "Build your own trusted workspace" }),
    ).toHaveAttribute("href", "/api/referrals/referral-code-123")
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/customer-statements/statement-1?token=signed-token",
      expect.objectContaining({
        cache: "no-store",
        credentials: "omit",
        referrerPolicy: "no-referrer",
      }),
    )
  })

  it("announces signed-link verification while the statement is loading", () => {
    global.fetch = jest.fn(() => new Promise(() => undefined)) as jest.Mock

    render(<CustomerStatementPortal statementId="statement-1" />)

    expect(screen.getByRole("status")).toHaveTextContent(
      "Verifying your secure statement…",
    )
  })

  it("renders a generic unavailable-link error without statement data", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({
        success: false,
        error: "Customer statement not found",
      }),
    }) as jest.Mock

    render(<CustomerStatementPortal statementId="statement-1" />)

    expect(
      await screen.findByRole("heading", { name: "Link unavailable" }),
    ).toBeInTheDocument()
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Customer statement not found",
    )
    expect(screen.queryByText("INV-001")).not.toBeInTheDocument()
  })

  it("submits an idempotent promise to pay against the signed endpoint", async () => {
    const fetcher = global.fetch as jest.Mock
    fetcher
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: statement }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          success: true,
          data: { replayed: false },
        }),
      })
    render(<CustomerStatementPortal statementId="statement-1" />)
    await screen.findByText("Client SA")

    fireEvent.change(screen.getByLabelText("Amount (XAF)"), {
      target: { value: "50.00" },
    })
    fireEvent.change(screen.getByLabelText("Payment date"), {
      target: { value: "2026-12-01" },
    })
    fireEvent.change(screen.getByLabelText("Note"), {
      target: { value: "Payment scheduled after customer approval." },
    })
    fireEvent.click(screen.getByRole("button", { name: "Record response" }))

    expect(
      await screen.findByText("Your promise to pay was recorded."),
    ).toBeInTheDocument()
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2))
    const [url, init] = fetcher.mock.calls[1]
    expect(url).toBe(
      "/api/customer-statements/statement-1/actions?token=signed-token",
    )
    const body = JSON.parse(init.body)
    expect(body).toEqual(
      expect.objectContaining({
        actionType: "PROMISE_TO_PAY",
        requestedAmount: "50.00",
        promisedFor: "2026-12-01",
        note: "Payment scheduled after customer approval.",
        idempotencyKey: expect.stringMatching(/^statement-recipient:/),
        correlationId: expect.stringMatching(/^statement-correlation:/),
      }),
    )
  })
})
