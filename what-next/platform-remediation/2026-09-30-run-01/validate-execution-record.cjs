const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const root = path.resolve(__dirname, '../../..')
const read = name => JSON.parse(fs.readFileSync(path.join(__dirname, name), 'utf8'))
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
const errors = []
const declared = read('declared-task-paths.json')
const delta = new Map(read('execution-delta.json').changes.map(item => [item.file, item.afterSha256]))
const changed = declared.flatMap(file => {
  const actualPath = path.join(root, file)
  const actual = fs.existsSync(actualPath) ? hash(actualPath) : null
  const expected = delta.get(file)
  return !expected || actual !== expected ? [{ file, expected: expected ?? null, actual }] : []
})
const stability = {
  checkedAt: new Date().toISOString(), checkedTaskOwnedFiles: declared.length, changed,
  comparedWith: 'execution-delta.json, first post-build snapshot',
  scope: 'Declared remediation source changes only. Concurrent unrelated changes remain outside this verification.'
}
fs.writeFileSync(path.join(__dirname, 'task-owned-source-stability-final.json'), JSON.stringify(stability, null, 2) + '\n')
if (changed.length) errors.push('Declared remediation source changed since the recorded candidate')

require('./build-execution-register.cjs')
const register = read('execution-register.json')
const expectedIds = Array.from({ length: 38 }, (_, index) => `R${String(index).padStart(2, '0')}`)
const ids = register.packages.map(item => item.id)
if (JSON.stringify(ids) !== JSON.stringify(expectedIds)) errors.push('Expected exactly R00 through R37 in order')
if (register.baselineSha256 !== hash(path.join(__dirname, 'baseline.json'))) errors.push('Baseline byte hash mismatch')
let evidenceReferences = 0
for (const item of register.packages) {
  for (const dependency of item.dependencies) {
    if (!ids.includes(dependency)) errors.push(`${item.id}: invalid dependency ${dependency}`)
  }
  if (!item.acceptance || !item.releaseGate || !item.ownerRole || !item.reviewerRole || !item.nextAction) errors.push(`${item.id}: missing execution contract`)
  for (const evidence of item.evidence) {
    evidenceReferences++
    if (!fs.existsSync(path.resolve(__dirname, evidence))) errors.push(`${item.id}: missing evidence ${evidence}`)
  }
}
for (const evidence of register.additionalVerificationArtifacts) {
  evidenceReferences++
  if (!fs.existsSync(path.resolve(__dirname, evidence))) errors.push(`Missing additional evidence ${evidence}`)
}
const visited = new Set()
const visiting = new Set()
function visit(id) {
  if (visiting.has(id)) { errors.push(`Dependency cycle at ${id}`); return }
  if (visited.has(id)) return
  visiting.add(id)
  for (const dep of register.packages.find(item => item.id === id)?.dependencies || []) visit(dep)
  visiting.delete(id)
  visited.add(id)
}
for (const id of ids) visit(id)
let markdownLinks = 0
for (const name of ['EXECUTION_REPORT.md', 'EXECUTION_REGISTER.md']) {
  const markdown = fs.readFileSync(path.join(__dirname, name), 'utf8')
  for (const match of markdown.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    const target = match[1].replace(/^<|>$/g, '').split('#')[0]
    if (!target || /^[a-z]+:\/\//i.test(target)) continue
    markdownLinks++
    if (!fs.existsSync(path.resolve(__dirname, target))) errors.push(`${name}: missing link ${target}`)
  }
}
const result = {
  checkedAt: new Date().toISOString(), status: errors.length ? 'FAILED' : 'PASS',
  scope: 'Execution-record integrity and declared source stability only; not release or latest-checkout qualification',
  packageCount: ids.length, statuses: register.packages.reduce((counts, item) => ({ ...counts, [item.status]: (counts[item.status] || 0) + 1 }), {}),
  evidenceReferences, markdownLinks, declaredSourceFiles: declared.length, changedDeclaredSourceFiles: changed.length,
  dependencyCycleCheck: 'performed', errors
}
fs.writeFileSync(path.join(__dirname, 'execution-record-validation.json'), JSON.stringify(result, null, 2) + '\n')
console.log(JSON.stringify(result))
if (errors.length) process.exitCode = 1
