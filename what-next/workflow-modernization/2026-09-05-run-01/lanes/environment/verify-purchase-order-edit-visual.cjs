const f = require('./supplier-ack-fixtures.cjs'), { db, fs, path, crypto, assert, base } = f;
const { chromium, expect: baseExpect } = require('@playwright/test'), expect = baseExpect.configure({ timeout: 60000 });
const { hashPassword } = require(path.join(f.root, 'lib/password.ts')), service = require(path.join(f.root, 'services/purchase-order/purchase-order.service.ts'));
const run = crypto.randomUUID().slice(0, 12), secrets = [], files = [...f.files, 'services/purchase-order/purchase-order.service.ts', 'services/purchase-order/purchase-order-edit-record.ts', 'components/purchase-orders/ModernEditPurchaseOrderForm.tsx', 'components/purchase-orders/purchase-order-edit-draft.ts', 'actions/purchaseOrderWorkflow/purchaseOrderSystemAction.ts'];
const sources = () => Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, file))).digest('hex')]));
const report = { run, at: new Date().toISOString(), sourcesBefore: sources(), checks: [], purpose: 'Unmodified actual viewport screenshots to investigate a blank region in a full-page mobile capture. Local owned synthetic records and existing source; no screenshot CSS override or image editing.' };
(async () => {
  await f.local.withClient(f.target, f.local.assertOwned); report.originalBefore = await f.stable(); const browser = await chromium.launch({ headless: true });
  try { for (const locale of ['en', 'fr']) {
    const x = await f.fixture(locale, 'edit-visual-' + run, { skipInvite: true }), t = require(path.join(f.root, 'messages', locale + '.json')).purchaseOrderEdit;
    await db.purchaseOrder.update({ where: { id: x.purchaseOrderId }, data: { status: 'DRAFT', approvedById: null, approvedAt: null } });
    const password = 'Owned!' + crypto.randomBytes(20).toString('hex') + 'R8', hash = await hashPassword(password), actor = await db.user.findUniqueOrThrow({ where: { id: x.actorId } }); secrets.push(password, hash);
    await db.account.create({ data: { userId: x.actorId, accountId: x.actorId, providerId: 'credential', password: hash } }); await db.user.update({ where: { id: x.actorId }, data: { password: hash } }); await db.session.delete({ where: { id: x.sessionId } });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' }), page = await context.newPage(), result = { locale, screenshots: [], checks: [], passed: false }; let sessionId;
    const shot = async label => { const file = 'purchase-edit-viewport-' + locale + '-' + label + '-' + run + '.png'; await page.screenshot({ path: path.join(__dirname, file), fullPage: false, animations: 'disabled' }); result.screenshots.push(file); };
    try {
      await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
      const login = await context.request.post(base + '/api/auth/sign-in/email', { data: { email: actor.email, password }, headers: { Origin: base }, timeout: 180000 }); assert.equal(login.status(), 200); const signed = await login.json(); secrets.push(signed.token); sessionId = (await db.session.findUniqueOrThrow({ where: { token: signed.token } })).id;
      await page.goto(base + '/' + locale + '/dashboard/purchase-orders/' + x.purchaseOrderId + '/edit', { waitUntil: 'networkidle', timeout: 240000 });
      for (let i = 0; i < 3; i++) { const next = page.getByRole('button', { name: t.next, exact: true }); await expect(next).toBeEnabled(); await next.click(); }
      await page.getByLabel(t.notes, { exact: true }).fill(locale === 'fr' ? 'Mes conditions de livraison proposées.' : 'My proposed delivery terms.');
      const current = await service.getPurchaseOrderById(x.purchaseOrderId, x.organizationId); await service.updatePurchaseOrder({ id: x.purchaseOrderId, organizationId: x.organizationId, updatedById: x.actorId, sessionId, sessionToken: signed.token, expectedRevision: current.editRevision, idempotencyKey: crypto.randomUUID(), notes: 'Other saved delivery terms' });
      await page.getByRole('button', { name: t.save, exact: true }).click(); await expect(page.getByRole('form', { name: t.title }).getByRole('alert')).toContainText(t.staleTitle); await page.getByRole('button', { name: t.compareCurrent, exact: true }).click();
      const section = page.getByRole('region', { name: t.compareTitle }), heading = section.getByRole('heading', { name: t.compareTitle }); await expect(heading).toBeFocused(); await shot('desktop-top');
      await page.setViewportSize({ width: 390, height: 844 });
      for (const [label, locator] of [['mobile-top', heading], ['mobile-notes', section.getByRole('combobox', { name: t.notes + ': ' + t.chooseResolution })], ['mobile-actions', section.getByRole('button', { name: t.useCurrent, exact: true })]]) {
        await locator.scrollIntoViewIfNeeded(); await expect(locator).toBeInViewport();
        result.checks.push({ label, ...(await locator.evaluate(el => { const r = el.getBoundingClientRect(), style = getComputedStyle(el), at = document.elementFromPoint(Math.min(innerWidth - 1, r.left + r.width / 2), Math.min(innerHeight - 1, r.top + r.height / 2)); return { top: r.top, bottom: r.bottom, width: r.width, opacity: style.opacity, visibility: style.visibility, hitWithin: !!at && (el.contains(at) || at.contains(el)), documentWidth: document.documentElement.scrollWidth, viewport: innerWidth }; })) });
        await shot(label);
      }
      assert.ok(result.checks.every(c => c.visibility === 'visible' && c.opacity === '1' && c.hitWithin && c.documentWidth <= c.viewport + 1)); result.passed = true;
    } catch (error) { result.error = f.safe(error, secrets); await shot('failed').catch(() => {}); }
    finally { await context.close(); if (sessionId) await db.session.deleteMany({ where: { id: sessionId, userId: x.actorId } }); }
    report.checks.push(result);
  } } finally { await browser.close(); }
})().catch(error => { report.error = f.safe(error, secrets); }).finally(async () => {
  report.originalUnchanged = report.originalBefore === await f.stable(); report.sourcesAfter = sources(); report.sourceStable = JSON.stringify(report.sourcesBefore) === JSON.stringify(report.sourcesAfter); await db.$disconnect();
  const output = 'purchase-order-edit-visual-' + run + '.json'; fs.writeFileSync(path.join(__dirname, output), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify({ output, checks: report.checks.map(c => ({ locale: c.locale, passed: c.passed, screenshots: c.screenshots, error: c.error })), sourceStable: report.sourceStable, originalUnchanged: report.originalUnchanged, error: report.error })); process.exitCode = report.error || report.checks.length !== 2 || report.checks.some(c => !c.passed) || !report.originalUnchanged || !report.sourceStable ? 1 : 0;
});
