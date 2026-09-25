const f=require('./statement-recipient-fixtures.cjs'),{db,fs,path,crypto,assert}=f;
const {createCopilotProposal,decideCopilotProposal}=require(path.join(f.root,'services/ai/copilot-proposal.service.ts'));
const {isCopilotProposalReleaseAvailable}=require(path.join(f.root,'services/ai/copilot-proposal-release.service.ts'));
const {hashPassword}=require(path.join(f.root,'lib/password.ts')),{chromium,expect:baseExpect}=require('@playwright/test'),expect=baseExpect.configure({timeout:60000});
const stamp=crypto.randomUUID(),base='http://127.0.0.1:3110',secrets=[],files=['services/ai/copilot-proposal.service.ts','services/ai/copilot-proposal-release.service.ts','components/copilot/CopilotProposalControls.tsx','components/daily-habit/DailyHabitDigestDashboard.tsx','app/[locale]/(dashboard)/dashboard/daily-digest/page.tsx'];
const hashes=()=>Object.fromEntries(files.map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root,file))).digest('hex')]));
const result={at:new Date().toISOString(),sourceBefore:hashes(),checks:{},browser:[],scope:'Owned localhost database/application. Direct proposal service fixtures; actual browser visits cover disabled default agent only. No release approval fabricated, no live provider dispatch.'};let browser;
async function main(){
 await f.helper.withClient(f.target,f.helper.assertOwned);
 const org=await db.organization.create({data:{name:f.helper.prefix+'Proposal recovery '+stamp,slug:'proposal-recovery-'+stamp,currency:'XAF',timezone:'UTC'}});
 const password='Owned-'+crypto.randomUUID()+'!',hashed=await hashPassword(password);secrets.push(password);
 const actor=await db.user.create({data:{organizationId:org.id,email:'proposal-reader-'+stamp+'@example.invalid',password:hashed,isActive:true,isVerified:true,emailVerified:true}});
 await db.account.create({data:{userId:actor.id,accountId:actor.id,providerId:'credential',password:hashed}});await db.role.create({data:{organizationId:org.id,code:'administrator',nameEn:'Owned proposal reader',permissions:['dashboard.read'],users:{connect:{id:actor.id}}}});
 const reviewer=await db.user.create({data:{organizationId:org.id,email:'proposal-reviewer-'+stamp+'@example.invalid'}}),other=await db.user.create({data:{organizationId:org.id,email:'proposal-other-'+stamp+'@example.invalid'}});
 const now=new Date(),periodStart=new Date(now.getTime()-3600000),periodEnd=now;
 const ref={subjectType:'owned.verification',subjectId:stamp,sourceModule:'dashboard',sourceHash:crypto.createHash('sha256').update(stamp).digest('hex'),evidenceGrade:'operational',freshness:'fresh',available:true};
 const run=await db.agentRun.create({data:{organizationId:org.id,actorId:actor.id,agentKey:'owned-proposal-recovery',sourceRoute:'/dashboard/manager-action-center',locale:'en',currency:'XAF',correlationId:stamp,status:'COMPLETED',periodStart,periodEnd,completedAt:now,evidenceLinks:{create:{...ref,freshness:'FRESH'}}}});
 const input={runId:run.id,proposalType:'NAVIGATE_TO_WORKFLOW',targetRoute:'/dashboard/manager-action-center',requiredPermission:'dashboard.read',title:'Review owned test evidence',detail:'Review the synthetic source record in the existing dashboard.',evidence:[{...ref,id:'owned-citation'}],periodStart,periodEnd,asOf:now,expiresAt:new Date(now.getTime()+3600000),idempotencyKey:'proposal-'+stamp};
 for(const decision of ['ACCEPTED','REJECTED']){
  const request={...input,idempotencyKey:decision+'-'+stamp};const proposal=await createCopilotProposal(org.id,actor.id,['dashboard.read'],request,now);
  assert.equal((await createCopilotProposal(org.id,actor.id,['dashboard.read'],request,now)).id,proposal.id);
  const args={proposalId:proposal.id,decision,reason:'Owned reviewed decision'};
  const first=await decideCopilotProposal(org.id,reviewer.id,['dashboard.read'],args,now),replay=await decideCopilotProposal(org.id,reviewer.id,['dashboard.read'],args,new Date(now.getTime()+3600001));
  assert.deepEqual(replay,first);assert.equal(replay.executionAuthority,'NONE');
  await assert.rejects(decideCopilotProposal(org.id,other.id,['dashboard.read'],args,now),e=>e.code==='CONFLICT');
  await assert.rejects(decideCopilotProposal(org.id,reviewer.id,['dashboard.read'],{...args,reason:'Different reason'},now),e=>e.code==='CONFLICT');
  await assert.rejects(decideCopilotProposal(org.id,reviewer.id,[],args,now),e=>e.code==='FORBIDDEN');
  const events=await db.businessEvent.findMany({where:{organizationId:org.id,sourceId:proposal.id},include:{audits:true,outboxMessages:true}});assert.equal(events.length,2);for(const event of events){assert.equal(event.audits.length,1);assert.equal(event.outboxMessages.length,1)}
 }
 result.checks.creationReplayAndIdenticalDecisionRecovery=true;result.checks.otherActorChangedReasonLostPermissionDenied=true;
 assert.equal(await isCopilotProposalReleaseAvailable({organizationId:org.id,roleCodes:['administrator']}),false);result.checks.noReleaseDisplayDenied=true;
 const count=async()=>({proposals:await db.aiActionProposal.count({where:{organizationId:org.id}}),events:await db.businessEvent.count({where:{organizationId:org.id}}),journals:await db.journalEntry.count({where:{organizationId:org.id}}),payments:await db.payment.count({where:{organizationId:org.id}})}),before=await count();
 browser=await chromium.launch({headless:true});
 for(const locale of ['en','fr']){
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
  const auth=await context.request.post(base+'/api/auth/sign-in/email',{headers:{Origin:base},data:{email:actor.email,password}});assert.equal(auth.status(),200);
  const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(f.safe(error,secrets)));
  const start=Date.now();await page.goto(base+'/'+locale+'/dashboard/daily-digest',{waitUntil:'domcontentloaded',timeout:120000});
  const generate=page.getByRole('button',{name:locale==='en'?'Generate brief':'Generer le brief',exact:true});await expect(generate).toBeDisabled();
  await expect(page.getByText(locale==='en'?'Command Agent is disabled for this organization.':"L'agent de commande est desactive pour cette organisation.",{exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:/Prepare proposal|Preparer la proposition/})).toHaveCount(0);
  const timing=Date.now()-start,screenshots=[];
  for(const width of [1440,768,320]){await page.setViewportSize({width,height:1000});const screenshot='proposal-recovery-v153-'+stamp+'-'+locale+'-'+width+'.png';await page.screenshot({path:path.join(__dirname,screenshot),fullPage:true});screenshots.push(screenshot)}
  result.browser.push({locale,route:'/'+locale+'/dashboard/daily-digest',disabledAgent:true,proposalControlAbsent:true,loadMs:timing,screenshots,pageErrors:errors});await context.close();
 }
 assert.deepEqual(await count(),before);assert.ok(result.browser.every(row=>row.pageErrors.length===0));result.checks.browserReadsNoProposalOrFinancialEffects=true;result.passed=true;
}
main().catch(error=>{result.passed=false;result.error=f.safe(error,secrets);process.exitCode=1}).finally(async()=>{if(browser)await browser.close();result.sourceAfter=hashes();result.sourceStable=JSON.stringify(result.sourceBefore)===JSON.stringify(result.sourceAfter);const output=path.join(__dirname,'proposal-recovery-v153-'+stamp+'.json');fs.writeFileSync(output,JSON.stringify(result,null,2),{flag:'wx'});console.log(JSON.stringify({output,...result}));await db.$disconnect()});
