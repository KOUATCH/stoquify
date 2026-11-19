'use strict';
// Read-only source/receipt inspection. Writes only four exclusive successor inventory JSONs.
// Does not import application/DB helpers, execute a build, open network sockets or traverse dependencies.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../../../../..');
const prior = path.resolve(__dirname, '../../qualification-20261110-r2');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const read = name => JSON.parse(fs.readFileSync(path.join(prior, name), 'utf8'));
const binding = name => ({ path: name, sha256: hash(fs.readFileSync(path.join(prior, name))) });
const start = new Date().toISOString();
const selectorHash = hash(fs.readFileSync(path.join(root, 'scripts/candidate-snapshot.cjs')));
assert.equal(selectorHash, 'e60e513a6aadc490a72821bdcd371fdb2f2c1c0589ed2e392cf10c6a33ca6d46');
// Import only the inspected inert filename predicate; never call its capture/restore CLI.
const { included } = require(path.join(root, 'scripts/candidate-snapshot.cjs'));
const roots = new Set(['actions', 'app', 'components', 'config', 'hooks', 'i18n', 'lib', 'messages', 'prisma', 'public', 'services', 'src', 'types', 'validations', '_legacy-dashboard', 'tests', '__tests__', 'scripts', 'docs', 'design-system', '.github', 'vendor']);
const top = fs.readdirSync(root, { withFileTypes: true });
const selectors = top.filter(entry => entry.isDirectory() ? roots.has(entry.name) : included(entry.name)).map(entry => entry.name);
const git = args => execFileSync('git', args, { cwd: root, windowsHide: true, maxBuffer: 30e6 }).toString();
const paths = [...new Set(git(['ls-files', '--cached', '--others', '--exclude-standard', '-z', '--', ...selectors]).split('\0').filter(Boolean))].sort();
const excluded = [];
const files = [];
for (const name of paths) {
  const absolute = path.join(root, name);
  if (!fs.existsSync(absolute) || !included(name)) { excluded.push(name); continue; }
  assert(fs.lstatSync(absolute).isFile(), 'Source selection must contain regular files only: ' + name);
  const bytes = fs.readFileSync(absolute);
  files.push({ path: name, sha256: hash(bytes) });
}
const current = { at: new Date().toISOString(), head: git(['rev-parse', 'HEAD']).trim(), files,
  identitySha256: hash(JSON.stringify(files)), sourceSelectorSha256: selectorHash, enumeration: 'Same inspected candidate-snapshot predicate and root selectors; git ls-files --cached --others --exclude-standard; no generated/dependency subtrees', excluded };
const baseline = read('candidate-source-manifest.json');
const atCapacity = read('independent-review/CURRENT-SOURCE-MANIFEST-at-capacity.json');
function delta(before, after) {
  const a = new Map(before.map(row => [row.path, row.sha256])), b = new Map(after.map(row => [row.path, row.sha256]));
  return [...new Set([...a.keys(), ...b.keys()])].sort().filter(name => a.get(name) !== b.get(name)).map(name => ({
    path: name, beforeSha256: a.get(name) ?? null, afterSha256: b.get(name) ?? null,
    kind: !a.has(name) ? 'added' : !b.has(name) ? 'removed' : 'modified',
  }));
}
const selectedBaseline = read('inventory/source-after-manifest.json');
assert.equal(binding('inventory/source-after-manifest.json').sha256, 'e535b2e9cb694d09b67d64706e9fbbe2f89ac829b2297c86120ca83d012ac614');
assert.equal(selectedBaseline.files.length, 68);
const context = read('candidate-context.json');
const selected = { at: new Date().toISOString(), baseline: binding('inventory/source-after-manifest.json'), files: selectedBaseline.files.map(row => {
  const file = path.join(root, row.path), frozen = path.join(context.source, row.path);
  const bytes = fs.existsSync(file) ? fs.readFileSync(file) : null;
  const frozenBytes = fs.existsSync(frozen) ? fs.readFileSync(frozen) : null;
  const result = { path: row.path, beforeSha256: row.sha256, currentSha256: bytes ? hash(bytes) : null,
    bytes: bytes?.length ?? null, frozenCandidateSha256: frozenBytes ? hash(frozenBytes) : null };
  return { ...result, currentMatches: result.currentSha256 === row.sha256 && result.bytes === row.bytes,
    candidateMatches: result.frozenCandidateSha256 === row.sha256 };
}) };
selected.all68CurrentMatch = selected.files.every(row => row.currentMatches);
selected.all68CandidateMatch = selected.files.every(row => row.candidateMatches);

const migrationFiles = files.filter(row => /^prisma\/migrations\/[^/]+\/migration\.sql$/.test(row.path));
const migrationRows = migrationFiles.map(row => ({ name: row.path.split('/')[2], sha256: row.sha256 })).sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
const schema = files.find(row => row.path === 'prisma/schema.prisma');
const migrationLock = files.find(row => row.path === 'prisma/migrations/migration_lock.toml');
const suspended = read('database/capacity-suspension.json');
const fixturePrivate = path.join(context.storage, 'private/browser-fixture.private.json');
const fixtureSha256 = hash(fs.readFileSync(fixturePrivate));
const admissionFiles = fs.readdirSync(path.join(prior, 'independent-review')).filter(name => name.endsWith('.json'));
const admitted = admissionFiles.flatMap(name => {
  const value = read('independent-review/' + name);
  if (value.passed !== true || !Array.isArray(value.files)) return [];
  return value.files.filter(row => typeof row.path === 'string' && typeof row.sha256 === 'string').map(row => ({
    path: path.isAbsolute(row.path) ? path.relative(prior, row.path).replaceAll('\\', '/') : row.path,
    sha256: row.sha256, admission: 'independent-review/' + name, admissionSha256: binding('independent-review/' + name).sha256,
  }));
});
const helperPaths = fs.readdirSync(path.join(prior, 'database')).filter(name => name.endsWith('.cjs')).map(name => 'database/' + name)
  .concat(['runtime/run-origin-probes.cjs', 'runtime/run-credential-probes.cjs', 'runtime/run-protected-core.cjs', 'runtime/run-retained-expiry.cjs',
    'runtime/runtime-bridge-v2.cjs', 'runtime/qualification-contract.json', 'browser/OBSERVER-SOURCE-MANIFEST-r3.json', 'browser/CONSUMER-MAP.json']);
const helperBindings = helperPaths.map(name => {
  const row = binding(name), provenance = admitted.filter(entry => entry.path === name && entry.sha256 === row.sha256);
  return { ...row, matchingIndependentAdmissions: provenance.map(({ admission, admissionSha256 }) => ({ path: admission, sha256: admissionSha256 })) };
});
const browserObserverBindings = read('browser/OBSERVER-SOURCE-MANIFEST-r3.json').files.map(row => {
  const actual = binding('browser/' + row.path);
  return { ...actual, admittedSha256: row.sha256, matches: actual.sha256 === row.sha256 };
});
// Find suspension's nested continuity values without publishing private fixture contents.
const occurrences = key => { const values = []; function visit(value) { if (!value || typeof value !== 'object') return;
  for (const [name, child] of Object.entries(value)) { if (name === key) values.push(child); visit(child); } }
  visit(suspended); return [...new Set(values)]; };
const compatibility = { at: new Date().toISOString(), schema, migrationLock, migrations: migrationRows,
  migrationCount: migrationRows.length, migrationsSha256: hash(JSON.stringify(migrationRows)),
  baselineSchema: baseline.files.find(row => row.path === schema.path),
  schemaMatchesFrozen: baseline.files.find(row => row.path === schema.path)?.sha256 === schema.sha256,
  migrationDelta: delta(baseline.files.filter(row => /^prisma\/migrations\//.test(row.path)), files.filter(row => /^prisma\/migrations\//.test(row.path))),
  suspension: binding('database/capacity-suspension.json'),
  suspensionSchemaHashes: occurrences('schemaSourceSha256'), suspensionMigrationHashes: occurrences('migrationsSha256'),
  privateFixture: { path: fixturePrivate, sha256: fixtureSha256, suspensionHashes: occurrences('fixtureSha256'), contentsPublished: false },
  packageInputs: ['package.json', 'package-lock.json', 'next.config.mjs', 'tsconfig.json'].map(name => ({ path: name,
    sha256: files.find(row => row.path === name)?.sha256 ?? null, baselineSha256: baseline.files.find(row => row.path === name)?.sha256 ?? null })),
  helperBindings, browserObserverBindings,
  limits: ['Source compatibility only; no database was started, queried, resumed or changed.',
    'Actual retained-cluster ownership/logical-state continuity and successor fixture binding require separately admitted runtime-owner receipts.',
    'Installed dependencies were not recursively traversed or rehashed; only exact selected installed inputs were read.'] };
compatibility.schemaMigrationFixtureCompatible = compatibility.schemaMatchesFrozen && migrationRows.length === 122 && compatibility.migrationDelta.length === 0 &&
  compatibility.suspensionSchemaHashes.length > 0 && compatibility.suspensionSchemaHashes.every(value => value === schema.sha256) &&
  compatibility.suspensionMigrationHashes.length > 0 && compatibility.suspensionMigrationHashes.every(value => value === compatibility.migrationsSha256) &&
  compatibility.privateFixture.suspensionHashes.length > 0 && compatibility.privateFixture.suspensionHashes.every(value => value === fixtureSha256);
const report = { schemaVersion: 1, startedAt: start, finishedAt: new Date().toISOString(), packageId: 'P04-R06', qualification: '20261110-r3',
  scope: 'Read-only source freshness and retained-fixture source compatibility; no candidate/app/DB/build mutation',
  scriptSha256: hash(fs.readFileSync(__filename)), sourceSelectorSha256: selectorHash,
  commandRegistrySha256: hash(fs.readFileSync(path.join(root, 'docs/ecc/command-registry.json'))),
  baselineInputs: ['candidate-source-manifest.json', 'root-source-manifest.json', 'candidate-context.json', 'inventory/source-after-manifest.json',
    'inventory/repair-owned-files.json', 'inventory/authority-map.json', 'independent-review/CAPACITY-CHECKPOINT-SOURCE-REVIEW.json',
    'independent-review/CURRENT-SOURCE-MANIFEST-at-capacity.json'].map(binding),
  frozenCandidateId: context.candidateId, baselineCount: baseline.files.length,
  baselineIdentitySha256: hash(JSON.stringify(baseline.files.map(({ path, sha256 }) => ({ path, sha256 })))),
  currentCount: files.length, currentIdentitySha256: current.identitySha256, head: current.head,
  currentVsFrozen: delta(baseline.files, files), currentVsCapacity: delta(atCapacity.files, files),
  selected68Match: selected.all68CurrentMatch, selected68FrozenMatch: selected.all68CandidateMatch,
  schemaMigrationFixtureCompatible: compatibility.schemaMigrationFixtureCompatible,
  qualificationPassed: false, sourceQualificationOnly: true,
  limits: ['Observed read interval is not an atomic snapshot of a concurrently edited workspace.',
    'Concurrent finance/accounting changes are preserved; byte equality does not approve their behavior.',
    'Frozen r2 packet and candidate were read only; runtime owner independently captures and admits the successor.',
    'Full build/type/lint, real sessions, actual browser consumption and native no-write gates remain required.'] };
for (const [name, value] of [['CURRENT-SOURCE-MANIFEST-r1.json', current], ['SELECTED-INPUTS-REFRESH-r1.json', selected],
  ['RETAINED-FIXTURE-SOURCE-COMPATIBILITY-r1.json', compatibility], ['SOURCE-REFRESH-r1.json', report]]) {
  fs.writeFileSync(path.join(__dirname, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
}
console.log(JSON.stringify({ currentCount: report.currentCount, currentIdentitySha256: report.currentIdentitySha256,
  currentVsFrozen: report.currentVsFrozen, currentVsCapacity: report.currentVsCapacity,
  selected68Match: report.selected68Match, selected68FrozenMatch: report.selected68FrozenMatch,
  schemaMigrationFixtureCompatible: report.schemaMigrationFixtureCompatible,
  migrationCount: migrationRows.length, migrationsSha256: compatibility.migrationsSha256,
  unmatchedHelpers: helperBindings.filter(row => !row.matchingIndependentAdmissions.length).map(row => row.path) }));
