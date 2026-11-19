// Read-only source/storage inspection; writes evidence only. Never loads application configuration.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../../../..');
const { capture } = require(path.join(root, 'scripts/candidate-snapshot.cjs'));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const out = path.join(__dirname, 'resume-2026-11-02');
assert(!fs.existsSync(out), 'Preserve an existing inspection');
fs.mkdirSync(out);
const snapshot = capture(root);
const files = snapshot.files.map(({ content, ...entry }) => entry);
const prior = JSON.parse(fs.readFileSync(path.join(__dirname, 'root-source-manifest.json')));
const old = new Map(prior.files.map(f => [f.path, f.sha256]));
const now = new Map(files.map(f => [f.path, f.sha256]));
const drift = {
  added: files.filter(f => !old.has(f.path)).map(f => f.path),
  changed: files.filter(f => old.has(f.path) && old.get(f.path) !== f.sha256).map(f => f.path),
  removed: prior.files.filter(f => !now.has(f.path)).map(f => f.path),
};
const owned = JSON.parse(fs.readFileSync(path.join(__dirname, '../repair/owned-source-final.json')))
  .map(f => ({ path: f.path, expectedSha256: f.sha256, sha256: now.get(f.path) || null, unchanged: now.get(f.path) === f.sha256 }));
const inventory = JSON.parse(fs.readFileSync(path.join(__dirname, '../asset-inventory.json')));
const assets = inventory.assets.map(a => {
  const original = fs.readFileSync(path.join(root, a.path));
  const mirror = fs.readFileSync(a.isolatedCopy);
  return { path: a.path, sha256: hash(original), bytes: original.length,
    originalPreserved: hash(original) === a.sha256, mirrorPreserved: hash(mirror) === a.sha256 };
});
function list(dir, prefix = '') {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const relative = prefix + e.name;
    if (e.isDirectory()) return list(path.join(dir, e.name), relative + '/');
    assert(e.isFile(), 'Unexpected asset link or file type');
    return [relative];
  }).sort();
}
const inventoryMatches = JSON.stringify(list(path.join(root, 'public/uploads'))) ===
  JSON.stringify(inventory.assets.map(a => a.relativeUploadPath).sort());
const volumes = ['C:/', 'D:/', 'E:/'].map(drive => {
  try { const s = fs.statfsSync(drive); return { drive, available: true, freeBytes: Number(s.bavail) * Number(s.bsize) }; }
  catch (e) { return { drive, available: false, errorCode: e.code }; }
});
const result = {
  at: new Date().toISOString(), sourceHead: snapshot.head, files: files.length,
  sourceManifestSha256: hash(Buffer.from(JSON.stringify(files))), drift,
  repairedInputs: owned, assets, originalInventoryMatches: inventoryMatches,
  volumes, reviewedMinimumFreeBytes: 12 * 1024 ** 3,
  priorIsolatedStorageAvailable: fs.existsSync('D:/Codex-Stoquify-P04-R02-20261029-01a1816a/ownership.json'),
  buildExecuted: false, realSessionBrowserExecuted: false,
  status: 'blocked', blocker: 'Reviewed isolated build storage unavailable or below required free space',
  limit: 'Source metadata and asset hashes only; no new immutable build candidate, artifact, session or browser qualification.',
};
fs.writeFileSync(path.join(out, 'current-source-manifest.json'), JSON.stringify({ ...snapshot, files }, null, 2));
fs.writeFileSync(path.join(out, 'inspection.json'), JSON.stringify(result, null, 2));
fs.writeFileSync(path.join(out, 'git-status.txt'), execFileSync('git', ['status', '--short'], { cwd: root, maxBuffer: 30e6 }));
console.log(JSON.stringify({ status: result.status, files: result.files, drift, repairedInputsStable: owned.every(f => f.unchanged),
  originalsAndMirrorsPreserved: inventoryMatches && assets.every(a => a.originalPreserved && a.mirrorPreserved), volumes }));
