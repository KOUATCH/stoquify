const fs = require("node:fs")
const os = require("node:os")
const path = require("node:path")

const {
  buildRegulatoryBoundaryReport,
} = require("../regulatory-boundary-gate")

function write(root, relativePath, source) {
  const target = path.join(root, relativePath)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, source)
}

describe("regulatory boundary gate", () => {
  let root

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "regulatory-boundary-"))
  })

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true })
  })

  it("accepts consumers of the public regulatory boundary", () => {
    write(
      root,
      "services/payroll/payroll.service.ts",
      'import { resolveRegulatoryParameter } from "@/services/regulatory/regulatory-capability.service"\n',
    )

    expect(buildRegulatoryBoundaryReport(root)).toMatchObject({
      status: "READY",
      violations: [],
    })
  })

  it("blocks direct country-pack imports from feature modules", () => {
    write(
      root,
      "services/payroll/payroll.service.ts",
      'import { resolveRegulatoryParameter } from "@/services/regulatory/country-packs/resolve"\n',
    )

    expect(buildRegulatoryBoundaryReport(root)).toMatchObject({
      status: "BLOCKED",
      violations: ["services/payroll/payroll.service.ts"],
    })
  })

  it("allows the published country-pack adapter to own the implementation import", () => {
    write(
      root,
      "services/regulatory/adapters/published-country-pack.adapter.ts",
      'import { resolveRegulatoryParameter } from "../country-packs/resolve"\n',
    )

    expect(buildRegulatoryBoundaryReport(root).status).toBe("READY")
  })
})

