import { fireEvent, render, screen, within } from "@testing-library/react"

import {
  HrPayrollTableControls,
  HrPayrollTablePagination,
  useHrPayrollTable,
} from "../HrPayrollTableControls"

jest.mock("lucide-react", () => {
  const React = require("react")
  return new Proxy(
    { __esModule: true },
    {
      get(target, prop: string) {
        if (prop in target) return target[prop as keyof typeof target]
        return (props: Record<string, unknown>) => React.createElement("svg", props)
      },
    },
  )
})

jest.mock("@/components/DataTableComponents/TableDateRangePicker", () => ({
  TableDateRangePicker: ({
    onChange,
    ariaLabel,
  }: {
    onChange: (value: { from?: string; to?: string }) => void
    ariaLabel: string
  }) => (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={() => onChange({ from: "2026-08-03", to: "2026-08-05" })}
    >
      Choose test range
    </button>
  ),
}))

type Row = {
  id: number
  name: string
  status: string
  date: string
}

const rows: Row[] = Array.from({ length: 12 }, (_, index) => ({
  id: index + 1,
  name: index === 0 ? "Zulu Payroll" : index === 1 ? "Alpha HR" : `Employee ${String(index + 1).padStart(2, "0")}`,
  status: index % 2 === 0 ? "READY" : "REVIEW",
  date: `2026-08-${String(index + 1).padStart(2, "0")}T12:00:00.000Z`,
}))

function Harness() {
  const table = useHrPayrollTable({
    rows,
    searchText: (row) => `${row.name} ${row.status}`,
    dateValue: (row) => row.date,
    sortOptions: [
      { key: "name", label: "Employee", value: (row) => row.name },
      { key: "date", label: "Date", value: (row) => row.date },
    ],
  })

  return (
    <div>
      <HrPayrollTableControls table={table} locale="en" tableLabel="payroll test" />
      <ol aria-label="visible rows">
        {table.rows.map((row) => <li key={row.id}>{row.name}</li>)}
      </ol>
      <HrPayrollTablePagination table={table} locale="en" />
    </div>
  )
}

function visibleRows() {
  return within(screen.getByRole("list", { name: "visible rows" }))
    .getAllByRole("listitem")
    .map((item) => item.textContent)
}

describe("HR and payroll table controls", () => {
  it("keeps every desktop toolbar control on one row", () => {
    const { container } = render(<Harness />)

    const toolbar = container.querySelector(".dashboard-table-toolbar")
    const filterControls = container.querySelector('[data-slot="hr-payroll-table-filter-controls"]')
    const searchContainer = screen.getByRole("searchbox", { name: "Search payroll test" }).closest("label")

    expect(toolbar).toHaveClass("xl:flex-nowrap")
    expect(filterControls).toHaveClass("flex-wrap", "xl:flex-nowrap", "xl:flex-none")
    expect(searchContainer).toHaveClass("xl:min-w-0")
  })

  it("searches across the configured row text", () => {
    const { container } = render(<Harness />)

    expect(container.querySelector(".dashboard-table-toolbar")).toBeInTheDocument()
    expect(container.querySelector(".dashboard-table-pagination")).toBeInTheDocument()
    expect(screen.getByRole("searchbox", { name: "Search payroll test" })).toHaveClass("dashboard-control")

    fireEvent.change(screen.getByRole("searchbox", { name: "Search payroll test" }), {
      target: { value: "alpha" },
    })

    expect(visibleRows()).toEqual(["Alpha HR"])
    expect(screen.getByText(/1.*1 of 1/)).toBeInTheDocument()
  })

  it("applies inclusive from and to date bounds", () => {
    render(<Harness />)

    fireEvent.click(screen.getByRole("button", { name: "Date range" }))

    expect(visibleRows()).toEqual(["Employee 03", "Employee 04", "Employee 05"])
  })

  it("sorts by a configured field in both directions", () => {
    render(<Harness />)

    fireEvent.change(screen.getByRole("combobox", { name: "Sort by payroll test" }), {
      target: { value: "name" },
    })
    expect(visibleRows()[0]).toBe("Alpha HR")

    fireEvent.click(screen.getByRole("button", { name: "Ascending" }))
    expect(visibleRows()[0]).toBe("Zulu Payroll")
  })

  it("paginates and changes page size", () => {
    render(<Harness />)

    expect(visibleRows()).toHaveLength(10)
    fireEvent.click(screen.getByRole("button", { name: "Next" }))
    expect(visibleRows()).toEqual(["Employee 11", "Employee 12"])

    fireEvent.change(screen.getByRole("combobox", { name: "Rows per page" }), {
      target: { value: "20" },
    })
    expect(visibleRows()).toHaveLength(12)
  })
})
