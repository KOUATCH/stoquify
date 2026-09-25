const f = require('./supplier-ack-fixtures.cjs'), { db, fs, path, crypto, assert, base } = f;
const { chromium, expect: initialExpect } = require('@playwright/test'), expect = initialExpect.configure({ timeout: 60000 });
const { hashPassword } = require(path.join(f.root, 'lib/password.ts'));
const run = crypto.randomUUID().slice(0, 12), secrets = [];
const report = { run, startedAt: new Date().toISOString(), sourcesBefore: f.sources(), checks: [], scope: 'Six historical envelopes prepared using domain services on dedicated synthetic approved orders; actual password login and read-only EN/FR browser pagination. No live customer, delivery or financial processing.' };
async function records(x) {
  return f.hash({ order: await f.orderState(x), envelopes: await db.supplierPoEnvelope.findMany({ where: { organizationId: x.organizationId }, orderBy: { id: 'asc' } }), proposals: await db.supplierPoProposal.findMany({ where: { organizationId: x.organizationId }, include: { lines: true, states: true }, orderBy: { id: 'asc' } }), events: await db.businessEvent.findMany({ where: { organizationId: x.organizationId }, orderBy: { id: 'asc' } }) });
}
async function journey(browser, locale) {
  const x = await f.fixture(locale, 'history-' + run, { skipInvite: true }), refs = [];
  for (let index = 0; index < 6; index++) {
    // Isolated fixture version preparation; this is not a production amendment.
    await db.purchaseOrder.update({ where: { id: x.purchaseOrderId }, data: { expectedDeliveryDate: new Date(Date.now() + (15 + index) * 86400000) } });
    const current = await f.getSupplierPoAcknowledgementWorkbench({ organizationId: x.organizationId, actorId: x.actorId, purchaseOrderId: x.purchaseOrderId }, db);
    const invite = await f.issueSupplierPoInvite({ ...x.issueCommand, expectedOrderHash: current.purchaseOrder.currentOrderHash, idempotencyKey: 'history-invite-' + locale + '-' + run + '-' + index, correlationId: 'history-invite-correlation-' + locale + '-' + run + '-' + index }, db);
    secrets.push(invite.token);
    const response = await f.submitSupplierPoProposal({ envelopeId: invite.envelopeId, token: invite.token, proposalType: 'REQUEST_CHANGE', quantityChanges: [{ purchaseOrderLineId: x.lineId, requestedQuantity: '8.125' }], note: 'Owned historical supplier response ' + index, idempotencyKey: 'history-response-' + locale + '-' + run + '-' + index, correlationId: 'history-response-correlation-' + locale + '-' + run + '-' + index }, db);
    refs.push({ envelopeId: invite.envelopeId, proposalId: response.proposalId });
  }
  const before = await records(x), copy = require(path.join(f.root, 'messages', locale + '.json')).supplierPoAcknowledgement.buyerWorkbench;
  const password = 'Owned!' + crypto.randomBytes(20).toString('hex') + 'B8', hash = await hashPassword(password), actor = await db.user.findUniqueOrThrow({ where: { id: x.actorId } });
  secrets.push(password, hash);
  await db.account.create({ data: { userId: x.actorId, accountId: x.actorId, providerId: 'credential', password: hash } });
  await db.user.update({ where: { id: x.actorId }, data: { password: hash } });
  await db.session.delete({ where: { id: x.sessionId } });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: locale === 'fr' ? 'fr-FR' : 'en-GB', reducedMotion: 'reduce' });
  const page = await context.newPage(), result = { locale, screenshots: [], pageErrors: [], layouts: [] }; let sessionId;
  const shot = async name => { const file = 'supplier-history-' + locale + '-' + name + '-' + run + '.png'; await page.screenshot({ path: path.join(__dirname, file), fullPage: true, animations: 'disabled', mask: [page.locator('input[type="password"]'), page.getByTestId('supplier-po-invite-url')] }); result.screenshots.push(file); };
  try {
    await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
    page.on('pageerror', error => result.pageErrors.push(f.safe(error, secrets)));
    const login = await context.request.post(base + '/api/auth/sign-in/email', { data: { email: actor.email, password }, headers: { Origin: base }, timeout: 180000 });
    assert.equal(login.status(), 200); const signed = await login.json(); secrets.push(signed.token);
    sessionId = (await db.session.findUniqueOrThrow({ where: { token: signed.token } })).id;
    const start = Date.now(); await page.goto(base + '/' + locale + '/dashboard/purchase-orders/' + x.purchaseOrderId + '/supplier-acknowledgement', { waitUntil: 'networkidle', timeout: 240000 });
    const workbench = page.getByTestId('supplier-po-buyer-workbench'); await expect(workbench).toBeVisible();
    await expect(workbench.getByTestId('buyer-proposal-status')).toHaveCount(5); result.routeReadyMs = Date.now() - start;
    await expect(workbench.getByTestId('supplier-po-proposal-' + refs[5].proposalId)).toBeVisible();
    await expect(workbench.getByTestId('supplier-po-proposal-' + refs[0].proposalId)).toHaveCount(0);
    await shot('latest-desktop');
    const older = page.getByRole('button', { name: copy.olderEnvelopes, exact: true }); await older.focus();
    const paging = Date.now(); await page.keyboard.press('Enter'); await expect(workbench.getByTestId('buyer-proposal-status')).toHaveCount(1); result.olderPageMs = Date.now() - paging;
    await expect(workbench.getByTestId('supplier-po-proposal-' + refs[0].proposalId)).toBeVisible();
    await expect(workbench.getByTestId('buyer-accept-supplier-proposal')).toBeDisabled();
    await expect(page.getByRole('button', { name: copy.olderEnvelopes, exact: true })).toHaveCount(0); await shot('oldest-desktop');
    for (const width of [768, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      const layout = await workbench.evaluate(element => ({ width: innerWidth, scroll: document.documentElement.scrollWidth, content: element.scrollWidth, available: element.clientWidth }));
      assert.ok(layout.scroll <= width + 1 && layout.content <= layout.available + 1); result.layouts.push(layout);
      if (width === 390) await shot('oldest-mobile');
    }
    await page.evaluate(() => document.documentElement.style.fontSize = '200%'); await shot('oldest-text-reflow');
    const reflow = await workbench.evaluate(element => ({ content: element.scrollWidth, available: element.clientWidth })); assert.ok(reflow.content <= reflow.available + 1); result.layouts.push({ textResize: '200%', ...reflow });
    await page.evaluate(() => document.documentElement.style.fontSize = ''); await page.setViewportSize({ width: 1440, height: 1000 });
    await page.getByRole('button', { name: copy.refresh, exact: true }).focus(); await page.keyboard.press('Enter');
    await expect(workbench.getByTestId('buyer-proposal-status')).toHaveCount(5); await expect(workbench.getByTestId('supplier-po-proposal-' + refs[5].proposalId)).toBeVisible(); await shot('latest-restored');
    assert.equal(await records(x), before); assert.deepEqual(result.pageErrors, []); result.passed = true;
  } catch (error) { result.passed = false; result.error = f.safe(error, secrets); await shot('failed').catch(() => {}); }
  finally { await context.close(); if (sessionId) await db.session.deleteMany({ where: { id: sessionId, userId: x.actorId } }); }
  return result;
}
(async () => {
  await f.local.withClient(f.target, f.local.assertOwned); report.originalBefore = await f.stable();
  const browser = await chromium.launch({ headless: true }); try { for (const locale of ['en', 'fr']) report.checks.push(await journey(browser, locale)); } finally { await browser.close(); }
})().catch(error => report.error = f.safe(error, secrets)).finally(async () => {
  report.originalUnchanged = report.originalBefore === await f.stable(); report.sourcesAfter = f.sources(); report.sourceStable = JSON.stringify(report.sourcesBefore) === JSON.stringify(report.sourcesAfter);
  await db.$disconnect(); const file = 'supplier-history-browser-' + run + '.json'; fs.writeFileSync(path.join(__dirname, file), JSON.stringify(report, null, 2), { flag: 'wx' });
  console.log(JSON.stringify({ file, checks: report.checks.map(({ locale, passed, error, screenshots }) => ({ locale, passed, error, screenshots: screenshots.length })), error: report.error, sourceStable: report.sourceStable, originalUnchanged: report.originalUnchanged }));
  process.exitCode = report.error || report.checks.length !== 2 || report.checks.some(result => !result.passed) || !report.originalUnchanged || !report.sourceStable ? 1 : 0;
});
