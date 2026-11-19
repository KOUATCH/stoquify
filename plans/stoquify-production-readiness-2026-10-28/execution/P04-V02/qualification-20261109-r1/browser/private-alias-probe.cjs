'use strict';
// Pure qualification protocol. No filesystem, app, HTTP, database or browser import.
const assert = require('node:assert/strict');
const PROBE_HEADER = 'x-stoquify-private-alias-probe';
const PROBE_VALUE = 'p04r02-negative-r3';
const VALIDATED_HEADER = 'x-stoquify-alias-denial-validated';
const VALIDATED_VALUE = 'p04r02-r3';
const MAX_DENIAL_BYTES = 511;
const SYNTHETIC_ALIAS_SOURCE = 'public/images/p04-private-alias.png';
const SYNTHETIC_ALIAS_URL = '/images/p04-private-alias.png';
const aliasNames = ['cabin-1.jpg', 'cabin-2.jpg', 'profile.jpg'];

function aliasVariants(aliasPath) {
  assert(/^\/images\/(?:cabin-[12]|profile)\.jpg$/.test(aliasPath));
  const name = aliasPath.slice('/images/'.length);
  return [
    { form: 'canonical', path: aliasPath },
    { form: 'case', path: aliasPath.toUpperCase() },
    { form: 'encoded-directory', path: '/%69mages/' + name },
    { form: 'encoded-filename', path: '/images/%' + name.charCodeAt(0).toString(16) + name.slice(1) },
    { form: 'encoded-separator', path: '/images%2F' + name },
    { form: 'double-encoded-directory', path: '/%2569mages/' + name },
    { form: 'traversal', path: '/discard/..%2Fimages/' + name },
    { form: 'encoded-leading-slash', path: '/%2Fimages/' + name },
    { form: 'trailing-dot', path: aliasPath + '.' },
    { form: 'default-stream', path: aliasPath + '%3A%3A%24DATA' },
  ];
}

function buildPrivateAliasProbePlan(aliases) {
  assert(Array.isArray(aliases) && [3, 4].includes(aliases.length), 'Three original aliases and at most one synthetic fixture alias required');
  const originals = aliases.filter(alias => alias.source !== SYNTHETIC_ALIAS_SOURCE);
  assert(JSON.stringify(originals.map(alias => alias.source).sort()) === JSON.stringify(aliasNames.map(name => 'public/images/' + name).sort()), 'Original alias policy changed');
  if (aliases.length === 4) {
    const synthetic = aliases.find(alias => alias.source === SYNTHETIC_ALIAS_SOURCE);
    assert(synthetic && synthetic.uploadSource === 'public/uploads/p04-upload-a/sentinel.png', 'Synthetic alias target changed');
    assert(synthetic.destination === 'runtime/.private/uploads/p04-upload-a/sentinel.png' && /^[a-f0-9]{64}$/.test(synthetic.sha256), 'Invalid synthetic alias mapping');
  }
  for (const alias of originals) {
    assert(/^public\/uploads\/cmp_org_005\/[a-f0-9-]+\.jpg$/.test(alias.uploadSource), 'Private alias owner changed');
    assert(/^[a-f0-9]{64}$/.test(alias.sha256), 'Private alias digest missing');
    assert.equal(alias.destination, 'runtime/.private/uploads/' + alias.uploadSource.slice('public/uploads/'.length));
  }
  const plan = originals.flatMap(alias => aliasVariants(alias.source.slice('public'.length)).flatMap(variant => {
    const shared = { aliasSource: alias.source, variant: variant.form };
    const optimizer = '/_next/image?url=' + encodeURIComponent(variant.path) + '&w=64&q=75';
    return [
      ...['GET', 'HEAD'].map(method => ({ ...shared, kind: 'route', method, path: variant.path })),
      { ...shared, kind: 'optimizer', method: 'GET', path: optimizer },
      ...(variant.form === 'canonical' ? [{ ...shared, kind: 'optimizer', method: 'GET', path: optimizer.replace('/_next/image?', '/_next/%69mage?') }] : []),
    ];
  }));
  assert.equal(new Set(plan.map(row => row.method + ' ' + row.path)).size, plan.length, 'Duplicate alias probe');
  return plan;
}

function matchPrivateAliasProbe(plan, method, requestPath, marker) {
  if (marker !== PROBE_VALUE || !['GET', 'HEAD'].includes(method)) return null;
  return plan.find(row => row.method === method && row.path === requestPath) || null;
}

function assertAliasResponseHeaders(probe, status, contentType) {
  assert(probe && ['route', 'optimizer'].includes(probe.kind), 'Unrecognized private alias probe');
  const expectedType = probe.kind === 'optimizer' ? 'text/plain' : 'application/json';
  assert(probe.kind === 'optimizer' ? status === 400 : [401, 403].includes(status), 'Unexpected alias upstream status');
  assert((contentType || '').split(';')[0].toLowerCase() === expectedType, 'Unexpected alias upstream content type');
}

function assertAliasDenial(probe, status, contentType, body) {
  assertAliasResponseHeaders(probe, status, contentType);
  assert(Buffer.isBuffer(body), 'Alias denial must be a byte buffer');
  assert(body.length <= MAX_DENIAL_BYTES, 'Alias denial exceeds bounded public envelope');
  if (probe.method === 'HEAD') {
    assert.equal(body.length, 0, 'Alias HEAD denial must be empty');
    return { contract: 'empty-auth-denial-head', status, safeBody: true };
  }
  if (probe.kind === 'optimizer') {
    assert(body.equals(Buffer.from('Private image optimization is unavailable')), 'Unexpected optimizer alias body');
    return { contract: 'fixed-private-optimizer-denial', status, safeBody: true };
  }
  let envelope;
  try { envelope = JSON.parse(body.toString('utf8')); } catch { throw new Error('Malformed alias denial envelope'); }
  assert(envelope && typeof envelope === 'object' && !Array.isArray(envelope), 'Invalid alias denial envelope');
  assert(JSON.stringify(Object.keys(envelope).sort()) === JSON.stringify(['category', 'code', 'correlationId', 'error', 'retryable', 'severity']), 'Unexpected alias denial fields');
  assert(body.equals(Buffer.from(JSON.stringify(envelope))), 'Unexpected bytes around alias denial envelope');
  const unauthenticated = status === 401;
  assert(envelope.error === (unauthenticated ? 'Unauthenticated' : 'Forbidden'), 'Unexpected alias denial error');
  assert(envelope.code === (unauthenticated ? 'AUTH_REQUIRED' : 'FORBIDDEN'), 'Unexpected alias denial code');
  assert(envelope.category === (unauthenticated ? 'authentication' : 'authorization'), 'Unexpected alias denial category');
  assert(envelope.severity === 'medium' && envelope.retryable === false, 'Unexpected alias denial classification');
  assert(typeof envelope.correlationId === 'string' && /^err_(?:[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}|\d{13}_[a-z0-9]{1,8})$/.test(envelope.correlationId), 'Unsafe alias correlation identifier');
  return { contract: 'canonical-auth-denial', status, code: envelope.code, safeBody: true };
}

module.exports = { PROBE_HEADER, PROBE_VALUE, VALIDATED_HEADER, VALIDATED_VALUE, MAX_DENIAL_BYTES, SYNTHETIC_ALIAS_SOURCE, SYNTHETIC_ALIAS_URL,
  aliasVariants, buildPrivateAliasProbePlan, matchPrivateAliasProbe, assertAliasResponseHeaders, assertAliasDenial };
