import { render, screen } from "@testing-library/react"

import { useAPHistoryWorkbench } from "@/hooks/useAPHistoryWorkbench"

import { APHistoryWorkbench } from "../APHistoryWorkbench"

const mockShell = jest.fn(() => <div data-testid="history-shell" />)

jest.mock("lucide-react", () => {
  const Icon = () => <svg aria-hidden="true" />
  return new Proxy({}, { get: () => Icon })
})

jest.mock("@/components/dashboard/history/TransactionHistoryWorkbenchShell", () => ({
  DetailLine: ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div>{label}: {value}</div>
  ),
  DetailSection: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section aria-label={title}>{children}</section>
  ),
  TransactionHistoryWorkbenchShell: (props: Record<string, unknown>) =>
    mockShell(props),
}))

jest.mock("@/hooks/useAPHistoryWorkbench", () => ({
  useAPHistoryWorkbench: jest.fn(),
}))

jest.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (
    key: string,
    values?: Record<string, string | number>,
  ) => {
    const messages: Record<string, string> = {
      scopeLabel: "Tenant-scoped AP history",
      scopeSupplier: "AP history for {supplier}",
      "actions.backToSupplier": "Back to supplier",
      "controlStates.paymentPending": "Payment pending",
      "table.state": "State",
      "snapshot.supplier": "Supplier scope",
      "snapshot.timezone": "Timezone",
      "snapshot.recordedThrough": "Recorded through",
      "snapshot.generatedAt": "Generated",
    }
    const message = messages[key] ?? key
    return Object.entries(values ?? {}).reduce(
      (current, [name, value]) =>
        current.replace("{" + name + "}", String(value)),
      message,
    )
  },
}))

const mockUseAPHistoryWorkbench = useAPHistoryWorkbench as jest.Mock

const row = {
  id: "invoice-1",
  lane: "invoice",
  sourceType: "SUPPLIER_INVOICE",
  sourceId: "invoice-1",
  supplier: { id: "supplier-1", name: "Atlas Supplies" },
  amount: "1200.00",
  signedPayableMovement: "1200.00",
  currency: "XAF",
  effectiveAt: "2026-08-09T10:00:00.000Z",
  recordedAt: "2026-08-09T10:05:00.000Z",
  controlState: "payment_pending",
  businessState: "PAYMENT_PENDING",
  reference: {
    invoiceNumber: "INV-1",
    paymentNumber: null,
    purchaseOrderId: "po-1",
    dueDate: "2026-08-30T00:00:00.000Z",
    notes: null,
  },
  accounting: {
    ledgerPostingBatchId: null,
    postedBusinessEventId: null,
    documentHash: null,
    evidenceHash: null,
  },
  payment: {
    method: null,
    bankDestination: null,
    redactions: [],
  },
} as const

describe("APHistoryWorkbench presentation semantics", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseAPHistoryWorkbench.mockReturnValue({
      filters: {
        lane: "invoice",
        supplierId: "supplier-1",
        pageSize: 50,
      },
      result: {
        rows: [row],
        summary: {
          transactionCount: 1,
          invoiceCount: 1,
          paymentCount: 0,
          invoiceTotal: "1200.00",
          paidTotal: "0",
          releasedPaymentTotal: "0",
          openPayable: "1200.00",
          postedInvoiceCount: 1,
          releasedPaymentCount: 0,
          ledgerBlockerCount: 0,
          currency: "XAF",
        },
        snapshot: {
          timezone: "UTC",
          recordedThrough: "2026-08-09T10:05:00.000Z",
          generatedAt: "2026-08-09T10:10:00.000Z",
        },
        appliedFilters: { timezone: "UTC" },
        completeness: { state: "complete", sources: [] },
        pageInfo: { hasMore: false, nextCursor: null },
      },
      rows: [row],
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
    })
  })

  it("shows supplier context, back navigation, and suppresses an empty action queue", () => {
    render(<APHistoryWorkbench />)

    const props = mockShell.mock.calls[0][0]
    expect(props.labels.scopeLabel).toBe("AP history for Atlas Supplies")
    expect(props.hideEmptyActionQueue).toBe(true)
    expect(props.headerActions).toEqual([
      expect.objectContaining({
        label: "Back to supplier",
        href: "/en/dashboard/purchases/suppliers/supplier-1",
      }),
    ])
    expect(props.snapshotMetadata[0]).toEqual(
      expect.objectContaining({
        label: "Supplier scope",
        value: "Atlas Supplies",
      }),
    )
  })

  it("maps payment-pending control state to the gold semantic tone with localized text", () => {
    render(<APHistoryWorkbench />)

    const props = mockShell.mock.calls[0][0]
    render(<>{props.rowIdentity.status(row)}</>)

    const badge = screen.getByText("Payment pending")
    expect(badge).toHaveClass(
      "border-[var(--dash-gold)]",
      "bg-[var(--dash-gold-soft)]",
    )
  })
})
