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

  it("runs the workflow assurance release gate in the release policy path", () => {
    expect(packageJson.scripts["workflow:assurance:release-gate"]).toBe(
      "node scripts/workflow-assurance-release-gate.js --mode fail",
    )
    expect(packageJson.scripts["policy:gates"]).toContain("npm run workflow:assurance:release-gate")
  })

  it("runs the Kontava moat release gate in the release policy path", () => {
    expect(packageJson.scripts["kontava:moat:release-gate"]).toBe(
      "node scripts/kontava-moat-release-gate.js --mode fail",
    )
    expect(packageJson.scripts["policy:gates"]).toContain("npm run kontava:moat:release-gate")
  })

  it("runs the public receipt token config gate in the release policy path", () => {
    expect(packageJson.scripts["receipt:token:config-gate"]).toBe(
      "node scripts/public-receipt-token-config-gate.js --mode fail --release auto",
    )
    expect(packageJson.scripts["policy:gates"]).toContain("npm run receipt:token:config-gate")
  })

  it("keeps module inventory report-only while running API guard inventory in fail mode", () => {
    expect(packageJson.scripts["module:surface:inventory"]).toContain("--mode report")
    expect(packageJson.scripts["api:guard:inventory"]).toContain("--mode report")
    expect(packageJson.scripts["api:guard:inventory:fail"]).toBe(
      "node scripts/api-route-guard-inventory.js --mode fail --out what-next/api-route-guard-inventory.md --json-out what-next/api-route-guard-inventory.json",
    )
    expect(packageJson.scripts["policy:gates"]).not.toContain("module:surface:inventory")
    expect(packageJson.scripts["policy:gates"]).toContain("npm run api:guard:inventory:fail")
  })
})
