// Read-only baseline/evidence check; writes only this run's validation packet.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto')
const root = path.resolve(__dirname, '../../../..')
const baseline = JSON.parse(fs.readFileSync(path.join(__dirname, 'BASELINE.json'), 'utf8'))
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex')
const allowed = new Set(['services/pos/__tests__/pos-full-commit.postgres.test.ts', 'components/pos/ProfessionalPOSSystem.tsx', 'components/pos/__tests__/ProfessionalPOSSystem.shift-close.test.tsx', 'docs/retention/execution/P05/RESULT.md', 'docs/retention/execution/P06/RESULT.md', 'docs/retention/execution/STATUS.md'])
const changed = [], missing = [], currentHashes = {}
for (const [file, hash] of Object.entries(baseline.hashes)) {
  const abs = path.join(root, file)
  if (!fs.existsSync(abs)) { missing.push(file); continue }
  currentHashes[file] = sha(fs.readFileSync(abs))
  if (hash !== currentHashes[file]) changed.push(file)
}
const before = fs.readFileSync(path.join(__dirname, 'pos-full-commit.before.ts.txt'), 'utf8').replaceAll('\r\n', '\n').split('\n')
const after = fs.readFileSync(path.join(root, 'services/pos/__tests__/pos-full-commit.postgres.test.ts'), 'utf8').replaceAll('\r\n', '\n').split('\n')
let cursor = 0
for (const line of after) if (line === before[cursor]) cursor++
const originalTestContentPreserved = cursor === before.length
const uiBefore = fs.readFileSync(path.join(__dirname, 'ProfessionalPOSSystem.before.tsx.txt'), 'utf8').replaceAll('\r\n', '\n')
const uiAfter = fs.readFileSync(path.join(root, 'components/pos/ProfessionalPOSSystem.tsx'), 'utf8').replaceAll('\r\n', '\n')
const oldNotice = '      notifications.error(\n        t("notifications.saleErrorTitle"),\n        toErrorMessage(error, t("notifications.genericError")),\n        { category: "sales", priority: "high" },\n      )'
const newNotice = '      // A lost response cannot establish whether the retained sale committed.\n      notifications.warning(\n        t("recovery.title"),\n        t("recovery.failed"),\n        { category: "sales", priority: "high" },\n      )'
const componentOnlyOwnedNoticeChanged = uiBefore.replace(oldNotice, newNotice) === uiAfter
const uiTestBefore = fs.readFileSync(path.join(__dirname, 'ProfessionalPOSSystem.shift-close.before.tsx.txt'), 'utf8').replaceAll('\r\n', '\n').split('\n')
let uiCursor = 0
for (const line of fs.readFileSync(path.join(root, 'components/pos/__tests__/ProfessionalPOSSystem.shift-close.test.tsx'), 'utf8').replaceAll('\r\n', '\n').split('\n')) if (line === uiTestBefore[uiCursor]) uiCursor++
const originalUITestContentPreserved = uiCursor === uiTestBefore.length
const results = fs.readdirSync(__dirname).filter(f => f.endsWith('.results.json')).map(file => {
  const r = JSON.parse(fs.readFileSync(path.join(__dirname, file), 'utf8'))
  return { file, passed: r.numPassedTests, failed: r.numFailedTests, pending: r.numPendingTests, success: r.success }
})
const unownedChanges = changed.filter(f => !allowed.has(f))
const result = { utc: new Date().toISOString(), headAtStart: baseline.head, inspectedFiles: Object.keys(baseline.hashes).length, changed, unownedChanges, missing, originalTestContentPreserved, componentOnlyOwnedNoticeChanged, originalUITestContentPreserved, results, currentHashes, limitation: 'Selected baseline preservation only; concurrent/untracked work outside the captured set is not certified. Known concurrent schema drift remains explicitly reported.' }
result.ownedPreservationPassed = !missing.length && originalTestContentPreserved && componentOnlyOwnedNoticeChanged && originalUITestContentPreserved
result.success = !unownedChanges.length && result.ownedPreservationPassed
fs.writeFileSync(path.join(__dirname, 'VALIDATION.json'), JSON.stringify(result, null, 2) + '\n')
console.log(JSON.stringify({ ...result, currentHashes: undefined }))
if (!result.success) process.exitCode = 1
