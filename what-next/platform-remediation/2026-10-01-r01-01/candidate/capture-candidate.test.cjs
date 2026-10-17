const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { inside, separateRoots, excluded, inventory, compare } = require('./capture-candidate.cjs')

function fixture(t) {
  const root = fs.mkdtempSync(path.join(__dirname, '.capture-review-'))
  const physical = fs.realpathSync(root)
  t.after(() => {
    assert.equal(fs.lstatSync(root).isSymbolicLink(), false)
    assert.equal(fs.realpathSync(root), physical)
    assert.ok(inside(fs.realpathSync(__dirname), physical))
    assert.ok(path.basename(root).startsWith('.capture-review-'))
    fs.rmSync(root, { recursive: true, force: true })
  })
  return root
}
function write(root, relative, bytes) {
  const target = path.join(root, relative)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, bytes)
}

test('containment rejects sibling-prefix escapes and overlapping candidate roots', () => {
  const root = path.resolve(__dirname, 'source')
  assert.equal(inside(root, path.join(root, 'app', 'page.tsx')), true)
  assert.equal(inside(root, path.resolve(root, '..', 'source-other', 'page.tsx')), false)
  assert.equal(separateRoots(root, root), false)
  assert.equal(separateRoots(root, path.join(root, 'nested')), false)
  assert.equal(separateRoots(path.join(root, 'nested'), root), false)
  assert.equal(separateRoots(root, `${root}-other`), true)
})

test('Windows case and separator variants cannot bypass exclusions', () => {
  for (const name of ['app/.ENV.production', 'app/.envrc', 'lib/.Git/config', 'PUBLIC\\UPLOADS\\private.png', 'public/SEED-IMAGES/a.png', 'tests/.AUTH/session.json', 'app/private.PEM', 'app/.NEXT-cache/state', 'lib/.seed-artifacts/users.json']) {
    assert.equal(excluded(name), true, name)
  }
  assert.equal(excluded('lib/environment.ts'), false)
  assert.equal(excluded('public/brand/logo.png'), false)
})

test('source inventory includes non-code assets and untracked files but excludes secret and runtime files', t => {
  const root = fixture(t)
  write(root, 'app/page.tsx', 'page')
  write(root, 'messages/en.json', '{}')
  write(root, 'public/brand/logo.png', Buffer.from([0, 255, 0, 17]))
  write(root, 'tests/fixtures/sample.bin', Buffer.from([255, 128]))
  write(root, 'services/untracked-service.ts', 'new source')
  write(root, 'public/uploads/private.png', 'private')
  write(root, 'app/.ENV.local', 'synthetic-private-value')
  write(root, 'what-next/huge-snapshot/sample.ts', 'historical')
  const result = inventory(root)
  assert.deepEqual(result.files.map(file => file.path), ['app/page.tsx', 'messages/en.json', 'public/brand/logo.png', 'services/untracked-service.ts', 'tests/fixtures/sample.bin'])
  assert.equal(result.files.find(file => file.path.endsWith('logo.png')).bytes, 4)
  assert.deepEqual(result.exclusions, ['app/.ENV.local', 'public/uploads'])
})

test('source and final destination inventories detect changed, added and deleted files', t => {
  const root = fixture(t)
  write(root, 'app/changed.ts', 'original')
  write(root, 'app/deleted.ts', 'original')
  const before = inventory(root).files
  write(root, 'app/changed.ts', 'changed')
  fs.unlinkSync(path.join(root, 'app/deleted.ts'))
  write(root, 'app/added.ts', 'addition')
  assert.deepEqual(compare(before, inventory(root).files).sort(), ['app/added.ts', 'app/changed.ts', 'app/deleted.ts'])
  write(root, '.env.local', 'synthetic-unexpected-secret')
  const finalFiles = inventory(root, { allFiles: true }).files
  assert.ok(compare(before, finalFiles).includes('.env.local'))
  assert.ok(compare(before, finalFiles).includes('app/changed.ts'))
})

for (const linkKind of ['escaping', 'dangling', 'cycle']) {
  test(`source inventory rejects ${linkKind} directory links`, t => {
    const root = fixture(t)
    const source = path.join(root, 'source')
    fs.mkdirSync(path.join(source, 'app'), { recursive: true })
    const target = linkKind === 'escaping' ? path.join(root, 'outside') : linkKind === 'cycle' ? path.join(source, 'app') : path.join(root, 'missing')
    if (linkKind === 'escaping') fs.mkdirSync(target)
    fs.symlinkSync(target, path.join(source, 'app', 'linked'), process.platform === 'win32' ? 'junction' : 'dir')
    assert.throws(() => inventory(source), /Source link or escaping path/)
  })
}
