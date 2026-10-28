const fs = require("node:fs")
const path = require("node:path")

const root = path.resolve(__dirname, "../..")
const migration = fs.readFileSync(
  path.join(
    root,
    "prisma/migrations/20260817120000_pos_commit_result_registry/migration.sql",
  ),
  "utf8",
)
const schema = fs.readFileSync(path.join(root, "prisma/schema.prisma"), "utf8")

describe("POS commit result replay registry migration", () => {
  it("is additive and does not rewrite or remove existing transaction truth", () => {
    expect(migration).toContain('CREATE TABLE "pos_commit_results"')
    expect(migration).not.toMatch(/\bDROP\s+(?:TABLE|TYPE|COLUMN)\b/i)
    expect(migration).not.toMatch(/\bTRUNCATE\b/i)
    expect(migration).not.toMatch(/\bDELETE\s+FROM\b/i)
    expect(migration).not.toMatch(/\bUPDATE\s+(?:"sales_orders"|"payments"|"inventory_transactions"|"journal_entries")\b/i)
  })

  it("claims each organization-terminal client id exactly once", () => {
    expect(migration).toContain(
      'CREATE UNIQUE INDEX "pos_commit_results_organizationId_terminalId_clientCommitId_key"',
    )
    expect(migration).toContain(
      'ON "pos_commit_results"("organizationId", "terminalId", "clientCommitId")',
    )
    expect(migration).toContain('"requestHash" ~ \'^[0-9a-f]{64}$\'')
    expect(migration).toContain('"requestSchemaVersion" > 0')
  })

  it("enforces monotonic lifecycle and immutable completed evidence", () => {
    expect(migration).toContain(
      'CREATE TRIGGER "pos_commit_results_enforce_lifecycle_trigger"',
    )
    expect(migration).toContain("OLD.\"status\" = 'CLAIMED' AND NEW.\"status\" <> 'COMMITTED'")
    expect(migration).toContain("OLD.\"status\" = 'COMMITTED' AND NEW.\"status\" <> 'COMPLETED'")
    expect(migration).toContain("OLD.\"status\" = 'COMPLETED'")
    expect(migration).toContain("TG_OP = 'DELETE'")
    expect(migration).toContain('OLD."requestHash" IS DISTINCT FROM NEW."requestHash"')
  })

  it("uses restrictive source relations and a matching Prisma model", () => {
    for (const relation of [
      "organizationId",
      "locationId",
      "terminalId",
      "sessionId",
      "salesOrderId",
      "actorId",
    ]) {
      expect(migration).toMatch(
        new RegExp(
          `ADD CONSTRAINT "pos_commit_results_${relation}_fkey"[\\s\\S]*ON DELETE RESTRICT`,
        ),
      )
    }
    expect(schema).toMatch(
      /model POSCommitResult \{[\s\S]*@@unique\(\[organizationId, terminalId, clientCommitId\]\)[\s\S]*@@map\("pos_commit_results"\)/,
    )
    expect(schema).toMatch(/enum POSCommitResultStatus \{\s+CLAIMED\s+COMMITTED\s+COMPLETED\s+\}/)
  })

  it("rejects cross-tenant and cross-terminal source combinations at insert time", () => {
    expect(migration).toContain(
      'CREATE TRIGGER "pos_commit_results_enforce_scope_trigger"',
    )
    expect(migration).toContain('terminal."organizationId" = NEW."organizationId"')
    expect(migration).toContain('terminal."locationId" = NEW."locationId"')
    expect(migration).toContain('pos_session."terminalId" = NEW."terminalId"')
    expect(migration).toContain('pos_session."userId" = NEW."actorId"')
    expect(migration).toContain('sale."sessionId" = NEW."sessionId"')
    expect(migration).toContain('sale."createdById" = NEW."actorId"')
    expect(migration).toContain('actor."organizationId" = NEW."organizationId"')
  })
})
