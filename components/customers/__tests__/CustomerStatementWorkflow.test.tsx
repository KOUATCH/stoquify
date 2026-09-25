import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import {
  createCustomerStatementAction,
  queueCustomerStatementDeliveryAction,
} from "@/actions/accounting/customer-statement.actions"
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"
import { CustomerStatementWorkflow } from "../CustomerStatementWorkflow"
import { getCustomerStatementRecordAction, listCustomerStatementHistoryAction } from "@/actions/accounting/customer-statement-history.actions"
jest.mock("../CustomerStatementResponses", () => ({ CustomerStatementResponses: () => null }))

jest.mock("@/actions/accounting/customer-statement-history.actions", () => ({
  listCustomerStatementHistoryAction: jest.fn(),
  getCustomerStatementRecordAction: jest.fn(),
}))

jest.mock("@/i18n/routing", () => ({
  localizePath: (path: string, locale: string) => `/${locale}${path}`,
}))

jest.mock("@/actions/accounting/customer-statement.actions", () => ({
  createCustomerStatementAction: jest.fn(),
  queueCustomerStatementDeliveryAction: jest.fn(),
  revokeCustomerStatementAccessAction: jest.fn(),
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
    sessionStorage.clear()
    ;(listCustomerStatementHistoryAction as jest.Mock).mockResolvedValue({ success: true, data: { customerId: "customer-1", checkedAt: "2026-09-06T00:00:00Z", statements: [snapshot], nextCursor: null } })
    ;(getCustomerStatementRecordAction as jest.Mock).mockResolvedValue({ success: true, data: { customerId: "customer-1", checkedAt: "2026-09-06T00:00:00Z", statement: snapshot, deliveries: [], nextCursor: null } })
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

  async function prepareDelivery() {
    let sequence = 0
    ;(crypto.randomUUID as jest.Mock).mockImplementation(() => `00000000-0000-4000-8000-${String(++sequence).padStart(12, "0")}`)
    const view = render(<CustomerStatementWorkflow organizationId="org-1" actorId="user-1" currency="XAF" customer={{ id: "customer-1", name: "Ada Retail", code: "C-001", email: "customer@example.test" }} locale="en" />)
    fireEvent.change(screen.getByLabelText("Confirm your current password"), { target: { value: "Verification-only-password" } })
    fireEvent.click(screen.getByRole("button", { name: "Generate immutable statement" }))
    await screen.findByText("STM-2026-001")
    fireEvent.click(screen.getByLabelText(/I confirm the customer explicitly requested or approved delivery/i))
    fireEvent.change(screen.getAllByLabelText("Confirm your current password")[1], { target: { value: "Verification-only-password" } })
    return view
  }

  it("opens saved history without creating a snapshot and resumes the exact delivery after reload", async () => {
    const props = { organizationId: "org-1", actorId: "user-1", currency: "XAF", customer: { id: "customer-1", name: "Ada Retail", code: "C-001", email: "customer@example.test" }, locale: "en" as const }
    const view = render(<CustomerStatementWorkflow {...props} />)
    fireEvent.click(screen.getByRole("button", { name: "Latest statements" }))
    fireEvent.click(await screen.findByRole("button", { name: "Review STM-2026-001 version 1" }))
    fireEvent.click(await screen.findByRole("button", { name: "Use this statement for a new delivery" }))
    expect(mockCreate).not.toHaveBeenCalled()
    fireEvent.click(screen.getByLabelText(/I confirm the customer explicitly requested or approved delivery/))
    fireEvent.change(screen.getByLabelText("Confirm your current password"), { target: { value: "test-only-password" } })
    mockQueue.mockRejectedValueOnce(new Error("Unconfirmed delivery"))
    fireEvent.click(screen.getByRole("button", { name: "Queue secure delivery" }))
    await screen.findByText(/Unconfirmed delivery/)
    const command = mockQueue.mock.calls[0][0]
    view.unmount(); render(<CustomerStatementWorkflow {...props} />)
    expect(screen.queryByRole("button", { name: "Generate immutable statement" })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Open saved statement" }))
    fireEvent.click(await screen.findByRole("button", { name: "Resume this statement" }))
    fireEvent.change(screen.getByLabelText("Confirm your current password"), { target: { value: "test-only-password" } })
    fireEvent.click(screen.getByRole("button", { name: "Retry existing delivery request" }))
    await waitFor(() => expect(mockQueue).toHaveBeenCalledTimes(2))
    expect(mockQueue.mock.calls[1][0]).toEqual(command); expect(mockCreate).not.toHaveBeenCalled()
  })

  it("keeps history available with unreadable local metadata while preventing a replacement request", async () => {
    sessionStorage.setItem("customer-statement-request:v1:org-1:user-1:customer-1", "broken")
    render(<CustomerStatementWorkflow organizationId="org-1" actorId="user-1" currency="XAF" customer={{ id: "customer-1", name: "Ada", code: null, email: null }} locale="en" />)
    fireEvent.click(screen.getByRole("button", { name: "Latest statements" }))
    fireEvent.click(await screen.findByRole("button", { name: "Review STM-2026-001 version 1" }))
    expect(await screen.findByRole("button", { name: "Use this statement for a new delivery" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Generate immutable statement" })).toBeDisabled()
    expect(mockCreate).not.toHaveBeenCalled(); expect(sessionStorage.getItem(sessionStorage.key(0)!)).toBe("broken")
  })

  it("names the channel precisely and explains queued delivery in French", async () => {
    render(<CustomerStatementWorkflow organizationId="org-1" actorId="user-1" currency="XAF" customer={{ id: "customer-1", name: "Ada Retail", code: "C-001", email: "customer@example.test" }} locale="fr" />)
    fireEvent.change(screen.getByLabelText("Confirmez votre mot de passe actuel"), { target: { value: "Verification-only-password" } })
    fireEvent.click(screen.getByRole("button", { name: "Générer le relevé immuable" }))
    await screen.findByText("STM-2026-001")
    expect(screen.getByLabelText("Canal", { exact: true })).toHaveAccessibleName("Canal")
    fireEvent.click(screen.getByLabelText(/Je confirme que le client a explicitement demandé ou approuvé/))
    fireEvent.change(screen.getAllByLabelText("Confirmez votre mot de passe actuel")[1], { target: { value: "Verification-only-password" } })
    fireEvent.click(screen.getByRole("button", { name: "Mettre l’envoi sécurisé en file" }))
    expect(await screen.findByRole("heading", { name: "Demande d’envoi : En file d’attente" })).toBeInTheDocument()
    expect(screen.getByText(/ne prouve ni la livraison ni la lecture par le destinataire/)).toBeInTheDocument()
    expect(mockQueue).toHaveBeenCalledWith(expect.objectContaining({ locale: "FR" }))
  })

  it("retries the exact delivery command and consent after a lost response", async () => {
    await prepareDelivery()
    mockQueue.mockRejectedValueOnce(new Error("Connection lost after submission"))
    fireEvent.click(screen.getByRole("button", { name: "Queue secure delivery" }))
    await screen.findByText(/Connection lost after submission/)
    const original = mockQueue.mock.calls[0][0]
    fireEvent.click(screen.getByRole("button", { name: /Queue secure delivery|Retry existing delivery request/ }))
    await waitFor(() => expect(mockQueue).toHaveBeenCalledTimes(2))
    expect(mockQueue.mock.calls[1][0]).toEqual(original)
  })

  it("locks overlapping delivery submissions before asynchronous fresh authentication", async () => {
    await prepareDelivery()
    let release!: (value: unknown) => void
    mockStepUp.mockImplementation(() => new Promise(resolve => { release = resolve }))
    const form = screen.getByRole("button", { name: "Queue secure delivery" }).closest("form")!
    fireEvent.submit(form); fireEvent.submit(form)
    expect(mockStepUp).toHaveBeenCalledTimes(2) // one snapshot, one delivery
    release({ success: true })
    await waitFor(() => expect(mockQueue).toHaveBeenCalledTimes(1))
  })

  it("keeps an uncertain delivery bound to its reviewed destination and permissions", async () => {
    await prepareDelivery()
    mockQueue.mockRejectedValueOnce(new Error("Connection lost after submission"))
    fireEvent.click(screen.getByRole("button", { name: "Queue secure delivery" }))
    await screen.findByText(/Connection lost after submission/)
    expect(screen.getByLabelText("Destination")).toBeDisabled()
    expect(screen.getByLabelText("Channel")).toBeDisabled()
    expect(screen.getByLabelText("Allow disputes")).toBeDisabled()
    expect(screen.getByRole("button", { name: "Retry existing statement request" })).toBeDisabled()
  })

  it("recovers both exact commands after remount and confirms the snapshot with the server before offering delivery retry", async () => {
    const view = await prepareDelivery()
    mockQueue.mockRejectedValueOnce(new Error("Connection lost after submission"))
    fireEvent.click(screen.getByRole("button", { name: "Queue secure delivery" }))
    await screen.findByText(/Connection lost after submission/)
    const originalStatement = mockCreate.mock.calls[0][0], originalDelivery = mockQueue.mock.calls[0][0]
    expect(sessionStorage.getItem(sessionStorage.key(0)!)).not.toContain("Verification-only-password")
    view.unmount()
    render(<CustomerStatementWorkflow organizationId="org-1" actorId="user-1" currency="XAF" customer={{ id: "customer-1", name: "Ada Retail", code: "C-001", email: "customer@example.test" }} locale="en" />)
    expect(screen.queryByText("STM-2026-001")).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Retry existing delivery request" })).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText("Confirm your current password"), { target: { value: "Verification-only-password" } })
    fireEvent.click(screen.getByRole("button", { name: "Retry existing statement request" }))
    await screen.findByText("STM-2026-001")
    expect(mockCreate.mock.calls[1][0]).toEqual(originalStatement)
    fireEvent.change(screen.getAllByLabelText("Confirm your current password")[1], { target: { value: "Verification-only-password" } })
    fireEvent.click(screen.getByRole("button", { name: "Retry existing delivery request" }))
    await waitFor(() => expect(mockQueue).toHaveBeenCalledTimes(2))
    expect(mockQueue.mock.calls[1][0]).toEqual(originalDelivery)
  })

  it("requires an explicit new delivery and fresh consent to create a new command after confirmation", async () => {
    await prepareDelivery()
    fireEvent.click(screen.getByRole("button", { name: "Queue secure delivery" }))
    await screen.findByText("Secure statement delivery queued.")
    const original = mockQueue.mock.calls[0][0]
    fireEvent.click(screen.getByRole("button", { name: "Prepare another delivery" }))
    expect(screen.getByLabelText(/I confirm the customer explicitly requested or approved delivery/i)).not.toBeChecked()
    fireEvent.click(screen.getByLabelText(/I confirm the customer explicitly requested or approved delivery/i))
    fireEvent.change(screen.getAllByLabelText("Confirm your current password")[1], { target: { value: "Verification-only-password" } })
    fireEvent.click(screen.getByRole("button", { name: "Queue secure delivery" }))
    await waitFor(() => expect(mockQueue).toHaveBeenCalledTimes(2))
    expect(mockQueue.mock.calls[1][0].idempotencyKey).not.toBe(original.idempotencyKey)
  })

  it("does not submit delivery when its recovery record cannot be saved", async () => {
    await prepareDelivery()
    const write = jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("Unavailable", "QuotaExceededError") })
    try {
      fireEvent.click(screen.getByRole("button", { name: "Queue secure delivery" }))
      await screen.findByText(/Could not retain this request for safe retry/)
      expect(mockQueue).not.toHaveBeenCalled()
      expect(screen.getByLabelText("Destination")).toHaveValue("customer@example.test")
      expect(screen.getByLabelText("Destination")).toBeEnabled()
    } finally { write.mockRestore() }
  })

  it("allows correction after a definitive first-attempt validation rejection", async () => {
    await prepareDelivery()
    mockQueue.mockResolvedValueOnce({ success: false, data: null, code: "BUSINESS_RULE_VIOLATION", error: "Statement email destination is invalid", status: 422 })
    fireEvent.click(screen.getByRole("button", { name: "Queue secure delivery" }))
    await screen.findByText("Statement email destination is invalid")
    expect(screen.getByLabelText("Destination")).toBeEnabled()
    expect(screen.getByRole("button", { name: "Queue secure delivery" })).toBeEnabled()
  })

  it("creates an immutable snapshot and queues a consent-hashed delivery", async () => {
    render(
      <CustomerStatementWorkflow
        organizationId="org-1"
        actorId="user-1"
        currency="XAF"
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
        organizationId="org-1"
        actorId="user-1"
        currency="XAF"
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
  it("rejects an inverted statement period before fresh authentication", async () => {
    render(
      <CustomerStatementWorkflow
        organizationId="org-1"
        actorId="user-1"
        currency="XAF"
        customer={{
          id: "customer-1",
          name: "Ada Retail",
          code: "C-001",
          email: "customer@example.test",
        }}
        locale="en"
      />,
    )

    const startInput = screen.getByLabelText<HTMLInputElement>("Period start")
    const endInput = screen.getByLabelText<HTMLInputElement>("Period end")
    fireEvent.change(startInput, { target: { value: "2026-08-10" } })
    fireEvent.change(endInput, { target: { value: "2026-08-01" } })
    expect(startInput).toHaveValue("2026-08-10")
    expect(endInput).toHaveValue("2026-08-01")
    fireEvent.change(screen.getByLabelText("Confirm your current password"), {
      target: { value: "fresh-auth-password" },
    })

    fireEvent.click(
      screen.getByRole("button", { name: "Generate immutable statement" }),
    )

    expect(
      await screen.findByText(
        "Choose a valid period whose end is on or after its start.",
      ),
    ).toBeInTheDocument()
    expect(mockStepUp).not.toHaveBeenCalled()
    expect(mockCreate).not.toHaveBeenCalled()
  })
})
