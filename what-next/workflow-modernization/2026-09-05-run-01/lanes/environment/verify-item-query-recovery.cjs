const helper = require('./registration-local.cjs'), originalTarget = helper.targetUrl;
helper.targetUrl = () => { const value = originalTarget(); value.searchParams.set('connection_limit', '2'); return value; };
const f = require('./statement-recipient-fixtures.cjs'), { db, fs, path, crypto, assert } = f;
const { hashPassword } = require(path.join(f.root, 'lib/password.ts'));
const { chromium, expect: baseExpect } = require('@playwright/test'), expect = baseExpect.configure({ timeout: 60000 });
const base = 'http://127.0.0.1:3111', stamp = crypto.randomUUID(), secrets = [];
const files = ['actions/itemsShow/getOrgItemsWithInventoryLevels.ts', 'services/item/item.service.ts', 'app/[locale]/(dashboard)/dashboard/inventory/items/page.tsx', 'app/[locale]/(dashboard)/dashboard/inventory/error.tsx', 'components/dashboard/DashboardErrorState.tsx', 'what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/item-query-fault-preload.cjs'];
const hashes = () => Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, file))).digest('hex')]));
const result = { at: new Date().toISOString(), sourceBefore: hashes(), browser: [] }; let browser, page, child, control; const { spawn } = require('node:child_process');
async function main() {
  await f.helper.withClient(f.target, f.helper.assertOwned);
  const org = await db.organization.create({ data: { name: f.helper.prefix + 'Item query ' + stamp, slug: 'item-query-' + stamp, currency: 'XAF', requestedModules: ['inventory'] } });
  const password = 'Owned-' + crypto.randomUUID() + '!', hashed = await hashPassword(password); secrets.push(password);
  const actor = await db.user.create({ data: { organizationId: org.id, email: 'item-query-' + stamp + '@example.invalid', password: hashed, isActive: true, isVerified: true, emailVerified: true } });
  await db.account.create({ data: { userId: actor.id, accountId: actor.id, providerId: 'credential', password: hashed } });
  const permissions = ['dashboard.read', 'inventory.items.read'];
  const role = await db.role.create({ data: { organizationId: org.id, code: 'finance', nameEn: 'Owned finance reader', permissions, users: { connect: { id: actor.id } } } });
  const item = await db.item.create({ data: { organizationId: org.id, nameEn: 'Owned recovery item', nameFr: 'Article de reprise', sku: 'RECOVERY-' + stamp, slug: 'recovery-' + stamp, imageUrls: [] } });
  const effects = async () => ({ item: await db.item.findUnique({ where: { id: item.id } }), transactions: await db.inventoryTransaction.count({ where: { organizationId: org.id } }) });
  control = path.join(__dirname, 'item-query-control-' + stamp + '.json');
  const setFault = enabled => { const value = JSON.stringify({ enabled, organizationId: org.id }); if (fs.existsSync(control)) { const fd = fs.openSync(control, 'r+'); try { fs.writeFileSync(fd, value); fs.ftruncateSync(fd, Buffer.byteLength(value)); } finally { fs.closeSync(fd); } } else fs.writeFileSync(control, value, { flag: 'wx' }); };
  const eventCount = () => fs.existsSync(control + '.events') ? fs.readFileSync(control + '.events', 'utf8').trim().split('\n').length : 0;
  setFault(false);
  const record = await f.helper.withClient(f.target, f.helper.assertOwned);
  const appTarget = new URL(f.target); appTarget.searchParams.set('connection_limit', '8');
  const env = { ...process.env, NODE_ENV: 'development', DATABASE_URL: appTarget.toString(), DIRECT_URL: appTarget.toString(), NEXTAUTH_URL: base, NEXT_PUBLIC_BASE_URL: base, NEXT_DIST_DIR: '.next-workflow-item-query', AUTH_SECRET: record.authSecret, NEXTAUTH_SECRET: record.authSecret, PUBLIC_IDENTITY_ABUSE_HASH_SECRET: record.authSecret, RESEND_API_KEY: '', RESEND_FROM_EMAIL: 'verification@example.invalid', OWNED_ITEM_FAULT_CONTROL: control, NODE_OPTIONS: '--require "' + path.join(__dirname, 'registration-network-fence.cjs') + '" --require "' + path.join(__dirname, 'item-query-fault-preload.cjs') + '"' };
  env.NODE_OPTIONS = '--require "' + path.join(__dirname, 'item-query-fault-preload.cjs').replaceAll('\\', '/') + '"';
  child = spawn(process.execPath, [path.join(__dirname, 'item-query-local.cjs')], { cwd: f.root, env, windowsHide: true, shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
  result.serverPid = child.pid;
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Owned server readiness timeout; inspect same live process')), 120000);
    child.stdout.on('data', bytes => { if (String(bytes).includes('Owned Item query-failure server ready')) { clearTimeout(timer); resolve(); } });
    child.stderr.on('data', bytes => { result.serverDiagnostics = f.safe(bytes.toString(), secrets); if (/EADDRINUSE/.test(String(bytes))) { clearTimeout(timer); reject(new Error('Owned fault-test port already occupied')); } });
    child.on('exit', code => { clearTimeout(timer); reject(new Error('Owned server exited ' + code)); });
  });
  console.log('Owned query-failure server ready');
  const before = JSON.stringify(await effects());
  browser = await chromium.launch({ headless: true });
  for (const locale of ['en', 'fr']) {
    const context = await browser.newContext({ viewport: { width: locale === 'fr' ? 320 : 1440, height: 1000 }, reducedMotion: 'reduce' });
    await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
    assert.equal((await context.request.post(base + '/api/auth/sign-in/email', { headers: { Origin: base }, data: { email: actor.email, password }, timeout: 180000 })).status(), 200);
    page = await context.newPage(); const row = { locale, errors: [], screenshots: [] }; result.browser.push(row);
    page.on('pageerror', error => row.errors.push(f.safe(error, secrets)));
    const target = base + '/' + locale + '/dashboard/inventory/items?q=' + item.sku;
    await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 180000 });
    const itemRow = page.getByText(item.sku, { exact: true }).first();
    await expect(itemRow).toBeVisible();
    const startEvents = eventCount(); setFault(true);
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 });
    const title = locale === 'en' ? 'Inventory could not load' : 'Impossible de charger l’inventaire';
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
    assert.ok(eventCount() > startEvents, 'Actual item query intercepted');
    await expect(itemRow).toHaveCount(0);
    const shot = 'item-query-' + stamp + '-' + locale + '-error.png';
    await page.screenshot({ path: path.join(__dirname, shot), animations: 'disabled', caret: 'initial' }); row.screenshots.push(shot);
    const alert = page.getByRole('alert').filter({ has: page.getByRole('heading', { name: title, exact: true }) });
    assert.equal((await alert.innerText()).includes('OWNED_ITEM_QUERY_UNAVAILABLE'), false);
    const retry = page.getByRole('button', { name: locale === 'en' ? 'Try again' : 'Réessayer', exact: true });
    const failedCount = eventCount(); await retry.focus(); await page.keyboard.press('Enter');
    await expect.poll(eventCount).toBeGreaterThan(failedCount);
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
    setFault(false); await retry.focus(); await page.keyboard.press('Enter');
    await expect(itemRow).toBeVisible();
    assert.equal(new URL(page.url()).searchParams.get('q'), item.sku);
    const recoveredShot = 'item-query-' + stamp + '-' + locale + '-recovered.png';
    await page.screenshot({ path: path.join(__dirname, recoveredShot), animations: 'disabled', caret: 'initial' }); row.screenshots.push(recoveredShot);
    row.failedQueryEvents = eventCount() - startEvents; row.failedRetryRemainsError = true; row.recoveredItemAndFilter = true;
    assert.equal(JSON.stringify(await effects()), before); await context.close(); console.log(locale + ': query failure, failed retry and recovered source view passed');
  }
  result.noBusinessMutations = true; result.passed = true;
}
main().catch(error => { result.passed = false; result.error = f.safe(error, secrets); process.exitCode = 1; }).finally(async () => {
  await browser?.close();
  if (control && fs.existsSync(control)) { const fd = fs.openSync(control, 'r+'); try { fs.writeFileSync(fd, '{"enabled":false}'); fs.ftruncateSync(fd, 17); } finally { fs.closeSync(fd); } }
  if (child && child.exitCode === null) { child.kill('SIGTERM'); await new Promise(resolve => { child.once('exit', resolve); setTimeout(resolve, 10000); }); result.testServerStopped = child.exitCode !== null || child.signalCode !== null; }
  result.sourceAfter = hashes(); result.sourceStable = JSON.stringify(result.sourceBefore) === JSON.stringify(result.sourceAfter);
  const output = path.join(__dirname, 'item-query-' + stamp + '.json'); fs.writeFileSync(output, JSON.stringify(result, null, 2), { flag: 'wx' });
  console.log(JSON.stringify({ output, passed: result.passed, error: result.error, sourceStable: result.sourceStable, testServerStopped: result.testServerStopped })); await db.$disconnect();
});
