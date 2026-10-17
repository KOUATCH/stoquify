/** @jest-environment jsdom */
import "@testing-library/jest-dom"
jest.mock("@/components/finance/OpenItemsReturnLink", () => ({ OpenItemsReturnLink: () => null }))
import { fireEvent, render, screen, within } from "@testing-library/react"
import { AROpenItemsHistoryWorkbench } from "../AROpenItemsHistoryWorkbench"
import type { AROpenItem } from "@/services/accounting/ar-open-item.service"

jest.mock("lucide-react", () => {
  const Icon = () => <svg aria-hidden="true" />
  return new Proxy({}, { get: () => Icon })
})
jest.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (key: string) => {
    const proof = require("../../../messages/en.json").arHistory.proof
    return key.startsWith("proof.") ? proof[key.slice(6)] : key
  },
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
  selectedRowId: null as string | null, isLoading: false, isError: false, error: null,
  refetch: jest.fn(), updateFilters: jest.fn(), resetFilters: jest.fn(), selectRow: jest.fn(),
  canExport: true, exportHistory: jest.fn(), exportStatus: null, isExporting: false,
}

afterEach(() => {
  items[0].evidenceGrade = "operational"
  mockWorkbench.selectedRowId = null
  mockWorkbench.isError = false
})

it.each([
  ["posted", "Posted receivable"],
  ["operational", "Operational record"],
  ["unknown", "Evidence status unavailable"],
])("shows %s evidence consistently without implying close certification", (grade, label) => {
  items[0].evidenceGrade = grade as AROpenItem["evidenceGrade"]
  const { container } = render(<AROpenItemsHistoryWorkbench />)
  const table = within(screen.getByRole("table", { name: "table.caption" }))
  expect(table.getAllByText(label).length).toBeGreaterThan(0)
  const card = container.querySelector("[data-table-mobile-row]") as HTMLElement
  expect(within(card).getByText(`drawer.evidenceGrade: ${label}`)).toBeInTheDocument()
  expect(screen.getByText("Not certified")).toBeInTheDocument()
  expect(screen.getAllByText(/Close certification is not included/).length).toBeGreaterThan(0)
})

it("uses the readable grade in details and preserves the recorded amounts", () => {
  items[0].evidenceGrade = "posted"
  mockWorkbench.selectedRowId = items[0].referenceId
  render(<AROpenItemsHistoryWorkbench />)
  const drawer = within(screen.getByRole("dialog"))
  expect(drawer.getByText("Posted receivable")).toBeInTheDocument()
  expect(drawer.getAllByText(/1,000/).length).toBeGreaterThan(0)
})

it("does not show stale rows when the history read fails", () => {
  mockWorkbench.isError = true
  render(<AROpenItemsHistoryWorkbench />)
  expect(screen.getByText("states.errorTitle")).toBeInTheDocument()
  expect(screen.queryByRole("table")).not.toBeInTheDocument()
})

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
