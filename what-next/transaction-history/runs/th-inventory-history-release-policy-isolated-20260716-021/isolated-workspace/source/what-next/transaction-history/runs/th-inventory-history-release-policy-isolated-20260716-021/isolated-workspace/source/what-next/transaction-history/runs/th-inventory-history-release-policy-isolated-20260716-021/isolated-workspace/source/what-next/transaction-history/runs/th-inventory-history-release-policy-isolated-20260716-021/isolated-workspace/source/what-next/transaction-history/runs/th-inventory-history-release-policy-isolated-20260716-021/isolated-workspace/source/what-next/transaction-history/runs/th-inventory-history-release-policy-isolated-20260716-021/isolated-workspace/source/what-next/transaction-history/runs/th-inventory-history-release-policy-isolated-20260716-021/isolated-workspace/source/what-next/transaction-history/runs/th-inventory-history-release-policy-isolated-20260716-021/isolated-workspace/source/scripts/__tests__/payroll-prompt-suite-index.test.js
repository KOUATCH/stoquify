const fs = require("fs")
const path = require("path")

describe("payroll prompt suite index", () => {
  const root = path.resolve(__dirname, "..", "..")
  const canonicalSuitePath = path.join(
    root,
    "docs",
    "prompts",
    "skills",
    "AQSTOQFLOW_HR_PAYROLL_EXPERT_GRADE_IMPLEMENTATION_PROMPT_SUITE_2026-06-25.md",
  )
  const moveMapPath = path.join(root, "docs", "_inventory", "documentation-move-map-2026-06-25.csv")
  const legacySuiteRelativePath =
    "what-next/payroll/AQSTOQFLOW_HR_PAYROLL_EXPERT_GRADE_IMPLEMENTATION_PROMPT_SUITE_2026-06-25.md"
  const canonicalSuiteRelativePath =
    "docs/prompts/skills/AQSTOQFLOW_HR_PAYROLL_EXPERT_GRADE_IMPLEMENTATION_PROMPT_SUITE_2026-06-25.md"
  const payrollReportsPath = path.join(root, "what-next", "payroll")

  it("keeps the Prompt 19 canonical source-suite handoff available and grounded in current reports", () => {
    const content = fs.readFileSync(canonicalSuitePath, "utf8")
    const moveMap = fs.readFileSync(moveMapPath, "utf8")

    expect(moveMap).toContain(`"${legacySuiteRelativePath}","${canonicalSuiteRelativePath}"`)
    expect(content).toContain("## Prompt 19: Assurance, Chaos, Browser Smoke, And Release Gates")
    expect(content).toContain("Assurance, Chaos, Browser Smoke, And Release Gates")
    expect(content).toContain("P0.31")
    expect(content).toContain("P6.02")
    expect(content).toContain("tenant escape")
    expect(content).toContain("salary leak")
    expect(content).toContain("npm run policy:gates")
    expect(content).toContain("Full relevant test matrix")
    expect(content).toContain("Static scan for unfinished production surfaces")
  })

  it("references existing current report files for the required source pack", () => {
    const requiredReports = [
      "AQSTOQFLOW_HR_PAYROLL_ORDERED_PREREQUISITE_IMPLEMENTATION_ROADMAP_2026-06-25.md",
      "AQSTOQFLOW_HR_PAYROLL_ENTERPRISE_COMPLETION_ROADMAP_2026-06-26.md",
      "AQSTOQFLOW_HR_PAYROLL_FINAL_PRODUCTION_READINESS_REPORT_2026-06-27.md",
      "AQSTOQFLOW_HR_PAYROLL_PHASE_1_ASSURANCE_RELEASE_GATES_REPORT_2026-06-27.md",
      "AQSTOQFLOW_HR_PAYROLL_PROMPT_19_BROWSER_SMOKE_WARMUP_GATE_REPORT_2026-07-02.md",
      "AQSTOQFLOW_HR_PAYROLL_PILOT_CERTIFICATION_FINAL_READINESS_CLOSE_PACK_REPORT_2026-07-02.md",
      "payroll-immutability-runtime-check.md",
      "payroll-regulatory-hardcode-gate.md",
    ]

    for (const reportName of requiredReports) {
      expect(fs.existsSync(path.join(payrollReportsPath, reportName))).toBe(true)
    }
  })
})
