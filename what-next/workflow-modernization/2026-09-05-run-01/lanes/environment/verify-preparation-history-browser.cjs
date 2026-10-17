const f = require('./statement-recipient-fixtures.cjs'), { db, fs, path, crypto, assert } = f;
const { chromium, expect: baseExpect } = require('@playwright/test'), expect = baseExpect.configure({ timeout: 60000 });
const { hashPassword } = require(path.join(f.root, 'lib/password.ts'));
const base = 'http://127.0.0.1:3110', stamp = crypto.randomUUID(), secrets = [];
const priorFile = 'preparation-reviewers-history-862f06cb-b70b-4bc2-9fb7-b0287798f3dd.json';
const prior = JSON.parse(fs.readFileSync(path.join(__dirname, priorFile))), fixture = prior.cases.find(row => row.pageSizes);
const files = ['components/finance/ReconciliationPreparationWorkbench.tsx', 'actions/payments/reconciliation-preparation.actions.ts', 'services/reconciliation/reconciliation-run-preparation.service.ts', 'services/reconciliation/reconciliation-run-preparation-evidence.ts', 'app/globals.css'];
const hashes = () => Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, file))).digest('hex')]));
const translations = () => Object.fromEntries(['en', 'fr'].map(locale => [locale, crypto.createHash('sha256').update(JSON.stringify(JSON.parse(fs.readFileSync(path.join(f.root, 'messages', locale + '.json'))).paymentReconciliationWorkbench)).digest('hex')]));
const report = { at: new Date().toISOString(), sourceBefore: hashes(), translationsBefore: translations(), fixtureReceipt: priorFile, journeys: [] }; let browser;
async function main() {
  await f.helper.withClient(f.target, f.helper.assertOwned);
  const run = await db.reconciliationRun.findUniqueOrThrow({ where: { id: fixture.runId } }); assert.equal(run.organizationId, fixture.organizationId); assert.equal(run.status, 'SIGNED');
  const user = await db.user.findUniqueOrThrow({ where: { id: run.runById } }); assert.equal(user.organizationId, fixture.organizationId);
  const password = 'Owned-history-' + crypto.randomUUID() + '!'; secrets.push(password); const hashed = await hashPassword(password);
  await db.user.update({ where: { id: user.id }, data: { password: hashed, isVerified: true, emailVerified: true } });
  const account = await db.account.findFirst({ where: { userId: user.id, providerId: 'credential' } });
  if (account) await db.account.update({ where: { id: account.id }, data: { password: hashed } });
  else await db.account.create({ data: { userId: user.id, accountId: user.id, providerId: 'credential', password: hashed } });
  if (!await db.role.findFirst({ where: { organizationId: fixture.organizationId, code: 'administrator' } }))
    await db.role.create({ data: { organizationId: fixture.organizationId, code: 'administrator', nameEn: 'Owned history operator', permissions: ['dashboard.read', 'finance.read', 'accounting.journal.read', 'payments.reconciliation.read', 'payments.reconciliation.run'], users: { connect: { id: user.id } } } });
  browser = await chromium.launch({ headless: true });
  for (const locale of ['en', 'fr']) {
    const t = JSON.parse(fs.readFileSync(path.join(f.root, 'messages', locale + '.json'))).paymentReconciliationWorkbench.runPreparation;
    const row = { locale, screenshots: [], errors: [] }; report.journeys.push(row);
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' }); context.setDefaultTimeout(60000); context.setDefaultNavigationTimeout(180000);
    await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
    assert.equal((await context.request.post(base + '/api/auth/sign-in/email', { data: { email: user.email, password }, headers: { Origin: base }, timeout: 180000 })).status(), 200);
    const page = await context.newPage(); page.on('pageerror', error => row.errors.push(f.safe(error, secrets))); page.on('console', message => { if (message.text().includes('MISSING_MESSAGE')) row.errors.push(f.safe(message.text(), secrets)); });
    const panel = () => page.getByRole('region', { name: t.reviewTitle, exact: true });
    const screenshot = async label => { const file = 'preparation-history-browser-' + stamp + '-' + locale + '-' + label + '.png'; await panel().screenshot({ path: path.join(__dirname, file), animations: 'disabled' }); row.screenshots.push(file); };
    try {
      await page.goto(base + '/' + locale + '/dashboard/finance/reconciliation'); await page.getByRole('button', { name: t.open, exact: true }).click();
      const list = page.getByRole('region', { name: t.title, exact: true }); await expect(list).toBeVisible();
      await list.getByLabel(t.view, { exact: true }).selectOption('ALL'); await list.getByLabel(t.searchLabel, { exact: true }).fill(run.id); await list.getByRole('button', { name: t.search, exact: true }).click();
      await expect(list.getByRole('button', { name: t.review, exact: true })).toHaveCount(1); await list.getByRole('button', { name: t.review, exact: true }).click();
      await expect(panel()).toBeFocused(); await expect(panel().locator('li')).toHaveCount(20); const firstText = await panel().locator('li').allTextContents();
      assert.ok(fixture.receiptIds.slice(0, 20).every(id => firstText.some(text => text.includes(id))));
      await expect(panel().getByRole('button', { name: t.previous, exact: true })).toBeDisabled();
      let aborted = false;
      await page.route('**/*', route => { const request = route.request(); if (!aborted && request.method() === 'POST' && request.headers()['next-action'] && request.postData()?.includes('cursor') && request.postData()?.includes(run.id)) { aborted = true; return route.abort('connectionfailed'); } return route.fallback(); });
      await panel().getByRole('button', { name: t.next, exact: true }).focus(); await page.keyboard.press('Enter'); await expect(panel().getByText(t.historyFailed, { exact: true })).toBeVisible();
      assert.equal(aborted, true); assert.deepEqual(await panel().locator('li').allTextContents(), firstText); await expect(panel().getByRole('button', { name: t.next, exact: true })).toBeDisabled(); row.failedReadRetainsPriorPage = true;
      await expect(panel().getByRole('region', { name: t.history, exact: true })).toBeFocused();
      await panel().evaluate(el => el.setAttribute('data-owned-history', 'true')); await page.addScriptTag({ path: require.resolve('axe-core') });
      const scan = await page.evaluate(async () => { const result = await window.axe.run('[data-owned-history]', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } }); return { violations: result.violations, incomplete: result.incomplete }; }); row.failedHistoryScan = scan; assert.deepEqual(scan.violations, []);
      const contrastNodes = scan.incomplete.filter(item => item.id === 'color-contrast').flatMap(item => item.nodes);
      row.failedHistoryContrast = await require('./measure-rendered-contrast.cjs')(page, contrastNodes);
      for (const item of row.failedHistoryContrast.filter(item => !item.measured && !item.disabled)) {
        const emptyField = item.target.length === 1 && await page.locator(item.target[0]).evaluate(element => element instanceof HTMLTextAreaElement && element.value === '' && element.placeholder === '');
        if (emptyField) item.notApplicable = 'Empty textarea has no rendered value or placeholder text';
      }
      assert.ok(row.failedHistoryContrast.every(item => item.disabled || item.notApplicable || (item.measured && item.passes)));
      for (const width of [320, 768, 1440]) { await page.setViewportSize({ width, height: 1000 }); assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)); await screenshot('failed-history-' + width); }
      await panel().getByRole('button', { name: t.refresh, exact: true }).focus(); await page.keyboard.press('Enter'); await expect(panel().getByText(t.historyFailed, { exact: true })).toHaveCount(0); await expect(panel().locator('li')).toHaveCount(20);
      await panel().getByRole('button', { name: t.next, exact: true }).focus(); await page.keyboard.press('Enter'); await expect(panel().locator('li')).toHaveCount(3);
      const secondText = await panel().locator('li').allTextContents(); assert.ok(fixture.receiptIds.slice(20).every(id => secondText.some(text => text.includes(id)))); await expect(panel().getByRole('button', { name: t.next, exact: true })).toBeDisabled();
      row.focusAfterLastPage = await page.evaluate(() => ({ tag: document.activeElement.tagName, text: document.activeElement.textContent.slice(0, 160) }));
      await expect(panel().getByRole('region', { name: t.history, exact: true })).toBeFocused();
      await panel().getByRole('button', { name: t.previous, exact: true }).focus(); await page.keyboard.press('Enter'); await expect(panel().locator('li')).toHaveCount(20); assert.deepEqual(await panel().locator('li').allTextContents(), firstText); row.bothPagesAndBackVerified = true;
      await page.reload(); await expect(panel()).toBeVisible(); await expect(panel().locator('li')).toHaveCount(20); row.reloadRestoresSelectedRun = true;
      await page.setViewportSize({ width: 640, height: 1000 }); await page.evaluate(() => document.documentElement.style.fontSize = '200%'); assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)); await screenshot('enlarged-history'); await page.evaluate(() => document.documentElement.style.fontSize = '');
      await panel().getByRole('button', { name: t.back, exact: true }).click(); await expect(list).toBeFocused(); await list.getByRole('button', { name: t.close, exact: true }).click(); await expect(page.getByRole('button', { name: t.open, exact: true })).toBeFocused();
      assert.deepEqual(row.errors, []); row.passed = true; console.log(JSON.stringify({ locale, passed: true, focusAfterLastPage: row.focusAfterLastPage }));
    } catch (error) { row.error = f.safe(error, secrets); await screenshot('failure').catch(() => {}); throw error; } finally { await context.close(); }
  }
  report.passed = true;
}
main().catch(error => { report.passed = false; report.error = f.safe(error, secrets); process.exitCode = 1; }).finally(async () => {
  await browser?.close(); report.sourceAfter = hashes(); report.translationsAfter = translations(); report.sourceStable = JSON.stringify(report.sourceBefore) === JSON.stringify(report.sourceAfter); report.translationStable = JSON.stringify(report.translationsBefore) === JSON.stringify(report.translationsAfter);
  const output = path.join(__dirname, 'preparation-history-browser-' + stamp + '.json'); fs.writeFileSync(output, JSON.stringify(report, null, 2), { flag: 'wx' }); console.log(JSON.stringify({ output, passed: report.passed, error: report.error, sourceStable: report.sourceStable })); await db.$disconnect(); process.exit(process.exitCode || 0);
});
