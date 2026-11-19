// Fresh synthetic target only. No environment-file loading, reset or application seed.
const fs = require('node:fs'), path = require('node:path'), { spawnSync } = require('node:child_process'), { Client } = require('pg')
const c = require('./af16-verification-context.cjs')
async function main() {
  const dir = path.join(c.root, '.codex-tmp/af16-prisma'); fs.mkdirSync(dir, { recursive: true }); fs.mkdirSync(c.output, { recursive: true })
  const schema = fs.readFileSync(path.join(c.root, 'prisma/schema.prisma'), 'utf8').replace(/generator client \{([\s\S]*?)\n\}/,
    (_, body) => `generator client {${body.replace(/\s*output\s*=\s*[^\n]+/g, '')}\n  output = ${JSON.stringify(path.join(dir, 'client').replaceAll('\\', '/'))}\n}`)
  fs.writeFileSync(path.join(dir, 'schema.prisma'), schema)
  fs.writeFileSync(path.join(dir, 'prisma.config.ts'), 'import { defineConfig } from "prisma/config"; export default defineConfig(' + JSON.stringify({ schema: path.join(dir, 'schema.prisma'), migrations: { path: path.join(c.root, 'prisma/migrations') } }) + ')')
  const run = (args, label) => {
    const result = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', ...args, '--config', '.codex-tmp/af16-prisma/prisma.config.ts'], {
      cwd: c.root, env: { ...process.env, DATABASE_URL: c.url('template'), DIRECT_URL: c.url('template'), SHADOW_DATABASE_URL: c.url('template') }, windowsHide: true, encoding: 'utf8', timeout: 300000,
    })
    fs.writeFileSync(path.join(c.output, label + '.log'), (result.stdout || '') + (result.stderr || ''))
    if (result.status !== 0) throw Error(label + ' failed')
  }
  run(['validate'], 'schema-validation'); run(['generate'], 'client-generation')
  const admin = new Client({ connectionString: 'postgresql://af16@127.0.0.1:55451/postgres', connectionTimeoutMillis: 5000 }); await admin.connect()
  try { await c.guard(admin); if ((await admin.query('SELECT 1 FROM pg_database WHERE datname=$1', [c.database('template')])).rowCount) throw Error('Refusing existing database')
    await admin.query(`CREATE DATABASE "${c.database('template')}"`)
  } finally { await admin.end() }
  run(['migrate', 'deploy'], 'clean-migration'); run(['migrate', 'deploy'], 'clean-replay')
  console.log('AF16 current schema/client, clean migration and replay prepared.')
}
main().catch(error => { console.error(error.stack); process.exitCode = 1 })
