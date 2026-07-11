const fs = require("fs")
const path = require("path")

describe("payroll prompt suite index", () => {
  const root = path.resolve(__dirname, "..", "..")
  const suitePath = path.join(
    root,
    "what-next",
    "payroll",
    "AQSTOQFLOW_HR_PAYROLL_EXPERT_GRADE_IMPLEMENTATION_PROMPT_SUITE_2026-06-25.md",
  )

  it("keeps the Prompt 19 source-suite handoff path available and grounded in current reports", () => {
    const content = fs.readFileSync(suitePath, "utf8")

    expect(content).toContain("Prompt 19 Contract")
    expect(content).toContain("Assurance, Chaos, Browser Smoke, And Release Gates")
    expect(content).toContain("P0.31")
    expect(content).toContain("P6.02")
    expect(content).toContain("tenant escape")
    expect(content).toContain("salary leak")
    expect(content).toContain("AQSTOQFLOW_HR_PAYROLL_RELEASE_GATE_SAFETY_CLOSURE_REPORT_2026-07-02.md")
    expect(content).toContain("npm run policy:gates")
    expect(content).toContain("npm test -- --runInBand")
  })

  it("references existing current report files for the required source pack", () => {
    const requiredReports = [
      "AQSTOQFLOW_HR_PAYROLL_ORDERED_PREREQUISITE_IMPLEMENTATION_ROADMAP_2026-06-25.md",
      "AQSTOQFLOW_HR_PAYROLL_ENTERPRISE_COMPLETION_ROADMAP_2026-06-26.md",
      "AQSTOQFLOW_HR_PAYROLL_FINAL_PRODUCTION_READINESS_REPORT_2026-06-27.md",
      "AQSTOQFLOW_HR_PAYROLL_RELEASE_GATE_SAFETY_CLOSURE_REPORT_2026-07-02.md",
      "payroll-immutability-runtime-check.md",
      "payroll-regulatory-hardcode-gate.md",
    ]

    for (const reportName of requiredReports) {
      expect(
        fs.existsSync(path.join(root, "what-next", "payroll", reportName)),
      ).toBe(true)
    }
  })
})
