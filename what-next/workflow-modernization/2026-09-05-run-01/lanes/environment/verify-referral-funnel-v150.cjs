const f=require('./statement-recipient-fixtures.cjs'),{db,fs,path,crypto,assert}=f;
const {getReferralFunnelReadModel}=require(path.join(f.root,'services/referrals/referral-funnel-read-model.service.ts'));
const {queueAccountantClientInviteInTx}=require(path.join(f.root,'services/accounting/accountant-client-invite.service.ts'));
const {openAccountantClientInviteEnvelope}=require(path.join(f.root,'services/accounting/accountant-client-invite-envelope.ts'));
const {recordReferralClick,recordReferralConversionInTx}=require(path.join(f.root,'services/referrals/referral-attribution.service.ts'));
const {revokeAccountantAccess,grantAccountantAccess}=require(path.join(f.root,'services/accounting/accountant-access.service.ts'));
const {hashPassword}=require(path.join(f.root,'lib/password.ts')),{chromium,expect:baseExpect}=require('@playwright/test'),expect=baseExpect.configure({timeout:60000});
const fixtureHash=crypto.createHash('sha256').update('Owned synthetic legacy fixture').digest('hex');
const stamp=crypto.randomUUID(),base='http://127.0.0.1:3110',secrets=[],files=['services/referrals/referral-funnel-read-model.service.ts','components/referrals/ReferralFunnelDashboard.tsx','messages/referral-funnel/en.json','messages/referral-funnel/fr.json','services/accounting/accountant-access.service.ts'];
const hash=()=>Object.fromEntries(files.map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root,file))).digest('hex')]));
const result={at:new Date().toISOString(),sourceBefore:hash(),checks:{},browser:[],scope:'Owned local database only. Synthetic consent inputs and private queued envelopes; no provider worker or external delivery.'};let browser;
async function org(label){return db.organization.create({data:{id:'workflow_funnel_'+label+'_'+stamp,name:f.helper.prefix+'Funnel '+label,slug:'funnel-'+label+'-'+stamp,currency:'EUR',timezone:'UTC'}})}
async function main(){
 await f.helper.withClient(f.target,f.helper.assertOwned);const source=await org('source'),target=await org('target'),other=await org('other');
 const password='Owned-'+crypto.randomUUID()+'!',hashed=await hashPassword(password);secrets.push(password);
 const actor=await db.user.create({data:{organizationId:source.id,email:'reader-'+stamp+'@example.invalid',password:hashed,isActive:true,isVerified:true,emailVerified:true}});
 await db.account.create({data:{userId:actor.id,accountId:actor.id,providerId:'credential',password:hashed}});await db.role.create({data:{organizationId:source.id,code:'administrator',nameEn:'Owned funnel reader',permissions:['analytics.read','dashboard.read'],users:{connect:{id:actor.id}}}});
 assert.deepEqual((await getReferralFunnelReadModel(source.id)).totals,{preparedLinks:0,clicks:0,registrations:0,acceptedInvitations:0});result.checks.empty=true;
 const environment={NODE_ENV:'test',NEXT_PUBLIC_BASE_URL:base,AQSTOQFLOW_ACCOUNTANT_INVITE_ENCRYPTION_KEY:crypto.randomBytes(32).toString('hex')};secrets.push(environment.AQSTOQFLOW_ACCOUNTANT_INVITE_ENCRYPTION_KEY);
 const now=new Date(),expiry=new Date(now.getTime()+86400000),email='accountant-'+stamp+'@example.invalid';
 const input={accountantEmail:email,accountantFirmName:'Owned synthetic firm',role:'REVIEWER',consentEvidenceHash:'sha256:'+crypto.createHash('sha256').update('ISOLATED TEST ONLY '+stamp).digest('hex'),expiresAt:expiry,environment,idempotencyKey:'owned-accepted-'+stamp,correlationId:'owned-accepted-'+stamp};
 const invite=await db.$transaction(tx=>queueAccountantClientInviteInTx(tx,source.id,actor.id,input,now));
 await db.$transaction(tx=>queueAccountantClientInviteInTx(tx,source.id,actor.id,{...input,accountantEmail:'pending-'+stamp+'@example.invalid',idempotencyKey:'owned-pending-'+stamp,correlationId:'owned-pending-'+stamp},now));
 assert.deepEqual((await getReferralFunnelReadModel(source.id)).totals,{preparedLinks:2,clicks:0,registrations:0,acceptedInvitations:0});result.checks.queuedNotAccepted=true;
 const payload=(await db.businessEventOutbox.findUniqueOrThrow({where:{id:invite.outboxId},select:{payload:true}})).payload;
 const opened=openAccountantClientInviteEnvelope(payload.sealedEnvelope,environment),token=new URL(opened.inviteUrl).searchParams.get('invite');assert.ok(token);secrets.push(token,opened.inviteUrl);
 const click={referralCode:invite.referralCode,inviteToken:token,ipAddress:'192.0.2.44',userAgent:'Owned funnel fixture',now};await recordReferralClick(click);await recordReferralClick(click);
 const accountant=await db.user.create({data:{organizationId:target.id,email,isActive:true,isVerified:true,emailVerified:true}});
 const conversion={referralCode:invite.referralCode,targetOrganizationId:target.id,subject:email,targetUserId:accountant.id,accountantInviteToken:token,accountantInviteAccepted:true,now};
 const accepted=await db.$transaction(tx=>recordReferralConversionInTx(tx,conversion));await db.$transaction(tx=>recordReferralConversionInTx(tx,conversion));
 result.checks.deduplicatedClickAndRegistration=true;
 // Deliberate legacy anomaly, not a fabricated accepted state: registration exists without an invite.
 const legacy=await db.referralAttribution.create({data:{organizationId:source.id,sourceType:'ACCOUNTANT_INVITE',sourceId:'owned-legacy',referralCode:crypto.randomBytes(18).toString('base64url'),campaign:'legacy_missing_acceptance',createdById:actor.id,evidenceHash:fixtureHash}});
 await db.referralAttributionEvent.create({data:{organizationId:source.id,attributionId:legacy.id,eventType:'CONVERSION',sourceEventKey:'owned-legacy-registration',payloadHash:fixtureHash,occurredAt:now,targetOrganizationId:target.id}});
 await db.referralAttribution.create({data:{organizationId:other.id,sourceType:'ACCOUNTANT_INVITE',sourceId:'owned-foreign',referralCode:crypto.randomBytes(18).toString('base64url'),campaign:'PRIVATE_OTHER_CAMPAIGN',createdById:actor.id,evidenceHash:fixtureHash}});
 const model=await getReferralFunnelReadModel(source.id);assert.deepEqual(model.totals,{preparedLinks:3,clicks:1,registrations:2,acceptedInvitations:1});assert.ok(!JSON.stringify(model).includes('PRIVATE_OTHER_CAMPAIGN'));assert.ok(!JSON.stringify(model).includes(email));
 result.checks.totals=model.totals;result.checks.historicalFormulaWouldReportActivations=2;result.checks.legacyRegistrationNotAcceptance=true;result.checks.tenantScopeAndAggregatePrivacy=true;
 await revokeAccountantAccess(source.id,actor.id,{grantId:accepted.accountantInviteActivation.accessGrantId,reason:'Owned lifecycle verification',correlationId:'owned-revoke-'+stamp});assert.equal((await getReferralFunnelReadModel(source.id)).totals.acceptedInvitations,1);result.checks.revocationPreservesHistoricalAcceptance=true;
 const grantInput={accountantEmail:email,accountantFirmName:'Owned synthetic firm',role:'REVIEWER',consentEvidenceHash:input.consentEvidenceHash,effectiveFrom:now,expiresAt:new Date(now.getTime()+1000),correlationId:'owned-direct-'+stamp};
 await grantAccountantAccess(source.id,actor.id,grantInput,now);
 await grantAccountantAccess(source.id,actor.id,{...grantInput,effectiveFrom:new Date(now.getTime()+2000),expiresAt:expiry,correlationId:'owned-renew-'+stamp},new Date(now.getTime()+2000));
 const grantEvents=await db.businessEvent.findMany({where:{organizationId:source.id,eventType:{in:['ACCOUNTANT_ACCESS_GRANTED','ACCOUNTANT_ACCESS_REVOKED','ACCOUNTANT_ACCESS_EXPIRED']}},select:{eventType:true,sourceType:true,sourceId:true,metadata:true}});
 assert.equal(grantEvents.length,4);assert.ok(grantEvents.every(event=>event.sourceType===null&&event.sourceId&&event.metadata.sourceEntityType==='AccountantAccessGrant'));
 result.checks.directGrantExpiryAndRenewal=true;result.checks.domainEventReferencePreserved=true;
 const financial=async()=>JSON.stringify(await Promise.all([db.payment.count({where:{organizationId:source.id}}),db.journalEntry.count({where:{organizationId:source.id}}),db.salesOrder.count({where:{organizationId:source.id}}),db.accountantAccessGrant.findMany({where:{organizationId:source.id},select:{id:true,status:true},orderBy:{id:'asc'}})]));const before=await financial();
 browser=await chromium.launch({headless:true});
 for(const locale of ['en','fr']){
  const context=await browser.newContext({viewport:{width:1440,height:1100},reducedMotion:'reduce'}),sample={locale,screenshots:[],pageErrors:[]};result.browser.push(sample);
  try{
   await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());assert.equal((await context.request.post(base+'/api/auth/sign-in/email',{data:{email:actor.email,password},headers:{Origin:base},timeout:180000})).status(),200);
   const page=await context.newPage();page.setDefaultNavigationTimeout(180000);page.on('pageerror',e=>sample.pageErrors.push(f.safe(e,secrets)));const start=Date.now();await page.goto(base+'/'+locale+'/dashboard/analytics/referrals?organizationId='+other.id);
   await expect(page.getByRole('heading',{name:locale==='fr'?'Entonnoir de parrainage':'Referral funnel',level:1,exact:true})).toBeVisible();sample.routeReadyMs=Date.now()-start;
   await expect(page.getByRole('row',{name:/legacy_missing_acceptance 1 0 1 0/})).toBeVisible();await expect(page.getByRole('row',{name:/accountant_client_invite 2 1 1 1/})).toBeVisible();await expect(page.getByText('PRIVATE_OTHER_CAMPAIGN')).toHaveCount(0);
   const region=page.getByRole('region',{name:locale==='fr'?'Parrainages enregistrés par source et campagne':'Recorded referral counts by source and campaign'});
   await region.focus();await expect(region).toBeFocused();sample.keyboardTableReachable=true;
   for(const width of [1440,768,320]){await page.setViewportSize({width,height:1100});await region.scrollIntoViewIfNeeded();const file='referral-funnel-v150-'+locale+'-'+width+'-'+stamp+'.png';await page.screenshot({path:path.join(__dirname,file),fullPage:true,animations:'disabled'});sample.screenshots.push(file)}
   sample.countsVerified=true;
  }finally{await context.close()}
 }
 assert.equal(await financial(),before);result.checks.selectedRecordsUnchangedByReads=true;result.passed=true;
}
main().catch(e=>{result.error=f.safe(e,secrets);process.exitCode=1}).finally(async()=>{result.sourceAfter=hash();result.sourceStable=JSON.stringify(result.sourceAfter)===JSON.stringify(result.sourceBefore);const file=path.join(__dirname,'referral-funnel-v150-'+stamp+'.json');console.log(JSON.stringify({file,...result}));try{fs.writeFileSync(file,JSON.stringify(result,null,2),{flag:'wx'})}finally{await browser?.close();await db.$disconnect()}});
