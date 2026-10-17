const f=require('./statement-recipient-fixtures.cjs'),{db,fs,path,crypto,assert,root,helper}=f;
const {exportClosePack}=require(path.join(root,'services/accounting/close-assurance-pack.service.ts'));
const stamp=crypto.randomUUID(),file='services/accounting/close-assurance-pack.service.ts',hash=()=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex');
const result={at:new Date().toISOString(),sourceBefore:{[file]:hash()},syntheticOnly:true};
(async()=>{
 await helper.withClient(f.target,helper.assertOwned);
 const before=JSON.parse(fs.readFileSync(path.join(__dirname,'accounting-setup-trust-reproduction-5a1bf432-6c1f-4663-b118-3d9b9e4fe7d6.json')));assert.ok(before.passed);
 const x=before.fixture,scope={organizationId:x.organizationId};assert.ok((await db.organization.findUniqueOrThrow({where:{id:x.organizationId}})).name.startsWith(helper.prefix));
 assert.equal((await db.closeRun.findUniqueOrThrow({where:{id:x.runId}})).status,'READY');
 const actor=await db.user.create({data:{...scope,email:'saved-close-checker-'+stamp+'@example.invalid',isActive:true}}),now=new Date();
 await assert.rejects(()=>exportClosePack(x.organizationId,{closeRunId:x.runId,mode:'CERTIFIED'},{actorId:actor.id,actorPermissions:['accounting.close.certify'],now,lastAuthAt:now}),/Complete accounting setup/);
 assert.equal(await db.closePackExport.count({where:scope}),0);assert.equal((await db.closeRun.findUniqueOrThrow({where:{id:x.runId}})).status,'READY');
 result.previousReadyAssessmentDenied=true;result.noExportOrMutationOfPriorAssessment=true;result.passed=true;
})().catch(error=>{result.passed=false;result.error=f.safe(error)}).finally(async()=>{result.sourceAfter={[file]:hash()};result.sourceStable=JSON.stringify(result.sourceBefore)===JSON.stringify(result.sourceAfter);result.passed=!!result.passed&&result.sourceStable;const name='saved-close-setup-gate-'+stamp+'.json';fs.writeFileSync(path.join(__dirname,name),JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({file:name,...result}));await db.$disconnect();process.exit(result.passed?0:1)});
