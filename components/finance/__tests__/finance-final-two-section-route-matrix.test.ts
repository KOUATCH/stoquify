import fs from "node:fs"
import path from "node:path"

type NormalizationDecision = "normalize" | "extract-and-normalize" | "already compliant" | "not applicable"

type RouteDecision = {
  route: string
  decision: NormalizationDecision
  family: string
  component: string
  penultimateSectionTitle: string | null
  finalWorkflowSectionTitle: string | null
  workflowLinkCount: number
  reason?: string
}

const expectedRoutes = [
  "/dashboard/finance",
  "/dashboard/finance/analytics",
  "/dashboard/finance/cash-command",
  "/dashboard/finance/cash-drawer",
  "/dashboard/finance/cash-flow",
  "/dashboard/finance/cash-payment-history",
  "/dashboard/finance/costs",
  "/dashboard/finance/payables",
  "/dashboard/finance/payments",
  "/dashboard/finance/profit-loss",
  "/dashboard/finance/profitability",
  "/dashboard/finance/receivables",
  "/dashboard/finance/receivables/history",
  "/dashboard/finance/reconciliation",
  "/dashboard/finance/retail",
  "/dashboard/finance/sales",
  "/dashboard/finance/stock-to-cash",
  "/dashboard/finance/tax-rates/create",
]

const matrixPath = path.join(process.cwd(), "what-next", "finance-final-two-section-normalization.json")
const matrix = JSON.parse(fs.readFileSync(matrixPath, "utf8")) as { routes: RouteDecision[] }

describe("finance final-two-section route matrix", () => {
  it("classifies every Finance route exactly once", () => {
    expect(matrix.routes).toHaveLength(expectedRoutes.length)
    expect(new Set(matrix.routes.map(({ route }) => route)).size).toBe(expectedRoutes.length)
    expect(matrix.routes.map(({ route }) => route).sort()).toEqual([...expectedRoutes].sort())
  })

  it("defines a measurable closing-section contract for every applicable route", () => {
    const applicable = matrix.routes.filter(({ decision }) => decision !== "not applicable")

    expect(applicable).toHaveLength(11)
    for (const route of applicable) {
      expect(route.penultimateSectionTitle).toEqual(expect.any(String))
      expect(route.finalWorkflowSectionTitle).toEqual(expect.any(String))
      expect(route.workflowLinkCount).toBeGreaterThan(0)
      expect(route.reason).toBeUndefined()
    }
  })

  it("keeps every exclusion evidence-backed and free of invented workflow links", () => {
    const excluded = matrix.routes.filter(({ decision }) => decision === "not applicable")

    expect(excluded).toHaveLength(7)
    for (const route of excluded) {
      expect(route.reason).toEqual(expect.any(String))
      expect(route.reason!.length).toBeGreaterThan(40)
      expect(route.penultimateSectionTitle).toBeNull()
      expect(route.finalWorkflowSectionTitle).toBeNull()
      expect(route.workflowLinkCount).toBe(0)
    }
  })

  it("extracts workflows for every Finance command-center consumer", () => {
    const commandCenterRoutes = matrix.routes.filter(({ family }) => family === "finance-command-center")

    expect(commandCenterRoutes).toHaveLength(8)
    expect(commandCenterRoutes.every(({ decision }) => decision === "extract-and-normalize")).toBe(true)
    expect(new Set(commandCenterRoutes.map(({ component }) => component))).toEqual(
      new Set(["components/finance/FinanceCommandCenterDashboard.tsx"]),
    )
  })
})
