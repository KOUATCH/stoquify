const { closeScopeTestTarget } = require('../../scripts/close-scope-postgres-target.cjs')
const url = 'postgresql://test:test@localhost:5432/stoquify_local_close_scope_20261016_a1b2c3d4?schema=public'
test('accepts only an explicitly named local target', () => {
  expect(closeScopeTestTarget({ CLOSE_TEST_DATABASE_URL: url }).name).toBe('stoquify_local_close_scope_20261016_a1b2c3d4')
})
test.each([
  {}, { DATABASE_URL: url }, { CLOSE_TEST_DATABASE_URL: url, NODE_ENV: 'production' },
  { CLOSE_TEST_DATABASE_URL: url.replace('localhost', 'remote.example') },
  { CLOSE_TEST_DATABASE_URL: url.replace('stoquify_local_close_scope_20261016_a1b2c3d4', 'stoquify') },
  { CLOSE_TEST_DATABASE_URL: url.replace('schema=public', 'schema=other') },
  { CLOSE_TEST_DATABASE_URL: url.replace('?schema=public', '') },
])('refuses unsafe or implicit connection configuration %j', env => {
  expect(() => closeScopeTestTarget(env)).toThrow()
})
