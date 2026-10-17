const f = require('./statement-recipient-fixtures.cjs'), {db, fs, path, crypto, assert, helper, root} = f;
const {hashPassword} = require(path.join(root, 'lib/password.ts'));
const {chromium, expect: baseExpect} = require('@playwright/test'), expect = baseExpect.configure({timeout: 60000});
const expectedMain = Number(process.argv[2]); assert.ok([1, 2].includes(expectedMain));
const base = 'http://127.0.0.1:3110', stamp = crypto.randomUUID(), secrets = [];
const files = ['components/payroll/PayrollRunWorkbench.tsx', 'components/payroll/PayrollRegisterTieOut.tsx', 'app/[locale]/(dashboard)/dashboard/layout.tsx', 'app/[locale]/(dashboard)/dashboard/payroll/runs/page.tsx', 'app/[locale]/(dashboard)/dashboard/payroll/register/page.tsx'];
const hashes = () => Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')]));
const receipt = {at: new Date().toISOString(), expectedMain, sourceBefore: hashes(), checks: []}; let browser, page;
async function main() {
  await helper.withClient(f.target, helper.assertOwned);
  const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'payroll-release-proof-22041471-22ee-4ac5-8167-2517618c43e9.json')));
  const run = await db.payrollRun.findUniqueOrThrow({where: {id: fixture.result.payrollRunId}}), scope = {organizationId: run.organizationId};
  assert.ok((await db.organization.findUniqueOrThrow({where: {id: scope.organizationId}})).name.startsWith(helper.prefix));
  const password = 'Owned-' + crypto.randomUUID() + '!'; secrets.push(password); const hashed = await hashPassword(password);
  const actor = await db.user.create({data: {...scope, email: stamp + '@example.invalid', password: hashed, isActive: true, isVerified: true, emailVerified: true}});
  await db.account.create({data: {userId: actor.id, accountId: actor.id, providerId: 'credential', password: hashed}});
  await db.role.create({data: {...scope, code: 'landmarks-' + stamp, nameEn: 'Owned payroll reader', permissions: ['dashboard.read', 'finance.read', 'payroll.command.read', 'payroll.runs.read', 'payroll.reports.read', 'payroll.payslips.read'], users: {connect: {id: actor.id}}}});
  browser = await chromium.launch({headless: true});
  for (const locale of ['en', 'fr']) for (const width of expectedMain === 2 ? [1440] : [320, 768, 1440]) {
    const context = await browser.newContext({viewport: {width, height: 1000}, reducedMotion: 'reduce'});
    await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
    assert.equal((await context.request.post(base + '/api/auth/sign-in/email', {headers: {Origin: base}, data: {email: actor.email, password}, timeout: 60000})).status(), 200);
    page = await context.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
    for (const route of ['runs', 'register?runId=' + run.id]) {
      receipt.stage = locale + '/' + width + '/' + route;
      const before = Date.now(); await page.goto(base + '/' + locale + '/dashboard/payroll/' + route, {waitUntil: 'domcontentloaded', timeout: 180000});
      const isRun = route === 'runs';
      await expect(page.getByRole('heading', {level: 1, name: isRun ? 'Run lifecycle workbench' : 'Payroll register', exact: true})).toBeVisible();
      await expect(page.getByRole('main')).toHaveCount(expectedMain);
      await expect(page.getByRole('main').first().getByRole('heading', {level: 1})).toHaveCount(1);
      const mainCount = await page.getByRole('main').count();
      const link = isRun ? page.getByRole('main').first().getByRole('link', {name: 'Register', exact: true}).first() : page.getByRole('link', {name: locale === 'fr' ? 'Consulter les preuves de règlement' : 'Review settlement evidence', exact: true});
      await link.focus(); await expect(link).toBeFocused();
      const focus = await link.evaluate(el => {const s = getComputedStyle(el); const probe = document.createElement('span'); probe.style.color = 'var(--dash-brand)'; el.appendChild(probe); const brandColor = getComputedStyle(probe).color; probe.remove(); return {outlineStyle: s.outlineStyle, outlineWidth: s.outlineWidth, outlineColor: s.outlineColor, brandColor, boxShadow: s.boxShadow};});
      if (expectedMain === 1) {assert.equal(focus.outlineWidth, '2px'); assert.equal(focus.outlineStyle, 'solid'); assert.equal(focus.outlineColor, focus.brandColor);}
      const screenshot = 'payroll-landmarks-' + stamp + '-' + locale + '-' + width + '-' + (isRun ? 'runs' : 'register') + '.png';
      await page.screenshot({path: path.join(__dirname, screenshot), animations: 'disabled'});
      assert.deepEqual(errors, []);
      receipt.checks.push({locale, width, route, mainCount, onePageHeading: true, keyboardFocus: true, focus, elapsedMs: Date.now() - before, screenshot});
      if (isRun) {await page.keyboard.press('Enter'); await expect(page).toHaveURL(new RegExp('/' + locale + '/dashboard/payroll/register')); await expect(page.getByRole('heading', {level: 1, name: 'Payroll register', exact: true})).toBeVisible();}
    }
    await context.close();
  }
  receipt.passed = true;
}
main().catch(async e => {receipt.passed = false; receipt.error = f.safe(e, secrets); process.exitCode = 1; if (page && !page.isClosed()) await page.screenshot({path: path.join(__dirname, 'payroll-landmarks-' + stamp + '-failed.png')}).catch(() => {});}).finally(async () => {
  await browser?.close(); receipt.sourceAfter = hashes(); receipt.sourceStable = JSON.stringify(receipt.sourceBefore) === JSON.stringify(receipt.sourceAfter); receipt.passed = !!receipt.passed && receipt.sourceStable;
  const file = 'payroll-landmarks-' + stamp + '.json'; fs.writeFileSync(path.join(__dirname, file), JSON.stringify(receipt, null, 2) + '\n', {flag: 'wx'});
  console.log(JSON.stringify({file, passed: receipt.passed, stage: receipt.stage, error: receipt.error})); await db.$disconnect();
});
