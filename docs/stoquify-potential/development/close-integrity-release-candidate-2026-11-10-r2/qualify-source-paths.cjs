// Bounded filesystem/Git fixtures for the source path guard. No app or database.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const h = require('./candidate-validation.cjs');
assert.deepEqual(process.argv.slice(2), ['run']);
const target = h.read('CANDIDATE_TARGET.json'), id = crypto.randomBytes(5).toString('hex');
const directory = path.join(h.root, '.codex-tmp', 'source-path-proof-20261110-' + id);
assert.equal(path.dirname(directory), path.join(h.root, '.codex-tmp')); h.noLinks(directory); fs.mkdirSync(directory);
const emptyConfig = path.join(target.directory, 'empty-global.gitconfig'); assert.equal(fs.statSync(emptyConfig).size, 0);
const env = { ...h.osEnvironment(), GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: emptyConfig, GIT_TERMINAL_PROMPT: '0' };
const git = args => {
  const result = spawnSync('git', ['-c', 'core.fsmonitor=false', ...args], { cwd: directory, env, windowsHide: true, encoding: 'utf8', timeout: 30000 });
  assert(!result.error && result.status === 0, 'Owned Git fixture failed');
};
git(['init', '--quiet', '--initial-branch=codex/source-path-proof']);
const ordinary = path.join(directory, 'services/regular.ts'), ancestor = path.join(directory, 'services/linked');
fs.mkdirSync(ancestor, { recursive: true });
fs.writeFileSync(path.join(directory, 'README.md'), 'Owned source-path qualification fixture\n', { flag: 'wx' });
fs.writeFileSync(ordinary, 'export const regular = 1\n', { flag: 'wx' });
fs.writeFileSync(path.join(ancestor, 'scope.ts'), 'export const scope = 2\n', { flag: 'wx' });
git(['add', '--', 'README.md', 'services']);
const before = h.identity(directory); assert.equal(before.length, 3);
for (const entry of before) assert.equal(entry.sha256, h.hash(fs.readFileSync(path.join(directory, entry.path))));
const caseAlias = directory.toUpperCase(); let caseVariantAccepted = false;
if (fs.existsSync(caseAlias)) { assert.deepEqual(h.identity(caseAlias), before); caseVariantAccepted = true; }
// Move only this verified fixture directory to a verified sibling, then expose
// the original tracked path through an ancestor junction. Keep it as evidence.
const destination = path.join(directory, 'private-target');
for (const file of [ancestor, destination]) assert(path.resolve(file).startsWith(directory + path.sep));
assert(fs.lstatSync(ancestor).isDirectory() && !fs.existsSync(destination)); h.noLinks(ancestor);
fs.renameSync(ancestor, destination); fs.symlinkSync(destination, ancestor, 'junction');
assert(fs.lstatSync(ancestor).isSymbolicLink());
let rejection;
try { h.identity(directory); } catch (error) { rejection = error; }
assert(rejection && /Linked source path refused|Linked candidate path refused/.test(rejection.message), 'Ancestor junction was not rejected');
const began = Date.now(), verified = h.verifyCandidate(), elapsedMs = Date.now() - began;
const record = { passed: true, directory, ordinaryFilesAccepted: 3, caseVariantAccepted, ancestorJunctionRejected: true,
  currentSourceVerificationPassed: true, sourceFiles: verified.manifest.files.length, sourceManifestSha256: verified.manifest.manifestSha256,
  fullVerificationElapsedMs: elapsedMs, sourceHelper: { path: path.join(__dirname, 'candidate-validation.cjs'), sha256: h.digest(path.join(__dirname, 'candidate-validation.cjs')) },
  noProductDatabaseOrArchiveChange: true, runnerSha256: h.digest(__filename), classification: 'Real owned file/case/junction fixtures and current source verification; no application or database execution' };
fs.writeFileSync(path.join(__dirname, 'SOURCE_PATH_GUARD_QUALIFICATION.json'), JSON.stringify(record, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ passed: true, fullVerificationElapsedMs: elapsedMs, ancestorJunctionRejected: true, caseVariantAccepted }));
