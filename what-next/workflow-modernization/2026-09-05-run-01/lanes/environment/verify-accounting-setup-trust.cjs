const f=require('./statement-recipient-fixtures.cjs'),{db,fs,path,crypto,assert,root,helper}=f;
const {getAccountantPortalData}=require(path.join(root,'services/accounting/data-trust.service.ts'));
const {markAccountingSetupReady,collectAccountingSetupReadinessIssues}=require(path.join(root,'services/accounting/accounting-settings.service.ts'));
const {runCloseAssurance}=require(path.join(root,'services/accounting/close-assurance.service.ts'));
const stamp=crypto.randomUUID(),mode=process.argv.includes('--expect-defect')?'reproduction':'corrected';
const files=['services/accounting/data-trust.service.ts','services/accounting/accounting-settings.service.ts','services/accounting/close-assurance.service.ts'];
const hashes=()=>Object.fromEntries(files.map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')]));const result={at:new Date().toISOString(),mode,sourceBefore:hashes(),syntheticNegativeFixture:true,checks:[]};
async function main(){
 await helper.withClient(f.target,helper.assertOwned);
 const org=await db.organization.create({data:{name:helper.prefix+'Setup trust '+stamp,slug:'setup-trust-'+stamp,currency:'XAF'}}),scope={organizationId:org.id};
 const actor=await db.user.create({data:{...scope,email:'setup-trust-'+stamp+'@example.invalid',isActive:true}}),now=new Date(),startDate=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),1)),endDate=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()+1,1)-1);
 const year=await db.fiscalYear.create({data:{...scope,name:'Owned setup year',startDate,endDate}}),period=await db.accountingPeriod.create({data:{...scope,fiscalYearId:year.id,periodNumber:1,name:'Owned setup period',startDate,endDate}});
 // Deliberately inconsistent negative fixture; never an approval or live setup.
 await db.organizationAccountingSettings.create({data:{...scope,accountingEnabled:true,setupStatus:'IN_PROGRESS'}});
 const {createChartAccount}=require(path.join(root,'services/accounting/accounts.service.ts')),{ensureDefaultJournals,createManualJournalEntry}=require(path.join(root,'services/accounting/journals.service.ts')),{postJournalEntry}=require(path.join(root,'services/accounting/posting.service.ts'));
 const cash=await createChartAccount(org.id,{code:'OWNED-5001',nameEn:'Synthetic cash',type:'ASSET',normalBalance:'DEBIT',syscohadaClass:'5',syscohadaReference:'Synthetic fixture only'},actor.id);
 const capital=await createChartAccount(org.id,{code:'OWNED-1001',nameEn:'Synthetic capital',type:'EQUITY',normalBalance:'CREDIT',syscohadaClass:'1',syscohadaReference:'Synthetic fixture only'},actor.id);
 const journals=await ensureDefaultJournals(org.id,actor.id),journal=journals.find(row=>row.type==='GENERAL');assert.ok(journal);
 const entry=await createManualJournalEntry(org.id,{journalId:journal.id,entryDate:now,memo:'Owned synthetic capital contribution; no actual cash operation',lines:[{accountId:cash.id,debit:'100',currency:'XAF'},{accountId:capital.id,credit:'100',currency:'XAF'}]},actor.id);
 const checker=await db.user.create({data:{...scope,email:'setup-checker-'+stamp+'@example.invalid',isActive:true}});
 await postJournalEntry(org.id,entry.id,checker.id,{actorPermissions:['accounting.journal.post'],lastAuthAt:now,now});
 const issues=await collectAccountingSetupReadinessIssues(org.id);assert.ok(issues.length>0);
 await assert.rejects(()=>markAccountingSetupReady(org.id,actor.id,{actorPermissions:['accounting.setup.manage'],lastAuthAt:now,now}),/not ready/);
 const portal=await getAccountantPortalData({...scope,periodId:period.id},db,now);
 await runCloseAssurance(org.id,{periodId:period.id},{actorId:actor.id});
 const close=await db.closeRun.findFirstOrThrow({where:scope,orderBy:{createdAt:'desc'}});
 const setupBlocker=portal.blockers.some(b=>b.gate==='accounting.setup.ready');
 result.checks.push({setupStatus:'IN_PROGRESS',missingSetupItems:issues.length,setupLockDenied:true,setupBlocker,trustLevel:portal.certificate.level,canExportCertifiedPack:portal.exportReadiness.canExportCertifiedPack,closeStatus:close.status,blockers:portal.blockers.map(b=>({gate:b.gate,severity:b.severity}))});
 if(mode==='reproduction'){assert.equal(setupBlocker,false);assert.equal(portal.certificate.level,'T4');assert.equal(close.status,'READY');}
 else {assert.equal(setupBlocker,true);assert.equal(portal.exportReadiness.canExportCertifiedPack,false);assert.equal(close.status,'BLOCKED');}
 assert.equal(await db.closePackExport.count({where:scope}),0);assert.equal(await db.journalEntry.count({where:scope}),1);assert.equal(await db.payment.count({where:scope}),0);
 result.fixture={organizationId:org.id,actorId:actor.id,periodId:period.id,runId:close.id,journalEntryId:entry.id};result.onlySyntheticJournalNoExportOrPayment=true;result.passed=true;
}
main().catch(error=>{result.passed=false;result.error=f.safe(error)}).finally(async()=>{result.sourceAfter=hashes();result.sourceStable=JSON.stringify(result.sourceBefore)===JSON.stringify(result.sourceAfter);result.passed=!!result.passed&&result.sourceStable;const file='accounting-setup-trust-'+mode+'-'+stamp+'.json';fs.writeFileSync(path.join(__dirname,file),JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({file,...result}));await db.$disconnect();process.exit(result.passed?0:1)});
