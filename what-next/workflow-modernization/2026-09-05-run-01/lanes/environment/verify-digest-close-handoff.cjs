const f = require('./statement-recipient-fixtures.cjs'), { db, fs, path, crypto, assert } = f;
const { hashPassword } = require(path.join(f.root, 'lib/password.ts'));
const { chromium, expect: baseExpect } = require('@playwright/test'), expect = baseExpect.configure({ timeout: 60000 });
const base = 'http://127.0.0.1:3110', stamp = crypto.randomUUID(), secrets = [], baseline = process.argv.includes('--baseline');
const files = ['services/signals/business-signal-rules.service.ts', 'services/daily-habit/daily-habit-signal-presentation.ts', 'services/daily-habit/daily-habit-digest-presentation.ts', 'lib/dashboard/snapshot-blocker-presentation.ts', 'app/[locale]/(dashboard)/dashboard/accounting/accounting-route-access.tsx', 'components/accounting/CloseAssuranceCenter.tsx'];
files.push('components/accounting/CloseReadinessJourneyPanel.tsx');
const hashes = () => Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, file))).digest('hex')]));
const result = { at: new Date().toISOString(), baseline, sourceBefore: hashes(), browser: [] }; let browser, page;
async function main() {
  await f.helper.withClient(f.target, f.helper.assertOwned);
  const org = await db.organization.create({ data: { name: f.helper.prefix + 'Close handoff ' + stamp, slug: 'close-handoff-' + stamp, currency: 'XAF' } });
  const password = 'Owned-' + crypto.randomUUID() + '!', hashed = await hashPassword(password); secrets.push(password);
  const actor = await db.user.create({ data: { organizationId: org.id, email: 'close-handoff-' + stamp + '@example.invalid', password: hashed, isActive: true, isVerified: true, emailVerified: true } });
  await db.account.create({ data: { userId: actor.id, accountId: actor.id, providerId: 'credential', password: hashed } });
  const permissions = ['dashboard.read', 'accounting.close.read'];
  const role = await db.role.create({ data: { organizationId: org.id, code: 'accountant', nameEn: 'Owned accountant', permissions, users: { connect: { id: actor.id } } } });
  const today = new Date(), startDate = new Date(today.getTime() - 86400000), endDate = new Date(today.getTime() + 86400000);
  const year = await db.fiscalYear.create({ data: { organizationId: org.id, name: 'Owned test year', startDate, endDate } });
  const period = await db.accountingPeriod.create({ data: { organizationId: org.id, fiscalYearId: year.id, periodNumber: 1, name: 'Owned close handoff period', startDate, endDate } });
  const run = await db.closeRun.create({ data: { organizationId: org.id, periodId: period.id, status: 'BLOCKED', readinessScore: 42 } });
  const effects = async () => ({ journals: await db.journalEntry.count({ where: { organizationId: org.id } }), payments: await db.payment.count({ where: { organizationId: org.id } }), events: await db.businessEvent.count({ where: { organizationId: org.id } }), runs: await db.closeRun.count({ where: { organizationId: org.id } }), exports: await db.closePackExport.count({ where: { organizationId: org.id } }) });
  const before = await effects();
  browser = await chromium.launch({ headless: true });
  for (const locale of baseline ? ['en'] : ['en', 'fr']) {
    await db.role.update({ where: { id: role.id }, data: { permissions } });
    const context = await browser.newContext({ viewport: { width: locale === 'fr' ? 390 : 1440, height: 1000 }, reducedMotion: 'reduce' });
    await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
    assert.equal((await context.request.post(base + '/api/auth/sign-in/email', { headers: { Origin: base }, data: { email: actor.email, password } })).status(), 200);
    page = await context.newPage(); const row = { locale, errors: [], screenshots: [] }; result.browser.push(row);
    page.on('pageerror', error => row.errors.push(f.safe(error, secrets)));
    await page.goto(base + '/' + locale + '/dashboard/daily-digest', { waitUntil: 'domcontentloaded', timeout: 120000 });
    const command = page.getByRole('button', { name: locale === 'en' ? 'Command' : 'Pilotage', exact: true });
    await expect(command).toBeEnabled(); await command.focus(); await page.keyboard.press('Enter'); await expect(command).toHaveAttribute('aria-pressed', 'true');
    const region = page.getByRole('region', { name: locale === 'en' ? 'Actions and risks' : 'Actions et risques', exact: true });
    if (!baseline && locale === 'fr') {
      await expect(region.getByRole('heading', { name: 'Blocage de clôture', exact: true })).toBeVisible();
      await expect(region.getByText('Clôtures bloquées', { exact: true })).toBeVisible();
    }
    const target = '/' + locale + '/dashboard/accounting/' + (baseline ? 'close-assurance' : 'close');
    const link = region.locator('a[href="' + target + '"]').first(); await expect(link).toBeVisible();
    const beforeShot = 'digest-close-' + stamp + '-' + locale + '-source.png'; await link.scrollIntoViewIfNeeded(); await page.screenshot({ path: path.join(__dirname, beforeShot), caret: 'initial', animations: 'disabled' }); row.screenshots.push(beforeShot);
    await link.focus(); const started = Date.now(); await page.keyboard.press('Enter'); await page.waitForURL(base + target, { waitUntil: 'domcontentloaded', timeout: 120000 });
    if (baseline) {
      const response = await context.request.get(base + target); assert.equal(response.status(), 404); row.brokenDestinationStatus = response.status();
    } else {
      await expect(page.getByRole('heading', { name: locale === 'en' ? 'Close & Assurance Center' : 'Centre De Cloture', exact: true })).toBeVisible();
      await expect(page.getByText(period.name, { exact: false }).first()).toBeVisible();
      row.handoffMs = Date.now() - started;
      await expect(page.getByText(locale === 'en' ? 'Some actions are unavailable with your current permissions. An administrator can review your access.' : 'Certaines actions ne sont pas disponibles avec vos autorisations actuelles. Un administrateur peut vérifier votre accès.', { exact: true })).toBeVisible();
      for (const name of locale === 'en' ? ['Run assessment', 'Export draft JSON', 'Export certified JSON', 'Save review'] : ["Lancer l'evaluation", 'Exporter JSON brouillon', 'Exporter JSON certifie', 'Enregistrer la revue']) {
        await expect(page.getByRole('button', { name, exact: true })).toBeDisabled();
      }
      row.readOnlyControlsDisabled = true;
      await expect(page.getByText('BLOCKED', { exact: true }).first()).toHaveClass(/text-\[var\(--dash-danger\)\]/);
      row.blockedStatusUsesDanger = true;
      const openShot = 'digest-close-' + stamp + '-' + locale + '-authorized.png'; await page.screenshot({ path: path.join(__dirname, openShot), caret: 'initial', animations: 'disabled' }); row.screenshots.push(openShot);
      await page.goBack({ waitUntil: 'domcontentloaded', timeout: 120000 }); await expect(command).toBeEnabled();
      await db.role.update({ where: { id: role.id }, data: { permissions: ['dashboard.read'] } });
      await page.goto(base + target, { waitUntil: 'domcontentloaded', timeout: 120000 });
      await expect(page.getByRole('heading', { name: locale === 'en' ? 'Close center is not available for this role' : 'Accès à la comptabilité refusé', exact: true })).toBeVisible();
      await expect(page.getByText(period.name, { exact: false })).toHaveCount(0); row.revocationDenied = true;
    }
    const shot = 'digest-close-' + stamp + '-' + locale + '-destination.png'; await page.screenshot({ path: path.join(__dirname, shot), caret: 'initial', animations: 'disabled' }); row.screenshots.push(shot);
    assert.deepEqual(row.errors, []); await context.close();
  }
  assert.deepEqual(await effects(), before); assert.equal((await db.closeRun.findUniqueOrThrow({ where: { id: run.id } })).status, 'BLOCKED'); result.noBusinessMutations = true; result.passed = true;
}
main().catch(async error => { result.passed = false; result.error = f.safe(error, secrets); process.exitCode = 1;
  if (page && !page.isClosed()) result.failureState = await page.locator('main').last().innerText({ timeout: 5000 }).then(text => f.safe(text, secrets)).catch(() => 'Unavailable');
}).finally(async () => {
  if (browser) await browser.close(); result.sourceAfter = hashes(); result.sourceStable = JSON.stringify(result.sourceBefore) === JSON.stringify(result.sourceAfter);
  const output = path.join(__dirname, 'digest-close-' + stamp + '.json'); fs.writeFileSync(output, JSON.stringify(result, null, 2), { flag: 'wx' }); console.log(JSON.stringify({ output, passed: result.passed, error: result.error, browser: result.browser, failureState: result.failureState })); await db.$disconnect();
});
