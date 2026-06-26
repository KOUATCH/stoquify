const path = require("path")

const packageJson = require(path.join("..", "..", "package.json"))

describe("policy gates", () => {
  it("runs the workflow assurance runtime table check in the release policy path", () => {
    expect(packageJson.scripts["workflow:assurance:runtime-check"]).toBe(
      "node scripts/workflow-assurance-runtime-table-check.js --mode fail",
    )
    expect(packageJson.scripts["policy:gates"]).toContain("npm run workflow:assurance:runtime-check")
  })

  it("runs the payroll immutability runtime proof in the release policy path", () => {
    expect(packageJson.scripts["payroll:immutability:runtime"]).toBe(
      "node scripts/with-payroll-immutability-test-db.js -- node scripts/payroll-immutability-runtime-check.js --mode fail --out what-next/payroll/payroll-immutability-runtime-check.md --json-out what-next/payroll/payroll-immutability-runtime-check.json",
    )
    expect(packageJson.scripts["payroll:immutability:runtime"]).toContain("with-payroll-immutability-test-db.js")
    expect(packageJson.scripts["policy:gates"]).toContain("npm run payroll:immutability:runtime")
  })

  it("runs the regulatory hardcode gate in the release policy path", () => {
    expect(packageJson.scripts["regulatory:hardcode:fail"]).toBe(
      "node scripts/regulatory-hardcode-gate.js --mode fail",
    )
    expect(packageJson.scripts["policy:gates"]).toContain("npm run regulatory:hardcode:fail")
  })
})