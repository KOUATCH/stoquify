const fs = require("node:fs")
const path = require("node:path")

const root = path.resolve(__dirname, "../..")
const roleSeedPath = path.join(root, "prisma", "compliance-hris-role-seed.ts")
const realisticSeedPath = path.join(root, "prisma", "realistic-development-seed.ts")
const gitignorePath = path.join(root, ".gitignore")

const requiredRoles = [
  "super_admin",
  "admin",
  "cashier_pos_user",
  "inventory_manager",
  "purchaser",
  "accountant",
  "hr_manager",
  "payroll_administrator",
  "payroll_processor",
  "payroll_approver",
  "maker",
  "checker",
  "database_migration_operator",
  "independent_migration_checker",
  "product_owner",
  "product_approver",
  "financial_controller",
  "controller_approver",
  "payments_owner",
  "retail_operations_owner",
  "pos_architect",
  "security_owner",
  "treasury_owner",
  "risk_owner",
  "qa_owner",
  "support_owner",
  "sre_owner",
  "order_to_cash_product_owner",
  "qualified_accounting_reviewer",
  "qualified_cameroon_country_pack_reviewer",
  "inventory_controller",
  "fulfillment_owner",
  "accounting_owner",
  "attendance_time_administrator",
  "employee_self_service",
  "auditor",
  "branch_manager",
]

const documentCandidates = [
  ["product_owner", "Arielle", "Yongwa"],
  ["financial_controller", "Tchami", "Jennifer"],
  ["payments_owner", "Yonga", "Junie"],
  ["retail_operations_owner", "Tamen", "Max"],
  ["pos_architect", "tchakoumiLorrain", ""],
  ["security_owner", "Yonga", "Springfield"],
  ["treasury_owner", "Tamen", "Stanick"],
  ["risk_owner", "Tamen", "Martial"],
  ["qa_owner", "Sonkeng", "Steve"],
  ["support_owner", "Etoo", "Naomie"],
  ["qualified_cameroon_country_pack_reviewer", "Kouatchoua", "mMark"],
  ["sre_owner", "Ronald", "Djakou"],
  ["order_to_cash_product_owner", "Tamen", "Marceline"],
  ["qualified_accounting_reviewer", "Tchana", "Nikita"],
  ["inventory_controller", "Tchana", "Rose"],
  ["fulfillment_owner", "Yonga", "Lysette"],
  ["accounting_owner", "Yongwa", "Eli"],
]

describe("compliance HRIS role seed contract", () => {
  const roleSeed = fs.readFileSync(roleSeedPath, "utf8")
  const catalogSource = roleSeed.split("export const COMPLIANCE_HRIS_ROLE_CODES")[0]
  const roleCodes = [...catalogSource.matchAll(/code: "([^"]+)"/g)].map((match) => match[1])

  test("defines one unique persona for every required system and governance role", () => {
    expect(roleCodes).toHaveLength(42)
    expect(new Set(roleCodes).size).toBe(roleCodes.length)
    expect(roleCodes).toEqual(expect.arrayContaining(requiredRoles))
  })

  test("maps supplied identities without claiming signatures or qualifications", () => {
    expect(documentCandidates).toHaveLength(17)
    expect(new Set(documentCandidates.map(([roleCode]) => roleCode)).size).toBe(17)
    for (const [roleCode, firstName, lastName] of documentCandidates) {
      expect(roleSeed).toContain(
        `{ roleCode: "${roleCode}", sourceName: { firstName: "${firstName}", lastName: "${lastName}" } }`,
      )
    }
    for (const suppliedName of ["Sango", "Malo", "Maximilliano", "Bonga", "Kouatchoua", "Mark"]) {
      expect(roleSeed).toContain(suppliedName)
    }
    expect(roleSeed).toContain(
      "docs/blockers-and-gates/hris-payroll-compliance-prefill/COMPLIANCE_AUTHORIZATION_G1_EVIDENCE_RECONCILED_WORKING_COPY_2026-08-19.docx",
    )
    expect(roleSeed).toContain("RBAC_AND_HRIS_CONTEXT_ONLY")
    expect(roleSeed).toContain("UNRESOLVED_NO_AUTHENTIC_SIGNATURE")
    expect(roleSeed).toContain("SYNTHETIC_QUALIFICATION_PENDING")
  })

  test("runs the augmentation through the canonical realistic seed", () => {
    const realisticSeed = fs.readFileSync(realisticSeedPath, "utf8")
    expect(realisticSeed).toContain("ensureComplianceHrisRoleCoverage")
    expect(realisticSeed).toContain("minimumRoleCountPerOrganization: COMPLIANCE_HRIS_ROLE_COUNT")
  })

  test("keeps the plaintext password document out of Git", () => {
    const gitignore = fs.readFileSync(gitignorePath, "utf8")
    expect(gitignore).toContain("/docs/blockers-and-gates/Development database roles and passwords.docx")
    expect(gitignore).toContain(".seed-artifacts/")
  })
})
