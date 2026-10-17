/** @jest-environment jsdom */
import "@testing-library/jest-dom"
jest.mock("@/components/finance/OpenItemsReturnLink", () => ({ OpenItemsReturnLink: () => null }))
import { render, screen } from "@testing-library/react"

import { useAPHistoryWorkbench } from "@/hooks/useAPHistoryWorkbench"

import { APHistoryWorkbench } from "../APHistoryWorkbench"

const mockShell = jest.fn(() => <div data-testid="history-shell" />)
jest.mock("../APHistoryExportDialog", () => ({ APHistoryExportDialog: () => null }))

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
      "proof.draftNotPosted": "Draft — not posted",
      "proof.needsReview": "Evidence needs review",
      "proof.unavailableTitle": "Evidence hash not recorded",
      "proof.scopeTitle": "Not certified",
      "proof.accountingScope": "Accounting certification",
      "proof.bankDetailsProtected": "Bank details protected",
      "proof.notRecorded": "Not recorded",
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
    render(<APHistoryWorkbench organizationId="org-1" actorId="actor-1" />)

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

  it("offers fresh-read and filter-reset recovery while hiding stale selected details", () => {
    const state = mockUseAPHistoryWorkbench.getMockImplementation()!()
    const restartHistory = jest.fn()
    mockUseAPHistoryWorkbench.mockReturnValue({ ...state, isError: true, isStale: true, selectedRowId: row.id, restartHistory })
    render(<APHistoryWorkbench organizationId="org-1" actorId="actor-1" />)
    const props = mockShell.mock.calls[0][0]
    expect(props.selectedRow).toBeNull()
    expect(props.labels.errorTitle).toBe("states.staleTitle")
    expect(props.errorMessage).toBe("states.staleMessage")
    props.onRetry()
    expect(restartHistory).toHaveBeenCalledTimes(1)
    expect(state.refetch).not.toHaveBeenCalled()
    props.headerActions.find((action: { label: string }) => action.label === "filters.reset").onClick()
    expect(state.resetFilters).toHaveBeenCalledTimes(1)
  })

  it("maps payment-pending control state to the gold semantic tone with localized text", () => {
    render(<APHistoryWorkbench organizationId="org-1" actorId="actor-1" />)

    const props = mockShell.mock.calls[0][0]
    render(<>{props.rowIdentity.status(row)}</>)

    const badge = screen.getByText("Payment pending")
    expect(badge).toHaveClass(
      "border-[var(--dash-gold)]",
      "bg-[var(--dash-gold-soft)]",
    )
  })

  it.each([
    ["draft", "not_recognized", null, "Draft — not posted"],
    ["draft", "unverified", null, "Evidence needs review"],
    ["draft", "unverified", "sha256:stored", "Evidence needs review"],
    ["posted", "unverified", "sha256:stored", "Evidence needs review"],
    ["posted", "recorded", null, "Evidence hash not recorded"],
    ["posted", "recorded", "sha256:stored", "sha256:stored"],
    ["draft", "not_recognized", "sha256:stored", "sha256:stored"],
    ["matched", "not_recognized", null, "Evidence hash not recorded"],
  ])("labels %s / %s evidence without masking inconsistencies", (controlState, movementState, evidenceHash, expected) => {
    render(<APHistoryWorkbench organizationId="org-1" actorId="actor-1" />)
    const props = mockShell.mock.calls[0][0]
    const evidence = props.columns.find((column: { id: string }) => column.id === "evidence")
    expect(evidence.cell({ ...row, controlState, movementState, accounting: { ...row.accounting, evidenceHash } })).toBe(expected)
    const mobileCard = render(props.rowIdentity.value({ ...row, controlState, movementState, accounting: { ...row.accounting, evidenceHash } }))
    expect(mobileCard.container).toHaveTextContent(expected)
  })

  it.each([
    ["DRAFT", "draft", "not_recognized", null, "Draft — not posted"],
    ["DRAFT", "draft", "unverified", null, "Evidence needs review"],
    ["DRAFT", "draft", "unverified", "sha256:stored", "Evidence needs review"],
    ["DRAFT", "draft", "not_recognized", "sha256:stored", "sha256:stored"],
    ["APPROVED", "draft", "not_recognized", null, "Evidence hash not recorded"],
    ["CANCELLED", "cancelled", "not_recognized", null, "Evidence hash not recorded"],
    ["RELEASED", "released", "recorded", null, "Evidence hash not recorded"],
    ["POSTED", "released", "unverified", null, "Evidence needs review"],
  ])("keeps payment proof truthful for %s / %s / %s", (businessState, controlState, movementState, evidenceHash, expected) => {
    render(<APHistoryWorkbench organizationId="org-1" actorId="actor-1" />)
    const props = mockShell.mock.calls[0][0]
    const payment = { ...row, lane: "payment", sourceType: "SUPPLIER_PAYMENT", businessState, controlState, movementState, accounting: { ...row.accounting, evidenceHash } }
    const evidence = props.columns.find((column: { id: string }) => column.id === "evidence")
    expect(evidence.cell(payment)).toBe(expected)
    const mobileCard = render(props.rowIdentity.value(payment))
    expect(mobileCard.container).toHaveTextContent(expected)
    const drawer = render(props.renderDrawer(payment))
    expect(drawer.container).toHaveTextContent(expected)
    if (evidenceHash) expect(drawer.container).toHaveTextContent(evidenceHash)
  })

  it("retains partial scope and its source when explaining accounting certification", () => {
    const state = mockUseAPHistoryWorkbench.getMockImplementation()!()
    mockUseAPHistoryWorkbench.mockReturnValue({ ...state, result: { ...state.result, completeness: { state: "partial", sources: [{ source: "supplier_ap_history_accounting_claim", state: "partial" }] } } })
    render(<APHistoryWorkbench organizationId="org-1" actorId="actor-1" />)
    const props = mockShell.mock.calls[0][0]
    expect(props.isPartial).toBe(true)
    expect(props.partialSources).toEqual(["Accounting certification"])
    expect(props.labels.proofUnavailableTitle).toBe("Not certified")
  })

  it("keeps the stored hash inspectable alongside the warning in inconsistent invoice details", () => {
    render(<APHistoryWorkbench organizationId="org-1" actorId="actor-1" />)
    const props = mockShell.mock.calls[0][0]
    render(props.renderDrawer({ ...row, movementState: "unverified", accounting: { ...row.accounting, evidenceHash: "sha256:stored" } }))
    expect(screen.getByText(/sha256:stored/)).toBeInTheDocument()
    expect(screen.getByText(/Evidence needs review/)).toBeInTheDocument()
  })

  it.each([
    ["[REDACTED:BANK]", true, "Bank details protected"],
    ["Example Bank ****1234", true, "Bank details protected"],
    ["Example Bank ****1234", false, "Example Bank ****1234"],
    [null, false, "Not recorded"],
  ])("preserves bank-detail redaction while localizing its display (%s, redacted=%s)", (bankDestination, redacted, expected) => {
    render(<APHistoryWorkbench organizationId="org-1" actorId="actor-1" />)
    const props = mockShell.mock.calls[0][0]
    const drawer = render(props.renderDrawer({
      ...row,
      lane: "payment",
      sourceType: "SUPPLIER_PAYMENT",
      businessState: "DRAFT",
      payment: {
        ...row.payment,
        bankDestination,
        redactions: redacted ? [{ field: "supplierPayment:payment-1:bankDestination", category: "supplier_bank_detail", mode: "redact", reasonCode: "MISSING_PERMISSION", policy: "kontava-supplier-bank-redaction-policy" }] : [],
      },
    }))
    expect(drawer.container).toHaveTextContent(expected)
    expect(drawer.container).not.toHaveTextContent("[REDACTED:BANK]")
    if (redacted) expect(drawer.container).not.toHaveTextContent("Example Bank ****1234")
  })
})

it("hides export controls without the server-provided export permission", () => {
  render(<APHistoryWorkbench organizationId="org-1" actorId="actor-1" />)
  expect(mockShell.mock.calls.at(-1)[0].onExport).toBeUndefined()
})
