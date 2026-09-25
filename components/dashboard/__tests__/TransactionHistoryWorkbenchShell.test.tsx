import type { SVGProps } from "react"
import { fireEvent, render, screen, within } from "@testing-library/react"

import { TransactionHistoryWorkbenchShell, type TransactionHistoryShellLabels } from "../history/TransactionHistoryWorkbenchShell"

jest.mock("lucide-react", () => {
  const createIcon = (name: string) => {
    const MockIcon = (props: SVGProps<SVGSVGElement>) => <svg data-testid={`icon-${name}`} {...props} />
    MockIcon.displayName = `Mock${name}Icon`
    return MockIcon
  }
  return new Proxy({ __esModule: true }, { get(target, prop: string) { return prop in target ? target[prop as keyof typeof target] : createIcon(prop) } })
})

const labels: TransactionHistoryShellLabels = {
  eyebrow: "Inventory history", title: "Inventory movement history", summary: "Server-owned complete history", scopeLabel: "Complete server history",
  filtersTitle: "History filters", filtersDetail: "Server filters", searchPlaceholder: "Search", searchLabel: "Search history", typeLabel: "Type", allTypesLabel: "All types", dateFromLabel: "From", dateToLabel: "To", pageSizeLabel: "Page size",
  resetFilters: "Reset", retry: "Retry", export: "Export server history", exporting: "Exporting", tableCaption: "Inventory movement history table", details: "Details", nextPage: "Next page", noNextPage: "No next page",
  loadingTitle: "Loading", loadingMessage: "Loading server scope", emptyTitle: "Empty", emptyMessage: "No movement", emptyFilteredTitle: "No matches", emptyFilteredMessage: "Reset filters", errorTitle: "Failed", partialTitle: "Partial source data", partialMessage: "Partial warning",
  permissionTitle: "Permission required", permissionMessage: "Denied", noOrgTitle: "Organization required", noOrgMessage: "Choose org", proofUnavailableTitle: "Proof unavailable", proofUnavailableMessage: "No proof badge", mobileCardAction: "Open details", resultCount: (count) => `${count} visible rows`,
  filter: "Filter movements", clearFilters: "Clear filters", liveData: "Live data", refresh: "Refresh", refreshing: "Refreshing", viewColumns: "View", selectAllRows: "Select all movement rows", selectRow: (title) => `Select ${title}`, selectedRows: (selected, total) => `${selected} of ${total} row(s) selected.`, page: (page) => `Page ${page}`, firstPage: "Go to first page", previousPage: "Go to previous page",
}

type Row = { id: string; item: string; qty: string; status: string }

function renderShell(overrides: Partial<React.ComponentProps<typeof TransactionHistoryWorkbenchShell<Row>>> = {}) {
  const row = { id: "row-1", item: "Rice", qty: "5 kg", status: "Sale" }
  const onSelectRow = jest.fn()
  const onExport = jest.fn()
  render(<TransactionHistoryWorkbenchShell<Row>
    labels={labels}
    filters={{ pageSize: 50 }}
    typeOptions={[{ value: "SALE", label: "Sale" }]}
    kpis={[{ id: "count", label: "Transactions", value: 1 }]}
    actionItems={[]}
    columns={[{ id: "item", header: "Item", cell: (r) => r.item }, { id: "qty", header: "Quantity", cell: (r) => r.qty }]}
    rows={[row]}
    rowIdentity={{ id: (r) => r.id, title: (r) => r.item, value: (r) => r.qty }}
    selectedRow={null}
    selectedRowId={null}
    drawerTitle={(r) => r.item}
    drawerMetadata={() => []}
    renderDrawer={(r) => <p>{r.status}</p>}
    onFilterChange={jest.fn()}
    onResetFilters={jest.fn()}
    onSelectRow={onSelectRow}
    onNextPage={jest.fn()}
    onRetry={jest.fn()}
    onExport={onExport}
    snapshotMetadata={[]}
    {...overrides}
  />)
  return { onSelectRow, onExport }
}

describe("TransactionHistoryWorkbenchShell", () => {
  it("renders server-scope rows and opens details from an explicit action", () => {
    const { onSelectRow } = renderShell()

    expect(screen.getByRole("heading", { name: "Inventory movement history" })).toBeInTheDocument()
    expect(screen.getByRole("table", { name: "Inventory movement history table" })).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Details: Rice" }))
    expect(onSelectRow).toHaveBeenCalledWith("row-1")
  })

  it("does not offer client-visible-row export when the safe states block export", () => {
    renderShell({ isError: true, errorMessage: "safe failure" })

    expect(screen.getByRole("button", { name: "Export server history" })).toBeDisabled()
    expect(screen.getByText("safe failure")).toBeInTheDocument()
  })

  it("supports the compact three-dot row action used by normalized tables", () => {
    const { onSelectRow } = renderShell({ tableVariant: "system", rowActionVariant: "icon" })
    const action = screen.getByRole("button", { name: "Details: Rice" })

    expect(action).toHaveClass("h-8", "w-8")
    expect(screen.getByTestId("icon-MoreHorizontal")).toBeInTheDocument()
    fireEvent.click(action)
    expect(onSelectRow).toHaveBeenCalledWith("row-1")
  })

  it("matches the normalized items toolbar, selection, column controls, and cursor pagination", () => {
    renderShell({ tableVariant: "system", rowActionVariant: "icon", enableRowSelection: true, enableColumnVisibility: true, hasMore: true })

    expect(screen.getByRole("button", { name: "Refresh" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "View" })).toBeInTheDocument()
    expect(screen.getByText("0 of 1 row(s) selected.")).toBeInTheDocument()
    expect(screen.getByText("Page 1")).toBeInTheDocument()
    const table = screen.getByRole("table", { name: "Inventory movement history table" })
    fireEvent.click(within(table).getByRole("checkbox", { name: "Select Rice" }))
    expect(screen.getByText("1 of 1 row(s) selected.")).toBeInTheDocument()
    const desktopAndMobileSelection = screen.getAllByRole("checkbox", { name: "Select Rice" })
    expect(desktopAndMobileSelection).toHaveLength(2)
    for (const checkbox of desktopAndMobileSelection) expect(checkbox).toBeChecked()
    fireEvent.click(desktopAndMobileSelection.find((checkbox) => !table.contains(checkbox))!)
    expect(screen.getByText("0 of 1 row(s) selected.")).toBeInTheDocument()
    for (const checkbox of desktopAndMobileSelection) expect(checkbox).not.toBeChecked()
  })
})

