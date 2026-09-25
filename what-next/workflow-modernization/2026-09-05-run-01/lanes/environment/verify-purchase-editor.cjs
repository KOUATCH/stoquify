"use strict";
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { randomBytes, randomUUID, createHash } = require("node:crypto");
const ROOT = path.resolve(__dirname, "../../../../..");
process.chdir(ROOT);
const helper = require(path.join(ROOT, "scripts/modern-modules-local-verification.js"));
const { PrismaClient } = require("@prisma/client");
const mode = process.argv[2];
assert.ok(["prepare", "browser"].includes(mode));
const PRIVATE = path.join(ROOT, "playwright/.auth/workflow-purchase-editor.json");
const organizationId = "org_modules_legacy_en_desktop";
const PREFIX = "workflow_po_20260905_";
const target = helper.targetUrl();
assert.equal(target.pathname.slice(1), helper.DATABASE_NAME);
assert.ok(["127.0.0.1", "localhost", "::1", "[::1]"].includes(target.hostname));
assert.notEqual(process.env.NODE_ENV, "production");
process.env.DATABASE_URL = target.toString();
process.env.DIRECT_URL = target.toString();
process.env.NODE_ENV = "test";
const originalPrivate = helper.readPrivateFixture();
process.env.AUTH_SECRET = originalPrivate.authSecret;
process.env.NEXTAUTH_SECRET = originalPrivate.authSecret;
process.env.NEXTAUTH_URL = helper.BASE_URL;
process.env.NEXT_PUBLIC_BASE_URL = helper.BASE_URL;
const secrets = new Set([originalPrivate.password, originalPrivate.authSecret, target.toString()].filter(Boolean));
const db = new PrismaClient({ datasources: { db: { url: target.toString() } }, log: [], transactionOptions: { timeout: 30000 } });
globalThis.prisma = db;
process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({ module: "commonjs", moduleResolution: "node", jsx: "react-jsx" });
require(path.join(ROOT, "scripts/server-only-node-shim.js"));
require("ts-node/register/transpile-only");
require("tsconfig-paths/register");
const service = require(path.join(ROOT, "services/purchase-order/purchase-order.service.ts"));
const sha = value => createHash("sha256").update(Buffer.isBuffer(value) || typeof value === "string" ? value : JSON.stringify(value)).digest("hex");
const sourcePaths = ["components/purchase-orders/ModernEditPurchaseOrderForm.tsx", "components/purchase-orders/purchase-order-edit-model.ts", "components/purchase-orders/purchase-order-money.ts", "components/purchase-orders/ModernPurchaseOrderDetailPage.tsx", "components/purchase-orders/PurchaseOrderCloneNotice.tsx", "hooks/usePurchaseOrderClone.ts", "services/purchase-order/purchase-order-capabilities.ts", "services/purchase-order/purchase-order.service.ts", "actions/purchaseOrderWorkflow/purchaseOrderSystemAction.ts", "services/purchase-order/purchase-order.schemas.ts", "hooks/useRecentPurchaseOrderQueries.ts", "app/[locale]/(dashboard)/dashboard/purchase-orders/[id]/edit/page.tsx", "messages/en.json", "messages/fr.json", "lib/security/rbac-permissions.ts", "prisma/schema.prisma"];
const sources = () => Object.fromEntries(sourcePaths.filter(file => fs.existsSync(path.join(ROOT, file))).map(file => [file, sha(fs.readFileSync(path.join(ROOT, file)))]));
const attempt = randomUUID().slice(0, 8);
const receipt = { mode, attempt, database: helper.DATABASE_NAME, organizationId, startedAt: new Date().toISOString(), sourcesBefore: sources(), checks: [], blockedExternalOrigins: [], authoritySnapshotExclusions: ["User.lastLogin", "User.updatedAt: ordinary real-sign-in timestamps"] };
function safe(error) { let result = String(error?.message ?? error); for (const secret of secrets) result = result.split(secret).join("[redacted]"); return result.split("Failing row contains")[0].slice(0, 1500); }
async function originalState() {
  return {
    organizations: await db.organization.findMany({ orderBy: { id: "asc" } }),
    configurations: await db.tenantModuleConfiguration.findMany({ orderBy: { organizationId: "asc" } }),
    grants: await db.tenantModuleGrant.findMany({ orderBy: { id: "asc" } }),
    users: (await db.user.findMany({ where: { id: { not: { startsWith: PREFIX } } }, orderBy: { id: "asc" }, include: { roles: { orderBy: { id: "asc" } }, accounts: { orderBy: { id: "asc" } } } })).map(({ lastLogin, updatedAt, ...user }) => user),
  };
}
async function guard() {
  assert.equal((await db.$queryRaw`SELECT current_database() AS name`)[0].name, helper.DATABASE_NAME);
  const organizations = await db.organization.findMany({ select: { id: true, onboardingSource: true } });
  assert.equal(organizations.length, helper.FIXTURES.length);
  assert.ok(organizations.every(row => row.onboardingSource === helper.FIXTURE_SOURCE && helper.FIXTURES.some(item => item.organizationId === row.id)));
  const { observeModuleAccess } = require(path.join(ROOT, "services/modules/module-entitlement.service.ts"));
  const decision = await observeModuleAccess({ organizationId, userId: "usr_modules_legacy_en_desktop", actorPermissions: [], moduleSlug: "purchasing", accessIntent: "write", surfaceType: "service", surface: "workflow-po-fixture-preflight", mode: "enforce", audit: false });
  assert.ok(decision.allowed, "Current real entitlement evaluator must allow purchasing writes; runner never creates grants");
  const configuration = await db.tenantModuleConfiguration.findUniqueOrThrow({ where: { organizationId } });
  assert.ok(!configuration.newWorkStoppedModules.includes("purchasing"), "Existing operational stop must be respected");
  return sha(await originalState());
}
async function financial(id) {
  const row = await db.purchaseOrder.findFirstOrThrow({ where: { id, organizationId }, include: { lines: { orderBy: { id: "asc" } } } });
  return { id: row.id, orderNumber: row.orderNumber, supplierId: row.supplierId, locationId: row.locationId, orderDate: row.orderDate.toISOString(), expectedDeliveryDate: row.expectedDeliveryDate?.toISOString(), paymentTerms: row.paymentTerms, notes: row.notes, shippingCost: row.shippingCost.toFixed(2), subtotal: row.subtotal.toFixed(2), taxAmount: row.taxAmount.toFixed(2), discount: row.discount.toFixed(2), total: row.total.toFixed(2), lines: row.lines.map(line => ({ id: line.id, itemId: line.itemId, quantity: line.orderedQuantity.toString(), unitCost: line.unitCost.toFixed(2), taxRate: line.taxRate.toString(), taxAmount: line.taxAmount.toFixed(2), discount: line.discount.toFixed(2), total: line.lineTotal.toFixed(2), notes: line.notes })) };
}
async function prepare() {
  assert.ok(!fs.existsSync(PRIVATE), "Owned fixture already exists; do not recreate or overwrite it");
  const suffix = randomUUID().replaceAll("-", "").slice(0, 10);
  const userId = `${PREFIX}${suffix}_editor`;
  const roleId = `${PREFIX}${suffix}_role`;
  const password = `Pine!${randomBytes(16).toString("hex")}9Z`;
  secrets.add(password);
  const email = `${suffix}.editor@workflow.stockflow.test`;
  const { hashPassword } = require(path.join(ROOT, "lib/password.ts"));
  const hash = await hashPassword(password);
  const permissions = ["dashboard.read", "purchases.orders.read", "purchases.orders.create", "purchases.orders.update", "purchases.orders.cancel"];
  const ids = { userId, roleId, supplierId: `${PREFIX}${suffix}_supplier`, locationId: `${PREFIX}${suffix}_location`, itemId: `${PREFIX}${suffix}_item` };
  await db.$transaction(async tx => {
    await tx.role.create({ data: { id: roleId, code: `WORKFLOW_PO_${suffix}`, organizationId, nameEn: "Purchase draft verifier", nameFr: "Vérificateur de brouillon achat", permissions } });
    await tx.user.create({ data: { id: userId, organizationId, email, name: "Synthetic purchase editor", firstName: "Workflow", lastName: "Verifier", password: hash, mfaBackupCodes: [], isActive: true, isVerified: true, emailVerified: true, roles: { connect: { id: roleId } } } });
    await tx.account.create({ data: { userId, accountId: userId, providerId: "credential", password: hash } });
    await tx.passwordHistory.create({ data: { userId, passwordHash: hash } });
    await tx.supplier.create({ data: { id: ids.supplierId, organizationId, code: `WF-${suffix}`, name: "Synthetic draft supplier", notes: "Local workflow verification only; no contact or payment" } });
    await tx.location.create({ data: { id: ids.locationId, organizationId, code: `WF-${suffix}`, name: "Synthetic receiving location", type: "WAREHOUSE" } });
    await tx.item.create({ data: { id: ids.itemId, organizationId, slug: `workflow-${suffix}`, sku: `WF-${suffix}`, nameEn: "Synthetic purchase item", nameFr: "Article achat synthétique", imageUrls: [], costPrice: 100, sellingPrice: 120 } });
  });
  const orders = {};
  for (const locale of ["en", "fr"]) {
    const row = await service.createPurchaseOrder({ organizationId, createdById: userId, supplierId: ids.supplierId, locationId: ids.locationId, date: "2026-09-05", expectedDeliveryDate: "2026-09-12", paymentTerms: "Net 30 days", notes: `Synthetic ${locale} order notes to preserve`, shippingCost: 15, orderLines: [{ itemId: ids.itemId, quantity: 2, unitPrice: 100, taxRate: 19.25, discount: 10, notes: `Synthetic ${locale} line notes to preserve` }] });
    assert.equal(row.status, "DRAFT");
    const stored = await financial(row.id);
    assert.equal(stored.total, "243.50"); assert.equal(stored.lines[0].taxRate, "19.25");
    orders[locale] = { id: row.id, initial: stored };
  }
  const fixture = { source: "workflow-modernization-20260905", database: helper.DATABASE_NAME, organizationId, ...ids, email, password, permissions, orders, createdAt: new Date().toISOString() };
  fs.writeFileSync(PRIVATE, JSON.stringify(fixture, null, 2) + "\n", { flag: "wx", mode: 0o600 });
  receipt.fixture = { ...ids, permissions, orderIds: Object.fromEntries(Object.entries(orders).map(([locale, row]) => [locale, row.id])), totals: Object.fromEntries(Object.entries(orders).map(([locale, row]) => [locale, row.initial])), sessionsCreated: 0 };
  receipt.checks.push({ name: "real service created two exact draft orders", passed: true });
}
async function browserProof() {
  const fixture = JSON.parse(fs.readFileSync(PRIVATE, "utf8"));
  assert.equal(fixture.source, "workflow-modernization-20260905"); assert.equal(fixture.database, helper.DATABASE_NAME); assert.equal(fixture.organizationId, organizationId); assert.ok(fixture.userId.startsWith(PREFIX)); secrets.add(fixture.password);
  const actor = await db.user.findFirstOrThrow({ where: { id: fixture.userId, organizationId }, include: { roles: true } });
  assert.ok(actor.roles.flatMap(role => role.permissions).includes("purchases.orders.cancel"));
  const foreignOrg = "org_modules_retailer_en_desktop";
  const foreignBefore = await db.purchaseOrder.count({ where: { organizationId: foreignOrg } });
  await assert.rejects(service.clonePurchaseOrder({ id: fixture.orders.en.id, organizationId: foreignOrg }, "usr_modules_retailer_en_desktop"), error => error?.code === "NOT_FOUND");
  assert.equal(await db.purchaseOrder.count({ where: { organizationId: foreignOrg } }), foreignBefore);
  receipt.checks.push({ name: "real clone service rejects existing source from another tenant without writes", passed: true });
  const { chromium, expect: baseExpect } = require("@playwright/test"); const expect = baseExpect.configure({ timeout: 30000 });
  const browser = await chromium.launch({ headless: true });
  try {
    for (const locale of ["en", "fr"]) {
      const t = JSON.parse(fs.readFileSync(path.join(ROOT, `messages/${locale}.json`), "utf8")).purchaseOrderEdit;
      const context = await browser.newContext({ viewport: locale === "fr" ? { width: 390, height: 844 } : { width: 1440, height: 1000 }, reducedMotion: "reduce" });
      await context.route("**/*", async route => { const url = new URL(route.request().url()); if (["http:", "https:"].includes(url.protocol) && url.origin !== helper.BASE_URL) { receipt.blockedExternalOrigins.push(url.origin); await route.abort(); } else await route.continue(); });
      const page = await context.newPage(); page.setDefaultNavigationTimeout(120000); page.setDefaultTimeout(30000);
      const errors = []; page.on("pageerror", error => errors.push({ message: safe(error), stack: error.stack?.split("\n").slice(0, 6).join("\n") }));
      const check = { name: `${locale} genuine editor no-op and rejected-draft retention`, passed: false, errors, screenshots: [] }; receipt.checks.push(check);
      const id = fixture.orders[locale].id; const editUrl = `${helper.BASE_URL}/${locale}/dashboard/purchase-orders/${id}/edit`;
      const updateRequests = [];
      page.on("request", request => {
        if (request.method() === "POST" && request.url().split("?")[0] === editUrl) {
          const body = request.postData() ?? "";
          if (body.includes("orderLines") && body.includes("shippingCost")) updateRequests.push({ observedAt: new Date().toISOString() });
        }
      });
      async function screenshot(name, locator) {
        if (locator) { await locator.evaluate(element => element.scrollIntoView({ behavior: "instant", block: "center" })); await page.waitForTimeout(250); }
        const file = `${locale}-purchase-editor-${name}-${attempt}.png`; await page.screenshot({ path: path.join(__dirname, file), animations: "disabled" }); check.screenshots.push(file);
      }
      async function toReview(verifyFields) {
        const previousUpdates = updateRequests.length;
        const form = page.getByRole("form", { name: t.title }); await expect(form).toBeVisible();
        await page.getByRole("button", { name: t.next, exact: true }).click();
        await page.getByRole("button", { name: t.next, exact: true }).click();
        if (verifyFields) {
          await expect(page.getByLabel(t.quantity, { exact: true })).toHaveValue("2");
          await expect(page.getByLabel(t.unitPrice, { exact: true })).toHaveValue("100");
          await expect(page.getByLabel(t.taxRate, { exact: true })).toHaveValue("19.25");
          await expect(page.getByLabel(t.lineDiscount, { exact: true })).toHaveValue("10");
          await expect(page.getByLabel(t.lineNotes, { exact: true })).toHaveValue(fixture.orders[locale].initial.lines[0].notes);
          await screenshot("financial-values", page.getByLabel(t.taxRate, { exact: true }));
        }
        await page.getByRole("button", { name: t.next, exact: true }).click();
        await expect(page.getByLabel(t.shipping, { exact: true })).toHaveValue("15");
        await expect(page.getByRole("button", { name: t.save, exact: true })).toBeEnabled();
        await page.waitForTimeout(200);
        assert.equal(updateRequests.length, previousUpdates, "Continue must not submit a purchase update before explicit Save");
      }
      try {
        const signIn = await context.request.post(`${helper.BASE_URL}/api/auth/sign-in/email`, { data: { email: fixture.email, password: fixture.password, rememberMe: false }, headers: { Origin: helper.BASE_URL }, timeout: 120000 });
        assert.equal(signIn.status(), 200); const session = await context.request.get(`${helper.BASE_URL}/api/auth/get-session`); assert.equal((await session.json()).user.id, fixture.userId);
        assert.equal((await db.purchaseOrder.findUniqueOrThrow({ where: { id } })).status, "DRAFT", "Fresh draft required, no resetting prior outcome");
        const before = await financial(id); const started = Date.now();
        await page.goto(editUrl, { waitUntil: "domcontentloaded" }); await toReview(true); check.usefulReviewMs = Date.now() - started;
        check.continueSentNoUpdate = updateRequests.length === 0;
        const preview = page.getByRole("region", { name: t.preview, exact: true });
        const exactTotal = new Intl.NumberFormat(locale, { style: "currency", currency: "XAF", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(243.5);
        await expect(preview).toContainText(exactTotal);
        await screenshot("review", page.getByRole("button", { name: t.save, exact: true }));
        await page.getByRole("button", { name: t.save, exact: true }).click();
        await expect(page).toHaveURL(`${helper.BASE_URL}/${locale}/dashboard/purchase-orders/${id}`, { timeout: 120000 });
        assert.deepEqual(await financial(id), before, "No-op save must preserve all stored monetary/source fields and line identity");
        check.noOpStoredValuesPreserved = true;
        const savedTotal = page.getByText(exactTotal, { exact: true }).first();
        await expect(savedTotal).toBeVisible();
        await screenshot("saved-exact-total", savedTotal);
        check.savedSummaryMatchesExactTotal = true;
        const cloneText = JSON.parse(fs.readFileSync(path.join(ROOT, `messages/${locale}.json`), "utf8")).purchaseOrderClone;
        const effectCounts = async () => ({ journals: await db.journalEntry.count({ where: { organizationId } }), supplierLedger: await db.supplierLedgerEntry.count({ where: { organizationId } }), receipts: await db.goodsReceipt.count({ where: { organizationId } }), inventoryTransactions: await db.inventoryTransaction.count({ where: { organizationId } }) });
        const effectsBefore = await effectCounts();
        const countBefore = await db.purchaseOrder.count({ where: { organizationId } });
        await page.getByRole("button", { name: cloneText.button, exact: true }).first().click();
        await expect(page).toHaveURL(new RegExp(`/${locale}/dashboard/purchase-orders/(?!${id}/)[^/]+/edit$`), { timeout: 120000 });
        const cloneId = new URL(page.url()).pathname.split("/").at(-2);
        assert.ok(cloneId && cloneId !== id);
        const cloned = await db.purchaseOrder.findFirstOrThrow({ where: { id: cloneId, organizationId }, include: { lines: true } });
        assert.equal(cloned.status, "DRAFT"); assert.equal(cloned.createdById, fixture.userId); assert.equal(cloned.approvedById, null); assert.notEqual(cloned.orderNumber, before.orderNumber);
        assert.ok(cloned.lines.every(line => line.receivedQuantity.eq(0)));
        const normalizeCopy = snapshot => { const { id: ignoredId, orderNumber: ignoredNumber, orderDate: ignoredDate, lines, ...rest } = snapshot; return { ...rest, lines: lines.map(({ id: ignoredLineId, ...line }) => line) }; };
        assert.deepEqual(normalizeCopy(await financial(cloneId)), normalizeCopy(before), "Clone preserves quoted fields and amounts");
        assert.deepEqual(await financial(id), before, "Clone leaves original source unchanged");
        assert.equal(await db.purchaseOrder.count({ where: { organizationId } }), countBefore + 1);
        assert.deepEqual(await effectCounts(), effectsBefore, "Cloning must not post financial or receiving effects");
        await expect(page.getByRole("form", { name: t.title })).toBeVisible();
        await screenshot("cloned-draft", page.getByRole("heading", { name: t.details, exact: true }));
        check.clone = { id: cloneId, orderNumber: cloned.orderNumber, status: cloned.status, total: cloned.total.toFixed(2), originalUnchanged: true, receivedQuantitiesZero: true, extraOrders: 1, noPosting: true };
        await page.goto(editUrl, { waitUntil: "domcontentloaded" }); await toReview(false);
        const draftNote = `Unsaved ${locale} correction retained after real cancellation`;
        await page.getByLabel(t.notes, { exact: true }).fill(draftNote);
        const cancelled = await service.cancelPurchaseOrder(id, organizationId, "Synthetic concurrent cancellation after editor opened"); assert.equal(cancelled.status, "CANCELLED");
        const cancellationState = await financial(id);
        await page.getByRole("button", { name: t.save, exact: true }).click();
        const alert = page.getByRole("alert").filter({ hasText: t.failedTitle });
        await expect(alert).toBeVisible(); await expect(alert).toContainText(t.failed); await expect(alert).toBeFocused();
        await expect(page).toHaveURL(editUrl); await expect(page.getByLabel(t.notes, { exact: true })).toHaveValue(draftNote); await expect(page.getByLabel(t.shipping, { exact: true })).toHaveValue("15");
        assert.deepEqual(await financial(id), cancellationState, "Denied update caused no stored-field changes");
        await screenshot("rejected-draft", alert);
        const alternate = locale === "fr" ? { width: 1440, height: 1000 } : { width: 390, height: 844 };
        await page.setViewportSize(alternate); await screenshot("rejected-alternate-width", alert);
        check.overflow = await page.evaluate(() => ({ viewport: innerWidth, content: document.documentElement.scrollWidth }));
        assert.equal(check.overflow.content, check.overflow.viewport, "No horizontal document overflow");
        check.draftRetained = true; check.savedState = "CANCELLED"; check.persistedFinancialHash = sha(cancellationState); check.passed = errors.length === 0;
      } catch (error) { check.error = safe(error); await screenshot("failure").catch(() => {}); }
      finally { await context.close(); }
    }
    const denied = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    try {
      await denied.route("**/*", async route => { const url = new URL(route.request().url()); if (["http:", "https:"].includes(url.protocol) && url.origin !== helper.BASE_URL) { receipt.blockedExternalOrigins.push(url.origin); await route.abort(); } else await route.continue(); });
      const auth = await denied.request.post(`${helper.BASE_URL}/api/auth/sign-in/email`, { data: { email: "denied@modern-modules.stockflow.test", password: originalPrivate.password, rememberMe: false }, headers: { Origin: helper.BASE_URL }, timeout: 120000 });
      assert.equal(auth.status(), 200); const current = await denied.request.get(`${helper.BASE_URL}/api/auth/get-session`); assert.equal((await current.json()).user.id, "usr_modules_denied");
      const page = await denied.newPage(); await page.goto(`${helper.BASE_URL}/en/dashboard/purchase-orders/${fixture.orders.en.id}`, { waitUntil: "domcontentloaded", timeout: 120000 });
      await expect(page.getByText("is not available for this role", { exact: false })).toBeVisible();
      const cloneText = JSON.parse(fs.readFileSync(path.join(ROOT, "messages/en.json"), "utf8")).purchaseOrderClone;
      await expect(page.getByRole("button", { name: cloneText.button, exact: true })).toHaveCount(0);
      const file = `en-purchase-denied-${attempt}.png`; await page.screenshot({ path: path.join(__dirname, file) });
      receipt.checks.push({ name: "real denied user cannot open the purchase route or invoke its clone control", passed: true, screenshot: file, scope: "Page permission denial; no denied mutation request was sent" });
    } catch (error) { receipt.checks.push({ name: "real denied purchase route", passed: false, error: safe(error) }); }
    finally { await denied.close(); }
  } finally { await browser.close(); receipt.browserContextsClosed = true; }
}
let before;
(async () => { before = await guard(); receipt.originalAuthorityHashBefore = before; if (mode === "prepare") await prepare(); else await browserProof(); })().catch(error => { receipt.fatal = safe(error); }).finally(async () => {
  if (before) { receipt.originalAuthorityHashAfter = sha(await originalState()); receipt.existingUsersRolesOrganizationAndConfigurationUnchanged = receipt.originalAuthorityHashAfter === before; }
  await db.$disconnect(); receipt.sourcesAfter = sources(); receipt.sourceStable = JSON.stringify(receipt.sourcesBefore) === JSON.stringify(receipt.sourcesAfter); receipt.driverHash = sha(fs.readFileSync(__filename)); receipt.completedAt = new Date().toISOString();
  receipt.passed = receipt.checks.filter(check => check.passed).length; receipt.failed = receipt.checks.filter(check => !check.passed).length + Number(Boolean(receipt.fatal));
  const output = path.join(__dirname, `purchase-editor-${mode}-${attempt}.json`); fs.writeFileSync(output, JSON.stringify(receipt, null, 2) + "\n", { flag: "wx" });
  console.log(JSON.stringify({ passed: receipt.passed, failed: receipt.failed, evidence: path.relative(ROOT, output) })); if (receipt.failed) process.exitCode = 1;
});
