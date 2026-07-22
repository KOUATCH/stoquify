const fs = require("node:fs")
const path = require("node:path")

const ROOT = path.resolve(__dirname, "../..")
const SCAN_ROOTS = ["actions", "app", "components", "hooks", "services"]
const ALLOWED_FILES = new Set([
  "services/hris/employee.service.ts",
  "services/payroll/employee.service.ts",
])
const PHYSICAL_WRITERS = new Set([
  "attachPayrollEmployeeEvidenceReferences",
  "upsertPayrollEmployeeSourceProfile",
])

function productionFiles(relativeDirectory) {
  const absoluteDirectory = path.join(ROOT, relativeDirectory)
  if (!fs.existsSync(absoluteDirectory)) return []

  return fs.readdirSync(absoluteDirectory, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = path.posix.join(relativeDirectory.replaceAll("\\", "/"), entry.name)
    if (entry.isDirectory()) {
      if (entry.name === "__tests__" || entry.name === "graphify-out") return []
      return productionFiles(relativePath)
    }
    return /\.(?:ts|tsx)$/.test(entry.name) ? [relativePath] : []
  })
}

function importedPhysicalWriters(source) {
  const imports = source.matchAll(
    /import\s*\{([^}]*)\}\s*from\s*["']@\/services\/payroll\/employee\.service["']/g,
  )
  return [...imports].flatMap((match) => match[1]
    .split(",")
    .map((name) => name.trim().split(/\s+as\s+/)[0])
    .filter((name) => PHYSICAL_WRITERS.has(name)))
}

describe("HRIS employee writer boundary", () => {
  it("keeps physical Payroll employee writers behind the HRIS facade", () => {
    const violations = SCAN_ROOTS.flatMap(productionFiles)
      .filter((file) => !ALLOWED_FILES.has(file))
      .flatMap((file) => importedPhysicalWriters(fs.readFileSync(path.join(ROOT, file), "utf8"))
        .map((writer) => `${file}: ${writer}`))

    expect(violations).toEqual([])
  })

  it("keeps the HRIS facade as the compatibility-storage adapter", () => {
    const facade = fs.readFileSync(path.join(ROOT, "services/hris/employee.service.ts"), "utf8")

    expect(importedPhysicalWriters(facade).sort()).toEqual([
      "attachPayrollEmployeeEvidenceReferences",
      "upsertPayrollEmployeeSourceProfile",
    ])
    expect(facade).toContain('sourceOwner: "HRIS_PEOPLE_CORE"')
    expect(facade).toContain('duplicateEmployeeMasterAllowed: false')
  })
})
