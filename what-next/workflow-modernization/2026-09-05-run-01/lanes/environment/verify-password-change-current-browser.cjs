const f = require('./statement-recipient-fixtures.cjs'), { fs, path, crypto, assert, db, helper } = f;
const { chromium, expect: originalExpect } = require('@playwright/test'), expect = originalExpect.configure({ timeout: 60000 });
const { hashPassword, verifyPassword } = require(path.join(f.root, 'lib/password.ts'));
const { passwordSchema } = require(path.join(f.root, 'lib/security/password-utils.ts'));
const base = 'http://127.0.0.1:3110', stamp = crypto.randomUUID(), owned = [], secrets = [];
const prior = JSON.parse(fs.readFileSync(path.join(__dirname, '../../evidence/password-change-receipt.json')));
const files = [...Object.keys(prior.sources), 'app/globals.css', 'lib/security/rbac.ts', 'components/ui/button.tsx', 'components/ui/input.tsx'];
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const sources = () => Object.fromEntries(files.map(file => [file, hash(fs.readFileSync(path.join(f.root, file)))]));
const report = { at: new Date().toISOString(), sourceBefore: sources(), journeys: [], scope: 'Fresh owned synthetic accounts, actual EN/FR password change and session revocation in existing local application; no live accounts or external messages.' };
const snapshot = async () => hash(JSON.stringify(await Promise.all(['organization', 'user', 'role', 'account', 'passwordHistory', 'auditLog'].map(async model => {
  const where = model === 'organization' ? { id: { notIn: owned } } : ['account', 'passwordHistory'].includes(model) ? { user: { organizationId: { notIn: owned } } } : { organizationId: { notIn: owned } };
  return db[model].findMany({ where, orderBy: { id: 'asc' } });
}))));
function password() { const value = 'Local!' + crypto.randomBytes(16).toString('hex').match(/.{2}/g).join('-') + '-9Q'; assert.ok(passwordSchema.safeParse(value).success); secrets.push(value); return value; }
async function fixture(locale) {
  const org = await db.organization.create({ data: { name: helper.prefix + 'Current password ' + locale + ' ' + stamp, slug: 'password-current-' + locale + '-' + stamp, defaultLocale: locale.toUpperCase() } }); owned.push(org.id);
  const actors = {};
  for (const kind of ['happy', 'denied']) {
    const oldPassword = password(), newPassword = password(), hashed = await hashPassword(oldPassword);
    const role = await db.role.create({ data: { organizationId: org.id, code: 'password-' + kind, nameEn: 'Owned password ' + kind, permissions: ['dashboard.read', 'profile.read', ...(kind === 'happy' ? ['profile.password.update'] : [])] } });
    const user = await db.user.create({ data: { organizationId: org.id, name: 'Owned password ' + kind, email: crypto.randomUUID() + '@example.invalid', password: hashed, isActive: true, isVerified: true, emailVerified: true, verificationToken: crypto.randomBytes(16).toString('hex'), verificationTokenExpires: new Date(Date.now() + 3600000), roles: { connect: { id: role.id } } } });
    await db.account.create({ data: { userId: user.id, accountId: user.id, providerId: 'credential', password: hashed } });
    await db.passwordHistory.create({ data: { userId: user.id, passwordHash: hashed } }); actors[kind] = { user, oldPassword, newPassword };
  }
  return { org, ...actors };
}
async function journey(browser, locale) {
  const x = await fixture(locale), t = JSON.parse(fs.readFileSync(path.join(f.root, 'messages', locale + '.json'))).passwordChange;
  const row = { locale, organizationId: x.org.id, screenshots: [], scans: [], contrast: [], errors: [] }; report.journeys.push(row);
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', locale: locale === 'fr' ? 'fr-FR' : 'en-GB' });
  context.setDefaultTimeout(60000); context.setDefaultNavigationTimeout(180000);
  await context.route('**/*', route => { const url = new URL(route.request().url()); if ([...url.searchParams.keys()].some(k => /password/i.test(k))) { row.credentialUrlRequest = true; return route.abort(); } return url.origin === base ? route.continue() : route.abort(); });
  const page = await context.newPage(); page.on('pageerror', e => row.errors.push(f.safe(e, secrets))); page.on('console', m => { if (m.text().includes('MISSING_MESSAGE')) row.errors.push(f.safe(m.text(), secrets)); });
  const login = async (ctx, actor, credential) => (await ctx.request.post(base + '/api/auth/sign-in/email', { data: { email: actor.user.email, password: credential }, headers: { Origin: base }, timeout: 180000 })).status();
  const panel = () => page.getByRole('region', { name: t.title, exact: true });
  const shot = async label => { const file = 'password-current-' + stamp + '-' + locale + '-' + label + '.png'; await page.screenshot({ path: path.join(__dirname, file), animations: 'disabled', mask: [page.locator('input[type=password],input[name=oldPassword],input[name=newPassword]')] }); row.screenshots.push(file); };
  async function inspect(stage) {
    await panel().evaluate(el => el.setAttribute('data-owned-password', 'true'));
    if (!await page.evaluate(() => Boolean(window.axe))) await page.addScriptTag({ path: require.resolve('axe-core') });
    const scan = await page.evaluate(async () => { const r = await window.axe.run('[data-owned-password]', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } }); return { violations: r.violations, incomplete: r.incomplete }; });
    row.scans.push({ stage, ...scan }); assert.deepEqual(scan.violations, []);
    const nodes = await panel().evaluate(el => [...el.querySelectorAll('h1,h2,p,label,button,a')].filter(n => n.textContent.trim() && n.getClientRects().length && getComputedStyle(n).clip === 'auto' && !n.closest(':disabled')).map((n, i) => { n.setAttribute('data-owned-password-text', String(i)); return { target: ['[data-owned-password-text="' + i + '"]'], any: [{ id: 'color-contrast', data: { expectedContrastRatio: '4.5:1' } }] }; }));
    for (const width of [320, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width, 'No horizontal overflow: ' + stage);
      const measured = await require('./measure-rendered-contrast.cjs')(page, nodes); row.contrast.push({ stage, width, measured }); assert.ok(measured.length >= 8 && measured.every(v => v.measured && v.passes), 'Rendered text contrast: ' + stage + '/' + width);
      await shot(stage + '-' + width);
    }
    await page.setViewportSize({ width: 320, height: 1000 });
    const zoom = await page.addStyleTag({ content: '[data-owned-password] { font-size: 200% !important; } [data-owned-password] :is(h1,h2,p,label,button,a,input) { font-size: 1.2em !important; line-height: 1.5 !important; } [data-owned-password] h1 { font-size: 2em !important; }' });
    try { assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 320, 'Controlled enlarged text reflow'); await shot(stage + '-enlarged'); }
    finally { await zoom.evaluate(el => el.remove()); }
    await page.setViewportSize({ width: 1440, height: 1000 });
  }
  try {
    assert.equal(await login(context, x.denied, x.denied.oldPassword), 200);
    const url = base + '/' + locale + '/dashboard/change-password'; await page.goto(url); await expect(page.getByRole('heading', { name: t.deniedTitle, exact: true })).toBeVisible(); assert.equal(await page.locator('input[name=oldPassword]').count(), 0);
    await page.getByRole('button', { name: t.accountMenu, exact: true }).click(); await expect(page.getByRole('menuitem', { name: t.title, exact: true })).toHaveCount(0); await page.keyboard.press('Escape'); await shot('denied'); await context.clearCookies();
    assert.equal(await login(context, x.happy, x.happy.oldPassword), 200);
    const second = await browser.newContext(); try { assert.equal(await login(second, x.happy, x.happy.oldPassword), 200); } finally { await second.close(); }
    const sessions = await db.session.findMany({ where: { userId: x.happy.user.id }, select: { id: true } }); assert.ok(sessions.length >= 2);
    const start = Date.now(); await page.goto(url); await expect(page.getByLabel(t.oldPassword, { exact: true })).toBeEnabled(); row.entryMs = Date.now() - start;
    await page.getByRole('button', { name: t.accountMenu, exact: true }).focus(); await page.keyboard.press('Enter'); await page.getByRole('menuitem', { name: t.title, exact: true }).click();
    await expect(page.getByLabel(t.oldPassword, { exact: true })).toHaveAttribute('type', 'password'); await expect(panel().locator('form')).toHaveAttribute('method', 'post'); await inspect('ready');
    const old = page.getByLabel(t.oldPassword, { exact: true }), next = page.getByLabel(t.newPassword, { exact: true }), submit = page.getByRole('button', { name: t.submit, exact: true });
    await old.fill('Owned-Wrong!Current-57'); await next.fill(x.happy.newPassword); await submit.click(); await expect(panel().getByRole('alert')).toContainText(t.errors.credentials); await expect(panel().getByRole('alert')).toBeFocused(); await inspect('wrong-password');
    await old.fill(x.happy.oldPassword); await next.fill('Weak!aaaLocal-57'); await submit.click(); await expect(panel().getByRole('alert')).toContainText(t.errors.weak); await expect(panel().getByRole('alert')).toBeFocused(); await shot('policy');
    await next.fill(x.happy.newPassword); let aborted = 0;
    const fault = route => { if (route.request().method() === 'POST' && route.request().headers()['next-action']) { aborted++; return route.abort('connectionfailed'); } return route.fallback(); };
    await page.route('**/dashboard/change-password', fault); await submit.click(); await expect(panel().getByRole('alert')).toContainText(t.errors.unknown); await expect(panel().getByRole('alert')).toBeFocused(); await expect(old).toHaveValue(x.happy.oldPassword); await expect(next).toHaveValue(x.happy.newPassword); assert.equal(aborted, 1);
    assert.equal(await db.passwordHistory.count({ where: { userId: x.happy.user.id } }), 1); await inspect('transport-recovery'); await page.unroute('**/dashboard/change-password', fault);
    const saveStart = Date.now(); await submit.focus(); await page.keyboard.press('Enter'); await page.waitForURL('**/' + locale + '/login-v2?notice=password-change', { timeout: 120000 }); await expect(page.getByRole('note').filter({ hasText: t.signInAfterChange })).toBeVisible(); row.saveMs = Date.now() - saveStart; await shot('sign-in-handoff');
    const user = await db.user.findUniqueOrThrow({ where: { id: x.happy.user.id } }), account = await db.account.findFirstOrThrow({ where: { userId: user.id, providerId: 'credential' } });
    assert.ok(await verifyPassword(x.happy.newPassword, user.password)); assert.ok(await verifyPassword(x.happy.newPassword, account.password)); assert.equal(user.verificationToken, null);
    assert.equal(await db.session.count({ where: { id: { in: sessions.map(v => v.id) } } }), 0); assert.equal(await db.passwordHistory.count({ where: { userId: user.id } }), 2); assert.equal(await db.auditLog.count({ where: { userId: user.id, action: 'AUTH_PASSWORD_CHANGED' } }), 1);
    assert.equal(await login(context, x.happy, x.happy.oldPassword), 401); assert.equal(await login(context, x.happy, x.happy.newPassword), 200);
    await page.goto(url); await expect(page.getByLabel(t.oldPassword, { exact: true })).toHaveValue(''); await shot('signed-in-again');
    row.oldPasswordRejected = true; row.newPasswordAccepted = true; row.revokedSessions = sessions.length; row.oneAudit = true; row.draftPreservedAfterTransport = true;
    assert.deepEqual(row.errors, []); assert.ok(!row.credentialUrlRequest); row.passed = true;
  } catch (error) { row.error = f.safe(error, secrets); await shot('failure').catch(() => {}); throw error; }
  finally { await context.close(); }
}
let browser;
(async () => { await helper.withClient(f.target, helper.assertOwned); report.originalBefore = await snapshot(); browser = await chromium.launch({ headless: true }); for (const locale of ['en', 'fr']) await journey(browser, locale); report.originalUnchanged = report.originalBefore === await snapshot(); assert.equal(report.originalUnchanged, true); report.passed = true; })()
  .catch(error => { report.error = f.safe(error, secrets); report.passed = false; })
  .finally(async () => { await browser?.close(); await db.$disconnect(); report.sourceAfter = sources(); report.sourceStable = JSON.stringify(report.sourceBefore) === JSON.stringify(report.sourceAfter); report.driverSha256 = hash(fs.readFileSync(__filename)); const file = 'password-current-browser-' + stamp + '.json'; fs.writeFileSync(path.join(__dirname, file), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify({ file, passed: report.passed, sourceStable: report.sourceStable, originalUnchanged: report.originalUnchanged, error: report.error, journeys: report.journeys.map(row => ({ locale: row.locale, passed: row.passed, error: row.error })) })); process.exitCode = report.passed && report.sourceStable ? 0 : 1; });
