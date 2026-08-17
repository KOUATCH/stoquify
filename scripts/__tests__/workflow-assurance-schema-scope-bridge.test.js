const fs = require("node:fs")
const path = require("node:path")

const root = path.resolve(__dirname, "../..")
const migration = fs.readFileSync(
  path.join(
    root,
    "prisma/migrations/20260621102500_workflow_assurance_schema_scope_bridge/migration.sql",
  ),
  "utf8",
)

const requiredEnums = [
  "WorkflowAssuranceWorkflow",
  "WorkflowAssuranceExecutionMode",
  "WorkflowAssuranceResultStatus",
  "WorkflowAssuranceRunType",
  "WorkflowAssuranceRunStatus",
  "WorkflowAssuranceSeverity",
  "WorkflowAssuranceIncidentStatus",
  "WorkflowAssuranceIncidentEventType",
  "WorkflowAssuranceAlertChannel",
  "WorkflowAssuranceAlertDeliveryStatus",
  "WorkflowAssuranceWaiverStatus",
]

describe("workflow assurance schema-scope bridge migration", () => {
  it("is additive and leaves completed evidence untouched", () => {
    expect(migration).not.toMatch(/\bDROP\b/i)
    expect(migration).not.toMatch(/\bTRUNCATE\b/i)
    expect(migration).not.toMatch(/\bDELETE\s+FROM\b/i)
    expect(migration).not.toMatch(/\bUPDATE\s+\"/i)
    expect(migration).not.toMatch(/\bALTER\s+TABLE\b/i)
  })

  it("checks each enum in the active PostgreSQL namespace", () => {
    expect(migration.match(/namespace_entry\.nspname = current_schema\(\)/g)).toHaveLength(
      requiredEnums.length,
    )
    for (const enumName of requiredEnums) {
      expect(migration).toContain(`type_entry.typname = '${enumName}'`)
      expect(migration).toContain(`CREATE TYPE "${enumName}" AS ENUM`)
    }
  })

  it("does not hardcode the public or certification schema", () => {
    expect(migration).not.toMatch(/\bpublic\b/i)
    expect(migration).not.toContain("codex_pos_commit_result")
  })
})
