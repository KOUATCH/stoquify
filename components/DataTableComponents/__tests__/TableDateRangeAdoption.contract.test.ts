import { readFileSync } from "node:fs"
import { join } from "node:path"

const QUERY_SURFACES = [
  "components/hr-payroll/HrPayrollTableControls.tsx",
  "components/purchase-orders/PurchaseOrderAnalyticsDashboard.tsx",
  "components/finance/FinanceCommandCenterDashboard.tsx",
  "components/finance/PaymentReconciliationWorkbench.tsx",
  "components/finance/FinanceSpecializedLedgerSurfaces.tsx",
  "components/pos/CashDrawerManagementDashboard.tsx",
  "components/dashboard/history/TransactionHistoryWorkbenchShell.tsx",
  "components/inventory/loss/InventoryLossWorkbench.tsx",
  "components/inventory/movements/StockMovementDashboard.tsx",
] as const

describe("table date-range adoption contract", () => {
  it("uses one shared picker instead of paired native date inputs on query surfaces", () => {
    let pickerCount = 0

    for (const file of QUERY_SURFACES) {
      const source = readFileSync(join(process.cwd(), file), "utf8")
      expect(source).not.toContain('type="date"')
      pickerCount += source.match(/<TableDateRangePicker/g)?.length ?? 0
    }

    expect(pickerCount).toBe(11)
  })
})
