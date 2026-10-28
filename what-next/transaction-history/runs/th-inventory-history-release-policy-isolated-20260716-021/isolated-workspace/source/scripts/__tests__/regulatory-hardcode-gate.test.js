const fs = require("fs")
const os = require("os")
const path = require("path")
const { spawnSync } = require("child_process")

const scriptPath = path.join(__dirname, "..", "regulatory-hardcode-gate.js")

function makeTempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "regulatory-hardcode-gate-"))
}

function writeFile(root, relativePath, content) {
  const target = path.join(root, relativePath)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, content, "utf8")
}

function runGate(root) {
  return spawnSync(process.execPath, [scriptPath, "--root", root, "--mode", "fail"], {
    cwd: path.join(__dirname, "..", ".."),
    encoding: "utf8",
  })
}

describe("regulatory hardcode gate", () => {
  it("fails when production payroll code contains statutory literals", () => {
    const root = makeTempRoot()
    writeFile(root, "services/payroll/example.ts", "const cnps = { employee: 4.2, monthlyCeiling: 750000 }\n")

    const result = runGate(root)

    expect(result.status).toBe(1)
    expect(result.stdout).toContain("social-contribution-literal")
  })

  it("allows seed and fixture data to contain statutory-looking placeholders", () => {
    const root = makeTempRoot()
    writeFile(root, "prisma/comprehensive-seed.ts", "const taxIdentifier = `SEED-NIU-001-XAF`\n")
    writeFile(root, "__fixtures__/payroll.ts", "const cnps = { employee: 4.2, monthlyCeiling: 750000 }\n")

    const result = runGate(root)

    expect(result.status).toBe(0)
    expect(result.stdout).toContain("No production regulatory hardcodes detected.")
  })
})