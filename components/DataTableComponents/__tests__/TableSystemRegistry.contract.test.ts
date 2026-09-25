import fs from "node:fs"
import path from "node:path"
import { pilotTableContracts } from "../pilot-table-contracts"
import { registeredTableSources, tableSystemRegistry } from "../table-system-registry"

function tableBearingSources(root: string, relative = ""): string[] {
  return fs.readdirSync(path.join(root, relative), { withFileTypes: true }).flatMap((entry) => {
    const child = path.join(relative, entry.name)
    if (entry.isDirectory()) {
      if (["__tests__", "node_modules", ".next"].includes(entry.name)) return []
      return tableBearingSources(root, child)
    }
    if (!entry.isFile() || !entry.name.endsWith(".tsx")) return []
    const source = fs.readFileSync(path.join(root, child), "utf8")
    return /<(?:table|Table)(?:\s|>)/.test(source) ? [child.replaceAll("\\", "/")] : []
  })
}

describe("table system registry ratchet", () => {
  it("registers every current table-bearing application source", () => {
    const root = process.cwd()
    const actual = [
      ...tableBearingSources(root, "app"),
      ...tableBearingSources(root, "components"),
    ]
    expect(actual.filter((source) => !registeredTableSources.has(source))).toEqual([])
  })

  it("keeps source registrations unique", () => {
    expect(registeredTableSources.size).toBe(tableSystemRegistry.length)
  })

  it("limits the NOW pilot to the three approved surfaces", () => {
    const pilots = tableSystemRegistry.filter((entry) => entry.state === "canonical-pilot")
    expect(pilots.map((entry) => entry.contractId).sort()).toEqual(
      pilotTableContracts.map((contract) => contract.id).sort(),
    )
    expect(pilots).toHaveLength(3)
  })

  it.each([
    ["components/ui/groups/inventory/ItemManagement.tsx", "inventoryItemsTableContract"],
    ["components/ui/groups/purchase-orders/PurchaseOrderManagement.tsx", "purchaseOrdersTableContract"],
    ["components/finance/PaymentReconciliationWorkbench.tsx", "paymentReconciliationTableContract"],
  ])("binds %s to its canonical contract", (source, contractName) => {
    const content = fs.readFileSync(path.join(process.cwd(), source), "utf8")
    expect(content).toContain("CanonicalTableBoundary")
    expect(content).toContain(contractName)
  })
})
