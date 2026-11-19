// Bind successful private preparation before any database start or application build.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../../../..');
const read = name => JSON.parse(fs.readFileSync(path.join(__dirname, name), 'utf8'));
const prepared = read('preparation.json'), c = read('candidate-context.json');
assert.equal(process.argv.length, 2);
assert.equal(prepared.passed, true);
assert.equal(prepared.candidateId, c.candidateId);
assert.equal(c.root, root);
assert.equal(c.storage, path.join(root, '.codex-tmp/p04-r02-fullapp-20261102-r2'));
assert.equal(JSON.parse(fs.readFileSync(path.join(c.storage, 'ownership.json'))).root, root);
assert.equal(fs.realpathSync(c.source), c.source);
assert.equal(fs.realpathSync(path.join(c.source, 'node_modules')), path.join(c.source, 'node_modules'));
const manifest = read('candidate-source-manifest.json');
const { capture } = require(path.join(root, 'scripts/candidate-snapshot.cjs'));
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
assert.deepEqual(capture(c.source).files.map(({ path, sha256 }) => ({ path, sha256 })), manifest.files);
assert.deepEqual(c.assetAnnex, manifest.ignoredAssetAnnex);
for (const a of c.assetAnnex) assert.equal(hash(fs.readFileSync(path.join(c.source, a.source))), a.sha256);
assert(!fs.readdirSync(c.source).some(n => /^\.env(?:\.|$)/i.test(n)));
const result = { at: new Date().toISOString(), passed: true, candidateId: c.candidateId,
  source: c.source, sourceManifestSha256: hash(Buffer.from(JSON.stringify(manifest.files))),
  sourceFiles: manifest.files.length, assetAnnexCount: c.assetAnnex.length,
  preparation: 'preparation.json', limit: 'Private installed dependency copy, not clean-install proof. Private Prisma regeneration required.' };
fs.writeFileSync(path.join(__dirname, 'candidate-admission.json'), JSON.stringify(result, null, 2), { flag: 'wx' });
console.log(JSON.stringify(result));
