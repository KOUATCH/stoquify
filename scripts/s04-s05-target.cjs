const { loadDatabaseUrl } = require('./prisma-local-fresh-bootstrap.js');

function resolveTarget(name, source = loadDatabaseUrl(), nodeEnv = process.env.NODE_ENV) {
  if (nodeEnv === 'production') throw new Error('Production execution refused');
  if (!/^stoquify_pos_audit_\d{8}_[a-f0-9]{8,16}$/.test(name)) throw new Error('Explicit disposable database name required');
  const url = new URL(source);
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || url.hostname !== 'localhost') throw new Error('Loopback PostgreSQL required');
  if (decodeURIComponent(url.pathname.slice(1)) === name) throw new Error('Application database cannot be the test target');
  // Do not carry connection overrides from an application connection string.
  url.pathname = '/' + name;
  url.search = '';
  url.searchParams.set('schema', 'public');
  url.searchParams.set('connection_limit', '8');
  url.searchParams.set('connect_timeout', '5');
  return url;
}
function assertTestEnvironment(env = process.env) {
  const name = env.POS_DISPOSABLE_DATABASE_NAME;
  if (env.NODE_ENV !== 'test' || env.RUN_S04_S05_POSTGRES !== '1' || !/^stoquify_pos_audit_\d{8}_[a-f0-9]{8,16}$/.test(name || '')) throw new Error('Guarded test environment required');
  const url = new URL(env.DATABASE_URL || '');
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || url.hostname !== 'localhost' || url.pathname !== '/' + name || !['public', 'codex_pos_lifecycle_20260920'].includes(url.searchParams.get('schema'))) throw new Error('Unexpected test target');
  if ([...url.searchParams.keys()].some(key => !['schema', 'connection_limit', 'connect_timeout'].includes(key))) throw new Error('Connection overrides are not permitted');
  return name;
}
module.exports = { resolveTarget, assertTestEnvironment };
