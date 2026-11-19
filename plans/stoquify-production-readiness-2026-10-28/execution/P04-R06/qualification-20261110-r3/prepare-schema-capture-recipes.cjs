// New current-schema capture definitions only; all earlier unused attempts and inputs are preserved.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
function create(source,target,edits){let text=fs.readFileSync(path.join(__dirname,source),'utf8');for(const[before,after]of edits){assert.equal(text.split(before).length,2,'One exact replacement required: '+before);text=text.replace(before,after);}fs.writeFileSync(path.join(__dirname,target),text,{flag:'wx'});}
create('prepare-candidate-attempt03.cjs','prepare-candidate-attempt04.cjs',[
 ['CANDIDATE-PREPARATION-RECIPE-ADMISSION-attempt03.json','CANDIDATE-PREPARATION-RECIPE-ADMISSION-attempt04.json'],
 ['CAPTURE-SOURCE-ADMISSION-resume-r1.json','CAPTURE-SOURCE-ADMISSION-resume-r2.json'],
 ['inventory/source-after-manifest-runtime.json','inventory/source-after-manifest-runtime-v2.json'],
 ['resource-capture-entry-attempt03.json','resource-capture-entry-attempt04.json'],
 ["path.join(__dirname,'preparation-attempt03.json')","path.join(__dirname,'preparation-attempt04.json')"],
 ["['preparation-attempt02.json','resource-capture-entry-attempt02.json']","['preparation-attempt02.json','resource-capture-entry-attempt02.json','preparation-attempt03.json','resource-capture-entry-attempt03.json']"],
 ["baselineCandidateId:'p04-r06-r2-f6b4ff106590',httpsOrigin:","baselineCandidateId:'p04-r06-r2-f6b4ff106590',databaseTargets:{build:'stoquify_local_p04r06_20261110_build_r3',full:'stoquify_local_p04r06_20261110_full_r3'},baselineDatabaseTargets:{build:'stoquify_local_p04r06_20261110_build_r2',full:'stoquify_local_p04r06_20261110_full_r2'},httpsOrigin:"],
 ["sourceInputsUnchanged:true,newUnitRun:false","authenticationAndDependencyInputsUnchanged:true,schemaSourceChanged:true,nativeQualificationRequired:true,newUnitRun:false"]
]);
create('admit-candidate-attempt03.cjs','admit-candidate-attempt04.cjs',[
 ['CANDIDATE-PREPARATION-RECIPE-ADMISSION-attempt03.json','CANDIDATE-PREPARATION-RECIPE-ADMISSION-attempt04.json'],
 ["read('preparation-attempt03.json')","read('preparation-attempt04.json')"],
 ['inventory/source-after-manifest-runtime.json','inventory/source-after-manifest-runtime-v2.json'],
 ["assert.equal(c.databaseStorage,path.resolve('D:/p04-r06-fullapp-20261110-r2'));","assert.equal(c.databaseStorage,path.resolve('D:/p04-r06-fullapp-20261110-r2'));assert.deepEqual(c.databaseTargets,{build:'stoquify_local_p04r06_20261110_build_r3',full:'stoquify_local_p04r06_20261110_full_r3'});assert.deepEqual(c.baselineDatabaseTargets,{build:'stoquify_local_p04r06_20261110_build_r2',full:'stoquify_local_p04r06_20261110_full_r2'});"]
]);
