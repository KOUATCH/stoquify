import type { SVGProps } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"

jest.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (key: string, values?: Record<string, string | number>) => {
    const copy: Record<string, string> = {
      eyebrow: "Inventory history", title: "Inventory movement history", summary: "Server-owned complete history", scopeLabel: "Complete server history",
      "filters.title": "History filters", "filters.detail": "Server filters", "filters.searchPlaceholder": "Search", "filters.searchLabel": "Search history", "filters.type": "Type", "filters.allTypes": "All types", "filters.dateFrom": "From", "filters.dateTo": "To", "filters.pageSize": "Page size", "filters.reset": "Reset",
      "states.retry": "Retry", "states.loadingTitle": "Loading", "states.loadingMessage": "Loading", "states.emptyTitle": "Empty", "states.emptyMessage": "No movement", "states.emptyFilteredTitle": "No matches", "states.emptyFilteredMessage": "Reset filters", "states.errorTitle": "Failed", "states.partialTitle": "Partial source data", "states.partialMessage": "Partial warning", "states.permissionTitle": "Permission required", "states.permissionMessage": "Denied", "states.noOrgTitle": "Organization required", "states.noOrgMessage": "Choose org",
      "actions.export": "Export server history", "actions.exporting": "Exporting", "actions.partialSourceTitle": "Partial source coverage", "actions.partialSourceSummary": "Partial source", "actions.partialSource": "Source",
      "kpis.transactionCount": "Transactions", "kpis.transactionCountDetail": "Count", "kpis.netMovement": "Net movement", "kpis.netMovementDetail": "Net", "kpis.valueChange": "Value change", "kpis.valueChangeDetail": "Value", "kpis.completeness": "Completeness", "kpis.completenessDetail": "Sources", "completeness.complete": "Complete", "completeness.partial": "Partial",
      "columns.item": "Item", "columns.type": "Type", "columns.quantity": "Quantity", "columns.value": "Value", "columns.effectiveAt": "Effective time", "columns.recordedAt": "Recorded time", "columns.location": "Location",
      "snapshot.timezone": "Organization timezone", "snapshot.recordedThrough": "Recorded through", "snapshot.generatedAt": "Generated at", "table.caption": "Inventory movement history table", "table.details": "Details", "table.nextPage": "Next page", "table.noNextPage": "No next page", "table.mobileCardAction": "Open details",
      "proof.unavailableTitle": "Proof unavailable", "proof.unavailableMessage": "Stage 02 does not yet authorize an inventory movement proof badge", "drawer.businessIdentity": "Business identity", "drawer.sourceAttribution": "Source attribution", "drawer.controlStates": "Control states", "drawer.effectiveAt": "Effective time", "drawer.recordedAt": "Recorded time", "drawer.location": "Location", "drawer.item": "Item", "drawer.type": "Type", "drawer.quantity": "Quantity", "drawer.value": "Value", "drawer.reference": "Reference", "drawer.actor": "Actor", "drawer.batch": "Batch", "drawer.expiryDate": "Expiry date", "drawer.correction": "Correction", "drawer.correctionLinked": "Correction linked", "drawer.correctionNone": "No correction", "drawer.proof": "Proof", "drawer.notes": "Notes",
      "types.WRITE_OFF": "Write-off",
    }
    if (key === "table.resultCount") return `${values?.count} visible rows`
    if (key === "actions.exportReady") return `Export ready: ${values?.fileName} / ${values?.rowCount} rows`
    return copy[key] ?? key
  },
}))

jest.mock("lucide-react", () => {
  const createIcon = (name: string) => {
    const MockIcon = (props: SVGProps<SVGSVGElement>) => <svg data-testid={`icon-${name}`} {...props} />
    MockIcon.displayName = `Mock${name}Icon`
    return MockIcon
  }
  return new Proxy({ __esModule: true }, { get(target, prop: string) { return prop in target ? target[prop as keyof typeof target] : createIcon(prop) } })
})

jest.mock("@/hooks/useInventoryMovementHistoryWorkbench", () => ({ useInventoryMovementHistoryWorkbench: () => ({ filters: { pageSize: 50 }, result: mockResult, rows: mockResult.rows, selectedRowId: null, isLoading: false, isError: false, error: null, refetch: jest.fn(), hasMore: false, nextPage: jest.fn(), updateFilters: jest.fn(), resetFilters: jest.fn(), selectRow: jest.fn(), exportHistory: jest.fn(), exportStatus: null, isExporting: false }) }))

const mockRow = { id: "tx-1", type: "WRITE_OFF", quantity: "2.000", unitCost: "3.00", totalCost: "6.00", currency: "XAF", effectiveAt: "2026-07-15T10:00:00.000Z", recordedAt: "2026-07-15T10:05:00.000Z", timeProvenance: "RECORDED_AT", item: { id: "item-1", name: "Rice", sku: "RICE", unit: "kg" }, location: { id: "loc-1", name: "Main" }, actor: { id: "user-1", name: "Awa" }, reference: { type: "ADJUSTMENT", id: "adj-1", number: "ADJ-1" }, correction: { reversalOfTransactionId: null, reversedByTransactionId: null }, notes: "Damaged bag", batchNumber: null, serialNumbers: [], expiryDate: null }
const mockResult = { rows: [mockRow], pageInfo: { nextCursor: null, hasMore: false }, appliedFilters: { itemId: null, locationId: null, type: null, dateFrom: null, dateTo: null, effectiveAsOf: null, timezone: "Africa/Douala", pageSize: 50 }, summary: { transactionCount: 1, totalInbound: null, totalOutbound: "2.000", totalTransfers: null, totalAdjustments: null, totalReservations: null, netMovement: "-2.000", valueChange: "-6.00", currency: "XAF", unit: "kg" }, snapshot: { recordedThrough: "2026-07-15T11:00:00.000Z", generatedAt: "2026-07-15T11:01:00.000Z", timezone: "Africa/Douala" }, completeness: { state: "complete", sources: [{ source: "inventoryTransaction", state: "complete" }] } }

const { InventoryMovementHistoryWorkbench } = require("../InventoryMovementHistoryWorkbench")

describe("InventoryMovementHistoryWorkbench", () => {
  it("renders localized complete-history copy, write-off label, timezone, and neutral proof language", () => {
    const client = new QueryClient()
    render(<QueryClientProvider client={client}><InventoryMovementHistoryWorkbench /></QueryClientProvider>)

    expect(screen.getByRole("heading", { name: "Inventory movement history" })).toBeInTheDocument()
    expect(screen.getAllByText("Write-off").length).toBeGreaterThan(0)
    expect(screen.getByText("Africa/Douala")).toBeInTheDocument()
    expect(screen.getAllByText(/does not yet authorize an inventory movement proof badge/).length).toBeGreaterThan(0)
  })
})


