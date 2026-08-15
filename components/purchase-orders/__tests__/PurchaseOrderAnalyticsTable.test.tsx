import type { SVGProps } from "react"
import { fireEvent, render, screen, within } from "@testing-library/react"

import {
  PurchaseOrderAnalyticsTable,
  type AnalyticsTableColumn,
} from "../PurchaseOrderAnalyticsTable"

jest.mock("lucide-react", () => {
  const Icon = (props: SVGProps<SVGSVGElement>) => <svg {...props} />

  return new Proxy(
    { __esModule: true },
    {
      get(target, prop: string) {
        if (prop in target) return target[prop as keyof typeof target]
        return Icon
      },
    },
  )
})

type Row = {
  id: string
  name: string
  value: number
}

const rows: Row[] = Array.from({ length: 12 }, (_, index) => ({
  id: String(index + 1),
  name: `Item ${String(index + 1).padStart(2, "0")}`,
  value: 120 - index,
}))

const columns: Array<AnalyticsTableColumn<Row>> = [
  { id: "name", header: "Name", accessor: row => row.name, cell: row => row.name },
  { id: "value", header: "Value", accessor: row => row.value, cell: row => row.value, align: "right" },
]

const labels = {
  clearSearch: "Clear search",
  clearFilters: "Clear filters",
  exportCsv: "Export CSV",
  rowsPerPage: "Rows per page",
  previousPage: "Previous page",
  nextPage: "Next page",
  firstPage: "First page",
  lastPage: "Last page",
  page: (current: number, total: number) => `Page ${current} of ${total}`,
  results: (from: number, to: number, total: number) => `${from}-${to} of ${total} rows`,
  sortBy: (column: string) => `Sort by ${column}`,
}

function renderTable(defaultSort?: { id: string; direction: "asc" | "desc" }) {
  return render(
    <PurchaseOrderAnalyticsTable
      rows={rows}
      columns={columns}
      rowKey={row => row.id}
      searchText={row => `${row.name} ${row.value}`}
      searchPlaceholder="Search analytics rows"
      emptyMessage="No rows"
      rangeLabel="Analysis period: 90 days"
      labels={labels}
      exportFilename="analytics.csv"
      defaultSort={defaultSort}
    />,
  )
}

describe("PurchaseOrderAnalyticsTable", () => {
  it("searches the full dataset and resets pagination", () => {
    renderTable()

    expect(screen.getByText("1-10 of 12 rows")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Next page" }))
    expect(screen.getByText("Item 11")).toBeTruthy()

    fireEvent.change(screen.getByLabelText("Search analytics rows"), {
      target: { value: "Item 03" },
    })

    expect(screen.getByText("Item 03")).toBeTruthy()
    expect(screen.queryByText("Item 11")).toBeNull()
    expect(screen.getByText("1-1 of 1 rows")).toBeTruthy()
    expect(screen.getByText("Page 1 of 1")).toBeTruthy()
  })

  it("supports three-state accessible column sorting", () => {
    renderTable()
    const valueHeader = screen.getByText("Value").closest("th")
    const sortButton = screen.getByRole("button", { name: "Sort by Value" })

    expect(valueHeader?.getAttribute("aria-sort")).toBe("none")
    fireEvent.click(sortButton)
    expect(valueHeader?.getAttribute("aria-sort")).toBe("ascending")
    expect(within(screen.getAllByRole("row")[1]).getByText("109")).toBeTruthy()

    fireEvent.click(sortButton)
    expect(valueHeader?.getAttribute("aria-sort")).toBe("descending")
    expect(within(screen.getAllByRole("row")[1]).getByText("120")).toBeTruthy()

    fireEvent.click(sortButton)
    expect(valueHeader?.getAttribute("aria-sort")).toBe("none")
  })

  it("applies its default sort and exposes pagination and export controls", () => {
    renderTable({ id: "value", direction: "asc" })

    expect(within(screen.getAllByRole("row")[1]).getByText("109")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Export CSV" })).toBeEnabled()
    expect(screen.getByLabelText("Rows per page")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Next page" })).toBeEnabled()
  })
})
