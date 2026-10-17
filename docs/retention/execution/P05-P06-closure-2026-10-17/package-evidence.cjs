const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), cp = require('node:child_process')
const root = path.resolve(__dirname, '../../../..')
const pairs = [
  ['pos-full-commit.before.ts.txt', 'services/pos/__tests__/pos-full-commit.postgres.test.ts', 'OWNED_DATABASE_TEST.patch'],
  ['ProfessionalPOSSystem.before.tsx.txt', 'components/pos/ProfessionalPOSSystem.tsx', 'OWNED_UI.patch'],
  ['ProfessionalPOSSystem.shift-close.before.tsx.txt', 'components/pos/__tests__/ProfessionalPOSSystem.shift-close.test.tsx', 'OWNED_UI_TEST.patch'],
]
for (const [before, after, output] of pairs) {
  const r = cp.spawnSync('git', ['diff', '--no-index', '--', path.join(__dirname, before), path.join(root, after)], { cwd: root, windowsHide: true, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 })
  if (![0, 1].includes(r.status)) throw new Error('Diff inspection failed')
  fs.writeFileSync(path.join(__dirname, output), r.stdout)
}
const git = args => cp.execFileSync('git', args, { cwd: root, windowsHide: true, encoding: 'utf8' }).trim()
const record = { utc: new Date().toISOString(), head: git(['rev-parse', 'HEAD']), branch: git(['branch', '--show-current']), ownedSource: [...pairs.map(p => p[1]), 'services/pos/__tests__/retention-recovery.browser-fixture.test.ts'], noStagingOrCommit: true }
fs.writeFileSync(path.join(__dirname, 'FINAL_SOURCE.json'), JSON.stringify(record, null, 2))
const hashes = {}
for (const name of fs.readdirSync(__dirname).sort()) {
  const file = path.join(__dirname, name)
  if (name === 'ARTIFACT_MANIFEST.json' || !fs.statSync(file).isFile()) continue
  hashes[name] = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
}
fs.writeFileSync(path.join(__dirname, 'ARTIFACT_MANIFEST.json'), JSON.stringify({ utc: new Date().toISOString(), hashes }, null, 2))
console.log(JSON.stringify({ files: Object.keys(hashes).length, head: record.head }))
