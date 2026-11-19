// Prepare a named bounded checkpoint definition. No D writes, resource query, process or native operation.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const before=fs.readFileSync(path.join(__dirname,'verify-capacity-checkpoint.cjs'),'utf8');let source=before;
function once(oldValue,newValue){assert.equal(source.split(oldValue).length-1,1,'Expected exact single substitution: '+oldValue);source=source.replace(oldValue,newValue);}
once("CAPACITY-CHECKPOINT-RECIPE-ADMISSION.json","CAPACITY-CHECKPOINT-CURRENT-SCHEMA-RECIPE-ADMISSION.json");
once("const failed=read('preparation.json')","const failed=read('preparation-attempt04.json')");
assert.equal(source.split('resource-capture-retry-ready-r1.json').length-1,3);source=source.replaceAll('resource-capture-retry-ready-r1.json','resource-capture-entry-attempt04.json');
once("const captured=read('inventory/capture-input.json')","const captured=read('inventory/capture-input-v2.json')");
once("independent-review/CAPTURE-SOURCE-ADMISSION.json","independent-review/CAPTURE-SOURCE-ADMISSION-resume-r2.json");
once("independent-review/CANDIDATE-PREPARATION-RECIPE-ADMISSION-attempt02.json","independent-review/CANDIDATE-PREPARATION-RECIPE-ADMISSION-attempt05.json");
once("'preparation-attempt02.json','build-result.json'","'preparation-attempt02.json','preparation-attempt03.json','preparation-attempt05.json','resource-capture-entry-attempt05.json','build-result.json'");
once("'database/cleanup.json'];","'database/cleanup.json','database-current/preparation.json','database-current/fixture-seeded.json','database-current/fixture-preflight.json','database-current/final-session-cleanup.json','database-current/cleanup.json','database-current/cleanup-before-qualification.json','runtime-current/execution-started.json'];");
once("resource-capture-retry-ready-r2.json","resource-current-schema-retry-ready-r1.json");
once("prepare-candidate-attempt02.cjs","prepare-candidate-attempt05.cjs");
once("admit-candidate-attempt02.cjs","admit-candidate-attempt05.cjs");
once("handoff:'RETRY-HANDOFF.md'","handoff:'EXECUTION-HANDOFF-current-schema-r1.md'");
once("report.evidence=recipe.files.map","const handoff=read('execution-handoff-current-schema-r1.json');assert.equal(handoff.qualificationPassed,false);assert.equal(handoff.candidateId,null);assert.equal(handoff.artifactSha256,null);assert.equal(handoff.sourceSnapshot.identitySha256,manifest.identitySha256);assert.equal(manifest.files.length,9988);assert.equal(handoff.migrationPlan.currentTotal,123);for(const input of handoff.files)assert.equal(hash(fs.readFileSync(path.resolve(__dirname,input.path))),input.sha256);report.currentSchemaHandoff={path:'execution-handoff-current-schema-r1.json',sha256:hash(fs.readFileSync(path.join(__dirname,'execution-handoff-current-schema-r1.json'))),plannedMigrations:123,actualCurrentMigrationsExecuted:0,privateMetadataPolicySha256:hash(fs.readFileSync(path.join(__dirname,'inventory/private-metadata-policy-v2.json'))),currentSourceObservationRehashed:false};report.evidence=recipe.files.map");
once("path.join(__dirname,'capacity-checkpoint.json')","path.join(__dirname,'capacity-checkpoint-current-schema.json')");
assert.notEqual(source,before);fs.writeFileSync(path.join(__dirname,'verify-capacity-checkpoint-current-schema.cjs'),source,{flag:'wx'});
console.log(JSON.stringify({written:true,output:'verify-capacity-checkpoint-current-schema.cjs',executed:false}));
