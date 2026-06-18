const fs = require("fs")
const os = require("os")
const path = require("path")

const { renderMarkdown, scanRoot } = require("../hard-delete-gate")

function writeFile(root, relativePath, contents) {
  const filePath = path.join(root, relativePath)
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, contents, "utf8")
}

describe("hard-delete-gate", () => {
  let root

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "hard-delete-gate-"))
  })

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true })
  })

  it("flags action-owned delete paths outside the service boundary", () => {
    writeFile(
      root,
      "actions/suppliers/itemSupplierActions.ts",
      'import { db } from "@/prisma/db"\nexport async function remove(id) { return db.itemSupplier.delete({ where: { id } }) }\n',
    )

    const result = scanRoot(root)

    expect(result.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          allowed: false,
          classification: "ACTION_OWNED_DELETE",
          delegate: "itemSupplier",
          file: "actions/suppliers/itemSupplierActions.ts",
        }),
      ]),
    )
    expect(result.summary.activeViolationCount).toBe(1)
  })

  it("allows guarded draft purchase-order line cleanup inside the owning service", () => {
    writeFile(
      root,
      "services/purchase-order/purchase-order.service.ts",
      [
        'const LINE_RECONCILIATION_STATUSES = new Set(["DRAFT", "SUBMITTED"])',
        "async function reconcileDraftPurchaseOrderLines(tx, params) {",
        "  if (!LINE_RECONCILIATION_STATUSES.has(params.status)) throw new Error('draft only')",
        "  const protectedLine = false",
        '  if (protectedLine) throw new Error("Cannot replace purchase order lines after receipt or invoice evidence exists.")',
        "  await tx.purchaseOrderLine.delete({ where: { id: params.lineId } })",
        "}",
      ].join("\n"),
    )

    const result = scanRoot(root)

    expect(result.summary.activeViolationCount).toBe(0)
    expect(result.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          allowed: true,
          classification: "DRAFT_CLEANUP",
          delegate: "purchaseOrderLine",
        }),
      ]),
    )
  })

  it("allows bounded password-history retention cleanup", () => {
    writeFile(
      root,
      "services/auth/password-policy.ts",
      "export async function prune(tx, overflow) { await tx.passwordHistory.deleteMany({ where: { id: { in: overflow } } }) }\n",
    )

    const result = scanRoot(root)

    expect(result.summary.activeViolationCount).toBe(0)
    expect(result.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          allowed: true,
          classification: "CONFIG_RETENTION_CLEANUP",
          delegate: "passwordHistory",
        }),
      ]),
    )
  })

  it("allows service-owned item supplier catalog relationship cleanup", () => {
    writeFile(
      root,
      "services/supplier/supplier.service.ts",
      "export async function removeItemSupplierForOrganization(db, id) { return db.itemSupplier.delete({ where: { id } }) }\n",
    )

    const result = scanRoot(root)

    expect(result.summary.activeViolationCount).toBe(0)
    expect(result.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          allowed: true,
          classification: "CONFIG_RELATIONSHIP_CLEANUP",
          delegate: "itemSupplier",
        }),
      ]),
    )
  })

  it("allows POS draft-cart line cleanup before sale evidence exists", () => {
    writeFile(
      root,
      "services/pos/pos.service.ts",
      [
        "export async function updatePOSCartLine(tx, line) {",
        "  const row = await tx.salesOrderLine.findFirst({ where: { salesOrder: { is: { status: \"DRAFT\" } } } })",
        "  if (!row) throw new Error('missing')",
        "  await tx.salesOrderLine.delete({ where: { id: line.id } })",
        "}",
        "export async function removePOSCartLine(tx, line) {",
        "  await tx.salesOrderLine.delete({ where: { id: line.id } })",
        "}",
      ].join("\n"),
    )

    const result = scanRoot(root)

    expect(result.summary.activeViolationCount).toBe(0)
    expect(result.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          allowed: true,
          classification: "DRAFT_CLEANUP",
          delegate: "salesOrderLine",
        }),
      ]),
    )
  })

  it("flags unguarded evidence-bearing service deletes", () => {
    writeFile(
      root,
      "services/purchase-order/purchase-order.service.ts",
      "export async function remove(tx, id) { await tx.purchaseOrder.delete({ where: { id } }) }\n",
    )

    const result = scanRoot(root)

    expect(result.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          allowed: false,
          classification: "FORBIDDEN_EVIDENCE_DELETE",
          delegate: "purchaseOrder",
        }),
      ]),
    )
    expect(result.summary.activeViolationCount).toBe(1)
  })

  it("renders active and allowed classification counts", () => {
    writeFile(
      root,
      "actions/suppliers/itemSupplierActions.ts",
      "export async function remove(db, id) { return db.itemSupplier.delete({ where: { id } }) }\n",
    )
    writeFile(
      root,
      "services/auth/password-policy.ts",
      "export async function prune(tx, ids) { return tx.passwordHistory.deleteMany({ where: { id: { in: ids } } }) }\n",
    )

    const result = scanRoot(root)
    const markdown = renderMarkdown({ ...result, mode: "report" })

    expect(markdown).toContain("AqStoqFlow Hard Delete Gate Report")
    expect(markdown).toContain("ACTION_OWNED_DELETE")
    expect(markdown).toContain("CONFIG_RETENTION_CLEANUP")
  })
})
