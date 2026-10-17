const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const { preflight, inside } = require('./standalone-package-preflight.cjs')

function fixture() {
  const owner = fs.realpathSync(__dirname)
  const temp = fs.mkdtempSync(path.join(owner, '.preflight-test-'))
  const canonical = fs.realpathSync(temp)
  const candidate = path.join(temp, 'candidate'), pkg = path.join(temp, 'package'), pub = path.join(candidate, 'public')
  const build = path.join(candidate, '.next')
  const write = (name, contents = 'synthetic') => { fs.mkdirSync(path.dirname(name), { recursive: true }); fs.writeFileSync(name, contents) }
  const config = { version: 1, config: { output: 'standalone', distDir: '.next' }, relativeAppDir: '', files: ['.next/BUILD_ID', '.next/routes-manifest.json'] }
  const server = "throw Error('MUST_NOT_EXECUTE_APPLICATION')\n"
  write(path.join(build, 'standalone/server.js'), server)
  for (const root of [candidate, pkg]) {
    write(path.join(root, '.next/required-server-files.json'), JSON.stringify(config))
    write(path.join(root, '.next/BUILD_ID'), 'synthetic-build')
    write(path.join(root, '.next/routes-manifest.json'), '{}')
    write(path.join(root, '.next/static/chunks/main.js'), 'synthetic-static')
    write(path.join(root, 'public/logo.svg'), '<svg/>')
    for (const name of ['next', '@next/env', 'styled-jsx', 'react', 'react-dom', 'sharp', 'canvas']) {
      const folder = path.join(root, 'node_modules', name)
      const main = name === 'next' ? 'dist/server/next.js' : 'index.js'
      write(path.join(folder, 'package.json'), JSON.stringify({ name, main, version: name === 'next' ? '15.5.23' : '1.0.0' }))
      write(path.join(folder, main), server)
    }
  }
  write(path.join(pkg, 'server.js'), server)
  write(path.join(build, 'next-server.js.nft.json'), JSON.stringify({ version: 1, files: ['../node_modules/next/dist/server/next.js'] }))
  return {
    temp, candidate, pkg, pub, build, config, write,
    options: { buildOutputRoot: build, packageRoot: pkg, publicRoot: pub },
    run() { return preflight(this.options) },
    cleanup() {
      if (fs.lstatSync(temp).isSymbolicLink() || fs.realpathSync(temp) !== canonical || !inside(owner, canonical) || !path.basename(canonical).startsWith('.preflight-test-')) throw Error('TEST_CLEANUP_BOUNDARY_FAILED')
      fs.rmSync(canonical, { recursive: true, force: false, maxRetries: 2 })
    },
  }
}
function use(t) { const value = fixture(); t.after(() => value.cleanup()); return value }
function blocked(result, check, code) {
  assert.equal(result.status, 'STRUCTURAL_PREFLIGHT_BLOCKED')
  assert.ok(result.failures.some(item => item.check === check && (!code || item.code === code)), JSON.stringify(result.failures))
  assert.equal(result.applicationStarted, false)
  assert.equal(result.databaseContacted, false)
}

test('complete synthetic package passes structure without executing throwing entry modules', t => {
  const f = use(t), result = f.run()
  assert.equal(result.status, 'STRUCTURAL_PREFLIGHT_PASS_RUNTIME_PENDING', JSON.stringify(result.failures))
  assert.equal(result.packageCopied, false)
  assert.equal(result.applicationStarted, false)
  assert.equal(result.databaseContacted, false)
  assert.ok(result.pending.includes('Actual ESM loading and startup'))
  assert.equal(result.checks.tracedFiles.fileCount, 1)
  assert.equal(result.dependencyResolution.filter(row => row.required).length, 6)
})
test('missing copied server blocks', t => {
  const f = use(t); fs.unlinkSync(path.join(f.pkg, 'server.js'))
  blocked(f.run(), 'candidateConfiguration', 'ENOENT')
})
test('different generated server blocks', t => {
  const f = use(t); f.write(path.join(f.pkg, 'server.js'), 'different')
  blocked(f.run(), 'candidateConfiguration', 'GENERATED_SERVER_MISMATCH')
})
test('copied configuration mismatch blocks', t => {
  const f = use(t); f.write(path.join(f.pkg, '.next/required-server-files.json'), '{}')
  blocked(f.run(), 'candidateConfiguration', 'COPIED_CONFIGURATION_MISMATCH')
})
test('unsafe config dist cannot escape candidate', t => {
  const f = use(t); f.config.config.distDir = '../escape'; f.write(path.join(f.build, 'required-server-files.json'), JSON.stringify(f.config))
  blocked(f.run(), 'candidateConfiguration', 'UNSAFE_MANIFEST_PATH')
})
test('copied build id mismatch blocks', t => {
  const f = use(t); f.write(path.join(f.pkg, '.next/BUILD_ID'), 'other-build')
  blocked(f.run(), 'candidateConfiguration', 'BUILD_ID_MISMATCH')
})
test('required-files traversal fails closed', t => {
  const f = use(t); f.config.files.push('../outside.js')
  for (const root of [f.candidate, f.pkg]) f.write(path.join(root, '.next/required-server-files.json'), JSON.stringify(f.config))
  blocked(f.run(), 'candidateConfiguration', 'UNSAFE_MANIFEST_PATH')
})
test('changed and extra static assets block exact inventory match', t => {
  const f = use(t); f.write(path.join(f.pkg, '.next/static/chunks/main.js'), 'tampered')
  blocked(f.run(), 'staticAssets', 'ASSET_INVENTORY_MISMATCH')
  f.write(path.join(f.pkg, '.next/static/chunks/main.js'), 'synthetic-static')
  f.write(path.join(f.pkg, '.next/static/extra.js'), 'unexpected')
  blocked(f.run(), 'staticAssets', 'ASSET_INVENTORY_MISMATCH')
})
test('missing public asset blocks', t => {
  const f = use(t); fs.unlinkSync(path.join(f.pkg, 'public/logo.svg'))
  blocked(f.run(), 'publicAssets', 'ASSET_INVENTORY_MISMATCH')
})
test('required normal-server trace dependency missing from copied package blocks', t => {
  const f = use(t)
  f.write(path.join(f.candidate, 'node_modules/next/dist/compiled/runtime.js'), 'extra-traced-runtime')
  f.write(path.join(f.build, 'next-server.js.nft.json'), JSON.stringify({ files: ['../node_modules/next/dist/compiled/runtime.js'] }))
  blocked(f.run(), 'tracedFiles', 'ENOENT')
})
test('unique unconsumed minimal-server dependency is not required in normal standalone output', t => {
  const f = use(t)
  f.write(path.join(f.candidate, 'node_modules/next/dist/compiled/minimal-runtime.js'), 'unconsumed-minimal-runtime')
  f.write(path.join(f.build, 'next-minimal-server.js.nft.json'), JSON.stringify({ files: ['../node_modules/next/dist/compiled/minimal-runtime.js'] }))
  const result = f.run()
  assert.equal(result.status, 'STRUCTURAL_PREFLIGHT_PASS_RUNTIME_PENDING', JSON.stringify(result.failures))
  assert.equal(result.checks.tracedFiles.traceCount, 2)
  assert.equal(result.checks.tracedFiles.requiredTraceCount, 1)
  assert.equal(result.checks.tracedFiles.unconsumedTraces[0].path, 'next-minimal-server.js.nft.json')
  assert.equal(result.checks.tracedFiles.fileCount, 1)
})
test('dependency shared by minimal and normal-server traces remains required', t => {
  const f = use(t), trace = { files: ['../node_modules/next/dist/compiled/shared-runtime.js'] }
  f.write(path.join(f.candidate, 'node_modules/next/dist/compiled/shared-runtime.js'), 'required-shared-runtime')
  f.write(path.join(f.build, 'next-server.js.nft.json'), JSON.stringify(trace))
  f.write(path.join(f.build, 'next-minimal-server.js.nft.json'), JSON.stringify(trace))
  blocked(f.run(), 'tracedFiles', 'ENOENT')
})
test('trace traversal beyond candidate blocks before reading external input', t => {
  const f = use(t); f.write(path.join(f.build, 'next-server.js.nft.json'), JSON.stringify({ files: ['../../outside.js'] }))
  blocked(f.run(), 'tracedFiles', 'TRACE_PATH_ESCAPES_CANDIDATE')
})
test('missing required module cannot use ancestor dependencies', t => {
  const f = use(t)
  const modulePath = path.join(f.pkg, 'node_modules/@next/env')
  // Exact owned fixture directory, validated before this bounded recursive removal.
  assert.ok(inside(fs.realpathSync(f.temp), fs.realpathSync(modulePath)))
  fs.rmSync(modulePath, { recursive: true })
  f.write(path.join(f.temp, 'node_modules/@next/env/package.json'), JSON.stringify({ name: '@next/env', main: 'index.js' }))
  f.write(path.join(f.temp, 'node_modules/@next/env/index.js'), "throw Error('OUTSIDE_MODULE_MUST_NOT_EXECUTE')")
  const result = f.run()
  blocked(result, 'runtimeDependencyResolution')
  assert.equal(result.dependencyResolution.find(row => row.request === '@next/env').state, 'OUTSIDE_PACKAGE')
})
test('unresolved required dependency fails even when package metadata exists', t => {
  const f = use(t)
  f.write(path.join(f.pkg, 'node_modules/@next/env/package.json'), JSON.stringify({ name: '@next/env', exports: './missing.cjs' }))
  const result = f.run()
  blocked(result, 'runtimeDependencyResolution', 'REQUIRED_DEPENDENCY_UNRESOLVED')
  assert.equal(result.dependencyResolution.find(row => row.request === '@next/env').state, 'UNRESOLVED')
})
test('unreviewed Next version cannot reuse the reviewed trace policy', t => {
  const f = use(t)
  f.write(path.join(f.pkg, 'node_modules/next/package.json'), JSON.stringify({ name: 'next', main: 'dist/server/next.js', version: '16.0.0' }))
  blocked(f.run(), 'runtimeDependencyResolution', 'NEXT_PACKAGER_VERSION_REVIEW_REQUIRED')
})
test('unavailable optional module is recorded separately', t => {
  const f = use(t)
  f.write(path.join(f.pkg, 'node_modules/canvas/package.json'), JSON.stringify({ name: 'canvas', exports: './absent.cjs' }))
  const result = f.run()
  assert.equal(result.status, 'STRUCTURAL_PREFLIGHT_PASS_RUNTIME_PENDING', JSON.stringify(result.failures))
  assert.equal(result.dependencyResolution.find(row => row.request === 'canvas').state, 'OPTIONAL_UNRESOLVED')
})
test('optional dependency resolving to an ancestor still fails containment', t => {
  const f = use(t), optionalPath = path.join(f.pkg, 'node_modules/canvas')
  assert.ok(inside(fs.realpathSync(f.temp), fs.realpathSync(optionalPath)))
  fs.rmSync(optionalPath, { recursive: true })
  f.write(path.join(f.temp, 'node_modules/canvas/package.json'), JSON.stringify({ name: 'canvas', main: 'index.js' }))
  f.write(path.join(f.temp, 'node_modules/canvas/index.js'), "throw Error('OUTSIDE_MODULE_MUST_NOT_EXECUTE')")
  const result = f.run()
  blocked(result, 'runtimeDependencyResolution', 'DEPENDENCY_RESOLVES_OUTSIDE_PACKAGE')
  assert.equal(result.dependencyResolution.find(row => row.request === 'canvas').state, 'OUTSIDE_PACKAGE')
})
test('environment files are rejected without reading or retaining content', t => {
  const f = use(t); f.write(path.join(f.pkg, '.env.production'), '')
  const result = f.run(); blocked(result, 'packageInventory', 'SENSITIVE_PACKAGE_PATH_PRESENT')
  assert.equal(result.environmentFilesRead, false)
})
test('environment aliases and private-directory case variants are rejected before read', t => {
  for (const name of ['.envrc', '.example.env', '.neon/connection.json', '.GIT/config', '.SEED-ARTIFACTS/fixture.json', '.AUTH/state.json']) {
    const f = use(t), target = path.join(f.pkg, name)
    f.write(target, '')
    const original = fs.readFileSync
    let privateRead = false
    fs.readFileSync = function(filename, ...args) {
      if (path.resolve(String(filename)) === path.resolve(target)) privateRead = true
      return original.call(this, filename, ...args)
    }
    try {
      blocked(f.run(), 'packageInventory', 'SENSITIVE_PACKAGE_PATH_PRESENT')
      assert.equal(privateRead, false, name)
    } finally { fs.readFileSync = original }
  }
})
test('candidate trace alias cannot read a physically sensitive directory', t => {
  const f = use(t), privateDirectory = path.join(f.candidate, '.seed-artifacts')
  f.write(path.join(privateDirectory, 'payload.dat'), 'synthetic-not-a-secret')
  fs.symlinkSync(privateDirectory, path.join(f.candidate, 'alias'), process.platform === 'win32' ? 'junction' : 'dir')
  f.write(path.join(f.pkg, 'alias/payload.dat'), 'synthetic-not-a-secret')
  f.write(path.join(f.build, 'next-server.js.nft.json'), JSON.stringify({ files: ['../alias/payload.dat'] }))
  blocked(f.run(), 'tracedFiles', 'SENSITIVE_FILE_NOT_READ')
})
test('escaping directory junction/symlink blocks before contents are traversed', t => {
  const f = use(t), outside = path.join(f.temp, 'outside')
  fs.mkdirSync(outside); fs.symlinkSync(outside, path.join(f.pkg, 'escape'), process.platform === 'win32' ? 'junction' : 'dir')
  blocked(f.run(), 'packageInventory', 'SYMLINK_ESCAPES_PACKAGE')
})
test('contained directory junction/symlink preserves structural acceptance', t => {
  const f = use(t)
  fs.symlinkSync(path.join(f.pkg, 'public'), path.join(f.pkg, 'public-alias'), process.platform === 'win32' ? 'junction' : 'dir')
  const result = f.run()
  assert.equal(result.status, 'STRUCTURAL_PREFLIGHT_PASS_RUNTIME_PENDING', JSON.stringify(result.failures))
  assert.equal(result.checks.packageInventory.symlinkCount, 1)
})
test('cyclic directory junction/symlink terminates with failure', t => {
  const f = use(t)
  fs.symlinkSync(f.pkg, path.join(f.pkg, 'cycle'), process.platform === 'win32' ? 'junction' : 'dir')
  blocked(f.run(), 'packageInventory', 'SYMLINK_DIRECTORY_CYCLE')
})
test('dangling directory junction/symlink blocks', t => {
  const f = use(t)
  fs.symlinkSync(path.join(f.temp, 'missing'), path.join(f.pkg, 'dangling'), process.platform === 'win32' ? 'junction' : 'dir')
  blocked(f.run(), 'packageInventory')
})
function mutateAfterRead(filename, mutate, work) {
  const original = fs.readFileSync
  let changed = false
  fs.readFileSync = function(value, ...args) {
    const bytes = original.call(this, value, ...args)
    if (!changed && path.resolve(String(value)) === path.resolve(filename)) { changed = true; mutate() }
    return bytes
  }
  try { const result = work(); assert.equal(changed, true); return result }
  finally { fs.readFileSync = original }
}
test('candidate configuration changed after comparison invalidates pass', t => {
  const f = use(t), filename = path.join(f.build, 'required-server-files.json')
  const result = mutateAfterRead(filename, () => fs.appendFileSync(filename, '\n'), () => f.run())
  blocked(result, 'candidateInputsStableDuringCheck', 'SOURCE_CHANGED_DURING_PREFLIGHT')
})
test('candidate public asset changed after comparison invalidates pass', t => {
  const f = use(t), filename = path.join(f.pub, 'logo.svg')
  const result = mutateAfterRead(filename, () => fs.writeFileSync(filename, '<svg>changed</svg>'), () => f.run())
  blocked(result, 'candidateInputsStableDuringCheck', 'SOURCE_ASSET_INVENTORY_CHANGED')
})
test('new candidate NFT trace appearing during comparison invalidates pass', t => {
  const f = use(t), filename = path.join(f.build, 'next-server.js.nft.json')
  const result = mutateAfterRead(filename, () => f.write(path.join(f.build, 'new.nft.json'), JSON.stringify({ files: [] })), () => f.run())
  blocked(result, 'candidateInputsStableDuringCheck', 'SOURCE_TRACE_INVENTORY_CHANGED')
})
test('CLI writes owned receipt and exits nonzero for missing input', t => {
  const f = use(t), receipt = path.join(f.temp, 'negative-receipt.json')
  const result = spawnSync(process.execPath, [path.join(__dirname, 'standalone-package-preflight.cjs'), '--build-output-root', path.join(f.temp, 'missing'), '--package-root', f.pkg, '--public-root', f.pub, '--receipt', receipt], { encoding: 'utf8', timeout: 20000, windowsHide: true })
  assert.equal(result.status, 1)
  assert.equal(JSON.parse(fs.readFileSync(receipt)).status, 'STRUCTURAL_PREFLIGHT_BLOCKED')
})
test('CLI structural success exits zero but explicitly keeps runtime pending', t => {
  const f = use(t), receipt = path.join(f.temp, 'positive-receipt.json')
  const result = spawnSync(process.execPath, [path.join(__dirname, 'standalone-package-preflight.cjs'), '--build-output-root', f.build, '--package-root', f.pkg, '--public-root', f.pub, '--receipt', receipt], { encoding: 'utf8', timeout: 20000, windowsHide: true })
  assert.equal(result.status, 0, result.stdout + result.stderr)
  assert.equal(JSON.parse(fs.readFileSync(receipt)).status, 'STRUCTURAL_PREFLIGHT_PASS_RUNTIME_PENDING')
  assert.equal(JSON.parse(result.stdout).runtimeVerification, 'PENDING')
})
