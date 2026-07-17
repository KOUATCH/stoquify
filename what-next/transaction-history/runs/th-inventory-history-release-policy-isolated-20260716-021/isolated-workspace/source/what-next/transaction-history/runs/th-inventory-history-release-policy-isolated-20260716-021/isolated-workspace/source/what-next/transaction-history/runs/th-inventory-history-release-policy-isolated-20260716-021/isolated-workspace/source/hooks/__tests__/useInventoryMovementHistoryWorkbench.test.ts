jest.mock("lucide-react", () => {
  const createIcon = () => () => null
  return new Proxy({ __esModule: true }, { get(target, prop: string) { return prop in target ? target[prop as keyof typeof target] : createIcon() } })
})

jest.mock("@/actions/inventory/inventoryMovementHistoryActions", () => ({
  getInventoryMovementHistoryAction: jest.fn(),
  exportInventoryMovementHistoryAction: jest.fn(),
}))

import { buildInventoryMovementHistoryHref, filtersForInventoryMovementHistoryAction, filtersForInventoryMovementHistoryExport, parseInventoryMovementHistorySearchParams } from "../useInventoryMovementHistoryWorkbench"

describe("useInventoryMovementHistoryWorkbench helpers", () => {
  it("parses URL filters and sanitizes invalid page size and type", () => {
    const filters = parseInventoryMovementHistorySearchParams(new URLSearchParams("type=NOPE&pageSize=999&dateFrom=2026-07-15&selected=row-1"))

    expect(filters).toMatchObject({ pageSize: 50, dateFrom: "2026-07-15", selected: "row-1" })
    expect(filters.type).toBeUndefined()
  })

  it("resets cursor and selected row when a server filter changes", () => {
    const href = buildInventoryMovementHistoryHref("/en/dashboard/inventory/movements", new URLSearchParams("cursor=c1&selected=row-1&pageSize=50"), { type: "SALE" })

    expect(href).toBe("/en/dashboard/inventory/movements?pageSize=50&type=SALE")
  })

  it("excludes cursor, selected, and client search from export filters", () => {
    const filters = parseInventoryMovementHistorySearchParams(new URLSearchParams("cursor=c1&selected=row-1&search=rice&type=SALE&pageSize=100"))

    expect(filtersForInventoryMovementHistoryAction(filters)).toMatchObject({ cursor: "c1", type: "SALE", pageSize: 100 })
    expect(filtersForInventoryMovementHistoryExport(filters)).toEqual({ type: "SALE", pageSize: 100 })
  })
})
