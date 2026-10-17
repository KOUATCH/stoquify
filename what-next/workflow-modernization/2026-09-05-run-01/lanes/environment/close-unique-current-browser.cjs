// Narrow actual-browser acceptance; author-only until coordinator source freeze.
// No response mocks, old-run route invention, automatic retry or customer approval.
if (require.main === module && process.argv[2] !== '--run') console.log('Prepared only; --run requires coordinator release and verified STOQUIFY_CLOSE_BROWSER_LISTENER_PID.');
else {
  const b = require('./close-denial-recovery-browser.cjs'), d = require('./close-denial-recovery-runtime.cjs');
  const { f, db, root, helper, organizations } = d.h, { fs, path, crypto, assert } = f;
  const { chromium, expect: baseExpect } = require('@playwright/test'), { execFileSync } = require('node:child_process');
  const expect = baseExpect.configure({ timeout: 60000 });
  const { getCloseAssuranceDashboard } = require(path.join(root, 'services/accounting/close-assurance.service.ts'));
  const { getProofTrail } = require(path.join(root, 'services/evidence/proof-trail.service.ts'));
  const { exportClosePack } = require(path.join(root, 'services/accounting/close-assurance-pack.service.ts'));
  const { stableJsonStringify } = require(path.join(root, 'services/events/business-event.service.ts'));
  const run = crypto.randomUUID(), base = 'http://127.0.0.1:3110', secrets = [], sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
  const files = [__filename, ...['services/accounting/close-assessment-order.service.ts', 'services/evidence/proof-trail.service.ts', 'services/evidence/evidence-grade.service.ts', 'lib/dashboard/snapshot-source-blocker-presentation.ts'].map(file => path.join(root, file))];
  const sources = () => ({ ...b.sources(), ...Object.fromEntries(files.map(file => [path.relative(root, file).replaceAll('\\', '/'), sha(fs.readFileSync(file))])) });
  async function outside() {
    const existing = await d.outside(), user = { organizationId: { notIn: organizations } };
    const accounts = await db.account.findMany({ where: { user }, orderBy: { id: 'asc' } });
    const sessions = await db.session.findMany({ where: { user }, orderBy: { id: 'asc' } });
    // Fingerprint authentication records without returning credentials or tokens.
    return { hash: f.hash({ existing: existing.hash, accounts: f.hash(accounts), sessions: f.hash(sessions) }), existing };
  }
  const report = { run, at: new Date().toISOString(), journeys: [], scope: 'Actual localhost Close page EN1440/FR320 with existing authenticated shell. Actual READY/T4 setup and identity verification, then newer real assessment published while old page remains loaded; old-ID certification must conflict, refresh and require explicit retry against latest. Retained old proof is read through actual scoped services because the page does not expose an old-run route. Two synthetic balanced setup journals only; no migration, seed, external origins, delivery or customer approval.', limitations: ['Bounded keyboard, focus, reduced-motion and reflow checks are not accessibility certification.', 'System-certified artifacts from synthetic fixtures are not professional or statutory approval.', 'The old proof/history check uses actual services, not a fabricated browser old-ID route.', 'Artifact document exportId may differ from DB row ID; bind by tenant/run/watermark/content hash.'] };
  function listener() {
    const expected = Number(process.env.STOQUIFY_CLOSE_BROWSER_LISTENER_PID); assert.ok(Number.isSafeInteger(expected) && expected > 0);
    const escaped = root.toLowerCase().replaceAll("'", "''");
    const command = `$ErrorActionPreference='Stop'; $rows=@(Get-NetTCPConnection -LocalPort 3110 -State Listen); if($rows.Count -ne 1){throw 'Expected one owned listener'}; $row=$rows[0]; $proc=Get-CimInstance Win32_Process -Filter ('ProcessId='+$row.OwningProcess); $parent=Get-CimInstance Win32_Process -Filter ('ProcessId='+$proc.ParentProcessId); $commands=(@($proc.CommandLine,$parent.CommandLine) -join ' '); [pscustomobject]@{address=$row.LocalAddress;pid=$proc.ProcessId;workspaceMatches=$commands.ToLowerInvariant().Contains('${escaped}');nextDevelopmentCommand=($commands -match 'next.+dev.+-p.+3110')} | ConvertTo-Json -Compress`;
    const value = JSON.parse(execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], { encoding: 'utf8', windowsHide: true, timeout: 30000 }).trim());
    assert.equal(value.address, '127.0.0.1'); assert.equal(value.pid, expected); assert.equal(value.workspaceMatches, true); assert.equal(value.nextDevelopmentCommand, true); return value;
  }
  const copy = {
    en: { title: 'Close & Assurance Center', proof: 'Current close evidence', operational: 'Operational evidence', certified: 'Current certification evidence', export: 'Export certified JSON', recorded: 'Certification recorded', identity: 'Confirm your identity', password: 'Current password', verify: 'Verify identity', verified: 'Identity verified. Retry your selected action.', conflict: 'A newer assessment exists. Refresh the latest assessment and review its evidence before trying certification again.', notes: 'Decision notes' },
    fr: { title: 'Centre De Cloture', proof: 'Preuves actuelles de clôture', operational: 'Preuves opérationnelles', certified: 'Preuves de certification à jour', export: 'Exporter JSON certifie', recorded: 'Certification enregistrée', identity: 'Confirmez votre identité', password: 'Mot de passe actuel', verify: 'Vérifier l’identité', verified: 'Identité vérifiée. Réessayez l’action choisie.', conflict: 'Une évaluation plus récente existe. Actualisez la dernière évaluation et examinez ses preuves avant de réessayer la certification.', notes: 'Notes de decision' },
  };
  async function retained(x) { return { run: await db.closeRun.findFirstOrThrow({ where: { id: x.closeRunId, organizationId: x.organizationId } }), ...await d.history(x) }; }
  async function journey(browser, fixture, locale, width) {
    const { x, actor, password } = fixture, c = copy[locale]; secrets.push(password);
    const row = { locale, width, organizationId: x.organizationId, oldRunId: x.closeRunId, actorId: actor.id, screenshots: [], keyboard: [], requests: [], responses: [], reads: [], errors: [], blockedOrigins: [], passed: false };
    let context, page, newer, stage = 'initial'; const downloads = [];
    const observe = async () => {
      const captured = await page.evaluate(() => window.__ownedCloseWire ? { responses: window.__ownedCloseWire.responses, reads: window.__ownedCloseWire.reads, errors: window.__ownedCloseWire.errors } : null);
      assert.ok(captured, 'The actual fetch response observer must be installed');
      row.responses = captured.responses; row.reads = captured.reads; row.responseObserverErrors = captured.errors;
    };
    const setStage = async value => { stage = value; await page.evaluate(({ value, newerId }) => { window.__ownedCloseWire.stage = value; window.__ownedCloseWire.newRunId = newerId; }, { value, newerId: newer?.closeRunId || null }); };
    const shot = async name => { const file = 'close-unique-current-browser-' + run + '-' + locale + width + '-' + name + '.png'; await page.screenshot({ path: path.join(__dirname, file), animations: 'disabled' }); row.screenshots.push(file); };
    const press = async (button, action) => {
      await expect(button).toBeEnabled(); await button.scrollIntoViewIfNeeded(); await button.focus(); await expect(button).toBeFocused();
      const state = await button.evaluate(element => { const css = getComputedStyle(element); return { focused: document.activeElement === element, outline: css.outlineStyle, width: css.outlineWidth, shadow: css.boxShadow }; });
      assert.ok(state.focused && ((state.outline !== 'none' && Number.parseFloat(state.width) > 0) || state.shadow !== 'none')); row.keyboard.push({ action, ...state }); await page.keyboard.press('Enter');
    };
    try {
      context = await browser.newContext({ viewport: { width, height: 1000 }, locale: locale === 'fr' ? 'fr-FR' : 'en-GB', reducedMotion: 'reduce', acceptDownloads: true }); context.setDefaultTimeout(60000); context.setDefaultNavigationTimeout(180000);
      await context.addInitScript(({ oldRunId }) => {
        const nativeFetch = window.fetch;
        const observed = window.__ownedCloseWire = { stage: 'initial', newRunId: null, responses: [], reads: [], errors: [] };
        window.fetch = async function (...args) {
          const init = args[1], headers = new Headers(init?.headers || (args[0] instanceof Request ? args[0].headers : undefined));
          const body = typeof init?.body === 'string' ? init.body : '';
          const action = headers.has('next-action'), certified = action && body.includes('closeRunId') && body.includes('CERTIFIED'), dashboard = action && body.includes('periodId') && !body.includes('closeRunId');
          const atStage = observed.stage, newRunId = observed.newRunId;
          const response = await Reflect.apply(nativeFetch, this, args);
          // Observe a clone of the real response immediately; do not replace or modify it.
          // No password request or raw response body is retained.
          if (certified || dashboard) response.clone().text().then(text => {
            if (certified) observed.responses.push({ stage: atStage, status: response.status, code: /"code"\s*:\s*"(CONFLICT|FRESH_AUTH_REQUIRED)"/.exec(text)?.[1] || null, codeFieldPresent: /"code"\s*:/.test(text), successFalse: /"success"\s*:\s*false/.test(text), targetsOld: body.includes(oldRunId), targetsNew: !!newRunId && body.includes(newRunId) });
            else observed.reads.push({ stage: atStage, containsNewRun: !!newRunId && text.includes(newRunId), containsOldRun: text.includes(oldRunId) });
          }).catch(() => observed.errors.push('Actual close action response clone could not be read'));
          return response;
        };
      }, { oldRunId: x.closeRunId });
      await context.route('**/*', route => { const origin = new URL(route.request().url()).origin; if (origin === base) return route.continue(); if (!row.blockedOrigins.includes(origin)) row.blockedOrigins.push(origin); return route.abort(); });
      const signed = await context.request.post(base + '/api/auth/sign-in/email', { data: { email: actor.email, password }, headers: { Origin: base }, timeout: 180000, maxRedirects: 0 }); assert.equal(signed.status(), 200);
      page = await context.newPage(); page.on('pageerror', error => row.errors.push(f.safe(error, secrets))); page.on('download', download => downloads.push(download));
      page.on('request', request => {
        if (request.method() !== 'POST' || !request.headers()['next-action']) return;
        const body = request.postData() || ''; if (body.includes('closeRunId') && body.includes('CERTIFIED')) row.requests.push({ stage, targetsOld: body.includes(x.closeRunId), targetsNew: !!newer && body.includes(newer.closeRunId) });
      });
      const operationBefore = await d.h.financial(), oldHistory = f.hash(await retained(x));
      await page.goto(base + '/' + locale + '/dashboard/accounting/close', { waitUntil: 'domcontentloaded' }); await expect(page.getByRole('heading', { name: c.title, exact: true })).toBeVisible();
      const proof = page.getByRole('region', { name: c.proof, exact: true }), button = page.getByRole('button', { name: c.export, exact: true }), identity = page.getByRole('form', { name: c.identity, exact: true });
      await expect(proof.getByText(c.operational, { exact: true })).toBeVisible(); await expect(button).toBeEnabled();
      const initial = await getCloseAssuranceDashboard(x.organizationId, x.periodId); assert.equal(initial.run.id, x.closeRunId); assert.equal(initial.currentProof.assessmentState, 'CURRENT');
      await setStage('identity-before-source-change'); await press(button, 'request-fresh-identity'); await expect(identity).toBeVisible();
      await expect.poll(async () => { await observe(); return row.responses.filter(item => item.code === 'FRESH_AUTH_REQUIRED').length; }).toBe(1);
      assert.equal(downloads.length, 0); assert.equal(await db.closePackExport.count({ where: { organizationId: x.organizationId, closeRunId: x.closeRunId, isCertified: true } }), 0);
      await expect(identity.getByLabel(c.password, { exact: true })).toBeFocused(); await identity.getByLabel(c.password, { exact: true }).fill(password); await press(identity.getByRole('button', { name: c.verify, exact: true }), 'verify-current-password');
      await expect(page.getByText(c.verified, { exact: true })).toBeVisible(); await expect(identity).not.toBeVisible(); await expect(button).toBeFocused();
      assert.equal(row.requests.length, 1); assert.equal(downloads.length, 0);
      const notes = page.getByLabel(c.notes, { exact: true }), note = 'Local synthetic unsaved review remains after conflict'; await notes.fill(note); await expect(notes).toHaveValue(note);
      await shot('current-before-new-assessment');
      newer = await d.assessment(x, 'unique-browser-' + locale); assert.notEqual(newer.closeRunId, x.closeRunId); await setStage('stale-old-submission');
      await press(button, 'submit-retained-old-assessment');
      await expect(page.getByRole('alert').filter({ hasText: c.conflict }).first()).toBeVisible();
      await expect.poll(async () => { await observe(); return row.responses.filter(item => item.code === 'CONFLICT' && item.targetsOld).length; }).toBe(1);
      await expect.poll(async () => { await observe(); return row.reads.some(item => item.stage === 'stale-old-submission' && item.containsNewRun); }).toBe(true);
      await expect(button).toBeEnabled(); await expect(notes).toHaveValue(note); await expect(proof.getByText(c.operational, { exact: true })).toBeVisible();
      await shot('conflict-refreshed-latest'); assert.equal(row.requests.length, 2); assert.equal(downloads.length, 0);
      assert.equal(await db.closePackExport.count({ where: { organizationId: x.organizationId, closeRunId: x.closeRunId, isCertified: true } }), 0); assert.equal(f.hash(await retained(x)), oldHistory);
      const historical = await getCloseAssuranceDashboard(x.organizationId, x.periodId, x.closeRunId), oldProof = await getProofTrail({ organizationId: x.organizationId, subjectType: 'close.run', subjectId: x.closeRunId }, db);
      assert.equal(historical.currentProof.assessmentState, 'HISTORICAL'); assert.equal(historical.controls.certificationAvailable, false); assert.equal(historical.controls.packExportAvailable, true); assert.ok(oldProof.blockers.some(item => item.id === 'close-assessment-not-current'));
      row.retainedOldProof = { assessmentState: historical.currentProof.assessmentState, grade: historical.currentProof.grade, blockers: oldProof.blockers.map(item => item.id), draftAvailable: historical.controls.packExportAvailable, hashUnchanged: true, serviceReadOnly: true };
      await setStage('explicit-latest-retry'); await press(button, 'explicit-certify-latest'); await expect.poll(() => downloads.length, { timeout: 180000 }).toBe(1);
      assert.equal(row.requests.length, 3); assert.equal(row.requests[2].targetsNew, true); assert.equal(row.requests[2].targetsOld, false);
      const file = 'close-unique-current-browser-' + run + '-' + locale + '-certified.json', destination = path.join(__dirname, file); assert.equal(fs.existsSync(destination), false); await downloads[0].saveAs(destination); assert.equal(await downloads[0].failure(), null);
      const bytes = fs.readFileSync(destination), payload = JSON.parse(bytes.toString('utf8')), canonical = { ...payload, export: { ...payload.export } }; delete canonical.export.contentHash;
      assert.equal(payload.organization.id, x.organizationId); assert.equal(payload.closeRun.id, newer.closeRunId); assert.equal(payload.export.generatedById, actor.id); assert.equal(payload.export.mode, 'CERTIFIED'); assert.equal('sha256:' + sha(stableJsonStringify(canonical)), payload.export.contentHash); assert.ok(payload.export.certificationLimitations.length > 0);
      const artifacts = await db.closePackExport.findMany({ where: { organizationId: x.organizationId, closeRunId: newer.closeRunId, contentHash: payload.export.contentHash, watermarkId: payload.export.watermarkId } }); assert.equal(artifacts.length, 1); assert.equal(artifacts[0].isCertified, true);
      await expect(proof.getByText(c.certified, { exact: true })).toBeVisible(); await expect(page.getByText(c.recorded, { exact: true })).toBeVisible(); await expect(button).toBeDisabled(); await expect(notes).toHaveValue(note);
      const layout = await proof.evaluate(element => ({ viewport: innerWidth, documentWidth: document.documentElement.scrollWidth, width: element.clientWidth, contentWidth: element.scrollWidth, reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches })); assert.ok(layout.documentWidth <= layout.viewport + 1); assert.ok(layout.contentWidth <= layout.width + 1); assert.equal(layout.reducedMotion, true);
      await proof.scrollIntoViewIfNeeded(); await shot('latest-certification-recorded'); assert.equal(f.hash(await retained(x)), oldHistory); assert.equal((await d.h.financial()).hash, operationBefore.hash);
      row.artifact = { file, fileSha256: sha(bytes), contentHash: payload.export.contentHash, documentExportId: payload.export.exportId, recordExportId: artifacts[0].id, systemEvidenceOnly: true }; row.newRunId = newer.closeRunId; row.layout = layout; row.noAutomaticRetry = true; row.reviewDraftPreserved = true; row.noOperationFinancialEffects = true; row.passed = row.errors.length === 0;
    } catch (error) { row.error = f.safe(error, secrets); row.stack = f.safe(error.stack || error, secrets); row.failedStage = stage; if (page && !page.isClosed()) await shot('failed-' + stage).catch(() => {}); }
    finally { if (page && !page.isClosed()) await observe().catch(error => row.errors.push('Observer finalization: ' + f.safe(error, secrets))); if (context) await context.close(); if (row.errors.length || row.responseObserverErrors?.length) row.passed = false; }
    console.log(JSON.stringify({ locale, width, passed: row.passed, failedStage: row.failedStage, error: row.error })); return row;
  }
  async function main() {
    report.listenerBefore = listener(); await helper.withClient(f.target, helper.assertOwned); report.sourcesBefore = sources(); report.outsideBefore = await outside(); report.financialBeforeSetup = await d.h.financial();
    const fixtures = [];
    for (const locale of ['en', 'fr']) { const fixture = await b.browserFixture(locale); secrets.push(fixture.password); const saved = await exportClosePack(fixture.x.organizationId, { closeRunId: fixture.x.closeRunId, mode: 'DRAFT_NOT_CERTIFIED' }, { actorId: fixture.actor.id, actorPermissions: ['accounting.close.export'] }); fixture.retainedDraftId = saved.exportId; fixtures.push(fixture); }
    report.fixtures = fixtures.map(({ x, actor, retainedDraftId }) => ({ organizationId: x.organizationId, closeRunId: x.closeRunId, makerId: x.makerId, certifierId: actor.id, retainedDraftId })); report.financialAfterSetup = await d.h.financial();
    const browser = await chromium.launch({ headless: true }); try { for (const [i, pair] of [['en', 1440], ['fr', 320]].entries()) report.journeys.push(await journey(browser, fixtures[i], ...pair)); } finally { await browser.close(); }
  }
  async function runMain() {
    try { await main(); } catch (error) { report.error = f.safe(error, secrets); report.prerequisite = error.prerequisite; }
    finally {
      try { report.listenerAfter = listener(); report.sourcesAfter = sources(); report.sourceStable = JSON.stringify(report.sourcesBefore) === JSON.stringify(report.sourcesAfter); report.outsideAfter = await outside(); report.outsideUnchanged = report.outsideBefore?.hash === report.outsideAfter.hash; report.financialAfter = await d.h.financial(); report.noOperationFinancialEffects = report.financialAfterSetup?.hash === report.financialAfter.hash; } catch (error) { report.finalizationError = f.safe(error, secrets); }
      report.fixtureOrganizations = [...organizations]; report.passed = !report.error && !report.finalizationError && report.journeys.length === 2 && report.journeys.every(row => row.passed) && report.sourceStable && report.outsideUnchanged && report.noOperationFinancialEffects;
      const file = path.join(__dirname, 'close-unique-current-browser-' + run + '.json'); fs.writeFileSync(file, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify({ file, passed: report.passed, error: report.error, sourceStable: report.sourceStable, outsideUnchanged: report.outsideUnchanged, noOperationFinancialEffects: report.noOperationFinancialEffects })); await db.$disconnect(); if (!report.passed) process.exitCode = 1;
    }
  }
  module.exports = { sources, journey };
  if (require.main === module) runMain();
}
