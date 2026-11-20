const fs = require("node:fs")
const path = require("node:path")

const root = path.resolve(__dirname, "../..")
const bridges = [
  {
    name: "20260621102500_workflow_assurance_enum_bridge",
    requiredEnums: [
      "WorkflowAssuranceWorkflow",
      "WorkflowAssuranceExecutionMode",
      "WorkflowAssuranceResultStatus",
      "WorkflowAssuranceRunType",
      "WorkflowAssuranceRunStatus",
      "WorkflowAssuranceSeverity",
    ],
  },
  {
    name: "20260621112500_workflow_assurance_incident_enum_bridge",
    requiredEnums: [
      "WorkflowAssuranceIncidentStatus",
      "WorkflowAssuranceIncidentEventType",
      "WorkflowAssuranceAlertChannel",
      "WorkflowAssuranceAlertDeliveryStatus",
      "WorkflowAssuranceWaiverStatus",
    ],
  },
]

describe.each(bridges)("workflow assurance schema-scope bridge $name", ({ name, requiredEnums }) => {
  const migration = fs.readFileSync(path.join(root, "prisma", "migrations", name, "migration.sql"), "utf8")

  it("is additive and leaves completed evidence untouched", () => {
    expect(migration).not.toMatch(/\bDROP\b/i)
    expect(migration).not.toMatch(/\bTRUNCATE\b/i)
    expect(migration).not.toMatch(/\bDELETE\s+FROM\b/i)
    expect(migration).not.toMatch(/\bUPDATE\s+\"/i)
    expect(migration).not.toMatch(/\bALTER\s+TABLE\b/i)
  })

  it("checks each enum in the active PostgreSQL namespace", () => {
    expect(migration.match(/n\.nspname = current_schema\(\)/g)).toHaveLength(
      requiredEnums.length,
    )
    const normalized = migration.replace(/\s+/g, " ")
    for (const enumName of requiredEnums) {
      expect(normalized).toContain(
        `JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = '${enumName}' AND n.nspname = current_schema()) THEN CREATE TYPE "${enumName}" AS ENUM`,
      )
    }
  })

  it("does not hardcode the public or certification schema", () => {
    expect(migration).not.toMatch(/\bpublic\b/i)
    expect(migration).not.toContain("codex_pos_commit_result")
  })
})
