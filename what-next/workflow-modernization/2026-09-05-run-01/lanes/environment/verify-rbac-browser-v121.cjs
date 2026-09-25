const f = require('./statement-recipient-fixtures.cjs'), { db, fs, path, crypto, assert } = f;
const { chromium, expect: baseExpect } = require('@playwright/test'), expect = baseExpect.configure({ timeout: 60000 });
const { hashPassword } = require(path.join(f.root, 'lib/password.ts'));
const base = 'http://127.0.0.1:3110', stamp = crypto.randomUUID(), secrets = [];
const organizationId = 'workflow_run_discovery_bac23aa2-f708-4f23-be93-4ecb6b36125a';
const files = ['lib/security/rbac.ts', 'lib/security/auth-session.ts', 'app/api/me/permissions/route.ts'];
const sources = () => Object.fromEntries(files.map(p => [p, crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, p))).digest('hex')]));
const report = { at: new Date().toISOString(), sourcesBefore: sources(), browser: [], checks: [], scope: 'Owned PostgreSQL fixture and real local credential login/current permission endpoint. No synthetic session in this browser test; no financial operations.' };
let browser;
async function main() {
  await f.helper.withClient(f.target, f.helper.assertOwned);
  assert.ok((await db.organization.findUniqueOrThrow({ where: { id: organizationId } })).name.startsWith(f.helper.prefix));
  const password = 'Owned-identity-' + crypto.randomUUID() + '!'; secrets.push(password);
  const passwordHash = await hashPassword(password);
  const user = await db.user.create({ data: { organizationId, name: 'Owned identity regression', email: stamp + '@example.invalid', password: passwordHash, isActive: true, isVerified: true, emailVerified: true } });
  const role = await db.role.findFirstOrThrow({ where: { organizationId, code: 'administrator' } });
  await db.role.update({ where: { id: role.id }, data: { users: { connect: { id: user.id } } } });
  await db.account.create({ data: { userId: user.id, accountId: user.id, providerId: 'credential', password: passwordHash } });
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  try {
    await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
    assert.equal((await context.request.post(base + '/api/auth/sign-in/email', { data: { email: user.email, password }, headers: { Origin: base }, timeout: 180000 })).status(), 200);
    async function permissions() { return context.request.get(base + '/api/me/permissions', { timeout: 60000 }); }
    let response = await permissions(); assert.equal(response.status(), 200); assert.equal((await response.json()).userId, user.id);
    assert.ok(response.headers()['cache-control'].includes('no-store'));
    await db.user.update({ where: { id: user.id }, data: { email: 'changed-' + user.email } });
    response = await permissions(); assert.equal(response.status(), 200); assert.equal((await response.json()).userId, user.id);
    report.checks.push('Real session keeps immutable identity after email update');
    for (const locale of ['en', 'fr']) {
      const page = await context.newPage(), started = Date.now(), sample = { locale, pageErrors: [], screenshots: [] }; report.browser.push(sample);
      page.on('pageerror', error => sample.pageErrors.push(f.safe(error, secrets)));
      page.setDefaultTimeout(60000); page.setDefaultNavigationTimeout(180000);
      await page.goto(base + '/' + locale + '/dashboard/finance/reconciliation');
      const copy = require(path.join(f.root, 'messages', locale + '.json')).paymentReconciliationWorkbench.runPreparation;
      await expect(page.getByRole('button', { name: copy.open, exact: true })).toBeEnabled(); sample.readyMs = Date.now() - started;
      await page.setViewportSize({ width: locale === 'en' ? 1440 : 320, height: 1000 });
      await page.getByRole('button', { name: copy.open, exact: true }).click();
      const list = page.getByRole('region', { name: copy.title, exact: true });
      await expect(list.getByRole('button', { name: copy.next, exact: true })).toBeEnabled();
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await list.scrollIntoViewIfNeeded();
      const screenshot = 'rbac-browser-v121-' + locale + '-' + stamp + '.png';
      await page.screenshot({ path: path.join(__dirname, screenshot), animations: 'disabled' }); sample.screenshots.push(screenshot);
      assert.equal(sample.pageErrors.length, 0); await page.close();
    }
    await db.user.update({ where: { id: user.id }, data: { isActive: false } });
    response = await permissions(); assert.equal(response.status(), 401); assert.equal((await response.json()).error, 'UNAUTHENTICATED');
    report.checks.push('Real existing session is denied after owned subject deactivation');
    report.passed = true;
  } finally { await context.close(); }
}
main().catch(error => { report.error = f.safe(error, secrets); process.exitCode = 1; }).finally(async () => {
  report.sourcesAfter = sources(); report.sourceStable = JSON.stringify(report.sourcesBefore) === JSON.stringify(report.sourcesAfter);
  const file = path.join(__dirname, 'rbac-browser-v121-' + stamp + '.json');
  console.log(JSON.stringify({ file, ...report }));
  try { fs.writeFileSync(file, JSON.stringify(report, null, 2), { flag: 'wx' }); } finally { await browser?.close(); await db.$disconnect(); }
});
