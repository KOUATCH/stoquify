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

const accessSource = `
  if (error instanceof RbacError) {
    const t = await getTranslations({ locale, namespace: "dailyDigestAccess" })
    const noActiveOrg = error.code === "NO_ACTIVE_ORG"
    const forbidden = error.code === "FORBIDDEN"
    const signIn = error.code === "UNAUTHENTICATED" || error.code === "EMAIL_NOT_VERIFIED"
    const title = t(\`\${error.code}.title\`)
    const message = t(\`\${error.code}.message\`)
    const href = localizePath("/login", locale)
    return <DashboardRouteState kind={noActiveOrg ? "no_active_org" : error.code === "UNAUTHENTICATED" ? "stale_session" : "permission_denied"} locale={locale} title={title} message={message} primaryHref={href} primaryLabel={signIn ? t("signIn") : undefined} />
  }
`

function writeMessages(root, locale) {
  const dailyDigestAccess = { signIn: "Sign in" }
  for (const code of ["UNAUTHENTICATED", "NO_ACTIVE_ORG", "EMAIL_NOT_VERIFIED", "ACCOUNT_LOCKED", "FORBIDDEN"]) {
    dailyDigestAccess[code] = { title: `${locale} ${code}`, message: `${locale} Access recovery guidance` }
  }
  write(root, `messages/${locale}.json`, JSON.stringify({
    dailyDigestAccess,
    dailyDigestRecovery: { loadingTitle: "Loading", loadingMessage: "Reading sources", errorTitle: "Unavailable", errorMessage: "Retry reading sources", retry: "Retry" },
  }))
}

function writeReadyFixture(root) {
  write(root, "services/daily-habit/daily-habit-digest.service.ts", 'db.organization.findFirst({ where: { id: input.organizationId, isActive: true, deletedAt: null }, select: { name: true, currency: true, timezone: true } }) organizationName: organization.name currency: organization.currency.trim().toUpperCase() timezone: organization.timezone ?? "UTC" DIGEST_CONFIGS.filter((config) => isDigestVisible(config, input)) hasRbacPermission(input.actorPermissions, config.requiredPermission) audienceRoleCodes: ["owner", "admin", "administrator", "org_admin", "super_admin"] audienceRoleCodes: ["manager"] actorRoleCodes.map(normalizeRoleCode) hiddenDigestCount: DIGEST_CONFIGS.length - visibleConfigs.length')
  write(root, "services/daily-habit/daily-habit-digest-contracts.ts", "hiddenDigestCount: number")
  write(root, "components/daily-habit/DailyHabitDigestDashboard.tsx", 'data.summary.hiddenDigestCount No Daily Digest workspace is available role="status" BICommandBriefHeader BIKpiCard BIWhatChangedStrip DigestActions BIRiskOpportunityRadar BIBusinessTruthZone dashboard-landing-theme dark dashboardPanelClass aria-hidden="true" Back to dashboard')
  write(root, "app/[locale]/(dashboard)/dashboard/daily-digest/page.tsx", 'actorRoleCodes: ctx.roles.map actorPermissions: ctx.permissions "analytics.read" ' + accessSource)
  write(root, "app/[locale]/(dashboard)/dashboard/daily-digest/loading.tsx", 'const t = await getTranslations("dailyDigestRecovery"); return <DashboardRouteState kind="loading" locale={locale} title={t("loadingTitle")} message={t("loadingMessage")} />')
  write(root, "app/[locale]/(dashboard)/dashboard/daily-digest/error.tsx", 'const t = useTranslations("dailyDigestRecovery"); return <div role="alert"><DashboardErrorState locale={locale} title={t("errorTitle")} message={t("errorMessage")} retryLabel={t("retry")} /></div>')
  writeMessages(root, "en")
  writeMessages(root, "fr")
  write(root, "package.json", '{"scripts":{"role:cockpit:gate":"node gate","policy:gates":"npm run role:cockpit:gate"}}')
}

function moveAccessContractsToRouteHelpers(root) {
  write(root, "app/[locale]/(dashboard)/dashboard/daily-digest/page.tsx", 'actorRoleCodes: ctx.roles.map actorPermissions: ctx.permissions')
  write(root, "app/[locale]/(dashboard)/dashboard/daily-digest/daily-digest-route-data-access.ts", 'permissions: ["dashboard.read", "analytics.read"]')
  write(root, "app/[locale]/(dashboard)/dashboard/daily-digest/daily-digest-route-access.tsx", accessSource)
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

  it("accepts permission and session-state contracts owned by route helpers", () => {
    const root = makeTempRepo()
    writeReadyFixture(root)
    moveAccessContractsToRouteHelpers(root)

    const report = buildRoleCockpitReadiness(root, { mode: "fail" })

    expect(report.summary).toMatchObject({ status: "ready", readyCount: 9, blockerCount: 0 })
  })

  it("blocks when route helpers omit the analytics permission contract", () => {
    const root = makeTempRepo()
    writeReadyFixture(root)
    moveAccessContractsToRouteHelpers(root)
    write(root, "app/[locale]/(dashboard)/dashboard/daily-digest/daily-digest-route-data-access.ts", 'permissions: ["dashboard.read"]')

    const report = buildRoleCockpitReadiness(root, { mode: "fail" })

    expect(report.blockers).toContain("route_propagates_roles_without_currency_override")
  })

  it("accepts extra and reordered service-owned selection fields", () => {
    const root = makeTempRepo()
    writeReadyFixture(root)
    const file = "services/daily-habit/daily-habit-digest.service.ts"
    write(root, file, fs.readFileSync(path.join(root, file), "utf8").replace("name: true, currency: true, timezone: true", "timezone: true, id: true, currency: true, name: true"))
    expect(buildRoleCockpitReadiness(root).blockers).not.toContain("tenant_metadata_is_service_owned")
  })

  it.each([
    ["id: input.organizationId", "id: requestedTenantId"],
    ["isActive: true", "isActive: false"],
    ["deletedAt: null", "deletedAt: undefined"],
    ["name: true", "name: false"],
    ["currency: true", "currency: false"],
    ["timezone: true", "timezone: false"],
    ["organizationName: organization.name", 'organizationName: "Static name"'],
    ["currency: organization.currency.trim().toUpperCase()", 'currency: "XAF"'],
    ['timezone: organization.timezone ?? "UTC"', 'timezone: "UTC"'],
  ])("blocks a broken tenant metadata guarantee: %s", (before, after) => {
    const root = makeTempRepo()
    writeReadyFixture(root)
    const file = "services/daily-habit/daily-habit-digest.service.ts"
    write(root, file, fs.readFileSync(path.join(root, file), "utf8").replace(before, after))
    expect(buildRoleCockpitReadiness(root).blockers).toContain("tenant_metadata_is_service_owned")
  })

  it.each(["en", "fr"])("blocks missing %s recovery or access translations", (locale) => {
    const root = makeTempRepo()
    writeReadyFixture(root)
    const file = `messages/${locale}.json`
    const messages = JSON.parse(fs.readFileSync(path.join(root, file), "utf8"))
    delete messages.dailyDigestRecovery.loadingTitle
    write(root, file, JSON.stringify(messages))
    expect(buildRoleCockpitReadiness(root).blockers).toContain("no_workspace_permission_and_session_states")
    writeMessages(root, locale)
    const accessMessages = JSON.parse(fs.readFileSync(path.join(root, file), "utf8"))
    accessMessages.dailyDigestAccess.UNAUTHENTICATED.message = " "
    write(root, file, JSON.stringify(accessMessages))
    expect(buildRoleCockpitReadiness(root).blockers).toContain("no_workspace_permission_and_session_states")
  })

  it.each([
    ['"stale_session"', '"permission_denied"'],
    ['"NO_ACTIVE_ORG"', '"UNRELATED_STATE"'],
    ['"FORBIDDEN"', '"UNRELATED_STATE"'],
    ['"EMAIL_NOT_VERIFIED"', '"UNRELATED_STATE"'],
    ['namespace: "dailyDigestAccess"', 'namespace: "wrongNamespace"'],
    ['localizePath("/login", locale)', '"/login"'],
  ])("blocks a broken localized access state: %s", (before, after) => {
    const root = makeTempRepo()
    writeReadyFixture(root)
    moveAccessContractsToRouteHelpers(root)
    write(root, "app/[locale]/(dashboard)/dashboard/daily-digest/daily-digest-route-access.tsx", accessSource.replace(before, after))
    expect(buildRoleCockpitReadiness(root).blockers).toContain("no_workspace_permission_and_session_states")
  })

  it.each([
    ["loading.tsx", 't("loadingMessage")', 't("unknownMessage")'],
    ["loading.tsx", 'kind="loading"', 'kind="permission_denied"'],
    ["error.tsx", 't("errorTitle")', 't("unknownTitle")'],
    ["error.tsx", 'role="alert"', 'role="presentation"'],
    ["error.tsx", 't("retry")', '"Retry"'],
  ])("blocks disconnected recovery semantics in %s", (name, before, after) => {
    const root = makeTempRepo()
    writeReadyFixture(root)
    const file = `app/[locale]/(dashboard)/dashboard/daily-digest/${name}`
    write(root, file, fs.readFileSync(path.join(root, file), "utf8").replace(before, after))
    expect(buildRoleCockpitReadiness(root).blockers).toContain("no_workspace_permission_and_session_states")
  })
})
