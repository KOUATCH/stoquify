const path = require("path")

const packageJson = require(path.join("..", "..", "package.json"))

describe("policy gates", () => {
  it("uses the retry-safe integration gate runner", () => {
    expect(packageJson.scripts["policy:gates:integration"]).toBe(
      "node scripts/run-policy-gates-integration.js",
    )
  })
  it("runs the workflow assurance runtime table check in the release policy path", () => {
    expect(packageJson.scripts["workflow:assurance:runtime-check"]).toBe(
      "node scripts/workflow-assurance-runtime-table-check.js --mode fail",
    )
    expect(packageJson.scripts["policy:gates"]).toContain("npm run workflow:assurance:runtime-check")
  })

  it("runs the payroll presence readiness gate before immutability in the release policy path", () => {
    expect(packageJson.scripts["payroll:presence:gate"]).toBe(
      "node scripts/payroll-presence-readiness-gate.js --mode fail --out what-next/payroll/payroll-presence-readiness.md --json-out what-next/payroll/payroll-presence-readiness.json",
    )
    expect(packageJson.scripts["policy:gates"]).toContain("npm run payroll:presence:gate")
    expect(packageJson.scripts["policy:gates"].indexOf("npm run payroll:presence:gate")).toBeLessThan(
      packageJson.scripts["policy:gates"].indexOf("npm run payroll:immutability:runtime"),
    )
  })

  it("runs the payroll immutability runtime proof in the release policy path", () => {
    expect(packageJson.scripts["payroll:immutability:runtime"]).toBe(
      "npm run payroll:immutability:prepare && node scripts/with-payroll-immutability-test-db.js -- node scripts/payroll-immutability-runtime-check.js --mode fail --skip-migrate --out what-next/payroll/payroll-immutability-runtime-check.md --json-out what-next/payroll/payroll-immutability-runtime-check.json",
    )
    expect(packageJson.scripts["payroll:immutability:prepare"]).toBe(
      "node scripts/with-payroll-immutability-test-db.js -- node scripts/reset-payroll-immutability-test-db.js",
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

  it("runs the inventory valuation truth gate in the release policy path", () => {
    expect(packageJson.scripts["inventory:boundary"]).toBe(
      "node scripts/inventory-boundary-gate.js --mode fail",
    )
    expect(packageJson.scripts["inventory:valuation:truth:gate"]).toBe(
      "node scripts/inventory-valuation-truth-gate.js --mode fail --out what-next/inventory-valuation-truth-readiness.md --json-out what-next/inventory-valuation-truth-readiness.json",
    )
    expect(packageJson.scripts["policy:gates"]).toContain("npm run inventory:valuation:truth:gate")
    expect(packageJson.scripts["policy:gates"].indexOf("npm run inventory:boundary")).toBeLessThan(
      packageJson.scripts["policy:gates"].indexOf("npm run inventory:valuation:truth:gate"),
    )
  })
  it("runs the AP fraud-control gate in the release policy path", () => {
    expect(packageJson.scripts["ap:fraud-control:readiness"]).toContain("--mode report")
    expect(packageJson.scripts["ap:fraud-control:gate"]).toBe(
      "node scripts/ap-fraud-control-readiness.js --mode fail --out what-next/ap-fraud-control-readiness.md --json-out what-next/ap-fraud-control-readiness.json",
    )
    expect(packageJson.scripts["policy:gates"]).toContain("npm run ap:fraud-control:gate")
    expect(packageJson.scripts["policy:gates"].indexOf("npm run purchasing:ap:gate")).toBeLessThan(
      packageJson.scripts["policy:gates"].indexOf("npm run ap:fraud-control:gate"),
    )
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
