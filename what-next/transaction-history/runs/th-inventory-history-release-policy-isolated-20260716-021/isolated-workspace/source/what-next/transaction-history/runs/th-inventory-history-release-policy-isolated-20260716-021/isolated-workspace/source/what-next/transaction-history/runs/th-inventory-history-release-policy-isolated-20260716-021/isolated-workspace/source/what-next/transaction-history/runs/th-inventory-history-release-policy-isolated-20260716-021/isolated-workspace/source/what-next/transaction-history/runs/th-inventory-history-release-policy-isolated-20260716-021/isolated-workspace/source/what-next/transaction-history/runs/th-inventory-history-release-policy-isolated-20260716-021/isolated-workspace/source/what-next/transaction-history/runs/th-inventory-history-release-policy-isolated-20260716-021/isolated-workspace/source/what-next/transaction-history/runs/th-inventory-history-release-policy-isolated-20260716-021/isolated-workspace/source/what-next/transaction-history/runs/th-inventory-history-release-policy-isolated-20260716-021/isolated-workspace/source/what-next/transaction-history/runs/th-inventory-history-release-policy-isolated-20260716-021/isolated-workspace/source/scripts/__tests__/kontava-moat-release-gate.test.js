const fs = require("fs")
const os = require("os")
const path = require("path")

const {
  evaluateReleaseGate,
  renderMarkdown,
} = require("../kontava-moat-release-gate")

function makeTempRepo() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "kontava-release-gate-"))
}

function writeFile(root, relative, contents = "") {
  const target = path.join(root, relative)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, contents, "utf8")
}

describe("kontava moat release gate", () => {
  it("reports missing foundations without mutating the filesystem", () => {
    const root = makeTempRepo()
    const before = fs.readdirSync(root)

    const report = evaluateReleaseGate(root)
    const after = fs.readdirSync(root)

    expect(after).toEqual(before)
    expect(report.summary.releaseStatus).toBe("blocked")
    expect(report.summary.criticalBlockerCount).toBeGreaterThan(0)
    expect(report.scenarios).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "full_evidence_chain", status: "missing" }),
      ]),
    )
  })

  it("detects seed idempotency and module-selection readiness markers", () => {
    const root = makeTempRepo()
    writeFile(
      root,
      "prisma/schema.prisma",
      `
      model Organization {
        id String @id
        requestedModules String[] @default([])
      }
      @@index([organizationId])
      model AccountingSourceLink { id String @id }
      model BusinessEvent { id String @id }
      model BusinessEventOutbox { id String @id }
      model ProviderEvent { id String @id }
      model ReconciliationRun { id String @id }
      model CloseEvidenceItem { id String @id }
      `,
    )
    writeFile(
      root,
      "prisma/comprehensive-seed.ts",
      `
      const REGISTER_WORKFLOW_MODULES = ["POS", "Inventory"]
      const seededOrganizationWhere = { organizationId: { in: [] } }
      const id = (prefix: string, index: number) => prefix + index
      await prisma.accountingSourceLink.deleteMany({ where: seededOrganizationWhere })
      `,
    )
    writeFile(root, "services/modules/module-entitlement.service.ts")
    writeFile(root, "services/modules/__tests__/module-entitlement.service.test.ts", "read-only suspended")

    const report = evaluateReleaseGate(root)
    const idempotency = report.backfill.find((item) => item.id === "idempotent_seed_markers")
    const limitedModules = report.scenarios.find((item) => item.id === "limited_modules")

    expect(idempotency).toMatchObject({ status: "ready", passedCount: 3 })
    expect(limitedModules.status).toBe("ready")
  })

  it("renders an executable release report with rollback notes", () => {
    const report = evaluateReleaseGate(makeTempRepo())
    const markdown = renderMarkdown(report, "report")

    expect(markdown).toContain("# Kontava Moat Seed Backfill Release Gate Report")
    expect(markdown).toContain("## Rollback Plan")
    expect(markdown).toContain("This gate is read-only")
  })
})
