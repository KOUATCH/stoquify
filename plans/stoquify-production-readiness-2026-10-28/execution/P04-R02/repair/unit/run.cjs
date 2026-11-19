const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const { spawnSync } = require('node:child_process')
const root = path.resolve(__dirname, '../../../../../..')
const files = [
  'lib/media/legacy-upload-storage.ts', 'lib/media/legacy-upload-routing.ts',
  'lib/media/__tests__/legacy-upload-storage.test.ts', 'lib/media/__tests__/legacy-upload-routing.test.ts',
  'app/api/uploads/[...path]/route.ts', 'app/api/uploads/[...path]/__tests__/route.test.ts',
]
const capture = () => files.map(file => ({ path: file, sha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex') }))
const before = capture()
const env = {}
for (const key of ['SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'PATH', 'COMSPEC', 'USERPROFILE', 'HOMEDRIVE', 'HOMEPATH']) if (process.env[key]) env[key] = process.env[key]
env.NODE_ENV = 'test'
env.NEXT_TELEMETRY_DISABLED = '1'
const args = [path.join(root, 'node_modules/jest/bin/jest.js'), '--config', path.join(__dirname, 'jest.config.cjs'), '--runInBand', '--no-cache', '--json', '--outputFile', path.join(__dirname, 'jest-result.json')]
const result = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', windowsHide: true, maxBuffer: 16 * 1024 * 1024, timeout: 180000 })
fs.writeFileSync(path.join(__dirname, 'run.log'), result.stdout + result.stderr)
const after = capture()
const report = { at: new Date().toISOString(), command: [process.execPath, ...args], exitCode: result.status, signal: result.signal, launchError: result.error?.message || null, sourceBefore: before, sourceAfter: after, sourceStable: JSON.stringify(before) === JSON.stringify(after), evidenceClass: 'mocked_route_and_pure_routing_with_real_disposable_filesystem_tests', rootSetupLoaded: false, applicationEnvironmentLoaded: false, databaseAccess: false, externalNetwork: false, fixtureScope: '.codex-tmp/p04-r02-unit-*', limitations: ['Server auth and canonical error adapter are mocked', 'Known file symlink uses lstat adapter fixture; directory junction tests use real filesystem links', 'Not full application, browser, persisted session or production deployment qualification'] }
fs.writeFileSync(path.join(__dirname, 'run.json'), JSON.stringify(report, null, 2) + '\n')
console.log(result.stdout + result.stderr)
console.log(JSON.stringify({ exitCode: result.status, sourceStable: report.sourceStable }))
process.exitCode = result.status === 0 && report.sourceStable ? 0 : 1
