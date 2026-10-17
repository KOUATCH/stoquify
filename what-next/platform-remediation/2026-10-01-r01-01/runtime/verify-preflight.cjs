const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const { spawnSync } = require('node:child_process')
const files = ['standalone-package-preflight.cjs', 'standalone-package-preflight.test.cjs', 'verify-preflight.cjs']
const hashes = () => Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname, file))).digest('hex')]))
const report = { startedAt: new Date().toISOString(), node: process.version, platform: process.platform, scope: 'Synthetic filesystem fixtures only; no existing app package, browser, login or database used', before: hashes(), checks: [] }
const env = { ...process.env }; delete env.NODE_OPTIONS; delete env.NODE_PATH
for (const file of files.slice(0, 2)) {
  const result = spawnSync(process.execPath, ['--check', path.join(__dirname, file)], { env, encoding: 'utf8', timeout: 20000, windowsHide: true })
  report.checks.push({ command: ['node', '--check', file], exitCode: result.status, spawnErrorCode: result.error?.code || null })
}
const result = spawnSync(process.execPath, ['--test', '--test-reporter=tap', path.join(__dirname, files[1])], { env, encoding: 'utf8', timeout: 120000, windowsHide: true })
const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const logName = `fixture-tests-${stamp}.tap`
fs.writeFileSync(path.join(__dirname, logName), (result.stdout || '') + (result.stderr || ''), { flag: 'wx' })
report.checks.push({ command: ['node', '--test', '--test-reporter=tap', files[1]], exitCode: result.status, spawnErrorCode: result.error?.code || null, log: logName })
report.after = hashes()
report.helperSourcesUnchanged = JSON.stringify(report.before) === JSON.stringify(report.after)
report.ownedTemporaryDirectoriesRemaining = fs.readdirSync(__dirname).filter(name => name.startsWith('.preflight-test-')).length
report.tests = Number(result.stdout?.match(/^# tests (\d+)$/m)?.[1] || 0)
report.passed = Number(result.stdout?.match(/^# pass (\d+)$/m)?.[1] || 0)
report.failed = Number(result.stdout?.match(/^# fail (\d+)$/m)?.[1] || 0)
report.status = report.checks.every(check => check.exitCode === 0 && !check.spawnErrorCode) && report.helperSourcesUnchanged && report.tests > 0 && report.failed === 0 && report.ownedTemporaryDirectoriesRemaining === 0 ? 'FIXTURE_VERIFICATION_PASS' : 'FIXTURE_VERIFICATION_FAILED'
report.finishedAt = new Date().toISOString()
report.actualLinuxRuntimeQualification = 'NOT_RUN'
const receipt = `fixture-verification-${stamp}.json`
fs.writeFileSync(path.join(__dirname, receipt), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' })
console.log(JSON.stringify({ status: report.status, tests: report.tests, passed: report.passed, failed: report.failed, temporaryDirectoriesRemaining: report.ownedTemporaryDirectoriesRemaining, receipt, log: logName }))
if (report.status !== 'FIXTURE_VERIFICATION_PASS') process.exitCode = 1
