// Preparation only. Preserve resource-blocked receipts and every original script/admission.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const prior=JSON.parse(fs.readFileSync(path.join(__dirname,'build-result.json')));assert.equal(prior.passed,false);assert.equal(prior.commands.length,0);assert.equal(prior.resourceGates.length,1);assert.equal(prior.resourceGates[0].passed,false);
function successor(from,to,replacements){let source=fs.readFileSync(path.join(__dirname,from),'utf8');for(const[a,b]of replacements){assert(source.includes(a));source=source.replaceAll(a,b);}fs.writeFileSync(path.join(__dirname,to),source,{flag:'wx'});}
successor('run-build.cjs','run-build-attempt02.cjs',[
 ['BUILD-RECIPE-ADMISSION.json','BUILD-RECIPE-ADMISSION-attempt02.json'],['resource-build-admission','resource-build-admission-attempt02'],['resource-build-precompile','resource-build-precompile-attempt02'],['build-result.json','build-result-attempt02.json']]);
successor('admit-runtime-source.cjs','admit-runtime-source-v2.cjs',[['build-result.json','build-result-attempt02.json']]);
successor('database/fixture-preflight.cjs','database/fixture-preflight-v2.cjs',[['build-result.json','build-result-attempt02.json']]);
successor('run-runtime.cjs','run-runtime-v2.cjs',[['build-result.json','build-result-attempt02.json']]);
successor('final-integrity-v2.cjs','final-integrity-v3.cjs',[['build-result.json','build-result-attempt02.json'],['FINAL-INTEGRITY-RECIPE-ADMISSION-v2.json','FINAL-INTEGRITY-RECIPE-ADMISSION-v3.json']]);
console.log(JSON.stringify({preservedFailedAttempt:true,buildCommandsExecuted:0,thresholdsChanged:false,successors:5}));
