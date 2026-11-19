// File/source-only candidate verification; no environment files or app imports.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../../..'), evidencePrefix = path.relative(root, __dirname).replaceAll('\\', '/') + '/';
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function noLinks(file) { const absolute = path.resolve(file); let cursor = path.parse(absolute).root; assert(!fs.lstatSync(cursor).isSymbolicLink()); for (const part of absolute.slice(cursor.length).split(path.sep).filter(Boolean)) { cursor = path.join(cursor, part); if (fs.existsSync(cursor)) assert(!fs.lstatSync(cursor).isSymbolicLink(), 'Linked candidate path refused'); } }
function digest(file) { noLinks(file); return hash(fs.readFileSync(file)); }
function read(name) { assert(/^[A-Z_]+\.json$/.test(name)); const file = path.join(__dirname, name); noLinks(file); return JSON.parse(fs.readFileSync(file, 'utf8')); }
function osEnvironment() { return Object.fromEntries(Object.entries(process.env).filter(([key]) => /^(PATH|PATHEXT|SYSTEMROOT|WINDIR|TEMP|TMP|COMSPEC|USERPROFILE|LOCALAPPDATA|APPDATA|PROGRAMFILES|PROGRAMFILES\(X86\)|SYSTEMDRIVE|NUMBER_OF_PROCESSORS|PROCESSOR_ARCHITECTURE)$/i.test(key))); }
function identity(directory) {
  noLinks(directory); const { included } = require(path.join(root, 'scripts/candidate-snapshot.cjs'));
  const roots = new Set(['actions','app','components','config','hooks','i18n','lib','messages','prisma','public','services','src','types','validations','_legacy-dashboard','tests','__tests__','scripts','docs','design-system','.github','vendor']);
  const selectors = fs.readdirSync(directory, { withFileTypes: true }).filter(item => item.isDirectory() ? roots.has(item.name) : included(item.name)).map(item => item.name);
  const paths = [...new Set(execFileSync('git', ['ls-files','--cached','--others','--exclude-standard','-z','--',...selectors], { cwd: directory, env: osEnvironment(), maxBuffer: 40e6 }).toString().split('\0').filter(Boolean))].sort();
  return paths.filter(file => included(file) && fs.existsSync(path.join(directory, file))).map(file => { const absolute = path.join(directory, file); noLinks(absolute); assert(fs.statSync(absolute).isFile()); return { path: file, sha256: digest(absolute) }; });
}
function changes(before, after) { const previous = new Map(before.map(file => [file.path,file.sha256])), next = new Map(after.map(file => [file.path,file.sha256])); return [...new Set([...previous.keys(),...next.keys()])].sort().filter(file => previous.get(file) !== next.get(file)).map(file => ({ path:file, before:previous.get(file)||null, after:next.get(file)||null })); }
function isEvidence(file) { return file.startsWith(evidencePrefix) && /\.(json|md|txt)$/.test(file) && !file.split('/').includes('..'); }
function verifyCandidate() {
  const target = read('CANDIDATE_TARGET.json'), manifest = read('CANDIDATE_SOURCE_MANIFEST.json'), raw = read('RAW_SOURCE_MANIFEST.json');
  assert.equal(path.dirname(target.directory), path.join(root,'.codex-tmp')); assert.match(path.basename(target.directory), /^close-integrity-release-20261110-[a-f0-9]{10}$/); noLinks(target.directory);
  assert.equal(target.candidate,path.join(target.directory,'candidate')); assert.equal(manifest.candidate,target.candidate); assert.equal(manifest.rawArchiveSha256,raw.archiveSha256); assert.equal(digest(path.join(target.directory,'raw-source-snapshot.json.gz')),raw.archiveSha256);
  assert.equal(hash(JSON.stringify(manifest.files)),manifest.manifestSha256); assert.equal(digest(path.join(root,'scripts/candidate-snapshot.cjs')),manifest.snapshotHelperSha256);
  const expected = raw.files.map(({path,sha256}) => ({path,sha256})), normalization = manifest.normalization;
  assert.equal(normalization.generatedNextEnv.path,'next-env.d.ts'); assert(normalization.changes.every(item => item.path === 'next-env.d.ts'));
  if (normalization.generatedNextEnv.capturedInRawSource) { const entry = expected.find(item => item.path === 'next-env.d.ts'); assert(entry); assert.equal(entry.sha256,normalization.generatedNextEnv.originalSha256); entry.sha256=normalization.generatedNextEnv.normalizedSha256; }
  assert.deepEqual(manifest.files,expected); assert.deepEqual(identity(target.candidate),manifest.files,'Frozen candidate source changed');
  assert.equal(digest(path.join(target.candidate,'next-env.d.ts')),normalization.generatedNextEnv.normalizedSha256);
  for (const directory of [target.directory,target.candidate,path.join(target.candidate,'prisma')]) assert(!fs.existsSync(path.join(directory,'.env')),'Environment file in isolated source');
  const rootChanges = changes(raw.files,identity(root)); assert(rootChanges.every(item => isEvidence(item.path)),'Root application/configuration/migration source changed after capture');
  const catalog = JSON.parse(fs.readFileSync(path.join(target.candidate,'prisma/migration-catalog-manifest.json'),'utf8'));
  assert.equal(catalog.migrationCount,123); assert.equal(catalog.catalogSha256,'968c1f6c7c45f26a8eb8068b551e67450142fccc119b84528e4f4424c64a2e66');
  assert.equal(digest(path.join(target.candidate,'prisma/schema.prisma')),'937754a6034b37b82c98957ebb9b70f612659d40af562967151595562acc6ef0');
  for (const file of catalog.migrations) assert.equal(digest(path.join(target.candidate,file.path)),file.rawSha256);
  return { target,manifest,rootEvidenceChanges:rootChanges };
}
module.exports = { root,hash,digest,read,noLinks,osEnvironment,identity,changes,isEvidence,verifyCandidate };
if (require.main === module) { try { const {manifest,rootEvidenceChanges}=verifyCandidate(); console.log(JSON.stringify({verified:true,files:manifest.files.length,manifestSha256:manifest.manifestSha256,generatedEvidenceDrift:rootEvidenceChanges,applicationSourceDrift:0})); } catch(error) { console.error(error.message); process.exitCode=1; } }
