const f = require('./statement-recipient-fixtures.cjs'), { db, fs, path, crypto, assert } = f;
const { hashPassword } = require(path.join(f.root, 'lib/password.ts'));
const { chromium, expect: baseExpect } = require('@playwright/test'), expect = baseExpect.configure({ timeout: 60000 });
const base = 'http://127.0.0.1:3110', stamp = crypto.randomUUID(), secrets = [];
const files = ['services/snapshots/payment-truth-snapshot.service.ts', 'services/daily-habit/daily-habit-digest.service.ts', 'services/daily-habit/daily-habit-signal-presentation.ts', 'lib/dashboard/snapshot-blocker-presentation.ts'];
files.push('components/daily-habit/DailyHabitDigestDashboard.tsx');
const hashes = () => Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, file))).digest('hex')]));
const result = { at: new Date().toISOString(), sourceBefore: hashes(), browser: [] }; let browser, page;
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
  const before = JSON.stringify(await effects()); browser = await chromium.launch({ headless: true });
  for (const locale of ['en', 'fr']) {
    await db.role.update({ where: { id: role.id }, data: { permissions } });
    const context = await browser.newContext({ viewport: { width: locale === 'fr' ? 390 : 1440, height: 1100 }, reducedMotion: 'reduce' });
    await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
    assert.equal((await context.request.post(base + '/api/auth/sign-in/email', { headers: { Origin: base }, data: { email: actor.email, password } })).status(), 200);
    page = await context.newPage(); const row = { locale, errors: [], screenshots: [] }; result.browser.push(row);
    page.on('pageerror', error => row.errors.push(f.safe(error, secrets)));
    await page.goto(base + '/' + locale + '/dashboard/daily-digest', { waitUntil: 'domcontentloaded', timeout: 120000 });
    const command = page.getByRole('button', { name: locale === 'en' ? 'Command' : 'Pilotage', exact: true });
    await expect(command).toBeEnabled(); await command.focus(); await page.keyboard.press('Enter'); await expect(command).toHaveAttribute('aria-pressed', 'true');
    const title = locale === 'en' ? 'Suspense currencies cannot be combined' : 'Les suspens de devises différentes ne peuvent pas être additionnés';
    const condition = page.getByText(title, { exact: true }).first(); await expect(condition).toBeVisible(); await condition.click();
    await expect(page.getByText(/20.00 USD; 100.00 XAF/).first()).toBeVisible();
    const region = page.getByRole('region', { name: locale === 'en' ? 'Actions and risks' : 'Actions et risques', exact: true });
    await expect(region.getByRole('heading', { name: locale === 'en' ? 'Open Payment Suspense' : 'Suspens de paiement ouverts', exact: true })).toBeVisible();
    const shot = 'digest-payment-' + stamp + '-' + locale + '-source.png'; await condition.scrollIntoViewIfNeeded(); await page.screenshot({ path: path.join(__dirname, shot), caret: 'initial', animations: 'disabled' }); row.screenshots.push(shot);
    const target = '/' + locale + '/dashboard/finance/reconciliation';
    const link = region.locator('a[href="' + target + '"]').first(); await link.focus(); const started = Date.now(); await page.keyboard.press('Enter'); await page.waitForURL(base + target, { waitUntil: 'domcontentloaded', timeout: 120000 });
    const messages = require(path.join(f.root, 'messages', locale + '.json')).paymentReconciliationWorkbench;
    await expect(page.getByRole('heading', { name: messages.title, exact: true })).toBeVisible(); row.handoffMs = Date.now() - started;
    await page.goBack({ waitUntil: 'domcontentloaded', timeout: 120000 }); await expect(command).toBeEnabled();
    await db.role.update({ where: { id: role.id }, data: { permissions: ['dashboard.read', 'finance.read'] } });
    // Follow the link from the previously rendered digest after revocation;
    // cached client navigation must not establish destination authority.
    await expect(command).toHaveAttribute('aria-pressed', 'true');
    await link.focus(); await page.keyboard.press('Enter');
    await page.waitForURL(base + target, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await expect(page.getByRole('heading', { name: locale === 'en' ? 'Payment reconciliation is not available for this role' : 'Le rapprochement des paiements n’est pas accessible à ce rôle', exact: true })).toBeVisible(); row.revocationDenied = true;
    assert.deepEqual(row.errors, []); await context.close();
  }
  assert.equal(JSON.stringify(await effects()), before); result.noBusinessMutations = true; result.passed = true;
}
main().catch(async error => { result.passed = false; result.error = f.safe(error, secrets); process.exitCode = 1;
  if (page && !page.isClosed()) result.failureState = await page.locator('main').last().innerText({ timeout: 5000 }).then(text => f.safe(text, secrets)).catch(() => 'Unavailable');
}).finally(async () => {
  if (browser) await browser.close(); result.sourceAfter = hashes(); result.sourceStable = JSON.stringify(result.sourceBefore) === JSON.stringify(result.sourceAfter);
  const output = path.join(__dirname, 'digest-payment-' + stamp + '.json'); fs.writeFileSync(output, JSON.stringify(result, null, 2), { flag: 'wx' }); console.log(JSON.stringify({ output, ...result })); await db.$disconnect();
});
