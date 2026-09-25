const fs = require('node:fs'), path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, 'verify-digest-payment-handoff.cjs'), 'utf8');
const marker = '  const before = JSON.stringify(await effects());';
if (!source.includes(marker)) throw new Error('Fixture anchor missing');
let prefix = source.slice(0, source.indexOf(marker));
prefix = prefix.replace('const hashes = () =>', "files.push('components/bi/BIEvidenceBadgeRow.tsx', 'lib/dashboard/bi-presentation.ts', 'services/snapshots/snapshot-utils.ts');\nconst hashes = () =>");
const body = String.raw`
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
`;
fs.writeFileSync(path.join(__dirname, 'verify-digest-stale-source.cjs'), prefix + body, { flag: 'wx' });
console.log('Created owned stale-source and controlled-query-failure verifier');
