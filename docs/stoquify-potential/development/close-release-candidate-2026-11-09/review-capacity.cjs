// File-only measured storage review. No install/build/database/application.
const fs = require('node:fs'), path = require('node:path'), zlib = require('node:zlib'), assert = require('node:assert/strict');
const { sourceInputs } = require('./candidate.cjs');
const { root, digest } = require('./candidate-validation.cjs');
const measurements = JSON.parse(fs.readFileSync(path.join(__dirname, 'rawmeasurements.json'), 'utf8'));
const cleanup = JSON.parse(fs.readFileSync(path.join(__dirname, 'CACHE_CLEANUP.json'), 'utf8').replace(/^\uFEFF/, ''));
assert(cleanup.removed && cleanup.bytes === 1990938514 && !fs.existsSync(cleanup.exactOwnedTarget));
const snapshot = require(path.join(root, 'scripts/candidate-snapshot.cjs')).capture(root);
const sourceBytes = snapshot.files.reduce((sum, file) => sum + file.bytes, 0), archiveBytes = zlib.gzipSync(JSON.stringify(snapshot)).length;
const GiB = 1024 ** 3, overhead = 128 * 1024 ** 2;
const compilerReserveBytes = Math.ceil(measurements.next.bytes * 1.5) + GiB;
const artifactReserveBytes = Math.ceil(measurements.artifact.bytes * 1.5) + GiB;
const additionalDatabaseReserveBytes = 256 * 1024 ** 2;
const minimumBuildFreeBytes = compilerReserveBytes + additionalDatabaseReserveBytes + overhead;
const minimumCopyFreeBytes = minimumBuildFreeBytes + measurements.nodeModules.bytes;
// Additional16MiB accounts for the approval receipt/new evidence before freeze.
const minimumPreparationFreeBytes = minimumCopyFreeBytes + sourceBytes + archiveBytes + 16 * 1024 ** 2;
const artifactRoot = 'C:/Users/J COMPUTER/.codex/visualizations/2026/11/02/01a19e00-6435-7443-92d6-f2cf160728a8';
const free = file => { const disk = fs.statfsSync(file); return disk.bavail * disk.bsize; };
assert(free(root) >= minimumPreparationFreeBytes); assert(free(artifactRoot) >= artifactReserveBytes);
const review = { checkedAt: new Date().toISOString(), approvedForPreparation: true, approvedForCopy: true, approvedForBuild: true,
  sourceInputs: sourceInputs(root), measurements: ['rawmeasurements.json', 'CACHE_CLEANUP.json'].map(file => ({ path: path.relative(root, path.join(__dirname, file)).replaceAll('\\', '/'), sha256: digest(path.join(__dirname, file)) })),
  sourceBytes, archiveBytes, dependencyBytes: measurements.nodeModules.bytes,
  compilerReserveBytes, artifactReserveBytes, additionalDatabaseReserveBytes, filesystemOverheadReserveBytes: overhead,
  minimumPreparationFreeBytes, minimumCopyFreeBytes, minimumBuildFreeBytes, artifactRoot, minimumArtifactFreeBytes: artifactReserveBytes,
  availablePreparationBytes: free(root), availableArtifactBytes: free(artifactRoot),
  rationale: 'Replace generic8GiB floor with source+archive+independent dependency copy plus1.5x measured prior full compiler output+1GiB, DB256MiB and filesystem128MiB reserves; artifact1.5x prior+1GiB on separate volume. Only obsolete generated cache was reclaimed.',
  priorSourceDependenciesAndArtifactPreserved: true, noCleanInstallClaim: true };
fs.writeFileSync(path.join(__dirname, 'CAPACITY_REVIEW.json'), JSON.stringify(review, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ approved: true, availablePreparationBytes: review.availablePreparationBytes, minimumPreparationFreeBytes, minimumBuildFreeBytes, minimumArtifactFreeBytes: artifactReserveBytes }));
