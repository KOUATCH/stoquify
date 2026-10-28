import { buildSupplierClipboardPayload, buildSupplierExportCsv, buildSupplierExportHeaders, buildSupplierExportRows } from "@/components/suppliers/supplier-export-utils"
import type { SupplierManagementRow } from "@/services/supplier/supplier.service"

describe("Supplier management export helpers", () => {
  const now = new Date("2026-06-08T10:00:00.000Z")

  const supplier = (overrides: Partial<SupplierManagementRow> = {}): SupplierManagementRow => ({
    id: "supplier-1",
    organizationId: "org-1",
    name: "Acme Suppliers",
    code: "SUP-ACME",
    contactPerson: "Alice Manager",
    email: "alice@acme.supplier",
    phone: "+237 6 70 00 00 00",
    address: "12 Supply Ave",
    city: "Douala",
    state: "Littoral",
    zipCode: "00000",
    country: "Cameroon",
    taxId: "TAX-987654",
    paymentTerms: 30,
    creditLimit: 500000,
    currentBalance: 125000,
    notes: "Preferred supplier",
    isActive: true,
    preferredLocale: "EN",
    createdAt: now,
    updatedAt: now,
    supplierItemsCount: 3,
    preferredItemsCount: 2,
    purchaseOrdersCount: 5,
    openPurchaseOrdersCount: 1,
    ledgerEntriesCount: 4,
    totalPurchaseValue: 850000,
    lastPurchaseOrderAt: now,
    lastLedgerEntryAt: now,
    ...overrides,
  })

  it("omits sensitive contact and tax fields from redacted headers by default", () => {
    expect(buildSupplierExportHeaders(false)).toEqual([
      "Name",
      "Code",
      "Country",
      "Payment Terms",
      "Credit Limit",
      "Balance",
      "Active",
      "Linked Items",
      "Open Orders",
    ])
  })

  it("omits sensitive values from redacted export rows", () => {
    const rows = buildSupplierExportRows([supplier()], {})
    expect(rows[0]).toEqual([
      "Acme Suppliers",
      "SUP-ACME",
      "Cameroon",
      30,
      500000,
      125000,
      "true",
      3,
      1,
    ])
  })

  it("includes sensitive fields when explicitly enabled", () => {
    const rows = buildSupplierExportRows([supplier()], { includeSensitiveFields: true })
    expect(rows[0]).toEqual([
      "Acme Suppliers",
      "SUP-ACME",
      "Alice Manager",
      "alice@acme.supplier",
      "+237 6 70 00 00 00",
      "Cameroon",
      "TAX-987654",
      30,
      500000,
      125000,
      "true",
      3,
      1,
    ])
  })

  it("builds full CSV text with redacted defaults", () => {
    const csv = buildSupplierExportCsv([supplier()], { includeSensitiveFields: false })
    const [header, row] = csv.split("\n")

    expect(header).toContain("Name")
    expect(header).not.toContain("Contact")
    expect(header).not.toContain("Tax ID")
    expect(row).not.toContain("Alice Manager")
    expect(row).not.toContain("alice@acme.supplier")
    expect(row).toContain('"Acme Suppliers"')
  })

  it("returns only identifier for clipboard payload", () => {
    const value = buildSupplierClipboardPayload(supplier({ id: "supplier-clipboard" }))
    expect(value).toBe("supplier-clipboard")
    expect(value).not.toContain("alice@acme.supplier")
    expect(value).not.toContain("TAX-987654")
  })
})

