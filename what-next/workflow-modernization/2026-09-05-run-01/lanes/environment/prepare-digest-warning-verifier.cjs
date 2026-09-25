const fs = require('node:fs'), path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, 'verify-digest-payroll-privacy.cjs'), 'utf8');
let head = source.slice(0, source.indexOf("  for (const locale of ['en', 'fr'])"));
head = head.replace("requestedModules: ['inventory', 'payroll']", "requestedModules: ['inventory', 'payroll', 'finance', 'accounting', 'payment_reconciliation']")
  .replace("const permissions = ['dashboard.read', 'inventory.read'];", "const permissions = ['dashboard.read', 'finance.read', 'payroll.command.read', 'payments.reconciliation.read', 'payroll.reports.read'];")
  .replace("code: 'stockkeeper'", "code: 'finance'")
  .replace("const before = await effects();", `const now = new Date();
  const payDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12));
  await db.payrollPeriod.update({ where: { id: period.id }, data: { payDate, periodStart: new Date(payDate.getTime() - 14 * 86400000), periodEnd: new Date(payDate.getTime() - 86400000) } });
  const before = await effects();`);
head = head.replace("const files = [", "const files = ['lib/dashboard/snapshot-blocker-presentation.ts', 'lib/dashboard/snapshot-source-blocker-presentation.ts', 'services/daily-habit/daily-habit-digest-presentation.ts', 'services/daily-habit/daily-habit-signal-presentation.ts', 'components/daily-habit/DailyHabitDigestDashboard.tsx', ");
const tail = `
  const { getTenantOperatingSnapshot } = require(path.join(f.root, 'services/snapshots/tenant-operating-snapshot.service.ts'));
  const raw = await getTenantOperatingSnapshot({ organizationId: org.id, now });
  assert.ok(raw.blockers.some(item => item.id === 'tenant-payroll-employee-balance-open'));
  assert.ok(raw.blockers.some(item => item.id === 'tenant-payroll-finance-forecast-payroll-forecast-posted-run-missing'));
  const rawHash = raw.sourceHash;
  for (const locale of ['en', 'fr']) {
    await db.role.update({ where: { id: role.id }, data: { permissions } });
    const data = await getDailyHabitDigestData({ organizationId: org.id, actorId: actor.id, actorPermissions: permissions, actorRoleCodes: ['finance'], locale, now });
    const encoded = JSON.stringify(data);
    const title = locale === 'en' ? 'Employee balance recovery cases are open' : 'Des dossiers de recouvrement de soldes salariés restent ouverts';
    const detail = locale === 'en' ? '1 active employee balance case(s) have 983421.78 outstanding.' : '1 dossier actif de solde salarié présente un montant restant de 983421.78.';
    assert.ok(encoded.includes(title)); assert.ok(encoded.includes(detail));
    assert.ok(encoded.includes('PAYROLL_FORECAST_POSTED_RUN_MISSING'));
    if (locale === 'fr') { assert.equal(encoded.includes('Employee balance recovery cases are open'), false); assert.equal(encoded.includes('Upcoming payroll finance forecasts are withheld'), false); }
    const context = await browser.newContext({ viewport: { width: locale === 'fr' ? 390 : 1440, height: 1100 }, reducedMotion: 'reduce' });
    await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
    assert.equal((await context.request.post(base + '/api/auth/sign-in/email', { headers: { Origin: base }, data: { email: actor.email, password }, timeout: 60000 })).status(), 200);
    page = await context.newPage(); const row = { locale, errors: [], screenshots: [] }; result.checks.push(row);
    page.on('pageerror', error => row.errors.push(f.safe(error, secrets)));
    const url = base + '/' + locale + '/dashboard/daily-digest';
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
    const command = page.getByRole('button', { name: locale === 'en' ? 'Command' : 'Pilotage', exact: true });
    await expect(command).toBeEnabled();
    const limitations = page.getByRole('region', { name: locale === 'en' ? 'Source limitations' : 'Limites des sources', exact: true });
    const disclosure = limitations.locator('summary').filter({ hasText: title }).first(); await expect(disclosure).toBeVisible(); await disclosure.focus(); await page.keyboard.press('Enter');
    await expect(limitations.getByText(detail, { exact: true }).first()).toBeVisible();
    const forecastTitle = locale === 'en' ? 'Payroll finance forecast is blocked' : 'La prévision financière de paie est bloquée';
    const forecast = limitations.locator('summary').filter({ hasText: forecastTitle }).first(); await expect(forecast).toBeVisible(); await forecast.focus(); await page.keyboard.press('Enter');
    await expect(limitations.getByText(/PAYROLL_FORECAST_POSTED_RUN_MISSING/).first()).toBeVisible();
    await disclosure.scrollIntoViewIfNeeded(); const shot = 'digest-warnings-' + stamp + '-' + locale + '.png'; await page.screenshot({ path: path.join(__dirname, shot), animations: 'disabled', caret: 'initial' }); row.screenshots.push(shot);
    row.keyboardDisclosures = true;
    await command.click();
    const risk = page.getByRole('region', { name: locale === 'en' ? 'Actions and risks' : 'Actions et risques', exact: true });
    await expect(risk.getByRole('heading', { name: locale === 'en' ? 'Payroll forecast proof is blocked' : 'Les preuves de prévision de paie sont bloquées', exact: true })).toBeVisible();
    if (locale === 'fr') await expect(risk.getByText('La planification de trésorerie et l’analyse de rentabilité ne doivent pas utiliser les prévisions de paie tant que les preuves du registre, de la comptabilité, des paiements et des déclarations sont incomplètes.', { exact: true }).first()).toBeVisible();
    row.forecastSignalLocalized = true;
    await db.role.update({ where: { id: role.id }, data: { permissions: permissions.filter(value => !value.startsWith('payroll.')) } });
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
    assert.equal((await response.text()).includes('983421.78'), false);
    await expect(page.getByText(locale === 'en' ? 'Restricted source details' : 'Détails de source restreints', { exact: true }).first()).toBeVisible(); row.revokedDetailsHidden = true;
    assert.deepEqual(row.errors, []); console.log(locale + ': source, forecast and revoked privacy checks passed'); await context.close();
  }
  const after = await getTenantOperatingSnapshot({ organizationId: org.id, now });
  assert.equal(after.sourceHash, rawHash); assert.equal(JSON.stringify(after.blockers), JSON.stringify(raw.blockers));
  assert.equal(await effects(), before); result.rawEvidenceUnchanged = true; result.noBusinessMutations = true; result.passed = true;
}
main().catch(async error => { result.passed = false; result.error = f.safe(error, secrets); process.exitCode = 1;
  if (page && !page.isClosed()) result.failureState = await page.locator('main').last().innerText({ timeout: 5000 }).then(text => f.safe(text, secrets)).catch(() => 'Unavailable');
}).finally(async () => { await browser?.close(); result.sourceAfter = hashes(); result.sourceStable = JSON.stringify(result.sourceBefore) === JSON.stringify(result.sourceAfter); const output = path.join(__dirname, 'digest-warnings-' + stamp + '.json'); fs.writeFileSync(output, JSON.stringify(result, null, 2), { flag: 'wx' }); console.log(JSON.stringify({ output, ...result })); await db.$disconnect(); });
`;
fs.writeFileSync(path.join(__dirname, 'verify-digest-warnings.cjs'), head + tail, { flag: 'wx' });
console.log('Prepared owned Digest warning verification.');
