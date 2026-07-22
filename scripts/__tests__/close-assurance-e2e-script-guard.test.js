const fs = require("fs")
const path = require("path")

describe("close-assurance e2e package script guard", () => {
  it("runs the non-mutating DB preflight before migrations and seed data", () => {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8"),
    )
    const command = packageJson.scripts["test:e2e:close-assurance"]

    expect(command).toMatch(/^npm run test:e2e:close-assurance:preflight && /)
    expect(command.indexOf("test:e2e:close-assurance:preflight")).toBeLessThan(
      command.indexOf("prisma:migrate:deploy"),
    )
    expect(command.indexOf("prisma:migrate:deploy")).toBeLessThan(
      command.indexOf("seed:e2e:payroll"),
    )
    expect(command).toContain("--project=close-assurance-authenticated-smoke")
    expect(command.indexOf("--project=close-assurance-authenticated-smoke")).toBeLessThan(
      command.indexOf("test:e2e:close-assurance:artifact-gate"),
    )
  })
})