const { test } = require('node:test');
const assert = require('node:assert/strict');
const { resolveTarget, assertTestEnvironment } = require('../s04-s05-target.cjs');
const name = 'stoquify_pos_audit_20261015_a4b5c6d7';
const source = 'postgresql://fixture:fixture@localhost:5432/application';
test('derives only an explicit loopback target and strips connection overrides', () => {
  const target = resolveTarget(name, source + '?host=remote.invalid&schema=app', 'test');
  assert.equal(target.hostname, 'localhost');
  assert.equal(target.pathname, '/' + name);
  assert.equal(target.searchParams.get('host'), null);
  assert.equal(target.searchParams.get('schema'), 'public');
});
for (const [label, database, url, mode] of [
  ['production', name, source, 'production'], ['remote', name, source.replace('localhost', 'db.invalid'), 'test'],
  ['wrong name', 'application', source, 'test'], ['injection name', name + '"', source, 'test'],
  ['same as application', name, source.replace('application', name), 'test'], ['non-postgres', name, source.replace('postgresql:', 'https:'), 'test'],
]) test(`refuses ${label}`, () => assert.throws(() => resolveTarget(database, url, mode)));
test('guard rejects imports without explicit test admission or with a foreign target', () => {
  const env = { NODE_ENV: 'test', RUN_S04_S05_POSTGRES: '1', POS_DISPOSABLE_DATABASE_NAME: name, DATABASE_URL: resolveTarget(name, source, 'test').toString() };
  assert.equal(assertTestEnvironment(env), name);
  for (const change of [{ NODE_ENV: 'production' }, { RUN_S04_S05_POSTGRES: undefined }, { DATABASE_URL: source }, { DATABASE_URL: env.DATABASE_URL.replace('localhost', 'remote.invalid') }, { DATABASE_URL: env.DATABASE_URL + '&host=remote.invalid' }]) assert.throws(() => assertTestEnvironment({ ...env, ...change }));
});
