// Reviewed full current-source successor of the owned isolated candidate (4 changes + 65 additions).
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
  const currentManifestBytes = fs.readFileSync(path.join(__dirname,'inventory/resume-20261110-r1/CURRENT-FULL-SOURCE-MANIFEST.json'));
  const currentManifest = JSON.parse(currentManifestBytes), fullAdmission = read('independent-review/FULL-SOURCE-DELTA-ADMISSION-attempt02.json');
  assert.equal(fullAdmission.passed,true);assert.equal(fullAdmission.currentManifestSha256,hash(currentManifestBytes));
  assert.deepEqual(currentFiles,currentManifest.files.map(({path,sha256})=>({path,sha256})),'Current root drift after full-source admission');
  assert.equal(currentFiles.length,9788);assert.equal(changes.length,69);
  assert.equal(changes.filter(row=>row.beforeSha256!==null).length,4);assert(changes.every(row=>row.afterSha256),'Source deletions were not admitted');
  assert(changes.every(row=>row.path==='lib/auth.ts'||row.path==='tsconfig.json'||row.path.startsWith('docs/')));
  const ts = require(path.join(old.source,'node_modules/typescript'));
  const oldConfig = JSON.parse(fs.readFileSync(path.join(old.source,'tsconfig.json'),'utf8'));
  const newConfig = JSON.parse(Buffer.from(current.files.find(row=>row.path==='tsconfig.json').content,'base64'));
  function inputSelection(config){const parsed=ts.parseJsonConfigFileContent(config,ts.sys,old.source,undefined,path.join(old.source,'tsconfig.json'));assert.equal(parsed.errors.length,0,'TypeScript config parser diagnostics');return parsed.fileNames.map(file=>path.relative(old.source,file).split(path.sep).join('/')).sort();}
  const oldInputs=inputSelection(oldConfig),newInputs=inputSelection(newConfig);assert.deepEqual(newInputs,oldInputs,'Broader preservation exclusion altered candidate type inputs');
  const oldComparable={...oldConfig},newComparable={...newConfig};delete oldComparable.exclude;delete newComparable.exclude;assert.deepEqual(oldComparable,newComparable);
  const configProof={at:new Date().toISOString(),passed:true,typescriptVersion:ts.version,oldConfigSha256:a.get('tsconfig.json'),newConfigSha256:b.get('tsconfig.json'),files:oldInputs,oldInputCount:oldInputs.length,newInputCount:newInputs.length,inputListSha256:hash(JSON.stringify(oldInputs)),limitation:'Config parsing and exact file-list comparison only. No typechecking, emit, build or runtime qualification. Plans are outside captured source.'};
  report.sourceChanges = changes;
  const inspection = require(path.join(old.source,'scripts/build-app-safe.js')).inspectBuildProcesses({ includeDevProcesses:false });
  assert(!inspection.error, inspection.error?.message); assert.equal(inspection.orphans.length,0,'Preserve other build processes');
  const preservation = owned(path.join(old.storage,'attempt01-preserved'), old.storage, true);
  assert(!fs.existsSync(preservation)); fs.mkdirSync(preservation);
  const oldAuth = fs.readFileSync(path.join(old.source,'lib/auth.ts'));
  const preservedSource=[];
  for(const change of changes.filter(row=>row.beforeSha256)){const bytes=fs.readFileSync(path.join(old.source,change.path));assert.equal(hash(bytes),change.beforeSha256);const target=owned(path.join(preservation,'source',change.path),old.storage,true);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes,{flag:'wx'});preservedSource.push({path:change.path,sha256:hash(bytes),preserved:target});}
  report.preservedSource=preservedSource;
  const failedOutput = owned(path.join(old.source,'.next'),old.storage);
  const preservedOutput = owned(path.join(preservation,'next-output'),old.storage,true);
  assert(!fs.existsSync(preservedOutput));
  report.failedOutput = { before:failedOutput, preserved:preservedOutput, ...treeSummary(failedOutput), method:'Same-volume rename; all prior build output retained' };
  fs.renameSync(failedOutput,preservedOutput);
  assert(!fs.existsSync(failedOutput) && fs.existsSync(preservedOutput));
  for(const change of changes){const row=current.files.find(row=>row.path===change.path),bytes=Buffer.from(row.content,'base64');assert.equal(hash(bytes),change.afterSha256);const target=owned(path.join(old.source,change.path),old.storage,true);if(change.beforeSha256)assert.equal(hash(fs.readFileSync(target)),change.beforeSha256);else assert(!fs.existsSync(target),'New current file already exists');fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes,{flag:change.beforeSha256?'w':'wx'});}
  const afterOldInputs=inputSelection(oldConfig),afterNewInputs=inputSelection(newConfig);assert.deepEqual(afterOldInputs,afterNewInputs,'Post-refresh config inputs differ');
  configProof.afterOutputPreservation={oldInputCount:afterOldInputs.length,newInputCount:afterNewInputs.length,inputListSha256:hash(JSON.stringify(afterOldInputs)),failedOutputRemovedFromActiveSource:true};
  write('type-config-input-equivalence-attempt02.json',configProof);
  const refreshed = capture(old.source).files.map(({path,sha256})=>({path,sha256}));
  assert.deepEqual(refreshed,currentFiles);
  const archive = zlib.gzipSync(JSON.stringify(current));
  fs.writeFileSync(owned(path.join(old.storage,'source-snapshot-attempt02.json.gz'),old.storage,true),archive,{flag:'wx'});
  write('root-source-manifest-attempt02.json',{...current,files:current.files.map(({content,...row})=>row),archiveSha256:hash(archive)});
  write('candidate-source-manifest-attempt02.json',{createdAt:new Date().toISOString(),head:current.head,files:refreshed,sourceAdditions:[],sourceOverrides:[],ignoredAssetAnnex:old.assetAnnex,predecessor:'candidate-source-manifest.json'});
  const context = {...old, candidateId:'p04-r06-full-'+hash(JSON.stringify(refreshed)).slice(0,12), artifact:owned(path.join(old.storage,'artifact-attempt02'),old.storage,true), runtime:owned(path.join(old.storage,'runtime-repaired-attempt02'),old.storage,true), repairAdmissionSha256:hash(admissionBytes), predecessorCandidateId:old.candidateId};
  write('candidate-context-attempt02.json',context);
  const selectedBytes=fs.readFileSync(path.join(__dirname,'inventory/source-after-manifest-v4.json')),selected=JSON.parse(selectedBytes),selectedInputProof=[];assert.equal(selected.files.length,63);
  for(const row of selected.files){if(row.path==='node_modules/.prisma/client/schema.prisma')continue; assert.equal(hash(fs.readFileSync(path.join(root,row.path))),row.sha256);assert.equal(hash(fs.readFileSync(path.join(old.source,row.path))),row.sha256);selectedInputProof.push({path:row.path,sha256:row.sha256});}
  for(const row of context.assetAnnex)assert.equal(hash(fs.readFileSync(path.join(old.source,row.source))),row.sha256);
  assert.equal(hash(fs.readFileSync(path.join(old.source,context.privateAliasPolicy.path))),context.privateAliasPolicy.sha256);
  write('candidate-admission-attempt02.json',{at:new Date().toISOString(),passed:true,candidateId:context.candidateId,sourceFiles:refreshed.length,sourceManifestSha256:hash(JSON.stringify(refreshed)),selectedInputManifestSha256:hash(selectedBytes),selectedInputProof,sourceAdditions:0,sourceOverrides:0,privateAliasPolicyUnchanged:true,repairAdmissionSha256:context.repairAdmissionSha256,limit:'Verified physically copied dependencies and private generated client reused; no clean install claim.'});
  Object.assign(report,{passed:true,candidateId:context.candidateId,predecessorCandidateId:old.candidateId,sourceFiles:refreshed.length,repairAdmissionSha256:context.repairAdmissionSha256,preservedAuthSha256:hash(oldAuth)});
} catch(error) { report.error=error.stack||error.message; process.exitCode=1; }
finally { report.finishedAt=new Date().toISOString();write('candidate-refresh-attempt02.json',report);console.log(JSON.stringify({passed:report.passed,error:report.error,candidateId:report.candidateId,sourceFiles:report.sourceFiles})); }
