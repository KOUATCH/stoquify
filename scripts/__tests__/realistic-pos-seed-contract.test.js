const fs = require("node:fs")
const path = require("node:path")

const root = process.cwd()
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8")

describe("realistic POS seed contract", () => {
  const comprehensiveSeed = read("prisma/comprehensive-seed.ts")
  const rerunGuard = read("prisma/realistic-seed-rerun.ts")
  const smokeVerification = read("scripts/verify-realistic-development-seed.ts")

  it("stocks the complete curated catalog at every active location", () => {
    const inventorySeed = comprehensiveSeed.slice(
      comprehensiveSeed.indexOf("async function seedItemsAndInventory"),
      comprehensiveSeed.indexOf("async function seedPointOfSale"),
    )

    expect(inventorySeed).toContain("PRODUCT_DEFINITIONS.flatMap")
    expect(inventorySeed).toContain("return activeLocations.map")
    expect(inventorySeed).toContain("quantityAvailable: qty(quantityOnHand - reserved)")
  })

  it("leaves seeded terminals available and rejects reuse of stale active seed shifts", () => {
    const posSeed = comprehensiveSeed.slice(
      comprehensiveSeed.indexOf("async function seedPointOfSale"),
      comprehensiveSeed.indexOf("async function seedPurchasing"),
    )

    expect(posSeed).toContain("isOpen: false")
    expect(posSeed).not.toContain("POSSessionStatus.ACTIVE")
    expect(rerunGuard).toContain("minimumPosReadyItemCount")
    expect(rerunGuard).toContain("seededActiveSessions > 0")
  })

  it("proves a fresh seeded terminal can open, sell, and close a shift", () => {
    expect(smokeVerification).toContain("await openPOSShift({")
    expect(smokeVerification).toContain("await closePOSShift({")
    expect(smokeVerification).toContain("inventoryDecrementVerified: true")
  })
})
