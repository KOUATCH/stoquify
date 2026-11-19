// Preserve the second actual capacity failure; prepare identical-gate definitions only.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
function create(source,target,edits){let text=fs.readFileSync(path.join(__dirname,source),'utf8');for(const[before,after]of edits){assert.equal(text.split(before).length,2,'Expected one exact substitution');text=text.replace(before,after);}fs.writeFileSync(path.join(__dirname,target),text,{flag:'wx'});}
create('prepare-candidate-attempt04.cjs','prepare-candidate-attempt05.cjs',[
 ['CANDIDATE-PREPARATION-RECIPE-ADMISSION-attempt04.json','CANDIDATE-PREPARATION-RECIPE-ADMISSION-attempt05.json'],
 ['resource-capture-entry-attempt04.json','resource-capture-entry-attempt05.json'],
 ["path.join(__dirname,'preparation-attempt04.json')","path.join(__dirname,'preparation-attempt05.json')"],
 [" assert.equal(process.argv.length,2);"," assert.equal(process.argv.length,2);const lastFailure=read('preparation-attempt04.json'),lastCapacity=read('resource-capture-entry-attempt04.json');assert.equal(lastFailure.passed,false);assert.deepEqual(lastFailure.commands,[]);assert.equal(lastCapacity.passed,false);assert.deepEqual(lastCapacity.failures,['commit_headroom']);report.preservedAttempt04Sha256=hash(fs.readFileSync(path.join(__dirname,'preparation-attempt04.json')));"]
]);
create('admit-candidate-attempt04.cjs','admit-candidate-attempt05.cjs',[
 ['CANDIDATE-PREPARATION-RECIPE-ADMISSION-attempt04.json','CANDIDATE-PREPARATION-RECIPE-ADMISSION-attempt05.json'],
 ["read('preparation-attempt04.json')","read('preparation-attempt05.json')"]
]);
