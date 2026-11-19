const { test } = require('node:test');
const assert = require('node:assert/strict');
const { resolvePayrollBlockersTarget, assertPayrollBlockersTestUrl } = require('../payroll-blockers-postgres-target.cjs');
const name = 'stoquify_local_payroll_blockers_20261102_0123abcd';
const source = 'postgresql://synthetic:synthetic@localhost:5432/application?schema=private';
test('derives only a fresh-named local public target', () => {
  const target = resolvePayrollBlockersTarget(name, source, 'test');
  assert.equal(target.pathname, '/' + name);
  assert.equal(target.searchParams.get('schema'), 'public');
  assert.equal(target.searchParams.get('connect_timeout'), '5');
});
test('refuses production mode', () => assert.throws(() => resolvePayrollBlockersTarget(name, source, 'production')));
test('refuses remote host', () => assert.throws(() => resolvePayrollBlockersTarget(name, source.replace('localhost', 'db.example.com'), 'test')));
test('refuses arbitrary or SQL-bearing names', () => {
  for (const bad of ['postgres', 'application', 'stoquify_local_test', name + '";DROP DATABASE postgres;--']) {
    assert.throws(() => resolvePayrollBlockersTarget(bad, source, 'test'));
  }
});
test('refuses reuse of the configured application database', () => assert.throws(() => resolvePayrollBlockersTarget(name, source.replace('/application?', '/' + name + '?'), 'test')));
test('refuses non-PostgreSQL protocols', () => assert.throws(() => resolvePayrollBlockersTarget(name, source.replace('postgresql:', 'https:'), 'test')));
test('requires explicit matching runtime identity and schema', () => {
  assert.throws(() => assertPayrollBlockersTestUrl(undefined, name));
  assert.throws(() => assertPayrollBlockersTestUrl(source, name));
  const target = resolvePayrollBlockersTarget(name, source, 'test');
  assert.doesNotThrow(() => assertPayrollBlockersTestUrl(target.toString(), name));
  target.searchParams.set('schema', 'another');
  assert.throws(() => assertPayrollBlockersTestUrl(target.toString(), name));
});
