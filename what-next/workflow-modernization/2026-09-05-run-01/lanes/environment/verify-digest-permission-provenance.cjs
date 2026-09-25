const f = require('./statement-recipient-fixtures.cjs'), { db, fs, path, crypto, assert } = f;
const { hashPassword } = require(path.join(f.root, 'lib/password.ts'));
const { hasRbacPermission } = require(path.join(f.root, 'lib/security/rbac-permissions.ts'));
const { chromium, expect: baseExpect } = require('@playwright/test'), expect = baseExpect.configure({ timeout: 60000 });
const base = 'http://127.0.0.1:3110', stamp = crypto.randomUUID(), secrets = [], baseline = process.argv.includes('--baseline');
const apiOnly = process.argv.includes('--api-only');
const files = ['lib/security/rbac-permissions.ts', 'lib/security/rbac.ts', 'services/daily-habit/daily-habit-digest.service.ts'];
const hashes = () => Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, file))).digest('hex')]));
const result = { at: new Date().toISOString(), baseline, apiOnly, sourceBefore: hashes(), browser: [] }; let browser;
async function main() {
  await f.helper.withClient(f.target, f.helper.assertOwned);
  const org = await db.organization.create({ data: { name: f.helper.prefix + 'Permission provenance ' + stamp, slug: 'permission-provenance-' + stamp, currency: 'XAF' } });
  const password = 'Owned-' + crypto.randomUUID() + '!', hashed = await hashPassword(password); secrets.push(password);
  const actor = await db.user.create({ data: { organizationId: org.id, email: 'permission-provenance-' + stamp + '@example.invalid', password: hashed, isActive: true, isVerified: true, emailVerified: true } });
  await db.account.create({ data: { userId: actor.id, accountId: actor.id, providerId: 'credential', password: hashed } });
  const initial = ['dashboard.read', 'payments.reconciliation.read'];
  const role = await db.role.create({ data: { organizationId: org.id, code: 'owner', nameEn: 'Owned owner', permissions: initial, users: { connect: { id: actor.id } } } });
  const effects = async () => ({ journals: await db.journalEntry.count({ where: { organizationId: org.id } }), payments: await db.payment.count({ where: { organizationId: org.id } }), events: await db.businessEvent.count({ where: { organizationId: org.id } }) });
  const before = await effects();
  browser = await chromium.launch({ headless: true });
  for (const locale of baseline || apiOnly ? ['en'] : ['en', 'fr']) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
    assert.equal((await context.request.post(base + '/api/auth/sign-in/email', { headers: { Origin: base }, data: { email: actor.email, password } })).status(), 200);
    const page = await context.newPage(), row = { locale, states: [], errors: [] }; result.browser.push(row);
    page.on('pageerror', error => row.errors.push(f.safe(error, secrets)));
    const checks = baseline ? [['narrow-before-fix', initial, true, true]] : [
      ['narrow', initial, false, false],
      ['explicit-finance', [...initial, 'finance.read'], true, false],
      ['explicit-close', [...initial, 'finance.read', 'accounting.close.read'], true, true],
      ['revoked-close', [...initial, 'finance.read'], true, false],
      ['stored-legacy', ['dashboard.read', 'VIEW_FINANCIAL_AUDIT_TRAIL'], false, true],
      ['revoked-all-source', ['dashboard.read'], false, false],
    ];
    for (const [name, permissions, finance, close] of checks) {
      await db.role.update({ where: { id: role.id }, data: { permissions } });
      if (!baseline) {
        const response = await context.request.get(base + '/api/me/permissions');
        assert.equal(response.status(), 200);
        assert.match(response.headers()['cache-control'], /no-store/);
        const claims = await response.json();
        assert.equal(claims.organizationId, org.id); assert.equal(claims.userId, actor.id);
        assert.equal(hasRbacPermission(claims.permissions, 'finance.read'), finance);
        assert.equal(hasRbacPermission(claims.permissions, 'accounting.close.read'), close);
        if (name !== 'stored-legacy') assert.deepEqual([...claims.permissions].sort(), [...permissions].sort());
        else assert.deepEqual(claims.permissions.filter(value => !value.includes('.')), ['VIEW_FINANCIAL_AUDIT_TRAIL']);
        if (apiOnly) { row.states.push({ name, finance, close, permissionApi: true, passed: true }); continue; }
      }
      await page.goto(base + '/' + locale + '/dashboard/daily-digest', { waitUntil: 'domcontentloaded', timeout: 120000 });
      const main = page.locator('main').last();
      await expect(main.getByRole('button', { name: locale === 'en' ? 'Owner' : 'Dirigeant', exact: true })).toBeEnabled();
      await expect(main.getByRole('button', { name: 'Finance', exact: true })).toHaveCount(finance ? 1 : 0);
      const accountant = main.getByRole('button', { name: locale === 'en' ? 'Accountant' : 'Comptable', exact: true });
      await expect(accountant).toHaveCount(close ? 1 : 0);
      if (close) { await accountant.focus(); await page.keyboard.press('Enter'); await expect(accountant).toHaveAttribute('aria-pressed', 'true'); }
      row.states.push({ name, finance, close, passed: true });
    }
    if (!apiOnly) {
      const shot = 'digest-permission-provenance-' + stamp + '-' + locale + '.png';
      await page.screenshot({ path: path.join(__dirname, shot), caret: 'initial', animations: 'disabled' }); row.screenshot = shot;
    }
    assert.deepEqual(row.errors, []); await context.close();
  }
  assert.deepEqual(await effects(), before); result.noFinancialEffects = true; result.passed = true;
}
main().catch(error => { result.passed = false; result.error = f.safe(error, secrets); process.exitCode = 1; }).finally(async () => {
  if (browser) await browser.close(); result.sourceAfter = hashes(); result.sourceStable = JSON.stringify(result.sourceBefore) === JSON.stringify(result.sourceAfter);
  const output = path.join(__dirname, 'digest-permission-provenance-' + stamp + '.json'); fs.writeFileSync(output, JSON.stringify(result, null, 2), { flag: 'wx' }); console.log(JSON.stringify({ output, ...result })); await db.$disconnect();
});
