// Capture source provenance only. This script never connects to a database.
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const { execFileSync } = require('node:child_process')
const root = path.resolve(__dirname, '../../../..')
const normalize = value => value.replace(/\\/g, '/')
const baseline = JSON.parse(fs.readFileSync(path.join(__dirname, 'source-baseline.json'), 'utf8'))
const originals = new Map(baseline.map(row => [normalize(row.path), row.sha256.toLowerCase()]))
const scopes = ['actions/pos', 'services/pos', 'hooks/posHooks', 'components/pos', 'lib/pos', 'app/[locale]/(dashboard)/dashboard/pos', 'app/api/receipts', 'app/digital-receipt']
const files = new Set(execFileSync('rg', ['--files', ...scopes], { cwd: root, encoding: 'utf8' }).trim().split(/\r?\n/).map(normalize))
for (const file of originals.keys()) files.add(file)
for (const file of ['middleware.ts', 'lib/security/__tests__/middleware-routing.test.ts', 'scripts/payment-cash-truth-gate.js', 'scripts/__tests__/payment-cash-truth-gate.test.js', 'hooks/useCashPaymentHistoryWorkbench.ts']) files.add(file)
const rows = [...files].sort().map(file => {
  const absolute = path.resolve(root, file)
  if (!absolute.startsWith(root + path.sep)) throw new Error('Source path escaped workspace')
  const exists = fs.existsSync(absolute)
  const sha256 = exists ? crypto.createHash('sha256').update(fs.readFileSync(absolute)).digest('hex') : null
  const before = originals.get(file) || null
  return { path: file, sha256, baselineSha256: before, comparison: before ? (before === sha256 ? 'unchanged' : exists ? 'changed' : 'missing') : 'not-in-initial-manifest' }
})
const result = { capturedAt: new Date().toISOString(), revision: execFileSync('git', ['rev-parse', 'HEAD'], {cwd: root, encoding:'utf8'}).trim(), note: 'Dirty working tree. Files absent from the initial manifest require owner baseline review; they are not automatically new files.', files: rows }
fs.writeFileSync(path.join(__dirname, 'source-final.json'), JSON.stringify(result, null, 2) + '\n')
const changed = rows.filter(row => row.comparison !== 'unchanged')
fs.writeFileSync(path.join(__dirname, 'source-delta.md'), '# Source provenance\n\nSee `source-final.json` for current SHA-256s. Compare initial-manifest changes against `baseline/`, and consult the domain review for files outside that initial manifest. Do not treat the entire dirty Git diff as this run.\n\n| Path | Baseline comparison |\n| --- | --- |\n' + changed.map(row => `| \`${row.path}\` | ${row.comparison} |`).join('\n') + '\n')
console.log(JSON.stringify({ capturedFiles: rows.length, initialBaseline: originals.size, changed: rows.filter(row => row.comparison === 'changed').length, missing: rows.filter(row => row.comparison === 'missing').length, outsideInitialManifest: rows.filter(row => row.comparison === 'not-in-initial-manifest').length }))
