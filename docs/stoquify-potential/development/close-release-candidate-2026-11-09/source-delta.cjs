// Compare retained source identities only; no application or database execution.
const fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '../../../..');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const before = read(path.join(root, 'docs/stoquify-potential/development/migration-release-2026-11-09/CANDIDATE_SOURCE_MANIFEST.json'));
const after = read(path.join(__dirname, 'CANDIDATE_SOURCE_MANIFEST.json'));
const old = new Map(before.files.map(file => [file.path, file.sha256])), current = new Map(after.files.map(file => [file.path, file.sha256]));
const changes = [...new Set([...old.keys(), ...current.keys()])].sort().filter(file => old.get(file) !== current.get(file)).map(file => ({ path: file, before: old.get(file) || null, after: current.get(file) || null }));
const applicationChanges = changes.filter(file => !file.path.startsWith('docs/'));
const result = { beforeSourceManifestSha256: before.manifestSha256, currentSourceManifestSha256: after.manifestSha256,
  applicationChanges, evidenceChanges: changes.filter(file => file.path.startsWith('docs/')), limitation: 'Identity comparison; behavioral verification is separately recorded.' };
fs.writeFileSync(path.join(__dirname, 'SOURCE_DELTA.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ applicationChanges, evidenceChangeCount: result.evidenceChanges.length }));
