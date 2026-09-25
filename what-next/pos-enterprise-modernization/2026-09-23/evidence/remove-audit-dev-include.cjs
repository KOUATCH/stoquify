// Remove only the temporary include introduced by this run's dev server.
// Preserve all other user and build-owner edits, including file formatting.
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const root = path.resolve(__dirname, '../../../..')
const target = path.join(root, 'tsconfig.json')
const before = fs.readFileSync(target, 'utf8')
const value = '.next-pos-audit-dev/types/**/*.ts'
const parsed = JSON.parse(before)
const occurrences = (parsed.include || []).filter(item => item === value).length
if (occurrences > 1) throw new Error('Unexpected duplicate audit include; inspect instead of rewriting')
let after = before
if (occurrences === 1) {
  const pattern = /,\r?\n[ \t]*"\.next-pos-audit-dev\/types\/\*\*\/\*\.ts"/g
  if ([...before.matchAll(pattern)].length !== 1) throw new Error('Unexpected include formatting; no write performed')
  after = before.replace(pattern, '')
  const expected = { ...parsed, include: parsed.include.filter(item => item !== value) }
  if (JSON.stringify(JSON.parse(after)) !== JSON.stringify(expected)) throw new Error('Unexpected semantic config change')
  fs.writeFileSync(path.join(__dirname, 'tsconfig.before-dev-include-removal.json'), before)
  if (fs.readFileSync(target, 'utf8') !== before) throw new Error('Configuration changed concurrently')
  const temporary = target + '.pos-audit-' + crypto.randomUUID() + '.tmp'
  fs.writeFileSync(temporary, after, {flag:'wx'})
  fs.renameSync(temporary, target)
}
const hash = text => crypto.createHash('sha256').update(text).digest('hex')
const result = { checkedAt: new Date().toISOString(), removed: occurrences === 1, beforeSha256: hash(before), afterSha256: hash(after), remainingAuditInclude: JSON.parse(fs.readFileSync(target, 'utf8')).include.includes(value), note: 'No other configuration field or directory was changed.' }
fs.writeFileSync(path.join(__dirname, 'dev-config-cleanup.json'), JSON.stringify(result, null, 2) + '\n')
console.log(JSON.stringify(result))
