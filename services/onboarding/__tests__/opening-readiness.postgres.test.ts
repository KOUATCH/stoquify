/** @jest-environment node */
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { db } from "@/prisma/db"
import { createItem } from "@/services/item/item.service"
import { getMasterDataOnboardingDashboard } from "../master-data-import.service"

const target = new URL(process.env.DATABASE_URL ?? "")
if (process.env.RUN_P07_POSTGRES !== "1" || target.hostname !== "localhost" || !/^\/stoquify_retention_p07_20261017_[a-f0-9]+$/.test(target.pathname) || target.searchParams.get("schema") !== "public") {
  throw new Error("P07 PostgreSQL checks require the explicitly owned disposable target")
}
const fixture = JSON.parse(readFileSync(join(process.cwd(), "docs/retention/execution/P07/evidence/BROWSER_FIXTURE.json"), "utf8"))

describe("P07 real readiness and current item blocker", () => {
  afterAll(async () => db.$disconnect())
  it("projects persisted committed customer/supplier and blocked item evidence without opening completion", async () => {
    expect(jest.isMockFunction(db.onboardingImportBatch.findMany)).toBe(false)
    const result = await getMasterDataOnboardingDashboard(fixture.organizationId, ["CUSTOMER", "SUPPLIER", "ITEM"], fixture.actors.maker.id)
    expect(result.openingReadiness.masters.map(row => [row.target, row.stage])).toEqual([["CUSTOMER", "IMPORTED"], ["SUPPLIER", "IMPORTED"], ["ITEM", "BLOCKED"]])
    expect(result.openingReadiness.state).toBe("REVIEW_REQUIRED")
    expect(result.openingReadiness.requirements.every(row => row.state === "NOT_VERIFIED" || row.state === "UNSUPPORTED")).toBe(true)
  })
  it("reproduces the real image-claim incompatibility without bypass or durable item writes", async () => {
    expect(jest.isMockFunction(createItem)).toBe(false)
    const before = await db.item.count({ where: { organizationId: fixture.organizationId } })
    await expect(createItem(fixture.organizationId, fixture.actors.checker.id, {
      sku: "p07-diagnostic-no-image", nameEn: "Synthetic diagnostic", costPrice: 0, sellingPrice: 0,
    } as never)).rejects.toThrow("Upload an image before saving this item.")
    expect(await db.item.count({ where: { organizationId: fixture.organizationId } })).toBe(before)
    expect(await db.inventoryTransaction.count({ where: { organizationId: fixture.organizationId } })).toBe(0)
    expect(await db.journalEntry.count({ where: { organizationId: fixture.organizationId } })).toBe(0)
  })
})
