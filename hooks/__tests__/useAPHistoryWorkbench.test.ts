jest.mock("@/actions/purchasing/ap-history.actions", () => ({
  getAPHistoryAction: jest.fn(),
  prepareAPHistoryExportAction: jest.fn(),
}))

import {
  filtersForAPHistoryAction,
  parseAPHistorySearchParams,
} from "../useAPHistoryWorkbench"

describe("AP history URL contract", () => {
  it("preserves the supplier filter for tenant-scoped server reads", () => {
    const filters = parseAPHistorySearchParams(
      new URLSearchParams(
        "supplierId=supplier-1&lane=invoice&pageSize=25&dateFrom=2026-07-01&cursor=abc&selected=invoice-1",
      ),
    )

    expect(filters).toMatchObject({
      supplierId: "supplier-1",
      selected: "invoice-1",
    })
    expect(filtersForAPHistoryAction(filters)).toEqual({
      lane: "invoice",
      supplierId: "supplier-1",
      dateFrom: "2026-07-01",
      cursor: "abc",
      pageSize: 25,
    })
  })
})

