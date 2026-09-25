const f = require('./statement-recipient-fixtures.cjs'), { db, fs, path, crypto, assert } = f;
const { fixture, snapshot } = require('./verify-tender-access-v131.cjs');
const { chromium, expect: baseExpect } = require('@playwright/test'), expect = baseExpect.configure({ timeout: 60000 });
const { hashPassword } = require(path.join(f.root, 'lib/password.ts'));
const pos = require(path.join(f.root, 'services/pos/pos.service.ts')), { pendingSaleKey } = require(path.join(f.root, 'lib/pos/pending-sale.ts'));
const base = 'http://127.0.0.1:3110', stamp = crypto.randomUUID(), secrets = [];
const files = ['services/pos/cart-revision.ts', 'services/pos/pos.service.ts', 'services/pos/pos.schemas.ts', 'components/pos/ProfessionalPOSSystem.tsx', 'messages/en.json', 'messages/fr.json'];
const hashes = () => Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, file))).digest('hex')]));
const report = { at: new Date().toISOString(), sourcesBefore: hashes(), browser: [] }; let browser;
async function main() {
  await f.helper.withClient(f.target, f.helper.assertOwned);
  browser = await chromium.launch({ headless: true });
  for (const locale of ['en', 'fr']) {
    const x = await fixture('cart-browser-' + locale), { organizationId, userId } = x.ctx;
    const password = 'Owned-cart-' + crypto.randomUUID() + '!'; secrets.push(password);
    const passwordHash = await hashPassword(password);
    const user = await db.user.update({ where: { id: userId }, data: { password: passwordHash, isActive: true, isVerified: true, emailVerified: true } });
    await db.role.create({ data: { organizationId, code: 'administrator', nameEn: 'Owned cashier', permissions: ['dashboard.read', 'pos.read', 'pos.use', 'pos.session.start', 'pos.session.end'], users: { connect: { id: userId } } } });
    await db.account.create({ data: { userId, accountId: userId, providerId: 'credential', password: passwordHash } });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, reducedMotion: 'reduce' });
    const sample = { locale, screenshots: [], pageErrors: [] }; report.browser.push(sample);
    let intercepted = false, finished = false, stable;
    try {
      await context.route('**/*', async route => {
        const request = route.request();
        if (new URL(request.url()).origin !== base) return route.abort();
        if (!intercepted && request.method() === 'POST' && request.headers()['next-action'] && request.postData()?.includes('clientCommitId')) {
          intercepted = true;
          const cart = await pos.getActivePOSCart(x.ctx);
          await pos.updatePOSCartLine({ ...x.ctx, salesOrderId: x.cartId, lineId: cart.lines[0].id, quantity: 2 });
          stable = await snapshot(x);
          const response = await route.fetch();
          assert.equal(await snapshot(x), stable); finished = true;
          return route.fulfill({ response });
        }
        return route.continue();
      });
      assert.equal((await context.request.post(base + '/api/auth/sign-in/email', { data: { email: user.email, password }, headers: { Origin: base }, timeout: 180000 })).status(), 200);
      const page = await context.newPage(); page.setDefaultNavigationTimeout(180000); page.setDefaultTimeout(60000);
      page.on('pageerror', error => sample.pageErrors.push(f.safe(error, secrets)));
      const copy = require(path.join(f.root, 'messages', locale + '.json')).pos, start = Date.now();
      await page.goto(base + '/' + locale + '/dashboard/pos');
      await page.getByLabel(copy.tender.amount, { exact: true }).fill('200'); sample.readyMs = Date.now() - start;
      await page.getByTestId('pos-charge-footer').getByRole('button').click(); await expect.poll(() => finished).toBe(true);
      await expect(page.getByText(copy.recovery.reviewRequired, { exact: true }).first()).toBeVisible(); sample.localizedStaleError = true;
      const panel = page.getByTestId('pos-commit-recovery'), key = pendingSaleKey(organizationId, userId);
      const original = JSON.parse(await page.evaluate(key => sessionStorage.getItem(key), key));
      assert.match(original.request.expectedCartRevision, /^[a-f0-9]{64}$/); sample.staleSubmissionHasNoEffects = true;
      await page.reload();
      const check = panel.getByRole('button', { name: copy.recovery.check, exact: true }); await check.click();
      await expect(panel.getByRole('status')).toHaveText(copy.recovery.cartChanged);
      await expect(panel.getByRole('button', { name: copy.recovery.retryOriginal, exact: true })).toHaveCount(0);
      const review = panel.getByRole('button', { name: copy.recovery.reviewChanged, exact: true }); await review.focus(); await review.press('Enter');
      await expect(panel.getByRole('status')).toHaveText(copy.recovery.reviewReady);
      assert.equal(await snapshot(x), stable); sample.reviewDoesNotSubmit = true;
      assert.equal(JSON.parse(await page.evaluate(key => sessionStorage.getItem(key), key)).request.expectedCartRevision, original.request.expectedCartRevision);
      await page.getByLabel(copy.tender.amount, { exact: true }).fill('200');
      for (const width of [1440, 768, 320]) {
        await page.setViewportSize({ width, height: 1100 }); await panel.evaluate(node => node.scrollIntoView({ block: 'start', behavior: 'instant' }));
        const screenshot = `cart-revision-v134-${locale}-${width}-${stamp}.png`;
        await page.screenshot({ path: path.join(__dirname, screenshot), animations: 'disabled' }); sample.screenshots.push(screenshot);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      }
      const charge = page.getByTestId('pos-charge-footer').getByRole('button'); await charge.focus(); await charge.press('Enter');
      await expect.poll(() => db.pOSCommitResult.count({ where: { organizationId, status: 'COMPLETED' } })).toBe(1);
      await expect(panel).toHaveCount(0);
      const record = await db.pOSCommitResult.findFirstOrThrow({ where: { organizationId } }); assert.equal(record.clientCommitId, original.request.clientCommitId);
      assert.equal(await db.payment.count({ where: { organizationId } }), 1);
      const sale = await db.salesOrder.findUniqueOrThrow({ where: { id: x.cartId } }); assert.equal(Number(sale.total), 200);
      assert.equal(await page.evaluate(key => sessionStorage.getItem(key), key), null);
      assert.equal(sample.pageErrors.length, 0); sample.explicitReviewedConfirmationCommitsOnceWithSameIdentifier = true;
    } finally { await context.close(); }
  }
  report.passed = true;
}
main().catch(error => { report.error = f.safe(error, secrets); process.exitCode = 1; }).finally(async () => {
  report.sourcesAfter = hashes(); report.sourceStable = JSON.stringify(report.sourcesBefore) === JSON.stringify(report.sourcesAfter);
  const file = path.join(__dirname, 'cart-revision-browser-v134-' + stamp + '.json'); console.log(JSON.stringify({ file, ...report }));
  try { fs.writeFileSync(file, JSON.stringify(report, null, 2), { flag: 'wx' }); } finally { await browser?.close(); await db.$disconnect(); }
});
