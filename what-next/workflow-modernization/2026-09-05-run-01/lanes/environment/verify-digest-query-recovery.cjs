const f = require('./statement-recipient-fixtures.cjs'), { db, fs, path, crypto, assert } = f;
const { hashPassword } = require(path.join(f.root, 'lib/password.ts'));
const { chromium, expect: baseExpect } = require('@playwright/test'), expect = baseExpect.configure({ timeout: 60000 });
const base = 'http://127.0.0.1:3111', stamp = crypto.randomUUID(), secrets = [];
const files = ['services/snapshots/payment-truth-snapshot.service.ts', 'services/daily-habit/daily-habit-digest.service.ts', 'services/daily-habit/daily-habit-signal-presentation.ts', 'lib/dashboard/snapshot-blocker-presentation.ts'];
files.push('components/daily-habit/DailyHabitDigestDashboard.tsx');
files.push('components/bi/BIEvidenceBadgeRow.tsx', 'lib/dashboard/bi-presentation.ts', 'services/snapshots/snapshot-utils.ts');
files.push('app/[locale]/(dashboard)/dashboard/daily-digest/error.tsx', 'app/[locale]/(dashboard)/dashboard/daily-digest/page.tsx', 'components/dashboard/DashboardErrorState.tsx', 'prisma/db.ts', 'what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/digest-query-fault-preload.cjs');
const hashes = () => Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, file))).digest('hex')]));
const result = { at: new Date().toISOString(), sourceBefore: hashes(), browser: [] }; let browser, page, child, control; const { spawn } = require('node:child_process');
async function main() {
  await f.helper.withClient(f.target, f.helper.assertOwned);
  const org = await db.organization.create({ data: { name: f.helper.prefix + 'Payment digest ' + stamp, slug: 'payment-digest-' + stamp, currency: 'XAF', requestedModules: ['purchasing', 'finance', 'accounting', 'payment_reconciliation'] } });
  const password = 'Owned-' + crypto.randomUUID() + '!', hashed = await hashPassword(password); secrets.push(password);
  const actor = await db.user.create({ data: { organizationId: org.id, email: 'payment-digest-' + stamp + '@example.invalid', password: hashed, isActive: true, isVerified: true, emailVerified: true } });
  await db.account.create({ data: { userId: actor.id, accountId: actor.id, providerId: 'credential', password: hashed } });
  const permissions = ['dashboard.read', 'finance.read', 'payments.reconciliation.read'];
  const role = await db.role.create({ data: { organizationId: org.id, code: 'finance', nameEn: 'Owned finance reader', permissions, users: { connect: { id: actor.id } } } });
  await db.suspenseItem.create({ data: { organizationId: org.id, type: 'OTHER', amount: '100.00', currencyCode: 'XAF' } });
  await db.suspenseItem.create({ data: { organizationId: org.id, type: 'OTHER', amount: '20.00', currencyCode: 'USD' } });
  const effects = async () => ({ journals: await db.journalEntry.count({ where: { organizationId: org.id } }), payments: await db.payment.count({ where: { organizationId: org.id } }), events: await db.businessEvent.count({ where: { organizationId: org.id } }), suspense: await db.suspenseItem.findMany({ where: { organizationId: org.id }, orderBy: { id: 'asc' }, select: { id: true, status: true, amount: true, currencyCode: true } }) });


  control = path.join(__dirname, 'digest-query-control-' + stamp + '.json');
  const setFault = enabled => { const value = JSON.stringify({ enabled, organizationId: org.id }); if (fs.existsSync(control)) { const fd = fs.openSync(control, 'r+'); try { fs.writeFileSync(fd, value); fs.ftruncateSync(fd, Buffer.byteLength(value)); } finally { fs.closeSync(fd); } } else fs.writeFileSync(control, value, { flag: 'wx' }); };
  const eventCount = () => fs.existsSync(control + '.events') ? fs.readFileSync(control + '.events', 'utf8').trim().split('\n').length : 0;
  setFault(false);
  const record = await f.helper.withClient(f.target, f.helper.assertOwned);
  const env = { ...process.env, NODE_ENV: 'development', DATABASE_URL: f.target.toString(), DIRECT_URL: f.target.toString(), NEXTAUTH_URL: base, NEXT_PUBLIC_BASE_URL: base, NEXT_DIST_DIR: '.next-workflow-digest-query', AUTH_SECRET: record.authSecret, NEXTAUTH_SECRET: record.authSecret, PUBLIC_IDENTITY_ABUSE_HASH_SECRET: record.authSecret, RESEND_API_KEY: '', RESEND_FROM_EMAIL: 'verification@example.invalid', OWNED_DIGEST_FAULT_CONTROL: control, NODE_OPTIONS: '--require "' + path.join(__dirname, 'registration-network-fence.cjs') + '" --require "' + path.join(__dirname, 'digest-query-fault-preload.cjs') + '"' };
  env.NODE_OPTIONS = '--require "' + path.join(__dirname, 'digest-query-fault-preload.cjs').replaceAll('\\', '/') + '"';
  child = spawn(process.execPath, [path.join(__dirname, 'digest-query-local.cjs')], { cwd: f.root, env, windowsHide: true, shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
  result.serverPid = child.pid;
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Owned server readiness timeout; inspect same live process')), 120000);
    child.stdout.on('data', bytes => { if (String(bytes).includes('Owned Digest query-failure server ready')) { clearTimeout(timer); resolve(); } });
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
    const target = base + '/' + locale + '/dashboard/daily-digest?digest=finance-cash&mode=investigate';
    await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 180000 });
    const mode = page.getByRole('button', { name: locale === 'en' ? 'Investigate' : 'Examiner', exact: true });
    await expect(mode).toHaveAttribute('aria-pressed', 'true');
    const sourceText = await page.locator('main').last().innerText();
    assert.ok(sourceText.includes(locale === 'en' ? 'Suspense currencies cannot be combined' : 'devises'), 'Real mixed-currency limitation visible before failure');
    const startEvents = eventCount(); setFault(true);
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 });
    const title = locale === 'en' ? 'Daily Digest could not load' : 'Impossible de charger le digest quotidien';
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
    assert.ok(eventCount() > startEvents, 'Actual app query intercepted');
    await expect(mode).toHaveCount(0);
    const shot = 'digest-query-' + stamp + '-' + locale + '-error.png';
    await page.screenshot({ path: path.join(__dirname, shot), animations: 'disabled', caret: 'initial' }); row.screenshots.push(shot);
    const alert = page.getByRole('alert').filter({ has: page.getByRole('heading', { name: title, exact: true }) });
    assert.equal((await alert.innerText()).includes('OWNED_DIGEST_QUERY_UNAVAILABLE'), false, 'No internal error in visible recovery copy');
    const retry = page.getByRole('button', { name: locale === 'en' ? 'Retry' : 'Réessayer', exact: true });
    // A retry while the dependency remains down must not invent a successful empty view.
    const failedCount = eventCount(); await retry.focus(); await page.keyboard.press('Enter');
    await expect.poll(eventCount).toBeGreaterThan(failedCount);
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
    setFault(false); await retry.focus(); await page.keyboard.press('Enter');
    await expect(mode).toHaveAttribute('aria-pressed', 'true');
    assert.equal(new URL(page.url()).searchParams.get('digest'), 'finance-cash');
    const recovered = await page.locator('main').last().innerText();
    assert.ok(recovered.includes(locale === 'en' ? 'Suspense currencies cannot be combined' : 'devises'), 'Recovery preserves actual blocker');
    const recoveredShot = 'digest-query-' + stamp + '-' + locale + '-recovered.png';
    await page.screenshot({ path: path.join(__dirname, recoveredShot), animations: 'disabled', caret: 'initial' }); row.screenshots.push(recoveredShot);
    row.failedQueryEvents = eventCount() - startEvents; row.failedRetryRemainsError = true; row.recoveredViewAndBlockers = true;
    assert.equal(JSON.stringify(await effects()), before); await context.close(); console.log(locale + ': query failure, failed retry and recovered source view passed');
  }
  result.noBusinessMutations = true; result.passed = true;
}
main().catch(error => { result.passed = false; result.error = f.safe(error, secrets); process.exitCode = 1; }).finally(async () => {
  await browser?.close();
  if (control && fs.existsSync(control)) { const fd = fs.openSync(control, 'r+'); try { fs.writeFileSync(fd, '{"enabled":false}'); fs.ftruncateSync(fd, 17); } finally { fs.closeSync(fd); } }
  if (child && child.exitCode === null) { child.kill('SIGTERM'); await new Promise(resolve => { child.once('exit', resolve); setTimeout(resolve, 10000); }); result.testServerStopped = child.exitCode !== null || child.signalCode !== null; }
  result.sourceAfter = hashes(); result.sourceStable = JSON.stringify(result.sourceBefore) === JSON.stringify(result.sourceAfter);
  const output = path.join(__dirname, 'digest-query-' + stamp + '.json'); fs.writeFileSync(output, JSON.stringify(result, null, 2), { flag: 'wx' });
  console.log(JSON.stringify({ output, passed: result.passed, error: result.error, sourceStable: result.sourceStable, testServerStopped: result.testServerStopped })); await db.$disconnect();
});
