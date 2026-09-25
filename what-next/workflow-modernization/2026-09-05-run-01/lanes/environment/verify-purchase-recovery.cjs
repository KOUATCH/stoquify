"use strict";
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { randomUUID, createHash } = require("node:crypto");
const ROOT = path.resolve(__dirname, "../../../../.."); process.chdir(ROOT);
const helper = require(path.join(ROOT, "scripts/modern-modules-local-verification.js"));
const { PrismaClient } = require("@prisma/client");
const target = helper.targetUrl(); assert.equal(target.pathname.slice(1), helper.DATABASE_NAME);
assert.ok(["localhost", "127.0.0.1", "::1", "[::1]"].includes(target.hostname));
const original = helper.readPrivateFixture();
const fixture = JSON.parse(fs.readFileSync(path.join(ROOT, "playwright/.auth/workflow-purchase-editor.json"), "utf8"));
const organizationId = "org_modules_legacy_en_desktop";
assert.equal(fixture.database, helper.DATABASE_NAME); assert.equal(fixture.organizationId, organizationId); assert.equal(fixture.source, "workflow-modernization-20260905"); assert.equal(fixture.userId, "workflow_po_20260905_f21e43788c_editor");
process.env.DATABASE_URL = target.toString(); process.env.DIRECT_URL = target.toString(); process.env.NODE_ENV = "test"; process.env.AUTH_SECRET = original.authSecret;
const db = new PrismaClient({ datasources: { db: { url: target.toString() } }, log: [] }); globalThis.prisma = db;
process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({ module: "commonjs", moduleResolution: "node", jsx: "react-jsx" });
require(path.join(ROOT, "scripts/server-only-node-shim.js")); require("ts-node/register/transpile-only"); require("tsconfig-paths/register");
const service = require(path.join(ROOT, "services/purchase-order/purchase-order.service.ts"));
const { chromium, expect: baseExpect } = require("@playwright/test"); const expect = baseExpect.configure({ timeout: 30000 });
const attempt = randomUUID().slice(0, 8);
const sha = value => createHash("sha256").update(Buffer.isBuffer(value) || typeof value === "string" ? value : JSON.stringify(value)).digest("hex");
const files = ["components/purchase-orders/ModernEditPurchaseOrderForm.tsx", "components/purchase-orders/purchase-order-edit-model.ts", "components/purchase-orders/purchase-order-money.ts", "hooks/useRecentPurchaseOrderQueries.ts", "actions/purchaseOrderWorkflow/purchaseOrderSystemAction.ts", "services/purchase-order/purchase-order.service.ts", "app/[locale]/(dashboard)/dashboard/purchase-orders/[id]/edit/page.tsx", "messages/en.json", "messages/fr.json"];
const sources = () => Object.fromEntries(files.map(file => [file, sha(fs.readFileSync(path.join(ROOT, file)))]));
const receipt = { attempt, startedAt: new Date().toISOString(), database: helper.DATABASE_NAME, sourcesBefore: sources(), checks: [], scope: "Recovery only on two existing real draft clones; original cancelled orders are immutable comparison subjects. No repeated no-op save/clone or fixture reset." };
const secrets = [target.toString(), fixture.password, original.password, original.authSecret];
function safe(error) { let value = String(error?.message ?? error); for (const secret of secrets) value = value.split(secret).join("[redacted]"); return value.slice(0, 1800); }
async function state(id) { return db.purchaseOrder.findFirstOrThrow({ where: { id, organizationId }, include: { lines: { orderBy: { id: "asc" } } } }); }
const ids = { en: "cmtop4wde006hmac0xzyvdfyc", fr: "cmtop6se9007imac0fyec5d09" };
let originals;
(async () => {
  assert.equal((await db.$queryRaw`SELECT current_database() AS name`)[0].name, helper.DATABASE_NAME);
  const org = await db.organization.findUniqueOrThrow({ where: { id: organizationId } }); assert.equal(org.onboardingSource, helper.FIXTURE_SOURCE);
  const actor = await db.user.findFirstOrThrow({ where: { id: fixture.userId, organizationId }, include: { roles: true } });
  for (const permission of ["purchases.orders.read", "purchases.orders.update", "purchases.orders.cancel"]) assert.ok(actor.roles.flatMap(role => role.permissions).includes(permission));
  for (const id of Object.values(ids)) { const row = await state(id); assert.equal(row.status, "DRAFT"); assert.equal(row.createdById, fixture.userId); }
  originals = sha(await Promise.all([state(fixture.orders.en.id), state(fixture.orders.fr.id)]));
  const browser = await chromium.launch({ headless: true });
  try {
    for (const locale of ["en", "fr"]) {
      const t = JSON.parse(fs.readFileSync(path.join(ROOT, `messages/${locale}.json`), "utf8")).purchaseOrderEdit;
      const id = ids[locale]; const row = await state(id);
      const item = { locale, id, orderNumber: row.orderNumber, passed: false, requests: [], responses: [], fastRefresh: [], errors: [], screenshots: [] }; receipt.checks.push(item);
      const context = await browser.newContext({ viewport: locale === "fr" ? { width: 390, height: 844 } : { width: 1440, height: 1000 }, reducedMotion: "reduce" });
      await context.route("**/*", async route => { const url = new URL(route.request().url()); if (["http:", "https:"].includes(url.protocol) && url.origin !== helper.BASE_URL) await route.abort(); else await route.continue(); });
      const page = await context.newPage(); page.setDefaultNavigationTimeout(120000);
      const editUrl = `${helper.BASE_URL}/${locale}/dashboard/purchase-orders/${id}/edit`;
      page.on("request", request => { if (new URL(request.url()).pathname.includes(`/purchase-orders/${id}`)) item.requests.push({ at: new Date().toISOString(), pathname: new URL(request.url()).pathname, method: request.method(), rsc: request.headers().rsc === "1", serverAction: Boolean(request.headers()["next-action"]) }); });
      page.on("response", response => { if (new URL(response.url()).pathname.includes(`/purchase-orders/${id}`)) item.responses.push({ at: new Date().toISOString(), pathname: new URL(response.url()).pathname, status: response.status(), contentType: response.headers()["content-type"] }); });
      page.on("console", message => { if (message.text().startsWith("[Fast Refresh]")) item.fastRefresh.push({ at: new Date().toISOString(), message: message.text().slice(0, 160) }); });
      page.on("pageerror", error => item.errors.push(safe(error)));
      async function capture(name, locator) { if (locator) { await locator.evaluate(element => element.scrollIntoView({ behavior: "instant", block: "center" })); await page.waitForTimeout(250); } const file = `${locale}-purchase-recovery-${name}-${attempt}.png`; await page.screenshot({ path: path.join(__dirname, file), animations: "disabled" }); item.screenshots.push(file); }
      try {
        const auth = await context.request.post(`${helper.BASE_URL}/api/auth/sign-in/email`, { data: { email: fixture.email, password: fixture.password, rememberMe: false }, headers: { Origin: helper.BASE_URL }, timeout: 120000 }); assert.equal(auth.status(), 200);
        const session = await context.request.get(`${helper.BASE_URL}/api/auth/get-session`); assert.equal((await session.json()).user.id, fixture.userId);
        await page.goto(editUrl, { waitUntil: "domcontentloaded" });
        await expect(page.getByRole("form", { name: t.title })).toBeVisible();
        for (let index = 0; index < 3; index++) await page.getByRole("button", { name: t.next, exact: true }).click();
        const note = `Unsaved ${locale} review retained after cancellation ${attempt}`;
        const input = page.getByLabel(t.notes, { exact: true }); await input.fill(note);
        item.cancelledAt = new Date().toISOString();
        await service.cancelPurchaseOrder(id, organizationId, `Owned recovery verification ${attempt}`);
        const cancelledState = await state(id); assert.equal(cancelledState.status, "CANCELLED"); item.cancelledStateHash = sha(cancelledState);
        await page.getByRole("button", { name: t.save, exact: true }).click();
        const failure = page.getByRole("alert").filter({ hasText: t.failedTitle }); await expect(failure).toBeVisible();
        await expect(input).toHaveValue(note);
        // The existing failed-action RSC replay must preserve the client draft when current status locks editing.
        await expect(input).toHaveAttribute("readonly", "", { timeout: 60000 });
        await expect(page.getByRole("button", { name: t.save, exact: true })).toBeDisabled();
        await expect(input).toHaveValue(note); await expect(page).toHaveURL(editUrl);
        await expect(page.getByText("Dashboard page not found", { exact: true })).toHaveCount(0);
        await expect(page.getByText("Update Purchase Order Failed", { exact: true })).toHaveCount(0);
        await expect(page.getByText("Cannot edit a purchase order with status: CANCELLED", { exact: true })).toHaveCount(0);
        await input.focus(); await expect(input).toBeFocused(); await input.press("Control+A");
        assert.equal(await input.evaluate(element => element.selectionEnd - element.selectionStart), note.length, "Read-only draft remains selectable for copying");
        for (const width of [390, 1440]) {
          await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 }); await page.waitForTimeout(700);
          await expect(input).toHaveValue(note); await expect(input).toHaveAttribute("readonly", "");
          const size = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth })); assert.equal(size.document, size.viewport);
          await capture(`retained-${width}`, input);
        }
        assert.equal(sha(await state(id)), item.cancelledStateHash, "Failed update must preserve exact cancelled record and lines");
        item.retainedAfterServerReplay = true; item.readOnlyCopyable = true; item.passed = item.errors.length === 0;
      } catch (error) { item.error = safe(error); item.currentStatus = (await state(id)).status; await capture("failure").catch(() => {}); }
      finally { await context.close(); }
    }
  } finally { await browser.close(); receipt.browserContextsClosed = true; }
})().catch(error => { receipt.fatal = safe(error); }).finally(async () => {
  if (originals) receipt.originalCancelledOrdersUnchanged = sha(await Promise.all([state(fixture.orders.en.id), state(fixture.orders.fr.id)])) === originals;
  await db.$disconnect(); receipt.sourcesAfter = sources(); receipt.sourceStable = JSON.stringify(receipt.sourcesBefore) === JSON.stringify(receipt.sourcesAfter); receipt.driverSha256 = sha(fs.readFileSync(__filename)); receipt.completedAt = new Date().toISOString(); receipt.passed = receipt.checks.filter(item => item.passed).length; receipt.failed = receipt.checks.filter(item => !item.passed).length + Number(Boolean(receipt.fatal));
  const file = path.join(__dirname, `purchase-recovery-${attempt}.json`); fs.writeFileSync(file, JSON.stringify(receipt, null, 2) + "\n", { flag: "wx" }); console.log(JSON.stringify({ passed: receipt.passed, failed: receipt.failed, evidence: path.relative(ROOT, file) })); if (receipt.failed) process.exitCode = 1;
});
