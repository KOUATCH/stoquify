'use strict';
// Bounded config selection and metadata classification only. Never creates a compiler program or opens referenced private files.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../../../../..'), packet = path.resolve(__dirname, '..');
const prior = path.resolve(packet, '../qualification-20261110-r2');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const outNames = ['PRIVATE-METADATA-DISPOSITION-r3.json', 'SOURCE-DELTA-CLASSIFICATION-r3.json'];
for (const name of outNames) assert(!fs.existsSync(path.join(__dirname, name)));
const recipe = read(path.join(packet, 'independent-review/LATE-DELTA-CLASSIFICATION-RECIPE-ADMISSION.json'));
assert(recipe.passed && recipe.files.some(row => row.path === 'inventory/classify-late-delta-r3.cjs' && row.sha256 === hash(fs.readFileSync(__filename))));
for (const row of recipe.files) assert.equal(hash(fs.readFileSync(path.resolve(packet, row.path))), row.sha256);
const manifest = read(path.join(__dirname, 'CURRENT-SOURCE-MANIFEST-r2.json'));
const previousMetadata = read(path.join(__dirname, 'PRIVATE-METADATA-DISPOSITION-r2.json'));
const rows = previousMetadata.files.map(row => {
  const bytes = fs.readFileSync(path.join(root, row.path)), value = JSON.parse(bytes);
  assert.equal(hash(bytes), row.manifestSha256);
  assert.deepEqual(Object.keys(value).sort(), ['bytes', 'packs', 'path', 'sha256']);
  function reference(item, withKind) {
    assert.deepEqual(Object.keys(item).sort(), withKind ? ['bytes', 'kind', 'path', 'sha256'] : ['bytes', 'path', 'sha256']);
    assert(typeof item.path === 'string' && path.isAbsolute(item.path));
    assert(/^[a-f0-9]{64}$/.test(item.sha256) && Number.isInteger(item.bytes) && item.bytes >= 0);
    if (withKind) assert(['first', 'final'].includes(item.kind), 'Only producer-defined first/final metadata labels admitted');
  }
  reference({ path: value.path, sha256: value.sha256, bytes: value.bytes }, false);
  assert(Array.isArray(value.packs));
  const withKinds = value.packs.some(item => Object.hasOwn(item, 'kind'));
  for (const pack of value.packs) reference(pack, withKinds);
  if (withKinds) assert.deepEqual(value.packs.map(item => item.kind).sort(), ['final', 'first']);
  return { path: row.path, sha256: row.manifestSha256, metadataOnly: true, externalReferencedFilesRead: false,
    safeShape: { topLevelKeys: ['path', 'sha256', 'bytes', 'packs'], packCount: value.packs.length,
      packKeys: withKinds ? ['kind', 'path', 'sha256', 'bytes'] : ['path', 'sha256', 'bytes'],
      kindLabels: withKinds ? ['first', 'final'] : [], rawReferenceValuesPublished: false },
    classification: 'External fixture/pack metadata only; no embedded records or credentials', stillMatchesManifest: true };
});
const producer = 'docs/stoquify-potential/development/close-production-prep-2026-11-09/earned-close/pg-earned-close-qualification.cjs';
const metadata = { ...previousMetadata, at: new Date().toISOString(), previousDispositionSha256: hash(fs.readFileSync(path.join(__dirname, 'PRIVATE-METADATA-DISPOSITION-r2.json'))),
  files: rows, metadataOnly: true, allMetadataStillMatchesManifest: true, classificationBlockers: [],
  reviewedExtension: { producerPath: producer, producerSha256: hash(fs.readFileSync(path.join(root, producer))),
    sourceLines: '112-117: literal first/final prefixes become pack.kind; other fields are path/digest/stat-size metadata',
    scope: 'Admits exactly the inspected first/final kind metadata labels; no general arbitrary-key exception.' } };
const beforeBytes = fs.readFileSync('D:/p04-r06-fullapp-20261110-r2/source/tsconfig.json');
const afterBytes = fs.readFileSync(path.join(root, 'tsconfig.json'));
const before = JSON.parse(beforeBytes), after = JSON.parse(afterBytes);
assert.equal(hash(afterBytes), manifest.files.find(row => row.path === 'tsconfig.json').sha256);
assert.deepEqual({ ...before, exclude: undefined }, { ...after, exclude: undefined });
assert.deepEqual(after.exclude.filter(item => !before.exclude.includes(item)), ['plans/**/source-before/**']);
assert.deepEqual(before.exclude.filter(item => !after.exclude.includes(item)), []);
const listing = execFileSync('rg', ['--files', 'plans', '-g', '**/source-before/**', '-g', '!**/node_modules/**', '-g', '!**/.next/**'], { cwd: root, windowsHide: true, encoding: 'utf8', maxBuffer: 5e6 });
const preserved = listing.split(/\r?\n/).filter(Boolean).map(name => name.replaceAll('\\', '/')).filter(name => /\.(tsx?|jsx?)$/.test(name));
// Use the installed compiler's filename matcher with a synthetic, bounded directory index only.
const tsPath = path.join(root, 'node_modules/typescript/lib/typescript.js'), ts = require(tsPath);
const rootPosix = root.replaceAll('\\', '/');
function selection(inputFiles, config) {
  const entries = new Map();
  const get = directory => { if (!entries.has(directory)) entries.set(directory, { files: new Set(), directories: new Set() }); return entries.get(directory); };
  for (const name of inputFiles) {
    const segments = name.split('/'); let directory = rootPosix;
    for (let index = 0; index < segments.length - 1; index++) { get(directory).directories.add(segments[index]); directory += '/' + segments[index]; }
    get(directory).files.add(segments.at(-1));
  }
  return ts.matchFiles(rootPosix, ['.ts', '.tsx', '.js', '.jsx'], config.exclude, config.include, true, rootPosix, undefined,
    directory => { const entry = entries.get(directory.replaceAll('\\', '/')); return { files: entry ? [...entry.files] : [], directories: entry ? [...entry.directories] : [] }; },
    filename => filename).map(filename => filename.slice(rootPosix.length + 1)).sort();
}
const beforeSelection = selection(preserved, before), afterSelection = selection(preserved, after);
const newlyExcluded = beforeSelection.filter(name => !afterSelection.includes(name)).map(name => ({ path: name, sha256: hash(fs.readFileSync(path.join(root, name))) }));
const candidateBefore = selection(manifest.files.map(row => row.path), before), candidateAfter = selection(manifest.files.map(row => row.path), after);
assert.deepEqual(candidateAfter, candidateBefore, 'Exact candidate filename selection must not change');
assert.equal(manifest.files.filter(row => row.path.startsWith('plans/')).length, 0);
const refreshedPaths = read(path.join(__dirname, 'SOURCE-IMPACT-r2.json')).sourceChanges;
const currentBindings = refreshedPaths.map(row => ({ path: row.path, expectedSha256: row.afterSha256,
  sha256: fs.existsSync(path.join(root, row.path)) ? hash(fs.readFileSync(path.join(root, row.path))) : null }));
const result = { at: new Date().toISOString(), sourceIdentitySha256: manifest.identitySha256,
  currentBindings, allInspectedChangesStillMatch: currentBindings.every(row => row.sha256 === row.expectedSha256),
  config: { path: 'tsconfig.json', beforeSha256: hash(beforeBytes), afterSha256: hash(afterBytes), onlyAddedExclude: 'plans/**/source-before/**',
    compilerOptionsAndAllOtherConfigurationUnchanged: true, boundedWorkspaceSelection: { consideredPreservedSourceFiles: preserved.length,
      selectedBefore: beforeSelection.length, selectedAfter: afterSelection.length, newlyExcluded },
    candidateSelection: { plansFiles: 0, beforeCount: candidateBefore.length, afterCount: candidateAfter.length,
      unchanged: true, selectedPathsSha256: hash(JSON.stringify(candidateBefore)) },
    selectionOnly: true, compilerProgramCreated: false, typecheckOrBuildExecuted: false, compilerMatcherSha256: hash(fs.readFileSync(tsPath)) },
  mockedUnitApplicability: { configPath: '../qualification-20261110-r2/unit/jest.config.cjs', configSha256: hash(fs.readFileSync(path.join(prior, 'unit/jest.config.cjs'))),
    inspectedNextJestSha256: hash(fs.readFileSync(path.join(root, 'node_modules/next/dist/build/jest/jest.js'))),
    finding: 'Unit config invokes next/jest() without options.dir, sets roots to lib/security and explicit testMatch. Installed Next only loads next config/jsconfig inside options.dir. This new plans-only exclusion does not change that mocked unit selection; no unit rerun or new unit claim is made.' },
  posImpact: { sourcePath: 'services/pos/pos.service.ts', testPath: 'services/pos/__tests__/pos.service.test.ts',
    finding: 'Concurrent POS commit imports isPOSElectronicTenderMethod and lockElectronicTenderAuthoritiesInTx from the existing payment-authority module. It moves native proof resolution after sale/shift/cart admission and before stock/event publication, acquiring sorted, tenant-scoped payment row locks. Tests add mock SQL and ordering/no-receipt/cash cases. No new package, schema or R06 guard input; financial concurrency behavior is not certified by R06.' },
  metadataDisposition: { path: outNames[0], sha256: hash(JSON.stringify(metadata, null, 2) + '\n') },
  limits: ['Selected68 did not include tsconfig; this separate exact config comparison supplies that missing binding.',
    'Root historical-copy selection is explicitly reduced. Candidate source has no plans tree and its configured filename selection is unchanged.',
    'Independent actual-source/capture admission remains required; preserved finance/POS edits are not reverted or certified.'], qualificationPassed: false };
fs.writeFileSync(path.join(__dirname, outNames[0]), JSON.stringify(metadata, null, 2) + '\n', { flag: 'wx' });
fs.writeFileSync(path.join(__dirname, outNames[1]), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ metadataFiles: rows.length, metadataOnly: true, newlyExcluded: newlyExcluded.length,
  candidateSelected: candidateBefore.length, candidateSelectionUnchanged: true, allInspectedChangesStillMatch: result.allInspectedChangesStillMatch }));
