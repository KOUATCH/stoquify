const fs = require("fs")
const path = require("path")

const root = process.cwd()
const schema = fs.readFileSync(path.join(root, "prisma/schema.prisma"), "utf8")
const migration = fs.readFileSync(
  path.join(
    root,
    "prisma/migrations/20260820100000_supplier_invoice_match_exception_boundary/migration.sql",
  ),
  "utf8",
)

describe("supplier invoice match-exception boundary", () => {
  it("persists tenant-scoped policy, reason, evidence, actors, expiry, and lifecycle", () => {
    expect(schema).toContain("enum SupplierInvoiceMatchExceptionStatus")
    expect(schema).toContain("model SupplierInvoiceMatchException")
    expect(schema).toContain("policyVersion")
    expect(schema).toContain("evidenceReference")
    expect(schema).toContain("requestedById")
    expect(schema).toContain("approvedById")
    expect(schema).toContain("expiresAt")
    expect(migration).toContain('FOREIGN KEY ("organizationId", "supplierInvoiceId")')
    expect(migration).toContain('FOREIGN KEY ("organizationId", "threeWayMatchId")')
  })

  it("references the mapped organizations table on a fresh PostgreSQL deploy", () => {
    expect(migration).toContain(
      'FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")',
    )
    expect(migration).not.toContain('REFERENCES "Organization"("id")')
  })

  it("freezes request evidence and permits only explicit lifecycle transitions", () => {
    expect(migration).toContain("purchasing_match_exception_lifecycle_only")
    expect(migration).toContain("Supplier invoice match exception request evidence is immutable")
    expect(migration).toContain("OLD.\"status\" = 'OPEN' AND NEW.\"status\" = 'APPROVED'")
    expect(migration).toContain("OLD.\"status\" = 'OPEN' AND NEW.\"status\" = 'REJECTED'")
    expect(migration).toContain("OLD.\"status\" = 'APPROVED' AND NEW.\"status\" = 'RESOLVED'")
    expect(migration).toContain("Match exception approval requires an independent approver")
  })

  it("prevents concurrent duplicate active exceptions", () => {
    expect(migration).toContain('CREATE UNIQUE INDEX "supplier_invoice_match_exceptions_active_match_key"')
    expect(migration).toContain("WHERE \"status\" IN ('OPEN', 'APPROVED')")
  })
})
