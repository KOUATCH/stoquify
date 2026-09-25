const f = require('./statement-recipient-fixtures.cjs'), { db, fs, path, crypto, assert } = f;
const { hashPassword } = require(path.join(f.root, 'lib/password.ts'));
const { chromium, expect: baseExpect } = require('@playwright/test'), expect = baseExpect.configure({ timeout: 60000 });
const base = 'http://127.0.0.1:3110', stamp = crypto.randomUUID(), secrets = [];
const files = ['services/daily-habit/daily-habit-digest.service.ts', 'services/daily-habit/daily-habit-signal-presentation.ts', 'components/bi/BIWhatChangedStrip.tsx', 'components/daily-habit/DailyHabitDigestDashboard.tsx'];
const hashes = () => Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, file))).digest('hex')]));
const result = { at: new Date().toISOString(), sourceBefore: hashes(), browser: [] }; let browser;
async function main() {
  await f.helper.withClient(f.target, f.helper.assertOwned);
  const org = await db.organization.create({ data: { name: f.helper.prefix + 'Empty digest ' + stamp, slug: 'empty-digest-' + stamp, currency: 'XAF' } });
  const password = 'Owned-' + crypto.randomUUID() + '!', hashed = await hashPassword(password); secrets.push(password);
  const actor = await db.user.create({ data: { organizationId: org.id, email: 'empty-' + stamp + '@example.invalid', password: hashed, isActive: true, isVerified: true, emailVerified: true } });
  await db.account.create({ data: { userId: actor.id, accountId: actor.id, providerId: 'credential', password: hashed } });
  await db.role.create({ data: { organizationId: org.id, code: 'manager', nameEn: 'Owned manager', permissions: ['dashboard.read', 'purchases.orders.read'], users: { connect: { id: actor.id } } } });
  browser = await chromium.launch({ headless: true });
  for (const locale of ['en', 'fr']) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
    assert.equal((await context.request.post(base + '/api/auth/sign-in/email', { headers: { Origin: base }, data: { email: actor.email, password } })).status(), 200);
    const page = await context.newPage(), row = { locale, screenshots: [], errors: [] }; result.browser.push(row);
    page.on('pageerror', error => row.errors.push(f.safe(error, secrets)));
    await page.goto(base + `/${locale}/dashboard/daily-digest`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    const summary = page.getByRole('region', { name: locale === 'en' ? 'Summary and changes' : 'Synthèse et évolutions', exact: true });
    for (const width of [1440, 768, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      await expect(summary.getByText(locale === 'en' ? 'No visible observations' : 'Aucune observation visible', { exact: true })).toBeVisible();
      await expect(summary.getByText('0 observations', { exact: true })).toBeVisible();
      await expect(summary.getByText(locale === 'en' ? /does not confirm the absence of risk/ : /ne confirme pas l’absence de risque/)).toBeVisible();
      await summary.scrollIntoViewIfNeeded();
      const shot = `digest-empty-${stamp}-${locale}-${width}.png`; await page.screenshot({ path: path.join(__dirname, shot), caret: 'initial', animations: 'disabled' }); row.screenshots.push(shot);
      assert.equal(await summary.evaluate(el => el.scrollWidth > el.clientWidth + 1), false);
    }
    assert.deepEqual(row.errors, []); await context.close();
  }
  result.passed = true;
}
main().catch(error => { result.passed = false; result.error = f.safe(error, secrets); process.exitCode = 1; }).finally(async () => {
  if (browser) await browser.close(); result.sourceAfter = hashes(); result.sourceStable = JSON.stringify(result.sourceBefore) === JSON.stringify(result.sourceAfter);
  const output = path.join(__dirname, 'digest-empty-' + stamp + '.json'); fs.writeFileSync(output, JSON.stringify(result, null, 2), { flag: 'wx' }); console.log(JSON.stringify({ output, ...result })); await db.$disconnect();
});
