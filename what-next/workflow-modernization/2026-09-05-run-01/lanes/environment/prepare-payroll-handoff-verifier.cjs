const fs = require('node:fs'), path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, 'verify-digest-payroll-privacy.cjs'), 'utf8');
let head = source.slice(0, source.indexOf("  for (const locale of ['en', 'fr'])"));
head = head.replace("requestedModules: ['inventory', 'payroll']", "requestedModules: ['inventory', 'payroll', 'finance', 'accounting', 'payment_reconciliation']")
  .replace("const permissions = ['dashboard.read', 'inventory.read'];", "const permissions = ['dashboard.read', 'finance.read', 'payroll.command.read', 'payments.reconciliation.read'];")
  .replace("code: 'stockkeeper'", "code: 'finance'");
head = head.replace("'services/daily-habit/daily-habit-source-visibility.ts',", "'services/daily-habit/daily-habit-source-visibility.ts', 'services/daily-habit/daily-habit-signal-presentation.ts', 'services/signals/business-signal-rules.service.ts', 'services/signals/business-signal.service.ts', 'services/signals/action-queue.service.ts', 'components/daily-habit/DailyHabitDigestDashboard.tsx', 'app/[locale]/(dashboard)/dashboard/payroll/payroll-route-access.tsx', 'app/[locale]/(dashboard)/dashboard/payroll/payments/page.tsx',");
const tail = `
  for (const locale of ['en', 'fr']) {
    await db.role.update({ where: { id: role.id }, data: { permissions } });
    const context = await browser.newContext({ viewport: { width: locale === 'fr' ? 390 : 1440, height: 1100 }, reducedMotion: 'reduce' });
    await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
    assert.equal((await context.request.post(base + '/api/auth/sign-in/email', { headers: { Origin: base }, data: { email: actor.email, password } })).status(), 200);
    page = await context.newPage(); const row = { locale, errors: [], screenshots: [] }; result.checks.push(row);
    page.on('pageerror', error => row.errors.push(f.safe(error, secrets)));
    const digestUrl = base + '/' + locale + '/dashboard/daily-digest';
    await page.goto(digestUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });
    const command = page.getByRole('button', { name: locale === 'en' ? 'Command' : 'Pilotage', exact: true });
    await expect(command).toBeEnabled(); await command.focus(); await page.keyboard.press('Enter'); await expect(command).toHaveAttribute('aria-pressed', 'true');
    const region = page.getByRole('region', { name: locale === 'en' ? 'Actions and risks' : 'Actions et risques', exact: true });
    await expect(region.getByRole('heading', { name: locale === 'en' ? 'Payroll Exposure' : 'Exposition liée à la paie', exact: true })).toBeVisible();
    const target = '/' + locale + '/dashboard/payroll/payments';
    const link = region.locator('a[href="' + target + '"]').first(); await expect(link).toBeVisible();
    const screenshot = async state => { const output = 'digest-payroll-handoff-' + stamp + '-' + locale + '-' + state + '.png'; await page.screenshot({ path: path.join(__dirname, output), animations: 'disabled', caret: 'initial' }); row.screenshots.push(output); };
    await link.scrollIntoViewIfNeeded(); await screenshot('source');
    await link.focus(); const started = Date.now(); await page.keyboard.press('Enter'); await page.waitForURL(base + target, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await expect(page.getByText('Synthetic private employee', { exact: true }).first()).toBeVisible(); row.handoffMs = Date.now() - started;
    await screenshot('destination');
    row.destinationHasEnglishBalanceHeading = await page.getByRole('heading', { name: 'Payroll employee balance workbench', exact: true }).count() > 0;
    await page.goBack({ waitUntil: 'domcontentloaded', timeout: 120000 }); await expect(command).toHaveAttribute('aria-pressed', 'true'); row.backRestored = true;
    const revoked = permissions.filter(permission => permission !== 'payments.reconciliation.read');
    await db.role.update({ where: { id: role.id }, data: { permissions: revoked } });
    await link.focus(); await page.keyboard.press('Enter'); await page.waitForURL(base + target, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await expect(page.getByRole('heading', { name: /Payroll.*is not available for this role/ }).first()).toBeVisible();
    await expect(page.getByText('Synthetic private employee', { exact: true })).toHaveCount(0); row.cachedLinkRevocationDenied = true;
    const current = await getDailyHabitDigestData({ organizationId: org.id, actorId: actor.id, actorPermissions: revoked, actorRoleCodes: ['finance'], locale });
    assert.equal(current.digests.flatMap(digest => digest.actions).some(action => action.href.includes('/payroll/')), false);
    await page.goto(digestUrl, { waitUntil: 'domcontentloaded', timeout: 120000 }); await expect(command).toBeEnabled(); await command.click();
    await expect(region.locator('a[href="' + target + '"]')).toHaveCount(0); row.refreshedActionAbsent = true;
    assert.deepEqual(row.errors, []); await context.close();
  }
  assert.equal(await effects(), before); result.noBusinessMutations = true; result.passed = true;
}
main().catch(async error => { result.passed = false; result.error = f.safe(error, secrets); process.exitCode = 1;
  if (page && !page.isClosed()) result.failureState = await page.locator('main').last().innerText({ timeout: 5000 }).then(text => f.safe(text, secrets)).catch(() => 'Unavailable');
}).finally(async () => { await browser?.close(); result.sourceAfter = hashes(); result.sourceStable = JSON.stringify(result.sourceBefore) === JSON.stringify(result.sourceAfter); const output = path.join(__dirname, 'digest-payroll-handoff-' + stamp + '.json'); fs.writeFileSync(output, JSON.stringify(result, null, 2), { flag: 'wx' }); console.log(JSON.stringify({ output, ...result })); await db.$disconnect(); });
`;
fs.writeFileSync(path.join(__dirname, 'verify-digest-payroll-handoff.cjs'), head + tail, { flag: 'wx' });
console.log('Prepared owned payroll handoff verifier.');
