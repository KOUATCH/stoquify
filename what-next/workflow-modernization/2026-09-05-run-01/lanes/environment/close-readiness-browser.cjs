// Author-only until the coordinator releases the frozen source and owned DB lane.
// Actual application responses only; retained status is a synthetic adverse fixture.
if (require.main === module && process.argv[2] !== '--run') {
  console.log('Prepared only. Use --run after coordinated source freeze and set STOQUIFY_CLOSE_BROWSER_LISTENER_PID to the verified owned 3110 listener.');
} else {
  const runtime = require('./close-readiness-runtime.cjs');
  const { f, db, helper, root } = runtime, { fs, path, crypto, assert } = f;
  const { execFileSync } = require('node:child_process');
  const { chromium, expect: baseExpect } = require('@playwright/test');
  const expect = baseExpect.configure({ timeout: 60000 });
  const { hashPassword } = require(path.join(root, 'lib/password.ts'));
  const run = crypto.randomUUID(), secrets = [], base = 'http://127.0.0.1:3110';
  const files = [
    'components/cash-command/CashCommandDashboard.tsx', 'components/cash-command/cash-command.module.css',
    'components/finance/finance-dashboard-theme.ts', 'components/bi/BIActionPriorityBoard.tsx',
    'lib/dashboard/snapshot-blocker-presentation.ts', 'lib/dashboard/snapshot-source-blocker-presentation.ts',
    'app/[locale]/(dashboard)/dashboard/finance/cash-command/page.tsx',
    'app/[locale]/(dashboard)/dashboard/finance/finance-route-access.tsx',
    'app/[locale]/(dashboard)/dashboard/finance/finance-route-data-access.ts',
    'services/cash-command/cash-command-navigation.ts', 'lib/password.ts',
    'what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/close-readiness-browser.cjs',
  ];
  const sources = () => ({ ...runtime.sources(), ...Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')])) });
  const copy = {
    en: {
      title: 'Cash Command Intelligence', banner: 'Cash trust banner', summary: 'Review conditions', signal: 'Close blockers', value: 'Review required',
      missing: 'Close certification evidence is missing', detail: '1 certified close run(s) lack a current certified export.',
      next: 'Review and retain a current certified close pack before relying on certification.',
      actions: 'What needs action today', closeTitle: 'Close & Assurance Center',
    },
    fr: {
      title: 'Pilotage de la trésorerie', banner: 'État des preuves de trésorerie', summary: 'Examiner les conditions', signal: 'Blocages de clôture', value: 'Examen requis',
      missing: 'Les preuves de certification de clôture sont absentes', detail: '1 clôture(s) marquées certifiées ne disposent pas d’un export certifié à jour.',
      next: 'Examinez et conservez un dossier de clôture certifié à jour avant de vous fier à la certification.',
      actions: 'Actions à traiter aujourd’hui', closeTitle: 'Centre De Cloture',
    },
  };
  const report = {
    run, at: new Date().toISOString(), journeys: [],
    scope: 'Actual isolated localhost 3110 application, one new owned synthetic organization and minimally authorized observer. Missing certified-export fixture is deliberately adverse history, never genuine approval. EN1440/FR320 native summary keyboard interaction, authorized localized guidance and actual screenshots. No HTTP mocking, migrations, seeds, provider calls, financial posting or certification.',
    limitations: ['Keyboard, focus and reflow checks are bounded browser observations, not screen-reader or accessibility certification.', 'Read fingerprints cover the runtime verifier financial/outside models; authentication creates only this fixture user’s account/session and normal access audit.'],
  };
  function listener() {
    const expected = Number(process.env.STOQUIFY_CLOSE_BROWSER_LISTENER_PID);
    assert.ok(Number.isSafeInteger(expected) && expected > 0, 'A verified owned listener PID is required before fixture creation');
    const text = execFileSync('netstat.exe', ['-ano', '-p', 'tcp'], { encoding: 'utf8', windowsHide: true });
    const rows = text.split(/\r?\n/).map(line => line.trim().split(/\s+/)).filter(parts => parts[0] === 'TCP' && parts[1] === '127.0.0.1:3110' && parts[3] === 'LISTENING');
    assert.equal(rows.length, 1, 'Expected one loopback 3110 application listener');
    assert.equal(Number(rows[0][4]), expected, 'The application listener changed after ownership verification');
    return { address: rows[0][1], pid: expected, checkedAt: new Date().toISOString() };
  }
  async function journey(browser, x, actor, password, locale, width) {
    const c = copy[locale], result = { locale, width, passed: false, screenshots: [], pageErrors: [], blockedOrigins: [] };
    let context, page;
    const shot = async stage => {
      const file = 'close-readiness-browser-' + run + '-' + locale + width + '-' + stage + '.png';
      await page.screenshot({ path: path.join(__dirname, file), animations: 'disabled', caret: 'initial' });
      result.screenshots.push(file);
    };
    try {
      context = await browser.newContext({ viewport: { width, height: 1000 }, locale: locale === 'fr' ? 'fr-FR' : 'en-GB', reducedMotion: 'reduce' });
      context.setDefaultTimeout(60000); context.setDefaultNavigationTimeout(180000);
      await context.route('**/*', route => {
        const origin = new URL(route.request().url()).origin;
        if (origin === base) return route.continue();
        if (!result.blockedOrigins.includes(origin)) result.blockedOrigins.push(origin);
        return route.abort();
      });
      const signed = await context.request.post(base + '/api/auth/sign-in/email', { data: { email: actor.email, password }, headers: { Origin: base }, timeout: 180000 });
      assert.equal(signed.status(), 200, 'Actual synthetic-user sign-in must succeed');
      page = await context.newPage(); page.on('pageerror', error => result.pageErrors.push(f.safe(error, secrets)));
      const began = Date.now(); await page.goto(base + '/' + locale + '/dashboard/finance/cash-command', { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { name: c.title, exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: locale === 'fr' ? 'Synthèse' : 'Brief', exact: true })).toBeEnabled();
      const banner = page.getByRole('region', { name: c.banner, exact: true });
      const summary = banner.locator('summary').filter({ hasText: c.signal });
      await expect(summary).toHaveCount(1); await expect(summary).toHaveText(c.summary + ': ' + c.signal);
      const details = summary.locator('..'), card = details.locator('..');
      await expect(card.getByText(c.value, { exact: true })).toBeVisible();
      assert.equal(await details.evaluate(element => element.open), false);
      await expect(details.getByText(c.missing, { exact: true })).not.toBeVisible();
      result.loadMs = Date.now() - began;
      await summary.scrollIntoViewIfNeeded(); await summary.focus();
      await expect(summary).toBeFocused(); await page.keyboard.press('Enter');
      await expect(details).toHaveAttribute('open', '');
      await expect(details.getByText(c.missing, { exact: true })).toBeVisible();
      await expect(details.getByText(c.detail, { exact: true })).toBeVisible();
      await expect(details.getByText(c.next, { exact: true })).toBeVisible();
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Page must not overflow horizontally');
      assert.ok(await card.evaluate(element => element.scrollWidth <= element.clientWidth + 1), 'Close conditions must reflow inside the trust card');
      result.focus = await summary.evaluate(element => {
        const style = getComputedStyle(element);
        return { focused: element === document.activeElement, outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth };
      });
      assert.ok(result.focus.focused && result.focus.outlineStyle !== 'none' && Number.parseFloat(result.focus.outlineWidth) > 0);
      await card.scrollIntoViewIfNeeded(); await shot('conditions-open');
      await page.keyboard.press('Space'); await expect(details).not.toHaveAttribute('open', ''); await expect(summary).toBeFocused();
      await expect(details.getByText(c.missing, { exact: true })).not.toBeVisible();
      await shot('conditions-closed');
      await page.keyboard.press('Enter'); await expect(details).toHaveAttribute('open', '');
      result.keyboard = { enterOpened: true, spaceClosed: true, focusRetained: true, enterReopened: true };
      result.guidance = { title: c.missing, detail: c.detail, nextAction: c.next, localized: true, noHorizontalOverflow: true };
      // Follow only a currently enabled action shown by the authorized action board.
      const actionBoard = page.locator('section').filter({ has: page.getByRole('heading', { name: c.actions, exact: true }) });
      const closeAction = actionBoard.locator('a[href="/' + locale + '/dashboard/accounting/close"]');
      if (await closeAction.count()) {
        const action = closeAction.first(); await expect(action).toBeVisible(); await action.click();
        await expect(page.getByRole('heading', { name: c.closeTitle, exact: true })).toBeVisible();
        result.closeAction = { status: 'passed', href: '/' + locale + '/dashboard/accounting/close' };
        await shot('authorized-close-destination');
      } else result.closeAction = { status: 'skipped', reason: 'No enabled close destination action was displayed for the minimally authorized fixture.' };
      const retained = await db.closeRun.findUniqueOrThrow({ where: { id: x.closeRunId } });
      assert.equal(retained.status, 'CERTIFIED'); assert.equal(await db.closePackExport.count({ where: { organizationId: x.organizationId } }), 0);
      result.syntheticHistoryUnchanged = true; result.passed = result.pageErrors.length === 0;
    } catch (error) {
      result.error = f.safe(error, secrets); result.stack = f.safe(error.stack || error, secrets);
      if (page && !page.isClosed()) await shot('failed').catch(() => {});
    } finally { if (context) await context.close(); }
    console.log(JSON.stringify({ locale, width, passed: result.passed, error: result.error }));
    return result;
  }
  async function main() {
    report.listenerBefore = listener(); await helper.withClient(f.target, helper.assertOwned);
    report.sourcesBefore = sources(); report.outsideBefore = await runtime.outside(); report.financialBefore = await runtime.financial();
    const x = await runtime.fixture('browser', 'CERTIFIED');
    const password = 'Owned-close-' + crypto.randomUUID() + '!'; secrets.push(password);
    const passwordHash = await hashPassword(password);
    const actor = await db.user.update({ where: { id: x.actorId }, data: { password: passwordHash, emailVerified: true } });
    await db.account.create({ data: { userId: actor.id, accountId: actor.id, providerId: 'credential', password: passwordHash } });
    report.fixture = { organizationId: x.organizationId, actorId: actor.id, closeRunId: x.closeRunId, permissions: x.cashInput.actorPermissions };
    const browser = await chromium.launch({ headless: true });
    try { for (const [locale, width] of [['en', 1440], ['fr', 320]]) report.journeys.push(await journey(browser, x, actor, password, locale, width)); }
    finally { await browser.close(); }
  }
  async function runMain() {
    try { await main(); } catch (error) { report.error = f.safe(error, secrets); }
    finally {
      try {
        report.listenerAfter = listener(); report.sourcesAfter = sources(); report.sourceStable = JSON.stringify(report.sourcesBefore) === JSON.stringify(report.sourcesAfter);
        report.outsideAfter = await runtime.outside(); report.outsideUnchanged = report.outsideBefore === report.outsideAfter;
        report.financialAfter = await runtime.financial(); report.noFinancialWrites = report.financialBefore === report.financialAfter;
      } catch (error) { report.finalizationError = f.safe(error, secrets); }
      report.fixtureOrganizations = [...runtime.organizations];
      report.passed = !report.error && !report.finalizationError && report.journeys.length === 2 && report.journeys.every(row => row.passed) && report.sourceStable && report.outsideUnchanged && report.noFinancialWrites;
      const file = path.join(__dirname, 'close-readiness-browser-' + run + '.json'); fs.writeFileSync(file, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
      console.log(JSON.stringify({ file, passed: report.passed, sourceStable: report.sourceStable, outsideUnchanged: report.outsideUnchanged, noFinancialWrites: report.noFinancialWrites }));
      await db.$disconnect(); if (!report.passed) process.exitCode = 1;
    }
  }
  if (require.main === module) runMain();
}
