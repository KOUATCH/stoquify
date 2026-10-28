const fs = require("fs")
const path = require("path")

const root = path.resolve(__dirname, "..", "..")
const migration = fs.readFileSync(
  path.join(
    root,
    "prisma",
    "migrations",
    "20260719203000_workflow_assurance_stable_case_identity",
    "migration.sql",
  ),
  "utf8",
)
const schema = fs.readFileSync(path.join(root, "prisma", "schema.prisma"), "utf8")

describe("Workflow Assurance stable case identity migration", () => {
  it("fails closed on duplicate logical identities before changing enum or indexes", () => {
    expect(migration).toMatch(
      /GROUP BY\s+"organizationId",\s*"checkKey",\s*"definitionVersion",\s*"sourceType",\s*"sourceId"/,
    )
    expect(migration).toMatch(/HAVING COUNT\(\*\) > 1/)
    expect(migration).toMatch(/duplicate logical cases require adjudication/i)

    const preflight = migration.indexOf("DO $$")
    const enumChange = migration.indexOf('ALTER TYPE "WorkflowAssuranceIncidentEventType"')
    const oldIndexDrop = migration.indexOf('DROP INDEX IF EXISTS "workflow_assurance_incident_dedupe_key"')

    expect(preflight).toBeGreaterThanOrEqual(0)
    expect(preflight).toBeLessThan(enumChange)
    expect(preflight).toBeLessThan(oldIndexDrop)
    expect(migration).not.toMatch(/\b(?:DELETE|UPDATE)\s+"workflow_assurance_incidents"/i)
  })

  it("replaces mutable evidence dedupe with direct logical identity uniqueness", () => {
    expect(migration).toContain('DROP INDEX IF EXISTS "workflow_assurance_incident_dedupe_key"')
    expect(migration).toMatch(
      /CREATE UNIQUE INDEX IF NOT EXISTS "workflow_assurance_incident_identity_key"[\s\S]*"organizationId"[\s\S]*"checkKey"[\s\S]*"definitionVersion"[\s\S]*"sourceType"[\s\S]*"sourceId"/,
    )
    expect(schema).toContain(
      '@@unique([organizationId, checkKey, definitionVersion, sourceType, sourceId], name: "workflow_assurance_incident_identity_key")',
    )
    expect(schema).not.toContain("workflow_assurance_incident_dedupe_key")
  })

  it("adds an explicit source-evidence change event", () => {
    expect(migration).toMatch(/ADD VALUE IF NOT EXISTS 'SOURCE_CHANGED'/)
    expect(schema).toMatch(/enum WorkflowAssuranceIncidentEventType \{[\s\S]*\bSOURCE_CHANGED\b/)
  })
})
