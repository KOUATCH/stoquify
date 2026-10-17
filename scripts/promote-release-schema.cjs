// Deliberately separate from build. No deployment/provider API is called.
const { Client } = require('pg');
const { verify, runScript } = require('./release-artifact.cjs');
const { buildDeploymentDecision, resolveEnvironment } = require('./prisma-production-migration-gate.js');
const { buildReleaseSecretPreflight } = require('./release-secret-preflight.js');
async function withMigrationLock(client, operation) {
  const controller = new AbortController();
  const lost = () => controller.abort();
  client.on?.('error', lost);
  let locked = false;
  try {
    await client.connect();
    // Database-wide key, independent of release id. Never cancel the active owner.
    const acquired = await client.query("SELECT pg_try_advisory_lock(hashtext(current_database()), hashtext('stoquify-schema-promotion-v1')) AS locked");
    locked = acquired.rows[0].locked === true;
    if (!locked) throw new Error('Schema promotion already running; retry after it finishes');
    const result = await operation(controller.signal);
    if (controller.signal.aborted) throw new Error('Schema promotion lock connection lost');
    return result;
  } finally {
    try {
      if (locked) await client.query("SELECT pg_advisory_unlock(hashtext(current_database()), hashtext('stoquify-schema-promotion-v1'))");
    } finally { client.removeListener?.('error', lost); await client.end(); }
  }
}
async function promote(root, directory, digest, options = {}) {
  const env = options.env || process.env;
  const check = options.verify || verify;
  check(root, directory, digest);
  const decision = buildDeploymentDecision(resolveEnvironment('auto', env), env);
  if (!decision.shouldDeploy || decision.blockers.length) throw new Error('Explicit safe migration target required: ' + decision.blockers.join(', '));
  const secrets = buildReleaseSecretPreflight({ release: 'on', environment: env });
  if (secrets.blockers.length) throw new Error('Release secret preflight blocked');
  // Match the migration engine connection exactly; reject implicit alternate targets.
  if (env.DIRECT_URL && env.DIRECT_URL !== env.DATABASE_URL) throw new Error('Separate DIRECT_URL must be reconciled before promotion');
  const url = new URL(env.DATABASE_URL);
  if ([...url.searchParams.keys()].some(key => !['schema', 'connection_limit', 'connect_timeout', 'pool_timeout', 'sslmode'].includes(key)) || (url.searchParams.get('schema') || 'public') !== 'public') throw new Error('Promotion requires a direct public-schema connection without overrides');
  const client = options.client || new Client({ connectionString: env.DATABASE_URL, connectionTimeoutMillis: 10000 });
  return withMigrationLock(client, async signal => {
    check(root, directory, digest);
    // Existing gate retains exact destructive approvals, target history, baseline bridge and post-deploy health checks.
    await (options.runScript || runScript)('prisma:migrate:deploy:safe', { root, env, signal });
    check(root, directory, digest);
    return { schemaPromoted: true, artifactSha256: digest, applicationDeployed: false };
  });
}
if (require.main === module) {
  const [directory, digest, ...extra] = process.argv.slice(2);
  Promise.resolve().then(() => { if (!directory || !digest || extra.length) throw new Error('Usage: <artifact-directory> <trusted-sha256>'); return promote(process.cwd(), directory, digest); })
    .then(result => console.log(JSON.stringify(result))).catch(error => { console.error(error.message.replace(/postgres(?:ql)?:\/\/[^\s"']+/g, '[REDACTED_DATABASE_URL]')); process.exitCode = 1; });
}
module.exports = { promote, withMigrationLock };
