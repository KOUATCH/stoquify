import { readFileSync } from "node:fs"
import { join } from "node:path"

const scopedFiles = [
  "components/customers/CustomerActionPage.tsx",
  "components/customers/CustomerManagementDashboard.tsx",
  "components/customers/CustomerProfilePage.tsx",
  "components/customers/CustomerQuickActions.tsx",
  "components/customers/CustomerStatementWorkflow.tsx",
  "app/[locale]/(dashboard)/dashboard/customers/page.tsx",
  "app/[locale]/(dashboard)/dashboard/customers/new/page.tsx",
  "app/[locale]/(dashboard)/dashboard/customers/[id]/page.tsx",
  "app/[locale]/(dashboard)/dashboard/customers/[id]/edit/page.tsx",
  "app/[locale]/(dashboard)/dashboard/customers/[id]/orders/CustomerOrdersClientPage.tsx",
  "app/[locale]/(dashboard)/dashboard/customers/[id]/statement/page.tsx",
] as const

const rawPaletteClass =
  /\b(?:bg|text|border|ring|from|via|to)-(?:slate|blue|green|amber|red|purple|emerald|indigo)-\d+\b/

describe("customer experience presentation contract", () => {
  it.each(scopedFiles)("%s uses semantic dashboard colors", (relativePath) => {
    const source = readFileSync(join(process.cwd(), relativePath), "utf8")

    expect(source).not.toMatch(rawPaletteClass)
    expect(source).not.toContain("dashboard-landing-theme dark")
  })

  it.each(scopedFiles)("%s avoids dead customer and sales routes", (relativePath) => {
    const source = readFileSync(join(process.cwd(), relativePath), "utf8")

    expect(source).not.toMatch(/\/customers\/[^"' ]+\/details/)
    expect(source).not.toContain("/dashboard/sales/new")
  })
})
