import {
  financePayablesHistoryTableContract,
  financeReceivablesHistoryTableContract,
} from "../finance-accounting-contracts"
import { createCanonicalTableQuery } from "../table-system-contract"

describe("finance AR/AP history canonical contracts", () => {
  it("models posted receivable open items with stable identity, balances, and bounded filters", () => {
    expect(financeReceivablesHistoryTableContract).toMatchObject({
      id: "finance.receivables-history",
      rowId: "referenceId",
      dataOwnership: "server-offset",
      access: {
        tenantScoped: true,
        readPermission: "finance.receivables.read",
        readPermissionsAnyOf: ["finance.read"],
      },
    })
    expect(financeReceivablesHistoryTableContract.columns.allowed.map((column) => column.id)).toEqual([
      "documentNumber",
      "counterparty",
      "dueDate",
      "status",
      "currency",
      "amount",
      "balance",
      "evidence",
    ])
    expect(createCanonicalTableQuery(financeReceivablesHistoryTableContract, {
      filters: { customerId: ["customer-1"], asOf: ["2026-08-28"] },
      sort: [{ id: "dueDate", desc: false }],
    }).filters).toEqual({ customerId: ["customer-1"], asOf: ["2026-08-28"] })
  })

  it("models AP history as server-cursor data with supplier-safe access and movement totals", () => {
    expect(financePayablesHistoryTableContract).toMatchObject({
      id: "finance.payables-history",
      dataOwnership: "server-cursor",
      access: {
        tenantScoped: true,
        readPermission: "purchasing.ap.invoice.view",
        readPermissionsAnyOf: ["finance.payables.read", "purchases.suppliers.read"],
      },
    })
    expect(financePayablesHistoryTableContract.columns.allowed.map((column) => column.id)).toEqual([
      "documentNumber",
      "counterparty",
      "dueDate",
      "status",
      "currency",
      "amount",
      "movement",
      "evidence",
    ])
    const query = createCanonicalTableQuery(financePayablesHistoryTableContract, {
      filters: { lane: ["invoice"], supplierId: ["supplier-1"], dateFrom: ["2026-08-01"] },
      sort: [{ id: "effectiveAt", desc: true }],
      cursor: "cursor-1",
    })
    expect(query.filters).toEqual({ lane: ["invoice"], supplierId: ["supplier-1"], dateFrom: ["2026-08-01"] })
    expect(query.cursor).toBe("cursor-1")
  })
})
