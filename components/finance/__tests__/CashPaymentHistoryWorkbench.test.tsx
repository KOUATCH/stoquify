import { render, screen } from "@testing-library/react"

import { CashPaymentHistoryWorkbench } from "../CashPaymentHistoryWorkbench"

jest.mock("lucide-react", () => {
  const Icon = () => <svg aria-hidden="true" />
  return new Proxy({}, { get: () => Icon })
})

jest.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (key: string, values?: Record<string, unknown>) => {
    if (key === "table.resultCount") return `${values?.count ?? 0} visible rows`
    return key
  },
}))

const mockWorkbench = {
  filters: { pageSize: 50 },
  result: {
    rows: [],
    pageInfo: { nextCursor: null, hasMore: false },
    appliedFilters: { timezone: "Africa/Douala" },
    summary: {
      transactionCount: 1,
      cashEventCount: 1,
      paymentEventCount: 0,
      openingFloat: "1000.00",
      cashInflows: "5000.00",
      cashOutflows: "0.00",
      countedCash: "6000.00",
      expectedPhysicalCash: "6000.00",
      cashVariance: "0.00",
      electronicTenderTotal: "0.00",
      paymentCapturedTotal: "5000.00",
      unresolvedPaymentCount: 0,
      currency: "XAF",
    },
    snapshot: {
      timezone: "Africa/Douala",
      recordedThrough: "2026-07-17T08:00:00.000Z",
      generatedAt: "2026-07-17T08:10:00.000Z",
    },
    completeness: { state: "complete", sources: [] },
  },
  rows: [
    {
      id: "cash:cash-1",
      lane: "cash",
      sourceType: "SALE",
      sourceId: "cash-1",
      amount: "5000.00",
      direction: "inflow",
      currency: "XAF",
      effectiveAt: "2026-07-17T08:00:00.000Z",
      recordedAt: "2026-07-17T08:00:00.000Z",
      controlState: "capture",
      businessState: "SALE",
      location: { id: "loc-1", name: "Shop" },
      cashier: { id: "cashier-1", name: "Ada Cash" },
      terminal: { id: "terminal-1", name: "POS 1" },
      drawer: { id: "drawer-1", name: "Main drawer" },
      session: { id: "session-1", number: "S-001" },
      payment: { method: "CASH", status: null, providerReference: null, redactions: [] },
      accounting: { physicalCashImpact: "5000.00", electronicTenderExcluded: false, ledgerPostingBatchId: null, reconciliationState: null },
      reference: { salesOrderId: null, purchaseOrderId: null, paymentNumber: null, reason: "cash sale" },
    },
  ],
  selectedRowId: null,
  isLoading: false,
  isError: false,
  error: null,
  refetch: jest.fn(),
  hasMore: false,
  nextPage: jest.fn(),
  updateFilters: jest.fn(),
  resetFilters: jest.fn(),
  selectRow: jest.fn(),
  exportHistory: jest.fn(),
  exportStatus: null,
  isExporting: false,
}

jest.mock("@/hooks/useCashPaymentHistoryWorkbench", () => ({
  useCashPaymentHistoryWorkbench: () => mockWorkbench,
}))

describe("CashPaymentHistoryWorkbench", () => {
  it("renders server-owned cash/payment rows through the shared history shell", () => {
    render(<CashPaymentHistoryWorkbench />)

    expect(screen.getByText("title")).toBeInTheDocument()
    expect(screen.getByText("cash sale")).toBeInTheDocument()
    expect(screen.getByText("Ada Cash")).toBeInTheDocument()
    expect(screen.getAllByText(/5,000|5000/).length).toBeGreaterThan(0)
  })
})
