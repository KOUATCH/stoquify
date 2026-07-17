const fs = require("fs")
const os = require("os")
const path = require("path")

const {
  buildSettingsSurfaceClassification,
  gateResultForReport,
  parseArgs,
  renderMarkdown,
} = require("../settings-surface-classification-gate")

function makeTempRepo() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "settings-surface-gate-"))
}

function writeAction(root, relativePath, content) {
  const target = path.join(root, relativePath)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, content, "utf8")
}

function inventoryFor(file) {
  return {
    summary: { generatedAt: "2026-07-11T00:00:00.000Z" },
    records: [
      {
        file,
        surfaceType: "action",
        moduleSlug: "settings",
        permission: "settings.storage.update",
        guard: "requirePermission",
        classification: "mapped, enforcement candidate",
        observeOrEnforce: "report-only",
      },
    ],
  }
}

describe("settings surface classification gate", () => {
  it("keeps the reviewed zero-findings baseline release-ready", () => {
    const root = makeTempRepo()
    const file = "actions/storage/storage-config-actions.ts"
    writeAction(
      root,
      file,
      `"use server"
      export async function saveStorageConfig() {
        const ctx = await requirePermission("settings.storage.update")
        await observeModuleAccess({ moduleSlug: "settings", organizationId: ctx.orgId })
      }`,
    )

    const report = buildSettingsSurfaceClassification(root, {
      mode: "fail",
      inventory: inventoryFor(file),
    })
    const result = gateResultForReport(report, "fail")

    expect(report.summary.activeFindingCount).toBe(0)
    expect(report.summary.gate).toMatchObject({
      mode: "fail",
      status: "ready",
      baselineActiveFindingCount: 0,
      moduleEntitlementEnforcement: "report-only",
    })
    expect(result).toMatchObject({ status: "ready", exitCode: 0 })
    expect(renderMarkdown(report)).toContain("Active-finding baseline: 0")
  })

  it("blocks fail mode when an executable settings action is unresolved", () => {
    const root = makeTempRepo()
    const file = "actions/storage/photo-upload-actions.ts"
    writeAction(root, file, `"use server"\nexport async function uploadPhoto() { return { ok: true } }`)

    const report = buildSettingsSurfaceClassification(root, {
      mode: "fail",
      inventory: inventoryFor(file),
    })
    const result = gateResultForReport(report, "fail")

    expect(report.summary.activeFindingCount).toBe(1)
    expect(report.records[0].findings).toContain("executable-action-without-approved-auth-boundary")
    expect(result).toMatchObject({ status: "blocked", exitCode: 1 })
  })

  it("reports findings without blocking in report mode", () => {
    const report = { summary: { activeFindingCount: 2 } }
    expect(gateResultForReport(report, "report")).toMatchObject({
      status: "blocked",
      exitCode: 0,
      activeFindingCount: 2,
    })
  })

  it("validates the supported command modes", () => {
    expect(parseArgs(["--mode", "fail", "--out", "out.md", "--json-out", "out.json"])).toMatchObject({
      mode: "fail",
      out: "out.md",
      jsonOut: "out.json",
    })
    expect(() => parseArgs(["--mode", "warn"])).toThrow("Unsupported mode: warn")
  })
})
