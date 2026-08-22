const fs = require("node:fs")
const path = require("node:path")

const root = path.resolve(__dirname, "../..")
const migration = fs.readFileSync(
  path.join(
    root,
    "prisma/migrations/20260818120000_pos_electronic_tender_authority/migration.sql",
  ),
  "utf8",
)
const schema = fs.readFileSync(path.join(root, "prisma/schema.prisma"), "utf8")

describe("POS electronic tender authority migration", () => {
  it("is additive and does not rewrite existing financial or provider truth", () => {
    expect(migration).toContain('ADD COLUMN "providerAuthorityEventId" TEXT')
    expect(migration).not.toMatch(/\bDROP\s+(?:TABLE|TYPE|COLUMN)\b/i)
    expect(migration).not.toMatch(/\bTRUNCATE\b/i)
    expect(migration).not.toMatch(/\bDELETE\s+FROM\b/i)
    expect(migration).not.toMatch(/\bUPDATE\s+(?:"sales_orders"|"payments"|"payment_transactions"|"provider_events")\b/i)
  })

  it("adds the fail-closed unknown state and one provider event per transaction", () => {
    expect(migration).toContain(
      'ALTER TYPE "PaymentTransactionState" ADD VALUE IF NOT EXISTS \'UNKNOWN\'',
    )
    expect(migration).toContain(
      'CREATE UNIQUE INDEX "payment_transactions_providerAuthorityEventId_key"',
    )
    expect(migration).toContain(
      'CREATE UNIQUE INDEX "payment_transactions_organizationId_providerAuthorityEventId_key"',
    )
    expect(schema).toMatch(
      /enum PaymentTransactionState \{[\s\S]*PENDING[\s\S]*PROCESSING[\s\S]*UNKNOWN[\s\S]*CONFIRMED/,
    )
  })

  it("uses a tenant-scoped restrictive provider-event relation", () => {
    expect(migration).toContain(
      'FOREIGN KEY ("organizationId", "providerAuthorityEventId")',
    )
    expect(migration).toContain(
      'REFERENCES "provider_events"("organizationId", "id")',
    )
    expect(migration).toContain("ON DELETE RESTRICT")
    expect(schema).toMatch(
      /providerAuthorityEvent[\s\S]*fields: \[organizationId, providerAuthorityEventId\][\s\S]*references: \[organizationId, id\]/,
    )
  })

  it("prevents cross-provider links and replacement of linked authority evidence", () => {
    expect(migration).toContain(
      'CREATE TRIGGER "payment_transactions_enforce_authority_event_scope_trigger"',
    )
    expect(migration).toContain(
      'provider_event."organizationId" = NEW."organizationId"',
    )
    expect(migration).toContain(
      'provider_event."providerAccountId" = NEW."providerAccountId"',
    )
    expect(migration).toContain(
      'provider_event."providerTransactionId" = NEW."providerTransactionId"',
    )
    expect(migration).toContain(
      'OLD."providerAuthorityEventId" IS DISTINCT FROM NEW."providerAuthorityEventId"',
    )
  })
})
