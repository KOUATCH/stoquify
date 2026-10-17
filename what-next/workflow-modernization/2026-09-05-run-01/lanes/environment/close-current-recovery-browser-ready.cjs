// Uninstrumented acceptance derivative: wait for the final export control to be enabled before attempting keyboard focus. Original acceptance assertions remain unchanged.
// New real-response browser journey; never execute historical delayed-detection journey.
if (require.main === module && process.argv[2] !== '--run') {
  console.log('Prepared only. Use --run after coordinator release and verified STOQUIFY_CLOSE_BROWSER_LISTENER_PID.');
} else {
  const r = require('./close-current-recovery-runtime.cjs');
  const b = require('./close-denial-recovery-browser.cjs');
  const { d, f, db, helper, root, organizations } = r, { fs, path, crypto, assert } = f;
  const { execFileSync } = require('node:child_process');
  const { chromium, expect: baseExpect } = require('@playwright/test');
  const expect = baseExpect.configure({ timeout: 60000 });
  const { stableJsonStringify } = require(path.join(root, 'services/events/business-event.service.ts'));
  const run = crypto.randomUUID(), base = 'http://127.0.0.1:3110', secrets = [];
  const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
  const files = [__filename, ...[
    'components/cash-command/CashCommandDashboard.tsx', 'components/cash-command/cash-command.module.css',
    'components/finance/finance-dashboard-theme.ts', 'components/bi/BIActionPriorityBoard.tsx', 'components/bi/BIProofDrawerHost.tsx',
    'components/evidence/ProofTrailDrawer.tsx', 'components/evidence/EvidenceGradeBadge.tsx', 'components/evidence/proof-trail-presentation.ts',
    'actions/evidence/proof-trail.actions.ts', 'lib/dashboard/bi-presentation.ts',
    'app/[locale]/(dashboard)/dashboard/finance/cash-command/page.tsx',
    'app/[locale]/(dashboard)/dashboard/finance/finance-route-access.tsx', 'app/[locale]/(dashboard)/dashboard/finance/finance-route-data-access.ts',
  ].map(file => path.join(root, file))];
  const sources = () => ({ ...r.sources(), ...b.sources(), ...Object.fromEntries(files.map(file => [path.relative(root, file).replaceAll('\\', '/'), sha(fs.readFileSync(file))])) });
  const report = { run, at: new Date().toISOString(), journeys: [], scope: 'Actual localhost EN1440/FR320 application and real sign-in; actual service setup and READY/T4, zero-count immediate invalidation, current assessment and independent manual certified export. Cash must recover while old explicit proof remains blocked. No response mocks, migrations, seeds, external origins, delivery workers or customer approvals.',
    limitations: ['Setup creates one synthetic balanced journal per owned organization; operation fingerprints begin afterwards.', 'Keyboard/focus/reflow/reduced-motion checks are bounded observations, not accessibility certification.', 'System evidence and synthetic actors do not establish professional or statutory approval.', 'Artifact document exportId may differ from DB record ID; bind tenant/run/watermark/content hash.'] };
  function listener() {
    const expected = Number(process.env.STOQUIFY_CLOSE_BROWSER_LISTENER_PID); assert.ok(Number.isSafeInteger(expected) && expected > 0);
    const escaped = root.toLowerCase().replaceAll("'", "''");
    const command = `$ErrorActionPreference='Stop'; $rows=@(Get-NetTCPConnection -LocalPort 3110 -State Listen); if($rows.Count -ne 1){throw 'Expected one owned listener'}; $row=$rows[0]; $proc=Get-CimInstance Win32_Process -Filter ('ProcessId='+$row.OwningProcess); $parent=Get-CimInstance Win32_Process -Filter ('ProcessId='+$proc.ParentProcessId); $commands=(@($proc.CommandLine,$parent.CommandLine) -join ' '); [pscustomobject]@{address=$row.LocalAddress;pid=$proc.ProcessId;workspaceMatches=$commands.ToLowerInvariant().Contains('${escaped}');nextDevelopmentCommand=($commands -match 'next.+dev.+-p.+3110')} | ConvertTo-Json -Compress`;
    const value = JSON.parse(execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], { encoding: 'utf8', windowsHide: true, timeout: 30000 }).trim());
    assert.equal(value.address, '127.0.0.1'); assert.equal(value.pid, expected); assert.equal(value.workspaceMatches, true); assert.equal(value.nextDevelopmentCommand, true); return value;
  }
  async function outside() {
    const value = await r.outside(), user = { organizationId: { notIn: organizations } };
    const accounts = await db.account.findMany({ where: { user }, orderBy: { id: 'asc' } }), sessions = await db.session.findMany({ where: { user }, orderBy: { id: 'asc' } });
    return { hash: f.hash({ records: value.hash, accounts: f.hash(accounts), sessions: f.hash(sessions) }), records: value };
  }
  const copy = {
    en: { cash: 'Cash Command Intelligence', banner: 'Cash trust banner', signal: 'Close blockers', review: 'Review required', invalidated: 'Close evidence has been invalidated', actions: 'What needs action today',
      close: 'Close & Assurance Center', proof: 'Current close evidence', operational: 'Operational evidence', certified: 'Current certification evidence', export: 'Export certified JSON', refresh: 'Refresh',
      identity: 'Confirm your identity', password: 'Current password', verify: 'Verify identity', verified: 'Identity verified. Retry your selected action.', proofButton: 'Close proof', drawer: 'Proof Trail', drawerClose: 'Close proof', noProofBlockers: 'No proof blockers were returned for this record.' },
    fr: { cash: 'Pilotage de la trésorerie', banner: 'État des preuves de trésorerie', signal: 'Blocages de clôture', review: 'Examen requis', invalidated: 'Les preuves de clôture ont été invalidées', actions: 'Actions à traiter aujourd’hui',
      close: 'Centre De Cloture', proof: 'Preuves actuelles de clôture', operational: 'Preuves opérationnelles', certified: 'Preuves de certification à jour', export: 'Exporter JSON certifie', refresh: 'Actualiser',
      identity: 'Confirmez votre identité', password: 'Mot de passe actuel', verify: 'Vérifier l’identité', verified: 'Identité vérifiée. Réessayez l’action choisie.', proofButton: 'Preuves de clôture', drawer: 'Piste de preuve', drawerClose: 'Fermer la preuve', noProofBlockers: 'Aucun blocage de preuve n’a été renvoyé pour ce document.' },
  };
  async function journey(browser, fixture, locale, width) {
    const { x, actor, password } = fixture, c = copy[locale]; secrets.push(password);
    const row = { locale, width, organizationId: x.organizationId, oldRunId: x.closeRunId, actorId: actor.id, screenshots: [], steps: [], keyboard: [], exportRequests: [], proofRequests: [], errors: [], blockedOrigins: [], passed: false };
    let context, page, recovered, stage = 'initial'; const downloads = [];
    const shot = async label => { const file = 'close-current-recovery-browser-ready-' + run + '-' + locale + width + '-' + label + '.png'; await page.screenshot({ path: path.join(__dirname, file), animations: 'disabled' }); row.screenshots.push(file); };
    const layout = async target => {
      const value = await target.evaluate(element => ({ viewport: innerWidth, documentWidth: document.documentElement.scrollWidth, width: element.clientWidth, contentWidth: element.scrollWidth, reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches }));
      assert.ok(value.documentWidth <= value.viewport + 1); assert.ok(value.contentWidth <= value.width + 1); assert.equal(value.reducedMotion, true); return value;
    };
    const press = async (target, action) => {
      await target.scrollIntoViewIfNeeded(); await target.focus(); await expect(target).toBeFocused();
      const state = await target.evaluate(element => { const css = getComputedStyle(element); return { focused: document.activeElement === element, outline: css.outlineStyle, width: css.outlineWidth, shadow: css.boxShadow }; });
      assert.ok(state.focused && ((state.outline !== 'none' && Number.parseFloat(state.width) > 0) || state.shadow !== 'none')); row.keyboard.push({ action, ...state }); await page.keyboard.press('Enter');
    };
    const cashCard = async (tone, value, label) => {
      await page.goto(base + '/' + locale + '/dashboard/finance/cash-command', { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { name: c.cash, exact: true })).toBeVisible();
      const banner = page.getByRole('region', { name: c.banner, exact: true });
      const card = banner.getByText(c.signal, { exact: true }).locator('../..');
      await expect(card.getByText(value, { exact: true })).toBeVisible();
      assert.ok((await card.getAttribute('class')).includes('bg-[var(--dash-' + tone + '-soft)]'), 'Close trust tone must match actual state');
      row.steps.push({ id: label, value, tone, layout: await layout(card) }); await card.scrollIntoViewIfNeeded(); await shot(label); return card;
    };
    try {
      context = await browser.newContext({ viewport: { width, height: 1000 }, locale: locale === 'fr' ? 'fr-FR' : 'en-GB', reducedMotion: 'reduce', acceptDownloads: true });
      context.setDefaultTimeout(60000); context.setDefaultNavigationTimeout(180000);
      await context.route('**/*', route => { const origin = new URL(route.request().url()).origin; if (origin === base) return route.continue(); if (!row.blockedOrigins.includes(origin)) row.blockedOrigins.push(origin); return route.abort(); });
      const signed = await context.request.post(base + '/api/auth/sign-in/email', { data: { email: actor.email, password }, headers: { Origin: base }, timeout: 180000, maxRedirects: 0 }); assert.equal(signed.status(), 200);
      page = await context.newPage(); page.on('pageerror', error => row.errors.push(f.safe(error, secrets))); page.on('download', download => downloads.push(download));
      page.on('request', request => {
        if (request.method() !== 'POST' || !request.headers()['next-action']) return;
        const body = request.postData() || '';
        if (body.includes('closeRunId') && body.includes('CERTIFIED')) row.exportRequests.push({ stage, at: new Date().toISOString() });
        if (body.includes('close.run') && body.includes('subjectId')) row.proofRequests.push({ stage, targetsCurrent: !!recovered && body.includes(recovered.closeRunId), targetsOld: body.includes(x.closeRunId) });
      });
      const operationBefore = await r.financial(); const oldHistory = f.hash(await d.history(x));
      await cashCard('info', '0', 'cash-ready-operational');
      stage = 'count-posted'; const posted = await d.postPreparedCount(x), invalidated = await d.denialState(x);
      assert.equal(invalidated.run.status, 'BLOCKED'); assert.equal(invalidated.run.metadata.staleState.status, 'EVIDENCE_STALE'); assert.equal(invalidated.events.length, 1);
      assert.equal(row.exportRequests.length, 0); assert.equal(f.hash(await d.history(x)), oldHistory);
      const retainedInvalidation = f.hash(invalidated), blocked = await r.observe(x, 'blocked', { latestId: x.closeRunId, explicitGrade: 'blocked', tone: 'danger' });
      const card = await cashCard('danger', c.review, 'cash-immediate-review');
      const summary = card.locator('summary'); await expect(summary).toHaveCount(1); await press(summary, 'open-close-conditions');
      await expect(card.getByText(c.invalidated, { exact: true })).toBeVisible(); await layout(card); await shot('localized-close-conditions');
      const board = page.locator('section').filter({ has: page.getByRole('heading', { name: c.actions, exact: true }) });
      const action = board.locator('a[href="/' + locale + '/dashboard/accounting/close"]').first(); await expect(action).toBeVisible(); await press(action, 'authorized-close-action');
      await expect(page.getByRole('heading', { name: c.close, exact: true })).toBeVisible();
      const proof = page.getByRole('region', { name: c.proof, exact: true }); await expect(proof.getByText(c.review, { exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: c.export, exact: true })).toBeDisabled(); await shot('close-blocked-before-certification-attempt');
      row.steps.push({ id: 'immediate-invalidation', eventId: invalidated.events[0].id, countEventId: posted.eventId, noCertificationAttempt: row.exportRequests.length === 0, serviceObservation: blocked });
      stage = 'reassessment'; recovered = await d.assessment(x, 'cash-current-browser-' + locale); assert.notEqual(recovered.closeRunId, x.closeRunId);
      await press(page.getByRole('button', { name: c.refresh, exact: true }), 'refresh-new-assessment'); await expect(proof.getByText(c.operational, { exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: c.export, exact: true })).toBeEnabled(); assert.equal(row.exportRequests.length, 0);
      await cashCard('info', '0', 'cash-reassessed-operational');
      await page.goto(base + '/' + locale + '/dashboard/accounting/close', { waitUntil: 'domcontentloaded' }); await expect(proof.getByText(c.operational, { exact: true })).toBeVisible();
      stage = 'certification'; const button = page.getByRole('button', { name: c.export, exact: true }), identity = page.getByRole('form', { name: c.identity, exact: true });
      await expect(button).toBeEnabled();
      await press(button, 'manual-certified-export');
      await expect.poll(async () => downloads.length ? 'download' : await identity.isVisible() ? 'identity' : 'pending', { timeout: 180000 }).not.toBe('pending');
      if (await identity.isVisible()) {
        const requests = row.exportRequests.length; await identity.getByLabel(c.password, { exact: true }).fill(password); await press(identity.getByRole('button', { name: c.verify, exact: true }), 'verify-current-password');
        await expect(page.getByText(c.verified, { exact: true })).toBeVisible(); await expect(identity).not.toBeVisible(); await expect(button).toBeFocused();
        assert.equal(row.exportRequests.length, requests); assert.equal(downloads.length, 0); await press(button, 'manual-export-after-authentication');
      }
      await expect.poll(() => downloads.length, { timeout: 180000 }).toBe(1);
      const file = 'close-current-recovery-browser-ready-' + run + '-' + locale + '-certified.json', destination = path.join(__dirname, file); assert.equal(fs.existsSync(destination), false);
      await downloads[0].saveAs(destination); assert.equal(await downloads[0].failure(), null);
      const bytes = fs.readFileSync(destination), payload = JSON.parse(bytes.toString('utf8')), canonical = { ...payload, export: { ...payload.export } }; delete canonical.export.contentHash;
      assert.equal(payload.organization.id, x.organizationId); assert.equal(payload.closeRun.id, recovered.closeRunId); assert.equal(payload.export.generatedById, actor.id); assert.equal(payload.export.mode, 'CERTIFIED');
      assert.equal(payload.annexes.inventoryValuation.freshness.status, 'FRESH'); assert.ok(payload.export.certificationLimitations.length > 0); assert.equal('sha256:' + sha(stableJsonStringify(canonical)), payload.export.contentHash);
      const retained = await db.closePackExport.findMany({ where: { organizationId: x.organizationId, closeRunId: recovered.closeRunId, watermarkId: payload.export.watermarkId, contentHash: payload.export.contentHash } }); assert.equal(retained.length, 1); assert.equal(retained[0].isCertified, true);
      await expect(proof.getByText(c.certified, { exact: true })).toBeVisible(); await shot('close-current-certified');
      row.artifact = { file, fileSha256: sha(bytes), contentHash: payload.export.contentHash, documentExportId: payload.export.exportId, recordExportId: retained[0].id, systemEvidenceOnly: true };
      stage = 'cash-recovered'; const observed = await r.observe(recovered, 'certified', { latestId: recovered.closeRunId, explicitGrade: 'certified', tone: 'success', noBlockers: true });
      const recoveredCard = await cashCard('success', '0', 'cash-recovered-certified'); await expect(recoveredCard.locator('summary')).toHaveCount(0);
      const trigger = page.getByRole('button', { name: c.proofButton, exact: true }); await press(trigger, 'open-current-close-proof');
      const drawer = page.getByRole('dialog', { name: c.drawer, exact: true }); await expect(drawer).toBeVisible(); await expect(drawer.getByText(c.noProofBlockers, { exact: true })).toBeVisible();
      await expect.poll(() => row.proofRequests.length).toBeGreaterThan(0); assert.ok(row.proofRequests.at(-1).targetsCurrent); assert.equal(row.proofRequests.at(-1).targetsOld, false);
      await layout(drawer); await shot('cash-current-proof-handoff'); await press(drawer.getByRole('button', { name: c.drawerClose, exact: true }), 'close-current-proof'); await expect(drawer).not.toBeVisible(); await expect(trigger).toBeFocused();
      assert.equal(f.hash(await d.denialState(x)), retainedInvalidation); assert.equal(f.hash(await d.history(x)), oldHistory);
      const old = await r.observe(x, 'certified', { latestId: recovered.closeRunId, explicitGrade: 'blocked', noBlockers: true });
      assert.equal((await r.financial()).hash, operationBefore.hash); row.steps.push({ id: 'cash-current-recovery', serviceObservation: observed, explicitOldProof: old, retainedOldHistory: true, noOperationFinancialEffects: true });
      row.recoveredRunId = recovered.closeRunId; row.passed = row.errors.length === 0;
    } catch (error) { row.error = f.safe(error, secrets); row.stack = f.safe(error.stack || error, secrets); row.failedStage = stage; if (page && !page.isClosed()) await shot('failed-' + stage).catch(() => {}); }
    finally { if (context) await context.close(); }
    console.log(JSON.stringify({ locale, width, passed: row.passed, failedStage: row.failedStage, error: row.error })); return row;
  }
  async function main() {
    report.listenerBefore = listener(); await helper.withClient(f.target, helper.assertOwned); report.sourcesBefore = sources(); report.outsideBefore = await outside(); report.financialBeforeSetup = await r.financial();
    const fixtures = [];
    for (const locale of ['en', 'fr']) { const value = await b.browserFixture(locale); secrets.push(value.password); await r.prepareCashActor(value.x); fixtures.push(value); }
    report.fixtures = fixtures.map(({ x, actor, modules, permissions }) => ({ organizationId: x.organizationId, closeRunId: x.closeRunId, makerId: x.makerId, certifierId: actor.id, countSessionId: x.countSetup.countSessionId, modules, permissions }));
    report.financialAfterSetup = await r.financial(); const browser = await chromium.launch({ headless: true });
    try { for (const [i, values] of [['en', 1440], ['fr', 320]].entries()) report.journeys.push(await journey(browser, fixtures[i], ...values)); }
    finally { await browser.close(); }
  }
  async function runMain() {
    try { await main(); } catch (error) { report.error = f.safe(error, secrets); report.prerequisite = error.prerequisite; }
    finally {
      try { report.listenerAfter = listener(); report.sourcesAfter = sources(); report.sourceStable = JSON.stringify(report.sourcesBefore) === JSON.stringify(report.sourcesAfter); report.outsideAfter = await outside(); report.outsideUnchanged = report.outsideBefore?.hash === report.outsideAfter.hash; report.financialAfter = await r.financial(); report.noOperationFinancialEffects = report.financialAfterSetup?.hash === report.financialAfter.hash; }
      catch (error) { report.finalizationError = f.safe(error, secrets); }
      report.fixtureOrganizations = [...organizations]; report.passed = !report.error && !report.finalizationError && report.journeys.length === 2 && report.journeys.every(row => row.passed) && report.sourceStable && report.outsideUnchanged && report.noOperationFinancialEffects;
      const file = path.join(__dirname, 'close-current-recovery-browser-ready-' + run + '.json'); fs.writeFileSync(file, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
      console.log(JSON.stringify({ file, passed: report.passed, error: report.error, sourceStable: report.sourceStable, outsideUnchanged: report.outsideUnchanged, noOperationFinancialEffects: report.noOperationFinancialEffects })); await db.$disconnect(); if (!report.passed) process.exitCode = 1;
    }
  }
  module.exports = { sources, outside, journey };
  if (require.main === module) runMain();
}
