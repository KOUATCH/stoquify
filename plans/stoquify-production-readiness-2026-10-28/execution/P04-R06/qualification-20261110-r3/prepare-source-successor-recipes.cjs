// Prepare new definitions only; preserve E31 recipes, inputs, unused retry and all outcomes.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
function create(source,target,edits){let text=fs.readFileSync(path.join(__dirname,source),'utf8');for(const[before,after]of edits){assert.equal(text.split(before).length,2,'Expected one exact substitution: '+before);text=text.replace(before,after);}fs.writeFileSync(path.join(__dirname,target),text,{flag:'wx'});}
create('prepare-candidate-attempt02.cjs','prepare-candidate-attempt03.cjs',[
 ['CANDIDATE-PREPARATION-RECIPE-ADMISSION-attempt02.json','CANDIDATE-PREPARATION-RECIPE-ADMISSION-attempt03.json'],
 ['CAPTURE-SOURCE-ADMISSION.json','CAPTURE-SOURCE-ADMISSION-resume-r1.json'],
 ["read('inventory/capture-input.json')","read('inventory/capture-input-v2.json')"],
 ['resource-capture-entry-attempt02.json','resource-capture-entry-attempt03.json'],
 ["path.join(__dirname,'preparation-attempt02.json')","path.join(__dirname,'preparation-attempt03.json')"],
 ["assert(!fs.existsSync(source));report.preservedFailedEntrySha256=","assert(!fs.existsSync(source));for(const name of ['preparation-attempt02.json','resource-capture-entry-attempt02.json'])assert(!fs.existsSync(path.join(__dirname,name)),'Preserve unexpected previous retry output');report.preservedFailedEntrySha256="]
]);
create('admit-candidate-attempt02.cjs','admit-candidate-attempt03.cjs',[
 ['CANDIDATE-PREPARATION-RECIPE-ADMISSION-attempt02.json','CANDIDATE-PREPARATION-RECIPE-ADMISSION-attempt03.json'],
 ["read('preparation-attempt02.json')","read('preparation-attempt03.json')"],
 ["read('inventory/capture-input.json')","read('inventory/capture-input-v2.json')"]
]);
create('run-build-v2.cjs','run-build-v3.cjs',[
 ["path.join(__dirname,'preparation-attempt02.json')","path.join(__dirname,'preparation-attempt03.json')"],
 ['inventory/private-metadata-policy.json','inventory/private-metadata-policy-v2.json']
]);
create('final-integrity.cjs','final-integrity-v2.cjs',[
 ['FINAL-INTEGRITY-RECIPE-ADMISSION.json','FINAL-INTEGRITY-RECIPE-ADMISSION-v2.json'],
 ['inventory/private-metadata-policy.json','inventory/private-metadata-policy-v2.json']
]);
