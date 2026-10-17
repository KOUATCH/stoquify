// Prepared only. Actual password sign-in and application actions; no response mocks.
if (require.main === module && process.argv[2] !== '--run') {
  console.log('Prepared only; --run requires coordinator release and verified STOQUIFY_CLOSE_BROWSER_LISTENER_PID.');
} else {
  const h = require('./close-acceptance-authority-runtime.cjs');
  const { f, db, root, helper, sources: runtimeSources, outside, setup, effects, retained, change, secrets } = h;
  const { fs, path, crypto, assert } = f, { chromium, expect: baseExpect } = require('@playwright/test');
  const { execFileSync } = require('node:child_process');
  const expect = baseExpect.configure({ timeout: 60000 });
  const { accountantWorkDeskCopy: copy } = require(path.join(root, 'components/accounting/accountant-work-desk-copy.ts'));
  const replacement = require(path.join(root, 'services/accounting/close-evidence-replacement.service.ts'));
  const run = crypto.randomUUID(), base = 'http://127.0.0.1:3110';
  const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
  const sources = () => ({ ...runtimeSources(), ...Object.fromEntries([__filename,
    ...['components/accounting/AccountantWorkDesk.tsx', 'components/accounting/accountant-work-desk-copy.ts', 'actions/accounting/close-assurance.actions.ts',
      'actions/security/step-up-auth.actions.ts', 'services/_shared/protect.ts', 'lib/security/server-authz.ts', 'lib/auth.ts']
      .map(file => path.join(root, file))].map(file => [path.relative(root, file).replaceAll('\\', '/'), sha(fs.readFileSync(file))])) });
  function listener() {
    const expected = Number(process.env.STOQUIFY_CLOSE_BROWSER_LISTENER_PID);
    assert.ok(Number.isSafeInteger(expected) && expected > 0, 'Verified owned app listener PID required before fixture writes');
    const escaped = root.toLowerCase().replaceAll("'", "''");
    const command = `$ErrorActionPreference='Stop'; $rows=@(Get-NetTCPConnection -LocalPort 3110 -State Listen); if($rows.Count -ne 1){throw 'Expected one owned listener'}; $row=$rows[0]; $proc=Get-CimInstance Win32_Process -Filter ('ProcessId='+$row.OwningProcess); $parent=Get-CimInstance Win32_Process -Filter ('ProcessId='+$proc.ParentProcessId); $commands=(@($proc.CommandLine,$parent.CommandLine) -join ' '); [pscustomobject]@{address=$row.LocalAddress;pid=$proc.ProcessId;parentPid=$parent.ProcessId;workspaceMatches=$commands.ToLowerInvariant().Contains('${escaped}');nextDevelopmentCommand=($commands -match 'next.+dev.+-p.+3110')} | ConvertTo-Json -Compress`;
    const state = JSON.parse(execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], { encoding: 'utf8', windowsHide: true, timeout: 30000 }).trim());
    assert.equal(state.address, '127.0.0.1'); assert.equal(state.pid, expected); assert.equal(state.workspaceMatches, true); assert.equal(state.nextDevelopmentCommand, true);
    return { ...state, checkedAt: new Date().toISOString() };
  }
  async function journey(browser, fixture, locale, width) {
    const c = copy[locale], row = { locale, width, organizationId: fixture.x.organizationId, homeOrganizationId: fixture.homeOrganizationId,
      actorId: fixture.actor.id, grant: fixture.grantEvidence, screenshots: [], keyboard: [], stages: [], pageErrors: [], blockedOrigins: [], passed: false };
    let context, page, stage = 'initial', manualAccepts = 0;
    const shot = async name => { const file = 'close-acceptance-authority-browser-' + run + '-' + locale + width + '-' + name + '.png';
      await page.screenshot({ path: path.join(__dirname, file), animations: 'disabled' }); row.screenshots.push(file); };
    const keyboard = async (locator, action, key = 'Enter') => {
      await expect(locator).toBeEnabled(); await locator.scrollIntoViewIfNeeded(); await locator.focus(); await expect(locator).toBeFocused();
      const focus = await locator.evaluate(element => { const css = getComputedStyle(element); return { focused: document.activeElement === element, outline: css.outlineStyle, width: css.outlineWidth, shadow: css.boxShadow }; });
      assert.ok(focus.focused && ((focus.outline !== 'none' && Number.parseFloat(focus.width) > 0) || focus.shadow !== 'none'));
      row.keyboard.push({ action, ...focus }); await page.keyboard.press(key);
    };
    const layout = locator => locator.evaluate(element => ({ viewport: innerWidth, documentWidth: document.documentElement.scrollWidth,
      width: element.clientWidth, scrollWidth: element.scrollWidth, reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches }));
    const wire = () => page.evaluate(() => ({ responses: window.__ownedAuthorityWire.responses, requests: window.__ownedAuthorityWire.requests, errors: window.__ownedAuthorityWire.errors }));
    const setStage = async value => { stage = value; await page.evaluate(value => { window.__ownedAuthorityWire.stage = value; }, value); };
    try {
      context = await browser.newContext({ viewport: { width, height: 1000 }, locale: locale === 'fr' ? 'fr-FR' : 'en-GB', reducedMotion: 'reduce' });
      context.setDefaultTimeout(60000); context.setDefaultNavigationTimeout(180000);
      await context.addInitScript(({ requestId, responseId }) => {
        const nativeFetch = window.fetch, state = window.__ownedAuthorityWire = { stage: 'initial', responses: [], requests: [], errors: [] };
        function envelope(stream) {
          const records = new Map();
          for (const line of stream.split('\n')) { const match = /^([0-9a-f]+):(\{.*|\[.*)$/.exec(line.trim());
            if (match) { try { records.set(match[1], JSON.parse(match[2])); } catch { /* RSC records that are not JSON have no action envelope. */ } } }
          const seen = new Set();
          const resolve = (value, depth = 0) => { const ref = typeof value === 'string' && /^\$(?:@)?([0-9a-f]+)$/.exec(value);
            return ref && records.has(ref[1]) && depth < 16 ? resolve(records.get(ref[1]), depth + 1) : value; };
          function visit(value, depth = 0) {
            value = resolve(value); if (!value || typeof value !== 'object' || seen.has(value) || depth > 64) return null; seen.add(value);
            if (value.success === false && typeof value.code === 'string') return { success: false, code: value.code };
            const dto = resolve(value.data);
            if (value.success === true && dto?.kind === 'ACCOUNTANT_MISSING_CLOSE_EVIDENCE_RESPONSE_ACCEPTANCE' && dto.version === 1 &&
                dto.requestId === requestId && dto.responseId === responseId && dto.decision === 'ACCEPTED' && dto.findingStatus === 'RESOLVED') {
              const selected = resolve(dto.replacement);
              return { success: true, id: dto.id, organizationId: dto.organizationId, acceptedById: dto.acceptedById,
                replacement: selected && { checklistItemId: selected.checklistItemId, bindingHash: selected.bindingHash } };
            }
            for (const child of Object.values(value)) { const found = visit(child, depth + 1); if (found) return found; } return null;
          }
          for (const value of records.values()) { const found = visit(value); if (found) return found; } return null;
        }
        window.fetch = async function (...args) {
          const options = args[1], body = typeof options?.body === 'string' ? options.body : '';
          const isAccept = body.includes(requestId) && body.includes(responseId) && body.includes('resolutionNotes');
          const current = state.stage;
          if (isAccept) state.requests.push({ stage: current });
          const response = await nativeFetch.apply(this, args);
          if (isAccept) response.clone().text().then(text => { state.responses.push({ stage: current, status: response.status, envelope: envelope(text) }); })
            .catch(() => state.errors.push('Acceptance response observer failed'));
          return response;
        };
      }, { requestId: fixture.request.id, responseId: fixture.response.id });
      await context.route('**/*', route => { const origin = new URL(route.request().url()).origin;
        if (origin === base) return route.continue(); if (!row.blockedOrigins.includes(origin)) row.blockedOrigins.push(origin); return route.abort(); });
      const signed = await context.request.post(base + '/api/auth/sign-in/email', { headers: { Origin: base }, data: { email: fixture.actor.email, password: fixture.password }, timeout: 180000, maxRedirects: 0 });
      assert.equal(signed.status(), 200, 'Actual password sign-in');
      // Challenge a real browser-created session. Its token never leaves memory,
      // and only the application's password action restores assurance.
      const actualSession = await db.session.findFirstOrThrow({ where: { userId: fixture.actor.id }, orderBy: { createdAt: 'desc' } });
      secrets.push(actualSession.token);
      await db.session.update({ where: { id: actualSession.id }, data: { assuranceVerifiedAt: null, assuranceMethod: null, assuranceLevel: 0 } });
      page = await context.newPage(); page.on('pageerror', error => row.pageErrors.push(f.safe(error, secrets)));
      const began = Date.now(); await page.goto(base + '/' + locale + '/dashboard/accounting/accountant-portfolio', { waitUntil: 'domcontentloaded' });
      const desk = page.getByRole('region', { name: c.title, exact: true }), detail = page.locator('section[aria-labelledby="accountant-work-detail"]');
      const notes = page.getByLabel(c.notes, { exact: true }), checkbox = page.getByRole('checkbox', { name: c.reviewReplacement, exact: true });
      const accept = detail.getByRole('button', { name: c.accept, exact: true }), identity = page.getByLabel(c.password, { exact: true });
      const note = locale === 'fr' ? 'Revue synthétique autorisée : observation source et réponse du client examinées.' : 'Authorized synthetic review: inspected the source observation and client response.';
      async function open() {
        await expect(desk).toBeVisible(); const review = desk.getByRole('button', { name: new RegExp('^' + c.review + ':') });
        await expect(review).toHaveCount(1); await keyboard(review, stage + '-open'); await expect(detail).toBeVisible();
        await expect(detail.getByText(c.collectors['payment-reconciliation'], { exact: true })).toBeVisible();
        await expect(detail.getByText(c.controlOutcome + ': ' + c.controlStatuses[fixture.initialPreview.controlStatus], { exact: true })).toBeVisible();
        await expect(notes).toHaveValue(''); await notes.fill(note); await expect(checkbox).not.toBeChecked();
        await keyboard(checkbox, stage + '-explicit-source-review', 'Space'); await expect(accept).toBeEnabled();
      }
      async function confirmIdentity() {
        await expect(identity).toBeVisible(); await expect(identity).toBeFocused(); await identity.fill(fixture.password);
        const requestsBefore = (await wire()).requests.length;
        await keyboard(detail.getByRole('button', { name: c.confirmIdentity, exact: true }), stage + '-password-confirm');
        await expect(desk.getByText(c.authenticated, { exact: true })).toBeVisible(); await expect(identity).not.toBeVisible(); await expect(accept).toBeFocused();
        assert.equal((await wire()).requests.length, requestsBefore, 'Password confirmation must not submit acceptance');
        const stored = await db.session.findUniqueOrThrow({ where: { id: actualSession.id } });
        assert.equal(stored.assuranceMethod, 'password'); assert.equal(stored.assuranceOrganizationId, fixture.homeOrganizationId); assert.ok(stored.assuranceLevel >= 1 && stored.assuranceVerifiedAt);
      }
      async function pressAccept() { manualAccepts += 1; await keyboard(accept, stage + '-manual-submit'); }
      async function submit(expected) {
        await pressAccept();
        const status = async () => await identity.isVisible() ? 'identity' : await desk.getByText(expected === 'denied' ? c.denied : c.saved, { exact: true }).isVisible() ? expected : 'pending';
        await expect.poll(status, { timeout: 180000 }).not.toBe('pending');
        if (await status() === 'identity') { await confirmIdentity(); await pressAccept(); }
        await expect.poll(status, { timeout: 180000 }).toBe(expected);
        await expect.poll(async () => (await wire()).responses.length).toBe(manualAccepts);
      }
      await open(); row.readyMs = Date.now() - began;
      const beforeChallenge = await effects(fixture); await setStage('actual-password-challenge'); await pressAccept();
      await expect(identity).toBeVisible(); await expect.poll(async () => (await wire()).responses.some(value => value.envelope?.code === 'FRESH_AUTH_REQUIRED')).toBe(true);
      assert.deepEqual(await effects(fixture), beforeChallenge); await confirmIdentity();
      await accept.scrollIntoViewIfNeeded(); await shot('password-confirmed-explicit-review');
      const mutations = [
        ['permission-removed', () => change('role', fixture.role.id, { permissions: fixture.permissions.filter(value => value !== 'accounting.close.accountant.review') })],
        ['target-module-suspended', () => change('tenantModuleGrant', fixture.closeGrant.id, { status: 'suspended' })],
        ['client-grant-read-only', () => change('accountantAccessGrant', fixture.grant.id, { role: 'READ_ONLY' })],
      ];
      for (const [name, mutate] of mutations) {
        await setStage(name); const before = await effects(fixture), financialBefore = await h.financial(), original = await retained(fixture);
        const restore = await mutate();
        try {
          await submit('denied'); await expect(detail).not.toBeVisible(); await expect(notes).not.toBeVisible();
          await expect.poll(async () => (await wire()).responses.some(value => value.stage === name && value.envelope?.code === 'FORBIDDEN')).toBe(true);
          assert.deepEqual(await effects(fixture), before); assert.equal(await retained(fixture), original); assert.equal((await h.financial()).hash, financialBefore.hash);
          await desk.scrollIntoViewIfNeeded(); await shot(name + '-denied-confidential-detail-cleared');
          row.stages.push({ stage: name, denied: true, code: 'FORBIDDEN', confidentialDetailCleared: true, noAcceptanceEffects: true, noFinancialEffects: true });
        } finally { await restore(); }
        await setStage(name + '-recovered'); await keyboard(desk.getByRole('button', { name: c.refresh, exact: true }), stage + '-refresh');
        await open(); await accept.scrollIntoViewIfNeeded(); await shot(name + '-manual-recovery');
      }
      const initialLayout = await layout(detail); assert.ok(initialLayout.documentWidth <= initialLayout.viewport + 1 && initialLayout.scrollWidth <= initialLayout.width + 1); assert.equal(initialLayout.reducedMotion, true); row.layout = initialLayout;
      await setStage('current-authority-accepted'); const original = await retained(fixture); await submit('saved');
      const comments = await db.accountantComment.findMany({ where: { organizationId: fixture.x.organizationId, findingId: fixture.finding.id, visibility: 'ACCOUNTANT_RESPONSE_ACCEPTED' } });
      assert.equal(comments.length, 1); const stored = comments[0]; assert.equal(stored.authorId, fixture.actor.id); assert.equal(stored.body, note);
      const binding = replacement.parseCloseEvidenceReplacementBinding(stored.metadata.replacementBinding); assert.ok(binding);
      assert.deepEqual(replacement.closeEvidenceReplacementSelection(binding), fixture.initialPreview.selection); assert.equal(await retained(fixture), original);
      const observed = await wire(); assert.equal(observed.requests.length, manualAccepts); assert.equal(observed.responses.length, manualAccepts); assert.equal(observed.errors.length, 0);
      const success = observed.responses.filter(value => value.stage === 'current-authority-accepted' && value.envelope?.success === true);
      assert.equal(success.length, 1); assert.equal(success[0].envelope.id, stored.id); assert.equal(success[0].envelope.acceptedById, fixture.actor.id);
      assert.equal(success[0].envelope.organizationId, fixture.x.organizationId); assert.deepEqual(success[0].envelope.replacement, fixture.initialPreview.selection);
      await desk.scrollIntoViewIfNeeded(); await shot('accepted-after-manual-authority-recovery');
      row.actualPasswordChallenge = true; row.acceptanceId = stored.id; row.selection = fixture.initialPreview.selection; row.noAutomaticAcceptance = true;
      row.wire = observed; row.manualAcceptanceSubmissions = manualAccepts; row.passed = row.pageErrors.length === 0;
    } catch (error) { row.error = f.safe(error, secrets); row.stack = f.safe(error.stack || error, secrets); row.failedStage = stage;
      if (page && !page.isClosed()) await shot('failed-' + stage).catch(() => {}); }
    finally { if (page && !page.isClosed()) row.wire = await wire().catch(() => null); if (context) await context.close(); }
    console.log(JSON.stringify({ locale, width, passed: row.passed, failedStage: row.failedStage, error: row.error })); return row;
  }
  const report = { run, at: new Date().toISOString(), journeys: [],
    scope: 'Actual app3110 and password authentication for separate owned reviewer-home/client organizations in EN1440 and FR320. Real REVIEWER mandates use retained synthetic scope evidence. Existing open forms must refuse revoked permissions, suspended target Close access and read-only client grants, clear confidential detail, then allow explicit review after manual refresh and restored authority.',
    limitations: ['Only fixture setup injects a collector exception and invalidates password assurance; normal UI actions restore password assurance and accept real persisted evidence.',
      'FORBIDDEN intentionally clears detail and notes from the visible UI. Recovery reopens and reenters the review; this differs from previously verified recoverable-CONFLICT note preservation.',
      'Direct action parity is covered separately by focused action tests and the runtime service matrix; this browser invokes the actual work-desk action.',
      'Keyboard, focus, narrow reflow and reduced-motion checks are bounded observations, not accessibility certification. No real-client approval, external origin, worker delivery, migration or production operation.'] };
  async function main() {
    report.listenerBefore = listener(); await helper.withClient(f.target, helper.assertOwned); report.sourcesBefore = sources(); report.outsideBefore = await outside();
    const fixtures = []; for (const locale of ['en', 'fr']) fixtures.push(await setup('browser-' + locale, true));
    report.fixtures = fixtures.map(value => ({ organizationId: value.x.organizationId, homeOrganizationId: value.homeOrganizationId, actorId: value.actor.id,
      findingId: value.finding.id, requestId: value.request.id, grant: value.grantEvidence })); report.financialAfterSetup = await h.financial();
    const browser = await chromium.launch({ headless: true });
    try { for (const [index, pair] of [['en', 1440], ['fr', 320]].entries()) report.journeys.push(await journey(browser, fixtures[index], ...pair)); }
    finally { await browser.close(); }
  }
  async function runMain() {
    try { await main(); } catch (error) { report.error = f.safe(error, secrets); report.stack = f.safe(error.stack || error, secrets); }
    finally {
      try { report.listenerAfter = listener(); report.sourcesAfter = sources(); report.sourceStable = JSON.stringify(report.sourcesBefore) === JSON.stringify(report.sourcesAfter);
        report.outsideAfter = await outside(); report.outsideUnchanged = report.outsideBefore?.hash === report.outsideAfter.hash;
        report.financialAfter = await h.financial(); report.noOperationFinancialEffects = report.financialAfterSetup?.hash === report.financialAfter.hash;
      } catch (error) { report.finalizationError = f.safe(error, secrets); }
      report.fixtureOrganizations = [...h.organizations]; report.passed = !report.error && !report.finalizationError && report.journeys.length === 2 && report.journeys.every(value => value.passed) && report.sourceStable && report.outsideUnchanged && report.noOperationFinancialEffects;
      const file = path.join(__dirname, 'close-acceptance-authority-browser-' + run + '.json'); fs.writeFileSync(file, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
      console.log(JSON.stringify({ file, passed: report.passed, error: report.error, sourceStable: report.sourceStable, outsideUnchanged: report.outsideUnchanged, noOperationFinancialEffects: report.noOperationFinancialEffects }));
      await db.$disconnect(); if (!report.passed) process.exitCode = 1;
    }
  }
  module.exports = { sources, journey };
  if (require.main === module) runMain();
}
