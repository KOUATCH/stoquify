import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"

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

describe("ProfessionalPOSSystem shift close", () => {
  beforeEach(() => {
    jest.clearAllMocks()
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

describe("ProfessionalPOSSystem sale commit", () => {
  beforeEach(() => {
    jest.clearAllMocks()
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
    expect(screen.getByTestId("pos-tender-scroll-region")).toHaveClass("xl:min-h-0", "xl:overflow-y-auto")
    expect(screen.getByTestId("pos-tender-controls").compareDocumentPosition(screen.getByTestId("receipt-token-history-panel")))
      .toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(screen.getByTestId("pos-charge-footer")).toHaveClass("shrink-0")
  })

  it("submits an active cash sale with WhatsApp receipt consent", async () => {
    const commitMutateAsync = jest.fn().mockResolvedValue(actionSuccess({
      saleId: "sale-1",
      orderNumber: "SALE-0001",
      status: "COMPLETED",
      paymentStatus: "PAID",
      total: 100,
      amountPaid: 100,
      onAccountAmount: 0,
      changeDue: 0,
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

    expect(screen.getByTestId("pos-cart-lines")).toHaveClass(
      "min-h-[18rem]",
      "xl:min-h-0",
      "xl:flex-[3_1_20rem]",
    )
    expect(screen.getByTestId("pos-payment-panel")).toHaveClass(
      "xl:min-h-[20rem]",
      "xl:flex-[2_1_24rem]",
      "xl:overflow-hidden",
    )
    expect(screen.getByTestId("pos-totals-summary")).toHaveClass("grid-cols-2", "sm:grid-cols-4")
    expect(screen.getByTestId("pos-cart-line")).toHaveClass("py-0.5")
    expect(screen.getByRole("button", { name: "cart.removeLine" })).toHaveClass("h-7", "w-7")
    expect(screen.getByRole("button", { name: "charge.cta" })).toHaveClass("h-11")

    fireEvent.click(screen.getByRole("button", { name: "shell.touchMode" }))
    expect(screen.getByTestId("pos-cart-line")).toHaveClass("py-2")
    expect(screen.getByRole("spinbutton", { name: "stock.inCart" })).toHaveClass("h-10", "w-24")
    expect(screen.getByRole("button", { name: "cart.removeLine" })).toHaveClass("h-10", "w-10")
    expect(screen.getByRole("button", { name: "charge.cta" })).toHaveClass("h-14")

    fireEvent.click(screen.getByRole("button", { name: "receipt.channels.PRINT" }))
    expect(screen.queryByPlaceholderText("receipt.destinationPlaceholders.email")).not.toBeInTheDocument()
    expect(screen.queryByPlaceholderText("receipt.destinationPlaceholders.phone")).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "receipt.channels.WHATSAPP" }))
    const chargeButton = screen.getByRole("button", { name: "charge.cta" })
    expect(chargeButton).toBeDisabled()
    expect(screen.getByRole("alert")).toHaveTextContent("receipt.destinationRequired")

    fireEvent.change(screen.getByPlaceholderText("receipt.destinationPlaceholders.whatsapp"), {
      target: { value: "+237699000000" },
    })
    expect(chargeButton).toBeDisabled()
    expect(screen.getByRole("alert")).toHaveTextContent("receipt.whatsAppConsentRequired")

    fireEvent.click(screen.getByRole("checkbox", { name: "receipt.whatsAppConsent" }))
    expect(chargeButton).toBeEnabled()
    fireEvent.click(chargeButton)

    await waitFor(() => {
      expect(commitMutateAsync).toHaveBeenCalledWith({
        salesOrderId: "sale-1",
        locationId: "location-1",
        terminalId: "terminal-1",
        sessionId: "session-1",
        customerId: undefined,
        tenders: [{ method: "CASH", amount: 100, reference: undefined }],
        receipt: {
          channel: "WHATSAPP",
          destination: "+237699000000",
          locale: "EN",
          whatsAppCustomerOptInConfirmed: true,
        },
      })
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
    fireEvent.click(screen.getByRole("button", { name: "smart.addCustomer" }))
    const firstDialog = screen.getByRole("dialog")
    fireEvent.click(within(firstDialog).getByRole("button", { name: /Alice Branch A/ }))
    expect(screen.getAllByText("Alice Branch A").length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole("button", { name: "smart.changeCustomer" }))
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
