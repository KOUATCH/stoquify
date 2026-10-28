const fs = require("fs")
const path = require("path")

const migrationPath = path.join(
  __dirname,
  "..",
  "..",
  "prisma",
  "migrations",
  "20260815190000_payment_reconciliation_evidence_immutability",
  "migration.sql",
)

const migrationSql = fs.readFileSync(migrationPath, "utf8")

describe("payment reconciliation evidence immutability migration", () => {
  it.each([
    [
      "provider_events",
      "payment_reconciliation_provider_events_prevent_evidence_mutation_trigger",
    ],
    [
      "statement_files",
      "payment_reconciliation_statement_files_prevent_evidence_mutation_trigger",
    ],
    [
      "statement_lines",
      "payment_reconciliation_statement_lines_prevent_evidence_mutation_trigger",
    ],
  ])("installs an update and delete guard for %s", (tableName, triggerName) => {
    expect(migrationSql).toContain(`BEFORE UPDATE OR DELETE ON "${tableName}"`)
    expect(migrationSql).toContain(`"${triggerName}"`)
  })

  it("keeps source evidence immutable while allowing processing lifecycle fields", () => {
    expect(migrationSql).toContain(
      'CREATE OR REPLACE FUNCTION "payment_reconciliation_assert_immutable_evidence"',
    )
    expect(migrationSql).toContain(
      "Cannot modify immutable payment reconciliation evidence",
    )
    expect(migrationSql).toContain(
      "Cannot delete immutable payment reconciliation evidence",
    )
    expect(migrationSql).toContain(
      "ARRAY['updatedAt', 'status', 'processedAt', 'correlationId', 'traceId', 'archivedAt', 'legalHoldAt']::TEXT[]",
    )
    expect(migrationSql).toContain(
      "ARRAY['updatedAt', 'status', 'archivedAt', 'legalHoldAt']::TEXT[]",
    )
  })

  it("allows a statement storage key to be attached once but never replaced", () => {
    expect(migrationSql).toContain('OLD."encryptedObjectKey" IS NOT NULL')
    expect(migrationSql).toContain(
      'NEW."encryptedObjectKey" IS DISTINCT FROM OLD."encryptedObjectKey"',
    )
    expect(migrationSql).toContain(
      "Cannot replace immutable payment reconciliation evidence storage key",
    )
  })
})
