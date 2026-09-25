import { financeCashFlowTableContract } from "@/components/DataTableComponents/finance-accounting-contracts"
import { createCanonicalTableQuery } from "@/components/DataTableComponents/table-system-contract"

describe("cash-flow statement canonical contract", () => {
  it("declares the statement columns and period filters", () => {
    expect(financeCashFlowTableContract.archetype).toBe("ledger")
    expect(financeCashFlowTableContract.columns.allowed.map((column) => column.id)).toEqual([
      "lineCode",
      "lineName",
      "currency",
      "inflow",
      "outflow",
      "net",
      "evidence",
    ])
    expect(financeCashFlowTableContract.query.allowedFilters.map((filter) => filter.id)).toEqual([
      "period",
      "locationId",
      "startDate",
      "endDate",
    ])
    expect(financeCashFlowTableContract.columns.allowed.filter((column) => column.alignment === "right").map((column) => column.id)).toEqual([
      "inflow",
      "outflow",
      "net",
    ])
  })

  it("keeps entity and period context in the canonical query", () => {
    const query = createCanonicalTableQuery(financeCashFlowTableContract, {
      filters: {
        period: ["mtd"],
        locationId: ["location-1"],
        startDate: ["2026-08-01"],
        endDate: ["2026-08-28"],
      },
      sort: [{ id: "net", desc: true }],
      pageIndex: 0,
      pageSize: 25,
    })

    expect(query.filters).toEqual({
      period: ["mtd"],
      locationId: ["location-1"],
      startDate: ["2026-08-01"],
      endDate: ["2026-08-28"],
    })
    expect(query.sort).toEqual([{ id: "net", desc: true }])
  })
})
