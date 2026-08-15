const fs = require("fs")
const os = require("os")
const path = require("path")

const {
  buildCountryAdapterPilotReadiness,
  gateResultForReport,
} = require("../country-adapter-pilot-gate")

function write(root, relativePath, content) {
  const target = path.join(root, relativePath)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, content, "utf8")
}

const fixtureFiles = [
  "services/compliance/adapters/cameroon-dgi-sandbox.ts",
  "services/compliance/adapters/registry.ts",
  "services/compliance/certification-outbox.service.ts",
  "services/compliance/country-adapter-pilot.schemas.ts",
  "services/compliance/country-adapter-pilot.service.ts",
  "actions/compliance/country-adapter-pilot.actions.ts",
  "services/compliance/compliance-center.service.ts",
  "components/compliance/ComplianceCenterDashboard.tsx",
  "services/regulatory/country-packs/cameroon.ts",
  "prisma/schema.prisma",
  "prisma/migrations/20260727143000_country_adapter_pilot_foundation/migration.sql",
  "services/compliance/__tests__/cameroon-dgi-sandbox.adapter.test.ts",
  "services/compliance/__tests__/country-adapter-pilot.service.test.ts",
  "services/compliance/__tests__/certification-outbox-processing.test.ts",
  "docs/domains/compliance/CAMEROON_DGI_COUNTRY_ADAPTER_PILOT_OPERATIONS_RUNBOOK_2026-07-27.md",
  "package.json",
]

function createFixture(transform = (_relativePath, content) => content) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "country-adapter-gate-"))
  const sourceRoot = process.cwd()

  for (const relativePath of fixtureFiles) {
    const content = fs.readFileSync(path.join(sourceRoot, relativePath), "utf8")
    write(root, relativePath, transform(relativePath, content))
  }

  return root
}

describe("country adapter pilot gate", () => {
  it("reports the repository Skill 015 slice as development-ready", () => {
    const report = buildCountryAdapterPilotReadiness(process.cwd(), {
      mode: "fail",
    })

    expect(report.summary).toMatchObject({
      status: "ready",
      checkCount: 16,
      readyCount: 16,
      blockerCount: 0,
    })
    expect(report.certificationBoundary).toMatchObject({
      developmentPilotReady: true,
      productionAuthorityCertified: false,
    })
    expect(gateResultForReport(report, "fail").exitCode).toBe(0)
  })

  it("fails closed when the production block is removed", () => {
    const root = createFixture((relativePath, content) =>
      relativePath.endsWith("certification-outbox.service.ts")
        ? content.replace(/PRODUCTION_ADAPTER_BLOCKED/g, "REMOVED_BLOCK")
        : content,
    )

    const report = buildCountryAdapterPilotReadiness(root, { mode: "fail" })
    expect(report.blockers).toContain(
      "production_authority_submission_remains_fail_closed",
    )
    expect(gateResultForReport(report, "fail").exitCode).toBe(1)
  })

  it("fails closed when service-owned submission lifecycle evidence is removed", () => {
    const root = createFixture((relativePath, content) =>
      relativePath.endsWith("certification-outbox.service.ts")
        ? content.replace("AUTHORITY_SUBMISSION_SENT", "REMOVED_SENT_EVENT")
        : content,
    )

    const report = buildCountryAdapterPilotReadiness(root, { mode: "fail" })
    expect(report.blockers).toContain(
      "authority_submission_lifecycle_business_events",
    )
    expect(gateResultForReport(report, "fail").exitCode).toBe(1)
  })

  it("fails closed when the package release command is removed", () => {
    const root = createFixture((relativePath, content) =>
      relativePath === "package.json"
        ? content.replace(
            '"country:adapter:pilot:gate":',
            '"removed:country:adapter:pilot:gate":',
          )
        : content,
    )

    const report = buildCountryAdapterPilotReadiness(root, { mode: "fail" })
    expect(report.blockers).toContain("country_adapter_gate_is_release_wired")
    expect(gateResultForReport(report, "fail").exitCode).toBe(1)
  })
})
