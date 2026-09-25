const f=require('./statement-recipient-fixtures.cjs'),{db,fs,path,crypto,assert}=f;
const {recordBusinessEvent,recordBusinessEventInTx}=require(path.join(f.root,'services/events/business-event.service.ts'));
const {createCopilotProposal,decideCopilotProposal}=require(path.join(f.root,'services/ai/copilot-proposal.service.ts'));
const inventory=JSON.parse(fs.readFileSync(path.join(__dirname,'../../evidence/event-source-inventory-v151.json'),'utf8'));
const domains=[...new Set(inventory.calls.filter(x=>x.classification==='invalid_literal').map(x=>x.literal).concat(['PAYROLL_RUBRIQUE','PAYROLL_RUBRIQUE_ASSIGNMENT','PAYROLL_SALARY_CHANGE']))];
const files=[...new Set(inventory.calls.filter(x=>x.classification==='invalid_literal').map(x=>x.file).concat(['services/payroll/compensation.service.ts','services/events/business-event.schemas.ts','services/events/business-event.service.ts','prisma/schema.prisma']))];
const hashes=()=>Object.fromEntries(files.map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root,file))).digest('hex')]));
const stamp=crypto.randomUUID(),result={at:new Date().toISOString(),scope:'Owned local database. Synthetic domain references and AI run evidence are verification fixtures, not operational approvals. No provider dispatch, browser claim or ledger posting.',sourceBefore:hashes(),checks:{}};
async function main(){
 await f.helper.withClient(f.target,f.helper.assertOwned);
 const org=await db.organization.create({data:{name:f.helper.prefix+'Event sources '+stamp,slug:'event-sources-'+stamp,currency:'XAF'}});
 const other=await db.organization.create({data:{name:f.helper.prefix+'Event sources other '+stamp,slug:'event-sources-other-'+stamp,currency:'XAF'}});
 const actor=await db.user.create({data:{organizationId:org.id,email:'events-'+stamp+'@example.invalid'}});
 const base={organizationId:org.id,eventType:'OWNED_DOMAIN_REFERENCE_CHECK',eventSource:'SYSTEM',payload:{verificationOnly:true},sourceId:'owned-source-'+stamp,metadata:{retained:{value:'original'}}};
 for(const sourceEntityType of domains){
  const {event}=await recordBusinessEvent({...base,idempotencyKey:sourceEntityType+'-'+stamp,sourceEntityType,outboxMessages:[{channel:'NOTIFICATION',eventName:'owned.reference.check',payload:{verificationOnly:true}}]},db);
  const saved=await db.businessEvent.findUniqueOrThrow({where:{id:event.id},include:{audits:true,outboxMessages:true}});
  assert.equal(saved.sourceType,null);assert.equal(saved.sourceId,base.sourceId);assert.deepEqual(saved.metadata,{retained:{value:'original'},sourceEntityType});assert.equal(saved.audits.length,1);assert.equal(saved.outboxMessages.length,1);assert.equal(saved.outboxMessages[0].organizationId,org.id);
 }
 result.checks.domainReferencesPersisted=domains;
 for(const sourceType of inventory.allowedAccountingSources){const {event}=await recordBusinessEvent({...base,idempotencyKey:'accounting-'+sourceType+'-'+stamp,sourceType},db);const saved=await db.businessEvent.findUniqueOrThrow({where:{id:event.id}});assert.equal(saved.sourceType,sourceType);assert.deepEqual(saved.metadata,base.metadata)}
 result.checks.accountingClassificationsPreserved=inventory.allowedAccountingSources.length;
 const before=await db.businessEvent.count({where:{organizationId:org.id}});
 await assert.rejects(recordBusinessEvent({...base,idempotencyKey:'invalid-'+stamp,sourceType:'PAYROLL_CONTRACT'},db),e=>e.code==='VALIDATION_ERROR');
 await assert.rejects(recordBusinessEvent({...base,idempotencyKey:'conflict-'+stamp,sourceEntityType:'PAYROLL_CONTRACT',metadata:{sourceEntityType:'OTHER'}},db),e=>e.code==='VALIDATION_ERROR');
 assert.equal(await db.businessEvent.count({where:{organizationId:org.id}}),before);result.checks.invalidAndConflictNoEvent=true;
 const replay={...base,idempotencyKey:'replay-'+stamp,sourceEntityType:'PAYROLL_CONTRACT',outboxMessages:[{channel:'NOTIFICATION',eventName:'owned.replay',payload:{verificationOnly:true}}]};
 const pair=await Promise.all([recordBusinessEvent(replay,db),recordBusinessEvent(replay,db)]);assert.equal(pair[0].event.id,pair[1].event.id);assert.equal(pair.filter(x=>x.created).length,1);
 assert.equal(await db.businessEventOutbox.count({where:{businessEventId:pair[0].event.id}}),1);
 const foreign=await recordBusinessEvent({...replay,organizationId:other.id},db);assert.notEqual(foreign.event.id,pair[0].event.id);result.checks.concurrentReplayAndTenantScopedKey=true;
 await assert.rejects(recordBusinessEvent({...replay,payload:{verificationOnly:true,changed:true}},db),e=>e.code==='IDEMPOTENCY_CONFLICT');result.checks.changedPayloadRejected=true;
 const rollbackKey='rollback-'+stamp;
 await assert.rejects(db.$transaction(async tx=>{await tx.organization.update({where:{id:org.id},data:{name:'Should roll back'}});await recordBusinessEventInTx(tx,{...replay,idempotencyKey:rollbackKey});throw new Error('Owned deliberate rollback')}),/Owned deliberate rollback/);
 assert.equal((await db.organization.findUniqueOrThrow({where:{id:org.id}})).name,org.name);assert.equal(await db.businessEvent.count({where:{organizationId:org.id,idempotencyKey:rollbackKey}}),0);assert.equal(await db.businessEventOutbox.count({where:{organizationId:org.id,idempotencyKey:{contains:rollbackKey}}}),0);result.checks.domainEventAuditOutboxRollback=true;
 const now=new Date(),periodStart=new Date(now.getTime()-3600000),periodEnd=now;
 const ref={subjectType:'owned.verification',subjectId:stamp,sourceModule:'dashboard',sourceHash:crypto.createHash('sha256').update(stamp).digest('hex'),evidenceGrade:'operational',freshness:'fresh',available:true};
 const run=await db.agentRun.create({data:{organizationId:org.id,actorId:actor.id,agentKey:'owned-source-contract-verification',sourceRoute:'/dashboard/manager-action-center',locale:'en',currency:'XAF',correlationId:stamp,status:'COMPLETED',periodStart,periodEnd,completedAt:now,evidenceLinks:{create:{...ref,freshness:'FRESH'}}}});
 const input={runId:run.id,proposalType:'NAVIGATE_TO_WORKFLOW',targetRoute:'/dashboard/manager-action-center',requiredPermission:'dashboard.read',title:'Review owned test evidence',detail:'Open the existing dashboard and review the test record.',evidence:[{...ref,id:'owned-evidence'}],periodStart,periodEnd,asOf:now,expiresAt:new Date(now.getTime()+3600000),idempotencyKey:'owned-proposal-'+stamp};
 const financial=async()=>Promise.all([db.journalEntry.count({where:{organizationId:org.id}}),db.payment.count({where:{organizationId:org.id}}),db.ledgerPostingBatch.count({where:{organizationId:org.id}})]);
 const financialBefore=await financial();
 await assert.rejects(createCopilotProposal(org.id,actor.id,[],input,now),e=>e.code==='FORBIDDEN');
 const proposal=await createCopilotProposal(org.id,actor.id,['dashboard.read'],input,now);assert.equal(proposal.status,'DRAFT');assert.equal(proposal.executionAuthority,'NONE');
 assert.equal((await createCopilotProposal(org.id,actor.id,['dashboard.read'],input,now)).id,proposal.id);
 await assert.rejects(decideCopilotProposal(other.id,actor.id,['dashboard.read'],{proposalId:proposal.id,decision:'ACCEPTED',reason:'Owned test decision'},now),e=>e.code==='NOT_FOUND');
 await assert.rejects(decideCopilotProposal(org.id,actor.id,[],{proposalId:proposal.id,decision:'ACCEPTED',reason:'Owned test decision'},now),e=>e.code==='FORBIDDEN');
 const accepted=await decideCopilotProposal(org.id,actor.id,['dashboard.read'],{proposalId:proposal.id,decision:'ACCEPTED',reason:'Owned test decision'},now);assert.equal(accepted.status,'ACCEPTED');assert.equal(accepted.executionAuthority,'NONE');
 await assert.rejects(decideCopilotProposal(org.id,actor.id,['dashboard.read'],{proposalId:proposal.id,decision:'ACCEPTED',reason:'Owned repeated decision'},now),e=>e.code==='CONFLICT');
 const events=await db.businessEvent.findMany({where:{organizationId:org.id,sourceId:proposal.id},include:{audits:true,outboxMessages:true}});assert.equal(events.length,2);for(const event of events){assert.equal(event.sourceType,null);assert.equal(event.metadata.sourceEntityType,'AiActionProposal');assert.equal(event.payload.executionAuthority,'NONE');assert.equal(event.audits.length,1);assert.equal(event.outboxMessages.length,1)}
 assert.deepEqual(await financial(),financialBefore);result.checks.actualAiProposal={created:true,replayed:true,accepted:true,deniedWithoutPermission:true,deniedForeignTenant:true,secondDecisionRejected:true,events:events.map(e=>e.eventType),financialCountsUnchanged:true,executionAuthority:'NONE'};
 result.passed=true;
}
main().catch(error=>{result.passed=false;result.error=f.safe(error);process.exitCode=1}).finally(async()=>{result.sourceAfter=hashes();result.sourceStable=JSON.stringify(result.sourceBefore)===JSON.stringify(result.sourceAfter);const output=path.join(__dirname,'event-sources-v151-'+stamp+'.json');fs.writeFileSync(output,JSON.stringify(result,null,2),{flag:'wx'});console.log(JSON.stringify({output,...result}));await db.$disconnect()});
