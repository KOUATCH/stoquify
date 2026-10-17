const f = require('./statement-recipient-fixtures.cjs'), {db, fs, path, crypto, assert, helper, root} = f;
const {hashPassword} = require(path.join(root, 'lib/password.ts'));
const {chromium, expect: baseExpect} = require('@playwright/test'), expect = baseExpect.configure({timeout: 60000});
const measure = require('./measure-rendered-contrast.cjs');
const stamp = crypto.randomUUID(), base = 'http://127.0.0.1:3110', secrets = [];
const review = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../evidence/cash-accessibility-review-2026-09-30.json')));
const files = [...Object.keys(review.sourceHashes), 'services/cash-command/cash-command-sources.service.ts', 'components/finance/finance-dashboard-theme.ts'];
files.push('components/cash-command/cash-command.module.css');
const hashes = () => Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')]));
const receipt = {at: new Date().toISOString(), sourceBefore: hashes(), views: [], routeSamples: [], serviceSamples: [], environment: 'Owned local development app; synthetic data; no production performance inference'};
let browser, page;
async function main() {
  await helper.withClient(f.target, helper.assertOwned);
  const org = await db.organization.findFirstOrThrow({where: {name: {startsWith: helper.prefix + 'Cash visibility presentation'}}, orderBy: {createdAt: 'desc'}}), scope = {organizationId: org.id};
  const role = await db.role.findFirstOrThrow({where: {...scope, code: 'administrator'}}); assert.equal(role.nameEn, 'Owned cash accessibility reader');
  const password = 'Owned-' + crypto.randomUUID() + '!'; secrets.push(password); const hashed = await hashPassword(password);
  const actor = await db.user.create({data: {...scope, email: stamp + '@example.invalid', password: hashed, isActive: true, isVerified: true, emailVerified: true}});
  await db.account.create({data: {userId: actor.id, accountId: actor.id, providerId: 'credential', password: hashed}});
  await db.role.update({where: {id: role.id}, data: {users: {connect: {id: actor.id}}}});
  const effects = async () => ({journals: await db.journalEntry.count({where: scope}), payments: await db.payment.count({where: scope}), balances: await db.payrollEmployeeBalanceCase.findMany({where: scope, select: {id: true, outstandingAmount: true, status: true, updatedAt: true}, orderBy: {id: 'asc'}})});
  const before = JSON.stringify(await effects());
  const {getCashCommandData} = require(path.join(root, 'services/cash-command/cash-command.service.ts'));
  for (let sample = 0; sample < 3; sample++) {
    const start = performance.now(); const data = await getCashCommandData({...scope, actorId: actor.id, actorPermissions: role.permissions, actorRoleCodes: [role.code]});
    assert.equal(data.organizationId, org.id);
    receipt.serviceSamples.push({sample, milliseconds: performance.now() - start, cards: data.cards.length, restrictedCapabilities: data.restrictedCapabilities});
  }
  console.log('Actual service baseline recorded'); browser = await chromium.launch({headless: true});
  for (const [locale, width] of [['en', 1440], ['fr', 320]]) {
    const context = await browser.newContext({viewport: {width, height: 1000}, reducedMotion: 'reduce'});
    await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
    assert.equal((await context.request.post(base + '/api/auth/sign-in/email', {headers: {Origin: base}, data: {email: actor.email, password}, timeout: 60000})).status(), 200);
    page = await context.newPage(); const errors = []; page.on('pageerror', error => errors.push(f.safe(error, secrets)));
    for (let sample = 0; sample < 3; sample++) {
      const start = performance.now();
      await page.goto(base + '/' + locale + '/dashboard/finance/cash-command', {waitUntil: 'domcontentloaded', timeout: 180000});
      const content = page.locator('.dashboard-landing-content');
      await expect(content.getByRole('heading', {name: locale === 'fr' ? 'Synthèse de trésorerie' : 'Cash command brief', exact: true})).toBeVisible();
      const contentReadyMs = performance.now() - start;
      await expect(content.getByRole('button', {name: locale === 'fr' ? 'Synthèse' : 'Brief', exact: true})).toBeEnabled();
      receipt.routeSamples.push({locale, width, sample, contentReadyMs, interactiveMs: performance.now() - start, navigation: await page.evaluate(() => {const n = performance.getEntriesByType('navigation')[0]; return {responseStart: n.responseStart, responseEnd: n.responseEnd, domContentLoaded: n.domContentLoadedEventEnd};})});
    }
    await page.addScriptTag({path: require.resolve('axe-core')});
    const scan = await page.evaluate(async () => {const result = await window.axe.run('.dashboard-landing-content', {runOnly: {type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']}}); return {violations: result.violations.map(row => ({id: row.id, nodes: row.nodes.map(node => ({target: node.target, any: node.any}))})), incomplete: result.incomplete.map(row => ({id: row.id, nodes: row.nodes.map(node => ({target: node.target, any: node.any}))}))};});
    const nodes = scan.incomplete.find(row => row.id === 'color-contrast')?.nodes ?? [];
    const rendered = await measure(page, nodes);
    const view = {locale, width, scan, rendered}; receipt.views.push(view);
    for (let i = 0; i < rendered.length; i++) {
      if (rendered[i].measured || rendered[i].disabled || rendered[i].unsupported?.length) continue;
      await page.locator(nodes[i].target[0]).first().evaluate(el => el.scrollIntoView({block: 'nearest', inline: 'nearest', behavior: 'instant'}));
      rendered[i] = {...(await measure(page, [nodes[i]]))[0], measuredAfterScroll: true};
    }
    await page.evaluate(() => scrollTo({top: 0, behavior: 'instant'}));
    const screenshot = 'cash-contrast-latency-' + stamp + '-' + locale + '.png'; await page.screenshot({path: path.join(__dirname, screenshot), animations: 'disabled'}); view.screenshot = screenshot;
    view.actionStates = [];
    const action = page.locator('.dashboard-landing-content .dashboard-button-primary');
    if (await action.count()) {
      const node = {target: ['.dashboard-landing-content .dashboard-button-primary'], any: [{id: 'color-contrast', data: {expectedContrastRatio: '4.5:1'}}]};
      await action.hover(); view.actionStates.push({state: 'hover', contrast: (await measure(page, [node]))[0]});
      await page.mouse.move(0, 0); await page.keyboard.press('Tab'); await action.focus();
      view.actionStates.push({state: 'keyboard-focus', visible: await action.evaluate(el => el.matches(':focus-visible')), contrast: (await measure(page, [node]))[0]});
    }
    view.failedContrast = rendered.filter(row => row.measured && !row.passes);
    view.unmeasured = rendered.filter(row => !row.measured).map(row => ({target: row.target, text: row.text, reason: row.reason, unsupported: row.unsupported, disabled: row.disabled}));
    view.errors = errors; assert.deepEqual(errors, []); console.log(JSON.stringify({locale, measured: rendered.filter(row => row.measured).length, failures: view.failedContrast.length, unmeasured: view.unmeasured.length}));
    await context.close();
  }
  assert.equal(JSON.stringify(await effects()), before); receipt.noBusinessMutations = true;
  receipt.contrastComplete = receipt.views.every(view => !view.failedContrast.length && view.unmeasured.every(row => row.disabled) && !view.scan.violations.length && view.actionStates.length === 2 && view.actionStates.every(row => row.contrast.measured && row.contrast.passes && (row.state !== 'keyboard-focus' || row.visible)));
  receipt.observationCompleted = true;
}
main().catch(error => {receipt.observationCompleted = false; receipt.error = f.safe(error, secrets); process.exitCode = 1;}).finally(async () => {
  await browser?.close(); receipt.sourceAfter = hashes(); receipt.sourceStable = JSON.stringify(receipt.sourceBefore) === JSON.stringify(receipt.sourceAfter);
  receipt.observationCompleted = !!receipt.observationCompleted && receipt.sourceStable;
  const file = 'cash-contrast-latency-' + stamp + '.json'; fs.writeFileSync(path.join(__dirname, file), JSON.stringify(receipt, null, 2) + '\n', {flag: 'wx'}); console.log(JSON.stringify({file, observationCompleted: receipt.observationCompleted, contrastComplete: receipt.contrastComplete, error: receipt.error})); await db.$disconnect();
});
