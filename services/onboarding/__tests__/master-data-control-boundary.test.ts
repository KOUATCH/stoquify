import fs from "node:fs"
import path from "node:path"

describe("master-data onboarding control boundary", () => {
  const root = process.cwd()
  const service = fs.readFileSync(path.join(root, "services/onboarding/master-data-import.service.ts"), "utf8")
  const migration = fs.readFileSync(
    path.join(root, "prisma/migrations/20260815130000_governed_master_data_onboarding/migration.sql"),
    "utf8",
  )

  it("routes writes through current domain owners and never directly creates master records", () => {
    expect(service).toContain("createCustomer(input.organizationId")
    expect(service).toContain("createSupplier(input.organizationId")
    expect(service).toContain("createItem(input.organizationId")
    expect(service).not.toMatch(/db\.(customer|supplier|item)\.create\s*\(/)
  })

  it("does not expose opening-stock or balance fields in the item commit payload", () => {
    const safePayload = service.slice(service.indexOf("const safeItemData"), service.indexOf("return createItem", service.indexOf("const safeItemData")))
    expect(safePayload).not.toMatch(/locationId|initialQuantity|unitCost|currentBalance/)
  })

  it("contains no destructive or business-truth mutation SQL", () => {
    expect(migration).not.toMatch(/^\s*(?:DROP|TRUNCATE|DELETE\s+FROM|UPDATE|INSERT\s+INTO)\b/im)
    expect(migration).not.toMatch(/^\s*ALTER\s+TABLE\s+"(?:customers|suppliers|items|inventory_levels|journal_entries)"/im)
  })
})
