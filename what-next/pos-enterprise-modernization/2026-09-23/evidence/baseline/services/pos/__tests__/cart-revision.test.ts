import { Prisma } from "@prisma/client"
import { posCartRevision } from "../cart-revision"

const cart = {
  id: "cart", organizationId: "org", locationId: "store", terminalId: "till", sessionId: "shift",
  customerId: "customer", createdById: "cashier", updatedAt: new Date("2026-09-13T12:00:00Z"),
  subtotal: 100, total: 100, discount: 0, taxAmount: 0,
  lines: [{ id: "line", itemId: "item", quantity: 1, unitPrice: 100, discount: 0, taxRate: 0, taxAmount: 0, lineTotal: 100 }],
}
it("detects different goods and quantities even if total is unchanged", () => {
  const original = posCartRevision(cart)
  expect(posCartRevision({ ...cart, lines: [{ ...cart.lines[0], itemId: "other-item" }] })).not.toBe(original)
  expect(posCartRevision({ ...cart, lines: [{ ...cart.lines[0], quantity: 2, unitPrice: 50 }] })).not.toBe(original)
})
it("detects a changed-and-restored cart through its persisted modification time", () => {
  expect(posCartRevision({ ...cart, updatedAt: new Date("2026-09-13T12:00:01Z") })).not.toBe(posCartRevision(cart))
})
it("fences a reviewed attempt even when all values and modification timestamps match", () => {
  expect(posCartRevision({ ...cart, version: 2 })).not.toBe(posCartRevision({ ...cart, version: 1 }))
})
it("uses exact decimal values consistently across equivalent representations", () => {
  expect(posCartRevision({ ...cart, total: new Prisma.Decimal("100.00") })).toBe(posCartRevision(cart))
})
it.each(["organizationId", "customerId", "createdById", "sessionId"] as const)("binds the %s scope", field => {
  expect(posCartRevision({ ...cart, [field]: "other" })).not.toBe(posCartRevision(cart))
})
