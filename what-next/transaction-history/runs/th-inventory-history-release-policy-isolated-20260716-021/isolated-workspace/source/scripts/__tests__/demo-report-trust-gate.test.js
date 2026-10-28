const fs = require("fs")
const os = require("os")
const path = require("path")

const { renderMarkdown, scanRoot } = require("../demo-report-trust-gate")

function writeFile(root, relativePath, contents) {
  const filePath = path.join(root, relativePath)
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, contents, "utf8")
}

describe("demo-report-trust-gate", () => {
  let root

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "demo-report-trust-gate-"))
  })

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true })
  })

  it("flags production-visible mock inventory and report trust markers", () => {
    writeFile(root, "actions/inventory/inventoryActions.ts", "const mockItems = []\n")
    writeFile(root, "components/reports/cash-flow-report.tsx", "// TODO: Update the import path if missing\n")
    writeFile(root, "lib/error-handling/monitoring.ts", "return Math.random() * 30 + 10 // Mock value\n")

    const result = scanRoot(root)

    expect(result.summary.activeViolationCount).toBe(3)
    expect(result.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ pattern: "MOCK_INVENTORY_EXPORT", file: "actions/inventory/inventoryActions.ts" }),
        expect.objectContaining({ pattern: "STALE_REPORT_TODO", file: "components/reports/cash-flow-report.tsx" }),
        expect.objectContaining({ pattern: "MOCK_MONITORING_METRIC", file: "lib/error-handling/monitoring.ts" }),
      ]),
    )
  })

  it("allows mock terminology in tests", () => {
    writeFile(root, "services/accounting/__tests__/data-trust.service.test.ts", "const mockItems = []\n")

    const result = scanRoot(root)

    expect(result.summary.activeViolationCount).toBe(0)
    expect(result.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ allowed: true, classification: "TEST_ONLY" }),
      ]),
    )
  })

  it("renders the no-active-findings report state", () => {
    writeFile(root, "components/reports/report.tsx", "export const label = 'Import Template'\n")

    const result = scanRoot(root)
    const markdown = renderMarkdown({ ...result, mode: "report" })

    expect(result.summary.activeViolationCount).toBe(0)
    expect(markdown).toContain("No active production-visible demo/report trust findings remain.")
  })
})
