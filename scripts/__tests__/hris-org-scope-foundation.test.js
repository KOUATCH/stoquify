const fs = require("node:fs")
const path = require("node:path")

const root = path.resolve(__dirname, "../..")
const schema = fs.readFileSync(path.join(root, "prisma/schema.prisma"), "utf8")
const migration = fs.readFileSync(
  path.join(root, "prisma/migrations/20260719190000_hris_org_manager_scope_foundation/migration.sql"),
  "utf8",
)
const approvalService = fs.readFileSync(
  path.join(root, "services/hris/approval-inbox.service.ts"),
  "utf8",
)

describe("HRIS organization scope relational boundary", () => {
  it.each([
    "HrisOrgUnit",
    "HrisPosition",
    "HrisEmploymentAssignment",
    "HrisReportingRelationship",
    "HrisManagerDelegation",
  ])("declares the canonical %s model", (model) => {
    expect(schema).toMatch(new RegExp(`model ${model} \\{`))
  })

  it("enforces tenant ownership on every organization-scope relationship edge", () => {
    const requiredCompositeTargets = [
      'REFERENCES "locations"("organizationId", "id")',
      'REFERENCES "payroll_employees"("organizationId", "id")',
      'REFERENCES "hris_org_units"("organizationId", "id")',
      'REFERENCES "hris_positions"("organizationId", "id")',
      'REFERENCES "hris_employment_assignments"("organizationId", "id")',
      'REFERENCES "hris_reporting_relationships"("organizationId", "id")',
      'REFERENCES "hris_manager_delegations"("organizationId", "id")',
    ]
    for (const target of requiredCompositeTargets) expect(migration).toContain(target)
  })

  it("requires valid effective periods, non-self authority, and hashed evidence", () => {
    expect(migration).toContain("hris_org_units_effective_period_check")
    expect(migration).toContain("hris_reporting_relationships_people_check")
    expect(migration).toContain("hris_manager_delegations_effective_period_check")
    expect(migration).toContain("hris_manager_delegations_people_check")
    expect(migration).toContain("hris_reporting_relationships_hash_check")
    expect(migration).toContain("hris_manager_delegations_hash_check")
  })

  it("forces approval decisions through decision-time delegated authority resolution", () => {
    const decisionSlice = approvalService.slice(
      approvalService.indexOf("export async function decideHrisApprovalInboxItem"),
    )
    expect(decisionSlice).toContain("resolveHrisPeopleAccessScope({")
    expect(decisionSlice).toContain("asOf: new Date()")
    expect(decisionSlice).toContain('delegationAuthority: "APPROVAL_DECISION"')
  })
})
