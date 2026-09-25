const f = require('./statement-recipient-fixtures.cjs'), { db, fs, path, crypto, assert } = f;
const { hashPassword } = require(path.join(f.root, 'lib/password.ts'));
const { chromium, expect: baseExpect } = require('@playwright/test'), expect = baseExpect.configure({ timeout: 60000 });
const base = 'http://127.0.0.1:3110', stamp = crypto.randomUUID(), secrets = [];
const files = ['services/bi/bi-contracts.ts', 'services/bi/bi-evidence-adapter.service.ts', 'services/daily-habit/daily-habit-digest.service.ts', 'components/bi/BIRiskOpportunityRadar.tsx', 'components/bi/BICommandModeTabs.tsx', 'components/bi/BICommandBriefHeader.tsx', 'components/evidence/EvidenceGradeBadge.tsx', 'components/daily-habit/DailyHabitDigestDashboard.tsx'];
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
  for (const locale of process.argv.includes('--french-mobile') ? ['fr'] : ['en', 'fr']) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
    assert.equal((await context.request.post(base + '/api/auth/sign-in/email', { headers: { Origin: base }, data: { email: actor.email, password } })).status(), 200);
    const page = await context.newPage(), row = { locale, screenshots: [], errors: [], accessibility: [] }; result.browser.push(row);
    currentPage = page;
    page.on('pageerror', error => row.errors.push(f.safe(error, secrets)));
    await page.goto(base + `/${locale}/dashboard/daily-digest`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    const command = page.getByRole('button', { name: locale === 'en' ? 'Command' : 'Pilotage', exact: true }); await expect(command).toBeEnabled(); await command.focus(); await page.keyboard.press('Enter');
    await expect(command).toHaveAttribute('aria-pressed', 'true');
    const region = page.getByRole('region', { name: locale === 'en' ? 'Actions and risks' : 'Actions et risques', exact: true });
    for (const width of process.argv.includes('--french-mobile') ? [320] : [1440, 768, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      const urgency = region.getByText(locale === 'en' ? 'Urgency not assessed' : 'Urgence non évaluée', { exact: true });
      await expect(urgency).toBeVisible(); await expect(region.getByText('1 signal', { exact: true })).toBeVisible();
      if (locale === 'fr') {
        await expect(region.getByText('Les retards de réception peuvent signaler un risque fournisseur, une rupture de stock ou un décalage des échéances fournisseurs.', { exact: true })).toBeVisible();
        await expect(region.getByText('purchases.orders.read', { exact: true })).toHaveCount(0);
      }
      await expect(region.getByText(locale === 'en' ? 'Soon' : 'Bientôt', { exact: true })).toHaveCount(0);
      await urgency.scrollIntoViewIfNeeded(); const shot = `digest-urgency-${stamp}-${locale}-${width}.png`; await page.screenshot({ path: path.join(__dirname, shot), caret: 'initial', animations: 'disabled' }); row.screenshots.push(shot);
      assert.equal(await region.evaluate(el => el.scrollWidth > el.clientWidth + 1), false);
      if (width !== 768) {
        await page.addScriptTag({ path: require.resolve('axe-core') });
        const scan = await page.evaluate(async () => {
          const report = await window.axe.run('#daily-digest-view', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } });
          return { violations: report.violations.map(v => ({ id: v.id, impact: v.impact, description: v.description, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })), incomplete: report.incomplete.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })), passes: report.passes.map(v => v.id) };
        });
        row.accessibility.push({ width, ...scan });
        assert.equal(scan.violations.some(value => value.id === 'aria-prohibited-attr'), false);
        assert.equal(scan.incomplete.some(value => value.id === 'aria-prohibited-attr'), false);
        const session = await context.newCDPSession(page);
        const tree = await session.send('Accessibility.getFullAXTree');
        const names = tree.nodes.filter(node => !node.ignored && node.role?.value === 'StaticText').map(node => node.name?.value || '');
        const evidenceText = names.filter(name => /evidence|preuve|raw|brut/i.test(name));
        row.accessibility[row.accessibility.length - 1].evidenceText = evidenceText;
        assert(names.some(name => name.trim().startsWith(locale === 'en' ? 'evidence:' : 'preuve:')));
        row.accessibility[row.accessibility.length - 1].evidenceTextExposedInChromium = true;
        await session.detach();
      }
    }
    assert.deepEqual(row.errors, []); await context.close();
  }
  assert.deepEqual(await effects(), before); assert.equal((await db.purchaseOrder.findUniqueOrThrow({ where: { id: order.id } })).status, 'SUBMITTED'); result.noFinancialEffects = true; result.passed = true;
}
main().catch(async error => { result.passed = false; result.error = f.safe(error, secrets); process.exitCode = 1;
  if (currentPage && !currentPage.isClosed()) result.failureState = await currentPage.locator('main').last().innerText({ timeout: 5000 }).then(text => f.safe(text, secrets)).catch(() => 'Unable to read failure state');
}).finally(async () => {
  if (browser) await browser.close(); result.sourceAfter = hashes(); result.sourceStable = JSON.stringify(result.sourceBefore) === JSON.stringify(result.sourceAfter);
  const output = path.join(__dirname, 'digest-urgency-' + stamp + '.json'); fs.writeFileSync(output, JSON.stringify(result, null, 2), { flag: 'wx' }); console.log(JSON.stringify({ output, passed: result.passed, error: result.error, browser: result.browser.map(r => ({ locale: r.locale, errors: r.errors, accessibility: r.accessibility })) })); await db.$disconnect();
});
