const f = require('./supplier-ack-fixtures.cjs'), { db, fs, path, crypto, assert, base } = f;
const { chromium, expect: baseExpect } = require('@playwright/test'), expect = baseExpect.configure({ timeout: 60000 });
const { hashPassword } = require(path.join(f.root, 'lib/password.ts'));
const run = crypto.randomUUID().slice(0, 12), secrets = [];
const files = [...f.files, 'services/purchase-order/purchase-order.service.ts', 'services/purchase-order/purchase-order.schemas.ts', 'services/purchase-order/purchase-order-edit-record.ts', 'actions/purchaseOrderWorkflow/purchaseOrderSystemAction.ts', 'components/purchase-orders/ModernEditPurchaseOrderForm.tsx', 'components/purchase-orders/purchase-order-edit-draft.ts', 'components/purchase-orders/purchase-order-edit-model.ts', 'hooks/useRecentPurchaseOrderQueries.ts', 'app/[locale]/(dashboard)/dashboard/purchase-orders/[id]/edit/page.tsx'];
const sources = () => Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, file))).digest('hex')]));
const report = { run, startedAt: new Date().toISOString(), sourcesBefore: sources(), checks: [], scope: 'Actual EN/FR purchase draft editing through current local app 3110, real password sign-in, two browser tabs, dropped response after server processing, scoped role revocation. Owned fixtures only; external traffic blocked; no migrations or posting.' };
async function journey(browser, locale) {
  const x = await f.fixture(locale, 'edit-browser-' + run, { skipInvite: true });
  const t = require(path.join(f.root, 'messages', locale + '.json')).purchaseOrderEdit;
  await db.purchaseOrder.update({ where: { id: x.purchaseOrderId }, data: { status: 'DRAFT', approvedById: null, approvedAt: null, notes: 'Original reviewed notes' } });
  const password = 'Owned!' + crypto.randomBytes(20).toString('hex') + 'R8', hash = await hashPassword(password), actor = await db.user.findUniqueOrThrow({ where: { id: x.actorId } }); secrets.push(password, hash);
  await db.account.create({ data: { userId: x.actorId, accountId: x.actorId, providerId: 'credential', password: hash } });
  await db.user.update({ where: { id: x.actorId }, data: { password: hash } }); await db.session.delete({ where: { id: x.sessionId } });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: locale === 'fr' ? 'fr-FR' : 'en-GB', reducedMotion: 'reduce' });
  const page = await context.newPage(), other = await context.newPage(), url = base + '/' + locale + '/dashboard/purchase-orders/' + x.purchaseOrderId + '/edit', savedUrl = url.slice(0, -5);
  const result = { locale, screenshots: [], layouts: [], pageErrors: [], actionRequests: [], completed: [], passed: false }; let sessionId;
  const shot = async name => { const file = 'purchase-edit-' + locale + '-' + name + '-' + run + '.png'; await page.screenshot({ path: path.join(__dirname, file), fullPage: true, animations: 'disabled' }); result.screenshots.push(file); };
  const order = () => db.purchaseOrder.findUniqueOrThrow({ where: { id: x.purchaseOrderId }, include: { lines: true } });
  const audits = () => db.auditLog.count({ where: { organizationId: x.organizationId, entityId: x.purchaseOrderId, action: 'UPDATE_PURCHASE_ORDER_DRAFT' } });
  async function review(tab) {
    await expect(tab.getByRole('form', { name: t.title })).toBeVisible();
    for (let step = 0; step < 3; step++) { const next = tab.getByRole('button', { name: t.next, exact: true }); await expect(next).toBeEnabled(); await next.focus(); await tab.keyboard.press('Enter'); await expect(tab.getByRole('heading', { name: [t.parties, t.items, t.terms][step], exact: true })).toBeFocused(); }
  }
  const open = async tab => { await tab.goto(url, { waitUntil: 'networkidle', timeout: 240000 }); await review(tab); };
  const save = async tab => { await tab.getByRole('button', { name: t.save, exact: true }).click(); await expect(tab).toHaveURL(savedUrl); };
  const compare = async () => { await page.getByRole('button', { name: t.compareCurrent, exact: true }).click(); await expect(page.getByRole('heading', { name: t.compareTitle, exact: true })).toBeFocused(); };
  try {
    await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
    for (const tab of [page, other]) {
      tab.on('pageerror', error => result.pageErrors.push(f.safe(error, secrets))); tab.on('dialog', dialog => dialog.accept());
      const requests = new Map();
      tab.on('request', request => { if (request.method() === 'POST' && request.headers()['next-action']) { const entry = { tab: tab === page ? 'primary' : 'other', startedAt: new Date().toISOString(), startedMs: Date.now(), state: 'pending' }; requests.set(request, entry); result.actionRequests.push(entry); } });
      tab.on('requestfinished', request => { const entry = requests.get(request); if (entry) { entry.state = 'finished'; entry.elapsedMs = Date.now() - entry.startedMs; } });
      tab.on('requestfailed', request => { const entry = requests.get(request); if (entry) { entry.state = 'failed'; entry.elapsedMs = Date.now() - entry.startedMs; entry.reason = request.failure()?.errorText; } });
    }
    const login = await context.request.post(base + '/api/auth/sign-in/email', { data: { email: actor.email, password }, headers: { Origin: base }, timeout: 180000 }); assert.equal(login.status(), 200);
    const signed = await login.json(); secrets.push(signed.token); sessionId = (await db.session.findUniqueOrThrow({ where: { token: signed.token } })).id;
    const start = Date.now(); await open(page); await open(other); result.twoEditorsReadyMs = Date.now() - start;
    const localNote = locale === 'fr' ? 'Conserver mes instructions de livraison.' : 'Keep my delivery instructions.';
    await page.getByLabel(t.notes, { exact: true }).fill(localNote); await other.getByLabel(t.shipping, { exact: true }).fill('175.25'); await save(other);
    await page.getByRole('button', { name: t.save, exact: true }).click(); await expect(page.getByRole('form', { name: t.title }).getByRole('alert')).toContainText(t.staleTitle); await expect(page.getByLabel(t.notes, { exact: true })).toHaveValue(localNote);
    assert.equal((await order()).notes, 'Original reviewed notes'); await compare(); await shot('independent-comparison');
    await page.getByRole('button', { name: t.applyComparison, exact: true }).click(); await expect(page.getByLabel(t.shipping, { exact: true })).toHaveValue('175.25'); await expect(page.getByLabel(t.notes, { exact: true })).toHaveValue(localNote); await save(page);
    assert.equal((await order()).notes, localNote); assert.equal((await order()).total.toFixed(2), '25175.25'); result.completed.push('Two tabs: stale rejection, keyboard comparison, independent changes merged and persisted');
    await open(page); await open(other);
    const mine = locale === 'fr' ? 'Mes conditions détaillées après comparaison avec les modifications du collègue.' : 'My detailed terms after comparing the colleague’s changes.';
    const theirs = locale === 'fr' ? 'Autres conditions enregistrées.' : 'Other saved terms.';
    await page.getByLabel(t.notes, { exact: true }).fill(mine); await other.getByLabel(t.notes, { exact: true }).fill(theirs); await save(other);
    await page.getByRole('button', { name: t.save, exact: true }).click(); await expect(page.getByRole('form', { name: t.title }).getByRole('alert')).toContainText(t.staleTitle); await compare();
    await expect(page.getByRole('button', { name: t.applyComparison, exact: true })).toBeDisabled();
    const choice = page.getByRole('combobox', { name: t.notes + ': ' + t.chooseResolution }); await choice.focus(); await page.keyboard.press('Enter'); await page.getByRole('option', { name: t.keepDraft, exact: true }).click();
    await expect(page.getByRole('button', { name: t.applyComparison, exact: true })).toBeEnabled(); await shot('overlap-choice');
    for (const size of [{ width: 1440, height: 1000 }, { width: 768, height: 1024 }, { width: 390, height: 844 }, { width: 320, height: 800 }]) {
      await page.setViewportSize(size); const layout = await page.getByRole('region', { name: t.compareTitle }).evaluate(el => ({ scrollWidth: el.scrollWidth, clientWidth: el.clientWidth, documentWidth: document.documentElement.scrollWidth, viewport: innerWidth })); result.layouts.push({ ...size, ...layout }); assert.ok(layout.scrollWidth <= layout.clientWidth + 1); assert.ok(layout.documentWidth <= layout.viewport + 1); if (size.width === 390) await shot('comparison-mobile');
    }
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; }); const resize = await page.getByRole('region', { name: t.compareTitle }).evaluate(el => ({ scrollWidth: el.scrollWidth, clientWidth: el.clientWidth, documentWidth: document.documentElement.scrollWidth, viewport: innerWidth })); result.layouts.push({ textResize: '200%', ...resize }); await shot('comparison-text-resize'); assert.ok(resize.scrollWidth <= resize.clientWidth + 1); assert.ok(resize.documentWidth <= resize.viewport + 1);
    await page.evaluate(() => { document.documentElement.style.fontSize = ''; }); await page.setViewportSize({ width: 1440, height: 1000 });
    await page.getByRole('button', { name: t.applyComparison, exact: true }).click(); await save(page); assert.equal((await order()).notes, mine); result.completed.push('Overlapping field requires explicit choice; desktop/tablet/mobile and 200% text reflow');
    await open(page); const recovered = locale === 'fr' ? 'Récupérer exactement cet enregistrement.' : 'Recover this exact save.'; await page.getByLabel(t.notes, { exact: true }).fill(recovered);
    let dropped = false;
    const dropResponse = async route => { const req = route.request(); if (!dropped && req.method() === 'POST' && req.headers()['next-action']) { dropped = true; await route.fetch({ timeout: 180000 }); await route.abort('failed'); } else await route.fallback(); };
    await page.route('**/*', dropResponse); await page.getByRole('button', { name: t.save, exact: true }).click(); await expect(page.getByRole('form', { name: t.title }).getByRole('alert')).toContainText(t.retryHelp); assert.ok(dropped); assert.equal((await order()).notes, recovered);
    const count = await audits(), state = f.hash(await order()); await shot('unknown-outcome');
    const stored = await page.evaluate(() => Object.entries(sessionStorage).filter(([key]) => key.startsWith('stoquify:purchase-order-draft:'))); assert.equal(stored.length, 1); const pending = JSON.parse(stored[0][1]).pending; assert.ok(pending.idempotencyKey); for (const secret of secrets) assert.ok(!stored[0][1].includes(secret)); assert.ok(!('sessionId' in pending)); assert.ok(!('sessionToken' in pending));
    await page.unroute('**/*', dropResponse); await page.reload({ waitUntil: 'networkidle', timeout: 180000 }); await expect(page.getByRole('button', { name: t.retrySave, exact: true })).toBeEnabled(); await expect(page.getByLabel(t.notes, { exact: true })).toHaveValue(recovered); await shot('reload-recovery');
    await page.getByRole('button', { name: t.retrySave, exact: true }).click(); await expect(page).toHaveURL(savedUrl); assert.equal(await audits(), count); assert.equal(f.hash(await order()), state); assert.equal(await page.evaluate(() => Object.keys(sessionStorage).filter(key => key.startsWith('stoquify:purchase-order-draft:')).length), 0); result.completed.push('Dropped response after commit: exact command retained across reload, recovered once, no duplicate audit or changes');
    await open(page); const deniedDraft = locale === 'fr' ? 'Brouillon conservé sans permission.' : 'Draft retained without permission.'; await page.getByLabel(t.notes, { exact: true }).fill(deniedDraft); await db.role.update({ where: { id: x.roleId }, data: { permissions: ['purchases.orders.read'] } });
    await page.getByRole('button', { name: t.save, exact: true }).click();
    const inlineDenied = page.getByRole('form', { name: t.title }).getByRole('alert').filter({ hasText: t.deniedTitle }), routeDenied = page.getByRole('heading').filter({ hasText: 'is not available for this role' });
    await expect(inlineDenied.or(routeDenied)).toBeVisible(); result.deniedPresentation = await inlineDenied.isVisible() ? 'inline' : 'server-route';
    const deniedStorage = await page.evaluate(() => Object.entries(sessionStorage).find(([key]) => key.startsWith('stoquify:purchase-order-draft:'))?.[1]); assert.equal(JSON.parse(deniedStorage).values.notes, deniedDraft);
    assert.equal(f.hash(await order()), state); await shot('authority-denied-retained');
    await db.role.update({ where: { id: x.roleId }, data: { permissions: ['purchases.orders.read', 'purchases.orders.update'] } }); await page.goto(url, { waitUntil: 'networkidle', timeout: 180000 });
    if (!await page.getByLabel(t.notes, { exact: true }).isVisible()) await review(page);
    await expect(page.getByLabel(t.notes, { exact: true })).toHaveValue(deniedDraft); assert.equal(f.hash(await order()), state); await shot('authority-restored-draft'); result.completed.push('Current role revocation denies save; tab draft survives inline or route denial and is restored after legitimate access returns');
    assert.deepEqual(result.pageErrors, []); result.passed = true;
  } catch (error) { result.error = f.safe(error, secrets); await shot('failed').catch(() => {}); }
  finally { await context.close(); if (sessionId) await db.session.deleteMany({ where: { id: sessionId, userId: x.actorId } }); await db.role.update({ where: { id: x.roleId }, data: { permissions: ['purchases.orders.read', 'purchases.orders.update'] } }); }
  return result;
}
(async () => {
  await f.local.withClient(f.target, f.local.assertOwned); report.originalBefore = await f.stable(); const browser = await chromium.launch({ headless: true });
  try { for (const locale of ['en', 'fr']) report.checks.push(await journey(browser, locale)); } finally { await browser.close(); }
})().catch(error => { report.error = f.safe(error, secrets); }).finally(async () => {
  report.originalUnchanged = report.originalBefore === await f.stable(); report.sourcesAfter = sources(); report.sourceStable = JSON.stringify(report.sourcesBefore) === JSON.stringify(report.sourcesAfter); await db.$disconnect(); report.completedAt = new Date().toISOString();
  const file = 'purchase-order-edit-browser-' + run + '.json'; fs.writeFileSync(path.join(__dirname, file), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ file, checks: report.checks.map(x => ({ locale: x.locale, passed: x.passed, completed: x.completed, error: x.error, screenshots: x.screenshots.length })), error: report.error, originalUnchanged: report.originalUnchanged, sourceStable: report.sourceStable }));
  process.exitCode = report.error || report.checks.length !== 2 || report.checks.some(c => !c.passed) || !report.originalUnchanged || !report.sourceStable ? 1 : 0;
});
