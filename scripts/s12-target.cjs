// Only new S12-owned localhost databases. Never prints connection strings.
const { resolveTarget } = require('./s04-s05-target.cjs');
function sourceTarget(name) { return resolveTarget(name); }
function assertS12Target(env = process.env) {
  if (env.NODE_ENV !== 'test' || env.RUN_S12_REHEARSAL !== '1') throw new Error('S12 test environment required');
  const name = env.S12_DATABASE_NAME;
  if (!/^(stoquify_pos_audit_\d{8}_[a-f0-9]{10}|stoquify_restore_s12_\d{8}_[a-f0-9]{10})$/.test(name || '')) throw new Error('S12-owned database required');
  const url = new URL(env.DATABASE_URL || '');
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || url.hostname !== 'localhost' || url.pathname !== '/' + name || url.searchParams.get('schema') !== 'public') throw new Error('S12 loopback target mismatch');
  if ([...url.searchParams.keys()].some(key => !['schema', 'connection_limit', 'connect_timeout'].includes(key))) throw new Error('Connection overrides refused');
  for (const key of ['DIRECT_URL', 'SHADOW_DATABASE_URL']) if (env[key] !== env.DATABASE_URL) throw new Error('Database targets must match');
  return url;
}
module.exports = { sourceTarget, assertS12Target };
