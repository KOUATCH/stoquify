// Synthetic M1-03 fixtures. Every write uses the existing owned-loopback DB guard.
const f=require('../../workflow-modernization/2026-09-05-run-01/lanes/environment/statement-recipient-fixtures.cjs');
const {db,path,root,crypto,assert}=f;
const close=require(path.join(root,'services/accounting/close-assurance.service.ts'));
const access=require(path.join(root,'services/accounting/accountant-access.service.ts'));
const desk=require(path.join(root,'services/accounting/accountant-work-desk.service.ts'));
const permissions=['dashboard.read','accounting.audit.read','accounting.close.accountant.review','accounting.close.read','accounting.close.evidence.request','accounting.exports.create'];
const files=['services/accounting/accountant-work-desk.contracts.ts','services/accounting/accountant-work-desk.service.ts','services/accounting/close-assurance.service.ts','services/accounting/data-trust.service.ts','actions/accounting/accountant-work-desk.actions.ts','components/accounting/AccountantWorkDesk.tsx','components/accounting/accountant-work-desk-copy.ts','hooks/useAccountantPortal.ts','components/accounting/AccountantPortal.tsx'];
const sources=()=>Object.fromEntries(files.map(file=>[file,crypto.createHash('sha256').update(f.fs.readFileSync(path.join(root,file))).digest('hex')]));
files.push('components/accounting/AccountantPortfolio.tsx','app/[locale]/(dashboard)/dashboard/accounting/accountant-portfolio/page.tsx','app/[locale]/(dashboard)/dashboard/accounting/accountant-portal/page.tsx');
async function org(label,run){
 const organization=await db.organization.create({data:{name:f.helper.prefix+'M1-03 '+label+' '+run,slug:'moat-'+label.toLowerCase()+'-'+run,currency:'XAF',country:'CM',requestedModules:['accounting','close_assurance','data_trust']}});
 const modules=['accounting','close_assurance','data_trust'];
 await db.tenantModuleConfiguration.create({data:{organizationId:organization.id,manifestHash:f.hash(modules),selectedModules:modules,activeModules:modules,grants:{create:modules.map(moduleSlug=>({moduleSlug,status:'active',source:'requested_modules'}))}}});
 return organization;
}
async function fixture(){
 const run=crypto.randomUUID(),firm=await org('Firm',run),password='Owned-'+crypto.randomUUID()+'!';
 const hashed=await require(path.join(root,'lib/password.ts')).hashPassword(password);
 const actor=await db.user.create({data:{organizationId:firm.id,name:'Owned M1 reviewer',email:'moat-'+run+'@example.invalid',password:hashed,isActive:true,isVerified:true,emailVerified:true}});
 await db.account.create({data:{userId:actor.id,accountId:actor.id,providerId:'credential',password:hashed}});
 const role=await db.role.create({data:{organizationId:firm.id,code:'MOAT_REVIEWER',nameEn:'Owned M1 reviewer',permissions,users:{connect:{id:actor.id}}}});
 const context={homeOrganizationId:firm.id,actorId:actor.id,actorPermissions:permissions};
 const clients=[];
 for(const label of ['A','B']){
  const client=await org(label,run),recipient=await db.user.create({data:{organizationId:client.id,name:'Owned recipient '+label,email:'moat-client-'+label+'-'+run+'@example.invalid',isActive:true,isVerified:true}});
  const grant=await access.grantAccountantAccess(client.id,recipient.id,{accountantEmail:actor.email,accountantFirmName:'Owned M1 firm',role:'REVIEWER',consentEvidenceHash:'sha256:'+f.hash({synthetic:true,run,label}),expiresAt:new Date(Date.now()+86400000)});
  const year=await db.fiscalYear.create({data:{organizationId:client.id,name:'M1 synthetic year',startDate:new Date('2026-01-01'),endDate:new Date('2026-12-31T23:59:59.999Z')}});
  const period=await db.accountingPeriod.create({data:{organizationId:client.id,fiscalYearId:year.id,periodNumber:9,name:'September '+label,startDate:new Date('2026-09-01'),endDate:new Date('2026-09-30T23:59:59.999Z')}});
  const closeRun=await db.closeRun.create({data:{organizationId:client.id,periodId:period.id}});
  clients.push({client,recipient,grant,period,closeRun,label});
 }
 return {run,firm,actor,role,password,context,clients};
}
async function evidence(x,c,label,{respond=true}={}){
 const checklist=await db.closeChecklistItem.create({data:{organizationId:c.client.id,periodId:c.period.id,closeRunId:c.closeRun.id,key:crypto.randomUUID(),domain:'DATA_TRUST',status:'UNAVAILABLE',label:'Owned missing proof',detail:'Synthetic fixture only',sourceService:'m1-03-synthetic'}});
 const finding=await db.closeAssuranceFinding.create({data:{organizationId:c.client.id,periodId:c.period.id,closeRunId:c.closeRun.id,checklistItemId:checklist.id,domain:'DATA_TRUST',severity:'HIGH',title:'Owned synthetic '+label,detail:'Owned missing proof fixture',sourceService:'m1-03-synthetic'}});
 const request=await close.requestMissingCloseEvidence(x.firm.id,{clientOrganizationId:c.client.id,findingId:finding.id,requestedFromId:c.recipient.id,requestText:'Provide synthetic statement proof '+label,dueAt:new Date(Date.now()+86400000),correlationId:crypto.randomUUID()},{actorId:x.actor.id});
 const response=respond?await close.respondToMissingCloseEvidence(c.client.id,{requestId:request.id,responseText:'Synthetic statement supplied '+label,correlationId:crypto.randomUUID()},{actorId:c.recipient.id}):null;
 return {finding,request,response};
}
const control=x=>({actorId:x.actor.id,actorPermissions:permissions,freshAuth:{actorId:x.actor.id,organizationId:x.firm.id,lastAuthAt:new Date()}});
const command=(c,e,key=crypto.randomUUID())=>({clientOrganizationId:c.client.id,requestId:e.request.id,responseId:e.response.id,resolutionNotes:'Verified against synthetic fixture source only',correlationId:key});
async function ledger(x,c,amount='100.25'){
 const organizationId=c.client.id;
 await db.organizationAccountingSettings.upsert({where:{organizationId},create:{organizationId,accountingEnabled:true},update:{}});
 const suffix=crypto.randomUUID();
 const debit=await db.chartOfAccount.create({data:{organizationId,code:'D-'+suffix,nameEn:'Synthetic cash',type:'ASSET',normalBalance:'DEBIT'}});
 const credit=await db.chartOfAccount.create({data:{organizationId,code:'C-'+suffix,nameEn:'Synthetic revenue',type:'REVENUE',normalBalance:'CREDIT'}});
 const journal=await db.journal.create({data:{organizationId,code:'J-'+suffix,nameEn:'Synthetic journal',type:'GENERAL'}});
 const entry=await require(path.join(root,'services/accounting/journals.service.ts')).createManualJournalEntry(organizationId,{journalId:journal.id,entryDate:'2026-09-15T12:00:00Z',memo:'Synthetic M1-03 ledger fixture',lines:[{accountId:debit.id,debit:amount,credit:'0',currency:'XAF'},{accountId:credit.id,debit:'0',credit:amount,currency:'XAF'}]},c.recipient.id);
 const posted=await require(path.join(root,'services/accounting/posting.service.ts')).postJournalEntry(organizationId,entry.id,x.actor.id,{actorPermissions:['accounting.journal.post'],lastAuthAt:new Date()});
 assert.equal(posted.status,'POSTED');return posted;
}
module.exports={...f,fixture,evidence,ledger,close,access,desk,permissions,control,command,sources};
