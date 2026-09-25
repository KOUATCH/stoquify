import { financeCashHistoryTableContract } from "@/components/DataTableComponents/finance-accounting-contracts"
import { createCanonicalTableQuery } from "@/components/DataTableComponents/table-system-contract"

describe("cash payment history canonical contract", () => {
  it("keeps the server-cursor and evidence access boundaries explicit", () => {
    expect(financeCashHistoryTableContract.dataOwnership).toBe("server-cursor")
    expect(financeCashHistoryTableContract.access.tenantScoped).toBe(true)
    expect(financeCashHistoryTableContract.access.readPermissionsAnyOf).toEqual([
      "finance.cash-drawer.read",
      "finance.payments.read",
    ])
    expect(financeCashHistoryTableContract.export.serverFinalized).toBe(true)
  })

  it("sanitizes the approved URL filters while preserving the cursor", () => {
    const query = createCanonicalTableQuery(financeCashHistoryTableContract, {
      search: "  drawer  ",
      filters: {
        lane: ["cash"],
        locationId: ["location-1"],
        unexpected: ["must-not-cross-boundary"],
      },
      sort: [{ id: "transactionDate", desc: true }],
      pageIndex: 0,
      pageSize: 50,
      cursor: "next-cursor",
    })

    expect(query).toEqual({
      search: "drawer",
      filters: { lane: ["cash"], locationId: ["location-1"] },
      sort: [{ id: "transactionDate", desc: true }],
      pageIndex: 0,
      pageSize: 50,
      cursor: "next-cursor",
    })
  })
})
