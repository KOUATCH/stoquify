// Create successor definitions only. Preserve the failed capacity entry and all original recipes.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
function create(source,target,edits){let text=fs.readFileSync(path.join(__dirname,source),'utf8');for(const[before,after]of edits){assert.equal(text.split(before).length,2,'Expected one exact replacement: '+before);text=text.replace(before,after);}fs.writeFileSync(path.join(__dirname,target),text,{flag:'wx'});}
create('prepare-candidate.cjs','prepare-candidate-attempt02.cjs',[
 ['CANDIDATE-PREPARATION-RECIPE-ADMISSION.json','CANDIDATE-PREPARATION-RECIPE-ADMISSION-attempt02.json'],
 ["resource-capture-entry.json","resource-capture-entry-attempt02.json"],
 ["path.join(__dirname,'preparation.json')","path.join(__dirname,'preparation-attempt02.json')"],
 [" assert.equal(process.argv.length,2);"," assert.equal(process.argv.length,2);const failed=read('preparation.json'),failedCapacity=read('resource-capture-entry.json');assert.equal(failed.passed,false);assert.deepEqual(failed.commands,[]);assert.equal(failedCapacity.passed,false);assert.deepEqual(failedCapacity.failures,['commit_headroom']);for(const name of ['source-snapshot.json.gz','root-source-manifest.json','candidate-source-manifest.json','candidate-context.json'])assert(!fs.existsSync(path.join(__dirname,name)),'Preserve unexpected prior capture output');assert(!fs.existsSync(source));report.preservedFailedEntrySha256=hash(fs.readFileSync(path.join(__dirname,'preparation.json')));"]
]);
create('admit-candidate.cjs','admit-candidate-attempt02.cjs',[
 ['CANDIDATE-PREPARATION-RECIPE-ADMISSION.json','CANDIDATE-PREPARATION-RECIPE-ADMISSION-attempt02.json'],
 ["read('preparation.json')","read('preparation-attempt02.json')"]
]);
create('run-build.cjs','run-build-v2.cjs',[
 ["path.join(__dirname,'preparation.json')","path.join(__dirname,'preparation-attempt02.json')"]
]);
