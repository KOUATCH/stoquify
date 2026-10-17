// Inert unless the coordinator releases this exact browser/database lane.
if (require.main === module && process.argv[2] !== '--run') console.log('Prepared only. --run requires verified STOQUIFY_JOURNAL_BROWSER_LISTENER_PID and coordinator release.');
else {
  const fixtureApi = require('./manual-journal-recovery-fixtures.cjs');
  const { f, db, root, helper, organizations, secrets, sha, manual, journal } = fixtureApi, { fs, path, crypto, assert } = f;
  const { chromium, expect: baseExpect } = require('@playwright/test'), { execFileSync } = require('node:child_process');
  const { getJournalWorkflowCopy } = require(path.join(root, 'components/accounting/journal-workflow-copy.ts'));
  const expect = baseExpect.configure({ timeout: 60000 }), base = 'http://127.0.0.1:3110', run = crypto.randomUUID();
  const files = [__filename, ...['components/accounting/JournalEntryActions.tsx', 'components/accounting/journal-workflow-copy.ts', 'components/ui/dialog.tsx', 'actions/security/step-up-auth.actions.ts'].map(file => path.join(root, file))];
  const sources = () => ({ ...fixtureApi.sources(), ...Object.fromEntries(files.map(file => [path.relative(root, file).replaceAll('\\', '/'), sha(fs.readFileSync(file))])) });
  const report = { run, at: new Date().toISOString(), journeys: [], scope: 'Actual current journals page, EN1440/FR320, distinct post/reverse/read-only actors, existing manual draft, actual inventory source journal, real password assurance expiry and re-verification, explicit manual retry and persisted financial transitions. No response mocks, migrations, seeds, external origins or source/candidate injection.', limitations: [
    'Assurance is genuinely established by the password service, then only the owned session timestamp is deliberately aged as a synthetic expiry fault. The browser must receive a real FRESH_AUTH_REQUIRED action response.',
    'Synthetic credentials, roles and grants are local fixtures, not customer or professional approvals.',
    'Bounded keyboard, focus, reflow and reduced-motion observations are not full accessibility certification.',
    'The unresolved earlier-period Close scope defect remains outside this journal recovery UI proof.',
    'Development compilation and measured route latency are local observations, not production build or performance certification.',
    'Server-rendered query-failure states are covered by the focused page tests; this browser run proves actual success and authentication recovery without substituting server-read results.',
  ] };
  function listener() {
    const expected = Number(process.env.STOQUIFY_JOURNAL_BROWSER_LISTENER_PID); assert.ok(Number.isSafeInteger(expected) && expected > 0, 'A verified listener PID is required before fixture creation');
    const escaped = root.toLowerCase().replaceAll("'", "''"), command = `$ErrorActionPreference='Stop'; $rows=@(Get-NetTCPConnection -LocalPort 3110 -State Listen); if($rows.Count -ne 1){throw 'Expected one listener'}; $p=Get-CimInstance Win32_Process -Filter ('ProcessId='+$rows[0].OwningProcess); $q=Get-CimInstance Win32_Process -Filter ('ProcessId='+$p.ParentProcessId); $commands=(@($p.CommandLine,$q.CommandLine) -join ' '); [pscustomobject]@{address=$rows[0].LocalAddress;pid=$p.ProcessId;parentPid=$q.ProcessId;workspaceMatches=$commands.ToLowerInvariant().Contains('${escaped}');nextDevelopmentCommand=($commands -match 'next.+dev.+-p.+3110')} | ConvertTo-Json -Compress`;
    const value = JSON.parse(execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], { encoding: 'utf8', windowsHide: true, timeout: 30000 }).trim()); assert.equal(value.address, '127.0.0.1'); assert.equal(value.pid, expected); assert.equal(value.workspaceMatches, true); assert.equal(value.nextDevelopmentCommand, true); return value;
  }
  function buildIdentity() { const file = path.join(root, '.next-workflow-supplier/server/app/[locale]/(dashboard)/dashboard/accounting/journals/page.js'); assert.ok(fs.existsSync(file), 'Actual journals route must be compiled by the verified development listener'); const bytes = fs.readFileSync(file); assert.ok(bytes.includes(Buffer.from('JournalEntryActions')), 'Served route build must reference the integrated client controller'); return { file: path.relative(root, file).replaceAll('\\', '/'), hash: sha(bytes), bytes: bytes.length, currentControllerReferenced: true }; }
  async function makeContext(browser, row, locale, width, credential, expire) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, locale: locale === 'fr' ? 'fr-FR' : 'en-GB', reducedMotion: 'reduce' }); context.setDefaultTimeout(60000); context.setDefaultNavigationTimeout(180000);
    await context.route('**/*', route => { const origin = new URL(route.request().url()).origin; if (origin === base) return route.continue(); if (!row.blockedOrigins.includes(origin)) row.blockedOrigins.push(origin); return route.abort(); });
    try { const auth = await fixtureApi.signIn(context, base, credential, expire); return { context, auth }; } catch (error) { await context.close(); throw error; }
  }
  async function installObserver(context, targetId) {
    await context.addInitScript(({ targetId }) => { const nativeFetch = window.fetch, wire = window.__ownedJournalWire = { stage: 'initial', calls: [], responses: [], errors: [] };
      window.fetch = async function (...args) { const init = args[1], headers = new Headers(init?.headers || (args[0] instanceof Request ? args[0].headers : undefined)), body = typeof init?.body === 'string' ? init.body : '';
        const financial = headers.has('next-action') && body.includes('journalEntryId') && body.includes(targetId), stage = wire.stage;
        if (financial) wire.calls.push({ stage, targetMatches: true, reversalDatePresent: body.includes('reversalDate') });
        const response = await Reflect.apply(nativeFetch, this, args);
        if (financial) response.clone().text().then(text => wire.responses.push({ stage, status: response.status, code: /"code"\s*:\s*"(FRESH_AUTH_REQUIRED|FORBIDDEN|AUTH_REQUIRED|SOD_VIOLATION|CONFLICT|BUSINESS_RULE_VIOLATION)"/.exec(text)?.[1] || null, successFalse: /"success"\s*:\s*false/.test(text), successTrue: /"success"\s*:\s*true/.test(text) })).catch(() => wire.errors.push('Actual journal action response could not be observed'));
        return response;
      };
    }, { targetId });
  }
  async function journey(browser, fixture, locale, width) {
    const { x, original, sourceOwned, untouchedDraft, untouchedPosted, poster, reverser, reader } = fixture, copy = getJournalWorkflowCopy(locale), c = copy.actions;
    const row = { locale, width, organizationId: x.organizationId, journalId: original.id, sourceOwnedJournalId: sourceOwned.id, screenshots: [], keyboard: [], auth: [], operations: [], errors: [], blockedOrigins: [], passed: false };
    let context, page, stage = 'setup';
    const screenshot = async name => { const file = 'manual-journal-recovery-' + run + '-' + locale + width + '-' + name + '.png'; await page.screenshot({ path: path.join(__dirname, file), animations: 'disabled', caret: 'initial' }); row.screenshots.push(file); };
    const setStage = async value => { stage = value; await page.evaluate(value => { window.__ownedJournalWire.stage = value; }, value); };
    const wire = () => page.evaluate(() => window.__ownedJournalWire);
    const press = async (button, name) => { await expect(button).toBeEnabled(); await button.scrollIntoViewIfNeeded(); await button.focus(); await expect(button).toBeFocused(); const focus = await button.evaluate(element => { const css = getComputedStyle(element); return { active: document.activeElement === element, outline: css.outlineStyle, outlineWidth: css.outlineWidth, shadow: css.boxShadow }; }); assert.ok(focus.active && ((focus.outline !== 'none' && Number.parseFloat(focus.outlineWidth) > 0) || focus.shadow !== 'none')); row.keyboard.push({ name, ...focus }); await page.keyboard.press('Enter'); };
    const layout = async target => { const value = await target.evaluate(element => ({ viewport: innerWidth, documentWidth: document.documentElement.scrollWidth, width: element.clientWidth, contentWidth: element.scrollWidth, reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches })); assert.ok(value.documentWidth <= value.viewport + 1, 'Page must reflow without horizontal overflow'); assert.ok(value.contentWidth <= value.width + 1, 'Dialog must reflow without horizontal overflow'); assert.equal(value.reducedMotion, true); return value; };
    const openPage = async () => { const start = Date.now(); await page.goto(base + '/' + locale + '/dashboard/accounting/journals', { waitUntil: 'domcontentloaded' }); await expect(page.getByRole('heading', { name: copy.page.title, exact: true })).toBeVisible(); row.routeLoads ??= []; row.routeLoads.push({ stage, elapsedMs: Date.now() - start }); };
    try {
      row.financialBefore = f.hash(await fixtureApi.protectedRows(x));
      for (const operation of ['post', 'reverse']) {
        const credential = operation === 'post' ? poster : reverser, initialized = await makeContext(browser, row, locale, width, credential, true); context = initialized.context; row.auth.push({ operation, actorId: credential.actor.id, ...initialized.auth });
        await installObserver(context, original.id); page = await context.newPage(); page.on('pageerror', error => row.errors.push(f.safe(error, secrets))); stage = operation + '-page'; await openPage(); row.buildBefore ??= buildIdentity();
        const sourceRow = page.locator('[data-journal-scope="posted"]').getByRole('row').filter({ hasText: sourceOwned.entryNumber }); await expect(sourceRow).toHaveCount(1); assert.equal(await sourceRow.locator('[data-journal-entry-action]').count(), 0); await expect(sourceRow.getByText(copy.page.sourceOwned, { exact: true })).toBeVisible();
        const forbiddenLabel = operation === 'post' ? c.reverse : c.post; assert.equal(await page.getByRole('button', { name: new RegExp('^' + forbiddenLabel + ' — ') }).count(), 0, 'The other operation is not granted to this actor');
        const wrapper = page.locator('[data-journal-entry-action="' + original.id + '"]'), trigger = wrapper.getByRole('button', { name: (operation === 'post' ? c.post : c.reverse) + ' — ' + original.entryNumber, exact: true });
        await press(trigger, operation + '-open-review'); const dialog = page.getByRole('dialog', { name: (operation === 'post' ? c.reviewPost : c.reviewReverse) + ' — ' + original.entryNumber, exact: true }); await expect(dialog).toBeVisible();
        await expect(dialog.getByRole('heading')).toBeFocused(); for (let index = 0; index < 8; index++) { await page.keyboard.press('Tab'); assert.equal(await dialog.evaluate(element => element.contains(document.activeElement)), true, 'Dialog must retain keyboard focus'); }
        await page.keyboard.press('Escape'); await expect(dialog).not.toBeVisible(); await expect(trigger).toBeFocused(); await press(trigger, operation + '-reopen-review');
        const reason = locale === 'fr' ? 'Correction locale synthétique documentée : conserver l’écriture originale et contrôler la contrepassation.' : 'Documented synthetic local correction: retain the original entry and independently review its reversal.';
        const date = new Date().toISOString().slice(0, 10); if (operation === 'reverse') { await expect(dialog.getByLabel(c.reason, { exact: true })).toHaveValue(''); await expect(dialog.getByLabel(c.date, { exact: true })).toHaveValue(''); await dialog.getByLabel(c.reason, { exact: true }).fill(reason); await dialog.getByLabel(c.date, { exact: true }).fill(date); }
        row.layouts ??= []; row.layouts.push({ operation, ...await layout(dialog) }); await screenshot(operation + '-review');
        const before = await fixtureApi.protectedRows(x), economicBefore = operation === 'post' ? await manual.rows(x) : await journal.rows(x);
        const confirm = dialog.getByRole('button', { name: operation === 'post' ? c.confirmPost : c.confirmReverse, exact: true });
        await setStage(operation + '-expired-submit'); await press(confirm, operation + '-request-with-expired-assurance'); const identity = dialog.getByRole('form', { name: c.identity, exact: true }); await expect(identity).toBeVisible();
        await expect.poll(async () => (await wire()).responses.filter(value => value.code === 'FRESH_AUTH_REQUIRED').length).toBe(1); assert.deepEqual(await fixtureApi.protectedRows(x), before); await expect(identity.getByLabel(c.password, { exact: true })).toBeFocused();
        if (operation === 'reverse') { await expect(dialog.getByLabel(c.reason, { exact: true })).toHaveValue(reason); await expect(dialog.getByLabel(c.date, { exact: true })).toHaveValue(date); }
        await screenshot(operation + '-identity-required'); const verifyAt = Date.now(); await identity.getByLabel(c.password, { exact: true }).fill(credential.password); await press(identity.getByRole('button', { name: c.identity, exact: true }), operation + '-verify-password');
        await expect(identity).not.toBeVisible(); await expect(dialog.getByRole('status')).toHaveText(c.verified); await expect(confirm).toBeFocused(); const fresh = await fixtureApi.assertFreshSession(initialized.auth.sessionId, credential.actor.id, x.organizationId, verifyAt);
        assert.equal((await wire()).calls.length, 1); assert.deepEqual(await fixtureApi.protectedRows(x), before); if (operation === 'reverse') { await expect(dialog.getByLabel(c.reason, { exact: true })).toHaveValue(reason); await expect(dialog.getByLabel(c.date, { exact: true })).toHaveValue(date); }
        await screenshot(operation + '-identity-confirmed-awaiting-retry'); await setStage(operation + '-explicit-retry'); await press(confirm, operation + '-explicit-confirmation'); await expect(dialog).not.toBeVisible();
        await expect.poll(async () => (await db.journalEntry.findUniqueOrThrow({ where: { id: original.id } })).status).toBe(operation === 'post' ? 'POSTED' : 'REVERSED');
        await expect.poll(async () => (await wire()).responses.filter(value => value.successTrue).length).toBe(1); const observed = await wire(); assert.equal(observed.calls.length, 2); assert.deepEqual(observed.errors, []); assert.equal(observed.responses.filter(value => value.successFalse).length, 1);
        let proof; if (operation === 'post') proof = await fixtureApi.postProof(x, economicBefore); else { const reversed = await db.journalEntry.findMany({ where: { organizationId: x.organizationId, reversalOfEntryId: original.id } }); assert.equal(reversed.length, 1); assert.equal(reversed[0].memo, reason); assert.equal(reversed[0].entryDate.toISOString(), date + 'T00:00:00.000Z'); proof = await fixtureApi.reverseProof(x, economicBefore, reversed[0].id); row.reversalId = reversed[0].id; }
        for (const name of ['inventoryLevel', 'stockAdjustment', 'stockAdjustmentLine', 'inventoryTransaction', 'customerLedgerEntry', 'customerSettlement']) assert.deepEqual((await fixtureApi.protectedRows(x))[name], before[name]);
        const persistedRow = page.locator('[data-journal-scope="posted"]').getByRole('row').filter({ hasText: original.entryNumber });
        await expect(persistedRow.getByText(operation === 'post' ? copy.statuses.POSTED : copy.statuses.REVERSED, { exact: true })).toBeVisible(); await expect(wrapper).toHaveCount(0);
        const feedback = page.locator('[data-journal-workflow-feedback]'); await expect(feedback).toHaveAttribute('role', 'status'); await expect(feedback).toHaveText(original.entryNumber + ': ' + (operation === 'post' ? c.posted : c.reversed)); await expect(feedback).toBeFocused();
        await screenshot(operation + '-success-focus'); await persistedRow.scrollIntoViewIfNeeded();
        await screenshot(operation + '-persisted'); row.operations.push({ operation, wire: observed, fresh, proof, noAutomaticRetry: true, reasonAndDateRetained: operation === 'reverse', keyboardTrapAndReturn: true, persistentSuccessFocusedAfterRowActionUnmount: true });
        await context.close(); context = null; page = null;
      }
      const beforeReader = await fixtureApi.protectedRows(x), initialized = await makeContext(browser, row, locale, width, reader, false); context = initialized.context; page = await context.newPage(); page.on('pageerror', error => row.errors.push(f.safe(error, secrets))); stage = 'read-only-view'; await openPage();
      assert.equal(await page.locator('[data-journal-entry-action]').count(), 0); await expect(page.locator('[data-journal-scope="posted"]').getByRole('row').filter({ hasText: original.entryNumber }).getByText(copy.statuses.REVERSED, { exact: true })).toBeVisible();
      const deniedDraft = page.locator('[data-journal-scope="draft"]').getByRole('row').filter({ hasText: untouchedDraft.entryNumber }), deniedPosted = page.locator('[data-journal-scope="posted"]').getByRole('row').filter({ hasText: untouchedPosted.entryNumber });
      await expect(deniedDraft.getByText(copy.statuses.DRAFT, { exact: true })).toBeVisible(); await expect(deniedDraft.getByText(copy.page.actionUnavailable, { exact: true })).toBeVisible(); await expect(deniedPosted.getByText(copy.statuses.POSTED, { exact: true })).toBeVisible(); await expect(deniedPosted.getByText(copy.page.actionUnavailable, { exact: true })).toBeVisible();
      await deniedDraft.scrollIntoViewIfNeeded(); await screenshot('read-only-draft'); await deniedPosted.scrollIntoViewIfNeeded();
      const reflow = await page.evaluate(() => ({ viewport: innerWidth, width: document.documentElement.scrollWidth, reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches })); assert.ok(reflow.width <= reflow.viewport + 1); assert.equal(reflow.reducedMotion, true); await screenshot('read-only-history'); assert.deepEqual(await fixtureApi.protectedRows(x), beforeReader);
      row.readOnly = { actorId: reader.actor.id, actionsAbsent: true, eligibleManualDraftId: untouchedDraft.id, eligibleManualPostedId: untouchedPosted.id, explicitAccessExplanation: true, retainedReversalVisible: true, noFinancialEffects: true, reflow }; row.financialAfter = f.hash(beforeReader); row.buildAfter = buildIdentity(); assert.equal(row.buildBefore.hash, row.buildAfter.hash); row.passed = row.errors.length === 0;
    } catch (error) { row.error = f.safe(error, secrets); row.stack = f.safe(error.stack || error, secrets); row.failedStage = stage; if (page && !page.isClosed()) await screenshot('failed-' + stage).catch(() => {}); }
    finally { if (context) await context.close(); if (row.errors.length) row.passed = false; }
    console.log(JSON.stringify({ locale, width, passed: row.passed, failedStage: row.failedStage, error: row.error })); return row;
  }
  async function main() { report.listenerBefore = listener(); await fixtureApi.guard(); report.sourcesBefore = sources(); report.outsideBefore = await fixtureApi.outside(); const fixtures = [];
    for (const locale of ['en', 'fr']) fixtures.push(await fixtureApi.fixture(locale, run)); report.fixtures = fixtures.map(value => ({ organizationId: value.x.organizationId, original: value.original, sourceOwned: value.sourceOwned, untouchedDraft: value.untouchedDraft, untouchedPosted: value.untouchedPosted, actors: { poster: value.poster.actor.id, reverser: value.reverser.actor.id, reader: value.reader.actor.id } }));
    const browser = await chromium.launch({ headless: true }); try { for (const [index, [locale, width]] of [['en', 1440], ['fr', 320]].entries()) report.journeys.push(await journey(browser, fixtures[index], locale, width)); } finally { await browser.close(); }
  }
  async function runMain() { try { await main(); } catch (error) { report.error = f.safe(error, secrets); } finally {
    try { report.listenerAfter = listener(); report.sourcesAfter = sources(); report.sourceStable = JSON.stringify(report.sourcesBefore) === JSON.stringify(report.sourcesAfter); report.outsideAfter = await fixtureApi.outside(); report.outsideUnchanged = report.outsideBefore?.hash === report.outsideAfter.hash; } catch (error) { report.finalizationError = f.safe(error, secrets); }
    try { await db.$disconnect(); } catch (error) { report.disconnectError = f.safe(error, secrets); }
    report.fixtureOrganizations = [...organizations]; report.passed = !report.error && !report.finalizationError && !report.disconnectError && report.journeys.length === 2 && report.journeys.every(value => value.passed) && report.sourceStable && report.outsideUnchanged;
    const file = path.join(__dirname, 'manual-journal-recovery-browser-' + run + '.json'); fs.writeFileSync(file, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify({ file, passed: report.passed, journeys: report.journeys.length, sourceStable: report.sourceStable, outsideUnchanged: report.outsideUnchanged, error: report.error })); if (!report.passed) process.exitCode = 1;
  } }
  module.exports = { sources, journey };
  if (require.main === module) runMain();
}
