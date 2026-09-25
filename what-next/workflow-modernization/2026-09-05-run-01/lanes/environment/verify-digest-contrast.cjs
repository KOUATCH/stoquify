const f = require('./statement-recipient-fixtures.cjs'), { db, fs, path, crypto, assert } = f;
const { hashPassword } = require(path.join(f.root, 'lib/password.ts'));
const { chromium, expect: baseExpect } = require('@playwright/test'), expect = baseExpect.configure({ timeout: 60000 });
const base = 'http://127.0.0.1:3110', stamp = crypto.randomUUID(), secrets = [];
const files = ['services/bi/bi-contracts.ts', 'services/bi/bi-evidence-adapter.service.ts', 'services/daily-habit/daily-habit-digest.service.ts', 'components/bi/BIRiskOpportunityRadar.tsx', 'components/bi/BICommandModeTabs.tsx', 'components/bi/BICommandBriefHeader.tsx', 'components/evidence/EvidenceGradeBadge.tsx', 'components/daily-habit/DailyHabitDigestDashboard.tsx'];
files.push('app/globals.css', 'components/ui/button.tsx', 'components/bi/BIEvidenceBadgeRow.tsx');
files.push('components/daily-habit/DailyHabitDigestDashboard.module.css', 'what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/measure-rendered-contrast.cjs');
const hashes = () => Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, file))).digest('hex')]));
const result = { at: new Date().toISOString(), sourceBefore: hashes(), browser: [] }; let browser, currentPage;
async function main() {
  await f.helper.withClient(f.target, f.helper.assertOwned);
  const org = await db.organization.create({ data: { name: f.helper.prefix + 'Urgency ' + stamp, slug: 'urgency-' + stamp, currency: 'XAF' } });
  const password = 'Owned-' + crypto.randomUUID() + '!', hashed = await hashPassword(password); secrets.push(password);
  const actor = await db.user.create({ data: { organizationId: org.id, email: 'urgency-' + stamp + '@example.invalid', password: hashed, isActive: true, isVerified: true, emailVerified: true } });
  await db.account.create({ data: { userId: actor.id, accountId: actor.id, providerId: 'credential', password: hashed } });
  await db.role.create({ data: { organizationId: org.id, code: 'manager', nameEn: 'Owned manager', permissions: ['dashboard.read', 'purchases.orders.read'], users: { connect: { id: actor.id } } } });
  const supplier = await db.supplier.create({ data: { organizationId: org.id, name: 'Owned supplier' } });
  const location = await db.location.create({ data: { organizationId: org.id, name: 'Owned site', code: 'SITE' } });
  const order = await db.purchaseOrder.create({ data: { organizationId: org.id, supplierId: supplier.id, locationId: location.id, createdById: actor.id, orderNumber: 'URGENCY-' + stamp, status: 'SUBMITTED', expectedDeliveryDate: new Date(Date.now() - 86400000) } });
  const effects = async () => ({ journals: await db.journalEntry.count({ where: { organizationId: org.id } }), payments: await db.payment.count({ where: { organizationId: org.id } }), events: await db.businessEvent.count({ where: { organizationId: org.id } }) });
  const before = await effects();
  browser = await chromium.launch({ headless: true });

  for (const locale of ['en', 'fr']) {
    const context = await browser.newContext({ viewport: { width: locale === 'fr' ? 320 : 1440, height: 1100 }, reducedMotion: 'reduce' });
    await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
    assert.equal((await context.request.post(base + '/api/auth/sign-in/email', { headers: { Origin: base }, data: { email: actor.email, password }, timeout: 60000 })).status(), 200);
    const page = await context.newPage(); currentPage = page;
    const row = { locale, errors: [], scans: [] }; result.browser.push(row);
    page.on('pageerror', error => row.errors.push(f.safe(error, secrets)));
    await page.goto(base + '/' + locale + '/dashboard/daily-digest', { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.addScriptTag({ path: require.resolve('axe-core') });
    for (const name of locale === 'en' ? ['Brief', 'Command', 'Investigate'] : ['Synthèse', 'Pilotage', 'Examiner']) {
      const mode = page.getByRole('button', { name, exact: true }); await expect(mode).toBeEnabled(); await mode.focus(); await page.keyboard.press('Enter');
      await expect(mode).toHaveAttribute('aria-pressed', 'true');
      const scan = await page.evaluate(async () => {
        const report = await window.axe.run('.dashboard-landing-content', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } });
        const summarize = entries => entries.map(value => ({ id: value.id, impact: value.impact, nodes: value.nodes.map(node => ({ target: node.target, html: node.html, any: node.any, all: node.all, none: node.none })) }));
        return { violations: summarize(report.violations), incomplete: summarize(report.incomplete), passes: report.passes.map(item => item.id) };
      });
      const contrast = scan.incomplete.find(item => item.id === 'color-contrast')?.nodes || [];
      const backgrounds = [];
      for (const node of contrast.slice(0, 4)) {
        if (typeof node.target[0] !== 'string') continue;
        backgrounds.push(await page.locator(node.target[0]).first().evaluate(element => {
          const result = []; for (let current = element; current; current = current.parentElement) {
            const style = getComputedStyle(current); result.push({ tag: current.tagName, class: current.className, color: style.color, background: style.backgroundColor, image: style.backgroundImage, opacity: style.opacity, filter: style.filter, backdrop: style.backdropFilter });
          } return result;
        }));
      }
      const renderedContrast = await require('./measure-rendered-contrast.cjs')(page, contrast);
      row.scans.push({ mode: name, ...scan, backgrounds, renderedContrast });
      assert.deepEqual(scan.violations, []);
      assert.ok(renderedContrast.length > 0);
      assert.deepEqual(renderedContrast.filter(item => !item.measured || !item.passes), [], 'Rendered text contrast');
      const reflow = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: innerWidth }));
      assert.ok(reflow.content <= reflow.viewport, 'Page must reflow without horizontal overflow');
      row.scans.at(-1).reflow = reflow;
      console.log(locale + ' ' + name + ': ' + scan.violations.length + ' violations; ' + scan.incomplete.length + ' incomplete rule groups');
    }
    row.primaryStates = [];
    for (const selector of ['.dashboard-landing-content button.dashboard-button-primary', '.dashboard-landing-content a.dashboard-button-primary']) {
      const control = page.locator(selector).first();
      await control.hover();
      const hover = await require('./measure-rendered-contrast.cjs')(page, [{ target: [selector], any: [] }]);
      assert.ok(await control.evaluate(el => el.matches(':hover')), 'Hover retained during measurement');
      assert.ok(hover[0].measured && hover[0].passes);
      // Enter this control using a real Tab step rather than a click.
      await control.focus(); await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Tab');
      await expect(control).toBeFocused();
      await page.mouse.move(0, 0);
      const focus = await control.evaluate(el => { const s = getComputedStyle(el); return { visible: el.matches(':focus-visible'), width: s.outlineWidth, offset: s.outlineOffset, color: s.outlineColor }; });
      assert.ok(focus.visible); assert.equal(focus.width, '2px'); assert.equal(focus.offset, '3px');
      const clippedFocus = await control.evaluate(el => {
        const rect = el.getBoundingClientRect(), clipping = [];
        for (let p = el.parentElement; p; p = p.parentElement) {
          const style = getComputedStyle(p), bounds = p.getBoundingClientRect();
          if (/(auto|scroll|hidden|clip)/.test(style.overflowY) && (rect.top - 5 < bounds.top || rect.bottom + 5 > bounds.bottom)) clipping.push({ class: p.className, axis: 'y' });
          if (/(auto|scroll|hidden|clip)/.test(style.overflowX) && (rect.left - 5 < bounds.left || rect.right + 5 > bounds.right)) clipping.push({ class: p.className, axis: 'x' });
        }
        return clipping;
      });
      assert.deepEqual(clippedFocus, [], 'Focus outline must fit clipping ancestors');
      const focusedContrast = await require('./measure-rendered-contrast.cjs')(page, [{ target: [selector], any: [] }]);
      assert.ok(focusedContrast[0].measured && focusedContrast[0].passes);
      const shot = 'digest-contrast-' + stamp + '-' + locale + '-focus-' + row.primaryStates.length + '.png';
      await page.screenshot({ path: path.join(__dirname, shot), animations: 'disabled', caret: 'initial' });
      row.primaryStates.push({ selector, hover, focus, focusedContrast, screenshot: shot });
    }
    const shot = 'digest-contrast-' + stamp + '-' + locale + '.png'; await page.screenshot({ path: path.join(__dirname, shot), fullPage: true, animations: 'disabled', caret: 'initial' }); row.screenshot = shot;
    assert.deepEqual(row.errors, []); await context.close();
  }
  assert.deepEqual(await effects(), before); result.noFinancialEffects = true; result.scanCompleted = true;
}
main().catch(error => { result.scanCompleted = false; result.error = f.safe(error, secrets); process.exitCode = 1; }).finally(async () => { await browser?.close(); result.sourceAfter = hashes(); result.sourceStable = JSON.stringify(result.sourceBefore) === JSON.stringify(result.sourceAfter); const output = path.join(__dirname, 'digest-contrast-' + stamp + '.json'); fs.writeFileSync(output, JSON.stringify(result, null, 2), { flag: 'wx' }); console.log(JSON.stringify({ output, scanCompleted: result.scanCompleted, error: result.error, sourceStable: result.sourceStable })); await db.$disconnect(); });
