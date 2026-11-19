const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { prepare, verify, filesUnder } = require('../../scripts/release-artifact.cjs');

// Filesystem fixtures only: injected build/source identity, no Next/env/DB imports.
let base, root, destination;
const sourceIdentity = () => [{ path: 'app/page.tsx', sha256: 'a'.repeat(64) }];
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const sentinel = Buffer.from('private-legacy-image-sentinel');
function write(file, bytes = sentinel) {
  fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  fs.writeFileSync(path.join(root, file), bytes);
}
function output() {
  for (const [file, bytes] of Object.entries({
    '.next/BUILD_ID': 'fixture-build', '.next/standalone/server.js': 'server',
    '.next/static/fixture-build/app.js': 'client', 'public/favicon.ico': 'icon',
    '.next/standalone/node_modules/next/package.json': '{}',
    '.next/standalone/node_modules/react/package.json': '{}',
    '.next/standalone/node_modules/react-dom/package.json': '{}',
  })) write(file, bytes);
}
const seal = setup => { setup?.(); return prepare(root, destination, { sourceIdentity, env: {}, runScript: async () => output() }); };
const check = result => verify(root, destination, result.sha256, { sourceIdentity });
function reseal(change) {
  const file = path.join(destination, 'artifact.json');
  const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
  change(manifest);
  const bytes = Buffer.from(JSON.stringify(manifest, null, 2) + '\n');
  fs.writeFileSync(file, bytes);
  return { sha256: digest(bytes) };
}
beforeEach(() => {
  base = fs.mkdtempSync(path.join(os.tmpdir(), 'p04-r02-packing-'));
  root = path.join(base, 'source'); destination = path.join(base, 'artifact');
  fs.mkdirSync(root);
});
afterEach(() => {
  if (path.dirname(path.resolve(base)) !== path.resolve(os.tmpdir()) || !path.basename(base).startsWith('p04-r02-packing-')) throw new Error('Unexpected fixture root');
  fs.rmSync(base, { recursive: true, force: true });
});

test('packs legacy bytes privately with a source mapping, retains originals and ordinary public assets', async () => {
  const result = await seal(() => write('public/uploads/org_A/photo.JPG'));
  const manifest = check(result);
  expect(manifest.version).toBe(2);
  expect(manifest.legacyUploads).toEqual([{ source: 'public/uploads/org_A/photo.JPG', destination: 'runtime/.private/uploads/org_A/photo.JPG', sha256: digest(sentinel) }]);
  expect(fs.readFileSync(path.join(root, 'public/uploads/org_A/photo.JPG'))).toEqual(sentinel);
  expect(fs.readFileSync(path.join(destination, 'runtime/.private/uploads/org_A/photo.JPG'))).toEqual(sentinel);
  expect(fs.existsSync(path.join(destination, 'runtime/public/uploads'))).toBe(false);
  expect(fs.readFileSync(path.join(destination, 'runtime/public/favicon.ico'), 'utf8')).toBe('icon');
});

test('deduplicates matching legacy copies from public and traced standalone paths regardless of public/uploads case', async () => {
  const result = await seal(() => {
    write('public/UPLOADS/org_A/photo.png');
    write('.next/standalone/Public/Uploads/org_A/photo.png');
    write('.next/standalone/nested/project/public/uploads/org_A/photo.png');
    write('.next/standalone/.private/uploads/org_A/photo.png');
  });
  const manifest = check(result);
  expect(manifest.legacyUploads).toHaveLength(1);
  expect(manifest.files.filter(file => file.path.toLowerCase().includes('/uploads/'))).toEqual([
    { path: 'runtime/.private/uploads/org_A/photo.png', sha256: digest(sentinel) },
  ]);
});

test.each(['changed-bytes', 'orphan', 'case-alias'])('refuses %s traced legacy duplicates before writing the artifact', async mode => {
  await expect(seal(() => {
    if (mode !== 'orphan') write('public/uploads/org_A/photo.png');
    write(`.next/standalone/public/uploads/${mode === 'case-alias' ? 'org_a' : 'org_A'}/photo.png`, mode === 'changed-bytes' ? 'different-private-bytes' : sentinel);
  })).rejects.toThrow(/legacy upload/);
  expect(fs.existsSync(destination)).toBe(false);
});

test.each(['org_A/deeper/photo.png', 'org_A/photo.svg', 'org_A/a..png'])('refuses unsupported upload layout %s', async relative => {
  await expect(seal(() => write(`public/uploads/${relative}`))).rejects.toThrow('Unsupported legacy upload path');
  expect(fs.existsSync(destination)).toBe(false);
});

test('rejects cross-source case conflicts for ordinary public paths', async () => {
  await expect(seal(() => write('.next/standalone/Public/logo.png', 'ordinary'))).rejects.toThrow('Ambiguous artifact path case');
  expect(fs.existsSync(destination)).toBe(false);
});

test('source ancestor junction is rejected instead of following it into traced output', async () => {
  const linked = path.join(base, 'linked-output'); fs.mkdirSync(linked);
  fs.symlinkSync(linked, path.join(root, '.next'), process.platform === 'win32' ? 'junction' : 'dir');
  await expect(seal()).rejects.toThrow('Artifact links');
  expect(fs.existsSync(destination)).toBe(false);
});

test('destination ancestor junction is rejected before invoking the build', async () => {
  const actual = path.join(base, 'actual'); fs.mkdirSync(actual);
  const linked = path.join(base, 'linked');
  fs.symlinkSync(actual, linked, process.platform === 'win32' ? 'junction' : 'dir');
  const runScript = jest.fn();
  await expect(prepare(root, path.join(linked, 'artifact'), { sourceIdentity, env: {}, runScript })).rejects.toThrow('Artifact links');
  expect(runScript).not.toHaveBeenCalled();
});

test('upload directory junction is rejected and source target remains unchanged', async () => {
  const actual = path.join(base, 'outside-org'); fs.mkdirSync(actual); fs.writeFileSync(path.join(actual, 'photo.png'), sentinel);
  await expect(seal(() => {
    fs.mkdirSync(path.join(root, 'public/uploads'), { recursive: true });
    fs.symlinkSync(actual, path.join(root, 'public/uploads/org_A'), process.platform === 'win32' ? 'junction' : 'dir');
  })).rejects.toThrow('Artifact links');
  expect(fs.readFileSync(path.join(actual, 'photo.png'))).toEqual(sentinel);
});

test.each(['runtime/public/uploads/org_A/photo.png', 'runtime/Public/UPLOADS/org_A/photo.png', 'runtime/nested/project/public/uploads/org_A/photo.png'])('verification rejects newly sealed public legacy bytes at %s', async relative => {
  await seal(() => write('public/uploads/org_A/photo.png'));
  const target = path.join(destination, relative); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, sentinel);
  const changed = reseal(manifest => { manifest.files.push({ path: relative, sha256: digest(sentinel) }); });
  expect(() => check(changed)).toThrow(/Public legacy|Ambiguous artifact path case/);
});

test.each(['missing-map', 'wrong-hash', 'unsafe-source', 'unsafe-destination', 'wrong-destination'])('verification rejects %s even with a fresh manifest digest', async mode => {
  await seal(() => write('public/uploads/org_A/photo.png'));
  const changed = reseal(manifest => {
    if (mode === 'missing-map') delete manifest.legacyUploads;
    if (mode === 'wrong-hash') manifest.legacyUploads[0].sha256 = 'b'.repeat(64);
    if (mode === 'unsafe-source') manifest.legacyUploads[0].source = '../outside/photo.png';
    if (mode === 'unsafe-destination') manifest.legacyUploads[0].destination = 'C:/outside/photo.png';
    if (mode === 'wrong-destination') manifest.legacyUploads[0].destination = 'runtime/.private/uploads/org_B/photo.png';
  });
  expect(() => check(changed)).toThrow(/mapping|digest|Unsafe artifact path/);
});

test('ignored original-source byte drift invalidates the independent legacy mapping', async () => {
  const result = await seal(() => write('public/uploads/org_A/photo.png'));
  write('public/uploads/org_A/photo.png', 'changed-after-seal');
  expect(() => check(result)).toThrow('Legacy upload source/mapping mismatch');
});

test.each(['changed', 'added', 'removed'])('refuses ignored legacy source %s during the injected build', async mode => {
  write('public/uploads/org_A/photo.png');
  await expect(prepare(root, destination, { sourceIdentity, env: {}, runScript: async () => {
    output();
    if (mode === 'changed') write('public/uploads/org_A/photo.png', 'changed-during-build');
    if (mode === 'added') write('public/uploads/org_A/extra.png');
    if (mode === 'removed') fs.unlinkSync(path.join(root, 'public/uploads/org_A/photo.png'));
  } })).rejects.toThrow('Legacy upload sources changed during build');
  expect(fs.existsSync(destination)).toBe(false);
});

test.each(['public/images/renamed.png', '.next/standalone/public/images/renamed.png', '.next/static/cache/renamed.png'])('refuses known private bytes copied under unrelated path %s', async relative => {
  await expect(seal(() => { write('public/uploads/org_A/photo.png'); write(relative); })).rejects.toThrow('Legacy upload bytes outside private mapping');
  expect(fs.existsSync(destination)).toBe(false);
});

test('verification refuses a renamed known-private copy even with an updated file inventory and digest', async () => {
  await seal(() => write('public/uploads/org_A/photo.png'));
  const target = path.join(destination, 'runtime/public/renamed.png'); fs.writeFileSync(target, sentinel);
  const changed = reseal(manifest => { manifest.files = filesUnder(destination).filter(file => file.path !== 'artifact.json'); });
  expect(() => check(changed)).toThrow('Legacy upload bytes outside private mapping');
});

test('missing private file cannot pass by resealing only the files array', async () => {
  await seal(() => write('public/uploads/org_A/photo.png'));
  fs.unlinkSync(path.join(destination, 'runtime/.private/uploads/org_A/photo.png'));
  const changed = reseal(manifest => { manifest.files = filesUnder(destination).filter(file => file.path !== 'artifact.json'); });
  expect(() => check(changed)).toThrow('Legacy upload private files/mapping mismatch');
});

test('historical v1 is accepted only without any legacy uploads', async () => {
  await seal();
  const old = reseal(manifest => { manifest.version = 1; delete manifest.legacyUploads; });
  expect(check(old).version).toBe(1);
  write('public/uploads/org_A/photo.png');
  expect(() => check(old)).toThrow('Legacy uploads require artifact manifest v2');
});

test('historical v1 public upload artifact is rejected even with matching sealed bytes', async () => {
  await seal(() => write('public/uploads/org_A/photo.png'));
  const target = path.join(destination, 'runtime/public/uploads/org_A/photo.png');
  fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, sentinel);
  const old = reseal(manifest => { manifest.version = 1; delete manifest.legacyUploads; manifest.files = filesUnder(destination).filter(file => file.path !== 'artifact.json'); });
  expect(() => check(old)).toThrow('Public legacy uploads');
});

test.each(['runtime/public/NUL.png', 'runtime/public/photo.png.', 'runtime/public/a\\b.png', 'runtime/public/../photo.png'])('rejects unsafe declared portable path %s', async relative => {
  await seal();
  const changed = reseal(manifest => { manifest.files.push({ path: relative, sha256: digest(sentinel) }); });
  expect(() => check(changed)).toThrow('Unsafe artifact path');
});
