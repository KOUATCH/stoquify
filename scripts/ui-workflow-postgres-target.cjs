const { loadDatabaseUrl } = require('./prisma-local-fresh-bootstrap');
const LOCAL = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);
const NAME = /^stoquify_local_ui_workflow_[a-z0-9_]{1,35}$/;

function resolveWorkflowTestTarget(databaseName, env = process.env) {
  if (env.NODE_ENV === 'production' || !NAME.test(databaseName || '')) throw new Error('A named local UI workflow test database is required');
  const source = new URL(loadDatabaseUrl(env));
  if (!['postgres:', 'postgresql:'].includes(source.protocol) || !LOCAL.has(source.hostname.toLowerCase())) throw new Error('UI workflow tests require a local PostgreSQL server');
  if (decodeURIComponent(source.pathname.slice(1)) === databaseName) throw new Error('The application database cannot be the UI workflow test target');
  const target = new URL(source);
  target.pathname = '/' + databaseName;
  target.searchParams.set('schema', 'public');
  target.searchParams.set('connection_limit', '5');
  target.searchParams.set('connect_timeout', '5');
  return target;
}
module.exports = { resolveWorkflowTestTarget };
