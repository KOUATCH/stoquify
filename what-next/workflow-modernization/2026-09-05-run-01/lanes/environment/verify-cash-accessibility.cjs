const f = require('./statement-recipient-fixtures.cjs'), {db, fs, path, crypto, assert, helper, root} = f;
const {hashPassword} = require(path.join(root, 'lib/password.ts'));
const {chromium, expect: baseExpect} = require('@playwright/test'), expect = baseExpect.configure({timeout: 60000});
const baseline = process.argv.includes('--baseline'), stamp = crypto.randomUUID(), base = 'http://127.0.0.1:3110', secrets = [];
const files = ['components/cash-command/CashCommandDashboard.tsx', 'components/bi/BICommandBriefHeader.tsx', 'components/bi/BICommandModeTabs.tsx', 'components/dashboard/WorkspaceSectionNavigation.tsx', 'components/bi/BIProofDrawerHost.tsx', 'app/globals.css', 'app/[locale]/(dashboard)/dashboard/layout.tsx'];
const hashes = () => Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')]));
files.push('app/[locale]/(dashboard)/dashboard/finance/cash-command/page.tsx', 'services/cash-command/cash-command.service.ts', 'services/operating-access/operating-access-scope-contracts.ts', 'components/dashboard/DashboardRouteState.tsx');
const receipt = {at: new Date().toISOString(), baseline, sourceBefore: hashes(), views: []}; let browser, page;
async function main() {
  await helper.withClient(f.target, helper.assertOwned);
  const org = await db.organization.findFirstOrThrow({where: {name: {startsWith: helper.prefix + 'Cash visibility presentation'}}, orderBy: {createdAt: 'desc'}}), scope = {organizationId: org.id};
  receipt.organizationId = org.id;
  const password = 'Owned-' + crypto.randomUUID() + '!'; secrets.push(password); const hashed = await hashPassword(password);
  const actor = await db.user.create({data: {...scope, email: stamp + '@example.invalid', password: hashed, isActive: true, isVerified: true, emailVerified: true}});
  await db.account.create({data: {userId: actor.id, accountId: actor.id, providerId: 'credential', password: hashed}});
  const role = await db.role.findFirst({where: {...scope, code: 'administrator'}});
  if (role) {
    assert.equal(role.nameEn, 'Owned cash accessibility reader');
    await db.role.update({where: {id: role.id}, data: {users: {connect: {id: actor.id}}}});
  } else await db.role.create({data: {...scope, code: 'administrator', nameEn: 'Owned cash accessibility reader', permissions: ['dashboard.read', 'finance.read', 'payroll.payments.reconcile', 'payments.reconciliation.read', 'payroll.command.read', 'payroll.declarations.manage', 'CASH_DRAWER_READ', 'inventory.read', 'inventory.items.read', 'accounting.close.read', 'accounting.journal.read', 'purchases.orders.read'], users: {connect: {id: actor.id}}}});
  const effects = async () => ({journals: await db.journalEntry.count({where: scope}), payments: await db.payment.count({where: scope}), balances: await db.payrollEmployeeBalanceCase.findMany({where: scope, select: {id: true, outstandingAmount: true, status: true, updatedAt: true}, orderBy: {id: 'asc'}})});
  const before = JSON.stringify(await effects()); browser = await chromium.launch({headless: true});
  for (const locale of baseline ? ['fr'] : ['en', 'fr']) for (const width of baseline ? [320] : [320, 768, 1440]) {
    const context = await browser.newContext({viewport: {width, height: 1000}, reducedMotion: 'reduce'});
    await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
    assert.equal((await context.request.post(base + '/api/auth/sign-in/email', {headers: {Origin: base}, data: {email: actor.email, password}, timeout: 60000})).status(), 200);
    page = await context.newPage(); const errors = []; page.on('pageerror', e => errors.push(f.safe(e, secrets)));
    receipt.stage = locale + '/' + width;
    await page.goto(base + '/' + locale + '/dashboard/finance/cash-command', {waitUntil: 'domcontentloaded', timeout: 180000});
    const content = page.locator('.dashboard-landing-content'); await expect(content.getByRole('heading', {name: locale === 'fr' ? 'Synthèse de trésorerie' : 'Cash command brief', exact: true})).toBeVisible();
    const mainCount = await page.getByRole('main').count(), h1Count = await content.locator('h1').count();
    await page.addScriptTag({path: require.resolve('axe-core')});
    const scan = await page.evaluate(async () => {const r = await window.axe.run('.dashboard-landing-content', {runOnly: {type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']}}); const summarize = rows => rows.map(row => ({id: row.id, impact: row.impact, nodes: row.nodes.map(node => ({target: node.target, html: node.html, any: node.any}))})); return {violations: summarize(r.violations), incomplete: summarize(r.incomplete)};});
    const viewport = {locale, width, mainCount, h1Count, scan, states: []}; receipt.views.push(viewport);
    for (const scale of [1, 2]) {
      const enlargement = scale === 2 ? await content.evaluate(root => Array.from(root.querySelectorAll('*')).map((el, i) => {const s = getComputedStyle(el); el.setAttribute('data-owned-text-size', String(i)); return `[data-owned-text-size="${i}"]{font-size:${parseFloat(s.fontSize) * 2}px!important;line-height:${s.lineHeight === 'normal' ? 'normal' : parseFloat(s.lineHeight) * 2 + 'px'}!important;}`;}).join('\n')) : null;
      const style = enlargement ? await page.addStyleTag({content: enlargement}) : null;
      for (const mode of locale === 'fr' ? ['Synthèse', 'Pilotage', 'Examiner'] : ['Brief', 'Command', 'Investigate']) {
        const button = content.getByRole('button', {name: mode, exact: true}); await expect(button).toBeEnabled(); await button.focus(); await page.keyboard.press('Enter'); await expect(button).toHaveAttribute('aria-pressed', 'true');
        const metrics = await content.evaluate(root => {
          const visible = el => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden';
          const controls = Array.from(root.querySelectorAll('button,a')).filter(visible);
          const overflow = controls.filter(el => {const box = el.getBoundingClientRect(), walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let text; while ((text = walker.nextNode())) {if (!text.textContent.trim() || getComputedStyle(text.parentElement).clip !== 'auto') continue; const range = document.createRange(); range.selectNodeContents(text); if (Array.from(range.getClientRects()).some(r => r.width > 0 && (r.left < box.left - 1 || r.right > box.right + 1 || r.top < box.top - 1 || r.bottom > box.bottom + 1))) return true;} return false;}).map(el => ({text: el.textContent.trim().slice(0, 120), className: el.className}));
          return {documentWidth: document.documentElement.scrollWidth, reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches, focusVisible: document.activeElement.matches(':focus-visible'), overflowingControls: overflow, truncatedLabels: Array.from(root.querySelectorAll('.truncate')).filter(el => el.scrollWidth > el.clientWidth).map(el => el.textContent.trim()), unnamedControls: controls.filter(el => !el.textContent.trim() && !el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby')).map(el => el.outerHTML.slice(0, 120))};
        });
        viewport.states.push({scale, mode, ...metrics});
        if (!baseline) {assert.ok(metrics.documentWidth <= width); assert.ok(metrics.focusVisible && metrics.reducedMotion); assert.deepEqual(metrics.overflowingControls, [], 'Control label clipping'); assert.deepEqual(metrics.truncatedLabels, [], 'Status label clipping'); assert.deepEqual(metrics.unnamedControls, []);}
      }
      const screenshot = 'cash-accessibility-' + stamp + '-' + locale + '-' + width + '-text' + scale + '.png'; await page.screenshot({path: path.join(__dirname, screenshot), fullPage: true, animations: 'disabled'}); viewport.states.at(-1).screenshot = screenshot;
      if (style) await style.evaluate(el => el.remove());
    }
    const nav = page.getByRole('navigation', {name: locale === 'fr' ? 'Sections de la page' : 'Page sections', exact: true});
    const sections = await nav.locator('a').count();
    for (let i = 0; i < sections; i++) {const link = nav.locator('a').nth(i); await link.focus(); await page.keyboard.press('Enter'); const href = await link.getAttribute('href'); assert.equal(new URL(page.url()).hash, href); await expect(page.locator(href)).toBeInViewport();}
    viewport.sectionKeyboardLinks = sections; assert.deepEqual(errors, []); viewport.noPageErrors = true;
    if (!baseline) {assert.equal(mainCount, 1); assert.equal(h1Count, 1); assert.deepEqual(scan.violations, []);}
    await context.close(); console.log(locale + '/' + width + ': checked');
  }
  if (!baseline) {
    const denied = await db.user.create({data: {...scope, email: 'denied-' + stamp + '@example.invalid', password: hashed, isActive: true, isVerified: true, emailVerified: true}});
    await db.account.create({data: {userId: denied.id, accountId: denied.id, providerId: 'credential', password: hashed}});
    await db.role.create({data: {...scope, code: 'cash-denied-' + stamp, nameEn: 'Owned cash scope-limited reader', permissions: ['dashboard.read', 'finance.read'], users: {connect: {id: denied.id}}}});
    receipt.denied = [];
    for (const locale of ['en', 'fr']) {
      const context = await browser.newContext({viewport: {width: locale === 'fr' ? 320 : 1440, height: 1000}});
      await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
      assert.equal((await context.request.post(base + '/api/auth/sign-in/email', {headers: {Origin: base}, data: {email: denied.email, password}, timeout: 60000})).status(), 200);
      page = await context.newPage(); const start = Date.now();
      await page.goto(base + '/' + locale + '/dashboard/finance/cash-command', {waitUntil: 'domcontentloaded', timeout: 180000});
      await expect(page.getByRole('heading', {name: locale === 'fr' ? 'Le pilotage de la trésorerie exige une autorisation pour toute l’organisation' : 'Cash Command requires organization-wide authority', exact: true})).toBeVisible();
      await expect(page.getByRole('heading', {name: /Cash command brief|Synthèse de trésorerie/})).toHaveCount(0);
      const link = page.getByRole('link', {name: locale === 'fr' ? 'Retour au tableau de bord' : 'Back to dashboard', exact: true});
      await expect(link).toHaveAttribute('href', '/' + locale + '/dashboard');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      const screenshot = 'cash-accessibility-' + stamp + '-denied-' + locale + '.png';
      await page.screenshot({path: path.join(__dirname, screenshot), fullPage: true});
      receipt.denied.push({locale, observedMs: Date.now() - start, screenshot, localizedRecovery: true, noCashReadModel: true});
      await context.close(); console.log(locale + ': denied state verified');
    }
  }
  assert.equal(JSON.stringify(await effects()), before); receipt.noBusinessMutations = true; receipt.passed = true;
}
main().catch(async error => {receipt.passed = false; receipt.error = f.safe(error, secrets); process.exitCode = 1; if (page && !page.isClosed()) await page.screenshot({path: path.join(__dirname, 'cash-accessibility-' + stamp + '-failed.png'), fullPage: true}).catch(() => {});}).finally(async () => {await browser?.close(); receipt.sourceAfter = hashes(); receipt.sourceStable = JSON.stringify(receipt.sourceBefore) === JSON.stringify(receipt.sourceAfter); receipt.passed = !!receipt.passed && receipt.sourceStable; const file = 'cash-accessibility-' + stamp + '.json'; fs.writeFileSync(path.join(__dirname, file), JSON.stringify(receipt, null, 2) + '\n', {flag: 'wx'}); console.log(JSON.stringify({file, passed: receipt.passed, error: receipt.error})); await db.$disconnect();});
