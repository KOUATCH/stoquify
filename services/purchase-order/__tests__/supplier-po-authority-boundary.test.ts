import { readFileSync } from "node:fs"
import { resolve } from "node:path"

describe("supplier PO acknowledgement authority boundary", () => {
  it("keeps supplier and buyer decisions out of authoritative write models", () => {
    const source = readFileSync(
      resolve(process.cwd(), "services/purchase-order/supplier-po-acknowledgement.service.ts"),
      "utf8",
    )

    expect(source).not.toMatch(/(?:tx|client)\.purchaseOrder\.(?:update|delete|create)/)
    expect(source).not.toMatch(/(?:tx|client)\.(?:inventoryLevel|inventoryTransaction|supplierInvoice|journalEntry|accountingEntry)\.(?:update|delete|create)/)
    expect(source).toContain("authoritativeMutation: false")
  })

  it("ships append-only database guards for envelopes, proposals, lines and states", () => {
    const migration = readFileSync(
      resolve(process.cwd(), "prisma/migrations/20260815120000_supplier_po_acknowledgement_pilot/migration.sql"),
      "utf8",
    )

    expect(migration).toContain('CREATE OR REPLACE FUNCTION "supplier_po_append_only_guard"')
    for (const table of [
      "supplier_po_envelopes",
      "supplier_po_access_logs",
      "supplier_po_proposals",
      "supplier_po_proposal_lines",
      "supplier_po_proposal_states",
    ]) {
      expect(migration).toContain(`BEFORE UPDATE OR DELETE ON "${table}"`)
    }
  })
})
