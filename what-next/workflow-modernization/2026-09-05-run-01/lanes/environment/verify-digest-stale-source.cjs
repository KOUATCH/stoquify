const f = require('./statement-recipient-fixtures.cjs'), { db, fs, path, crypto, assert } = f;
const { hashPassword } = require(path.join(f.root, 'lib/password.ts'));
const { chromium, expect: baseExpect } = require('@playwright/test'), expect = baseExpect.configure({ timeout: 60000 });
const base = 'http://127.0.0.1:3110', stamp = crypto.randomUUID(), secrets = [];
const files = ['services/snapshots/payment-truth-snapshot.service.ts', 'services/daily-habit/daily-habit-digest.service.ts', 'services/daily-habit/daily-habit-signal-presentation.ts', 'lib/dashboard/snapshot-blocker-presentation.ts'];
files.push('components/daily-habit/DailyHabitDigestDashboard.tsx');
files.push('components/bi/BIEvidenceBadgeRow.tsx', 'lib/dashboard/bi-presentation.ts', 'services/snapshots/snapshot-utils.ts');
const hashes = () => Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, file))).digest('hex')]));
const result = { at: new Date().toISOString(), sourceBefore: hashes(), browser: [] }; let browser, page;
async function main() {
  await f.helper.withClient(f.target, f.helper.assertOwned);
  const org = await db.organization.create({ data: { name: f.helper.prefix + 'Payment digest ' + stamp, slug: 'payment-digest-' + stamp, currency: 'XAF', requestedModules: ['purchasing', 'finance', 'accounting', 'payment_reconciliation'] } });
  const password = 'Owned-' + crypto.randomUUID() + '!', hashed = await hashPassword(password); secrets.push(password);
  const actor = await db.user.create({ data: { organizationId: org.id, email: 'payment-digest-' + stamp + '@example.invalid', password: hashed, isActive: true, isVerified: true, emailVerified: true } });
  await db.account.create({ data: { userId: actor.id, accountId: actor.id, providerId: 'credential', password: hashed } });
  const permissions = ['dashboard.read', 'finance.read', 'payments.reconciliation.read'];
  const role = await db.role.create({ data: { organizationId: org.id, code: 'finance', nameEn: 'Owned finance reader', permissions, users: { connect: { id: actor.id } } } });
  await db.suspenseItem.create({ data: { organizationId: org.id, type: 'OTHER', amount: '100.00', currencyCode: 'XAF' } });
  await db.suspenseItem.create({ data: { organizationId: org.id, type: 'OTHER', amount: '20.00', currencyCode: 'USD' } });
  const effects = async () => ({ journals: await db.journalEntry.count({ where: { organizationId: org.id } }), payments: await db.payment.count({ where: { organizationId: org.id } }), events: await db.businessEvent.count({ where: { organizationId: org.id } }), suspense: await db.suspenseItem.findMany({ where: { organizationId: org.id }, orderBy: { id: 'asc' }, select: { id: true, status: true, amount: true, currencyCode: true } }) });

  const { getDailyHabitDigestData } = require(path.join(f.root, 'services/daily-habit/daily-habit-digest.service.ts'));
  const { getPaymentTruthSnapshot } = require(path.join(f.root, 'services/snapshots/payment-truth-snapshot.service.ts'));
  const now = new Date(), old = new Date(now.getTime() - 3 * 86400000);
  const input = { organizationId: org.id, actorId: actor.id, actorPermissions: permissions, actorRoleCodes: ['finance'], now };
  const before = JSON.stringify(await effects()); browser = await chromium.launch({ headless: true });
  for (const locale of ['en', 'fr']) {
    await db.suspenseItem.updateMany({ where: { organizationId: org.id }, data: { updatedAt: old } });
    const source = await getPaymentTruthSnapshot(input);
    assert.equal(source.freshness.stale, true); assert.equal(source.status, 'blocked');
    const data = await getDailyHabitDigestData({ ...input, locale });
    const metric = data.digests.find(digest => digest.id === 'finance-cash').zones[0].cards[0];
    assert.equal(metric.freshness.stale, true); assert.equal(metric.state, 'blocked'); assert.equal(metric.value, null);
    const context = await browser.newContext({ viewport: { width: locale === 'fr' ? 320 : 1440, height: 1100 }, reducedMotion: 'reduce' });
    await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
    assert.equal((await context.request.post(base + '/api/auth/sign-in/email', { headers: { Origin: base }, data: { email: actor.email, password }, timeout: 60000 })).status(), 200);
    page = await context.newPage(); const row = { locale, errors: [], sourceHashBefore: source.sourceHash }; result.browser.push(row);
    page.on('pageerror', error => row.errors.push(f.safe(error, secrets)));
    const target = base + '/' + locale + '/dashboard/daily-digest?digest=finance-cash&mode=investigate';
    await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 120000 });
    const investigate = page.getByRole('button', { name: locale === 'en' ? 'Investigate' : 'Examiner', exact: true });
    await expect(investigate).toHaveAttribute('aria-pressed', 'true');
    const warningText = locale === 'en' ? 'Source flagged as stale' : 'Source signalée comme périmée';
    const warning = page.getByText(warningText, { exact: true }).first(); await expect(warning).toBeVisible();
    const panel = warning.locator('..');
    await expect(panel.locator('time')).toHaveAttribute('datetime', old.toISOString());
    await expect(panel).toContainText('UTC'); await expect(panel).toContainText('1440');
    assert.equal(await panel.evaluate(element => element.scrollWidth > element.clientWidth + 1), false);
    await panel.scrollIntoViewIfNeeded(); const shot = 'digest-stale-' + stamp + '-' + locale + '.png'; await page.screenshot({ path: path.join(__dirname, shot), animations: 'disabled', caret: 'initial' }); row.screenshot = shot;
    // Timestamp correction is deliberate fixture setup, never evidence of resolution.
    await db.suspenseItem.updateMany({ where: { organizationId: org.id }, data: { updatedAt: now } });
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 });
    await expect(investigate).toHaveAttribute('aria-pressed', 'true'); await expect(page.getByText(warningText, { exact: true })).toHaveCount(0);
    const after = await getPaymentTruthSnapshot(input);
    assert.equal(after.freshness.stale, false); assert.equal(after.status, 'blocked'); assert.equal(after.metrics.openSuspenseAmount, null);
    assert.equal(JSON.stringify(after.metrics), JSON.stringify(source.metrics)); assert.equal(JSON.stringify(after.blockers), JSON.stringify(source.blockers));
    assert.notEqual(after.sourceHash, source.sourceHash); row.sourceHashAfter = after.sourceHash;
    row.refreshPreservesMode = true; row.blockerStillActive = true; assert.deepEqual(row.errors, []); await context.close();
    console.log(locale + ': stale timing, reflow and blocked-source refresh passed');
  }
  const original = db.suspenseItem.groupBy;
  try {
    db.suspenseItem.groupBy = async args => { if (args.where?.organizationId === org.id) throw new Error('Owned payment aggregation unavailable'); return original.call(db.suspenseItem, args); };
    await assert.rejects(getDailyHabitDigestData(input), /Owned payment aggregation unavailable/);
    result.controlledPaymentQueryFailureRejects = true;
  } finally { db.suspenseItem.groupBy = original; }
  const recovered = await getDailyHabitDigestData(input);
  const metric = recovered.digests.find(digest => digest.id === 'finance-cash').zones[0].cards[0];
  assert.equal(metric.value, null); assert.equal(metric.state, 'blocked'); result.serviceRetryPreservesMixedCurrencyBlocker = true;
  assert.equal(JSON.stringify(await effects()), before); result.noBusinessMutations = true; result.passed = true;
}
main().catch(error => { result.passed = false; result.error = f.safe(error, secrets); process.exitCode = 1; }).finally(async () => { await browser?.close(); result.sourceAfter = hashes(); result.sourceStable = JSON.stringify(result.sourceBefore) === JSON.stringify(result.sourceAfter); const output = path.join(__dirname, 'digest-stale-' + stamp + '.json'); fs.writeFileSync(output, JSON.stringify(result, null, 2), { flag: 'wx' }); console.log(JSON.stringify({ output, ...result })); await db.$disconnect(); });
