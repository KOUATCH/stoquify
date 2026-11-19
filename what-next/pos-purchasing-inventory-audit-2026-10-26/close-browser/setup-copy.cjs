// Actual authenticated closed-state rendering. Does not close/reopen any period.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), { chromium } = require('playwright'), { PrismaClient } = require('@prisma/client');
const f = JSON.parse(fs.readFileSync('.codex-tmp/close-browser-private.json', 'utf8')), u = new URL(f.url);
if (f.base !== 'http://127.0.0.1:3169' || u.hostname !== 'localhost' || u.pathname !== '/stoquify_pos_audit_20261026_d30f') throw Error('Wrong local target');
const db = new PrismaClient({ datasourceUrl: f.url }), results = [];
(async () => {
  const browser = await chromium.launch({ headless: true });
  try { for (const v of f.fixtures) {
    const a = v.actors.find(a => a.kind === 'reviewer'), context = await browser.newContext({ viewport: { width: v.locale === 'fr' ? 390 : 1440, height: 1000 } });
    try {
      await db.role.update({ where: { id: a.roleId }, data: { permissions: [...a.permissions, 'accounting.setup.manage'] } });
      const response = await context.request.post(f.base + '/api/auth/sign-in/email', { data: { email: a.email, password: f.password }, headers: { Origin: f.base }, timeout: 240000 });
      assert.equal(response.status(), 200);
      const page = await context.newPage(); page.setDefaultTimeout(90000);
      await page.goto(f.base + '/' + v.locale + '/dashboard/accounting/setup', { waitUntil: 'domcontentloaded', timeout: 240000 });
      const title = v.locale === 'fr' ? 'Périodes comptables' : 'Accounting periods';
      const heading = page.getByRole('heading', { name: title, exact: true }); await heading.waitFor();
      const panel = page.locator('.dashboard-glass-panel').filter({ has: heading });
      await panel.getByText(v.locale === 'fr' ? 'Clôturée' : 'CLOSED', { exact: true }).waitFor();
      assert.equal(await panel.getByRole('button', { name: v.locale === 'fr' ? 'Clôturer' : 'Close', exact: true }).count(), 0);
      await panel.screenshot({ path: path.join(__dirname, v.locale + '-period-copy.png') });
      fs.writeFileSync(path.join(__dirname, v.locale + '-period-copy.txt'), await panel.innerText());
      await page.setViewportSize({ width: 1440, height: 1000 });
      await panel.screenshot({ path: path.join(__dirname, v.locale + '-period-copy-desktop.png') });
      results.push({ locale: v.locale, scenario: 'LOCALIZED_CLOSED_PERIOD', status: 'PASS', businessMutations: 0 });
      await page.setViewportSize({ width: v.locale === 'fr' ? 390 : 1440, height: 1000 });
      await page.goto(f.base + '/' + v.locale + '/dashboard/accounting/close/' + v.periodId, { waitUntil: 'domcontentloaded', timeout: 240000 });
      await page.waitForFunction(() => document.querySelector('[data-testid="close-readiness-workspace"]')?.getAttribute('data-client-ready') === 'true');
      const refresh = page.locator('section').filter({ has: page.getByRole('combobox', { name: v.locale === 'fr' ? 'Periode' : 'Period', exact: true }) }).getByRole('button', { name: v.locale === 'fr' ? 'Actualiser' : 'Refresh', exact: true });
      for (let i = 0; i < 180 && !(await refresh.isEnabled()); i++) await new Promise(r => setTimeout(r, 500));
      assert(await refresh.isEnabled());
      await db.session.deleteMany({ where: { userId: a.id } }); await refresh.click();
      await page.getByTestId('close-readiness-workspace').waitFor({ state: 'detached' });
      const signIn = page.getByRole('link', { name: v.locale === 'fr' ? 'Se reconnecter' : 'Sign in again', exact: true });
      await signIn.focus(); assert(await signIn.evaluate(el => el === document.activeElement));
      await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
      const scan = await page.evaluate(async () => { const r = await window.axe.run(document.querySelector('main'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] } }); return { overflow: document.documentElement.scrollWidth > innerWidth, violations: r.violations.map(v => v.id) }; });
      assert.equal(scan.overflow, false); assert.equal(scan.violations.length, 0);
      await page.screenshot({ path: path.join(__dirname, v.locale + '-denial-final.png'), fullPage: true });
      results.push({ locale: v.locale, scenario: 'FINAL_DENIAL_COPY_ACCESSIBILITY', status: 'PASS', ...scan });
    } finally { await db.role.update({ where: { id: a.roleId }, data: { permissions: a.permissions } }); await context.close(); }
  } } finally { await browser.close(); }
})().catch(e => { results.push({ scenario: 'HARNESS_FAILURE', status: 'FAIL', error: e.message }); process.exitCode = 1; console.error(e.message); }).finally(async () => { fs.writeFileSync(path.join(__dirname, 'setup-copy-results.json'), JSON.stringify(results, null, 2)); await db.$disconnect(); });
