// Starts the actual Next application only against the recorded synthetic DB.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto')
const root = path.resolve(__dirname, '../../../../..')
const target = JSON.parse(fs.readFileSync(path.join(__dirname, 'DATABASE_TARGET.json'), 'utf8'))
if (target.host !== 'localhost' || !/^stoquify_retention_p07_20261017_[a-f0-9]+$/.test(target.database) || target.user !== 'retention_fixture') throw new Error('Invalid disposable target')
const keep = /^(PATH|SYSTEMROOT|WINDIR|TEMP|TMP|COMSPEC|PATHEXT|USERPROFILE|LOCALAPPDATA|APPDATA|PROGRAMFILES|PROGRAMFILES\(X86\)|SYSTEMDRIVE|NUMBER_OF_PROCESSORS)$/i
for (const key of Object.keys(process.env)) if (!keep.test(key)) delete process.env[key]
// Next automatically reads .env files. Predefine only their key names with empty
// values so no ambient credentials/providers/targets can be imported.
for (const name of ['.env', '.env.local', '.env.development', '.env.development.local']) {
  const file = path.join(root, name)
  if (!fs.existsSync(file)) continue
  for (const match of fs.readFileSync(file, 'utf8').matchAll(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/gm)) if (!(match[1] in process.env)) process.env[match[1]] = ''
}
Object.assign(process.env, {
  DATABASE_URL: `postgresql://${target.user}@localhost:${target.port}/${target.database}?schema=public`,
  DIRECT_URL: `postgresql://${target.user}@localhost:${target.port}/${target.database}?schema=public`,
  NEXTAUTH_URL: 'http://127.0.0.1:3188', NEXT_PUBLIC_BASE_URL: 'http://127.0.0.1:3188', NEXT_PUBLIC_APP_URL: 'http://127.0.0.1:3188',
  BETTER_AUTH_SECRET: crypto.randomBytes(32).toString('hex'), NEXT_TELEMETRY_DISABLED: '1', PORT: '3188', NEXT_DIST_DIR: '.next-retention-p07-setup',
})
const session = require(path.join(root, 'scripts/dev-app-safe.js')).prepareDevelopmentSession({ root, env: process.env, argv: ['--hostname', '127.0.0.1'] })
Object.assign(process.env, session.env)
fs.writeFileSync(path.join(__dirname, 'APPLICATION_TARGET.json'), JSON.stringify({ pid: process.pid, origin: 'http://127.0.0.1:3188', database: target.database, distDir: session.distDir, tsconfig: session.env.STOQUIFY_DEV_TSCONFIG, utc: new Date().toISOString(), ambientEnvValuesBlocked: true }, null, 2))
process.chdir(root)
const nextCli = require.resolve('next/dist/bin/next')
process.argv = [process.execPath, nextCli, ...session.args]
require(nextCli)
