const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const phase = process.argv[2];
if (!['during', 'after'].includes(phase)) throw new Error('Expected during or after');
const root = process.cwd();
const baseline = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'baseline.json'), 'utf8'));
const buildBefore = JSON.parse(fs.readFileSync(path.join(__dirname, 'app-build-final.sources-before.json'), 'utf8'));
const destination = path.join(__dirname, `app-build-final.baseline-supplement-${phase}.json`);
if (fs.existsSync(destination)) throw new Error('Evidence already exists');
const omitted = Object.keys(baseline.files).filter(file => !Object.hasOwn(buildBefore, file)).sort();
const files = Object.fromEntries(omitted.map(file => {
  const target = path.resolve(root, file);
  if (path.relative(root, target).startsWith('..')) throw new Error('Baseline path escapes workspace');
  return [file, fs.existsSync(target) ? crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex') : null];
}));
const differsFromBaseline = omitted.filter(file => files[file] !== baseline.files[file]);
const priorPath = path.join(__dirname, 'app-build-final.baseline-supplement-during.json');
const during = phase === 'after' ? JSON.parse(fs.readFileSync(priorPath, 'utf8')) : null;
const evidence = {
  capturedAt: new Date().toISOString(), phase,
  provenance: 'These baseline paths were omitted by the build-start extension filter. This is an honest supplemental sample; it was not captured at build start. An unchanged baseline and after-build hash provides a wider evidence window, not continuous monitoring.',
  baselineCapturedAt: baseline.capturedAt,
  baselineCount: Object.keys(baseline.files).length,
  buildStartManifestCount: Object.keys(buildBefore).length,
  supplementCount: omitted.length,
  differsFromBaseline,
  differsFromDuring: during ? omitted.filter(file => files[file] !== during.files[file]) : null,
  files,
};
fs.writeFileSync(destination, JSON.stringify(evidence, null, 2) + '\n');
console.log(JSON.stringify({ capturedAt: evidence.capturedAt, supplementCount: omitted.length, differsFromBaseline, differsFromDuring: evidence.differsFromDuring }));
