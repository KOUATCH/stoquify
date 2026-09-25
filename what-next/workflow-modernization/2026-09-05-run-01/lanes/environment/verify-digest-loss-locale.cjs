// Bound this verifier's pool so it can coexist with the running owned app.
const helper = require('./registration-local.cjs'), originalTarget = helper.targetUrl;
helper.targetUrl = () => { const value = originalTarget(); value.searchParams.set('connection_limit', '2'); return value; };
const f = require('./statement-recipient-fixtures.cjs'), { db, fs, path, crypto, assert } = f;
const { hashPassword } = require(path.join(f.root, 'lib/password.ts'));
const { getDailyHabitDigestData } = require(path.join(f.root, 'services/daily-habit/daily-habit-digest.service.ts'));
const { getInventoryLossSnapshot } = require(path.join(f.root, 'services/snapshots/inventory-loss-snapshot.service.ts'));
const { chromium, expect: originalExpect } = require('@playwright/test'), expect = originalExpect.configure({ timeout: 60000 });
const base = 'http://127.0.0.1:3111', stamp = crypto.randomUUID(), secrets = [];
const files = ['services/daily-habit/daily-habit-signal-presentation.ts', 'services/daily-habit/daily-habit-digest.service.ts', 'services/daily-habit/daily-habit-digest-presentation.ts', 'services/snapshots/inventory-loss-snapshot.service.ts', 'services/inventory/inventory-loss-read.service.ts', 'lib/dashboard/snapshot-source-blocker-presentation.ts'];
files.push('components/bi/BIWhatChangedStrip.tsx');
const hashes = () => Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, file))).digest('hex')]));
const result = { at: new Date().toISOString(), sourceBefore: hashes(), browser: [] }; let browser, currentPage, child;
async function startApp() {
  const record = await f.helper.withClient(f.target, f.helper.assertOwned);
  const target = new URL(f.target); target.searchParams.set('connection_limit', '4');
  const env = { ...process.env, NODE_ENV: 'development', DATABASE_URL: target.toString(), DIRECT_URL: target.toString(), NEXTAUTH_URL: base, NEXT_PUBLIC_BASE_URL: base, NEXT_DIST_DIR: '.next-workflow-digest-query', AUTH_SECRET: record.authSecret, NEXTAUTH_SECRET: record.authSecret, PUBLIC_IDENTITY_ABUSE_HASH_SECRET: record.authSecret, RESEND_API_KEY: '', RESEND_FROM_EMAIL: 'verification@example.invalid', OWNED_DIGEST_FAULT_CONTROL: '', NODE_OPTIONS: '--require "' + path.join(__dirname, 'registration-network-fence.cjs').replaceAll('\\', '/') + '"' };
  child = require('node:child_process').spawn(process.execPath, [path.join(__dirname, 'digest-query-local.cjs')], { cwd: f.root, env, windowsHide: true, shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
  result.serverPid = child.pid;
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Owned app readiness timeout')), 120000);
    child.stdout.on('data', bytes => { if (String(bytes).includes('Owned Digest query-failure server ready')) { clearTimeout(timer); resolve(); } });
    child.stderr.on('data', bytes => { result.serverDiagnostics = f.safe(bytes.toString(), secrets); if (/EADDRINUSE/.test(String(bytes))) { clearTimeout(timer); reject(new Error('Port occupied')); } });
    child.on('exit', code => { clearTimeout(timer); reject(new Error('Owned app exited ' + code)); });
  });
  console.log('Separate owned app ready with four database connections');
}
async function main() {
  await f.helper.withClient(f.target, f.helper.assertOwned);
  await startApp();
  const org = await db.organization.create({ data: { name: f.helper.prefix + 'Loss Digest ' + stamp, slug: 'loss-digest-' + stamp, currency: 'XAF', requestedModules: ['inventory'] } });
  const password = 'Owned-' + crypto.randomUUID() + '!', hashed = await hashPassword(password); secrets.push(password);
  const actor = await db.user.create({ data: { organizationId: org.id, email: stamp + '@example.invalid', password: hashed, isActive: true, isVerified: true, emailVerified: true } });
  await db.account.create({ data: { userId: actor.id, accountId: actor.id, providerId: 'credential', password: hashed } });
  const permissions = ['dashboard.read', 'inventory.levels.read'];
  const role = await db.role.create({ data: { organizationId: org.id, code: 'admin', nameEn: 'Owned loss reader', permissions, users: { connect: { id: actor.id } } } });
  const location = await db.location.create({ data: { organizationId: org.id, name: 'Owned location', code: 'LOSS' } });
  const item = await db.item.create({ data: { organizationId: org.id, nameEn: 'Owned loss item', nameFr: 'Article de perte de test', sku: 'LOSS-' + stamp, slug: 'loss-' + stamp, imageUrls: [] } });
  const adjustment = await db.stockAdjustment.create({ data: { organizationId: org.id, locationId: location.id, createdById: actor.id, adjustmentNumber: 'LOSS-' + stamp, type: 'DAMAGED', status: 'COMPLETED', reason: 'Synthetic read fixture; no asserted approval', lines: { create: { itemId: item.id, systemQuantity: 4, actualQuantity: 3, adjustedQuantity: -1, unitCost: 45000, totalCost: -45000 } } } });
  const now = new Date();
  const source = await getInventoryLossSnapshot({ organizationId: org.id, now });
  assert.equal(source.metrics.totalLossValue, 45000); assert.equal(source.metrics.lossLineCount, 1);
  assert.equal(source.metrics.missingApprovalAttributionLineCount, 1);
  const effects = async () => JSON.stringify({ adjustment: await db.stockAdjustment.findUnique({ where: { id: adjustment.id }, include: { lines: true } }), journals: await db.journalEntry.count({ where: { organizationId: org.id } }), transactions: await db.inventoryTransaction.count({ where: { organizationId: org.id } }), events: await db.businessEvent.count({ where: { organizationId: org.id } }) });
  const before = await effects(); browser = await chromium.launch({ headless: true });
  for (const locale of ['en', 'fr']) {
    await db.role.update({ where: { id: role.id }, data: { permissions } });
    const data = await getDailyHabitDigestData({ locale, organizationId: org.id, actorId: actor.id, actorPermissions: permissions, actorRoleCodes: ['admin'], now });
    const digest = data.digests.find(d => d.id === 'owner-morning');
    const title = locale === 'en' ? 'Recorded inventory loss needs review' : 'Des pertes de stock enregistrées doivent être examinées';
    const observation = digest.changes.find(change => change.title === title); assert.ok(observation);
    assert.equal(observation.provenance.sourceHash, source.sourceHash);
    assert.ok(observation.detail.includes(locale === 'en' ? 'does not identify who caused the loss' : 'n’identifie pas la personne à l’origine de la perte'));
    assert.ok(digest.risks.some(risk => risk.title === title));
    const context = await browser.newContext({ viewport: { width: locale === 'fr' ? 320 : 1440, height: 1100 }, reducedMotion: 'reduce' });
    await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
    assert.equal((await context.request.post(base + '/api/auth/sign-in/email', { headers: { Origin: base }, data: { email: actor.email, password }, timeout: 60000 })).status(), 200);
    const page = await context.newPage(), row = { locale, errors: [], screenshots: [], sourceHash: source.sourceHash }; result.browser.push(row);
    currentPage = page;
    page.on('pageerror', error => row.errors.push(f.safe(error, secrets)));
    row.consoleErrors = [];
    page.on('console', message => { if (message.type() === 'error') row.consoleErrors.push(f.safe(message.text(), secrets)); });
    const target = base + '/' + locale + '/dashboard/daily-digest?digest=owner-morning&mode=brief';
    await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await Promise.race([page.getByText(title, { exact: true }).first().waitFor(), page.getByRole('heading', { name: locale === 'en' ? 'Daily Digest could not load' : 'Impossible de charger le digest quotidien', exact: true }).waitFor()]);
    assert.equal(await page.getByRole('heading', { name: locale === 'en' ? 'Daily Digest could not load' : 'Impossible de charger le digest quotidien', exact: true }).count(), 0, JSON.stringify(row.consoleErrors));
    await expect(page.getByText(title, { exact: true }).first()).toBeVisible();
    await expect(page.getByText(observation.detail, { exact: true }).first()).toBeVisible();
    const shot = 'digest-loss-' + stamp + '-' + locale + '-brief.png'; await page.screenshot({ path: path.join(__dirname, shot), fullPage: true, animations: 'disabled', caret: 'initial' }); row.screenshots.push(shot);
    const command = page.getByRole('button', { name: locale === 'en' ? 'Command' : 'Pilotage', exact: true }); await command.focus(); await page.keyboard.press('Enter');
    await expect(command).toHaveAttribute('aria-pressed', 'true');
    const region = page.getByRole('region', { name: locale === 'en' ? 'Actions and risks' : 'Actions et risques', exact: true });
    await expect(region.getByRole('heading', { name: title, exact: true })).toBeVisible();
    const reflow = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, viewport: innerWidth })); assert.ok(reflow.scroll <= reflow.viewport); row.reflow = reflow;
    const links = region.locator('a[href="/' + locale + '/dashboard/inventory/losses"]'); assert.ok(await links.count() > 0);
    const commandShot = 'digest-loss-' + stamp + '-' + locale + '-command.png'; await page.screenshot({ path: path.join(__dirname, commandShot), fullPage: true, animations: 'disabled', caret: 'initial' }); row.screenshots.push(commandShot);
    await db.role.update({ where: { id: role.id }, data: { permissions: ['dashboard.read'] } });
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 });
    await expect(page.getByText(title, { exact: true })).toHaveCount(0); await expect(page.locator('a[href="/' + locale + '/dashboard/inventory/losses"]')).toHaveCount(0); row.revokedLossHidden = true;
    assert.deepEqual(row.errors, []); await context.close();
    const after = await getInventoryLossSnapshot({ organizationId: org.id, now }); assert.equal(after.sourceHash, source.sourceHash); assert.deepEqual(after.metrics, source.metrics);
    console.log(locale + ': recorded-loss guidance, source identity and revoked privacy passed');
  }
  assert.equal(await effects(), before); result.noBusinessMutations = true; result.passed = true;
}
main().catch(async error => { result.passed = false; result.error = f.safe(error, secrets); process.exitCode = 1; if (currentPage && !currentPage.isClosed()) result.failureView = f.safe(await currentPage.locator('body').innerText().catch(() => 'Unavailable'), secrets); }).finally(async () => { await browser?.close(); if (child && child.exitCode === null) { child.kill('SIGTERM'); await new Promise(resolve => { child.once('exit', resolve); setTimeout(resolve, 10000); }); result.testServerStopped = child.exitCode !== null || child.signalCode !== null; } result.sourceAfter = hashes(); result.sourceStable = JSON.stringify(result.sourceBefore) === JSON.stringify(result.sourceAfter); const output = path.join(__dirname, 'digest-loss-' + stamp + '.json'); fs.writeFileSync(output, JSON.stringify(result, null, 2), { flag: 'wx' }); console.log(JSON.stringify({ output, passed: result.passed, error: result.error, sourceStable: result.sourceStable, failureView: result.failureView })); await db.$disconnect(); });
