const f=require('./statement-recipient-fixtures.cjs'),{db,fs,path,crypto,assert}=f;
const {createCopilotProposal,decideCopilotProposal}=require(path.join(f.root,'services/ai/copilot-proposal.service.ts'));
const stamp=crypto.randomUUID(),files=['services/ai/copilot-proposal.service.ts','services/ai/copilot-proposal.schemas.ts','components/copilot/CopilotProposalControls.tsx','actions/ai/copilot-proposal.actions.ts','services/ai/copilot-proposal-release.service.ts'];
const hashes=()=>Object.fromEntries(files.map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root,file))).digest('hex')]));
const result={at:new Date().toISOString(),sourceBefore:hashes(),checks:{},scope:'Owned local database; direct domain services with synthetic agent evidence. No approval package created, release bypass, external dispatch or provider execution.'};
async function main(){
 await f.helper.withClient(f.target,f.helper.assertOwned);
 const org=await db.organization.create({data:{name:f.helper.prefix+'Proposal evidence '+stamp,slug:'proposal-evidence-'+stamp,currency:'XAF'}});
 const other=await db.organization.create({data:{name:f.helper.prefix+'Proposal other '+stamp,slug:'proposal-other-'+stamp,currency:'XAF'}});
 const creator=await db.user.create({data:{organizationId:org.id,email:'proposal-creator-'+stamp+'@example.invalid'}}),reviewer=await db.user.create({data:{organizationId:org.id,email:'proposal-reviewer-'+stamp+'@example.invalid'}});
 const now=new Date(),periodStart=new Date(now.getTime()-3600000),periodEnd=now;
 const ref={subjectType:'owned.verification',subjectId:stamp,sourceModule:'dashboard',sourceHash:crypto.createHash('sha256').update(stamp).digest('hex'),evidenceGrade:'operational',freshness:'fresh',available:true};
 const run=await db.agentRun.create({data:{organizationId:org.id,actorId:creator.id,agentKey:'owned-proposal-evidence',sourceRoute:'/dashboard/manager-action-center',locale:'en',currency:'XAF',correlationId:stamp,status:'COMPLETED',periodStart,periodEnd,completedAt:now,evidenceLinks:{create:{...ref,freshness:'FRESH'}}},include:{evidenceLinks:true}});
 const stored=run.evidenceLinks[0],base={runId:run.id,proposalType:'NAVIGATE_TO_WORKFLOW',targetRoute:'/dashboard/manager-action-center',requiredPermission:'dashboard.read',title:'Review owned test evidence',detail:'Review the synthetic source record in the existing dashboard.',evidence:[{...ref,id:'owned-citation'}],periodStart,periodEnd,asOf:now,expiresAt:new Date(now.getTime()+3600000),idempotencyKey:'proposal-'+stamp};
 const counts=async()=>({proposals:await db.aiActionProposal.count({where:{organizationId:org.id}}),events:await db.businessEvent.count({where:{organizationId:org.id}}),outbox:await db.businessEventOutbox.count({where:{organizationId:org.id}})});
 const create=(input)=>createCopilotProposal(org.id,creator.id,['dashboard.read'],input,now),decide=(proposal,decision)=>decideCopilotProposal(org.id,reviewer.id,['dashboard.read'],{proposalId:proposal.id,decision,reason:'Owned evidence verification decision'},now);
 const initial=await counts(),denials=[];
 for(const [label,change] of [['blocked',{freshness:'BLOCKED'}],['failed',{freshness:'FAILED'}],['stale',{freshness:'STALE'}],['raw',{evidenceGrade:'raw'}],['unavailable',{available:false}]]){
  await db.agentEvidenceLink.update({where:{id:stored.id},data:{freshness:'FRESH',evidenceGrade:'operational',available:true,...change}});
  await assert.rejects(create(base),e=>e.code==='BUSINESS_RULE_VIOLATION');assert.deepEqual(await counts(),initial);denials.push(label);
 }
 await db.agentEvidenceLink.update({where:{id:stored.id},data:{freshness:'FRESH',evidenceGrade:'operational',available:true}});
 await assert.rejects(create({...base,evidence:[{...base.evidence[0],evidenceGrade:'certified'}]}),e=>e.code==='BUSINESS_RULE_VIOLATION');denials.push('certification-inflation');assert.deepEqual(await counts(),initial);
 result.checks.creationRejectsMisrepresentation=denials;
 const original=await create(base);assert.equal(original.executionAuthority,'NONE');const drafted=await counts();
 await db.agentEvidenceLink.update({where:{id:stored.id},data:{evidenceGrade:'raw'}});
 await assert.rejects(decide(original,'ACCEPTED'),e=>e.code==='BUSINESS_RULE_VIOLATION');assert.deepEqual(await counts(),drafted);assert.equal((await db.aiActionProposal.findUniqueOrThrow({where:{id:original.id}})).status,'DRAFT');
 const rejected=await decide(original,'REJECTED');assert.equal(rejected.status,'REJECTED');result.checks.downgradedEvidenceBlocksAcceptanceButAllowsRejection=true;
 await db.agentEvidenceLink.update({where:{id:stored.id},data:{evidenceGrade:'operational',freshness:'STALE'}});
 const stale=await create({...base,idempotencyKey:'stale-'+stamp,evidence:[{...base.evidence[0],freshness:'stale'}]});assert.equal(stale.evidenceRefs[0].freshness,'stale');result.checks.honestStalePreserved=true;
 await db.agentEvidenceLink.update({where:{id:stored.id},data:{freshness:'FRESH'}});
 const valid=await create({...base,idempotencyKey:'valid-'+stamp});
 await assert.rejects(decideCopilotProposal(other.id,reviewer.id,['dashboard.read'],{proposalId:valid.id,decision:'ACCEPTED',reason:'Owned foreign tenant test'},now),e=>e.code==='NOT_FOUND');
 await assert.rejects(decideCopilotProposal(org.id,reviewer.id,[],{proposalId:valid.id,decision:'ACCEPTED',reason:'Owned permission denial'},now),e=>e.code==='FORBIDDEN');
 const accepted=await decide(valid,'ACCEPTED');assert.equal(accepted.status,'ACCEPTED');assert.equal(accepted.executionAuthority,'NONE');result.checks.validAcceptanceDifferentReviewerAndTenantPermissionDenials=true;
 const runChanged=await create({...base,idempotencyKey:'run-changed-'+stamp});await db.agentRun.update({where:{id:run.id},data:{status:'FAILED'}});
 await assert.rejects(decide(runChanged,'ACCEPTED'),e=>e.code==='NOT_FOUND');await decide(runChanged,'REJECTED');result.checks.changedRunBlocksAcceptanceAllowsRejection=true;
 // Restore this synthetic run solely for the independent concurrency scenario.
 await db.agentRun.update({where:{id:run.id},data:{status:'COMPLETED'}});
 const concurrentInput={...base,idempotencyKey:'concurrent-'+stamp},attempts=await Promise.allSettled([create(concurrentInput),create(concurrentInput)]);
 assert.ok(attempts.some(x=>x.status==='fulfilled'));for(const attempt of attempts)if(attempt.status==='rejected')assert.equal(attempt.reason.code,'CONFLICT');
 const replay=await create(concurrentInput);assert.equal(await db.aiActionProposal.count({where:{organizationId:org.id,idempotencyKey:concurrentInput.idempotencyKey}}),1);
 const events=await db.businessEvent.findMany({where:{organizationId:org.id,sourceId:replay.id},include:{audits:true,outboxMessages:true}});assert.equal(events.length,1);assert.equal(events[0].audits.length,1);assert.equal(events[0].outboxMessages.length,1);result.checks.concurrentCreateAndRetry={outcomes:attempts.map(x=>x.status==='fulfilled'?'created_or_replayed':x.reason.code),singleProposalEventAuditOutbox:true};
 const decisions=await Promise.allSettled([decide(replay,'ACCEPTED'),decide(replay,'REJECTED')]);assert.equal(decisions.filter(x=>x.status==='fulfilled').length,1);assert.equal(decisions.find(x=>x.status==='rejected').reason.code,'CONFLICT');
 assert.equal(await db.businessEvent.count({where:{organizationId:org.id,sourceId:replay.id}}),2);result.checks.concurrentDecisionSingleWinner=true;
 assert.equal(await db.journalEntry.count({where:{organizationId:org.id}}),0);assert.equal(await db.payment.count({where:{organizationId:org.id}}),0);assert.equal(await db.ledgerPostingBatch.count({where:{organizationId:org.id}}),0);result.checks.noFinancialExecution=true;
 result.passed=true;
}
main().catch(error=>{result.passed=false;result.error=f.safe(error);process.exitCode=1}).finally(async()=>{result.sourceAfter=hashes();result.sourceStable=JSON.stringify(result.sourceBefore)===JSON.stringify(result.sourceAfter);const output=path.join(__dirname,'proposal-evidence-v152-'+stamp+'.json');fs.writeFileSync(output,JSON.stringify(result,null,2),{flag:'wx'});console.log(JSON.stringify({output,...result}));await db.$disconnect()});
