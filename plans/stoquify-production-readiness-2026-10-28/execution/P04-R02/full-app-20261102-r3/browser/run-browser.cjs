'use strict';
// Reusable only: the parent runner owns source/artifact, HTTPS app, database and cleanup.
// Credentials arrive as an in-memory object read from the ignored private fixture JSON.
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const http = require('node:http');
const net = require('node:net');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const aliasProbe = require('./private-alias-probe.cjs');
const { createSignInCadence, MIN_SIGNIN_GAP_MS } = require('./signin-cadence.cjs');
const { createReadinessTracker, captureRenderedFrame } = require('./rendered-readiness.cjs');

const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const originalFiles = new Set([
  '56492210-f588-4db0-a970-f245e574ab06.jpg',
  'a032d164-c607-4d66-9050-367cf45f0008.jpg',
  'f2f43248-c73b-4104-a865-e0f02c2b0ace.jpg',
]);

// Fail on unexpected bytes without including response content in failure evidence.
function assertSafeDenial(entry, body, kind = 'route', method = 'GET') {
  const label = entry.label || 'Denied browser request';
  if (kind === 'optimizer') {
    assert.equal(entry.status, 400, label + ' optimizer status');
    assert(body.equals(Buffer.from('Private image optimization is unavailable')), label + ' unexpected optimizer denial body');
    return { contract: 'fixed-private-optimizer-denial', status: 400 };
  }
  assert([401, 403].includes(entry.status), label + ' unexpected route denial status');
  if (method === 'HEAD') {
    assert.equal(body.length, 0, label + ' denied HEAD must be empty');
    return { contract: 'empty-denied-head', status: entry.status };
  }
  assert.equal(entry.contentType?.split(';')[0], 'application/json', label + ' denial content type');
  assert(body.length > 0 && body.length < 512, label + ' unexpected denial size');
  let envelope;
  try { envelope = JSON.parse(body.toString('utf8')); }
  catch { throw new Error(label + ' malformed denial JSON'); }
  assert(envelope && typeof envelope === 'object' && !Array.isArray(envelope), label + ' unexpected denial shape');
  const keys = ['error', 'code', 'correlationId', 'category', 'severity', 'retryable'];
  assert(JSON.stringify(Object.keys(envelope).sort()) === JSON.stringify([...keys].sort()), label + ' unexpected denial fields');
  assert(body.equals(Buffer.from(JSON.stringify(envelope))), label + ' unexpected bytes around denial envelope');
  const unauthenticated = entry.status === 401;
  assert(envelope.error === (unauthenticated ? 'Unauthenticated' : 'Forbidden'), label + ' unsafe denial message');
  assert(envelope.code === (unauthenticated ? 'AUTH_REQUIRED' : 'FORBIDDEN'), label + ' unsafe denial code');
  assert(envelope.category === (unauthenticated ? 'authentication' : 'authorization'), label + ' unsafe denial category');
  assert(envelope.severity === 'medium' && envelope.retryable === false, label + ' unsafe denial classification');
  assert(typeof envelope.correlationId === 'string' && /^err_(?:[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}|\d{13}_[a-z0-9]{1,8})$/.test(envelope.correlationId), label + ' unsafe correlation identifier');
  return { contract: 'canonical-auth-denial', status: entry.status, code: envelope.code, exactSafeEnvelope: true };
}

async function runBrowserQualification(fixture, controls) {
  assert.equal(fixture.baseURL, 'https://localhost:3192', 'Reviewed outward fixture origin changed');
  assert.match(fixture.runId, /^p04r02-full-20261102-r3(?:-[a-z0-9-]+)?$/);
  assert.equal(typeof fixture.candidateId, 'string');
  assert(fixture.candidateId.length > 0, 'Candidate identity required');
  assert.match(fixture.artifactSha256, /^[a-f0-9]{64}$/);
  assert.equal(typeof controls.transition, 'function');
  assert.equal(typeof controls.snapshot, 'function');
  const aliases = ['ui', 'foreign', 'revocation', 'expiry', 'permissionChange', 'moduleChange', 'permissionDenied', 'moduleDenied'];
  for (const alias of aliases) {
    assert(fixture.users[alias]?.email && fixture.users[alias]?.password && fixture.users[alias]?.organizationId, 'Missing fixture actor: ' + alias);
    assert(/^p04-upload-(?:a|b|disabled)$/.test(fixture.users[alias].organizationId), 'Original owner must never be an admitted fixture actor');
  }
  const privateAliasPlan = aliasProbe.buildPrivateAliasProbePlan(fixture.privateUploadAliases);
  assert.equal(fixture.privateUploadAliases.length, 4, 'Candidate-only synthetic alias is required for compatibility qualification');
  assert.equal(fixture.syntheticAliasUrl, aliasProbe.SYNTHETIC_ALIAS_URL);
  assert.match(fixture.privateAliasPolicySha256, /^[a-f0-9]{64}$/, 'Sealed alias policy digest required');
  assert.equal(fixture.privateAliasNegativeAdmission?.aliasesAbsentFromPublicArtifact, true);
  assert.equal(fixture.privateAliasNegativeAdmission?.proxyContract, aliasProbe.PROBE_VALUE);
  const privateAliasNames = fixture.privateUploadAliases.filter(alias => alias.source !== aliasProbe.SYNTHETIC_ALIAS_SOURCE).map(alias => alias.source.slice('public/images/'.length));
  const assets = fixture.assets;
  assert(Array.isArray(assets) && assets.length >= 3, 'Three synthetic organization assets required');
  for (const asset of assets) {
    assert.equal(asset.synthetic, true);
    assert.match(asset.organizationId, /^p04-upload-(?:a|b|disabled)$/);
    assert.equal(asset.fileName, 'sentinel.png');
    assert(!originalFiles.has(asset.fileName));
    assert.equal(asset.legacyUrl, `/uploads/${asset.organizationId}/${asset.fileName}`);
    assert.equal(asset.apiUrl, `/api/uploads/${asset.organizationId}/${asset.fileName}`);
    assert.match(asset.sha256, /^[a-f0-9]{64}$/);
    assert(asset.byteLength > 0 && asset.width > 0 && asset.height > 0);
    assert.equal(asset.mimeType, 'image/png');
  }
  const mainAsset = assets.find(asset => asset.organizationId === fixture.item.organizationId);
  assert(mainAsset, 'Item must use an admitted synthetic asset');
  const syntheticAlias = fixture.privateUploadAliases.find(alias => alias.source === aliasProbe.SYNTHETIC_ALIAS_SOURCE);
  assert.equal(mainAsset.organizationId, 'p04-upload-a');
  assert.equal(syntheticAlias.sha256, mainAsset.sha256, 'Synthetic alias must contain the exact tenant-A canary');
  assert.equal(fixture.item.imageUrl, mainAsset.legacyUrl);
  assert.match(fixture.item.id, /^[a-zA-Z0-9_-]+$/);
  assert.equal(fixture.item.editPath, `/dashboard/inventory/items/${fixture.item.id}/edit`);
  const output = path.join(__dirname, fixture.runId);
  await fs.mkdir(output, { recursive: false });
  const report = {
    startedAt: new Date().toISOString(), baseURL: fixture.baseURL,
    evidenceClass: 'real_full_application_https_browser_and_http_with_persisted_fixture_auth',
    harnessSha256: hash(await fs.readFile(__filename)),
    candidateId: fixture.candidateId, artifactSha256: fixture.artifactSha256,
    checks: [], requests: [], pageErrors: [], externalRequestsBlocked: [], cacheEvents: [], unexpectedBrowserRequests: [],
    browserCachePolicy: 'Default browser HTTP cache retained; no context.route, request interception, cache-disable command or forced cache mode',
    cookiesRecorded: 'Names and secure/httpOnly properties only; values remain in memory',
    signInAttempts: [],
    renderedReadiness: [],
    historyRecovery: [],
    signInPolicy: { minimumQuietGapMs: MIN_SIGNIN_GAP_MS, maximumAttempts: 2, retryStatus: 429, retryHeader: 'X-Retry-After', productionProtectionsUnchanged: true },
    privateAliasPolicySha256: fixture.privateAliasPolicySha256,
    privateAliasProbeSha256: hash(await fs.readFile(path.join(__dirname, 'private-alias-probe.cjs'))),
    privateAliasScope: { mappings: fixture.privateUploadAliases, positiveOriginalReadsPermitted: false, proxyMustValidateBeforeForwarding: true, syntheticAliasUrl: fixture.syntheticAliasUrl, artifactScope: 'Candidate-only fourth alias fixture; not a deployable production-policy artifact' },
    fixtureAssetHashes: assets.map(({ organizationId, fileName, sha256, byteLength }) => ({ organizationId, fileName, sha256, byteLength })),
    passed: false,
  };
  const secretValues = aliases.flatMap(alias => [fixture.users[alias].password]);
  const safe = error => {
    let text = String(error?.message || error);
    for (const value of secretValues) text = text.split(value).join('[redacted]');
    return text.slice(0, 1000);
  };
  let browser, denyProxy;
  const signInCadence = createSignInCadence({ record: event => report.signInAttempts.push(event) });
  const proxySockets = new Set();
  const deadline = async (label, action, timeout = 10000) => {
    let timer;
    try { return await Promise.race([action(), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(label + ' deadline exceeded')), timeout); })]); }
    finally { clearTimeout(timer); }
  };
  const contexts = new Set();
  const renderedReady = async (page, label, { selector, expectedText, expectedPath, expectedTag }) => {
    const observation = { label, selector, expectedPath, expectedTag, startedAt: new Date().toISOString(), timeoutMs: 10000, requiredStableFrames: 3, passed: false, frameSamples: 0, samples: [] };
    report.renderedReadiness.push(observation);
    const observe = createReadinessTracker({ expectedPath, expectedTag });
    let previousState;
    try {
      await deadline(label + ' rendered readiness', async () => {
        const started = Date.now();
        while (Date.now() - started < observation.timeoutMs) {
          const snapshot = await page.evaluate(captureRenderedFrame, { selector, expectedText });
          const state = observe(snapshot);
          observation.frameSamples++;
          observation.last = { ...snapshot, ...state };
          const signature = JSON.stringify({ path: snapshot.path, documentReadyState: snapshot.documentReadyState, total: snapshot.total, nodes: snapshot.nodes });
          if (signature !== previousState && observation.samples.length < 20) observation.samples.push(observation.last);
          previousState = signature;
          if (state.ready) { observation.passed = true; return; }
        }
        throw new Error(label + ' did not settle to one visible intended element; see renderedReadiness diagnostics');
      }, 11000);
      return observation;
    } catch (error) { observation.error = safe(error); throw error; }
    finally { observation.finishedAt = new Date().toISOString(); }
  };
  const record = async (label, fn) => {
    const result = { label, startedAt: new Date().toISOString(), passed: false };
    report.checks.push(result);
    try { result.evidence = await fn(); result.passed = true; }
    catch (error) { result.error = safe(error); }
    await fs.writeFile(path.join(output, 'progress.json'), JSON.stringify(report, null, 2) + '\n');
    return result;
  };
  const allowedUrl = (value, admittedPrivateProbe = null) => {
    const url = new URL(value, fixture.baseURL);
    assert.equal(url.origin, fixture.baseURL, 'Request escaped reviewed fixture origin');
    const decode = value => {
      for (let i = 0; i < 8; i++) { const next = decodeURIComponent(value); if (next === value) return value.replace(/\\/g, '/'); value = next; }
      throw new Error('Excessively encoded test URL');
    };
    const paths = [decode(url.pathname)];
    if (paths[0].toLowerCase().replace(/\/+$/, '') === '/_next/image') {
      const source = url.searchParams.get('url');
      if (source) { const target = new URL(source, fixture.baseURL); if (target.origin === fixture.baseURL) paths.push(decode(target.pathname)); }
    }
    assert(!paths.some(name => [...originalFiles].some(file => name.toLowerCase().includes(file))), 'Original asset request forbidden');
    assert(!paths.some(name => name.toLowerCase().includes('cmp_org_005')), 'Original organization asset request forbidden');
    const targetsPrivateAlias = paths.some(name => privateAliasNames.some(alias => name.toLowerCase().includes('/images/' + alias)));
    if (targetsPrivateAlias) {
      assert(admittedPrivateProbe && privateAliasPlan.includes(admittedPrivateProbe), 'Original alias allowed only as a bounded denial probe');
      assert.equal(url.pathname + url.search, admittedPrivateProbe.path, 'Alias probe URL changed during URL parsing');
    } else assert.equal(admittedPrivateProbe, null, 'Private probe must target an admitted alias');
    return url.href;
  };
  const newContext = async () => {
    const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
    contexts.add(context);
    context.on('page', page => {
      page.setDefaultTimeout(60000);
      page.on('pageerror', error => report.pageErrors.push(safe(error)));
    });
    return context;
  };
  const newPage = async context => {
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    // Native URL blocking does not enable request interception or disable HTTP cache.
    await cdp.send('Network.setBlockedURLs', { urls: ['*cmp_org_005*', ...[...originalFiles].map(file => '*' + file + '*'), ...privateAliasNames.flatMap(file => ['*' + file + '*', '*' + file.toUpperCase() + '*'])] });
    const requestPaths = new Map();
    cdp.on('Network.requestWillBeSent', event => {
      try {
        const url = new URL(event.request.url);
        if (url.origin === fixture.baseURL) allowedUrl(url.href);
        else if (['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) throw new Error('Unexpected loopback browser origin');
        if (assets.some(asset => [asset.legacyUrl, asset.apiUrl].includes(url.pathname)) || url.pathname === fixture.syntheticAliasUrl) requestPaths.set(event.requestId, url.pathname);
      } catch (error) { report.unexpectedBrowserRequests.push(safe(error)); void page.close().catch(() => {}); }
    });
    cdp.on('Network.responseReceived', event => {
      if (requestPaths.has(event.requestId)) report.cacheEvents.push({ path: requestPaths.get(event.requestId), status: event.response.status, fromDiskCache: !!event.response.fromDiskCache, fromPrefetchCache: !!event.response.fromPrefetchCache, cacheControl: event.response.headers['Cache-Control'] || event.response.headers['cache-control'] || null });
    });
    cdp.on('Network.requestServedFromCache', event => {
      if (requestPaths.has(event.requestId)) report.cacheEvents.push({ path: requestPaths.get(event.requestId), servedFromBrowserCache: true });
    });
    return page;
  };
  const closeContext = async context => { await deadline('browser context close', () => context.close()); contexts.delete(context); };
  const sessionReceipt = async context => {
    const cookies = await context.cookies(fixture.baseURL);
    const session = cookies.filter(cookie => cookie.name.endsWith('session_token'));
    assert(session.length > 0, 'Real sign-in did not issue a session cookie');
    assert(session.every(cookie => cookie.secure && cookie.httpOnly), 'Session cookie must be Secure and HttpOnly');
    return cookies.map(({ name, secure, httpOnly }) => ({ name, secure, httpOnly }));
  };
  const signIn = async (context, alias) => {
    assert.equal((await context.cookies()).length, 0, 'Start with a fresh actor context');
    const user = fixture.users[alias];
    const response = await signInCadence.run({ actor: alias, channel: 'api' }, async () => {
      const reply = await context.request.post(allowedUrl('/api/auth/sign-in/email'), {
        data: { email: user.email, password: user.password, rememberMe: true },
        headers: { Origin: fixture.baseURL }, timeout: 120000, maxRedirects: 0,
      });
      try { return { status: reply.status(), retryAfter: reply.headers()['x-retry-after'] }; }
      finally { await reply.dispose(); }
    });
    assert.equal(response.status, 200, `Sign-in failed for ${alias}`);
    return sessionReceipt(context);
  };
  const request = async (context, label, asset, url, expected, method = 'GET') => {
    const response = await context.request.fetch(allowedUrl(url), { method, timeout: 90000, maxRedirects: 0, headers: { 'Cache-Control': 'no-cache' } });
    const body = await response.body();
    const headers = response.headers();
    const entry = { label, method, path: new URL(allowedUrl(url)).pathname, status: response.status(), byteLength: body.length, bodySha256: hash(body), contentType: headers['content-type'] || null, cacheControl: headers['cache-control'] || null, expected };
    report.requests.push(entry);
    await response.dispose();
    if (expected === 'authorized') {
      assert.equal(entry.status, 200, label);
      assert.match(entry.cacheControl || '', /private.*no-store/, label + ' cache policy');
      if (method === 'HEAD') assert.equal(body.length, 0);
      else { assert.equal(entry.bodySha256, asset.sha256, label + ' byte identity'); assert.equal(body.length, asset.byteLength); assert.equal(entry.contentType?.split(';')[0], asset.mimeType); }
    } else {
      entry.denialContract = assertSafeDenial(entry, body, expected === 'optimizer-denied' ? 'optimizer' : 'route', method);
    }
    return entry;
  };
  // Real original aliases are denial-only HTTP probes. The parent proxy validates
  // their bounded safe body before forwarding any bytes; browser pages never load them.
  const privateAliasRequest = async (context, actor, probe) => {
    const url = allowedUrl(probe.path, probe);
    const response = await context.request.fetch(url, { method: probe.method, timeout: 90000, maxRedirects: 0,
      headers: { 'Cache-Control': 'no-cache', [aliasProbe.PROBE_HEADER]: aliasProbe.PROBE_VALUE } });
    const headers = response.headers();
    const entry = { label: 'private-alias-' + actor, method: probe.method, path: probe.path, aliasSource: probe.aliasSource,
      variant: probe.variant, kind: probe.kind, status: response.status(), contentType: headers['content-type'] || null,
      expected: 'original-alias-denial-only' };
    report.requests.push(entry);
    try {
      assert.equal(headers[aliasProbe.VALIDATED_HEADER], aliasProbe.VALIDATED_VALUE, 'Parent proxy did not validate a safe application denial');
      aliasProbe.assertAliasResponseHeaders(probe, entry.status, entry.contentType);
      assert.equal(entry.status, probe.kind === 'optimizer' ? 400 : actor === 'anonymous' ? 401 : 403, 'Unexpected original-alias denial reason');
      const body = await response.body();
      entry.denialContract = aliasProbe.assertAliasDenial(probe, entry.status, entry.contentType, body);
      entry.byteLength = body.length; entry.bodySha256 = hash(body); entry.proxyValidatedBeforeForwarding = true;
      return entry;
    } finally { await response.dispose(); }
  };
  const privateAliasBatch = async actor => {
    const context = await newContext();
    try {
      const cookies = actor === 'anonymous' ? [] : await signIn(context, actor);
      // Full normalization matrix for anonymous + authenticated tenant A; canonical
      // alias/optimizer denial also covers every other synthetic actor before transitions.
      const plan = ['anonymous', 'ui'].includes(actor) ? privateAliasPlan : privateAliasPlan.filter(probe => probe.variant === 'canonical');
      const before = await controls.snapshot('original-alias-' + actor + '-before');
      assert.match(before.businessSha256, /^[a-f0-9]{64}$/);
      const rows = [];
      for (const probe of plan) rows.push(await privateAliasRequest(context, actor, probe));
      const after = await controls.snapshot('original-alias-' + actor + '-after');
      assert.equal(after.businessSha256, before.businessSha256, 'Original-alias denials altered business records');
      return { actor, cookies, rows, before, after, originalBytesForwarded: false,
        limit: 'Application denial is checked before bounded proxy forwarding; original bytes are never rendered or used as positive controls.' };
    } finally { await closeContext(context); }
  };
  const deniedBatch = async (context, label, asset, expectedStatus) => {
    const before = await controls.snapshot(label + '-before');
    assert.match(before.businessSha256, /^[a-f0-9]{64}$/, 'Guarded snapshot must provide business digest');
    const rows = [];
    for (const url of [asset.legacyUrl, asset.apiUrl, fixture.syntheticAliasUrl]) {
      rows.push(await request(context, label, asset, url, 'denied'));
      rows.push(await request(context, label + '-head', asset, url, 'denied', 'HEAD'));
    }
    for (const row of rows) assert.equal(row.status, expectedStatus, label + ' denial reason');
    const after = await controls.snapshot(label + '-after');
    assert.equal(after.businessSha256, before.businessSha256, 'Denied reads altered business records');
    return { rows, before, after };
  };
  const renderAsset = async (page, asset) => {
    const image = page.locator(`img[src="${asset.legacyUrl}"]`).first();
    await image.waitFor({ state: 'visible' });
    await deadline('private image decode', () => image.evaluate(img => img.decode()), 60000);
    const state = await image.evaluate(img => ({ complete: img.complete, naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight, currentSrc: new URL(img.currentSrc).pathname, alt: img.alt }));
    assert(state.complete && state.naturalWidth === asset.width && state.naturalHeight === asset.height, 'Image did not decode expected synthetic dimensions');
    assert.equal(state.currentSrc, asset.legacyUrl, 'Private image must not use the shared optimizer');
    return state;
  };
  const uiFlow = async locale => {
    const context = await newContext();
    try {
      const page = await newPage(context);
      const list = `/${locale}/dashboard/inventory/items`;
      await page.goto(allowedUrl(`/${locale}/login?returnUrl=${encodeURIComponent(list)}`), { waitUntil: 'domcontentloaded', timeout: 120000 });
      const email = page.locator('#email'), password = page.locator('#password');
      await email.waitFor({ state: 'visible' });
      assert(await email.evaluate(input => input.labels?.length > 0));
      assert(await password.evaluate(input => input.labels?.length > 0));
      await email.fill(fixture.users.ui.email);
      await password.fill(fixture.users.ui.password);
      const login = await signInCadence.run({ actor: 'ui', channel: 'ui-' + locale }, async () => {
        const [response] = await Promise.all([
          page.waitForResponse(response => response.url() === allowedUrl('/api/auth/sign-in/email') && response.request().method() === 'POST', { timeout: 120000 }),
          password.press('Enter'),
        ]);
        await response.finished();
        return { status: response.status(), retryAfter: response.headers()['x-retry-after'] };
      });
      assert.equal(login.status, 200, 'UI sign-in failed for ' + locale);
      await page.waitForURL(url => url.pathname === list, { timeout: 120000 });
      const cookieReceipt = await sessionReceipt(context);
      const listImage = await renderAsset(page, mainAsset);
      await page.screenshot({ path: path.join(output, locale + '-item-list.png'), fullPage: false });
      await page.goto(allowedUrl(`/${locale}${fixture.item.editPath}`), { waitUntil: 'domcontentloaded', timeout: 120000 });
      const editImage = await renderAsset(page, mainAsset);
      await page.screenshot({ path: path.join(output, locale + '-item-edit.png'), fullPage: false });
      await page.goto(allowedUrl(`/${locale}/dashboard/inventory/items/${fixture.item.id}`), { waitUntil: 'domcontentloaded', timeout: 120000 });
      const expectedTitle = locale === 'fr' ? fixture.item.nameFr || fixture.item.nameEn : fixture.item.nameEn;
      const detailReadiness = await renderedReady(page, locale + '-item-detail', { selector: '#item-overview-title', expectedText: expectedTitle, expectedPath: `/${locale}/dashboard/inventory/items/${fixture.item.id}`, expectedTag: 'H1' });
      const title = page.locator('#item-overview-title');
      assert.equal(await title.count(), 1, 'Detail heading must remain unique after readiness');
      await title.waitFor({ state: 'visible' });
      const detailTitle = await title.innerText();
      assert.equal(detailTitle, expectedTitle);
      await page.screenshot({ path: path.join(output, locale + '-item-detail.png'), fullPage: false });
      return { locale, viewport: { width: 1440, height: 1000 }, cookieReceipt, listImage, editImage, detailTitle, detailReadiness, detailPhoto: 'not implemented in current ItemOverview; no image-rendering claim', writes: 'Only real sign-in/session and permitted read audit effects; no item form submitted' };
    } finally { await closeContext(context); }
  };
  try {
    denyProxy = http.createServer((request, response) => {
      let hostname = 'invalid-target'; try { hostname = new URL(request.url).hostname; } catch {}
      report.externalRequestsBlocked.push({ hostname, method: request.method, mechanism: 'deny-only-loopback-proxy' });
      response.writeHead(403, { 'Connection': 'close', 'Cache-Control': 'no-store' }); response.end('External browser traffic disabled');
    });
    denyProxy.on('connect', (request, socket) => {
      let hostname = 'invalid-target'; try { hostname = new URL('https://' + request.url).hostname; } catch {}
      report.externalRequestsBlocked.push({ hostname, method: 'CONNECT', mechanism: 'deny-only-loopback-proxy' });
      socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
    });
    denyProxy.on('connection', socket => { proxySockets.add(socket); socket.on('close', () => proxySockets.delete(socket)); });
    await new Promise((resolve, reject) => { denyProxy.once('error', reject); denyProxy.listen(3194, '127.0.0.1', resolve); });
    report.denyProxy = { host: '127.0.0.1', port: 3194, externalForwarding: false };
    browser = await chromium.launch({ headless: true, proxy: { server: 'http://127.0.0.1:3194', bypass: 'localhost,127.0.0.1' }, args: ['--host-resolver-rules=MAP localhost 127.0.0.1'] });
    for (const locale of ['en', 'fr']) await record('real-ui-login-and-image-consumers-' + locale, () => uiFlow(locale));
    for (const actor of ['anonymous', ...aliases]) await record('original-private-alias-denials-' + actor, () => privateAliasBatch(actor));

    await record('anonymous-both-delivery-urls', async () => {
      const context = await newContext();
      try {
        const batch = await deniedBatch(context, 'anonymous', mainAsset, 401);
        const aliases = [
          mainAsset.legacyUrl.replace('/uploads/', '/Uploads/'),
          mainAsset.legacyUrl.replace('/uploads/', '/%75ploads/'),
          mainAsset.legacyUrl.replaceAll('/', '%2F').replace('%2F', '/'),
          mainAsset.legacyUrl.replace('/uploads/', '/%2e%2Fuploads/'),
          mainAsset.legacyUrl.replace('/uploads/', '/x/..%2Fuploads/'),
          mainAsset.legacyUrl.replace('/uploads/', '/%2Fuploads/'),
        ];
        const aliasBefore = await controls.snapshot('anonymous-encoded-aliases-before');
        assert.match(aliasBefore.businessSha256, /^[a-f0-9]{64}$/, 'Encoded alias snapshot must provide business digest');
        batch.encodedAliasResults = [];
        for (const url of aliases) {
          const row = await request(context, 'anonymous-encoded-alias', mainAsset, url, 'denied');
          assert.equal(row.status, 401, 'Anonymous encoded alias must reach the session guard');
          batch.encodedAliasResults.push(row);
        }
        const aliasAfter = await controls.snapshot('anonymous-encoded-aliases-after');
        assert.equal(aliasAfter.businessSha256, aliasBefore.businessSha256, 'Encoded alias denials altered business records');
        batch.encodedAliasNoWrites = { before: aliasBefore, after: aliasAfter };
        return batch;
      } finally { await closeContext(context); }
    });
    for (const alias of ['foreign', 'permissionDenied', 'moduleDenied']) await record(alias + '-both-delivery-urls', async () => {
      const context = await newContext();
      try {
        const cookies = await signIn(context, alias);
        const asset = alias === 'moduleDenied' ? assets.find(entry => entry.organizationId === fixture.users[alias].organizationId) : mainAsset;
        assert(asset);
        return { cookies, ...await deniedBatch(context, alias, asset, 403) };
      } finally { await closeContext(context); }
    });

    for (const [alias, kind] of [['revocation', 'revoke'], ['expiry', 'expire'], ['permissionChange', 'remove-permission'], ['moduleChange', 'disable-module']]) {
      await record(alias + '-original-signed-cookie-replay', async () => {
        const context = await newContext();
        let replay, transitionApplied = false;
        try {
          const cookieReceipt = await signIn(context, alias);
          for (const url of [mainAsset.legacyUrl, mainAsset.apiUrl, fixture.syntheticAliasUrl]) await request(context, alias + '-before', mainAsset, url, 'authorized');
          const originalCookies = await context.cookies(fixture.baseURL);
          // Warm a real consumer before navigation-away for a bounded back/restore observation.
          let page, syntheticAliasWarm;
          if (alias === 'revocation') {
            page = await newPage(context);
            await page.goto(allowedUrl('/en/dashboard/inventory/items'), { waitUntil: 'domcontentloaded', timeout: 120000 });
            await renderAsset(page, mainAsset);
            syntheticAliasWarm = await deadline('authorized synthetic alias image warm', () => page.evaluate(url => new Promise(resolve => {
              const image = new Image(); image.onload = () => resolve({ path: new URL(image.currentSrc).pathname, loaded: true, width: image.naturalWidth, height: image.naturalHeight }); image.onerror = () => resolve({ loaded: false }); image.src = url; document.body.append(image);
            }), fixture.syntheticAliasUrl), 60000);
            assert(syntheticAliasWarm.loaded && syntheticAliasWarm.width === mainAsset.width && syntheticAliasWarm.height === mainAsset.height, 'Synthetic alias browser warm must decode the exact canary dimensions');
            assert.equal(syntheticAliasWarm.path, fixture.syntheticAliasUrl);
            await page.goto(allowedUrl('/en/login'), { waitUntil: 'domcontentloaded', timeout: 120000 });
          }
          const transition = await controls.transition({ kind, actorAlias: alias });
          transitionApplied = true;
          replay = await newContext();
          await replay.addCookies(originalCookies); // Exact pre-transition signed cookies; never re-login.
          const denial = await deniedBatch(replay, alias + '-after', mainAsset, ['revoke', 'expire'].includes(kind) ? 401 : 403);
          let backRestore;
          if (page) {
            const before = await controls.snapshot('revoked-browser-restoration-before');
            assert.match(before.businessSha256, /^[a-f0-9]{64}$/, 'Browser restoration snapshot must provide business digest');
            const historySequence = [{ event: 'before-go-back', path: new URL(page.url()).pathname, at: new Date().toISOString(), sameOriginalBrowserContext: page.context() === context, defaultCachePreserved: true }];
            report.historyRecovery.push({ actor: alias, sequence: historySequence });
            assert.equal(page.context(), context, 'History probes must retain the previously warmed browser context');
            await page.goBack({ waitUntil: 'domcontentloaded', timeout: 120000 });
            historySequence.push({ event: 'history-navigation-returned', path: new URL(page.url()).pathname, at: new Date().toISOString() });
            await page.waitForURL(url => url.pathname === '/en/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
            const recoveryReadiness = await renderedReady(page, 'revoked-history-login-recovery', { selector: '#email', expectedText: null, expectedPath: '/en/login', expectedTag: 'INPUT' });
            assert.equal(await page.locator('#email').count(), 1, 'Recovered login email must remain unique');
            await page.locator('#email').waitFor({ state: 'visible' });
            historySequence.push({ event: 'login-recovery-settled-before-cache-probes', path: new URL(page.url()).pathname, at: new Date().toISOString(), readinessPassed: recoveryReadiness.passed });
            const fetchResults = [], imageReloads = [];
            for (const target of [mainAsset.legacyUrl, fixture.syntheticAliasUrl]) {
            const browserResponse = await page.evaluate(async url => {
              const response = await fetch(url, { credentials: 'same-origin', redirect: 'manual', signal: AbortSignal.timeout(60000) });
              return { status: response.status, contentType: response.headers.get('content-type'), bodyBytes: Array.from(new Uint8Array(await response.arrayBuffer())) };
            }, target);
            const fetchBody = Buffer.from(browserResponse.bodyBytes);
            const fetchResult = { status: browserResponse.status, contentType: browserResponse.contentType, byteLength: fetchBody.length, bodySha256: hash(fetchBody) };
            assert.equal(fetchResult.status, 401, 'Revoked browser fetch must reach the session guard');
            fetchResult.denialContract = assertSafeDenial(fetchResult, fetchBody);
            const imageReload = await deadline('revoked image load', () => page.evaluate(url => new Promise(resolve => {
              const image = new Image(); image.onload = () => resolve({ loaded: true, naturalWidth: image.naturalWidth }); image.onerror = () => resolve({ loaded: false, naturalWidth: image.naturalWidth }); image.src = url; document.body.append(image);
            }), target), 60000);
            assert.equal(imageReload.loaded, false, 'A new default-cache image load after revocation must fail');
            assert.equal(imageReload.naturalWidth, 0);
              fetchResults.push({ path: target, ...fetchResult }); imageReloads.push({ path: target, ...imageReload });
              historySequence.push({ event: 'default-cache-probes-completed', target, fetchStatus: fetchResult.status, imageLoaded: imageReload.loaded, at: new Date().toISOString() });
            }
            await page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 });
            await page.waitForURL(url => url.pathname === '/en/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
            const reloadReadiness = await renderedReady(page, 'revoked-login-after-reload', { selector: '#email', expectedText: null, expectedPath: '/en/login', expectedTag: 'INPUT' });
            assert.equal(await page.locator('#email').count(), 1, 'Reloaded login email must remain unique');
            await page.locator('#email').waitFor({ state: 'visible' });
            assert.equal(new URL(page.url()).pathname, '/en/login', 'Revoked session reload must recover to login');
            assert.equal(await page.locator(`img[src="${mainAsset.legacyUrl}"]`).count(), 0, 'Recovery page must not load a private consumer');
            assert.equal(await page.locator(`img[src="${fixture.syntheticAliasUrl}"]`).count(), 0, 'Recovery page must not load the synthetic alias');
            historySequence.push({ event: 'reload-recovered-without-private-consumers', path: new URL(page.url()).pathname, at: new Date().toISOString(), readinessPassed: reloadReadiness.passed, privateConsumerCount: 0 });
            const after = await controls.snapshot('revoked-browser-restoration-after');
            assert.equal(after.businessSha256, before.businessSha256, 'Revoked browser restoration altered business records');
            backRestore = { fetchResult: fetchResults[0], fetchResults, imageReload: imageReloads[0], imageReloads, syntheticAliasWarm, before, after, historySequence, recoveryReadiness, reloadReadiness, reloadPath: new URL(page.url()).pathname, loginFormVisible: true, limit: 'Tests new default-cache fetch/image load from the same warmed browser context after actual auth recovery; exact-cookie replay is separately qualified. Does not require erasing pixels previously authorized and viewed' };
          }
          return { cookieReceipt, sameOriginalCookiesReplayed: true, transition, denial, backRestore };
        } finally {
          if (kind === 'disable-module' && transitionApplied) await controls.transition({ kind: 'restore-module', actorAlias: alias });
          if (replay) await closeContext(replay);
          await closeContext(context);
        }
      });
    }

    await record('authorized-get-head-and-private-optimizer-denial', async () => {
      const context = await newContext();
      try {
        const cookies = await signIn(context, 'ui');
        const before = await controls.snapshot('authorized-and-optimizer-denials-before');
        assert.match(before.businessSha256, /^[a-f0-9]{64}$/, 'Optimizer batch snapshot must provide business digest');
        for (const url of [mainAsset.legacyUrl, mainAsset.apiUrl, fixture.syntheticAliasUrl]) {
          await request(context, 'authorized-final', mainAsset, url, 'authorized');
          await request(context, 'authorized-final-head', mainAsset, url, 'authorized', 'HEAD');
          const optimized = '/_next/image?url=' + encodeURIComponent(url) + '&w=64&q=75';
          await request(context, 'optimizer-initial', mainAsset, optimized, 'optimizer-denied');
          await request(context, 'optimizer-repeat', mainAsset, optimized, 'optimizer-denied');
          await request(context, 'optimizer-encoded-endpoint', mainAsset, optimized.replace('/_next/image?', '/_next/%69mage?'), 'optimizer-denied');
        }
        await request(context, 'authorized-encoded-legacy', mainAsset, mainAsset.legacyUrl.replace('/uploads/', '/%75ploads/'), 'authorized');
        assert(fixture.publicControlPath?.startsWith('/'), 'Public optimizer control required');
        const direct = await context.request.get(allowedUrl(fixture.publicControlPath), { maxRedirects: 0 });
        assert.equal(direct.status(), 200); await direct.dispose();
        const optimized = await context.request.get(allowedUrl('/_next/image?url=' + encodeURIComponent(fixture.publicControlPath) + '&w=64&q=75'), { maxRedirects: 0 });
        assert.equal(optimized.status(), 200); const bytes = await optimized.body(); await optimized.dispose();
        const after = await controls.snapshot('authorized-and-optimizer-denials-after');
        assert.equal(after.businessSha256, before.businessSha256, 'Authorized reads and optimizer denials altered business records');
        return { cookies, before, after, publicOptimizedSha256: hash(bytes), publicOptimizerStatus: 200 };
      } finally { await closeContext(context); }
    });
    await record('original-private-alias-probe-coverage', async () => {
      const expectedCount = privateAliasPlan.length * 2 + privateAliasPlan.filter(probe => probe.variant === 'canonical').length * (aliases.length - 1);
      const completed = report.requests.filter(row => row.expected === 'original-alias-denial-only' && row.proxyValidatedBeforeForwarding === true && row.denialContract?.safeBody === true);
      assert.equal(completed.length, expectedCount, 'Original-alias probe coverage is incomplete');
      const byActor = Object.fromEntries(['anonymous', ...aliases].map(actor => [actor, completed.filter(row => row.label === 'private-alias-' + actor).length]));
      for (const actor of ['anonymous', ...aliases]) assert.equal(byActor[actor], ['anonymous', 'ui'].includes(actor) ? privateAliasPlan.length : privateAliasPlan.filter(probe => probe.variant === 'canonical').length, 'Original-alias actor coverage is incomplete');
      report.privateAliasProbeCoverage = { expectedCount, completedCount: completed.length, byActor, proxyValidatedEveryResponse: true, originalPositiveReads: 0 };
      return report.privateAliasProbeCoverage;
    });
    await record('browser-cache-and-runtime-errors', async () => {
      assert.equal(report.pageErrors.length, 0, 'Unreviewed runtime page errors observed');
      assert.equal(report.unexpectedBrowserRequests.length, 0, 'Unexpected browser target observed');
      assert(report.cacheEvents.length > 0, 'No private image cache observations captured');
      for (const target of [mainAsset.legacyUrl, fixture.syntheticAliasUrl]) {
        assert(report.cacheEvents.some(event => event.path === target && event.status === 200), 'Missing authorized browser image response for ' + target);
        assert(report.cacheEvents.some(event => event.path === target && event.status === 401), 'Missing revoked browser response for ' + target);
      }
      assert(!report.cacheEvents.some(event => event.servedFromBrowserCache || event.fromDiskCache || event.fromPrefetchCache), 'Private image unexpectedly served from browser cache');
      return { privateImageResponses: report.cacheEvents.length, defaultCacheKept: true, pageErrors: 0 };
    });
    report.passed = report.checks.every(check => check.passed);
  } catch (error) { report.harnessError = safe(error); }
  finally {
    report.cleanupErrors = [];
    for (const context of contexts) try { await deadline('browser context cleanup', () => context.close()); } catch (error) { report.cleanupErrors.push(safe(error)); }
    if (browser) try { await deadline('browser cleanup', () => browser.close()); report.browserStopped = true; } catch (error) { report.cleanupErrors.push(safe(error)); }
    if (denyProxy) try {
      await deadline('deny proxy cleanup', async () => { for (const socket of proxySockets) socket.destroy(); if (denyProxy.listening) await new Promise((resolve, reject) => denyProxy.close(error => error ? reject(error) : resolve())); });
      const probe = net.createServer();
      await new Promise((resolve, reject) => { probe.once('error', reject); probe.listen(3194, '127.0.0.1', () => probe.close(error => error ? reject(error) : resolve())); });
      report.denyProxyStoppedAndPortReleased = true;
    } catch (error) { report.cleanupErrors.push(safe(error)); }
    if (report.cleanupErrors.length) report.passed = false;
    report.finishedAt = new Date().toISOString();
    report.limitations = [
      'Positive image reads/rendering use declared synthetic assets only; original aliases receive bounded denial-only probes, with parent proxy evidence required for zero original bytes forwarded',
      'Authorized original-alias bytes are never read. Compatibility is qualified only with the candidate-only fourth synthetic alias plus separate synthetic routing/HTTP proof',
      'The four-alias candidate policy is an isolated fixture addition; this artifact is not a deployable production-policy artifact',
      'Application/session/business read auditing is distinct from forbidden business or asset mutation',
      'No production CDN, ingress, old public copy or cache purge qualification',
      'No item edits, uploads, flags, migrations or deployment performed by this browser harness',
    ];
    await fs.writeFile(path.join(output, 'result.json'), JSON.stringify(report, null, 2) + '\n');
  }
  return { passed: report.passed, output, privateAliasProbeCoverage: report.privateAliasProbeCoverage || null, checks: report.checks.map(({ label, passed, error }) => ({ label, passed, error })) };
}

module.exports = { runBrowserQualification };
if (require.main === module) throw new Error('Use the reviewed parent orchestrator with an isolated private fixture and guarded controls; this module does not start an application.');
