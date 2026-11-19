'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { installDomObserver, attachProtocol, requestNames, responseNames, pick, safeUrl } = require('./browser-protocol-v3.cjs');
const { classifyBytes, bindProfileConsumer, classifyConsumer } = require('./consumer-evidence-v2.cjs');
const { deniedBytesClear } = require('./private-canaries.cjs');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');

async function runBrowserDiagnostic(fixture, controls, helpers) {
  assert.equal(fixture.baseURL, 'https://localhost:3296');
  assert.equal(fixture.profileReadActionBinding?.exportedName, 'getSelfProfileAction');
  assert.equal(fixture.profileReadActionBinding.actionIdSha256, hash(fixture.profileReadActionBinding.actionId));
  for (const name of ['createContext', 'signIn', 'closeContext', 'safe', 'getResponseCapture', 'sanitize', 'assertNoSecrets']) assert.equal(typeof helpers[name], 'function', name);
  const output = path.join(__dirname, 'consumer-attempt01');
  await fs.mkdir(output, { recursive: false });
  const historicalIds = ['en', 'fr'].flatMap(locale => ['authorized', 'invalidated-reload', 'restored'].map(state => 'R06-UI-' + locale + '-' + state));
  const mapPath = path.join(__dirname, '../../qualification-20261109-r1/inventory/test-case-map.json');
  const mapBytes = await fs.readFile(mapPath);
  assert.deepEqual(JSON.parse(mapBytes).cases.filter(row => row.id.startsWith('R06-UI-')).map(row => row.id), historicalIds);
  const report = {
    startedAt: new Date().toISOString(), packageId: 'P04-R06', qualification: '20261110-r3',
    candidateId: fixture.candidateId, artifactSha256: fixture.artifactSha256,
    sourceManifestSha256: fixture.sourceManifestSha256 ?? null,
    baseURL: fixture.baseURL, actionBinding: fixture.profileReadActionBinding,
    sourceFiles: {}, historicalTestMapSha256: hash(mapBytes), historicalIds,
    contract: 'Original browser bytes plus exact required-consumer completion; retains actual cancellations and unchanged historical failed evidence.',
    viewport: { width: 1440, height: 1000 }, contextLocale: 'en-US',
    checks: [], observations: [], responses: [], native: [], domEvents: [], protocol: [], navigationProofs: [], refreshProofs: [], transitions: [], signIns: [], cleanup: [], passed: false,
  };
  for (const file of ['run-consumer-qualification-v4.cjs', 'browser-protocol-v3.cjs', 'consumer-evidence-v2.cjs', 'flight-profile-evidence.cjs', 'private-canaries.cjs']) report.sourceFiles[file] = hash(await fs.readFile(path.join(__dirname, file)));
  let responseSequence = 0, contextSequence = 0;
  const contexts = new Set();
  const bounded = async (name, operation, ms) => {
    let timer;
    try { return await Promise.race([operation(), new Promise((_, reject) => { timer = setTimeout(() => { const error = new Error(name + ' exceeded its bound'); error.code = 'OBSERVER_TIMEOUT'; reject(error); }, ms); })]); }
    finally { clearTimeout(timer); }
  };
  async function persist(final = false) {
    const sanitized = await helpers.sanitize(report), text = JSON.stringify(sanitized, null, 2) + '\n';
    await helpers.assertNoSecrets(text);
    if (final) await fs.writeFile(path.join(output, 'result.json'), text, { flag: 'wx' });
    else { await fs.writeFile(path.join(output, 'progress.next.json'), text); await fs.rename(path.join(output, 'progress.next.json'), path.join(output, 'progress.json')); }
    return sanitized;
  }
  async function context(alias, phase) {
    const value = await helpers.createContext({ ignoreHTTPSErrors: true, viewport: report.viewport, locale: report.contextLocale, serviceWorkers: 'block' });
    contexts.add(value);
    const signed = await helpers.signIn(value, alias);
    assert(typeof signed.token === 'string' && signed.token.length > 0);
    const page = await value.newPage(), domEvents = [], contextId = 'context-' + (++contextSequence);
    await installDomObserver(page, domEvents);
    report.signIns.push({ alias, phase, contextId, at: new Date().toISOString(), realSessionAcquired: true, evidence: signed.evidence ?? null });
    return { value, page, signed, contextId, domEvents, alias };
  }
  async function close(value) {
    await bounded('Owned context cleanup', () => helpers.closeContext(value), 20000);
    contexts.delete(value); report.cleanup.push({ closed: true, kind: 'browser_context' });
  }
  async function record(id, session, action) {
    const check = { id, contextId: session.contextId, alias: session.alias, startedAt: new Date().toISOString(), passed: false };
    report.checks.push(check);
    let before, error;
    try { before = await controls.snapshot(id + '-consumer-r2-before'); check.detail = await action(); }
    catch (caught) { error = caught; }
    if (before) {
      try {
        const after = await controls.snapshot(id + '-consumer-r2-after');
        check.effects = {
          before: before.evidence, after: after.evidence,
          businessEqual: before.businessSha256 === after.businessSha256,
          changedTables: after.tables.filter(row => before.tables.find(previous => previous.table === row.table)?.sha256 !== row.sha256).map(row => row.table),
          sessionsEqual: JSON.stringify(before.sessionRows) === JSON.stringify(after.sessionRows),
          auditsEqual: JSON.stringify(before.auditRows) === JSON.stringify(after.auditRows),
          accountsEqual: JSON.stringify(before.accountRows) === JSON.stringify(after.accountRows),
          usersEqual: JSON.stringify(before.userRows) === JSON.stringify(after.userRows),
        };
        report.native.push({ id, ...check.effects });
        assert(check.effects.businessEqual && !check.effects.changedTables.length && check.effects.sessionsEqual && check.effects.auditsEqual && check.effects.accountsEqual && check.effects.usersEqual, 'Browser read/denial caused unauthorized native changes');
      } catch (caught) { check.nativeError = helpers.safe(caught); error ??= caught; }
    }
    if (error) check.error = helpers.safe(error); else check.observationAccepted = true;
    check.finishedAt = new Date().toISOString();
    await persist();
    return check;
  }
  async function observe(session, label, locale, expectedPrivate, operation, { requireSessionResponse = false } = {}) {
    const { page, contextId, alias, domEvents } = session, actor = fixture.users[alias];
    const phaseStarted = Date.now(), rows = [], pending = [];
    const protocol = await attachProtocol(page, fixture, helpers.safe);
    const listener = response => {
      const url = safeUrl(response.url());
      if (url?.origin !== fixture.baseURL || !(/^\/api\/(auth|me)\//.test(url.path) || url.path.endsWith('/dashboard/profile'))) return;
      const request = response.request(), requestHeaders = request.headers(), headers = response.headers();
      const row = { sequence: ++responseSequence, label, contextId, alias, at: new Date().toISOString(), path: url.path, origin: url.origin, urlSha256: url.sha256, method: request.method(), status: response.status(), resourceType: request.resourceType(), navigation: request.isNavigationRequest(), requestHeaders: pick(requestHeaders, requestNames), responseHeaders: pick(headers, responseNames), captureId: headers['x-p04-r06-response-id'] ?? null, prefetch: requestHeaders['next-router-prefetch'] === '1' || /prefetch/i.test([requestHeaders.purpose, requestHeaders['sec-purpose']].filter(Boolean).join(' ')) };
      rows.push(row); report.responses.push(row);
      pending.push((async () => {
        const bodyAttempt = bounded('Playwright original response body', () => response.body(), 3000).then(body => { row.playwrightBody = { bytes: body.length, sha256: hash(body) }; }).catch(error => { row.playwrightBodyError = helpers.safe(error); });
        const finishAttempt = bounded('Playwright original response completion', () => response.finished(), 3000).then(error => { if (error) row.playwrightFinishError = helpers.safe(error); else row.playwrightFinished = true; }).catch(error => { row.playwrightFinishError = helpers.safe(error); row.playwrightFinishErrorKind = error.code === 'OBSERVER_TIMEOUT' ? 'observer_timeout' : 'observer_error'; });
        if (row.captureId) {
          try { row.bridge = await bounded('Original bridge capture', () => helpers.getResponseCapture(row.captureId), 20000); } catch (error) { row.bridgeError = helpers.safe(error); }
          try { row.cdp = await bounded('Original browser stream', () => protocol.receipt(row.captureId), 20000); } catch (error) { row.cdpError = helpers.safe(error); }
        }
        await Promise.all([bodyAttempt, finishAttempt]);
        row.byteProof = classifyBytes(row, row.bridge, row.cdp);
      })().catch(error => { row.observerError = helpers.safe(error); row.byteProof = { accepted: false, issues: ['observer_error'] }; }));
    };
    page.on('response', listener);
    let view, error;
    try {
      await operation();
      if (expectedPrivate) {
        await page.waitForURL(url => url.pathname === '/' + locale + '/dashboard/profile', { timeout: 45000 });
        await page.getByText(actor.email, { exact: false }).first().waitFor({ state: 'visible', timeout: 45000 });
      } else await page.waitForFunction(() => Boolean(document.querySelector('#email')?.getClientRects().length) || /This profile is unavailable|Ce profil n’est pas disponible/.test(document.body?.innerText || ''), {}, { timeout: 45000 });
      await page.waitForLoadState('networkidle', { timeout: 20000 });
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const text = await page.locator('body').innerText();
      view = { label, contextId, path: new URL(page.url()).pathname, privateEmailVisible: text.includes(actor.email), loginVisible: await page.locator('#email').isVisible().catch(() => false), profileUnavailable: /This profile is unavailable|Ce profil n’est pas disponible/.test(text), textSha256: hash(text), screenshot: label + '.png', at: new Date().toISOString() };
      await page.screenshot({ path: path.join(output, view.screenshot), fullPage: true, timeout: 30000 });
      view.screenshotSha256 = hash(await fs.readFile(path.join(output, view.screenshot)));
      report.observations.push(view);
      assert.equal(view.privateEmailVisible, expectedPrivate);
      if (!expectedPrivate) {
        assert(view.loginVisible || view.profileUnavailable, 'Concrete denied/recovery state required');
        assert(!Object.values(fixture.users).some(user => [user.id, user.email, user.organizationId].some(value => value && text.includes(value))), 'Revoked view exposes private fixture content');
      }
    } catch (caught) { error = caught; }
    finally {
      page.off('response', listener);
      await Promise.all(pending);
      report.protocol.push({ label, contextId, entries: JSON.parse(JSON.stringify(protocol.entries)), errors: protocol.errors, lifecycle: protocol.lifecycle });
      await protocol.close();
    }
    assert.equal(protocol.errors.length, 0, 'Original request protocol identity lost');
    assert(protocol.entries.every(entry => entry.responseEventCount === 1 && entry.captureId && rows.some(row => row.captureId === entry.captureId && row.cdp?.requestId === entry.requestId && row.cdp?.hop === entry.hop)), 'Selected protocol request missing its original response');
    assert(rows.length > 0 && rows.every(row => row.byteProof?.accepted), 'Original browser bytes incomplete or mismatched');
    const phaseEvents = domEvents.filter(event => event.at >= phaseStarted);
    report.domEvents.push({ label, contextId, events: phaseEvents });
    const required = rows.filter(row => row.method === 'POST');
    if (expectedPrivate) {
      assert(required.length > 0, 'Required actual profile read response is missing');
      for (const row of required) {
        const checkedAt = row.bridge?.profileRead?.checkedAt;
        row.expectedCheckedText = checkedAt ? (locale === 'fr' ? 'Fiche du compte vérifiée le: ' : 'Account record checked: ') + await page.evaluate(({ iso, locale }) => new Date(iso).toLocaleString(locale), { iso: checkedAt, locale }) : null;
        row.acceptanceWindow = { startMs: phaseStarted, endMs: Date.now() };
      }
      for (const row of required) {
        row.profileConsumer = bindProfileConsumer(row, actor, fixture.profileReadActionBinding, phaseEvents, required);
        assert(row.profileConsumer.accepted, 'Exact required profile response not bound to its consumer');
      }
      if (requireSessionResponse) assert(rows.some(row => row.path === '/api/auth/get-session' && row.status === 200 && row.byteProof.accepted && row.bridge?.currentSessionSubject?.[alias] === true), 'Rendered consumer lacks actual current-subject session');
    } else {
      assert(rows.every(row => deniedBytesClear(row.bridge?.containsActorCanary) && deniedBytesClear(row.cdp?.stream?.containsActorCanary)), 'Denied request exposed private actor or organization bytes');
    }
    if (error) throw error;
    return { view, responseSequences: rows.map(row => row.sequence), requiredProfileResponses: required.map(row => row.profileConsumer), phaseStarted, finishedAt: Date.now() };
  }
  async function refresh(session, locale, label, initial) {
    await new Promise(resolve => setTimeout(resolve, 1200));
    const check = await record('R06-UI-' + label + '-refresh', session, () => observe(session, label + '-refresh', locale, true, () => session.page.getByRole('button', { name: locale === 'fr' ? 'Recharger la fiche du compte' : 'Reload current account record', exact: true }).click()));
    const before = Math.max(...(initial.detail?.requiredProfileResponses || []).map(row => Date.parse(row.checkedAt)));
    const after = Math.min(...(check.detail?.requiredProfileResponses || []).map(row => Date.parse(row.checkedAt)));
    const accepted = check.observationAccepted === true && Number.isFinite(before) && Number.isFinite(after) && after > before;
    report.refreshProofs.push({ contextId: session.contextId, initialCase: initial.id, refreshCase: check.id, beforeCheckedAt: before, afterCheckedAt: after, accepted });
    if (!accepted) { check.observationAccepted = false; check.error = 'Explicit profile refresh did not consume a fresh exact result'; }
  }
  async function navigateLocale(session, from, to, label) {
    const check = await record('R06-UI-' + label, session, () => observe(session, label, to, true, async () => {
      await session.page.getByRole('link', { name: from === 'fr' ? 'Switch to English' : 'Passer en français', exact: true }).click();
      await session.page.waitForURL(url => url.pathname === '/' + to + '/dashboard/profile', { timeout: 45000 });
      await session.page.getByText(fixture.users[session.alias].email, { exact: false }).first().waitFor({ state: 'visible', timeout: 45000 });
      await new Promise(resolve => setTimeout(resolve, 1200));
      await session.page.getByRole('button', { name: to === 'fr' ? 'Recharger la fiche du compte' : 'Reload current account record', exact: true }).click();
    }));
    report.navigationProofs.push({ contextId: session.contextId, targetPath: '/' + to + '/dashboard/profile', caseId: check.id, accepted: check.observationAccepted === true, responseSequences: check.detail?.responseSequences || [] });
  }
  async function positive(session, locale, state) {
    const label = locale + '-' + state;
    const initial = await record('R06-UI-' + label, session, () => observe(session, label, locale, true, () => session.page.goto(fixture.baseURL + '/' + locale + '/dashboard/profile', { waitUntil: 'domcontentloaded', timeout: 60000 }), { requireSessionResponse: true }));
    await refresh(session, locale, label, initial);
    const other = locale === 'en' ? 'fr' : 'en';
    await navigateLocale(session, locale, other, label + '-locale-away');
    await navigateLocale(session, other, locale, label + '-locale-return');
  }
  try {
    for (const locale of ['en', 'fr']) {
      const alias = 'browser_' + locale, authorized = await context(alias, 'authorized');
      try {
        await positive(authorized, locale, 'authorized');
        report.transitions.push(await controls.invalidateSession(alias, 'revoke', authorized.signed.token));
        await record('R06-UI-' + locale + '-invalidated-reload', authorized, () => observe(authorized, locale + '-invalidated-reload', locale, false, () => authorized.page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 })));
      } finally { await close(authorized.value); }
      const restored = await context(alias, 'restored');
      try { await positive(restored, locale, 'restored'); } finally { await close(restored.value); }
    }
  } catch (error) { report.fatal = helpers.safe(error); }
  finally {
    for (const value of [...contexts]) { try { await close(value); } catch (error) { report.cleanup.push({ closed: false, kind: 'browser_context', error: helpers.safe(error) }); } }
  }
  for (const row of report.responses) row.consumerProof = classifyConsumer(row, row.byteProof || { issues: ['missing_byte_proof'] }, row.profileConsumer, report.navigationProofs);
  for (const check of report.checks) {
    const rows = report.responses.filter(row => check.detail?.responseSequences?.includes(row.sequence));
    check.passed = check.observationAccepted === true && rows.length > 0 && rows.every(row => row.consumerProof.accepted);
    if (!check.passed && !check.error) check.error = 'Original response consumer obligations unresolved';
  }
  report.notRun = historicalIds.filter(id => !report.checks.some(check => check.id === id));
  report.summary = { historicalPlanned: 6, historicalPassed: report.checks.filter(check => historicalIds.includes(check.id) && check.passed).length, totalChecks: report.checks.length, passed: report.checks.filter(check => check.passed).length, failed: report.checks.filter(check => !check.passed).length, notRun: report.notRun.length, observations: report.observations.length, responses: report.responses.length, actualCanceledResponses: report.responses.filter(row => row.byteProof?.networkCanceled).length, unresolvedResponses: report.responses.filter(row => !row.consumerProof.accepted).length };
  report.strictNetworkGatePassed = report.responses.every(row => row.byteProof?.networkCompleted === true);
  report.passed = !report.fatal && !report.notRun.length && report.checks.length === 18 && report.checks.every(check => check.passed) && report.refreshProofs.length === 4 && report.refreshProofs.every(proof => proof.accepted) && report.navigationProofs.length === 8 && report.navigationProofs.every(proof => proof.accepted) && report.cleanup.every(row => row.closed);
  report.finishedAt = new Date().toISOString();
  return await persist(true);
}

module.exports = { runBrowserDiagnostic };
