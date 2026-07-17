import { hasRbacPermission, isKnownPermission } from "@/lib/security/rbac-permissions"

describe("finance dashboard RBAC compatibility", () => {
  it("keeps finance submenu grants compatible with guarded finance surfaces", () => {
    expect(isKnownPermission("finance.dashboard.read")).toBe(true)
    expect(hasRbacPermission(["VIEW_FINANCIAL_DASHBOARD"], "finance.dashboard.read")).toBe(true)
    expect(hasRbacPermission(["CUSTOMER_RECEIVABLES_READ"], "finance.receivables.read")).toBe(true)
    expect(hasRbacPermission(["SUPPLIER_PAYABLES_READ"], "finance.payables.read")).toBe(true)
    expect(hasRbacPermission(["CASH_FLOW_READ"], "finance.cash-flow.read")).toBe(true)
    expect(hasRbacPermission(["CASH_DRAWER_READ"], "finance.cash-drawer.read")).toBe(true)
    expect(hasRbacPermission(["COST_ANALYTICS_READ"], "finance.costs.read")).toBe(true)
    expect(hasRbacPermission(["PROFITABILITY_ANALYTICS_READ"], "finance.profitability.read")).toBe(true)
  })
})
