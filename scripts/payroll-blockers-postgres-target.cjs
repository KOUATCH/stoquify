const { loadDatabaseUrl, resolveTarget } = require('./prisma-local-fresh-bootstrap');
const NAME = /^stoquify_local_payroll_blockers_\d{8}_[a-f0-9]{8}$/;

function resolvePayrollBlockersTarget(databaseName, sourceUrl, nodeEnv = process.env.NODE_ENV) {
  if (!NAME.test(databaseName || '')) throw new Error('A unique payroll blockers disposable database name is required');
  const source = new URL(sourceUrl);
  if (decodeURIComponent(source.pathname.slice(1)) === databaseName) throw new Error('Application database cannot be the test target');
  const target = resolveTarget({ databaseName, sourceUrl, nodeEnv });
  target.search = '';
  target.searchParams.set('schema', 'public');
  target.searchParams.set('connection_limit', '8');
  target.searchParams.set('connect_timeout', '5');
  return target;
}

function assertPayrollBlockersTestUrl(raw, databaseName) {
  if (!raw || !NAME.test(databaseName || '')) throw new Error('Explicit disposable payroll test target required');
  const url = new URL(raw);
  resolveTarget({ databaseName, sourceUrl: raw });
  if (decodeURIComponent(url.pathname.slice(1)) !== databaseName || url.searchParams.get('schema') !== 'public') {
    throw new Error('Disposable database identity/schema mismatch');
  }
  return url;
}
module.exports = { resolvePayrollBlockersTarget, assertPayrollBlockersTestUrl, loadDatabaseUrl };
