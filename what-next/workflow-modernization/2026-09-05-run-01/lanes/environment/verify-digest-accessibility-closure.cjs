const helper = require('./registration-local.cjs'), originalTarget = helper.targetUrl;
helper.targetUrl = () => { const url = originalTarget(); url.searchParams.set('connection_limit', '2'); return url; };
const f = require('./statement-recipient-fixtures.cjs'), { db, fs, path, crypto, assert } = f;
const { hashPassword } = require(path.join(f.root, 'lib/password.ts'));
const { getModuleCatalog } = require(path.join(f.root, 'services/modules/module-catalog.service.ts'));
const { chromium, expect: originalExpect } = require('@playwright/test'), expect = originalExpect.configure({ timeout: 60000 });
const stamp = crypto.randomUUID(), base = 'http://127.0.0.1:3110', secrets = [];
const files = ['components/daily-habit/DailyHabitDigestDashboard.tsx', 'components/daily-habit/DailyHabitDigestDashboard.module.css', 'services/daily-habit/daily-habit-digest.service.ts', 'services/daily-habit/daily-habit-digest-presentation.ts', 'components/ui/button.tsx', 'components/bi/BICommandModeTabs.tsx', 'components/bi/BICommandBriefHeader.tsx', 'components/bi/BIKpiCard.tsx', 'components/bi/BIRiskOpportunityRadar.tsx', 'app/globals.css'];
const hashes = () => Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, file))).digest('hex')]));
files.push('what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/measure-rendered-contrast.cjs');
const result = { at: new Date().toISOString(), sourceBefore: hashes(), views: [], limits: ['Chromium DOM and keyboard evidence; no native screen-reader certification.', '320 CSS pixel viewport verifies narrow reflow, not browser-chrome zoom.', 'Read-only seven-workspace fixture; distinct denied-persona evidence is retained in earlier matrices.'] };
let browser, activePage;
async function main() {
  await helper.withClient(f.target, helper.assertOwned);
  const org = await db.organization.create({ data: { name: helper.prefix + 'Reflow et contrôle des espaces opérationnels ' + stamp, slug: 'digest-reflow-' + stamp, currency: 'XAF', timezone: 'UTC' } });
  const password = 'Owned-' + crypto.randomUUID() + '!'; secrets.push(password); const hashed = await hashPassword(password);
  const actor = await db.user.create({ data: { organizationId: org.id, email: stamp + '@example.invalid', password: hashed, isActive: true, isVerified: true, emailVerified: true } });
  await db.account.create({ data: { userId: actor.id, accountId: actor.id, providerId: 'credential', password: hashed } });
  const permissions = ['dashboard.read', 'analytics.read', 'finance.read', 'payments.reconciliation.read', 'accounting.close.read', 'inventory.read', 'inventory.items.read', 'purchases.orders.read'];
  await db.role.create({ data: { organizationId: org.id, code: 'administrator', nameEn: 'Owned reflow reader', permissions, users: { connect: { id: actor.id } } } });
  // Manager is a separately selected audience, even for tenant administrators.
  await db.role.create({ data: { organizationId: org.id, code: 'manager', nameEn: 'Owned reflow manager', permissions: [], users: { connect: { id: actor.id } } } });
  const modules = getModuleCatalog().map(item => item.slug);
  await db.tenantModuleConfiguration.create({ data: { organizationId: org.id, manifestHash: 'synthetic-reflow', selectedModules: modules, activeModules: modules } });
  await db.tenantModuleGrant.createMany({ data: modules.map(moduleSlug => ({ organizationId: org.id, moduleSlug, source: 'requested_modules', status: 'active' })) });
  const supplier = await db.supplier.create({ data: { organizationId: org.id, name: 'Owned reflow supplier' } });
  const location = await db.location.create({ data: { organizationId: org.id, name: 'Owned reflow site', code: 'REFLOW' } });
  await db.purchaseOrder.create({ data: { organizationId: org.id, supplierId: supplier.id, locationId: location.id, createdById: actor.id, orderNumber: 'REFLOW-' + stamp, status: 'SUBMITTED', expectedDeliveryDate: new Date(Date.now() - 86400000) } });
  const effects = async () => JSON.stringify({ orders: await db.purchaseOrder.findMany({ where: { organizationId: org.id }, orderBy: { id: 'asc' } }), payments: await db.payment.count({ where: { organizationId: org.id } }), journals: await db.journalEntry.count({ where: { organizationId: org.id } }), events: await db.businessEvent.count({ where: { organizationId: org.id } }) });
  const before = await effects();
  browser = await chromium.launch({ headless: true });
  for (const locale of ['en', 'fr']) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
    assert.equal((await context.request.post(base + '/api/auth/sign-in/email', { headers: { Origin: base }, data: { email: actor.email, password }, timeout: 60000 })).status(), 200);
    const page = await context.newPage(); activePage = page;
    await page.goto(base + '/' + locale + '/dashboard/daily-digest', { waitUntil: 'domcontentloaded', timeout: 120000 });
    const main = page.locator('.dashboard-landing-content');
    await page.addScriptTag({ path: require.resolve('axe-core') });
    const workspaces = locale === 'en' ? ['Owner', 'Manager', 'Finance', 'Accountant', 'Stockkeeper', 'End of day', 'Weekly'] : ['Dirigeant', 'Responsable', 'Finance', 'Comptable', 'Magasinier', 'Fin de journée', 'Hebdomadaire'];
    const modes = locale === 'en' ? ['Brief', 'Command', 'Investigate'] : ['Synthèse', 'Pilotage', 'Examiner'];
    for (const textScale of [1, 2]) {
      const width = locale === 'fr' ? 320 : 1440;
      await page.setViewportSize({ width, height: 1000 });
      for (const workspace of workspaces) {
        const selector = main.getByRole('button', { name: workspace, exact: true });
        await expect(selector).toBeEnabled(); await selector.focus(); await page.keyboard.press('Enter');
        await expect(selector).toHaveAttribute('aria-pressed', 'true');
        for (const mode of modes) {
          const control = main.getByRole('button', { name: mode, exact: true });
          await control.focus(); await page.keyboard.press('Enter'); await expect(control).toHaveAttribute('aria-pressed', 'true');
          const enlargement = textScale === 2 ? await main.evaluate(root => {
            const entries = Array.from(root.querySelectorAll('*')).map(el => ({ el, font: getComputedStyle(el).fontSize, line: getComputedStyle(el).lineHeight }));
            return entries.map(({ el, font, line }, index) => {
              el.setAttribute('data-owned-text-size', String(index));
              return `[data-owned-text-size="${index}"]{font-size:${parseFloat(font) * 2}px!important;line-height:${line === 'normal' ? 'normal' : parseFloat(line) * 2 + 'px'}!important;}`;
            }).join('\n');
          }) : null;
          const style = enlargement ? await page.addStyleTag({ content: enlargement }) : null;
          if (textScale === 1) {
            const scan = await page.evaluate(async () => {
              const report = await window.axe.run('.dashboard-landing-content', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } });
              const summarize = values => values.map(value => ({ id: value.id, impact: value.impact, nodes: value.nodes.map(node => ({ target: node.target, html: node.html, any: node.any })) }));
              return { violations: summarize(report.violations), incomplete: summarize(report.incomplete), passes: report.passes.map(value => value.id) };
            });
            const nodes = scan.incomplete.find(rule => rule.id === 'color-contrast')?.nodes || [];
            const measure = require('./measure-rendered-contrast.cjs');
            const rendered = await measure(page, nodes);
            const scrollPositions = await main.evaluate(root => Array.from(root.querySelectorAll('*')).filter(el => el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight).map((el, index) => { el.setAttribute('data-owned-scroll', String(index)); return { index, left: el.scrollLeft, top: el.scrollTop }; }));
            const windowScroll = await page.evaluate(() => ({ x: scrollX, y: scrollY }));
            for (let i = 0; i < rendered.length; i++) {
              if (rendered[i].measured || rendered[i].disabled || rendered[i].unsupported?.length) continue;
              await page.locator(nodes[i].target[0]).first().evaluate(el => el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' }));
              rendered[i] = { ...(await measure(page, [nodes[i]]))[0], measuredAfterScroll: true };
            }
            await main.evaluate((root, positions) => positions.forEach(item => { const el = root.querySelector(`[data-owned-scroll="${item.index}"]`); if (el) { el.scrollLeft = item.left; el.scrollTop = item.top; el.removeAttribute('data-owned-scroll'); } }), scrollPositions);
            await page.evaluate(position => scrollTo({ left: position.x, top: position.y, behavior: 'instant' }), windowScroll);
            result.views.push({ locale, width, textScale, workspace, mode, scan, rendered });
            assert.deepEqual(scan.violations, [], 'Automated accessibility violations');
            assert.deepEqual(rendered.filter(value => !value.measured || !value.passes), [], 'Rendered text contrast');
          }
          const metrics = await main.evaluate(root => {
            const visible = el => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden';
            const controls = Array.from(root.querySelectorAll('button, a, summary')).filter(visible);
            return {
              viewport: innerWidth, documentWidth: document.documentElement.scrollWidth,
              reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
              focusedModeVisible: document.activeElement.matches(':focus-visible'),
              unnamedControls: controls.filter(el => !el.textContent.trim() && !el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby')).map(el => el.outerHTML.slice(0, 160)),
              runningMotion: root.getAnimations({ subtree: true }).filter(a => a.playState === 'running').map(a => ({ type: a.constructor.name, property: a.transitionProperty, name: a.animationName })),
              viewText: root.querySelector('#daily-digest-view')?.textContent.trim().length || 0,
              overflowingControlText: controls.filter(el => {
                if (el.tagName === 'SUMMARY') return false;
                const box = el.getBoundingClientRect(), walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
                let text; while ((text = walker.nextNode())) {
                  if (!text.textContent.trim() || getComputedStyle(text.parentElement).clip !== 'auto') continue;
                  const range = document.createRange(); range.selectNodeContents(text);
                  if (Array.from(range.getClientRects()).some(rect => rect.width > 0 && (rect.left < box.left - 1 || rect.right > box.right + 1 || rect.top < box.top - 1 || rect.bottom > box.bottom + 1))) return true;
                }
                return false;
              }).map(el => ({ tag: el.tagName, text: el.textContent.trim().slice(0, 100), className: el.className })),
            };
          });
          if (textScale === 2) result.views.push({ locale, width, textScale, workspace, mode });
          Object.assign(result.views.at(-1), metrics);
          result.views.at(-1).selectedWorkspaceClipping = await selector.evaluate(el => {
            const rect = el.getBoundingClientRect(), clipped = [];
            for (let p = el.parentElement; p; p = p.parentElement) {
              const style = getComputedStyle(p), bounds = p.getBoundingClientRect();
              if (/(auto|scroll|hidden|clip)/.test(style.overflowX) && (rect.left < bounds.left - 1 || rect.right > bounds.right + 1)) clipped.push({ tag: p.tagName, left: rect.left, right: rect.right, availableLeft: bounds.left, availableRight: bounds.right });
            }
            return clipped;
          });
          if (textScale === 1) assert.deepEqual(result.views.at(-1).selectedWorkspaceClipping, [], 'Selected workspace label must remain visible inside its horizontal selector');
          assert.ok(metrics.documentWidth <= width, 'No page-level horizontal overflow');
          assert.deepEqual(metrics.overflowingControlText, [], 'Control labels must fit at the tested text size');
          assert.ok(metrics.reducedMotion && metrics.focusedModeVisible && metrics.viewText > 0);
          assert.deepEqual(metrics.unnamedControls, []);
          assert.deepEqual(metrics.runningMotion.filter(a => a.type !== 'CSSTransition' || !/^(color|background-color|border-.*color|box-shadow|opacity)$/.test(a.property)), [], 'No spatial or repetitive animation with reduced motion');
          if (textScale === 2 && mode === modes[1]) {
            const shot = 'digest-accessibility-' + stamp + '-' + locale + '-' + workspace + '-enlarged.png';
            await page.screenshot({ path: path.join(__dirname, shot), fullPage: true, animations: 'disabled', caret: 'initial' }); result.views.at(-1).screenshot = shot;
          }
          if (style) await style.evaluate(el => el.remove());
          await main.evaluate(root => root.querySelectorAll('[data-owned-text-size]').forEach(el => el.removeAttribute('data-owned-text-size')));
        }
      }
      console.log(JSON.stringify({ locale, width, textScale, views: result.views.length }));
      const shot = 'digest-accessibility-' + stamp + '-' + locale + '-' + width + '-' + textScale + '.png';
      await page.screenshot({ path: path.join(__dirname, shot), fullPage: true, animations: 'disabled', caret: 'initial' });
      result.views.at(-1).screenshot = shot;
    }
    await context.close();
  }
  assert.deepEqual(await effects(), before); result.noBusinessMutations = true; result.passed = true;
}
main().catch(async error => {
  result.passed = false; result.error = f.safe(error, secrets); process.exitCode = 1;
  if (activePage && !activePage.isClosed()) { result.failureScreenshot = 'digest-accessibility-' + stamp + '-failed.png'; await activePage.screenshot({ path: path.join(__dirname, result.failureScreenshot), fullPage: true, animations: 'disabled', caret: 'initial' }).catch(() => {}); }
}).finally(async () => {
  await browser?.close(); result.sourceAfter = hashes(); result.sourceStable = JSON.stringify(result.sourceBefore) === JSON.stringify(result.sourceAfter);
  if (!result.sourceStable) { result.passed = false; process.exitCode = 1; }
  result.textEnlargementMethod = 'Controlled CSS doubling of computed font size and line height; native browser-chrome zoom and screen-reader speech are not claimed.';
  const output = path.join(__dirname, 'digest-accessibility-' + stamp + '.json');
  console.log(JSON.stringify({ output, passed: result.passed, views: result.views.length, error: result.error, sourceStable: result.sourceStable }));
  fs.writeFileSync(output, JSON.stringify(result, null, 2), { flag: 'wx' }); await db.$disconnect();
});
