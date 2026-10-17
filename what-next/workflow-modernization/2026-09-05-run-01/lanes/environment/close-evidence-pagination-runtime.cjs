"use strict";
// Explicit synthetic capacity fixture on the owned loopback database only.
async function main() {
  const h=require('./close-pack-write-race-runtime.cjs'),{f,db,root,helper}=h,{fs,path,crypto,assert}=f;
  const load=name=>require(path.join(root,name)),service=load('services/accounting/close-assurance.service.ts'),workflow=load('services/accounting/close-evidence-workflow.service.ts');
  const payment=load('services/reconciliation/payment-reconciliation-dashboard.service.ts'),{getModuleCatalog}=load('services/modules/module-catalog.service.ts');
  const desk=load('services/accounting/accountant-work-desk.service.ts'),reviewQueue=load('services/accounting/missing-close-evidence-accountant-review-queue.service.ts');
  const {grantAccountantAccess}=load('services/accounting/accountant-access.service.ts');
  const {assertDisposableDatabaseIdentity}=load('scripts/disposable-fixture-guard.js');
  const run=crypto.randomUUID(),sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
  const files=[__filename,...Object.keys(require.cache).filter(file=>file.startsWith(root+path.sep)&&!file.includes(path.sep+'node_modules'+path.sep)&&!file.includes(path.sep+'.auth'+path.sep)&&/\.(ts|js|cjs)$/.test(file))];
  const sources=()=>({...h.sources(),...Object.fromEntries(files.map(file=>[path.relative(root,file).replaceAll('\\','/'),sha(fs.readFileSync(file))]))});
  const report={run,at:new Date().toISOString(),checks:[],limitations:['Owned synthetic fixtures only. Capacity findings/comments are explicit database fixtures, not customer evidence or approvals.','Real service reads and actual assessment collectors; no migration, seed command, reset, payment, external message or activation.']};
  const outside=async()=>{const base=await h.outside(),comments=await db.accountantComment.findMany({where:{organizationId:{notIn:h.organizations}},orderBy:{id:'asc'}});return {hash:f.hash({base,comments}),base};};
  const check=async(name,work)=>{const result=await work();report.checks.push({name,passed:true,result});console.log(JSON.stringify({name,passed:true}));};
  try {
    const target=helper.targetUrl();assert.equal(target.pathname.slice(1),'stoquify_local_registration_20260906_01');assert.ok(['127.0.0.1','localhost'].includes(target.hostname));await helper.withClient(target,helper.assertOwned);await assertDisposableDatabaseIdentity(db,helper.database);
    report.sourceBefore=sources();report.outsideBefore=await outside();
    const x=await h.fixture('evidence-pages-'+run.slice(0,8));x.checkerId=x.info.actorIds.checker;report.fixture=x.info;
    const modules=getModuleCatalog().map(row=>row.slug);await db.tenantModuleConfiguration.create({data:{organizationId:x.organizationId,manifestHash:'synthetic-'+run,selectedModules:modules,activeModules:modules}});
    await db.tenantModuleGrant.createMany({data:modules.map(moduleSlug=>({organizationId:x.organizationId,moduleSlug,status:'active',source:'requested_modules',metadata:{syntheticFixture:true}}))});
    for(const[name,id,permission]of [['requester',x.makerId,'accounting.close.evidence.request'],['respondent',x.checkerId,'accounting.close.finding.comment'],['reviewer',x.certifierId,'accounting.close.accountant.review']]) await db.role.create({data:{organizationId:x.organizationId,code:'pages-'+name,nameEn:'Synthetic '+name,permissions:[permission],users:{connect:{id}}}});
    report.financialBefore=await h.financial();const actor=actorId=>({organizationId:x.organizationId,actorId});
    const collector=payment.getPaymentReconciliationDashboardData;let adverse;
    try{payment.getPaymentReconciliationDashboardData=async()=>{throw Error('Explicit synthetic unavailable collector');};adverse=await service.runCloseAssurance(x.organizationId,{periodId:x.periodId,correlationId:'pages-missing-'+run},{actorId:x.makerId});}finally{payment.getPaymentReconciliationDashboardData=collector;}
    const template=await db.closeAssuranceFinding.findFirstOrThrow({where:{organizationId:x.organizationId,closeRunId:adverse.run.id,checklistItem:{key:'payment-reconciliation'}}});
    await service.runCloseAssurance(x.organizationId,{periodId:x.periodId,correlationId:'pages-restored-'+run},{actorId:x.makerId});
    const period=await db.accountingPeriod.findUniqueOrThrow({where:{id:x.periodId}});
    const other=await db.accountingPeriod.create({data:{organizationId:x.organizationId,fiscalYearId:period.fiscalYearId,periodNumber:99,name:'Synthetic other period',startDate:new Date('2020-01-01T00:00:00Z'),endDate:new Date('2020-01-31T23:59:59Z')}});
    const otherRun=await db.closeRun.create({data:{organizationId:x.organizationId,periodId:other.id,status:'DRAFT',metadata:{syntheticFixture:true}}});
    const rows=[],comments=[],ids={findings:[],requests:[],reviews:[],other:[]};
    for(const kind of Object.keys(ids)) for(let i=0;i<102;i++) {
      const id=`pages-${run}-${kind}-${String(i).padStart(3,'0')}`,foreign=kind==='other',periodId=foreign?other.id:x.periodId,closeRunId=foreign?otherRun.id:adverse.run.id;
      const createdAt=new Date(Date.UTC(foreign?2020:2021,0,1,0,0,i)),dueAt=new Date(Date.now()+86400000),requestId=id+'-request',correlationId=id+'-correlation';ids[kind].push(id);
      rows.push({id,organizationId:x.organizationId,periodId,closeRunId,checklistItemId:foreign?null:template.checklistItemId,domain:template.domain,severity:template.severity,status:kind==='findings'?'OPEN':kind==='reviews'?'IN_REVIEW':'ASSIGNED',title:'Synthetic capacity '+kind+' '+i,detail:'Explicit isolated capacity fixture',sourceService:'owned-capacity-fixture',ownerId:kind==='findings'?null:x.checkerId,createdAt,dueAt,metadata:{syntheticFixture:true}});
      if(kind!=='findings') {
        comments.push({id:requestId,organizationId:x.organizationId,periodId,closeRunId,findingId:id,authorId:x.makerId,body:'Synthetic request '+id,visibility:'CLIENT_ACTION_REQUIRED',correlationId,createdAt,metadata:{requestType:'MISSING_CLOSE_EVIDENCE',requestedById:x.makerId,requestedFromId:x.checkerId,correlationId,dueAt:dueAt.toISOString(),syntheticFixture:true}});
        if(kind==='reviews') comments.push({id:id+'-response',organizationId:x.organizationId,periodId,closeRunId,findingId:id,authorId:x.checkerId,body:'Synthetic response '+id,visibility:'CLIENT_RESPONSE_SUBMITTED',correlationId:id+'-response-key',createdAt:new Date(createdAt.getTime()+1),metadata:{responseType:'MISSING_CLOSE_EVIDENCE_RESPONSE',requestId,requestCorrelationId:correlationId,requestedById:x.makerId,requestedFromId:x.checkerId,respondedById:x.checkerId,correlationId:id+'-response-key',syntheticFixture:true}});
      }
    }
    await db.closeAssuranceFinding.createMany({data:rows});await db.accountantComment.createMany({data:comments});
    await db.user.createMany({data:Array.from({length:101},(_,i)=>({id:`000-pages-${run}-${String(i).padStart(3,'0')}`,organizationId:x.organizationId,name:'Synthetic ineligible colleague '+i,email:`pages-${run}-${i}@example.invalid`,isActive:true,isVerified:true}))});
    const verifyContext=async view=>{const ids=[...new Set([...view.findings,...view.requests,...view.reviews].map(item=>item.closeRunId))];const stored=await db.closeRun.findMany({where:{id:{in:ids},organizationId:x.organizationId,periodId:x.periodId},select:{id:true,asOf:true,createdAt:true}});assert.equal(stored.length,ids.length);assert.deepEqual(view.assessments,Object.fromEntries(stored.map(row=>[row.id,{asOf:row.asOf.toISOString(),recordedAt:row.createdAt.toISOString()}])));};
    const collect=async(who,kind)=>{let view=await workflow.getCloseEvidenceWorkflow(actor(who),x.periodId),items=[...view[kind]],pages=1;await verifyContext(view);const cursors=[];while(view.cursors[kind]){const cursor=view.cursors[kind];assert.ok(!cursors.includes(cursor));cursors.push(cursor);assert.ok(pages<10);view=await workflow.getCloseEvidenceWorkflow(actor(who),x.periodId,{kind,cursor});await verifyContext(view);items.push(...view[kind]);pages++;}return {items,pages,cursors};};
    await check('All unrequested findings reachable past 100',async()=>{const value=await collect(x.makerId,'findings');assert.ok(value.pages>1);for(const id of ids.findings) assert.ok(value.items.some(row=>row.id===id));assert.equal(new Set(value.items.map(row=>row.id)).size,value.items.length);return {pages:value.pages,syntheticFindings:102};});
    let requests;
    await check('Assigned period is filtered before limit and all 204 requests are reachable',async()=>{requests=await collect(x.checkerId,'requests');assert.equal(requests.items.length,204);assert.ok(requests.items.every(row=>row.period.id===x.periodId));assert.equal(new Set(requests.items.map(row=>row.requestId)).size,204);return {pages:requests.pages,requests:204,excludedOtherPeriod:102};});
    await check('All 102 reviews and direct review beyond page one are available',async()=>{const value=await collect(x.certifierId,'reviews');assert.equal(value.items.length,102);const detail=await workflow.getCloseEvidenceReview(actor(x.certifierId),ids.reviews[101]+'-request');assert.equal(detail.item.findingId,ids.reviews[101]);await assert.rejects(workflow.getCloseEvidenceReview(actor(x.makerId),ids.reviews[101]+'-request'),error=>error.code==='FORBIDDEN');return {pages:value.pages,reviews:102,privateDetailAuthorized:true};});
    await check('Empty ineligible candidate page continues to eligible recipient',async()=>{const initial=await workflow.getCloseEvidenceWorkflow(actor(x.makerId),x.periodId);assert.equal(initial.recipients.length,0);const value=await collect(x.makerId,'recipients');assert.ok(value.items.some(row=>row.id===x.checkerId));assert.equal(value.items.length,1);return {pages:value.pages,ineligibleCandidates:101};});
    await check('Cursor cannot cross period or actor',async()=>{const cursor=requests.cursors[0];for(const [who,periodId]of [[x.checkerId,other.id],[x.makerId,x.periodId]]) await assert.rejects(workflow.getCloseEvidenceWorkflow(actor(who),periodId,{kind:'requests',cursor}),error=>error.code==='BUSINESS_RULE_VIOLATION');return {denied:2};});
    await check('Resolved cursor row does not make remaining records unreachable',async()=>{const first=await workflow.getCloseEvidenceWorkflow(actor(x.certifierId),x.periodId);const boundary=first.reviews[99];await db.closeAssuranceFinding.update({where:{id:boundary.findingId,organizationId:x.organizationId},data:{status:'RESOLVED'}});const next=await workflow.getCloseEvidenceWorkflow(actor(x.certifierId),x.periodId,{kind:'reviews',cursor:first.cursors.reviews});assert.equal(next.reviews.length,2);await db.closeAssuranceFinding.update({where:{id:boundary.findingId,organizationId:x.organizationId},data:{status:'IN_REVIEW'}});return {remaining:2};});
    report.capacity={findings:102,requests:204,reviews:102,ineligibleCandidates:101,otherPeriod:other.id};
    const homeOrganizationId='workflow_close_write_firm_'+run;h.organizations.push(homeOrganizationId);
    await db.organization.create({data:{id:homeOrganizationId,name:helper.prefix+'Synthetic review firm '+run,slug:'pages-firm-'+run,currency:'XAF'}});
    const reviewer=await db.user.create({data:{organizationId:homeOrganizationId,name:'Synthetic delegated reviewer',email:'pages-reviewer-'+run+'@example.invalid',isActive:true,isVerified:true,emailVerified:true}});
    const permissions=['dashboard.read','accounting.audit.read','accounting.close.accountant.review'];
    const role=await db.role.create({data:{organizationId:homeOrganizationId,code:'owned-pages-reviewer',nameEn:'Synthetic delegated reviewer',permissions,users:{connect:{id:reviewer.id}}}});
    await db.tenantModuleConfiguration.create({data:{organizationId:homeOrganizationId,manifestHash:'synthetic-firm-'+run,selectedModules:modules,activeModules:modules}});
    await db.tenantModuleGrant.createMany({data:modules.map(moduleSlug=>({organizationId:homeOrganizationId,moduleSlug,status:'active',source:'requested_modules',metadata:{syntheticFixture:true}}))});
    const scope={kind:'OWNED_LOCAL_DELEGATED_REVIEW_TEST_SCOPE',syntheticOnly:true,realCustomerApproval:false,organizationId:x.organizationId,homeOrganizationId,accountantUserId:reviewer.id,role:'REVIEWER',purpose:'Isolated continuation verification only; not a professional mandate.'};
    const bytes=JSON.stringify(scope,null,2)+'\n',scopeFile='close-work-desk-pages-'+run+'-scope.json';fs.writeFileSync(path.join(__dirname,scopeFile),bytes,{flag:'wx'});
    const grant=await grantAccountantAccess(x.organizationId,x.makerId,{accountantEmail:reviewer.email,accountantFirmName:'Synthetic local reviewer',role:'REVIEWER',consentEvidenceHash:'sha256:'+sha(bytes),effectiveFrom:new Date(Date.now()-1000),expiresAt:new Date(Date.now()+86400000),correlationId:'pages-grant-'+run});
    const controls={};for(const id of [x.makerId,x.checkerId]) { const session=await db.session.create({data:{userId:id,token:crypto.randomBytes(32).toString('hex'),expiresAt:new Date(Date.now()+3600000)}});controls[id]={actorId:id,session:{id:session.id,token:session.token}}; }
    const actualRequest=await service.requestMissingCloseEvidence(x.organizationId,{findingId:template.id,requestedFromId:x.checkerId,requestText:'Review the actual retained missing source observation.',dueAt:new Date(Date.now()+86400000),correlationId:'desk-request-'+run},controls[x.makerId]);
    const actualResponse=await service.respondToMissingCloseEvidence(x.organizationId,{requestId:actualRequest.id,responseText:'The collector is restored; review the new assessment.',correlationId:'desk-response-'+run},controls[x.checkerId]);
    const accountant={homeOrganizationId,actorId:reviewer.id,actorPermissions:permissions};
    let firstDesk;
    await check('Delegated work desk reaches all client requests and reviews without exposing bodies',async()=>{
      firstDesk=await desk.getAccountantWorkDesk(accountant);assert.equal(firstDesk.clientsRead,1);assert.equal(firstDesk.items.length,200);const all=[...firstDesk.items],counts={};
      for(const kind of ['requests','reviews']) { let cursor=firstDesk.clientContinuations[0][kind],pages=1;while(cursor){assert.ok(pages<10);const next=await desk.getAccountantWorkClientPage(accountant,{clientOrganizationId:x.organizationId,kind,cursor});all.push(...next.items);cursor=next.clientContinuations[0][kind];pages++;}counts[kind]=pages; }
      assert.equal(all.filter(row=>row.evidenceState==='AWAITING_RESPONSE').length,204);assert.equal(all.filter(row=>row.evidenceState==='RESPONSE_SUBMITTED').length,103);assert.equal(new Set(all.map(row=>row.requestId)).size,307);assert.ok(!JSON.stringify(all).includes('The collector is restored; review the new assessment.'));assert.ok(all.every(row=>!Object.hasOwn(row,'requestText')));return {pending:204,reviews:103,pages:counts,redacted:true};
    });
    await check('Delegated detail opens actual source-bound response beyond first review page',async()=>{assert.ok(!firstDesk.items.some(row=>row.requestId===actualRequest.id));const detail=await desk.getAccountantWorkDetail(accountant,x.organizationId,actualRequest.id);assert.equal(detail.item.request.requestId,actualRequest.id);assert.equal(detail.replacement.status,'AVAILABLE');return {requestId:actualRequest.id,sourceBound:true};});
    await check('Foreign client continuation is denied before its data is exposed',async()=>{await assert.rejects(desk.getAccountantWorkClientPage(accountant,{clientOrganizationId:'foreign-'+run,kind:'reviews',cursor:firstDesk.clientContinuations[0].reviews}),error=>['FORBIDDEN','NOT_FOUND'].includes(error.code));return {denied:true};});
    const originalQueue=reviewQueue.getAccountantMissingCloseEvidenceReviewQueue;
    await check('Mandate revocation after collection suppresses the client page',async()=>{
      try { reviewQueue.getAccountantMissingCloseEvidenceReviewQueue=async(...args)=>{const result=await originalQueue(...args);await db.accountantAccessGrant.update({where:{id:grant.id},data:{revokedAt:new Date(),revokedById:x.makerId,status:'REVOKED'}});return result;};await assert.rejects(desk.getAccountantWorkClientPage(accountant,{clientOrganizationId:x.organizationId,kind:'reviews',cursor:firstDesk.clientContinuations[0].reviews}),error=>error.code==='FORBIDDEN'); }
      finally {reviewQueue.getAccountantMissingCloseEvidenceReviewQueue=originalQueue;await db.accountantAccessGrant.update({where:{id:grant.id},data:{revokedAt:null,revokedById:null,status:'ACTIVE'}});}
      return {actualPersistedRevocationBeforeReturn:true};
    });
    await check('Home role revocation after collection suppresses the client page',async()=>{
      try {reviewQueue.getAccountantMissingCloseEvidenceReviewQueue=async(...args)=>{const result=await originalQueue(...args);await db.role.update({where:{id:role.id},data:{permissions:[]}});return result;};await assert.rejects(desk.getAccountantWorkClientPage(accountant,{clientOrganizationId:x.organizationId,kind:'reviews',cursor:firstDesk.clientContinuations[0].reviews}),error=>error.code==='FORBIDDEN');}
      finally {reviewQueue.getAccountantMissingCloseEvidenceReviewQueue=originalQueue;await db.role.update({where:{id:role.id},data:{permissions}});}
      return {actualPersistedHomeRevocationBeforeReturn:true};
    });
    report.workDesk={homeOrganizationId,actorId:reviewer.id,clientOrganizationId:x.organizationId,grantId:grant.id,scopeFile,scopeSha256:sha(bytes),requestId:actualRequest.id,responseId:actualResponse.id,findingId:template.id,roleId:role.id};
  } catch(error) { report.error=f.safe(error); }
  finally {
    try {report.sourceAfter=sources();report.sourceStable=f.hash(report.sourceBefore)===f.hash(report.sourceAfter);report.outsideAfter=await outside();report.outsideUnchanged=report.outsideBefore?.hash===report.outsideAfter.hash;report.financialAfter=await h.financial();report.financialUnchanged=f.hash(report.financialBefore)===f.hash(report.financialAfter);}catch(error){report.finalizationError=f.safe(error);}
    await db.$disconnect();report.passed=report.checks.length===11&&report.sourceStable&&report.outsideUnchanged&&report.financialUnchanged&&!report.error&&!report.finalizationError;
    const filename=path.join(__dirname,'close-evidence-workflow-runtime-'+run+'.json');fs.writeFileSync(filename,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({filename,passed:report.passed,error:report.error,sha256:sha(fs.readFileSync(filename))}));
  }
  return report;
}
if(require.main===module&&process.argv[2]==='--run')main().then(report=>process.exit(report.passed?0:1)).catch(error=>{console.error(error.code||error.name);process.exit(1);});
