"use strict";
const fs = require("node:fs"), path = require("node:path"), assert = require("node:assert/strict"), crypto = require("node:crypto");
const ROOT = path.resolve(__dirname, "../../../../.."); process.chdir(ROOT);
const mode = process.argv[2]; assert.ok(["postgres", "prepare-browser", "browser"].includes(mode));
const browserHelper = require(path.join(ROOT, "scripts/modern-modules-local-verification.js"));
const controlsHelper = require(path.join(ROOT, "scripts/run-modern-modules-postgres-smoke.js"));
const helper = mode === "postgres" ? controlsHelper : browserHelper;
const target = helper.targetUrl(); assert.equal(target.pathname.slice(1), helper.DATABASE_NAME); assert.ok(["localhost", "127.0.0.1", "::1", "[::1]"].includes(target.hostname)); assert.notEqual(process.env.NODE_ENV, "production");
process.env.DATABASE_URL = target.toString(); process.env.DIRECT_URL = target.toString(); process.env.NODE_ENV = "test";
const { PrismaClient } = require("@prisma/client"), db = new PrismaClient({ datasources: { db: { url: target.toString() } }, log: [], transactionOptions: { maxWait: 10000, timeout: 30000 } }); globalThis.prisma = db;
process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({ module: "commonjs", moduleResolution: "node", jsx: "react-jsx" });
require(path.join(ROOT, "scripts/server-only-node-shim.js")); require("ts-node/register/transpile-only"); require("tsconfig-paths/register");
const { getDailySalesReadModel } = require(path.join(ROOT, "services/analytics/daily-sales-read.service.ts"));
const { dailySalesPeriod } = require(path.join(ROOT, "services/analytics/daily-sales-period.ts"));
const attempt = crypto.randomUUID().slice(0, 12), PREFIX = "workflow_daily_sales_", PRIVATE = path.join(ROOT, "playwright/.auth/workflow-daily-sales.json");
const sha = value => crypto.createHash("sha256").update(Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest("hex");
const sourceFiles = ["services/analytics/daily-sales-read.service.ts", "services/analytics/daily-sales-period.ts", "services/analytics/financial-analytics.service.ts", "services/analytics/analytical-context-contracts.ts", "actions/analytics/daily-sales.actions.ts", "hooks/analytics/useDailySalesReport.ts", "components/analytics/CompleteIntegratedDailySalesDashboard.tsx", "messages/en.json", "messages/fr.json", "prisma/schema.prisma"];
const sources = () => Object.fromEntries(sourceFiles.map(file => [file, sha(fs.readFileSync(path.join(ROOT, file)))]));
const secrets = [target.toString()], receipt = { mode, attempt, database: helper.DATABASE_NAME, startedAt: new Date().toISOString(), sourcesBefore: sources(), checks: [], externalOrigins: [], limitations: ["Synthetic orders and saved daily reports are local read-model fixtures, not actual sales, payments, approvals or ledger postings.", "No reset, migration, production deployment or external messages. Browser sign-in uses actual local credential authentication."] };
const safe = error => { let text = String(error?.message ?? error); for (const secret of secrets) text = text.split(secret).join("[redacted]"); return text.split("Failing row contains")[0].slice(0, 1800); };
const check = async (name, work) => { const started = Date.now(), detail = await work(); receipt.checks.push({ name, passed: true, durationMs: Date.now() - started, detail }); };
async function guard() {
  assert.equal((await db.$queryRaw`SELECT current_database() AS name`)[0].name, helper.DATABASE_NAME);
  const organizations = await db.organization.findMany({ select: { id: true, onboardingSource: true } });
  if (mode === "postgres") assert.ok(organizations.every(row => row.id.startsWith("org_modules_service_smoke_") && row.onboardingSource === controlsHelper.SOURCE));
  else { assert.equal(organizations.length, browserHelper.FIXTURES.length); assert.ok(organizations.every(row => row.onboardingSource === browserHelper.FIXTURE_SOURCE && browserHelper.FIXTURES.some(fixture => fixture.organizationId === row.id))); }
  const migrations = await db.$queryRaw`SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`;
  assert.ok(browserHelper.REQUIRED_MIGRATIONS.every(name => migrations.some(row => row.migration_name === name)));
}
async function authority() {
  return sha({ organizations: await db.organization.findMany({ orderBy: { id: "asc" } }), grants: await db.tenantModuleGrant.findMany({ orderBy: { id: "asc" } }), configurations: await db.tenantModuleConfiguration.findMany({ orderBy: { organizationId: "asc" } }), actors: (await db.user.findMany({ where: { id: { not: { startsWith: PREFIX } } }, orderBy: { id: "asc" }, include: { roles: { orderBy: { id: "asc" } } } })).map(({ lastLogin, updatedAt, ...actor }) => actor) });
}
async function fixture(organizationId, timezone) {
  const suffix = attempt + "-" + timezone.replaceAll("/", "-"), period = dailySalesPeriod(timezone === "Europe/Paris" ? "2026-03-29" : "2026-09-06", timezone);
  const created = await db.$transaction(async tx => {
    const location = await tx.location.create({ data: { organizationId, name: "Daily sales verification " + suffix, code: "DAILY-" + suffix, type: "STORE" } });
    const retained = await tx.location.create({ data: { organizationId, name: "Retained daily site " + suffix, code: "RETAINED-" + suffix, isActive: false, deletedAt: new Date() } });
    const customer = await tx.customer.create({ data: { organizationId, name: "Synthetic daily sales customer", code: "DAILY-" + suffix } });
    const item = await tx.item.create({ data: { organizationId, sku: "DAILY-" + suffix, slug: "daily-" + suffix.toLowerCase(), nameEn: "Synthetic daily item", nameFr: "Article journalier synthétique", imageUrls: [], trackInventory: false } });
    const orderIds = [];
    for (const [tag, date, total, quantity, status] of [
      ["start", period.start, "0.25", "0.375", "CONFIRMED"], ["last", new Date(period.endExclusive.getTime() - 1), "25.75", "1.125", "COMPLETED"],
      ["before", new Date(period.start.getTime() - 1), "900.00", "1", "CONFIRMED"], ["end", period.endExclusive, "900.00", "1", "CONFIRMED"], ["draft", period.start, "900.00", "1", "DRAFT"],
    ]) { const order = await tx.salesOrder.create({ data: { organizationId, locationId: location.id, customerId: customer.id, orderNumber: suffix + "-" + tag, status, orderDate: date, total, notes: "Synthetic workflow verification; no actual payment or posting", lines: { create: { itemId: item.id, quantity, unitPrice: total, lineTotal: total } } } }); orderIds.push(order.id); }
    const stored = await tx.dailySalesReport.create({ data: { organizationId, locationId: location.id, date: new Date("2026-09-03T00:00:00Z"), totalRevenue: "70.50", totalCost: "10", grossProfit: "60.50", grossMargin: "85.82", totalQuantitySold: "2.125", totalTransactions: 2, averageTransactionValue: "35.25", itemsSold: 1, cashSales: "10", cardSales: "5", mobileMoneySales: "2", bankTransferSales: "1", creditSales: "52.50", openingBalance: "0", closingBalance: "13", cashIn: "5", cashOut: "2", variance: "0", isFinalized: false, notes: "Synthetic saved report, not professional approval" } });
    return { locationId: location.id, locationName: location.name, retainedLocationId: retained.id, orderIds, storedReportId: stored.id };
  });
  return { organizationId, timezone, date: period.date, ...created };
}
async function postgresProof() {
  const rootId = "org_modules_service_smoke_daily_" + attempt;
  for (const [name, timezone] of [["douala", "Africa/Douala"], ["paris", "Europe/Paris"], ["empty", "Africa/Douala"]]) {
    await db.organization.create({ data: { id: rootId + "_" + name, name: "Synthetic daily " + name, slug: "daily-" + attempt + "-" + name, currency: "XAF", timezone, onboardingSource: controlsHelper.SOURCE, isActive: true } });
  }
  receipt.ownedOrganizationPrefix = rootId;
  for (const [name, timezone] of [["douala", "Africa/Douala"], ["paris", "Europe/Paris"]]) {
    const f = await fixture(rootId + "_" + name, timezone);
    await check(name + " exact date-scoped aggregates exclude other-day and draft orders", async () => {
      const report = await getDailySalesReadModel(f);
      assert.deepEqual(report.metrics, { value: "26.00", count: 2, quantity: "1.500", average: "13.00" }); assert.equal(report.recordedCash, null); assert.equal(report.recordedPayments, null); assert.equal(report.topItems[0].value, "26.00");
      assert.equal(new Date(report.context.period.periodEndExclusive) - new Date(report.context.period.periodStart), name === "paris" ? 23 * 3600000 : 24 * 3600000);
      return { metrics: report.metrics, period: report.context.period, inventedCash: false };
    });
    await check(name + " saved report, retained location and tenant isolation", async () => {
      const saved = await getDailySalesReadModel({ ...f, date: "2026-09-03" }); assert.equal(saved.source.recordId, f.storedReportId); assert.equal(saved.metrics.value, "70.50"); assert.equal(saved.recordedCash.opening, "0.00"); assert.equal(saved.recordedPayments.credit, "52.50"); assert.equal(saved.source.finalized, false);
      const retained = await getDailySalesReadModel({ ...f, locationId: f.retainedLocationId }); assert.equal(retained.metrics.count, 0); assert.ok(retained.locations.find(location => location.id === f.retainedLocationId).retained);
      await assert.rejects(getDailySalesReadModel({ ...f, organizationId: rootId + "_empty" }), error => error.code === "NOT_FOUND");
      return { savedReportId: f.storedReportId, retainedLocationRead: true, foreignLocationDenied: true };
    });
  }
  await check("Missing locations and organizations are not fabricated zero reports", async () => {
    const empty = await getDailySalesReadModel({ organizationId: rootId + "_empty" }); assert.equal(empty.source.kind, "NO_LOCATIONS"); assert.equal(empty.metrics, null);
    await assert.rejects(getDailySalesReadModel({ organizationId: rootId + "_missing" }), error => error.code === "NOT_FOUND"); return { noLocationsDistinct: true, missingOrganizationDenied: true };
  });
}
async function prepareBrowser() {
  assert.ok(!fs.existsSync(PRIVATE), "Existing fixture must be inspected and reused; no reseed");
  const original = browserHelper.readPrivateFixture(), organizationId = "org_modules_legacy_en_desktop", before = await authority();
  const f = await fixture(organizationId, "Africa/Douala"), password = crypto.randomBytes(24).toString("base64url"); secrets.push(password);
  const hash = await require("argon2").hash(password), deniedId = PREFIX + attempt;
  await db.$transaction(async tx => {
    const role = await tx.role.create({ data: { organizationId, code: deniedId, nameEn: "Synthetic sales without reporting", permissions: ["dashboard.read", "sales.read"] } });
    await tx.user.create({ data: { id: deniedId, organizationId, name: "Synthetic report denial", email: deniedId + "@example.invalid", password: hash, isActive: true, isVerified: true, emailVerified: true, roles: { connect: { id: role.id } } } });
    await tx.account.create({ data: { accountId: deniedId, providerId: "credential", userId: deniedId, password: hash } });
  });
  fs.writeFileSync(PRIVATE, JSON.stringify({ database: helper.DATABASE_NAME, fixture: f, denied: { id: deniedId, email: deniedId + "@example.invalid", password }, originalEmail: browserHelper.FIXTURES.find(row => row.organizationId === organizationId).email }, null, 2), { flag: "wx", mode: 0o600 });
  assert.equal(await authority(), before); receipt.checks.push({ name: "Owned daily browser fixtures prepared with original authority unchanged", passed: true, fixture: f });
}
async function browserProof() {
  const privateData = JSON.parse(fs.readFileSync(PRIVATE, "utf8")), original = browserHelper.readPrivateFixture(); assert.equal(privateData.database, helper.DATABASE_NAME); secrets.push(original.password, privateData.denied.password);
  const { chromium, expect: baseExpect } = require("@playwright/test"), expect = baseExpect.configure({ timeout: 45000 }), browser = await chromium.launch({ headless: true });
  const before = await authority(); receipt.originalAuthorityHashBefore = before;
  try {
    for (const locale of ["en", "fr"]) {
      const copy = JSON.parse(fs.readFileSync(path.join(ROOT, "messages/" + locale + ".json"), "utf8")).dailySalesReport, contexts = [];
      const result = { name: locale + " actual daily orders, saved report, empty scope, failed read recovery and denied reporting", passed: false, screenshots: [], errors: [] }; receipt.checks.push(result);
      async function open(email, password) {
        const context = await browser.newContext({ viewport: locale === "en" ? { width: 1440, height: 1000 } : { width: 390, height: 844 }, locale: locale === "en" ? "en-GB" : "fr-FR", reducedMotion: "reduce" }); contexts.push(context);
        await context.route("**/*", async route => { const url = new URL(route.request().url()); if (["http:", "https:"].includes(url.protocol) && url.origin !== browserHelper.BASE_URL) { receipt.externalOrigins.push(url.origin); await route.abort(); } else await route.continue(); });
        const login = await context.request.post(browserHelper.BASE_URL + "/api/auth/sign-in/email", { data: { email, password }, headers: { Origin: browserHelper.BASE_URL }, timeout: 120000 }); assert.equal(login.status(), 200);
        const page = await context.newPage(); page.setDefaultTimeout(45000); page.on("pageerror", error => result.errors.push(safe(error)));
        const started = Date.now(); await page.goto(browserHelper.BASE_URL + "/" + locale + "/dashboard/sales", { waitUntil: "domcontentloaded", timeout: 180000 }); await expect(page.getByRole("heading", { name: copy.title, exact: true })).toBeVisible({ timeout: 180000 }); result.lastRouteReadyMs = Date.now() - started; return page;
      }
      const screenshot = async (page, stage) => { assert.equal(await page.locator('input[type="password"]').count(), 0); const file = locale + "-daily-sales-" + stage + "-" + attempt + ".png"; await page.screenshot({ path: path.join(__dirname, file), animations: "disabled" }); result.screenshots.push(file); };
      try {
        const page = await open(privateData.originalEmail, original.password), date = page.getByLabel(copy.date, { exact: true }), location = page.getByLabel(copy.location, { exact: true });
        await expect(location).toBeEnabled(); await location.selectOption(privateData.fixture.locationId); await date.fill(privateData.fixture.date);
        await expect(page.getByText(copy.orderMeaning, { exact: true })).toBeVisible(); await expect(page.getByText(locale === "en" ? "26.00 XAF" : "26,00 XAF", { exact: true }).first()).toBeVisible(); await expect(page.getByText(copy.cashUnavailable)).toBeVisible();
        await screenshot(page, "orders");
        await date.fill("2026-09-03"); await expect(page.getByText(copy.source.STORED_REPORT, { exact: true })).toBeVisible(); await expect(page.getByText(locale === "en" ? "70.50 XAF" : "70,50 XAF", { exact: true })).toBeVisible(); await expect(page.getByText(copy.payments.credit, { exact: true })).toBeVisible(); await screenshot(page, "saved");
        let aborted = 0;
        const fault = async route => { if (route.request().method() === "POST" && route.request().headers()["next-action"]) { aborted++; await route.abort("connectionfailed"); } else await route.continue(); };
        await page.route("**/dashboard/sales", fault); await page.getByRole("button", { name: copy.refresh, exact: true }).click(); await expect(page.getByRole("alert").filter({ hasText: copy.failed })).toBeVisible(); assert.ok(aborted > 0); await expect(date).toHaveValue("2026-09-03"); await expect(location).toHaveValue(privateData.fixture.locationId);
        await page.unroute("**/dashboard/sales", fault); const refresh = page.getByRole("button", { name: copy.refresh, exact: true }); await expect(refresh).toBeEnabled(); await refresh.focus(); await page.keyboard.press("Enter"); await expect(page.getByText(copy.source.STORED_REPORT, { exact: true })).toBeVisible();
        await date.fill("2026-09-04"); await expect(page.getByRole("status").filter({ hasText: copy.empty })).toBeVisible(); await expect(page.getByText(copy.cashUnavailable)).toBeVisible(); await screenshot(page, "empty");
        const denied = await open(privateData.denied.email, privateData.denied.password); await expect(denied.getByRole("alert").filter({ hasText: copy.denied })).toBeVisible(); await screenshot(denied, "denied");
        result.overflow = await page.evaluate(() => ({ viewport: innerWidth, content: document.documentElement.scrollWidth })); assert.equal(result.overflow.content, result.overflow.viewport);
        result.abortedReadRequests = aborted; result.scopePreserved = true; result.keyboardRetry = true; result.passed = result.errors.length === 0;
      } catch (error) { result.error = safe(error); const page = contexts.at(-1)?.pages()[0]; if (page && !await page.locator('input[type="password"]').count()) await screenshot(page, "failure").catch(() => {}); }
      finally { for (const context of contexts) await context.close(); }
    }
  } finally { await browser.close(); receipt.originalAuthorityHashAfter = await authority(); receipt.existingAuthorityUnchanged = receipt.originalAuthorityHashAfter === before; }
}
(async () => { await guard(); if (mode === "postgres") await postgresProof(); else if (mode === "prepare-browser") await prepareBrowser(); else await browserProof(); })().catch(error => { receipt.error = safe(error); }).finally(async () => {
  await db.$disconnect(); receipt.completedAt = new Date().toISOString(); receipt.sourcesAfter = sources(); receipt.sourceStable = JSON.stringify(receipt.sourcesBefore) === JSON.stringify(receipt.sourcesAfter); receipt.driverSha256 = sha(fs.readFileSync(__filename)); receipt.passed = receipt.checks.filter(row => row.passed).length; receipt.failed = receipt.checks.filter(row => !row.passed).length + Number(Boolean(receipt.error));
  const file = path.join(__dirname, "daily-sales-" + mode + "-" + attempt + ".json"); fs.writeFileSync(file, JSON.stringify(receipt, null, 2) + "\n", { flag: "wx" }); console.log(JSON.stringify({ passed: receipt.passed, failed: receipt.failed, evidence: path.relative(ROOT, file) })); process.exit(receipt.failed ? 1 : 0);
});
