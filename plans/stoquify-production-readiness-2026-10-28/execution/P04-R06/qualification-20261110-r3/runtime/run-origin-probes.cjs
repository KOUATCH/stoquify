'use strict';
// Isolated r2 qualification helper. Only the inert loopback attacker is owned here.
// Browser, target runtime, credential/state controls and evidence persistence are caller-owned.
const assert = require('node:assert/strict');
const http = require('node:http');
const crypto = require('node:crypto');

const attackerOrigin = 'http://127.0.0.1:3298';
const foreignNativeOrigin = 'https://untrusted.example.invalid';
const groups = [
  { alias: 'origin', state: 'near_threshold', label: 'near-threshold', repetitions: 2, recovery: true },
  { alias: 'origin_expired', state: 'expired_lock', label: 'expired-lock', repetitions: 2, recovery: true },
  { alias: 'locked_future', state: 'future_lock', label: 'future-lock', repetitions: 1, recovery: false },
];
const browserSpecifications = groups.flatMap(group => ['navigate', 'cors'].flatMap(mode =>
  ['known', 'wrong'].flatMap(credential => Array.from({ length: group.repetitions }, (_, n) => ({
    ...group, mode, credential, repetition: n + 1,
    id: `R06-C-origin-browser-${group.label}-${mode}-${credential}-${n + 1}`,
  })))));
const caseIds = [
  'R06-C-origin-native-own-positive', 'R06-C-origin-cookie-bearing',
  ...groups.flatMap(group => [
    ...browserSpecifications.filter(spec => spec.alias === group.alias).map(spec => spec.id),
    ...(group.recovery ? [`R06-C-origin-recovery-${group.label}`] : []),
  ]),
];

function noWrites(row) {
  assert(row.effects?.businessEqual && row.effects?.sessionsEqual && row.effects?.auditsEqual,
    'Rejected origin changed business/account/session/audit data');
}

function completeCapture(capture) {
  assert(capture?.complete && capture.upstreamComplete && !capture.aborted &&
    capture.downstreamFinished && !capture.downstreamClosedEarly && !capture.captureError,
  'Original origin-probe response did not complete');
  assert(Number.isInteger(capture.decodedBytes) && capture.decodedBytes >= 0);
  assert(/^[a-f0-9]{64}$/.test(capture.decodedSha256), 'Original decoded body hash missing');
  assert.equal(capture.runtimeKind, 'repaired');
}

function privateFree(capture, fixture) {
  assert.deepEqual(Object.keys(capture.containsActorCanary ?? {}).sort(), Object.keys(fixture.users).sort(),
    'Every fixture actor/email/organization needs an original-byte canary result');
  assert(Object.values(capture.containsActorCanary).every(value => value === false),
    'Origin denial exposed private actor/organization bytes');
  assert.equal(capture.hasAuthorityFields, false, 'Origin denial exposed authority fields');
  assert(Array.isArray(capture.response?.authorityCookies));
  assert(capture.response.authorityCookies.every(cookie => cookie.nonemptyAuthority === false),
    'Origin denial issued authority cookies');
}

function browserDenial(row, fixture) {
  const capture = row.capture;
  completeCapture(capture);
  privateFree(capture, fixture);
  assert.equal(capture.method, 'POST');
  assert.equal(capture.path, '/api/auth/sign-in/email');
  assert.equal(capture.urlSha256, row.targetUrlSha256);
  assert.equal(capture.request.origin, attackerOrigin);
  assert.equal(capture.request.secFetchSite, 'cross-site');
  assert.equal(capture.request.secFetchMode, row.browser.mode);
  assert.equal(capture.request.secFetchDest, row.browser.mode === 'navigate' ? 'document' : 'empty');
  assert.equal(capture.request.cookieCount, 0);
  assert(capture.request.contentType?.startsWith('application/x-www-form-urlencoded'));
  assert.equal(capture.status, 403);
  assert.equal(row.browser.targetCookieCountBefore, 0);
  assert.equal(row.browser.targetCookieCountAfter, 0);
  assert.equal(row.browser.targetRequests.length, 1, 'Exactly one actual browser POST must match this probe');
  assert.deepEqual(row.browser.targetRequests[0], { method: 'POST', urlSha256: row.targetUrlSha256,
    resourceType: row.browser.mode === 'navigate' ? 'document' : 'fetch' });
  assert.equal(row.browser.error, null, 'Browser harness failed before observing the denial');
  const result = row.browser.result;
  if (row.browser.mode === 'navigate') {
    assert.equal(result.status, 403);
    assert.equal(result.responseCaptureId, capture.captureId);
    assert.equal(result.urlSha256, row.targetUrlSha256);
    assert.equal(result.path, '/api/auth/sign-in/email');
    assert.equal(result.hasPrivateCanary, false);
    assert.equal(result.bodySha256, capture.decodedSha256);
    assert.equal(result.bodyBytes, capture.decodedBytes);
  } else {
    // Fetch failure is accepted only at await-fetch with an exact completed 403 source response.
    // A body-read or after-response TypeError cannot be misclassified as browser CORS enforcement.
    assert.equal(result.resolved, false);
    assert.equal(result.failureStage, 'await-fetch');
    assert.equal(result.errorName, 'TypeError');
    assert.equal(result.responseObserved, false);
    assert.equal(result.bodyReadable, false);
    assert.equal(result.status, null);
    assert.equal(capture.response.cors?.accessControlAllowOrigin, null, 'Expected no browser CORS read grant');
  }
  noWrites(row);
}

async function runOriginProbes(fixture, h) {
  assert.equal(fixture.baseURL, 'https://localhost:3296');
  for (const name of ['record', 'createContext', 'closeContext', 'signIn', 'request', 'pace', 'register',
    'snapshot', 'effect', 'configure', 'restore', 'readAuthorityUtc', 'successEffects', 'timestamp', 'safe', 'hash']) {
    assert.equal(typeof h[name], 'function', `Required isolated helper missing: ${name}`);
  }
  assert(h.bridge?.getResponseCapture && Array.isArray(h.bridge.report?.responseCaptures));
  assert.equal(browserSpecifications.length, 20);
  const sockets = new Set();
  let attacker;
  const cleanup = [];
  h.report.originProbePlan = { caseIds, browserDenials: 20, attackerOrigin,
    credentialFreeOriginPremise: 'Native Origin-only valid own credentials are an authorized positive', cleanup };

  async function attemptRequest(context, row, data, origin) {
    let result, error;
    try { result = await h.request(context, row.id, '/api/auth/sign-in/email', { method: 'POST', data, origin }); }
    catch (caught) { error = caught; }
    row.request = result?.row ?? h.report.requests.findLast(request => request.id === row.id) ?? null;
    return { result, error };
  }

  async function positive(row, alias, origin, nativeOriginOnly) {
    const context = await h.createContext();
    try {
      await h.pace();
      assert.equal((await context.cookies(fixture.baseURL)).length, 0);
      const actor = fixture.users[alias];
      h.register(actor.password);
      row.authorityBefore = await h.readAuthorityUtc(alias);
      const before = await h.snapshot(row.id + '-before');
      const { result, error } = await attemptRequest(context, row,
        { email: actor.email, password: actor.password, rememberMe: true }, origin);
      row.authorityAfter = await h.readAuthorityUtc(alias);
      const after = await h.snapshot(row.id + '-after');
      row.effects = h.effect(before, after);
      if (error) throw error;
      completeCapture(result.row.capture);
      assert.equal(result.row.status, 200);
      assert.equal(result.row.capture.request.origin, origin);
      assert.equal(result.row.capture.request.cookieCount, 0);
      if (nativeOriginOnly) {
        for (const field of ['secFetchSite', 'secFetchMode', 'secFetchDest']) {
          assert.equal(result.row.capture.request[field], null, 'Native premise requires no Fetch Metadata');
        }
      }
      h.successEffects(row, before, after, result, alias);
      assert.equal(row.authorityAfter.user.failedLoginAttempts, 0);
      assert.equal(row.authorityAfter.user.isLocked, false);
      assert.equal(row.authorityAfter.user.lockedUntilRaw, null);
      assert.deepEqual(row.authorityAfter.user.lastFailedLoginRaw, row.authorityBefore.user.lastFailedLoginRaw);
      h.timestamp(row, 'lastLogin', row.authorityAfter.user, result);
    } finally { await h.closeContext(context); }
  }

  async function matchingCapture(target, row) {
    const deadline = Date.now() + 15000;
    let matches = [];
    do {
      matches = h.bridge.report.responseCaptures.filter(capture => capture.urlSha256 === h.hash(target) && capture.method === 'POST');
      if (matches.length) break;
      await new Promise(resolve => setTimeout(resolve, 20));
    } while (Date.now() < deadline);
    row.captureMatches = matches.map(capture => ({ captureId: capture.captureId, method: capture.method,
      urlSha256: capture.urlSha256, status: capture.status }));
    // Retain all available original captures before asserting unambiguous attribution.
    row.captures = [];
    for (const match of matches) row.captures.push(await h.bridge.getResponseCapture(match.captureId));
    row.capture = row.captures.length === 1 ? row.captures[0] : null;
  }

  async function browserProbe(spec, row) {
    const context = await h.createContext();
    try {
      const page = await context.newPage();
      page.setDefaultTimeout(45000);
      await page.goto(attackerOrigin + '/', { waitUntil: 'domcontentloaded' });
      await h.pace();
      const actor = fixture.users[spec.alias];
      const password = spec.credential === 'known' ? actor.password : 'Reviewed R06 r2 origin wrong password';
      h.register(password);
      const target = fixture.baseURL + '/api/auth/sign-in/email?p04_origin_probe=' + row.id + '-' + crypto.randomUUID();
      row.targetUrlSha256 = h.hash(target);
      row.fixture = { alias: spec.alias, state: spec.state, credential: spec.credential, repetition: spec.repetition };
      row.authorityBefore = await h.readAuthorityUtc(spec.alias);
      row.browser = { mode: spec.mode, targetCookieCountBefore: (await context.cookies(fixture.baseURL)).length,
        targetRequests: [], result: null, error: null, failureStage: null };
      page.on('request', request => {
        if (request.url() === target) row.browser.targetRequests.push({ method: request.method(),
          urlSha256: h.hash(request.url()), resourceType: request.resourceType() });
      });
      const before = await h.snapshot(row.id + '-before');
      let stage = spec.mode === 'navigate' ? 'submit-navigation' : 'evaluate-fetch';
      try {
        if (spec.mode === 'navigate') {
          const responsePromise = page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 45000 });
          // Attach a rejection observer immediately; submit errors cannot leave an unhandled navigation rejection.
          responsePromise.catch(() => {});
          await page.evaluate(({ target, email, password }) => {
            const form = document.createElement('form'); form.method = 'POST'; form.action = target;
            for (const [name, value] of Object.entries({ email, password })) {
              const input = document.createElement('input'); input.name = name; input.value = value; form.append(input);
            }
            document.body.append(form); form.submit();
          }, { target, email: actor.email, password });
          stage = 'await-navigation';
          const response = await responsePromise;
          assert(response, 'Cross-site form navigation returned no response');
          stage = 'read-navigation-body';
          const body = await response.body();
          const canaries = Object.values(fixture.users).flatMap(user => [user.id, user.email, user.organizationId]).filter(Boolean);
          row.browser.result = { status: response.status(), path: new URL(page.url()).pathname,
            urlSha256: h.hash(response.url()), responseCaptureId: await response.headerValue('x-p04-r06-response-id'),
            bodyBytes: body.length, bodySha256: h.hash(body), hasPrivateCanary: canaries.some(value => body.includes(Buffer.from(value))) };
        } else {
          row.browser.result = await page.evaluate(async ({ target, email, password }) => {
            let stage = 'await-fetch', responseObserved = false, status = null;
            try {
              const response = await fetch(target, { method: 'POST', mode: 'cors', credentials: 'omit',
                headers: { 'content-type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ email, password }).toString() });
              responseObserved = true; status = response.status; stage = 'read-body';
              const body = await response.text(); stage = 'after-response';
              return { resolved: true, status, responseObserved, bodyReadable: true, bodyLength: body.length, failureStage: null };
            } catch (error) {
              return { resolved: false, status, responseObserved, bodyReadable: false,
                failureStage: stage, errorName: error.name };
            }
          }, { target, email: actor.email, password });
        }
      } catch (error) { row.browser.error = h.safe(error); row.browser.failureStage = stage; }
      // Capture and native evidence are retained before any correctness assertion can fail.
      try { await matchingCapture(target, row); }
      catch (error) { row.captureError = h.safe(error); }
      row.authorityAfter = await h.readAuthorityUtc(spec.alias);
      const after = await h.snapshot(row.id + '-after');
      row.effects = h.effect(before, after);
      row.browser.targetCookieCountAfter = (await context.cookies(fixture.baseURL)).length;
      for (const cookie of await context.cookies(fixture.baseURL)) h.register(cookie.value);
      assert.equal(row.authorityBefore.user.failedLoginAttempts, 4, 'Sequence must retain the threshold fixture across repeated denials');
      assert.equal(row.authorityBefore.user.isLocked, spec.state !== 'near_threshold');
      if (spec.state !== 'near_threshold') {
        const expiry = Date.parse(row.authorityBefore.user.lockedUntilUtc), now = Date.parse(row.authorityBefore.user.databaseNow ?? row.authorityBefore.databaseNow);
        assert(Number.isFinite(expiry) && Number.isFinite(now), 'Native UTC lock interval evidence required');
        assert(spec.state === 'expired_lock' ? expiry < now : expiry > now, 'Lock interval does not match the admitted fixture');
      }
      browserDenial(row, fixture);
    } finally { await h.closeContext(context); }
  }

  try {
    await h.record('R06-C-origin-native-own-positive', async row => {
      let configured = false;
      try {
        h.report.transitions.push(await h.configure('origin', 'available')); configured = true;
        await positive(row, 'origin', foreignNativeOrigin, true);
      } finally { if (configured) h.report.transitions.push(await h.restore('origin')); }
    });
    await h.record('R06-C-origin-cookie-bearing', async row => {
      const context = await h.createContext();
      try {
        await h.signIn(context, 'active');
        const before = await h.snapshot(row.id + '-before');
        const actor = fixture.users.active;
        let result, error;
        try { result = await h.request(context, row.id, '/api/auth/unlink-account', { method: 'POST',
          origin: foreignNativeOrigin, data: { providerId: actor.secondary.providerId, accountId: actor.secondary.accountId } }); }
        catch (caught) { error = caught; }
        row.request = result?.row ?? h.report.requests.findLast(request => request.id === row.id) ?? null;
        const after = await h.snapshot(row.id + '-after'); row.effects = h.effect(before, after);
        if (error) throw error;
        const capture = result.row.capture;
        completeCapture(capture); privateFree(capture, fixture);
        assert.equal(result.row.status, 403); assert.equal(capture.status, 403);
        assert.equal(capture.request.origin, foreignNativeOrigin);
        assert(capture.request.cookieCount > 0, 'Foreign-origin unlink must carry an acquired own cookie');
        noWrites(row);
      } finally { await h.closeContext(context); }
    });

    attacker = http.createServer((request, response) => {
      if (request.headers.host !== '127.0.0.1:3298' || request.method !== 'GET' || request.url !== '/') {
        response.writeHead(400); response.end(); return;
      }
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', Connection: 'close' });
      response.end('<!doctype html><html><body><p>Isolated cross-site protocol fixture</p></body></html>');
    });
    attacker.on('connection', socket => { sockets.add(socket); socket.once('close', () => sockets.delete(socket)); });
    await new Promise((resolve, reject) => { attacker.once('error', reject); attacker.listen(3298, '127.0.0.1', resolve); });
    for (const group of groups) {
      let configured = false;
      try {
        h.report.transitions.push(await h.configure(group.alias, group.state)); configured = true;
        for (const spec of browserSpecifications.filter(spec => spec.alias === group.alias)) {
          await h.record(spec.id, row => browserProbe(spec, row));
        }
        if (group.recovery) await h.record(`R06-C-origin-recovery-${group.label}`,
          row => positive(row, group.alias, fixture.baseURL, false));
      } finally { if (configured) h.report.transitions.push(await h.restore(group.alias)); }
    }
  } finally {
    for (const socket of sockets) socket.destroy();
    if (attacker?.listening) {
      attacker.closeAllConnections();
      let timeout;
      try {
        await Promise.race([new Promise((resolve, reject) => attacker.close(error => error ? reject(error) : resolve())),
          new Promise((_, reject) => { timeout = setTimeout(() => reject(Error('Owned attacker close exceeded 5 seconds')), 5000); })]);
        cleanup.push({ kind: 'attacker', host: '127.0.0.1', port: 3298, closed: true });
      } catch (error) { cleanup.push({ kind: 'attacker', closed: false, error: h.safe(error) }); throw error; }
      finally { clearTimeout(timeout); }
    }
  }
}

module.exports = { runOriginProbes, caseIds, browserSpecifications, browserDenial };
