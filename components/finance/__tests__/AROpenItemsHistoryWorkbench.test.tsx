import { fireEvent, render, screen, within } from "@testing-library/react"
import { AROpenItemsHistoryWorkbench } from "../AROpenItemsHistoryWorkbench"
import type { AROpenItem } from "@/services/accounting/ar-open-item.service"

jest.mock("lucide-react", () => {
  const Icon = () => <svg aria-hidden="true" />
  return new Proxy({}, { get: () => Icon })
})
jest.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (key: string) => key,
}))
jest.mock("@/hooks/useAROpenItemsHistoryWorkbench", () => ({
  useAROpenItemsHistoryWorkbench: () => mockWorkbench,
}))

const items: AROpenItem[] = Array.from({ length: 51 }, (_, index) => ({
  customerId: `customer-${index}`, customerName: `Customer ${index}`, referenceType: "INVOICE",
  referenceId: `invoice-${index}`, documentNumber: `INV-${index}`, documentVersion: 1,
  documentHash: "document", stateHash: "state", currency: "XAF", orderNumber: null,
  invoiceDate: "2026-09-01", dueDate: "2026-09-30", openingAmount: "1000", initialPaidAmount: "0",
  initialUnpaidAmount: "1000", paidAmount: "0", allocatedAmount: "0", openAmount: "1000",
  status: "open", daysPastDue: 0, agingBucket: "current", evidenceGrade: "operational", allocations: [],
}))
const mockWorkbench = {
  filters: { pageSize: 25 },
  rows: items.slice(0, 25),
  result: { items, summary: { itemCount: 51, settledItemCount: 0 }, summariesByCurrency: [], asOf: "2026-09-21", recordedThrough: "2026-09-21" },
  selectedRowId: null, isLoading: false, isError: false, error: null,
  refetch: jest.fn(), updateFilters: jest.fn(), resetFilters: jest.fn(), selectRow: jest.fn(),
  exportHistory: jest.fn(), exportStatus: null, isExporting: false,
}

it("paginates every loaded receivable and searches beyond the first page without changing the export scope", () => {
  render(<AROpenItemsHistoryWorkbench />)
  const table = () => within(screen.getByRole("table", { name: "table.caption" }))
  expect(table().getByText("INV-0")).toBeInTheDocument()
  expect(table().queryByText("INV-50")).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole("button", { name: "table.nextPage" }))
  expect(table().getByText("INV-25")).toBeInTheDocument()
  expect(screen.getByText("Page 2")).toBeInTheDocument()
  fireEvent.click(screen.getByRole("button", { name: "Go to previous page" }))
  expect(table().getByText("INV-0")).toBeInTheDocument()
  fireEvent.change(screen.getByRole("textbox", { name: "filters.searchLabel" }), { target: { value: "INV-50" } })
  expect(table().getByText("INV-50")).toBeInTheDocument()
  expect(table().queryByText("INV-0")).not.toBeInTheDocument()
  expect(screen.getByText("Page 1")).toBeInTheDocument()
  expect(screen.getByRole("button", { name: "table.noNextPage" })).toBeDisabled()
  fireEvent.click(screen.getAllByRole("button", { name: "actions.export" })[0])
  expect(mockWorkbench.exportHistory).toHaveBeenCalledTimes(1)
  expect(mockWorkbench.updateFilters).not.toHaveBeenCalled()
  fireEvent.change(screen.getByRole("textbox", { name: "filters.searchLabel" }), { target: { value: "missing-record" } })
  expect(screen.getByText("states.emptyFilteredTitle")).toBeInTheDocument()
  expect(screen.getByRole("combobox", { name: "filters.pageSize" })).toBeInTheDocument()
})
