'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { profileReadEvidence, actionBinding } = require('./flight-profile-evidence.cjs');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const fields = { firstName: 'Fixture', lastName: 'Browser', jobTitle: '' };
const data = { actorId: 'fixture-actor', organizationId: 'fixture-organization', email: 'fixture@example.invalid', fields, checkedAt: '2026-11-10T12:00:00.123Z', snapshotHash: 'a'.repeat(64), canUpdate: true, emailVerified: true, history: [] };
const model = { success: true, data };
const frame = (id, value) => id + ':' + JSON.stringify(value) + '\n';
const payload = value => Buffer.from(frame('0', { a: '$@1', f: [] }) + frame('1', value));

test('binds only the root action result and emits hashes, not private field values', () => {
  const result = profileReadEvidence(payload(model));
  assert.equal(result.actorIdSha256, hash(data.actorId));
  assert.equal(result.organizationIdSha256, hash(data.organizationId));
  assert.equal(result.fieldsSha256, hash(JSON.stringify(fields)));
  assert.equal(result.emailSha256, hash(data.email));
  assert.equal(result.checkedAt, data.checkedAt);
  assert(!JSON.stringify(result).includes(data.email));
});
test('accepts inline action result and escaped literal dollar string', () => {
  const value = { ...model, data: { ...data, fields: { ...fields, firstName: '$$Literal' } } };
  assert.equal(profileReadEvidence(Buffer.from(frame('0', { a: value }))).fieldSha256.firstName, hash('$Literal'));
});
test('resolves bounded action references with normalized hexadecimal ids', () => {
  const bytes = Buffer.from(frame('0', { a: '$@01' }) + frame('1', '$2') + frame('2', model));
  assert.equal(profileReadEvidence(bytes).resultRowId, '2');
});
test('does not treat embedded model-looking text as a Flight model', () => {
  const fake = Buffer.from(frame('1', model));
  const bytes = Buffer.concat([Buffer.from(frame('0', { a: '$@1' }) + 'a:T' + fake.length.toString(16) + ','), fake]);
  assert.throws(() => profileReadEvidence(bytes), /Unresolved/);
});
test('skips length-prefixed text and module hints before real action result', () => {
  const text = Buffer.from('private\nnot:a:model\n');
  const bytes = Buffer.concat([Buffer.from('a:T' + text.length.toString(16) + ','), text, Buffer.from(':HL["/x.css","style"]\n2:I[3,[],"x"]\n'), payload(model)]);
  assert.equal(profileReadEvidence(bytes).checkedAt, data.checkedAt);
});

const invalid = [
  ['missing root action', Buffer.from(frame('0', { unrelated: model }))],
  ['unrelated successful model', Buffer.from(frame('0', { a: '$@1' }) + frame('2', model))],
  ['cyclic action', Buffer.from(frame('0', { a: '$@1' }) + frame('1', '$@1'))],
  ['duplicate model id', Buffer.from(frame('0', { a: '$@1' }) + frame('1', model) + frame('01', model))],
  ['truncated frame', payload(model).subarray(0, -1)],
  ['truncated binary frame', Buffer.from('0:Tff,x')],
  ['failed action result', payload({ success: false, code: 'AUTH_REQUIRED' })],
  ['missing actor', payload({ ...model, data: { ...data, actorId: '' } })],
  ['unresolved actor', payload({ ...model, data: { ...data, actorId: '$3' } })],
  ['invalid snapshot', payload({ ...model, data: { ...data, snapshotHash: 'wrong' } })],
  ['invalid checked time', payload({ ...model, data: { ...data, checkedAt: 'yesterday' } })],
  ['unexpected field', payload({ ...model, data: { ...data, fields: { ...fields, token: 'unexpected' } } })],
  ['unresolved field', payload({ ...model, data: { ...data, fields: { ...fields, firstName: '$3' } } })],
  ['missing update authority', payload({ ...model, data: { ...data, canUpdate: undefined } })],
];
for (const [name, value] of invalid) test('rejects ' + name, () => assert.throws(() => profileReadEvidence(value)));

const worker = 'app/[locale]/(dashboard)/dashboard/profile/page';
const entry = { exportedName: 'getSelfProfileAction', filename: '../D:\\isolated\\source\\actions\\users\\self-profile.actions.ts', workers: { [worker]: { moduleId: '123' } } };
test('extracts exact compiled export binding without exposing manifest encryption key', () => {
  const result = actionBinding(Buffer.from(JSON.stringify({ encryptionKey: 'DO_NOT_EXPOSE', node: { ['a'.repeat(40)]: entry } })));
  assert.equal(result.actionId, 'a'.repeat(40));
  assert.equal(result.workerModuleId, '123');
  assert(!JSON.stringify(result).includes('DO_NOT_EXPOSE'));
});
test('rejects absent, ambiguous and wrong-worker compiled action bindings', () => {
  for (const node of [{}, { ['a'.repeat(40)]: entry, ['b'.repeat(40)]: entry }, { ['a'.repeat(40)]: { ...entry, workers: {} } }]) assert.throws(() => actionBinding(Buffer.from(JSON.stringify({ node }))));
});
