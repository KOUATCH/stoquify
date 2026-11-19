'use strict';
// Separately admitted isolated observer. Imports no application, browser launcher or database client.
// Runtime owner supplies real credential sign-in, native fixture controls and original-response capture.
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const RESPONSE_ID_HEADER = 'x-p04-r06-response-id';
const safeRequestHeaders = ['accept', 'content-type', 'sec-fetch-site', 'sec-fetch-mode', 'sec-fetch-dest', 'purpose', 'sec-purpose', 'next-router-prefetch', 'next-router-segment-prefetch', 'rsc'];
const safeResponseHeaders = ['content-type', 'content-length', 'content-encoding', 'cache-control', 'vary', RESPONSE_ID_HEADER];

function pickHeaders(headers, names) {
  return Object.fromEntries(names.filter(name => headers[name] !== undefined).map(name => [name, headers[name]]));
}
function safeUrl(value) {
  if (!value) return null;
  const url = new URL(value);
  return { origin: url.origin, path: url.pathname };
}

// Pure admission of byte evidence. A replay or another request cannot substitute for the original response.
function classifyResponseEvidence(row, direct, receipt, alias) {
  const issues = [];
  if (!row.captureId) issues.push('missing_response_capture_id');
  if (!receipt) issues.push('missing_independent_original_response');
  if (receipt) {
    for (const [key, expected] of [['captureId', row.captureId], ['method', row.method], ['path', row.path], ['status', row.status]]) {
      if (receipt[key] !== expected) issues.push('independent_' + key + '_mismatch');
    }
    if (receipt.complete !== true) issues.push('upstream_response_incomplete');
    if (receipt.downstreamFinished !== true) issues.push('browser_delivery_incomplete');
    if (receipt.downstreamClosedEarly !== false) issues.push('downstream_closed_early_or_unknown');
    if (receipt.aborted !== false) issues.push('response_aborted_or_unknown');
    if (receipt.captureError || receipt.decodeError || !Number.isSafeInteger(receipt.decodedBytes) || receipt.decodedBytes < 0 || !/^[a-f0-9]{64}$/.test(receipt.decodedSha256 || '')) issues.push('decoded_original_bytes_unavailable');
    if (receipt.decodedBytes === 0 && row.method !== 'HEAD' && ![204, 304, 301, 302, 303, 307, 308].includes(row.status)) issues.push('unexpected_empty_response_body');
    const actor = { containsActorCanary: receipt.containsActorCanary?.[alias], currentSessionSubject: receipt.currentSessionSubject?.[alias] };
    if (typeof actor.containsActorCanary !== 'boolean' || typeof actor.currentSessionSubject !== 'boolean') issues.push('independent_actor_classification_missing');
    if (direct) {
      if (direct.bytes !== receipt.decodedBytes || direct.sha256 !== receipt.decodedSha256) issues.push('browser_and_original_bytes_differ');
      if (actor && (direct.containsActorCanary !== actor.containsActorCanary || direct.currentSessionSubject !== actor.currentSessionSubject)) issues.push('browser_and_original_actor_classification_differ');
    }
  }
  if (row.transportError) issues.push('browser_transport_error');
  if (row.browserResponseFinished !== true) issues.push('browser_response_completion_unconfirmed');
  if (!direct && !row.bodyReadError) issues.push('missing_primary_body_attempt_outcome');
  const actor = { containsActorCanary: receipt?.containsActorCanary?.[alias], currentSessionSubject: receipt?.currentSessionSubject?.[alias] };
  return {
    qualified: issues.length === 0,
    issues,
    source: direct ? 'playwright_body_and_independent_original_response' : 'independent_original_response_with_retained_playwright_error',
    primaryBodyReadFailed: Boolean(row.bodyReadError),
    browserBodyRetrieved: Boolean(direct),
    browserResponseFinished: row.browserResponseFinished === true,
    bytes: direct?.bytes ?? receipt?.decodedBytes ?? null,
    sha256: direct?.sha256 ?? receipt?.decodedSha256 ?? null,
    containsActorCanary: direct?.containsActorCanary ?? actor?.containsActorCanary ?? null,
    currentSessionSubject: direct?.currentSessionSubject ?? actor?.currentSessionSubject ?? null,
  };
}

async function runBrowserDiagnostic(fixture, controls, helpers) {
  assert.equal(fixture.baseURL, 'https://localhost:3296');
  for (const name of ['createContext', 'signIn', 'closeContext', 'safe', 'getResponseCapture', 'sanitize', 'assertNoSecrets']) assert.equal(typeof helpers[name], 'function', 'Missing reviewed helper: ' + name);
  for (const name of ['snapshot', 'invalidateSession']) assert.equal(typeof controls[name], 'function');
  const output = path.join(__dirname, 'browser-diagnostic-attempt03');
  await fs.mkdir(output, { recursive: false });
  const expectedIds = ['en', 'fr'].flatMap(locale => ['authorized', 'invalidated-reload', 'restored'].map(state => 'R06-UI-' + locale + '-' + state));
  const testMap = JSON.parse(await fs.readFile(path.join(__dirname, '../inventory/test-case-map.json'), 'utf8'));
  assert.deepEqual(testMap.cases.filter(row => row.id.startsWith('R06-UI-')).map(row => row.id), expectedIds);
  const report = {
    startedAt: new Date().toISOString(), packageId: 'P04-R06', attempt: 'browser-diagnostic-attempt03',
    candidateId: fixture.candidateId, artifactSha256: fixture.artifactSha256, baseURL: fixture.baseURL,
    harnessSha256: hash(await fs.readFile(__filename)), testMapSha256: hash(await fs.readFile(path.join(__dirname, '../inventory/test-case-map.json'))),
    previousEvidence: 'browser/auth-r06-attempt02/result.json', plannedChecks: expectedIds,
    viewport: { width: 1440, height: 1000 }, contextLocale: 'en-US',
    checks: [], observations: [], responses: [], signIns: [], transitions: [], cleanup: [], passed: false,
  };
  const contexts = new Set();
  let sequence = 0;
  const bounded = async (label, fn, ms) => {
    let timer;
    try { return await Promise.race([fn(), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(label + ' exceeded its bound')), ms); })]); }
    finally { clearTimeout(timer); }
  };
  async function persist(final = false) {
    const safe = await helpers.sanitize(report);
    const serialized = JSON.stringify(safe, null, 2) + '\n';
    await helpers.assertNoSecrets(serialized);
    if (final) await fs.writeFile(path.join(output, 'result.json'), serialized, { flag: 'wx' });
    else {
      await fs.writeFile(path.join(output, 'progress.json.next'), serialized);
      await fs.rename(path.join(output, 'progress.json.next'), path.join(output, 'progress.json'));
    }
    return safe;
  }
  async function newContext() {
    const context = await helpers.createContext({ ignoreHTTPSErrors: true, viewport: report.viewport, locale: report.contextLocale, serviceWorkers: 'block' });
    contexts.add(context);
    return context;
  }
  async function closeContext(context) {
    await bounded('Owned browser context close', () => helpers.closeContext(context), 20000);
    contexts.delete(context);
    report.cleanup.push({ kind: 'context', closed: true });
  }
  async function signIn(context, alias, phase) {
    const signed = await helpers.signIn(context, alias);
    assert.equal(typeof signed?.token, 'string', 'Real credential session token required');
    report.signIns.push({ alias, phase, at: new Date().toISOString(), receipt: signed.evidence ?? null, acquiredSession: true });
    return signed;
  }
  async function record(id, alias, action) {
    const check = { id, alias, startedAt: new Date().toISOString(), passed: false };
    report.checks.push(check);
    let before, after, error;
    try { before = await controls.snapshot(id + '-diagnostic03-before'); check.detail = await action(); }
    catch (caught) { error = caught; }
    if (before) {
      try {
        after = await controls.snapshot(id + '-diagnostic03-after');
        check.effects = {
          before: before.evidence, after: after.evidence,
          businessEqual: before.businessSha256 === after.businessSha256,
          changedBusinessTables: after.tables.filter(table => before.tables.find(previous => previous.table === table.table)?.sha256 !== table.sha256).map(table => table.table),
          sessionsEqual: JSON.stringify(before.sessionRows) === JSON.stringify(after.sessionRows),
          auditsEqual: JSON.stringify(before.auditRows) === JSON.stringify(after.auditRows),
          usersEqual: JSON.stringify(before.userRows) === JSON.stringify(after.userRows),
          accountsEqual: JSON.stringify(before.accountRows) === JSON.stringify(after.accountRows),
        };
        assert(check.effects.businessEqual && check.effects.changedBusinessTables.length === 0, 'Browser read/denial changed business state');
        assert(check.effects.sessionsEqual && check.effects.auditsEqual && check.effects.usersEqual && check.effects.accountsEqual, 'Browser read/denial changed native authority or audit rows');
      } catch (caught) {
        check.nativeEvidenceError = helpers.safe(caught);
        error ??= caught;
      }
    }
    if (error) { check.error = helpers.safe(error); check.failureClass = 'observed_assertion_or_evidence_failure'; }
    else check.passed = true;
    check.finishedAt = new Date().toISOString();
    await persist();
  }
  async function observe(page, label, alias, expectedPrivate, navigate) {
    const actor = fixture.users[alias], pending = [], rows = [];
    const listener = response => {
      const url = new URL(response.url());
      if (url.origin !== fixture.baseURL || !(/^\/api\/(auth|me)\//.test(url.pathname) || url.pathname.endsWith('/dashboard/profile'))) return;
      const request = response.request(), requestHeaders = request.headers(), responseHeaders = response.headers();
      const row = {
        sequence: ++sequence, label, at: new Date().toISOString(), path: url.pathname, method: request.method(), status: response.status(),
        resourceType: request.resourceType(), navigation: request.isNavigationRequest(),
        redirectedFrom: safeUrl(request.redirectedFrom()?.url()), redirectedToAtResponse: safeUrl(request.redirectedTo()?.url()),
        requestHeaders: pickHeaders(requestHeaders, safeRequestHeaders), responseHeaders: pickHeaders(responseHeaders, safeResponseHeaders),
        captureId: responseHeaders[RESPONSE_ID_HEADER] ?? null,
        prefetch: /prefetch/i.test([requestHeaders.purpose, requestHeaders['sec-purpose']].filter(Boolean).join(' ')) || requestHeaders['next-router-prefetch'] === '1',
      };
      // Persist status and classification in memory before any potentially failing body access.
      rows.push(row); report.responses.push(row);
      pending.push((async () => {
        let direct = null, receipt = null;
        try {
          const failure = await bounded('Original browser response completion', () => response.finished(), 20000);
          if (failure) row.transportError = helpers.safe(failure);
          else row.browserResponseFinished = true;
        } catch (error) { row.transportError = helpers.safe(error); }
        try {
          const body = await bounded('Original browser response body', () => response.body(), 20000);
          let json; try { json = JSON.parse(body.toString('utf8')); } catch {}
          direct = { bytes: body.length, sha256: hash(body), containsActorCanary: [actor.id, actor.email].some(value => body.includes(Buffer.from(value))), currentSessionSubject: json?.user?.id === actor.id };
          row.browserBody = direct;
        } catch (error) { row.bodyReadError = helpers.safe(error); }
        if (row.captureId) {
          try { receipt = await bounded('Independent original response capture', () => helpers.getResponseCapture(row.captureId), 20000); row.independentCapture = receipt; }
          catch (error) { row.independentCaptureError = helpers.safe(error); }
        }
        row.evidence = classifyResponseEvidence(row, direct, receipt, alias);
        row.redirectedToAfterCompletion = safeUrl(request.redirectedTo()?.url());
        row.finishedAt = new Date().toISOString();
      })().catch(error => { row.observerError = helpers.safe(error); row.evidence = { qualified: false, issues: ['observer_failed'] }; }));
    };
    page.on('response', listener);
    let view, navigationError;
    try {
      await navigate();
      if (expectedPrivate) await page.getByText(actor.email, { exact: false }).first().waitFor({ state: 'visible', timeout: 45000 });
      else await page.waitForFunction(() => !!document.querySelector('#email')?.getClientRects().length || /This profile is unavailable|Ce profil n’est pas disponible|Your session has expired|session a expiré/.test(document.body.innerText), {}, { timeout: 45000 });
      await page.waitForLoadState('networkidle', { timeout: 15000 });
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const text = await page.locator('body').innerText();
      view = {
        label, path: new URL(page.url()).pathname, privateEmailVisible: text.includes(actor.email),
        loginVisible: await page.locator('#email').isVisible().catch(() => false),
        profileUnavailable: /This profile is unavailable|Ce profil n’est pas disponible/.test(text),
        textSha256: hash(text), screenshot: label + '.png', at: new Date().toISOString(),
      };
      await page.screenshot({ path: path.join(output, view.screenshot), fullPage: true, timeout: 30000 });
      view.screenshotSha256 = hash(await fs.readFile(path.join(output, view.screenshot)));
      report.observations.push(view);
      assert.equal(view.privateEmailVisible, expectedPrivate);
      if (!expectedPrivate) assert(view.loginVisible || view.profileUnavailable, 'Concrete login/denied recovery state required');
    } catch (error) { navigationError = error; }
    finally { page.off('response', listener); await Promise.all(pending); }
    assert(rows.length > 0, 'Actual browser response evidence required');
    assert(rows.every(row => row.evidence?.qualified === true), 'Original browser response bytes incomplete or not independently attributable');
    if (expectedPrivate) assert(rows.some(row => row.path === '/api/auth/get-session' && row.status === 200 && row.evidence.currentSessionSubject === true), 'Authorized rendered consumer must use a real current-subject session response');
    else assert(rows.every(row => row.evidence.containsActorCanary === false), 'Revoked reload exposed private actor bytes');
    if (navigationError) throw navigationError;
    return { view, responseSequences: rows.map(row => row.sequence), retainedPrimaryCaptureErrors: rows.filter(row => row.bodyReadError).length };
  }
  try {
    for (const locale of ['en', 'fr']) {
      const alias = 'browser_' + locale, context = await newContext();
      try {
        const signed = await signIn(context, alias, 'authorized'), page = await context.newPage();
        await record('R06-UI-' + locale + '-authorized', alias, () => observe(page, locale + '-authorized', alias, true, () => page.goto(fixture.baseURL + '/' + locale + '/dashboard/profile', { waitUntil: 'domcontentloaded', timeout: 60000 })));
        report.transitions.push(await controls.invalidateSession(alias, 'revoke', signed.token));
        await record('R06-UI-' + locale + '-invalidated-reload', alias, () => observe(page, locale + '-invalidated-reload', alias, false, () => page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 })));
      } finally { await closeContext(context); }
      const recovered = await newContext();
      try {
        await signIn(recovered, alias, 'restored');
        const page = await recovered.newPage();
        await record('R06-UI-' + locale + '-restored', alias, () => observe(page, locale + '-restored', alias, true, () => page.goto(fixture.baseURL + '/' + locale + '/dashboard/profile', { waitUntil: 'domcontentloaded', timeout: 60000 })));
      } finally { await closeContext(recovered); }
    }
  } catch (error) { report.fatal = helpers.safe(error); }
  finally {
    for (const context of [...contexts]) {
      try { await closeContext(context); }
      catch (error) { report.cleanup.push({ kind: 'context', closed: false, error: helpers.safe(error) }); }
    }
  }
  report.notRun = expectedIds.filter(id => !report.checks.some(check => check.id === id));
  report.summary = {
    planned: expectedIds.length, passed: report.checks.filter(check => check.passed).length,
    failed: report.checks.filter(check => !check.passed).length, notRun: report.notRun.length,
    observations: report.observations.length, responses: report.responses.length,
    primaryBodyReadErrorsRetained: report.responses.filter(row => row.bodyReadError).length,
    independentlyRecoveredBodies: report.responses.filter(row => row.bodyReadError && row.evidence?.qualified).length,
    incompleteResponseEvidence: report.responses.filter(row => row.evidence?.qualified !== true).length,
  };
  report.passed = !report.fatal && report.notRun.length === 0 && report.checks.every(check => check.passed) && report.cleanup.every(row => row.closed);
  report.finishedAt = new Date().toISOString();
  return await persist(true);
}

module.exports = { runBrowserDiagnostic, classifyResponseEvidence };
