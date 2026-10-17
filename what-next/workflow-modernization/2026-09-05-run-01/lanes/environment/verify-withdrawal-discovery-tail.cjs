const f = require('./statement-recipient-fixtures.cjs'), { fs, path, db, crypto, assert } = f;
const { chromium, expect: originalExpect } = require('@playwright/test'), expect = originalExpect.configure({ timeout: 60000 });
const { hashPassword } = require(path.join(f.root, 'lib/password.ts'));
const closure = require(path.join(f.root, 'services/reconciliation/payment-exception-closure.service.ts'));
const input = 'source-withdrawal-browser-browser-95b105ac-b5d.json', base = 'http://127.0.0.1:3110', secrets = [];
const report = { at: new Date().toISOString(), priorBrowser: input, journeys: [] };
const fileHash = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, file))).digest('hex');
(async () => {
  await f.helper.withClient(f.target, f.helper.assertOwned);
  const previous = JSON.parse(fs.readFileSync(path.join(__dirname, input), 'utf8'));
  assert.equal(previous.sourceStable, true); assert.equal(previous.journeys.length, 2);
  report.sourcesBefore = Object.fromEntries(Object.keys(previous.sourcesAfter).map(file => [file, fileHash(file)]));
  for (const [file, expected] of Object.entries(previous.sourcesAfter)) {
    let bytes = fs.readFileSync(path.join(f.root, file), 'utf8');
    if (file === 'components/finance/PaymentExceptionClosurePanel.tsx') bytes = bytes.replace("opener = useRef<HTMLButtonElement | null>(null), returnCaseId = useRef<string | null>(null)", "opener = useRef<HTMLButtonElement | null>(null)").replace("<Button ref={node => { if (node && returnCaseId.current === item.id) opener.current = node }} variant=\"outline\" disabled={busy} onClick={event => { returnCaseId.current = item.id; opener.current = event.currentTarget; select(item.id) }}>", "<Button variant=\"outline\" disabled={busy} onClick={event => { opener.current = event.currentTarget; select(item.id) }}>");
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), expected, 'Only the exact focus-return correction may differ: ' + file);
  }
  report.reusedApplicationEvidence = 'Unchanged services/locale and exact normalized parent component; this run verifies the remounted-opener focus correction.';
  const browser = await chromium.launch({ headless: true });
  try {
    for (const locale of ['en', 'fr']) {
      const prior = previous.journeys.find(row => row.locale === locale), messages = require(path.join(f.root, 'messages', locale + '.json')).paymentReconciliationWorkbench, t = messages.exceptionClosure;
      for (const key of ['readOnlyDenied', 'proposerDecisionDenied', 'exactProposalRetry', 'independentRejection', 'independentApproval', 'verifiedHistory', 'priorCertificateRetained']) assert.equal(prior[key], true, key);
      assert.equal(prior.pageErrors.length, 0); assert.ok(!prior.consoleIssues.some(value => value.includes('MISSING_MESSAGE')));
      assert.ok(prior.error.includes(t.states.RESOLVED) && prior.error.includes('toBeVisible'), 'The retained failure must be the known stale terminal-state expectation');
      const orgs = await db.organization.findMany({ where: { name: { startsWith: f.helper.prefix }, slug: { startsWith: 'sign-order-workbench-95b105ac-b5d-' + locale + '-' } } }); assert.equal(orgs.length, 1);
      const organizationId = orgs[0].id, exception = await db.paymentException.findFirstOrThrow({ where: { organizationId } }); assert.equal(exception.status, 'REOPENED');
      const password = 'Owned-tail-' + crypto.randomUUID() + '!', passwordHash = await hashPassword(password); secrets.push(password);
      const user = await db.user.create({ data: { organizationId, name: 'Owned withdrawal history reader', email: crypto.randomUUID() + '@example.invalid', password: passwordHash, isActive: true, isVerified: true, emailVerified: true } });
      const permissions = ['payments.reconciliation.read', 'accounting.journal.read'];
      await db.role.create({ data: { organizationId, code: 'OWNED_TAIL_' + crypto.randomUUID(), nameEn: 'Owned history reader', permissions, users: { connect: { id: user.id } } } });
      await db.account.create({ data: { userId: user.id, accountId: user.id, providerId: 'credential', password: passwordHash } });
      const history = await closure.readExceptionClosureHistory({ exceptionId: exception.id }, { organizationId, actorId: user.id, actorPermissions: permissions }); assert.equal(history.total, 6);
      assert.equal(history.items.filter(row => row.purpose === 'REOPEN_SOURCE' && row.kind === 'APPROVED').length, 1);
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: locale === 'fr' ? 'fr-FR' : 'en-GB', reducedMotion: 'reduce' });
      const result = { locale, screenshots: [], pageErrors: [], inheritedVerifiedCriteria: ['proposal', 'fresh-authentication', 'independent-rejection', 'independent-withdrawal', 'retained-certificate', 'reload-and-exact-retry', 'three-widths', 'open-preview-enlargement'] };
      try {
        context.setDefaultTimeout(60000); context.setDefaultNavigationTimeout(180000);
        await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
        assert.equal((await context.request.post(base + '/api/auth/sign-in/email', { data: { email: user.email, password }, headers: { Origin: base }, timeout: 180000 })).status(), 200);
        const page = await context.newPage(); page.on('pageerror', error => result.pageErrors.push(f.safe(error, secrets)));
        await page.goto(base + '/' + locale + '/dashboard/finance/reconciliation');
        const opener = page.getByRole('button', { name: t.open, exact: true }); await expect(opener).toBeVisible(); await opener.focus(); await opener.press('Enter');
        const panel = page.getByRole('region', { name: t.title, exact: true }), caseName = t.case.replace('{id}', exception.id);
        await panel.getByRole('button', { name: t.allCases, exact: true }).click();
        const item = panel.getByRole('article', { name: caseName, exact: true }); await expect(item.getByText(t.states.REOPENED, { exact: true })).toBeVisible();
        await item.getByRole('button', { name: t.inspect, exact: true }).click();
        const detail = panel.getByRole('region', { name: caseName, exact: true }); await expect(detail.getByText(t.withdrawalRecords.APPROVED, { exact: true })).toBeVisible();
        await expect(detail.getByRole('button', { name: t.preview, exact: true })).toBeDisabled();
        await detail.getByRole('button', { name: t.back, exact: true }).click(); await expect(item.getByRole('button', { name: t.inspect, exact: true })).toBeFocused();
        await panel.getByRole('button', { name: t.close, exact: true }).click(); await expect(opener).toBeFocused();
        await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; }); assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
        const shot = 'withdrawal-discovery-tail-' + locale + '-' + crypto.randomUUID() + '.png'; await page.screenshot({ path: path.join(__dirname, shot), animations: 'disabled' }); result.screenshots.push(shot);
        assert.equal(await db.paymentTransaction.count({ where: { organizationId } }), 1); assert.equal(await db.matchRecord.count({ where: { organizationId } }), 1);
        assert.equal(await db.journalEntry.count({ where: { organizationId } }), 0); assert.equal(await db.ledgerPostingBatch.count({ where: { organizationId } }), 0);
        assert.equal(result.pageErrors.length, 0); result.passed = true;
      } finally { await context.close(); }
      report.journeys.push(result); console.log(JSON.stringify({ locale, discoveryAndFocusVerified: true }));
    }
  } finally { await browser.close(); }
  report.sourcesAfter = Object.fromEntries(Object.keys(report.sourcesBefore).map(file => [file, fileHash(file)])); assert.deepEqual(report.sourcesBefore, report.sourcesAfter);
  report.passed = true;
})().catch(error => { report.passed = false; report.error = f.safe(error, secrets); report.stack = String(error.stack).split('\n').slice(0, 5); process.exitCode = 1; }).finally(async () => {
  const output = path.join(__dirname, 'withdrawal-discovery-tail-' + crypto.randomUUID() + '.json'); fs.writeFileSync(output, JSON.stringify(report, null, 2), { flag: 'wx' }); console.log(JSON.stringify({ output, passed: report.passed, error: report.error })); await db.$disconnect(); process.exit(process.exitCode || 0);
});
