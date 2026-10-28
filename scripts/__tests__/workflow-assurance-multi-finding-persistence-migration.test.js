const fs = require("node:fs")
const path = require("node:path")

const ROOT = path.resolve(__dirname, "../..")
const MIGRATION = path.join(
  ROOT,
  "prisma/migrations/20260720210000_workflow_assurance_multi_finding_persistence/migration.sql",
)

describe("Workflow Assurance multi-finding persistence migration", () => {
  const migration = fs.readFileSync(MIGRATION, "utf8")
  const schema = fs.readFileSync(path.join(ROOT, "prisma/schema.prisma"), "utf8")
  const persistence = fs.readFileSync(
    path.join(ROOT, "services/assurance/assurance-registry-persistence.service.ts"),
    "utf8",
  )
  const registry = fs.readFileSync(
    path.join(ROOT, "services/assurance/assurance-registry.service.ts"),
    "utf8",
  )

  it("adds paired replay identity and a tenant/check/version execution key", () => {
    expect(schema).toMatch(/executionKey\s+String\?\s+@db\.VarChar\(200\)/)
    expect(schema).toMatch(/executionDigest\s+String\?\s+@db\.VarChar\(71\)/)
    expect(schema).toContain('name: "workflow_assurance_run_execution_key"')
    expect(migration).toContain("workflow_assurance_check_runs_execution_identity_check")
    expect(migration).toContain('CREATE UNIQUE INDEX "workflow_assurance_run_execution_key"')
  })

  it("creates immutable ordered finding evidence with database constraints", () => {
    expect(schema).toContain("model WorkflowAssuranceCheckFinding")
    expect(schema).toContain('@@map("workflow_assurance_check_findings")')
    expect(migration).toContain('CREATE TABLE "workflow_assurance_check_findings"')
    expect(migration).toContain("workflow_assurance_check_findings_ordinal_check")
    expect(migration).toContain("workflow_assurance_check_findings_checkRunId_ordinal_key")
    expect(migration).toContain("workflow_assurance_check_findings_checkRunId_fingerprint_key")
    expect(migration).toContain("workflow_assurance_check_findings_prevent_mutation_trigger")
  })

  it("keeps all definition evidence inside one Serializable transaction", () => {
    expect(persistence).toContain("Prisma.TransactionIsolationLevel.Serializable")
    expect(persistence).toContain("upsertWorkflowAssuranceIncidentFromResultInTx")
    expect(persistence).toContain("tx.workflowAssuranceCheckFinding.create")
    expect(persistence).toContain("workflow_assurance_run_execution_key")
  })

  it("does not activate the POS cash-shortage detector, worker, or scheduler", () => {
    expect(registry).not.toContain("pos.closed_shift_cash_shortage.review")
    expect(registry).not.toContain("pos-shift-cash-shortage-evaluation-batch")
    expect(persistence).not.toMatch(/checkpoint|lease|watermark|dead.?letter|cron/i)
  })

  it("does not rewrite or delete historical assurance rows", () => {
    expect(migration).not.toMatch(/^\s*DELETE\s+FROM\s+/im)
    expect(migration).not.toMatch(/^\s*UPDATE\s+"workflow_assurance_/im)
  })
})
