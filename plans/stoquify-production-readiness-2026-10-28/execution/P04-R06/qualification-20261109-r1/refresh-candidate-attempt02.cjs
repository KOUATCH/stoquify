// One reviewed, byte-exact current-source refresh of the owned isolated candidate.
// Preserves the failed output and every historical receipt; no database or application execution.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), zlib = require('node:zlib'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../../../..');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const read = name => JSON.parse(fs.readFileSync(path.join(__dirname, name), 'utf8'));
const write = (name, value) => fs.writeFileSync(path.join(__dirname, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const report = { startedAt: new Date().toISOString(), passed: false, sourceOverrides: [], sourceAdditions: [], databaseWrites: false };
function owned(target, storage, missing = false) {
  const absolute = path.resolve(target), relative = path.relative(storage, absolute);
  assert(relative && relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative), 'Outside owned storage');
  let existing = absolute;
  while (!fs.existsSync(existing)) { assert(missing); existing = path.dirname(existing); }
  assert.equal(fs.realpathSync(existing), existing, 'Linked path refused');
  return absolute;
}
function treeSummary(directory) {
  let files = 0, bytes = 0;
  const visit = dir => { for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    assert(!entry.isSymbolicLink(), 'Failed output link refused');
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) visit(file); else { assert(entry.isFile()); files++; bytes += fs.statSync(file).size; }
  } };
  visit(directory); return { files, bytes };
}
try {
  assert.equal(process.argv.length, 2); assert.notEqual(process.env.NODE_ENV, 'production');
  const old = read('candidate-context.json'), oldManifest = read('candidate-source-manifest.json');
  assert.equal(old.root, root); assert.equal(old.storage, path.resolve('D:/p04-r06-fullapp-20261109-r1'));
  assert.equal(fs.realpathSync(old.storage), old.storage);
  assert.equal(read('preparation.json').passed, true);
  assert.equal(JSON.parse(fs.readFileSync(path.join(old.storage, 'ownership.json'))).root, root);
  assert.equal(fs.realpathSync(old.source), old.source);
  assert.equal(fs.realpathSync(path.join(old.source, 'node_modules')), path.join(old.source, 'node_modules'));
  assert(!fs.existsSync(old.artifact), 'Preserve any previous artifact');
  const recipe = read('independent-review/RETRY-RECIPE-ADMISSION-attempt02.json');
  assert.equal(recipe.passed, true);
  for (const row of recipe.files) assert.equal(hash(fs.readFileSync(path.join(__dirname, row.path))), row.sha256, 'Retry recipe changed: ' + row.path);
  assert(recipe.files.some(row => row.path === path.basename(__filename)), 'This refresh script is not admitted');
  const admissionBytes = fs.readFileSync(path.join(__dirname, 'independent-review/REPAIR-SOURCE-ADMISSION-v3.json'));
  const admission = JSON.parse(admissionBytes); assert.equal(admission.passed, true);
  for (const row of admission.inputs) assert.equal(hash(fs.readFileSync(path.join(__dirname, row.path))), row.sha256);
  for (const row of admission.files) assert.equal(hash(fs.readFileSync(path.join(root, row.path))), row.sha256);
  const { capture } = require(path.join(old.source, 'scripts/candidate-snapshot.cjs'));
  const before = capture(old.source).files.map(({path,sha256}) => ({path,sha256}));
  assert.deepEqual(before, oldManifest.files, 'Original isolated source has drifted');
  const current = capture(root), currentFiles = current.files.map(({path,sha256}) => ({path,sha256}));
  const a = new Map(before.map(row => [row.path,row.sha256])), b = new Map(currentFiles.map(row => [row.path,row.sha256]));
  const changes = [...new Set([...a.keys(),...b.keys()])].sort().flatMap(file => a.get(file) === b.get(file) ? [] : [{ path:file, beforeSha256:a.get(file) || null, afterSha256:b.get(file) || null }]);
  assert.deepEqual(changes, [{ path:'lib/auth.ts', beforeSha256:'181e15aad556024353b1e988cce6ccb5eb9679dfc50620427b81aa059a8c7064', afterSha256:'c7a1acf7ee8c25682a47a7476feafdaeeb4d55f68fb030f33b76bd95e605bff5' }], 'Full current source differs beyond admitted typed spread');
  report.sourceChanges = changes;
  const inspection = require(path.join(old.source,'scripts/build-app-safe.js')).inspectBuildProcesses({ includeDevProcesses:false });
  assert(!inspection.error, inspection.error?.message); assert.equal(inspection.orphans.length,0,'Preserve other build processes');
  const preservation = owned(path.join(old.storage,'attempt01-preserved'), old.storage, true);
  assert(!fs.existsSync(preservation)); fs.mkdirSync(preservation);
  const oldAuth = fs.readFileSync(path.join(old.source,'lib/auth.ts'));
  fs.writeFileSync(path.join(preservation,'auth.ts'),oldAuth,{flag:'wx'});
  const failedOutput = owned(path.join(old.source,'.next'),old.storage);
  const preservedOutput = owned(path.join(preservation,'next-output'),old.storage,true);
  assert(!fs.existsSync(preservedOutput));
  report.failedOutput = { before:failedOutput, preserved:preservedOutput, ...treeSummary(failedOutput), method:'Same-volume rename; all prior build output retained' };
  fs.renameSync(failedOutput,preservedOutput);
  assert(!fs.existsSync(failedOutput) && fs.existsSync(preservedOutput));
  const newAuth = Buffer.from(current.files.find(row=>row.path==='lib/auth.ts').content,'base64');
  assert.equal(hash(newAuth),changes[0].afterSha256);
  fs.writeFileSync(owned(path.join(old.source,'lib/auth.ts'),old.storage),newAuth);
  const refreshed = capture(old.source).files.map(({path,sha256})=>({path,sha256}));
  assert.deepEqual(refreshed,currentFiles);
  const archive = zlib.gzipSync(JSON.stringify(current));
  fs.writeFileSync(owned(path.join(old.storage,'source-snapshot-attempt02.json.gz'),old.storage,true),archive,{flag:'wx'});
  write('root-source-manifest-attempt02.json',{...current,files:current.files.map(({content,...row})=>row),archiveSha256:hash(archive)});
  write('candidate-source-manifest-attempt02.json',{createdAt:new Date().toISOString(),head:current.head,files:refreshed,sourceAdditions:[],sourceOverrides:[],ignoredAssetAnnex:old.assetAnnex,predecessor:'candidate-source-manifest.json'});
  const context = {...old, candidateId:'p04-r06-full-'+hash(JSON.stringify(refreshed)).slice(0,12), artifact:owned(path.join(old.storage,'artifact-attempt02'),old.storage,true), runtime:owned(path.join(old.storage,'runtime-repaired-attempt02'),old.storage,true), repairAdmissionSha256:hash(admissionBytes), predecessorCandidateId:old.candidateId};
  write('candidate-context-attempt02.json',context);
  const selectedBytes=fs.readFileSync(path.join(__dirname,'inventory/source-after-repair-manifest-v4.json')),selected=JSON.parse(selectedBytes),selectedInputProof=[];
  for(const row of selected.files){if(row.path==='node_modules/.prisma/client/schema.prisma')continue; assert.equal(hash(fs.readFileSync(path.join(root,row.path))),row.sha256);assert.equal(hash(fs.readFileSync(path.join(old.source,row.path))),row.sha256);selectedInputProof.push({path:row.path,sha256:row.sha256});}
  for(const row of context.assetAnnex)assert.equal(hash(fs.readFileSync(path.join(old.source,row.source))),row.sha256);
  assert.equal(hash(fs.readFileSync(path.join(old.source,context.privateAliasPolicy.path))),context.privateAliasPolicy.sha256);
  write('candidate-admission-attempt02.json',{at:new Date().toISOString(),passed:true,candidateId:context.candidateId,sourceFiles:refreshed.length,sourceManifestSha256:hash(JSON.stringify(refreshed)),selectedInputManifestSha256:hash(selectedBytes),selectedInputProof,sourceAdditions:0,sourceOverrides:0,privateAliasPolicyUnchanged:true,repairAdmissionSha256:context.repairAdmissionSha256,limit:'Verified physically copied dependencies and private generated client reused; no clean install claim.'});
  Object.assign(report,{passed:true,candidateId:context.candidateId,predecessorCandidateId:old.candidateId,sourceFiles:refreshed.length,repairAdmissionSha256:context.repairAdmissionSha256,preservedAuthSha256:hash(oldAuth)});
} catch(error) { report.error=error.stack||error.message; process.exitCode=1; }
finally { report.finishedAt=new Date().toISOString();write('candidate-refresh-attempt02.json',report);console.log(JSON.stringify({passed:report.passed,error:report.error,candidateId:report.candidateId,sourceFiles:report.sourceFiles})); }
