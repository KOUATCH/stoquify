const fs = require("fs")
const os = require("os")
const path = require("path")

const { buildRoleCockpitReadiness, gateResultForReport } = require("../role-based-operating-cockpit-gate")

function makeTempRepo() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "role-cockpit-gate-"))
}

function write(root, relativePath, source) {
  const target = path.join(root, relativePath)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, source, "utf8")
}

function writeReadyFixture(root) {
  write(root, "services/daily-habit/daily-habit-digest.service.ts", 'db.organization.findFirst isActive: true, deletedAt: null select: { name: true, currency: true } organization.currency.trim().toUpperCase() DIGEST_CONFIGS.filter((config) => isDigestVisible(config, input)) hasRbacPermission(input.actorPermissions, config.requiredPermission) audienceRoleCodes: ["owner", "admin", "administrator", "org_admin", "super_admin"] audienceRoleCodes: ["manager"] actorRoleCodes.map(normalizeRoleCode) hiddenDigestCount: DIGEST_CONFIGS.length - visibleConfigs.length')
  write(root, "services/daily-habit/daily-habit-digest-contracts.ts", "hiddenDigestCount: number")
  write(root, "components/daily-habit/DailyHabitDigestDashboard.tsx", 'data.summary.hiddenDigestCount No Daily Digest workspace is available role="status" BICommandBriefHeader BIKpiCard BIWhatChangedStrip DigestActions BIRiskOpportunityRadar BIBusinessTruthZone dashboard-landing-theme dark dashboardPanelClass aria-hidden="true" Back to dashboard')
  write(root, "app/[locale]/(dashboard)/dashboard/daily-digest/page.tsx", 'actorRoleCodes: ctx.roles.map actorPermissions: ctx.permissions "analytics.read" kind={noActiveOrg ? "no_active_org" : "permission_denied"}')
  write(root, "app/[locale]/(dashboard)/dashboard/daily-digest/loading.tsx", "Preparing Daily Digest")
  write(root, "app/[locale]/(dashboard)/dashboard/daily-digest/error.tsx", "Daily Digest could not load")
  write(root, "package.json", '{"scripts":{"role:cockpit:gate":"node gate","policy:gates":"npm run role:cockpit:gate"}}')
}

describe("role-based operating cockpit gate", () => {
  it("passes a permission-aware Daily Digest cockpit", () => {
    const root = makeTempRepo()
    writeReadyFixture(root)
    const report = buildRoleCockpitReadiness(root, { mode: "fail" })
    expect(report.summary).toMatchObject({ status: "ready", readyCount: 9, blockerCount: 0 })
    expect(gateResultForReport(report, "fail").exitCode).toBe(0)
  })

  it("blocks when digest configurations are no longer permission-filtered", () => {
    const root = makeTempRepo()
    writeReadyFixture(root)
    write(root, "services/daily-habit/daily-habit-digest.service.ts", "DIGEST_CONFIGS.map")
    const report = buildRoleCockpitReadiness(root, { mode: "fail" })
    expect(report.blockers).toContain("digest_configs_are_permission_filtered")
    expect(gateResultForReport(report, "fail").exitCode).toBe(1)
  })

  it("blocks a route-local currency override", () => {
    const root = makeTempRepo()
    writeReadyFixture(root)
    write(root, "app/[locale]/(dashboard)/dashboard/daily-digest/page.tsx", 'actorRoleCodes: ctx.roles.map actorPermissions: ctx.permissions "analytics.read" currency: "XAF"')
    const report = buildRoleCockpitReadiness(root, { mode: "fail" })
    expect(report.blockers).toContain("route_propagates_roles_without_currency_override")
  })
})
