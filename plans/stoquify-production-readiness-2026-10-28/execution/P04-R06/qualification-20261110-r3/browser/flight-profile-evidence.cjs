'use strict';
// Pure, bounded parsing of the original Flight action-result model. No application imports.
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const lengthTags = new Set('TAOoUSsLlGgMmV');

function flightModels(bytes) {
  assert(Buffer.isBuffer(bytes) && bytes.length > 0 && bytes.length <= 32 * 1024 * 1024, 'Flight byte bound');
  const models = new Map();
  let position = 0, frames = 0;
  while (position < bytes.length) {
    assert(++frames <= 20000, 'Flight frame bound');
    const colon = bytes.indexOf(58, position);
    assert(colon >= position && colon - position <= 16, 'Invalid Flight frame identity');
    const rawId = bytes.subarray(position, colon).toString('ascii');
    assert(/^[a-f0-9]*$/.test(rawId), 'Invalid Flight hexadecimal identity');
    const id = rawId ? BigInt('0x' + rawId).toString(16) : '';
    position = colon + 1;
    const first = String.fromCharCode(bytes[position]);
    if (lengthTags.has(first)) {
      position += 1;
      const comma = bytes.indexOf(44, position);
      assert(comma >= position && comma - position <= 8, 'Invalid Flight length');
      const length = bytes.subarray(position, comma).toString('ascii');
      assert(/^[a-f0-9]+$/.test(length), 'Invalid Flight binary length');
      const end = comma + 1 + parseInt(length, 16);
      assert(end <= bytes.length, 'Truncated Flight length frame');
      position = end;
      continue;
    }
    const end = bytes.indexOf(10, position);
    assert(end >= position, 'Truncated Flight newline frame');
    if (!/^[A-Z#rx]$/.test(first)) {
      assert(id && !models.has(id), 'Missing or duplicate Flight model identity');
      const modelBytes = bytes.subarray(position, end);
      models.set(id, { value: JSON.parse(modelBytes.toString('utf8')), sha256: sha256(modelBytes) });
    }
    position = end + 1;
  }
  return { models, frames };
}

function literal(value) {
  assert.equal(typeof value, 'string', 'Expected a literal Flight string');
  if (value.startsWith('$$')) return value.slice(1);
  assert(!value.startsWith('$'), 'Unresolved Flight string reference');
  return value;
}

function profileReadEvidence(bytes) {
  const { models, frames } = flightModels(bytes);
  const root = models.get('0');
  assert(root && root.value && typeof root.value === 'object' && !Array.isArray(root.value), 'Missing Flight root object');
  assert(Object.hasOwn(root.value, 'a'), 'Missing action result in Flight root');
  let value = root.value.a, resultRowId = '0:inline-action', resultRowSha256 = root.sha256;
  const visited = new Set();
  for (let n = 0; typeof value === 'string'; n += 1) {
    assert(n < 16 && /^\$(?:@)?[a-f0-9]+$/.test(value), 'Unsupported Flight action reference');
    const id = BigInt('0x' + value.replace(/^\$@?/, '')).toString(16);
    assert(!visited.has(id), 'Cyclic Flight action result');
    visited.add(id);
    const model = models.get(id);
    assert(model, 'Unresolved Flight action result');
    value = model.value; resultRowId = id; resultRowSha256 = model.sha256;
  }
  assert(value && typeof value === 'object' && !Array.isArray(value) && value.success === true, 'Action result is not a successful profile read');
  const data = value.data;
  assert(data && typeof data === 'object' && !Array.isArray(data), 'Missing profile read data');
  const actorId = literal(data.actorId), organizationId = literal(data.organizationId);
  const email = literal(data.email), checkedAt = literal(data.checkedAt), snapshotHash = literal(data.snapshotHash);
  assert(actorId && organizationId && email, 'Incomplete profile identity');
  assert(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(checkedAt) && Number.isFinite(Date.parse(checkedAt)), 'Invalid profile checkedAt');
  assert(/^[a-f0-9]{64}$/.test(snapshotHash), 'Invalid profile snapshot identity');
  assert(data.fields && Object.keys(data.fields).sort().join(',') === 'firstName,jobTitle,lastName', 'Unexpected profile field shape');
  const fields = Object.fromEntries(['firstName', 'lastName', 'jobTitle'].map(key => [key, literal(data.fields[key])]));
  assert.equal(typeof data.canUpdate, 'boolean');
  assert.equal(typeof data.emailVerified, 'boolean');
  assert(Array.isArray(data.history), 'Missing profile history');
  return {
    schemaVersion: 1, rootRowSha256: root.sha256, resultRowId, resultRowSha256, frames,
    actorIdSha256: sha256(actorId), organizationIdSha256: sha256(organizationId),
    emailSha256: sha256(email), fieldsSha256: sha256(JSON.stringify(fields)),
    fieldSha256: Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, sha256(value)])),
    checkedAt, snapshotHash, canUpdate: data.canUpdate, emailVerified: data.emailVerified,
  };
}

function actionBinding(manifestBytes) {
  const manifest = JSON.parse(manifestBytes.toString('utf8'));
  const worker = 'app/[locale]/(dashboard)/dashboard/profile/page';
  const matches = Object.entries(manifest.node || {}).filter(([, row]) => row.exportedName === 'getSelfProfileAction' && String(row.filename).replaceAll('\\', '/').endsWith('/actions/users/self-profile.actions.ts') && Object.hasOwn(row.workers || {}, worker));
  assert.equal(matches.length, 1, 'Exact compiled profile read action mapping required');
  const [actionId, row] = matches[0];
  assert(/^[a-f0-9]{40,64}$/.test(actionId), 'Invalid compiled action identity');
  return { actionId, actionIdSha256: sha256(actionId), manifestSha256: sha256(manifestBytes), exportedName: row.exportedName, sourcePath: 'actions/users/self-profile.actions.ts', worker, workerModuleId: String(row.workers[worker].moduleId) };
}

module.exports = { flightModels, profileReadEvidence, actionBinding };
