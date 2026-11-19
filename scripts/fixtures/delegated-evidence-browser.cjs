// Creates only a fresh synthetic AF06 database on the verified task-owned cluster.
const fs = require('node:fs'), path = require('node:path'), { spawnSync } = require('node:child_process')
const { randomBytes } = require('node:crypto'), { Client } = require('pg'), { PrismaClient } = require('@prisma/client')
const argon2 = require('argon2')
const base = 'C:/Users/J COMPUTER/.codex/visualizations/2026/10/19/01a1542f-53bc-7513-b68f-4bce330ca993'
const cluster = path.join(base, 'af01-host/af01-postgres')
const name = 'stoquify_local_af06_browser_20261020_r1'
const url = `postgresql://af01@127.0.0.1:55441/${name}?schema=public&connection_limit=5`
const output = path.resolve('docs/accounting-firms/roadmap-2026-10-19/execution/AF06/2026-10-20-run-01')
async function main() {
  if (process.env.NODE_ENV === 'production') throw Error('Production forbidden')
  const admin = new Client({ connectionString: 'postgresql://af01@127.0.0.1:55441/postgres', connectionTimeoutMillis: 5000 })
  await admin.connect()
  try {
    const actual = (await admin.query('SHOW data_directory')).rows[0].data_directory
    if (fs.realpathSync(actual).toLowerCase() !== fs.realpathSync(cluster).toLowerCase()) throw Error('Wrong cluster')
    if ((await admin.query('SELECT 1 FROM pg_database WHERE datname=$1', [name])).rowCount) throw Error('Refusing existing database')
    await admin.query(`CREATE DATABASE "${name}"`)
  } finally { await admin.end() }
  // Explicit URL overrides; migrate deploy has no reset/seed hook.
  const result = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], {
    env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url, SHADOW_DATABASE_URL: url },
    windowsHide: true, encoding: 'utf8', timeout: 240000,
  })
  fs.writeFileSync(path.join(output, 'migrate.log'), (result.stdout + result.stderr).replace(/postgres(?:ql)?:\/\/[^\s"']+/g,'[SYNTHETIC_DATABASE]'))
  if (result.status !== 0) throw Error('Migration failed')
  const db = new PrismaClient({ datasources: { db: { url } } }), password = randomBytes(24).toString('base64url')
  try {
    await db.organization.createMany({ data: ['firm','client','foreign'].map(n => ({
      id: 'af06-'+n, name: 'Synthetic '+n, slug: 'af06-'+n, requestedModules: ['accounting','close_assurance'], currency: 'XAF', countryCode: 'CM',
    })) })
    const permissions = ['accounting.audit.read','accounting.close.read','accounting.close.accountant.invite','accounting.close.accountant.review','accounting.close.evidence.request','accounting.close.finding.comment','accounting.close.finding.assign']
    for (const role of ['manager','preparer','reviewer','owner','recipient','outsider']) {
      const organizationId = ['owner','recipient'].includes(role) ? 'af06-client' : role === 'outsider' ? 'af06-foreign' : 'af06-firm'
      const id = 'af06-'+role, hash = await argon2.hash(password)
      await db.role.create({ data: { id:id+'-role', organizationId, code:id, nameEn:role, permissions: ['manager','preparer','reviewer','owner','recipient'].includes(role) ? permissions : ['accounting.audit.read','accounting.close.read','accounting.close.accountant.review'] } })
      await db.user.create({ data: { id, name:role, firstName:role, lastName:'Synthetic', email:id+'@example.invalid', organizationId,
        password:hash, emailVerified:true, roles:{connect:{id:id+'-role'}} } })
      await db.account.create({ data:{ id:id+'-credential', accountId:id, userId:id, providerId:'credential', password:hash } })
    }
    // Manager's pre-existing mandate permits setup. SQL verification enrolls the staff mandates before browser verification.
    await db.accountantAccessGrant.create({ data: { id:'af06-manager-grant', organizationId:'af06-client',
      accountantUserId:'af06-manager', accountantFirmName:'Synthetic firm', role:'REVIEWER', activeScopeKey:'af06-client:af06-manager',
      consentGrantedById:'af06-owner', consentEvidenceHash:'sha256:'+'a'.repeat(64), effectiveFrom:new Date('2020-01-01'), expiresAt:new Date('2099-01-01') } })
    fs.writeFileSync(path.join(base,'af06-browser-private.json'),JSON.stringify({url,password,name,base:'http://127.0.0.1:3046'}))
    fs.writeFileSync(path.join(output,'fixture.json'),JSON.stringify({database:name,host:'127.0.0.1',port:55441,synthetic:true,accounts:['manager','preparer','reviewer','owner','recipient','outsider'],applicationDatabaseChanged:false},null,2))
    console.log('Created synthetic AF06 database and six actors.')
  } finally { await db.$disconnect() }
}
main().catch(e=>{console.error(e.message);process.exitCode=1})

