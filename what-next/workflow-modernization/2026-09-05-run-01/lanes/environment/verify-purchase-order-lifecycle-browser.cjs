const f = require('./supplier-ack-fixtures.cjs'), { db, fs, path, crypto, assert, base } = f;
const { chromium, expect: baseExpect } = require('@playwright/test'), expect = baseExpect.configure({ timeout: 60000 });
const service = require(path.join(f.root, 'services/purchase-order/purchase-order.service.ts'));
const { hashPassword } = require(path.join(f.root, 'lib/password.ts'));
const run = crypto.randomUUID().slice(0, 12), secrets = [];
const files = [...f.files, 'services/purchase-order/purchase-order.service.ts', 'services/purchase-order/purchase-order.schemas.ts', 'services/purchase-order/purchase-order-capabilities.ts', 'actions/purchaseOrderWorkflow/purchaseOrderSystemAction.ts', 'components/purchase-orders/ModernEditPurchaseOrderForm.tsx', 'components/purchase-orders/purchase-order-edit-model.ts', 'hooks/useRecentPurchaseOrderQueries.ts', 'app/[locale]/(dashboard)/dashboard/purchase-orders/[id]/edit/page.tsx'];
const sources = () => Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, file))).digest('hex')]));
const report = { run, startedAt: new Date().toISOString(), sourcesBefore: sources(), checks: [], scope: 'Real local sign-in, existing EN/FR editor and server actions with owned synthetic orders. Competing approval uses the domain service and a distinct synthetic checker; this does not establish current approval IAM or professional authorization. No migrations or external messages.' };
async function journey(browser, locale) {
  const x = await f.fixture(locale, 'lifecycle-browser-' + run, { skipInvite: true });
  const t = require(path.join(f.root, 'messages', locale + '.json')).purchaseOrderEdit;
  await db.purchaseOrder.update({ where: { id: x.purchaseOrderId }, data: { status: 'DRAFT', approvedById: null, approvedAt: null, notes: 'Owned draft before review', shippingCost: '50.00', total: '25050.00' } });
  const password = 'Owned!' + crypto.randomBytes(20).toString('hex') + 'R8', hash = await hashPassword(password), actor = await db.user.findUniqueOrThrow({ where: { id: x.actorId } }); secrets.push(password, hash);
  await db.account.create({ data: { userId: x.actorId, accountId: x.actorId, providerId: 'credential', password: hash } });
  await db.user.update({ where: { id: x.actorId }, data: { password: hash } }); await db.session.delete({ where: { id: x.sessionId } });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: locale === 'fr' ? 'fr-FR' : 'en-GB', reducedMotion: 'reduce' });
  const page = await context.newPage(), url = base + '/' + locale + '/dashboard/purchase-orders/' + x.purchaseOrderId + '/edit';
  const result = { locale, screenshots: [], layouts: [], pageErrors: [], passed: false }; let sessionId;
  const shot = async name => { const file = 'purchase-lifecycle-' + locale + '-' + name + '-' + run + '.png'; await page.screenshot({ path: path.join(__dirname, file), fullPage: true, animations: 'disabled' }); result.screenshots.push(file); };
  const order = () => db.purchaseOrder.findUniqueOrThrow({ where: { id: x.purchaseOrderId }, include: { lines: true } });
  async function review() {
    await expect(page.getByRole('form', { name: t.title })).toBeVisible();
    for (let step = 0; step < 3; step++) { const next = page.getByRole('button', { name: t.next, exact: true }); await expect(next).toBeEnabled(); await next.focus(); await expect(next).toBeFocused(); await page.keyboard.press('Enter'); await expect(page.getByRole('heading', { name: [t.parties, t.items, t.terms][step], exact: true })).toBeFocused(); }
  }
  try {
    await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
    page.on('pageerror', error => result.pageErrors.push(f.safe(error, secrets)));
    const login = await context.request.post(base + '/api/auth/sign-in/email', { data: { email: actor.email, password }, headers: { Origin: base }, timeout: 180000 }); assert.equal(login.status(), 200);
    const signed = await login.json(); secrets.push(signed.token); sessionId = (await db.session.findUniqueOrThrow({ where: { token: signed.token } })).id;
    const started = Date.now(); await page.goto(url, { waitUntil: 'networkidle', timeout: 240000 }); await review(); result.routeToReviewMs = Date.now() - started;
    await page.getByLabel(t.shipping, { exact: true }).fill('175.25'); await page.getByLabel(t.notes, { exact: true }).fill(locale === 'fr' ? 'Conditions vérifiées avant soumission.' : 'Terms checked before submission.');
    await shot('review'); const lineId = (await order()).lines[0].id, saveStarted = Date.now(); await page.getByRole('button', { name: t.save, exact: true }).click();
    await expect.poll(async () => (await order()).total.toFixed(2), { timeout: 90000 }).toBe('25175.25');
    await expect(page).toHaveURL(base + '/' + locale + '/dashboard/purchase-orders/' + x.purchaseOrderId); result.saveMs = Date.now() - saveStarted;
    assert.equal((await order()).lines[0].id, lineId); assert.equal((await order()).shippingCost.toFixed(2), '175.25'); await shot('saved');
    await page.goto(url, { waitUntil: 'networkidle', timeout: 180000 }); await review(); const retained = locale === 'fr' ? 'Modification non enregistrée après approbation concurrente.' : 'Unsaved edit after competing approval.';
    await page.getByLabel(t.notes, { exact: true }).fill(retained);
    const checker = await db.user.create({ data: { organizationId: x.organizationId, name: 'Owned independent checker', email: 'lifecycle-browser-checker-' + locale + '-' + run + '@example.invalid' } });
    await service.submitPurchaseOrder(x.purchaseOrderId, x.organizationId); await service.approvePurchaseOrder(x.purchaseOrderId, x.organizationId, checker.id); const approved = f.hash(await order());
    const rejectedStarted = Date.now(); await page.getByRole('button', { name: t.save, exact: true }).click(); await expect(page.getByRole('alert').filter({ hasText: t.failedTitle })).toBeVisible(); result.rejectionMs = Date.now() - rejectedStarted;
    await expect(page.getByLabel(t.notes, { exact: true })).toHaveValue(retained); assert.equal(f.hash(await order()), approved); await shot('rejected-retained');
    for (const size of [{ width: 1440, height: 1000 }, { width: 768, height: 1024 }, { width: 390, height: 844 }, { width: 320, height: 800 }]) {
      await page.setViewportSize(size); const layout = await page.getByRole('form', { name: t.title }).evaluate(el => ({ scrollWidth: el.scrollWidth, clientWidth: el.clientWidth, documentWidth: document.documentElement.scrollWidth, viewport: innerWidth })); assert.ok(layout.scrollWidth <= layout.clientWidth + 1); assert.ok(layout.documentWidth <= layout.viewport + 1); result.layouts.push({ ...size, ...layout }); if (size.width === 390) await shot('mobile-retained');
    }
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; }); const reflow = await page.getByRole('form', { name: t.title }).evaluate(el => ({ scrollWidth: el.scrollWidth, clientWidth: el.clientWidth, overflowingElements: [...el.querySelectorAll('*')].filter(node => node.scrollWidth > node.clientWidth + 1 && node.clientWidth > 0).slice(0, 15).map(node => ({ tag: node.tagName, className: node.className, width: node.clientWidth, scrollWidth: node.scrollWidth })) })); result.layouts.push({ textResize: '200%', ...reflow }); await shot('text-reflow'); assert.ok(reflow.scrollWidth <= reflow.clientWidth + 1);
    await db.role.update({ where: { id: x.roleId }, data: { permissions: ['purchases.orders.read'] } }); const denied = await context.newPage(); await denied.goto(url, { waitUntil: 'networkidle', timeout: 180000 }); await expect(denied.getByRole('form', { name: t.title })).toHaveCount(0); await expect(denied.getByRole('heading').filter({ hasText: 'is not available for this role' })).toBeVisible();
    const deniedFile = 'purchase-lifecycle-' + locale + '-denied-' + run + '.png'; await denied.screenshot({ path: path.join(__dirname, deniedFile), fullPage: true, animations: 'disabled' }); result.screenshots.push(deniedFile); await denied.close();
    assert.equal(f.hash(await order()), approved); assert.deepEqual(result.pageErrors, []); result.passed = true;
  } catch (error) { result.error = f.safe(error, secrets); await shot('failed').catch(() => {}); }
  finally { await context.close(); if (sessionId) await db.session.deleteMany({ where: { id: sessionId, userId: x.actorId } }); await db.role.update({ where: { id: x.roleId }, data: { permissions: ['purchases.orders.read', 'purchases.orders.update'] } }); }
  return result;
}
(async () => {
  await f.local.withClient(f.target, f.local.assertOwned); report.originalBefore = await f.stable(); const browser = await chromium.launch({ headless: true });
  try { for (const locale of ['en', 'fr']) report.checks.push(await journey(browser, locale)); } finally { await browser.close(); }
})().catch(error => { report.error = f.safe(error, secrets); }).finally(async () => {
  report.originalUnchanged = report.originalBefore === await f.stable(); report.sourcesAfter = sources(); report.sourceStable = JSON.stringify(report.sourcesBefore) === JSON.stringify(report.sourcesAfter); await db.$disconnect(); report.completedAt = new Date().toISOString();
  const file = 'purchase-order-lifecycle-browser-' + run + '.json'; fs.writeFileSync(path.join(__dirname, file), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ file, checks: report.checks.map(x => ({ locale: x.locale, passed: x.passed, error: x.error, screenshots: x.screenshots.length })), error: report.error, originalUnchanged: report.originalUnchanged, sourceStable: report.sourceStable }));
  process.exitCode = report.error || report.checks.length !== 2 || report.checks.some(c => !c.passed) || !report.originalUnchanged || !report.sourceStable ? 1 : 0;
});
