import { fireEvent, render, screen, act } from "@testing-library/react"
import { InventoryMovementHistoryTable } from "../InventoryMovementHistoryTable"
import { formatDecimal, formatMoney } from "../inventoryMovementHistoryAdapter"
import { inventoryMovementHistoryTypes } from "@/types/inventoryMovementHistory"
import { TransactionType } from "@prisma/client"
import type { useInventoryMovementHistoryWorkbench } from "@/hooks/useInventoryMovementHistoryWorkbench"

jest.mock("next-intl", () => ({ useTranslations: () => (key: string, values: Record<string, unknown> = {}) => {
  const copy = require("@/messages/en.json").inventoryMovementHistory
  const text = key.split(".").reduce((node: any, part) => node[part], copy)
  return String(text).replace(/\{(\w+)\}/g, (_, name) => String(values[name]))
} }))
jest.mock("lucide-react", () => new Proxy({ __esModule: true }, { get: (_target, prop) => prop === "__esModule" ? true : () => null }))

const row = { id: "tx-1", type: "SALE", quantity: "-2.000", totalCost: "1234.50", currency: "XAF", effectiveAt: "2026-09-01T12:00:00Z", recordedAt: "2026-09-01T12:00:00Z", item: { name: "Rice", sku: "RICE", unit: "kg" }, location: { name: "Main" }, reference: { number: "REF-1" } }
function history(overrides = {}) {
  return {
    filters: { pageSize: 50 }, rows: [row], result: { rows: [row], summary: { transactionCount: 125 }, snapshot: { recordedThrough: "2026-09-01T12:00:00Z", timezone: "Africa/Douala" }, completeness: { state: "complete", sources: [] } },
    isLoading: false, isFetching: false, selectedRowId: null, canExport: true, isExporting: false,
    hasMore: true, canPreviousPage: true, canFirstPage: true,
    updateFilters: jest.fn(), resetFilters: jest.fn(), nextPage: jest.fn(), previousPage: jest.fn(), firstPage: jest.fn(), exportHistory: jest.fn(), refetch: jest.fn(),
    ...overrides,
  } as unknown as ReturnType<typeof useInventoryMovementHistoryWorkbench>
}
beforeEach(() => localStorage.clear())
afterEach(() => jest.useRealTimers())

it("uses canonical counts, columns and cursor navigation without unused selection or a fictional last page", () => {
  const model = history()
  const onSelect = jest.fn()
  render(<InventoryMovementHistoryTable history={model} locale="en" timezone="Africa/Douala" onSelectRow={onSelect} />)
  expect(document.querySelector('[data-table-id="inventory.movements"][data-table-archetype="ledger"]')).toBeInTheDocument()
  expect(screen.getByText("1 shown · 125 matching movements")).toBeInTheDocument()
  expect(screen.queryByRole("checkbox")).not.toBeInTheDocument()
  expect(screen.queryByRole("button", { name: "Go to last page" })).not.toBeInTheDocument()
  expect(screen.queryByRole("columnheader", { name: "Recorded time" })).not.toBeInTheDocument()
  expect(screen.getByRole("columnheader", { name: "Quantity" })).toHaveClass("text-right", "tabular-nums")
  fireEvent.click(screen.getByRole("button", { name: "Go to previous page" }))
  fireEvent.click(screen.getByRole("button", { name: "Go to next page" }))
  expect(model.previousPage).toHaveBeenCalledTimes(1)
  expect(model.nextPage).toHaveBeenCalledTimes(1)
  fireEvent.click(screen.getAllByRole("button", { name: "View movement: Rice" })[0])
  expect(onSelect).toHaveBeenCalledWith("tx-1")
  fireEvent.click(screen.getByRole("button", { name: "Export history" }))
  expect(model.exportHistory).toHaveBeenCalledTimes(1)
})

it("debounces server search and prevents exporting the old query while typing", () => {
  jest.useFakeTimers()
  const model = history()
  render(<InventoryMovementHistoryTable history={model} locale="en" timezone="UTC" onSelectRow={jest.fn()} />)
  fireEvent.change(screen.getByRole("textbox", { name: "Search inventory history" }), { target: { value: "RICE" } })
  expect(screen.getByRole("button", { name: "Export history" })).toBeDisabled()
  expect(model.updateFilters).not.toHaveBeenCalled()
  act(() => jest.advanceTimersByTime(300))
  expect(model.updateFilters).toHaveBeenCalledWith({ search: "RICE" })
})

it("persists density through the canonical preferences and hides unauthorized export", () => {
  const model = history({ canExport: false })
  const view = render(<InventoryMovementHistoryTable history={model} locale="en" timezone="UTC" onSelectRow={jest.fn()} />)
  expect(screen.queryByRole("button", { name: "Export history" })).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole("button", { name: "Compact" }))
  expect(document.querySelector('[data-table-id="inventory.movements"]')).toHaveAttribute("data-density", "compact")
  view.unmount()
  render(<InventoryMovementHistoryTable history={model} locale="en" timezone="UTC" onSelectRow={jest.fn()} />)
  expect(screen.getByRole("button", { name: "Compact" })).toHaveAttribute("aria-pressed", "true")
})

it("retains decimal precision and offers only valid inventory transaction filters", () => {
  expect(formatDecimal("9007199254740993.125", "kg", "en")).toBe("9,007,199,254,740,993.125 kg")
  expect(formatMoney("1234.50", "XAF", "fr")).toBe("1\u202f234,50 XAF")
  expect([...inventoryMovementHistoryTypes].sort()).toEqual(Object.values(TransactionType).sort())
})
