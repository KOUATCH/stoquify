'use strict';
// One short-lived read-only full/selected source comparison. Writes only exclusive evidence in this resume directory.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const packet = path.resolve(__dirname, '../..'), root = path.resolve(packet, '../../../../..');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const readPacket = name => JSON.parse(fs.readFileSync(path.join(packet, name)));
const names = ['CURRENT-SOURCE-MANIFEST.json', 'SELECTED-INPUTS-REFRESH.json', 'SOURCE-RESUME-RESULT.json', 'SOURCE-SIZES.json'];
for (const name of names) assert(!fs.existsSync(path.join(__dirname, name)), 'Exclusive source-resume receipt already exists');
assert.equal(process.argv.length, 2);
const reviewPath = path.join(packet, 'independent-review/SOURCE-RESUME-RECIPE-ADMISSION-20261110-r1.json');
const reviewBytes = fs.readFileSync(reviewPath), review = JSON.parse(reviewBytes);
assert(review.passed && review.files.some(row => row.path === 'inventory/resume-20261110-r1/refresh-resume-source.cjs' && row.sha256 === hash(fs.readFileSync(__filename))));
for (const row of review.files) assert.equal(hash(fs.readFileSync(path.resolve(packet, row.path))), row.sha256, 'Reviewed resume source input changed: ' + row.path);
const capacityName = 'resource-capture-retry-ready-r2.json', capacityBytes = fs.readFileSync(path.join(packet, capacityName));
const capacity = JSON.parse(capacityBytes);
assert.equal(capacity.passed, true, 'Passing current capacity observation must precede this full scan');
const baselineName = 'inventory/CURRENT-SOURCE-MANIFEST-r2.json', baselineBytes = fs.readFileSync(path.join(packet, baselineName));
assert.equal(hash(baselineBytes), '4170c529d7dab4e61e3c7503d7adbff56a23e1d1dbb95f0203eac189693f9699');
const baseline = JSON.parse(baselineBytes);
assert.equal(baseline.files.length, 9942);
assert.equal(hash(JSON.stringify(baseline.files)), '4ea56948b133706d3dc0531852f7dd37da41f40bb6968604e822dae3bb10ac74');
const selectorPath = path.join(root, 'scripts/candidate-snapshot.cjs');
assert.equal(hash(fs.readFileSync(selectorPath)), 'e60e513a6aadc490a72821bdcd371fdb2f2c1c0589ed2e392cf10c6a33ca6d46');
const { included } = require(selectorPath); // Inspected inert filename predicate; capture/restore/main are not called.
const roots = new Set(['actions', 'app', 'components', 'config', 'hooks', 'i18n', 'lib', 'messages', 'prisma', 'public', 'services', 'src', 'types', 'validations', '_legacy-dashboard', 'tests', '__tests__', 'scripts', 'docs', 'design-system', '.github', 'vendor']);
const startedAt = new Date().toISOString();
const git = args => execFileSync('git', args, { cwd: root, windowsHide: true, maxBuffer: 30e6 }).toString();
const headBefore = git(['rev-parse', 'HEAD']).trim();
const top = fs.readdirSync(root, { withFileTypes: true });
const selectors = top.filter(entry => entry.isDirectory() ? roots.has(entry.name) : included(entry.name)).map(entry => entry.name);
const paths = [...new Set(git(['ls-files', '--cached', '--others', '--exclude-standard', '-z', '--', ...selectors]).split('\0').filter(Boolean))].sort();
const files = [], sizes = [], excluded = [];
for (const name of paths) {
  const file = path.join(root, name);
  if (!fs.existsSync(file) || !included(name)) { excluded.push(name); continue; }
  assert(fs.lstatSync(file).isFile(), 'Source selection must contain regular files only');
  const bytes = fs.readFileSync(file), sha256 = hash(bytes);
  files.push({ path: name, sha256 });
  sizes.push({ path: name, sha256, bytes: bytes.length, estimatedAllocatedBytes: Math.ceil(bytes.length / 4096) * 4096 });
}
const headAfter = git(['rev-parse', 'HEAD']).trim();
const selectedBaseName = 'inventory/SELECTED-INPUTS-REFRESH-r2.json', selectedBase = readPacket(selectedBaseName);
assert.equal(selectedBase.files.length, 68);
const selected = { at: new Date().toISOString(), baselinePath: selectedBaseName,
  baselineSha256: hash(fs.readFileSync(path.join(packet, selectedBaseName))), files: selectedBase.files.map(row => {
    const file = path.join(root, row.path), bytes = fs.existsSync(file) ? fs.readFileSync(file) : null;
    const actual = { path: row.path, expectedSha256: row.currentSha256, sha256: bytes ? hash(bytes) : null, bytes: bytes?.length ?? null };
    return { ...actual, matches: actual.sha256 === row.currentSha256 && actual.bytes === row.bytes };
  }) };
selected.all68Match = selected.files.every(row => row.matches);
const before = new Map(baseline.files.map(row => [row.path, row.sha256])), after = new Map(files.map(row => [row.path, row.sha256]));
const delta = [...new Set([...before.keys(), ...after.keys()])].sort().filter(name => before.get(name) !== after.get(name)).map(name => ({
  path: name, beforeSha256: before.get(name) ?? null, afterSha256: after.get(name) ?? null,
  kind: !before.has(name) ? 'added' : !after.has(name) ? 'removed' : 'modified' }));
const manifest = { at: new Date().toISOString(), head: headAfter, files, excluded, identitySha256: hash(JSON.stringify(files)),
  selectorSha256: hash(fs.readFileSync(selectorPath)), sourceBodiesRetained: false };
const sizeReceipt = { at: new Date().toISOString(), sourceManifest: { path: names[0], sha256: hash(JSON.stringify(manifest, null, 2) + '\n'), identitySha256: manifest.identitySha256 },
  files: sizes, allocationUnitBytes: 4096, contentBytes: sizes.reduce((sum, row) => sum + row.bytes, 0),
  estimatedAllocatedBytes: sizes.reduce((sum, row) => sum + row.estimatedAllocatedBytes, 0),
  limits: ['Same-read file-size estimate only; no metadata/directory/dependency/archive/build reserve included.'] };
const result = { schemaVersion: 1, startedAt, finishedAt: new Date().toISOString(), packageId: 'P04-R06', qualification: '20261110-r3',
  sourceBaseline: { path: baselineName, sha256: hash(baselineBytes), identitySha256: baseline.identitySha256, files: baseline.files.length },
  recipeAdmissionSha256: hash(reviewBytes), scriptSha256: hash(fs.readFileSync(__filename)),
  capacity: { path: capacityName, sha256: hash(capacityBytes), passed: true }, headBefore, headAfter, baselineHead: baseline.head,
  headUnchanged: headBefore === headAfter && headAfter === baseline.head,
  currentFiles: files.length, currentIdentitySha256: manifest.identitySha256, currentSourceMatchesBaseline: delta.length === 0,
  selected68Match: selected.all68Match, delta,
  additionalCritical: ['tsconfig.json', 'next.config.mjs', 'package.json', 'package-lock.json', 'prisma/schema.prisma'].map(name => ({
    path: name, beforeSha256: before.get(name) ?? null, sha256: after.get(name) ?? null, matches: before.get(name) === after.get(name) })),
  privateMetadataPaths: files.filter(row => row.path.endsWith('.json') && /private[-_. ]*fixture|fixture[-_. ]*private/i.test(path.posix.basename(row.path))),
  unchangedPriorMetadataPolicySha256: hash(fs.readFileSync(path.join(packet, 'inventory/private-metadata-policy.json'))),
  candidateWrites: false, databaseAccess: false, applicationExecution: false, buildExecution: false, qualificationPassed: false,
  limits: ['Observed read interval is not an atomic snapshot; candidate retry must independently recheck exact source/HEAD and current capacity.',
    'Any delta requires a named successor impact/capture binding and independent review; old E31 receipts remain immutable.',
    'No node_modules subtree traversal: only exact68 selected installed/source inputs read. No source bytes or private file contents published.'] };
for (const [name, value] of [[names[0], manifest], [names[1], selected], [names[2], result], [names[3], sizeReceipt]]) fs.writeFileSync(path.join(__dirname, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ currentFiles: result.currentFiles, currentIdentitySha256: result.currentIdentitySha256, headUnchanged: result.headUnchanged,
  selected68Match: result.selected68Match, currentSourceMatchesBaseline: result.currentSourceMatchesBaseline,
  deltaCounts: Object.fromEntries(['added', 'modified', 'removed'].map(kind => [kind, delta.filter(row => row.kind === kind).length])),
  nonDocumentationDelta: delta.filter(row => !row.path.startsWith('docs/')), privateMetadataFiles: result.privateMetadataPaths.length }));
