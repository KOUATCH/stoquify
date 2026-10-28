import type { SVGProps } from "react"
import { fireEvent, render, screen } from "@testing-library/react"

jest.mock("lucide-react", () => ({
  History: (props: SVGProps<SVGSVGElement>) => <svg data-testid="history-icon" {...props} />,
  Receipt: (props: SVGProps<SVGSVGElement>) => <svg data-testid="receipt-icon" {...props} />,
  Search: (props: SVGProps<SVGSVGElement>) => <svg data-testid="search-icon" {...props} />,
  ShieldCheck: (props: SVGProps<SVGSVGElement>) => <svg data-testid="shield-icon" {...props} />,
  Trash2: (props: SVGProps<SVGSVGElement>) => <svg data-testid="trash-icon" {...props} />,
}))

import { ReceiptTokenHistoryPanel, type ReceiptTokenSaleSearchItem } from "../ReceiptTokenHistoryPanel"
import type { ReceiptTokenControlItem } from "../ReceiptTokenControlStrip"

const controlLabels = {
  title: "Public receipt access",
  loading: "Checking receipt links",
  empty: "No public receipt link recorded",
  active: "Active",
  revoked: "Revoked",
  expired: "Expired",
  accessed: (count: number) => `${count} accesses`,
  expires: (date: string) => `Expires ${date}`,
  revoke: "Revoke",
}

const historyLabels = {
  title: "Receipt access history",
  saleLabel: "Order number or recent sales",
  salePlaceholder: "Order number, or leave blank for recent",
  lookup: "Search",
  selectedSale: (salesOrderId: string) => `Selected sale ${salesOrderId}`,
  noSale: "Select a completed sale",
  denied: "Access unavailable",
  capabilityLoading: "Checking receipt management access",
  capabilityDenied: "Receipt access management requires POS receipt revoke permission",
  capabilityUnavailable: "Receipt access management is temporarily unavailable",
  loadingSales: "Searching completed sales",
  emptySales: "No completed sales found",
  selectSale: "Select sale",
  completed: (date: string) => `Completed ${date}`,
  total: (amount: string) => `Total ${amount}`,
  tokenSummary: (count: number, active: number) => `${count} links / ${active} active`,
}

function sale(overrides: Partial<ReceiptTokenSaleSearchItem> = {}): ReceiptTokenSaleSearchItem {
  return {
    salesOrderId: "sale-previous-1",
    orderNumber: "POS-20260703-0001",
    completedAt: "2026-07-03T12:00:00.000Z",
    total: 12500,
    tokenCount: 2,
    activeTokenCount: 1,
    revokedTokenCount: 1,
    expiredTokenCount: 0,
    ...overrides,
  }
}

function token(overrides: Partial<ReceiptTokenControlItem> = {}): ReceiptTokenControlItem {
  return {
    id: "token-row-active-12345678",
    tokenIdSuffix: "12345678",
    salesOrderId: "sale-previous-1",
    status: "ACTIVE",
    isActive: true,
    issuedAt: "2026-07-03T12:00:00.000Z",
    expiresAt: "2026-08-02T12:00:00.000Z",
    lastAccessedAt: null,
    accessCount: 3,
    revokedAt: null,
    revocationReason: null,
    ...overrides,
  }
}

function renderPanel(overrides: Partial<React.ComponentProps<typeof ReceiptTokenHistoryPanel>> = {}) {
  const props: React.ComponentProps<typeof ReceiptTokenHistoryPanel> = {
    searchDraft: "POS-20260703",
    hasSearched: true,
    selectedSaleId: "",
    saleResults: [sale()],
    tokens: [],
    controlLabels,
    labels: historyLabels,
    formatTotal: (amount) => `XAF ${amount.toLocaleString("en-US")}`,
    onSearchDraftChange: jest.fn(),
    onLookup: jest.fn(),
    onSelectSale: jest.fn(),
    onRevoke: jest.fn(),
    ...overrides,
  }

  return { ...render(<ReceiptTokenHistoryPanel {...props} />), props }
}

describe("ReceiptTokenHistoryPanel", () => {
  it("shows a loading capability state without exposing management controls", () => {
    renderPanel({
      canManage: false,
      capabilityLoading: true,
      selectedSaleId: "sale-previous-1",
      saleResults: [sale()],
      tokens: [token()],
    })

    expect(screen.getByText("Checking receipt management access")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /search/i })).not.toBeInTheDocument()
    expect(screen.queryByText("POS-20260703-0001")).not.toBeInTheDocument()
    expect(screen.queryByText("#12345678")).not.toBeInTheDocument()
  })

  it("shows an RBAC denial state without exposing receipt-token management controls", () => {
    renderPanel({
      canManage: false,
      capabilityErrorMessage: "Forbidden",
      selectedSaleId: "sale-previous-1",
      saleResults: [sale()],
      tokens: [token()],
    })

    expect(screen.getByText(/Receipt access management requires/)).toHaveTextContent(
      "Receipt access management requires POS receipt revoke permission: Forbidden",
    )
    expect(screen.queryByRole("button", { name: /search/i })).not.toBeInTheDocument()
    expect(screen.queryByText("POS-20260703-0001")).not.toBeInTheDocument()
    expect(screen.queryByText("#12345678")).not.toBeInTheDocument()
  })

  it("shows an unavailable capability state without exposing receipt-token management controls", () => {
    renderPanel({
      capabilityUnavailable: true,
      selectedSaleId: "sale-previous-1",
      saleResults: [sale()],
      tokens: [token()],
    })

    expect(screen.getByText("Receipt access management is temporarily unavailable")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /search/i })).not.toBeInTheDocument()
    expect(screen.queryByText("POS-20260703-0001")).not.toBeInTheDocument()
    expect(screen.queryByText("#12345678")).not.toBeInTheDocument()
  })

  it("searches and selects completed sales without exposing receipt token secrets", () => {
    const { props } = renderPanel()

    fireEvent.click(screen.getByRole("button", { name: /search/i }))
    expect(props.onLookup).toHaveBeenCalled()

    expect(screen.getByText("POS-20260703-0001")).toBeInTheDocument()
    expect(screen.getByText("Total XAF 12,500")).toBeInTheDocument()
    expect(screen.getByText("2 links / 1 active")).toBeInTheDocument()
    expect(screen.queryByText(/tokenHash/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/jtiHash/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/customer/i)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /POS-20260703-0001/ }))
    expect(props.onSelectSale).toHaveBeenCalledWith("sale-previous-1")
  })

  it("renders selected sale tokens and revokes by selected sale id", () => {
    const { props } = renderPanel({
      selectedSaleId: "sale-previous-1",
      tokens: [token()],
    })

    expect(screen.getByText("Selected sale sale-previous-1")).toBeInTheDocument()
    expect(screen.getByText("#12345678")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Revoke #12345678" }))
    expect(props.onRevoke).toHaveBeenCalledWith("token-row-active-12345678", "sale-previous-1")
  })

  it("allows an empty search to load recent sales", () => {
    const { props } = renderPanel({
      searchDraft: "",
      hasSearched: false,
      saleResults: [],
    })

    fireEvent.click(screen.getByRole("button", { name: /search/i }))

    expect(props.onLookup).toHaveBeenCalled()
    expect(screen.getByText("Select a completed sale")).toBeInTheDocument()
  })

  it("shows safe sale-search denial without rendering sale candidates", () => {
    renderPanel({
      salesErrorMessage: "You do not have access to this resource.",
      saleResults: [sale()],
    })

    expect(screen.getByText(/Access unavailable/)).toHaveTextContent(
      "Access unavailable: You do not have access to this resource.",
    )
    expect(screen.queryByText("POS-20260703-0001")).not.toBeInTheDocument()
  })

  it("shows safe token-list denial without rendering stale token rows", () => {
    renderPanel({
      selectedSaleId: "sale-denied",
      tokens: [token()],
      errorMessage: "You do not have access to this resource.",
    })

    expect(screen.getByText(/Access unavailable/)).toHaveTextContent(
      "Access unavailable: You do not have access to this resource.",
    )
    expect(screen.queryByText("#12345678")).not.toBeInTheDocument()
  })
})