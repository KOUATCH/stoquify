'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { EventEmitter } = require('node:events');
const { classifyBytes, bindProfileConsumer: bindExactProfileConsumer, classifyConsumer } = require('./consumer-evidence-v2.cjs');
const bindProfileConsumer = (row, actor, binding, dom, phase = [row]) => bindExactProfileConsumer(row, actor, binding, dom, phase);
const { attachProtocol } = require('./browser-protocol-v3.cjs');
const { fixtureCanaries, deniedBytesClear } = require('./private-canaries.cjs');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const actor = { id: 'fixture', email: 'fixture@example.invalid', organizationId: 'org' };
const binding = { actionId: 'a'.repeat(40), actionIdSha256: hash('a'.repeat(40)) };
const profile = { actorIdSha256: hash(actor.id), organizationIdSha256: hash(actor.organizationId), emailSha256: hash(actor.email), fieldsSha256: hash('fields'), checkedAt: '2026-11-10T12:00:00.100Z', snapshotHash: 'b'.repeat(64) };
const row = { captureId: 'original', method: 'POST', path: '/en/dashboard/profile', origin: 'https://localhost:3296', urlSha256: hash('url'), status: 200, contextId: 'context-1', expectedCheckedText: 'checked', requestHeaders: { 'next-action': binding.actionId }, acceptanceWindow: { startMs: Date.parse('2026-11-10T11:59:59.900Z'), endMs: Date.parse('2026-11-10T12:00:00.800Z') } };
const bridge = { ...row, complete: true, upstreamComplete: true, downstreamFinished: true, aborted: false, downstreamClosedEarly: false, decodedBytes: 12, decodedSha256: hash('original'), containsActorCanary: { actor: true }, profileRead: profile, request: { nextAction: binding.actionId } };
const cdp = { ...row, matchCount: 1, responseEventCount: 1, redirected: false, fromDiskCache: false, fromServiceWorker: false, fromPrefetchCache: false, errors: [], dataLength: 12, requestWallTimeMs: Date.parse('2026-11-10T12:00:00.000Z'), responseWallTimeMs: Date.parse('2026-11-10T12:00:00.200Z'), terminalWallTimeMs: Date.parse('2026-11-10T12:00:00.300Z'), stream: { enabled: true, bytes: 12, sha256: hash('original'), containsActorCanary: { actor: true }, profileRead: profile }, terminal: { kind: 'loadingFailed', canceled: true, errorText: 'net::ERR_ABORTED' } };
const dom = [{ kind: 'profile', path: row.path, at: Date.parse('2026-11-10T12:00:00.400Z'), checkedText: 'checked', fieldsSha256: profile.fieldsSha256, emailSha256: profile.emailSha256 }];
const bound = { ...row, bridge, cdp };

test('denied bytes reject an organization-only private leak', () => {
  const bytes = Buffer.from('organization=' + actor.organizationId);
  assert(!bytes.includes(Buffer.from(actor.id))); assert(!bytes.includes(Buffer.from(actor.email)));
  const flags = fixtureCanaries(bytes, { actor });
  assert.equal(flags.actor, true); assert.equal(deniedBytesClear(flags), false);
});
test('denied bytes reject actor-id-only and email-only private leaks', () => {
  for (const text of [actor.id, actor.email]) assert.equal(deniedBytesClear(fixtureCanaries(Buffer.from(text), { actor })), false);
});
test('denied bytes accept explicitly classified safe content', () => assert.equal(deniedBytesClear(fixtureCanaries(Buffer.from('Sign in again'), { actor })), true));
test('denied bytes reject absent or empty classification', () => { assert.equal(deniedBytesClear(null), false); assert.equal(deniedBytesClear({}), false); });

test('canceled original bytes require exact profile consumer, retaining strict failure', () => {
  const bytes = classifyBytes(row, bridge, cdp), consumer = bindProfileConsumer(bound, actor, binding, dom);
  assert(bytes.accepted); assert(consumer.accepted);
  const result = classifyConsumer(row, bytes, consumer, []);
  assert(result.accepted); assert.equal(result.strictNetworkGatePassed, false); assert.equal(result.canceledTerminalPreserved, true);
});
for (const [name, alter] of [
  ['missing bridge', () => classifyBytes(row, null, cdp)],
  ['wrong response id', () => classifyBytes(row, bridge, { ...cdp, captureId: 'other' })],
  ['wrong full URL', () => classifyBytes(row, bridge, { ...cdp, urlSha256: 'other' })],
  ['wrong method', () => classifyBytes(row, bridge, { ...cdp, method: 'GET' })],
  ['ambiguous response', () => classifyBytes(row, bridge, { ...cdp, matchCount: 2 })],
  ['redirect hop', () => classifyBytes(row, bridge, { ...cdp, redirected: true })],
  ['unfinished original', () => classifyBytes(row, { ...bridge, upstreamComplete: false }, cdp)],
  ['downstream abort', () => classifyBytes(row, { ...bridge, downstreamClosedEarly: true }, cdp)],
  ['stream unsupported', () => classifyBytes(row, bridge, { ...cdp, streamError: 'Unsupported' })],
  ['overflow', () => classifyBytes(row, bridge, { ...cdp, stream: { ...cdp.stream, overflow: true } })],
  ['missing stream event', () => classifyBytes(row, bridge, { ...cdp, stream: { ...cdp.stream, missingDataEventsAfterEnable: 1 } })],
  ['duplicate browser bytes', () => classifyBytes(row, bridge, { ...cdp, stream: { ...cdp.stream, bytes: 24 } })],
  ['wrong byte hash', () => classifyBytes(row, bridge, { ...cdp, stream: { ...cdp.stream, sha256: hash('other') } })],
  ['wrong actor flags', () => classifyBytes(row, bridge, { ...cdp, stream: { ...cdp.stream, containsActorCanary: { actor: false } } })],
  ['disk cache', () => classifyBytes(row, bridge, { ...cdp, fromDiskCache: true })],
  ['unobserved terminal', () => classifyBytes(row, bridge, { ...cdp, terminal: null })],
  ['real network failure', () => classifyBytes(row, bridge, { ...cdp, terminal: { kind: 'loadingFailed', errorText: 'ERR_CONNECTION_RESET' } })],
  ['blocked cancellation', () => classifyBytes(row, bridge, { ...cdp, terminal: { ...cdp.terminal, blockedReason: 'cors' } })],
  ['wrong compiled action', () => bindProfileConsumer({ ...bound, requestHeaders: { 'next-action': 'other' } }, actor, binding, dom)],
  ['wrong CDP action', () => bindProfileConsumer({ ...bound, cdp: { ...cdp, requestHeaders: { 'next-action': 'other' } } }, actor, binding, dom)],
  ['missing CDP action', () => bindProfileConsumer({ ...bound, cdp: { ...cdp, requestHeaders: {} } }, actor, binding, dom)],
  ['wrong actor', () => bindProfileConsumer(bound, { ...actor, id: 'other' }, binding, dom)],
  ['wrong tenant', () => bindProfileConsumer(bound, { ...actor, organizationId: 'other' }, binding, dom)],
  ['missing root result', () => bindProfileConsumer({ ...bound, bridge: { ...bridge, profileRead: null } }, actor, binding, dom)],
  ['different browser root', () => bindProfileConsumer({ ...bound, cdp: { ...cdp, stream: { ...cdp.stream, profileRead: { ...profile, snapshotHash: 'c'.repeat(64) } } } }, actor, binding, dom)],
  ['unconsumed profile', () => bindProfileConsumer(bound, actor, binding, [])],
  ['stale DOM', () => bindProfileConsumer(bound, actor, binding, [{ ...dom[0], at: cdp.requestWallTimeMs - 1 }])],
  ['wrong displayed fields', () => bindProfileConsumer(bound, actor, binding, [{ ...dom[0], fieldsSha256: hash('wrong') }])],
  ['wrong checked time', () => bindProfileConsumer(bound, actor, binding, [{ ...dom[0], checkedText: 'stale' }])],
  ['wrong consumed route', () => bindProfileConsumer(bound, actor, binding, [{ ...dom[0], path: '/fr/dashboard/profile' }])],
  ['DOM after observation window', () => bindProfileConsumer(bound, actor, binding, [{ ...dom[0], at: row.acceptanceWindow.endMs + 1 }])],
  ['request before observation window', () => bindProfileConsumer({ ...bound, acceptanceWindow: { ...row.acceptanceWindow, startMs: cdp.requestWallTimeMs + 1 } }, actor, binding, dom)],
  ['terminal before response', () => bindProfileConsumer({ ...bound, cdp: { ...cdp, terminalWallTimeMs: cdp.responseWallTimeMs - 1 } }, actor, binding, dom)],
  ['terminal after observation window', () => bindProfileConsumer({ ...bound, cdp: { ...cdp, terminalWallTimeMs: row.acceptanceWindow.endMs + 1 } }, actor, binding, dom)],
  ['missing observation window', () => bindProfileConsumer({ ...bound, acceptanceWindow: null }, actor, binding, dom)],
  ['two DOM events matching one response', () => bindProfileConsumer(bound, actor, binding, [dom[0], { ...dom[0], at: dom[0].at + 1 }])],
  ['same formatted-time responses competing for one DOM event', () => bindProfileConsumer(bound, actor, binding, dom, [bound, { ...bound, captureId: 'second-original', bridge: { ...bridge, profileRead: { ...profile, checkedAt: '2026-11-10T12:00:00.199Z' } } }])],
  ['missing response-to-DOM uniqueness set', () => bindExactProfileConsumer(bound, actor, binding, dom)],
]) test('rejects ' + name, () => assert.equal(alter().accepted, false));

test('required cancellation cannot pass on bytes alone', () => assert.equal(classifyConsumer(row, classifyBytes(row, bridge, cdp), null, []).accepted, false));
test('speculative cancellation requires established purpose and same-context real navigation', () => {
  const get = { ...row, method: 'GET', prefetch: true, requestHeaders: { rsc: '1' }, cdp: { initiator: { type: 'script' } } };
  const bytes = { accepted: true, issues: [], networkCanceled: true, networkCompleted: false };
  assert.equal(classifyConsumer(get, bytes, null, []).accepted, false);
  assert.equal(classifyConsumer(get, bytes, null, [{ contextId: 'wrong', targetPath: get.path, accepted: true }]).accepted, false);
  assert.equal(classifyConsumer(get, bytes, null, [{ contextId: get.contextId, targetPath: get.path, accepted: true }]).accepted, true);
  assert.equal(classifyConsumer({ ...get, prefetch: false }, bytes, null, [{ contextId: get.contextId, targetPath: get.path, accepted: true }]).accepted, false);
});

test('CDP stream keeps prefix before chunks even when chunks arrive before enable reply', async () => {
  const session = new EventEmitter();
  let resolveStream;
  session.send = async method => method === 'Network.streamResourceContent' ? new Promise(resolve => { resolveStream = resolve; }) : {};
  session.detach = async () => {};
  const observer = await attachProtocol({ context: () => ({ newCDPSession: async () => session }) }, { baseURL: row.origin, profileReadActionBinding: binding, users: { actor } }, error => error.message);
  const url = row.origin + row.path;
  session.emit('Network.requestWillBeSent', { requestId: 'r1', timestamp: 1, wallTime: 10, request: { url, method: 'GET', headers: {} }, type: 'Fetch', initiator: { type: 'script' } });
  session.emit('Network.responseReceived', { requestId: 'r1', timestamp: 2, response: { url, status: 200, headers: { 'x-p04-r06-response-id': 'original' } }, type: 'Fetch' });
  session.emit('Network.dataReceived', { requestId: 'r1', timestamp: 2.1, dataLength: 3, encodedDataLength: 3 });
  session.emit('Network.dataReceived', { requestId: 'r1', timestamp: 2.2, dataLength: 3, encodedDataLength: 3, data: Buffer.from('def').toString('base64') });
  resolveStream({ bufferedData: Buffer.from('abc').toString('base64') });
  session.emit('Network.loadingFailed', { requestId: 'r1', timestamp: 3, canceled: true, errorText: 'net::ERR_ABORTED' });
  const receipt = await observer.receipt('original');
  assert.equal(receipt.stream.sha256, hash('abcdef')); assert.equal(receipt.stream.bytes, 6); assert.equal(receipt.dataLength, 6);
  assert.equal(receipt.terminal.kind, 'loadingFailed'); assert.equal(receipt.stream.bufferedBytes, 3); assert.equal(receipt.stream.subsequentChunks, 1);
  await observer.close();
});
