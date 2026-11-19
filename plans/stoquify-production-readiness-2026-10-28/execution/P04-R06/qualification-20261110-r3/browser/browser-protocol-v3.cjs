'use strict';
// Passive browser protocol and DOM observers. No request interception/replay or cache changes.
const crypto = require('node:crypto');
const { profileReadEvidence } = require('./flight-profile-evidence.cjs');
const { fixtureCanaries } = require('./private-canaries.cjs');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const MAX_BYTES = 32 * 1024 * 1024;
const requestNames = ['accept', 'content-type', 'next-action', 'rsc', 'next-router-prefetch', 'next-router-segment-prefetch', 'purpose', 'sec-purpose', 'sec-fetch-site', 'sec-fetch-mode', 'sec-fetch-dest'];
const responseNames = ['content-type', 'content-encoding', 'content-length', 'transfer-encoding', 'connection', 'cache-control', 'vary', 'x-p04-r06-response-id'];
const lower = headers => Object.fromEntries(Object.entries(headers || {}).map(([key, value]) => [key.toLowerCase(), value]));
const pick = (headers, names) => Object.fromEntries(names.filter(name => headers[name] !== undefined).map(name => [name, headers[name]]));
function safeUrl(value) { try { const url = new URL(value); return { origin: url.origin, path: url.pathname, sha256: hash(value) }; } catch { return null; } }

async function installDomObserver(page, events) {
  await page.exposeBinding('__p04R06Observe', (_source, value) => {
    const entry = { kind: value.kind, at: value.at, path: value.path };
    if (value.kind === 'profile') {
      entry.checkedText = value.checkedText;
      entry.emailSha256 = hash(value.email);
      entry.fieldsSha256 = hash(JSON.stringify(value.fields));
    } else { entry.name = value.name; entry.persisted = value.persisted ?? null; entry.visibility = value.visibility ?? null; }
    events.push(entry);
  });
  await page.addInitScript(() => {
    const emit = value => { void window.__p04R06Observe({ ...value, at: performance.timeOrigin + performance.now(), path: location.pathname }).catch(() => {}); };
    for (const name of ['pagehide', 'pageshow', 'visibilitychange']) window.addEventListener(name, event => emit({ kind: 'lifecycle', name, persisted: event.persisted, visibility: document.visibilityState }));
    let previous = '';
    const observe = () => {
      const firstName = document.querySelector('input[name="firstName"]');
      const form = firstName?.closest('form');
      if (!form) return;
      const checkedText = [...form.querySelectorAll('p')].map(element => element.textContent.trim()).find(text => text.startsWith('Account record checked:') || text.startsWith('Fiche du compte vérifiée le:'));
      const section = [...document.querySelectorAll('section')].find(element => /^(Account details|Informations du compte)$/.test(element.querySelector('h2')?.textContent.trim() || ''));
      const email = section?.querySelector('dd')?.childNodes[0]?.textContent.trim();
      if (!checkedText || !email) return;
      const fields = Object.fromEntries(['firstName', 'lastName', 'jobTitle'].map(key => [key, form.querySelector('input[name="' + key + '"]')?.value ?? '']));
      const signature = JSON.stringify({ checkedText, email, fields, path: location.pathname });
      if (signature === previous) return;
      previous = signature;
      emit({ kind: 'profile', checkedText, email, fields });
    };
    new MutationObserver(observe).observe(document, { subtree: true, childList: true, characterData: true, attributes: true });
    document.addEventListener('DOMContentLoaded', observe);
  });
}

async function attachProtocol(page, fixture, safe) {
  const session = await page.context().newCDPSession(page);
  const entries = [], requests = new Map(), captures = new Map(), memory = new Map(), errors = [], lifecycle = [];
  let nextOrdinal = 0;
  const selected = value => { const url = safeUrl(value); return url?.origin === fixture.baseURL && (/^\/api\/(auth|me)\//.test(url.path) || url.path.endsWith('/dashboard/profile')); };
  const onRequest = event => {
    const previous = requests.get(event.requestId);
    if (previous && !event.redirectResponse) errors.push({ kind: 'request_id_reused_without_redirect', requestId: event.requestId });
    if (previous && event.redirectResponse) { previous.redirected = true; previous.terminal = { kind: 'redirected', timestamp: event.timestamp }; requests.delete(event.requestId); }
    if (!selected(event.request.url)) return;
    const url = safeUrl(event.request.url);
    const entry = {
      requestId: event.requestId, hop: previous ? previous.hop + 1 : 0, ordinal: ++nextOrdinal,
      origin: url.origin, path: url.path, urlSha256: url.sha256, method: event.request.method,
      requestTimestamp: event.timestamp, requestWallTimeMs: event.wallTime * 1000,
      requestHeaders: pick(lower(event.request.headers), requestNames), requestType: event.type,
      initiator: { type: event.initiator?.type, stack: (event.initiator?.stack?.callFrames || []).slice(0, 16).map(frame => ({ functionName: frame.functionName, scriptId: frame.scriptId, url: safeUrl(frame.url), lineNumber: frame.lineNumber, columnNumber: frame.columnNumber })) },
      frameId: event.frameId, loaderId: event.loaderId, redirected: false, responseEventCount: 0,
      dataLength: 0, encodedDataLength: 0, errors: [],
    };
    requests.set(event.requestId, entry); entries.push(entry);
  };
  const onResponse = event => {
    if (!selected(event.response.url)) return;
    const entry = requests.get(event.requestId);
    if (!entry) { errors.push({ kind: 'response_without_request', requestId: event.requestId }); return; }
    entry.responseEventCount += 1;
    const headers = lower(event.response.headers);
    entry.captureId = headers['x-p04-r06-response-id'] ?? null;
    entry.status = event.response.status; entry.responseType = event.type;
    entry.responseTimestamp = event.timestamp;
    entry.responseWallTimeMs = entry.requestWallTimeMs + (event.timestamp - entry.requestTimestamp) * 1000;
    entry.responseHeaders = pick(headers, responseNames);
    entry.fromDiskCache = Boolean(event.response.fromDiskCache); entry.fromServiceWorker = Boolean(event.response.fromServiceWorker); entry.fromPrefetchCache = Boolean(event.response.fromPrefetchCache);
    if (hash(event.response.url) !== entry.urlSha256) entry.errors.push('request_response_url_mismatch');
    if (entry.captureId) { const matches = captures.get(entry.captureId) || []; matches.push(entry); captures.set(entry.captureId, matches); }
    const buffer = { prefix: null, chunks: [], total: 0, enabled: false, overflow: false, missingDataEventsAfterEnable: 0 };
    memory.set(entry.ordinal, buffer);
    buffer.promise = session.send('Network.streamResourceContent', { requestId: entry.requestId }).then(value => {
      const prefix = Buffer.from(value.bufferedData, 'base64');
      buffer.prefix = prefix; buffer.total += prefix.length; buffer.enabled = true;
      if (buffer.total > MAX_BYTES) { buffer.overflow = true; buffer.prefix = null; buffer.chunks = []; }
    }).catch(error => { entry.streamError = safe(error); });
  };
  const onData = event => {
    const entry = requests.get(event.requestId);
    if (!entry) return;
    entry.dataLength += event.dataLength; entry.encodedDataLength += event.encodedDataLength;
    entry.lastDataTimestamp = event.timestamp;
    const buffer = memory.get(entry.ordinal);
    if (!buffer || buffer.overflow) return;
    if (event.data !== undefined) {
      const chunk = Buffer.from(event.data, 'base64');
      if (chunk.length !== event.dataLength) entry.errors.push('stream_chunk_length_mismatch');
      buffer.total += chunk.length;
      if (buffer.total > MAX_BYTES) { buffer.overflow = true; buffer.chunks = []; buffer.prefix = null; return; }
      buffer.chunks.push(chunk);
    } else if (buffer.enabled && event.dataLength > 0) buffer.missingDataEventsAfterEnable += 1;
  };
  const onTerminal = kind => event => {
    const entry = requests.get(event.requestId);
    if (!entry) return;
    if (entry.terminal) entry.errors.push('multiple_terminal_events');
    entry.terminalWallTimeMs = entry.requestWallTimeMs + (event.timestamp - entry.requestTimestamp) * 1000;
    entry.terminal = kind === 'loadingFinished' ? { kind, timestamp: event.timestamp, encodedDataLength: event.encodedDataLength } : { kind, timestamp: event.timestamp, errorText: event.errorText, canceled: Boolean(event.canceled), blockedReason: event.blockedReason ?? null, corsErrorStatus: event.corsErrorStatus ?? null };
  };
  const handlers = { 'Network.requestWillBeSent': onRequest, 'Network.responseReceived': onResponse, 'Network.dataReceived': onData, 'Network.loadingFinished': onTerminal('loadingFinished'), 'Network.loadingFailed': onTerminal('loadingFailed') };
  for (const [name, handler] of Object.entries(handlers)) session.on(name, handler);
  const onLifecycle = event => lifecycle.push({ kind: 'Page.lifecycleEvent', name: event.name, timestamp: event.timestamp, frameId: event.frameId, loaderId: event.loaderId });
  const onNavigation = event => lifecycle.push({ kind: 'Page.frameNavigated', frameId: event.frame.id, loaderId: event.frame.loaderId, url: safeUrl(event.frame.url), at: Date.now() });
  session.on('Page.lifecycleEvent', onLifecycle); session.on('Page.frameNavigated', onNavigation);
  await session.send('Network.enable'); await session.send('Page.enable'); await session.send('Page.setLifecycleEventsEnabled', { enabled: true });
  return {
    entries, errors, lifecycle,
    async receipt(captureId) {
      const deadline = Date.now() + 15000;
      while (Date.now() < deadline) {
        const found = captures.get(captureId) || [];
        if (found.length > 1 || (found.length === 1 && found[0].terminal)) break;
        await new Promise(resolve => setTimeout(resolve, 40));
      }
      const matches = captures.get(captureId) || [];
      if (matches.length !== 1) return { captureId, matchCount: matches.length, errors: ['ambiguous_or_missing_original_response'] };
      const entry = matches[0], buffer = memory.get(entry.ordinal);
      if (buffer) await buffer.promise;
      const receipt = JSON.parse(JSON.stringify({ ...entry, matchCount: matches.length }));
      if (buffer && !buffer.overflow && buffer.prefix) {
        const body = Buffer.concat([buffer.prefix, ...buffer.chunks]);
        receipt.stream = {
          enabled: buffer.enabled, overflow: buffer.overflow, bufferedBytes: buffer.prefix.length, subsequentChunks: buffer.chunks.length,
          missingDataEventsAfterEnable: buffer.missingDataEventsAfterEnable, bytes: body.length, sha256: hash(body),
          containsActorCanary: fixtureCanaries(body, fixture.users),
        };
        if (entry.method === 'POST' && entry.requestHeaders['next-action'] === fixture.profileReadActionBinding.actionId) {
          try { receipt.stream.profileRead = profileReadEvidence(body); }
          catch (error) { receipt.stream.profileReadError = safe(error); }
        }
      } else receipt.stream = { enabled: buffer?.enabled ?? false, overflow: buffer?.overflow ?? false, missingDataEventsAfterEnable: buffer?.missingDataEventsAfterEnable ?? null };
      return receipt;
    },
    async close() {
      for (const [name, handler] of Object.entries(handlers)) session.off(name, handler);
      session.off('Page.lifecycleEvent', onLifecycle); session.off('Page.frameNavigated', onNavigation);
      await session.detach();
      for (const buffer of memory.values()) { buffer.prefix = null; buffer.chunks = []; }
      memory.clear();
    },
  };
}

module.exports = { installDomObserver, attachProtocol, requestNames, responseNames, pick, safeUrl };
