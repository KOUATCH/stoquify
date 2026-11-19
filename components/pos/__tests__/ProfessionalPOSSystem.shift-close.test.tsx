import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { readPendingSale, savePendingSale } from "@/lib/pos/pending-sale"
import { assertNoLocalOfflineWork } from "@/lib/pos/offline-local-queue"
jest.mock("@/lib/pos/offline-local-queue", () => ({ assertNoLocalOfflineWork: jest.fn().mockResolvedValue(undefined) }))
jest.mock("@/components/pos/offline/LocalOfflineRecovery", () => ({
  LocalOfflineRecovery: () => <div data-testid="local-offline-recovery" />,
  localOfflineCopy: { en: { closeBlocked: "Local offline evidence blocks shift close" }, fr: { closeBlocked: "Preuves hors ligne" } },
}))
const mockHasPermission = jest.fn((_permission: string) => false)
const mockWhatsAppCapability = jest.fn()
const mockWhatsAppQueue = jest.fn()
const mockWhatsAppStatus = jest.fn()
jest.mock("@/hooks/usePermissions", () => ({ usePermissions: () => ({ user: { id: "cashier-1" }, organizationId: "org-1", hasPermission: mockHasPermission }) }))
jest.mock("@/actions/pos/whatsapp-receipt.actions", () => ({
  getPOSWhatsAppReceiptCapabilityAction: () => mockWhatsAppCapability(),
  getPOSWhatsAppReceiptStatusAction: (input: unknown) => mockWhatsAppStatus(input),
  queuePOSWhatsAppReceiptAction: (input: unknown) => mockWhatsAppQueue(input),
}))
beforeEach(() => {
  mockHasPermission.mockReset().mockReturnValue(false)
  mockWhatsAppCapability.mockReset().mockResolvedValue({ success: true, data: { available: false } })
  mockWhatsAppQueue.mockReset()
  mockWhatsAppStatus.mockReset()
})
jest.mock("@/hooks/posHooks/usePOSCheckoutLifecycle", () => ({ usePOSCheckoutLifecycle: jest.fn(() => ({
  ready: true, busy: false, leaseId: "00000000-0000-4000-8000-000000000001", error: null, snapshot: null,
  acceptedCartId: jest.requireMock("@/hooks/posHooks/usePosOperations").useActivePOSCart()?.data?.data?.id ?? null,
  acceptCart: jest.fn(), refresh: jest.fn(), command: jest.fn().mockResolvedValue({ activeCartId: "sale-1" }),
})) }))
jest.mock("@/actions/pos/checkout.actions", () => ({ retainLegacyPOSCheckoutAction: jest.fn().mockResolvedValue({ success: true, data: null }) }))
jest.mock("@/components/pos/POSReturns", () => ({ POSReturns: () => null }))
// Business-state regressions are independent of viewport presentation. The real
// shell's focus trap, breakpoint behavior and summary are covered separately.
jest.mock("@/components/pos/POSCheckoutShell", () => ({
  POSCheckoutShell: ({ children, open, onOpenChange }: {
    children: React.ReactNode; open: boolean; onOpenChange: (open: boolean) => void
  }) => <section data-testid="checkout-presentation" data-open={String(open)}>
    <button type="button" onClick={() => onOpenChange(!open)}>Toggle checkout presentation</button>
    {children}
  </section>,
}))

const mockNotifications = {
  warning: jest.fn(),
  info: jest.fn(() => "notification-1"),
  removeNotification: jest.fn(),
  error: jest.fn(),
  success: jest.fn(),
}

jest.mock("lucide-react", () => {
  const Icon = (props: Record<string, unknown>) => <svg {...props} />
  return new Proxy({}, { get: () => Icon })
})

jest.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (key: string) => key,
}))

jest.mock("@/components/notifications/NotificationProvider", () => ({
  useNotifications: () => mockNotifications,
}))

jest.mock("@/components/pos/ReceiptTokenHistoryPanel", () => ({
  ReceiptTokenHistoryPanel: () => <div data-testid="receipt-token-history-panel" />,
}))

jest.mock("@/components/pos/ReceiptTokenControlStrip", () => ({
  ReceiptTokenControlStrip: () => <div data-testid="receipt-token-control-strip" />,
}))

jest.mock("@/components/pos/offline/OfflineSyncStatusStrip", () => ({
  OfflineSyncStatusStrip: () => <div data-testid="offline-sync-status" />,
}))

jest.mock("@/hooks/posHooks/usePosOperations", () => ({
  useActivePOSCart: jest.fn(),
  useActivePOSShift: jest.fn(),
  useAddPOSCartLine: jest.fn(),
  useClosePOSShift: jest.fn(),
  useCommitPOSSale: jest.fn(),
  usePOSSaleCommitStatus: jest.fn(),
  useCurrentUserPOSShift: jest.fn(),
  useOpenPOSShift: jest.fn(),
  usePOSCatalog: jest.fn(),
  usePOSCustomers: jest.fn(),
  usePOSLocations: jest.fn(),
  usePOSTerminals: jest.fn(),
  usePublicReceiptAccessTokens: jest.fn(),
  usePublicReceiptSalesSearch: jest.fn(),
  usePublicReceiptTokenManagementCapability: jest.fn(),
  useRemovePOSCartLine: jest.fn(),
  useRevokePublicReceiptAccessToken: jest.fn(),
  useUpdatePOSCartLine: jest.fn(),
}))

import * as posHooks from "@/hooks/posHooks/usePosOperations"
import { usePOSCheckoutLifecycle } from "@/hooks/posHooks/usePOSCheckoutLifecycle"
import ProfessionalPOSSystem from "../ProfessionalPOSSystem"

const mockHooks = posHooks as jest.Mocked<typeof posHooks>

function actionSuccess<T>(data: T) {
  return { success: true, data, error: null, status: 200 }
}

function mutationState(mutateAsync = jest.fn()) {
  return {
    isPending: false,
    variables: undefined,
    mutateAsync,
  }
}

function shiftFixture(expectedBalance: number) {
  return {
    id: "session-1",
    sessionNumber: "SHIFT-0001",
    status: "ACTIVE",
    startTime: "2026-07-19T08:00:00.000Z",
    terminalId: "terminal-1",
    terminalName: "Till 1",
    terminalNumber: "T01",
    locationId: "location-1",
    locationName: "Main shop",
    cashierName: "Cashier One",
    openingBalance: 0,
    expectedBalance,
    totalSales: 100,
    totalTax: 0,
    totalDiscount: 0,
    transactionCount: 1,
    cashTotal: 100,
    cardTotal: 0,
    mobileMoneyTotal: 0,
    bankTransferTotal: 0,
    creditTotal: 0,
    cashDrawer: {
      id: "drawer-1",
      currentBalance: expectedBalance,
      expectedBalance,
      isOpen: true,
    },
  }
}

function setupHooks(expectedBalance: number, closeResponse: unknown) {
  const closeMutateAsync = jest.fn().mockResolvedValue(closeResponse)

  mockHooks.usePOSLocations.mockReturnValue({ data: actionSuccess([]) } as never)
  mockHooks.usePOSTerminals.mockReturnValue({ data: actionSuccess([]) } as never)
  mockHooks.useCurrentUserPOSShift.mockReturnValue({ data: actionSuccess(shiftFixture(expectedBalance)) } as never)
  mockHooks.useActivePOSShift.mockReturnValue({ data: actionSuccess(shiftFixture(expectedBalance)) } as never)
  mockHooks.usePOSCustomers.mockReturnValue({ data: actionSuccess({ customers: [], total: 0 }) } as never)
  mockHooks.usePOSCatalog.mockReturnValue({ data: actionSuccess({ categories: [], items: [] }) } as never)
  mockHooks.useActivePOSCart.mockReturnValue({ data: actionSuccess(null) } as never)
  mockHooks.useOpenPOSShift.mockReturnValue(mutationState() as never)
  mockHooks.useClosePOSShift.mockReturnValue(mutationState(closeMutateAsync) as never)
  mockHooks.useAddPOSCartLine.mockReturnValue(mutationState() as never)
  mockHooks.useUpdatePOSCartLine.mockReturnValue(mutationState() as never)
  mockHooks.useRemovePOSCartLine.mockReturnValue(mutationState() as never)
  mockHooks.useCommitPOSSale.mockReturnValue(mutationState() as never)
  mockHooks.usePOSSaleCommitStatus.mockReturnValue(mutationState() as never)
  mockHooks.useRevokePublicReceiptAccessToken.mockReturnValue(mutationState() as never)
  mockHooks.usePublicReceiptAccessTokens.mockReturnValue({ data: actionSuccess([]), isFetching: false } as never)
  mockHooks.usePublicReceiptSalesSearch.mockReturnValue({ data: actionSuccess([]), isFetching: false } as never)
  mockHooks.usePublicReceiptTokenManagementCapability.mockReturnValue({
    data: actionSuccess({
      canManageReceiptTokens: false,
      moduleSlug: "pos",
      permission: "pos.receipts.revoke",
    }),
    isLoading: false,
    isFetching: false,
    isError: false,
    error: null,
  } as never)

  return closeMutateAsync
}

function openCloseDialog() {
  fireEvent.click(screen.getByRole("button", { name: "smart.endShift" }))
  return screen.getByRole("dialog")
}

function expandShiftDetails() {
  const setup = screen.getByTestId("pos-register-setup") as HTMLDetailsElement
  setup.open = true
  const details = screen.getByTestId("pos-shift-details")
  const summary = details.querySelector("summary")
  if (!summary) throw new Error("Shift details must expose a native disclosure")
  fireEvent.click(summary)
  expect(details).toHaveAttribute("open")
}

function expandPaymentOptions() {
  const details = screen.getByTestId("pos-more-payment-options")
  const summary = details.querySelector("summary")
  if (!summary) throw new Error("Payment options must expose a native disclosure")
  fireEvent.click(summary)
  expect(details).toHaveAttribute("open")
}

describe("ProfessionalPOSSystem local customer credit", () => {
  beforeEach(() => { jest.clearAllMocks(); sessionStorage.clear() })
  afterEach(() => sessionStorage.clear())

  function setupCreditCart() {
    setupHooks(100, actionSuccess(null))
    mockHooks.usePOSLocations.mockReturnValue({ data: actionSuccess([{
      id: "location-1", name: "Main shop", code: "MAIN", isDefault: true,
      organization: { name: "Stoquify", currency: "XAF", defaultLocale: "EN" },
    }]) } as never)
    mockHooks.usePOSTerminals.mockReturnValue({ data: actionSuccess([{
      id: "terminal-1", locationId: "location-1", terminalNumber: "T01", name: "Till 1", currentSessionId: "session-1",
    }]) } as never)
    const customer = { id: "credit-customer", name: "Credit customer", code: "CREDIT", isActive: true, totalOrders: 0, totalRevenue: 0, creditLimit: 100 }
    mockHooks.usePOSCustomers.mockReturnValue({ data: actionSuccess({ customers: [customer], total: 1 }) } as never)
    mockHooks.useActivePOSCart.mockReturnValue({ data: actionSuccess({
      id: "credit-sale", revision: "c".repeat(64), status: "DRAFT", locationId: "location-1", terminalId: "terminal-1", sessionId: "session-1",
      customer: null, subtotal: 10, discount: 0, taxAmount: 0, total: 10,
      lines: [{ id: "credit-line", itemId: "item-1", nameEn: "Credit item", quantity: 1, unitPrice: 10, lineTotal: 10,
        stock: { trackInventory: true, quantityOnHand: 5, quantityAvailable: 5 } }],
    }) } as never)
    const commit = jest.fn().mockRejectedValue(new TypeError("Synthetic response lost"))
    mockHooks.useCommitPOSSale.mockReturnValue(mutationState(commit) as never)
    mockHooks.usePOSSaleCommitStatus.mockReturnValue(mutationState(jest.fn().mockResolvedValue(actionSuccess({ kind: "PENDING" }))) as never)
    return commit
  }

  it("offers only cash and local credit while provider, store-credit and receipt delivery stay unavailable", () => {
    setupCreditCart()
    render(<ProfessionalPOSSystem />)
    const method = within(screen.getByTestId("pos-tender-controls")).getByRole("combobox", { name: "tender.method" })
    expect(within(method).getAllByRole("option").map(option => option.getAttribute("value"))).toEqual(["CASH", "ON_ACCOUNT"])
    expandPaymentOptions()
    expect(screen.getByTestId("pos-receipt-availability")).toHaveTextContent("receipt.deliveryRestricted")
    for (const channel of ["NONE", "PRINT", "EMAIL", "SMS", "WHATSAPP"]) {
      expect(screen.queryByRole("button", { name: `receipt.channels.${channel}` })).not.toBeInTheDocument()
    }
    expect(screen.queryByLabelText("tender.providerEvidence")).not.toBeInTheDocument()
  })

  it("blocks an on-account charge until the cashier selects a customer", async () => {
    const commit = setupCreditCart()
    render(<ProfessionalPOSSystem />)
    const tender = within(screen.getByTestId("pos-tender-controls"))
    fireEvent.change(tender.getByRole("combobox", { name: "tender.method" }), { target: { value: "ON_ACCOUNT" } })
    fireEvent.change(tender.getByRole("spinbutton", { name: "tender.amount" }), { target: { value: "10" } })
    const charge = screen.getByRole("button", { name: "charge.cta" })
    expect(charge).toBeDisabled()
    expect(screen.getAllByText("tender.customerRequired").length).toBeGreaterThan(0)
    fireEvent.click(charge)
    expect(commit).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole("button", { name: "customers.choose" }))
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: /Credit customer/ }))
    await waitFor(() => expect(charge).toBeEnabled())
    expect(commit).not.toHaveBeenCalled()
  })

  it("queues an opted-in receipt only after confirmation and retries a lost queue response without charging again", async () => {
    const commit = setupCreditCart()
    mockHasPermission.mockImplementation(permission => permission === "pos.use")
    mockWhatsAppCapability.mockResolvedValue(actionSuccess({ available: true }))
    mockWhatsAppQueue.mockRejectedValueOnce(new TypeError("Synthetic queue response lost"))
      .mockResolvedValueOnce(actionSuccess({ status: "QUEUED", reference: "receipt-queue-1" }))
    mockWhatsAppStatus.mockResolvedValue(actionSuccess({ status: "ACCEPTED", reference: "receipt-queue-1" }))
    let confirmPayment: (() => void) | undefined
    commit.mockImplementation(request => new Promise(resolve => {
      confirmPayment = () => resolve(actionSuccess({
        clientCommitId: request.clientCommitId, saleId: request.salesOrderId, orderNumber: "SYNTHETIC-SALE",
        status: "COMPLETED", paymentStatus: "PAID", total: 10, changeDue: 0, delivery: null,
      }))
    }))
    render(<ProfessionalPOSSystem />)
    expandPaymentOptions()
    fireEvent.click(await screen.findByRole("checkbox", { name: "receipt.whatsApp.select" }))
    const charge = screen.getByRole("button", { name: "charge.cta" })
    expect(charge).toBeDisabled()
    const number = "+12025550104"
    fireEvent.change(screen.getByLabelText("receipt.whatsApp.number"), { target: { value: number } })
    expect(charge).toBeDisabled()
    fireEvent.click(screen.getByRole("checkbox", { name: "receipt.whatsAppConsent" }))
    await waitFor(() => expect(charge).toBeEnabled())
    fireEvent.click(charge)
    await waitFor(() => expect(commit).toHaveBeenCalledTimes(1))
    expect(mockWhatsAppQueue).not.toHaveBeenCalled()
    expect(JSON.stringify(readPendingSale(sessionStorage, "org-1", "cashier-1"))).not.toContain(number)
    expect(commit.mock.calls[0][0].receipt).toEqual({ channel: "NONE", locale: "EN" })

    confirmPayment?.()
    await screen.findByText("receipt.whatsApp.status.REQUEST_UNCONFIRMED")
    fireEvent.click(screen.getByRole("button", { name: "receipt.whatsApp.retryRequest" }))
    await screen.findByText("receipt.whatsApp.status.QUEUED")
    expect(mockWhatsAppQueue).toHaveBeenCalledTimes(2)
    expect(mockWhatsAppQueue.mock.calls[0][0]).toEqual({
      salesOrderId: "credit-sale", locationId: "location-1", destination: number, locale: "EN", whatsAppCustomerOptInConfirmed: true,
    })
    expect(mockWhatsAppQueue.mock.calls[1]).toEqual(mockWhatsAppQueue.mock.calls[0])
    expect(commit).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole("button", { name: "receipt.whatsApp.checkStatus" }))
    await screen.findByText("receipt.whatsApp.status.ACCEPTED")
    expect(mockWhatsAppStatus).toHaveBeenCalledWith({ salesOrderId: "credit-sale", locationId: "location-1" })
  })

  it("submits and retains the exact cash/credit split and existing cart identity when the response is uncertain", async () => {
    const commit = setupCreditCart()
    render(<ProfessionalPOSSystem />)
    fireEvent.click(screen.getByRole("button", { name: "customers.choose" }))
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: /Credit customer/ }))
    const tender = within(screen.getByTestId("pos-tender-controls"))
    fireEvent.change(tender.getByRole("spinbutton", { name: "tender.amount" }), { target: { value: "6" } })
    fireEvent.click(tender.getByRole("button", { name: "tender.addTender" }))
    fireEvent.change(tender.getAllByRole("combobox", { name: "tender.method" })[1], { target: { value: "ON_ACCOUNT" } })
    fireEvent.change(tender.getAllByRole("spinbutton", { name: "tender.amount" })[1], { target: { value: "4" } })
    const summary = within(screen.getByTestId("pos-charge-summary"))
    expect(summary.getByText("Payment preview").parentElement).toHaveTextContent(/FCFA\s*6/)
    expect(summary.queryByText("tender.paid")).not.toBeInTheDocument()
    expect(summary.getByText("tender.methods.ON_ACCOUNT").parentElement).toHaveTextContent(/FCFA\s*4/)
    expect(summary.getByText("Uncovered").parentElement).toHaveTextContent(/FCFA\s*0/)
    expect(summary.queryByText("tender.due")).not.toBeInTheDocument()
    const charge = screen.getByRole("button", { name: "charge.cta" })
    await waitFor(() => expect(charge).toBeEnabled())
    fireEvent.click(charge)
    await waitFor(() => expect(commit).toHaveBeenCalledTimes(1))
    const expected = {
      salesOrderId: "credit-sale", expectedCartRevision: "c".repeat(64), customerId: "credit-customer",
      locationId: "location-1", terminalId: "terminal-1", sessionId: "session-1",
      tenders: [{ method: "CASH", amount: 6 }, { method: "ON_ACCOUNT", amount: 4 }],
      receipt: { channel: "NONE", locale: "EN" },
    }
    expect(commit).toHaveBeenCalledWith(expect.objectContaining({ ...expected, checkoutLeaseId: "00000000-0000-4000-8000-000000000001" }))
    await waitFor(() => expect(charge).toBeDisabled())
    const retained = readPendingSale(sessionStorage, "org-1", "cashier-1")
    expect(retained?.request).toMatchObject(expected)
    expect(retained?.request.clientCommitId).toBe(commit.mock.calls[0][0].clientCommitId)
    expect(mockNotifications.success).not.toHaveBeenCalled()
  })

  it("keeps a denied checkout visible beside Charge and preserves the retained attempt", async () => {
    const commit = setupCreditCart()
    commit.mockResolvedValue({ success: false, data: null, error: "Forbidden", status: 403, code: "FORBIDDEN" })
    render(<ProfessionalPOSSystem />)
    const footer = screen.getByTestId("pos-charge-footer")
    const charge = within(footer).getByRole("button", { name: "charge.cta" })
    await waitFor(() => expect(charge).toBeEnabled())
    fireEvent.click(charge)

    const denial = await screen.findByTestId("pos-sale-access-error")
    expect(denial).toHaveAttribute("role", "alert")
    expect(denial).toHaveTextContent("notifications.saleAccessUnavailable")
    expect(denial).toBeVisible()
    expect(footer).toContainElement(denial)
    expect(denial.closest("details")).toBeNull()
    expect(commit).toHaveBeenCalledTimes(1)
    expect(readPendingSale(sessionStorage, "org-1", "cashier-1")?.request.clientCommitId)
      .toBe(commit.mock.calls[0][0].clientCommitId)
    expect(mockNotifications.success).not.toHaveBeenCalled()
  })
})

describe("POS search keyboard scope", () => {
  beforeEach(() => { jest.clearAllMocks(); sessionStorage.clear(); setupHooks(100, actionSuccess(null)) })

  it("opens today’s activity directly with the current cashier's register and shift", () => {
    mockHooks.usePOSTerminals.mockReturnValue({ data: actionSuccess([{
      id: "terminal-1", locationId: "location-1", terminalNumber: "T01", name: "Till 1", currentSessionId: "session-1",
    }]) } as never)
    render(<ProfessionalPOSSystem />)
    const href = screen.getByRole("link", { name: "shell.todayActivity" }).getAttribute("href")
    const url = new URL(href ?? "", "http://localhost")
    expect(url.pathname).toBe("/en/dashboard/pos/activity")
    expect(Object.fromEntries(url.searchParams)).toEqual({ locationId: "location-1", terminalId: "terminal-1", sessionId: "session-1" })
  })

  it("collapses routine setup and hardware details while keeping register context and search available", () => {
    render(<ProfessionalPOSSystem />)
    const setup = screen.getByTestId("pos-register-setup")
    expect(setup).not.toHaveAttribute("open")
    expect(screen.getByTestId("pos-device-status")).not.toHaveAttribute("open")
    expect(screen.getByRole("textbox", { name: "search.placeholder" })).toBeVisible()
    expect(within(setup).getByText("setup.title", { selector: "summary span" })).toBeVisible()
    expect(screen.queryByRole("button", { name: "smart.exactCash" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "smart.managerOverride" })).not.toBeInTheDocument()
  })

  it("offers an empty-cart search action without changing or submitting a sale", () => {
    render(<ProfessionalPOSSystem />)
    const footer = within(screen.getByTestId("pos-charge-footer"))
    fireEvent.click(footer.getByRole("button", { name: "Find an item" }))
    expect(screen.getByRole("textbox", { name: "search.placeholder" })).toHaveFocus()
    expect(footer.getByRole("button", { name: "charge.cta" })).toBeDisabled()
    expect(mockHooks.useCommitPOSSale.mock.results.at(-1)?.value.mutateAsync).not.toHaveBeenCalled()
  })

  it("keeps Charge present but disabled for an empty cart", () => {
    render(<ProfessionalPOSSystem />)
    const charge = within(screen.getByTestId("pos-charge-footer")).getByRole("button", { name: "charge.cta" })
    expect(charge).toBeDisabled()
    fireEvent.click(charge)
    expect(mockHooks.useCommitPOSSale.mock.results.at(-1)?.value.mutateAsync).not.toHaveBeenCalled()
  })

  it("keeps the primary amount, exact cash and transaction total outside cart scrolling without implying confirmed payment", () => {
    mockHooks.useActivePOSCart.mockReturnValue({ data: actionSuccess({
      id: "payment-access-cart", revision: "e".repeat(64), status: "DRAFT",
      locationId: "location-1", terminalId: "terminal-1", sessionId: "session-1",
      customer: null, subtotal: 100, discount: 0, taxAmount: 0, total: 100,
      lines: [{ id: "payment-access-line", itemId: "item-1", sku: "ACCESS", nameEn: "Payment access item",
        quantity: 1, unitPrice: 100, lineTotal: 100, stock: { trackInventory: true, quantityOnHand: 10, quantityAvailable: 10 } }],
    }) } as never)
    render(<ProfessionalPOSSystem />)
    const footer = screen.getByTestId("pos-charge-footer")
    const scrollRegion = screen.getByTestId("pos-checkout-scroll-region")
    const amount = within(footer).getByRole("spinbutton", { name: "tender.amount" })
    expect(scrollRegion).not.toContainElement(amount)
    expect(footer).toContainElement(screen.getByTestId("pos-tender-controls"))
    expect(screen.getAllByRole("spinbutton", { name: "tender.amount" })).toHaveLength(1)
    expect(within(footer).getByRole("button", { name: "tender.exact" })).toBeVisible()
    expect(within(footer).getByText("totals.total")).toBeVisible()
    expect(within(footer).queryByText("Payment preview")).not.toBeInTheDocument()
    expect(within(footer).queryByText("tender.paid")).not.toBeInTheDocument()
    expect(mockHooks.useCommitPOSSale.mock.results.at(-1)?.value.mutateAsync).not.toHaveBeenCalled()
  })

  it("opens checkout and focuses tender from F8 without submitting", async () => {
    render(<ProfessionalPOSSystem />)
    const search = screen.getByRole("textbox", { name: "search.placeholder" })
    search.focus()
    fireEvent.keyDown(search, { key: "F8" })
    await waitFor(() => expect(screen.getByTestId("checkout-presentation")).toHaveAttribute("data-open", "true"))
    await waitFor(() => expect(screen.getByRole("spinbutton", { name: "tender.amount" })).toHaveFocus())
    expect(mockHooks.useCommitPOSSale.mock.results.at(-1)?.value.mutateAsync).not.toHaveBeenCalled()
  })

  it("preserves cart quantity and tender drafts while checkout presentation opens and closes", () => {
    mockHooks.useActivePOSCart.mockReturnValue({ data: actionSuccess({
      id: "presentation-cart", revision: "d".repeat(64), status: "DRAFT",
      locationId: "location-1", terminalId: "terminal-1", sessionId: "session-1",
      customer: null, subtotal: 100, discount: 0, taxAmount: 0, total: 100,
      lines: [{ id: "presentation-line", itemId: "item-1", sku: "OWNED", nameEn: "Owned item",
        quantity: 1, unitPrice: 100, lineTotal: 100, stock: { trackInventory: true, quantityOnHand: 10, quantityAvailable: 10 } }],
    }) } as never)
    render(<ProfessionalPOSSystem />)
    const quantity = screen.getByRole("spinbutton", { name: "cart.quantityFor" })
    const tender = screen.getByRole("spinbutton", { name: "tender.amount" })
    fireEvent.change(quantity, { target: { value: "3" } })
    fireEvent.change(tender, { target: { value: "150" } })
    const toggle = screen.getByRole("button", { name: "Toggle checkout presentation" })
    fireEvent.click(toggle)
    expect(screen.getByTestId("checkout-presentation")).toHaveAttribute("data-open", "true")
    fireEvent.click(toggle)
    expect(screen.getByTestId("checkout-presentation")).toHaveAttribute("data-open", "false")
    expect(quantity).toHaveValue(3)
    expect(tender).toHaveValue(150)
    expect(screen.getAllByTestId("pos-cart-line")).toHaveLength(1)
    expect(screen.getAllByTestId("pos-charge-footer")).toHaveLength(1)
    expect(mockHooks.useCommitPOSSale.mock.results.at(-1)?.value.mutateAsync).not.toHaveBeenCalled()
  })

  it("keeps the search input and its focus while catalogue results load", () => {
    const { rerender } = render(<ProfessionalPOSSystem />)
    const search = screen.getByRole("textbox", { name: "search.placeholder" })
    search.focus()
    fireEvent.change(search, { target: { value: "SKU-1" } })
    mockHooks.usePOSCatalog.mockReturnValue({ data: undefined, isLoading: true } as never)
    rerender(<ProfessionalPOSSystem />)
    expect(screen.getByRole("textbox", { name: "search.placeholder" })).toBe(search)
    expect(search).toHaveValue("SKU-1")
    expect(search).toHaveFocus()
    expect(screen.queryByText("readState.loadingTitle")).not.toBeInTheDocument()
  })

  it("labels search, clears it explicitly and leaves browser shortcuts alone", () => {
    render(<ProfessionalPOSSystem />)
    const search = screen.getByRole("textbox", { name: "search.placeholder" })
    fireEvent.change(search, { target: { value: "SKU-1" } })
    fireEvent.click(screen.getByRole("button", { name: "search.clear" }))
    expect(search).toHaveValue("")
    expect(search).toHaveFocus()
    const browserShortcut = new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true, cancelable: true })
    window.dispatchEvent(browserShortcut)
    expect(browserShortcut.defaultPrevented).toBe(false)
  })

  it("returns focus to the scanner after a customer dialog opened with F4 closes with Escape", async () => {
    render(<ProfessionalPOSSystem />)
    const search = screen.getByRole("textbox", { name: "search.placeholder" })
    search.focus()
    fireEvent.keyDown(search, { key: "F4" })
    const dialog = await screen.findByRole("dialog")
    const customerSearch = within(dialog).getByPlaceholderText("customers.searchPlaceholder")
    await waitFor(() => expect(customerSearch).toHaveFocus())

    fireEvent.keyDown(customerSearch, { key: "Escape", code: "Escape", keyCode: 27 })

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    await waitFor(() => expect(search).toHaveFocus())
    expect(mockHooks.useCommitPOSSale.mock.results.at(-1)?.value.mutateAsync).not.toHaveBeenCalled()
  })

  it("returns focus to the invoking product Details button after closing its dialog", async () => {
    mockHooks.usePOSCatalog.mockReturnValue({
      data: actionSuccess({
        categories: [],
        items: [{
          id: "focus-product", sku: "FOCUS-COFFEE", barcode: "123456789",
          nameEn: "Coffee", nameFr: "Cafe", thumbnail: null, sellingPrice: 100,
          trackInventory: true, category: null, brand: null,
          stock: { quantityOnHand: 10, quantityAvailable: 10, reorderPoint: 2, status: "available" },
        }],
      }),
      isLoading: false,
    } as never)
    render(<ProfessionalPOSSystem />)
    const details = await screen.findByRole("button", { name: "catalog.details — Coffee" })
    details.focus()
    expect(details).toHaveFocus()

    fireEvent.click(details)
    const dialog = await screen.findByRole("dialog", { name: "Coffee" })
    expect(within(dialog).getByText("catalog.detailDescription")).toBeVisible()
    fireEvent.click(within(dialog).getByRole("button", { name: "Close", exact: true }))

    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Coffee" })).not.toBeInTheDocument())
    await waitFor(() => expect(details).toHaveFocus())
    expect(mockHooks.useAddPOSCartLine.mock.results.at(-1)?.value.mutateAsync).not.toHaveBeenCalled()
    expect(mockHooks.useCommitPOSSale.mock.results.at(-1)?.value.mutateAsync).not.toHaveBeenCalled()
  })

  it("does not clear catalog search or move focus to tender from an open dialog", () => {
    render(<ProfessionalPOSSystem />)
    const search = screen.getByRole("textbox", { name: "search.placeholder" })
    fireEvent.change(search, { target: { value: "SKU-1" } })
    const dialog = openCloseDialog()
    const input = within(dialog).getByRole("spinbutton", { name: "shift.countedCash" })
    input.focus()
    fireEvent.keyDown(input, { key: "F8" })
    expect(input).toHaveFocus()
    fireEvent.keyDown(input, { key: "Escape" })
    expect(search).toHaveValue("SKU-1")
  })
})

describe("ProfessionalPOSSystem resume at checkout", () => {
  const lifecycleMock = jest.mocked(usePOSCheckoutLifecycle)
  const defaultLifecycle = lifecycleMock.getMockImplementation()!

  beforeEach(() => {
    jest.clearAllMocks()
    sessionStorage.clear()
  })

  afterEach(() => {
    lifecycleMock.mockImplementation(defaultLifecycle)
    sessionStorage.clear()
  })

  function setupUnfinishedCart() {
    setupHooks(0, actionSuccess({ terminalId: "terminal-1" }))
    mockHooks.useActivePOSCart.mockReturnValue({ data: actionSuccess({
      id: "saved-cart", revision: "a".repeat(64), total: 100, subtotal: 100, taxAmount: 0, discount: 0,
      lines: [{ id: "line-1", itemId: "item-1", nameEn: "Coffee", quantity: 1, unitPrice: 100, lineTotal: 100 }],
    }) } as never)
    const lifecycle = { ...defaultLifecycle({ locationId: "location-1", terminalId: "terminal-1" }), acceptedCartId: null as string | null, command: jest.fn() }
    lifecycleMock.mockReturnValue(lifecycle)
    const commit = jest.fn()
    mockHooks.useCommitPOSSale.mockReturnValue(mutationState(commit) as never)
    return { lifecycle, commit }
  }

  it("offers Resume in register status and waits for cart validation before enabling Charge", async () => {
    const { lifecycle, commit } = setupUnfinishedCart()
    let finishResume!: (value: { activeCartId: string }) => void
    lifecycle.command.mockImplementation(() => new Promise<{ activeCartId: string }>(resolve => { finishResume = resolve }))
    const view = render(<ProfessionalPOSSystem />)
    const footer = within(screen.getByTestId("pos-charge-footer"))
    const charge = footer.getByRole("button", { name: "charge.cta" })
    const registerStatus = within(screen.getByRole("group", { name: "lifecycle.title" }))
    const resume = registerStatus.getByRole("button", { name: "lifecycle.resume" })
    expect(charge).toBeDisabled()
    expect(charge).toHaveAccessibleDescription(/lifecycle\.resumeRequired.*Resume the existing cart.*View status/)
    expect(footer.getByText("lifecycle.resumeRequired", { exact: true })).toBeVisible()
    expect(registerStatus.getByText("lifecycle.resumeRequired")).toBeVisible()
    expect(footer.getByRole("button", { name: "View status" })).toBeEnabled()
    fireEvent.click(resume)
    expect(lifecycle.command).toHaveBeenCalledWith("RESUME", "saved-cart")
    expect(charge).toBeDisabled()
    lifecycle.busy = true
    view.rerender(<ProfessionalPOSSystem />)
    expect(resume).toBeDisabled()
    lifecycle.acceptedCartId = "saved-cart"
    lifecycle.busy = false
    finishResume({ activeCartId: "saved-cart" })
    await waitFor(() => expect(charge).toBeEnabled())
    expect(screen.queryByRole("button", { name: "lifecycle.resume" })).not.toBeInTheDocument()
    expect(commit).not.toHaveBeenCalled()
    expect(screen.getByTestId("pos-cart-line")).toHaveTextContent("Coffee")
  })

  it("keeps Charge disabled and the cart intact when resuming fails", async () => {
    const { lifecycle, commit } = setupUnfinishedCart()
    lifecycle.command.mockResolvedValue(null)
    render(<ProfessionalPOSSystem />)
    const footer = within(screen.getByTestId("pos-charge-footer"))
    fireEvent.click(within(screen.getByRole("group", { name: "lifecycle.title" })).getByRole("button", { name: "lifecycle.resume" }))
    await waitFor(() => expect(lifecycle.command).toHaveBeenCalledWith("RESUME", "saved-cart"))
    expect(footer.getByRole("button", { name: "charge.cta" })).toBeDisabled()
    expect(screen.getByTestId("pos-cart-line")).toHaveTextContent("Coffee")
    expect(commit).not.toHaveBeenCalled()
  })

  it("does not resume a cart before register ownership is verified", () => {
    const { lifecycle } = setupUnfinishedCart()
    lifecycle.ready = false
    render(<ProfessionalPOSSystem />)
    const footer = within(screen.getByTestId("pos-charge-footer"))
    expect(within(screen.getByRole("group", { name: "lifecycle.title" })).getByRole("button", { name: "lifecycle.resume" })).toBeDisabled()
    expect(footer.getByRole("button", { name: "charge.cta" })).toBeDisabled()
    expect(lifecycle.command).not.toHaveBeenCalled()
  })

  it.each(["POS_CHECKOUT_OWNED_ELSEWHERE", "POS_CHECKOUT_OFFLINE_PENDING"] as const)(
    "shows the actionable %s blocker beside disabled Charge without starting a lifecycle command or sale",
    async error => {
      const { lifecycle, commit } = setupUnfinishedCart()
      lifecycle.ready = false
      lifecycle.error = error
      render(<ProfessionalPOSSystem />)

      const footer = within(screen.getByTestId("pos-charge-footer"))
      const charge = footer.getByRole("button", { name: "charge.cta" })
      const message = `lifecycle.errors.${error}`
      await waitFor(() => expect(footer.getByText(message, { exact: true })).toBeVisible())
      expect(charge).toBeDisabled()
      expect(charge).toHaveAccessibleDescription(new RegExp(`${message}.*View status`))
      expect(footer.getByRole("button", { name: "View status" })).toBeEnabled()
      expect(screen.getByTestId("pos-cart-line")).toHaveTextContent("Coffee")
      expect(lifecycle.command).not.toHaveBeenCalled()
      expect(commit).not.toHaveBeenCalled()

      fireEvent.click(charge)
      expect(lifecycle.command).not.toHaveBeenCalled()
      expect(commit).not.toHaveBeenCalled()
    },
  )
})

describe("ProfessionalPOSSystem checkout recovery", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    sessionStorage.clear()
  })

  afterEach(() => sessionStorage.clear())

  function setupRecovery(kind: "CART_CHANGED" | "CART_REVIEW_REQUIRED" | "NOT_COMMITTED" | "NOT_FOUND" | "PENDING", failedRead = false, cartId = "sale-1") {
    setupHooks(100, actionSuccess({ terminalId: "terminal-1" }))
    const request = {
      clientCommitId: "pos:original-attempt", salesOrderId: "sale-1", expectedCartRevision: "a".repeat(64),
      locationId: "location-1", terminalId: "terminal-1", sessionId: "session-1",
      tenders: [{ method: "CASH" as const, amount: 100 }], receipt: { channel: "NONE" as const },
    }
    savePendingSale(sessionStorage, { version: 1, organizationId: "org-1", actorId: "cashier-1", request })
    const cart = {
      id: cartId, revision: "b".repeat(64), status: "DRAFT", locationId: "location-1", terminalId: "terminal-1", sessionId: "session-1",
      customer: null, subtotal: 100, discount: 0, taxAmount: 0, total: 100,
      lines: [{ id: "line-1", itemId: "item-1", nameEn: "Coffee", quantity: 1, unitPrice: 100, lineTotal: 100, stock: { trackInventory: true, quantityOnHand: 10 } }],
    }
    const refetch = jest.fn().mockResolvedValue({ data: actionSuccess(cart), isError: failedRead })
    mockHooks.useActivePOSCart.mockReturnValue({ data: actionSuccess(cart), refetch } as never)
    const recover = jest.fn().mockResolvedValue(actionSuccess({ kind }))
    mockHooks.usePOSSaleCommitStatus.mockReturnValue(mutationState(recover) as never)
    const commit = jest.fn().mockResolvedValue({ success: false, data: null, error: "Test response" })
    mockHooks.useCommitPOSSale.mockReturnValue(mutationState(commit) as never)
    return { request, refetch, recover, commit }
  }

  it.each(["NOT_FOUND", "CART_CHANGED", "CART_REVIEW_REQUIRED"] as const)("unlocks Charge only after a successful %s review and retains the original request identifier", async kind => {
    const { request, refetch, recover, commit } = setupRecovery(kind)
    render(<ProfessionalPOSSystem />)
    const charge = screen.getByRole("button", { name: "charge.cta" })
    const footer = screen.getByTestId("pos-charge-footer")
    expect(charge).toBeDisabled()
    expect(charge).toHaveAccessibleDescription("recovery.chargePaused")
    fireEvent.click(within(footer).getByRole("button", { name: "recovery.open" }))
    expect(screen.getByTestId("pos-commit-recovery")).toHaveFocus()
    fireEvent.click(screen.getByRole("button", { name: "recovery.check" }))
    const review = await screen.findByRole("button", { name: kind === "CART_CHANGED" ? "recovery.reviewChanged" : "recovery.reviewCurrent" })
    expect(recover).toHaveBeenCalledWith(expect.objectContaining(request))
    expect(charge).toBeDisabled()
    fireEvent.click(review)
    await waitFor(() => expect(charge).toBeEnabled())
    expect(refetch).toHaveBeenCalledTimes(1)
    expect(within(footer).queryByText("recovery.chargePaused")).not.toBeInTheDocument()
    const recovery = within(screen.getByTestId("pos-commit-recovery"))
    expect(recovery.getByRole("heading", { name: "recovery.reviewTitle" })).toBeInTheDocument()
    expect(recovery.getByText("recovery.reviewReady")).toBeInTheDocument()
    expect(recovery.queryByText("recovery.notFound")).not.toBeInTheDocument()
    expect(recovery.queryByText("recovery.explanation")).not.toBeInTheDocument()
    expect(recovery.queryByRole("button", { name: "recovery.retryOriginal" })).not.toBeInTheDocument()
    expect(recovery.queryByRole("button", { name: /recovery.review(Current|Changed)/ })).not.toBeInTheDocument()
    fireEvent.click(recovery.getByRole("button", { name: "recovery.continueCheckout" }))
    expect(footer).toHaveFocus()
    expect(commit).not.toHaveBeenCalled()
    expect(readPendingSale(sessionStorage, "org-1", "cashier-1")?.request.clientCommitId).toBe(request.clientCommitId)
    fireEvent.click(charge)
    await waitFor(() => expect(commit).toHaveBeenCalledWith(expect.objectContaining({
      clientCommitId: request.clientCommitId, salesOrderId: "sale-1", expectedCartRevision: "b".repeat(64),
    })))
    await screen.findByText("recovery.chargePaused")
  })

  it("requires another review after rechecking an unrecorded attempt", async () => {
    const { commit, recover } = setupRecovery("NOT_FOUND")
    render(<ProfessionalPOSSystem />)
    await waitFor(() => expect(recover).toHaveBeenCalled())
    await waitFor(() => expect(screen.getByTestId("pos-commit-recovery")).toHaveTextContent("recovery.notFound"))
    fireEvent.click(within(screen.getByTestId("pos-commit-recovery")).getByRole("button", { name: "recovery.reviewCurrent" }))
    await screen.findByText("recovery.reviewReady")
    fireEvent.click(screen.getByRole("button", { name: "recovery.check" }))
    await screen.findByText("recovery.notFound")
    expect(screen.queryByText("recovery.reviewReady")).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "recovery.continueCheckout" })).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "charge.cta" })).toBeDisabled()
    expect(commit).not.toHaveBeenCalled()
    expect(readPendingSale(sessionStorage, "org-1", "cashier-1")).not.toBeNull()
  })

  it("requires a fresh review after losing register ownership", async () => {
    const { commit } = setupRecovery("NOT_FOUND")
    const lifecycleMock = jest.mocked(usePOSCheckoutLifecycle)
    const implementation = lifecycleMock.getMockImplementation()!
    const lifecycle = { ...implementation({ locationId: "location-1", terminalId: "terminal-1" }) }
    lifecycleMock.mockReturnValue(lifecycle)
    try {
      const view = render(<ProfessionalPOSSystem />)
      fireEvent.click(await screen.findByRole("button", { name: "recovery.reviewCurrent" }))
      await screen.findByText("recovery.reviewReady")
      lifecycle.ready = false
      lifecycle.acceptedCartId = null
      view.rerender(<ProfessionalPOSSystem />)
      expect(screen.getByRole("button", { name: "charge.cta" })).toBeDisabled()
      lifecycle.ready = true
      view.rerender(<ProfessionalPOSSystem />)
      await screen.findByRole("button", { name: "recovery.reviewCurrent" })
      expect(screen.getByRole("button", { name: "charge.cta" })).toBeDisabled()
      expect(screen.queryByText("recovery.reviewReady")).not.toBeInTheDocument()
      expect(commit).not.toHaveBeenCalled()
      expect(readPendingSale(sessionStorage, "org-1", "cashier-1")).not.toBeNull()
    } finally { lifecycleMock.mockImplementation(implementation) }
  })

  it.each([
    { failedRead: true, cartId: "sale-1", message: "recovery.failed" },
    { failedRead: false, cartId: "another-cart", message: "recovery.cartMismatch" },
  ])("keeps Charge locked when cart review returns $message", async ({ failedRead, cartId, message }) => {
    const { commit } = setupRecovery("CART_CHANGED", failedRead, cartId)
    render(<ProfessionalPOSSystem />)
    fireEvent.click(screen.getByRole("button", { name: "recovery.check" }))
    fireEvent.click(await screen.findByRole("button", { name: "recovery.reviewChanged" }))
    expect(await screen.findByRole("alert")).toHaveTextContent(message)
    expect(screen.getByRole("button", { name: "charge.cta" })).toBeDisabled()
    expect(commit).not.toHaveBeenCalled()
    expect(readPendingSale(sessionStorage, "org-1", "cashier-1")).not.toBeNull()
  })

  it("automatically clears a verified obsolete attempt without submitting another sale", async () => {
    const { commit } = setupRecovery("NOT_COMMITTED", false, "current-cart")
    render(<ProfessionalPOSSystem />)
    expect(screen.getByRole("button", { name: "charge.cta" })).toBeDisabled()
    expect(screen.queryByRole("button", { name: "recovery.acknowledge" })).not.toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole("button", { name: "charge.cta" })).toBeEnabled())
    expect(screen.getByTestId("pos-cart-line")).toHaveTextContent("Coffee")
    expect(readPendingSale(sessionStorage, "org-1", "cashier-1")).toBeNull()
    expect(commit).not.toHaveBeenCalled()
  })

  it.each(["NOT_FOUND", "PENDING"] as const)("does not allow clearing an unresolved %s attempt", async kind => {
    setupRecovery(kind)
    render(<ProfessionalPOSSystem />)
    fireEvent.click(screen.getByRole("button", { name: "recovery.check" }))
    await screen.findByText(kind === "NOT_FOUND" ? "recovery.notFound" : "recovery.pending")
    expect(screen.queryByRole("button", { name: "recovery.acknowledge" })).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "charge.cta" })).toBeDisabled()
    expect(readPendingSale(sessionStorage, "org-1", "cashier-1")).not.toBeNull()
  })

  it("P05 retains original intent and reports uncertainty when the commit response is lost", async () => {
    const { request, commit } = setupRecovery("NOT_FOUND")
    const retainedBefore = readPendingSale(sessionStorage, "org-1", "cashier-1")
    commit.mockRejectedValue(new TypeError("Failed to fetch"))
    render(<ProfessionalPOSSystem />)
    fireEvent.click(screen.getByRole("button", { name: "recovery.check" }))
    const retry = await screen.findByRole("button", { name: "recovery.retryOriginal" })
    fireEvent.click(retry)
    await waitFor(() => expect(mockNotifications.warning).toHaveBeenCalledWith(
      "recovery.title", "recovery.failed", expect.objectContaining({ category: "sales", priority: "high" }),
    ))
    expect(readPendingSale(sessionStorage, "org-1", "cashier-1")).toEqual(retainedBefore)
    expect(retainedBefore?.request.clientCommitId).toBe(request.clientCommitId)
    expect(mockNotifications.success).not.toHaveBeenCalled()
    expect(mockNotifications.error).not.toHaveBeenCalledWith("notifications.saleErrorTitle", expect.anything(), expect.anything())
  })
})

describe("ProfessionalPOSSystem shift close", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("retains a rejected requested quantity through refetch and saves an explicit correction", async () => {
    setupHooks(0, actionSuccess({ terminalId: "terminal-1" }))
    const line = { id: "line-1", itemId: "item-1", sku: "OWNED", nameEn: "Owned item", quantity: 1, unitPrice: 100, discount: 0, taxRate: 0, taxAmount: 0, lineTotal: 100, stock: { trackInventory: true, quantityOnHand: 10, quantityAvailable: 3 } }
    const cart = { id: "sale-1", status: "DRAFT", locationId: "location-1", terminalId: "terminal-1", sessionId: "session-1", customer: null, subtotal: 100, discount: 0, taxAmount: 0, total: 100, lines: [line] }
    mockHooks.useActivePOSCart.mockReturnValue({ data: actionSuccess(cart) } as never)
    const update = jest.fn().mockResolvedValueOnce({ success: false, error: "Insufficient stock", data: null })
      .mockResolvedValueOnce(actionSuccess({ ...cart, total: 200, lines: [{ ...line, quantity: 2, lineTotal: 200 }] }))
    mockHooks.useUpdatePOSCartLine.mockReturnValue(mutationState(update) as never)
    const view = render(<ProfessionalPOSSystem />)
    const quantity = within(screen.getByTestId("pos-cart-line")).getByRole("spinbutton")
    fireEvent.change(quantity, { target: { value: "25" } }); fireEvent.blur(quantity)
    await waitFor(() => expect(update).toHaveBeenCalledWith(expect.objectContaining({ salesOrderId: "sale-1", lineId: "line-1", quantity: 25 })))
    await waitFor(() => expect(quantity).toHaveAttribute("aria-invalid", "true"))
    expect(quantity).toHaveValue(25)
    expect(screen.getByRole("button", { name: "charge.cta" })).toBeDisabled()
    mockHooks.useActivePOSCart.mockReturnValue({ data: actionSuccess({ ...cart, lines: [{ ...line }] }) } as never)
    view.rerender(<ProfessionalPOSSystem />)
    expect(quantity).toHaveValue(25)
    fireEvent.change(quantity, { target: { value: "2" } }); fireEvent.blur(quantity)
    await waitFor(() => expect(quantity).not.toHaveAttribute("aria-invalid"))
    expect(update).toHaveBeenLastCalledWith(expect.objectContaining({ salesOrderId: "sale-1", lineId: "line-1", quantity: 2 }))
    expect(quantity).toHaveValue(2)
  })

  it("hides checkout during a shift read failure, retries the read and preserves entered quantities", async () => {
    setupHooks(0, actionSuccess({ terminalId: "terminal-1" }))
    const line = { id: "line-1", itemId: "item-1", sku: "OWNED", nameEn: "Owned item", quantity: 1, unitPrice: 100, discount: 0, taxRate: 0, taxAmount: 0, lineTotal: 100, stock: { trackInventory: true, quantityOnHand: 10, quantityAvailable: 10 } }
    mockHooks.useActivePOSCart.mockReturnValue({ data: actionSuccess({ id: "sale-1", total: 100, lines: [line] }) } as never)
    const view = render(<ProfessionalPOSSystem />)
    fireEvent.change(within(screen.getByTestId("pos-cart-line")).getByRole("spinbutton"), { target: { value: "7" } })
    const retryRead = jest.fn()
    mockHooks.useCurrentUserPOSShift.mockReturnValue({ data: actionSuccess(shiftFixture(0)), isError: true, retryRead } as never)
    view.rerender(<ProfessionalPOSSystem />)
    expect(screen.getByRole("heading", { name: "readState.failedTitle" })).toBeInTheDocument()
    expect(screen.queryByTestId("pos-cart-line")).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Try again" }))
    expect(retryRead).toHaveBeenCalledTimes(1)
    mockHooks.useCurrentUserPOSShift.mockReturnValue({ data: actionSuccess(shiftFixture(0)), isError: false } as never)
    view.rerender(<ProfessionalPOSSystem />)
    expect(within(screen.getByTestId("pos-cart-line")).getByRole("spinbutton")).toHaveValue(7)
  })

  it("requires an explicit count and submits a literal zero instead of falling back to expected cash", async () => {
    const closeMutateAsync = setupHooks(0, actionSuccess({ terminalId: "terminal-1" }))
    render(<ProfessionalPOSSystem />)
    const dialog = openCloseDialog()
    const submit = within(dialog).getByRole("button", { name: "shift.close" })
    const countedCash = within(dialog).getByLabelText("shift.countedCash")

    expect(submit).toBeDisabled()
    fireEvent.change(countedCash, { target: { value: "0.000" } })
    expect(submit).toBeDisabled()
    fireEvent.change(countedCash, { target: { value: "0" } })
    expect(submit).toBeEnabled()
    fireEvent.click(submit)

    await waitFor(() => {
      expect(closeMutateAsync).toHaveBeenCalledWith({
        sessionId: "session-1",
        actualBalance: "0",
        notes: undefined,
      })
    })
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
  })

  it.each(["pending evidence", "storage unavailable"])("blocks shift submission when a fresh local check finds %s", async reason => {
    const close = setupHooks(0, actionSuccess({ terminalId: "terminal-1" }))
    ;(assertNoLocalOfflineWork as jest.Mock).mockRejectedValueOnce(new Error(reason))
    render(<ProfessionalPOSSystem />)
    const dialog = openCloseDialog()
    fireEvent.change(within(dialog).getByLabelText("shift.countedCash"), { target: { value: "0" } })
    fireEvent.click(within(dialog).getByRole("button", { name: "shift.close" }))
    expect(await screen.findByText("Local offline evidence blocks shift close")).toBeInTheDocument()
    expect(close).not.toHaveBeenCalled()
    expect(assertNoLocalOfflineWork).toHaveBeenCalledWith({ organizationKey: "org-1", locationId: "location-1", terminalId: "terminal-1" })
    expect(screen.getByRole("dialog")).toBeInTheDocument()
  })

  it.each([
    { currency: "XAF", expectedBalance: 100.49, closingAmount: "100" },
    { currency: "XAF", expectedBalance: 0, closingAmount: "0" },
    { currency: "USD", expectedBalance: 100.25, closingAmount: "100.25" },
  ])("fills expected $currency cash $closingAmount without submitting until confirmed", async ({ currency, expectedBalance, closingAmount }) => {
    const closeMutateAsync = setupHooks(expectedBalance, actionSuccess({ terminalId: "terminal-1" }))
    mockHooks.usePOSLocations.mockReturnValue({ data: actionSuccess([{
      id: "location-1", name: "Main shop", isDefault: true,
      organization: { name: "Stoquify", currency, defaultLocale: "EN" },
    }]) } as never)

    render(<ProfessionalPOSSystem />)
    expandShiftDetails()
    fireEvent.click(screen.getByRole("button", { name: "shift.useExpectedCash" }))
    expect(screen.getByLabelText("shift.countedCash")).toHaveValue(Number(closingAmount))
    expect(closeMutateAsync).not.toHaveBeenCalled()

    const dialog = openCloseDialog()
    const countedCash = within(dialog).getByLabelText("shift.countedCash")
    const submit = within(dialog).getByRole("button", { name: "shift.close" })
    expect(countedCash).toHaveValue(Number(closingAmount))

    fireEvent.change(countedCash, { target: { value: "200" } })
    expect(within(dialog).getByText("shift.varianceWarning")).toBeInTheDocument()
    fireEvent.change(within(dialog).getByLabelText("shift.varianceExplanation"), { target: { value: "Previous count" } })
    fireEvent.click(within(dialog).getByRole("button", { name: "shift.useExpectedCash" }))

    expect(countedCash).toHaveValue(Number(closingAmount))
    expect(within(dialog).queryByText("shift.varianceWarning")).not.toBeInTheDocument()
    expect(within(dialog).queryByLabelText("shift.varianceExplanation")).not.toBeInTheDocument()
    expect(submit).toBeEnabled()
    expect(closeMutateAsync).not.toHaveBeenCalled()

    fireEvent.change(countedCash, { target: { value: "200" } })
    expect(within(dialog).getByLabelText("shift.varianceExplanation")).toHaveValue("")
    expect(submit).toBeDisabled()
    fireEvent.click(within(dialog).getByRole("button", { name: "shift.useExpectedCash" }))
    fireEvent.click(submit)
    await waitFor(() => expect(closeMutateAsync).toHaveBeenCalledWith({
      sessionId: "session-1", actualBalance: closingAmount, notes: undefined,
    }))
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
  })

  it("does not require an explanation when a sub-franc XAF difference displays as zero", async () => {
    const closeMutateAsync = setupHooks(100.49, actionSuccess({ terminalId: "terminal-1" }))
    mockHooks.usePOSLocations.mockReturnValue({
      data: actionSuccess([{
        id: "location-1",
        name: "Main shop",
        isDefault: true,
        organization: { name: "Stoquify", currency: "XAF", defaultLocale: "EN" },
      }]),
    } as never)

    render(<ProfessionalPOSSystem />)
    const dialog = openCloseDialog()
    const submit = within(dialog).getByRole("button", { name: "shift.close" })

    const countedCash = within(dialog).getByLabelText("shift.countedCash")
    expect(countedCash).toHaveAttribute("step", "1")
    expect(countedCash).toHaveAttribute("inputmode", "numeric")
    fireEvent.change(countedCash, { target: { value: "100.49" } })
    expect(countedCash).toHaveAttribute("aria-invalid", "true")
    expect(submit).toBeDisabled()
    fireEvent.click(submit)
    expect(closeMutateAsync).not.toHaveBeenCalled()

    fireEvent.change(within(dialog).getByLabelText("shift.countedCash"), { target: { value: "100" } })

    expect(within(dialog).queryByText("shift.varianceWarning")).not.toBeInTheDocument()
    expect(within(dialog).queryByLabelText("shift.varianceExplanation")).not.toBeInTheDocument()
    expect(submit).toBeEnabled()
    fireEvent.click(submit)

    await waitFor(() => {
      expect(closeMutateAsync).toHaveBeenCalledWith({
        sessionId: "session-1",
        actualBalance: "100",
        notes: undefined,
      })
    })
  })

  it("retains cent-level variance controls for currencies with decimal minor units", () => {
    setupHooks(100.01, actionSuccess({ terminalId: "terminal-1" }))
    mockHooks.usePOSLocations.mockReturnValue({
      data: actionSuccess([{
        id: "location-1",
        name: "Main shop",
        isDefault: true,
        organization: { name: "Stoquify", currency: "USD", defaultLocale: "EN" },
      }]),
    } as never)

    render(<ProfessionalPOSSystem />)
    const dialog = openCloseDialog()
    const submit = within(dialog).getByRole("button", { name: "shift.close" })

    fireEvent.change(within(dialog).getByLabelText("shift.countedCash"), { target: { value: "100.00" } })

    expect(within(dialog).getByText("shift.varianceWarning")).toBeInTheDocument()
    expect(within(dialog).getByLabelText("shift.varianceExplanation")).toBeInTheDocument()
    expect(submit).toBeDisabled()
  })

  it("requires a variance explanation and keeps the dialog open when the server rejects the close", async () => {
    const closeMutateAsync = setupHooks(100, {
      success: false,
      data: null,
      error: "Shift state changed; refresh before closing it",
      status: 409,
    })
    render(<ProfessionalPOSSystem />)
    const dialog = openCloseDialog()
    const submit = within(dialog).getByRole("button", { name: "shift.close" })
    const countedCash = within(dialog).getByLabelText("shift.countedCash")

    fireEvent.change(countedCash, { target: { value: "95" } })
    expect(within(dialog).getByLabelText("shift.varianceExplanation")).toBeInTheDocument()
    expect(submit).toBeDisabled()

    fireEvent.change(within(dialog).getByLabelText("shift.varianceExplanation"), {
      target: { value: "Cash payout not recorded" },
    })
    expect(submit).toBeEnabled()
    fireEvent.click(submit)

    await waitFor(() => {
      expect(closeMutateAsync).toHaveBeenCalledWith({
        sessionId: "session-1",
        actualBalance: "95",
        notes: "Cash payout not recorded",
      })
    })
    await waitFor(() => {
      expect(within(dialog).getByRole("alert")).toHaveTextContent("Shift state changed; refresh before closing it")
    })
    expect(screen.getByRole("dialog")).toBeInTheDocument()
    expect(countedCash).toHaveValue(95)
    expect(within(dialog).getByLabelText("shift.varianceExplanation")).toHaveValue("Cash payout not recorded")
    expect(mockNotifications.error).toHaveBeenCalledWith(
      "notifications.closeShiftErrorTitle",
      "Shift state changed; refresh before closing it",
      { category: "pos", priority: "high" },
    )
  })

  it("explains an offline close blocker without exposing its internal code", async () => {
    setupHooks(100, { success: false, data: null, error: "POS_CHECKOUT_OFFLINE_PENDING", status: 409 })
    render(<ProfessionalPOSSystem />)
    const dialog = openCloseDialog()
    fireEvent.change(within(dialog).getByLabelText("shift.countedCash"), { target: { value: "100" } })
    fireEvent.click(within(dialog).getByRole("button", { name: "shift.close" }))
    await waitFor(() => expect(within(dialog).getByRole("alert")).toHaveTextContent("lifecycle.errors.POS_CHECKOUT_OFFLINE_PENDING"))
    expect(within(dialog).getByLabelText("shift.countedCash")).toHaveValue(100)
    expect(mockNotifications.error).toHaveBeenCalledWith("notifications.closeShiftErrorTitle", "lifecycle.errors.POS_CHECKOUT_OFFLINE_PENDING", { category: "pos", priority: "high" })
  })

  it("clears the count and explanation when the active shift identity changes", async () => {
    const closeMutateAsync = setupHooks(100, actionSuccess({ terminalId: "terminal-1" }))
    const { rerender } = render(<ProfessionalPOSSystem />)
    const firstDialog = openCloseDialog()

    fireEvent.change(within(firstDialog).getByLabelText("shift.countedCash"), { target: { value: "95" } })
    fireEvent.change(within(firstDialog).getByLabelText("shift.varianceExplanation"), {
      target: { value: "Count for the first shift" },
    })

    mockHooks.useActivePOSShift.mockReturnValue({
      data: actionSuccess({
        ...shiftFixture(50),
        id: "session-2",
        sessionNumber: "SHIFT-0002",
      }),
    } as never)
    rerender(<ProfessionalPOSSystem />)

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    const secondDialog = openCloseDialog()
    expect(within(secondDialog).getByLabelText("shift.countedCash")).toHaveValue(null)
    expect(within(secondDialog).queryByLabelText("shift.varianceExplanation")).not.toBeInTheDocument()
    expect(within(secondDialog).getByRole("button", { name: "shift.close" })).toBeDisabled()
    expect(closeMutateAsync).not.toHaveBeenCalled()
  })
})

describe("ProfessionalPOSSystem terminal availability", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("prefers an available terminal and labels a terminal occupied by another shift", async () => {
    setupHooks(0, actionSuccess({ terminalId: "terminal-2" }))
    mockHooks.usePOSLocations.mockReturnValue({
      data: actionSuccess([{
        id: "location-1",
        name: "Main shop",
        isDefault: true,
        organization: { name: "Stoquify", currency: "XAF", defaultLocale: "EN" },
      }]),
    } as never)
    mockHooks.usePOSTerminals.mockReturnValue({
      data: actionSuccess([
        {
          id: "terminal-1",
          terminalNumber: "T01",
          name: "Till 1",
          locationId: "location-1",
          currentSessionId: "other-session",
          currentSession: {
            id: "other-session",
            sessionNumber: "SHIFT-OTHER",
            status: "ACTIVE",
            startTime: "2026-08-16T08:00:00.000Z",
          },
        },
        {
          id: "terminal-2",
          terminalNumber: "T02",
          name: "Till 2",
          locationId: "location-1",
          currentSessionId: null,
          currentSession: null,
        },
      ]),
    } as never)
    mockHooks.useCurrentUserPOSShift.mockReturnValue({ data: actionSuccess(null) } as never)
    mockHooks.useActivePOSShift.mockReturnValue({ data: actionSuccess(null) } as never)

    render(<ProfessionalPOSSystem />)

    await waitFor(() => expect(mockHooks.useActivePOSShift).toHaveBeenLastCalledWith("terminal-2"))
    expect(screen.getByLabelText("setup.terminal")).toHaveValue("terminal-2")
    expect(screen.getByRole("option", { name: "T01 - Till 1 - setup.terminalOccupied" })).toBeInTheDocument()
  })

  it("explains an occupied terminal without offering a misleading open action", async () => {
    setupHooks(0, actionSuccess({ terminalId: "terminal-1" }))
    mockHooks.usePOSLocations.mockReturnValue({
      data: actionSuccess([{
        id: "location-1",
        name: "Main shop",
        isDefault: true,
        organization: { name: "Stoquify", currency: "XAF", defaultLocale: "EN" },
      }]),
    } as never)
    mockHooks.usePOSTerminals.mockReturnValue({
      data: actionSuccess([{
        id: "terminal-1",
        terminalNumber: "T01",
        name: "Till 1",
        locationId: "location-1",
        currentSessionId: "other-session",
        currentSession: {
          id: "other-session",
          sessionNumber: "SHIFT-OTHER",
          status: "ACTIVE",
          startTime: "2026-08-16T08:00:00.000Z",
        },
      }]),
    } as never)
    mockHooks.useCurrentUserPOSShift.mockReturnValue({ data: actionSuccess(null) } as never)
    mockHooks.useActivePOSShift.mockReturnValue({ data: actionSuccess(null) } as never)

    render(<ProfessionalPOSSystem />)

    expect(await screen.findByText("shift.occupied")).toBeInTheDocument()
    expect(screen.getByText("shift.occupiedDescription")).toHaveAttribute("role", "status")
    expect(screen.queryByRole("button", { name: "shift.openCta" })).not.toBeInTheDocument()
  })
})

describe("ProfessionalPOSSystem sale commit", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("adds an in-stock catalog item when the cashier selects the product card", async () => {
    const addMutateAsync = jest.fn().mockResolvedValue(actionSuccess({ id: "cart-1" }))
    setupHooks(0, actionSuccess({ terminalId: "terminal-1" }))
    mockHooks.usePOSCatalog.mockReturnValue({
      data: actionSuccess({
        categories: [],
        items: [{
          id: "item-1",
          sku: "SKU-001",
          barcode: "123456789",
          nameEn: "Coffee",
          nameFr: "Cafe",
          thumbnail: null,
          sellingPrice: 100,
          costPrice: 60,
          taxRate: 0,
          trackInventory: true,
          category: null,
          brand: null,
          stock: {
            quantityOnHand: 10,
            quantityAvailable: 10,
            reorderPoint: 2,
            status: "available",
          },
        }],
      }),
      isLoading: false,
    } as never)
    mockHooks.useAddPOSCartLine.mockReturnValue(mutationState(addMutateAsync) as never)

    render(<ProfessionalPOSSystem />)

    const productCardAction = await screen.findByRole("button", { name: "catalog.add Coffee" })
    fireEvent.click(productCardAction)

    await waitFor(() => {
      expect(addMutateAsync).toHaveBeenCalledWith({
        checkoutLeaseId: "00000000-0000-4000-8000-000000000001",
        locationId: "location-1",
        terminalId: "terminal-1",
        sessionId: "session-1",
        itemId: "item-1",
        quantity: 1,
      })
    })
  })

  it("keeps seven long-name cart lines and their controls available", () => {
    setupHooks(700, actionSuccess({ terminalId: "terminal-1" }))
    mockHooks.useActivePOSCart.mockReturnValue({
      data: actionSuccess({
        id: "sale-long-cart",
        orderNumber: "CART-LONG",
        status: "DRAFT",
        locationId: "location-1",
        terminalId: "terminal-1",
        sessionId: "session-1",
        customer: null,
        subtotal: 700,
        discount: 0,
        taxAmount: 0,
        total: 700,
        lines: Array.from({ length: 7 }, (_, index) => ({
          id: `line-${index + 1}`,
          itemId: `item-${index + 1}`,
          sku: `SKU-${String(index + 1).padStart(3, "0")}`,
          barcode: `12345678${index + 1}`,
          nameEn: `Representative long inventory item name ${index + 1}`,
          nameFr: `Nom long d'article représentatif ${index + 1}`,
          thumbnail: null,
          quantity: 1,
          unitPrice: 100,
          discount: 0,
          taxRate: 0,
          taxAmount: 0,
          lineTotal: 100,
          stock: { trackInventory: true, quantityOnHand: 10, quantityAvailable: 10 },
        })),
      }),
    } as never)

    render(<ProfessionalPOSSystem />)

    expect(screen.getAllByTestId("pos-cart-line")).toHaveLength(7)
    expect(screen.getAllByRole("button", { name: "cart.removeLine" })).toHaveLength(7)
    expect(screen.getByText("Representative long inventory item name 1")).toHaveAttribute(
      "title",
      "Representative long inventory item name 1",
    )
    const scrollRegion = screen.getByTestId("pos-checkout-scroll-region")
    expect(scrollRegion).toContainElement(screen.getByTestId("pos-cart-lines"))
    expect(scrollRegion).not.toContainElement(screen.getByTestId("pos-tender-controls"))
    expect(scrollRegion).not.toContainElement(screen.getByTestId("pos-charge-footer"))
    expect(scrollRegion).toContainElement(screen.getByTestId("receipt-token-history-panel"))
    expect(screen.getByTestId("pos-charge-footer")).toContainElement(screen.getByTestId("pos-tender-controls"))
    expect(within(screen.getByTestId("pos-charge-footer")).getByRole("spinbutton", { name: "tender.amount" }))
      .toHaveAttribute("placeholder", expect.stringMatching(/700/))
    expect(screen.getAllByTestId("pos-charge-footer")).toHaveLength(1)
    expect(within(screen.getByTestId("pos-charge-footer")).getByRole("button", { name: "charge.cta" })).toBeEnabled()
  })

  it("submits an active cash sale with a replay-safe non-statutory receipt", async () => {
    const commitMutateAsync = jest.fn().mockResolvedValue(actionSuccess({
      clientCommitId: "pos:test-commit-id",
      resultSchemaVersion: 1,
      replayed: false,
      saleId: "sale-1",
      orderNumber: "SALE-0001",
      status: "COMPLETED",
      paymentStatus: "PAID",
      total: 100,
      amountPaid: 100,
      onAccountAmount: 0,
      changeDue: 0,
      receipt: { digitalReceiptUrl: "" },
      receiptStatus: "READY",
      delivery: null,
    }))

    setupHooks(100, actionSuccess({ terminalId: "terminal-1" }))
    mockHooks.usePOSLocations.mockReturnValue({
      data: actionSuccess([{
        id: "location-1",
        name: "Main shop",
        code: "MAIN",
        type: "RETAIL",
        isDefault: true,
        organization: { name: "Stoquify", currency: "XAF", defaultLocale: "EN" },
      }]),
    } as never)
    mockHooks.usePOSTerminals.mockReturnValue({
      data: actionSuccess([{
        id: "terminal-1",
        terminalNumber: "T01",
        name: "Till 1",
        hasCashDrawer: true,
        locationId: "location-1",
        currentSessionId: "session-1",
      }]),
    } as never)
    mockHooks.useActivePOSCart.mockReturnValue({
      data: actionSuccess({
        id: "sale-1",
        orderNumber: "CART-0001",
        status: "DRAFT",
        locationId: "location-1",
        terminalId: "terminal-1",
        sessionId: "session-1",
        customer: {
          id: "walk-in",
          name: "Walk-in customer",
          phone: null,
          email: null,
          currentBalance: 0,
          creditLimit: null,
        },
        subtotal: 100,
        discount: 0,
        taxAmount: 0,
        total: 100,
        lines: [{
          id: "line-1",
          itemId: "item-1",
          sku: "SKU-001",
          barcode: "123456789",
          nameEn: "Coffee",
          nameFr: "Cafe",
          thumbnail: null,
          quantity: 1,
          unitPrice: 100,
          discount: 0,
          taxRate: 0,
          taxAmount: 0,
          lineTotal: 100,
          stock: { trackInventory: true, quantityOnHand: 10, quantityAvailable: 10 },
        }],
      }),
    } as never)
    mockHooks.useCommitPOSSale.mockReturnValue(mutationState(commitMutateAsync) as never)

    render(<ProfessionalPOSSystem />)

    expect(screen.getByTestId("pos-checkout-scroll-region")).toContainElement(screen.getByTestId("pos-payment-panel"))
    expect(screen.getByTestId("pos-checkout-scroll-region")).not.toContainElement(screen.getByTestId("pos-charge-footer"))
    const summary = within(screen.getByTestId("pos-charge-summary"))
    expect(summary.queryByText("Payment preview")).not.toBeInTheDocument()
    expect(summary.queryByText("tender.paid")).not.toBeInTheDocument()
    expect(summary.queryByText("tender.due")).not.toBeInTheDocument()
    expect(summary.queryByText("tender.change")).not.toBeInTheDocument()
    expect(
      within(screen.getByLabelText("tender.method"))
        .getAllByRole("option")
        .map((option) => option.getAttribute("value")),
    ).toEqual(["CASH", "ON_ACCOUNT"])
    const quantityInput = screen.getByRole("spinbutton", { name: "cart.quantityFor" })
    fireEvent.click(screen.getByRole("button", { name: "shell.touchMode" }))
    expect(screen.getByRole("spinbutton", { name: "cart.quantityFor" })).toBe(quantityInput)
    expect(quantityInput).toHaveValue(1)
    expect(screen.getByRole("button", { name: "cart.removeLine" })).toBeEnabled()

    expect(screen.queryByRole("button", { name: "receipt.channels.PRINT" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "receipt.channels.WHATSAPP" })).not.toBeInTheDocument()
    expect(screen.queryByPlaceholderText("receipt.destinationPlaceholders.email")).not.toBeInTheDocument()
    expect(screen.queryByPlaceholderText("receipt.destinationPlaceholders.phone")).not.toBeInTheDocument()

    fireEvent.click(within(screen.getByTestId("pos-charge-footer")).getByRole("button", { name: "tender.exact" }))
    const chargeButton = screen.getByRole("button", { name: "charge.cta" })
    expect(chargeButton).toBeEnabled()
    fireEvent.click(chargeButton)

    await waitFor(() => {
      expect(commitMutateAsync).toHaveBeenCalledWith(expect.objectContaining({
        clientCommitId: expect.stringMatching(/^pos:[0-9a-f-]{36}$/),
        salesOrderId: "sale-1",
        locationId: "location-1",
        terminalId: "terminal-1",
        sessionId: "session-1",
        customerId: undefined,
        tenders: [{ method: "CASH", amount: 100, reference: undefined }],
        receipt: {
          channel: "NONE",
          locale: "EN",
        },
      }))
    })
    expect(mockNotifications.success).toHaveBeenCalledWith(
      "notifications.saleSuccessTitle",
      "notifications.saleSuccessMessage",
      { category: "sales", priority: "high", duration: 9000 },
    )
  })

  it("selects the authenticated cashier's active location and terminal", async () => {
    setupHooks(100, actionSuccess({ terminalId: "terminal-2" }))
    mockHooks.usePOSLocations.mockReturnValue({
      data: actionSuccess([
        { id: "location-1", isDefault: true },
        { id: "location-2", isDefault: false },
      ]),
    } as never)
    mockHooks.usePOSTerminals.mockReturnValue({
      data: actionSuccess([
        { id: "terminal-1", locationId: "location-1" },
        { id: "terminal-2", locationId: "location-2" },
      ]),
    } as never)
    mockHooks.useCurrentUserPOSShift.mockReturnValue({
      data: actionSuccess({
        ...shiftFixture(100),
        id: "session-2",
        locationId: "location-2",
        terminalId: "terminal-2",
      }),
    } as never)

    render(<ProfessionalPOSSystem />)

    await waitFor(() => expect(mockHooks.usePOSTerminals).toHaveBeenLastCalledWith("location-2"))
    await waitFor(() => expect(mockHooks.useActivePOSShift).toHaveBeenLastCalledWith("terminal-2"))
  })

  it("clears the selected customer, search, and dialog when the cashier changes location", async () => {
    setupHooks(100, actionSuccess({ terminalId: "terminal-1" }))
    mockHooks.usePOSLocations.mockReturnValue({
      data: actionSuccess([
        { id: "location-1", name: "Main shop", isDefault: true },
        { id: "location-2", name: "West shop", isDefault: false },
      ]),
    } as never)
    mockHooks.usePOSTerminals.mockImplementation((locationId) => ({
      data: actionSuccess(locationId === "location-2"
        ? [{ id: "terminal-2", name: "Till 2", terminalNumber: "T02", locationId: "location-2" }]
        : [{ id: "terminal-1", name: "Till 1", terminalNumber: "T01", locationId: "location-1" }]),
    }) as never)
    mockHooks.usePOSCustomers.mockImplementation((params) => ({
      data: actionSuccess({
        customers: params.locationId === "location-2"
          ? [{
              id: "customer-b",
              name: "Bob Branch B",
              code: "B-001",
              email: null,
              phone: null,
              creditLimit: null,
              isActive: true,
              totalOrders: 1,
              totalRevenue: 90,
            }]
          : [{
              id: "customer-a",
              name: "Alice Branch A",
              code: "A-001",
              email: null,
              phone: null,
              creditLimit: null,
              isActive: true,
              totalOrders: 2,
              totalRevenue: 125,
            }],
        total: 1,
      }),
      isLoading: false,
    }) as never)

    render(<ProfessionalPOSSystem />)

    const locationSelect = await screen.findByLabelText("setup.location")
    await waitFor(() => expect(locationSelect).toHaveValue("location-1"))
    fireEvent.click(screen.getByRole("button", { name: "customers.choose" }))
    const firstDialog = screen.getByRole("dialog")
    fireEvent.click(within(firstDialog).getByRole("button", { name: /Alice Branch A/ }))
    expect(screen.getAllByText("Alice Branch A").length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole("button", { name: "customers.change" }))
    const secondDialog = screen.getByRole("dialog")
    fireEvent.change(within(secondDialog).getByPlaceholderText("customers.searchPlaceholder"), {
      target: { value: "stale-a-search" },
    })
    fireEvent.change(locationSelect, { target: { value: "location-2" } })

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    await waitFor(() => expect(locationSelect).toHaveValue("location-2"))
    expect(screen.queryByText("Alice Branch A")).not.toBeInTheDocument()
    expect(mockHooks.usePOSCustomers).toHaveBeenLastCalledWith({
      locationId: "location-2",
      search: "",
    })
    expect(mockNotifications.info).toHaveBeenCalledWith(
      "notifications.customerResetTitle",
      "notifications.customerResetMessage",
      { category: "pos" },
    )

    fireEvent.change(locationSelect, { target: { value: "location-1" } })
    await waitFor(() => expect(mockHooks.usePOSCustomers).toHaveBeenLastCalledWith({
      locationId: "location-1",
      search: "",
    }))
  })

  it("blocks a location change while the current draft contains cart lines", async () => {
    setupHooks(100, actionSuccess({ terminalId: "terminal-1" }))
    mockHooks.usePOSLocations.mockReturnValue({
      data: actionSuccess([
        { id: "location-1", name: "Main shop", isDefault: true },
        { id: "location-2", name: "West shop", isDefault: false },
      ]),
    } as never)
    mockHooks.useActivePOSCart.mockReturnValue({
      data: actionSuccess({
        id: "sale-1",
        orderNumber: "CART-0001",
        status: "DRAFT",
        locationId: "location-1",
        terminalId: "terminal-1",
        sessionId: "session-1",
        customer: null,
        subtotal: 100,
        discount: 0,
        taxAmount: 0,
        total: 100,
        lines: [{
          id: "line-1",
          itemId: "item-1",
          sku: "SKU-001",
          barcode: null,
          nameEn: "Location-bound cart item",
          nameFr: null,
          thumbnail: null,
          quantity: 1,
          unitPrice: 100,
          discount: 0,
          taxRate: 0,
          taxAmount: 0,
          lineTotal: 100,
          stock: { trackInventory: true, quantityOnHand: 10, quantityAvailable: 10 },
        }],
      }),
    } as never)

    render(<ProfessionalPOSSystem />)
    const locationSelect = await screen.findByLabelText("setup.location")
    await waitFor(() => expect(locationSelect).toHaveValue("location-1"))

    fireEvent.change(locationSelect, { target: { value: "location-2" } })

    expect(locationSelect).toHaveValue("location-1")
    expect(mockNotifications.warning).toHaveBeenCalledWith(
      "notifications.locationChangeBlockedTitle",
      "notifications.locationChangeBlockedMessage",
      { category: "pos", priority: "high" },
    )
  })
})

describe("shift opening recovery", () => {
  beforeEach(() => jest.clearAllMocks())
  it.each(["XAF", "USD"])("uses %s precision for the opening balance", async currency => {
    setupHooks(0, actionSuccess({ terminalId: "terminal-1" }))
    mockHooks.useCurrentUserPOSShift.mockReturnValue({ data: actionSuccess(null) } as never)
    mockHooks.useActivePOSShift.mockReturnValue({ data: actionSuccess(null) } as never)
    mockHooks.usePOSLocations.mockReturnValue({ data: actionSuccess([{
      id: "location-1", name: "Owned store", isDefault: true,
      organization: { name: "Stoquify", currency, defaultLocale: "EN" },
    }]) } as never)
    mockHooks.usePOSTerminals.mockReturnValue({ data: actionSuccess([{ id: "terminal-1", locationId: "location-1", name: "Owned till", terminalNumber: "T01", currentSessionId: null }]) } as never)
    const submit = jest.fn().mockResolvedValue(actionSuccess(shiftFixture(0)))
    mockHooks.useOpenPOSShift.mockReturnValue(mutationState(submit) as never)

    render(<ProfessionalPOSSystem />)
    const amount = screen.getByRole("spinbutton", { name: "shift.openingBalance" })
    const openButton = screen.getByRole("button", { name: "shift.openCta" })
    await waitFor(() => expect(openButton).toBeEnabled())
    expect(amount).toHaveAttribute("step", currency === "XAF" ? "1" : "0.01")
    fireEvent.change(amount, { target: { value: "125.50" } })

    if (currency === "XAF") {
      expect(amount).toHaveAttribute("aria-invalid", "true")
      expect(openButton).toBeDisabled()
      fireEvent.click(openButton)
      expect(submit).not.toHaveBeenCalled()
      fireEvent.change(amount, { target: { value: "125" } })
    }

    expect(openButton).toBeEnabled()
    fireEvent.click(openButton)
    await waitFor(() => expect(submit).toHaveBeenCalledWith({
      locationId: "location-1", terminalId: "terminal-1",
      openingBalance: currency === "XAF" ? "125" : "125.50",
    }))
  })

  it.each([true, false])("retains opening float and explains stopped=%s without success", async stopped => {
    setupHooks(0, actionSuccess({ terminalId: "terminal-1" }))
    mockHooks.useCurrentUserPOSShift.mockReturnValue({ data: actionSuccess(null) } as never)
    mockHooks.useActivePOSShift.mockReturnValue({ data: actionSuccess(null) } as never)
    mockHooks.usePOSLocations.mockReturnValue({ data: actionSuccess([{ id: "location-1", name: "Owned store", isDefault: true }]) } as never)
    mockHooks.usePOSTerminals.mockReturnValue({ data: actionSuccess([{ id: "terminal-1", locationId: "location-1", name: "Owned till", terminalNumber: "T01", currentSessionId: null }]) } as never)
    const submit = stopped ? jest.fn().mockResolvedValue({ success: false, data: null, error: "raw error", code: "MODULE_NEW_WORK_STOPPED" }) : jest.fn().mockRejectedValue(new Error("private transport error"))
    mockHooks.useOpenPOSShift.mockReturnValue(mutationState(submit) as never)
    render(<ProfessionalPOSSystem />)
    const amount = screen.getByRole("spinbutton", { name: "shift.openingBalance" })
    fireEvent.change(amount, { target: { value: "125" } })
    await waitFor(() => expect(screen.getByRole("button", { name: "shift.openCta" })).toBeEnabled())
    fireEvent.click(screen.getByRole("button", { name: "shift.openCta" }))
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(stopped ? "notifications.openShiftStopped" : "notifications.openShiftUnconfirmed"))
    expect(amount).toHaveValue(125)
    expect(submit).toHaveBeenCalledTimes(1)
    expect(mockNotifications.success).not.toHaveBeenCalled()
    expect(screen.queryByText("private transport error")).not.toBeInTheDocument()
  })
})
