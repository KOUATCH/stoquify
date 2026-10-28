import { readdirSync, readFileSync } from "node:fs"
import { join, relative } from "node:path"

const SOURCE_ROOTS = ["app", "components"] as const
const EXCLUDED_SEGMENTS = [
  "/__tests__/",
  "/graphify-out/",
  "/_legacy-dashboard/",
  "/supplier-purchase-order/",
  "/customer-statement/",
] as const
const EXCLUDED_FILES = new Set([
  "components/DataTableComponents/DataTable.tsx",
  "components/ui/table.tsx",
  "components/ui/data-table/table-loading.tsx",
])
const NON_GRID_CONTROL_SURFACES = new Set([
  "components/finance/FinanceCommandCenterDashboard.tsx",
  "components/finance/PaymentReconciliationWorkbench.tsx",
  "components/purchase-orders/ModernCreatePurchaseOrderForm.tsx",
])

const TABLE_MARKUP = /<table(?:\s|>)|<Table(?:\s|>)|<DataTable(?:\s|>)/
const TABLE_SHELL = /dashboard-table-shell|dashboard-data-table|dashboard-table-base|dashboardPanelClass|<Table(?:\s|>)|<DataTable(?:\s|>)/
const INTERACTIVE_GRID = /getFilteredRowModel|getPaginationRowModel|setGlobalFilter|setPageIndex|setPageSize|setSessionPage|onNextPage|search(?:Term|Query)|setSearch|filterValue/i
const TOOLBAR_SEMANTIC = /dashboard-table-toolbar|<HrPayrollTableControls(?:\s|>)|<DataTable(?:\s|>)|<FilterBar(?:\s|>)/
const PAGINATION_LOGIC = /getPaginationRowModel|setPageIndex|setPageSize|setSessionPage|onNextPage|\.previousPage\(|\.nextPage\(/
const PAGINATION_SEMANTIC = /dashboard-table-pagination|<DataTablePagination(?:\s|>)|<HrPayrollTablePagination(?:\s|>)|<DataTable(?:\s|>)/

type SourceFile = { path: string; source: string }

function collectTsxFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return collectTsxFiles(path)
    return entry.isFile() && entry.name.endsWith(".tsx") ? [path] : []
  })
}

function normalizePath(path: string) {
  return path.replaceAll("\\", "/")
}

function activeTableSources(): SourceFile[] {
  return SOURCE_ROOTS.flatMap((root) => collectTsxFiles(join(process.cwd(), root)))
    .map((absolutePath) => ({
      path: normalizePath(relative(process.cwd(), absolutePath)),
      source: readFileSync(absolutePath, "utf8"),
    }))
    .filter(({ path, source }) => {
      const normalized = `/${path}`
      return TABLE_MARKUP.test(source)
        && !EXCLUDED_FILES.has(path)
        && !EXCLUDED_SEGMENTS.some((segment) => normalized.includes(segment))
    })
}

function formatMissing(files: SourceFile[]) {
  return files.map(({ path }) => path).sort().join("\n")
}

describe("system table presentation contract", () => {
  const tableSources = activeTableSources()

  it("keeps every active application table inside the shared presentation shell", () => {
    expect(tableSources.length).toBeGreaterThanOrEqual(50)
    const missing = tableSources.filter(({ source }) => !TABLE_SHELL.test(source))
    expect(formatMissing(missing)).toBe("")
  })

  it("gives every interactive grid the shared toolbar semantic", () => {
    const missing = tableSources.filter(({ path, source }) => (
      !NON_GRID_CONTROL_SURFACES.has(path)
      && INTERACTIVE_GRID.test(source)
      && !TOOLBAR_SEMANTIC.test(source)
    ))
    expect(formatMissing(missing)).toBe("")
  })

  it("gives every paginated grid the shared pagination semantic", () => {
    const missing = tableSources.filter(({ source }) => PAGINATION_LOGIC.test(source) && !PAGINATION_SEMANTIC.test(source))
    expect(formatMissing(missing)).toBe("")
  })

  it("keeps the shared data table on the one-row desktop toolbar baseline", () => {
    const dataTable = readFileSync(join(process.cwd(), "components/DataTableComponents/DataTable.tsx"), "utf8")
    const pagination = readFileSync(join(process.cwd(), "components/DataTableComponents/DataTablePagination.tsx"), "utf8")

    expect(dataTable).toContain("singleRowControls = true")
    expect(pagination).toContain("dashboard-table-pagination")
  })
})
