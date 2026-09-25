const fs = require('node:fs'), path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, 'verify-digest-warnings-mobile.cjs'), 'utf8');
const marker = '  const now = new Date();';
if (!source.includes(marker)) throw new Error('Fixture anchor missing');
let prefix = source.slice(0, source.indexOf(marker));
prefix = prefix.replace('const hashes = () =>', "files.push('middleware.ts', 'app/[locale]/(dashboard)/dashboard/layout.tsx', 'components/auth/EnhancedLoginForm.tsx', 'lib/auth-server.ts', 'lib/security/dashboard-session-recovery.ts');\nconst hashes = () =>");
const body = String.raw`
  const before = await effects(); browser = await chromium.launch({ headless: true });
  for (const locale of ['en', 'fr']) {
    const context = await browser.newContext({ viewport: { width: locale === 'en' ? 1440 : 390, height: 1000 }, reducedMotion: 'reduce' });
    await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
    assert.equal((await context.request.post(base + '/api/auth/sign-in/email', { headers: { Origin: base }, data: { email: actor.email, password }, timeout: 60000 })).status(), 200);
    page = await context.newPage(); const row = { locale, errors: [] }; result.checks.push(row);
    page.on('pageerror', error => row.errors.push(f.safe(error, secrets)));
    const target = '/' + locale + '/dashboard/daily-digest?digest=finance-cash&mode=command';
    await page.goto(base + target, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await expect(page.getByRole('button', { name: locale === 'en' ? 'Command' : 'Pilotage', exact: true })).toHaveAttribute('aria-pressed', 'true');
    const count = await db.session.updateMany({ where: { userId: actor.id }, data: { expiresAt: new Date(Date.now() - 60000) } });
    assert.ok(count.count > 0); row.expiredSyntheticSessions = count.count;
    const expiredResponse = await context.request.get(base + target, { maxRedirects: 0, timeout: 120000 });
    assert.equal((await expiredResponse.text()).includes('983421.78'), false, 'Expired server response must not expose payroll evidence');
    await page.goto(base + target, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await expect(page.locator('#email')).toBeVisible();
    const url = new URL(page.url()); row.recoveryPath = url.pathname; row.callback = url.searchParams.get('callbackUrl');
    assert.equal(url.pathname, '/' + locale + '/login');
    assert.equal((await page.content()).includes('983421.78'), false, 'Expired page must not expose payroll evidence');
    const deniedShot = 'digest-session-' + stamp + '-' + locale + '-expired.png'; await page.screenshot({ path: path.join(__dirname, deniedShot), animations: 'disabled', caret: 'initial' }); row.expiredScreenshot = deniedShot;
    assert.equal(row.callback, target, 'Session recovery must retain the selected Digest and mode');
    await page.locator('#email').fill(actor.email); await page.locator('#password').fill(password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(base + target, { timeout: 120000 });
    await expect(page.getByRole('button', { name: locale === 'en' ? 'Command' : 'Pilotage', exact: true })).toHaveAttribute('aria-pressed', 'true');
    const shot = 'digest-session-' + stamp + '-' + locale + '-restored.png'; await page.screenshot({ path: path.join(__dirname, shot), animations: 'disabled', caret: 'initial' }); row.restoredScreenshot = shot;
    assert.deepEqual(row.errors, []); row.restored = true; console.log(locale + ': expired session and actual form recovery passed'); await context.close();
  }
  assert.equal(await effects(), before); result.noBusinessMutations = true; result.passed = true;
}
main().catch(async error => { result.passed = false; result.error = f.safe(error, secrets); process.exitCode = 1;
  if (page && !page.isClosed()) result.failureState = await page.locator('main').last().innerText({ timeout: 5000 }).then(text => f.safe(text, secrets)).catch(() => 'Unavailable');
}).finally(async () => { await browser?.close(); result.sourceAfter = hashes(); result.sourceStable = JSON.stringify(result.sourceBefore) === JSON.stringify(result.sourceAfter); const output = path.join(__dirname, 'digest-session-' + stamp + '.json'); fs.writeFileSync(output, JSON.stringify(result, null, 2), { flag: 'wx' }); console.log(JSON.stringify({ output, ...result })); await db.$disconnect(); });
`;
fs.writeFileSync(path.join(__dirname, 'verify-digest-session-recovery.cjs'), prefix + body, { flag: 'wx' });
console.log('Created owned session recovery verifier');
