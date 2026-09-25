"use strict";
// Real application UI over owned synthetic fixtures; no response data is mocked.
const fs = require("node:fs"), path = require("node:path"), assert = require("node:assert/strict");
const { randomUUID, randomBytes, createHash, createHmac } = require("node:crypto");
const ROOT = path.resolve(__dirname, "../../../../.."); process.chdir(ROOT);
const helper = require(path.join(ROOT, "scripts/modern-modules-local-verification.js"));
const mode = process.argv[2]; assert.ok(["prepare", "browser", "recovery", "access", "access-resume", "precision", "residual", "inspect"].includes(mode));
const PRIVATE = path.join(ROOT, "playwright/.auth/workflow-manual-reconciliation.json");
const organizationId = "org_modules_legacy_en_desktop", PREFIX = "workflow_manual_20260905_";
const target = helper.targetUrl(); assert.equal(target.pathname.slice(1), helper.DATABASE_NAME);
assert.ok(["127.0.0.1", "localhost", "::1", "[::1]"].includes(target.hostname)); assert.notEqual(process.env.NODE_ENV, "production");
const originalPrivate = helper.readPrivateFixture();
process.env.DATABASE_URL = target.toString(); process.env.DIRECT_URL = target.toString(); process.env.NODE_ENV = "test";
process.env.AUTH_SECRET = originalPrivate.authSecret; process.env.NEXTAUTH_SECRET = originalPrivate.authSecret; process.env.NEXTAUTH_URL = helper.BASE_URL; process.env.NEXT_PUBLIC_BASE_URL = helper.BASE_URL;
const secrets = new Set([originalPrivate.password, originalPrivate.authSecret, target.toString()]);
const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient({ datasources: { db: { url: target.toString() } }, log: [], transactionOptions: { maxWait: 10000, timeout: 30000 } }); globalThis.prisma = db;
process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({ module: "commonjs", moduleResolution: "node", jsx: "react-jsx" });
require(path.join(ROOT, "scripts/server-only-node-shim.js")); require("ts-node/register/transpile-only"); require("tsconfig-paths/register");
const { captureProviderEvent } = require(path.join(ROOT, "services/payments/provider-event.service.ts"));
const { runPaymentReconciliation } = require(path.join(ROOT, "services/reconciliation/payment-reconciliation-run.service.ts"));
const { MobileMoneyHmacAdapter } = require(path.join(ROOT, "services/payments/adapters/mobile-money-hmac.adapter.ts"));
const sha = value => createHash("sha256").update(Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest("hex");
const sourceFiles = ["components/finance/PaymentReconciliationWorkbench.tsx", "hooks/payments/usePaymentReconciliationDashboard.ts", "actions/payments/reconciliation.actions.ts", "services/reconciliation/payment-reconciliation-manual-match.service.ts", "services/reconciliation/payment-reconciliation-manual-read.service.ts", "services/reconciliation/payment-reconciliation-dashboard.service.ts", "services/reconciliation/payment-reconciliation-run.service.ts", "messages/en.json", "messages/fr.json"];
sourceFiles.push("services/modules/module-entitlement.service.ts", "services/reconciliation/manual-match-lineage.sql.ts", "services/_shared/protect.ts");
sourceFiles.push("services/reconciliation/manual-match-evidence.ts", "services/reconciliation/payment-reconciliation-manual-candidates.service.ts");
const sources = () => Object.fromEntries(sourceFiles.map(file => [file, sha(fs.readFileSync(path.join(ROOT, file)))]));
const attempt = randomUUID().slice(0, 8), receipt = { mode, attempt, database: helper.DATABASE_NAME, organizationId, startedAt: new Date().toISOString(), sourcesBefore: sources(), checks: [], blockedExternalOrigins: [], limitations: ["Provider setup and confirmed internal payments are synthetic preconditions in the existing owned browser database. No live authority, provider, payment or financial certification.", "Browser identity uses genuine password sign-in and, where requested, the actual password confirmation action. No sessions or approval results are fabricated.", "A deliberate lost response after the real proposal request tests uncertainty and retry. No application response data is substituted.", "Checks cover manual proposal/approval recovery only; they do not establish complete reconciliation lifecycle or platform verification."] };
function safe(error) { let message = String(error?.message ?? error); for (const secret of secrets) message = message.split(secret).join("[redacted]"); return message.split("Failing row contains")[0].slice(0, 1400); }
async function authority() {
  return { organizations: await db.organization.findMany({ orderBy: { id: "asc" } }), configurations: await db.tenantModuleConfiguration.findMany({ orderBy: { organizationId: "asc" } }), grants: await db.tenantModuleGrant.findMany({ orderBy: { id: "asc" } }), users: (await db.user.findMany({ where: { id: { not: { startsWith: PREFIX } } }, orderBy: { id: "asc" }, include: { roles: { orderBy: { id: "asc" } }, accounts: { orderBy: { id: "asc" } } } })).map(({ lastLogin, updatedAt, ...user }) => user) };
}
async function guard() {
  assert.equal((await db.$queryRaw`SELECT current_database() AS name`)[0].name, helper.DATABASE_NAME);
  const organizations = await db.organization.findMany({ select: { id: true, onboardingSource: true } }); assert.equal(organizations.length, helper.FIXTURES.length);
  assert.ok(organizations.every(row => row.onboardingSource === helper.FIXTURE_SOURCE && helper.FIXTURES.some(item => item.organizationId === row.id)));
  const migrations = await db.$queryRaw`SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`;
  assert.ok(helper.REQUIRED_MIGRATIONS.every(name => migrations.some(row => row.migration_name === name)));
  const { observeModuleAccess } = require(path.join(ROOT, "services/modules/module-entitlement.service.ts"));
  const result = await observeModuleAccess({ organizationId, userId: "usr_modules_legacy_en_desktop", actorPermissions: [], moduleSlug: "payment_reconciliation", accessIntent: "write", surfaceType: "service", surface: "workflow-manual-browser-preflight", mode: "enforce", audit: false }); assert.ok(result.allowed, "Existing entitlement must permit reconciliation; no grants created by runner");
  const config = await db.tenantModuleConfiguration.findUnique({ where: { organizationId } }); assert.ok(!config?.newWorkStoppedModules.includes("payment_reconciliation"));
  return sha(await authority());
}
async function prepare() {
  assert.ok(!fs.existsSync(PRIVATE), "Fixture already exists; inspect and resume its recorded state without reseeding");
  const password = randomBytes(24).toString("base64url"); secrets.add(password);
  const passwordHash = await require("argon2").hash(password), actors = {};
  for (const roleName of ["maker", "checker", "reader"]) {
    const id = `${PREFIX}${attempt}_${roleName}`, email = `${id}@example.invalid`;
    const permissions = ["dashboard.read", "finance.read", "finance.dashboard.read", "payments.reconciliation.read", ...(roleName === "maker" ? ["payments.reconciliation.match"] : roleName === "checker" ? ["payments.reconciliation.override"] : [])];
    await db.$transaction(async tx => {
      const role = await tx.role.create({ data: { organizationId, code: id, nameEn: `Synthetic manual ${roleName}`, permissions } });
      await tx.user.create({ data: { id, email, organizationId, name: `Synthetic ${roleName}`, password: passwordHash, emailVerified: true, isVerified: true, isActive: true, roles: { connect: { id: role.id } } } });
      await tx.account.create({ data: { accountId: id, providerId: "credential", userId: id, password: passwordHash } });
    }); actors[roleName] = { id, email };
  }
  receipt.preparedActorIds = Object.values(actors).map(actor => actor.id);
  const journeys = {}, secret = randomBytes(32).toString("hex"); secrets.add(secret); receipt.preparedJourneys = journeys;
  for (const locale of ["en", "fr"]) {
    const metadata = { synthetic: true, fixture: "workflow-manual-browser", productionApproval: false }, tag = `${attempt}-${locale}`, at = new Date();
    const adapter = new MobileMoneyHmacAdapter(`WORKFLOW_${tag}`);
    const setup = await db.$transaction(async tx => {
      const bank = await tx.chartOfAccount.create({ data: { organizationId, code: `512-${tag}`, nameEn: "Synthetic manual bank", type: "ASSET", normalBalance: "DEBIT" } });
      const suspense = await tx.chartOfAccount.create({ data: { organizationId, code: `471-${tag}`, nameEn: "Synthetic manual suspense", type: "ASSET", normalBalance: "DEBIT" } });
      const rail = await tx.paymentRail.create({ data: { organizationId, code: `MANUAL-${tag}`, name: `Manual test ${locale}`, type: "MOBILE_MONEY", metadata } });
      const provider = await tx.providerAccount.create({ data: { organizationId, paymentRailId: rail.id, providerCode: adapter.providerCode, displayName: `Manual review ${tag}`, status: "ACTIVE", currencyCode: "XAF", externalAccountHash: sha(tag), settlementLedgerAccountId: bank.id, suspenseLedgerAccountId: suspense.id, metadata } });
      await tx.settlementAccount.create({ data: { organizationId, providerAccountId: provider.id, ledgerAccountId: bank.id, approvalStatus: "APPROVED", effectiveFrom: new Date(0), metadata } });
      const payment = await tx.paymentTransaction.create({ data: { organizationId, providerAccountId: provider.id, amount: "100.00", currencyCode: "XAF", direction: "INBOUND", state: "CONFIRMED", occurredAt: at, confirmedAt: at, providerTransactionId: tag, providerReference: tag, sourceType: "SYNTHETIC_WORKFLOW_VERIFICATION", metadata } });
      return { provider, payment };
    });
    const rawBody = JSON.stringify({ eventId: tag, transactionId: tag, reference: tag, amount: "90.00", currency: "XAF", direction: "INBOUND", occurredAt: at.toISOString() });
    const timestamp = String(at.getTime()), signature = createHmac("sha256", secret).update(`${timestamp}.${adapter.canonicalPayload(rawBody)}`).digest("hex");
    const event = await captureProviderEvent({ organizationId, providerAccountId: setup.provider.id, adapter, rawBody, headers: { "x-provider-timestamp": timestamp, "x-provider-signature": signature }, secret, now: at, receivedAt: at }); assert.equal(event.status, "CAPTURED");
    const run = await runPaymentReconciliation({ organizationId, providerAccountId: setup.provider.id, businessDate: at }); assert.equal(run.status, "NEEDS_REVIEW");
    const exception = await db.paymentException.findFirstOrThrow({ where: { organizationId, reconciliationRunId: run.runId, paymentTransactionId: setup.payment.id } });
    journeys[locale] = { paymentTransactionId: setup.payment.id, providerEventId: event.providerEventRecordId, providerAccountId: setup.provider.id, exceptionId: exception.id, runId: run.runId };
  }
  fs.writeFileSync(PRIVATE, JSON.stringify({ database: helper.DATABASE_NAME, organizationId, password, actors, journeys, createdAt: new Date().toISOString() }, null, 2), { flag: "wx", mode: 0o600 });
  receipt.checks.push({ name: "New synthetic users and real mismatched evidence prepared", passed: true, actorIds: Object.values(actors).map(actor => actor.id), journeys });
}
async function browserProof() {
  const fixture = JSON.parse(fs.readFileSync(PRIVATE, "utf8")); assert.equal(fixture.organizationId, organizationId); assert.equal(fixture.database, helper.DATABASE_NAME); secrets.add(fixture.password);
  const { chromium, expect: baseExpect } = require("@playwright/test"), expect = baseExpect.configure({ timeout: 45000 });
  const browser = await chromium.launch({ headless: true });
  async function contextFor(actor, locale) {
    const context = await browser.newContext({ viewport: locale === "en" ? { width: 1440, height: 1000 } : { width: 390, height: 844 }, reducedMotion: "reduce", locale: locale === "en" ? "en-GB" : "fr-FR" });
    await context.route("**/*", async route => { const url = new URL(route.request().url()); if (["http:", "https:"].includes(url.protocol) && url.origin !== helper.BASE_URL) { receipt.blockedExternalOrigins.push(url.origin); await route.abort(); } else await route.continue(); });
    const response = await context.request.post(`${helper.BASE_URL}/api/auth/sign-in/email`, { data: { email: actor.email, password: fixture.password, rememberMe: false }, headers: { Origin: helper.BASE_URL }, timeout: 120000 }); assert.equal(response.status(), 200);
    const session = await context.request.get(`${helper.BASE_URL}/api/auth/get-session`); assert.equal((await session.json()).user.id, actor.id);
    const permissions = await context.request.get(`${helper.BASE_URL}/api/me/permissions`); assert.equal((await permissions.json()).organizationId, organizationId);
    return context;
  }
  try {
    for (const locale of ["en", "fr"]) {
      const row = fixture.journeys[locale], copy = JSON.parse(fs.readFileSync(path.join(ROOT, `messages/${locale}.json`), "utf8")).paymentReconciliationWorkbench;
      const result = { name: `${locale} actual manual proposal lost-response retry and independent approval`, passed: false, screenshots: [], errors: [] }; receipt.checks.push(result);
      const contexts = [];
      const screenshot = async (page, stage) => { assert.equal(await page.locator('input[type="password"]').count(), 0); const file = `${locale}-manual-${stage}-${attempt}.png`; await page.screenshot({ path: path.join(__dirname, file), animations: "disabled" }); result.screenshots.push(file); };
      const open = async context => { const page = await context.newPage(); page.setDefaultTimeout(45000); page.on("pageerror", error => result.errors.push(safe(error))); const start = Date.now(); await page.goto(`${helper.BASE_URL}/${locale}/dashboard/finance/reconciliation`, { waitUntil: "domcontentloaded", timeout: 180000 }); await expect(page.getByTestId("manual-match-lane")).toBeVisible({ timeout: 180000 }); result.lastRouteReadyMs = Date.now() - start; return page; };
      try {
        if (mode === "residual") {
          result.name = `${locale} exact residual, failed refresh recovery, independent approval and retained unmatched balance`;
          const retained = await db.matchRecord.findMany({ where: { organizationId, paymentTransactionId: row.paymentTransactionId } });
          const totalBefore = retained.filter(record => record.status === "APPROVED").reduce((sum, record) => sum.plus(record.amountMatched), new (require("@prisma/client").Prisma.Decimal)(0));
          assert.equal(totalBefore.toFixed(2), "86.75", "This stage only consumes the recorded 86.75 state; inspect any partial attempt");
          const pending = retained.filter(record => record.status === "PROPOSED" && record.amountMatched?.toFixed(2) === "3.25");
          assert.ok(pending.length <= 1, "Ambiguous residual proposal; stop for inspection");
          const maker = await contextFor(fixture.actors.maker, locale); contexts.push(maker); const page = await open(maker);
          const candidate = page.locator(`[data-manual-candidate="${row.exceptionId}"]`), amount = candidate.getByLabel(copy.manualMatch.amountLabel);
          const submit = candidate.getByRole("button", { name: copy.manualMatch.actions.propose, exact: true });
          const decimal = locale === "fr" ? "," : ".", display = value => `${value.replace(".", decimal)} XAF`;
          await expect(amount).toHaveValue(`3${decimal}25`); await expect(candidate).toContainText(display("13.25")); await expect(candidate).toContainText(display("3.25"));
          await amount.fill("90"); await expect(submit).toBeDisabled(); await expect(amount).toHaveAttribute("aria-invalid", "true");
          await candidate.scrollIntoViewIfNeeded(); await screenshot(page, "residual-limit");
          // Abort only the no-argument read action; never forge response data or intercept an approval.
          let failedReads = 0;
          const readFailure = async route => { const request = route.request(); if (request.method() === "POST" && request.headers()["next-action"] && request.postData() === "[]") { failedReads++; await route.abort("connectionfailed"); } else await route.continue(); };
          await page.route("**/dashboard/finance/reconciliation", readFailure);
          await page.getByRole("button", { name: copy.actions.refresh, exact: true }).click();
          await expect(page.getByRole("alert").filter({ hasText: copy.notifications.failedMessage })).toBeVisible();
          assert.ok(failedReads > 0); await expect(page.getByTestId("manual-match-lane")).toHaveCount(0);
          await page.unroute("**/dashboard/finance/reconciliation", readFailure);
          await page.getByRole("button", { name: copy.actions.refresh, exact: true }).click();
          await expect(amount).toHaveValue("90"); await expect(submit).toBeDisabled();
          result.failedReadRequests = failedReads; result.draftRetainedAfterFailedRefresh = true;
          await amount.fill(`3${decimal}25`); await expect(submit).toBeEnabled();
          if (!pending.length) { await submit.focus(); await expect(submit).toBeFocused(); await page.keyboard.press("Enter"); await expect(page.getByTestId("manual-match-lane").getByRole("status")).toHaveText(copy.manualMatch.notifications.proposedMessage); }
          const proposed = pending[0] ?? await db.matchRecord.findFirstOrThrow({ where: { organizationId, paymentTransactionId: row.paymentTransactionId, status: "PROPOSED", amountMatched: "3.25" } });
          const oldRevision = retained.find(record => record.status === "PROPOSED" && record.amountMatched?.toFixed(2) === "0.25")?.metadata?.evidenceRevision;
          assert.ok(oldRevision); assert.equal(proposed.metadata.evidenceRevision, oldRevision, "Shared evidence rules must preserve the pre-refactor snapshot hash for unchanged evidence");
          result.existingEvidenceRevisionPreserved = true; result.proposalId = proposed.id; result.resumedProposal = Boolean(pending.length);
          const reader = await contextFor(fixture.actors.reader, locale); contexts.push(reader); const readPage = await open(reader);
          const readCandidate = readPage.locator(`[data-manual-candidate="${row.exceptionId}"]`);
          await expect(readCandidate.getByLabel(copy.manualMatch.amountLabel)).toBeDisabled();
          await expect(readCandidate.getByRole("button", { name: copy.manualMatch.actions.propose, exact: true })).toBeDisabled();
          const readCard = readPage.locator(`[data-manual-proposal="${proposed.id}"]`); await expect(readCard).toContainText(display("3.25"));
          await expect(readCard.getByRole("button", { name: copy.manualMatch.actions.approve, exact: true })).toBeDisabled();
          await readCard.scrollIntoViewIfNeeded(); await screenshot(readPage, "residual-reader");
          const checker = await contextFor(fixture.actors.checker, locale); contexts.push(checker); const review = await open(checker);
          const approval = review.locator(`[data-manual-proposal="${proposed.id}"]`).getByRole("button", { name: copy.manualMatch.actions.approve, exact: true });
          await expect(approval).toBeEnabled(); await approval.focus(); await expect(approval).toBeFocused(); await review.keyboard.press("Enter");
          const password = review.getByLabel(copy.manualMatch.passwordLabel);
          await expect.poll(async () => await password.count() > 0 || await db.matchRecord.count({ where: { organizationId, correctionOfId: proposed.id, status: "APPROVED" } }) === 1).toBe(true);
          result.passwordConfirmationUsed = await password.count() > 0;
          if (result.passwordConfirmationUsed) { await password.fill(fixture.password); await password.press("Enter"); }
          await expect.poll(() => db.matchRecord.count({ where: { organizationId, correctionOfId: proposed.id, status: "APPROVED" } })).toBe(1);
          await expect(review.locator(`[data-manual-proposal="${proposed.id}"]`)).toHaveCount(0); await expect(password).toHaveCount(0);
          const finalCandidate = review.locator(`[data-manual-candidate="${row.exceptionId}"]`);
          await expect(finalCandidate).toContainText(copy.manualMatch.eligibility.FULLY_ALLOCATED); await expect(finalCandidate).toContainText(display("10.00")); await expect(finalCandidate).toContainText(display("0.00"));
          await expect(finalCandidate.getByRole("button", { name: copy.manualMatch.actions.propose, exact: true })).toBeDisabled();
          await finalCandidate.scrollIntoViewIfNeeded(); await screenshot(review, "residual-complete");
          const total = await db.matchRecord.aggregate({ where: { organizationId, paymentTransactionId: row.paymentTransactionId, status: "APPROVED" }, _sum: { amountMatched: true } }); assert.equal(total._sum.amountMatched.toFixed(2), "90.00");
          assert.equal(await db.matchRecord.count({ where: { organizationId, id: { in: retained.map(record => record.id) } } }), retained.length);
          assert.equal((await db.reconciliationRun.findUniqueOrThrow({ where: { id: row.runId } })).status, "NEEDS_REVIEW");
          assert.notEqual((await db.paymentException.findUniqueOrThrow({ where: { id: row.exceptionId } })).status, "RESOLVED");
          result.overflow = await review.evaluate(() => ({ viewport: innerWidth, content: document.documentElement.scrollWidth })); assert.equal(result.overflow.content, result.overflow.viewport);
          result.finalApprovedTotal = "90.00"; result.remainingInternalObligation = "10.00"; result.originalRunStillNeedsReview = true; result.retainedPriorRecords = retained.length;
          result.passed = result.errors.length === 0; continue;
        }
        if (["access", "access-resume", "precision"].includes(mode)) {
          result.name = `${locale} actual guarded proposal and approval preserve valid legacy rights and history`;
          const precision = mode === "precision", requestedAmount = precision ? "0.25" : "0.50";
          if (precision) result.name = `${locale} exact fractional review amount, current currency and guarded approval`;
          const totalBefore = await db.matchRecord.aggregate({ where: { organizationId, paymentTransactionId: row.paymentTransactionId, status: "APPROVED" }, _sum: { amountMatched: true } });
          assert.equal(totalBefore._sum.amountMatched?.toFixed(2), precision ? "86.50" : "86.00", "Resume only the recorded prior state");
          const retained = await db.matchRecord.findMany({ where: { organizationId, paymentTransactionId: row.paymentTransactionId }, select: { id: true } });
          const maker = await contextFor(fixture.actors.maker, locale); contexts.push(maker); const page = await open(maker);
          const candidate = page.locator(`[data-manual-candidate="${row.exceptionId}"]`), amount = candidate.getByLabel(copy.manualMatch.amountLabel);
          const submit = candidate.getByRole("button", { name: copy.manualMatch.actions.propose, exact: true });
          const pending = await db.matchRecord.findMany({ where: { organizationId, paymentTransactionId: row.paymentTransactionId, status: "PROPOSED", amountMatched: requestedAmount } });
          assert.equal(pending.length, mode === "access-resume" ? 1 : 0, "Inspect partial attempts; do not create another proposal");
          if (mode !== "access-resume") {
            await expect(submit).toBeEnabled(); await amount.fill(requestedAmount); await expect(amount).toHaveValue(requestedAmount);
            await expect(submit).toBeEnabled(); await submit.focus(); await expect(submit).toBeFocused(); await page.keyboard.press("Enter");
            await expect(page.getByTestId("manual-match-lane").getByRole("status")).toHaveText(copy.manualMatch.notifications.proposedMessage);
          }
          const proposed = pending[0] ?? await db.matchRecord.findFirstOrThrow({ where: { organizationId, paymentTransactionId: row.paymentTransactionId, status: "PROPOSED", amountMatched: requestedAmount } });
          assert.equal(proposed.matchedById, fixture.actors.maker.id);
          assert.equal(await db.matchRecord.count({ where: { organizationId, correctionOfId: proposed.id, status: "APPROVED" } }), 0);
          result.resumedProposalId = mode === "access-resume" ? proposed.id : null;
          const makerCard = page.locator(`[data-manual-proposal="${proposed.id}"]`);
          await expect(makerCard.getByRole("button", { name: copy.manualMatch.actions.approve, exact: true })).toBeDisabled();
          const reader = await contextFor(fixture.actors.reader, locale); contexts.push(reader); const readPage = await open(reader);
          await expect(readPage.locator(`[data-manual-candidate="${row.exceptionId}"]`).getByRole("button", { name: copy.manualMatch.actions.propose, exact: true })).toBeDisabled();
          const readCard = readPage.locator(`[data-manual-proposal="${proposed.id}"]`);
          if (precision) await expect(readCard).toContainText(locale === "fr" ? "0,25 XAF" : "0.25 XAF");
          await expect(readCard.getByRole("button", { name: copy.manualMatch.actions.approve, exact: true })).toBeDisabled();
          await readCard.scrollIntoViewIfNeeded(); await screenshot(readPage, "access-reader");
          const checker = await contextFor(fixture.actors.checker, locale); contexts.push(checker); const review = await open(checker);
          const approval = review.locator(`[data-manual-proposal="${proposed.id}"]`).getByRole("button", { name: copy.manualMatch.actions.approve, exact: true });
          if (precision) await expect(review.locator(`[data-manual-proposal="${proposed.id}"]`)).toContainText(locale === "fr" ? "0,25 XAF" : "0.25 XAF");
          await expect(approval).toBeEnabled(); await approval.focus(); await expect(approval).toBeFocused(); await review.keyboard.press("Enter");
          const password = review.getByLabel(copy.manualMatch.passwordLabel);
          await expect.poll(async () => await password.count() > 0 || await db.matchRecord.count({ where: { organizationId, correctionOfId: proposed.id, status: "APPROVED" } }) === 1).toBe(true);
          result.passwordConfirmationUsed = await password.count() > 0;
          if (result.passwordConfirmationUsed) { await password.fill(fixture.password); await password.press("Enter"); }
          await expect.poll(() => db.matchRecord.count({ where: { organizationId, correctionOfId: proposed.id, status: "APPROVED" } })).toBe(1);
          await expect(review.locator(`[data-manual-proposal="${proposed.id}"]`)).toHaveCount(0); await expect(password).toHaveCount(0);
          await review.getByTestId("manual-match-lane").scrollIntoViewIfNeeded(); await screenshot(review, "access-approved");
          const total = await db.matchRecord.aggregate({ where: { organizationId, paymentTransactionId: row.paymentTransactionId, status: "APPROVED" }, _sum: { amountMatched: true } });
          assert.equal(total._sum.amountMatched.toFixed(2), precision ? "86.75" : "86.50");
          assert.equal(await db.matchRecord.count({ where: { organizationId, id: { in: retained.map(item => item.id) } } }), retained.length);
          assert.equal((await db.reconciliationRun.findUniqueOrThrow({ where: { id: row.runId } })).status, "NEEDS_REVIEW");
          result.overflow = await review.evaluate(() => ({ viewport: innerWidth, content: document.documentElement.scrollWidth })); assert.equal(result.overflow.content, result.overflow.viewport);
          result.proposalId = proposed.id; result.approvedTotal = total._sum.amountMatched.toFixed(2); result.retainedPriorRecords = retained.length;
          if (precision) result.exactDisplayedAmount = locale === "fr" ? "0,25 XAF" : "0.25 XAF";
          result.readerMutationsDisabled = true; result.originalRunStillNeedsReview = true; result.passed = result.errors.length === 0;
          continue;
        }
        if (mode === "recovery") {
          result.name = `${locale} excess refusal, inline feedback and replacement of retained proposal`;
          const approvedBefore = await db.matchRecord.aggregate({ where: { organizationId, paymentTransactionId: row.paymentTransactionId, status: "APPROVED" }, _sum: { amountMatched: true } });
          assert.equal(approvedBefore._sum.amountMatched?.toFixed(2), "85.00", "Resume only the recorded first browser state");
          const maker = await contextFor(fixture.actors.maker, locale); contexts.push(maker); const page = await open(maker);
          const lane = page.getByTestId("manual-match-lane"), candidate = page.locator(`[data-manual-candidate="${row.exceptionId}"]`), amount = candidate.getByLabel(copy.manualMatch.amountLabel), submit = candidate.getByRole("button", { name: copy.manualMatch.actions.propose, exact: true });
          const before = await db.matchRecord.count({ where: { organizationId, paymentTransactionId: row.paymentTransactionId } });
          await amount.fill("85"); await submit.click(); await expect(lane.getByRole("alert")).toHaveText(copy.manualMatch.recovery.evidence); await expect(amount).toHaveValue("85");
          assert.equal(await db.matchRecord.count({ where: { organizationId, paymentTransactionId: row.paymentTransactionId } }), before);
          await expect(page.getByText("Operation Failed", { exact: true })).toHaveCount(0);
          await lane.getByRole("alert").scrollIntoViewIfNeeded(); await screenshot(page, "inline-refusal");
          await amount.fill("1"); await submit.focus(); await page.keyboard.press("Enter"); await expect(lane.getByRole("status")).toHaveText(copy.manualMatch.notifications.proposedMessage);
          const first = await db.matchRecord.findFirstOrThrow({ where: { organizationId, paymentTransactionId: row.paymentTransactionId, status: "PROPOSED", amountMatched: "1.00" }, orderBy: { createdAt: "desc" } });
          await page.locator(`[data-manual-proposal="${first.id}"]`).getByRole("button", { name: copy.manualMatch.actions.renew, exact: true }).click();
          await expect(lane.getByRole("status")).toHaveText(copy.manualMatch.notifications.renewed);
          const replacement = await db.matchRecord.findFirstOrThrow({ where: { organizationId, paymentTransactionId: row.paymentTransactionId, status: "PROPOSED", metadata: { path: ["supersedesProposalId"], equals: first.id } } });
          await expect(page.locator(`[data-manual-proposal="${first.id}"]`)).toHaveCount(0);
          const card = page.locator(`[data-manual-proposal="${replacement.id}"]`); await expect(card).toBeVisible(); await card.scrollIntoViewIfNeeded(); await screenshot(page, "replacement-review");
          result.reflow = [];
          for (const width of [390, 768, 720, 1440]) { await page.setViewportSize({ width, height: 1000 }); const size = await page.evaluate(() => ({ viewport: innerWidth, content: document.documentElement.scrollWidth })); assert.equal(size.viewport, size.content); result.reflow.push(size); }
          await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
          result.axe = await page.evaluate(async () => { const audit = await window.axe.run('[data-testid="manual-match-lane"]'); return { violations: audit.violations.map(row => ({ id: row.id, impact: row.impact, nodes: row.nodes.map(node => node.target) })), incomplete: audit.incomplete.map(row => row.id), passes: audit.passes.length }; });
          const checker = await contextFor(fixture.actors.checker, locale); contexts.push(checker); const review = await open(checker);
          await review.locator(`[data-manual-proposal="${replacement.id}"]`).getByRole("button", { name: copy.manualMatch.actions.approve, exact: true }).click();
          const password = review.getByLabel(copy.manualMatch.passwordLabel);
          await expect.poll(async () => await password.count() > 0 || await db.matchRecord.count({ where: { organizationId, correctionOfId: replacement.id, status: "APPROVED" } }) === 1).toBe(true);
          if (await password.count()) { await password.fill(fixture.password); await password.press("Enter"); }
          await expect.poll(() => db.matchRecord.count({ where: { organizationId, correctionOfId: replacement.id, status: "APPROVED" } })).toBe(1);
          await expect(review.locator(`[data-manual-proposal="${replacement.id}"]`)).toHaveCount(0); await expect(password).toHaveCount(0);
          const total = await db.matchRecord.aggregate({ where: { organizationId, paymentTransactionId: row.paymentTransactionId, status: "APPROVED" }, _sum: { amountMatched: true } }); assert.equal(total._sum.amountMatched.toFixed(2), "86.00");
          assert.equal((await db.matchRecord.findUniqueOrThrow({ where: { id: first.id } })).status, "PROPOSED");
          assert.equal(await db.matchRecord.count({ where: { organizationId, correctionOfId: first.id, status: "VOIDED" } }), 1);
          result.originalProposalId = first.id; result.replacementProposalId = replacement.id; result.approvedTotal = "86.00"; result.passed = result.errors.length === 0 && result.axe.violations.length === 0;
          continue;
        }
        assert.equal(await db.matchRecord.count({ where: { organizationId, paymentTransactionId: row.paymentTransactionId, rule: "MANUAL" } }), 0, "Existing consumed journey requires inspection; no resetting or duplicate fixture execution");
        const maker = await contextFor(fixture.actors.maker, locale); contexts.push(maker); const page = await open(maker);
        const candidate = page.locator(`[data-manual-candidate="${row.exceptionId}"]`), amount = candidate.getByLabel(copy.manualMatch.amountLabel), submit = candidate.getByRole("button", { name: copy.manualMatch.actions.propose, exact: true });
        await amount.fill("0.001"); await expect(submit).toBeDisabled(); await amount.fill("85"); await expect(submit).toBeEnabled();
        let dropped = false;
        await page.route(`**/${locale}/dashboard/finance/reconciliation`, async route => {
          if (!dropped && route.request().method() === "POST" && (route.request().postData() ?? "").includes(row.providerEventId)) { dropped = true; await route.fetch({ timeout: 120000 }); await route.abort("connectionfailed"); } else await route.continue();
        });
        await submit.focus(); await page.keyboard.press("Enter");
        await expect(page.getByTestId("manual-match-lane").getByRole("alert")).toContainText(copy.manualMatch.recovery.unknown);
        assert.equal(dropped, true); await expect(amount).toHaveValue("85");
        await expect.poll(() => db.matchRecord.count({ where: { organizationId, paymentTransactionId: row.paymentTransactionId, status: "PROPOSED" } })).toBe(1);
        await submit.click(); await expect(page.getByTestId("manual-match-lane").getByRole("status")).toHaveText(copy.manualMatch.notifications.alreadyRecorded);
        assert.equal(await db.matchRecord.count({ where: { organizationId, paymentTransactionId: row.paymentTransactionId, status: "PROPOSED" } }), 1);
        const proposal = await db.matchRecord.findFirstOrThrow({ where: { organizationId, paymentTransactionId: row.paymentTransactionId, status: "PROPOSED" } });
        const proposedCard = page.locator(`[data-manual-proposal="${proposal.id}"]`); await expect(proposedCard).toBeVisible(); await expect(proposedCard.getByRole("button", { name: copy.manualMatch.actions.approve, exact: true })).toBeDisabled();
        await proposedCard.scrollIntoViewIfNeeded(); await screenshot(page, "maker-pending");
        const checker = await contextFor(fixture.actors.checker, locale); contexts.push(checker); const review = await open(checker), reviewedCard = review.locator(`[data-manual-proposal="${proposal.id}"]`);
        await expect(reviewedCard).toContainText("100.00"); await expect(reviewedCard).toContainText("90.00");
        const approval = reviewedCard.getByRole("button", { name: copy.manualMatch.actions.approve, exact: true }); await expect(approval).toBeEnabled(); await approval.focus(); await review.keyboard.press("Enter");
        const password = review.getByLabel(copy.manualMatch.passwordLabel);
        await expect.poll(async () => await password.count() > 0 || await db.matchRecord.count({ where: { organizationId, correctionOfId: proposal.id, status: "APPROVED" } }) === 1).toBe(true);
        result.passwordConfirmationUsed = await password.count() > 0;
        if (result.passwordConfirmationUsed) { await password.fill(fixture.password); await password.press("Enter"); }
        await expect.poll(() => db.matchRecord.count({ where: { organizationId, correctionOfId: proposal.id, status: "APPROVED" } })).toBe(1);
        await expect(reviewedCard).toHaveCount(0); await expect(password).toHaveCount(0);
        await review.getByTestId("manual-match-lane").scrollIntoViewIfNeeded(); await screenshot(review, "approved");
        result.overflow = await review.evaluate(() => ({ viewport: innerWidth, content: document.documentElement.scrollWidth })); assert.equal(result.overflow.content, result.overflow.viewport);
        const run = await db.reconciliationRun.findUniqueOrThrow({ where: { id: row.runId } }); assert.equal(run.status, "NEEDS_REVIEW");
        assert.equal(await db.ledgerPostingBatch.count({ where: { organizationId, matchRecords: { some: { paymentTransactionId: row.paymentTransactionId } } } }), 0);
        result.proposalId = proposal.id; result.approvedAmount = "85.00"; result.originalRunStillNeedsReview = true; result.duplicateProposals = 0; result.passed = result.errors.length === 0;
      } catch (error) {
        result.error = safe(error);
        const page = contexts.at(-1)?.pages()[0];
        if (page) {
          const lane = page.getByTestId("manual-match-lane");
          result.failureState = { alerts: await lane.getByRole("alert").allTextContents(), statuses: await lane.getByRole("status").allTextContents() };
          if (await page.locator('input[type="password"]').count() === 0) { await lane.scrollIntoViewIfNeeded().catch(() => {}); await screenshot(page, "failure"); }
        }
      }
      finally { for (const context of contexts) await context.close(); }
    }
  } finally { await browser.close(); }
}
let before;
(async () => {
  before = await guard(); receipt.originalAuthorityHashBefore = before;
  if (mode === "prepare") await prepare();
  else if (mode === "inspect") {
    const fixture = JSON.parse(fs.readFileSync(PRIVATE, "utf8")); assert.equal(fixture.organizationId, organizationId); assert.equal(fixture.database, helper.DATABASE_NAME);
    for (const [locale, row] of Object.entries(fixture.journeys)) {
      receipt.checks.push({ name: `${locale} read-only retained manual state`, passed: true,
        records: await db.matchRecord.findMany({ where: { organizationId, paymentTransactionId: row.paymentTransactionId }, select: { id: true, status: true, amountMatched: true, correctionOfId: true, createdAt: true } }),
      });
    }
  } else await browserProof();
})().catch(error => { receipt.fatal = safe(error); }).finally(async () => {
  if (before) { receipt.originalAuthorityHashAfter = sha(await authority()); receipt.existingAuthorityUnchanged = receipt.originalAuthorityHashAfter === before; }
  await db.$disconnect(); receipt.sourcesAfter = sources(); receipt.sourceStable = JSON.stringify(receipt.sourcesBefore) === JSON.stringify(receipt.sourcesAfter); receipt.driverSha256 = sha(fs.readFileSync(__filename)); receipt.completedAt = new Date().toISOString(); receipt.passed = receipt.checks.filter(row => row.passed).length; receipt.failed = receipt.checks.filter(row => !row.passed).length + Number(Boolean(receipt.fatal));
  const file = path.join(__dirname, `manual-browser-${mode}-${attempt}.json`); fs.writeFileSync(file, JSON.stringify(receipt, null, 2) + "\n", { flag: "wx" }); console.log(JSON.stringify({ passed: receipt.passed, failed: receipt.failed, evidence: path.relative(ROOT, file) })); process.exit(receipt.failed ? 1 : 0);
});
