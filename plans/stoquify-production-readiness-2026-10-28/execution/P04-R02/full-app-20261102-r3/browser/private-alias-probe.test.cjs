'use strict';
// Pure protocol assertions only: no app, browser, database, network or private asset reads.
const test = require('node:test');
const assert = require('node:assert/strict');
const protocol = require('./private-alias-probe.cjs');
const aliases = ['cabin-1.jpg', 'cabin-2.jpg', 'profile.jpg'].map((name, i) => ({
  source: 'public/images/' + name, uploadSource: 'public/uploads/cmp_org_005/' + (i + 1) + '-fixture.jpg',
  destination: 'runtime/.private/uploads/cmp_org_005/' + (i + 1) + '-fixture.jpg', sha256: 'a'.repeat(64),
}));
// Mapping UUID validation intentionally excludes arbitrary names; metadata here has no asset bytes.
for (const [i, alias] of aliases.entries()) {
  alias.uploadSource = 'public/uploads/cmp_org_005/' + (i + 1) + '-abcdef.jpg';
  alias.destination = 'runtime/.private/uploads/cmp_org_005/' + (i + 1) + '-abcdef.jpg';
}
const plan = protocol.buildPrivateAliasProbePlan(aliases);
const get = plan.find(row => row.kind === 'route' && row.method === 'GET');
const head = plan.find(row => row.method === 'HEAD');
const optimizer = plan.find(row => row.kind === 'optimizer');
const envelope = status => ({ error: status === 401 ? 'Unauthenticated' : 'Forbidden',
  code: status === 401 ? 'AUTH_REQUIRED' : 'FORBIDDEN', correlationId: 'err_01234567-89ab-cdef-0123-456789abcdef',
  category: status === 401 ? 'authentication' : 'authorization', severity: 'medium', retryable: false });
const body = status => Buffer.from(JSON.stringify(envelope(status)));
const json = 'application/json; charset=utf-8';
const hidden = 'DO_NOT_LOG_SYNTHETIC_PRIVATE_PAYLOAD';
const refuses = work => assert.throws(work, error => !error.message.includes(hidden));

test('93 exact probes cover three aliases and ten normalization forms', () => {
  assert.equal(plan.length, 93); assert.equal(new Set(plan.map(row => row.variant)).size, 10);
  assert.equal(new Set(plan.map(row => row.aliasSource)).size, 3);
});
test('candidate-only fourth synthetic alias is excluded from original denial probes', () => {
  const synthetic = { source: protocol.SYNTHETIC_ALIAS_SOURCE, uploadSource: 'public/uploads/p04-upload-a/sentinel.png',
    destination: 'runtime/.private/uploads/p04-upload-a/sentinel.png', sha256: 'b'.repeat(64) };
  assert.deepEqual(protocol.buildPrivateAliasProbePlan([...aliases, synthetic]), plan);
});
test('refuses changed fourth-alias owner or target', () => {
  const synthetic = { source: protocol.SYNTHETIC_ALIAS_SOURCE, uploadSource: 'public/uploads/p04-upload-b/sentinel.png',
    destination: 'runtime/.private/uploads/p04-upload-b/sentinel.png', sha256: 'b'.repeat(64) };
  assert.throws(() => protocol.buildPrivateAliasProbePlan([...aliases, synthetic]));
});
test('all request paths survive URL serialization exactly', () => {
  for (const row of plan) { const u = new URL(row.path, 'https://localhost:3192'); assert.equal(u.pathname + u.search, row.path); }
});
test('probe match requires exact marker, method and path', () => {
  assert.equal(protocol.matchPrivateAliasProbe(plan, get.method, get.path, protocol.PROBE_VALUE), get);
  assert.equal(protocol.matchPrivateAliasProbe(plan, get.method, get.path, 'wrong'), null);
  assert.equal(protocol.matchPrivateAliasProbe(plan, 'POST', get.path, protocol.PROBE_VALUE), null);
  assert.equal(protocol.matchPrivateAliasProbe(plan, get.method, get.path + '?extra=1', protocol.PROBE_VALUE), null);
});
for (const status of [401, 403]) test('accepts canonical public denial ' + status, () => {
  assert.equal(protocol.assertAliasDenial(get, status, json, body(status)).safeBody, true);
});
test('accepts empty HEAD and exact optimizer response', () => {
  assert.equal(protocol.assertAliasDenial(head, 401, json, Buffer.alloc(0)).safeBody, true);
  assert.equal(protocol.assertAliasDenial(optimizer, 400, 'text/plain;charset=UTF-8', Buffer.from('Private image optimization is unavailable')).safeBody, true);
});
test('rejects successful or image upstream headers before collecting a body', () => {
  refuses(() => protocol.assertAliasResponseHeaders(get, 200, 'image/jpeg'));
  refuses(() => protocol.assertAliasResponseHeaders(get, 403, 'image/jpeg'));
});
test('rejects unexpected HTML and other error statuses', () => {
  refuses(() => protocol.assertAliasResponseHeaders(get, 403, 'text/html'));
  refuses(() => protocol.assertAliasResponseHeaders(get, 404, json));
  refuses(() => protocol.assertAliasResponseHeaders(optimizer, 200, 'text/plain'));
});
test('rejects arbitrary response bytes without logging them', () => {
  refuses(() => protocol.assertAliasDenial(get, 403, json, Buffer.from(hidden)));
});
test('rejects added private fields without logging key or value', () => {
  refuses(() => protocol.assertAliasDenial(get, 403, json, Buffer.from(JSON.stringify({ ...envelope(403), [hidden]: hidden }))));
});
test('rejects private error text without logging it', () => {
  refuses(() => protocol.assertAliasDenial(get, 403, json, Buffer.from(JSON.stringify({ ...envelope(403), error: hidden }))));
});
test('rejects private correlation content without logging it', () => {
  refuses(() => protocol.assertAliasDenial(get, 403, json, Buffer.from(JSON.stringify({ ...envelope(403), correlationId: hidden }))));
});
test('rejects appended or noncanonical JSON bytes', () => {
  refuses(() => protocol.assertAliasDenial(get, 403, json, Buffer.concat([body(403), Buffer.from(hidden)])));
  refuses(() => protocol.assertAliasDenial(get, 403, json, Buffer.from(' ' + body(403))));
});
test('rejects oversized bodies', () => {
  refuses(() => protocol.assertAliasDenial(get, 403, json, Buffer.alloc(protocol.MAX_DENIAL_BYTES + 1)));
});
test('rejects nonempty HEAD and optimizer suffixes', () => {
  refuses(() => protocol.assertAliasDenial(head, 401, json, Buffer.from(hidden)));
  refuses(() => protocol.assertAliasDenial(optimizer, 400, 'text/plain', Buffer.from('Private image optimization is unavailable' + hidden)));
});
test('refuses changed original-owner or alias metadata', () => {
  assert.throws(() => protocol.buildPrivateAliasProbePlan(aliases.map((a, i) => i ? a : { ...a, uploadSource: a.uploadSource.replace('cmp_org_005', 'p04-upload-a') })));
  assert.throws(() => protocol.buildPrivateAliasProbePlan(aliases.map((a, i) => i ? a : { ...a, source: 'public/images/unreviewed.jpg' })));
});
