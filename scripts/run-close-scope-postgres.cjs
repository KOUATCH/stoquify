// Creates a NEW local target, deploys migrations there, then runs synthetic fixtures.
// Never resets an existing database, reads app data, loads a seed or drops a target.
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const { closeScopeTestTarget } = require('./close-scope-postgres-target.cjs')
const { createNewDatabase } = require('./prisma-local-fresh-bootstrap.js')
const { Client } = require('pg')
const sanitize = value => String(value || '').replace(/postgres(?:ql)?:\/\/[^\s"']+/g, '[redacted database URL]')

async function main() {
  const { url, name } = closeScopeTestTarget()
  for (const key of ['DATABASE_URL', 'DIRECT_URL']) {
    if (process.env[key] && new URL(process.env[key]).pathname === url.pathname) throw new Error('Test target must differ from the configured application database')
  }
  await createNewDatabase(url, name)
  console.log(`Created isolated close test database: ${name}`)
  const env = { ...process.env, NODE_ENV: 'test', DATABASE_URL: url.toString(), DIRECT_URL: url.toString(), SHADOW_DATABASE_URL: url.toString() }
  const migrate = spawnSync(process.execPath, [path.join('node_modules', 'prisma', 'build', 'index.js'), 'migrate', 'deploy'], { env, encoding: 'utf8', timeout: 300000 })
  if (migrate.status !== 0) { console.error(sanitize(migrate.stdout), sanitize(migrate.stderr)); throw new Error('Isolated migration failed; retained target was not reset') }
  const observer = new Client({ connectionString: url.toString(), connectionTimeoutMillis: 5000 })
  try {
    await observer.connect()
    const result = await observer.query('SELECT current_database() AS name')
    if (result.rows[0].name !== name) throw new Error('Database identity mismatch')
  } finally { await observer.end() }
  console.log(`Migrations applied; verified isolated identity: ${name}`)
  // The growing phase regression suite includes real lock-wait tests. Bound the
  // whole process separately from each test and application transaction limit.
  // Phase 7 adds another real-database suite. Cold local imports exceeded the
  // former five-minute process bound; individual test/transaction limits stay.
  const result = spawnSync(process.execPath, [path.join('node_modules', 'jest', 'bin', 'jest.js'), '--config', 'jest.close-scope-postgres.config.cjs', '--runInBand', '--noStackTrace'], { env, encoding: 'utf8', timeout: 900000 })
  console.log(sanitize(result.stdout)); console.error(sanitize(result.stderr))
  if (result.error) console.error(sanitize(result.error.message))
  process.exitCode = result.status === 0 ? 0 : 1
}
main().catch(error => {
  console.error(sanitize(error.message || error.code || error.name || 'Isolated database setup failed'))
  if (Array.isArray(error.errors)) console.error(JSON.stringify(error.errors.map(item => ({ code: item.code, address: item.address, port: item.port }))))
  process.exitCode = 1
})
