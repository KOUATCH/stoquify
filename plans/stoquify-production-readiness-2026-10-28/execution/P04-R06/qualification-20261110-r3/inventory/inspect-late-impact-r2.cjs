'use strict';
// Read-only targeted impact/metadata inspection after late refresh. Only two new E: receipts are written.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../../../../..');
const packet = path.resolve(__dirname, '..');
const prior = path.resolve(packet, '../qualification-20261110-r2');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const read = name => JSON.parse(fs.readFileSync(path.join(__dirname, name), 'utf8'));
const outputs = ['SOURCE-IMPACT-r2.json', 'PRIVATE-METADATA-DISPOSITION-r2.json'];
for (const name of outputs) assert(!fs.existsSync(path.join(__dirname, name)), 'Exclusive impact receipt already exists');
const admissionFile = path.join(packet, 'independent-review/LATE-SOURCE-IMPACT-RECIPE-ADMISSION.json');
const admission = JSON.parse(fs.readFileSync(admissionFile));
assert.equal(admission.passed, true);
assert(admission.files.some(row => row.path === 'inventory/inspect-late-impact-r2.cjs' && row.sha256 === hash(fs.readFileSync(__filename))));
for (const row of admission.files) assert.equal(hash(fs.readFileSync(path.resolve(packet, row.path))), row.sha256);
const manifestBytes = fs.readFileSync(path.join(__dirname, 'CURRENT-SOURCE-MANIFEST-r2.json'));
const manifest = JSON.parse(manifestBytes), refresh = read('SOURCE-REFRESH-r2.json');
assert.equal(hash(JSON.stringify(manifest.files)), manifest.identitySha256);
assert.equal(refresh.currentIdentitySha256, manifest.identitySha256);
const context = JSON.parse(fs.readFileSync(path.join(prior, 'candidate-context.json')));
const imports = text => [...new Set([...text.matchAll(/(?:from\s*|import\s*|require\s*\()\s*["']([^"']+)["']/g)].map(match => match[1]))].sort();
const sourceChanges = refresh.currentVsFrozen.filter(row => !row.path.startsWith('docs/')).map(row => {
  const currentFile = path.join(root, row.path), previous = path.join(context.source, row.path);
  const bytes = fs.existsSync(currentFile) ? fs.readFileSync(currentFile) : null;
  const currentHash = bytes ? hash(bytes) : null;
  const beforeImports = fs.existsSync(previous) ? imports(fs.readFileSync(previous, 'utf8')) : [];
  const afterImports = bytes ? imports(bytes.toString('utf8')) : [];
  return { ...row, currentSha256AtInspection: currentHash, stillMatchesRefresh: currentHash === row.afterSha256,
    inPreviouslyReviewedFinanceFamily: /^(actions\/finance\/|components\/finance\/|services\/(accounting|payments)\/)/.test(row.path),
    testInput: row.path.includes('/__tests__/'), importsBefore: beforeImports, importsAfter: afterImports,
    importsAdded: afterImports.filter(name => !beforeImports.includes(name)), importsRemoved: beforeImports.filter(name => !afterImports.includes(name)) };
});
const selected = read('SELECTED-INPUTS-REFRESH-r2.json');
const criticalBindings = selected.files.map(row => {
  const file = path.join(root, row.path), sha256 = fs.existsSync(file) ? hash(fs.readFileSync(file)) : null;
  return { path: row.path, sha256, expectedSha256: row.currentSha256, matches: sha256 === row.currentSha256 };
});
const privatePattern = /private[-_. ]*fixture|fixture[-_. ]*private/i;
const metadataRows = manifest.files.filter(row => row.path.endsWith('.json') && privatePattern.test(path.posix.basename(row.path))).map(row => {
  const file = path.join(root, row.path), bytes = fs.existsSync(file) ? fs.readFileSync(file) : null;
  const result = { path: row.path, sha256: bytes ? hash(bytes) : null, manifestSha256: row.sha256,
    stillMatchesManifest: !!bytes && hash(bytes) === row.sha256, metadataOnly: false, externalReferencedFilesRead: false,
    underDocs: row.path.startsWith('docs/'), underPublic: row.path.startsWith('public/') };
  let value;
  try { value = JSON.parse(bytes); } catch { return { ...result, classification: 'Unclassified JSON/missing file; review required', parseable: false }; }
  const plain = object => !!object && typeof object === 'object' && !Array.isArray(object);
  const namedReference = item => plain(item) && Object.keys(item).sort().join(',') === 'bytes,path,sha256' &&
    typeof item.path === 'string' && path.isAbsolute(item.path) && /^[a-f0-9]{64}$/.test(item.sha256) && Number.isInteger(item.bytes) && item.bytes >= 0;
  const topAllowed = plain(value) && ['bytes,path,sha256', 'bytes,packs,path,sha256'].includes(Object.keys(value).sort().join(','));
  const topReference = topAllowed && namedReference({ path: value.path, sha256: value.sha256, bytes: value.bytes });
  const packs = topAllowed && value.packs === undefined ? [] : value?.packs;
  const valid = topAllowed && topReference && Array.isArray(packs) && packs.every(namedReference);
  return { ...result, metadataOnly: valid, parseable: true,
    classification: valid ? 'Metadata only: external fixture/pack path, SHA256 and byte length; no embedded records or credentials' : 'Unclassified shape; independent review required before candidate capture',
    safeShape: { permittedTopLevelKeys: topAllowed ? Object.keys(value).sort() : null,
      packCount: Array.isArray(packs) ? packs.length : null, referenceShapeValid: !!valid, rawReferenceValuesPublished: false } };
});
const metadata = { at: new Date().toISOString(), sourceManifest: { path: 'CURRENT-SOURCE-MANIFEST-r2.json', sha256: hash(manifestBytes), identitySha256: manifest.identitySha256 },
  selection: 'Every .json basename matching private[-_. ]*fixture or fixture[-_. ]*private, case-insensitive, in the full current source manifest. Content-based discovery of arbitrarily named secret files is outside this bounded check.',
  files: metadataRows, metadataOnly: metadataRows.length > 0 && metadataRows.every(row => row.metadataOnly),
  allMetadataStillMatchesManifest: metadataRows.every(row => row.stillMatchesManifest), externalReferencedFilesRead: false,
  artifactRequirement: 'Preserve all source metadata receipts; runtime owner produces an exact path/hash policy and verifies sealed runtime/public/static excludes the receipts and external referenced fixtures/packs. No referenced private file is opened by this inspection.',
  classificationBlockers: metadataRows.filter(row => !row.metadataOnly || !row.stillMatchesManifest).map(row => row.path) };
const impact = { at: new Date().toISOString(), sourceManifest: metadata.sourceManifest,
  sourceRefreshSha256: hash(fs.readFileSync(path.join(__dirname, 'SOURCE-REFRESH-r2.json'))),
  previousImpactSha256: hash(fs.readFileSync(path.join(__dirname, 'SOURCE-IMPACT-r1.json'))),
  sourceChanges, allNonDocChangesStillMatch: sourceChanges.every(row => row.stillMatchesRefresh),
  criticalBindings, selected68StillMatch: criticalBindings.length === 68 && criticalBindings.every(row => row.matches),
  unexpectedChangedFamilies: sourceChanges.filter(row => !row.inPreviouslyReviewedFinanceFamily).map(row => row.path),
  changedVsPriorRefresh: refresh.currentVsPreviousRefresh,
  metadataDisposition: { path: 'PRIVATE-METADATA-DISPOSITION-r2.json', sha256: hash(JSON.stringify(metadata, null, 2) + '\n') },
  scope: 'Bounded import/configuration and metadata change evidence only; no behavior approval. Existing finance/profile classification is inherited only when source families/imports permit independent reviewer confirmation.',
  limits: ['This is a targeted check after the late full-source scan, not another whole-root scan.', 'Any new drift or unexpected family requires review before candidate capture.',
    'Application/browser/database/build execution is absent; actual runtime owner still performs source equality checks and qualification.'], qualificationPassed: false };
for (const [name, value] of [[outputs[0], impact], [outputs[1], metadata]]) fs.writeFileSync(path.join(__dirname, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ selected68StillMatch: impact.selected68StillMatch, allNonDocChangesStillMatch: impact.allNonDocChangesStillMatch,
  unexpectedChangedFamilies: impact.unexpectedChangedFamilies, privateMetadataFiles: metadataRows.length,
  metadataOnly: metadata.metadataOnly, classificationBlockers: metadata.classificationBlockers }));
