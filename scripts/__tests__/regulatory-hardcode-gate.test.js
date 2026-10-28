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
    writeFile(root, "scripts/inventory-items-e2e-fixture.js", "const vat = { name: 'E2E VAT 19.25', rate: 19.25 }\n")

    const result = runGate(root)

    expect(result.status).toBe(0)
    expect(result.stdout).toContain("No production regulatory hardcodes detected.")
  })

  it("still rejects statutory literals in production services", () => {
    const root = makeTempRoot()
    writeFile(root, "services/inventory/item-tax.service.ts", "const vat = { name: 'VAT 19.25', rate: 19.25 }\n")

    const result = runGate(root)

    expect(result.status).toBe(1)
    expect(result.stdout).toContain("country-vat-rate-literal")
  })

  it("keeps the inventory E2E fixture exclusion limited to the exact reviewed file", () => {
    const root = makeTempRoot()
    writeFile(root, "scripts/inventory-items-e2e-fixture-copy.js", "const vat = { name: 'VAT 19.25', rate: 19.25 }\n")

    const result = runGate(root)

    expect(result.status).toBe(1)
    expect(result.stdout).toContain("country-vat-rate-literal")
  })

  it("ignores archived docs and generated evidence snapshots", () => {
    const root = makeTempRoot()
    writeFile(root, "docs/landing page/current-landing-page-snapshot-2026-07-19/components/landing/people-to-pay.tsx", "const cnps = { employee: 4.2, monthlyCeiling: 750000 }\n")
    writeFile(root, "what-next/archive/generated.ts", "const cnps = { employee: 4.2, monthlyCeiling: 750000 }\n")
    writeFile(root, ".codex-assurance-prisma/client/index.js", "const providers = ['MTN_MOMO', 'ORANGE_MONEY']; const vat = 19.25\n")

    const result = runGate(root)

    expect(result.status).toBe(0)
    expect(result.stdout).toContain("No production regulatory hardcodes detected.")
  })
})
