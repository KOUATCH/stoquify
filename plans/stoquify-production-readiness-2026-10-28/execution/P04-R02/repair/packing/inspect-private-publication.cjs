// Actual repaired packer against the existing isolated asset mirror only.
// Original assets are not read, moved or served. No real build/DB/provider/deploy.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../../../../..');
const opening = path.resolve(__dirname, '../..');
const owned = path.join(root, '.codex-tmp/p04-r02-20261029-r1');
const mirror = path.join(owned, 'asset-mirror');
const destination = path.join(owned, 'private-publication-repair-01');
const { prepare, verify } = require(path.join(root, 'scripts/release-artifact.cjs'));
const inventoryPath = path.join(opening, 'asset-inventory.json');
const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const mirrorAssets = () => inventory.assets.map(asset => {
  assert.match(asset.path, /^public\/uploads\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+\.jpg$/);
  return { path: asset.path, sha256: hash(fs.readFileSync(path.join(mirror, asset.path))) };
});
(async () => {
  assert(!fs.existsSync(destination), 'Fresh isolated artifact destination required');
  const before = mirrorAssets();
  assert.deepEqual(before, inventory.assets.map(({ path: assetPath, sha256 }) => ({ path: assetPath, sha256 })));
  let stubBuildInvocations = 0;
  const artifact = await prepare(mirror, destination, { env: {}, sourceIdentity: mirrorAssets, runScript: async name => {
    assert.equal(name, 'build'); stubBuildInvocations++;
    assert.equal(fs.readFileSync(path.join(mirror, '.next/BUILD_ID'), 'utf8'), 'P04-R02-SYNTHETIC-PACKING');
    // Existing synthetic standalone structure is deliberately reused unchanged.
  } });
  const manifest = verify(mirror, destination, artifact.sha256, { sourceIdentity: mirrorAssets });
  assert.equal(stubBuildInvocations, 1);
  assert.equal(manifest.version, 2);
  assert.equal(manifest.legacyUploads.length, before.length);
  const privateAssets = before.map(asset => {
    const expectedDestination = `runtime/.private/uploads/${asset.path.slice('public/uploads/'.length)}`;
    const mapping = manifest.legacyUploads.find(entry => entry.source === asset.path);
    assert.deepEqual(mapping, { source: asset.path, destination: expectedDestination, sha256: asset.sha256 });
    const actualHash = hash(fs.readFileSync(path.join(destination, expectedDestination)));
    assert.equal(actualHash, asset.sha256);
    assert(manifest.files.some(file => file.path === expectedDestination && file.sha256 === asset.sha256));
    return mapping;
  });
  assert(!manifest.files.some(file => /(?:^|\/)public\/uploads\//i.test(file.path)));
  const privateHashes = new Set(before.map(asset => asset.sha256));
  assert(!manifest.files.some(file => !file.path.startsWith('runtime/.private/uploads/') && privateHashes.has(file.sha256)));
  assert.equal(fs.readFileSync(path.join(destination, 'runtime/.next/static/synthetic.txt'), 'utf8'), 'P04 synthetic static control');
  const after = mirrorAssets(); assert.deepEqual(after, before);
  const report = { at: new Date().toISOString(), harnessCompleted: true, packingAcceptancePassed: true, productionReleaseQualified: false,
    evidenceClass: 'actual repaired packer and verifier; existing isolated asset mirror; synthetic standalone; build invocation stubbed',
    buildExecuted: false, stubBuildInvocations, runtimeServed: false, originalAssetsRead: false, originalAssetsWritten: false,
    mirrorAssetsUnchanged: true, publicLegacyCopies: 0, renamedKnownPrivateCopies: 0, privateAssets, artifact,
    sourcePackerSha256: hash(fs.readFileSync(path.join(root, 'scripts/release-artifact.cjs'))),
    assetInventorySha256: hash(fs.readFileSync(inventoryPath)), harnessSha256: hash(fs.readFileSync(__filename)),
    limitations: ['Not a real standalone compilation', 'No real auth/session/browser/CDN behavior exercised', 'Original source asset preservation must be reconciled by the parent receipt; this runner reads only isolated copies'] };
  fs.writeFileSync(path.join(__dirname, 'private-publication.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ packingAcceptancePassed: true, assets: privateAssets.length, publicLegacyCopies: 0, artifactDigest: artifact.sha256 }));
})().catch(error => { console.error(error.message); process.exitCode = 1; });
