const fs = require("fs")
const os = require("os")
const path = require("path")

const { compareWithBaseline, renderMarkdown, scanRoot } = require("../service-boundary-gate")

function writeFile(root, relativePath, contents) {
  const filePath = path.join(root, relativePath)
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, contents, "utf8")
}

describe("service-boundary-gate", () => {
  let root

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "service-boundary-gate-"))
  })

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true })
  })

  it("detects direct Prisma imports and action-owned mutations outside services", () => {
    writeFile(
      root,
      "app/api/v1/items/route.ts",
      'import { db } from "@/prisma/db"\nexport async function GET() { return db.item.findMany() }\n',
    )
    writeFile(
      root,
      "actions/item/items.ts",
      'import { db } from "@/prisma/db"\nexport async function archiveItem(id) { return db.item.update({ where: { id }, data: { isActive: false } }) }\n',
    )

    const result = scanRoot(root)
    const active = result.findings.filter((finding) => !finding.allowed)

    expect(active).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          classification: "DIRECT_PRISMA_DB_IMPORT",
          file: "app/api/v1/items/route.ts",
        }),
        expect.objectContaining({
          classification: "ACTION_OWNED_ECONOMIC_MUTATION",
          delegate: "item",
          operation: "update",
          file: "actions/item/items.ts",
        }),
      ]),
    )
    expect(result.summary.activeViolationCount).toBeGreaterThanOrEqual(3)
  })

  it("allows persistence stubs in tests and mocks", () => {
    writeFile(
      root,
      "actions/item/__tests__/items.test.ts",
      'import { db } from "@/prisma/db"\nit("stubs db", () => db.item.update({ where: { id: "item-1" }, data: {} }))\n',
    )

    const result = scanRoot(root)

    expect(result.summary.activeViolationCount).toBe(0)
    expect(result.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          allowed: true,
          classification: "TEST_OR_MOCK_ONLY",
        }),
      ]),
    )
  })

  it("renders migration guidance for active findings", () => {
    writeFile(
      root,
      "hooks/useRecentPurchaseOrderQueries.ts",
      'import type { PurchaseOrderStatus } from "@prisma/client"\nexport const status = "DRAFT" satisfies PurchaseOrderStatus\n',
    )

    const result = scanRoot(root)
    const markdown = renderMarkdown({ ...result, mode: "report" })

    expect(markdown).toContain("AqStoqFlow Service Boundary Gate Report")
    expect(markdown).toContain("PRISMA_CLIENT_BOUNDARY_COUPLING")
    expect(markdown).toContain("Migration Order")
  })

  it("passes the baseline ratchet when active findings do not get worse", () => {
    writeFile(
      root,
      "app/api/v1/items/route.ts",
      'import { db } from "@/prisma/db"\nexport async function GET() { return db.item.findMany() }\n',
    )

    const baseline = scanRoot(root)
    const current = scanRoot(root)
    const ratchet = compareWithBaseline(current, baseline)
    const markdown = renderMarkdown({ ...current, mode: "fail", ratchet })

    expect(ratchet.failed).toBe(false)
    expect(ratchet.newFindings).toHaveLength(0)
    expect(markdown).toContain("Baseline Ratchet")
    expect(markdown).toContain("Ratchet status: passed")
  })

  it("fails the baseline ratchet when new active findings are introduced", () => {
    writeFile(
      root,
      "app/api/v1/items/route.ts",
      'import { db } from "@/prisma/db"\nexport async function GET() { return db.item.findMany() }\n',
    )

    const baseline = scanRoot(root)

    writeFile(
      root,
      "actions/item/items.ts",
      'import { db } from "@/prisma/db"\nexport async function archiveItem(id) { return db.item.update({ where: { id }, data: { isActive: false } }) }\n',
    )

    const current = scanRoot(root)
    const ratchet = compareWithBaseline(current, baseline)

    expect(ratchet.failed).toBe(true)
    expect(ratchet.newFindings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          classification: "ACTION_OWNED_ECONOMIC_MUTATION",
          file: "actions/item/items.ts",
        }),
      ]),
    )
  })
})
