const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), cp = require('node:child_process')
const root = path.resolve(__dirname, '../../../..')
const target = path.join(__dirname, 'BASELINE.json')
if (fs.existsSync(target)) throw new Error('Refusing to replace baseline')
const selected = new Set(['AGENTS.md', 'package.json', 'prisma/schema.prisma', 'jest.setup.ts', 'jest.payroll-trust-spine.config.cjs', 'scripts/dev-app-safe.js', 'next.config.mjs'])
for (const prompt of ['P05', 'P06']) {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, `docs/retention/execution/${prompt}/evidence/SOURCE_MANIFEST.json`), 'utf8'))
  for (const key of Object.keys(manifest)) selected.add(key)
}
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name)
    if (file === __dirname) continue
    if (entry.isDirectory()) walk(file)
    else if (entry.isFile()) selected.add(path.relative(root, file).split(path.sep).join('/'))
  }
}
walk(path.join(root, 'docs/retention'))
const hashes = Object.fromEntries([...selected].sort().filter(p => fs.existsSync(path.join(root, p))).map(p => [p, crypto.createHash('sha256').update(fs.readFileSync(path.join(root, p))).digest('hex')]))
const git = args => cp.execFileSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true })
const data = { utc: new Date().toISOString(), head: git(['rev-parse', 'HEAD']).trim(), branch: git(['branch', '--show-current']).trim(), hashes, limitation: 'Selected sources and all prior retention artifacts; initial whole-tree hash attempt interrupted without results before existing-file edits' }
fs.writeFileSync(target, JSON.stringify(data, null, 2) + '\n')
fs.writeFileSync(path.join(__dirname, 'WORKTREE_STATUS.txt'), git(['status', '--short', '--untracked-files=normal']))
console.log(JSON.stringify({ head: data.head, files: Object.keys(hashes).length }))
